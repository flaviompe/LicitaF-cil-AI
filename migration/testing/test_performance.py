#!/usr/bin/env python3
"""
Performance Tests for SQLite to Neon Migration
Test database performance, query optimization, and scalability
"""

import pytest
import time
import asyncio
import statistics
from concurrent.futures import ThreadPoolExecutor
from sqlalchemy import func, text, select
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class TestDatabasePerformance:
    """Test database performance characteristics"""
    
    def test_connection_establishment_time(self, db_session):
        """Test how quickly new connections are established"""
        from migration.code_templates.database_config import DatabaseManager, DatabaseSettings
        
        settings = DatabaseSettings(
            database_url="postgresql://test_user:test_pass@localhost/test_db"
        )
        db_manager = DatabaseManager(settings)
        
        # Test multiple connection establishments
        times = []
        for i in range(10):
            start_time = time.time()
            
            with db_manager.get_session() as session:
                session.execute(text("SELECT 1")).fetchone()
            
            end_time = time.time()
            times.append(end_time - start_time)
        
        avg_time = statistics.mean(times)
        max_time = max(times)
        
        # Connections should be established quickly
        assert avg_time < 0.1, f"Average connection time too slow: {avg_time:.3f}s"
        assert max_time < 0.5, f"Max connection time too slow: {max_time:.3f}s"
        
        logger.info(f"✅ Connection performance: avg={avg_time:.3f}s, max={max_time:.3f}s")
    
    def test_simple_query_performance(self, db_session):
        """Test performance of simple queries"""
        queries = [
            "SELECT 1",
            "SELECT NOW()",
            "SELECT COUNT(*) FROM users",
            "SELECT version()"
        ]
        
        for query in queries:
            start_time = time.time()
            result = db_session.execute(text(query)).fetchone()
            end_time = time.time()
            
            query_time = end_time - start_time
            assert query_time < 0.01, f"Simple query too slow: {query} took {query_time:.3f}s"
        
        logger.info("✅ Simple queries perform within acceptable limits")
    
    def test_indexed_lookup_performance(self, db_session, sample_users):
        """Test performance of indexed lookups"""
        from migration.code_templates.python_models import User
        
        # Test email lookup (indexed)
        start_time = time.time()
        user = db_session.query(User).filter(User.email == sample_users[0].email).first()
        email_query_time = time.time() - start_time
        
        assert email_query_time < 0.005, f"Email lookup too slow: {email_query_time:.3f}s"
        assert user is not None, "User not found"
        
        # Test ID lookup (primary key)
        start_time = time.time()
        user = db_session.query(User).filter(User.id == sample_users[0].id).first()
        id_query_time = time.time() - start_time
        
        assert id_query_time < 0.005, f"ID lookup too slow: {id_query_time:.3f}s"
        
        logger.info(f"✅ Indexed lookups: email={email_query_time:.4f}s, id={id_query_time:.4f}s")
    
    def test_join_query_performance(self, db_session, sample_data):
        """Test performance of JOIN queries"""
        from migration.code_templates.python_models import User, Company, Proposal, Opportunity
        
        # Test user with company join
        start_time = time.time()
        results = db_session.query(User, Company).join(Company).limit(10).all()
        join_time = time.time() - start_time
        
        assert join_time < 0.05, f"User-Company join too slow: {join_time:.3f}s"
        
        # Test complex multi-table join
        start_time = time.time()
        results = db_session.query(
            User.email,
            Company.legal_name,
            Opportunity.title,
            Proposal.proposal_value
        ).select_from(User)\
         .join(Company)\
         .join(Proposal)\
         .join(Opportunity)\
         .limit(10).all()
        
        complex_join_time = time.time() - start_time
        assert complex_join_time < 0.1, f"Complex join too slow: {complex_join_time:.3f}s"
        
        logger.info(f"✅ JOIN queries: simple={join_time:.4f}s, complex={complex_join_time:.4f}s")
    
    def test_aggregate_query_performance(self, db_session, sample_opportunities):
        """Test performance of aggregate queries"""
        from migration.code_templates.python_models import Opportunity
        
        # Test simple aggregates
        start_time = time.time()
        stats = db_session.query(
            func.count(Opportunity.id).label('total'),
            func.avg(Opportunity.estimated_value).label('avg_value'),
            func.max(Opportunity.estimated_value).label('max_value'),
            func.min(Opportunity.estimated_value).label('min_value')
        ).first()
        
        agg_time = time.time() - start_time
        assert agg_time < 0.1, f"Aggregate query too slow: {agg_time:.3f}s"
        assert stats.total > 0, "No data found for aggregation"
        
        # Test GROUP BY aggregates
        start_time = time.time()
        results = db_session.query(
            Opportunity.status,
            func.count(Opportunity.id).label('count'),
            func.avg(Opportunity.estimated_value).label('avg_value')
        ).group_by(Opportunity.status).all()
        
        group_agg_time = time.time() - start_time
        assert group_agg_time < 0.1, f"GROUP BY aggregate too slow: {group_agg_time:.3f}s"
        
        logger.info(f"✅ Aggregate queries: simple={agg_time:.4f}s, group_by={group_agg_time:.4f}s")
    
    def test_full_text_search_performance(self, db_session, sample_opportunities):
        """Test full-text search performance"""
        from migration.code_templates.python_models import Opportunity
        
        search_terms = ['software', 'desenvolvimento', 'sistema', 'tecnologia']
        
        for term in search_terms:
            start_time = time.time()
            
            # Test Portuguese full-text search
            results = db_session.query(Opportunity).filter(
                func.to_tsvector('portuguese', 
                    Opportunity.title + ' ' + func.coalesce(Opportunity.description, '')
                ).match(func.to_tsquery('portuguese', term))
            ).limit(10).all()
            
            search_time = time.time() - start_time
            assert search_time < 0.05, f"Full-text search too slow for '{term}': {search_time:.3f}s"
        
        logger.info("✅ Full-text search performance acceptable")
    
    def test_jsonb_query_performance(self, db_session, sample_data):
        """Test JSONB query performance"""
        from migration.code_templates.python_models import Opportunity
        
        # Test JSONB containment query
        start_time = time.time()
        results = db_session.query(Opportunity).filter(
            Opportunity.ai_analysis.contains({'complexity': 'medium'})
        ).limit(10).all()
        
        containment_time = time.time() - start_time
        assert containment_time < 0.05, f"JSONB containment query too slow: {containment_time:.3f}s"
        
        # Test JSONB path query
        start_time = time.time()
        results = db_session.query(Opportunity).filter(
            Opportunity.ai_analysis['success_probability'].astext.cast(float) > 0.5
        ).limit(10).all()
        
        path_time = time.time() - start_time
        assert path_time < 0.05, f"JSONB path query too slow: {path_time:.3f}s"
        
        logger.info(f"✅ JSONB queries: containment={containment_time:.4f}s, path={path_time:.4f}s")
    
    def test_array_query_performance(self, db_session, sample_data):
        """Test PostgreSQL array query performance"""
        from migration.code_templates.python_models import Opportunity
        
        # Test array contains query
        start_time = time.time()
        results = db_session.query(Opportunity).filter(
            Opportunity.keywords.contains(['software'])
        ).limit(10).all()
        
        array_time = time.time() - start_time
        assert array_time < 0.05, f"Array query too slow: {array_time:.3f}s"
        
        logger.info(f"✅ Array query performance: {array_time:.4f}s")

