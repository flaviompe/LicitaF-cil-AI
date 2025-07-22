# Data Migration Strategy - SQLite to Neon Database

## Overview

This document outlines the comprehensive data migration strategy from SQLite to Neon PostgreSQL database for the Licitações Platform, ensuring zero data loss and minimal downtime.

## Migration Approach

### Phase 1: Data Assessment and Preparation
- **Data Discovery**: Identify all existing data in SQLite database
- **Data Mapping**: Map SQLite data types to PostgreSQL equivalents
- **Data Validation**: Ensure data integrity and consistency
- **Backup Creation**: Create complete backup of existing SQLite data

### Phase 2: Data Transformation and Cleansing
- **Data Cleansing**: Remove duplicates, fix inconsistencies
- **Format Conversion**: Convert data formats for PostgreSQL compatibility
- **Validation Enhancement**: Apply new validation rules (CNPJ, CPF, etc.)
- **Reference Integrity**: Ensure foreign key relationships

### Phase 3: Migration Execution
- **Incremental Migration**: Migrate data in batches to minimize impact
- **Real-time Validation**: Validate each batch during migration
- **Rollback Capability**: Maintain ability to rollback on failures
- **Progress Monitoring**: Track migration progress and performance

### Phase 4: Data Verification and Reconciliation
- **Data Comparison**: Compare source vs destination data
- **Integrity Validation**: Verify all constraints and relationships
- **Performance Testing**: Ensure optimal performance with migrated data
- **User Acceptance**: Validate business functionality

## Migration Strategy Details

### Data Volume Assessment

Based on the schema analysis, the expected data volumes are:

| Table Category | Expected Volume | Migration Priority |
|---------------|----------------|-------------------|
| Users & Companies | < 10,000 records | High |
| Opportunities | < 100,000 records | High |
| Documents | < 50,000 files | Medium |
| Proposals | < 25,000 records | High |
| Notifications | < 500,000 records | Low |
| Analytics | < 1,000,000 records | Low |

### Migration Order

1. **Core Entities** (Users, Companies)
2. **Master Data** (Opportunities, Categories)
3. **Transactional Data** (Proposals, Documents)
4. **Supporting Data** (Notifications, Analytics)
5. **Historical Data** (Logs, Archives)

### Data Transformation Rules

#### User Data
- Map SQLite user roles to new enum types
- Generate UUIDs for new primary keys
- Validate email formats and phone numbers
- Set default subscription tiers

#### Company Data
- Validate CNPJ format and check digits
- Map company types to Brazilian enum types
- Geocode addresses for location data
- Set verification status based on document availability

#### Opportunity Data
- Parse and categorize opportunity types
- Extract and validate monetary values
- Standardize location information
- Generate search vectors for full-text search

#### Document Data
- Hash files for integrity verification
- Extract metadata and text content
- Generate thumbnails and previews
- Set up version control relationships

## Migration Scripts Architecture

### Script Organization

```
migration/data/
├── 001_data_discovery.py        # Analyze existing SQLite data
├── 002_data_validation.py       # Validate and cleanse data
├── 003_data_transformation.py   # Transform data formats
├── 004_core_migration.py        # Migrate core entities
├── 005_document_migration.py    # Migrate files and documents
├── 006_analytical_migration.py  # Migrate analytics data
├── 007_data_verification.py     # Verify migrated data
├── 008_performance_test.py      # Test performance
└── utils/
    ├── connection_manager.py    # Database connections
    ├── data_validator.py        # Data validation utilities
    ├── progress_tracker.py      # Migration progress tracking
    └── rollback_manager.py      # Rollback capabilities
```

### Migration Configuration

```yaml
# migration_config.yaml
migration:
  batch_size: 1000
  max_retries: 3
  timeout_seconds: 300
  
databases:
  source:
    type: sqlite
    path: "./data/licitacoes.db"
  destination:
    type: postgresql
    url: "${DATABASE_URL}"
    
validation:
  strict_mode: true
  stop_on_error: false
  log_level: INFO
  
performance:
  parallel_workers: 4
  memory_limit_mb: 512
  checkpoint_frequency: 5000
```

