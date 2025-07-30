"""
AI Model Request Batching and Optimization

Implements intelligent request batching for AI model calls to improve throughput,
reduce latency, and optimize resource usage.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import hashlib
from collections import defaultdict, deque
import numpy as np

from api.config import settings
from api.utils.logger import get_logger

logger = get_logger(__name__)


class ModelType(Enum):
    """AI model types"""
    TEXT_GENERATION = "text_generation"
    BUSINESS_ANALYSIS = "business_analysis"
    FINANCIAL_MODELING = "financial_modeling"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    CLASSIFICATION = "classification"
    EMBEDDING = "embedding"


class Priority(Enum):
    """Request priority levels"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class BatchRequest:
    """Individual request within a batch"""
    request_id: str
    model_type: ModelType
    prompt: str
    parameters: Dict[str, Any]
    priority: Priority
    timestamp: datetime
    user_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    timeout: float = 30.0
    future: Optional[asyncio.Future] = field(default=None, init=False)


@dataclass
class BatchResult:
    """Result of batch processing"""
    request_id: str
    response: Any
    processing_time: float
    model_used: str
    success: bool = True
    error: Optional[str] = None


@dataclass
class ModelConfig:
    """Configuration for AI model"""
    name: str
    max_batch_size: int
    max_sequence_length: int
    batch_timeout: float
    cost_per_token: float
    latency_ms: float
    concurrent_batches: int = 1


class BatchingStrategy(Enum):
    """Batching strategies"""
    TIME_BASED = "time_based"          # Batch by time window
    SIZE_BASED = "size_based"          # Batch by request count
    PRIORITY_BASED = "priority_based"  # Batch by priority levels
    ADAPTIVE = "adaptive"              # Dynamic strategy selection


class ModelLoadBalancer:
    """Load balancer for AI model instances"""
    
    def __init__(self):
        self.model_instances = defaultdict(list)
        self.instance_loads = defaultdict(int)
        self.health_status = defaultdict(bool)
        self.last_health_check = defaultdict(datetime)
    
    def register_model_instance(self, model_type: ModelType, instance_id: str, endpoint: str):
        """Register a model instance"""
        self.model_instances[model_type].append({
            'instance_id': instance_id,
            'endpoint': endpoint,
            'last_used': datetime.now()
        })
        self.health_status[instance_id] = True
        logger.info(f"Registered model instance: {model_type.value}/{instance_id}")
    
    def get_best_instance(self, model_type: ModelType) -> Optional[Dict[str, Any]]:
        """Get the best available instance for a model type"""
        instances = self.model_instances.get(model_type, [])
        if not instances:
            return None
        
        # Filter healthy instances
        healthy_instances = [
            inst for inst in instances 
            if self.health_status.get(inst['instance_id'], False)
        ]
        
        if not healthy_instances:
            return None
        
        # Select instance with lowest load
        best_instance = min(
            healthy_instances,
            key=lambda x: self.instance_loads.get(x['instance_id'], 0)
        )
        
        return best_instance
    
    def update_instance_load(self, instance_id: str, load_delta: int):
        """Update instance load"""
        self.instance_loads[instance_id] = max(0, self.instance_loads[instance_id] + load_delta)
    
    async def health_check(self, instance_id: str) -> bool:
        """Check health of model instance"""
        try:
            # Simulate health check
            await asyncio.sleep(0.1)
            
            # In real implementation, this would ping the model endpoint
            is_healthy = True  # Simulate healthy response
            
            self.health_status[instance_id] = is_healthy
            self.last_health_check[instance_id] = datetime.now()
            
            return is_healthy
            
        except Exception as e:
            logger.error(f"Health check failed for {instance_id}: {e}")
            self.health_status[instance_id] = False
            return False


