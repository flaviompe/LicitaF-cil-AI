#!/usr/bin/env python3
"""
Comprehensive Performance Monitoring for SQLite to Neon Migration
Real-time monitoring, alerting, and performance analytics
"""

import asyncio
import logging
import time
import threading
import json
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from collections import deque, defaultdict
from enum import Enum
import psutil
import statistics
from contextlib import asynccontextmanager

from sqlalchemy import create_engine, text, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
import aioredis

logger = logging.getLogger(__name__)

class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning" 
    CRITICAL = "critical"

class MetricType(Enum):
    """Types of metrics being monitored"""
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    CONNECTION_COUNT = "connection_count"
    CACHE_HIT_RATIO = "cache_hit_ratio"
    QUERY_PERFORMANCE = "query_performance"

@dataclass
class Metric:
    """Individual metric data point"""
    name: str
    value: float
    unit: str
    timestamp: datetime = field(default_factory=datetime.now)
    tags: Dict[str, str] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'name': self.name,
            'value': self.value,
            'unit': self.unit,
            'timestamp': self.timestamp.isoformat(),
            'tags': self.tags
        }

@dataclass
class Alert:
    """Performance alert"""
    level: AlertLevel
    title: str
    description: str
    metric_name: str
    current_value: float
    threshold_value: float
    timestamp: datetime = field(default_factory=datetime.now)
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

@dataclass
class PerformanceThreshold:
    """Performance threshold configuration"""
    metric_name: str
    warning_threshold: float
    critical_threshold: float
    comparison: str = "gt"  # gt, lt, eq
    duration: int = 60  # seconds to maintain threshold before alerting
    enabled: bool = True

