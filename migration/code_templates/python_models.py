#!/usr/bin/env python3
"""
PostgreSQL/Neon Database Models for Licitações Platform
Updated SQLAlchemy models optimized for PostgreSQL with all new features
"""

from sqlalchemy import (
    Column, String, Text, Integer, Boolean, DateTime, Date, Numeric, 
    ForeignKey, Index, UniqueConstraint, CheckConstraint, Enum as SQLEnum,
    func, text
)
from sqlalchemy.dialects.postgresql import (
    UUID, JSONB, ARRAY, TSVECTOR, INET
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.sql import func
import uuid
from datetime import datetime
from enum import Enum
import re

Base = declarative_base()

# ================================================================
# ENUM DEFINITIONS
# ================================================================

class UserRole(Enum):
    USER = "USER"
    ADMIN = "ADMIN"
    PREMIUM = "PREMIUM"

class SubscriptionTier(Enum):
    FREE = "FREE"
    BASIC = "BASIC"
    PROFESSIONAL = "PROFESSIONAL"
    ENTERPRISE = "ENTERPRISE"
    CUSTOM = "CUSTOM"

class CompanyType(Enum):
    ME = "ME"
    EPP = "EPP"
    LTDA = "LTDA"
    SA = "SA"
    EIRELI = "EIRELI"
    MEI = "MEI"
    COOPERATIVA = "COOPERATIVA"
    OTHER = "OTHER"

class OpportunityModality(Enum):
    PREGAO = "PREGAO"
    CONCORRENCIA = "CONCORRENCIA"
    TOMADA_PRECOS = "TOMADA_PRECOS"
    CONVITE = "CONVITE"
    LEILAO = "LEILAO"
    CONCURSO = "CONCURSO"
    DIALOGO_COMPETITIVO = "DIALOGO_COMPETITIVO"
    CREDENCIAMENTO = "CREDENCIAMENTO"

class OpportunityStatus(Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    OPEN = "OPEN"
    CLARIFICATIONS = "CLARIFICATIONS"
    BIDDING = "BIDDING"
    ANALYSIS = "ANALYSIS"
    AWARDED = "AWARDED"
    CANCELLED = "CANCELLED"
    CLOSED = "CLOSED"
    SUSPENDED = "SUSPENDED"
    REOPENED = "REOPENED"

class ProposalStatus(Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    QUALIFIED = "QUALIFIED"
    DISQUALIFIED = "DISQUALIFIED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WINNER = "WINNER"
    RUNNER_UP = "RUNNER_UP"
    CANCELLED = "CANCELLED"
    WITHDRAWN = "WITHDRAWN"

class NotificationType(Enum):
    OPPORTUNITY = "OPPORTUNITY"
    OPPORTUNITY_UPDATE = "OPPORTUNITY_UPDATE"
    CERTIFICATE_EXPIRY = "CERTIFICATE_EXPIRY"
    PROPOSAL_UPDATE = "PROPOSAL_UPDATE"
    SYSTEM = "SYSTEM"
    LEGAL_ALERT = "LEGAL_ALERT"
    PAYMENT_DUE = "PAYMENT_DUE"
    DOCUMENT_REQUIRED = "DOCUMENT_REQUIRED"
    DEADLINE_REMINDER = "DEADLINE_REMINDER"

# ================================================================
# CORE MODELS
# ================================================================

class User(Base):
    """Enhanced User model with PostgreSQL features"""
    __tablename__ = "users"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic information
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255))
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    
    # Role and permissions
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    subscription_tier = Column(SQLEnum(SubscriptionTier), default=SubscriptionTier.FREE)
    
    # Status fields
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verified_at = Column(DateTime(timezone=True))
    
    # Activity tracking
    last_login_at = Column(DateTime(timezone=True))
    login_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="user", uselist=False, cascade="all, delete-orphan")
    proposals = relationship("Proposal", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    monitors = relationship("ProcurementMonitor", back_populates="user", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_users_email', 'email'),
        Index('idx_users_active', 'is_active', postgresql_where=text('is_active = true')),
        Index('idx_users_role', 'role'),
        Index('idx_users_subscription', 'subscription_tier'),
        Index('idx_users_created_at', 'created_at'),
    )
    
    # Validation
    @validates('email')
    def validate_email(self, key, email):
        if not email or '@' not in email:
            raise ValueError("Invalid email address")
        return email.lower()
    
    @validates('phone')
    def validate_phone(self, key, phone):
        if phone:
            # Basic Brazilian phone validation
            clean_phone = re.sub(r'[^0-9]', '', phone)
            if len(clean_phone) not in [10, 11]:
                raise ValueError("Invalid phone number format")
        return phone
    
    # Hybrid properties
    @hybrid_property
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip()
    
    @hybrid_property
    def is_premium_user(self):
        return self.subscription_tier in [SubscriptionTier.PROFESSIONAL, SubscriptionTier.ENTERPRISE]
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class Company(Base):
    """Enhanced Company model with Brazilian business compliance"""
    __tablename__ = "companies"
    
    # Primary key and foreign keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False, unique=True)
    
    # Basic company information
    legal_name = Column(String(255), nullable=False)
    trade_name = Column(String(255))
    cnpj = Column(String(14), unique=True, nullable=False, index=True)
    company_type = Column(SQLEnum(CompanyType))
    business_description = Column(Text)
    website = Column(String(500))
    
    # Address information
    address_street = Column(String(255))
    address_number = Column(String(20))
    address_complement = Column(String(100))
    address_neighborhood = Column(String(100))
    address_city = Column(String(100))
    address_state = Column(String(2))
    address_zip = Column(String(9))
    address_country = Column(String(2), default='BR')
    
    # Business information
    founded_date = Column(Date)
    annual_revenue = Column(Numeric(15, 2))
    employee_count = Column(Integer)
    business_sectors = Column(ARRAY(Text))  # PostgreSQL array
    
    # Contact information
    contact_email = Column(String(255))
    contact_phone = Column(String(20))
    contact_person = Column(String(255))
    
    # Verification status
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime(timezone=True))
    verification_documents = Column(JSONB)  # PostgreSQL JSONB
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="company")
    proposals = relationship("Proposal", back_populates="company", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="company", cascade="all, delete-orphan")
    
    # Table constraints and indexes
    __table_args__ = (
        # Indexes
        Index('idx_companies_cnpj', 'cnpj'),
        Index('idx_companies_type', 'company_type'),
        Index('idx_companies_city_state', 'address_city', 'address_state'),
        Index('idx_companies_verified', 'is_verified', postgresql_where=text('is_verified = true')),
        Index('idx_companies_sectors', 'business_sectors', postgresql_using='gin'),
        Index('idx_companies_created_at', 'created_at'),
        
        # Constraints
        CheckConstraint('annual_revenue IS NULL OR annual_revenue >= 0', name='check_positive_revenue'),
        CheckConstraint('employee_count IS NULL OR employee_count >= 0', name='check_positive_employees'),
        CheckConstraint(
            "address_state IS NULL OR address_state ~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'",
            name='check_valid_state_code'
        ),
    )
    
    # Validation
    @validates('cnpj')
    def validate_cnpj(self, key, cnpj):
        if cnpj:
            # Remove formatting
            clean_cnpj = re.sub(r'[^0-9]', '', cnpj)
            if len(clean_cnpj) != 14:
                raise ValueError("CNPJ must have 14 digits")
            return clean_cnpj
        return cnpj
    
    @validates('contact_email')
    def validate_contact_email(self, key, email):
        if email and '@' not in email:
            raise ValueError("Invalid contact email address")
        return email
    
    @hybrid_property
    def formatted_cnpj(self):
        if self.cnpj and len(self.cnpj) == 14:
            return f"{self.cnpj[:2]}.{self.cnpj[2:5]}.{self.cnpj[5:8]}/{self.cnpj[8:12]}-{self.cnpj[12:]}"
        return self.cnpj
    
    def __repr__(self):
        return f"<Company(id={self.id}, legal_name='{self.legal_name}')>"


