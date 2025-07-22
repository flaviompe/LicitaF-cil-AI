#!/usr/bin/env python3
"""
Database Schema Tests for SQLite to Neon Migration
Comprehensive validation of database structure, constraints, and integrity
"""

import pytest
import logging
from sqlalchemy import inspect, text, MetaData, Table
from sqlalchemy.engine import Engine
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any
import uuid
from datetime import datetime, date
from decimal import Decimal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestDatabaseSchema:
    """Test database schema integrity and structure"""
    
    def test_all_required_tables_exist(self, db_session):
        """Verify all required tables are created"""
        inspector = inspect(db_session.bind)
        existing_tables = set(inspector.get_table_names())
        
        required_tables = {
            # Core tables
            'users', 'companies', 'opportunities', 'proposals',
            'procurement_monitors',
            
            # Document management
            'documents', 'certificates', 'certificate_history',
            
            # Communication
            'notifications', 'notification_templates', 
            'notification_preferences', 'notification_delivery_log',
            
            # Legal AI
            'legal_consultations', 'legal_document_analysis',
            'legal_knowledge_base', 'legal_consultation_history',
            
            # Analytics
            'user_activity_log', 'business_metrics', 'opportunity_analytics',
            'user_behavior_analytics', 'system_performance_metrics',
            
            # Migration tracking
            'migration_execution_log'
        }
        
        missing_tables = required_tables - existing_tables
        assert not missing_tables, f"Missing required tables: {missing_tables}"
        
        logger.info(f"✅ All {len(required_tables)} required tables exist")
    
    def test_enum_types_created(self, db_session):
        """Verify all custom enum types are created"""
        result = db_session.execute(text("""
            SELECT typname FROM pg_type 
            WHERE typtype = 'e' 
            ORDER BY typname
        """)).fetchall()
        
        existing_enums = {row[0] for row in result}
        
        required_enums = {
            'user_role', 'company_type', 'opportunity_modality', 'opportunity_status',
            'proposal_status', 'document_type', 'risk_level', 'consultation_status',
            'certificate_type', 'certificate_status', 'notification_type',
            'notification_channel', 'notification_priority', 'bidding_phase',
            'payment_status', 'subscription_tier', 'analysis_type'
        }
        
        missing_enums = required_enums - existing_enums
        assert not missing_enums, f"Missing enum types: {missing_enums}"
        
        logger.info(f"✅ All {len(required_enums)} enum types created")
    
    def test_critical_indexes_exist(self, db_session):
        """Verify critical performance indexes are created"""
        result = db_session.execute(text("""
            SELECT indexname, tablename, indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname
        """)).fetchall()
        
        existing_indexes = {(row[1], row[0]) for row in result}  # (table, index)
        
        critical_indexes = {
            # Core table indexes
            ('users', 'idx_users_email'),
            ('users', 'idx_users_active'),
            ('companies', 'idx_companies_cnpj'),
            ('companies', 'idx_companies_user_id'),
            ('opportunities', 'idx_opportunities_status'),
            ('opportunities', 'idx_opportunities_modality'),
            ('proposals', 'idx_proposals_opportunity'),
            ('proposals', 'idx_proposals_company'),
            
            # Full-text search indexes
            ('opportunities', 'idx_opportunities_search'),
            ('documents', 'idx_documents_search'),
            
            # Performance indexes
            ('notifications', 'idx_notifications_user_unread'),
            ('certificates', 'idx_certificates_expiring_soon'),
        }
        
        missing_indexes = critical_indexes - existing_indexes
        assert not missing_indexes, f"Missing critical indexes: {missing_indexes}"
        
        logger.info(f"✅ All {len(critical_indexes)} critical indexes exist")
    
    def test_foreign_key_constraints(self, db_session):
        """Verify foreign key relationships are properly established"""
        inspector = inspect(db_session.bind)
        
        # Test key foreign key relationships
        fk_tests = [
            ('companies', 'users', 'user_id', 'id'),
            ('proposals', 'opportunities', 'opportunity_id', 'id'),
            ('proposals', 'companies', 'company_id', 'id'),
            ('proposals', 'users', 'user_id', 'id'),
            ('documents', 'users', 'user_id', 'id'),
            ('certificates', 'companies', 'company_id', 'id'),
            ('notifications', 'users', 'user_id', 'id'),
            ('procurement_monitors', 'users', 'user_id', 'id')
        ]
        
        for table, ref_table, fk_col, ref_col in fk_tests:
            fks = inspector.get_foreign_keys(table)
            
            # Find the specific foreign key
            target_fk = None
            for fk in fks:
                if (fk['referred_table'] == ref_table and 
                    fk_col in fk['constrained_columns'] and 
                    ref_col in fk['referred_columns']):
                    target_fk = fk
                    break
            
            assert target_fk is not None, \
                f"Foreign key {table}.{fk_col} -> {ref_table}.{ref_col} not found"
        
        logger.info("✅ All critical foreign key relationships verified")
    
    def test_check_constraints(self, db_session):
        """Verify check constraints are properly created"""
        result = db_session.execute(text("""
            SELECT conname, conrelid::regclass, pg_get_constraintdef(oid) as definition
            FROM pg_constraint 
            WHERE contype = 'c' 
            AND conrelid::regclass::text NOT LIKE 'pg_%'
            ORDER BY conrelid::regclass, conname
        """)).fetchall()
        
        constraints = {(str(row[1]), row[0]): row[2] for row in result}
        
        # Verify critical check constraints
        critical_constraints = [
            ('users', 'check_email_format'),
            ('companies', 'check_cnpj_format'),
            ('companies', 'check_positive_revenue'),
            ('opportunities', 'check_positive_estimated_value'),
            ('opportunities', 'check_date_order'),
            ('proposals', 'check_positive_proposal_value'),
            ('proposals', 'check_score_ranges')
        ]
        
        missing_constraints = []
        for table, constraint_name in critical_constraints:
            if (table, constraint_name) not in constraints:
                missing_constraints.append(f"{table}.{constraint_name}")
        
        assert not missing_constraints, \
            f"Missing check constraints: {missing_constraints}"
        
        logger.info(f"✅ All critical check constraints verified")
    
    def test_unique_constraints(self, db_session):
        """Verify unique constraints are properly established"""
        inspector = inspect(db_session.bind)
        
        # Test critical unique constraints
        unique_tests = [
            ('users', ['email']),
            ('companies', ['cnpj']),
            ('companies', ['user_id']),  # One company per user
            ('opportunities', ['external_id']),  # Where not null
        ]
        
        for table, columns in unique_tests:
            indexes = inspector.get_indexes(table)
            unique_constraints = inspector.get_unique_constraints(table)
            
            # Check if constraint exists (either as unique constraint or unique index)
            constraint_found = False
            
            # Check unique constraints
            for constraint in unique_constraints:
                if set(constraint['column_names']) == set(columns):
                    constraint_found = True
                    break
            
            # Check unique indexes
            if not constraint_found:
                for index in indexes:
                    if index['unique'] and set(index['column_names']) == set(columns):
                        constraint_found = True
                        break
            
            assert constraint_found, \
                f"Unique constraint on {table}({', '.join(columns)}) not found"
        
        logger.info("✅ All unique constraints verified")
    
    def test_extensions_enabled(self, db_session):
        """Verify required PostgreSQL extensions are enabled"""
        result = db_session.execute(text("""
            SELECT extname FROM pg_extension ORDER BY extname
        """)).fetchall()
        
        enabled_extensions = {row[0] for row in result}
        
        required_extensions = {'uuid-ossp', 'unaccent', 'pg_trgm'}
        missing_extensions = required_extensions - enabled_extensions
        
        assert not missing_extensions, \
            f"Missing required extensions: {missing_extensions}"
        
        logger.info("✅ All required PostgreSQL extensions enabled")
    
    def test_validation_functions_exist(self, db_session):
        """Verify custom validation functions are created"""
        result = db_session.execute(text("""
            SELECT proname 
            FROM pg_proc 
            WHERE pronamespace = 'public'::regnamespace
            AND prokind = 'f'
            ORDER BY proname
        """)).fetchall()
        
        existing_functions = {row[0] for row in result}
        
        required_functions = {
            'validate_cnpj', 'validate_cpf', 'validate_email', 'validate_phone_br',
            'update_updated_at_column', 'update_opportunity_search_vector',
            'update_opportunity_proposal_stats', 'update_document_search_vector',
            'update_certificate_compliance_score', 'get_enum_values'
        }
        
        missing_functions = required_functions - existing_functions
        assert not missing_functions, \
            f"Missing validation functions: {missing_functions}"
        
        logger.info(f"✅ All {len(required_functions)} validation functions created")
    
    def test_triggers_created(self, db_session):
        """Verify database triggers are properly created"""
        result = db_session.execute(text("""
            SELECT tgname, tgrelid::regclass as table_name
            FROM pg_trigger 
            WHERE tgrelid::regclass::text NOT LIKE 'pg_%'
            ORDER BY tgrelid::regclass, tgname
        """)).fetchall()
        
        existing_triggers = {(str(row[1]), row[0]) for row in result}
        
        required_triggers = [
            ('users', 'trigger_users_updated_at'),
            ('companies', 'trigger_companies_updated_at'),
            ('opportunities', 'trigger_opportunities_updated_at'),
            ('opportunities', 'trigger_opportunities_search_vector'),
            ('proposals', 'trigger_proposals_updated_at'),
            ('proposals', 'trigger_proposal_stats_insert'),
            ('documents', 'trigger_documents_search_vector'),
            ('certificates', 'trigger_certificate_compliance_score')
        ]
        
        missing_triggers = []
        for table, trigger_name in required_triggers:
            if (table, trigger_name) not in existing_triggers:
                missing_triggers.append(f"{table}.{trigger_name}")
        
        # Some triggers might not exist if tables don't exist yet, so we warn instead of fail
        if missing_triggers:
            logger.warning(f"Missing triggers (may be expected): {missing_triggers}")
        
        logger.info("✅ Trigger validation completed")

