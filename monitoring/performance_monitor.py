"""
Frontier Performance Monitor

Comprehensive monitoring system for tracking:
- System performance metrics
- Component health and status
- API response times
- Error rates and patterns
- Resource utilization
- Business metric tracking
"""

import asyncio
import logging
import json
import time
import psutil
import aioredis
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
from collections import defaultdict, deque
import statistics
from pathlib import Path
import sys

# Add project path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

from api.config import settings

logger = logging.getLogger(__name__)


class MetricType(Enum):
    """Types of metrics to track"""
    PERFORMANCE = "performance"
    BUSINESS = "business" 
    SYSTEM = "system"
    ERROR = "error"
    SECURITY = "security"


class AlertLevel(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


@dataclass
class MetricPoint:
    """Individual metric data point"""
    metric_name: str
    metric_type: MetricType
    value: Union[float, int, str]
    timestamp: datetime
    labels: Dict[str, str]
    component: str


@dataclass
class Alert:
    """System alert"""
    alert_id: str
    level: AlertLevel
    title: str
    description: str
    component: str
    metric_name: str
    threshold: float
    current_value: float
    timestamp: datetime
    resolved: bool = False
    resolution_time: Optional[datetime] = None


@dataclass
class PerformanceSnapshot:
    """System performance snapshot"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    disk_usage: float
    network_io: Dict[str, int]
    active_connections: int
    response_times: Dict[str, float]
    error_rates: Dict[str, float]
    throughput: Dict[str, float]


class PerformanceMonitor:
    """
    Comprehensive system performance monitoring
    """
    
    def __init__(self):
        self.metrics_buffer: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: Dict[str, Dict[str, Any]] = {}
        self.performance_history: deque = deque(maxlen=2880)  # 24 hours at 30s intervals
        
        # Redis for metric storage
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Monitoring configuration
        self.monitoring_interval = 30  # seconds
        self.metric_retention_days = 7
        self.alert_cooldown = 300  # 5 minutes
        
        # Tracked components
        self.tracked_components = set()
        
        # Performance thresholds
        self.thresholds = {
            "cpu_percent": {"warning": 70.0, "critical": 85.0},
            "memory_percent": {"warning": 80.0, "critical": 90.0}, 
            "disk_usage": {"warning": 85.0, "critical": 95.0},
            "response_time": {"warning": 2.0, "critical": 5.0},
            "error_rate": {"warning": 0.05, "critical": 0.10},
            "throughput_drop": {"warning": 0.3, "critical": 0.5}
        }
        
        # Metric aggregators
        self.response_times = defaultdict(lambda: deque(maxlen=100))
        self.error_counts = defaultdict(int)
        self.request_counts = defaultdict(int)
        
        logger.info("Performance Monitor initialized")
    
    async def initialize(self):
        """Initialize monitoring system"""
        try:
            # Connect to Redis
            self.redis_client = aioredis.from_url(
                f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}",
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            
            # Setup alert rules
            await self._setup_alert_rules()
            
            # Start monitoring tasks
            await self._start_monitoring_tasks()
            
            logger.info("Performance Monitor initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Performance Monitor: {e}")
            raise
    
    async def _setup_alert_rules(self):
        """Setup alerting rules"""
        self.alert_rules = {
            "high_cpu": {
                "metric": "cpu_percent",
                "condition": "greater_than",
                "warning_threshold": 70.0,
                "critical_threshold": 85.0,
                "cooldown": 300
            },
            "high_memory": {
                "metric": "memory_percent", 
                "condition": "greater_than",
                "warning_threshold": 80.0,
                "critical_threshold": 90.0,
                "cooldown": 300
            },
            "disk_space": {
                "metric": "disk_usage",
                "condition": "greater_than", 
                "warning_threshold": 85.0,
                "critical_threshold": 95.0,
                "cooldown": 600
            },
            "slow_response": {
                "metric": "avg_response_time",
                "condition": "greater_than",
                "warning_threshold": 2.0,
                "critical_threshold": 5.0,
                "cooldown": 120
            },
            "high_error_rate": {
                "metric": "error_rate",
                "condition": "greater_than",
                "warning_threshold": 0.05,
                "critical_threshold": 0.10,
                "cooldown": 180
            },
            "low_throughput": {
                "metric": "throughput_drop",
                "condition": "greater_than",
                "warning_threshold": 0.3,
                "critical_threshold": 0.5,
                "cooldown": 240
            }
        }
    
    async def _start_monitoring_tasks(self):
        """Start monitoring background tasks"""
        # System metrics collection
        asyncio.create_task(self._collect_system_metrics())
        
        # Alert processing
        asyncio.create_task(self._process_alerts())
        
        # Metric cleanup
        asyncio.create_task(self._cleanup_old_metrics())
        
        logger.info("Monitoring tasks started")
    
    async def _collect_system_metrics(self):
        """Continuously collect system metrics"""
        while True:
            try:
                await self._collect_performance_snapshot()
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"Error collecting system metrics: {e}")
                await asyncio.sleep(self.monitoring_interval)
    
    async def _collect_performance_snapshot(self):
        """Collect current performance snapshot"""
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            
            # Calculate derived metrics
            avg_response_times = {}
            error_rates = {}
            throughput = {}
            
            for component in self.tracked_components:
                # Average response time
                if component in self.response_times:
                    times = list(self.response_times[component])
                    if times:
                        avg_response_times[component] = statistics.mean(times)
                
                # Error rate
                total_requests = self.request_counts[component]
                error_count = self.error_counts[component]
                if total_requests > 0:
                    error_rates[component] = error_count / total_requests
                
                # Throughput (requests per minute)
                throughput[component] = total_requests / (self.monitoring_interval / 60)
            
            # Create performance snapshot
            snapshot = PerformanceSnapshot(
                timestamp=datetime.now(),
                cpu_percent=cpu_percent,
                memory_percent=memory.percent,
                disk_usage=(disk.used / disk.total) * 100,
                network_io={
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv
                },
                active_connections=len(psutil.net_connections()),
                response_times=avg_response_times,
                error_rates=error_rates,
                throughput=throughput
            )
            
            # Store snapshot
            self.performance_history.append(snapshot)
            
            # Store in Redis
            await self._store_metrics_in_redis(snapshot)
            
            # Record individual metrics
            await self._record_metric("cpu_percent", MetricType.SYSTEM, cpu_percent, "system")
            await self._record_metric("memory_percent", MetricType.SYSTEM, memory.percent, "system")
            await self._record_metric("disk_usage", MetricType.SYSTEM, (disk.used / disk.total) * 100, "system")
            
            for component, response_time in avg_response_times.items():
                await self._record_metric("avg_response_time", MetricType.PERFORMANCE, response_time, component)
            
            for component, error_rate in error_rates.items():
                await self._record_metric("error_rate", MetricType.ERROR, error_rate, component)
            
            logger.debug("Performance snapshot collected")
            
        except Exception as e:
            logger.error(f"Error collecting performance snapshot: {e}")
    
    async def _store_metrics_in_redis(self, snapshot: PerformanceSnapshot):
        """Store metrics in Redis for persistence"""
        try:
            key = f"metrics:snapshot:{int(snapshot.timestamp.timestamp())}"
            data = json.dumps(asdict(snapshot), default=str)
            
            # Store with TTL
            ttl = self.metric_retention_days * 24 * 3600
            await self.redis_client.setex(key, ttl, data)
            
            # Update latest snapshot
            await self.redis_client.set("metrics:latest", data)
            
        except Exception as e:
            logger.error(f"Error storing metrics in Redis: {e}")
    
    async def _record_metric(self, metric_name: str, metric_type: MetricType, value: Union[float, int], component: str, labels: Optional[Dict[str, str]] = None):
        """Record a metric point"""
        try:
            if labels is None:
                labels = {}
            
            metric_point = MetricPoint(
                metric_name=metric_name,
                metric_type=metric_type,
                value=value,
                timestamp=datetime.now(),
                labels=labels,
                component=component
            )
            
            # Add to buffer
            buffer_key = f"{component}:{metric_name}"
            self.metrics_buffer[buffer_key].append(metric_point)
            
            # Track component
            self.tracked_components.add(component)
            
            # Check for alerts
            await self._check_alert_conditions(metric_point)
            
        except Exception as e:
            logger.error(f"Error recording metric: {e}")
    
    async def _check_alert_conditions(self, metric_point: MetricPoint):
        """Check if metric triggers any alerts"""
        try:
            for rule_name, rule in self.alert_rules.items():
                if rule["metric"] == metric_point.metric_name:
                    await self._evaluate_alert_rule(rule_name, rule, metric_point)
                    
        except Exception as e:
            logger.error(f"Error checking alert conditions: {e}")
    
    async def _evaluate_alert_rule(self, rule_name: str, rule: Dict[str, Any], metric_point: MetricPoint):
        """Evaluate if an alert rule is triggered"""
        try:
            value = float(metric_point.value)
            condition = rule["condition"]
            
            # Check cooldown
            alert_key = f"{rule_name}:{metric_point.component}"
            if alert_key in self.alerts:
                existing_alert = self.alerts[alert_key]
                if not existing_alert.resolved:
                    time_since_alert = (datetime.now() - existing_alert.timestamp).total_seconds()
                    if time_since_alert < rule["cooldown"]:
                        return  # Still in cooldown
            
            # Evaluate condition
            triggered = False
            level = None
            threshold = 0.0
            
            if condition == "greater_than":
                if value >= rule["critical_threshold"]:
                    triggered = True
                    level = AlertLevel.CRITICAL
                    threshold = rule["critical_threshold"]
                elif value >= rule["warning_threshold"]:
                    triggered = True
                    level = AlertLevel.WARNING
                    threshold = rule["warning_threshold"]
            
            if triggered:
                await self._create_alert(
                    alert_id=alert_key,
                    level=level,
                    title=f"{rule_name.replace('_', ' ').title()} - {metric_point.component}",
                    description=f"{metric_point.metric_name} is {value:.2f}, exceeding threshold of {threshold:.2f}",
                    component=metric_point.component,
                    metric_name=metric_point.metric_name,
                    threshold=threshold,
                    current_value=value
                )
            else:
                # Check if we should resolve existing alert
                if alert_key in self.alerts and not self.alerts[alert_key].resolved:
                    await self._resolve_alert(alert_key)
                    
        except Exception as e:
            logger.error(f"Error evaluating alert rule {rule_name}: {e}")
    
    async def _create_alert(self, alert_id: str, level: AlertLevel, title: str, description: str, 
                          component: str, metric_name: str, threshold: float, current_value: float):
        """Create new alert"""
        try:
            alert = Alert(
                alert_id=alert_id,
                level=level,
                title=title,
                description=description,
                component=component,
                metric_name=metric_name,
                threshold=threshold,
                current_value=current_value,
                timestamp=datetime.now()
            )
            
            self.alerts[alert_id] = alert
            
            # Store in Redis
            alert_data = json.dumps(asdict(alert), default=str)
            await self.redis_client.hset("alerts:active", alert_id, alert_data)
            
            # Log alert
            logger.warning(f"ALERT [{level.value.upper()}] {title}: {description}")
            
            # Send notifications
            await self._send_alert_notification(alert)
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
    
    async def _resolve_alert(self, alert_id: str):
        """Resolve an existing alert"""
        try:
            if alert_id in self.alerts:
                alert = self.alerts[alert_id]
                alert.resolved = True
                alert.resolution_time = datetime.now()
                
                # Update in Redis
                alert_data = json.dumps(asdict(alert), default=str)
                await self.redis_client.hset("alerts:resolved", alert_id, alert_data)
                await self.redis_client.hdel("alerts:active", alert_id)
                
                logger.info(f"RESOLVED: {alert.title}")
                
        except Exception as e:
            logger.error(f"Error resolving alert: {e}")
    
    async def _send_alert_notification(self, alert: Alert):
        """Send alert notification"""
        try:
            # In a real system, this would send emails, Slack messages, etc.
            notification_data = {
                "alert_id": alert.alert_id,
                "level": alert.level.value,
                "title": alert.title,
                "description": alert.description,
                "component": alert.component,
                "timestamp": alert.timestamp.isoformat()
            }
            
            # Store notification in Redis for external processing
            await self.redis_client.lpush("notifications:queue", json.dumps(notification_data))
            
            logger.info(f"Alert notification queued: {alert.title}")
            
        except Exception as e:
            logger.error(f"Error sending alert notification: {e}")
    
    async def _process_alerts(self):
        """Process and maintain alerts"""
        while True:
            try:
                # Clean up old resolved alerts
                current_time = datetime.now()
                cleanup_threshold = current_time - timedelta(hours=24)
                
                resolved_to_remove = []
                for alert_id, alert in self.alerts.items():
                    if alert.resolved and alert.resolution_time and alert.resolution_time < cleanup_threshold:
                        resolved_to_remove.append(alert_id)
                
                for alert_id in resolved_to_remove:
                    del self.alerts[alert_id]
                    await self.redis_client.hdel("alerts:resolved", alert_id)
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                logger.error(f"Error processing alerts: {e}")
                await asyncio.sleep(300)
    
    async def _cleanup_old_metrics(self):
        """Clean up old metrics"""
        while True:
            try:
                # Clean up metric buffers
                cleanup_time = datetime.now() - timedelta(hours=1)
                
                for buffer_key, buffer in self.metrics_buffer.items():
                    # Remove old metrics from buffer
                    while buffer and buffer[0].timestamp < cleanup_time:
                        buffer.popleft()
                
                # Clean up Redis metrics
                pattern = "metrics:snapshot:*"
                async for key in self.redis_client.scan_iter(match=pattern):
                    try:
                        timestamp = int(key.split(':')[-1])
                        metric_time = datetime.fromtimestamp(timestamp)
                        
                        if metric_time < datetime.now() - timedelta(days=self.metric_retention_days):
                            await self.redis_client.delete(key)
                    except (ValueError, IndexError):
                        continue
                
                await asyncio.sleep(3600)  # Clean up every hour
                
            except Exception as e:
                logger.error(f"Error cleaning up metrics: {e}")
                await asyncio.sleep(3600)
    
    # Public API methods
    
    async def record_api_request(self, endpoint: str, method: str, response_time: float, status_code: int):
        """Record API request metrics"""
        component = f"api:{endpoint}:{method}"
        
        # Record response time
        self.response_times[component].append(response_time)
        await self._record_metric("response_time", MetricType.PERFORMANCE, response_time, component, {"endpoint": endpoint, "method": method})
        
        # Count requests
        self.request_counts[component] += 1
        
        # Count errors
        if status_code >= 400:
            self.error_counts[component] += 1
            await self._record_metric("error_count", MetricType.ERROR, 1, component, {"status_code": str(status_code)})
    
    async def record_business_metric(self, metric_name: str, value: Union[float, int], component: str, labels: Optional[Dict[str, str]] = None):
        """Record business-specific metric"""
        await self._record_metric(metric_name, MetricType.BUSINESS, value, component, labels)
    
    async def record_security_event(self, event_type: str, severity: str, component: str, details: Dict[str, Any]):
        """Record security event"""
        await self._record_metric("security_event", MetricType.SECURITY, 1, component, {"event_type": event_type, "severity": severity})
        
        # Store detailed security event
        event_data = {
            "event_type": event_type,
            "severity": severity,
            "component": component,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        
        await self.redis_client.lpush("security:events", json.dumps(event_data))
    
    async def get_current_metrics(self, component: Optional[str] = None) -> Dict[str, Any]:
        """Get current system metrics"""
        try:
            if self.performance_history:
                latest = self.performance_history[-1]
                
                result = {
                    "timestamp": latest.timestamp.isoformat(),
                    "system": {
                        "cpu_percent": latest.cpu_percent,
                        "memory_percent": latest.memory_percent,
                        "disk_usage": latest.disk_usage,
                        "active_connections": latest.active_connections
                    }
                }
                
                if component:
                    result["component"] = {
                        "response_time": latest.response_times.get(component, 0.0),
                        "error_rate": latest.error_rates.get(component, 0.0),
                        "throughput": latest.throughput.get(component, 0.0)
                    }
                else:
                    result["components"] = {
                        "response_times": latest.response_times,
                        "error_rates": latest.error_rates,
                        "throughput": latest.throughput
                    }
                
                return result
            
            return {"error": "No metrics available"}
            
        except Exception as e:
            logger.error(f"Error getting current metrics: {e}")
            return {"error": str(e)}
    
    async def get_metrics_history(self, component: Optional[str] = None, hours: int = 1) -> List[Dict[str, Any]]:
        """Get historical metrics"""
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            
            history = []
            for snapshot in self.performance_history:
                if snapshot.timestamp >= cutoff_time:
                    data = {
                        "timestamp": snapshot.timestamp.isoformat(),
                        "cpu_percent": snapshot.cpu_percent,
                        "memory_percent": snapshot.memory_percent,
                        "disk_usage": snapshot.disk_usage
                    }
                    
                    if component:
                        data.update({
                            "response_time": snapshot.response_times.get(component, 0.0),
                            "error_rate": snapshot.error_rates.get(component, 0.0),
                            "throughput": snapshot.throughput.get(component, 0.0)
                        })
                    
                    history.append(data)
            
            return history
            
        except Exception as e:
            logger.error(f"Error getting metrics history: {e}")
            return []
    
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active alerts"""
        try:
            active_alerts = []
            for alert in self.alerts.values():
                if not alert.resolved:
                    active_alerts.append(asdict(alert))
            
            return active_alerts
            
        except Exception as e:
            logger.error(f"Error getting active alerts: {e}")
            return []
    
    async def get_component_health(self, component: str) -> Dict[str, Any]:
        """Get health status for specific component"""
        try:
            health_data = {
                "component": component,
                "status": "unknown",
                "last_check": None,
                "metrics": {}
            }
            
            # Check recent metrics
            if self.performance_history:
                latest = self.performance_history[-1]
                
                if component in latest.response_times:
                    health_data["metrics"]["response_time"] = latest.response_times[component]
                    health_data["last_check"] = latest.timestamp.isoformat()
                    
                    # Determine health status
                    response_time = latest.response_times[component]
                    error_rate = latest.error_rates.get(component, 0.0)
                    
                    if response_time > 5.0 or error_rate > 0.1:
                        health_data["status"] = "critical"
                    elif response_time > 2.0 or error_rate > 0.05:
                        health_data["status"] = "warning"
                    else:
                        health_data["status"] = "healthy"
                
                if component in latest.error_rates:
                    health_data["metrics"]["error_rate"] = latest.error_rates[component]
                
                if component in latest.throughput:
                    health_data["metrics"]["throughput"] = latest.throughput[component]
            
            # Check for active alerts
            component_alerts = [alert for alert in self.alerts.values() 
                             if alert.component == component and not alert.resolved]
            health_data["active_alerts"] = len(component_alerts)
            
            return health_data
            
        except Exception as e:
            logger.error(f"Error getting component health: {e}")
            return {"error": str(e)}
    
    async def health_check(self) -> bool:
        """Perform health check of monitoring system"""
        try:
            # Check Redis connection
            await self.redis_client.ping()
            
            # Check if metrics are being collected
            if not self.performance_history:
                return False
            
            # Check last metric collection time
            latest = self.performance_history[-1]
            time_since_last = (datetime.now() - latest.timestamp).total_seconds()
            
            return time_since_last < self.monitoring_interval * 2
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    async def close(self):
        """Clean shutdown of monitoring system"""
        try:
            if self.redis_client:
                await self.redis_client.close()
            
            logger.info("Performance Monitor closed")
            
        except Exception as e:
            logger.error(f"Error closing Performance Monitor: {e}")


# Global monitor instance
performance_monitor = PerformanceMonitor()