## Risk Mitigation

### Data Loss Prevention
- **Multiple Backups**: Create backups at multiple stages
- **Incremental Migration**: Migrate in small, verifiable batches
- **Checksum Validation**: Verify data integrity using checksums
- **Rollback Scripts**: Maintain ability to revert changes

### Performance Impact Mitigation
- **Off-Peak Migration**: Schedule during low-usage periods
- **Batch Processing**: Process data in optimal batch sizes
- **Connection Pooling**: Use connection pools to prevent resource exhaustion
- **Progress Monitoring**: Real-time monitoring of migration progress

### Data Consistency Assurance
- **Transaction Isolation**: Use transactions for atomic operations
- **Foreign Key Validation**: Ensure referential integrity
- **Constraint Checking**: Validate all database constraints
- **Business Rule Validation**: Apply business logic validation

## Rollback Strategy

### Rollback Triggers
- Data validation failures exceeding threshold
- Performance degradation beyond acceptable limits
- Critical errors in data transformation
- User-initiated rollback request

### Rollback Process
1. **Stop Migration**: Immediately halt ongoing migration
2. **Assess Impact**: Determine extent of changes
3. **Restore Backup**: Restore from most recent valid backup
4. **Verify Restoration**: Ensure system is in consistent state
5. **Investigate Issues**: Analyze root cause of problems

## Monitoring and Logging

### Migration Metrics
- **Records Processed**: Count of migrated records per table
- **Success Rate**: Percentage of successful migrations
- **Processing Speed**: Records per second migration rate
- **Error Rate**: Frequency and types of errors
- **Resource Usage**: CPU, memory, and disk utilization

### Logging Strategy
- **Structured Logging**: Use JSON format for log entries
- **Log Levels**: DEBUG, INFO, WARNING, ERROR, CRITICAL
- **Audit Trail**: Complete record of all migration activities
- **Error Details**: Detailed error messages and stack traces

## Post-Migration Validation

### Data Integrity Checks
- **Row Counts**: Verify record counts match between systems
- **Checksum Verification**: Compare data checksums
- **Sampling Validation**: Deep validation of random data samples
- **Business Logic Testing**: Verify business rules work correctly

### Performance Validation
- **Query Performance**: Test critical queries for acceptable performance
- **Index Effectiveness**: Verify indexes are working optimally
- **Connection Pool**: Test connection pooling under load
- **Memory Usage**: Monitor memory consumption patterns

### User Acceptance Testing
- **Core Functionality**: Test all major platform features
- **Data Accuracy**: Verify data appears correctly in UI
- **Search Functionality**: Test full-text search capabilities
- **Reporting**: Validate analytics and reporting features

## Success Criteria

The data migration is considered successful when:

1. **Zero Data Loss**: All data successfully migrated with integrity
2. **Performance Requirements Met**: Query performance within SLA
3. **All Tests Pass**: Comprehensive test suite passes 100%
4. **User Acceptance**: Business users validate functionality
5. **Monitoring Green**: All health checks and monitors are healthy
6. **Documentation Complete**: All procedures and configurations documented

## Timeline and Milestones

### Week 1: Preparation and Assessment
- [ ] Complete data discovery and analysis
- [ ] Develop and test transformation scripts
- [ ] Set up monitoring and logging infrastructure
- [ ] Create comprehensive backups

### Week 2: Migration Execution
- [ ] Execute core data migration
- [ ] Migrate documents and files
- [ ] Transfer analytical and historical data
- [ ] Perform data verification and validation

### Week 3: Testing and Optimization
- [ ] Conduct performance testing
- [ ] Execute user acceptance testing
- [ ] Optimize queries and indexes
- [ ] Complete documentation

### Week 4: Go-Live and Support
- [ ] Switch to production Neon database
- [ ] Monitor system performance
- [ ] Provide user support
- [ ] Document lessons learned

This comprehensive data migration strategy ensures a smooth, reliable transition from SQLite to Neon Database with minimal risk and maximum data integrity.