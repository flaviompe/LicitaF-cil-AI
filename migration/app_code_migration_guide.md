# Application Code Migration Guide - SQLite to Neon PostgreSQL

## Overview

This guide provides comprehensive instructions for migrating application code from SQLite to Neon PostgreSQL database, covering ORM updates, query modifications, configuration changes, and best practices.

## Migration Checklist

### Phase 1: Configuration Updates
- [ ] Update database connection strings
- [ ] Modify environment variables
- [ ] Update ORM configuration
- [ ] Configure connection pooling
- [ ] Set up SSL/TLS settings

### Phase 2: Schema and Model Updates
- [ ] Update model definitions
- [ ] Modify field types and constraints
- [ ] Update enum definitions
- [ ] Fix foreign key relationships
- [ ] Update index definitions

### Phase 3: Query Modifications
- [ ] Replace SQLite-specific syntax
- [ ] Update date/time handling
- [ ] Modify full-text search queries
- [ ] Update aggregation queries
- [ ] Fix JSON field queries

### Phase 4: Feature Enhancements
- [ ] Implement PostgreSQL-specific features
- [ ] Add advanced indexing
- [ ] Implement partitioning
- [ ] Add materialized views
- [ ] Set up monitoring

## Detailed Migration Steps

### 1. Database Configuration

#### Environment Variables
Update your `.env` files with Neon database credentials:

```env
# Replace SQLite configuration
# OLD: DATABASE_URL=sqlite:///./data/licitacoes.db
# NEW: Neon PostgreSQL configuration
DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require"

# Connection pool settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=300
DB_POOL_PRE_PING=true

# SSL settings
DATABASE_SSL_MODE=require
DATABASE_SSL_CERT_REQS=none
```

#### Python/FastAPI Configuration

**Before (SQLite):**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# SQLite configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/licitacoes.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
```

**After (Neon PostgreSQL):**
```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os

# Neon PostgreSQL configuration
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_timeout=30,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False  # Set to True for SQL debugging
)
```

#### Node.js/TypeScript Configuration

**Before (SQLite):**
```typescript
import { Database } from 'sqlite3';

const db = new Database('./data/licitacoes.db');
```

**After (Neon PostgreSQL):**
```typescript
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

// For serverless usage
const sql = neon(process.env.DATABASE_URL!);

// For traditional connection pooling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
```

### 2. Model Definitions

#### Python/SQLAlchemy Models

**Updated User Model:**
```python
from sqlalchemy import Column, String, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

class UserRole(enum.Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    PREMIUM = "PREMIUM"

class SubscriptionTier(enum.Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"

class User(Base):
    __tablename__ = "users"
    
    # Use PostgreSQL UUID type
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255))
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    
    # Use PostgreSQL enums
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    subscription_tier = Column(Enum(SubscriptionTier), default=SubscriptionTier.FREE)
    
    # Boolean fields
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    
    # Timestamps with timezone
    email_verified_at = Column(DateTime(timezone=True))
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    login_count = Column(Integer, default=0)
```

**Updated Company Model:**
```python
from sqlalchemy import Column, String, Text, Numeric, Integer, Boolean, Date, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Company information
    legal_name = Column(String(255), nullable=False)
    trade_name = Column(String(255))
    cnpj = Column(String(14), unique=True, nullable=False, index=True)
    
    # Use PostgreSQL arrays for multiple values
    business_sectors = Column(ARRAY(Text))
    
    # Use JSONB for structured data
    verification_documents = Column(JSONB)
    
    # Address information
    address_street = Column(String(255))
    address_city = Column(String(100))
    address_state = Column(String(2))
    address_zip = Column(String(9))
    
    # Financial information
    annual_revenue = Column(Numeric(15, 2))
    employee_count = Column(Integer)
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

#### TypeScript/Prisma Models

**Updated Prisma Schema:**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum UserRole {
  USER
  ADMIN
  PREMIUM
}

enum SubscriptionTier {
  FREE
  BASIC
  PROFESSIONAL
  ENTERPRISE
  CUSTOM
}

model User {
  id               String            @id @default(uuid()) @db.Uuid
  email            String            @unique @db.VarChar(255)
  passwordHash     String?           @map("password_hash") @db.VarChar(255)
  firstName        String?           @map("first_name") @db.VarChar(100)
  lastName         String?           @map("last_name") @db.VarChar(100)
  phone            String?           @db.VarChar(20)
  role             UserRole          @default(USER)
  subscriptionTier SubscriptionTier  @default(FREE) @map("subscription_tier")
  isActive         Boolean           @default(true) @map("is_active")
  emailVerified    Boolean           @default(false) @map("email_verified")
  emailVerifiedAt  DateTime?         @map("email_verified_at") @db.Timestamptz
  lastLoginAt      DateTime?         @map("last_login_at") @db.Timestamptz
  loginCount       Int               @default(0) @map("login_count")
  createdAt        DateTime          @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime          @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  company          Company?
  proposals        Proposal[]
  notifications    Notification[]

  @@map("users")
}

