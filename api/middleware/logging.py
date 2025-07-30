"""
Logging Middleware

Comprehensive logging system with request/response logging, performance monitoring,
security event tracking, and structured log formatting for analysis.
"""

import time
import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import asyncio
from pathlib import Path

from ..config import settings

# Configure structured logging
class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record):
        """Format log record as structured JSON"""
        
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add extra fields if present
        if hasattr(record, 'request_id'):
            log_data["request_id"] = record.request_id
        if hasattr(record, 'user_id'):
            log_data["user_id"] = record.user_id
        if hasattr(record, 'endpoint'):
            log_data["endpoint"] = record.endpoint
        if hasattr(record, 'duration_ms'):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, 'status_code'):
            log_data["status_code"] = record.status_code
        if hasattr(record, 'ip_address'):
            log_data["ip_address"] = record.ip_address
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Logging middleware for comprehensive request/response tracking"""
    
    def __init__(self, app):
        super().__init__(app)
        self.setup_logging()
        self.performance_metrics = {}
        self.security_events = []
    
    def setup_logging(self):
        """Setup logging configuration"""
        
        # Create loggers
        self.access_logger = logging.getLogger("frontier.access")
        self.security_logger = logging.getLogger("frontier.security") 
        self.performance_logger = logging.getLogger("frontier.performance")
        self.error_logger = logging.getLogger("frontier.error")
        
        # Set log levels
        log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        for logger in [self.access_logger, self.security_logger, self.performance_logger, self.error_logger]:
            logger.setLevel(log_level)
        
        # Create handlers
        if settings.LOG_FILE:
            # File handler with rotation
            from logging.handlers import RotatingFileHandler
            
            log_dir = Path(settings.LOG_FILE).parent
            log_dir.mkdir(parents=True, exist_ok=True)
            
            file_handler = RotatingFileHandler(
                settings.LOG_FILE,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            )
            file_handler.setFormatter(StructuredFormatter())
            
            for logger in [self.access_logger, self.security_logger, self.performance_logger, self.error_logger]:
                logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(StructuredFormatter())
        
        for logger in [self.access_logger, self.security_logger, self.performance_logger, self.error_logger]:
            logger.addHandler(console_handler)
    
    async def dispatch(self, request: Request, call_next):
        """Process logging for each request"""
        
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Extract request info
        start_time = time.time()
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")
        method = request.method
        url = str(request.url)
        endpoint = request.url.path
        
        # Get user info if available
        user_id = None
        if hasattr(request.state, 'user') and request.state.user:
            user_id = request.state.user.get('username')
        
        # Log request start
        self.access_logger.info(
            f"Request started: {method} {endpoint}",
            extra={
                "request_id": request_id,
                "user_id": user_id,
                "endpoint": endpoint,
                "method": method,
                "ip_address": client_ip,
                "user_agent": user_agent,
                "url": url
            }
        )
        
        # Check for security events
        await self._check_security_events(request, client_ip, user_agent)
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate processing time
            duration_ms = (time.time() - start_time) * 1000
            
            # Log request completion
            self.access_logger.info(
                f"Request completed: {method} {endpoint} - {response.status_code}",
                extra={
                    "request_id": request_id,
                    "user_id": user_id,
                    "endpoint": endpoint,
                    "method": method,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "ip_address": client_ip
                }
            )
            
            # Log performance metrics
            await self._log_performance_metrics(endpoint, duration_ms, response.status_code)
            
            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
            
        except Exception as e:
            # Calculate processing time for errors
            duration_ms = (time.time() - start_time) * 1000
            
            # Log error
            self.error_logger.error(
                f"Request failed: {method} {endpoint} - {str(e)}",
                extra={
                    "request_id": request_id,
                    "user_id": user_id,
                    "endpoint": endpoint,
                    "method": method,
                    "duration_ms": duration_ms,
                    "ip_address": client_ip,
                    "error": str(e)
                },
                exc_info=True
            )
            
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        
        # Check X-Forwarded-For header (for load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to direct client IP
        return request.client.host if request.client else "unknown"
    
    async def _check_security_events(self, request: Request, client_ip: str, user_agent: str):
        """Check for potential security events"""
        
        # Check for suspicious patterns
        suspicious_patterns = [
            "script", "select", "union", "drop", "delete", "insert",
            "../", "..\\", "<script", "javascript:", "onload=", "onerror="
        ]
        
        url_lower = str(request.url).lower()
        for pattern in suspicious_patterns:
            if pattern in url_lower:
                self.security_logger.warning(
                    f"Suspicious request pattern detected: {pattern}",
                    extra={
                        "request_id": request.state.request_id,
                        "ip_address": client_ip,
                        "user_agent": user_agent,
                        "url": str(request.url),
                        "pattern": pattern,
                        "event_type": "suspicious_pattern"
                    }
                )
                break
        
        # Check for unusual request rates from same IP
        await self._check_request_rate(client_ip)
        
        # Check for suspicious user agents
        if self._is_suspicious_user_agent(user_agent):
            self.security_logger.warning(
                f"Suspicious user agent detected",
                extra={
                    "request_id": request.state.request_id,
                    "ip_address": client_ip,
                    "user_agent": user_agent,
                    "event_type": "suspicious_user_agent"
                }
            )
    
    async def _check_request_rate(self, client_ip: str):
        """Check for unusual request rates"""
        
        current_time = time.time()
        minute_key = f"{client_ip}:{int(current_time // 60)}"
        
        if minute_key not in self.performance_metrics:
            self.performance_metrics[minute_key] = 0
        
        self.performance_metrics[minute_key] += 1
        
        # Alert if more than 100 requests per minute from same IP
        if self.performance_metrics[minute_key] > 100:
            self.security_logger.warning(
                f"High request rate detected from IP: {client_ip}",
                extra={
                    "ip_address": client_ip,
                    "requests_per_minute": self.performance_metrics[minute_key],
                    "event_type": "high_request_rate"
                }
            )
        
        # Clean old metrics
        cutoff_time = current_time - 300  # 5 minutes
        keys_to_remove = [
            key for key in self.performance_metrics.keys() 
            if int(key.split(":")[-1]) * 60 < cutoff_time
        ]
        for key in keys_to_remove:
            del self.performance_metrics[key]
    
    def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent is suspicious"""
        
        suspicious_agents = [
            "sqlmap", "nmap", "nikto", "dirb", "gobuster", 
            "masscan", "nessus", "burp", "crawler", "bot"
        ]
        
        user_agent_lower = user_agent.lower()
        return any(agent in user_agent_lower for agent in suspicious_agents)
    
    async def _log_performance_metrics(self, endpoint: str, duration_ms: float, status_code: int):
        """Log performance metrics"""
        
        # Track slow requests
        if duration_ms > 5000:  # Slower than 5 seconds
            self.performance_logger.warning(
                f"Slow request detected: {endpoint}",
                extra={
                    "endpoint": endpoint,
                    "duration_ms": duration_ms,
                    "status_code": status_code,
                    "event_type": "slow_request"
                }
            )
        
        # Track error rates
        if status_code >= 500:
            self.performance_logger.error(
                f"Server error: {endpoint}",
                extra={
                    "endpoint": endpoint,
                    "duration_ms": duration_ms,
                    "status_code": status_code,
                    "event_type": "server_error"
                }
            )


