"""
Horizontal Scaling and Load Balancing

Implements horizontal scaling with load balancers, auto-scaling policies,
and distributed system coordination for production workloads.
"""

import asyncio
import json
import time
import psutil
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import random
from collections import defaultdict, deque

from api.config import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class ServiceType(Enum):
    """Types of services that can be scaled"""
    API_SERVER = "api_server"
    WORKER = "worker"
    WEBSOCKET = "websocket"
    DATA_PROCESSOR = "data_processor"
    AI_MODEL = "ai_model"
    CACHE = "cache"
    DATABASE = "database"


class HealthStatus(Enum):
    """Health status of service instances"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"
    STARTING = "starting"
    STOPPING = "stopping"


@dataclass
class ServiceInstance:
    """Represents a service instance"""
    instance_id: str
    service_type: ServiceType
    host: str
    port: int
    health_status: HealthStatus
    last_health_check: datetime
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    request_count: int = 0
    error_rate: float = 0.0
    response_time: float = 0.0
    connections: int = 0
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}


@dataclass
class LoadBalancerRule:
    """Load balancing rule configuration"""
    algorithm: str  # round_robin, least_connections, weighted, ip_hash
    weight: float = 1.0
    health_check_interval: int = 30
    max_retries: int = 3
    timeout: float = 5.0
    circuit_breaker_threshold: float = 0.5


@dataclass
class ScalingPolicy:
    """Auto-scaling policy configuration"""
    min_instances: int
    max_instances: int
    target_cpu_utilization: float
    target_memory_utilization: float
    target_response_time: float
    scale_up_threshold: float
    scale_down_threshold: float
    scale_up_cooldown: int  # seconds
    scale_down_cooldown: int  # seconds
    metrics_window: int  # seconds


class LoadBalancer:
    """Advanced load balancer with multiple algorithms"""
    
    def __init__(self, service_type: ServiceType):
        self.service_type = service_type
        self.instances: Dict[str, ServiceInstance] = {}
        self.rule = LoadBalancerRule(algorithm="least_connections")
        self.request_counter = 0
        self.health_check_task: Optional[asyncio.Task] = None
        self.metrics = defaultdict(list)
        
        # Algorithm-specific state
        self.round_robin_index = 0
        self.connection_counts = defaultdict(int)
        self.circuit_breakers = defaultdict(lambda: {'failures': 0, 'last_failure': None, 'open': False})
    
    async def start(self):
        """Start the load balancer"""
        self.health_check_task = asyncio.create_task(self._health_check_loop())
        logger.info(f"Load balancer started for {self.service_type.value}")
    
    async def stop(self):
        """Stop the load balancer"""
        if self.health_check_task:
            self.health_check_task.cancel()
            try:
                await self.health_check_task
            except asyncio.CancelledError:
                pass
        logger.info(f"Load balancer stopped for {self.service_type.value}")
    
    def register_instance(self, instance: ServiceInstance):
        """Register a service instance"""
        self.instances[instance.instance_id] = instance
        self.connection_counts[instance.instance_id] = 0
        logger.info(f"Registered instance {instance.instance_id} for {self.service_type.value}")
    
    def unregister_instance(self, instance_id: str):
        """Unregister a service instance"""
        if instance_id in self.instances:
            del self.instances[instance_id]
            del self.connection_counts[instance_id]
            if instance_id in self.circuit_breakers:
                del self.circuit_breakers[instance_id]
            logger.info(f"Unregistered instance {instance_id} from {self.service_type.value}")
    
    async def get_instance(self, request_data: Optional[Dict[str, Any]] = None) -> Optional[ServiceInstance]:
        """Get the best instance using configured algorithm"""
        healthy_instances = [
            instance for instance in self.instances.values()
            if instance.health_status == HealthStatus.HEALTHY and not self._is_circuit_open(instance.instance_id)
        ]
        
        if not healthy_instances:
            logger.warning(f"No healthy instances available for {self.service_type.value}")
            return None
        
        # Select instance based on algorithm
        if self.rule.algorithm == "round_robin":
            return self._round_robin_select(healthy_instances)
        elif self.rule.algorithm == "least_connections":
            return self._least_connections_select(healthy_instances)
        elif self.rule.algorithm == "weighted":
            return self._weighted_select(healthy_instances)
        elif self.rule.algorithm == "ip_hash":
            return self._ip_hash_select(healthy_instances, request_data)
        else:
            return random.choice(healthy_instances)
    
    def _round_robin_select(self, instances: List[ServiceInstance]) -> ServiceInstance:
        """Round-robin selection"""
        if not instances:
            return None
        
        instance = instances[self.round_robin_index % len(instances)]
        self.round_robin_index += 1
        return instance
    
    def _least_connections_select(self, instances: List[ServiceInstance]) -> ServiceInstance:
        """Least connections selection"""
        if not instances:
            return None
        
        return min(instances, key=lambda x: self.connection_counts[x.instance_id])
    
    def _weighted_select(self, instances: List[ServiceInstance]) -> ServiceInstance:
        """Weighted selection based on instance performance"""
        if not instances:
            return None
        
        # Calculate weights based on inverse of response time and resource usage
        weights = []
        for instance in instances:
            weight = self.rule.weight / max(0.1, instance.response_time)
            weight *= (1 - instance.cpu_usage / 100.0)
            weight *= (1 - instance.memory_usage / 100.0)
            weights.append(weight)
        
        # Weighted random selection
        total_weight = sum(weights)
        if total_weight == 0:
            return random.choice(instances)
        
        r = random.uniform(0, total_weight)
        current = 0
        for i, weight in enumerate(weights):
            current += weight
            if r <= current:
                return instances[i]
        
        return instances[-1]
    
    def _ip_hash_select(self, instances: List[ServiceInstance], request_data: Optional[Dict[str, Any]]) -> ServiceInstance:
        """IP hash-based selection for session affinity"""
        if not instances or not request_data:
            return random.choice(instances)
        
        client_ip = request_data.get('client_ip', 'unknown')
        hash_value = hashlib.md5(client_ip.encode()).hexdigest()
        index = int(hash_value, 16) % len(instances)
        return instances[index]
    
    def _is_circuit_open(self, instance_id: str) -> bool:
        """Check if circuit breaker is open for instance"""
        cb = self.circuit_breakers[instance_id]
        
        if not cb['open']:
            return False
        
        # Check if circuit should be reset (half-open)
        if cb['last_failure'] and datetime.now() - cb['last_failure'] > timedelta(minutes=1):
            cb['open'] = False
            cb['failures'] = 0
            logger.info(f"Circuit breaker reset for instance {instance_id}")
            return False
        
        return True
    
    def record_request_start(self, instance_id: str):
        """Record request start for connection counting"""
        self.connection_counts[instance_id] += 1
    
    def record_request_end(self, instance_id: str, success: bool, response_time: float):
        """Record request completion"""
        self.connection_counts[instance_id] = max(0, self.connection_counts[instance_id] - 1)
        
        # Update instance metrics
        if instance_id in self.instances:
            instance = self.instances[instance_id]
            instance.response_time = (instance.response_time * 0.9) + (response_time * 0.1)  # EMA
            instance.request_count += 1
            
            # Update error rate
            if not success:
                instance.error_rate = (instance.error_rate * 0.9) + (1.0 * 0.1)
                self._handle_circuit_breaker(instance_id)
            else:
                instance.error_rate = instance.error_rate * 0.95
    
    def _handle_circuit_breaker(self, instance_id: str):
        """Handle circuit breaker logic"""
        cb = self.circuit_breakers[instance_id]
        cb['failures'] += 1
        cb['last_failure'] = datetime.now()
        
        if cb['failures'] >= self.rule.max_retries:
            cb['open'] = True
            logger.warning(f"Circuit breaker opened for instance {instance_id}")
    
    async def _health_check_loop(self):
        """Periodic health check loop"""
        while True:
            try:
                await self._perform_health_checks()
                await asyncio.sleep(self.rule.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
                await asyncio.sleep(5)
    
    async def _perform_health_checks(self):
        """Perform health checks on all instances"""
        for instance in list(self.instances.values()):
            try:
                is_healthy = await self._check_instance_health(instance)
                
                if is_healthy:
                    if instance.health_status == HealthStatus.UNHEALTHY:
                        instance.health_status = HealthStatus.HEALTHY
                        logger.info(f"Instance {instance.instance_id} recovered")
                else:
                    if instance.health_status == HealthStatus.HEALTHY:
                        instance.health_status = HealthStatus.UNHEALTHY
                        logger.warning(f"Instance {instance.instance_id} marked unhealthy")
                
                instance.last_health_check = datetime.now()
                
            except Exception as e:
                logger.error(f"Health check failed for {instance.instance_id}: {e}")
                instance.health_status = HealthStatus.UNHEALTHY
    
    async def _check_instance_health(self, instance: ServiceInstance) -> bool:
        """Check health of a specific instance"""
        try:
            # Simulate health check (in production, this would be an HTTP request)
            await asyncio.sleep(0.1)
            
            # Update resource metrics
            instance.cpu_usage = random.uniform(10, 90)  # Simulate CPU usage
            instance.memory_usage = random.uniform(20, 80)  # Simulate memory usage
            
            # Health criteria
            is_healthy = (
                instance.cpu_usage < 95 and
                instance.memory_usage < 90 and
                instance.error_rate < self.rule.circuit_breaker_threshold
            )
            
            return is_healthy
            
        except Exception:
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get load balancer statistics"""
        healthy_count = sum(1 for i in self.instances.values() if i.health_status == HealthStatus.HEALTHY)
        total_connections = sum(self.connection_counts.values())
        avg_response_time = sum(i.response_time for i in self.instances.values()) / max(1, len(self.instances))
        
        return {
            'service_type': self.service_type.value,
            'algorithm': self.rule.algorithm,
            'total_instances': len(self.instances),
            'healthy_instances': healthy_count,
            'total_connections': total_connections,
            'avg_response_time': avg_response_time,
            'circuit_breakers_open': sum(1 for cb in self.circuit_breakers.values() if cb['open'])
        }


