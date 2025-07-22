#!/usr/bin/env python3
"""
Advanced Cache Manager for SQLite to Neon Migration
Multi-layer caching system with Redis backend and intelligent cache strategies
"""

import asyncio
import json
import hashlib
import logging
import time
from typing import Any, Dict, List, Optional, Union, Callable
from datetime import datetime, timedelta
from functools import wraps
from dataclasses import dataclass, asdict
from enum import Enum
import redis
import aioredis
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class CacheLevel(Enum):
    """Cache levels with different TTL strategies"""
    HOT = "hot"          # 1-5 minutes - frequently accessed
    WARM = "warm"        # 15-60 minutes - moderately accessed  
    COLD = "cold"        # 2-24 hours - rarely accessed
    PERSISTENT = "persistent"  # Days/weeks - configuration data

@dataclass
class CacheConfig:
    """Cache configuration settings"""
    redis_url: str = "redis://localhost:6379/0"
    key_prefix: str = "licitacoes"
    default_ttl: int = 300  # 5 minutes
    max_key_length: int = 250
    compression_threshold: int = 1024  # Compress data > 1KB
    
    # TTL settings by cache level
    ttl_settings: Dict[CacheLevel, int] = None
    
    def __post_init__(self):
        if self.ttl_settings is None:
            self.ttl_settings = {
                CacheLevel.HOT: 300,       # 5 minutes
                CacheLevel.WARM: 1800,     # 30 minutes
                CacheLevel.COLD: 7200,     # 2 hours
                CacheLevel.PERSISTENT: 86400  # 24 hours
            }

class CacheKeyGenerator:
    """Generate consistent cache keys from function calls"""
    
    @staticmethod
    def generate_key(func_name: str, args: tuple, kwargs: dict, 
                    prefix: str = "licitacoes") -> str:
        """Generate cache key from function parameters"""
        # Create stable representation of arguments
        key_data = {
            'func': func_name,
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else []
        }
        
        # Convert to JSON string
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        
        # Generate hash for long keys
        if len(key_str) > 200:
            key_hash = hashlib.md5(key_str.encode()).hexdigest()
            return f"{prefix}:{func_name}:{key_hash}"
        
        # Use direct key for short ones
        safe_key = key_str.replace(" ", "").replace(":", "_")
        return f"{prefix}:{func_name}:{safe_key}"
    
    @staticmethod 
    def generate_pattern_key(pattern: str, **params) -> str:
        """Generate key from pattern with parameters"""
        try:
            formatted_key = pattern.format(**params)
            return formatted_key
        except KeyError as e:
            raise ValueError(f"Missing parameter {e} for pattern {pattern}")

class CacheStats:
    """Track cache performance statistics"""
    
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.errors = 0
        self.start_time = time.time()
    
    @property
    def hit_ratio(self) -> float:
        """Calculate cache hit ratio"""
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0
    
    @property
    def total_requests(self) -> int:
        return self.hits + self.misses
    
    def record_hit(self):
        self.hits += 1
    
    def record_miss(self):
        self.misses += 1
    
    def record_set(self):
        self.sets += 1
    
    def record_error(self):
        self.errors += 1
    
    def get_stats(self) -> Dict[str, Any]:
        uptime = time.time() - self.start_time
        return {
            'hits': self.hits,
            'misses': self.misses,
            'sets': self.sets,
            'errors': self.errors,
            'hit_ratio': round(self.hit_ratio, 2),
            'total_requests': self.total_requests,
            'uptime_seconds': round(uptime, 2),
            'requests_per_second': round(self.total_requests / uptime if uptime > 0 else 0, 2)
        }

