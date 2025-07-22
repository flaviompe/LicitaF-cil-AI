# Comprehensive Testing Strategy for SQLite to Neon Migration

## Overview

This document outlines a comprehensive testing strategy to ensure the successful migration from SQLite to Neon PostgreSQL database, covering all aspects from unit tests to production validation.

## Testing Pyramid

```
                    /\
                   /  \
              E2E Tests (5%)
                 /    \
            Integration Tests (20%)
               /        \
          Unit Tests (75%)
```

## Testing Phases

### Phase 1: Pre-Migration Testing
- [ ] Current system baseline testing
- [ ] Data integrity verification
- [ ] Performance benchmarking
- [ ] API endpoint validation

### Phase 2: Migration Testing
- [ ] Schema migration validation
- [ ] Data migration verification
- [ ] Connection testing
- [ ] Configuration validation

### Phase 3: Post-Migration Testing
- [ ] Full application testing
- [ ] Performance regression testing
- [ ] Load testing
- [ ] Security testing

### Phase 4: Production Validation
- [ ] Smoke testing
- [ ] User acceptance testing
- [ ] Monitoring validation
- [ ] Rollback testing

## Test Categories

### 1. Database Tests

#### Schema Tests
- Table structure validation
- Index effectiveness
- Constraint verification
- Trigger functionality
- Enum type validation
- Foreign key relationships

#### Data Integrity Tests
- Row count validation
- Data type conversion
- Brazilian validation functions (CNPJ, CPF)
- JSON data structure integrity
- Full-text search functionality

#### Performance Tests
- Query execution time
- Connection pool performance
- Index utilization
- Concurrent connection handling

### 2. Application Tests

#### Unit Tests
- Model validation
- Business logic
- Utility functions
- API endpoints
- Database operations

#### Integration Tests
- Database connectivity
- ORM functionality
- API workflows
- External service integration
- Background job processing

#### End-to-End Tests
- Complete user workflows
- Cross-module interactions
- Real data scenarios
- Multi-user operations

### 3. Migration-Specific Tests

#### Compatibility Tests
- SQLite vs PostgreSQL behavior
- Data type conversions
- Query syntax differences
- Error handling changes

#### Rollback Tests
- Migration rollback procedures
- Data recovery validation
- System state consistency
- Configuration restoration

## Test Environment Setup

### Test Database Configuration

#### Docker Test Environment
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: test_licitacoes
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
    ports:
      - "5433:5432"
    volumes:
      - ./migration/scripts:/docker-entrypoint-initdb.d
  
  app-test:
    build: .
    environment:
      DATABASE_URL: postgresql://test_user:test_password@postgres-test:5432/test_licitacoes
      ENVIRONMENT: testing
    depends_on:
      - postgres-test
```

#### Test Data Fixtures
```python
# tests/fixtures/database.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:15") as container:
        yield container

@pytest.fixture(scope="session")
def test_engine(postgres_container):
    engine = create_engine(postgres_container.get_connection_url())
    # Create tables
    from migration.code_templates.python_models import Base
    Base.metadata.create_all(engine)
    return engine

@pytest.fixture
def db_session(test_engine):
    Session = sessionmaker(bind=test_engine)
    session = Session()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
```

## Test Implementation

### 1. Database Schema Tests

```python
# tests/test_database_schema.py
import pytest
from sqlalchemy import inspect, text
from migration.code_templates.python_models import User, Company, Opportunity

