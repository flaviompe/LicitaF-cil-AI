#!/usr/bin/env python3
"""
Enhanced Database Configuration for Neon PostgreSQL
Optimized connection management, session handling, and performance settings
"""

import os
import logging
from typing import Optional, Dict, Any, AsyncGenerator
from contextlib import contextmanager, asynccontextmanager
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker, Session, scoped_session
from sqlalchemy.pool import QueuePool, NullPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import asyncpg
from pydantic import BaseSettings, validator
import asyncio

logger = logging.getLogger(__name__)

class DatabaseSettings(BaseSettings):
    """Database configuration settings with validation"""
    
    # Connection URLs
    database_url: str
    direct_url: Optional[str] = None
    async_database_url: Optional[str] = None
    
    # Environment
    environment: str = "development"
    debug_mode: bool = False
    
    # Connection Pool Settings
    pool_size: int = 20
    max_overflow: int = 30
    pool_timeout: int = 30
    pool_recycle: int = 3600  # 1 hour
    pool_pre_ping: bool = True
    
    # Performance Settings
    enable_query_logging: bool = False
    slow_query_threshold: int = 1000  # milliseconds
    statement_timeout: int = 30000  # 30 seconds
    
    # SSL Settings
    ssl_mode: str = "require"
    ssl_cert_reqs: str = "none"
    
    # Application Settings
    application_name: str = "licitacoes_platform"
    timezone: str = "America/Sao_Paulo"
    
    # Async Settings
    async_pool_size: int = 20
    async_max_overflow: int = 30
    
    @validator('direct_url', always=True)
    def set_direct_url(cls, v, values):
        if v is None:
            return values.get('database_url')
        return v
    
    @validator('async_database_url', always=True) 
    def set_async_url(cls, v, values):
        if v is None:
            url = values.get('database_url', '')
            # Convert postgresql:// to postgresql+asyncpg://
            if url.startswith('postgresql://'):
                return url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        return v
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        
        @classmethod
        def customise_sources(cls, init_settings, env_settings, file_secret_settings):
            return (init_settings, env_settings, file_secret_settings)