class Opportunity(Base):
    """Enhanced Opportunity model with full-text search and AI features"""
    __tablename__ = "opportunities"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Basic information
    title = Column(Text, nullable=False)
    description = Column(Text)
    summary = Column(Text)  # AI-generated summary
    
    # Organization information
    organ = Column(String(255), nullable=False)
    organ_code = Column(String(50))
    organ_type = Column(String(100))
    
    # Procurement details
    modality = Column(SQLEnum(OpportunityModality), nullable=False)
    category = Column(String(100))
    object_type = Column(String(100))
    
    # Financial information
    estimated_value = Column(Numeric(15, 2))
    reserve_value = Column(Numeric(15, 2))
    min_bid_value = Column(Numeric(15, 2))
    max_bid_value = Column(Numeric(15, 2))
    currency = Column(String(3), default='BRL')
    
    # Important dates
    publish_date = Column(DateTime(timezone=True))
    opening_date = Column(DateTime(timezone=True))
    closing_date = Column(DateTime(timezone=True))
    session_date = Column(DateTime(timezone=True))
    contract_start_date = Column(DateTime(timezone=True))
    contract_end_date = Column(DateTime(timezone=True))
    
    # Location information
    region = Column(String(100))
    state = Column(String(2))
    city = Column(String(100))
    execution_location = Column(Text)
    
    # Status and metadata
    status = Column(SQLEnum(OpportunityStatus), default=OpportunityStatus.PUBLISHED)
    external_id = Column(String(100), unique=True)
    source_url = Column(Text)
    source_platform = Column(String(100))
    
    # Content and requirements
    keywords = Column(ARRAY(Text))
    required_documents = Column(ARRAY(Text))
    technical_requirements = Column(JSONB)
    legal_requirements = Column(JSONB)
    
    # AI Analysis results
    ai_analysis = Column(JSONB)
    complexity_score = Column(Numeric(5, 2))
    success_probability = Column(Numeric(5, 4))
    
    # Bidding information
    proposal_count = Column(Integer, default=0)
    qualified_proposals = Column(Integer, default=0)
    min_proposal_value = Column(Numeric(15, 2))
    max_proposal_value = Column(Numeric(15, 2))
    
    # Search and matching
    search_vector = Column(TSVECTOR)  # Full-text search vector
    tags = Column(ARRAY(Text))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    proposals = relationship("Proposal", back_populates="opportunity", cascade="all, delete-orphan")
    
    # Table constraints and indexes
    __table_args__ = (
        # Basic indexes
        Index('idx_opportunities_status', 'status'),
        Index('idx_opportunities_modality', 'modality'),
        Index('idx_opportunities_dates', 'opening_date', 'closing_date'),
        Index('idx_opportunities_publish_date', 'publish_date'),
        Index('idx_opportunities_location', 'state', 'city'),
        Index('idx_opportunities_organ', 'organ'),
        Index('idx_opportunities_value_range', 'estimated_value'),
        Index('idx_opportunities_external_id', 'external_id', postgresql_where=text('external_id IS NOT NULL')),
        
        # GIN indexes for arrays and JSONB
        Index('idx_opportunities_keywords', 'keywords', postgresql_using='gin'),
        Index('idx_opportunities_tags', 'tags', postgresql_using='gin'),
        Index('idx_opportunities_ai_analysis', 'ai_analysis', postgresql_using='gin'),
        Index('idx_opportunities_tech_requirements', 'technical_requirements', postgresql_using='gin'),
        
        # Full-text search indexes
        Index('idx_opportunities_search', 'search_vector', postgresql_using='gin'),
        Index(
            'idx_opportunities_text_search', 
            func.to_tsvector('portuguese', text("title || ' ' || COALESCE(description, '') || ' ' || COALESCE(summary, '')")),
            postgresql_using='gin'
        ),
        
        # Performance indexes
        Index(
            'idx_opportunities_active', 
            'status', 'opening_date',
            postgresql_where=text("status IN ('PUBLISHED', 'OPEN', 'CLARIFICATIONS', 'BIDDING')")
        ),
        Index(
            'idx_opportunities_recent', 
            'created_at',
            postgresql_where=text("created_at > (NOW() - INTERVAL '30 days')")
        ),
        
        # Constraints
        CheckConstraint('estimated_value IS NULL OR estimated_value > 0', name='check_positive_estimated_value'),
        CheckConstraint(
            'opening_date IS NULL OR closing_date IS NULL OR opening_date <= closing_date',
            name='check_date_order'
        ),
        CheckConstraint('proposal_count >= 0', name='check_positive_proposal_count'),
        CheckConstraint(
            'success_probability IS NULL OR (success_probability >= 0 AND success_probability <= 1)',
            name='check_success_probability_range'
        ),
        CheckConstraint(
            'complexity_score IS NULL OR (complexity_score >= 0 AND complexity_score <= 100)',
            name='check_complexity_score_range'
        ),
    )
    
    @hybrid_property
    def is_active(self):
        return self.status in [OpportunityStatus.PUBLISHED, OpportunityStatus.OPEN, OpportunityStatus.BIDDING]
    
    @hybrid_property
    def is_expired(self):
        return self.closing_date and self.closing_date < datetime.now()
    
    def __repr__(self):
        return f"<Opportunity(id={self.id}, title='{self.title[:50]}...')>"


