#!/usr/bin/env python3
"""
Integration Tests for SQLite to Neon Migration
Test inter-component functionality and workflows
"""

import pytest
import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import text, func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class TestDatabaseIntegration:
    """Test database integration and cross-table functionality"""
    
    def test_user_company_relationship(self, db_session):
        """Test user-company relationship integrity"""
        from migration.code_templates.python_models import User, Company
        
        # Create user
        user = User(
            email="integration@test.com",
            first_name="Integration",
            last_name="Test"
        )
        db_session.add(user)
        db_session.flush()
        
        # Create company for user
        company = Company(
            user_id=user.id,
            legal_name="Integration Test Company",
            cnpj="12345678000195"
        )
        db_session.add(company)
        db_session.commit()
        
        # Verify relationship works both ways
        retrieved_user = db_session.query(User).filter_by(email="integration@test.com").first()
        assert retrieved_user.company is not None
        assert retrieved_user.company.legal_name == "Integration Test Company"
        assert retrieved_user.company.user.email == "integration@test.com"
        
        logger.info("✅ User-Company relationship working correctly")
    
    def test_opportunity_proposal_workflow(self, db_session):
        """Test complete opportunity-proposal workflow"""
        from migration.code_templates.python_models import (
            User, Company, Opportunity, Proposal, OpportunityModality, ProposalStatus
        )
        
        # Setup user and company
        user = User(email="workflow@test.com", first_name="Workflow")
        db_session.add(user)
        db_session.flush()
        
        company = Company(
            user_id=user.id,
            legal_name="Workflow Company",
            cnpj="11111111000191"
        )
        db_session.add(company)
        db_session.flush()
        
        # Create opportunity
        opportunity = Opportunity(
            title="Test Opportunity for Workflow",
            organ="Test Ministry",
            modality=OpportunityModality.PREGAO,
            estimated_value=Decimal("50000.00")
        )
        db_session.add(opportunity)
        db_session.flush()
        
        # Create proposal
        proposal = Proposal(
            opportunity_id=opportunity.id,
            company_id=company.id,
            user_id=user.id,
            proposal_value=Decimal("45000.00"),
            status=ProposalStatus.DRAFT
        )
        db_session.add(proposal)
        db_session.commit()
        
        # Verify relationships
        retrieved_opportunity = db_session.query(Opportunity).first()
        assert len(retrieved_opportunity.proposals) == 1
        assert retrieved_opportunity.proposals[0].company.legal_name == "Workflow Company"
        
        # Test proposal submission workflow
        proposal.status = ProposalStatus.SUBMITTED
        proposal.submitted_at = datetime.now()
        db_session.commit()
        
        # Verify status change
        assert proposal.is_submitted == True
        
        logger.info("✅ Opportunity-Proposal workflow working correctly")
    
    def test_notification_system_integration(self, db_session):
        """Test notification system integration"""
        from migration.code_templates.python_models import (
            User, Opportunity, Notification, NotificationType
        )
        
        # Create user
        user = User(email="notifications@test.com")
        db_session.add(user)
        db_session.flush()
        
        # Create opportunity
        opportunity = Opportunity(
            title="Notification Test Opportunity",
            organ="Test Organ",
            modality="PREGAO"
        )
        db_session.add(opportunity)
        db_session.flush()
        
        # Create notification
        notification = Notification(
            user_id=user.id,
            opportunity_id=opportunity.id,
            type=NotificationType.OPPORTUNITY,
            title="New Opportunity Available",
            message="A new opportunity matching your interests is available"
        )
        db_session.add(notification)
        db_session.commit()
        
        # Verify notification relationships
        user_notifications = db_session.query(Notification).filter_by(user_id=user.id).all()
        assert len(user_notifications) == 1
        assert user_notifications[0].opportunity.title == "Notification Test Opportunity"
        
        # Test notification read status
        assert notification.is_read == False
        notification.is_read = True
        notification.read_at = datetime.now()
        db_session.commit()
        
        assert notification.is_read == True
        assert notification.read_at is not None
        
        logger.info("✅ Notification system integration working correctly")
    
    def test_procurement_monitor_functionality(self, db_session):
        """Test procurement monitoring system"""
        from migration.code_templates.python_models import User, ProcurementMonitor
        
        # Create user
        user = User(email="monitor@test.com")
        db_session.add(user)
        db_session.flush()
        
        # Create procurement monitor
        monitor = ProcurementMonitor(
            user_id=user.id,
            name="Software Development Monitor",
            keywords=["software", "desenvolvimento", "sistema"],
            excluded_keywords=["hardware", "equipamento"],
            regions=["SP", "RJ"],
            min_value=Decimal("10000.00"),
            max_value=Decimal("100000.00")
        )
        db_session.add(monitor)
        db_session.commit()
        
        # Verify monitor relationships
        user_monitors = db_session.query(ProcurementMonitor).filter_by(user_id=user.id).all()
        assert len(user_monitors) == 1
        assert user_monitors[0].name == "Software Development Monitor"
        assert "software" in user_monitors[0].keywords
        
        logger.info("✅ Procurement monitoring functionality working correctly")
    
    def test_certificate_tracking_system(self, db_session):
        """Test certificate tracking for companies"""
        from migration.code_templates.python_models import User, Company, Certificate
        from datetime import date, timedelta
        
        # Setup user and company
        user = User(email="certificates@test.com")
        db_session.add(user)
        db_session.flush()
        
        company = Company(
            user_id=user.id,
            legal_name="Certificate Test Company",
            cnpj="22222222000192"
        )
        db_session.add(company)
        db_session.flush()
        
        # Create certificate
        certificate = Certificate(
            company_id=company.id,
            certificate_number="CERT-123456",
            issuing_authority="Brazilian Authority",
            title="Business License",
            issue_date=date.today() - timedelta(days=30),
            expiry_date=date.today() + timedelta(days=30),  # Expires in 30 days
            renewal_period_months=12
        )
        db_session.add(certificate)
        db_session.commit()
        
        # Verify certificate relationships
        company_certificates = db_session.query(Certificate).filter_by(company_id=company.id).all()
        assert len(company_certificates) == 1
        assert company_certificates[0].is_expiring_soon == True  # Expires in 30 days
        assert company_certificates[0].is_expired == False
        
        logger.info("✅ Certificate tracking system working correctly")

