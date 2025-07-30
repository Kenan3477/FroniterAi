"""
Performance Benchmarks and SLA Monitoring

Implements comprehensive performance benchmarking, SLA monitoring,
and alerting system for production workloads.
"""

import asyncio
import json
import time
import statistics
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
from collections import defaultdict, deque
import psutil

from api.config import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class MetricType(Enum):
    """Types of performance metrics"""
    RESPONSE_TIME = "response_time"
    THROUGHPUT = "throughput"
    ERROR_RATE = "error_rate"
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DISK_USAGE = "disk_usage"
    NETWORK_IO = "network_io"
    DATABASE_QUERY_TIME = "db_query_time"
    CACHE_HIT_RATE = "cache_hit_rate"
    AVAILABILITY = "availability"


class AlertSeverity(Enum):
    """Alert severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class SLATarget:
    """Service Level Agreement target"""
    metric_type: MetricType
    target_value: float
    comparison: str  # "lt", "lte", "gt", "gte", "eq"
    percentile: Optional[float] = None  # For percentile-based targets
    time_window: int = 300  # seconds
    violation_threshold: float = 0.05  # 5% violation tolerance


@dataclass
class PerformanceMetric:
    """Individual performance metric measurement"""
    metric_type: MetricType
    value: float
    timestamp: datetime
    labels: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BenchmarkResult:
    """Result of a performance benchmark"""
    benchmark_name: str
    start_time: datetime
    end_time: datetime
    duration: float
    metrics: List[PerformanceMetric]
    success: bool
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Alert:
    """Performance alert"""
    alert_id: str
    severity: AlertSeverity
    metric_type: MetricType
    message: str
    value: float
    threshold: float
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None


class BenchmarkSuite:
    """Comprehensive performance benchmark suite"""
    
    def __init__(self):
        self.benchmarks: Dict[str, Callable] = {}
        self.results: List[BenchmarkResult] = []
        self.running = False
    
    def register_benchmark(self, name: str, benchmark_func: Callable):
        """Register a benchmark function"""
        self.benchmarks[name] = benchmark_func
        logger.info(f"Registered benchmark: {name}")
    
    async def run_all_benchmarks(self) -> List[BenchmarkResult]:
        """Run all registered benchmarks"""
        results = []
        
        for name, benchmark_func in self.benchmarks.items():
            try:
                result = await self.run_benchmark(name, benchmark_func)
                results.append(result)
            except Exception as e:
                logger.error(f"Benchmark {name} failed: {e}")
                result = BenchmarkResult(
                    benchmark_name=name,
                    start_time=datetime.now(),
                    end_time=datetime.now(),
                    duration=0.0,
                    metrics=[],
                    success=False,
                    error_message=str(e)
                )
                results.append(result)
        
        self.results.extend(results)
        return results
    
    async def run_benchmark(self, name: str, benchmark_func: Callable) -> BenchmarkResult:
        """Run a specific benchmark"""
        start_time = datetime.now()
        metrics = []
        
        try:
            logger.info(f"Starting benchmark: {name}")
            
            # Run the benchmark function
            benchmark_metrics = await benchmark_func()
            
            if isinstance(benchmark_metrics, list):
                metrics.extend(benchmark_metrics)
            elif isinstance(benchmark_metrics, PerformanceMetric):
                metrics.append(benchmark_metrics)
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            result = BenchmarkResult(
                benchmark_name=name,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                metrics=metrics,
                success=True
            )
            
            logger.info(f"Completed benchmark {name} in {duration:.3f}s")
            return result
            
        except Exception as e:
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            result = BenchmarkResult(
                benchmark_name=name,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                metrics=metrics,
                success=False,
                error_message=str(e)
            )
            
            logger.error(f"Benchmark {name} failed after {duration:.3f}s: {e}")
            return result
    
    def get_benchmark_summary(self) -> Dict[str, Any]:
        """Get summary of benchmark results"""
        if not self.results:
            return {"total_benchmarks": 0, "successful": 0, "failed": 0}
        
        successful = sum(1 for r in self.results if r.success)
        failed = len(self.results) - successful
        
        avg_duration = statistics.mean(r.duration for r in self.results)
        
        return {
            "total_benchmarks": len(self.results),
            "successful": successful,
            "failed": failed,
            "success_rate": successful / len(self.results),
            "avg_duration": avg_duration,
            "last_run": max(r.end_time for r in self.results).isoformat() if self.results else None
        }


class SLAMonitor:
    """Service Level Agreement monitoring system"""
    
    def __init__(self):
        self.sla_targets: List[SLATarget] = []
        self.metrics_buffer: Dict[MetricType, deque] = defaultdict(lambda: deque(maxlen=10000))
        self.alerts: List[Alert] = []
        self.monitoring_active = False
        self.monitoring_task: Optional[asyncio.Task] = None
        
        # Default SLA targets
        self._setup_default_slas()
    
    def _setup_default_slas(self):
        """Setup default SLA targets"""
        self.sla_targets = [
            SLATarget(
                metric_type=MetricType.RESPONSE_TIME,
                target_value=1000.0,  # 1 second
                comparison="lte",
                percentile=95.0,
                time_window=300
            ),
            SLATarget(
                metric_type=MetricType.AVAILABILITY,
                target_value=99.9,  # 99.9% uptime
                comparison="gte",
                time_window=3600  # 1 hour
            ),
            SLATarget(
                metric_type=MetricType.ERROR_RATE,
                target_value=0.01,  # 1% error rate
                comparison="lte",
                time_window=300
            ),
            SLATarget(
                metric_type=MetricType.THROUGHPUT,
                target_value=100.0,  # 100 requests/second
                comparison="gte",
                time_window=300
            )
        ]
    
    async def start_monitoring(self):
        """Start SLA monitoring"""
        self.monitoring_active = True
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
        logger.info("SLA monitoring started")
    
    async def stop_monitoring(self):
        """Stop SLA monitoring"""
        self.monitoring_active = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
        logger.info("SLA monitoring stopped")
    
    def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric"""
        self.metrics_buffer[metric.metric_type].append(metric)
    
    async def _monitoring_loop(self):
        """Main SLA monitoring loop"""
        while self.monitoring_active:
            try:
                await self._check_sla_violations()
                await asyncio.sleep(30)  # Check every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"SLA monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _check_sla_violations(self):
        """Check for SLA violations"""
        current_time = datetime.now()
        
        for target in self.sla_targets:
            try:
                is_violation = await self._evaluate_sla_target(target, current_time)
                if is_violation:
                    await self._create_sla_alert(target, current_time)
            except Exception as e:
                logger.error(f"Error evaluating SLA target {target.metric_type}: {e}")
    
    async def _evaluate_sla_target(self, target: SLATarget, current_time: datetime) -> bool:
        """Evaluate if SLA target is violated"""
        metrics = self.metrics_buffer[target.metric_type]
        if not metrics:
            return False
        
        # Filter metrics within time window
        time_threshold = current_time - timedelta(seconds=target.time_window)
        recent_metrics = [m for m in metrics if m.timestamp >= time_threshold]
        
        if not recent_metrics:
            return False
        
        values = [m.value for m in recent_metrics]
        
        # Calculate metric value based on target configuration
        if target.percentile:
            metric_value = np.percentile(values, target.percentile)
        else:
            metric_value = statistics.mean(values)
        
        # Check violation
        if target.comparison == "lt":
            return metric_value >= target.target_value
        elif target.comparison == "lte":
            return metric_value > target.target_value
        elif target.comparison == "gt":
            return metric_value <= target.target_value
        elif target.comparison == "gte":
            return metric_value < target.target_value
        elif target.comparison == "eq":
            return abs(metric_value - target.target_value) > target.violation_threshold
        
        return False
    
    async def _create_sla_alert(self, target: SLATarget, timestamp: datetime):
        """Create SLA violation alert"""
        # Check if similar alert already exists (avoid spam)
        recent_alerts = [
            a for a in self.alerts
            if (a.metric_type == target.metric_type and
                not a.resolved and
                timestamp - a.timestamp < timedelta(minutes=5))
        ]
        
        if recent_alerts:
            return  # Don't create duplicate alerts
        
        alert_id = f"sla_{target.metric_type.value}_{int(timestamp.timestamp())}"
        
        alert = Alert(
            alert_id=alert_id,
            severity=AlertSeverity.ERROR,
            metric_type=target.metric_type,
            message=f"SLA violation: {target.metric_type.value} target {target.target_value} violated",
            value=0.0,  # Would be calculated from recent metrics
            threshold=target.target_value,
            timestamp=timestamp
        )
        
        self.alerts.append(alert)
        logger.warning(f"SLA Alert: {alert.message}")
        
        # Send alert notification
        await self._send_alert_notification(alert)
    
    async def _send_alert_notification(self, alert: Alert):
        """Send alert notification"""
        # In production, this would send emails, Slack messages, etc.
        logger.critical(f"ALERT: {alert.severity.value.upper()} - {alert.message}")
    
    def get_sla_compliance_report(self) -> Dict[str, Any]:
        """Generate SLA compliance report"""
        report = {
            "report_timestamp": datetime.now().isoformat(),
            "targets": [],
            "overall_compliance": 0.0,
            "active_alerts": len([a for a in self.alerts if not a.resolved])
        }
        
        compliant_targets = 0
        
        for target in self.sla_targets:
            metrics = self.metrics_buffer[target.metric_type]
            recent_metrics = [
                m for m in metrics
                if datetime.now() - m.timestamp < timedelta(seconds=target.time_window)
            ]
            
            if recent_metrics:
                values = [m.value for m in recent_metrics]
                if target.percentile:
                    current_value = np.percentile(values, target.percentile)
                else:
                    current_value = statistics.mean(values)
                
                is_compliant = not await self._evaluate_sla_target(target, datetime.now())
                if is_compliant:
                    compliant_targets += 1
                
                target_report = {
                    "metric_type": target.metric_type.value,
                    "target_value": target.target_value,
                    "current_value": current_value,
                    "compliant": is_compliant,
                    "sample_count": len(recent_metrics)
                }
                report["targets"].append(target_report)
        
        if self.sla_targets:
            report["overall_compliance"] = compliant_targets / len(self.sla_targets)
        
        return report


