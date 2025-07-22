#!/usr/bin/env python3
"""
Comprehensive Troubleshooting Toolkit for SQLite to Neon Migration
Advanced diagnostic tools, automated issue detection, and recovery systems
"""

import asyncio
import logging
import time
import json
import subprocess
import psutil
import threading
from typing import Dict, Any, List, Optional, Tuple, Union, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from collections import defaultdict, deque
from enum import Enum
import statistics

import psycopg2
import redis
import requests
from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from sqlalchemy.pool import QueuePool

logger = logging.getLogger(__name__)

class IssueType(Enum):
    """Types of system issues"""
    DATABASE_CONNECTION = "database_connection"
    DATABASE_PERFORMANCE = "database_performance"
    MEMORY_LEAK = "memory_leak"
    CPU_OVERLOAD = "cpu_overload"
    DISK_SPACE = "disk_space"
    NETWORK_LATENCY = "network_latency"
    CACHE_MISS = "cache_miss"
    DEADLOCK = "deadlock"
    SLOW_QUERY = "slow_query"
    APPLICATION_ERROR = "application_error"

class Severity(Enum):
    """Issue severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Issue:
    """System issue representation"""
    issue_type: IssueType
    severity: Severity
    title: str
    description: str
    detected_at: datetime
    affected_components: List[str]
    metrics: Dict[str, Any] = field(default_factory=dict)
    root_cause: Optional[str] = None
    resolution_steps: List[str] = field(default_factory=list)
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['detected_at'] = self.detected_at.isoformat()
        if self.resolved_at:
            result['resolved_at'] = self.resolved_at.isoformat()
        result['issue_type'] = self.issue_type.value
        result['severity'] = self.severity.value
        return result

class SystemHealthChecker:
    """Comprehensive system health checking"""
    
    def __init__(self):
        self.thresholds = {
            'cpu_usage_warning': 70.0,
            'cpu_usage_critical': 90.0,
            'memory_usage_warning': 80.0,
            'memory_usage_critical': 95.0,
            'disk_usage_warning': 80.0,
            'disk_usage_critical': 90.0,
            'connection_pool_warning': 70,
            'connection_pool_critical': 90,
            'slow_query_threshold': 1000,  # ms
            'cache_hit_ratio_warning': 85.0
        }
    
    async def run_comprehensive_health_check(self) -> Dict[str, Any]:
        """Run comprehensive system health check"""
        
        health_report = {
            'timestamp': datetime.now().isoformat(),
            'overall_status': 'healthy',
            'components': {},
            'issues_detected': [],
            'recommendations': []
        }
        
        # System resources check
        system_health = await self._check_system_resources()
        health_report['components']['system'] = system_health
        
        # Database health check
        try:
            db_health = await self._check_database_health()
            health_report['components']['database'] = db_health
        except Exception as e:
            health_report['components']['database'] = {
                'status': 'error',
                'error': str(e)
            }
        
        # Cache health check
        try:
            cache_health = await self._check_cache_health()
            health_report['components']['cache'] = cache_health
        except Exception as e:
            health_report['components']['cache'] = {
                'status': 'error',
                'error': str(e)
            }
        
        # Application health check
        app_health = await self._check_application_health()
        health_report['components']['application'] = app_health
        
        # Determine overall status
        component_statuses = [comp.get('status', 'unknown') for comp in health_report['components'].values()]
        if 'critical' in component_statuses:
            health_report['overall_status'] = 'critical'
        elif 'degraded' in component_statuses or 'warning' in component_statuses:
            health_report['overall_status'] = 'degraded'
        elif 'error' in component_statuses:
            health_report['overall_status'] = 'error'
        
        return health_report
    
    async def _check_system_resources(self) -> Dict[str, Any]:
        """Check system resource utilization"""
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1.0)
        cpu_count = psutil.cpu_count()
        load_avg = psutil.getloadavg()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        
        # Determine status
        status = 'healthy'
        issues = []
        
        if cpu_percent > self.thresholds['cpu_usage_critical']:
            status = 'critical'
            issues.append(f"Critical CPU usage: {cpu_percent}%")
        elif cpu_percent > self.thresholds['cpu_usage_warning']:
            status = 'warning'
            issues.append(f"High CPU usage: {cpu_percent}%")
        
        if memory.percent > self.thresholds['memory_usage_critical']:
            status = 'critical'
            issues.append(f"Critical memory usage: {memory.percent}%")
        elif memory.percent > self.thresholds['memory_usage_warning']:
            status = 'warning' if status == 'healthy' else status
            issues.append(f"High memory usage: {memory.percent}%")
        
        if disk.percent > self.thresholds['disk_usage_critical']:
            status = 'critical'
            issues.append(f"Critical disk usage: {disk.percent}%")
        elif disk.percent > self.thresholds['disk_usage_warning']:
            status = 'warning' if status == 'healthy' else status
            issues.append(f"High disk usage: {disk.percent}%")
        
        return {
            'status': status,
            'issues': issues,
            'metrics': {
                'cpu_percent': cpu_percent,
                'cpu_count': cpu_count,
                'load_avg_1m': load_avg[0],
                'load_avg_5m': load_avg[1],
                'load_avg_15m': load_avg[2],
                'memory_percent': memory.percent,
                'memory_total_gb': memory.total / (1024**3),
                'memory_available_gb': memory.available / (1024**3),
                'disk_percent': disk.percent,
                'disk_total_gb': disk.total / (1024**3),
                'disk_free_gb': disk.free / (1024**3)
            }
        }
    
    async def _check_database_health(self) -> Dict[str, Any]:
        """Check database health and performance"""
        
        # This would be configured with actual database URL
        DATABASE_URL = "postgresql://user:pass@localhost/licitacoes"
        
        try:
            engine = create_engine(DATABASE_URL)
            
            with engine.connect() as conn:
                # Basic connectivity
                conn.execute(text("SELECT 1"))
                
                # Connection stats
                conn_stats = conn.execute(text("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections,
                        count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
                        max(now() - backend_start) as longest_connection_age
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)).fetchone()
                
                # Database stats
                db_stats = conn.execute(text("""
                    SELECT 
                        xact_commit,
                        xact_rollback,
                        blks_read,
                        blks_hit,
                        tup_returned,
                        tup_fetched
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """)).fetchone()
                
                # Slow queries
                slow_queries = conn.execute(text("""
                    SELECT COUNT(*) as slow_query_count,
                           AVG(mean_exec_time) as avg_slow_query_time
                    FROM pg_stat_statements 
                    WHERE mean_exec_time > %s
                """), (self.thresholds['slow_query_threshold'],)).fetchone()
                
                # Calculate cache hit ratio
                total_reads = db_stats.blks_read + db_stats.blks_hit
                cache_hit_ratio = (db_stats.blks_hit / total_reads * 100) if total_reads > 0 else 100
                
                # Check pool status
                pool = engine.pool
                pool_usage_percent = (pool.checkedout() / pool.size()) * 100
                
                # Determine status
                status = 'healthy'
                issues = []
                
                if pool_usage_percent > self.thresholds['connection_pool_critical']:
                    status = 'critical'
                    issues.append(f"Critical connection pool usage: {pool_usage_percent:.1f}%")
                elif pool_usage_percent > self.thresholds['connection_pool_warning']:
                    status = 'warning'
                    issues.append(f"High connection pool usage: {pool_usage_percent:.1f}%")
                
                if cache_hit_ratio < self.thresholds['cache_hit_ratio_warning']:
                    status = 'warning' if status == 'healthy' else status
                    issues.append(f"Low cache hit ratio: {cache_hit_ratio:.1f}%")
                
                if slow_queries.slow_query_count > 10:
                    status = 'warning' if status == 'healthy' else status
                    issues.append(f"Multiple slow queries detected: {slow_queries.slow_query_count}")
                
                return {
                    'status': status,
                    'issues': issues,
                    'metrics': {
                        'total_connections': conn_stats.total_connections,
                        'active_connections': conn_stats.active_connections,
                        'idle_connections': conn_stats.idle_connections,
                        'idle_in_transaction': conn_stats.idle_in_transaction,
                        'longest_connection_age_seconds': conn_stats.longest_connection_age.total_seconds() if conn_stats.longest_connection_age else 0,
                        'cache_hit_ratio': cache_hit_ratio,
                        'slow_query_count': slow_queries.slow_query_count,
                        'avg_slow_query_time_ms': slow_queries.avg_slow_query_time or 0,
                        'pool_size': pool.size(),
                        'pool_checked_out': pool.checkedout(),
                        'pool_usage_percent': pool_usage_percent,
                        'transactions_committed': db_stats.xact_commit,
                        'transactions_rolled_back': db_stats.xact_rollback
                    }
                }
                
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'metrics': {}
            }
    
    async def _check_cache_health(self) -> Dict[str, Any]:
        """Check Redis cache health"""
        
        try:
            r = redis.Redis(host='localhost', port=6379, db=0)
            
            # Basic connectivity
            r.ping()
            
            # Get Redis info
            info = r.info()
            
            # Calculate metrics
            memory_usage_percent = (info['used_memory'] / info['maxmemory']) * 100 if info.get('maxmemory', 0) > 0 else 0
            hit_rate = (info['keyspace_hits'] / (info['keyspace_hits'] + info['keyspace_misses'])) * 100 if (info['keyspace_hits'] + info['keyspace_misses']) > 0 else 0
            
            status = 'healthy'
            issues = []
            
            if memory_usage_percent > 90:
                status = 'critical'
                issues.append(f"Critical Redis memory usage: {memory_usage_percent:.1f}%")
            elif memory_usage_percent > 80:
                status = 'warning'
                issues.append(f"High Redis memory usage: {memory_usage_percent:.1f}%")
            
            if hit_rate < 80:
                status = 'warning' if status == 'healthy' else status
                issues.append(f"Low cache hit rate: {hit_rate:.1f}%")
            
            return {
                'status': status,
                'issues': issues,
                'metrics': {
                    'connected_clients': info['connected_clients'],
                    'used_memory_mb': info['used_memory'] / (1024*1024),
                    'memory_usage_percent': memory_usage_percent,
                    'hit_rate_percent': hit_rate,
                    'total_commands_processed': info['total_commands_processed'],
                    'keyspace_hits': info['keyspace_hits'],
                    'keyspace_misses': info['keyspace_misses']
                }
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'metrics': {}
            }
    
    async def _check_application_health(self) -> Dict[str, Any]:
        """Check application health"""
        
        try:
            # Check application endpoints
            health_check_url = "http://localhost:8000/health"
            
            start_time = time.time()
            response = requests.get(health_check_url, timeout=10)
            response_time_ms = (time.time() - start_time) * 1000
            
            status = 'healthy'
            issues = []
            
            if response.status_code != 200:
                status = 'error'
                issues.append(f"Health check failed with status {response.status_code}")
            elif response_time_ms > 5000:
                status = 'warning'
                issues.append(f"Slow health check response: {response_time_ms:.0f}ms")
            
            try:
                health_data = response.json()
            except:
                health_data = {}
            
            return {
                'status': status,
                'issues': issues,
                'metrics': {
                    'response_time_ms': response_time_ms,
                    'status_code': response.status_code,
                    'health_data': health_data
                }
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'metrics': {}
            }

class IssueDetector:
    """Automated issue detection system"""
    
    def __init__(self, health_checker: SystemHealthChecker):
        self.health_checker = health_checker
        self.issue_history: deque = deque(maxlen=1000)
        self.detection_rules = self._setup_detection_rules()
    
    def _setup_detection_rules(self) -> List[Callable]:
        """Setup issue detection rules"""
        return [
            self._detect_memory_leak,
            self._detect_cpu_overload,
            self._detect_database_connection_issues,
            self._detect_slow_queries,
            self._detect_cache_issues,
            self._detect_disk_space_issues
        ]
    
    async def scan_for_issues(self) -> List[Issue]:
        """Scan system for potential issues"""
        
        detected_issues = []
        
        # Get system health data
        health_report = await self.health_checker.run_comprehensive_health_check()
        
        # Run detection rules
        for detection_rule in self.detection_rules:
            try:
                issue = await detection_rule(health_report)
                if issue:
                    detected_issues.append(issue)
                    self.issue_history.append(issue)
            except Exception as e:
                logger.error(f"Detection rule failed: {detection_rule.__name__}: {e}")
        
        return detected_issues
    
    async def _detect_memory_leak(self, health_report: Dict[str, Any]) -> Optional[Issue]:
        """Detect memory leak patterns"""
        
        system_metrics = health_report['components'].get('system', {}).get('metrics', {})
        memory_percent = system_metrics.get('memory_percent', 0)
        
        # Check for sustained high memory usage
        recent_memory_readings = [
            issue.metrics.get('memory_percent', 0) 
            for issue in self.issue_history 
            if issue.issue_type == IssueType.MEMORY_LEAK and 
               (datetime.now() - issue.detected_at).total_seconds() < 3600  # Last hour
        ]
        
        if memory_percent > 90:
            return Issue(
                issue_type=IssueType.MEMORY_LEAK,
                severity=Severity.CRITICAL,
                title="Critical Memory Usage",
                description=f"Memory usage at {memory_percent:.1f}% - potential memory leak",
                detected_at=datetime.now(),
                affected_components=['application', 'system'],
                metrics={'memory_percent': memory_percent},
                resolution_steps=[
                    "Analyze memory usage patterns",
                    "Check for memory leaks in application",
                    "Consider restarting application services",
                    "Investigate memory-intensive operations"
                ]
            )
        elif len(recent_memory_readings) > 5 and all(reading > 80 for reading in recent_memory_readings):
            return Issue(
                issue_type=IssueType.MEMORY_LEAK,
                severity=Severity.HIGH,
                title="Sustained High Memory Usage",
                description="Memory usage consistently high - possible memory leak",
                detected_at=datetime.now(),
                affected_components=['application'],
                metrics={'memory_percent': memory_percent, 'trend': 'increasing'},
                resolution_steps=[
                    "Monitor memory usage trend",
                    "Profile application for memory leaks",
                    "Check for unclosed connections or resources"
                ]
            )
        
        return None
    
    async def _detect_cpu_overload(self, health_report: Dict[str, Any]) -> Optional[Issue]:
        """Detect CPU overload conditions"""
        
        system_metrics = health_report['components'].get('system', {}).get('metrics', {})
        cpu_percent = system_metrics.get('cpu_percent', 0)
        load_avg_1m = system_metrics.get('load_avg_1m', 0)
        cpu_count = system_metrics.get('cpu_count', 1)
        
        if cpu_percent > 95 or load_avg_1m > cpu_count * 2:
            return Issue(
                issue_type=IssueType.CPU_OVERLOAD,
                severity=Severity.CRITICAL,
                title="CPU Overload",
                description=f"CPU at {cpu_percent:.1f}%, load average {load_avg_1m:.2f}",
                detected_at=datetime.now(),
                affected_components=['system', 'application'],
                metrics={'cpu_percent': cpu_percent, 'load_avg': load_avg_1m},
                resolution_steps=[
                    "Identify CPU-intensive processes",
                    "Scale application horizontally",
                    "Optimize database queries",
                    "Consider upgrading hardware"
                ]
            )
        
        return None
    
    async def _detect_database_connection_issues(self, health_report: Dict[str, Any]) -> Optional[Issue]:
        """Detect database connection issues"""
        
        db_metrics = health_report['components'].get('database', {}).get('metrics', {})
        pool_usage = db_metrics.get('pool_usage_percent', 0)
        idle_in_transaction = db_metrics.get('idle_in_transaction', 0)
        
        if pool_usage > 95:
            return Issue(
                issue_type=IssueType.DATABASE_CONNECTION,
                severity=Severity.CRITICAL,
                title="Database Connection Pool Exhausted",
                description=f"Connection pool usage at {pool_usage:.1f}%",
                detected_at=datetime.now(),
                affected_components=['database'],
                metrics={'pool_usage_percent': pool_usage},
                resolution_steps=[
                    "Increase connection pool size",
                    "Optimize connection usage",
                    "Check for connection leaks",
                    "Kill long-running idle connections"
                ]
            )
        elif idle_in_transaction > 20:
            return Issue(
                issue_type=IssueType.DATABASE_CONNECTION,
                severity=Severity.HIGH,
                title="Excessive Idle in Transaction Connections",
                description=f"{idle_in_transaction} connections idle in transaction",
                detected_at=datetime.now(),
                affected_components=['database'],
                metrics={'idle_in_transaction': idle_in_transaction},
                resolution_steps=[
                    "Review transaction handling",
                    "Set statement_timeout",
                    "Kill idle transactions",
                    "Improve application transaction management"
                ]
            )
        
        return None
    
    async def _detect_slow_queries(self, health_report: Dict[str, Any]) -> Optional[Issue]:
        """Detect slow query issues"""
        
        db_metrics = health_report['components'].get('database', {}).get('metrics', {})
        slow_query_count = db_metrics.get('slow_query_count', 0)
        avg_slow_query_time = db_metrics.get('avg_slow_query_time_ms', 0)
        
        if slow_query_count > 50:
            return Issue(
                issue_type=IssueType.SLOW_QUERY,
                severity=Severity.HIGH,
                title="Excessive Slow Queries",
                description=f"{slow_query_count} slow queries detected",
                detected_at=datetime.now(),
                affected_components=['database', 'application'],
                metrics={'slow_query_count': slow_query_count, 'avg_time_ms': avg_slow_query_time},
                resolution_steps=[
                    "Analyze slow query patterns",
                    "Add missing indexes",
                    "Optimize query structure",
                    "Consider query caching"
                ]
            )
        
        return None
    
    async def _detect_cache_issues(self, health_report: Dict[str, Any]) -> Optional[Issue]:
        """Detect cache-related issues"""
        
        cache_metrics = health_report['components'].get('cache', {}).get('metrics', {})
        hit_rate = cache_metrics.get('hit_rate_percent', 100)
        memory_usage = cache_metrics.get('memory_usage_percent', 0)
        
        if hit_rate < 50:
            return Issue(
                issue_type=IssueType.CACHE_MISS,
                severity=Severity.MEDIUM,
                title="Low Cache Hit Rate",
                description=f"Cache hit rate at {hit_rate:.1f}%",
                detected_at=datetime.now(),
                affected_components=['cache'],
                metrics={'hit_rate_percent': hit_rate},
                resolution_steps=[
                    "Review cache key strategies",
                    "Increase cache TTL for stable data",
                    "Optimize cache warming",
                    "Consider cache preloading"
                ]
            )
        
        if memory_usage > 95:
            return Issue(
                issue_type=IssueType.CACHE_MISS,
                severity=Severity.HIGH,
                title="Cache Memory Exhaustion",
                description=f"Cache memory usage at {memory_usage:.1f}%",
                detected_at=datetime.now(),
                affected_components=['cache'],
                metrics={'memory_usage_percent': memory_usage},
                resolution_steps=[
                    "Increase cache memory limit",
                    "Implement cache eviction policies",
                    "Review cached data sizes",
                    "Optimize cache usage patterns"
                ]
            )
        
        return None
    
    async def _detect_disk_space_issues(self, health_report: Dict[str, Any]) -> Optional[Issue]:
        """Detect disk space issues"""
        
        system_metrics = health_report['components'].get('system', {}).get('metrics', {})
        disk_percent = system_metrics.get('disk_percent', 0)
        
        if disk_percent > 95:
            return Issue(
                issue_type=IssueType.DISK_SPACE,
                severity=Severity.CRITICAL,
                title="Critical Disk Space",
                description=f"Disk usage at {disk_percent:.1f}%",
                detected_at=datetime.now(),
                affected_components=['system'],
                metrics={'disk_percent': disk_percent},
                resolution_steps=[
                    "Clean up log files",
                    "Archive old data",
                    "Expand disk space",
                    "Implement log rotation"
                ]
            )
        
        return None

class AutoRecovery:
    """Automated recovery system for common issues"""
    
    def __init__(self):
        self.recovery_actions = {
            IssueType.DATABASE_CONNECTION: self._recover_database_connections,
            IssueType.MEMORY_LEAK: self._recover_memory_issues,
            IssueType.SLOW_QUERY: self._recover_slow_queries,
            IssueType.CACHE_MISS: self._recover_cache_issues,
            IssueType.DISK_SPACE: self._recover_disk_space
        }
    
    async def attempt_recovery(self, issue: Issue) -> bool:
        """Attempt to recover from detected issue"""
        
        recovery_action = self.recovery_actions.get(issue.issue_type)
        if not recovery_action:
            logger.warning(f"No recovery action available for {issue.issue_type.value}")
            return False
        
        try:
            success = await recovery_action(issue)
            if success:
                issue.resolved = True
                issue.resolved_at = datetime.now()
                logger.info(f"Successfully recovered from issue: {issue.title}")
            else:
                logger.warning(f"Recovery attempt failed for issue: {issue.title}")
            
            return success
            
        except Exception as e:
            logger.error(f"Recovery action failed for {issue.title}: {e}")
            return False
    
    async def _recover_database_connections(self, issue: Issue) -> bool:
        """Recover database connection issues"""
        
        DATABASE_URL = "postgresql://user:pass@localhost/licitacoes"
        
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Kill idle in transaction connections older than 1 hour
            cursor.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE state = 'idle in transaction'
                AND now() - state_change > interval '1 hour'
                AND datname = current_database()
                AND pid != pg_backend_pid()
            """)
            
            # Kill long-running queries (over 30 minutes)
            cursor.execute("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE now() - query_start > interval '30 minutes'
                AND state = 'active'
                AND datname = current_database()
                AND pid != pg_backend_pid()
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logger.info("Cleaned up idle database connections")
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover database connections: {e}")
            return False
    
    async def _recover_memory_issues(self, issue: Issue) -> bool:
        """Recover from memory issues"""
        
        try:
            # Force garbage collection
            import gc
            collected = gc.collect()
            
            # Clear application caches if available
            try:
                r = redis.Redis(host='localhost', port=6379, db=1)  # Cache DB
                r.flushdb()
                logger.info("Cleared application cache to free memory")
            except:
                pass  # Redis might not be available
            
            logger.info(f"Forced garbage collection, freed {collected} objects")
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover from memory issues: {e}")
            return False
    
    async def _recover_slow_queries(self, issue: Issue) -> bool:
        """Recover from slow query issues"""
        
        try:
            DATABASE_URL = "postgresql://user:pass@localhost/licitacoes"
            conn = psycopg2.connect(DATABASE_URL)
            cursor = conn.cursor()
            
            # Kill extremely slow queries (over 5 minutes)
            cursor.execute("""
                SELECT pg_terminate_backend(pid), query
                FROM pg_stat_activity
                WHERE now() - query_start > interval '5 minutes'
                AND state = 'active'
                AND datname = current_database()
                AND pid != pg_backend_pid()
            """)
            
            results = cursor.fetchall()
            if results:
                logger.info(f"Terminated {len(results)} slow queries")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover from slow queries: {e}")
            return False
    
    async def _recover_cache_issues(self, issue: Issue) -> bool:
        """Recover from cache issues"""
        
        try:
            r = redis.Redis(host='localhost', port=6379, db=0)
            
            # If memory is full, clear least recently used keys
            if 'memory_usage_percent' in issue.metrics and issue.metrics['memory_usage_percent'] > 90:
                # Set volatile-lru eviction policy
                r.config_set('maxmemory-policy', 'volatile-lru')
                logger.info("Set Redis eviction policy to volatile-lru")
            
            # If hit rate is low, clear expired keys
            if 'hit_rate_percent' in issue.metrics and issue.metrics['hit_rate_percent'] < 50:
                r.execute_command('MEMORY PURGE')
                logger.info("Purged expired Redis keys")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover cache issues: {e}")
            return False
    
    async def _recover_disk_space(self, issue: Issue) -> bool:
        """Recover from disk space issues"""
        
        try:
            # Clean up old log files
            log_dirs = ['/var/log/licitacoes', '/tmp', '/var/tmp']
            
            for log_dir in log_dirs:
                if os.path.exists(log_dir):
                    # Remove files older than 7 days
                    subprocess.run([
                        'find', log_dir, '-type', 'f', '-mtime', '+7', '-delete'
                    ], check=False)
            
            # Compress large log files
            subprocess.run([
                'find', '/var/log/licitacoes', '-name', '*.log', '-size', '+100M', 
                '-exec', 'gzip', '{}', ';'
            ], check=False)
            
            logger.info("Cleaned up old log files and compressed large files")
            return True
            
        except Exception as e:
            logger.error(f"Failed to recover disk space: {e}")
            return False

class TroubleshootingToolkit:
    """Main troubleshooting toolkit"""
    
    def __init__(self):
        self.health_checker = SystemHealthChecker()
        self.issue_detector = IssueDetector(self.health_checker)
        self.auto_recovery = AutoRecovery()
        self.monitoring_active = False
        self.monitor_thread: Optional[threading.Thread] = None
    
    def start_monitoring(self, interval_seconds: int = 60):
        """Start continuous monitoring"""
        
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval_seconds,),
            daemon=True
        )
        self.monitor_thread.start()
        logger.info(f"Started troubleshooting monitoring with {interval_seconds}s interval")
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        logger.info("Stopped troubleshooting monitoring")
    
    def _monitoring_loop(self, interval_seconds: int):
        """Main monitoring loop"""
        
        async def async_monitor():
            while self.monitoring_active:
                try:
                    # Detect issues
                    issues = await self.issue_detector.scan_for_issues()
                    
                    # Attempt auto-recovery for critical issues
                    for issue in issues:
                        if issue.severity in [Severity.CRITICAL, Severity.HIGH]:
                            logger.warning(f"Detected {issue.severity.value} issue: {issue.title}")
                            
                            # Attempt recovery
                            recovery_success = await self.auto_recovery.attempt_recovery(issue)
                            if recovery_success:
                                logger.info(f"Auto-recovery successful for: {issue.title}")
                            else:
                                logger.error(f"Auto-recovery failed for: {issue.title}")
                                # Send alert to administrators
                                await self._send_critical_alert(issue)
                    
                    await asyncio.sleep(interval_seconds)
                    
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    await asyncio.sleep(interval_seconds)
        
        # Run async monitoring loop
        asyncio.run(async_monitor())
    
    async def _send_critical_alert(self, issue: Issue):
        """Send critical alert to administrators"""
        
        alert_data = {
            'timestamp': datetime.now().isoformat(),
            'severity': issue.severity.value,
            'title': issue.title,
            'description': issue.description,
            'affected_components': issue.affected_components,
            'metrics': issue.metrics,
            'resolution_steps': issue.resolution_steps
        }
        
        # This would integrate with alerting systems (Slack, PagerDuty, etc.)
        logger.critical(f"CRITICAL ALERT: {json.dumps(alert_data, indent=2)}")
    
    async def run_diagnostics(self) -> Dict[str, Any]:
        """Run comprehensive diagnostics"""
        
        logger.info("Running comprehensive system diagnostics...")
        
        # Get health report
        health_report = await self.health_checker.run_comprehensive_health_check()
        
        # Detect issues
        issues = await self.issue_detector.scan_for_issues()
        
        # Generate recommendations
        recommendations = self._generate_recommendations(health_report, issues)
        
        diagnostics_report = {
            'timestamp': datetime.now().isoformat(),
            'health_report': health_report,
            'detected_issues': [issue.to_dict() for issue in issues],
            'recommendations': recommendations,
            'recovery_available': len([i for i in issues if i.issue_type in self.auto_recovery.recovery_actions]) > 0
        }
        
        return diagnostics_report
    
    def _generate_recommendations(self, health_report: Dict[str, Any], issues: List[Issue]) -> List[str]:
        """Generate recommendations based on diagnostics"""
        
        recommendations = []
        
        # System recommendations
        if health_report['overall_status'] != 'healthy':
            recommendations.append("System health is degraded - review component issues")
        
        # Issue-specific recommendations
        for issue in issues:
            if issue.severity == Severity.CRITICAL:
                recommendations.append(f"CRITICAL: {issue.title} - {issue.resolution_steps[0] if issue.resolution_steps else 'Immediate attention required'}")
        
        # Performance recommendations
        db_metrics = health_report['components'].get('database', {}).get('metrics', {})
        if db_metrics.get('cache_hit_ratio', 100) < 85:
            recommendations.append("Consider optimizing database queries or increasing shared_buffers")
        
        system_metrics = health_report['components'].get('system', {}).get('metrics', {})
        if system_metrics.get('cpu_percent', 0) > 70:
            recommendations.append("High CPU usage detected - consider scaling or optimization")
        
        return recommendations

# Factory function
def create_troubleshooting_toolkit() -> TroubleshootingToolkit:
    """Create configured troubleshooting toolkit"""
    return TroubleshootingToolkit()

# Example usage
if __name__ == "__main__":
    async def main():
        toolkit = create_troubleshooting_toolkit()
        
        # Run diagnostics
        diagnostics = await toolkit.run_diagnostics()
        print(json.dumps(diagnostics, indent=2))
        
        # Start monitoring (in real usage, this would run continuously)
        # toolkit.start_monitoring(interval_seconds=30)
        
        # Simulate some time passing
        # await asyncio.sleep(5)
        
        # Stop monitoring
        # toolkit.stop_monitoring()
    
    asyncio.run(main())