class SecurityEventMonitor:
    """Monitor and analyze security events"""
    
    def __init__(self):
        self.events = []
        self.blocked_ips = set()
        self.suspicious_patterns = {}
    
    def add_security_event(self, event_type: str, details: Dict[str, Any]):
        """Add a security event"""
        
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "details": details
        }
        
        self.events.append(event)
        
        # Keep only last 1000 events
        if len(self.events) > 1000:
            self.events = self.events[-1000:]
        
        # Analyze patterns
        self._analyze_patterns(event)
    
    def _analyze_patterns(self, event: Dict[str, Any]):
        """Analyze security event patterns"""
        
        ip_address = event["details"].get("ip_address")
        if not ip_address:
            return
        
        # Count events per IP
        if ip_address not in self.suspicious_patterns:
            self.suspicious_patterns[ip_address] = {
                "total_events": 0,
                "event_types": {},
                "first_seen": event["timestamp"]
            }
        
        pattern = self.suspicious_patterns[ip_address]
        pattern["total_events"] += 1
        pattern["last_seen"] = event["timestamp"]
        
        event_type = event["event_type"]
        if event_type not in pattern["event_types"]:
            pattern["event_types"][event_type] = 0
        pattern["event_types"][event_type] += 1
        
        # Auto-block IPs with too many security events
        if pattern["total_events"] > 50:
            self.blocked_ips.add(ip_address)
            logging.getLogger("frontier.security").critical(
                f"IP address auto-blocked due to excessive security events: {ip_address}",
                extra={
                    "ip_address": ip_address,
                    "total_events": pattern["total_events"],
                    "event_types": pattern["event_types"]
                }
            )
    
    def is_ip_blocked(self, ip_address: str) -> bool:
        """Check if IP is blocked"""
        return ip_address in self.blocked_ips
    
    def get_security_summary(self) -> Dict[str, Any]:
        """Get security event summary"""
        
        recent_events = [
            event for event in self.events 
            if (datetime.now() - datetime.fromisoformat(event["timestamp"])).seconds < 3600
        ]
        
        event_types = {}
        for event in recent_events:
            event_type = event["event_type"]
            event_types[event_type] = event_types.get(event_type, 0) + 1
        
        return {
            "total_events_last_hour": len(recent_events),
            "event_types": event_types,
            "blocked_ips": list(self.blocked_ips),
            "top_suspicious_ips": sorted(
                self.suspicious_patterns.items(),
                key=lambda x: x[1]["total_events"],
                reverse=True
            )[:10]
        }