class PerformanceProfiler:
    """System performance profiler"""
    
    def __init__(self):
        self.profiling_active = False
        self.profile_data: List[Dict[str, Any]] = []
        self.profiling_task: Optional[asyncio.Task] = None
    
    async def start_profiling(self, interval: float = 5.0):
        """Start performance profiling"""
        self.profiling_active = True
        self.profiling_task = asyncio.create_task(self._profiling_loop(interval))
        logger.info(f"Performance profiling started (interval: {interval}s)")
    
    async def stop_profiling(self):
        """Stop performance profiling"""
        self.profiling_active = False
        if self.profiling_task:
            self.profiling_task.cancel()
            try:
                await self.profiling_task
            except asyncio.CancelledError:
                pass
        logger.info("Performance profiling stopped")
    
    async def _profiling_loop(self, interval: float):
        """Main profiling loop"""
        while self.profiling_active:
            try:
                profile_snapshot = await self._capture_system_metrics()
                self.profile_data.append(profile_snapshot)
                
                # Keep only recent data (last 1000 samples)
                if len(self.profile_data) > 1000:
                    self.profile_data = self.profile_data[-1000:]
                
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Profiling error: {e}")
                await asyncio.sleep(interval)
    
    async def _capture_system_metrics(self) -> Dict[str, Any]:
        """Capture comprehensive system metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk metrics
        disk_usage = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
        # Network metrics
        network_io = psutil.net_io_counters()
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        process_cpu = process.cpu_percent()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "frequency": cpu_freq.current if cpu_freq else None
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "percent": memory.percent,
                "used": memory.used,
                "free": memory.free
            },
            "swap": {
                "total": swap.total,
                "used": swap.used,
                "percent": swap.percent
            },
            "disk": {
                "total": disk_usage.total,
                "used": disk_usage.used,
                "free": disk_usage.free,
                "percent": (disk_usage.used / disk_usage.total) * 100,
                "read_bytes": disk_io.read_bytes if disk_io else 0,
                "write_bytes": disk_io.write_bytes if disk_io else 0
            },
            "network": {
                "bytes_sent": network_io.bytes_sent if network_io else 0,
                "bytes_recv": network_io.bytes_recv if network_io else 0,
                "packets_sent": network_io.packets_sent if network_io else 0,
                "packets_recv": network_io.packets_recv if network_io else 0
            },
            "process": {
                "cpu_percent": process_cpu,
                "memory_rss": process_memory.rss,
                "memory_vms": process_memory.vms,
                "num_threads": process.num_threads(),
                "num_fds": process.num_fds() if hasattr(process, 'num_fds') else None
            }
        }
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary statistics"""
        if not self.profile_data:
            return {"error": "No profiling data available"}
        
        # Calculate statistics for key metrics
        cpu_values = [d["cpu"]["percent"] for d in self.profile_data]
        memory_values = [d["memory"]["percent"] for d in self.profile_data]
        
        return {
            "sample_count": len(self.profile_data),
            "time_range": {
                "start": self.profile_data[0]["timestamp"],
                "end": self.profile_data[-1]["timestamp"]
            },
            "cpu": {
                "avg": statistics.mean(cpu_values),
                "min": min(cpu_values),
                "max": max(cpu_values),
                "p95": np.percentile(cpu_values, 95),
                "p99": np.percentile(cpu_values, 99)
            },
            "memory": {
                "avg": statistics.mean(memory_values),
                "min": min(memory_values),
                "max": max(memory_values),
                "p95": np.percentile(memory_values, 95),
                "p99": np.percentile(memory_values, 99)
            }
        }


