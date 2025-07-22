#!/usr/bin/env python3
"""
Advanced Connection Pooling for SQLite to Neon Migration
Optimized connection management with PgBouncer integration and monitoring
"""

import asyncio
import logging
import time
import threading
from typing import Dict, Any, Optional, List, Union, ContextManager, AsyncContextManager
from contextlib import contextmanager, asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque, defaultdict
import psutil
import os

from sqlalchemy import create_engine, event, text, pool
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import QueuePool, NullPool, StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import asyncpg

logger = logging.getLogger(__name__)

@dataclass
class PoolMetrics:
    """Connection pool metrics tracking"""
    pool_size: int = 0
    checked_out: int = 0
    checked_in: int = 0
    overflow: int = 0
    invalid: int = 0
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    wait_time_avg: float = 0.0
    creation_time_avg: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)

@dataclass
class ConnectionStats:
    """Individual connection statistics"""
    connection_id: str
    created_at: datetime
    last_used: datetime
    usage_count: int = 0
    total_time: float = 0.0
    avg_query_time: float = 0.0
    is_active: bool = True
    errors: int = 0

class PoolMonitor:
    """Monitor connection pool performance and health"""
    
    def __init__(self, pool_name: str = "default"):
        self.pool_name = pool_name
        self.metrics_history = deque(maxlen=1000)  # Keep last 1000 measurements
        self.connection_stats: Dict[str, ConnectionStats] = {}
        self.alerts = []
        self.monitoring_active = False
        self._monitor_thread: Optional[threading.Thread] = None
    
    def start_monitoring(self, interval: int = 30):
        """Start background monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self._monitor_thread = threading.Thread(
            target=self._monitor_loop,
            args=(interval,),
            daemon=True
        )
        self._monitor_thread.start()
        logger.info(f"Started pool monitoring for {self.pool_name}")
    
    def stop_monitoring(self):
        """Stop background monitoring"""
        self.monitoring_active = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
        logger.info(f"Stopped pool monitoring for {self.pool_name}")
    
    def _monitor_loop(self, interval: int):
        """Background monitoring loop"""
        while self.monitoring_active:
            try:
                time.sleep(interval)
                if self.monitoring_active:
                    self.collect_metrics()
                    self.check_alerts()
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
    
    def collect_metrics(self):
        """Collect current pool metrics"""
        # This would be implemented with actual pool reference
        # For now, we provide the structure
        pass
    
    def record_connection_usage(self, connection_id: str, query_time: float):
        """Record connection usage statistics"""
        if connection_id not in self.connection_stats:
            self.connection_stats[connection_id] = ConnectionStats(
                connection_id=connection_id,
                created_at=datetime.now(),
                last_used=datetime.now()
            )
        
        stats = self.connection_stats[connection_id]
        stats.last_used = datetime.now()
        stats.usage_count += 1
        stats.total_time += query_time
        stats.avg_query_time = stats.total_time / stats.usage_count
    
    def record_connection_error(self, connection_id: str):
        """Record connection error"""
        if connection_id in self.connection_stats:
            self.connection_stats[connection_id].errors += 1
    
    def check_alerts(self):
        """Check for alert conditions"""
        current_time = datetime.now()
        
        # Check for long-running connections
        for conn_id, stats in self.connection_stats.items():
            if (current_time - stats.last_used).total_seconds() > 3600:  # 1 hour idle
                self.alerts.append({
                    'type': 'idle_connection',
                    'connection_id': conn_id,
                    'idle_time': current_time - stats.last_used,
                    'timestamp': current_time
                })
            
            if stats.errors > 10:  # High error rate
                self.alerts.append({
                    'type': 'high_error_rate',
                    'connection_id': conn_id,
                    'error_count': stats.errors,
                    'timestamp': current_time
                })
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of pool metrics"""
        if not self.connection_stats:
            return {}
        
        active_connections = sum(1 for stats in self.connection_stats.values() if stats.is_active)
        total_usage = sum(stats.usage_count for stats in self.connection_stats.values())
        avg_query_time = sum(stats.avg_query_time for stats in self.connection_stats.values()) / len(self.connection_stats)
        total_errors = sum(stats.errors for stats in self.connection_stats.values())
        
        return {
            'pool_name': self.pool_name,
            'total_connections': len(self.connection_stats),
            'active_connections': active_connections,
            'total_usage': total_usage,
            'avg_query_time_ms': avg_query_time * 1000,
            'total_errors': total_errors,
            'error_rate': total_errors / max(total_usage, 1) * 100,
            'alerts_count': len(self.alerts),
            'last_updated': datetime.now()
        }

