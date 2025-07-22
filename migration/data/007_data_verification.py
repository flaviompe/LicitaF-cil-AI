#!/usr/bin/env python3
"""
Data Verification Script
Comprehensive verification of migrated data integrity, consistency, and performance
"""

import os
import sys
import json
import logging
import asyncio
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import argparse

# Add utils to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'utils'))

from connection_manager import MigrationConnectionManager, ConnectionConfig
from progress_tracker import ProgressTracker

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration/logs/data_verification.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class DataVerificationError(Exception):
    """Custom exception for data verification errors"""
    pass

class DataVerifier:
    """Comprehensive data verification for migration"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.connection_manager = MigrationConnectionManager(config)
        self.progress_tracker = ProgressTracker()
        
        # Tables to verify
        self.verification_tables = [
            'users',
            'companies', 
            'opportunities',
            'proposals',
            'procurement_monitors',
            'documents',
            'certificates',
            'notifications',
            'legal_consultations'
        ]
        
        # Critical constraints to verify
        self.constraint_checks = {
            'users': [
                "email IS NOT NULL AND email != ''",
                "email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
                "role IN ('USER', 'ADMIN', 'PREMIUM')",
                "subscription_tier IN ('FREE', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'CUSTOM')"
            ],
            'companies': [
                "user_id IS NOT NULL",
                "legal_name IS NOT NULL AND legal_name != ''",
                "cnpj IS NOT NULL AND LENGTH(regexp_replace(cnpj, '[^0-9]', '', 'g')) = 14"
            ],
            'opportunities': [
                "title IS NOT NULL AND title != ''",
                "status IN ('DRAFT', 'PUBLISHED', 'OPEN', 'CLARIFICATIONS', 'BIDDING', 'ANALYSIS', 'AWARDED', 'CANCELLED', 'CLOSED', 'SUSPENDED', 'REOPENED')",
                "estimated_value IS NULL OR estimated_value >= 0"
            ],
            'proposals': [
                "opportunity_id IS NOT NULL",
                "company_id IS NOT NULL", 
                "user_id IS NOT NULL",
                "proposal_value > 0",
                "status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'QUALIFIED', 'DISQUALIFIED', 'ACCEPTED', 'REJECTED', 'WINNER', 'RUNNER_UP', 'CANCELLED', 'WITHDRAWN')"
            ]
        }
        
        # Foreign key relationships to verify
        self.foreign_key_checks = {
            'companies': [
                ('user_id', 'users', 'id')
            ],
            'proposals': [
                ('opportunity_id', 'opportunities', 'id'),
                ('company_id', 'companies', 'id'),
                ('user_id', 'users', 'id')
            ],
            'procurement_monitors': [
                ('user_id', 'users', 'id')
            ],
            'documents': [
                ('user_id', 'users', 'id'),
                ('company_id', 'companies', 'id'),
                ('opportunity_id', 'opportunities', 'id'),
                ('proposal_id', 'proposals', 'id')
            ],
            'certificates': [
                ('company_id', 'companies', 'id')
            ],
            'notifications': [
                ('user_id', 'users', 'id')
            ]
        }
    
    async def verify_table_counts(self) -> Dict[str, Dict[str, Any]]:
        """Verify row counts between source and destination"""
        logger.info("Starting table count verification")
        
        results = {}
        
        for table_name in self.verification_tables:
            try:
                # Get source count (SQLite)
                source_count = 0
                try:
                    source_count = self.connection_manager.sqlite.get_table_row_count(table_name)
                except Exception as e:
                    logger.warning(f"Could not get source count for {table_name}: {e}")
                
                # Get destination count (PostgreSQL)
                dest_result = await self.connection_manager.postgres.execute_query_async(
                    f"SELECT COUNT(*) as count FROM {table_name}"
                )
                dest_count = dest_result[0]['count'] if dest_result else 0
                
                # Compare counts
                match = source_count == dest_count
                difference = dest_count - source_count
                
                results[table_name] = {
                    'source_count': source_count,
                    'destination_count': dest_count,
                    'match': match,
                    'difference': difference,
                    'status': 'PASS' if match else 'FAIL'
                }
                
                if not match:
                    logger.warning(f"Count mismatch for {table_name}: Source={source_count}, Dest={dest_count}")
                else:
                    logger.info(f"Count verification PASSED for {table_name}: {dest_count} rows")
            
            except Exception as e:
                logger.error(f"Failed to verify counts for {table_name}: {e}")
                results[table_name] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
        
        return results
    
    async def verify_data_constraints(self) -> Dict[str, Dict[str, Any]]:
        """Verify data constraints and business rules"""
        logger.info("Starting data constraints verification")
        
        results = {}
        
        for table_name, constraints in self.constraint_checks.items():
            table_results = {
                'total_checks': len(constraints),
                'passed_checks': 0,
                'failed_checks': [],
                'status': 'PASS'
            }
            
            for constraint in constraints:
                try:
                    # Count rows that violate the constraint
                    query = f"SELECT COUNT(*) as violation_count FROM {table_name} WHERE NOT ({constraint})"
                    result = await self.connection_manager.postgres.execute_query_async(query)
                    violation_count = result[0]['violation_count'] if result else 0
                    
                    if violation_count == 0:
                        table_results['passed_checks'] += 1
                        logger.debug(f"Constraint PASSED for {table_name}: {constraint}")
                    else:
                        table_results['failed_checks'].append({
                            'constraint': constraint,
                            'violation_count': violation_count
                        })
                        table_results['status'] = 'FAIL'
                        logger.warning(f"Constraint FAILED for {table_name}: {constraint} ({violation_count} violations)")
                
                except Exception as e:
                    logger.error(f"Failed to check constraint for {table_name}: {constraint} - {e}")
                    table_results['failed_checks'].append({
                        'constraint': constraint,
                        'error': str(e)
                    })
                    table_results['status'] = 'ERROR'
            
            results[table_name] = table_results
            logger.info(f"Constraints verification for {table_name}: {table_results['status']}")
        
        return results
    
    async def verify_foreign_keys(self) -> Dict[str, Dict[str, Any]]:
        """Verify foreign key relationships"""
        logger.info("Starting foreign key verification")
        
        results = {}
        
        for table_name, foreign_keys in self.foreign_key_checks.items():
            table_results = {
                'total_checks': len(foreign_keys),
                'passed_checks': 0,
                'failed_checks': [],
                'status': 'PASS'
            }
            
            for fk_column, ref_table, ref_column in foreign_keys:
                try:
                    # Check for orphaned records
                    query = f"""
                        SELECT COUNT(*) as orphan_count 
                        FROM {table_name} t
                        WHERE t.{fk_column} IS NOT NULL 
                          AND NOT EXISTS (
                              SELECT 1 FROM {ref_table} r 
                              WHERE r.{ref_column} = t.{fk_column}
                          )
                    """
                    
                    result = await self.connection_manager.postgres.execute_query_async(query)
                    orphan_count = result[0]['orphan_count'] if result else 0
                    
                    if orphan_count == 0:
                        table_results['passed_checks'] += 1
                        logger.debug(f"FK check PASSED: {table_name}.{fk_column} -> {ref_table}.{ref_column}")
                    else:
                        table_results['failed_checks'].append({
                            'foreign_key': f"{fk_column} -> {ref_table}.{ref_column}",
                            'orphan_count': orphan_count
                        })
                        table_results['status'] = 'FAIL'
                        logger.warning(f"FK check FAILED: {table_name}.{fk_column} -> {ref_table}.{ref_column} ({orphan_count} orphans)")
                
                except Exception as e:
                    logger.error(f"Failed to check FK for {table_name}.{fk_column}: {e}")
                    table_results['failed_checks'].append({
                        'foreign_key': f"{fk_column} -> {ref_table}.{ref_column}",
                        'error': str(e)
                    })
                    table_results['status'] = 'ERROR'
            
            results[table_name] = table_results
            logger.info(f"FK verification for {table_name}: {table_results['status']}")
        
        return results
    
    async def verify_data_samples(self, sample_size: int = 100) -> Dict[str, Dict[str, Any]]:
        """Verify data samples by comparing source and destination"""
        logger.info(f"Starting data sample verification (sample size: {sample_size})")
        
        results = {}
        
        for table_name in self.verification_tables:
            table_results = {
                'sample_size': 0,
                'matches': 0,
                'mismatches': 0,
                'sample_errors': [],
                'status': 'PASS'
            }
            
            try:
                # Get sample from source
                source_data = self.connection_manager.sqlite.get_table_data(table_name, limit=sample_size)
                
                if not source_data:
                    logger.info(f"No source data for {table_name}")
                    results[table_name] = table_results
                    continue
                
                table_results['sample_size'] = len(source_data)
                
                # Check each sample record in destination
                for source_record in source_data:
                    try:
                        # Get primary key value (assume 'id' column exists)
                        if 'id' not in source_record:
                            continue
                        
                        pk_value = source_record['id']
                        
                        # Get corresponding record from destination
                        dest_result = await self.connection_manager.postgres.execute_query_async(
                            f"SELECT * FROM {table_name} WHERE id = $1", [pk_value]
                        )
                        
                        if not dest_result:
                            table_results['mismatches'] += 1
                            table_results['sample_errors'].append(f"Record with id={pk_value} not found in destination")
                            continue
                        
                        dest_record = dest_result[0]
                        
                        # Compare key fields (skip some fields that might be different due to transformation)
                        skip_fields = {'created_at', 'updated_at', 'last_login_at', 'last_accessed_at'}
                        
                        match = True
                        for field, source_value in source_record.items():
                            if field in skip_fields:
                                continue
                            
                            dest_value = dest_record.get(field)
                            
                            # Handle type differences
                            if source_value != dest_value:
                                # Try string comparison
                                if str(source_value) != str(dest_value):
                                    match = False
                                    table_results['sample_errors'].append(
                                        f"Field mismatch for id={pk_value}, field={field}: "
                                        f"source='{source_value}' vs dest='{dest_value}'"
                                    )
                                    break
                        
                        if match:
                            table_results['matches'] += 1
                        else:
                            table_results['mismatches'] += 1
                    
                    except Exception as e:
                        table_results['sample_errors'].append(f"Error comparing record: {str(e)}")
                        table_results['mismatches'] += 1
                
                # Determine overall status
                if table_results['mismatches'] > 0:
                    table_results['status'] = 'FAIL'
                
                match_rate = (table_results['matches'] / table_results['sample_size'] * 100) if table_results['sample_size'] > 0 else 100
                logger.info(f"Sample verification for {table_name}: {match_rate:.1f}% match rate")
            
            except Exception as e:
                logger.error(f"Failed sample verification for {table_name}: {e}")
                table_results['status'] = 'ERROR'
                table_results['sample_errors'].append(str(e))
            
            results[table_name] = table_results
        
        return results
    
    async def verify_indexes_performance(self) -> Dict[str, Any]:
        """Verify that indexes exist and perform basic performance checks"""
        logger.info("Starting index and performance verification")
        
        results = {
            'index_checks': {},
            'performance_tests': {},
            'status': 'PASS'
        }
        
        # Check critical indexes exist
        critical_indexes = [
            ('users', 'idx_users_email'),
            ('companies', 'idx_companies_cnpj'),
            ('opportunities', 'idx_opportunities_status'),
            ('proposals', 'idx_proposals_opportunity'),
            ('proposals', 'idx_proposals_company')
        ]
        
        for table_name, index_name in critical_indexes:
            try:
                query = """
                    SELECT EXISTS (
                        SELECT 1 FROM pg_indexes 
                        WHERE tablename = $1 AND indexname = $2
                    ) as index_exists
                """
                
                result = await self.connection_manager.postgres.execute_query_async(query, [table_name, index_name])
                index_exists = result[0]['index_exists'] if result else False
                
                results['index_checks'][f"{table_name}.{index_name}"] = {
                    'exists': index_exists,
                    'status': 'PASS' if index_exists else 'FAIL'
                }
                
                if not index_exists:
                    logger.warning(f"Missing critical index: {table_name}.{index_name}")
                    results['status'] = 'FAIL'
            
            except Exception as e:
                logger.error(f"Failed to check index {table_name}.{index_name}: {e}")
                results['index_checks'][f"{table_name}.{index_name}"] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
                results['status'] = 'ERROR'
        
        # Basic performance tests
        performance_queries = [
            ('users_by_email', "SELECT COUNT(*) FROM users WHERE email LIKE '%@example.com'"),
            ('companies_by_cnpj', "SELECT COUNT(*) FROM companies WHERE cnpj IS NOT NULL"),
            ('active_opportunities', "SELECT COUNT(*) FROM opportunities WHERE status IN ('PUBLISHED', 'OPEN')"),
            ('recent_proposals', "SELECT COUNT(*) FROM proposals WHERE created_at > NOW() - INTERVAL '30 days'")
        ]
        
        for test_name, query in performance_queries:
            try:
                start_time = datetime.now()
                
                result = await self.connection_manager.postgres.execute_query_async(query)
                
                end_time = datetime.now()
                execution_time_ms = (end_time - start_time).total_seconds() * 1000
                
                # Consider queries over 1 second as slow
                is_slow = execution_time_ms > 1000
                
                results['performance_tests'][test_name] = {
                    'execution_time_ms': execution_time_ms,
                    'is_slow': is_slow,
                    'result_count': result[0]['count'] if result else 0,
                    'status': 'WARN' if is_slow else 'PASS'
                }
                
                if is_slow:
                    logger.warning(f"Slow query detected: {test_name} ({execution_time_ms:.1f}ms)")
            
            except Exception as e:
                logger.error(f"Failed performance test {test_name}: {e}")
                results['performance_tests'][test_name] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
        
        return results
    
    async def run_comprehensive_verification(self) -> Dict[str, Any]:
        """Run all verification checks"""
        logger.info("Starting comprehensive data verification")
        start_time = datetime.now()
        
        # Test connections first
        connection_results = await self.connection_manager.test_connections_async()
        if not connection_results.get('postgresql'):
            raise DataVerificationError("PostgreSQL connection test failed")
        
        verification_results = {
            'start_time': start_time.isoformat(),
            'table_counts': {},
            'data_constraints': {},
            'foreign_keys': {},
            'data_samples': {},
            'indexes_performance': {},
            'overall_status': 'PASS'
        }
        
        try:
            # Run all verification checks
            logger.info("Checking table counts...")
            verification_results['table_counts'] = await self.verify_table_counts()
            
            logger.info("Checking data constraints...")
            verification_results['data_constraints'] = await self.verify_data_constraints()
            
            logger.info("Checking foreign key relationships...")
            verification_results['foreign_keys'] = await self.verify_foreign_keys()
            
            logger.info("Checking data samples...")
            verification_results['data_samples'] = await self.verify_data_samples()
            
            logger.info("Checking indexes and performance...")
            verification_results['indexes_performance'] = await self.verify_indexes_performance()
            
            # Determine overall status
            check_categories = ['table_counts', 'data_constraints', 'foreign_keys', 'data_samples']
            
            for category in check_categories:
                category_results = verification_results[category]
                
                if isinstance(category_results, dict):
                    for table_result in category_results.values():
                        if isinstance(table_result, dict):
                            status = table_result.get('status', 'PASS')
                            if status in ['FAIL', 'ERROR']:
                                verification_results['overall_status'] = 'FAIL'
                                break
                
                if verification_results['overall_status'] == 'FAIL':
                    break
            
            # Check indexes performance status
            if verification_results['indexes_performance'].get('status') in ['FAIL', 'ERROR']:
                verification_results['overall_status'] = 'FAIL'
        
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            verification_results['overall_status'] = 'ERROR'
            verification_results['error'] = str(e)
        
        finally:
            end_time = datetime.now()
            verification_results['end_time'] = end_time.isoformat()
            verification_results['duration_seconds'] = (end_time - start_time).total_seconds()
        
        return verification_results
    
    def generate_verification_report(self, results: Dict[str, Any], output_file: Optional[Path] = None) -> Path:
        """Generate detailed verification report"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = Path(f"migration/reports/verification_report_{timestamp}.md")
            output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(f"""# Data Verification Report

**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Duration:** {results.get('duration_seconds', 0):.2f} seconds
**Overall Status:** {"✅ PASS" if results['overall_status'] == 'PASS' else "❌ FAIL"}

## Summary

This report contains the results of comprehensive data verification after migration from SQLite to Neon PostgreSQL database.

""")
            
            # Table counts verification
            f.write("## Table Count Verification\n\n")
            f.write("| Table | Source | Destination | Status | Difference |\n")
            f.write("|-------|--------|-------------|--------|------------|\n")
            
            for table_name, result in results.get('table_counts', {}).items():
                status_emoji = "✅" if result.get('status') == 'PASS' else "❌"
                source_count = result.get('source_count', 'N/A')
                dest_count = result.get('destination_count', 'N/A')
                difference = result.get('difference', 'N/A')
                
                f.write(f"| {table_name} | {source_count} | {dest_count} | {status_emoji} | {difference} |\n")
            
            # Data constraints verification
            f.write("\n## Data Constraints Verification\n\n")
            
            for table_name, result in results.get('data_constraints', {}).items():
                status_emoji = "✅" if result.get('status') == 'PASS' else "❌"
                f.write(f"### {table_name} {status_emoji}\n\n")
                f.write(f"- **Total Checks:** {result.get('total_checks', 0)}\n")
                f.write(f"- **Passed:** {result.get('passed_checks', 0)}\n")
                
                failed_checks = result.get('failed_checks', [])
                if failed_checks:
                    f.write(f"- **Failed:** {len(failed_checks)}\n\n")
                    f.write("**Failed Constraints:**\n")
                    for failed in failed_checks:
                        constraint = failed.get('constraint', 'Unknown')
                        violation_count = failed.get('violation_count', 'Unknown')
                        f.write(f"- `{constraint}` ({violation_count} violations)\n")
                
                f.write("\n")
            
            # Foreign key verification
            f.write("\n## Foreign Key Verification\n\n")
            
            for table_name, result in results.get('foreign_keys', {}).items():
                status_emoji = "✅" if result.get('status') == 'PASS' else "❌"
                f.write(f"### {table_name} {status_emoji}\n\n")
                f.write(f"- **Total FK Checks:** {result.get('total_checks', 0)}\n")
                f.write(f"- **Passed:** {result.get('passed_checks', 0)}\n")
                
                failed_checks = result.get('failed_checks', [])
                if failed_checks:
                    f.write(f"- **Failed:** {len(failed_checks)}\n\n")
                    f.write("**Orphaned Records:**\n")
                    for failed in failed_checks:
                        fk = failed.get('foreign_key', 'Unknown')
                        orphan_count = failed.get('orphan_count', 'Unknown')
                        f.write(f"- `{fk}` ({orphan_count} orphaned records)\n")
                
                f.write("\n")
            
            # Data samples verification
            f.write("\n## Data Sample Verification\n\n")
            f.write("| Table | Sample Size | Matches | Mismatches | Status |\n")
            f.write("|-------|-------------|---------|------------|--------|\n")
            
            for table_name, result in results.get('data_samples', {}).items():
                status_emoji = "✅" if result.get('status') == 'PASS' else "❌"
                sample_size = result.get('sample_size', 0)
                matches = result.get('matches', 0)
                mismatches = result.get('mismatches', 0)
                
                f.write(f"| {table_name} | {sample_size} | {matches} | {mismatches} | {status_emoji} |\n")
            
            # Index and performance verification
            f.write("\n## Index and Performance Verification\n\n")
            
            index_checks = results.get('indexes_performance', {}).get('index_checks', {})
            f.write("### Index Checks\n\n")
            f.write("| Index | Status |\n")
            f.write("|-------|--------|\n")
            
            for index_name, result in index_checks.items():
                status_emoji = "✅" if result.get('status') == 'PASS' else "❌"
                f.write(f"| {index_name} | {status_emoji} |\n")
            
            performance_tests = results.get('indexes_performance', {}).get('performance_tests', {})
            f.write("\n### Performance Tests\n\n")
            f.write("| Test | Execution Time (ms) | Result Count | Status |\n")
            f.write("|------|-------------------|--------------|--------|\n")
            
            for test_name, result in performance_tests.items():
                status_emoji = "✅" if result.get('status') == 'PASS' else "⚠️" if result.get('status') == 'WARN' else "❌"
                exec_time = result.get('execution_time_ms', 0)
                result_count = result.get('result_count', 0)
                
                f.write(f"| {test_name} | {exec_time:.1f} | {result_count:,} | {status_emoji} |\n")
            
            # Recommendations
            f.write(f"""
## Recommendations

### If Verification PASSED ✅
- Migration completed successfully
- Data integrity verified
- System ready for production use
- Monitor performance in production environment

### If Verification FAILED ❌
- Review detailed error messages above
- Fix data consistency issues before going live
- Re-run migration for failed tables if necessary
- Consider rollback if issues are critical

### Performance Optimization
- Monitor query performance in production
- Consider adding additional indexes for slow queries
- Set up database monitoring and alerting
- Plan for regular maintenance and statistics updates

## Next Steps

1. **Production Deployment**: If all checks pass, system is ready for production
2. **Monitoring Setup**: Configure database monitoring and alerting
3. **Backup Strategy**: Ensure backup procedures are in place
4. **Performance Tuning**: Monitor and optimize query performance
5. **User Acceptance Testing**: Conduct final user acceptance tests

---
*Report generated by Licitações Platform Migration Tool*
""")
        
        logger.info(f"Verification report saved to: {output_file}")
        return output_file