class TestAsyncIntegration:
    """Test async functionality integration"""
    
    @pytest.mark.asyncio
    async def test_async_database_operations(self):
        """Test async database operations"""
        from migration.code_templates.database_config import get_database_manager
        from migration.code_templates.python_models import User
        
        db_manager = get_database_manager()
        
        # Test async session creation and operations
        async with db_manager.get_async_session() as session:
            # Create user asynchronously
            user = User(
                email="async@test.com",
                first_name="Async",
                last_name="Test"
            )
            session.add(user)
            await session.commit()
            
            # Query user asynchronously
            from sqlalchemy import select
            result = await session.execute(
                select(User).filter_by(email="async@test.com")
            )
            retrieved_user = result.scalars().first()
            
            assert retrieved_user is not None
            assert retrieved_user.email == "async@test.com"
        
        logger.info("✅ Async database operations working correctly")
    
    @pytest.mark.asyncio
    async def test_concurrent_async_operations(self):
        """Test concurrent async operations"""
        from migration.code_templates.database_config import get_database_manager
        
        db_manager = get_database_manager()
        
        async def create_user(email):
            async with db_manager.get_async_session() as session:
                from migration.code_templates.python_models import User
                user = User(email=email, first_name="Concurrent")
                session.add(user)
                await session.commit()
                return user.id
        
        # Run multiple concurrent operations
        user_emails = [f"concurrent{i}@test.com" for i in range(5)]
        tasks = [create_user(email) for email in user_emails]
        
        user_ids = await asyncio.gather(*tasks)
        
        # Verify all users were created
        assert len(user_ids) == 5
        assert all(user_id is not None for user_id in user_ids)
        
        logger.info("✅ Concurrent async operations working correctly")