class DatabaseManager:
    """Enhanced database connection manager"""
    
    def __init__(self, settings: DatabaseSettings):
        self.settings = settings
        self._sync_engine: Optional[Engine] = None
        self._async_engine = None
        self._session_factory: Optional[sessionmaker] = None
        self._async_session_factory = None
        self._scoped_session = None
        
        logger.info(f"Initializing DatabaseManager for {settings.environment} environment")
    
    def _create_sync_engine(self) -> Engine:
        """Create synchronous SQLAlchemy engine"""
        if self._sync_engine is not None:
            return self._sync_engine
        
        # Connection arguments
        connect_args = {
            "options": f"-c timezone={self.settings.timezone}",
            "application_name": self.settings.application_name,
            "connect_timeout": 10,
        }
        
        # SSL configuration
        if self.settings.ssl_mode != "disable":
            connect_args.update({
                "sslmode": self.settings.ssl_mode,
                "sslcert": os.getenv("DATABASE_SSL_CERT"),
                "sslkey": os.getenv("DATABASE_SSL_KEY"),
                "sslrootcert": os.getenv("DATABASE_SSL_ROOT_CERT"),
            })
        
        # Create engine
        self._sync_engine = create_engine(
            self.settings.direct_url,
            poolclass=QueuePool,
            pool_size=self.settings.pool_size,
            max_overflow=self.settings.max_overflow,
            pool_timeout=self.settings.pool_timeout,
            pool_recycle=self.settings.pool_recycle,
            pool_pre_ping=self.settings.pool_pre_ping,
            echo=self.settings.enable_query_logging,
            echo_pool=self.settings.debug_mode,
            future=True,
            connect_args=connect_args,
            # Performance optimizations
            execution_options={
                "isolation_level": "READ_COMMITTED",
                "autocommit": False,
            }
        )
        
        # Register event listeners
        self._register_engine_events(self._sync_engine)
        
        logger.info("Synchronous database engine created")
        return self._sync_engine
    
    def _create_async_engine(self):
        """Create asynchronous SQLAlchemy engine"""
        if self._async_engine is not None:
            return self._async_engine
        
        from sqlalchemy.ext.asyncio import create_async_engine
        
        self._async_engine = create_async_engine(
            self.settings.async_database_url,
            pool_size=self.settings.async_pool_size,
            max_overflow=self.settings.async_max_overflow,
            pool_timeout=self.settings.pool_timeout,
            pool_recycle=self.settings.pool_recycle,
            pool_pre_ping=self.settings.pool_pre_ping,
            echo=self.settings.enable_query_logging,
            future=True,
        )
        
        logger.info("Asynchronous database engine created")
        return self._async_engine
    
    def _register_engine_events(self, engine: Engine):
        """Register SQLAlchemy engine events for monitoring and optimization"""
        
        @event.listens_for(engine, "connect")
        def set_connection_settings(dbapi_connection, connection_record):
            """Set connection-level settings"""
            with dbapi_connection.cursor() as cursor:
                # Set timezone
                cursor.execute(f"SET timezone TO '{self.settings.timezone}'")
                
                # Set statement timeout
                cursor.execute(f"SET statement_timeout TO '{self.settings.statement_timeout}'")
                
                # Enable query planning optimizations
                cursor.execute("SET random_page_cost = 1.1")  # SSD optimization
                cursor.execute("SET effective_cache_size = '1GB'")
                
                # Set work memory for sorting/hashing
                cursor.execute("SET work_mem = '64MB'")
                
                # Application identification
                cursor.execute(f"SET application_name = '{self.settings.application_name}'")
        
        @event.listens_for(engine, "before_cursor_execute")
        def log_slow_queries(conn, cursor, statement, parameters, context, executemany):
            """Log slow queries"""
            if self.settings.enable_query_logging:
                context._query_start_time = asyncio.get_event_loop().time() if hasattr(asyncio, 'get_event_loop') else 0
        
        @event.listens_for(engine, "after_cursor_execute") 
        def log_slow_queries_after(conn, cursor, statement, parameters, context, executemany):
            """Log execution time for slow queries"""
            if hasattr(context, '_query_start_time') and self.settings.slow_query_threshold > 0:
                try:
                    total_time = (asyncio.get_event_loop().time() - context._query_start_time) * 1000
                    if total_time > self.settings.slow_query_threshold:
                        logger.warning(
                            f"Slow query detected: {total_time:.2f}ms - {statement[:200]}..."
                        )
                except:
                    pass  # Ignore timing errors
        
        @event.listens_for(engine, "handle_error")
        def handle_database_errors(exception_context):
            """Handle database errors with enhanced logging"""
            logger.error(
                f"Database error: {exception_context.original_exception} "
                f"Statement: {exception_context.statement}"
            )
    
    def get_sync_engine(self) -> Engine:
        """Get synchronous engine"""
        return self._create_sync_engine()
    
    def get_async_engine(self):
        """Get asynchronous engine"""
        return self._create_async_engine()
    
    def get_session_factory(self) -> sessionmaker:
        """Get session factory for creating sessions"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                bind=self.get_sync_engine(),
                class_=Session,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self._session_factory
    
    def get_async_session_factory(self):
        """Get async session factory"""
        if self._async_session_factory is None:
            from sqlalchemy.ext.asyncio import async_sessionmaker
            self._async_session_factory = async_sessionmaker(
                bind=self.get_async_engine(),
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=True,
                autocommit=False
            )
        return self._async_session_factory
    
    def get_scoped_session(self):
        """Get scoped session for thread-safe usage"""
        if self._scoped_session is None:
            self._scoped_session = scoped_session(self.get_session_factory())
        return self._scoped_session
    
    @contextmanager
    def get_session(self):
        """Context manager for database sessions"""
        session = self.get_session_factory()()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Session error: {e}")
            raise
        finally:
            session.close()
    
    @asynccontextmanager
    async def get_async_session(self):
        """Async context manager for database sessions"""
        session_factory = self.get_async_session_factory()
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Async session error: {e}")
                raise
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.get_session() as session:
                session.execute(text("SELECT 1"))
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    async def test_async_connection(self) -> bool:
        """Test async database connection"""
        try:
            async with self.get_async_session() as session:
                await session.execute(text("SELECT 1"))
            logger.info("Async database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Async database connection test failed: {e}")
            return False
    
    def get_pool_status(self) -> Dict[str, Any]:
        """Get connection pool status"""
        engine = self.get_sync_engine()
        pool = engine.pool
        
        return {
            "pool_size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "invalid": pool.invalid(),
        }
    
    def close(self):
        """Close all connections and dispose engines"""
        if self._sync_engine:
            self._sync_engine.dispose()
            logger.info("Sync engine disposed")
        
        if self._scoped_session:
            self._scoped_session.remove()
    
    async def close_async(self):
        """Close async connections"""
        if self._async_engine:
            await self._async_engine.dispose()
            logger.info("Async engine disposed")

class DatabaseHealthChecker:
    """Database health monitoring"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    def check_health(self) -> Dict[str, Any]:
        """Comprehensive health check"""
        health_status = {
            "database": "healthy",
            "connection_pool": "healthy", 
            "performance": "good",
            "checks": {},
            "timestamp": os.environ.get("TZ", "UTC")
        }
        
        try:
            # Basic connection test
            health_status["checks"]["connection"] = self.db_manager.test_connection()
            
            # Pool status
            pool_status = self.db_manager.get_pool_status()
            health_status["checks"]["pool_status"] = pool_status
            
            # Check if pool is overloaded
            if pool_status["checked_out"] / (pool_status["pool_size"] + pool_status["overflow"]) > 0.8:
                health_status["connection_pool"] = "warning"
            
            # Performance check - simple query timing
            import time
            start_time = time.time()
            
            with self.db_manager.get_session() as session:
                session.execute(text("SELECT COUNT(*) FROM users LIMIT 1"))
            
            query_time = (time.time() - start_time) * 1000
            health_status["checks"]["query_performance_ms"] = query_time
            
            if query_time > 1000:
                health_status["performance"] = "slow"
            elif query_time > 500:
                health_status["performance"] = "acceptable"
            
        except Exception as e:
            health_status["database"] = "unhealthy"
            health_status["error"] = str(e)
            logger.error(f"Health check failed: {e}")
        
        return health_status
    
    async def check_async_health(self) -> Dict[str, Any]:
        """Async health check"""
        health_status = {
            "async_database": "healthy",
            "checks": {},
            "timestamp": os.environ.get("TZ", "UTC")
        }
        
        try:
            # Basic async connection test
            health_status["checks"]["async_connection"] = await self.db_manager.test_async_connection()
            
            # Performance check
            import time
            start_time = time.time()
            
            async with self.db_manager.get_async_session() as session:
                await session.execute(text("SELECT 1"))
            
            query_time = (time.time() - start_time) * 1000
            health_status["checks"]["async_query_performance_ms"] = query_time
            
        except Exception as e:
            health_status["async_database"] = "unhealthy"
            health_status["error"] = str(e)
            logger.error(f"Async health check failed: {e}")
        
        return health_status

