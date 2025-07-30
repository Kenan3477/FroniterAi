"""
Frontier Error Handling and Recovery System

Comprehensive error handling providing:
- Graceful error recovery mechanisms
- Circuit breaker patterns
- Fallback strategies
- Error classification and routing
- Automated recovery procedures
- Alert generation and notification
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import traceback
import functools
from pathlib import Path
import sys

# Add project path
current_dir = Path(__file__).parent
project_root = current_dir.parent
sys.path.insert(0, str(project_root))

logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """Error severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """Error categories"""
    NETWORK = "network"
    DATABASE = "database"
    API = "api"
    AI_MODEL = "ai_model"
    DATA_FEED = "data_feed"
    COMPLIANCE = "compliance"
    WEBSOCKET = "websocket"
    SYSTEM = "system"
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"


class RecoveryStrategy(Enum):
    """Recovery strategies"""
    RETRY = "retry"
    FALLBACK = "fallback"
    CIRCUIT_BREAKER = "circuit_breaker"
    DEGRADED_MODE = "degraded_mode"
    MANUAL_INTERVENTION = "manual_intervention"


@dataclass
class ErrorContext:
    """Error context information"""
    error_id: str
    component: str
    category: ErrorCategory
    severity: ErrorSeverity
    message: str
    exception: Optional[Exception]
    timestamp: datetime
    context_data: Dict[str, Any] = field(default_factory=dict)
    stack_trace: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None


@dataclass
class RecoveryAction:
    """Recovery action definition"""
    strategy: RecoveryStrategy
    action: Callable
    max_attempts: int
    backoff_multiplier: float
    timeout: float
    fallback_action: Optional[Callable] = None
    conditions: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CircuitBreakerState:
    """Circuit breaker state"""
    component: str
    failure_count: int
    last_failure_time: Optional[datetime]
    state: str  # CLOSED, OPEN, HALF_OPEN
    failure_threshold: int
    timeout: int
    success_threshold: int = 3