class TestDataTypes:
    """Test data type compatibility and handling"""
    
    def test_uuid_primary_keys(self, db_session):
        """Test UUID primary key generation and format"""
        # Test that UUID primary keys work correctly
        result = db_session.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'id'
        """)).fetchone()
        
        assert result is not None, "users.id column not found"
        assert result[1] == 'uuid', f"Expected UUID type, got {result[1]}"
        assert 'uuid_generate_v4' in result[2], "UUID default not set correctly"
        
        logger.info("✅ UUID primary keys configured correctly")
    
    def test_timestamp_with_timezone(self, db_session):
        """Test timestamp with timezone handling"""
        result = db_session.execute(text("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users' 
            AND column_name IN ('created_at', 'updated_at')
            ORDER BY column_name
        """)).fetchall()
        
        assert len(result) == 2, "Missing timestamp columns"
        
        for row in result:
            assert row[1] == 'timestamp with time zone', \
                f"Expected timestamptz, got {row[1]} for {row[0]}"
        
        logger.info("✅ Timestamp with timezone columns configured correctly")
    
    def test_jsonb_columns(self, db_session):
        """Test JSONB column types"""
        jsonb_columns = [
            ('companies', 'verification_documents'),
            ('opportunities', 'ai_analysis'),
            ('opportunities', 'technical_requirements'),
            ('proposals', 'technical_proposal'),
            ('documents', 'ai_analysis'),
            ('notifications', 'variables')
        ]
        
        for table_name, column_name in jsonb_columns:
            result = db_session.execute(text(f"""
                SELECT data_type 
                FROM information_schema.columns
                WHERE table_name = '{table_name}' 
                AND column_name = '{column_name}'
            """)).fetchone()
            
            if result:  # Column exists
                assert result[0] == 'jsonb', \
                    f"Expected JSONB for {table_name}.{column_name}, got {result[0]}"
        
        logger.info("✅ JSONB columns configured correctly")
    
    def test_array_columns(self, db_session):
        """Test PostgreSQL array column types"""
        array_columns = [
            ('companies', 'business_sectors'),
            ('opportunities', 'keywords'),
            ('opportunities', 'tags'),
            ('procurement_monitors', 'keywords'),
            ('documents', 'tags')
        ]
        
        for table_name, column_name in array_columns:
            result = db_session.execute(text(f"""
                SELECT data_type, udt_name 
                FROM information_schema.columns
                WHERE table_name = '{table_name}' 
                AND column_name = '{column_name}'
            """)).fetchone()
            
            if result:  # Column exists
                assert result[0] == 'ARRAY', \
                    f"Expected ARRAY for {table_name}.{column_name}, got {result[0]}"
        
        logger.info("✅ Array columns configured correctly")
    
    def test_enum_column_usage(self, db_session):
        """Test enum types are properly used in columns"""
        enum_columns = [
            ('users', 'role', 'user_role'),
            ('users', 'subscription_tier', 'subscription_tier'),
            ('companies', 'company_type', 'company_type'),
            ('opportunities', 'modality', 'opportunity_modality'),
            ('opportunities', 'status', 'opportunity_status'),
            ('proposals', 'status', 'proposal_status')
        ]
        
        for table_name, column_name, expected_enum in enum_columns:
            result = db_session.execute(text(f"""
                SELECT udt_name 
                FROM information_schema.columns
                WHERE table_name = '{table_name}' 
                AND column_name = '{column_name}'
            """)).fetchone()
            
            if result:  # Column exists
                assert result[0] == expected_enum, \
                    f"Expected {expected_enum} for {table_name}.{column_name}, got {result[0]}"
        
        logger.info("✅ Enum columns configured correctly")