class TestConnectionPoolPerformance:
    """Test connection pool performance and efficiency"""
    
    def test_connection_pool_efficiency(self):
        """Test connection pool handles multiple requests efficiently"""
        from migration.code_templates.database_config import DatabaseManager, DatabaseSettings
        
        settings = DatabaseSettings(
            database_url="postgresql://test_user:test_pass@localhost/test_db",
            pool_size=10,
            max_overflow=20
        )
        db_manager = DatabaseManager(settings)
        
        def execute_query():
            with db_manager.get_session() as session:
                return session.execute(text("SELECT pg_backend_pid()")).scalar()
        
        # Execute multiple queries concurrently
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(execute_query) for _ in range(50)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All queries should succeed
        assert len(results) == 50, f"Expected 50 results, got {len(results)}"
        assert all(isinstance(pid, int) for pid in results), "Invalid backend PIDs"
        
        # Should handle 50 queries efficiently
        assert total_time < 2.0, f"Connection pool too slow: {total_time:.3f}s for 50 queries"
        
        # Check unique backend PIDs (indicates connection reuse)
        unique_pids = set(results)
        reuse_ratio = 1 - (len(unique_pids) / len(results))
        assert reuse_ratio > 0.5, f"Poor connection reuse: {reuse_ratio:.2f}"
        
        logger.info(f"✅ Connection pool: {total_time:.3f}s, reuse={reuse_ratio:.2f}")
    
    def test_connection_pool_under_load(self):
        """Test connection pool behavior under high load"""
        from migration.code_templates.database_config import DatabaseManager, DatabaseSettings
        
        settings = DatabaseSettings(
            database_url="postgresql://test_user:test_pass@localhost/test_db",
            pool_size=5,
            max_overflow=10,
            pool_timeout=1  # Short timeout for testing
        )
        db_manager = DatabaseManager(settings)
        
        def long_running_query():
            with db_manager.get_session() as session:
                # Simulate longer-running query
                session.execute(text("SELECT pg_sleep(0.1)"))
                return session.execute(text("SELECT 1")).scalar()
        
        # Execute more queries than pool can handle simultaneously
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(long_running_query) for _ in range(20)]
            results = []
            
            for future in futures:
                try:
                    results.append(future.result(timeout=5))
                except Exception as e:
                    logger.warning(f"Query failed under load: {e}")
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Most queries should succeed
        success_rate = len(results) / 20
        assert success_rate > 0.8, f"Too many failures under load: {success_rate:.2f}"
        
        logger.info(f"✅ Load test: {total_time:.3f}s, success_rate={success_rate:.2f}")