class MetricCollector:
    """Collect system and application metrics"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.system_info = self._get_system_info()
        
    def _get_system_info(self) -> Dict[str, Any]:
        """Get static system information"""
        return {
            'cpu_count': psutil.cpu_count(),
            'memory_total': psutil.virtual_memory().total,
            'disk_total': psutil.disk_usage('/').total,
            'python_version': f"{psutil.sys.version_info.major}.{psutil.sys.version_info.minor}",
            'hostname': psutil.os.uname().nodename if hasattr(psutil.os, 'uname') else 'unknown'
        }
    
    def collect_system_metrics(self) -> List[Metric]:
        """Collect system-level metrics"""
        metrics = []
        now = datetime.now()
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        metrics.append(Metric(
            name="system.cpu.usage_percent",
            value=cpu_percent,
            unit="percent",
            timestamp=now
        ))
        
        # Memory metrics
        memory = psutil.virtual_memory()
        metrics.append(Metric(
            name="system.memory.usage_percent",
            value=memory.percent,
            unit="percent",
            timestamp=now
        ))
        
        metrics.append(Metric(
            name="system.memory.available_bytes",
            value=memory.available,
            unit="bytes",
            timestamp=now
        ))
        
        # Process-specific metrics
        try:
            process_cpu = self.process.cpu_percent()
            process_memory = self.process.memory_info()
            
            metrics.append(Metric(
                name="process.cpu.usage_percent",
                value=process_cpu,
                unit="percent",
                timestamp=now
            ))
            
            metrics.append(Metric(
                name="process.memory.rss_bytes",
                value=process_memory.rss,
                unit="bytes",
                timestamp=now
            ))
            
            metrics.append(Metric(
                name="process.memory.vms_bytes",
                value=process_memory.vms,
                unit="bytes", 
                timestamp=now
            ))
            
            # Thread count
            metrics.append(Metric(
                name="process.threads.count",
                value=self.process.num_threads(),
                unit="count",
                timestamp=now
            ))
            
        except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
            logger.warning(f"Failed to collect process metrics: {e}")
        
        # Disk metrics
        try:
            disk_usage = psutil.disk_usage('/')
            metrics.append(Metric(
                name="system.disk.usage_percent",
                value=disk_usage.percent,
                unit="percent",
                timestamp=now
            ))
        except Exception as e:
            logger.warning(f"Failed to collect disk metrics: {e}")
        
        return metrics
    
    def collect_database_metrics(self, engine: Engine) -> List[Metric]:
        """Collect database-specific metrics"""
        metrics = []
        now = datetime.now()
        
        try:
            with engine.connect() as conn:
                # Connection pool metrics
                pool = engine.pool
                metrics.extend([
                    Metric("database.pool.size", pool.size(), "count", now),
                    Metric("database.pool.checked_out", pool.checkedout(), "count", now),
                    Metric("database.pool.overflow", pool.overflow(), "count", now),
                    Metric("database.pool.invalid", pool.invalid(), "count", now)
                ])
                
                # Database statistics
                db_stats = conn.execute(text("""
                    SELECT 
                        numbackends as active_connections,
                        xact_commit as transactions_committed,
                        xact_rollback as transactions_rolled_back,
                        blks_read as blocks_read,
                        blks_hit as blocks_hit,
                        tup_returned as tuples_returned,
                        tup_fetched as tuples_fetched,
                        tup_inserted as tuples_inserted,
                        tup_updated as tuples_updated,
                        tup_deleted as tuples_deleted
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """)).fetchone()
                
                if db_stats:
                    metrics.extend([
                        Metric("database.connections.active", db_stats.active_connections, "count", now),
                        Metric("database.transactions.committed", db_stats.transactions_committed, "count", now),
                        Metric("database.transactions.rolled_back", db_stats.transactions_rolled_back, "count", now),
                        Metric("database.blocks.read", db_stats.blocks_read, "count", now),
                        Metric("database.blocks.hit", db_stats.blocks_hit, "count", now),
                        Metric("database.tuples.returned", db_stats.tuples_returned, "count", now),
                        Metric("database.tuples.fetched", db_stats.tuples_fetched, "count", now),
                        Metric("database.tuples.inserted", db_stats.tuples_inserted, "count", now),
                        Metric("database.tuples.updated", db_stats.tuples_updated, "count", now),
                        Metric("database.tuples.deleted", db_stats.tuples_deleted, "count", now)
                    ])
                    
                    # Calculate cache hit ratio
                    total_reads = db_stats.blocks_read + db_stats.blocks_hit
                    if total_reads > 0:
                        cache_hit_ratio = (db_stats.blocks_hit / total_reads) * 100
                        metrics.append(Metric("database.cache.hit_ratio_percent", cache_hit_ratio, "percent", now))
                
                # Query performance stats (if pg_stat_statements is available)
                try:
                    slow_queries = conn.execute(text("""
                        SELECT COUNT(*) as slow_query_count,
                               AVG(mean_exec_time) as avg_execution_time_ms
                        FROM pg_stat_statements 
                        WHERE mean_exec_time > 1000
                    """)).fetchone()
                    
                    if slow_queries:
                        metrics.extend([
                            Metric("database.queries.slow_count", slow_queries.slow_query_count, "count", now),
                            Metric("database.queries.avg_execution_time_ms", slow_queries.avg_execution_time_ms or 0, "milliseconds", now)
                        ])
                except Exception:
                    # pg_stat_statements not available
                    pass
                
        except Exception as e:
            logger.error(f"Failed to collect database metrics: {e}")
        
        return metrics

class PerformanceMonitor:
    """Main performance monitoring system"""
    
    def __init__(self, 
                 engine: Optional[Engine] = None,
                 redis_url: Optional[str] = None,
                 collection_interval: int = 30):
        
        self.engine = engine
        self.redis_url = redis_url
        self.collection_interval = collection_interval
        
        self.metric_collector = MetricCollector()
        self.metrics_history: deque = deque(maxlen=10000)  # Store last 10k metrics
        self.alerts: List[Alert] = []
        self.alert_callbacks: List[Callable[[Alert], None]] = []
        
        # Performance thresholds
        self.thresholds = self._get_default_thresholds()
        
        # Monitoring state
        self.monitoring_active = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Application metrics
        self.request_times: deque = deque(maxlen=1000)
        self.error_count = 0
        self.request_count = 0
        self.last_reset_time = time.time()
        
        logger.info("Performance monitor initialized")
    
    def _get_default_thresholds(self) -> List[PerformanceThreshold]:
        """Get default performance thresholds"""
        return [
            PerformanceThreshold("system.cpu.usage_percent", 70.0, 90.0),
            PerformanceThreshold("system.memory.usage_percent", 80.0, 95.0),
            PerformanceThreshold("process.memory.rss_bytes", 1024**3, 2*1024**3),  # 1GB, 2GB
            PerformanceThreshold("database.connections.active", 80, 150),
            PerformanceThreshold("database.cache.hit_ratio_percent", 80.0, 60.0, "lt"),  # Alert if hit ratio is low
            PerformanceThreshold("application.response_time_ms", 1000.0, 5000.0),
            PerformanceThreshold("application.error_rate_percent", 5.0, 15.0)
        ]
    
    async def start_monitoring(self):
        """Start background monitoring"""
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        
        # Initialize Redis connection if configured
        if self.redis_url:
            try:
                self.redis_client = await aioredis.from_url(self.redis_url)
                await self.redis_client.ping()
                logger.info("Redis connection established for metrics storage")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis: {e}")
        
        # Start monitoring thread
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True
        )
        self.monitor_thread.start()
        
        logger.info(f"Performance monitoring started with {self.collection_interval}s interval")
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        logger.info("Performance monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect metrics
                self._collect_all_metrics()
                
                # Check thresholds and generate alerts
                self._check_thresholds()
                
                # Clean up old data
                self._cleanup_old_data()
                
                time.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(self.collection_interval)
    
    def _collect_all_metrics(self):
        """Collect all metrics"""
        current_time = time.time()
        
        # System metrics
        system_metrics = self.metric_collector.collect_system_metrics()
        self.metrics_history.extend(system_metrics)
        
        # Database metrics
        if self.engine:
            db_metrics = self.metric_collector.collect_database_metrics(self.engine)
            self.metrics_history.extend(db_metrics)
        
        # Application metrics
        app_metrics = self._collect_application_metrics()
        self.metrics_history.extend(app_metrics)
        
        # Store in Redis if available
        if self.redis_client:
            asyncio.create_task(self._store_metrics_in_redis(system_metrics + db_metrics + app_metrics))
    
    def _collect_application_metrics(self) -> List[Metric]:
        """Collect application-level metrics"""
        metrics = []
        now = datetime.now()
        current_time = time.time()
        
        # Calculate time window
        time_window = current_time - self.last_reset_time
        if time_window <= 0:
            return metrics
        
        # Response time metrics
        if self.request_times:
            avg_response_time = statistics.mean(self.request_times) * 1000  # Convert to ms
            p95_response_time = statistics.quantiles(self.request_times, n=20)[18] * 1000  # 95th percentile
            
            metrics.extend([
                Metric("application.response_time_ms", avg_response_time, "milliseconds", now),
                Metric("application.response_time_p95_ms", p95_response_time, "milliseconds", now)
            ])
        
        # Throughput metrics
        requests_per_second = self.request_count / time_window
        metrics.append(Metric("application.requests_per_second", requests_per_second, "rps", now))
        
        # Error rate
        error_rate = (self.error_count / max(self.request_count, 1)) * 100
        metrics.append(Metric("application.error_rate_percent", error_rate, "percent", now))
        
        return metrics
    
    async def _store_metrics_in_redis(self, metrics: List[Metric]):
        """Store metrics in Redis for external monitoring tools"""
        if not self.redis_client:
            return
        
        try:
            pipe = self.redis_client.pipeline()
            
            for metric in metrics:
                key = f"metrics:{metric.name}:{int(metric.timestamp.timestamp())}"
                value = json.dumps(metric.to_dict())
                pipe.setex(key, 3600, value)  # Store for 1 hour
            
            await pipe.execute()
        except Exception as e:
            logger.error(f"Failed to store metrics in Redis: {e}")
    
    def _check_thresholds(self):
        """Check metrics against thresholds and generate alerts"""
        # Get recent metrics for threshold checking
        recent_metrics = [m for m in self.metrics_history if 
                         (datetime.now() - m.timestamp).total_seconds() <= 300]  # Last 5 minutes
        
        # Group metrics by name
        metrics_by_name = defaultdict(list)
        for metric in recent_metrics:
            metrics_by_name[metric.name].append(metric)
        
        for threshold in self.thresholds:
            if not threshold.enabled or threshold.metric_name not in metrics_by_name:
                continue
            
            metric_values = metrics_by_name[threshold.metric_name]
            if not metric_values:
                continue
            
            # Get the latest value
            latest_metric = max(metric_values, key=lambda m: m.timestamp)
            current_value = latest_metric.value
            
            # Check threshold violation
            alert_level = self._check_threshold_violation(current_value, threshold)
            if alert_level:
                self._create_alert(alert_level, threshold, current_value)
    
    def _check_threshold_violation(self, value: float, threshold: PerformanceThreshold) -> Optional[AlertLevel]:
        """Check if value violates threshold"""
        if threshold.comparison == "gt":
            if value >= threshold.critical_threshold:
                return AlertLevel.CRITICAL
            elif value >= threshold.warning_threshold:
                return AlertLevel.WARNING
        elif threshold.comparison == "lt":
            if value <= threshold.critical_threshold:
                return AlertLevel.CRITICAL
            elif value <= threshold.warning_threshold:
                return AlertLevel.WARNING
        
        return None
    
    def _create_alert(self, level: AlertLevel, threshold: PerformanceThreshold, current_value: float):
        """Create and handle alert"""
        # Check if similar alert already exists and is recent
        recent_alerts = [a for a in self.alerts if 
                        a.metric_name == threshold.metric_name and 
                        not a.resolved and
                        (datetime.now() - a.timestamp).total_seconds() < 3600]  # Within 1 hour
        
        if recent_alerts:
            return  # Don't spam alerts
        
        alert = Alert(
            level=level,
            title=f"{threshold.metric_name} threshold exceeded",
            description=f"Metric {threshold.metric_name} is {current_value} {threshold.comparison} threshold {threshold.warning_threshold if level == AlertLevel.WARNING else threshold.critical_threshold}",
            metric_name=threshold.metric_name,
            current_value=current_value,
            threshold_value=threshold.warning_threshold if level == AlertLevel.WARNING else threshold.critical_threshold
        )
        
        self.alerts.append(alert)
        
        # Call alert callbacks
        for callback in self.alert_callbacks:
            try:
                callback(alert)
            except Exception as e:
                logger.error(f"Alert callback failed: {e}")
        
        logger.warning(f"Alert created: {alert.title} - {alert.description}")
    
    def _cleanup_old_data(self):
        """Clean up old metrics and alerts"""
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        # Clean old alerts
        self.alerts = [a for a in self.alerts if a.timestamp > cutoff_time]
        
        # Metrics are automatically cleaned by deque maxlen
    
    def record_request(self, response_time: float, error: bool = False):
        """Record application request metrics"""
        self.request_times.append(response_time)
        self.request_count += 1
        if error:
            self.error_count += 1
        
        # Reset counters periodically
        if time.time() - self.last_reset_time > 3600:  # Every hour
            self.request_count = 0
            self.error_count = 0
            self.last_reset_time = time.time()
    
    def add_alert_callback(self, callback: Callable[[Alert], None]):
        """Add alert callback function"""
        self.alert_callbacks.append(callback)
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current metric values"""
        if not self.metrics_history:
            return {}
        
        # Get latest metric for each name
        latest_metrics = {}
        for metric in reversed(self.metrics_history):
            if metric.name not in latest_metrics:
                latest_metrics[metric.name] = metric
        
        return {name: metric.value for name, metric in latest_metrics.items()}
    
    def get_metric_history(self, metric_name: str, hours: int = 1) -> List[Metric]:
        """Get historical data for a metric"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [m for m in self.metrics_history if 
                m.name == metric_name and m.timestamp > cutoff_time]
    
    def get_active_alerts(self) -> List[Alert]:
        """Get currently active alerts"""
        return [a for a in self.alerts if not a.resolved]
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for monitoring dashboard"""
        current_metrics = self.get_current_metrics()
        active_alerts = self.get_active_alerts()
        
        # Calculate health score
        health_score = self._calculate_health_score(current_metrics, active_alerts)
        
        return {
            'health_score': health_score,
            'current_metrics': current_metrics,
            'active_alerts': [a.to_dict() for a in active_alerts],
            'total_alerts_24h': len([a for a in self.alerts if 
                                   (datetime.now() - a.timestamp).total_seconds() < 86400]),
            'system_info': self.metric_collector.system_info,
            'monitoring_active': self.monitoring_active,
            'last_collection': max([m.timestamp for m in self.metrics_history]) if self.metrics_history else None
        }
    
    def _calculate_health_score(self, metrics: Dict[str, Any], alerts: List[Alert]) -> int:
        """Calculate overall health score (0-100)"""
        base_score = 100
        
        # Deduct points for active alerts
        for alert in alerts:
            if alert.level == AlertLevel.CRITICAL:
                base_score -= 20
            elif alert.level == AlertLevel.WARNING:
                base_score -= 10
            else:
                base_score -= 5
        
        # Deduct points for concerning metrics
        cpu_usage = metrics.get('system.cpu.usage_percent', 0)
        memory_usage = metrics.get('system.memory.usage_percent', 0)
        
        if cpu_usage > 90:
            base_score -= 15
        elif cpu_usage > 70:
            base_score -= 5
        
        if memory_usage > 95:
            base_score -= 15
        elif memory_usage > 80:
            base_score -= 5
        
        return max(0, base_score)

