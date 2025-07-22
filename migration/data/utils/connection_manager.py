#!/usr/bin/env python3
"""
Database Connection Manager for Migration Scripts
Handles connections to both SQLite (source) and PostgreSQL/Neon (destination)
"""

import os
import sqlite3
import asyncio
import asyncpg
import logging
from typing import Optional, Any, Dict, List
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass
import psycopg2
from psycopg2 import pool
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)

@dataclass
class ConnectionConfig:
    """Configuration for database connections"""
    # SQLite source database
    sqlite_path: str
    
    # PostgreSQL/Neon destination
    postgres_url: str
    postgres_direct_url: Optional[str] = None
    
    # Connection pool settings
    min_connections: int = 5
    max_connections: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 300
    
    # Retry settings
    max_retries: int = 3
    retry_delay: float = 1.0
    
    # Performance settings
    batch_size: int = 1000
    fetch_size: int = 5000

class SQLiteManager:
    """SQLite database connection manager"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._connection: Optional[sqlite3.Connection] = None
        
    @contextmanager
    def get_connection(self):
        """Get SQLite connection with context manager"""
        if not os.path.exists(self.db_path):
            logger.warning(f"SQLite database not found: {self.db_path}")
            yield None
            return
            
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            conn.execute("PRAGMA foreign_keys = ON")  # Enable foreign key constraints
            yield conn
        except Exception as e:
            logger.error(f"SQLite connection error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    def execute_query(self, query: str, params: Optional[tuple] = None) -> List[Dict[str, Any]]:
        """Execute query and return results as list of dictionaries"""
        with self.get_connection() as conn:
            if not conn:
                return []
                
            cursor = conn.cursor()
            cursor.execute(query, params or ())
            
            # Get column names
            columns = [description[0] for description in cursor.description]
            
            # Convert rows to dictionaries
            results = []
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return results
    
    def get_table_list(self) -> List[str]:
        """Get list of all user tables"""
        query = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        results = self.execute_query(query)
        return [row['name'] for row in results]
    
    def get_table_row_count(self, table_name: str) -> int:
        """Get row count for specific table"""
        query = f"SELECT COUNT(*) as count FROM {table_name}"
        results = self.execute_query(query)
        return results[0]['count'] if results else 0
    
    def get_table_data(self, table_name: str, limit: Optional[int] = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Get data from table with optional limit and offset"""
        query = f"SELECT * FROM {table_name}"
        if limit:
            query += f" LIMIT {limit} OFFSET {offset}"
        
        return self.execute_query(query)