class TestDatabaseSchema:
    """Test database schema integrity"""
    
    def test_all_tables_exist(self, db_session):
        """Verify all required tables exist"""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        
        expected_tables = [
            'users', 'companies', 'opportunities', 'proposals',
            'documents', 'certificates', 'notifications',
            'procurement_monitors', 'legal_consultations'
        ]
        
        for table in expected_tables:
            assert table in tables, f"Table {table} not found"
    
    def test_enum_types_exist(self, db_session):
        """Verify all enum types are created"""
        result = db_session.execute(text("""
            SELECT typname FROM pg_type WHERE typtype = 'e'
        """)).fetchall()
        
        enum_names = [row[0] for row in result]
        expected_enums = [
            'user_role', 'company_type', 'opportunity_modality',
            'opportunity_status', 'proposal_status'
        ]
        
        for enum_name in expected_enums:
            assert enum_name in enum_names, f"Enum {enum_name} not found"
    
    def test_indexes_exist(self, db_session):
        """Verify critical indexes are created"""
        result = db_session.execute(text("""
            SELECT indexname, tablename 
            FROM pg_indexes 
            WHERE schemaname = 'public'
        """)).fetchall()
        
        critical_indexes = [
            ('idx_users_email', 'users'),
            ('idx_companies_cnpj', 'companies'),
            ('idx_opportunities_status', 'opportunities')
        ]
        
        index_pairs = [(row[0], row[1]) for row in result]
        
        for index_name, table_name in critical_indexes:
            assert (index_name, table_name) in index_pairs, \
                f"Index {index_name} on {table_name} not found"
    
    def test_foreign_key_constraints(self, db_session):
        """Verify foreign key relationships"""
        inspector = inspect(db_session.bind)
        
        # Test companies -> users relationship
        fks = inspector.get_foreign_keys('companies')
        user_fk = next((fk for fk in fks if fk['referred_table'] == 'users'), None)
        assert user_fk is not None, "companies.user_id foreign key not found"
        
        # Test proposals -> opportunities relationship
        fks = inspector.get_foreign_keys('proposals')
        opp_fk = next((fk for fk in fks if fk['referred_table'] == 'opportunities'), None)
        assert opp_fk is not None, "proposals.opportunity_id foreign key not found"
```

### 2. Data Migration Tests

```python
# tests/test_data_migration.py
import pytest
from decimal import Decimal
from datetime import datetime, date
from migration.code_templates.python_models import User, Company, Opportunity, Proposal

class TestDataMigration:
    """Test data migration integrity and transformations"""
    
    def test_user_data_migration(self, db_session):
        """Test user data migration and transformations"""
        # Create test user
        user = User(
            email="test@example.com",
            first_name="João",
            last_name="Silva",
            phone="11987654321"
        )
        
        db_session.add(user)
        db_session.commit()
        
        # Verify user was created with correct data
        created_user = db_session.query(User).filter_by(email="test@example.com").first()
        assert created_user is not None
        assert created_user.full_name == "João Silva"
        assert created_user.role.value == "USER"
        assert created_user.subscription_tier.value == "FREE"
        assert created_user.is_active is True
        assert created_user.id is not None
    
    def test_company_cnpj_validation(self, db_session):
        """Test CNPJ validation and formatting"""
        user = User(email="company@test.com")
        db_session.add(user)
        db_session.flush()
        
        # Test valid CNPJ
        company = Company(
            user_id=user.id,
            legal_name="Test Company Ltda",
            cnpj="12345678000195"  # Valid CNPJ format
        )
        
        db_session.add(company)
        db_session.commit()
        
        created_company = db_session.query(Company).first()
        assert created_company.cnpj == "12345678000195"
        assert created_company.formatted_cnpj == "12.345.678/0001-95"
    
    def test_opportunity_financial_data(self, db_session):
        """Test opportunity financial data migration"""
        opportunity = Opportunity(
            title="Test Opportunity",
            organ="Test Ministry",
            estimated_value=Decimal("150000.50"),
            modality="PREGAO",
            currency="BRL"
        )
        
        db_session.add(opportunity)
        db_session.commit()
        
        created_opp = db_session.query(Opportunity).first()
        assert created_opp.estimated_value == Decimal("150000.50")
        assert created_opp.currency == "BRL"
        assert created_opp.status.value == "PUBLISHED"
    
    def test_jsonb_data_handling(self, db_session):
        """Test JSONB data storage and retrieval"""
        opportunity = Opportunity(
            title="Test with JSON",
            organ="Test Ministry",
            modality="PREGAO",
            technical_requirements={
                "languages": ["Python", "JavaScript"],
                "database": "PostgreSQL",
                "experience_years": 5
            },
            ai_analysis={
                "complexity": "medium",
                "success_probability": 0.75,
                "risk_factors": ["timeline", "technical"]
            }
        )
        
        db_session.add(opportunity)
        db_session.commit()
        
        created_opp = db_session.query(Opportunity).first()
        assert created_opp.technical_requirements["languages"] == ["Python", "JavaScript"]
        assert created_opp.ai_analysis["success_probability"] == 0.75
```

### 3. Performance Tests

```python
# tests/test_performance.py
import pytest
import time
from sqlalchemy import func, text
from migration.code_templates.python_models import User, Company, Opportunity

