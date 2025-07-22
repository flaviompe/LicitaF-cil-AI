#!/usr/bin/env python3
"""
Data Discovery Script for SQLite to Neon Migration
This script analyzes the existing SQLite database to understand data structure,
volume, and quality for migration planning.
"""

import sqlite3
import json
import csv
import os
import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration/logs/data_discovery.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class TableInfo:
    """Information about a database table"""
    name: str
    row_count: int
    column_count: int
    columns: List[Dict[str, Any]]
    sample_data: List[Dict[str, Any]]
    data_quality_issues: List[str]
    size_estimate_mb: float
    primary_key: Optional[str]
    foreign_keys: List[Dict[str, str]]
    indexes: List[str]

@dataclass
class DatabaseProfile:
    """Complete database profile"""
    database_path: str
    total_tables: int
    total_rows: int
    database_size_mb: float
    tables: List[TableInfo]
    schema_version: Optional[str]
    data_quality_score: float
    migration_complexity_score: float
    created_at: datetime

class SQLiteDataDiscovery:
    """SQLite database discovery and analysis"""
    
    def __init__(self, db_path: str, output_dir: str = "migration/discovery"):
        self.db_path = db_path
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Check if database exists
        if not os.path.exists(db_path):
            logger.warning(f"Database not found at {db_path}. Will create analysis for empty database.")
            self.db_exists = False
        else:
            self.db_exists = True
            
    def connect(self) -> sqlite3.Connection:
        """Create database connection"""
        if not self.db_exists:
            return None
            
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            return conn
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def get_database_size(self) -> float:
        """Get database file size in MB"""
        if not self.db_exists:
            return 0.0
            
        try:
            size_bytes = os.path.getsize(self.db_path)
            return size_bytes / (1024 * 1024)  # Convert to MB
        except Exception as e:
            logger.warning(f"Could not get database size: {e}")
            return 0.0
    
    def get_schema_version(self, conn: sqlite3.Connection) -> Optional[str]:
        """Attempt to get schema version if available"""
        if not conn:
            return None
            
        try:
            # Check for common version tables
            cursor = conn.cursor()
            
            # Try schema_version table
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
            if cursor.fetchone():
                cursor.execute("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
                result = cursor.fetchone()
                if result:
                    return str(result[0])
            
            # Try migrations table (common in Rails/Django)
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%migration%'")
            if cursor.fetchone():
                return "migration_table_detected"
                
            # Try user_version pragma
            cursor.execute("PRAGMA user_version")
            result = cursor.fetchone()
            if result and result[0] > 0:
                return f"user_version_{result[0]}"
                
            return "unknown"
            
        except Exception as e:
            logger.warning(f"Could not determine schema version: {e}")
            return "unknown"
    
    def get_table_list(self, conn: sqlite3.Connection) -> List[str]:
        """Get list of all tables in database"""
        if not conn:
            return []
            
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get table list: {e}")
            return []
    
    def analyze_table(self, conn: sqlite3.Connection, table_name: str) -> TableInfo:
        """Analyze individual table structure and data"""
        logger.info(f"Analyzing table: {table_name}")
        
        try:
            cursor = conn.cursor()
            
            # Get table info
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = []
            primary_key = None
            
            for row in cursor.fetchall():
                col_info = {
                    'name': row[1],
                    'type': row[2],
                    'not_null': bool(row[3]),
                    'default_value': row[4],
                    'primary_key': bool(row[5])
                }
                columns.append(col_info)
                
                if col_info['primary_key']:
                    primary_key = col_info['name']
            
            # Get foreign keys
            cursor.execute(f"PRAGMA foreign_key_list({table_name})")
            foreign_keys = []
            for row in cursor.fetchall():
                foreign_keys.append({
                    'column': row[3],
                    'references_table': row[2],
                    'references_column': row[4]
                })
            
            # Get indexes
            cursor.execute(f"PRAGMA index_list({table_name})")
            indexes = [row[1] for row in cursor.fetchall()]
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            # Get sample data (up to 5 rows)
            sample_data = []
            if row_count > 0:
                cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                column_names = [description[0] for description in cursor.description]
                for row in cursor.fetchall():
                    sample_data.append(dict(zip(column_names, row)))
            
            # Analyze data quality
            data_quality_issues = self.analyze_data_quality(conn, table_name, columns)
            
            # Estimate size
            size_estimate_mb = (row_count * len(columns) * 50) / (1024 * 1024)  # Rough estimate
            
            return TableInfo(
                name=table_name,
                row_count=row_count,
                column_count=len(columns),
                columns=columns,
                sample_data=sample_data,
                data_quality_issues=data_quality_issues,
                size_estimate_mb=size_estimate_mb,
                primary_key=primary_key,
                foreign_keys=foreign_keys,
                indexes=indexes
            )
            
        except Exception as e:
            logger.error(f"Failed to analyze table {table_name}: {e}")
            # Return empty table info
            return TableInfo(
                name=table_name,
                row_count=0,
                column_count=0,
                columns=[],
                sample_data=[],
                data_quality_issues=[f"Analysis failed: {str(e)}"],
                size_estimate_mb=0.0,
                primary_key=None,
                foreign_keys=[],
                indexes=[]
            )
    
    def analyze_data_quality(self, conn: sqlite3.Connection, table_name: str, columns: List[Dict]) -> List[str]:
        """Analyze data quality issues in table"""
        issues = []
        cursor = conn.cursor()
        
        try:
            # Check for null values in non-null columns
            for col in columns:
                if col['not_null']:
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {col['name']} IS NULL")
                    null_count = cursor.fetchone()[0]
                    if null_count > 0:
                        issues.append(f"Column '{col['name']}' has {null_count} NULL values but is marked NOT NULL")
            
            # Check for empty strings in text columns
            for col in columns:
                if 'text' in col['type'].lower() or 'varchar' in col['type'].lower():
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE TRIM({col['name']}) = ''")
                    empty_count = cursor.fetchone()[0]
                    if empty_count > 0:
                        issues.append(f"Column '{col['name']}' has {empty_count} empty string values")
            
            # Check for duplicate primary keys (shouldn't happen but let's verify)
            if any(col['primary_key'] for col in columns):
                pk_col = next(col['name'] for col in columns if col['primary_key'])
                cursor.execute(f"""
                    SELECT COUNT(*) FROM (
                        SELECT {pk_col}, COUNT(*) as cnt 
                        FROM {table_name} 
                        GROUP BY {pk_col} 
                        HAVING cnt > 1
                    )
                """)
                duplicate_count = cursor.fetchone()[0]
                if duplicate_count > 0:
                    issues.append(f"Primary key column '{pk_col}' has {duplicate_count} duplicate values")
            
            # Check for potential CNPJ/CPF columns that need validation
            for col in columns:
                if any(term in col['name'].lower() for term in ['cnpj', 'cpf', 'document']):
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE LENGTH({col['name']}) NOT IN (11, 14)")
                    invalid_count = cursor.fetchone()[0]
                    if invalid_count > 0:
                        issues.append(f"Column '{col['name']}' has {invalid_count} values with invalid length for CNPJ/CPF")
            
            # Check for email-like columns that need validation
            for col in columns:
                if 'email' in col['name'].lower():
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name} WHERE {col['name']} NOT LIKE '%@%'")
                    invalid_count = cursor.fetchone()[0]
                    if invalid_count > 0:
                        issues.append(f"Column '{col['name']}' has {invalid_count} values without @ symbol")
        
        except Exception as e:
            issues.append(f"Data quality analysis failed: {str(e)}")
        
        return issues
    
    def calculate_quality_score(self, tables: List[TableInfo]) -> float:
        """Calculate overall data quality score (0-100)"""
        if not tables:
            return 100.0  # Empty database is "perfect" quality
        
        total_issues = sum(len(table.data_quality_issues) for table in tables)
        total_tables = len(tables)
        total_rows = sum(table.row_count for table in tables)
        
        if total_rows == 0:
            return 100.0
        
        # Score based on issues per 1000 rows
        issues_per_1000 = (total_issues / total_rows) * 1000
        quality_score = max(0, 100 - issues_per_1000 * 10)
        
        return min(100.0, quality_score)
    
    def calculate_complexity_score(self, tables: List[TableInfo]) -> float:
        """Calculate migration complexity score (0-100, higher = more complex)"""
        if not tables:
            return 0.0
        
        complexity = 0
        
        # Add complexity for each table
        complexity += len(tables) * 2
        
        # Add complexity for foreign key relationships
        total_fks = sum(len(table.foreign_keys) for table in tables)
        complexity += total_fks * 5
        
        # Add complexity for large tables
        for table in tables:
            if table.row_count > 100000:
                complexity += 20
            elif table.row_count > 10000:
                complexity += 10
            elif table.row_count > 1000:
                complexity += 5
        
        # Add complexity for data quality issues
        total_issues = sum(len(table.data_quality_issues) for table in tables)
        complexity += total_issues * 3
        
        # Add complexity for non-standard column types
        for table in tables:
            for col in table.columns:
                if col['type'].upper() not in ['INTEGER', 'TEXT', 'REAL', 'BLOB', 'NUMERIC']:
                    complexity += 2
        
        # Normalize to 0-100 scale
        return min(100.0, complexity)
    
    def discover_database(self) -> DatabaseProfile:
        """Main discovery method"""
        logger.info(f"Starting database discovery for: {self.db_path}")
        
        conn = self.connect()
        
        if not conn and not self.db_exists:
            # Create profile for non-existent database
            logger.info("Database does not exist. Creating empty profile.")
            return DatabaseProfile(
                database_path=self.db_path,
                total_tables=0,
                total_rows=0,
                database_size_mb=0.0,
                tables=[],
                schema_version=None,
                data_quality_score=100.0,
                migration_complexity_score=0.0,
                created_at=datetime.now()
            )
        
        try:
            # Get basic database info
            database_size_mb = self.get_database_size()
            schema_version = self.get_schema_version(conn)
            tables_list = self.get_table_list(conn)
            
            # Analyze each table
            tables = []
            total_rows = 0
            
            for table_name in tables_list:
                table_info = self.analyze_table(conn, table_name)
                tables.append(table_info)
                total_rows += table_info.row_count
            
            # Calculate quality and complexity scores
            data_quality_score = self.calculate_quality_score(tables)
            migration_complexity_score = self.calculate_complexity_score(tables)
            
            profile = DatabaseProfile(
                database_path=self.db_path,
                total_tables=len(tables),
                total_rows=total_rows,
                database_size_mb=database_size_mb,
                tables=tables,
                schema_version=schema_version,
                data_quality_score=data_quality_score,
                migration_complexity_score=migration_complexity_score,
                created_at=datetime.now()
            )
            
            logger.info(f"Discovery completed: {len(tables)} tables, {total_rows} total rows")
            return profile
            
        finally:
            if conn:
                conn.close()
    
    def save_profile(self, profile: DatabaseProfile):
        """Save discovery profile to files"""
        timestamp = profile.created_at.strftime("%Y%m%d_%H%M%S")
        
        # Save JSON profile
        json_path = self.output_dir / f"database_profile_{timestamp}.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            # Convert dataclass to dict for JSON serialization
            profile_dict = asdict(profile)
            profile_dict['created_at'] = profile.created_at.isoformat()
            json.dump(profile_dict, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Database profile saved to: {json_path}")
        
        # Save CSV summary
        csv_path = self.output_dir / f"tables_summary_{timestamp}.csv"
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            if profile.tables:
                writer = csv.DictWriter(f, fieldnames=[
                    'table_name', 'row_count', 'column_count', 'size_estimate_mb',
                    'data_quality_issues', 'foreign_keys_count', 'indexes_count'
                ])
                writer.writeheader()
                
                for table in profile.tables:
                    writer.writerow({
                        'table_name': table.name,
                        'row_count': table.row_count,
                        'column_count': table.column_count,
                        'size_estimate_mb': f"{table.size_estimate_mb:.2f}",
                        'data_quality_issues': len(table.data_quality_issues),
                        'foreign_keys_count': len(table.foreign_keys),
                        'indexes_count': len(table.indexes)
                    })
        
        logger.info(f"Tables summary saved to: {csv_path}")
        
        # Save detailed report
        report_path = self.output_dir / f"discovery_report_{timestamp}.md"
        self.generate_report(profile, report_path)
    
    def generate_report(self, profile: DatabaseProfile, output_path: Path):
        """Generate detailed markdown report"""
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(f"""# Database Discovery Report

**Generated:** {profile.created_at.strftime("%Y-%m-%d %H:%M:%S")}
**Database:** {profile.database_path}
**Schema Version:** {profile.schema_version or 'Unknown'}

## Summary

- **Total Tables:** {profile.total_tables}
- **Total Rows:** {profile.total_rows:,}
- **Database Size:** {profile.database_size_mb:.2f} MB
- **Data Quality Score:** {profile.data_quality_score:.1f}/100
- **Migration Complexity:** {profile.migration_complexity_score:.1f}/100

## Migration Readiness Assessment

""")
            
            # Migration readiness based on scores
            if profile.data_quality_score >= 90:
                f.write("✅ **Data Quality:** Excellent - Ready for migration\n")
            elif profile.data_quality_score >= 70:
                f.write("⚠️ **Data Quality:** Good - Minor issues to address\n")
            else:
                f.write("❌ **Data Quality:** Needs attention before migration\n")
            
            if profile.migration_complexity_score <= 30:
                f.write("✅ **Migration Complexity:** Low - Straightforward migration\n")
            elif profile.migration_complexity_score <= 60:
                f.write("⚠️ **Migration Complexity:** Medium - Requires planning\n")
            else:
                f.write("❌ **Migration Complexity:** High - Complex migration\n")
            
            f.write(f"""
## Tables Analysis

| Table Name | Rows | Columns | Size (MB) | Issues | FK | Indexes |
|------------|------|---------|-----------|--------|----|---------|\n""")
            
            for table in profile.tables:
                f.write(f"| {table.name} | {table.row_count:,} | {table.column_count} | "
                       f"{table.size_estimate_mb:.2f} | {len(table.data_quality_issues)} | "
                       f"{len(table.foreign_keys)} | {len(table.indexes)} |\n")
            
            # Data quality issues
            f.write("\n## Data Quality Issues\n\n")
            for table in profile.tables:
                if table.data_quality_issues:
                    f.write(f"### {table.name}\n")
                    for issue in table.data_quality_issues:
                        f.write(f"- {issue}\n")
                    f.write("\n")
            
            # Recommendations
            f.write("""## Migration Recommendations

### Pre-Migration Steps
1. **Data Cleansing:** Address data quality issues identified above
2. **Backup Creation:** Create complete backup of current database
3. **Schema Validation:** Verify all constraints and relationships
4. **Performance Testing:** Test migration scripts with sample data

### Migration Strategy
""")
            
            if profile.total_rows < 10000:
                f.write("- **Single Batch:** Small dataset allows single migration batch\n")
            else:
                f.write("- **Incremental Batches:** Large dataset requires batch processing\n")
            
            if profile.migration_complexity_score > 50:
                f.write("- **Extended Testing:** High complexity requires extensive testing\n")
            
            f.write("""
### Post-Migration Validation
1. **Data Verification:** Compare row counts and sample data
2. **Integrity Checks:** Verify all constraints and relationships
3. **Performance Testing:** Ensure query performance meets requirements
4. **User Acceptance:** Validate business functionality

## Next Steps

1. Review data quality issues and create cleansing plan
2. Set up Neon database environment
3. Develop and test migration scripts
4. Execute migration in staging environment
5. Validate migrated data and performance
6. Schedule production migration
""")
        
        logger.info(f"Discovery report saved to: {output_path}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Discover SQLite database for migration to Neon')
    parser.add_argument('--db-path', default='./data/licitacoes.db', 
                       help='Path to SQLite database file')
    parser.add_argument('--output-dir', default='migration/discovery',
                       help='Output directory for discovery results')
    
    args = parser.parse_args()
    
    # Create logs directory
    os.makedirs('migration/logs', exist_ok=True)
    
    # Run discovery
    discovery = SQLiteDataDiscovery(args.db_path, args.output_dir)
    profile = discovery.discover_database()
    discovery.save_profile(profile)
    
    # Print summary
    print(f"""
🔍 DATABASE DISCOVERY COMPLETED
===============================

Database: {profile.database_path}
Tables: {profile.total_tables}
Total Rows: {profile.total_rows:,}
Size: {profile.database_size_mb:.2f} MB
Data Quality: {profile.data_quality_score:.1f}/100
Migration Complexity: {profile.migration_complexity_score:.1f}/100

Results saved to: {args.output_dir}
""")

if __name__ == "__main__":
    main()