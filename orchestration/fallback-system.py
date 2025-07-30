"""
Fallback and Resilience System
Implements comprehensive fallback mechanisms and system resilience for Frontier modules
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Set
import aiohttp
from collections import defaultdict
import statistics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FailureType(Enum):
    """Types of failures that can trigger fallbacks"""
    TIMEOUT = "timeout"
    ERROR_RESPONSE = "error_response"
    LOW_CONFIDENCE = "low_confidence"
    SERVICE_UNAVAILABLE = "service_unavailable"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    HEALTH_CHECK_FAILED = "health_check_failed"
    QUALITY_THRESHOLD_NOT_MET = "quality_threshold_not_met"

class FallbackStrategy(Enum):
    """Different fallback strategies"""
    SEQUENTIAL = "sequential"           # Try fallbacks one by one
    PARALLEL = "parallel"               # Try multiple fallbacks simultaneously
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"  # Distribute based on weights
    ADAPTIVE = "adaptive"               # Learn and adapt strategy over time
    CIRCUIT_BREAKER = "circuit_breaker" # Temporarily disable failing modules

class ResilienceLevel(Enum):
    """Levels of system resilience"""
    BASIC = "basic"                     # Simple retry mechanisms
    ENHANCED = "enhanced"               # Multiple fallback paths
    ADVANCED = "advanced"               # Predictive failure handling
    SELF_HEALING = "self_healing"       # Automatic recovery and adaptation

@dataclass
class FallbackRule:
    """Rule defining fallback behavior"""
    trigger_conditions: List[FailureType]
    fallback_modules: List[str]
    strategy: FallbackStrategy
    max_retries: int = 3
    retry_delay: float = 1.0
    timeout: float = 30.0
    quality_threshold: float = 0.6
    success_rate_threshold: float = 0.8
    enabled: bool = True
    priority: int = 1  # Higher priority rules are checked first

@dataclass
class CircuitBreakerState:
    """State of a circuit breaker for a module"""
    module_id: str
    state: str = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    failure_count: int = 0
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    failure_threshold: int = 5
    recovery_timeout: int = 60  # seconds
    half_open_max_calls: int = 3
    half_open_call_count: int = 0

@dataclass
class FailureRecord:
    """Record of a failure event"""
    timestamp: datetime
    module_id: str
    failure_type: FailureType
    error_message: str
    request_context: Dict[str, Any]
    response_time: float
    attempted_fallbacks: List[str] = field(default_factory=list)
    final_success: bool = False
    final_module: Optional[str] = None

@dataclass
class ModuleHealthMetrics:
    """Health metrics for a module"""
    module_id: str
    success_rate: float = 1.0
    avg_response_time: float = 0.0
    error_count: int = 0
    total_requests: int = 0
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    confidence_scores: List[float] = field(default_factory=list)
    availability: float = 1.0

class HealthMonitor:
    """Monitors module health and performance"""
    
    def __init__(self, monitoring_window: int = 300):  # 5 minutes
        self.monitoring_window = monitoring_window
        self.module_metrics: Dict[str, ModuleHealthMetrics] = {}
        self.failure_history: List[FailureRecord] = []
        self.max_history_size = 10000
        
    def record_request(self, module_id: str, success: bool, 
                      response_time: float, confidence_score: float = 1.0,
                      error_message: str = None):
        """Record a request outcome for health tracking"""
        if module_id not in self.module_metrics:
            self.module_metrics[module_id] = ModuleHealthMetrics(module_id=module_id)
        
        metrics = self.module_metrics[module_id]
        metrics.total_requests += 1
        
        # Update response time (rolling average)
        if metrics.total_requests == 1:
            metrics.avg_response_time = response_time
        else:
            # Use exponential moving average
            alpha = 0.1
            metrics.avg_response_time = (
                alpha * response_time + (1 - alpha) * metrics.avg_response_time
            )
        
        # Update success metrics
        if success:
            metrics.last_success = datetime.utcnow()
            metrics.confidence_scores.append(confidence_score)
            
            # Keep only recent confidence scores
            if len(metrics.confidence_scores) > 100:
                metrics.confidence_scores = metrics.confidence_scores[-100:]
        else:
            metrics.error_count += 1
            metrics.last_failure = datetime.utcnow()
        
        # Calculate success rate (over recent requests)
        recent_window = min(100, metrics.total_requests)
        recent_errors = min(metrics.error_count, recent_window)
        metrics.success_rate = (recent_window - recent_errors) / recent_window
        
        # Calculate availability (percentage of time service was available)
        self._update_availability(metrics)
    
    def _update_availability(self, metrics: ModuleHealthMetrics):
        """Update availability based on recent uptime"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.monitoring_window)
        
        # Simple availability calculation
        if metrics.last_failure and metrics.last_failure > window_start:
            if metrics.last_success and metrics.last_success > metrics.last_failure:
                # Service recovered
                downtime = (metrics.last_success - metrics.last_failure).total_seconds()
                metrics.availability = max(0.0, 1.0 - (downtime / self.monitoring_window))
            else:
                # Service is still down
                downtime = (now - metrics.last_failure).total_seconds()
                metrics.availability = max(0.0, 1.0 - (downtime / self.monitoring_window))
        else:
            # No recent failures
            metrics.availability = 1.0
    
    def get_module_health(self, module_id: str) -> Optional[ModuleHealthMetrics]:
        """Get current health metrics for a module"""
        return self.module_metrics.get(module_id)
    
    def is_module_healthy(self, module_id: str, 
                         min_success_rate: float = 0.8,
                         max_response_time: float = 5000.0,
                         min_availability: float = 0.95) -> bool:
        """Check if module meets health criteria"""
        metrics = self.get_module_health(module_id)
        if not metrics:
            return False
        
        return (
            metrics.success_rate >= min_success_rate and
            metrics.avg_response_time <= max_response_time and
            metrics.availability >= min_availability
        )
    
    def get_system_health_summary(self) -> Dict[str, Any]:
        """Get overall system health summary"""
        if not self.module_metrics:
            return {'status': 'no_data', 'modules': {}}
        
        healthy_modules = 0
        total_modules = len(self.module_metrics)
        
        module_summaries = {}
        for module_id, metrics in self.module_metrics.items():
            is_healthy = self.is_module_healthy(module_id)
            if is_healthy:
                healthy_modules += 1
            
            module_summaries[module_id] = {
                'healthy': is_healthy,
                'success_rate': metrics.success_rate,
                'avg_response_time': metrics.avg_response_time,
                'availability': metrics.availability,
                'total_requests': metrics.total_requests,
                'error_count': metrics.error_count
            }
        
        overall_health = healthy_modules / total_modules if total_modules > 0 else 0.0
        
        return {
            'status': 'healthy' if overall_health > 0.8 else 'degraded' if overall_health > 0.5 else 'unhealthy',
            'overall_health_percentage': overall_health * 100,
            'healthy_modules': healthy_modules,
            'total_modules': total_modules,
            'modules': module_summaries
        }