class SmartCacheManager:
    """Advanced cache manager with multi-level caching and intelligent strategies"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.redis: Optional[redis.Redis] = None
        self.async_redis: Optional[aioredis.Redis] = None
        self.stats = CacheStats()
        self._connection_pool = None
        
        # Cache invalidation patterns
        self.invalidation_patterns = {
            'opportunities': ['opp:*', 'search:*', 'dashboard:*'],
            'proposals': ['prop:*', 'user:*', 'company:*'],
            'users': ['user:*', 'auth:*'],
            'companies': ['company:*', 'user:*']
        }
        
        logger.info(f"SmartCacheManager initialized with prefix: {config.key_prefix}")
    
    def _get_redis_connection(self) -> redis.Redis:
        """Get or create Redis connection"""
        if self.redis is None:
            try:
                self.redis = redis.from_url(
                    self.config.redis_url,
                    decode_responses=True,
                    socket_keepalive=True,
                    socket_keepalive_options={},
                    health_check_interval=30
                )
                # Test connection
                self.redis.ping()
                logger.info("Redis connection established successfully")
            except Exception as e:
                logger.error(f"Failed to connect to Redis: {e}")
                self.stats.record_error()
                raise
        
        return self.redis
    
    async def _get_async_redis_connection(self) -> aioredis.Redis:
        """Get or create async Redis connection"""
        if self.async_redis is None:
            try:
                self.async_redis = await aioredis.from_url(
                    self.config.redis_url,
                    decode_responses=True
                )
                # Test connection
                await self.async_redis.ping()
                logger.info("Async Redis connection established successfully")
            except Exception as e:
                logger.error(f"Failed to connect to async Redis: {e}")
                self.stats.record_error()
                raise
        
        return self.async_redis
    
    def _serialize_data(self, data: Any) -> str:
        """Serialize data for cache storage with compression if needed"""
        try:
            json_str = json.dumps(data, default=str, separators=(',', ':'))
            
            # TODO: Add compression for large data
            if len(json_str) > self.config.compression_threshold:
                # Could implement compression here
                pass
            
            return json_str
        except Exception as e:
            logger.error(f"Failed to serialize data: {e}")
            raise
    
    def _deserialize_data(self, json_str: str) -> Any:
        """Deserialize data from cache storage"""
        try:
            return json.loads(json_str)
        except Exception as e:
            logger.error(f"Failed to deserialize data: {e}")
            return None
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            redis_client = self._get_redis_connection()
            cached_value = redis_client.get(key)
            
            if cached_value is not None:
                self.stats.record_hit()
                return self._deserialize_data(cached_value)
            else:
                self.stats.record_miss()
                return None
                
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            self.stats.record_error()
            return None
    
    async def aget(self, key: str) -> Optional[Any]:
        """Async get value from cache"""
        try:
            redis_client = await self._get_async_redis_connection()
            cached_value = await redis_client.get(key)
            
            if cached_value is not None:
                self.stats.record_hit()
                return self._deserialize_data(cached_value)
            else:
                self.stats.record_miss()
                return None
                
        except Exception as e:
            logger.error(f"Async cache get error for key {key}: {e}")
            self.stats.record_error()
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, 
            level: CacheLevel = CacheLevel.WARM) -> bool:
        """Set value in cache with TTL"""
        try:
            redis_client = self._get_redis_connection()
            serialized_data = self._serialize_data(value)
            
            # Determine TTL
            if ttl is None:
                ttl = self.config.ttl_settings.get(level, self.config.default_ttl)
            
            # Set with expiration
            result = redis_client.setex(key, ttl, serialized_data)
            
            if result:
                self.stats.record_set()
                logger.debug(f"Cached key {key} with TTL {ttl}s")
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            self.stats.record_error()
            return False
    
    async def aset(self, key: str, value: Any, ttl: Optional[int] = None,
                   level: CacheLevel = CacheLevel.WARM) -> bool:
        """Async set value in cache with TTL"""
        try:
            redis_client = await self._get_async_redis_connection()
            serialized_data = self._serialize_data(value)
            
            # Determine TTL
            if ttl is None:
                ttl = self.config.ttl_settings.get(level, self.config.default_ttl)
            
            # Set with expiration
            result = await redis_client.setex(key, ttl, serialized_data)
            
            if result:
                self.stats.record_set()
                logger.debug(f"Async cached key {key} with TTL {ttl}s")
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"Async cache set error for key {key}: {e}")
            self.stats.record_error()
            return False
    
    def delete(self, key: str) -> bool:
        """Delete specific key from cache"""
        try:
            redis_client = self._get_redis_connection()
            result = redis_client.delete(key)
            return bool(result)
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            self.stats.record_error()
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete keys matching pattern"""
        try:
            redis_client = self._get_redis_connection()
            keys = redis_client.keys(pattern)
            if keys:
                deleted = redis_client.delete(*keys)
                logger.info(f"Deleted {deleted} keys matching pattern {pattern}")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            self.stats.record_error()
            return 0
    
    def invalidate_related(self, entity_type: str):
        """Invalidate cache entries related to entity type"""
        patterns = self.invalidation_patterns.get(entity_type, [])
        total_deleted = 0
        
        for pattern in patterns:
            deleted = self.delete_pattern(f"{self.config.key_prefix}:{pattern}")
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} cache entries for {entity_type}")
        return total_deleted
    
    def get_or_set(self, key: str, factory_func: Callable, ttl: Optional[int] = None,
                   level: CacheLevel = CacheLevel.WARM) -> Any:
        """Get from cache or compute and store"""
        # Try to get from cache first
        cached_value = self.get(key)
        if cached_value is not None:
            return cached_value
        
        # Compute value using factory function
        try:
            computed_value = factory_func()
            self.set(key, computed_value, ttl, level)
            return computed_value
        except Exception as e:
            logger.error(f"Factory function error for key {key}: {e}")
            return None
    
    async def aget_or_set(self, key: str, factory_func: Callable, ttl: Optional[int] = None,
                          level: CacheLevel = CacheLevel.WARM) -> Any:
        """Async get from cache or compute and store"""
        # Try to get from cache first
        cached_value = await self.aget(key)
        if cached_value is not None:
            return cached_value
        
        # Compute value using factory function
        try:
            if asyncio.iscoroutinefunction(factory_func):
                computed_value = await factory_func()
            else:
                computed_value = factory_func()
                
            await self.aset(key, computed_value, ttl, level)
            return computed_value
        except Exception as e:
            logger.error(f"Async factory function error for key {key}: {e}")
            return None

