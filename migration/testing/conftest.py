#!/usr/bin/env python3
"""
Pytest configuration and shared fixtures for migration testing
"""

import pytest
import asyncio
import logging
import os
from typing import Generator, AsyncGenerator
from decimal import Decimal
from datetime import datetime, date, timedelta

# SQLAlchemy imports
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from sqlalchemy.engine import Engine

# PostgreSQL test container
try:
    from testcontainers.postgres import PostgresContainer
    TESTCONTAINERS_AVAILABLE = True
except ImportError:
    TESTCONTAINERS_AVAILABLE = False
    logging.warning("testcontainers not available - using local PostgreSQL for testing")

# Project imports
from migration.code_templates.python_models import Base, User, Company, Opportunity, Proposal, Certificate, Notification, ProcurementMonitor
from migration.code_templates.database_config import DatabaseManager, DatabaseSettings

# Configure logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Test configuration
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/test_licitacoes")
USE_TESTCONTAINERS = os.getenv("USE_TESTCONTAINERS", "false").lower() == "true"

# ================================================================
# PYTEST CONFIGURATION
# ================================================================

def pytest_configure(config):
    """Configure pytest with custom markers and settings"""
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as performance test"
    )
    config.addinivalue_line(
        "markers", "database: mark test as database test"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test items during collection"""
    # Skip slow tests by default unless explicitly requested
    if config.getoption("-m") != "slow" and not config.getoption("--runslow"):
        skip_slow = pytest.mark.skip(reason="need --runslow option to run")
        for item in items:
            if "slow" in item.keywords:
                item.add_marker(skip_slow)

def pytest_addoption(parser):
    """Add custom command line options"""
    parser.addoption(
        "--runslow", action="store_true", default=False, help="run slow tests"
    )
    parser.addoption(
        "--use-testcontainers", action="store_true", default=False, 
        help="use testcontainers for isolated testing"
    )

# ================================================================
# DATABASE FIXTURES
# ================================================================

@pytest.fixture(scope="session")
def postgres_container():
    """PostgreSQL test container (session-scoped)"""
    if not TESTCONTAINERS_AVAILABLE or not USE_TESTCONTAINERS:
        # Use local PostgreSQL
        logger.info("Using local PostgreSQL for testing")
        yield None
        return
    
    logger.info("Starting PostgreSQL test container...")
    with PostgresContainer("postgres:15") as container:
        # Apply our schema to the container
        engine = create_engine(container.get_connection_url())
        
        # Create our custom types and functions first
        with engine.connect() as conn:
            # Enable required extensions
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            conn.commit()
        
        # Create all tables
        Base.metadata.create_all(engine)
        
        logger.info(f"PostgreSQL container ready: {container.get_connection_url()}")
        yield container
        
        logger.info("Stopping PostgreSQL test container")

@pytest.fixture(scope="session")
def test_database_url(postgres_container):
    """Get test database URL"""
    if postgres_container and TESTCONTAINERS_AVAILABLE and USE_TESTCONTAINERS:
        return postgres_container.get_connection_url()
    return TEST_DATABASE_URL

@pytest.fixture(scope="session")
def test_engine(test_database_url):
    """Create test database engine (session-scoped)"""
    logger.info(f"Creating test engine with URL: {test_database_url[:50]}...")
    
    engine = create_engine(
        test_database_url,
        echo=False,  # Disable query logging in tests
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "options": "-c timezone=America/Sao_Paulo"
        }
    )
    
    # Create database schema if not using containers
    if not (postgres_container and TESTCONTAINERS_AVAILABLE and USE_TESTCONTAINERS):
        with engine.connect() as conn:
            # Enable extensions
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS unaccent"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
                conn.commit()
            except Exception as e:
                logger.warning(f"Failed to create extensions (may already exist): {e}")
        
        # Create all tables
        Base.metadata.create_all(engine)
        logger.info("Database schema created")
    
    yield engine
    
    # Cleanup
    engine.dispose()
    logger.info("Test engine disposed")

@pytest.fixture(scope="function")
def db_session(test_engine) -> Generator[Session, None, None]:
    """Create database session for each test (function-scoped)"""
    connection = test_engine.connect()
    transaction = connection.begin()
    
    # Create session
    Session = sessionmaker(bind=connection)
    session = Session()
    
    yield session
    
    # Cleanup
    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture(scope="function")
def db_manager(test_database_url) -> DatabaseManager:
    """Create database manager for testing"""
    settings = DatabaseSettings(
        database_url=test_database_url,
        environment="testing",
        pool_size=5,
        max_overflow=5,
        enable_query_logging=False
    )
    return DatabaseManager(settings)

# ================================================================
# DATA FIXTURES
# ================================================================

@pytest.fixture
def sample_user(db_session) -> User:
    """Create a sample user for testing"""
    user = User(
        email="test@example.com",
        first_name="Test",
        last_name="User",
        phone="11987654321"
    )
    db_session.add(user)
    db_session.flush()  # Get ID without committing
    return user

@pytest.fixture
def sample_users(db_session) -> list[User]:
    """Create multiple sample users for testing"""
    users = []
    for i in range(5):
        user = User(
            email=f"user{i}@example.com",
            first_name=f"User{i}",
            last_name="Test",
            phone=f"1198765432{i}"
        )
        users.append(user)
        db_session.add(user)
    
    db_session.flush()
    return users

@pytest.fixture
def sample_company(db_session, sample_user) -> Company:
    """Create a sample company for testing"""
    company = Company(
        user_id=sample_user.id,
        legal_name="Test Company Ltda",
        cnpj="12345678000195",
        company_type="LTDA",
        address_city="São Paulo",
        address_state="SP",
        business_sectors=["Technology", "Services"]
    )
    db_session.add(company)
    db_session.flush()
    return company

@pytest.fixture
def sample_opportunity(db_session) -> Opportunity:
    """Create a sample opportunity for testing"""
    opportunity = Opportunity(
        title="Software Development Services",
        description="Development of web application for public services",
        organ="Municipality of São Paulo",
        modality="PREGAO",
        estimated_value=Decimal("100000.00"),
        keywords=["software", "development", "web"],
        tags=["technology", "municipal"],
        state="SP",
        city="São Paulo"
    )
    db_session.add(opportunity)
    db_session.flush()
    return opportunity

@pytest.fixture
def sample_opportunities(db_session) -> list[Opportunity]:
    """Create multiple sample opportunities for testing"""
    opportunities = []
    
    base_opportunities = [
        {
            "title": "Software Development Project",
            "organ": "Ministry of Technology",
            "modality": "PREGAO",
            "estimated_value": Decimal("75000.00"),
            "keywords": ["software", "development", "web"],
            "state": "SP"
        },
        {
            "title": "IT Infrastructure Upgrade",
            "organ": "Ministry of Education",
            "modality": "CONCORRENCIA",
            "estimated_value": Decimal("150000.00"),
            "keywords": ["infrastructure", "network", "servers"],
            "state": "RJ"
        },
        {
            "title": "Consulting Services",
            "organ": "Municipality of Campinas",
            "modality": "PREGAO",
            "estimated_value": Decimal("25000.00"),
            "keywords": ["consulting", "advisory"],
            "state": "SP"
        },
        {
            "title": "Database Migration Project",
            "organ": "State of São Paulo",
            "modality": "TOMADA_PRECOS",
            "estimated_value": Decimal("50000.00"),
            "keywords": ["database", "migration", "postgresql"],
            "state": "SP"
        },
        {
            "title": "Mobile App Development",
            "organ": "Ministry of Health",
            "modality": "PREGAO",
            "estimated_value": Decimal("120000.00"),
            "keywords": ["mobile", "app", "react-native"],
            "state": "DF"
        }
    ]
    
    for i, opp_data in enumerate(base_opportunities):
        opportunity = Opportunity(**opp_data)
        opportunities.append(opportunity)
        db_session.add(opportunity)
    
    db_session.flush()
    return opportunities

@pytest.fixture
def sample_proposal(db_session, sample_opportunity, sample_company, sample_user) -> Proposal:
    """Create a sample proposal for testing"""
    proposal = Proposal(
        opportunity_id=sample_opportunity.id,
        company_id=sample_company.id,
        user_id=sample_user.id,
        proposal_value=Decimal("95000.00"),
        technical_proposal={"approach": "Agile methodology", "timeline": "6 months"},
        status="DRAFT"
    )
    db_session.add(proposal)
    db_session.flush()
    return proposal

@pytest.fixture
def sample_certificate(db_session, sample_company) -> Certificate:
    """Create a sample certificate for testing"""
    certificate = Certificate(
        company_id=sample_company.id,
        certificate_number="CERT-123456",
        issuing_authority="Brazilian Authority",
        title="Business License",
        issue_date=date.today() - timedelta(days=180),
        expiry_date=date.today() + timedelta(days=180),
        renewal_period_months=12
    )
    db_session.add(certificate)
    db_session.flush()
    return certificate

@pytest.fixture
def sample_notification(db_session, sample_user, sample_opportunity) -> Notification:
    """Create a sample notification for testing"""
    notification = Notification(
        user_id=sample_user.id,
        opportunity_id=sample_opportunity.id,
        type="OPPORTUNITY",
        title="New Opportunity Available",
        message="A new opportunity matching your interests is available"
    )
    db_session.add(notification)
    db_session.flush()
    return notification

@pytest.fixture
def sample_procurement_monitor(db_session, sample_user) -> ProcurementMonitor:
    """Create a sample procurement monitor for testing"""
    monitor = ProcurementMonitor(
        user_id=sample_user.id,
        name="Software Development Monitor",
        keywords=["software", "development", "web"],
        excluded_keywords=["hardware"],
        regions=["SP", "RJ"],
        min_value=Decimal("10000.00"),
        max_value=Decimal("100000.00")
    )
    db_session.add(monitor)
    db_session.flush()
    return monitor

@pytest.fixture
def sample_data(db_session, sample_users, sample_opportunities):
    """Create a comprehensive set of sample data for complex tests"""
    # Create companies for first 3 users
    companies = []
    for i, user in enumerate(sample_users[:3]):
        company = Company(
            user_id=user.id,
            legal_name=f"Company {i} Ltda",
            cnpj=f"1234567800019{i}",
            address_city="São Paulo",
            address_state="SP"
        )
        companies.append(company)
        db_session.add(company)
    
    db_session.flush()
    
    # Create proposals linking companies to opportunities
    proposals = []
    for i, (company, opportunity) in enumerate(zip(companies, sample_opportunities[:3])):
        proposal = Proposal(
            opportunity_id=opportunity.id,
            company_id=company.id,
            user_id=company.user_id,
            proposal_value=opportunity.estimated_value * Decimal("0.95"),  # 5% discount
            status="SUBMITTED"
        )
        proposals.append(proposal)
        db_session.add(proposal)
    
    db_session.flush()
    
    return {
        "users": sample_users,
        "companies": companies,
        "opportunities": sample_opportunities,
        "proposals": proposals
    }

# ================================================================
# ASYNC FIXTURES
# ================================================================

@pytest.fixture
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def async_db_manager(test_database_url) -> AsyncGenerator[DatabaseManager, None]:
    """Create async database manager for testing"""
    settings = DatabaseSettings(
        database_url=test_database_url,
        environment="testing",
        async_pool_size=5,
        async_max_overflow=5,
        enable_query_logging=False
    )
    manager = DatabaseManager(settings)
    yield manager
    await manager.close_async()

# ================================================================
# UTILITY FIXTURES
# ================================================================

@pytest.fixture
def mock_datetime(monkeypatch):
    """Mock datetime for consistent testing"""
    import datetime as dt
    
    class MockDatetime(dt.datetime):
        @classmethod
        def now(cls, tz=None):
            return cls(2024, 1, 15, 10, 0, 0)
        
        @classmethod
        def utcnow(cls):
            return cls(2024, 1, 15, 10, 0, 0)
    
    monkeypatch.setattr("datetime.datetime", MockDatetime)
    return MockDatetime

@pytest.fixture
def clean_database(db_session):
    """Ensure clean database state for tests that need it"""
    # Delete all data in reverse dependency order
    tables_to_clean = [
        Notification, Proposal, Certificate, ProcurementMonitor,
        Opportunity, Company, User
    ]
    
    for table in tables_to_clean:
        db_session.query(table).delete()
    
    db_session.commit()
    yield
    
    # Clean up after test
    for table in tables_to_clean:
        db_session.query(table).delete()
    db_session.commit()

# ================================================================
# PERFORMANCE TESTING UTILITIES
# ================================================================

@pytest.fixture
def performance_timer():
    """Timer fixture for performance testing"""
    import time
    
    class Timer:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        @property
        def elapsed(self):
            if self.start_time is None or self.end_time is None:
                return None
            return self.end_time - self.start_time
        
        def assert_faster_than(self, seconds, message=None):
            assert self.elapsed < seconds, \
                message or f"Operation took {self.elapsed:.3f}s, expected < {seconds}s"
    
    return Timer()

# ================================================================
# TEST MARKERS
# ================================================================

pytestmark = pytest.mark.database  # Mark all tests in this file as database tests