class TestPerformance:
    """Test database performance after migration"""
    
    def test_connection_pool_performance(self, db_session):
        """Test connection pool efficiency"""
        start_time = time.time()
        
        # Simulate multiple quick queries
        for i in range(100):
            db_session.execute(text("SELECT 1")).fetchone()
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete 100 simple queries in under 1 second
        assert total_time < 1.0, f"Connection pool too slow: {total_time}s"
    
    def test_index_performance(self, db_session, sample_data):
        """Test query performance with indexes"""
        # Test email lookup (indexed)
        start_time = time.time()
        user = db_session.query(User).filter(User.email == "test@example.com").first()
        email_query_time = time.time() - start_time
        
        # Should be very fast with index
        assert email_query_time < 0.01, f"Email query too slow: {email_query_time}s"
        
        # Test CNPJ lookup (indexed)
        start_time = time.time()
        company = db_session.query(Company).filter(Company.cnpj == "12345678000195").first()
        cnpj_query_time = time.time() - start_time
        
        assert cnpj_query_time < 0.01, f"CNPJ query too slow: {cnpj_query_time}s"
    
    def test_full_text_search_performance(self, db_session, sample_opportunities):
        """Test full-text search performance"""
        start_time = time.time()
        
        # Test Portuguese full-text search
        results = db_session.query(Opportunity).filter(
            func.to_tsvector('portuguese', Opportunity.title + ' ' + Opportunity.description)
            .match(func.to_tsquery('portuguese', 'software & desenvolvimento'))
        ).limit(10).all()
        
        search_time = time.time() - start_time
        
        # Full-text search should be fast even with moderate data
        assert search_time < 0.1, f"Full-text search too slow: {search_time}s"
        assert len(results) >= 0  # Should not error
    
    def test_aggregate_query_performance(self, db_session, sample_data):
        """Test complex aggregate queries"""
        start_time = time.time()
        
        # Complex aggregation query
        stats = db_session.query(
            func.count(Opportunity.id).label('total_opportunities'),
            func.avg(Opportunity.estimated_value).label('avg_value'),
            func.sum(Opportunity.estimated_value).label('total_value'),
            func.max(Opportunity.created_at).label('latest_opportunity')
        ).first()
        
        query_time = time.time() - start_time
        
        assert query_time < 0.5, f"Aggregate query too slow: {query_time}s"
        assert stats.total_opportunities >= 0
```

### 4. Integration Tests

```python
# tests/test_integration.py
import pytest
import asyncio
from httpx import AsyncClient
from migration.code_templates.database_config import get_database_manager

class TestIntegration:
    """Test integration between components"""
    
    @pytest.mark.asyncio
    async def test_database_health_check(self):
        """Test database health monitoring"""
        db_manager = get_database_manager()
        
        # Test sync connection
        assert db_manager.test_connection() is True
        
        # Test async connection
        assert await db_manager.test_async_connection() is True
        
        # Test health checker
        from migration.code_templates.database_config import get_health_checker
        health_checker = get_health_checker()
        health = health_checker.check_health()
        
        assert health["database"] == "healthy"
        assert health["checks"]["connection"] is True
    
    @pytest.mark.asyncio
    async def test_api_endpoints_with_postgres(self, test_client):
        """Test API endpoints work with PostgreSQL"""
        # Test user creation
        user_data = {
            "email": "api@test.com",
            "first_name": "API",
            "last_name": "Test",
            "password": "testpassword"
        }
        
        response = await test_client.post("/api/users", json=user_data)
        assert response.status_code == 201
        user = response.json()
        assert user["email"] == "api@test.com"
        
        # Test company creation
        company_data = {
            "legal_name": "API Test Company",
            "cnpj": "12345678000195",
            "user_id": user["id"]
        }
        
        response = await test_client.post("/api/companies", json=company_data)
        assert response.status_code == 201
        
        # Test opportunity search
        response = await test_client.get("/api/opportunities?search=test")
        assert response.status_code == 200
    
    def test_background_jobs_integration(self, db_session):
        """Test background job integration with PostgreSQL"""
        # This would test actual background job processing
        # like opportunity monitoring, notifications, etc.
        pass
```

### 5. Load Testing

```python
# tests/test_load.py
import pytest
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import time