# Global database manager instance
_db_manager: Optional[DatabaseManager] = None
_health_checker: Optional[DatabaseHealthChecker] = None

def get_database_manager() -> DatabaseManager:
    """Get global database manager instance"""
    global _db_manager
    if _db_manager is None:
        settings = DatabaseSettings()
        _db_manager = DatabaseManager(settings)
    return _db_manager

def get_health_checker() -> DatabaseHealthChecker:
    """Get database health checker"""
    global _health_checker
    if _health_checker is None:
        _health_checker = DatabaseHealthChecker(get_database_manager())
    return _health_checker

# Dependency injection for FastAPI
def get_db_session():
    """Dependency for FastAPI to get database session"""
    db_manager = get_database_manager()
    with db_manager.get_session() as session:
        yield session

async def get_async_db_session():
    """Async dependency for FastAPI"""
    db_manager = get_database_manager()
    async with db_manager.get_async_session() as session:
        yield session

# Utility functions
def execute_raw_sql(query: str, params: Optional[Dict] = None) -> Any:
    """Execute raw SQL query"""
    db_manager = get_database_manager()
    with db_manager.get_session() as session:
        result = session.execute(text(query), params or {})
        return result.fetchall()

async def execute_raw_sql_async(query: str, params: Optional[Dict] = None) -> Any:
    """Execute raw SQL query asynchronously"""
    db_manager = get_database_manager()
    async with db_manager.get_async_session() as session:
        result = await session.execute(text(query), params or {})
        return result.fetchall()

def setup_database_logging():
    """Setup database-specific logging"""
    # Configure SQLAlchemy logging
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)
    
    # Configure asyncpg logging
    logging.getLogger('asyncpg').setLevel(logging.WARNING)

# Configuration for different environments
def get_production_settings() -> DatabaseSettings:
    """Get production-optimized database settings"""
    return DatabaseSettings(
        database_url=os.getenv("DATABASE_URL"),
        environment="production",
        debug_mode=False,
        pool_size=25,
        max_overflow=35,
        pool_timeout=30,
        pool_recycle=3600,
        enable_query_logging=False,
        slow_query_threshold=2000,
        statement_timeout=60000,  # 60 seconds for production
        application_name="licitacoes_prod"
    )

def get_development_settings() -> DatabaseSettings:
    """Get development database settings"""
    return DatabaseSettings(
        database_url=os.getenv("DATABASE_URL"),
        environment="development",
        debug_mode=True,
        pool_size=5,
        max_overflow=10,
        enable_query_logging=True,
        slow_query_threshold=500,
        statement_timeout=30000,
        application_name="licitacoes_dev"
    )

def get_testing_settings() -> DatabaseSettings:
    """Get test database settings"""
    return DatabaseSettings(
        database_url=os.getenv("TEST_DATABASE_URL", "postgresql://localhost/test_licitacoes"),
        environment="testing",
        debug_mode=False,
        pool_size=5,
        max_overflow=5,
        pool_recycle=300,
        enable_query_logging=False,
        application_name="licitacoes_test"
    )

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        setup_database_logging()
        
        # Initialize database manager
        settings = get_development_settings()
        db_manager = DatabaseManager(settings)
        
        # Test connections
        print("Testing sync connection...")
        if db_manager.test_connection():
            print("✅ Sync connection successful")
        
        print("Testing async connection...")
        if await db_manager.test_async_connection():
            print("✅ Async connection successful")
        
        # Health check
        health_checker = DatabaseHealthChecker(db_manager)
        health = health_checker.check_health()
        print(f"Health check: {health}")
        
        # Pool status
        pool_status = db_manager.get_pool_status()
        print(f"Pool status: {pool_status}")
        
        # Cleanup
        await db_manager.close_async()
        db_manager.close()
        print("✅ Cleanup completed")
    
    asyncio.run(main())