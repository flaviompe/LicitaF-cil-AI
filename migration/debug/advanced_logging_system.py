#!/usr/bin/env python3
"""
Advanced Logging System for SQLite to Neon Migration
Comprehensive structured logging with context, tracing, and analysis
"""

import logging
import json
import time
import threading
import asyncio
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from collections import deque, defaultdict
from contextvars import ContextVar
from enum import Enum
import uuid
import os
import traceback
from pathlib import Path

import structlog
from pythonjsonlogger import jsonlogger
from elasticsearch import Elasticsearch
import aiofiles

# Context variables for distributed tracing
request_id_var: ContextVar[Optional[str]] = ContextVar('request_id', default=None)
user_id_var: ContextVar[Optional[str]] = ContextVar('user_id', default=None)
session_id_var: ContextVar[Optional[str]] = ContextVar('session_id', default=None)
correlation_id_var: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)

class LogLevel(Enum):
    """Enhanced log levels"""
    TRACE = 5
    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    CRITICAL = 50
    AUDIT = 60

class EventType(Enum):
    """Application event types"""
    REQUEST = "request"
    RESPONSE = "response"
    DATABASE_QUERY = "database_query"
    CACHE_ACCESS = "cache_access"
    EXTERNAL_API = "external_api"
    BUSINESS_EVENT = "business_event"
    SECURITY_EVENT = "security_event"
    PERFORMANCE_EVENT = "performance_event"
    ERROR_EVENT = "error_event"
    MIGRATION_EVENT = "migration_event"

@dataclass
class LogEntry:
    """Structured log entry"""
    timestamp: datetime
    level: str
    logger_name: str
    message: str
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    correlation_id: Optional[str] = None
    event_type: Optional[str] = None
    duration_ms: Optional[float] = None
    status_code: Optional[int] = None
    error_code: Optional[str] = None
    stack_trace: Optional[str] = None
    extra_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        return {k: v for k, v in result.items() if v is not None}