class CacheDecorators:
    """Decorators for easy caching of functions"""
    
    def __init__(self, cache_manager: SmartCacheManager):
        self.cache_manager = cache_manager
    
    def cached(self, ttl: Optional[int] = None, level: CacheLevel = CacheLevel.WARM,
               key_pattern: Optional[str] = None):
        """Decorator for caching function results"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                if key_pattern:
                    # Use custom key pattern
                    try:
                        cache_key = CacheKeyGenerator.generate_pattern_key(
                            key_pattern, 
                            **kwargs,
                            func_name=func.__name__
                        )
                    except ValueError:
                        # Fallback to auto-generated key
                        cache_key = CacheKeyGenerator.generate_key(
                            func.__name__, args, kwargs, self.cache_manager.config.key_prefix
                        )
                else:
                    cache_key = CacheKeyGenerator.generate_key(
                        func.__name__, args, kwargs, self.cache_manager.config.key_prefix
                    )
                
                # Try to get from cache
                return self.cache_manager.get_or_set(
                    cache_key,
                    lambda: func(*args, **kwargs),
                    ttl,
                    level
                )
            
            return wrapper
        return decorator
    
    def async_cached(self, ttl: Optional[int] = None, level: CacheLevel = CacheLevel.WARM,
                     key_pattern: Optional[str] = None):
        """Decorator for caching async function results"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                if key_pattern:
                    try:
                        cache_key = CacheKeyGenerator.generate_pattern_key(
                            key_pattern,
                            **kwargs,
                            func_name=func.__name__
                        )
                    except ValueError:
                        cache_key = CacheKeyGenerator.generate_key(
                            func.__name__, args, kwargs, self.cache_manager.config.key_prefix
                        )
                else:
                    cache_key = CacheKeyGenerator.generate_key(
                        func.__name__, args, kwargs, self.cache_manager.config.key_prefix
                    )
                
                # Try to get from cache or compute
                return await self.cache_manager.aget_or_set(
                    cache_key,
                    lambda: func(*args, **kwargs),
                    ttl,
                    level
                )
            
            return wrapper
        return decorator