class PostgreSQLManager:
    """PostgreSQL/Neon database connection manager"""
    
    def __init__(self, connection_url: str, direct_url: Optional[str] = None,
                 min_connections: int = 5, max_connections: int = 20):
        self.connection_url = connection_url
        self.direct_url = direct_url or connection_url
        self.min_connections = min_connections
        self.max_connections = max_connections
        
        # Connection pools
        self._sync_pool: Optional[pool.SimpleConnectionPool] = None
        self._async_pool: Optional[asyncpg.Pool] = None
        
        # SQLAlchemy engine
        self._engine = None
        self._session_maker = None
        
    def _create_sync_pool(self):
        """Create synchronous connection pool"""
        if not self._sync_pool:
            try:
                self._sync_pool = psycopg2.pool.SimpleConnectionPool(
                    minconn=self.min_connections,
                    maxconn=self.max_connections,
                    dsn=self.connection_url
                )
                logger.info("PostgreSQL sync connection pool created")
            except Exception as e:
                logger.error(f"Failed to create sync connection pool: {e}")
                raise
    
    async def _create_async_pool(self):
        """Create asynchronous connection pool"""
        if not self._async_pool:
            try:
                self._async_pool = await asyncpg.create_pool(
                    self.connection_url,
                    min_size=self.min_connections,
                    max_size=self.max_connections,
                    command_timeout=60
                )
                logger.info("PostgreSQL async connection pool created")
            except Exception as e:
                logger.error(f"Failed to create async connection pool: {e}")
                raise
    
    def _create_sqlalchemy_engine(self):
        """Create SQLAlchemy engine with connection pool"""
        if not self._engine:
            try:
                self._engine = create_engine(
                    self.direct_url,
                    poolclass=QueuePool,
                    pool_size=self.min_connections,
                    max_overflow=self.max_connections - self.min_connections,
                    pool_timeout=30,
                    pool_recycle=300,
                    pool_pre_ping=True,
                    echo=False  # Set to True for SQL logging
                )
                
                self._session_maker = sessionmaker(bind=self._engine)
                logger.info("SQLAlchemy engine created")
            except Exception as e:
                logger.error(f"Failed to create SQLAlchemy engine: {e}")
                raise
    
    @contextmanager
    def get_sync_connection(self):
        """Get synchronous connection with context manager"""
        self._create_sync_pool()
        conn = None
        
        try:
            conn = self._sync_pool.getconn()
            conn.autocommit = False
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"PostgreSQL sync connection error: {e}")
            raise
        finally:
            if conn:
                self._sync_pool.putconn(conn)
    
    @asynccontextmanager
    async def get_async_connection(self):
        """Get asynchronous connection with context manager"""
        await self._create_async_pool()
        
        async with self._async_pool.acquire() as conn:
            try:
                yield conn
            except Exception as e:
                logger.error(f"PostgreSQL async connection error: {e}")
                raise
    
    @contextmanager
    def get_sqlalchemy_session(self):
        """Get SQLAlchemy session with context manager"""
        self._create_sqlalchemy_engine()
        session = self._session_maker()
        
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"SQLAlchemy session error: {e}")
            raise
        finally:
            session.close()
    
    def execute_query(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Execute query and return results"""
        with self.get_sync_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params or {})
                
                if cursor.description:
                    columns = [desc[0] for desc in cursor.description]
                    results = []
                    for row in cursor.fetchall():
                        results.append(dict(zip(columns, row)))
                    return results
                else:
                    return []
    
    async def execute_query_async(self, query: str, params: Optional[List] = None) -> List[Dict[str, Any]]:
        """Execute query asynchronously and return results"""
        async with self.get_async_connection() as conn:
            if params:
                results = await conn.fetch(query, *params)
            else:
                results = await conn.fetch(query)
            
            return [dict(row) for row in results]
    
    def execute_batch_insert(self, table_name: str, data: List[Dict[str, Any]], 
                           conflict_resolution: str = "DO NOTHING") -> int:
        """Execute batch insert with conflict resolution"""
        if not data:
            return 0
        
        # Generate INSERT statement
        columns = list(data[0].keys())
        placeholders = ', '.join([f'%({col})s' for col in columns])
        
        query = f"""
            INSERT INTO {table_name} ({', '.join(columns)}) 
            VALUES ({placeholders})
            ON CONFLICT {conflict_resolution}
        """
        
        with self.get_sync_connection() as conn:
            with conn.cursor() as cursor:
                cursor.executemany(query, data)
                return cursor.rowcount
    
    async def execute_batch_insert_async(self, table_name: str, data: List[Dict[str, Any]]) -> int:
        """Execute batch insert asynchronously"""
        if not data:
            return 0
        
        columns = list(data[0].keys())
        
        async with self.get_async_connection() as conn:
            # Prepare data as list of tuples
            values = [[row[col] for col in columns] for row in data]
            
            result = await conn.copy_records_to_table(
                table_name, 
                records=values,
                columns=columns
            )
            
            return len(values)
    
    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.get_sync_connection() as conn:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    return result[0] == 1
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return False
    
    async def test_connection_async(self) -> bool:
        """Test database connection asynchronously"""
        try:
            async with self.get_async_connection() as conn:
                result = await conn.fetchval("SELECT 1")
                return result == 1
        except Exception as e:
            logger.error(f"Async connection test failed: {e}")
            return False
    
    def close(self):
        """Close all connections and pools"""
        if self._sync_pool:
            self._sync_pool.closeall()
            logger.info("Sync connection pool closed")
        
        if self._engine:
            self._engine.dispose()
            logger.info("SQLAlchemy engine disposed")
    
    async def close_async(self):
        """Close async connection pool"""
        if self._async_pool:
            await self._async_pool.close()
            logger.info("Async connection pool closed")

class MigrationConnectionManager:
    """Main connection manager for migration operations"""
    
    def __init__(self, config: ConnectionConfig):
        self.config = config
        self.sqlite = SQLiteManager(config.sqlite_path)
        self.postgres = PostgreSQLManager(
            config.postgres_url,
            config.postgres_direct_url,
            config.min_connections,
            config.max_connections
        )
        
    def test_connections(self) -> Dict[str, bool]:
        """Test both source and destination connections"""
        results = {}
        
        # Test SQLite
        try:
            with self.sqlite.get_connection() as conn:
                results['sqlite'] = conn is not None
        except Exception as e:
            logger.error(f"SQLite connection test failed: {e}")
            results['sqlite'] = False
        
        # Test PostgreSQL
        results['postgresql'] = self.postgres.test_connection()
        
        return results
    
    async def test_connections_async(self) -> Dict[str, bool]:
        """Test connections asynchronously"""
        results = {}
        
        # Test SQLite (sync only)
        try:
            with self.sqlite.get_connection() as conn:
                results['sqlite'] = conn is not None
        except Exception as e:
            logger.error(f"SQLite connection test failed: {e}")
            results['sqlite'] = False
        
        # Test PostgreSQL async
        results['postgresql'] = await self.postgres.test_connection_async()
        
        return results
    
    def migrate_table_batch(self, table_name: str, batch_data: List[Dict[str, Any]], 
                           conflict_resolution: str = "DO NOTHING") -> int:
        """Migrate a batch of data from source to destination"""
        if not batch_data:
            return 0
        
        try:
            return self.postgres.execute_batch_insert(table_name, batch_data, conflict_resolution)
        except Exception as e:
            logger.error(f"Failed to migrate batch for table {table_name}: {e}")
            raise
    
    async def migrate_table_batch_async(self, table_name: str, batch_data: List[Dict[str, Any]]) -> int:
        """Migrate a batch of data asynchronously"""
        if not batch_data:
            return 0
        
        try:
            return await self.postgres.execute_batch_insert_async(table_name, batch_data)
        except Exception as e:
            logger.error(f"Failed to migrate async batch for table {table_name}: {e}")
            raise
    
    def close(self):
        """Close all connections"""
        self.postgres.close()
        logger.info("All connections closed")
    
    async def close_async(self):
        """Close all async connections"""
        await self.postgres.close_async()
        logger.info("All async connections closed")

# Utility functions
def create_connection_manager_from_env() -> MigrationConnectionManager:
    """Create connection manager from environment variables"""
    config = ConnectionConfig(
        sqlite_path=os.getenv('SQLITE_DB_PATH', './data/licitacoes.db'),
        postgres_url=os.getenv('DATABASE_URL', ''),
        postgres_direct_url=os.getenv('DIRECT_URL'),
        min_connections=int(os.getenv('DB_MIN_CONNECTIONS', '5')),
        max_connections=int(os.getenv('DB_MAX_CONNECTIONS', '20')),
        batch_size=int(os.getenv('MIGRATION_BATCH_SIZE', '1000'))
    )
    
    return MigrationConnectionManager(config)

async def main():
    """Test connection manager"""
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    manager = create_connection_manager_from_env()
    
    # Test connections
    print("Testing connections...")
    sync_results = manager.test_connections()
    async_results = await manager.test_connections_async()
    
    print(f"Sync tests: {sync_results}")
    print(f"Async tests: {async_results}")
    
    await manager.close_async()
    manager.close()

if __name__ == "__main__":
    asyncio.run(main())