class TestConcurrencyPerformance:
    """Test concurrent access performance"""
    
    def test_concurrent_reads(self, db_session, sample_data):
        """Test concurrent read performance"""
        from migration.code_templates.python_models import User
        
        def read_users():
            # Create new session for each thread
            from migration.code_templates.database_config import get_database_manager
            db_manager = get_database_manager()
            
            with db_manager.get_session() as session:
                return session.query(User).limit(10).all()
        
        # Execute concurrent reads
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(read_users) for _ in range(20)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # All reads should succeed
        assert len(results) == 20, f"Expected 20 results, got {len(results)}"
        assert all(len(users) >= 0 for users in results), "Invalid read results"
        
        # Concurrent reads should be efficient
        assert total_time < 1.0, f"Concurrent reads too slow: {total_time:.3f}s"
        
        logger.info(f"✅ Concurrent reads: {total_time:.3f}s for 20 threads")
    
    def test_concurrent_writes(self, db_session):
        """Test concurrent write performance"""
        from migration.code_templates.python_models import User
        
        def create_user(user_id):
            from migration.code_templates.database_config import get_database_manager
            db_manager = get_database_manager()
            
            try:
                with db_manager.get_session() as session:
                    user = User(
                        email=f"concurrent_{user_id}@test.com",
                        first_name=f"User{user_id}"
                    )
                    session.add(user)
                    session.commit()
                    return True
            except Exception as e:
                logger.warning(f"Write failed for user {user_id}: {e}")
                return False
        
        # Execute concurrent writes
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_user, i) for i in range(20)]
            results = [future.result() for future in futures]
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Most writes should succeed
        success_rate = sum(results) / len(results)
        assert success_rate > 0.9, f"Too many write failures: {success_rate:.2f}"
        
        # Concurrent writes should complete reasonably quickly
        assert total_time < 2.0, f"Concurrent writes too slow: {total_time:.3f}s"
        
        logger.info(f"✅ Concurrent writes: {total_time:.3f}s, success_rate={success_rate:.2f}")

