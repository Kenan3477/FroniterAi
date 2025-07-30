"""
Model Monitoring and Performance Tracking

Comprehensive monitoring system for model performance, drift detection,
resource utilization, and automated alerting.
"""

import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple
import statistics

import numpy as np
import psutil
import redis.asyncio as redis
from pydantic import BaseModel, Field

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    import pynvml
    pynvml.nvmlInit()
    NVML_AVAILABLE = True
except ImportError:
    NVML_AVAILABLE = False

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MetricType(str, Enum):
    """Types of metrics"""
    LATENCY = "latency"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    ACCURACY = "accuracy"
    DRIFT = "drift"
    RESOURCE = "resource"


@dataclass
class MetricValue:
    """Single metric value"""
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Alert:
    """System alert"""
    alert_id: str
    model_id: str
    metric_type: MetricType
    severity: AlertSeverity
    message: str
    value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class PerformanceMetrics:
    """Track performance metrics for a model"""
    
    def __init__(self, model_id: str, window_size: int = 1000):
        self.model_id = model_id
        self.window_size = window_size
        
        # Time-series data
        self.latencies = deque(maxlen=window_size)
        self.throughput_samples = deque(maxlen=window_size)
        self.error_counts = deque(maxlen=window_size)
        self.accuracy_scores = deque(maxlen=window_size)
        
        # Cumulative counters
        self.total_requests = 0
        self.total_errors = 0
        self.total_latency = 0.0
        
        # Resource metrics
        self.cpu_usage = deque(maxlen=100)
        self.memory_usage = deque(maxlen=100)
        self.gpu_usage = deque(maxlen=100)
        self.gpu_memory = deque(maxlen=100)
    
    def record_request(self, latency: float, error: bool = False, accuracy: Optional[float] = None):
        """Record a request"""
        timestamp = time.time()
        
        # Update counters
        self.total_requests += 1
        self.total_latency += latency
        
        if error:
            self.total_errors += 1
        
        # Update time-series
        self.latencies.append(latency)
        self.throughput_samples.append(timestamp)
        self.error_counts.append(1 if error else 0)
        
        if accuracy is not None:
            self.accuracy_scores.append(accuracy)
    
    def record_resource_usage(self):
        """Record current resource usage"""
        try:
            # CPU and memory
            self.cpu_usage.append(psutil.cpu_percent())
            self.memory_usage.append(psutil.virtual_memory().percent)
            
            # GPU metrics (if available)
            if NVML_AVAILABLE:
                try:
                    device_count = pynvml.nvmlDeviceGetCount()
                    if device_count > 0:
                        handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                        gpu_util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                        memory_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                        
                        self.gpu_usage.append(gpu_util.gpu)
                        self.gpu_memory.append((memory_info.used / memory_info.total) * 100)
                except Exception as e:
                    logger.warning(f"Error collecting GPU metrics: {e}")
                    
        except Exception as e:
            logger.warning(f"Error collecting resource metrics: {e}")
    
    @property
    def average_latency(self) -> float:
        """Calculate average latency"""
        return statistics.mean(self.latencies) if self.latencies else 0.0
    
    @property
    def p95_latency(self) -> float:
        """Calculate 95th percentile latency"""
        if not self.latencies:
            return 0.0
        sorted_latencies = sorted(self.latencies)
        index = int(0.95 * len(sorted_latencies))
        return sorted_latencies[index] if index < len(sorted_latencies) else sorted_latencies[-1]
    
    @property
    def throughput_rps(self) -> float:
        """Calculate requests per second"""
        if len(self.throughput_samples) < 2:
            return 0.0
        
        time_window = self.throughput_samples[-1] - self.throughput_samples[0]
        return len(self.throughput_samples) / max(time_window, 1)
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate"""
        if not self.error_counts:
            return 0.0
        return sum(self.error_counts) / len(self.error_counts)
    
    @property
    def average_accuracy(self) -> float:
        """Calculate average accuracy"""
        return statistics.mean(self.accuracy_scores) if self.accuracy_scores else 0.0
    
    @property
    def cpu_utilization(self) -> float:
        """Calculate average CPU utilization"""
        return statistics.mean(self.cpu_usage) if self.cpu_usage else 0.0
    
    @property
    def memory_utilization(self) -> float:
        """Calculate average memory utilization"""
        return statistics.mean(self.memory_usage) if self.memory_usage else 0.0
    
    @property
    def gpu_utilization(self) -> float:
        """Calculate average GPU utilization"""
        return statistics.mean(self.gpu_usage) if self.gpu_usage else 0.0
    
    @property
    def gpu_memory_utilization(self) -> float:
        """Calculate average GPU memory utilization"""
        return statistics.mean(self.gpu_memory) if self.gpu_memory else 0.0


class DriftDetector:
    """Detect data/concept drift in model inputs and outputs"""
    
    def __init__(self, window_size: int = 1000, threshold: float = 0.1):
        self.window_size = window_size
        self.threshold = threshold
        
        # Reference data statistics
        self.reference_stats = {}
        
        # Current window data
        self.current_window = deque(maxlen=window_size)
        
        # Drift scores
        self.drift_scores = deque(maxlen=100)
    
    def set_reference_data(self, data: List[Dict[str, Any]]):
        """Set reference data for drift detection"""
        try:
            # Calculate statistics for reference data
            self.reference_stats = self._calculate_statistics(data)
            logger.info(f"Set reference data with {len(data)} samples")
            
        except Exception as e:
            logger.error(f"Error setting reference data: {e}")
    
    def check_drift(self, new_data: Dict[str, Any]) -> float:
        """Check for drift in new data"""
        try:
            self.current_window.append(new_data)
            
            if len(self.current_window) < self.window_size // 2:
                return 0.0  # Not enough data yet
            
            # Calculate statistics for current window
            current_stats = self._calculate_statistics(list(self.current_window))
            
            # Calculate drift score
            drift_score = self._calculate_drift_score(self.reference_stats, current_stats)
            self.drift_scores.append(drift_score)
            
            return drift_score
            
        except Exception as e:
            logger.error(f"Error checking drift: {e}")
            return 0.0
    
    def _calculate_statistics(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate statistics for a dataset"""
        stats = {}
        
        if not data:
            return stats
        
        # Aggregate numeric features
        numeric_features = defaultdict(list)
        
        for sample in data:
            for key, value in sample.items():
                if isinstance(value, (int, float)):
                    numeric_features[key].append(value)
        
        # Calculate statistics for each feature
        for feature, values in numeric_features.items():
            if values:
                stats[feature] = {
                    'mean': statistics.mean(values),
                    'std': statistics.stdev(values) if len(values) > 1 else 0.0,
                    'min': min(values),
                    'max': max(values),
                    'median': statistics.median(values)
                }
        
        return stats
    
    def _calculate_drift_score(self, ref_stats: Dict[str, Any], current_stats: Dict[str, Any]) -> float:
        """Calculate drift score between reference and current statistics"""
        if not ref_stats or not current_stats:
            return 0.0
        
        drift_scores = []
        
        # Compare statistics for common features
        common_features = set(ref_stats.keys()) & set(current_stats.keys())
        
        for feature in common_features:
            ref_stat = ref_stats[feature]
            current_stat = current_stats[feature]
            
            # Calculate normalized differences
            mean_diff = abs(ref_stat['mean'] - current_stat['mean'])
            std_diff = abs(ref_stat['std'] - current_stat['std'])
            
            # Normalize by reference standard deviation
            if ref_stat['std'] > 0:
                normalized_mean_diff = mean_diff / ref_stat['std']
                normalized_std_diff = std_diff / ref_stat['std']
            else:
                normalized_mean_diff = mean_diff
                normalized_std_diff = std_diff
            
            feature_drift = (normalized_mean_diff + normalized_std_diff) / 2
            drift_scores.append(feature_drift)
        
        return statistics.mean(drift_scores) if drift_scores else 0.0
    
    @property
    def is_drifting(self) -> bool:
        """Check if model is currently drifting"""
        if not self.drift_scores:
            return False
        
        recent_scores = list(self.drift_scores)[-10:]  # Last 10 scores
        avg_recent_drift = statistics.mean(recent_scores)
        
        return avg_recent_drift > self.threshold