class AlertManager:
    """Manage and dispatch alerts"""
    
    def __init__(self):
        self.webhooks: List[str] = []
        self.email_recipients: List[str] = []
        
    def add_webhook(self, url: str):
        """Add webhook URL for alert notifications"""
        self.webhooks.append(url)
    
    def add_email_recipient(self, email: str):
        """Add email recipient for alerts"""
        self.email_recipients.append(email)
    
    async def send_alert(self, alert: Alert):
        """Send alert through configured channels"""
        # Send to webhooks
        for webhook_url in self.webhooks:
            await self._send_webhook(webhook_url, alert)
        
        # Send emails (would require email service integration)
        for email in self.email_recipients:
            await self._send_email(email, alert)
    
    async def _send_webhook(self, url: str, alert: Alert):
        """Send alert to webhook"""
        import aiohttp
        
        try:
            payload = {
                'alert': alert.to_dict(),
                'timestamp': datetime.now().isoformat()
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload, timeout=10) as response:
                    if response.status == 200:
                        logger.info(f"Alert sent to webhook: {url}")
                    else:
                        logger.error(f"Webhook failed: {response.status}")
        
        except Exception as e:
            logger.error(f"Failed to send webhook alert: {e}")
    
    async def _send_email(self, email: str, alert: Alert):
        """Send alert via email (placeholder)"""
        # This would integrate with email service (SendGrid, AWS SES, etc.)
        logger.info(f"Would send email alert to {email}: {alert.title}")