class PerformanceManager:
    """Main performance management coordinator"""
    
    def __init__(self):
        self.benchmark_suite = BenchmarkSuite()
        self.sla_monitor = SLAMonitor()
        self.profiler = PerformanceProfiler()
        self.running = False
        
        # Register default benchmarks
        self._register_default_benchmarks()
    
    def _register_default_benchmarks(self):
        """Register default performance benchmarks"""
        
        async def api_response_time_benchmark():
            """Benchmark API response times"""
            metrics = []
            
            # Simulate API calls with varying response times
            for i in range(10):
                start_time = time.time()
                await asyncio.sleep(random.uniform(0.1, 0.5))  # Simulate API call
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                
                metric = PerformanceMetric(
                    metric_type=MetricType.RESPONSE_TIME,
                    value=response_time,
                    timestamp=datetime.now(),
                    labels={"endpoint": f"/api/test/{i}"}
                )
                metrics.append(metric)
            
            return metrics
        
        async def throughput_benchmark():
            """Benchmark system throughput"""
            start_time = time.time()
            request_count = 0
            
            # Simulate processing requests for 5 seconds
            end_time = start_time + 5.0
            while time.time() < end_time:
                await asyncio.sleep(0.01)  # Simulate request processing
                request_count += 1
            
            throughput = request_count / 5.0  # requests per second
            
            return PerformanceMetric(
                metric_type=MetricType.THROUGHPUT,
                value=throughput,
                timestamp=datetime.now(),
                labels={"test": "throughput_benchmark"}
            )
        
        async def memory_usage_benchmark():
            """Benchmark memory usage patterns"""
            # Simulate memory-intensive operations
            data = []
            for i in range(1000):
                data.append([j for j in range(100)])
            
            memory_usage = psutil.virtual_memory().percent
            
            # Cleanup
            del data
            
            return PerformanceMetric(
                metric_type=MetricType.MEMORY_USAGE,
                value=memory_usage,
                timestamp=datetime.now(),
                labels={"test": "memory_benchmark"}
            )
        
        # Register benchmarks
        self.benchmark_suite.register_benchmark("api_response_time", api_response_time_benchmark)
        self.benchmark_suite.register_benchmark("throughput", throughput_benchmark)
        self.benchmark_suite.register_benchmark("memory_usage", memory_usage_benchmark)
    
    async def start(self):
        """Start performance management"""
        self.running = True
        
        await self.sla_monitor.start_monitoring()
        await self.profiler.start_profiling(interval=10.0)
        
        logger.info("Performance management started")
    
    async def stop(self):
        """Stop performance management"""
        self.running = False
        
        await self.sla_monitor.stop_monitoring()
        await self.profiler.stop_profiling()
        
        logger.info("Performance management stopped")
    
    async def run_performance_audit(self) -> Dict[str, Any]:
        """Run comprehensive performance audit"""
        logger.info("Starting performance audit")
        
        # Run benchmarks
        benchmark_results = await self.benchmark_suite.run_all_benchmarks()
        
        # Get SLA compliance report
        sla_report = self.sla_monitor.get_sla_compliance_report()
        
        # Get performance summary
        performance_summary = self.profiler.get_performance_summary()
        
        # Get benchmark summary
        benchmark_summary = self.benchmark_suite.get_benchmark_summary()
        
        audit_report = {
            "audit_timestamp": datetime.now().isoformat(),
            "benchmarks": {
                "summary": benchmark_summary,
                "results": [asdict(r) for r in benchmark_results]
            },
            "sla_compliance": sla_report,
            "system_performance": performance_summary,
            "recommendations": self._generate_recommendations(benchmark_results, sla_report)
        }
        
        logger.info("Performance audit completed")
        return audit_report
    
    def _generate_recommendations(self, benchmark_results: List[BenchmarkResult], sla_report: Dict[str, Any]) -> List[str]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        # Analyze benchmark results
        failed_benchmarks = [r for r in benchmark_results if not r.success]
        if failed_benchmarks:
            recommendations.append(f"Fix {len(failed_benchmarks)} failed benchmarks")
        
        # Analyze SLA compliance
        if sla_report.get("overall_compliance", 1.0) < 0.95:
            recommendations.append("Improve SLA compliance - currently below 95%")
        
        # Analyze specific metrics
        for target in sla_report.get("targets", []):
            if not target.get("compliant", True):
                recommendations.append(f"Address {target['metric_type']} performance issues")
        
        if not recommendations:
            recommendations.append("System performance is within acceptable parameters")
        
        return recommendations
    
    def record_api_metric(self, response_time: float, success: bool, endpoint: str):
        """Record API performance metric"""
        # Record response time
        self.sla_monitor.record_metric(PerformanceMetric(
            metric_type=MetricType.RESPONSE_TIME,
            value=response_time,
            timestamp=datetime.now(),
            labels={"endpoint": endpoint, "success": str(success)}
        ))
        
        # Record error rate
        error_rate = 0.0 if success else 1.0
        self.sla_monitor.record_metric(PerformanceMetric(
            metric_type=MetricType.ERROR_RATE,
            value=error_rate,
            timestamp=datetime.now(),
            labels={"endpoint": endpoint}
        ))
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Get data for performance dashboard"""
        return {
            "sla_compliance": self.sla_monitor.get_sla_compliance_report(),
            "system_performance": self.profiler.get_performance_summary(),
            "benchmark_summary": self.benchmark_suite.get_benchmark_summary(),
            "active_alerts": len([a for a in self.sla_monitor.alerts if not a.resolved]),
            "status": "running" if self.running else "stopped"
        }


# Global performance manager instance
performance_manager = PerformanceManager()
