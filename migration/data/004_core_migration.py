#!/usr/bin/env python3
"""
Core Data Migration Script
Migrates core entities (users, companies, opportunities, proposals) from SQLite to Neon
"""

import os
import sys
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import argparse
import uuid

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))

from connection_manager import MigrationConnectionManager, ConnectionConfig
from data_validator import DataValidator, ValidationResult, ValidationSeverity
from progress_tracker import ProgressTracker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration/logs/core_migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CoreDataMigrator:
    """Main class for migrating core data"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.connection_manager = MigrationConnectionManager(config)
        self.validator = DataValidator()
        self.progress_tracker = ProgressTracker()
        
        # Migration mapping for table dependencies
        self.migration_order = [
            'users',           # No dependencies
            'companies',       # Depends on users
            'opportunities',   # No dependencies on users/companies directly
            'procurement_monitors', # Depends on users
            'proposals'        # Depends on users, companies, opportunities
        ]
        
        # Column mapping for data transformation
        self.column_mappings = {
            'users': {
                'id': self._map_uuid,
                'email': str,
                'password_hash': str,
                'first_name': str,
                'last_name': str,
                'phone': str,
                'is_active': bool,
                'email_verified': bool,
                'created_at': self._map_datetime,
                'updated_at': self._map_datetime
            },
            'companies': {
                'id': self._map_uuid,
                'user_id': self._map_uuid,
                'legal_name': str,
                'trade_name': str,
                'cnpj': self._clean_cnpj,
                'website': str,
                'contact_email': str,
                'contact_phone': str,
                'is_verified': bool,
                'created_at': self._map_datetime,
                'updated_at': self._map_datetime
            },
            'opportunities': {
                'id': self._map_uuid,
                'title': str,
                'description': str,
                'organ': str,
                'estimated_value': self._map_decimal,
                'publish_date': self._map_datetime,
                'opening_date': self._map_datetime,
                'closing_date': self._map_datetime,
                'status': str,
                'source_url': str,
                'created_at': self._map_datetime,
                'updated_at': self._map_datetime
            },
            'proposals': {
                'id': self._map_uuid,
                'opportunity_id': self._map_uuid,
                'company_id': self._map_uuid,
                'user_id': self._map_uuid,
                'proposal_value': self._map_decimal,
                'status': str,
                'submitted_at': self._map_datetime,
                'created_at': self._map_datetime,
                'updated_at': self._map_datetime
            }
        }
    
    def _map_uuid(self, value: Any) -> str:
        """Map value to UUID format"""
        if not value:
            return str(uuid.uuid4())
        
        if isinstance(value, str) and len(value) == 36:
            try:
                uuid.UUID(value)
                return value
            except ValueError:
                pass
        
        # Generate new UUID if invalid
        return str(uuid.uuid4())
    
    def _map_datetime(self, value: Any) -> Optional[datetime]:
        """Map value to datetime"""
        if not value:
            return None
        
        if isinstance(value, datetime):
            return value
        
        if isinstance(value, str):
            # Try common datetime formats
            formats = [
                '%Y-%m-%d %H:%M:%S',
                '%Y-%m-%d %H:%M:%S.%f',
                '%Y-%m-%d',
                '%d/%m/%Y %H:%M:%S',
                '%d/%m/%Y'
            ]
            
            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue
        
        return None
    
    def _map_decimal(self, value: Any) -> Optional[float]:
        """Map value to decimal/float"""
        if not value:
            return None
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, str):
            # Remove currency formatting
            cleaned = value.replace('R$', '').replace(',', '.').replace(' ', '')
            try:
                return float(cleaned)
            except ValueError:
                return None
        
        return None
    
    def _clean_cnpj(self, value: Any) -> str:
        """Clean CNPJ format"""
        if not value:
            return ""
        
        # Remove all non-digits
        import re
        return re.sub(r'[^0-9]', '', str(value))
    
    async def migrate_table(self, table_name: str) -> Dict[str, Any]:
        """Migrate specific table"""
        logger.info(f"Starting migration for table: {table_name}")
        
        # Get source data
        try:
            source_data = self._get_source_data(table_name)
            total_rows = len(source_data)
            
            if total_rows == 0:
                logger.info(f"No data found for table {table_name}")
                return {
                    'table': table_name,
                    'total_rows': 0,
                    'migrated_rows': 0,
                    'skipped_rows': 0,
                    'validation_issues': 0,
                    'status': 'success'
                }
            
            logger.info(f"Found {total_rows} rows in {table_name}")
            
        except Exception as e:
            logger.error(f"Failed to get source data for {table_name}: {e}")
            return {
                'table': table_name,
                'status': 'error',
                'error': str(e)
            }
        
        # Process in batches
        batch_size = self.config.batch_size
        migrated_rows = 0
        skipped_rows = 0
        validation_issues = 0
        
        for i in range(0, total_rows, batch_size):
            batch = source_data[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (total_rows + batch_size - 1) // batch_size
            
            logger.info(f"Processing batch {batch_num}/{total_batches} for {table_name}")
            
            try:
                # Transform and validate batch
                transformed_batch = []
                batch_issues = 0
                
                for row in batch:
                    # Transform data
                    transformed_row = self._transform_row(row, table_name)
                    
                    # Validate data
                    validation_result = self.validator.validate_record(transformed_row, table_name)
                    
                    if validation_result.is_valid:
                        transformed_batch.append(validation_result.cleaned_data)
                    else:
                        # Log validation issues
                        critical_issues = [
                            issue for issue in validation_result.issues 
                            if issue.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]
                        ]
                        
                        if critical_issues:
                            logger.warning(f"Skipping row due to validation errors: {critical_issues}")
                            skipped_rows += 1
                        else:
                            # Include row with warnings
                            transformed_batch.append(validation_result.cleaned_data)
                            batch_issues += len(validation_result.issues)
                
                validation_issues += batch_issues
                
                # Migrate batch to destination
                if transformed_batch:
                    try:
                        inserted_count = await self.connection_manager.migrate_table_batch_async(
                            table_name, transformed_batch
                        )
                        migrated_rows += inserted_count
                        logger.info(f"Migrated {inserted_count} rows in batch {batch_num}")
                        
                    except Exception as e:
                        logger.error(f"Failed to migrate batch {batch_num} for {table_name}: {e}")
                        # Try individual row migration for this batch
                        for row in transformed_batch:
                            try:
                                count = await self.connection_manager.migrate_table_batch_async(
                                    table_name, [row]
                                )
                                migrated_rows += count
                            except Exception as row_error:
                                logger.error(f"Failed to migrate individual row: {row_error}")
                                skipped_rows += 1
                
                # Update progress
                progress = (i + len(batch)) / total_rows * 100
                self.progress_tracker.update_progress(table_name, progress)
                
            except Exception as e:
                logger.error(f"Failed to process batch {batch_num} for {table_name}: {e}")
                skipped_rows += len(batch)
        
        result = {
            'table': table_name,
            'total_rows': total_rows,
            'migrated_rows': migrated_rows,
            'skipped_rows': skipped_rows,
            'validation_issues': validation_issues,
            'status': 'success' if migrated_rows > 0 else 'warning'
        }
        
        logger.info(f"Migration completed for {table_name}: {result}")
        return result
    
    def _get_source_data(self, table_name: str) -> List[Dict[str, Any]]:
        """Get source data from SQLite"""
        try:
            return self.connection_manager.sqlite.get_table_data(table_name)
        except Exception as e:
            # If table doesn't exist in SQLite, return empty list
            logger.warning(f"Table {table_name} not found in source database: {e}")
            return []
    
    def _transform_row(self, row: Dict[str, Any], table_name: str) -> Dict[str, Any]:
        """Transform row data based on column mappings"""
        mappings = self.column_mappings.get(table_name, {})
        transformed = {}
        
        for column, value in row.items():
            if column in mappings:
                transform_func = mappings[column]
                try:
                    transformed[column] = transform_func(value)
                except Exception as e:
                    logger.warning(f"Failed to transform {column} value {value}: {e}")
                    transformed[column] = value
            else:
                transformed[column] = value
        
        # Add missing required columns with defaults
        if table_name == 'users':
            if 'id' not in transformed:
                transformed['id'] = str(uuid.uuid4())
            if 'role' not in transformed:
                transformed['role'] = 'USER'
            if 'subscription_tier' not in transformed:
                transformed['subscription_tier'] = 'FREE'
            if 'is_active' not in transformed:
                transformed['is_active'] = True
            if 'email_verified' not in transformed:
                transformed['email_verified'] = False
            if 'created_at' not in transformed:
                transformed['created_at'] = datetime.now()
            if 'updated_at' not in transformed:
                transformed['updated_at'] = datetime.now()
        
        elif table_name == 'companies':
            if 'id' not in transformed:
                transformed['id'] = str(uuid.uuid4())
            if 'is_verified' not in transformed:
                transformed['is_verified'] = False
            if 'created_at' not in transformed:
                transformed['created_at'] = datetime.now()
            if 'updated_at' not in transformed:
                transformed['updated_at'] = datetime.now()
        
        elif table_name == 'opportunities':
            if 'id' not in transformed:
                transformed['id'] = str(uuid.uuid4())
            if 'status' not in transformed:
                transformed['status'] = 'PUBLISHED'
            if 'current_phase' not in transformed:
                transformed['current_phase'] = 'PREPARATION'
            if 'proposal_count' not in transformed:
                transformed['proposal_count'] = 0
            if 'qualified_proposals' not in transformed:
                transformed['qualified_proposals'] = 0
            if 'created_at' not in transformed:
                transformed['created_at'] = datetime.now()
            if 'updated_at' not in transformed:
                transformed['updated_at'] = datetime.now()
        
        elif table_name == 'proposals':
            if 'id' not in transformed:
                transformed['id'] = str(uuid.uuid4())
            if 'status' not in transformed:
                transformed['status'] = 'DRAFT'
            if 'is_winner' not in transformed:
                transformed['is_winner'] = False
            if 'created_at' not in transformed:
                transformed['created_at'] = datetime.now()
            if 'updated_at' not in transformed:
                transformed['updated_at'] = datetime.now()
        
        return transformed
    
    async def migrate_all_tables(self) -> Dict[str, Any]:
        """Migrate all tables in dependency order"""
        logger.info("Starting migration of all core tables")
        
        # Test connections first
        connection_results = await self.connection_manager.test_connections_async()
        if not connection_results.get('postgresql'):
            raise Exception("PostgreSQL connection test failed")
        
        migration_results = {}
        total_start_time = datetime.now()
        
        for table_name in self.migration_order:
            table_start_time = datetime.now()
            
            try:
                result = await self.migrate_table(table_name)
                result['duration'] = (datetime.now() - table_start_time).total_seconds()
                migration_results[table_name] = result
                
            except Exception as e:
                logger.error(f"Failed to migrate table {table_name}: {e}")
                migration_results[table_name] = {
                    'table': table_name,
                    'status': 'error',
                    'error': str(e),
                    'duration': (datetime.now() - table_start_time).total_seconds()
                }
        
        # Calculate summary
        total_duration = (datetime.now() - total_start_time).total_seconds()
        total_rows = sum(r.get('total_rows', 0) for r in migration_results.values())
        migrated_rows = sum(r.get('migrated_rows', 0) for r in migration_results.values())
        skipped_rows = sum(r.get('skipped_rows', 0) for r in migration_results.values())
        
        summary = {
            'total_duration_seconds': total_duration,
            'total_tables': len(self.migration_order),
            'successful_tables': sum(1 for r in migration_results.values() if r.get('status') == 'success'),
            'total_rows': total_rows,
            'migrated_rows': migrated_rows,
            'skipped_rows': skipped_rows,
            'success_rate': (migrated_rows / total_rows * 100) if total_rows > 0 else 100,
            'tables': migration_results
        }
        
        logger.info(f"Migration completed: {summary}")
        return summary
    
    async def verify_migration(self) -> Dict[str, Any]:
        """Verify migration by comparing row counts"""
        logger.info("Starting migration verification")
        
        verification_results = {}
        
        for table_name in self.migration_order:
            try:
                # Get source count
                source_count = self.connection_manager.sqlite.get_table_row_count(table_name)
                
                # Get destination count
                dest_count_result = await self.connection_manager.postgres.execute_query_async(
                    f"SELECT COUNT(*) as count FROM {table_name}"
                )
                dest_count = dest_count_result[0]['count'] if dest_count_result else 0
                
                verification_results[table_name] = {
                    'source_count': source_count,
                    'destination_count': dest_count,
                    'match': source_count == dest_count,
                    'difference': dest_count - source_count
                }
                
            except Exception as e:
                logger.error(f"Failed to verify table {table_name}: {e}")
                verification_results[table_name] = {
                    'error': str(e)
                }
        
        # Calculate overall verification status
        all_match = all(r.get('match', False) for r in verification_results.values() if 'error' not in r)
        
        summary = {
            'all_tables_match': all_match,
            'total_tables_verified': len(verification_results),
            'tables': verification_results
        }
        
        logger.info(f"Verification completed: {summary}")
        return summary
    
    def cleanup(self):
        """Cleanup resources"""
        try:
            self.connection_manager.close()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Migrate core data from SQLite to Neon')
    parser.add_argument('--sqlite-path', default='./data/licitacoes.db',
                       help='Path to SQLite database')
    parser.add_argument('--postgres-url', default=None,
                       help='PostgreSQL connection URL (or use DATABASE_URL env var)')
    parser.add_argument('--batch-size', type=int, default=1000,
                       help='Batch size for migration')
    parser.add_argument('--verify-only', action='store_true',
                       help='Only verify existing migration')
    parser.add_argument('--table', default=None,
                       help='Migrate specific table only')
    
    args = parser.parse_args()
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Create configuration
    config = ConnectionConfig(
        sqlite_path=args.sqlite_path,
        postgres_url=args.postgres_url or os.getenv('DATABASE_URL', ''),
        postgres_direct_url=os.getenv('DIRECT_URL'),
        batch_size=args.batch_size
    )
    
    if not config.postgres_url:
        print("Error: PostgreSQL URL not provided. Use --postgres-url or set DATABASE_URL environment variable.")
        sys.exit(1)
    
    # Create logs directory
    os.makedirs('migration/logs', exist_ok=True)
    
    # Initialize migrator
    migrator = CoreDataMigrator(config)
    
    try:
        if args.verify_only:
            # Verification only
            verification_result = await migrator.verify_migration()
            print("\n" + "="*50)
            print("MIGRATION VERIFICATION RESULTS")
            print("="*50)
            
            for table, result in verification_result['tables'].items():
                if 'error' in result:
                    print(f"❌ {table}: Error - {result['error']}")
                elif result['match']:
                    print(f"✅ {table}: {result['source_count']} rows (matches)")
                else:
                    print(f"⚠️  {table}: Source: {result['source_count']}, Dest: {result['destination_count']} (diff: {result['difference']})")
            
            print(f"\nOverall Status: {'✅ PASS' if verification_result['all_tables_match'] else '❌ FAIL'}")
        
        elif args.table:
            # Migrate specific table
            result = await migrator.migrate_table(args.table)
            print(f"\nMigration result for {args.table}: {result}")
        
        else:
            # Full migration
            migration_result = await migrator.migrate_all_tables()
            
            # Save results
            results_path = f"migration/results/core_migration_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            os.makedirs('migration/results', exist_ok=True)
            
            with open(results_path, 'w') as f:
                json.dump(migration_result, f, indent=2, default=str)
            
            print("\n" + "="*50)
            print("CORE DATA MIGRATION COMPLETED")
            print("="*50)
            print(f"Duration: {migration_result['total_duration_seconds']:.2f} seconds")
            print(f"Success Rate: {migration_result['success_rate']:.1f}%")
            print(f"Total Rows: {migration_result['total_rows']:,}")
            print(f"Migrated: {migration_result['migrated_rows']:,}")
            print(f"Skipped: {migration_result['skipped_rows']:,}")
            print(f"Results saved to: {results_path}")
            
            # Verification
            print("\nRunning verification...")
            verification_result = await migrator.verify_migration()
            print(f"Verification: {'✅ PASS' if verification_result['all_tables_match'] else '⚠️  PARTIAL'}")
    
    finally:
        migrator.cleanup()
        await migrator.connection_manager.close_async()

if __name__ == "__main__":
    asyncio.run(main())