class AlertManager:
    """Manage alerts and notifications"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client = None
        self.alert_handlers: Dict[AlertSeverity, List[Callable]] = defaultdict(list)
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
    
    async def initialize(self):
        """Initialize alert manager"""
        self.redis_client = await redis.from_url(self.redis_url)
        await self._load_alerts()
        logger.info("Alert manager initialized")
    
    async def shutdown(self):
        """Shutdown alert manager"""
        if self.redis_client:
            await self.redis_client.close()
    
    async def _load_alerts(self):
        """Load active alerts from Redis"""
        try:
            alert_keys = await self.redis_client.keys("alert:*")
            for key in alert_keys:
                alert_data = await self.redis_client.get(key)
                if alert_data:
                    alert_dict = json.loads(alert_data)
                    alert = Alert(**alert_dict)
                    self.active_alerts[alert.alert_id] = alert
            
            logger.info(f"Loaded {len(self.active_alerts)} active alerts")
            
        except Exception as e:
            logger.error(f"Error loading alerts: {e}")
    
    async def _save_alert(self, alert: Alert):
        """Save alert to Redis"""
        try:
            key = f"alert:{alert.alert_id}"
            alert_dict = {
                'alert_id': alert.alert_id,
                'model_id': alert.model_id,
                'metric_type': alert.metric_type,
                'severity': alert.severity,
                'message': alert.message,
                'value': alert.value,
                'threshold': alert.threshold,
                'timestamp': alert.timestamp.isoformat(),
                'resolved': alert.resolved,
                'resolved_at': alert.resolved_at.isoformat() if alert.resolved_at else None
            }
            await self.redis_client.set(key, json.dumps(alert_dict))
            
        except Exception as e:
            logger.error(f"Error saving alert: {e}")
    
    def add_alert_handler(self, severity: AlertSeverity, handler: Callable[[Alert], None]):
        """Add alert handler for specific severity"""
        self.alert_handlers[severity].append(handler)
    
    async def create_alert(self, alert: Alert):
        """Create a new alert"""
        try:
            # Check if similar alert already exists
            existing_key = f"{alert.model_id}_{alert.metric_type}"
            
            # Resolve existing alert if present
            for existing_alert in list(self.active_alerts.values()):
                if (existing_alert.model_id == alert.model_id and 
                    existing_alert.metric_type == alert.metric_type and 
                    not existing_alert.resolved):
                    
                    await self.resolve_alert(existing_alert.alert_id)
            
            # Add new alert
            self.active_alerts[alert.alert_id] = alert
            self.alert_history.append(alert)
            
            # Save to Redis
            await self._save_alert(alert)
            
            # Trigger handlers
            handlers = self.alert_handlers.get(alert.severity, [])
            for handler in handlers:
                try:
                    handler(alert)
                except Exception as e:
                    logger.error(f"Error in alert handler: {e}")
            
            logger.warning(f"Created alert: {alert.message}")
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
    
    async def resolve_alert(self, alert_id: str):
        """Resolve an alert"""
        try:
            if alert_id in self.active_alerts:
                alert = self.active_alerts[alert_id]
                alert.resolved = True
                alert.resolved_at = datetime.utcnow()
                
                await self._save_alert(alert)
                del self.active_alerts[alert_id]
                
                logger.info(f"Resolved alert: {alert_id}")
                
        except Exception as e:
            logger.error(f"Error resolving alert: {e}")
    
    def get_active_alerts(self, model_id: Optional[str] = None) -> List[Alert]:
        """Get active alerts, optionally filtered by model"""
        alerts = list(self.active_alerts.values())
        if model_id:
            alerts = [a for a in alerts if a.model_id == model_id]
        return alerts
    
    def get_alert_history(self, model_id: Optional[str] = None, hours: int = 24) -> List[Alert]:
        """Get alert history"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        alerts = [a for a in self.alert_history if a.timestamp > cutoff_time]
        
        if model_id:
            alerts = [a for a in alerts if a.model_id == model_id]
        
        return alerts