class CircuitBreakerManager:
    """Manages circuit breakers for module resilience"""
    
    def __init__(self):
        self.circuit_breakers: Dict[str, CircuitBreakerState] = {}
        self.default_failure_threshold = 5
        self.default_recovery_timeout = 60
    
    def get_circuit_breaker(self, module_id: str) -> CircuitBreakerState:
        """Get or create circuit breaker for module"""
        if module_id not in self.circuit_breakers:
            self.circuit_breakers[module_id] = CircuitBreakerState(
                module_id=module_id,
                failure_threshold=self.default_failure_threshold,
                recovery_timeout=self.default_recovery_timeout
            )
        return self.circuit_breakers[module_id]
    
    def can_call_module(self, module_id: str) -> bool:
        """Check if module can be called based on circuit breaker state"""
        cb = self.get_circuit_breaker(module_id)
        now = datetime.utcnow()
        
        if cb.state == "CLOSED":
            return True
        elif cb.state == "OPEN":
            # Check if recovery timeout has passed
            if (cb.last_failure_time and 
                (now - cb.last_failure_time).total_seconds() > cb.recovery_timeout):
                cb.state = "HALF_OPEN"
                cb.half_open_call_count = 0
                logger.info(f"Circuit breaker for {module_id} moved to HALF_OPEN")
                return True
            return False
        elif cb.state == "HALF_OPEN":
            return cb.half_open_call_count < cb.half_open_max_calls
        
        return False
    
    def record_success(self, module_id: str):
        """Record successful call"""
        cb = self.get_circuit_breaker(module_id)
        cb.last_success_time = datetime.utcnow()
        
        if cb.state == "HALF_OPEN":
            cb.half_open_call_count += 1
            if cb.half_open_call_count >= cb.half_open_max_calls:
                cb.state = "CLOSED"
                cb.failure_count = 0
                logger.info(f"Circuit breaker for {module_id} moved to CLOSED")
        elif cb.state == "CLOSED":
            cb.failure_count = max(0, cb.failure_count - 1)  # Gradually reduce failure count
    
    def record_failure(self, module_id: str):
        """Record failed call"""
        cb = self.get_circuit_breaker(module_id)
        cb.last_failure_time = datetime.utcnow()
        cb.failure_count += 1
        
        if cb.state == "CLOSED" and cb.failure_count >= cb.failure_threshold:
            cb.state = "OPEN"
            logger.warning(f"Circuit breaker for {module_id} moved to OPEN after {cb.failure_count} failures")
        elif cb.state == "HALF_OPEN":
            cb.state = "OPEN"
            logger.warning(f"Circuit breaker for {module_id} moved back to OPEN")
    
    def force_open(self, module_id: str):
        """Manually open circuit breaker"""
        cb = self.get_circuit_breaker(module_id)
        cb.state = "OPEN"
        cb.last_failure_time = datetime.utcnow()
        logger.info(f"Circuit breaker for {module_id} manually opened")
    
    def force_close(self, module_id: str):
        """Manually close circuit breaker"""
        cb = self.get_circuit_breaker(module_id)
        cb.state = "CLOSED"
        cb.failure_count = 0
        logger.info(f"Circuit breaker for {module_id} manually closed")
    
    def get_all_states(self) -> Dict[str, str]:
        """Get states of all circuit breakers"""
        return {module_id: cb.state for module_id, cb in self.circuit_breakers.items()}