class Proposal(Base):
    """Enhanced Proposal model with comprehensive bidding support"""
    __tablename__ = "proposals"
    
    # Primary key and foreign keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey('opportunities.id'), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Proposal details
    proposal_value = Column(Numeric(15, 2), nullable=False)
    technical_score = Column(Numeric(5, 2))
    commercial_score = Column(Numeric(5, 2))
    final_score = Column(Numeric(5, 2))
    ranking_position = Column(Integer)
    
    # Proposal content (JSONB for flexibility)
    technical_proposal = Column(JSONB)
    commercial_proposal = Column(JSONB)
    price_breakdown = Column(JSONB)
    
    # Documents
    documents = Column(JSONB)
    required_docs_submitted = Column(ARRAY(Text))
    missing_documents = Column(ARRAY(Text))
    
    # Status and timeline
    status = Column(SQLEnum(ProposalStatus), default=ProposalStatus.DRAFT)
    submitted_at = Column(DateTime(timezone=True))
    evaluation_deadline = Column(DateTime(timezone=True))
    
    # AI Analysis
    ai_analysis = Column(JSONB)
    risk_assessment = Column(JSONB)
    improvement_suggestions = Column(ARRAY(Text))
    compliance_score = Column(Numeric(5, 2))
    
    # Bidding session information
    session_participation = Column(Boolean, default=False)
    bid_history = Column(JSONB)
    final_bid_value = Column(Numeric(15, 2))
    
    # Results
    is_winner = Column(Boolean, default=False)
    disqualification_reason = Column(Text)
    evaluation_feedback = Column(Text)
    
    # Metadata
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    opportunity = relationship("Opportunity", back_populates="proposals")
    company = relationship("Company", back_populates="proposals")
    user = relationship("User", back_populates="proposals")
    
    # Table constraints and indexes
    __table_args__ = (
        # Basic indexes
        Index('idx_proposals_opportunity', 'opportunity_id'),
        Index('idx_proposals_company', 'company_id'),
        Index('idx_proposals_user', 'user_id'),
        Index('idx_proposals_status', 'status'),
        Index('idx_proposals_submitted', 'submitted_at'),
        Index('idx_proposals_winner', 'is_winner', postgresql_where=text('is_winner = true')),
        Index('idx_proposals_value_range', 'proposal_value'),
        
        # GIN indexes for JSONB
        Index('idx_proposals_documents', 'documents', postgresql_using='gin'),
        Index('idx_proposals_ai_analysis', 'ai_analysis', postgresql_using='gin'),
        
        # Composite indexes for common queries
        Index('idx_proposals_company_status', 'company_id', 'status'),
        Index('idx_proposals_opportunity_status', 'opportunity_id', 'status'),
        
        # Constraints
        CheckConstraint('proposal_value > 0', name='check_positive_proposal_value'),
        CheckConstraint(
            '(technical_score IS NULL OR (technical_score >= 0 AND technical_score <= 100)) AND '
            '(commercial_score IS NULL OR (commercial_score >= 0 AND commercial_score <= 100)) AND '
            '(final_score IS NULL OR (final_score >= 0 AND final_score <= 100)) AND '
            '(compliance_score IS NULL OR (compliance_score >= 0 AND compliance_score <= 100))',
            name='check_score_ranges'
        ),
        CheckConstraint('ranking_position IS NULL OR ranking_position > 0', name='check_positive_ranking'),
        CheckConstraint('final_bid_value IS NULL OR final_bid_value > 0', name='check_final_bid_positive'),
    )
    
    @hybrid_property
    def is_submitted(self):
        return self.status in [ProposalStatus.SUBMITTED, ProposalStatus.UNDER_REVIEW, 
                              ProposalStatus.QUALIFIED, ProposalStatus.WINNER]
    
    def __repr__(self):
        return f"<Proposal(id={self.id}, opportunity_id={self.opportunity_id}, status={self.status})>"