class ErrorHandler:
    """
    Central error handling and recovery system
    """
    
    def __init__(self):
        self.error_history: List[ErrorContext] = []
        self.recovery_actions: Dict[str, RecoveryAction] = {}
        self.circuit_breakers: Dict[str, CircuitBreakerState] = {}
        self.error_counts: Dict[str, int] = {}
        self.fallback_handlers: Dict[ErrorCategory, Callable] = {}
        
        # Configuration
        self.max_error_history = 1000
        self.error_rate_window = 300  # 5 minutes
        self.critical_error_threshold = 10
        
        # Setup default recovery actions
        self._setup_default_recovery_actions()
        self._setup_default_fallback_handlers()
        
        logger.info("Error Handler initialized")
    
    def _setup_default_recovery_actions(self):
        """Setup default recovery actions for different error types"""
        
        # Network errors - retry with exponential backoff
        self.recovery_actions["network_error"] = RecoveryAction(
            strategy=RecoveryStrategy.RETRY,
            action=self._retry_with_backoff,
            max_attempts=3,
            backoff_multiplier=2.0,
            timeout=30.0
        )
        
        # Database errors - retry then fallback
        self.recovery_actions["database_error"] = RecoveryAction(
            strategy=RecoveryStrategy.CIRCUIT_BREAKER,
            action=self._database_recovery,
            max_attempts=2,
            backoff_multiplier=1.5,
            timeout=15.0,
            fallback_action=self._database_fallback
        )
        
        # API errors - circuit breaker pattern
        self.recovery_actions["api_error"] = RecoveryAction(
            strategy=RecoveryStrategy.CIRCUIT_BREAKER,
            action=self._api_recovery,
            max_attempts=3,
            backoff_multiplier=2.0,
            timeout=20.0,
            fallback_action=self._api_fallback
        )
        
        # AI model errors - fallback to simpler model
        self.recovery_actions["ai_model_error"] = RecoveryAction(
            strategy=RecoveryStrategy.FALLBACK,
            action=self._ai_model_fallback,
            max_attempts=1,
            backoff_multiplier=1.0,
            timeout=10.0
        )
        
        # Data feed errors - retry with circuit breaker
        self.recovery_actions["data_feed_error"] = RecoveryAction(
            strategy=RecoveryStrategy.CIRCUIT_BREAKER,
            action=self._data_feed_recovery,
            max_attempts=2,
            backoff_multiplier=2.0,
            timeout=30.0,
            fallback_action=self._data_feed_fallback
        )
    
    def _setup_default_fallback_handlers(self):
        """Setup default fallback handlers"""
        
        self.fallback_handlers = {
            ErrorCategory.NETWORK: self._network_fallback,
            ErrorCategory.DATABASE: self._database_fallback,
            ErrorCategory.API: self._api_fallback,
            ErrorCategory.AI_MODEL: self._ai_model_fallback,
            ErrorCategory.DATA_FEED: self._data_feed_fallback,
            ErrorCategory.COMPLIANCE: self._compliance_fallback,
            ErrorCategory.WEBSOCKET: self._websocket_fallback,
            ErrorCategory.SYSTEM: self._system_fallback
        }
    
    async def handle_error(
        self,
        component: str,
        category: ErrorCategory,
        severity: ErrorSeverity,
        exception: Exception,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Handle an error with appropriate recovery strategy"""
        
        try:
            # Create error context
            error_context = ErrorContext(
                error_id=f"{component}_{int(time.time())}",
                component=component,
                category=category,
                severity=severity,
                message=str(exception),
                exception=exception,
                timestamp=datetime.now(),
                context_data=context or {},
                stack_trace=traceback.format_exc(),
                user_id=user_id,
                request_id=request_id
            )
            
            # Log error
            self._log_error(error_context)
            
            # Store error history
            self._store_error(error_context)
            
            # Check for error patterns
            await self._check_error_patterns(error_context)
            
            # Determine recovery strategy
            recovery_result = await self._execute_recovery(error_context)
            
            # Send alerts if necessary
            await self._send_alerts(error_context, recovery_result)
            
            return {
                "error_id": error_context.error_id,
                "handled": True,
                "recovery_attempted": recovery_result.get("attempted", False),
                "recovery_successful": recovery_result.get("successful", False),
                "fallback_used": recovery_result.get("fallback_used", False),
                "message": recovery_result.get("message", "Error handled")
            }
            
        except Exception as handler_error:
            logger.error(f"Error in error handler: {handler_error}")
            return {
                "error_id": f"handler_error_{int(time.time())}",
                "handled": False,
                "message": "Error handler failed"
            }
    
    def _log_error(self, error_context: ErrorContext):
        """Log error with appropriate level"""
        
        log_message = f"[{error_context.component}] {error_context.message}"
        
        if error_context.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message, exc_info=error_context.exception)
        elif error_context.severity == ErrorSeverity.HIGH:
            logger.error(log_message, exc_info=error_context.exception)
        elif error_context.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message)
        else:
            logger.info(log_message)
    
    def _store_error(self, error_context: ErrorContext):
        """Store error in history"""
        
        self.error_history.append(error_context)
        
        # Trim history if too large
        if len(self.error_history) > self.max_error_history:
            self.error_history = self.error_history[-self.max_error_history:]
        
        # Update error counts
        self.error_counts[error_context.component] = self.error_counts.get(error_context.component, 0) + 1
    
    async def _check_error_patterns(self, error_context: ErrorContext):
        """Check for error patterns that might indicate systemic issues"""
        
        # Check error rate for component
        recent_errors = [
            e for e in self.error_history
            if e.component == error_context.component
            and (datetime.now() - e.timestamp).total_seconds() < self.error_rate_window
        ]
        
        if len(recent_errors) >= self.critical_error_threshold:
            logger.critical(f"High error rate detected for {error_context.component}: {len(recent_errors)} errors in {self.error_rate_window}s")
            
            # Update circuit breaker
            await self._update_circuit_breaker(error_context.component, failure=True)
    
    async def _execute_recovery(self, error_context: ErrorContext) -> Dict[str, Any]:
        """Execute recovery strategy for the error"""
        
        try:
            # Check circuit breaker state
            if await self._is_circuit_open(error_context.component):
                return {
                    "attempted": False,
                    "successful": False,
                    "fallback_used": True,
                    "message": "Circuit breaker open, using fallback"
                }
            
            # Get recovery action
            recovery_key = f"{error_context.category.value}_error"
            recovery_action = self.recovery_actions.get(recovery_key)
            
            if not recovery_action:
                # Use default fallback
                fallback_result = await self._execute_fallback(error_context)
                return {
                    "attempted": False,
                    "successful": False,
                    "fallback_used": True,
                    "message": "No recovery action defined, used fallback"
                }
            
            # Execute recovery based on strategy
            if recovery_action.strategy == RecoveryStrategy.RETRY:
                return await self._execute_retry_strategy(error_context, recovery_action)
            elif recovery_action.strategy == RecoveryStrategy.CIRCUIT_BREAKER:
                return await self._execute_circuit_breaker_strategy(error_context, recovery_action)
            elif recovery_action.strategy == RecoveryStrategy.FALLBACK:
                return await self._execute_fallback_strategy(error_context, recovery_action)
            else:
                # Default to fallback
                fallback_result = await self._execute_fallback(error_context)
                return {
                    "attempted": False,
                    "successful": False,
                    "fallback_used": True,
                    "message": "Unknown recovery strategy, used fallback"
                }
                
        except Exception as e:
            logger.error(f"Error in recovery execution: {e}")
            return {
                "attempted": True,
                "successful": False,
                "fallback_used": False,
                "message": "Recovery execution failed"
            }
    
    async def _execute_retry_strategy(self, error_context: ErrorContext, recovery_action: RecoveryAction) -> Dict[str, Any]:
        """Execute retry recovery strategy"""
        
        for attempt in range(recovery_action.max_attempts):
            try:
                # Wait with exponential backoff
                if attempt > 0:
                    wait_time = (recovery_action.backoff_multiplier ** attempt)
                    await asyncio.sleep(wait_time)
                
                # Attempt recovery
                result = await asyncio.wait_for(
                    recovery_action.action(error_context),
                    timeout=recovery_action.timeout
                )
                
                if result:
                    return {
                        "attempted": True,
                        "successful": True,
                        "fallback_used": False,
                        "message": f"Recovery successful on attempt {attempt + 1}"
                    }
                    
            except asyncio.TimeoutError:
                logger.warning(f"Recovery timeout on attempt {attempt + 1}")
            except Exception as e:
                logger.warning(f"Recovery failed on attempt {attempt + 1}: {e}")
        
        # All retries failed, use fallback
        if recovery_action.fallback_action:
            await recovery_action.fallback_action(error_context)
        else:
            await self._execute_fallback(error_context)
        
        return {
            "attempted": True,
            "successful": False,
            "fallback_used": True,
            "message": f"All {recovery_action.max_attempts} retry attempts failed, used fallback"
        }
    
    async def _execute_circuit_breaker_strategy(self, error_context: ErrorContext, recovery_action: RecoveryAction) -> Dict[str, Any]:
        """Execute circuit breaker recovery strategy"""
        
        # Check circuit breaker state
        if await self._is_circuit_open(error_context.component):
            if recovery_action.fallback_action:
                await recovery_action.fallback_action(error_context)
            else:
                await self._execute_fallback(error_context)
            
            return {
                "attempted": False,
                "successful": False,
                "fallback_used": True,
                "message": "Circuit breaker open, used fallback"
            }
        
        # Try recovery
        try:
            result = await asyncio.wait_for(
                recovery_action.action(error_context),
                timeout=recovery_action.timeout
            )
            
            if result:
                await self._update_circuit_breaker(error_context.component, failure=False)
                return {
                    "attempted": True,
                    "successful": True,
                    "fallback_used": False,
                    "message": "Circuit breaker recovery successful"
                }
            else:
                raise Exception("Recovery action returned False")
                
        except Exception as e:
            logger.warning(f"Circuit breaker recovery failed: {e}")
            await self._update_circuit_breaker(error_context.component, failure=True)
            
            # Use fallback
            if recovery_action.fallback_action:
                await recovery_action.fallback_action(error_context)
            else:
                await self._execute_fallback(error_context)
            
            return {
                "attempted": True,
                "successful": False,
                "fallback_used": True,
                "message": "Circuit breaker recovery failed, used fallback"
            }
    
    async def _execute_fallback_strategy(self, error_context: ErrorContext, recovery_action: RecoveryAction) -> Dict[str, Any]:
        """Execute fallback recovery strategy"""
        
        try:
            if recovery_action.fallback_action:
                await recovery_action.fallback_action(error_context)
            else:
                await self._execute_fallback(error_context)
            
            return {
                "attempted": True,
                "successful": True,
                "fallback_used": True,
                "message": "Fallback strategy executed successfully"
            }
            
        except Exception as e:
            logger.error(f"Fallback strategy failed: {e}")
            return {
                "attempted": True,
                "successful": False,
                "fallback_used": True,
                "message": "Fallback strategy failed"
            }
    
    async def _execute_fallback(self, error_context: ErrorContext):
        """Execute appropriate fallback based on error category"""
        
        fallback_handler = self.fallback_handlers.get(error_context.category)
        if fallback_handler:
            await fallback_handler(error_context)
        else:
            logger.warning(f"No fallback handler for category {error_context.category}")
    
    async def _is_circuit_open(self, component: str) -> bool:
        """Check if circuit breaker is open for component"""
        
        if component not in self.circuit_breakers:
            return False
        
        breaker = self.circuit_breakers[component]
        
        if breaker.state == "OPEN":
            # Check if timeout has passed
            if breaker.last_failure_time:
                time_since_failure = (datetime.now() - breaker.last_failure_time).total_seconds()
                if time_since_failure >= breaker.timeout:
                    # Move to half-open
                    breaker.state = "HALF_OPEN"
                    logger.info(f"Circuit breaker for {component} moved to HALF_OPEN")
                    return False
            return True
        
        return False
    
    async def _update_circuit_breaker(self, component: str, failure: bool):
        """Update circuit breaker state"""
        
        if component not in self.circuit_breakers:
            self.circuit_breakers[component] = CircuitBreakerState(
                component=component,
                failure_count=0,
                last_failure_time=None,
                state="CLOSED",
                failure_threshold=5,
                timeout=60  # 1 minute
            )
        
        breaker = self.circuit_breakers[component]
        
        if failure:
            breaker.failure_count += 1
            breaker.last_failure_time = datetime.now()
            
            if breaker.failure_count >= breaker.failure_threshold:
                breaker.state = "OPEN"
                logger.warning(f"Circuit breaker OPENED for {component}")
        else:
            # Success
            if breaker.state == "HALF_OPEN":
                breaker.state = "CLOSED"
                breaker.failure_count = 0
                logger.info(f"Circuit breaker CLOSED for {component}")
            else:
                breaker.failure_count = max(0, breaker.failure_count - 1)
    
    # Recovery action implementations
    async def _retry_with_backoff(self, error_context: ErrorContext) -> bool:
        """Generic retry with backoff"""
        try:
            # This is a placeholder - actual implementation would depend on the specific operation
            await asyncio.sleep(0.1)  # Simulate recovery attempt
            return True
        except Exception:
            return False
    
    async def _database_recovery(self, error_context: ErrorContext) -> bool:
        """Database recovery actions"""
        try:
            # Attempt to reconnect to database
            from api.utils.database import DatabaseManager
            db_manager = DatabaseManager()
            await db_manager.reconnect()
            return True
        except Exception as e:
            logger.error(f"Database recovery failed: {e}")
            return False
    
    async def _api_recovery(self, error_context: ErrorContext) -> bool:
        """API recovery actions"""
        try:
            # Check if API endpoint is responsive
            # This is a placeholder - actual implementation would make test requests
            await asyncio.sleep(0.1)
            return True
        except Exception:
            return False
    
    # Fallback implementations
    async def _network_fallback(self, error_context: ErrorContext):
        """Network error fallback"""
        logger.info(f"Using cached data for {error_context.component}")
        # Use cached data or alternative data source
    
    async def _database_fallback(self, error_context: ErrorContext):
        """Database error fallback"""
        logger.info(f"Using in-memory cache for {error_context.component}")
        # Use in-memory cache or read-only replica
    
    async def _api_fallback(self, error_context: ErrorContext):
        """API error fallback"""
        logger.info(f"Using fallback API for {error_context.component}")
        # Use alternative API or cached responses
    
    async def _ai_model_fallback(self, error_context: ErrorContext):
        """AI model error fallback"""
        logger.info(f"Using simpler model for {error_context.component}")
        # Use simpler AI model or rule-based system
    
    async def _data_feed_fallback(self, error_context: ErrorContext):
        """Data feed error fallback"""
        logger.info(f"Using alternative data source for {error_context.component}")
        # Use alternative data feed or historical data
    
    async def _data_feed_recovery(self, error_context: ErrorContext) -> bool:
        """Data feed recovery actions"""
        try:
            # Restart data feed
            from data_feeds.realtime_orchestrator import data_orchestrator
            # This would restart the specific feed
            return True
        except Exception:
            return False
    
    async def _compliance_fallback(self, error_context: ErrorContext):
        """Compliance error fallback"""
        logger.info(f"Using basic compliance checks for {error_context.component}")
        # Use basic rule-based compliance checking
    
    async def _websocket_fallback(self, error_context: ErrorContext):
        """WebSocket error fallback"""
        logger.info(f"Using HTTP polling for {error_context.component}")
        # Fall back to HTTP polling instead of WebSocket
    
    async def _system_fallback(self, error_context: ErrorContext):
        """System error fallback"""
        logger.info(f"Using degraded mode for {error_context.component}")
        # Use degraded system functionality
    
    async def _send_alerts(self, error_context: ErrorContext, recovery_result: Dict[str, Any]):
        """Send alerts for critical errors"""
        
        if error_context.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
            # Send alert notification
            alert_data = {
                "error_id": error_context.error_id,
                "component": error_context.component,
                "severity": error_context.severity.value,
                "message": error_context.message,
                "recovery_successful": recovery_result.get("successful", False),
                "timestamp": error_context.timestamp.isoformat()
            }
            
            logger.critical(f"ALERT: {alert_data}")
            
            # In a real system, this would send emails, Slack messages, etc.
    
    # Public API methods
    def get_error_statistics(self) -> Dict[str, Any]:
        """Get error statistics"""
        
        recent_errors = [
            e for e in self.error_history
            if (datetime.now() - e.timestamp).total_seconds() < 3600  # Last hour
        ]
        
        return {
            "total_errors": len(self.error_history),
            "recent_errors": len(recent_errors),
            "error_rate": len(recent_errors) / 60,  # Errors per minute
            "errors_by_component": self.error_counts,
            "errors_by_category": {
                category.value: len([e for e in recent_errors if e.category == category])
                for category in ErrorCategory
            },
            "errors_by_severity": {
                severity.value: len([e for e in recent_errors if e.severity == severity])
                for severity in ErrorSeverity
            },
            "circuit_breakers": {
                component: {
                    "state": breaker.state,
                    "failure_count": breaker.failure_count,
                    "last_failure": breaker.last_failure_time.isoformat() if breaker.last_failure_time else None
                }
                for component, breaker in self.circuit_breakers.items()
            }
        }
    
    def get_component_health(self, component: str) -> Dict[str, Any]:
        """Get health status for specific component"""
        
        component_errors = [e for e in self.error_history if e.component == component]
        recent_errors = [
            e for e in component_errors
            if (datetime.now() - e.timestamp).total_seconds() < 300  # Last 5 minutes
        ]
        
        circuit_breaker = self.circuit_breakers.get(component)
        
        return {
            "component": component,
            "health_status": "degraded" if circuit_breaker and circuit_breaker.state == "OPEN" else "healthy",
            "total_errors": len(component_errors),
            "recent_errors": len(recent_errors),
            "circuit_breaker_state": circuit_breaker.state if circuit_breaker else "CLOSED",
            "last_error": component_errors[-1].timestamp.isoformat() if component_errors else None
        }


# Decorator for automatic error handling
def handle_errors(
    component: str,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    raise_on_failure: bool = True
):
    """Decorator for automatic error handling"""
    
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # Handle error
                result = await error_handler.handle_error(
                    component=component,
                    category=category,
                    severity=severity,
                    exception=e
                )
                
                if raise_on_failure and not result.get("recovery_successful", False):
                    raise e
                
                return result
        
        return wrapper
    return decorator


# Global error handler instance
error_handler = ErrorHandler()