class AutoScaler:
    """Automatic scaling based on metrics and policies"""
    
    def __init__(self, service_type: ServiceType, load_balancer: LoadBalancer):
        self.service_type = service_type
        self.load_balancer = load_balancer
        self.policy = ScalingPolicy(
            min_instances=2,
            max_instances=20,
            target_cpu_utilization=70.0,
            target_memory_utilization=80.0,
            target_response_time=1.0,
            scale_up_threshold=0.8,
            scale_down_threshold=0.3,
            scale_up_cooldown=300,  # 5 minutes
            scale_down_cooldown=600,  # 10 minutes
            metrics_window=300  # 5 minutes
        )
        
        self.last_scale_up = datetime.min
        self.last_scale_down = datetime.min
        self.scaling_task: Optional[asyncio.Task] = None
        self.scaling_metrics = deque(maxlen=100)
    
    async def start(self):
        """Start the auto-scaler"""
        self.scaling_task = asyncio.create_task(self._scaling_loop())
        logger.info(f"Auto-scaler started for {self.service_type.value}")
    
    async def stop(self):
        """Stop the auto-scaler"""
        if self.scaling_task:
            self.scaling_task.cancel()
            try:
                await self.scaling_task
            except asyncio.CancelledError:
                pass
        logger.info(f"Auto-scaler stopped for {self.service_type.value}")
    
    async def _scaling_loop(self):
        """Main scaling decision loop"""
        while True:
            try:
                await self._evaluate_scaling()
                await asyncio.sleep(30)  # Check every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scaling evaluation error: {e}")
                await asyncio.sleep(60)
    
    async def _evaluate_scaling(self):
        """Evaluate if scaling is needed"""
        instances = list(self.load_balancer.instances.values())
        healthy_instances = [i for i in instances if i.health_status == HealthStatus.HEALTHY]
        
        if not healthy_instances:
            logger.warning(f"No healthy instances for {self.service_type.value} scaling evaluation")
            return
        
        # Calculate current metrics
        current_metrics = self._calculate_current_metrics(healthy_instances)
        self.scaling_metrics.append(current_metrics)
        
        # Get metrics window for decision making
        window_metrics = list(self.scaling_metrics)[-min(len(self.scaling_metrics), 10):]  # Last 10 measurements
        
        if len(window_metrics) < 3:  # Need enough data points
            return
        
        # Calculate average metrics over window
        avg_cpu = sum(m['avg_cpu'] for m in window_metrics) / len(window_metrics)
        avg_memory = sum(m['avg_memory'] for m in window_metrics) / len(window_metrics)
        avg_response_time = sum(m['avg_response_time'] for m in window_metrics) / len(window_metrics)
        
        current_instance_count = len(healthy_instances)
        
        # Scale up decision
        should_scale_up = (
            (avg_cpu > self.policy.target_cpu_utilization or
             avg_memory > self.policy.target_memory_utilization or
             avg_response_time > self.policy.target_response_time) and
            current_instance_count < self.policy.max_instances and
            datetime.now() - self.last_scale_up > timedelta(seconds=self.policy.scale_up_cooldown)
        )
        
        # Scale down decision
        should_scale_down = (
            avg_cpu < self.policy.target_cpu_utilization * self.policy.scale_down_threshold and
            avg_memory < self.policy.target_memory_utilization * self.policy.scale_down_threshold and
            avg_response_time < self.policy.target_response_time * self.policy.scale_down_threshold and
            current_instance_count > self.policy.min_instances and
            datetime.now() - self.last_scale_down > timedelta(seconds=self.policy.scale_down_cooldown)
        )
        
        if should_scale_up:
            await self._scale_up()
        elif should_scale_down:
            await self._scale_down()
    
    def _calculate_current_metrics(self, instances: List[ServiceInstance]) -> Dict[str, float]:
        """Calculate current system metrics"""
        if not instances:
            return {'avg_cpu': 0, 'avg_memory': 0, 'avg_response_time': 0}
        
        avg_cpu = sum(i.cpu_usage for i in instances) / len(instances)
        avg_memory = sum(i.memory_usage for i in instances) / len(instances)
        avg_response_time = sum(i.response_time for i in instances) / len(instances)
        
        return {
            'avg_cpu': avg_cpu,
            'avg_memory': avg_memory,
            'avg_response_time': avg_response_time,
            'timestamp': datetime.now(),
            'instance_count': len(instances)
        }
    
    async def _scale_up(self):
        """Scale up by adding instances"""
        try:
            new_instance = await self._create_instance()
            if new_instance:
                self.load_balancer.register_instance(new_instance)
                self.last_scale_up = datetime.now()
                logger.info(f"Scaled up {self.service_type.value}: added instance {new_instance.instance_id}")
        except Exception as e:
            logger.error(f"Scale up failed for {self.service_type.value}: {e}")
    
    async def _scale_down(self):
        """Scale down by removing instances"""
        try:
            instances = list(self.load_balancer.instances.values())
            healthy_instances = [i for i in instances if i.health_status == HealthStatus.HEALTHY]
            
            if len(healthy_instances) <= self.policy.min_instances:
                return
            
            # Select instance to remove (lowest load)
            instance_to_remove = min(
                healthy_instances,
                key=lambda x: self.load_balancer.connection_counts[x.instance_id]
            )
            
            await self._remove_instance(instance_to_remove)
            self.load_balancer.unregister_instance(instance_to_remove.instance_id)
            self.last_scale_down = datetime.now()
            logger.info(f"Scaled down {self.service_type.value}: removed instance {instance_to_remove.instance_id}")
            
        except Exception as e:
            logger.error(f"Scale down failed for {self.service_type.value}: {e}")
    
    async def _create_instance(self) -> ServiceInstance:
        """Create a new service instance"""
        # In production, this would spawn a new container/VM
        instance_id = f"{self.service_type.value}-{int(time.time())}-{random.randint(1000, 9999)}"
        
        # Simulate instance creation
        await asyncio.sleep(1.0)  # Simulate startup time
        
        # Generate port and host
        base_port = 8000 if self.service_type == ServiceType.API_SERVER else 9000
        port = base_port + random.randint(1, 1000)
        host = f"10.0.{random.randint(1, 255)}.{random.randint(1, 255)}"
        
        instance = ServiceInstance(
            instance_id=instance_id,
            service_type=self.service_type,
            host=host,
            port=port,
            health_status=HealthStatus.STARTING,
            last_health_check=datetime.now(),
            metadata={'created_by': 'auto_scaler', 'creation_time': datetime.now().isoformat()}
        )
        
        # Simulate startup delay
        await asyncio.sleep(2.0)
        instance.health_status = HealthStatus.HEALTHY
        
        return instance
    
    async def _remove_instance(self, instance: ServiceInstance):
        """Remove a service instance"""
        # In production, this would terminate the container/VM
        instance.health_status = HealthStatus.STOPPING
        
        # Simulate graceful shutdown
        await asyncio.sleep(1.0)
        
        logger.debug(f"Instance {instance.instance_id} removed")