class Notification(Base):
    """Enhanced Notification model with multi-channel support"""
    __tablename__ = "notifications"
    
    # Primary key and foreign keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Notification content
    type = Column(SQLEnum(NotificationType), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    short_message = Column(String(500))
    
    # Related entities
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey('opportunities.id'), nullable=True)
    proposal_id = Column(UUID(as_uuid=True), ForeignKey('proposals.id'), nullable=True)
    
    # Status tracking
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    is_delivered = Column(Boolean, default=False)
    delivered_at = Column(DateTime(timezone=True))
    
    # Rich content support
    html_content = Column(Text)
    attachments = Column(JSONB)
    variables = Column(JSONB)
    
    # Scheduling and expiry
    expires_at = Column(DateTime(timezone=True))
    scheduled_for = Column(DateTime(timezone=True))
    
    # Metadata
    source = Column(String(100))
    tags = Column(ARRAY(Text))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    opportunity = relationship("Opportunity")
    proposal = relationship("Proposal")
    
    # Table constraints and indexes
    __table_args__ = (
        Index('idx_notifications_user_id', 'user_id'),
        Index('idx_notifications_type', 'type'),
        Index('idx_notifications_status', 'is_read', 'is_delivered'),
        Index('idx_notifications_scheduled', 'scheduled_for', postgresql_where=text('scheduled_for IS NOT NULL')),
        Index('idx_notifications_expiry', 'expires_at', postgresql_where=text('expires_at IS NOT NULL')),
        Index('idx_notifications_tags', 'tags', postgresql_using='gin'),
        Index('idx_notifications_variables', 'variables', postgresql_using='gin'),
        
        # Composite indexes
        Index('idx_notifications_user_unread', 'user_id', 'is_read', 'created_at', 
              postgresql_where=text('is_read = false')),
        Index('idx_notifications_user_type', 'user_id', 'type', 'created_at'),
        
        # Performance indexes
        Index('idx_notifications_recent', 'created_at', 
              postgresql_where=text("created_at > (NOW() - INTERVAL '30 days')")),
        
        # Constraints
        CheckConstraint(
            '(is_read = false AND read_at IS NULL) OR (is_read = true AND read_at IS NOT NULL)',
            name='check_read_consistency'
        ),
        CheckConstraint(
            '(is_delivered = false AND delivered_at IS NULL) OR (is_delivered = true AND delivered_at IS NOT NULL)',
            name='check_delivery_consistency'
        ),
    )
    
    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id})>"


