"""
FrontierAI System Monitoring and Health Checks
Monitors system performance, health, and autonomous evolution activities
"""

import logging
import time
import psutil
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
import os

logger = logging.getLogger(__name__)

class SystemMonitor:
    """
    Comprehensive system monitoring for FrontierAI
    """
    
    def __init__(self, db_manager):
        """
        Initialize system monitor
        
        Args:
            db_manager: Database manager for storing metrics
        """
        self.db = db_manager
        self.monitoring_active = False
        self.monitor_thread = None
        self.metrics_history = []
        self.alert_thresholds = {
            "cpu_usage": 80.0,
            "memory_usage": 85.0,
            "disk_usage": 90.0,
            "evolution_errors": 5,
            "response_time": 5.0
        }
        
        logger.info("System Monitor initialized")
    
    def start_monitoring(self, interval: int = 60):
        """
        Start continuous system monitoring
        
        Args:
            interval: Monitoring interval in seconds
        """
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            args=(interval,),
            daemon=True
        )
        self.monitor_thread.start()
        
        logger.info(f"System monitoring started with {interval}s interval")
    
    def stop_monitoring(self):
        """Stop system monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        
        logger.info("System monitoring stopped")
    
    def _monitoring_loop(self, interval: int):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Collect system metrics
                metrics = self._collect_system_metrics()
                
                # Store metrics in database
                self.db.store_system_metrics(metrics)
                
                # Add to local history
                self.metrics_history.append(metrics)
                
                # Keep only last 100 entries in memory
                if len(self.metrics_history) > 100:
                    self.metrics_history = self.metrics_history[-100:]
                
                # Check for alerts
                self._check_alerts(metrics)
                
                # Sleep until next interval
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(interval)
    
    def _collect_system_metrics(self) -> Dict:
        """Collect comprehensive system metrics"""
        try:
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            
            # Memory metrics
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_available = memory.available / (1024**3)  # GB
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_free = disk.free / (1024**3)  # GB
            
            # Network metrics (if available)
            try:
                network = psutil.net_io_counters()
                network_sent = network.bytes_sent / (1024**2)  # MB
                network_recv = network.bytes_recv / (1024**2)  # MB
            except:
                network_sent = network_recv = 0
            
            # Process metrics
            process_count = len(psutil.pids())
            
            # Application-specific metrics
            app_metrics = self._collect_app_metrics()
            
            metrics = {
                "timestamp": datetime.now().isoformat(),
                "system": {
                    "cpu_percent": cpu_percent,
                    "cpu_count": cpu_count,
                    "memory_percent": memory_percent,
                    "memory_available_gb": memory_available,
                    "disk_percent": disk_percent,
                    "disk_free_gb": disk_free,
                    "network_sent_mb": network_sent,
                    "network_recv_mb": network_recv,
                    "process_count": process_count
                },
                "application": app_metrics,
                "health_score": self._calculate_health_score({
                    "cpu": cpu_percent,
                    "memory": memory_percent,
                    "disk": disk_percent
                })
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "health_score": 0.0
            }
    
    def _collect_app_metrics(self) -> Dict:
        """Collect application-specific metrics"""
        try:
            # Get database metrics
            db_metrics = self.db.get_system_metrics_summary()
            
            # Get evolution metrics
            evolution_stats = self.db.get_evolution_statistics()
            
            # Calculate response times (mock data for now)
            avg_response_time = self._calculate_avg_response_time()
            
            return {
                "database": db_metrics,
                "evolution": evolution_stats,
                "response_time_ms": avg_response_time,
                "active_connections": self._count_active_connections(),
                "error_rate": self._calculate_error_rate()
            }
            
        except Exception as e:
            logger.error(f"Failed to collect app metrics: {e}")
            return {
                "error": str(e),
                "database": {},
                "evolution": {},
                "response_time_ms": 0,
                "active_connections": 0,
                "error_rate": 0.0
            }
    
    def _calculate_health_score(self, metrics: Dict) -> float:
        """
        Calculate overall system health score (0-100)
        
        Args:
            metrics: System metrics dictionary
            
        Returns:
            Health score from 0.0 to 100.0
        """
        try:
            # Weight factors for different metrics
            cpu_weight = 0.3
            memory_weight = 0.3
            disk_weight = 0.2
            app_weight = 0.2
            
            # Calculate individual scores (inverse for usage percentages)
            cpu_score = max(0, 100 - metrics.get("cpu", 0))
            memory_score = max(0, 100 - metrics.get("memory", 0))
            disk_score = max(0, 100 - metrics.get("disk", 0))
            
            # Application health (simplified)
            app_score = 85.0  # Default good score
            
            # Weighted average
            health_score = (
                cpu_score * cpu_weight +
                memory_score * memory_weight +
                disk_score * disk_weight +
                app_score * app_weight
            )
            
            return round(health_score, 2)
            
        except Exception as e:
            logger.error(f"Health score calculation failed: {e}")
            return 50.0  # Default middle score
    
    def _check_alerts(self, metrics: Dict):
        """Check metrics against alert thresholds"""
        try:
            system_metrics = metrics.get("system", {})
            app_metrics = metrics.get("application", {})
            
            alerts = []
            
            # CPU alert
            if system_metrics.get("cpu_percent", 0) > self.alert_thresholds["cpu_usage"]:
                alerts.append({
                    "type": "cpu_high",
                    "message": f"High CPU usage: {system_metrics['cpu_percent']:.1f}%",
                    "severity": "warning"
                })
            
            # Memory alert
            if system_metrics.get("memory_percent", 0) > self.alert_thresholds["memory_usage"]:
                alerts.append({
                    "type": "memory_high",
                    "message": f"High memory usage: {system_metrics['memory_percent']:.1f}%",
                    "severity": "warning"
                })
            
            # Disk alert
            if system_metrics.get("disk_percent", 0) > self.alert_thresholds["disk_usage"]:
                alerts.append({
                    "type": "disk_high",
                    "message": f"High disk usage: {system_metrics['disk_percent']:.1f}%",
                    "severity": "critical"
                })
            
            # Response time alert
            response_time = app_metrics.get("response_time_ms", 0) / 1000.0
            if response_time > self.alert_thresholds["response_time"]:
                alerts.append({
                    "type": "slow_response",
                    "message": f"Slow response time: {response_time:.2f}s",
                    "severity": "warning"
                })
            
            # Store alerts if any
            if alerts:
                for alert in alerts:
                    self.db.store_alert(alert)
                    logger.warning(f"Alert: {alert['message']}")
            
        except Exception as e:
            logger.error(f"Alert checking failed: {e}")
    
    def get_system_status(self) -> Dict:
        """Get current system status"""
        try:
            # Get latest metrics
            latest_metrics = self.metrics_history[-1] if self.metrics_history else {}
            
            # Get recent evolution activity
            evolution_activity = self.db.get_recent_evolution_activity(hours=24)
            
            # Get alert summary
            recent_alerts = self.db.get_recent_alerts(hours=24)
            
            status = {
                "timestamp": datetime.now().isoformat(),
                "monitoring_active": self.monitoring_active,
                "latest_metrics": latest_metrics,
                "evolution_activity": evolution_activity,
                "recent_alerts": recent_alerts,
                "health_status": self._determine_health_status(latest_metrics),
                "uptime": self._calculate_uptime(),
                "system_info": self._get_system_info()
            }
            
            return status
            
        except Exception as e:
            logger.error(f"Failed to get system status: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "monitoring_active": self.monitoring_active
            }
    
    def get_performance_summary(self, hours: int = 24) -> Dict:
        """
        Get performance summary for specified time period
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            Performance summary dictionary
        """
        try:
            # Calculate time range
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=hours)
            
            # Get metrics from database
            metrics_data = self.db.get_metrics_in_range(start_time, end_time)
            
            if not metrics_data:
                return {"error": "No metrics data available"}
            
            # Calculate averages
            cpu_avg = sum(m.get("cpu_percent", 0) for m in metrics_data) / len(metrics_data)
            memory_avg = sum(m.get("memory_percent", 0) for m in metrics_data) / len(metrics_data)
            disk_avg = sum(m.get("disk_percent", 0) for m in metrics_data) / len(metrics_data)
            
            # Calculate peaks
            cpu_peak = max(m.get("cpu_percent", 0) for m in metrics_data)
            memory_peak = max(m.get("memory_percent", 0) for m in metrics_data)
            disk_peak = max(m.get("disk_percent", 0) for m in metrics_data)
            
            # Evolution statistics
            evolution_stats = self.db.get_evolution_statistics_in_range(start_time, end_time)
            
            summary = {
                "time_period": f"{hours} hours",
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "metrics_count": len(metrics_data),
                "averages": {
                    "cpu_percent": round(cpu_avg, 2),
                    "memory_percent": round(memory_avg, 2),
                    "disk_percent": round(disk_avg, 2)
                },
                "peaks": {
                    "cpu_percent": round(cpu_peak, 2),
                    "memory_percent": round(memory_peak, 2),
                    "disk_percent": round(disk_peak, 2)
                },
                "evolution_statistics": evolution_stats,
                "alert_count": len(self.db.get_alerts_in_range(start_time, end_time)),
                "overall_health": self._calculate_period_health(metrics_data)
            }
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            return {"error": str(e)}
    
    # Helper methods
    def _calculate_avg_response_time(self) -> float:
        """Calculate average response time (mock implementation)"""
        # In a real system, this would track actual response times
        return 250.0  # Mock 250ms average
    
    def _count_active_connections(self) -> int:
        """Count active connections (mock implementation)"""
        # In a real system, this would count actual connections
        return 5  # Mock 5 active connections
    
    def _calculate_error_rate(self) -> float:
        """Calculate error rate percentage (mock implementation)"""
        # In a real system, this would calculate actual error rates
        return 0.1  # Mock 0.1% error rate
    
    def _determine_health_status(self, metrics: Dict) -> str:
        """Determine overall health status from metrics"""
        health_score = metrics.get("health_score", 50.0)
        
        if health_score >= 80:
            return "Excellent"
        elif health_score >= 60:
            return "Good"
        elif health_score >= 40:
            return "Fair"
        elif health_score >= 20:
            return "Poor"
        else:
            return "Critical"
    
    def _calculate_uptime(self) -> str:
        """Calculate system uptime"""
        try:
            boot_time = datetime.fromtimestamp(psutil.boot_time())
            uptime = datetime.now() - boot_time
            
            days = uptime.days
            hours, remainder = divmod(uptime.seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            
            return f"{days}d {hours}h {minutes}m"
        except:
            return "Unknown"
    
    def _get_system_info(self) -> Dict:
        """Get basic system information"""
        try:
            return {
                "platform": os.name,
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "disk_total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
                "python_version": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}"
            }
        except:
            return {}
    
    def _calculate_period_health(self, metrics_data: List[Dict]) -> float:
        """Calculate average health score for a time period"""
        if not metrics_data:
            return 50.0
        
        health_scores = [m.get("health_score", 50.0) for m in metrics_data]
        return round(sum(health_scores) / len(health_scores), 2)

class HealthChecker:
    """
    Simple health check utilities
    """
    
    @staticmethod
    def check_database_health(db_manager) -> Dict:
        """Check database health"""
        try:
            # Test database connection
            result = db_manager.execute_query("SELECT 1 as test")
            
            if result:
                return {
                    "status": "healthy",
                    "message": "Database connection successful",
                    "response_time_ms": 50  # Mock response time
                }
            else:
                return {
                    "status": "unhealthy",
                    "message": "Database query failed",
                    "response_time_ms": None
                }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Database health check failed: {e}",
                "response_time_ms": None
            }
    
    @staticmethod
    def check_system_resources() -> Dict:
        """Check system resource availability"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Determine overall status
            issues = []
            if cpu_percent > 90:
                issues.append("High CPU usage")
            if memory.percent > 90:
                issues.append("High memory usage")
            if disk.percent > 95:
                issues.append("Low disk space")
            
            status = "healthy" if not issues else "warning" if len(issues) == 1 else "critical"
            
            return {
                "status": status,
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent,
                "issues": issues
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Resource check failed: {e}"
            }
    
    @staticmethod
    def check_evolution_system(db_manager) -> Dict:
        """Check autonomous evolution system health"""
        try:
            # Get recent evolution activity
            recent_activity = db_manager.get_recent_evolution_activity(hours=24)
            
            # Check for errors
            recent_errors = db_manager.get_recent_evolution_errors(hours=24)
            
            # Determine status
            if recent_errors and len(recent_errors) > 5:
                status = "unhealthy"
                message = f"High error rate: {len(recent_errors)} errors in 24h"
            elif recent_activity:
                status = "healthy"
                message = f"Active evolution system: {len(recent_activity)} activities in 24h"
            else:
                status = "idle"
                message = "No recent evolution activity"
            
            return {
                "status": status,
                "message": message,
                "recent_activities": len(recent_activity) if recent_activity else 0,
                "recent_errors": len(recent_errors) if recent_errors else 0
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Evolution system check failed: {e}"
            }