class ModelMonitor:
    """Main model monitoring system"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis_client = None
        
        # Monitoring components
        self.metrics: Dict[str, PerformanceMetrics] = {}
        self.drift_detectors: Dict[str, DriftDetector] = {}
        self.alert_manager = AlertManager(redis_url)
        
        # Monitoring configuration
        self.thresholds = {
            'latency_p95': 1.0,  # seconds
            'error_rate': 0.05,  # 5%
            'drift_score': 0.1,
            'cpu_usage': 80.0,   # percent
            'memory_usage': 80.0,  # percent
            'gpu_usage': 90.0,   # percent
        }
        
        # Background tasks
        self._monitoring_task = None
        self._resource_task = None
    
    async def initialize(self):
        """Initialize monitoring system"""
        self.redis_client = await redis.from_url(self.redis_url)
        await self.alert_manager.initialize()
        
        # Start background monitoring
        self._start_monitoring_tasks()
        
        logger.info("Model monitor initialized")
    
    async def shutdown(self):
        """Shutdown monitoring system"""
        # Cancel background tasks
        if self._monitoring_task:
            self._monitoring_task.cancel()
        if self._resource_task:
            self._resource_task.cancel()
        
        await self.alert_manager.shutdown()
        
        if self.redis_client:
            await self.redis_client.close()
        
        logger.info("Model monitor shutdown complete")
    
    def _start_monitoring_tasks(self):
        """Start background monitoring tasks"""
        self._monitoring_task = asyncio.create_task(self._monitor_metrics())
        self._resource_task = asyncio.create_task(self._monitor_resources())
    
    async def _monitor_metrics(self):
        """Background task to monitor metrics and generate alerts"""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                for model_id, metrics in self.metrics.items():
                    await self._check_performance_thresholds(model_id, metrics)
                    await self._check_drift(model_id)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in metrics monitoring: {e}")
    
    async def _monitor_resources(self):
        """Background task to monitor resource usage"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                for model_id, metrics in self.metrics.items():
                    metrics.record_resource_usage()
                    await self._check_resource_thresholds(model_id, metrics)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in resource monitoring: {e}")
    
    async def _check_performance_thresholds(self, model_id: str, metrics: PerformanceMetrics):
        """Check performance thresholds and create alerts"""
        try:
            # Check latency
            if metrics.p95_latency > self.thresholds['latency_p95']:
                alert = Alert(
                    alert_id=f"{model_id}_latency_{int(time.time())}",
                    model_id=model_id,
                    metric_type=MetricType.LATENCY,
                    severity=AlertSeverity.WARNING,
                    message=f"High latency detected for model {model_id}: {metrics.p95_latency:.3f}s (P95)",
                    value=metrics.p95_latency,
                    threshold=self.thresholds['latency_p95'],
                    timestamp=datetime.utcnow()
                )
                await self.alert_manager.create_alert(alert)
            
            # Check error rate
            if metrics.error_rate > self.thresholds['error_rate']:
                alert = Alert(
                    alert_id=f"{model_id}_error_rate_{int(time.time())}",
                    model_id=model_id,
                    metric_type=MetricType.ERROR_RATE,
                    severity=AlertSeverity.ERROR,
                    message=f"High error rate detected for model {model_id}: {metrics.error_rate:.3f}",
                    value=metrics.error_rate,
                    threshold=self.thresholds['error_rate'],
                    timestamp=datetime.utcnow()
                )
                await self.alert_manager.create_alert(alert)
                
        except Exception as e:
            logger.error(f"Error checking performance thresholds: {e}")
    
    async def _check_resource_thresholds(self, model_id: str, metrics: PerformanceMetrics):
        """Check resource usage thresholds"""
        try:
            # Check CPU usage
            if metrics.cpu_utilization > self.thresholds['cpu_usage']:
                alert = Alert(
                    alert_id=f"{model_id}_cpu_{int(time.time())}",
                    model_id=model_id,
                    metric_type=MetricType.RESOURCE,
                    severity=AlertSeverity.WARNING,
                    message=f"High CPU usage for model {model_id}: {metrics.cpu_utilization:.1f}%",
                    value=metrics.cpu_utilization,
                    threshold=self.thresholds['cpu_usage'],
                    timestamp=datetime.utcnow()
                )
                await self.alert_manager.create_alert(alert)
            
            # Check memory usage
            if metrics.memory_utilization > self.thresholds['memory_usage']:
                alert = Alert(
                    alert_id=f"{model_id}_memory_{int(time.time())}",
                    model_id=model_id,
                    metric_type=MetricType.RESOURCE,
                    severity=AlertSeverity.WARNING,
                    message=f"High memory usage for model {model_id}: {metrics.memory_utilization:.1f}%",
                    value=metrics.memory_utilization,
                    threshold=self.thresholds['memory_usage'],
                    timestamp=datetime.utcnow()
                )
                await self.alert_manager.create_alert(alert)
                
        except Exception as e:
            logger.error(f"Error checking resource thresholds: {e}")
    
    async def _check_drift(self, model_id: str):
        """Check for model drift"""
        try:
            if model_id in self.drift_detectors:
                detector = self.drift_detectors[model_id]
                
                if detector.is_drifting:
                    recent_score = detector.drift_scores[-1] if detector.drift_scores else 0.0
                    
                    alert = Alert(
                        alert_id=f"{model_id}_drift_{int(time.time())}",
                        model_id=model_id,
                        metric_type=MetricType.DRIFT,
                        severity=AlertSeverity.WARNING,
                        message=f"Data drift detected for model {model_id}: score {recent_score:.3f}",
                        value=recent_score,
                        threshold=self.thresholds['drift_score'],
                        timestamp=datetime.utcnow()
                    )
                    await self.alert_manager.create_alert(alert)
                    
        except Exception as e:
            logger.error(f"Error checking drift: {e}")
    
    def register_model(self, model_id: str):
        """Register a model for monitoring"""
        if model_id not in self.metrics:
            self.metrics[model_id] = PerformanceMetrics(model_id)
            self.drift_detectors[model_id] = DriftDetector()
            logger.info(f"Registered model for monitoring: {model_id}")
    
    def unregister_model(self, model_id: str):
        """Unregister a model from monitoring"""
        if model_id in self.metrics:
            del self.metrics[model_id]
        if model_id in self.drift_detectors:
            del self.drift_detectors[model_id]
        logger.info(f"Unregistered model from monitoring: {model_id}")
    
    def record_prediction(self, model_id: str, latency: float, error: bool = False, 
                         accuracy: Optional[float] = None, input_data: Optional[Dict[str, Any]] = None):
        """Record a prediction for monitoring"""
        if model_id not in self.metrics:
            self.register_model(model_id)
        
        # Record performance metrics
        self.metrics[model_id].record_request(latency, error, accuracy)
        
        # Record drift data
        if input_data and model_id in self.drift_detectors:
            self.drift_detectors[model_id].check_drift(input_data)
    
    def set_drift_reference(self, model_id: str, reference_data: List[Dict[str, Any]]):
        """Set reference data for drift detection"""
        if model_id not in self.drift_detectors:
            self.drift_detectors[model_id] = DriftDetector()
        
        self.drift_detectors[model_id].set_reference_data(reference_data)
    
    def get_model_metrics(self, model_id: str) -> Dict[str, Any]:
        """Get comprehensive metrics for a model"""
        if model_id not in self.metrics:
            return {}
        
        metrics = self.metrics[model_id]
        drift_detector = self.drift_detectors.get(model_id)
        
        result = {
            'model_id': model_id,
            'performance': {
                'total_requests': metrics.total_requests,
                'average_latency': metrics.average_latency,
                'p95_latency': metrics.p95_latency,
                'throughput_rps': metrics.throughput_rps,
                'error_rate': metrics.error_rate,
                'average_accuracy': metrics.average_accuracy
            },
            'resources': {
                'cpu_utilization': metrics.cpu_utilization,
                'memory_utilization': metrics.memory_utilization,
                'gpu_utilization': metrics.gpu_utilization,
                'gpu_memory_utilization': metrics.gpu_memory_utilization
            },
            'drift': {
                'is_drifting': drift_detector.is_drifting if drift_detector else False,
                'latest_score': drift_detector.drift_scores[-1] if drift_detector and drift_detector.drift_scores else 0.0
            },
            'alerts': {
                'active_count': len(self.alert_manager.get_active_alerts(model_id)),
                'recent_count': len(self.alert_manager.get_alert_history(model_id, hours=24))
            }
        }
        
        return result
    
    def get_system_overview(self) -> Dict[str, Any]:
        """Get system-wide monitoring overview"""
        total_requests = sum(m.total_requests for m in self.metrics.values())
        total_errors = sum(m.total_errors for m in self.metrics.values())
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'models_monitored': len(self.metrics),
            'total_requests': total_requests,
            'overall_error_rate': total_errors / max(total_requests, 1),
            'active_alerts': len(self.alert_manager.active_alerts),
            'drifting_models': sum(1 for d in self.drift_detectors.values() if d.is_drifting),
            'models': {model_id: self.get_model_metrics(model_id) for model_id in self.metrics.keys()}
        }


# Global monitor instance
model_monitor = ModelMonitor()