class OptimizedConnectionPool:
    """Advanced connection pool with monitoring and optimization"""
    
    def __init__(self, 
                 database_url: str,
                 pool_size: int = 20,
                 max_overflow: int = 30,
                 pool_timeout: int = 30,
                 pool_recycle: int = 3600,
                 pool_pre_ping: bool = True,
                 enable_monitoring: bool = True):
        
        self.database_url = database_url
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        self.pool_recycle = pool_recycle
        self.pool_pre_ping = pool_pre_ping
        
        self.engine: Optional[Engine] = None
        self.session_factory: Optional[sessionmaker] = None
        self.monitor = PoolMonitor("optimized_pool") if enable_monitoring else None
        
        # Performance tracking
        self.query_stats = defaultdict(list)
        self.slow_query_threshold = 1.0  # 1 second
        
        # Connection lifecycle tracking
        self._active_connections = set()
        self._connection_times = {}
        
        logger.info(f"Initialized OptimizedConnectionPool: size={pool_size}, overflow={max_overflow}")
    
    def create_engine(self) -> Engine:
        """Create optimized SQLAlchemy engine"""
        if self.engine is not None:
            return self.engine
        
        # Connection arguments for optimization
        connect_args = {
            "options": "-c timezone=America/Sao_Paulo",
            "application_name": "licitacoes_optimized",
            "connect_timeout": 10,
            "server_settings": {
                "jit": "off",  # Disable JIT for consistent performance
                "shared_preload_libraries": "pg_stat_statements",
            }
        }
        
        # Create engine with optimized settings
        self.engine = create_engine(
            self.database_url,
            poolclass=QueuePool,
            pool_size=self.pool_size,
            max_overflow=self.max_overflow,
            pool_timeout=self.pool_timeout,
            pool_recycle=self.pool_recycle,
            pool_pre_ping=self.pool_pre_ping,
            pool_reset_on_return="commit",
            echo=False,  # Disable SQL echo for performance
            future=True,
            connect_args=connect_args,
            
            # Performance optimizations
            execution_options={
                "isolation_level": "READ_COMMITTED",
                "autocommit": False,
                "compiled_cache": {},  # Enable statement caching
            }
        )
        
        # Register event listeners for monitoring
        self._register_events()
        
        # Start monitoring if enabled
        if self.monitor:
            self.monitor.start_monitoring()
        
        logger.info("Optimized database engine created successfully")
        return self.engine
    
    def _register_events(self):
        """Register SQLAlchemy events for monitoring and optimization"""
        if not self.engine:
            return
        
        @event.listens_for(self.engine, "connect")
        def set_connection_options(dbapi_connection, connection_record):
            """Set optimal connection-level options"""
            connection_id = id(dbapi_connection)
            self._active_connections.add(connection_id)
            self._connection_times[connection_id] = time.time()
            
            with dbapi_connection.cursor() as cursor:
                # Set timezone
                cursor.execute("SET timezone TO 'America/Sao_Paulo'")
                
                # Optimize memory settings per connection
                cursor.execute("SET work_mem = '32MB'")
                cursor.execute("SET maintenance_work_mem = '256MB'")
                cursor.execute("SET temp_buffers = '32MB'")
                
                # Query planning optimizations
                cursor.execute("SET random_page_cost = 1.1")  # SSD optimization
                cursor.execute("SET effective_cache_size = '4GB'")
                cursor.execute("SET cpu_tuple_cost = 0.01")
                cursor.execute("SET cpu_index_tuple_cost = 0.005")
                cursor.execute("SET cpu_operator_cost = 0.0025")
                
                # Statement timeout for safety
                cursor.execute("SET statement_timeout = '60s'")
                cursor.execute("SET lock_timeout = '30s'")
                cursor.execute("SET idle_in_transaction_session_timeout = '300s'")
                
                # Application identification
                cursor.execute("SET application_name = 'licitacoes_optimized'")
        
        @event.listens_for(self.engine, "checkout")
        def on_connection_checkout(dbapi_connection, connection_record, connection_proxy):
            """Track connection checkout"""
            connection_id = id(dbapi_connection)
            if self.monitor:
                self.monitor.record_connection_usage(str(connection_id), 0)
        
        @event.listens_for(self.engine, "checkin")
        def on_connection_checkin(dbapi_connection, connection_record):
            """Track connection checkin"""
            connection_id = id(dbapi_connection)
            if connection_id in self._connection_times:
                usage_time = time.time() - self._connection_times[connection_id]
                if self.monitor:
                    self.monitor.record_connection_usage(str(connection_id), usage_time)
        
        @event.listens_for(self.engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query start time"""
            context._query_start_time = time.time()
        
        @event.listens_for(self.engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            """Track query completion and performance"""
            if hasattr(context, '_query_start_time'):
                query_time = time.time() - context._query_start_time
                
                # Record slow queries
                if query_time > self.slow_query_threshold:
                    logger.warning(f"Slow query ({query_time:.3f}s): {statement[:200]}...")
                
                # Update statistics
                query_hash = hash(statement)
                self.query_stats[query_hash].append(query_time)
                
                # Keep only recent measurements
                if len(self.query_stats[query_hash]) > 100:
                    self.query_stats[query_hash] = self.query_stats[query_hash][-50:]
        
        @event.listens_for(self.engine, "handle_error")
        def handle_error(exception_context):
            """Handle and log connection errors"""
            connection_id = id(exception_context.connection) if exception_context.connection else None
            
            if self.monitor and connection_id:
                self.monitor.record_connection_error(str(connection_id))
            
            logger.error(f"Database error: {exception_context.original_exception}")
    
    def get_session_factory(self) -> sessionmaker:
        """Get session factory"""
        if self.session_factory is None:
            engine = self.create_engine()
            self.session_factory = sessionmaker(
                bind=engine,
                class_=Session,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self.session_factory
    
    @contextmanager
    def get_session(self) -> ContextManager[Session]:
        """Get database session with automatic cleanup"""
        session_factory = self.get_session_factory()
        session = session_factory()
        
        start_time = time.time()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {e}")
            raise
        finally:
            session.close()
            
            # Track session usage time
            session_time = time.time() - start_time
            if session_time > 5.0:  # Log long-running sessions
                logger.warning(f"Long-running session: {session_time:.3f}s")
    
    def get_pool_status(self) -> PoolMetrics:
        """Get current pool status"""
        if not self.engine:
            return PoolMetrics()
        
        pool = self.engine.pool
        
        return PoolMetrics(
            pool_size=pool.size(),
            checked_out=pool.checkedout(),
            checked_in=pool.checkedin(),
            overflow=pool.overflow(),
            invalid=pool.invalid(),
            total_connections=pool.size() + pool.overflow(),
            active_connections=len(self._active_connections),
            idle_connections=pool.checkedin(),
            last_updated=datetime.now()
        )
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        if not self.query_stats:
            return {}
        
        all_times = []
        for times in self.query_stats.values():
            all_times.extend(times)
        
        if not all_times:
            return {}
        
        all_times.sort()
        
        return {
            'total_queries': len(all_times),
            'unique_queries': len(self.query_stats),
            'avg_query_time': sum(all_times) / len(all_times),
            'min_query_time': min(all_times),
            'max_query_time': max(all_times),
            'p50_query_time': all_times[len(all_times) // 2],
            'p95_query_time': all_times[int(len(all_times) * 0.95)],
            'p99_query_time': all_times[int(len(all_times) * 0.99)],
            'slow_queries_count': sum(1 for t in all_times if t > self.slow_query_threshold),
            'monitor_summary': self.monitor.get_metrics_summary() if self.monitor else {}
        }
    
    def optimize_pool_size(self) -> Dict[str, Any]:
        """Analyze and suggest pool size optimizations"""
        metrics = self.get_pool_status()
        
        # Calculate utilization
        utilization = metrics.checked_out / (metrics.pool_size + metrics.overflow) if metrics.pool_size > 0 else 0
        
        recommendations = []
        
        if utilization > 0.9:
            recommendations.append("Consider increasing pool size - high utilization detected")
        elif utilization < 0.3:
            recommendations.append("Consider decreasing pool size - low utilization detected")
        
        if metrics.overflow > metrics.pool_size * 0.5:
            recommendations.append("High overflow usage - increase base pool size")
        
        if len(self._active_connections) > metrics.pool_size * 2:
            recommendations.append("Many active connections - check for connection leaks")
        
        return {
            'current_utilization': utilization,
            'recommended_pool_size': max(5, min(50, int(metrics.pool_size * (1 + utilization)))),
            'recommendations': recommendations,
            'current_metrics': metrics
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        health_status = {
            'status': 'healthy',
            'checks': {},
            'timestamp': datetime.now()
        }
        
        try:
            # Test basic connectivity
            with self.get_session() as session:
                result = session.execute(text("SELECT 1")).scalar()
                health_status['checks']['connectivity'] = result == 1
            
            # Check pool metrics
            pool_metrics = self.get_pool_status()
            health_status['checks']['pool_healthy'] = (
                pool_metrics.invalid == 0 and 
                pool_metrics.checked_out < pool_metrics.pool_size + pool_metrics.overflow
            )
            
            # Check performance
            perf_stats = self.get_performance_stats()
            if perf_stats:
                health_status['checks']['performance_ok'] = (
                    perf_stats.get('avg_query_time', 0) < self.slow_query_threshold
                )
            
            # Overall health assessment
            if not all(health_status['checks'].values()):
                health_status['status'] = 'degraded'
            
            health_status['pool_metrics'] = pool_metrics
            health_status['performance'] = perf_stats
            
        except Exception as e:
            health_status['status'] = 'unhealthy'
            health_status['error'] = str(e)
            logger.error(f"Health check failed: {e}")
        
        return health_status
    
    def close(self):
        """Close pool and cleanup resources"""
        if self.monitor:
            self.monitor.stop_monitoring()
        
        if self.engine:
            self.engine.dispose()
            logger.info("Connection pool closed and resources cleaned up")

class AsyncOptimizedConnectionPool:
    """Async version of optimized connection pool"""
    
    def __init__(self, 
                 database_url: str,
                 pool_size: int = 20,
                 max_overflow: int = 30,
                 pool_timeout: int = 30):
        
        # Convert postgresql:// to postgresql+asyncpg://
        if database_url.startswith('postgresql://'):
            database_url = database_url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        
        self.database_url = database_url
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        
        self.async_engine = None
        self.async_session_factory = None
    
    async def create_async_engine(self):
        """Create async SQLAlchemy engine"""
        if self.async_engine is not None:
            return self.async_engine
        
        self.async_engine = create_async_engine(
            self.database_url,
            pool_size=self.pool_size,
            max_overflow=self.max_overflow,
            pool_timeout=self.pool_timeout,
            pool_recycle=3600,
            pool_pre_ping=True,
            echo=False,
            future=True
        )
        
        return self.async_engine
    
    async def get_async_session_factory(self):
        """Get async session factory"""
        if self.async_session_factory is None:
            engine = await self.create_async_engine()
            self.async_session_factory = async_sessionmaker(
                bind=engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self.async_session_factory
    
    @asynccontextmanager
    async def get_async_session(self) -> AsyncContextManager[AsyncSession]:
        """Get async database session"""
        session_factory = await self.get_async_session_factory()
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Async session error: {e}")
                raise
    
    async def health_check(self) -> Dict[str, Any]:
        """Async health check"""
        try:
            async with self.get_async_session() as session:
                result = await session.execute(text("SELECT 1"))
                value = result.scalar()
                return {
                    'status': 'healthy' if value == 1 else 'unhealthy',
                    'connectivity': value == 1,
                    'timestamp': datetime.now()
                }
        except Exception as e:
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now()
            }
    
    async def close(self):
        """Close async engine"""
        if self.async_engine:
            await self.async_engine.dispose()

class PgBouncerIntegration:
    """Integration with PgBouncer connection pooler"""
    
    def __init__(self, 
                 neon_url: str,
                 pgbouncer_url: Optional[str] = None,
                 pool_mode: str = "transaction"):
        
        self.neon_url = neon_url
        self.pgbouncer_url = pgbouncer_url or self._generate_pgbouncer_url(neon_url)
        self.pool_mode = pool_mode
    
    def _generate_pgbouncer_url(self, neon_url: str) -> str:
        """Generate PgBouncer URL from Neon URL"""
        # This would typically point to a PgBouncer instance
        # For demonstration, we'll show the pattern
        return neon_url.replace("@", f"@pgbouncer-host:6432/")
    
    def get_pgbouncer_config(self) -> str:
        """Generate PgBouncer configuration"""
        return f"""
[databases]
licitacoes = host=neon-host port=5432 dbname=licitacoes

[pgbouncer]
pool_mode = {self.pool_mode}
max_client_conn = 1000
default_pool_size = 25
max_db_connections = 100
server_reset_query = DISCARD ALL
server_check_delay = 30
server_check_query = SELECT 1
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# Performance
server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0

# Admin
admin_users = admin
stats_users = stats, admin

# Connection limits per database
reserve_pool_size = 5
reserve_pool_timeout = 3
"""
    
    def create_optimized_pool(self) -> OptimizedConnectionPool:
        """Create connection pool optimized for PgBouncer"""
        return OptimizedConnectionPool(
            database_url=self.pgbouncer_url,
            pool_size=10,  # Smaller pool when using PgBouncer
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=0,  # Let PgBouncer handle connection recycling
            pool_pre_ping=False  # PgBouncer handles connection health
        )

# Factory functions
def create_optimized_pool(database_url: str, **kwargs) -> OptimizedConnectionPool:
    """Create optimized connection pool"""
    return OptimizedConnectionPool(database_url, **kwargs)

def create_async_pool(database_url: str, **kwargs) -> AsyncOptimizedConnectionPool:
    """Create async optimized connection pool"""
    return AsyncOptimizedConnectionPool(database_url, **kwargs)

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_pools():
        DATABASE_URL = "postgresql://user:pass@localhost/test_db"
        
        # Test sync pool
        sync_pool = create_optimized_pool(DATABASE_URL)
        
        with sync_pool.get_session() as session:
            result = session.execute(text("SELECT 1")).scalar()
            print(f"Sync result: {result}")
        
        # Get pool statistics
        stats = sync_pool.get_performance_stats()
        print(f"Pool stats: {stats}")
        
        # Health check
        health = sync_pool.health_check()
        print(f"Health: {health['status']}")
        
        # Test async pool
        async_pool = create_async_pool(DATABASE_URL)
        
        async with async_pool.get_async_session() as session:
            result = await session.execute(text("SELECT 1"))
            value = result.scalar()
            print(f"Async result: {value}")
        
        # Cleanup
        sync_pool.close()
        await async_pool.close()
    
    asyncio.run(test_pools())