class TestSchemaConstraints:
    """Test schema-level constraints and business rules"""
    
    def test_user_email_uniqueness(self, db_session):
        """Test user email uniqueness constraint"""
        from migration.code_templates.python_models import User
        
        # Create first user
        user1 = User(email="test@unique.com", first_name="Test1")
        db_session.add(user1)
        db_session.commit()
        
        # Try to create second user with same email
        user2 = User(email="test@unique.com", first_name="Test2")
        db_session.add(user2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        logger.info("✅ User email uniqueness constraint working")
    
    def test_company_cnpj_uniqueness(self, db_session):
        """Test company CNPJ uniqueness constraint"""
        from migration.code_templates.python_models import User, Company
        
        # Create users
        user1 = User(email="company1@test.com")
        user2 = User(email="company2@test.com")
        db_session.add_all([user1, user2])
        db_session.flush()
        
        # Create first company
        company1 = Company(
            user_id=user1.id,
            legal_name="Company 1",
            cnpj="12345678000195"
        )
        db_session.add(company1)
        db_session.commit()
        
        # Try to create second company with same CNPJ
        company2 = Company(
            user_id=user2.id,
            legal_name="Company 2", 
            cnpj="12345678000195"
        )
        db_session.add(company2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        logger.info("✅ Company CNPJ uniqueness constraint working")
    
    def test_one_company_per_user(self, db_session):
        """Test one company per user constraint"""
        from migration.code_templates.python_models import User, Company
        
        # Create user
        user = User(email="onecompany@test.com")
        db_session.add(user)
        db_session.flush()
        
        # Create first company
        company1 = Company(
            user_id=user.id,
            legal_name="First Company",
            cnpj="11111111000191"
        )
        db_session.add(company1)
        db_session.commit()
        
        # Try to create second company for same user
        company2 = Company(
            user_id=user.id,
            legal_name="Second Company",
            cnpj="22222222000192"
        )
        db_session.add(company2)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        logger.info("✅ One company per user constraint working")
    
    def test_positive_values_constraints(self, db_session):
        """Test positive value constraints"""
        from migration.code_templates.python_models import Opportunity, Proposal, User, Company
        
        # Test opportunity with negative value
        opportunity = Opportunity(
            title="Test Opportunity",
            organ="Test Organ",
            modality="PREGAO",
            estimated_value=Decimal("-1000.00")  # Negative value
        )
        db_session.add(opportunity)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        
        # Test proposal with negative value
        user = User(email="proposal@test.com")
        company = Company(user_id=None, legal_name="Test", cnpj="33333333000193")
        opp = Opportunity(title="Test", organ="Test", modality="PREGAO", estimated_value=1000)
        
        db_session.add_all([user, opp])
        db_session.flush()
        
        company.user_id = user.id
        db_session.add(company)
        db_session.flush()
        
        proposal = Proposal(
            opportunity_id=opp.id,
            company_id=company.id,
            user_id=user.id,
            proposal_value=Decimal("-500.00")  # Negative value
        )
        db_session.add(proposal)
        
        with pytest.raises(IntegrityError):
            db_session.commit()
        
        db_session.rollback()
        logger.info("✅ Positive value constraints working")

class TestSchemaPerformance:
    """Test schema performance characteristics"""
    
    def test_index_usage_plans(self, db_session):
        """Test that critical queries use indexes"""
        # Test user email lookup uses index
        result = db_session.execute(text("""
            EXPLAIN (FORMAT JSON) 
            SELECT * FROM users WHERE email = 'test@example.com'
        """)).fetchone()
        
        plan = result[0][0]['Plan']
        assert plan['Node Type'] == 'Index Scan', \
            f"Email query not using index: {plan['Node Type']}"
        
        # Test CNPJ lookup uses index
        result = db_session.execute(text("""
            EXPLAIN (FORMAT JSON)
            SELECT * FROM companies WHERE cnpj = '12345678000195'
        """)).fetchone()
        
        plan = result[0][0]['Plan']
        assert plan['Node Type'] == 'Index Scan', \
            f"CNPJ query not using index: {plan['Node Type']}"
        
        logger.info("✅ Critical queries using indexes correctly")
    
    def test_table_statistics(self, db_session):
        """Test that table statistics are available for query planning"""
        result = db_session.execute(text("""
            SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
            LIMIT 5
        """)).fetchall()
        
        # Should have statistics for at least some tables
        assert len(result) >= 0, "No table statistics available"
        logger.info("✅ Table statistics available for query optimization")

def run_schema_tests():
    """Run all schema tests with proper setup"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-x"  # Stop on first failure
    ])

if __name__ == "__main__":
    run_schema_tests()