class AdaptiveFallbackManager:
    """Advanced fallback manager with learning capabilities"""
    
    def __init__(self):
        self.fallback_rules: Dict[str, List[FallbackRule]] = {}
        self.health_monitor = HealthMonitor()
        self.circuit_breaker_manager = CircuitBreakerManager()
        self.failure_history: List[FailureRecord] = []
        
        # Learning parameters
        self.success_history: Dict[str, List[bool]] = defaultdict(list)
        self.fallback_performance: Dict[tuple, float] = {}  # (primary, fallback) -> success_rate
        
        # Adaptive parameters
        self.min_confidence_threshold = 0.4
        self.adaptation_window = 100  # Number of requests to consider for adaptation
        
    def register_fallback_rule(self, primary_module: str, rule: FallbackRule):
        """Register a fallback rule for a primary module"""
        if primary_module not in self.fallback_rules:
            self.fallback_rules[primary_module] = []
        
        # Insert rule based on priority
        inserted = False
        for i, existing_rule in enumerate(self.fallback_rules[primary_module]):
            if rule.priority > existing_rule.priority:
                self.fallback_rules[primary_module].insert(i, rule)
                inserted = True
                break
        
        if not inserted:
            self.fallback_rules[primary_module].append(rule)
        
        logger.info(f"Registered fallback rule for {primary_module}: {rule.fallback_modules}")
    
    def should_fallback(self, module_id: str, response_data: Dict[str, Any]) -> tuple[bool, FailureType]:
        """Determine if fallback is needed based on response"""
        # Check circuit breaker
        if not self.circuit_breaker_manager.can_call_module(module_id):
            return True, FailureType.SERVICE_UNAVAILABLE
        
        # Check for explicit errors
        if response_data.get('error'):
            return True, FailureType.ERROR_RESPONSE
        
        # Check timeout
        response_time = response_data.get('processing_time', 0)
        if response_time > 30.0:  # 30 second timeout
            return True, FailureType.TIMEOUT
        
        # Check confidence score
        confidence = response_data.get('confidence_score', 1.0)
        if confidence < self.min_confidence_threshold:
            return True, FailureType.LOW_CONFIDENCE
        
        # Check quality metrics
        quality_metrics = response_data.get('quality_metrics', {})
        if quality_metrics:
            avg_quality = sum(quality_metrics.values()) / len(quality_metrics)
            if avg_quality < 0.6:
                return True, FailureType.QUALITY_THRESHOLD_NOT_MET
        
        return False, None
    
    async def execute_fallback(self, primary_module: str, request_data: Dict[str, Any],
                              failure_type: FailureType) -> Dict[str, Any]:
        """Execute fallback strategy for failed primary module"""
        
        # Record the failure
        failure_record = FailureRecord(
            timestamp=datetime.utcnow(),
            module_id=primary_module,
            failure_type=failure_type,
            error_message=request_data.get('error', f"Fallback triggered: {failure_type.value}"),
            request_context=request_data,
            response_time=request_data.get('processing_time', 0)
        )
        
        # Update circuit breaker
        self.circuit_breaker_manager.record_failure(primary_module)
        
        # Find applicable fallback rules
        applicable_rules = self._find_applicable_rules(primary_module, failure_type)
        
        if not applicable_rules:
            logger.warning(f"No fallback rules found for {primary_module} with failure type {failure_type.value}")
            return self._create_error_response(f"No fallback available for {primary_module}")
        
        # Execute fallback based on strategy
        for rule in applicable_rules:
            if not rule.enabled:
                continue
            
            try:
                result = await self._execute_rule(rule, request_data, failure_record)
                if result and not result.get('error'):
                    failure_record.final_success = True
                    failure_record.final_module = result.get('module_used')
                    self._update_fallback_performance(primary_module, result.get('module_used'), True)
                    return result
                else:
                    self._update_fallback_performance(primary_module, rule.fallback_modules[0], False)
                    
            except Exception as e:
                logger.error(f"Error executing fallback rule: {e}")
                continue
        
        # All fallbacks failed
        self.failure_history.append(failure_record)
        return self._create_error_response(f"All fallbacks failed for {primary_module}")
    
    def _find_applicable_rules(self, module_id: str, failure_type: FailureType) -> List[FallbackRule]:
        """Find fallback rules applicable to the failure"""
        if module_id not in self.fallback_rules:
            return []
        
        applicable_rules = []
        for rule in self.fallback_rules[module_id]:
            if failure_type in rule.trigger_conditions:
                applicable_rules.append(rule)
        
        return applicable_rules
    
    async def _execute_rule(self, rule: FallbackRule, request_data: Dict[str, Any],
                           failure_record: FailureRecord) -> Optional[Dict[str, Any]]:
        """Execute a specific fallback rule"""
        
        if rule.strategy == FallbackStrategy.SEQUENTIAL:
            return await self._execute_sequential_fallback(rule, request_data, failure_record)
        elif rule.strategy == FallbackStrategy.PARALLEL:
            return await self._execute_parallel_fallback(rule, request_data, failure_record)
        elif rule.strategy == FallbackStrategy.WEIGHTED_ROUND_ROBIN:
            return await self._execute_weighted_fallback(rule, request_data, failure_record)
        elif rule.strategy == FallbackStrategy.ADAPTIVE:
            return await self._execute_adaptive_fallback(rule, request_data, failure_record)
        else:
            logger.error(f"Unknown fallback strategy: {rule.strategy}")
            return None
    
    async def _execute_sequential_fallback(self, rule: FallbackRule, request_data: Dict[str, Any],
                                         failure_record: FailureRecord) -> Optional[Dict[str, Any]]:
        """Execute fallback modules sequentially"""
        
        for fallback_module in rule.fallback_modules:
            if not self.circuit_breaker_manager.can_call_module(fallback_module):
                continue
            
            failure_record.attempted_fallbacks.append(fallback_module)
            
            try:
                # Simulate module call (in real implementation, this would call the actual module)
                result = await self._call_module(fallback_module, request_data, rule.timeout)
                
                if result and not result.get('error'):
                    confidence = result.get('confidence_score', 0.0)
                    if confidence >= rule.quality_threshold:
                        result['module_used'] = fallback_module
                        result['fallback_used'] = True
                        self.circuit_breaker_manager.record_success(fallback_module)
                        return result
                
                self.circuit_breaker_manager.record_failure(fallback_module)
                
            except Exception as e:
                logger.error(f"Error calling fallback module {fallback_module}: {e}")
                self.circuit_breaker_manager.record_failure(fallback_module)
                continue
        
        return None
    
    async def _execute_parallel_fallback(self, rule: FallbackRule, request_data: Dict[str, Any],
                                       failure_record: FailureRecord) -> Optional[Dict[str, Any]]:
        """Execute multiple fallback modules in parallel and return the best result"""
        
        available_modules = [
            module for module in rule.fallback_modules
            if self.circuit_breaker_manager.can_call_module(module)
        ]
        
        if not available_modules:
            return None
        
        # Create tasks for parallel execution
        tasks = []
        for module in available_modules:
            task = asyncio.create_task(self._call_module(module, request_data, rule.timeout))
            tasks.append((module, task))
        
        # Wait for all tasks to complete
        results = []
        for module, task in tasks:
            try:
                result = await task
                if result and not result.get('error'):
                    result['module_used'] = module
                    results.append(result)
                    self.circuit_breaker_manager.record_success(module)
                else:
                    self.circuit_breaker_manager.record_failure(module)
            except Exception as e:
                logger.error(f"Error in parallel fallback for {module}: {e}")
                self.circuit_breaker_manager.record_failure(module)
        
        # Return the best result based on confidence score
        if results:
            best_result = max(results, key=lambda r: r.get('confidence_score', 0.0))
            best_result['fallback_used'] = True
            failure_record.attempted_fallbacks.extend(available_modules)
            return best_result
        
        return None
    
    async def _execute_adaptive_fallback(self, rule: FallbackRule, request_data: Dict[str, Any],
                                       failure_record: FailureRecord) -> Optional[Dict[str, Any]]:
        """Execute adaptive fallback based on learned performance"""
        
        # Sort fallback modules by historical performance
        sorted_modules = self._sort_modules_by_performance(
            failure_record.module_id, rule.fallback_modules
        )
        
        # Try modules in order of predicted success
        for module in sorted_modules:
            if not self.circuit_breaker_manager.can_call_module(module):
                continue
            
            failure_record.attempted_fallbacks.append(module)
            
            try:
                result = await self._call_module(module, request_data, rule.timeout)
                
                if result and not result.get('error'):
                    confidence = result.get('confidence_score', 0.0)
                    if confidence >= rule.quality_threshold:
                        result['module_used'] = module
                        result['fallback_used'] = True
                        self.circuit_breaker_manager.record_success(module)
                        return result
                
                self.circuit_breaker_manager.record_failure(module)
                
            except Exception as e:
                logger.error(f"Error in adaptive fallback for {module}: {e}")
                self.circuit_breaker_manager.record_failure(module)
                continue
        
        return None
    
    def _sort_modules_by_performance(self, primary_module: str, 
                                   fallback_modules: List[str]) -> List[str]:
        """Sort modules by historical performance with the primary module"""
        
        module_scores = []
        for module in fallback_modules:
            key = (primary_module, module)
            performance = self.fallback_performance.get(key, 0.5)  # Default neutral score
            
            # Adjust based on recent circuit breaker state
            cb_state = self.circuit_breaker_manager.get_circuit_breaker(module).state
            if cb_state == "OPEN":
                performance *= 0.1  # Heavily penalize open circuits
            elif cb_state == "HALF_OPEN":
                performance *= 0.8  # Slightly penalize half-open circuits
            
            module_scores.append((module, performance))
        
        # Sort by performance (highest first)
        module_scores.sort(key=lambda x: x[1], reverse=True)
        return [module for module, _ in module_scores]
    
    async def _call_module(self, module_id: str, request_data: Dict[str, Any], 
                          timeout: float) -> Dict[str, Any]:
        """Simulate calling a module (placeholder for actual implementation)"""
        
        # In real implementation, this would make HTTP/gRPC calls to modules
        # For now, simulate with some basic logic
        
        await asyncio.sleep(0.1)  # Simulate network delay
        
        # Simulate module health based on circuit breaker state
        cb_state = self.circuit_breaker_manager.get_circuit_breaker(module_id).state
        
        if cb_state == "OPEN":
            return {'error': 'Circuit breaker open', 'confidence_score': 0.0}
        
        # Simulate different response qualities
        import random
        
        if random.random() < 0.1:  # 10% chance of error
            return {'error': 'Simulated module error', 'confidence_score': 0.0}
        
        confidence = random.uniform(0.3, 1.0)
        return {
            'content': f'Response from {module_id}',
            'confidence_score': confidence,
            'processing_time': random.uniform(0.1, 2.0),
            'module_id': module_id
        }
    
    def _update_fallback_performance(self, primary_module: str, fallback_module: str, success: bool):
        """Update performance tracking for fallback pairs"""
        key = (primary_module, fallback_module)
        
        if key not in self.fallback_performance:
            self.fallback_performance[key] = 0.5  # Start with neutral
        
        # Use exponential moving average
        alpha = 0.1
        new_value = 1.0 if success else 0.0
        self.fallback_performance[key] = (
            alpha * new_value + (1 - alpha) * self.fallback_performance[key]
        )
    
    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create standardized error response"""
        return {
            'error': error_message,
            'confidence_score': 0.0,
            'processing_time': 0.0,
            'fallback_used': True,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_fallback_statistics(self) -> Dict[str, Any]:
        """Get comprehensive fallback statistics"""
        total_failures = len(self.failure_history)
        successful_fallbacks = sum(1 for f in self.failure_history if f.final_success)
        
        failure_types = defaultdict(int)
        for failure in self.failure_history:
            failure_types[failure.failure_type.value] += 1
        
        module_failure_counts = defaultdict(int)
        for failure in self.failure_history:
            module_failure_counts[failure.module_id] += 1
        
        circuit_breaker_states = self.circuit_breaker_manager.get_all_states()
        
        return {
            'total_failures': total_failures,
            'successful_fallbacks': successful_fallbacks,
            'fallback_success_rate': successful_fallbacks / total_failures if total_failures > 0 else 0.0,
            'failure_types': dict(failure_types),
            'module_failure_counts': dict(module_failure_counts),
            'circuit_breaker_states': circuit_breaker_states,
            'fallback_performance': {
                f"{k[0]}->{k[1]}": v for k, v in self.fallback_performance.items()
            },
            'health_summary': self.health_monitor.get_system_health_summary()
        }
    
    def optimize_fallback_rules(self):
        """Optimize fallback rules based on historical performance"""
        
        # Analyze failure patterns and adjust rules
        for primary_module, rules in self.fallback_rules.items():
            for rule in rules:
                # Adjust quality thresholds based on success rates
                avg_performance = []
                for fallback_module in rule.fallback_modules:
                    key = (primary_module, fallback_module)
                    if key in self.fallback_performance:
                        avg_performance.append(self.fallback_performance[key])
                
                if avg_performance:
                    avg_success_rate = statistics.mean(avg_performance)
                    
                    # Lower threshold if fallbacks are consistently successful
                    if avg_success_rate > 0.8:
                        rule.quality_threshold = max(0.4, rule.quality_threshold - 0.05)
                    # Raise threshold if fallbacks are often failing
                    elif avg_success_rate < 0.5:
                        rule.quality_threshold = min(0.9, rule.quality_threshold + 0.05)
                
                logger.info(f"Optimized fallback rule for {primary_module}: "
                           f"threshold={rule.quality_threshold:.2f}")

# Example usage and configuration
def create_example_fallback_system():
    """Create an example fallback system with rules"""
    
    fallback_manager = AdaptiveFallbackManager()
    
    # Register fallback rules for different modules
    
    # Business module fallbacks
    business_rule = FallbackRule(
        trigger_conditions=[
            FailureType.TIMEOUT, 
            FailureType.LOW_CONFIDENCE, 
            FailureType.SERVICE_UNAVAILABLE
        ],
        fallback_modules=["foundation", "general-analysis"],
        strategy=FallbackStrategy.ADAPTIVE,
        quality_threshold=0.7,
        priority=1
    )
    fallback_manager.register_fallback_rule("business-operations", business_rule)
    
    # Development module fallbacks
    dev_rule = FallbackRule(
        trigger_conditions=[
            FailureType.ERROR_RESPONSE,
            FailureType.TIMEOUT,
            FailureType.QUALITY_THRESHOLD_NOT_MET
        ],
        fallback_modules=["foundation", "code-assistant"],
        strategy=FallbackStrategy.SEQUENTIAL,
        quality_threshold=0.6,
        priority=1
    )
    fallback_manager.register_fallback_rule("web-development", dev_rule)
    
    # Creative module fallbacks
    creative_rule = FallbackRule(
        trigger_conditions=[
            FailureType.LOW_CONFIDENCE,
            FailureType.SERVICE_UNAVAILABLE
        ],
        fallback_modules=["foundation", "general-creative"],
        strategy=FallbackStrategy.PARALLEL,
        quality_threshold=0.5,
        priority=1
    )
    fallback_manager.register_fallback_rule("marketing-creative", creative_rule)
    
    return fallback_manager

if __name__ == "__main__":
    async def main():
        # Create fallback system
        fallback_manager = create_example_fallback_system()
        
        # Simulate a failure scenario
        request_data = {
            'query': 'Analyze our Q3 financial performance',
            'user_id': 'user123',
            'timeout': 30.0
        }
        
        # Simulate primary module failure
        primary_response = {
            'error': 'Service temporarily unavailable',
            'confidence_score': 0.0,
            'processing_time': 35.0
        }
        
        # Check if fallback is needed
        should_fallback, failure_type = fallback_manager.should_fallback(
            "business-operations", primary_response
        )
        
        if should_fallback:
            print(f"Fallback needed due to: {failure_type.value}")
            
            # Execute fallback
            fallback_result = await fallback_manager.execute_fallback(
                "business-operations", request_data, failure_type
            )
            
            print(f"Fallback result: {fallback_result}")
        
        # Get system statistics
        stats = fallback_manager.get_fallback_statistics()
        print(f"Fallback statistics: {json.dumps(stats, indent=2, default=str)}")

    # Run example
    asyncio.run(main())