class BatchProcessor:
    """Process batches of AI model requests"""
    
    MODEL_CONFIGS = {
        ModelType.TEXT_GENERATION: ModelConfig(
            name="gpt-4-turbo",
            max_batch_size=16,
            max_sequence_length=4096,
            batch_timeout=2.0,
            cost_per_token=0.0001,
            latency_ms=800,
            concurrent_batches=4
        ),
        ModelType.BUSINESS_ANALYSIS: ModelConfig(
            name="claude-3-sonnet",
            max_batch_size=8,
            max_sequence_length=8192,
            batch_timeout=3.0,
            cost_per_token=0.0003,
            latency_ms=1200,
            concurrent_batches=2
        ),
        ModelType.FINANCIAL_MODELING: ModelConfig(
            name="frontier-financial-v1",
            max_batch_size=32,
            max_sequence_length=2048,
            batch_timeout=1.5,
            cost_per_token=0.00005,
            latency_ms=400,
            concurrent_batches=6
        ),
        ModelType.SENTIMENT_ANALYSIS: ModelConfig(
            name="bert-sentiment",
            max_batch_size=64,
            max_sequence_length=512,
            batch_timeout=1.0,
            cost_per_token=0.00001,
            latency_ms=200,
            concurrent_batches=8
        ),
        ModelType.EMBEDDING: ModelConfig(
            name="text-embedding-ada-002",
            max_batch_size=128,
            max_sequence_length=8192,
            batch_timeout=0.5,
            cost_per_token=0.0000001,
            latency_ms=100,
            concurrent_batches=10
        )
    }
    
    def __init__(self, load_balancer: ModelLoadBalancer):
        self.load_balancer = load_balancer
        self.processing_semaphores = {}
        self.batch_metrics = defaultdict(list)
        
        # Initialize semaphores for concurrent batch limits
        for model_type, config in self.MODEL_CONFIGS.items():
            self.processing_semaphores[model_type] = asyncio.Semaphore(config.concurrent_batches)
    
    async def process_batch(self, batch: List[BatchRequest]) -> List[BatchResult]:
        """Process a batch of requests"""
        if not batch:
            return []
        
        model_type = batch[0].model_type
        config = self.MODEL_CONFIGS[model_type]
        
        # Acquire semaphore for concurrency control
        async with self.processing_semaphores[model_type]:
            return await self._execute_batch(batch, config)
    
    async def _execute_batch(self, batch: List[BatchRequest], config: ModelConfig) -> List[BatchResult]:
        """Execute batch processing"""
        start_time = time.time()
        
        # Get model instance
        instance = self.load_balancer.get_best_instance(batch[0].model_type)
        if not instance:
            return self._create_error_results(batch, "No healthy model instance available")
        
        instance_id = instance['instance_id']
        
        try:
            # Update load balancer
            self.load_balancer.update_instance_load(instance_id, len(batch))
            
            # Simulate model processing
            results = await self._simulate_model_call(batch, config, instance)
            
            # Record metrics
            processing_time = time.time() - start_time
            self._record_batch_metrics(batch[0].model_type, len(batch), processing_time)
            
            logger.debug(f"Processed batch of {len(batch)} requests in {processing_time:.3f}s")
            
            return results
            
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            return self._create_error_results(batch, str(e))
            
        finally:
            # Release load
            self.load_balancer.update_instance_load(instance_id, -len(batch))
    
    async def _simulate_model_call(self, 
                                 batch: List[BatchRequest], 
                                 config: ModelConfig, 
                                 instance: Dict[str, Any]) -> List[BatchResult]:
        """Simulate AI model API call"""
        
        # Simulate network latency and processing time
        base_latency = config.latency_ms / 1000.0
        batch_overhead = len(batch) * 0.01  # Additional time per request in batch
        
        await asyncio.sleep(base_latency + batch_overhead)
        
        results = []
        
        for req in batch:
            # Simulate different response types based on model
            if req.model_type == ModelType.TEXT_GENERATION:
                response = {
                    "text": f"Generated response for: {req.prompt[:50]}...",
                    "tokens_used": len(req.prompt.split()) * 1.3,
                    "model": config.name
                }
            elif req.model_type == ModelType.BUSINESS_ANALYSIS:
                response = {
                    "analysis": {
                        "insights": ["Strategic insight 1", "Strategic insight 2"],
                        "recommendations": ["Recommendation 1", "Recommendation 2"],
                        "confidence": 0.85
                    },
                    "model": config.name
                }
            elif req.model_type == ModelType.FINANCIAL_MODELING:
                response = {
                    "predictions": [1.23, 4.56, 7.89],
                    "confidence_intervals": [[1.1, 1.4], [4.2, 4.9], [7.5, 8.3]],
                    "model": config.name
                }
            elif req.model_type == ModelType.SENTIMENT_ANALYSIS:
                response = {
                    "sentiment": "positive",
                    "confidence": 0.92,
                    "scores": {"positive": 0.92, "negative": 0.08},
                    "model": config.name
                }
            elif req.model_type == ModelType.EMBEDDING:
                response = {
                    "embedding": np.random.rand(768).tolist(),  # Simulate embedding vector
                    "dimensions": 768,
                    "model": config.name
                }
            else:
                response = {"result": "Generic model response", "model": config.name}
            
            result = BatchResult(
                request_id=req.request_id,
                response=response,
                processing_time=base_latency + batch_overhead,
                model_used=config.name,
                success=True
            )
            
            results.append(result)
        
        return results
    
    def _create_error_results(self, batch: List[BatchRequest], error_msg: str) -> List[BatchResult]:
        """Create error results for failed batch"""
        return [
            BatchResult(
                request_id=req.request_id,
                response=None,
                processing_time=0.0,
                model_used="",
                success=False,
                error=error_msg
            )
            for req in batch
        ]
    
    def _record_batch_metrics(self, model_type: ModelType, batch_size: int, processing_time: float):
        """Record batch processing metrics"""
        metric = {
            'timestamp': datetime.now(),
            'batch_size': batch_size,
            'processing_time': processing_time,
            'throughput': batch_size / processing_time if processing_time > 0 else 0
        }
        
        self.batch_metrics[model_type].append(metric)
        
        # Keep only recent metrics (last 1000)
        if len(self.batch_metrics[model_type]) > 1000:
            self.batch_metrics[model_type] = self.batch_metrics[model_type][-1000:]