model Company {
  id                    String    @id @default(uuid()) @db.Uuid
  userId                String    @unique @map("user_id") @db.Uuid
  legalName             String    @map("legal_name") @db.VarChar(255)
  tradeName             String?   @map("trade_name") @db.VarChar(255)
  cnpj                  String    @unique @db.VarChar(14)
  businessSectors       String[]  @map("business_sectors")
  verificationDocuments Json?     @map("verification_documents") @db.JsonB
  
  // Address
  addressStreet         String?   @map("address_street") @db.VarChar(255)
  addressCity           String?   @map("address_city") @db.VarChar(100)
  addressState          String?   @map("address_state") @db.VarChar(2)
  addressZip            String?   @map("address_zip") @db.VarChar(9)
  
  // Financial
  annualRevenue         Decimal?  @map("annual_revenue") @db.Decimal(15, 2)
  employeeCount         Int?      @map("employee_count")
  
  // Verification
  isVerified            Boolean   @default(false) @map("is_verified")
  verifiedAt            DateTime? @map("verified_at") @db.Timestamptz
  
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt             DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  proposals             Proposal[]

  @@map("companies")
}
```

### 3. Query Updates

#### Date/Time Handling

**Before (SQLite):**
```python
# SQLite datetime queries
users = session.query(User).filter(
    User.created_at >= datetime.now() - timedelta(days=30)
).all()
```

**After (PostgreSQL):**
```python
# PostgreSQL timezone-aware queries
users = session.query(User).filter(
    User.created_at >= func.now() - text("INTERVAL '30 days'")
).all()

# Alternative with timezone handling
from sqlalchemy import text
users = session.query(User).filter(
    text("created_at >= NOW() - INTERVAL '30 days'")
).all()
```

#### Full-Text Search

**Before (SQLite):**
```python
# Basic LIKE search in SQLite
opportunities = session.query(Opportunity).filter(
    Opportunity.title.like(f'%{search_term}%')
).all()
```

**After (PostgreSQL):**
```python
# PostgreSQL full-text search with Portuguese support
from sqlalchemy import func, text

opportunities = session.query(Opportunity).filter(
    func.to_tsvector('portuguese', Opportunity.title + ' ' + Opportunity.description)
    .match(func.to_tsquery('portuguese', search_term))
).all()

# Using search_vector column (if available)
opportunities = session.query(Opportunity).filter(
    Opportunity.search_vector.match(search_term)
).all()
```

#### JSON Queries

**Before (SQLite - limited JSON support):**
```python
# Basic string operations
companies = session.query(Company).filter(
    Company.metadata.like('%"verified":true%')
).all()
```

**After (PostgreSQL JSONB):**
```python
# Native JSONB operations
companies = session.query(Company).filter(
    Company.verification_documents['status'].astext == 'verified'
).all()

# JSON path queries
companies = session.query(Company).filter(
    Company.verification_documents.op('?')('documents')
).all()

# JSON containment
companies = session.query(Company).filter(
    Company.verification_documents.contains({'verified': True})
).all()
```

#### Aggregations and Window Functions

**New PostgreSQL Capabilities:**
```python
# Window functions for ranking
from sqlalchemy import func, desc

top_companies = session.query(
    Company,
    func.row_number().over(
        order_by=desc(Company.annual_revenue),
        partition_by=Company.address_state
    ).label('rank')
).subquery()

# Advanced aggregations
stats = session.query(
    func.count(Opportunity.id).label('total_opportunities'),
    func.avg(Opportunity.estimated_value).label('avg_value'),
    func.percentile_cont(0.5).within_group(
        Opportunity.estimated_value.asc()
    ).label('median_value')
).first()
```

### 4. Error Handling Updates

#### Database-Specific Error Handling

**Before (SQLite):**
```python
import sqlite3

try:
    session.commit()
except sqlite3.IntegrityError as e:
    session.rollback()
    raise ValueError(f"Data integrity error: {e}")
```

**After (PostgreSQL):**
```python
from sqlalchemy.exc import IntegrityError
from psycopg2.errors import UniqueViolation, ForeignKeyViolation

try:
    session.commit()
except IntegrityError as e:
    session.rollback()
    
    if isinstance(e.orig, UniqueViolation):
        raise ValueError("Record already exists")
    elif isinstance(e.orig, ForeignKeyViolation):
        raise ValueError("Referenced record not found")
    else:
        raise ValueError(f"Database constraint violated: {e}")