async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Verify migrated data integrity and performance')
    parser.add_argument('--sqlite-path', default='./data/licitacoes.db',
                       help='Path to SQLite database')
    parser.add_argument('--postgres-url', default=None,
                       help='PostgreSQL connection URL (or use DATABASE_URL env var)')
    parser.add_argument('--sample-size', type=int, default=100,
                       help='Sample size for data verification')
    parser.add_argument('--output-file', default=None,
                       help='Output file for verification report')
    
    args = parser.parse_args()
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Create configuration
    config = ConnectionConfig(
        sqlite_path=args.sqlite_path,
        postgres_url=args.postgres_url or os.getenv('DATABASE_URL', ''),
        postgres_direct_url=os.getenv('DIRECT_URL')
    )
    
    if not config.postgres_url:
        print("Error: PostgreSQL URL not provided. Use --postgres-url or set DATABASE_URL environment variable.")
        sys.exit(1)
    
    # Create logs directory
    os.makedirs('migration/logs', exist_ok=True)
    os.makedirs('migration/reports', exist_ok=True)
    
    # Initialize verifier
    verifier = DataVerifier(config)
    
    try:
        print("🔍 Starting comprehensive data verification...")
        
        # Run verification
        verification_results = await verifier.run_comprehensive_verification()
        
        # Generate report
        report_file = verifier.generate_verification_report(
            verification_results,
            Path(args.output_file) if args.output_file else None
        )
        
        # Save JSON results
        results_file = report_file.with_suffix('.json')
        with open(results_file, 'w') as f:
            json.dump(verification_results, f, indent=2, default=str)
        
        # Print summary
        print("\n" + "="*60)
        print("DATA VERIFICATION COMPLETED")
        print("="*60)
        
        overall_status = verification_results['overall_status']
        status_emoji = "✅" if overall_status == 'PASS' else "❌"
        
        print(f"Overall Status: {status_emoji} {overall_status}")
        print(f"Duration: {verification_results.get('duration_seconds', 0):.2f} seconds")
        print(f"Report: {report_file}")
        print(f"Results: {results_file}")
        
        # Print quick summary
        print("\nQuick Summary:")
        for category in ['table_counts', 'data_constraints', 'foreign_keys', 'data_samples']:
            category_results = verification_results.get(category, {})
            if category_results:
                passed = sum(1 for r in category_results.values() if r.get('status') == 'PASS')
                total = len(category_results)
                print(f"  {category.replace('_', ' ').title()}: {passed}/{total} passed")
        
        print("="*60)
        
        # Exit with appropriate code
        sys.exit(0 if overall_status == 'PASS' else 1)
    
    except Exception as e:
        logger.error(f"Verification failed: {e}")
        print(f"\n❌ Verification failed: {e}")
        sys.exit(1)
    
    finally:
        verifier.connection_manager.close()
        await verifier.connection_manager.close_async()

if __name__ == "__main__":
    asyncio.run(main())