class DatabaseCacheIntegration:
    """Integration layer between cache and database operations"""
    
    def __init__(self, cache_manager: SmartCacheManager, db_session_factory):
        self.cache_manager = cache_manager
        self.db_session_factory = db_session_factory
        self.cache_decorators = CacheDecorators(cache_manager)
    
    def cached_query(self, ttl: int = 300, level: CacheLevel = CacheLevel.WARM):
        """Decorator for caching database query results"""
        return self.cache_decorators.cached(ttl=ttl, level=level)
    
    def invalidate_on_change(self, entity_types: List[str]):
        """Decorator to invalidate cache when data changes"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                result = func(*args, **kwargs)
                
                # Invalidate related cache entries
                for entity_type in entity_types:
                    self.cache_manager.invalidate_related(entity_type)
                
                return result
            
            return wrapper
        return decorator
    
    @cached_query.__func__(ttl=600, level=CacheLevel.COLD)  # Cache for 10 minutes
    def get_opportunity_statistics(self) -> Dict[str, Any]:
        """Get opportunity statistics with caching"""
        with self.db_session_factory() as session:
            from sqlalchemy import func, text
            
            stats = session.execute(text("""
                SELECT 
                    COUNT(*) as total_opportunities,
                    COUNT(CASE WHEN status IN ('PUBLISHED', 'OPEN') THEN 1 END) as active_opportunities,
                    AVG(estimated_value) as avg_value,
                    SUM(estimated_value) as total_value,
                    COUNT(DISTINCT organ) as unique_organs
                FROM opportunities
                WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
            """)).fetchone()
            
            return {
                'total_opportunities': stats[0] or 0,
                'active_opportunities': stats[1] or 0,
                'avg_value': float(stats[2] or 0),
                'total_value': float(stats[3] or 0),
                'unique_organs': stats[4] or 0,
                'cached_at': datetime.now().isoformat()
            }
    
    @cached_query.__func__(ttl=1800, level=CacheLevel.COLD)  # Cache for 30 minutes
    def get_user_dashboard_data(self, user_id: str) -> Dict[str, Any]:
        """Get user dashboard data with caching"""
        with self.db_session_factory() as session:
            from sqlalchemy import text
            
            # Get user's proposals and opportunities
            user_data = session.execute(text("""
                SELECT 
                    COUNT(DISTINCT p.id) as total_proposals,
                    COUNT(CASE WHEN p.status = 'WINNER' THEN 1 END) as won_proposals,
                    COUNT(DISTINCT o.id) as tracked_opportunities,
                    AVG(p.final_score) as avg_score
                FROM proposals p
                LEFT JOIN opportunities o ON p.opportunity_id = o.id
                WHERE p.user_id = :user_id
                    AND p.created_at > CURRENT_DATE - INTERVAL '90 days'
            """), {'user_id': user_id}).fetchone()
            
            return {
                'total_proposals': user_data[0] or 0,
                'won_proposals': user_data[1] or 0,
                'tracked_opportunities': user_data[2] or 0,
                'avg_score': float(user_data[3] or 0),
                'win_rate': (user_data[1] / user_data[0] * 100) if user_data[0] else 0,
                'cached_at': datetime.now().isoformat()
            }

# Factory functions for easy setup
def create_cache_manager(redis_url: str = "redis://localhost:6379/0",
                        key_prefix: str = "licitacoes") -> SmartCacheManager:
    """Create configured cache manager"""
    config = CacheConfig(redis_url=redis_url, key_prefix=key_prefix)
    return SmartCacheManager(config)

def create_database_cache_integration(cache_manager: SmartCacheManager,
                                    db_session_factory) -> DatabaseCacheIntegration:
    """Create database cache integration"""
    return DatabaseCacheIntegration(cache_manager, db_session_factory)

# Performance testing utilities
class CachePerformanceTester:
    """Test cache performance and effectiveness"""
    
    def __init__(self, cache_manager: SmartCacheManager):
        self.cache_manager = cache_manager
    
    def test_cache_performance(self, iterations: int = 1000) -> Dict[str, Any]:
        """Test cache set/get performance"""
        import time
        
        # Test data
        test_data = {
            'id': 'test-123',
            'title': 'Performance Test Opportunity',
            'description': 'This is a test opportunity for cache performance testing',
            'value': 50000.0,
            'created_at': datetime.now().isoformat()
        }
        
        # Test cache set performance
        set_times = []
        for i in range(iterations):
            start_time = time.time()
            self.cache_manager.set(f"test:perf:{i}", test_data, ttl=300)
            set_times.append((time.time() - start_time) * 1000)  # Convert to ms
        
        # Test cache get performance
        get_times = []
        for i in range(iterations):
            start_time = time.time()
            result = self.cache_manager.get(f"test:perf:{i}")
            get_times.append((time.time() - start_time) * 1000)  # Convert to ms
        
        # Cleanup test keys
        self.cache_manager.delete_pattern("licitacoes:test:perf:*")
        
        return {
            'iterations': iterations,
            'avg_set_time_ms': sum(set_times) / len(set_times),
            'avg_get_time_ms': sum(get_times) / len(get_times),
            'min_set_time_ms': min(set_times),
            'max_set_time_ms': max(set_times),
            'min_get_time_ms': min(get_times),
            'max_get_time_ms': max(get_times),
            'cache_stats': self.cache_manager.stats.get_stats()
        }

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        # Create cache manager
        cache_manager = create_cache_manager()
        
        # Create decorators
        decorators = CacheDecorators(cache_manager)
        
        # Example cached function
        @decorators.cached(ttl=600, level=CacheLevel.WARM)
        def expensive_computation(param1: str, param2: int):
            """Simulate expensive computation"""
            time.sleep(0.1)  # Simulate delay
            return f"Result for {param1}-{param2}: {param1 * param2}"
        
        # Test caching
        print("First call (cache miss):")
        result1 = expensive_computation("test", 5)
        print(f"Result: {result1}")
        
        print("\nSecond call (cache hit):")
        result2 = expensive_computation("test", 5)
        print(f"Result: {result2}")
        
        # Print cache statistics
        print(f"\nCache Statistics: {cache_manager.stats.get_stats()}")
        
        # Test performance
        tester = CachePerformanceTester(cache_manager)
        perf_results = tester.test_cache_performance(100)
        print(f"\nPerformance Test Results: {perf_results}")
    
    asyncio.run(main())