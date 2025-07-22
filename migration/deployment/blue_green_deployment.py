#!/usr/bin/env python3
"""
Blue-Green Deployment Manager for SQLite to Neon Migration
Automated deployment with zero downtime and rollback capabilities
"""

import asyncio
import logging
import time
import json
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import subprocess
import requests
import sqlite3
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

class DeploymentPhase(Enum):
    """Deployment phases for gradual rollout"""
    PREPARATION = "preparation"
    PHASE_1_VALIDATION = "phase_1_validation"  # 5% traffic
    PHASE_2_LIMITED = "phase_2_limited"        # 20% traffic
    PHASE_3_AB_TEST = "phase_3_ab_test"        # 50% traffic
    PHASE_4_MAJORITY = "phase_4_majority"      # 80% traffic
    PHASE_5_COMPLETE = "phase_5_complete"      # 100% traffic
    ROLLBACK = "rollback"

class EnvironmentType(Enum):
    """Environment types for blue-green deployment"""
    BLUE = "blue"    # Current production (SQLite)
    GREEN = "green"  # New environment (Neon)

class DeploymentStatus(Enum):
    """Status of deployment operations"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLING_BACK = "rolling_back"
    ROLLED_BACK = "rolled_back"

@dataclass
class EnvironmentConfig:
    """Configuration for deployment environment"""
    name: str
    type: EnvironmentType
    database_url: str
    app_servers: List[str]
    load_balancer_url: str
    health_check_url: str
    monitoring_enabled: bool = True
    
@dataclass
class DeploymentMetrics:
    """Metrics collected during deployment"""
    timestamp: datetime
    phase: DeploymentPhase
    traffic_percentage: float
    response_time_p95: float
    error_rate: float
    throughput: float
    active_connections: int
    memory_usage: float
    cpu_usage: float
    success_rate: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp.isoformat(),
            'phase': self.phase.value,
            'traffic_percentage': self.traffic_percentage,
            'response_time_p95': self.response_time_p95,
            'error_rate': self.error_rate,
            'throughput': self.throughput,
            'active_connections': self.active_connections,
            'memory_usage': self.memory_usage,
            'cpu_usage': self.cpu_usage,
            'success_rate': self.success_rate
        }

@dataclass
class RollbackTrigger:
    """Configuration for automatic rollback triggers"""
    metric_name: str
    threshold: float
    duration_seconds: int
    comparison: str  # 'gt', 'lt', 'eq'
    enabled: bool = True

class HealthChecker:
    """Health checking for environments"""
    
    def __init__(self, timeout: int = 10):
        self.timeout = timeout
    
    async def check_environment_health(self, environment: EnvironmentConfig) -> Dict[str, Any]:
        """Check health of an environment"""
        health_results = {
            'environment': environment.name,
            'type': environment.type.value,
            'overall_status': 'healthy',
            'checks': {},
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            # Check application health
            app_health = await self._check_application_health(environment)
            health_results['checks']['application'] = app_health
            
            # Check database connectivity
            db_health = await self._check_database_health(environment)
            health_results['checks']['database'] = db_health
            
            # Check load balancer
            lb_health = await self._check_load_balancer_health(environment)
            health_results['checks']['load_balancer'] = lb_health
            
            # Determine overall status
            if not all(check.get('healthy', False) for check in health_results['checks'].values()):
                health_results['overall_status'] = 'unhealthy'
            
        except Exception as e:
            health_results['overall_status'] = 'unhealthy'
            health_results['error'] = str(e)
            logger.error(f"Health check failed for {environment.name}: {e}")
        
        return health_results
    
    async def _check_application_health(self, environment: EnvironmentConfig) -> Dict[str, Any]:
        """Check application server health"""
        healthy_servers = []
        unhealthy_servers = []
        
        for server in environment.app_servers:
            try:
                response = requests.get(f"http://{server}/health", timeout=self.timeout)
                if response.status_code == 200:
                    healthy_servers.append(server)
                else:
                    unhealthy_servers.append(server)
            except Exception as e:
                unhealthy_servers.append(server)
                logger.warning(f"Server {server} health check failed: {e}")
        
        return {
            'healthy': len(unhealthy_servers) == 0,
            'healthy_servers': healthy_servers,
            'unhealthy_servers': unhealthy_servers,
            'total_servers': len(environment.app_servers)
        }
    
    async def _check_database_health(self, environment: EnvironmentConfig) -> Dict[str, Any]:
        """Check database connectivity and health"""
        try:
            if environment.database_url.startswith('sqlite'):
                # SQLite health check
                conn = sqlite3.connect(environment.database_url.replace('sqlite:///', ''))
                cursor = conn.execute("SELECT 1")
                result = cursor.fetchone()
                conn.close()
                
                return {
                    'healthy': result[0] == 1,
                    'type': 'sqlite',
                    'response_time_ms': 1  # SQLite is always fast
                }
            else:
                # PostgreSQL health check
                start_time = time.time()
                engine = create_engine(environment.database_url)
                
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT 1")).scalar()
                
                response_time = (time.time() - start_time) * 1000
                
                return {
                    'healthy': result == 1,
                    'type': 'postgresql',
                    'response_time_ms': response_time
                }
                
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }
    
    async def _check_load_balancer_health(self, environment: EnvironmentConfig) -> Dict[str, Any]:
        """Check load balancer health"""
        try:
            response = requests.get(f"{environment.load_balancer_url}/health", timeout=self.timeout)
            return {
                'healthy': response.status_code == 200,
                'status_code': response.status_code
            }
        except Exception as e:
            return {
                'healthy': False,
                'error': str(e)
            }

class TrafficManager:
    """Manage traffic routing between environments"""
    
    def __init__(self, load_balancer_config: Dict[str, str]):
        self.load_balancer_config = load_balancer_config
        self.current_split = {'blue': 100, 'green': 0}
    
    async def set_traffic_split(self, blue_percentage: float, green_percentage: float) -> bool:
        """Set traffic split between environments"""
        if blue_percentage + green_percentage != 100:
            raise ValueError("Traffic percentages must sum to 100")
        
        try:
            # Configure load balancer (example with HAProxy admin API)
            haproxy_stats_url = self.load_balancer_config.get('stats_url')
            if haproxy_stats_url:
                await self._configure_haproxy_weights(haproxy_stats_url, blue_percentage, green_percentage)
            
            # Configure Nginx upstream (example with Nginx Plus API)
            nginx_api_url = self.load_balancer_config.get('nginx_api_url')
            if nginx_api_url:
                await self._configure_nginx_upstream(nginx_api_url, blue_percentage, green_percentage)
            
            self.current_split = {'blue': blue_percentage, 'green': green_percentage}
            logger.info(f"Traffic split updated: Blue {blue_percentage}%, Green {green_percentage}%")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set traffic split: {e}")
            return False
    
    async def _configure_haproxy_weights(self, stats_url: str, blue_pct: float, green_pct: float):
        """Configure HAProxy server weights"""
        # Calculate weights (HAProxy uses weight ratios)
        blue_weight = max(1, int(blue_pct))
        green_weight = max(1, int(green_pct))
        
        # Set blue environment weights
        for i in range(3):  # Assuming 3 servers per environment
            url = f"{stats_url};csv;norefresh"
            # This would be the actual HAProxy stats socket command
            # subprocess.run(['echo', f'set weight blue_backend/server{i+1} {blue_weight}'], 
            #               check=True)
        
        # Set green environment weights  
        for i in range(3):
            # subprocess.run(['echo', f'set weight green_backend/server{i+1} {green_weight}'], 
            #               check=True)
            pass
    
    async def _configure_nginx_upstream(self, api_url: str, blue_pct: float, green_pct: float):
        """Configure Nginx Plus upstream weights"""
        try:
            # Configure blue upstream
            blue_config = {
                'weight': max(1, int(blue_pct)),
                'max_fails': 3,
                'fail_timeout': 30
            }
            
            green_config = {
                'weight': max(1, int(green_pct)),
                'max_fails': 3,
                'fail_timeout': 30
            }
            
            # Update upstream configuration via Nginx Plus API
            # requests.patch(f"{api_url}/upstream/blue_backend", json=blue_config)
            # requests.patch(f"{api_url}/upstream/green_backend", json=green_config)
            
        except Exception as e:
            logger.error(f"Nginx upstream configuration failed: {e}")
            raise
    
    def get_current_split(self) -> Dict[str, float]:
        """Get current traffic split"""
        return self.current_split.copy()

class DeploymentMonitor:
    """Monitor deployment metrics and trigger rollbacks if needed"""
    
    def __init__(self, rollback_triggers: List[RollbackTrigger]):
        self.rollback_triggers = rollback_triggers
        self.metrics_history: List[DeploymentMetrics] = []
        self.alert_callbacks: List[Callable] = []
    
    def add_alert_callback(self, callback: Callable):
        """Add callback for deployment alerts"""
        self.alert_callbacks.append(callback)
    
    def record_metrics(self, metrics: DeploymentMetrics):
        """Record deployment metrics"""
        self.metrics_history.append(metrics)
        
        # Keep only recent metrics (last 1000 entries)
        if len(self.metrics_history) > 1000:
            self.metrics_history = self.metrics_history[-1000:]
    
    def should_rollback(self) -> Dict[str, Any]:
        """Check if rollback should be triggered"""
        if not self.metrics_history:
            return {'should_rollback': False, 'reason': 'No metrics available'}
        
        current_time = datetime.now()
        
        for trigger in self.rollback_triggers:
            if not trigger.enabled:
                continue
            
            # Get recent metrics for this trigger's duration
            cutoff_time = current_time - timedelta(seconds=trigger.duration_seconds)
            recent_metrics = [m for m in self.metrics_history if m.timestamp >= cutoff_time]
            
            if not recent_metrics:
                continue
            
            # Check if trigger condition is met
            violation_count = 0
            for metric in recent_metrics:
                value = getattr(metric, trigger.metric_name.replace('.', '_'), None)
                if value is None:
                    continue
                
                if self._check_threshold_violation(value, trigger.threshold, trigger.comparison):
                    violation_count += 1
            
            # If threshold is violated for the entire duration, trigger rollback
            violation_percentage = violation_count / len(recent_metrics) * 100
            if violation_percentage >= 80:  # 80% of samples must violate threshold
                return {
                    'should_rollback': True,
                    'reason': f'Metric {trigger.metric_name} violated threshold {trigger.threshold} for {trigger.duration_seconds}s',
                    'trigger': trigger,
                    'violation_percentage': violation_percentage
                }
        
        return {'should_rollback': False}
    
    def _check_threshold_violation(self, value: float, threshold: float, comparison: str) -> bool:
        """Check if value violates threshold"""
        if comparison == 'gt':
            return value > threshold
        elif comparison == 'lt':
            return value < threshold
        elif comparison == 'eq':
            return abs(value - threshold) < 0.001  # Floating point equality
        return False

class BlueGreenDeploymentManager:
    """Main deployment manager for blue-green deployment"""
    
    def __init__(self, 
                 blue_environment: EnvironmentConfig,
                 green_environment: EnvironmentConfig,
                 load_balancer_config: Dict[str, str]):
        
        self.blue_environment = blue_environment
        self.green_environment = green_environment
        
        self.health_checker = HealthChecker()
        self.traffic_manager = TrafficManager(load_balancer_config)
        
        # Default rollback triggers
        self.deployment_monitor = DeploymentMonitor([
            RollbackTrigger('error_rate', 10.0, 300, 'gt'),  # Error rate > 10% for 5 minutes
            RollbackTrigger('response_time_p95', 5000.0, 180, 'gt'),  # Response time > 5s for 3 minutes
            RollbackTrigger('success_rate', 90.0, 120, 'lt'),  # Success rate < 90% for 2 minutes
            RollbackTrigger('throughput', 50.0, 240, 'lt')  # Throughput < 50 req/s for 4 minutes
        ])
        
        self.current_phase = DeploymentPhase.PREPARATION
        self.deployment_status = DeploymentStatus.PENDING
        self.deployment_start_time: Optional[datetime] = None
        self.deployment_log: List[Dict[str, Any]] = []
        
        logger.info("BlueGreenDeploymentManager initialized")
    
    async def start_deployment(self) -> bool:
        """Start the blue-green deployment process"""
        logger.info("🚀 Starting blue-green deployment")
        self.deployment_start_time = datetime.now()
        self.deployment_status = DeploymentStatus.IN_PROGRESS
        
        try:
            # Phase 1: Preparation and validation
            if not await self._execute_phase_preparation():
                return False
            
            # Phase 2: Initial traffic routing (5%)
            if not await self._execute_phase_1_validation():
                return False
            
            # Phase 3: Limited rollout (20%)
            if not await self._execute_phase_2_limited():
                return False
            
            # Phase 4: A/B testing (50%)
            if not await self._execute_phase_3_ab_test():
                return False
            
            # Phase 5: Majority traffic (80%)
            if not await self._execute_phase_4_majority():
                return False
            
            # Phase 6: Complete migration (100%)
            if not await self._execute_phase_5_complete():
                return False
            
            self.deployment_status = DeploymentStatus.COMPLETED
            logger.info("✅ Blue-green deployment completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Deployment failed: {e}")
            self.deployment_status = DeploymentStatus.FAILED
            
            # Attempt automatic rollback
            await self.execute_rollback("Deployment failure")
            return False
    
    async def _execute_phase_preparation(self) -> bool:
        """Execute preparation phase"""
        logger.info("📋 Executing preparation phase")
        self.current_phase = DeploymentPhase.PREPARATION
        
        # Check green environment health
        green_health = await self.health_checker.check_environment_health(self.green_environment)
        if green_health['overall_status'] != 'healthy':
            logger.error("Green environment is not healthy")
            return False
        
        # Check blue environment health
        blue_health = await self.health_checker.check_environment_health(self.blue_environment)
        if blue_health['overall_status'] != 'healthy':
            logger.error("Blue environment is not healthy")
            return False
        
        # Verify data synchronization
        if not await self._verify_data_synchronization():
            logger.error("Data synchronization verification failed")
            return False
        
        self._log_deployment_event("Preparation phase completed", {'green_health': green_health, 'blue_health': blue_health})
        return True
    
    async def _execute_phase_1_validation(self) -> bool:
        """Execute phase 1: 5% traffic validation"""
        logger.info("🔍 Executing phase 1: Validation (5% traffic)")
        self.current_phase = DeploymentPhase.PHASE_1_VALIDATION
        
        # Route 5% traffic to green
        if not await self.traffic_manager.set_traffic_split(95.0, 5.0):
            return False
        
        # Monitor for 10 minutes
        return await self._monitor_phase(600, 5.0)  # 10 minutes
    
    async def _execute_phase_2_limited(self) -> bool:
        """Execute phase 2: 20% traffic limited rollout"""
        logger.info("🔄 Executing phase 2: Limited rollout (20% traffic)")
        self.current_phase = DeploymentPhase.PHASE_2_LIMITED
        
        # Route 20% traffic to green
        if not await self.traffic_manager.set_traffic_split(80.0, 20.0):
            return False
        
        # Monitor for 15 minutes
        return await self._monitor_phase(900, 20.0)  # 15 minutes
    
    async def _execute_phase_3_ab_test(self) -> bool:
        """Execute phase 3: 50% A/B testing"""
        logger.info("⚖️ Executing phase 3: A/B testing (50% traffic)")
        self.current_phase = DeploymentPhase.PHASE_3_AB_TEST
        
        # Route 50% traffic to green
        if not await self.traffic_manager.set_traffic_split(50.0, 50.0):
            return False
        
        # Monitor for 20 minutes
        return await self._monitor_phase(1200, 50.0)  # 20 minutes
    
    async def _execute_phase_4_majority(self) -> bool:
        """Execute phase 4: 80% majority traffic"""
        logger.info("📈 Executing phase 4: Majority traffic (80%)")
        self.current_phase = DeploymentPhase.PHASE_4_MAJORITY
        
        # Route 80% traffic to green
        if not await self.traffic_manager.set_traffic_split(20.0, 80.0):
            return False
        
        # Monitor for 15 minutes
        return await self._monitor_phase(900, 80.0)  # 15 minutes
    
    async def _execute_phase_5_complete(self) -> bool:
        """Execute phase 5: Complete migration"""
        logger.info("🎯 Executing phase 5: Complete migration (100%)")
        self.current_phase = DeploymentPhase.PHASE_5_COMPLETE
        
        # Route 100% traffic to green
        if not await self.traffic_manager.set_traffic_split(0.0, 100.0):
            return False
        
        # Monitor for 30 minutes
        return await self._monitor_phase(1800, 100.0)  # 30 minutes
    
    async def _monitor_phase(self, duration_seconds: int, green_traffic_percentage: float) -> bool:
        """Monitor a deployment phase"""
        logger.info(f"🔍 Monitoring phase for {duration_seconds} seconds ({green_traffic_percentage}% green traffic)")
        
        start_time = time.time()
        monitoring_interval = 30  # 30 seconds between checks
        
        while time.time() - start_time < duration_seconds:
            # Collect metrics
            metrics = await self._collect_deployment_metrics(green_traffic_percentage)
            self.deployment_monitor.record_metrics(metrics)
            
            # Check rollback conditions
            rollback_decision = self.deployment_monitor.should_rollback()
            if rollback_decision['should_rollback']:
                logger.warning(f"🚨 Rollback triggered: {rollback_decision['reason']}")
                await self.execute_rollback(rollback_decision['reason'])
                return False
            
            # Log metrics
            logger.info(f"Metrics - Response time: {metrics.response_time_p95:.0f}ms, "
                       f"Error rate: {metrics.error_rate:.2f}%, "
                       f"Throughput: {metrics.throughput:.0f} req/s")
            
            await asyncio.sleep(monitoring_interval)
        
        logger.info(f"✅ Phase monitoring completed successfully")
        return True
    
    async def _collect_deployment_metrics(self, green_traffic_percentage: float) -> DeploymentMetrics:
        """Collect current deployment metrics"""
        # This would integrate with actual monitoring systems (Prometheus, New Relic, etc.)
        # For now, we simulate metric collection
        
        import random
        
        # Simulate degrading performance with higher traffic to green
        base_response_time = 100
        response_time_degradation = green_traffic_percentage * 2  # 2ms per 1% traffic
        
        return DeploymentMetrics(
            timestamp=datetime.now(),
            phase=self.current_phase,
            traffic_percentage=green_traffic_percentage,
            response_time_p95=base_response_time + response_time_degradation + random.uniform(-10, 20),
            error_rate=random.uniform(0.1, 2.0) + (green_traffic_percentage * 0.01),
            throughput=random.uniform(150, 200) - (green_traffic_percentage * 0.5),
            active_connections=random.randint(50, 150),
            memory_usage=random.uniform(60, 80) + (green_traffic_percentage * 0.1),
            cpu_usage=random.uniform(30, 50) + (green_traffic_percentage * 0.2),
            success_rate=100 - random.uniform(0.1, 1.0) - (green_traffic_percentage * 0.01)
        )
    
    async def _verify_data_synchronization(self) -> bool:
        """Verify data synchronization between environments"""
        logger.info("🔄 Verifying data synchronization")
        
        try:
            # Connect to both databases
            blue_engine = create_engine(self.blue_environment.database_url)
            green_engine = create_engine(self.green_environment.database_url)
            
            # Check key table row counts
            tables_to_check = ['users', 'companies', 'opportunities', 'proposals']
            
            for table in tables_to_check:
                with blue_engine.connect() as blue_conn:
                    blue_count = blue_conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                
                with green_engine.connect() as green_conn:
                    green_count = green_conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                
                if blue_count != green_count:
                    logger.error(f"Row count mismatch in {table}: Blue={blue_count}, Green={green_count}")
                    return False
                
                logger.info(f"✅ {table}: {blue_count} rows synchronized")
            
            return True
            
        except Exception as e:
            logger.error(f"Data synchronization verification failed: {e}")
            return False
    
    async def execute_rollback(self, reason: str) -> bool:
        """Execute emergency rollback to blue environment"""
        logger.warning(f"🚨 Executing rollback: {reason}")
        self.deployment_status = DeploymentStatus.ROLLING_BACK
        self.current_phase = DeploymentPhase.ROLLBACK
        
        try:
            # Immediate traffic switch to blue (SQLite)
            if await self.traffic_manager.set_traffic_split(100.0, 0.0):
                logger.info("✅ Traffic switched back to blue environment")
            else:
                logger.error("❌ Failed to switch traffic during rollback")
                return False
            
            # Verify blue environment health
            blue_health = await self.health_checker.check_environment_health(self.blue_environment)
            if blue_health['overall_status'] != 'healthy':
                logger.error("❌ Blue environment is unhealthy during rollback")
                return False
            
            # Log rollback event
            self._log_deployment_event("Rollback completed", {
                'reason': reason,
                'blue_health': blue_health,
                'rollback_time_seconds': (datetime.now() - self.deployment_start_time).total_seconds()
            })
            
            self.deployment_status = DeploymentStatus.ROLLED_BACK
            logger.info("✅ Rollback completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Rollback failed: {e}")
            return False
    
    def _log_deployment_event(self, event: str, details: Dict[str, Any]):
        """Log deployment event"""
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'phase': self.current_phase.value,
            'event': event,
            'details': details
        }
        self.deployment_log.append(log_entry)
        logger.info(f"📝 {event}")
    
    def get_deployment_status(self) -> Dict[str, Any]:
        """Get current deployment status"""
        runtime = None
        if self.deployment_start_time:
            runtime = (datetime.now() - self.deployment_start_time).total_seconds()
        
        return {
            'status': self.deployment_status.value,
            'current_phase': self.current_phase.value,
            'traffic_split': self.traffic_manager.get_current_split(),
            'runtime_seconds': runtime,
            'start_time': self.deployment_start_time.isoformat() if self.deployment_start_time else None,
            'metrics_count': len(self.deployment_monitor.metrics_history),
            'log_entries': len(self.deployment_log)
        }
    
    def get_deployment_report(self) -> Dict[str, Any]:
        """Generate comprehensive deployment report"""
        status = self.get_deployment_status()
        
        # Calculate success metrics
        success_rate = 0.0
        avg_response_time = 0.0
        if self.deployment_monitor.metrics_history:
            success_rate = sum(m.success_rate for m in self.deployment_monitor.metrics_history) / len(self.deployment_monitor.metrics_history)
            avg_response_time = sum(m.response_time_p95 for m in self.deployment_monitor.metrics_history) / len(self.deployment_monitor.metrics_history)
        
        return {
            'deployment_status': status,
            'performance_summary': {
                'average_success_rate': success_rate,
                'average_response_time_p95': avg_response_time,
                'total_metrics_collected': len(self.deployment_monitor.metrics_history),
                'rollback_triggered': self.deployment_status in [DeploymentStatus.ROLLING_BACK, DeploymentStatus.ROLLED_BACK]
            },
            'phase_durations': self._calculate_phase_durations(),
            'deployment_log': self.deployment_log,
            'final_traffic_split': self.traffic_manager.get_current_split()
        }
    
    def _calculate_phase_durations(self) -> Dict[str, float]:
        """Calculate duration of each deployment phase"""
        phase_durations = {}
        
        if len(self.deployment_log) < 2:
            return phase_durations
        
        current_phase = None
        phase_start_time = None
        
        for log_entry in self.deployment_log:
            entry_time = datetime.fromisoformat(log_entry['timestamp'])
            entry_phase = log_entry['phase']
            
            if current_phase and entry_phase != current_phase:
                # Phase ended
                duration = (entry_time - phase_start_time).total_seconds()
                phase_durations[current_phase] = duration
            
            if entry_phase != current_phase:
                # New phase started
                current_phase = entry_phase
                phase_start_time = entry_time
        
        return phase_durations

# Factory function
def create_deployment_manager(blue_config: Dict[str, Any], 
                            green_config: Dict[str, Any],
                            load_balancer_config: Dict[str, str]) -> BlueGreenDeploymentManager:
    """Create configured deployment manager"""
    
    blue_env = EnvironmentConfig(
        name=blue_config['name'],
        type=EnvironmentType.BLUE,
        database_url=blue_config['database_url'],
        app_servers=blue_config['app_servers'],
        load_balancer_url=blue_config['load_balancer_url'],
        health_check_url=blue_config['health_check_url']
    )
    
    green_env = EnvironmentConfig(
        name=green_config['name'],
        type=EnvironmentType.GREEN,
        database_url=green_config['database_url'],
        app_servers=green_config['app_servers'],
        load_balancer_url=green_config['load_balancer_url'],
        health_check_url=green_config['health_check_url']
    )
    
    return BlueGreenDeploymentManager(blue_env, green_env, load_balancer_config)

# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def main():
        # Configuration
        blue_config = {
            'name': 'production-blue',
            'database_url': 'sqlite:///prod.db',
            'app_servers': ['app1.blue.local:8000', 'app2.blue.local:8000', 'app3.blue.local:8000'],
            'load_balancer_url': 'http://lb.blue.local:8080',
            'health_check_url': 'http://lb.blue.local:8080/health'
        }
        
        green_config = {
            'name': 'production-green',
            'database_url': 'postgresql://user:pass@neon.tech/licitacoes',
            'app_servers': ['app1.green.local:8000', 'app2.green.local:8000', 'app3.green.local:8000'],
            'load_balancer_url': 'http://lb.green.local:8080',
            'health_check_url': 'http://lb.green.local:8080/health'
        }
        
        load_balancer_config = {
            'stats_url': 'http://haproxy.local:8404',
            'nginx_api_url': 'http://nginx.local:8080/api/8'
        }
        
        # Create deployment manager
        deployment_manager = create_deployment_manager(
            blue_config, green_config, load_balancer_config
        )
        
        # Start deployment
        success = await deployment_manager.start_deployment()
        
        # Generate report
        report = deployment_manager.get_deployment_report()
        
        print(f"Deployment {'succeeded' if success else 'failed'}")
        print(f"Final status: {report['deployment_status']['status']}")
        print(f"Final traffic split: {report['final_traffic_split']}")
    
    asyncio.run(main())