class TestLoad:
    """Load testing for the migrated system"""
    
    @pytest.mark.asyncio
    async def test_concurrent_database_connections(self):
        """Test multiple concurrent database connections"""
        from migration.code_templates.database_config import get_database_manager
        
        db_manager = get_database_manager()
        
        async def query_database():
            async with db_manager.get_async_session() as session:
                from sqlalchemy import text
                result = await session.execute(text("SELECT COUNT(*) FROM users"))
                return result.scalar()
        
        # Run 50 concurrent queries
        start_time = time.time()
        tasks = [query_database() for _ in range(50)]
        results = await asyncio.gather(*tasks)
        end_time = time.time()
        
        # All queries should succeed
        assert all(isinstance(r, int) for r in results)
        
        # Should handle 50 concurrent queries reasonably fast
        total_time = end_time - start_time
        assert total_time < 5.0, f"Concurrent queries too slow: {total_time}s"
    
    @pytest.mark.asyncio
    async def test_api_load(self, test_client):
        """Test API load handling"""
        
        async def make_request():
            response = await test_client.get("/api/opportunities?limit=10")
            return response.status_code
        
        # Simulate 100 concurrent API requests
        start_time = time.time()
        tasks = [make_request() for _ in range(100)]
        status_codes = await asyncio.gather(*tasks)
        end_time = time.time()
        
        # All requests should succeed
        assert all(code == 200 for code in status_codes)
        
        # Should handle load efficiently
        total_time = end_time - start_time
        assert total_time < 10.0, f"API load test too slow: {total_time}s"
```

## Test Automation

### GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/test-migration.yml
name: Migration Testing

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-migration:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_licitacoes
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-test.txt
    
    - name: Run schema migration
      run: |
        python -m migration.scripts.007_create_master_migration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_licitacoes
    
    - name: Run unit tests
      run: |
        pytest tests/unit/ -v --cov=migration
    
    - name: Run integration tests
      run: |
        pytest tests/integration/ -v
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_licitacoes
    
    - name: Run performance tests
      run: |
        pytest tests/performance/ -v -m "not slow"
    
    - name: Run data verification
      run: |
        python migration/data/007_data_verification.py
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_licitacoes
```

### Test Coverage Requirements

- **Unit Tests**: 90% code coverage minimum
- **Integration Tests**: All critical paths covered
- **API Tests**: All endpoints tested
- **Performance Tests**: All critical queries benchmarked
- **Migration Tests**: All migration scripts validated

## Test Data Management

### Fixtures and Factories

```python
# tests/factories.py
import factory
from migration.code_templates.python_models import User, Company, Opportunity

class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session_persistence = "commit"
    
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    phone = factory.Faker('phone_number')

class CompanyFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Company
        sqlalchemy_session_persistence = "commit"
    
    user = factory.SubFactory(UserFactory)
    legal_name = factory.Faker('company')
    cnpj = factory.Sequence(lambda n: f"1234567800{n:04d}")

class OpportunityFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Opportunity
        sqlalchemy_session_persistence = "commit"
    
    title = factory.Faker('sentence', nb_words=4)
    organ = factory.Faker('company')
    estimated_value = factory.Faker('pydecimal', left_digits=6, right_digits=2, positive=True)
    modality = factory.Iterator(['PREGAO', 'CONCORRENCIA', 'TOMADA_PRECOS'])
```

## Monitoring and Reporting

### Test Metrics Dashboard

Track key metrics:
- Test execution time
- Code coverage percentage
- Failed test count
- Performance benchmark results
- Migration success rate

### Automated Reports

Generate automated test reports:
- Daily test execution summary
- Performance regression alerts
- Migration validation reports
- Coverage trend analysis

## Risk Mitigation

### Test Environment Isolation

- Separate test databases for each test suite
- Container-based testing for isolation
- Automatic cleanup after test runs

### Data Safety

- Never run tests against production data
- Use synthetic test data
- Implement test data factories
- Automated test data cleanup

### Performance Safeguards

- Performance regression detection
- Load testing thresholds
- Resource usage monitoring
- Automatic test termination for runaway tests

## Success Criteria

### Pre-Production Checklist

- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] Performance tests within acceptable limits
- [ ] Migration verification successful
- [ ] Security tests pass
- [ ] Load tests meet requirements
- [ ] API compatibility verified
- [ ] Database integrity confirmed

### Production Readiness Gates

1. **Green Build**: All automated tests pass
2. **Performance Approved**: No performance regressions
3. **Security Cleared**: Security scans pass
4. **Data Verified**: Migration data integrity confirmed
5. **Monitoring Ready**: All monitoring systems operational

This comprehensive testing strategy ensures the migration is thoroughly validated at every level, from individual functions to complete user workflows, providing confidence in the production deployment.