# Global instances
security_monitor = SecurityEventMonitor()


class AuditLogger:
    """Audit logger for compliance and regulatory requirements"""
    
    def __init__(self):
        self.audit_logger = logging.getLogger("frontier.audit")
        self.audit_logger.setLevel(logging.INFO)
        
        # Setup audit log file
        audit_file = Path("./logs/audit.log")
        audit_file.parent.mkdir(parents=True, exist_ok=True)
        
        from logging.handlers import RotatingFileHandler
        audit_handler = RotatingFileHandler(
            audit_file,
            maxBytes=50*1024*1024,  # 50MB
            backupCount=10
        )
        audit_handler.setFormatter(StructuredFormatter())
        self.audit_logger.addHandler(audit_handler)
    
    def log_user_action(self, user_id: str, action: str, resource: str, details: Dict[str, Any] = None):
        """Log user actions for audit trail"""
        
        self.audit_logger.info(
            f"User action: {action}",
            extra={
                "user_id": user_id,
                "action": action,
                "resource": resource,
                "details": details or {},
                "audit_type": "user_action"
            }
        )
    
    def log_data_access(self, user_id: str, data_type: str, operation: str, details: Dict[str, Any] = None):
        """Log data access for compliance"""
        
        self.audit_logger.info(
            f"Data access: {operation} on {data_type}",
            extra={
                "user_id": user_id,
                "data_type": data_type,
                "operation": operation,
                "details": details or {},
                "audit_type": "data_access"
            }
        )
    
    def log_system_event(self, event_type: str, details: Dict[str, Any] = None):
        """Log system events"""
        
        self.audit_logger.info(
            f"System event: {event_type}",
            extra={
                "event_type": event_type,
                "details": details or {},
                "audit_type": "system_event"
            }
        )


# Global audit logger
audit_logger = AuditLogger()