class ProcurementMonitor(Base):
    """User monitoring configurations for automated opportunity matching"""
    __tablename__ = "procurement_monitors"
    
    # Primary key and foreign keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    
    # Monitor configuration
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Search criteria
    keywords = Column(ARRAY(Text), default=[])
    excluded_keywords = Column(ARRAY(Text), default=[])
    regions = Column(ARRAY(Text), default=[])
    categories = Column(ARRAY(Text), default=[])
    
    # Value filters
    min_value = Column(Numeric(15, 2))
    max_value = Column(Numeric(15, 2))
    
    # Notification settings
    notification_enabled = Column(Boolean, default=True)
    max_notifications_per_day = Column(Integer, default=10)
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    last_check = Column(DateTime(timezone=True))
    opportunities_found = Column(Integer, default=0)
    notifications_sent = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="monitors")
    
    # Table constraints and indexes
    __table_args__ = (
        Index('idx_monitors_user_active', 'user_id', 'is_active'),
        Index('idx_monitors_active', 'is_active', postgresql_where=text('is_active = true')),
        Index('idx_monitors_last_check', 'last_check'),
        Index('idx_monitors_keywords', 'keywords', postgresql_using='gin'),
        Index('idx_monitors_regions', 'regions', postgresql_using='gin'),
        
        # Constraints
        CheckConstraint(
            '(min_value IS NULL OR min_value >= 0) AND '
            '(max_value IS NULL OR max_value >= 0) AND '
            '(min_value IS NULL OR max_value IS NULL OR min_value <= max_value)',
            name='check_value_range'
        ),
        CheckConstraint(
            'max_notifications_per_day > 0 AND max_notifications_per_day <= 100',
            name='check_max_notifications'
        ),
    )
    
    def __repr__(self):
        return f"<ProcurementMonitor(id={self.id}, name='{self.name}')>"