class RequestBatcher:
    """Intelligent batching of AI model requests"""
    
    def __init__(self, processor: BatchProcessor):
        self.processor = processor
        self.pending_requests = defaultdict(list)
        self.batch_timers = {}
        self.strategy = BatchingStrategy.ADAPTIVE
        self.running = False
        
        # Batching parameters
        self.min_batch_size = 1
        self.ideal_batch_size = 8
        self.max_wait_time = 2.0
        
        # Priority queues
        self.priority_queues = {
            Priority.CRITICAL: defaultdict(deque),
            Priority.HIGH: defaultdict(deque),
            Priority.NORMAL: defaultdict(deque),
            Priority.LOW: defaultdict(deque)
        }
    
    async def start(self):
        """Start the batching service"""
        self.running = True
        asyncio.create_task(self._batch_processing_loop())
        logger.info("Request batcher started")
    
    async def stop(self):
        """Stop the batching service"""
        self.running = False
        
        # Process remaining requests
        for model_type in list(self.pending_requests.keys()):
            await self._process_pending_batch(model_type)
        
        logger.info("Request batcher stopped")
    
    async def submit_request(self, request: BatchRequest) -> Any:
        """Submit a request for batched processing"""
        request.future = asyncio.Future()
        
        # Add to appropriate priority queue
        self.priority_queues[request.priority][request.model_type].append(request)
        
        # Trigger batch processing check
        await self._check_batch_triggers(request.model_type)
        
        # Wait for result
        try:
            result = await asyncio.wait_for(request.future, timeout=request.timeout)
            return result
        except asyncio.TimeoutError:
            logger.error(f"Request {request.request_id} timed out")
            raise
    
    async def _check_batch_triggers(self, model_type: ModelType):
        """Check if batch should be triggered"""
        config = self.processor.MODEL_CONFIGS[model_type]
        
        # Count total pending requests for this model type
        total_pending = sum(
            len(self.priority_queues[priority][model_type])
            for priority in Priority
        )
        
        if total_pending == 0:
            return
        
        # Strategy-based triggering
        should_trigger = False
        
        if self.strategy == BatchingStrategy.SIZE_BASED:
            should_trigger = total_pending >= config.max_batch_size
        
        elif self.strategy == BatchingStrategy.TIME_BASED:
            should_trigger = model_type not in self.batch_timers
        
        elif self.strategy == BatchingStrategy.PRIORITY_BASED:
            # Process immediately if any critical requests
            should_trigger = len(self.priority_queues[Priority.CRITICAL][model_type]) > 0
        
        elif self.strategy == BatchingStrategy.ADAPTIVE:
            # Adaptive strategy based on current load and request patterns
            should_trigger = await self._adaptive_trigger_decision(model_type, total_pending)
        
        if should_trigger:
            await self._trigger_batch_processing(model_type)
        elif model_type not in self.batch_timers:
            # Set timer for maximum wait time
            self.batch_timers[model_type] = asyncio.create_task(
                self._batch_timer(model_type, config.batch_timeout)
            )
    
    async def _adaptive_trigger_decision(self, model_type: ModelType, pending_count: int) -> bool:
        """Make adaptive batching decision"""
        config = self.processor.MODEL_CONFIGS[model_type]
        
        # Get recent metrics
        recent_metrics = self.processor.batch_metrics.get(model_type, [])
        if len(recent_metrics) >= 5:
            recent_metrics = recent_metrics[-5:]
            
            # Calculate average batch size and throughput
            avg_batch_size = np.mean([m['batch_size'] for m in recent_metrics])
            avg_throughput = np.mean([m['throughput'] for m in recent_metrics])
            
            # Trigger if we have enough for efficient batching
            optimal_size = min(self.ideal_batch_size, config.max_batch_size)
            
            if pending_count >= optimal_size:
                return True
            
            # Or if we're approaching the ideal size and throughput is good
            if pending_count >= optimal_size * 0.7 and avg_throughput > 5.0:
                return True
        
        # Default to size-based triggering
        return pending_count >= min(4, config.max_batch_size)
    
    async def _trigger_batch_processing(self, model_type: ModelType):
        """Trigger immediate batch processing"""
        # Cancel timer if active
        if model_type in self.batch_timers:
            self.batch_timers[model_type].cancel()
            del self.batch_timers[model_type]
        
        await self._process_pending_batch(model_type)
    
    async def _process_pending_batch(self, model_type: ModelType):
        """Process pending requests for a model type"""
        config = self.processor.MODEL_CONFIGS[model_type]
        batch = []
        
        # Collect requests by priority (highest first)
        for priority in [Priority.CRITICAL, Priority.HIGH, Priority.NORMAL, Priority.LOW]:
            queue = self.priority_queues[priority][model_type]
            
            while queue and len(batch) < config.max_batch_size:
                batch.append(queue.popleft())
        
        if not batch:
            return
        
        # Process the batch
        try:
            results = await self.processor.process_batch(batch)
            
            # Resolve futures with results
            for request, result in zip(batch, results):
                if request.future and not request.future.done():
                    if result.success:
                        request.future.set_result(result.response)
                    else:
                        request.future.set_exception(Exception(result.error))
        
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            
            # Set exceptions for all requests
            for request in batch:
                if request.future and not request.future.done():
                    request.future.set_exception(e)
    
    async def _batch_timer(self, model_type: ModelType, timeout: float):
        """Timer for batch timeout"""
        try:
            await asyncio.sleep(timeout)
            await self._process_pending_batch(model_type)
        except asyncio.CancelledError:
            pass
        finally:
            if model_type in self.batch_timers:
                del self.batch_timers[model_type]
    
    async def _batch_processing_loop(self):
        """Main batch processing loop"""
        while self.running:
            try:
                # Process any batches that are ready
                for model_type in ModelType:
                    total_pending = sum(
                        len(self.priority_queues[priority][model_type])
                        for priority in Priority
                    )
                    
                    if total_pending >= self.ideal_batch_size:
                        await self._trigger_batch_processing(model_type)
                
                await asyncio.sleep(0.1)  # Check every 100ms
                
            except Exception as e:
                logger.error(f"Error in batch processing loop: {e}")
                await asyncio.sleep(1.0)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get batching statistics"""
        stats = {
            'strategy': self.strategy.value,
            'running': self.running,
            'pending_by_model': {},
            'pending_by_priority': {}
        }
        
        # Count pending requests by model type
        for model_type in ModelType:
            total = sum(
                len(self.priority_queues[priority][model_type])
                for priority in Priority
            )
            if total > 0:
                stats['pending_by_model'][model_type.value] = total
        
        # Count pending requests by priority
        for priority in Priority:
            total = sum(
                len(queue)
                for queue in self.priority_queues[priority].values()
            )
            if total > 0:
                stats['pending_by_priority'][priority.name] = total
        
        return stats


class AIModelManager:
    """High-level AI model management with batching"""
    
    def __init__(self):
        self.load_balancer = ModelLoadBalancer()
        self.processor = BatchProcessor(self.load_balancer)
        self.batcher = RequestBatcher(self.processor)
        self.request_counter = 0
    
    async def initialize(self):
        """Initialize the AI model manager"""
        # Register model instances (in production, these would be real endpoints)
        for model_type in ModelType:
            for i in range(3):  # 3 instances per model type
                self.load_balancer.register_model_instance(
                    model_type=model_type,
                    instance_id=f"{model_type.value}-{i}",
                    endpoint=f"http://model-{model_type.value}-{i}:8080"
                )
        
        await self.batcher.start()
        logger.info("AI model manager initialized")
    
    async def shutdown(self):
        """Shutdown the AI model manager"""
        await self.batcher.stop()
        logger.info("AI model manager shutdown")
    
    async def process_request(self,
                            model_type: ModelType,
                            prompt: str,
                            parameters: Optional[Dict[str, Any]] = None,
                            priority: Priority = Priority.NORMAL,
                            user_id: Optional[str] = None) -> Any:
        """Process an AI model request with batching"""
        
        self.request_counter += 1
        request_id = f"req_{self.request_counter}_{int(time.time())}"
        
        request = BatchRequest(
            request_id=request_id,
            model_type=model_type,
            prompt=prompt,
            parameters=parameters or {},
            priority=priority,
            timestamp=datetime.now(),
            user_id=user_id
        )
        
        return await self.batcher.submit_request(request)
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get comprehensive performance statistics"""
        batch_stats = self.batcher.get_stats()
        
        # Model-specific metrics
        model_metrics = {}
        for model_type, metrics in self.processor.batch_metrics.items():
            if metrics:
                recent_metrics = metrics[-50:]  # Last 50 batches
                
                model_metrics[model_type.value] = {
                    'total_batches': len(metrics),
                    'avg_batch_size': np.mean([m['batch_size'] for m in recent_metrics]),
                    'avg_processing_time': np.mean([m['processing_time'] for m in recent_metrics]),
                    'avg_throughput': np.mean([m['throughput'] for m in recent_metrics]),
                    'recent_batches': len(recent_metrics)
                }
        
        return {
            'batching': batch_stats,
            'models': model_metrics,
            'load_balancer': {
                'total_instances': sum(len(instances) for instances in self.load_balancer.model_instances.values()),
                'healthy_instances': sum(1 for status in self.load_balancer.health_status.values() if status)
            }
        }


# Global AI model manager instance
ai_model_manager = AIModelManager()