class ServiceRegistry:
    """Service discovery and registration"""
    
    def __init__(self):
        self.services: Dict[ServiceType, LoadBalancer] = {}
        self.auto_scalers: Dict[ServiceType, AutoScaler] = {}
        self.running = False
    
    async def start(self):
        """Start the service registry"""
        self.running = True
        
        # Initialize services
        for service_type in ServiceType:
            load_balancer = LoadBalancer(service_type)
            auto_scaler = AutoScaler(service_type, load_balancer)
            
            self.services[service_type] = load_balancer
            self.auto_scalers[service_type] = auto_scaler
            
            await load_balancer.start()
            await auto_scaler.start()
        
        logger.info("Service registry started with all services")
    
    async def stop(self):
        """Stop the service registry"""
        self.running = False
        
        # Stop all services
        for load_balancer in self.services.values():
            await load_balancer.stop()
        
        for auto_scaler in self.auto_scalers.values():
            await auto_scaler.stop()
        
        logger.info("Service registry stopped")
    
    def register_service_instance(self, instance: ServiceInstance):
        """Register a service instance"""
        if instance.service_type in self.services:
            self.services[instance.service_type].register_instance(instance)
    
    def unregister_service_instance(self, service_type: ServiceType, instance_id: str):
        """Unregister a service instance"""
        if service_type in self.services:
            self.services[service_type].unregister_instance(instance_id)
    
    async def get_service_instance(self, service_type: ServiceType, request_data: Optional[Dict[str, Any]] = None) -> Optional[ServiceInstance]:
        """Get an available service instance"""
        if service_type in self.services:
            return await self.services[service_type].get_instance(request_data)
        return None
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get statistics for all services"""
        stats = {}
        
        for service_type, load_balancer in self.services.items():
            lb_stats = load_balancer.get_stats()
            
            # Add auto-scaler stats
            auto_scaler = self.auto_scalers[service_type]
            scaler_stats = {
                'policy': asdict(auto_scaler.policy),
                'last_scale_up': auto_scaler.last_scale_up.isoformat() if auto_scaler.last_scale_up != datetime.min else None,
                'last_scale_down': auto_scaler.last_scale_down.isoformat() if auto_scaler.last_scale_down != datetime.min else None,
                'metrics_points': len(auto_scaler.scaling_metrics)
            }
            
            stats[service_type.value] = {
                'load_balancer': lb_stats,
                'auto_scaler': scaler_stats
            }
        
        return stats


# Global service registry instance
service_registry = ServiceRegistry()