class TestScalabilityPerformance:
    """Test performance scalability with increasing data volume"""
    
    @pytest.mark.slow
    def test_query_performance_with_large_dataset(self, db_session):
        """Test query performance with larger datasets"""
        from migration.code_templates.python_models import User, Opportunity
        
        # Create larger dataset for testing
        users = []
        for i in range(1000):
            user = User(
                email=f"scale_test_{i}@test.com",
                first_name=f"User{i}",
                last_name="Test"
            )
            users.append(user)
        
        db_session.add_all(users)
        db_session.commit()
        
        # Test various query patterns with larger dataset
        queries = [
            ("Email lookup", lambda: db_session.query(User).filter(
                User.email == "scale_test_500@test.com").first()),
            ("LIKE search", lambda: db_session.query(User).filter(
                User.first_name.like("User5%")).limit(10).all()),
            ("Count query", lambda: db_session.query(func.count(User.id)).scalar()),
            ("Order by query", lambda: db_session.query(User).order_by(
                User.created_at.desc()).limit(10).all())
        ]
        
        for query_name, query_func in queries:
            times = []
            
            # Run each query multiple times
            for _ in range(5):
                start_time = time.time()
                result = query_func()
                end_time = time.time()
                times.append(end_time - start_time)
            
            avg_time = statistics.mean(times)
            max_time = max(times)
            
            # Performance should remain reasonable even with more data
            assert avg_time < 0.1, f"{query_name} avg time too slow: {avg_time:.3f}s"
            assert max_time < 0.2, f"{query_name} max time too slow: {max_time:.3f}s"
            
            logger.info(f"✅ {query_name}: avg={avg_time:.4f}s, max={max_time:.4f}s")

class TestMemoryAndResourceUsage:
    """Test memory usage and resource efficiency"""
    
    def test_session_memory_usage(self, db_session):
        """Test that database sessions don't leak memory"""
        from migration.code_templates.python_models import User
        from migration.code_templates.database_config import get_database_manager
        
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Create and destroy many sessions
        db_manager = get_database_manager()
        
        for i in range(100):
            with db_manager.get_session() as session:
                users = session.query(User).limit(10).all()
                # Process some data
                _ = [user.email for user in users]
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be minimal (less than 50MB)
        assert memory_increase < 50 * 1024 * 1024, \
            f"Excessive memory usage: {memory_increase / 1024 / 1024:.1f}MB"
        
        logger.info(f"✅ Memory usage increase: {memory_increase / 1024 / 1024:.1f}MB")

@pytest.mark.asyncio
class TestAsyncPerformance:
    """Test asynchronous database operation performance"""
    
    async def test_async_query_performance(self):
        """Test async query performance"""
        from migration.code_templates.database_config import get_database_manager
        
        db_manager = get_database_manager()
        
        async def async_query():
            async with db_manager.get_async_session() as session:
                result = await session.execute(text("SELECT COUNT(*) FROM users"))
                return result.scalar()
        
        # Test single async query
        start_time = time.time()
        result = await async_query()
        single_time = time.time() - start_time
        
        assert single_time < 0.01, f"Single async query too slow: {single_time:.3f}s"
        
        # Test concurrent async queries
        start_time = time.time()
        tasks = [async_query() for _ in range(20)]
        results = await asyncio.gather(*tasks)
        concurrent_time = time.time() - start_time
        
        assert len(results) == 20, f"Expected 20 results, got {len(results)}"
        assert concurrent_time < 0.1, f"Concurrent async queries too slow: {concurrent_time:.3f}s"
        
        logger.info(f"✅ Async performance: single={single_time:.4f}s, concurrent={concurrent_time:.4f}s")
    
    async def test_async_transaction_performance(self):
        """Test async transaction performance"""
        from migration.code_templates.database_config import get_database_manager
        from migration.code_templates.python_models import User
        
        db_manager = get_database_manager()
        
        async def async_transaction(user_id):
            async with db_manager.get_async_session() as session:
                user = User(
                    email=f"async_{user_id}@test.com",
                    first_name=f"Async{user_id}"
                )
                session.add(user)
                await session.commit()
                return user.id
        
        start_time = time.time()
        tasks = [async_transaction(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        transaction_time = time.time() - start_time
        
        assert len(results) == 10, f"Expected 10 results, got {len(results)}"
        assert all(result is not None for result in results), "Invalid transaction results"
        assert transaction_time < 1.0, f"Async transactions too slow: {transaction_time:.3f}s"
        
        logger.info(f"✅ Async transactions: {transaction_time:.3f}s for 10 transactions")

def run_performance_tests():
    """Run all performance tests"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-m", "not slow"  # Skip slow tests by default
    ])

def run_all_performance_tests():
    """Run all performance tests including slow ones"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short"
    ])

if __name__ == "__main__":
    run_performance_tests()