class TestBusinessLogicIntegration:
    """Test business logic integration across models"""
    
    def test_proposal_scoring_system(self, db_session):
        """Test proposal scoring and ranking system"""
        from migration.code_templates.python_models import (
            User, Company, Opportunity, Proposal
        )
        
        # Setup users and companies
        users = []
        companies = []
        
        for i in range(3):
            user = User(email=f"bidder{i}@test.com")
            db_session.add(user)
            db_session.flush()
            
            company = Company(
                user_id=user.id,
                legal_name=f"Bidder Company {i}",
                cnpj=f"3333333300019{i}"
            )
            db_session.add(company)
            db_session.flush()
            
            users.append(user)
            companies.append(company)
        
        # Create opportunity
        opportunity = Opportunity(
            title="Scoring Test Opportunity",
            organ="Test Ministry",
            modality="PREGAO",
            estimated_value=Decimal("100000.00")
        )
        db_session.add(opportunity)
        db_session.flush()
        
        # Create proposals with different scores
        proposals = []
        proposal_values = [Decimal("95000.00"), Decimal("90000.00"), Decimal("85000.00")]
        technical_scores = [Decimal("85.0"), Decimal("92.0"), Decimal("88.0")]
        
        for i, (user, company, value, tech_score) in enumerate(zip(users, companies, proposal_values, technical_scores)):
            proposal = Proposal(
                opportunity_id=opportunity.id,
                company_id=company.id,
                user_id=user.id,
                proposal_value=value,
                technical_score=tech_score,
                commercial_score=Decimal("90.0"),
                final_score=tech_score * Decimal("0.6") + Decimal("90.0") * Decimal("0.4"),  # 60% tech, 40% commercial
                ranking_position=i + 1
            )
            proposals.append(proposal)
            db_session.add(proposal)
        
        db_session.commit()
        
        # Test proposal ranking logic
        best_proposal = db_session.query(Proposal).filter_by(
            opportunity_id=opportunity.id
        ).order_by(Proposal.final_score.desc()).first()
        
        assert best_proposal.technical_score == Decimal("92.0")  # Highest technical score
        assert best_proposal.ranking_position == 2  # Second company (index 1)
        
        logger.info("✅ Proposal scoring system working correctly")
    
    def test_opportunity_search_functionality(self, db_session):
        """Test opportunity search and filtering"""
        from migration.code_templates.python_models import Opportunity
        from sqlalchemy import and_, or_
        
        # Create opportunities with different characteristics
        opportunities = [
            Opportunity(
                title="Software Development Services",
                organ="Ministry of Technology",
                modality="PREGAO",
                estimated_value=Decimal("75000.00"),
                keywords=["software", "development", "web"],
                state="SP",
                city="São Paulo"
            ),
            Opportunity(
                title="Hardware Procurement",
                organ="Ministry of Defense",
                modality="CONCORRENCIA",
                estimated_value=Decimal("150000.00"),
                keywords=["hardware", "computers", "equipment"],
                state="RJ",
                city="Rio de Janeiro"
            ),
            Opportunity(
                title="Consulting Services",
                organ="Municipality of Campinas",
                modality="PREGAO",
                estimated_value=Decimal("25000.00"),
                keywords=["consulting", "advisory", "management"],
                state="SP",
                city="Campinas"
            )
        ]
        
        for opp in opportunities:
            db_session.add(opp)
        db_session.commit()
        
        # Test value range filtering
        mid_value_opps = db_session.query(Opportunity).filter(
            and_(
                Opportunity.estimated_value >= Decimal("50000.00"),
                Opportunity.estimated_value <= Decimal("100000.00")
            )
        ).all()
        assert len(mid_value_opps) == 1
        assert mid_value_opps[0].title == "Software Development Services"
        
        # Test location filtering
        sp_opportunities = db_session.query(Opportunity).filter_by(state="SP").all()
        assert len(sp_opportunities) == 2
        
        # Test modality filtering
        pregao_opportunities = db_session.query(Opportunity).filter_by(modality="PREGAO").all()
        assert len(pregao_opportunities) == 2
        
        # Test keyword array search (PostgreSQL specific)
        software_opportunities = db_session.query(Opportunity).filter(
            Opportunity.keywords.contains(["software"])
        ).all()
        assert len(software_opportunities) == 1
        assert software_opportunities[0].title == "Software Development Services"
        
        logger.info("✅ Opportunity search functionality working correctly")
    
    def test_jsonb_data_operations(self, db_session):
        """Test JSONB data storage and querying"""
        from migration.code_templates.python_models import Opportunity, Proposal
        
        # Create opportunity with JSONB data
        opportunity = Opportunity(
            title="JSONB Test Opportunity",
            organ="Test Ministry",
            modality="PREGAO",
            technical_requirements={
                "programming_languages": ["Python", "JavaScript"],
                "frameworks": ["FastAPI", "React"],
                "database": "PostgreSQL",
                "experience_required": 5,
                "certifications": {
                    "required": ["ISO 27001"],
                    "preferred": ["AWS Certified"]
                }
            },
            ai_analysis={
                "complexity": "high",
                "success_probability": 0.75,
                "risk_factors": ["tight_deadline", "complex_requirements"],
                "recommendation": "proceed_with_caution"
            }
        )
        db_session.add(opportunity)
        db_session.flush()
        
        # Create proposal with JSONB data
        proposal = Proposal(
            opportunity_id=opportunity.id,
            company_id=None,  # We'll skip company for this test
            user_id=None,
            proposal_value=Decimal("80000.00"),
            technical_proposal={
                "approach": "Agile development",
                "team_composition": {
                    "senior_developers": 2,
                    "junior_developers": 1,
                    "project_manager": 1
                },
                "timeline": {
                    "phases": [
                        {"name": "Analysis", "duration": "2 weeks"},
                        {"name": "Development", "duration": "8 weeks"},
                        {"name": "Testing", "duration": "2 weeks"}
                    ],
                    "total_weeks": 12
                }
            }
        )
        db_session.add(proposal)
        db_session.commit()
        
        # Test JSONB containment queries
        python_opportunities = db_session.query(Opportunity).filter(
            Opportunity.technical_requirements.contains({"programming_languages": ["Python"]})
        ).all()
        assert len(python_opportunities) == 0  # Containment requires exact match
        
        # Test JSONB path queries
        high_complexity = db_session.query(Opportunity).filter(
            Opportunity.ai_analysis['complexity'].astext == 'high'
        ).all()
        assert len(high_complexity) == 1
        
        # Test JSONB path with numeric comparison
        experienced_required = db_session.query(Opportunity).filter(
            Opportunity.technical_requirements['experience_required'].astext.cast(int) >= 5
        ).all()
        assert len(experienced_required) == 1
        
        # Test nested JSONB path
        iso_required = db_session.query(Opportunity).filter(
            Opportunity.technical_requirements['certifications']['required'].contains(['ISO 27001'])
        ).all()
        assert len(iso_required) == 1
        
        logger.info("✅ JSONB data operations working correctly")

def run_integration_tests():
    """Run all integration tests"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short"
    ])

if __name__ == "__main__":
    run_integration_tests()