class Certificate(Base):
    """Certificate tracking for Brazilian business compliance"""
    __tablename__ = "certificates"
    
    # Primary key and foreign keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey('companies.id'), nullable=False)
    
    # Certificate information
    certificate_number = Column(String(100), nullable=False)
    issuing_authority = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Validity information
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    
    # Renewal tracking
    renewal_period_months = Column(Integer)
    auto_renewal_enabled = Column(Boolean, default=False)
    
    # Verification
    verification_url = Column(Text)
    verification_code = Column(String(100))
    last_verified_at = Column(DateTime(timezone=True))
    
    # Additional metadata
    cost_amount = Column(Numeric(10, 2))
    currency = Column(String(3), default='BRL')
    tags = Column(ARRAY(Text))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="certificates")
    
    # Table constraints and indexes
    __table_args__ = (
        Index('idx_certificates_company_id', 'company_id'),
        Index('idx_certificates_expiry', 'expiry_date'),
        Index('idx_certificates_issuing_authority', 'issuing_authority'),
        Index('idx_certificates_tags', 'tags', postgresql_using='gin'),
        
        # Performance indexes
        Index(
            'idx_certificates_expiring_soon', 
            'expiry_date',
            postgresql_where=text("expiry_date BETWEEN NOW()::DATE AND (NOW() + INTERVAL '60 days')::DATE")
        ),
        
        # Constraints
        CheckConstraint('issue_date <= expiry_date', name='check_valid_dates'),
        CheckConstraint(
            'renewal_period_months IS NULL OR renewal_period_months > 0',
            name='check_positive_renewal_period'
        ),
        CheckConstraint('cost_amount IS NULL OR cost_amount >= 0', name='check_positive_cost'),
        
        # Unique constraint
        UniqueConstraint('company_id', 'certificate_number', 'issuing_authority', 
                        name='unique_certificate_per_company'),
    )
    
    @hybrid_property
    def is_expiring_soon(self):
        from datetime import date, timedelta
        return self.expiry_date <= date.today() + timedelta(days=30)
    
    @hybrid_property
    def is_expired(self):
        from datetime import date
        return self.expiry_date < date.today()
    
    def __repr__(self):
        return f"<Certificate(id={self.id}, number='{self.certificate_number}')>"


# ================================================================
# UTILITY FUNCTIONS
# ================================================================

def create_tables(engine):
    """Create all tables in the database"""
    Base.metadata.create_all(engine)


def drop_tables(engine):
    """Drop all tables from the database"""
    Base.metadata.drop_all(engine)


# Example usage and testing
if __name__ == "__main__":
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import os
    
    # Create engine (use your Neon connection string)
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/dbname")
    engine = create_engine(DATABASE_URL, echo=True)
    
    # Create tables
    create_tables(engine)
    
    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Example usage
    try:
        # Create a user
        user = User(
            email="test@example.com",
            first_name="Test",
            last_name="User",
            phone="11999999999"
        )
        session.add(user)
        session.flush()  # Get the user ID
        
        # Create a company
        company = Company(
            user_id=user.id,
            legal_name="Test Company Ltda",
            cnpj="12345678000195",
            company_type=CompanyType.LTDA,
            address_city="São Paulo",
            address_state="SP",
            business_sectors=["Technology", "Services"]
        )
        session.add(company)
        
        # Create an opportunity
        opportunity = Opportunity(
            title="Software Development Services",
            description="Development of web application for public services",
            organ="Municipality of São Paulo",
            modality=OpportunityModality.PREGAO,
            estimated_value=100000.00,
            keywords=["software", "development", "web"],
            tags=["technology", "municipal"]
        )
        session.add(opportunity)
        session.flush()
        
        # Create a proposal
        proposal = Proposal(
            opportunity_id=opportunity.id,
            company_id=company.id,
            user_id=user.id,
            proposal_value=95000.00,
            technical_proposal={"approach": "Agile methodology", "timeline": "6 months"},
            status=ProposalStatus.DRAFT
        )
        session.add(proposal)
        
        # Commit transaction
        session.commit()
        print("✅ Test data created successfully!")
        
        # Query examples
        print("\n📊 Query Examples:")
        
        # Find users with companies
        users_with_companies = session.query(User).filter(User.company.has()).all()
        print(f"Users with companies: {len(users_with_companies)}")
        
        # Find opportunities by value range
        high_value_opps = session.query(Opportunity).filter(
            Opportunity.estimated_value > 50000
        ).all()
        print(f"High-value opportunities: {len(high_value_opps)}")
        
        # Full-text search example (if search_vector is populated)
        # search_results = session.query(Opportunity).filter(
        #     Opportunity.search_vector.match('software development')
        # ).all()
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
    finally:
        session.close()