class EnhancedJSONFormatter(jsonlogger.JsonFormatter):
    """Enhanced JSON formatter with context and metadata"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.hostname = os.uname().nodename if hasattr(os, 'uname') else 'unknown'
        self.process_id = os.getpid()
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]):
        super().add_fields(log_record, record, message_dict)
        
        # Core metadata
        log_record['@timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['hostname'] = self.hostname
        log_record['process_id'] = self.process_id
        log_record['thread_id'] = record.thread
        
        # Context variables
        log_record['request_id'] = request_id_var.get()
        log_record['user_id'] = user_id_var.get()
        log_record['session_id'] = session_id_var.get()
        log_record['correlation_id'] = correlation_id_var.get()
        
        # Source code information
        log_record['source'] = {
            'file': record.pathname,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Extract extra fields from record
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'message']:
                log_record[key] = value

class ContextualLogger:
    """Logger with automatic context injection"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(name)
        
    def _log_with_context(self, level: int, message: str, **kwargs):
        """Log with automatic context injection"""
        extra = {
            'event_type': kwargs.pop('event_type', None),
            'duration_ms': kwargs.pop('duration_ms', None),
            'status_code': kwargs.pop('status_code', None),
            'error_code': kwargs.pop('error_code', None),
            **kwargs
        }
        
        self.logger.log(level, message, extra=extra)
    
    def trace(self, message: str, **kwargs):
        self._log_with_context(LogLevel.TRACE.value, message, **kwargs)
    
    def debug(self, message: str, **kwargs):
        self._log_with_context(LogLevel.DEBUG.value, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self._log_with_context(LogLevel.INFO.value, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log_with_context(LogLevel.WARNING.value, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log_with_context(LogLevel.ERROR.value, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._log_with_context(LogLevel.CRITICAL.value, message, **kwargs)
    
    def audit(self, message: str, **kwargs):
        self._log_with_context(LogLevel.AUDIT.value, message, **kwargs)
    
    def request_started(self, method: str, url: str, **kwargs):
        """Log request start"""
        self.info(
            f"Request started: {method} {url}",
            event_type=EventType.REQUEST.value,
            http_method=method,
            url=url,
            **kwargs
        )
    
    def request_completed(self, method: str, url: str, status_code: int, duration_ms: float, **kwargs):
        """Log request completion"""
        self.info(
            f"Request completed: {method} {url} - {status_code} in {duration_ms:.2f}ms",
            event_type=EventType.RESPONSE.value,
            http_method=method,
            url=url,
            status_code=status_code,
            duration_ms=duration_ms,
            **kwargs
        )
    
    def database_query(self, query: str, duration_ms: float, rows_affected: int = None, **kwargs):
        """Log database query"""
        self.debug(
            f"Database query executed in {duration_ms:.2f}ms",
            event_type=EventType.DATABASE_QUERY.value,
            query=query[:500] + "..." if len(query) > 500 else query,
            duration_ms=duration_ms,
            rows_affected=rows_affected,
            **kwargs
        )
    
    def cache_access(self, operation: str, key: str, hit: bool, duration_ms: float = None, **kwargs):
        """Log cache access"""
        self.debug(
            f"Cache {operation}: {'HIT' if hit else 'MISS'} for {key}",
            event_type=EventType.CACHE_ACCESS.value,
            cache_operation=operation,
            cache_key=key,
            cache_hit=hit,
            duration_ms=duration_ms,
            **kwargs
        )
    
    def business_event(self, event_name: str, entity_type: str, entity_id: str, **kwargs):
        """Log business events"""
        self.info(
            f"Business event: {event_name} for {entity_type}:{entity_id}",
            event_type=EventType.BUSINESS_EVENT.value,
            event_name=event_name,
            entity_type=entity_type,
            entity_id=entity_id,
            **kwargs
        )
    
    def security_event(self, event_name: str, risk_level: str, **kwargs):
        """Log security events"""
        level = LogLevel.CRITICAL.value if risk_level == 'high' else LogLevel.WARNING.value
        self._log_with_context(
            level,
            f"Security event: {event_name} (risk: {risk_level})",
            event_type=EventType.SECURITY_EVENT.value,
            security_event=event_name,
            risk_level=risk_level,
            **kwargs
        )
    
    def migration_event(self, phase: str, status: str, progress: float = None, **kwargs):
        """Log migration events"""
        self.info(
            f"Migration {phase}: {status}" + (f" ({progress:.1f}%)" if progress else ""),
            event_type=EventType.MIGRATION_EVENT.value,
            migration_phase=phase,
            migration_status=status,
            migration_progress=progress,
            **kwargs
        )

class LogAggregator:
    """Aggregate and analyze logs in real-time"""
    
    def __init__(self, window_minutes: int = 5):
        self.window_minutes = window_minutes
        self.log_buffer: deque = deque()
        self.metrics: Dict[str, Any] = defaultdict(int)
        self.last_reset = time.time()
        self.lock = threading.Lock()
    
    def add_log_entry(self, log_entry: LogEntry):
        """Add log entry to aggregation buffer"""
        with self.lock:
            self.log_buffer.append(log_entry)
            
            # Update metrics
            self.metrics[f"count_level_{log_entry.level.lower()}"] += 1
            if log_entry.event_type:
                self.metrics[f"count_event_{log_entry.event_type}"] += 1
            
            # Clean old entries
            cutoff_time = datetime.now() - timedelta(minutes=self.window_minutes)
            while self.log_buffer and self.log_buffer[0].timestamp < cutoff_time:
                self.log_buffer.popleft()
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of errors in current window"""
        with self.lock:
            errors = [entry for entry in self.log_buffer if entry.level in ['ERROR', 'CRITICAL']]
            
            error_summary = {
                'total_errors': len(errors),
                'error_rate_per_minute': len(errors) / self.window_minutes,
                'errors_by_type': defaultdict(int),
                'top_error_messages': defaultdict(int)
            }
            
            for error in errors:
                if error.error_code:
                    error_summary['errors_by_type'][error.error_code] += 1
                error_summary['top_error_messages'][error.message] += 1
            
            return error_summary
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance metrics summary"""
        with self.lock:
            performance_entries = [
                entry for entry in self.log_buffer 
                if entry.duration_ms is not None
            ]
            
            if not performance_entries:
                return {'no_performance_data': True}
            
            durations = [entry.duration_ms for entry in performance_entries]
            durations.sort()
            
            return {
                'total_requests': len(performance_entries),
                'avg_response_time_ms': sum(durations) / len(durations),
                'median_response_time_ms': durations[len(durations) // 2],
                'p95_response_time_ms': durations[int(len(durations) * 0.95)],
                'p99_response_time_ms': durations[int(len(durations) * 0.99)],
                'slowest_requests': [
                    {'message': entry.message, 'duration_ms': entry.duration_ms}
                    for entry in sorted(performance_entries, key=lambda x: x.duration_ms, reverse=True)[:5]
                ]
            }

class ElasticsearchHandler(logging.Handler):
    """Send logs to Elasticsearch for advanced analysis"""
    
    def __init__(self, elasticsearch_url: str, index_prefix: str = "licitacoes-logs"):
        super().__init__()
        self.es_client = Elasticsearch([elasticsearch_url])
        self.index_prefix = index_prefix
        self.buffer: List[Dict[str, Any]] = []
        self.buffer_size = 100
        self.lock = threading.Lock()
        
    def emit(self, record: logging.LogRecord):
        """Emit log record to Elasticsearch"""
        try:
            # Format log record
            log_entry = {
                '@timestamp': datetime.utcnow().isoformat(),
                'level': record.levelname,
                'logger': record.name,
                'message': record.getMessage(),
                'hostname': os.uname().nodename if hasattr(os, 'uname') else 'unknown',
                'process_id': os.getpid(),
                'thread_id': record.thread,
                'source': {
                    'file': record.pathname,
                    'function': record.funcName,
                    'line': record.lineno
                }
            }
            
            # Add context
            if hasattr(record, 'request_id'):
                log_entry['request_id'] = record.request_id
            if hasattr(record, 'user_id'):
                log_entry['user_id'] = record.user_id
                
            # Add extra fields
            for key, value in record.__dict__.items():
                if key.startswith('extra_'):
                    log_entry[key[6:]] = value  # Remove 'extra_' prefix
            
            with self.lock:
                self.buffer.append(log_entry)
                
                # Flush buffer if full
                if len(self.buffer) >= self.buffer_size:
                    self._flush_buffer()
                    
        except Exception as e:
            # Don't let logging errors break the application
            print(f"Failed to emit log to Elasticsearch: {e}")
    
    def _flush_buffer(self):
        """Flush buffer to Elasticsearch"""
        if not self.buffer:
            return
            
        try:
            # Prepare bulk index
            actions = []
            index_name = f"{self.index_prefix}-{datetime.now().strftime('%Y-%m-%d')}"
            
            for log_entry in self.buffer:
                actions.append({
                    '_index': index_name,
                    '_source': log_entry
                })
            
            # Bulk index
            from elasticsearch.helpers import bulk
            bulk(self.es_client, actions)
            
            self.buffer.clear()
            
        except Exception as e:
            print(f"Failed to flush logs to Elasticsearch: {e}")
    
    def flush(self):
        """Manually flush buffer"""
        with self.lock:
            self._flush_buffer()

class LogAnalyzer:
    """Advanced log analysis and insights"""
    
    def __init__(self, log_aggregator: LogAggregator):
        self.aggregator = log_aggregator
    
    def detect_anomalies(self) -> List[Dict[str, Any]]:
        """Detect anomalies in log patterns"""
        anomalies = []
        
        # Error rate anomaly
        error_summary = self.aggregator.get_error_summary()
        if error_summary['error_rate_per_minute'] > 10:  # > 10 errors per minute
            anomalies.append({
                'type': 'high_error_rate',
                'severity': 'high',
                'description': f"High error rate: {error_summary['error_rate_per_minute']:.1f}/min",
                'recommendation': 'Investigate error causes immediately'
            })
        
        # Performance anomaly
        perf_summary = self.aggregator.get_performance_summary()
        if not perf_summary.get('no_performance_data') and perf_summary.get('p95_response_time_ms', 0) > 5000:
            anomalies.append({
                'type': 'slow_response_time',
                'severity': 'medium',
                'description': f"Slow response times: P95 = {perf_summary['p95_response_time_ms']:.0f}ms",
                'recommendation': 'Check for performance bottlenecks'
            })
        
        return anomalies
    
    def generate_insights(self) -> Dict[str, Any]:
        """Generate insights from log analysis"""
        return {
            'timestamp': datetime.now().isoformat(),
            'error_summary': self.aggregator.get_error_summary(),
            'performance_summary': self.aggregator.get_performance_summary(),
            'anomalies': self.detect_anomalies(),
            'recommendations': self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on log analysis"""
        recommendations = []
        
        error_summary = self.aggregator.get_error_summary()
        
        # Error-based recommendations
        if error_summary['total_errors'] > 0:
            top_errors = sorted(error_summary['top_error_messages'].items(), 
                              key=lambda x: x[1], reverse=True)[:3]
            for error_msg, count in top_errors:
                if count > 5:
                    recommendations.append(f"Investigate recurring error: '{error_msg[:100]}...' (occurred {count} times)")
        
        # Performance recommendations
        perf_summary = self.aggregator.get_performance_summary()
        if not perf_summary.get('no_performance_data'):
            if perf_summary.get('p95_response_time_ms', 0) > 2000:
                recommendations.append("Consider optimizing slow endpoints for better performance")
        
        return recommendations

class LoggingManager:
    """Central logging management system"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.aggregator = LogAggregator(window_minutes=config.get('aggregation_window', 5))
        self.analyzer = LogAnalyzer(self.aggregator)
        self.loggers: Dict[str, ContextualLogger] = {}
        
        self._setup_logging()
        
    def _setup_logging(self):
        """Setup logging configuration"""
        
        # Create logs directory
        log_dir = Path(self.config.get('log_dir', '/var/log/licitacoes'))
        log_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(self.config.get('level', logging.INFO))
        
        # Clear existing handlers
        root_logger.handlers.clear()
        
        # Console handler
        if self.config.get('console_logging', True):
            console_handler = logging.StreamHandler()
            console_formatter = EnhancedJSONFormatter(
                fmt='%(message)s'
            )
            console_handler.setFormatter(console_formatter)
            root_logger.addHandler(console_handler)
        
        # File handler
        if self.config.get('file_logging', True):
            file_handler = logging.handlers.RotatingFileHandler(
                log_dir / 'application.log',
                maxBytes=100*1024*1024,  # 100MB
                backupCount=10
            )
            file_formatter = EnhancedJSONFormatter(
                fmt='%(message)s'
            )
            file_handler.setFormatter(file_formatter)
            root_logger.addHandler(file_handler)
        
        # Elasticsearch handler
        if self.config.get('elasticsearch_url'):
            es_handler = ElasticsearchHandler(
                self.config['elasticsearch_url'],
                self.config.get('elasticsearch_index_prefix', 'licitacoes-logs')
            )
            es_handler.setLevel(logging.INFO)
            root_logger.addHandler(es_handler)
    
    def get_logger(self, name: str) -> ContextualLogger:
        """Get or create contextual logger"""
        if name not in self.loggers:
            self.loggers[name] = ContextualLogger(name)
        return self.loggers[name]
    
    def get_insights(self) -> Dict[str, Any]:
        """Get current logging insights"""
        return self.analyzer.generate_insights()

# Context managers for automatic logging
class RequestContext:
    """Context manager for request logging"""
    
    def __init__(self, logger: ContextualLogger, method: str, url: str):
        self.logger = logger
        self.method = method
        self.url = url
        self.start_time = None
        self.request_id = str(uuid.uuid4())
        
    def __enter__(self):
        self.start_time = time.time()
        request_id_var.set(self.request_id)
        
        self.logger.request_started(self.method, self.url)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000
        
        if exc_type:
            self.logger.error(
                f"Request failed: {self.method} {self.url}",
                event_type=EventType.ERROR_EVENT.value,
                error_type=exc_type.__name__,
                error_message=str(exc_val),
                duration_ms=duration_ms,
                stack_trace=traceback.format_exc()
            )
        else:
            self.logger.request_completed(
                self.method, self.url, 200, duration_ms
            )

class DatabaseContext:
    """Context manager for database operation logging"""
    
    def __init__(self, logger: ContextualLogger, operation: str):
        self.logger = logger
        self.operation = operation
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration_ms = (time.time() - self.start_time) * 1000
        
        if exc_type:
            self.logger.error(
                f"Database operation failed: {self.operation}",
                event_type=EventType.DATABASE_QUERY.value,
                database_operation=self.operation,
                error_type=exc_type.__name__,
                error_message=str(exc_val),
                duration_ms=duration_ms
            )
        else:
            self.logger.database_query(
                self.operation, duration_ms
            )

# Factory functions
def create_logging_manager(config: Dict[str, Any] = None) -> LoggingManager:
    """Create configured logging manager"""
    
    default_config = {
        'level': logging.INFO,
        'log_dir': '/var/log/licitacoes',
        'console_logging': True,
        'file_logging': True,
        'aggregation_window': 5,  # minutes
        'elasticsearch_url': None,
        'elasticsearch_index_prefix': 'licitacoes-logs'
    }
    
    if config:
        default_config.update(config)
    
    return LoggingManager(default_config)

# Example usage
if __name__ == "__main__":
    # Setup logging
    config = {
        'level': logging.DEBUG,
        'log_dir': './logs',
        'console_logging': True,
        'file_logging': True
    }
    
    logging_manager = create_logging_manager(config)
    logger = logging_manager.get_logger(__name__)
    
    # Example usage
    with RequestContext(logger, 'GET', '/api/opportunities'):
        logger.info("Processing request")
        
        with DatabaseContext(logger, 'SELECT * FROM opportunities'):
            time.sleep(0.1)  # Simulate query time
        
        logger.business_event("opportunity_viewed", "opportunity", "123")
    
    # Get insights
    insights = logging_manager.get_insights()
    print(json.dumps(insights, indent=2))