```

### 5. Performance Optimizations

#### Connection Pool Configuration

```python
# Optimized connection pool for production
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,          # Base pool size
    max_overflow=30,       # Additional connections
    pool_timeout=30,       # Wait time for connection
    pool_recycle=3600,     # Recreate connections every hour
    pool_pre_ping=True,    # Validate connections
    echo=False,            # Disable SQL logging in production
    
    # PostgreSQL-specific optimizations
    connect_args={
        "options": "-c timezone=America/Sao_Paulo",
        "application_name": "licitacoes_platform",
        "connect_timeout": 10,
        "server_settings": {
            "jit": "off",  # Disable JIT for faster simple queries
        }
    }
)
```

#### Query Optimization

```python
# Use query optimization techniques
def get_user_with_company(user_id: str):
    return session.query(User).options(
        joinedload(User.company)  # Eager loading to avoid N+1
    ).filter(User.id == user_id).first()

# Use database functions for complex calculations
def get_opportunity_stats():
    return session.query(
        func.count(Opportunity.id).label('total'),
        func.sum(Opportunity.estimated_value).label('total_value'),
        func.avg(Opportunity.estimated_value).label('avg_value'),
        func.max(Opportunity.created_at).label('latest')
    ).first()
```

### 6. Migration Testing

#### Unit Test Updates

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def db_engine():
    # Use test database container
    with PostgresContainer("postgres:15") as postgres:
        engine = create_engine(postgres.get_connection_url())
        
        # Create tables
        Base.metadata.create_all(engine)
        
        yield engine

@pytest.fixture
def db_session(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    
    try:
        yield session
    finally:
        session.rollback()
        session.close()

def test_user_creation(db_session):
    user = User(
        email="test@example.com",
        first_name="Test",
        last_name="User"
    )
    
    db_session.add(user)
    db_session.commit()
    
    assert user.id is not None
    assert user.role == UserRole.USER
    assert user.subscription_tier == SubscriptionTier.FREE
```

### 7. Deployment Configuration

#### Docker Configuration

```dockerfile
# Dockerfile updates for PostgreSQL
FROM python:3.11-slim

# Install PostgreSQL client libraries
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Application code
COPY . /app
WORKDIR /app

# Environment variables
ENV DATABASE_URL=""
ENV DIRECT_URL=""

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Production Environment Variables

```env
# Production configuration
NODE_ENV=production
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require
DIRECT_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# Connection pool
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_TIMEOUT=30

# SSL/Security
SSL_MODE=require
DATABASE_SSL_CERT_REQS=required

# Monitoring
ENABLE_QUERY_LOGGING=false
SLOW_QUERY_THRESHOLD=1000
ENABLE_PERFORMANCE_MONITORING=true

# Caching
REDIS_URL=redis://localhost:6379
CACHE_TTL=300
```

## Common Migration Issues and Solutions

### 1. Boolean Field Handling

**Issue:** SQLite stores booleans as integers (0/1), PostgreSQL uses true/false

**Solution:**
```python
# Add data transformation during migration
def migrate_boolean_field(value):
    if isinstance(value, int):
        return bool(value)
    return value
```

### 2. Date Format Differences

**Issue:** Date format inconsistencies between SQLite and PostgreSQL

**Solution:**
```python
# Standardize date handling
from datetime import datetime

def parse_date(date_str):
    if isinstance(date_str, str):
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')
    return date_str
```

### 3. Case Sensitivity

**Issue:** PostgreSQL is case-sensitive for identifiers

**Solution:**
```python
# Use quoted identifiers consistently
class User(Base):
    __tablename__ = "users"  # Always use lowercase
    
    # Use snake_case for column names
    first_name = Column("first_name", String(100))
```

### 4. Transaction Management

**Issue:** Different transaction behavior

**Solution:**
```python
# Explicit transaction management
from sqlalchemy.orm import Session

def create_user_with_company(user_data, company_data):
    with Session(engine) as session:
        try:
            user = User(**user_data)
            session.add(user)
            session.flush()  # Get user ID
            
            company = Company(user_id=user.id, **company_data)
            session.add(company)
            
            session.commit()
            return user
        except Exception:
            session.rollback()
            raise
```

## Verification Checklist

After completing the code migration:

- [ ] All database connections use PostgreSQL URLs
- [ ] Environment variables updated
- [ ] Model definitions use PostgreSQL types
- [ ] Enum definitions match database enums
- [ ] Queries updated for PostgreSQL syntax
- [ ] Error handling updated for PostgreSQL errors
- [ ] Connection pooling configured
- [ ] SSL/TLS security enabled
- [ ] Full-text search implemented
- [ ] JSON queries optimized
- [ ] Unit tests updated and passing
- [ ] Integration tests passing
- [ ] Performance benchmarks meet requirements
- [ ] Monitoring and logging configured
- [ ] Production deployment tested

## Next Steps

1. **Code Review**: Have team review all changes
2. **Testing**: Run comprehensive test suite
3. **Staging Deployment**: Deploy to staging environment
4. **Performance Testing**: Validate performance improvements
5. **User Acceptance Testing**: Validate business functionality
6. **Production Deployment**: Deploy to production
7. **Monitoring**: Set up alerts and monitoring
8. **Documentation**: Update technical documentation

This migration will result in a more robust, scalable, and feature-rich application leveraging PostgreSQL's advanced capabilities while maintaining data integrity and improving performance.