# Factory function
def create_performance_monitor(engine: Optional[Engine] = None, 
                             redis_url: Optional[str] = None,
                             **kwargs) -> PerformanceMonitor:
    """Create configured performance monitor"""
    return PerformanceMonitor(engine=engine, redis_url=redis_url, **kwargs)

# Example usage
if __name__ == "__main__":
    import asyncio
    from sqlalchemy import create_engine
    
    async def main():
        # Create monitor
        DATABASE_URL = "postgresql://user:pass@localhost/test_db"
        engine = create_engine(DATABASE_URL)
        
        monitor = create_performance_monitor(engine=engine)
        
        # Add alert callback
        def alert_handler(alert: Alert):
            print(f"ALERT: {alert.level.value.upper()} - {alert.title}")
        
        monitor.add_alert_callback(alert_handler)
        
        # Start monitoring
        await monitor.start_monitoring()
        
        # Simulate some requests
        for i in range(10):
            start_time = time.time()
            await asyncio.sleep(0.1)  # Simulate work
            response_time = time.time() - start_time
            
            monitor.record_request(response_time, error=(i % 5 == 0))
        
        # Get dashboard data
        dashboard = monitor.get_dashboard_data()
        print(f"Health Score: {dashboard['health_score']}")
        print(f"Active Alerts: {len(dashboard['active_alerts'])}")
        
        # Wait a bit then stop
        await asyncio.sleep(5)
        monitor.stop_monitoring()
    
    asyncio.run(main())