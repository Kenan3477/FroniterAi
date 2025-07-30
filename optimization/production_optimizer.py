"""
Production Optimization Coordinator

Integrates all optimization components for production-ready performance,
including caching, CDN, database optimization, AI batching, scaling, and monitoring.
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import psutil

from api.config import settings
from api.utils.logger import get_logger

# Import optimization modules
from optimization.cache_manager import cache_manager, batch_cache_manager
from optimization.cdn_manager import static_optimizer, cdn_integration
from optimization.database_optimizer import db_optimizer
from optimization.ai_batching import ai_model_manager
from optimization.scaling_manager import service_registry
from optimization.performance_monitor import performance_manager

logger = get_logger(__name__)


@dataclass
class OptimizationConfig:
    """Configuration for production optimization"""
    enable_caching: bool = True
    enable_cdn: bool = True
    enable_db_optimization: bool = True
    enable_ai_batching: bool = True
    enable_auto_scaling: bool = True
    enable_performance_monitoring: bool = True
    
    # Cache settings
    cache_ttl_multiplier: float = 1.0
    max_cache_size: int = 10000
    
    # CDN settings
    cdn_cache_duration: int = 86400  # 24 hours
    static_asset_compression: bool = True
    
    # Database settings
    enable_query_optimization: bool = True
    connection_pool_size: int = 20
    
    # AI batching settings
    max_batch_size: int = 32
    batch_timeout: float = 2.0
    
    # Scaling settings
    auto_scale_threshold: float = 0.8
    min_instances: int = 2
    max_instances: int = 50


class ProductionOptimizer:
    """Main production optimization coordinator"""
    
    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        self.running = False
        self.start_time: Optional[datetime] = None
        self.optimization_tasks: List[asyncio.Task] = []
        self.metrics = {
            'requests_processed': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'db_queries_optimized': 0,
            'ai_requests_batched': 0,
            'scaling_events': 0
        }
    
    async def initialize(self):
        """Initialize all optimization components"""
        logger.info("Initializing production optimization...")
        
        try:
            # Initialize components based on configuration
            if self.config.enable_caching:
                await self._initialize_caching()
            
            if self.config.enable_cdn:
                await self._initialize_cdn()
            
            if self.config.enable_db_optimization:
                await self._initialize_database_optimization()
            
            if self.config.enable_ai_batching:
                await self._initialize_ai_batching()
            
            if self.config.enable_auto_scaling:
                await self._initialize_auto_scaling()
            
            if self.config.enable_performance_monitoring:
                await self._initialize_performance_monitoring()
            
            logger.info("Production optimization initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize optimization: {e}")
            raise
    
    async def _initialize_caching(self):
        """Initialize caching system"""
        logger.info("Initializing caching system...")
        await cache_manager.initialize()
        
        # Configure cache settings
        if hasattr(cache_manager, 'memory_cache'):
            cache_manager.memory_cache.max_size = self.config.max_cache_size
        
        logger.info("Caching system initialized")
    
    async def _initialize_cdn(self):
        """Initialize CDN and static asset optimization"""
        logger.info("Initializing CDN and static assets...")
        await static_optimizer.initialize()
        
        if self.config.enable_cdn:
            await cdn_integration.upload_assets(static_optimizer)
        
        logger.info("CDN and static assets initialized")
    
    async def _initialize_database_optimization(self):
        """Initialize database optimization"""
        logger.info("Initializing database optimization...")
        await db_optimizer.initialize()
        
        if self.config.enable_query_optimization:
            # Apply initial optimizations
            optimizations = await db_optimizer.optimize_indexes()
            logger.info(f"Applied {len(optimizations)} database optimizations")
        
        logger.info("Database optimization initialized")
    
    async def _initialize_ai_batching(self):
        """Initialize AI model batching"""
        logger.info("Initializing AI model batching...")
        await ai_model_manager.initialize()
        
        # Configure batching parameters
        if hasattr(ai_model_manager, 'batcher'):
            ai_model_manager.batcher.ideal_batch_size = self.config.max_batch_size
            ai_model_manager.batcher.max_wait_time = self.config.batch_timeout
        
        logger.info("AI model batching initialized")
    
    async def _initialize_auto_scaling(self):
        """Initialize auto-scaling"""
        logger.info("Initializing auto-scaling...")
        await service_registry.start()
        
        # Configure scaling parameters
        for service_type, auto_scaler in service_registry.auto_scalers.items():
            auto_scaler.policy.max_instances = self.config.max_instances
            auto_scaler.policy.min_instances = self.config.min_instances
            auto_scaler.policy.scale_up_threshold = self.config.auto_scale_threshold
        
        logger.info("Auto-scaling initialized")
    
    async def _initialize_performance_monitoring(self):
        """Initialize performance monitoring"""
        logger.info("Initializing performance monitoring...")
        await performance_manager.start()
        logger.info("Performance monitoring initialized")
    
    async def start(self):
        """Start production optimization"""
        if self.running:
            logger.warning("Production optimizer already running")
            return
        
        self.running = True
        self.start_time = datetime.now()
        
        # Start background optimization tasks
        if self.config.enable_performance_monitoring:
            self.optimization_tasks.append(
                asyncio.create_task(self._optimization_monitoring_loop())
            )
        
        if self.config.enable_db_optimization:
            self.optimization_tasks.append(
                asyncio.create_task(self._database_maintenance_loop())
            )
        
        if self.config.enable_caching:
            self.optimization_tasks.append(
                asyncio.create_task(self._cache_maintenance_loop())
            )
        
        logger.info("Production optimization started")
    
    async def stop(self):
        """Stop production optimization"""
        if not self.running:
            return
        
        self.running = False
        
        # Cancel background tasks
        for task in self.optimization_tasks:
            task.cancel()
        
        if self.optimization_tasks:
            await asyncio.gather(*self.optimization_tasks, return_exceptions=True)
        
        # Shutdown components
        if self.config.enable_auto_scaling:
            await service_registry.stop()
        
        if self.config.enable_ai_batching:
            await ai_model_manager.shutdown()
        
        if self.config.enable_performance_monitoring:
            await performance_manager.stop()
        
        logger.info("Production optimization stopped")
    
    async def _optimization_monitoring_loop(self):
        """Background loop for optimization monitoring"""
        while self.running:
            try:
                await self._collect_optimization_metrics()
                await asyncio.sleep(60)  # Collect metrics every minute
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Optimization monitoring error: {e}")
                await asyncio.sleep(60)
    
    async def _database_maintenance_loop(self):
        """Background loop for database maintenance"""
        while self.running:
            try:
                # Perform periodic database optimization
                await db_optimizer.cleanup_old_metrics()
                
                # Run index optimization every hour
                if datetime.now().minute == 0:
                    optimizations = await db_optimizer.optimize_indexes()
                    if optimizations:
                        logger.info(f"Applied {len(optimizations)} database optimizations")
                
                await asyncio.sleep(3600)  # Run every hour
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Database maintenance error: {e}")
                await asyncio.sleep(3600)
    
    async def _cache_maintenance_loop(self):
        """Background loop for cache maintenance"""
        while self.running:
            try:
                # Clean expired cache entries
                await self._clean_expired_cache()
                
                # Optimize cache performance
                await self._optimize_cache_performance()
                
                await asyncio.sleep(1800)  # Run every 30 minutes
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cache maintenance error: {e}")
                await asyncio.sleep(1800)
    
    async def _collect_optimization_metrics(self):
        """Collect optimization performance metrics"""
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            
            # Record system performance
            performance_manager.sla_monitor.record_metric(
                type('PerformanceMetric', (), {
                    'metric_type': type('MetricType', (), {'CPU_USAGE': 'cpu_usage'})(),
                    'value': cpu_percent,
                    'timestamp': datetime.now(),
                    'labels': {}
                })()
            )
            
            performance_manager.sla_monitor.record_metric(
                type('PerformanceMetric', (), {
                    'metric_type': type('MetricType', (), {'MEMORY_USAGE': 'memory_usage'})(),
                    'value': memory.percent,
                    'timestamp': datetime.now(),
                    'labels': {}
                })()
            )
            
        except Exception as e:
            logger.error(f"Error collecting optimization metrics: {e}")
    
    async def _clean_expired_cache(self):
        """Clean expired cache entries"""
        try:
            # This would typically be handled by the cache implementations
            # But we can add additional cleanup logic here
            cache_stats = cache_manager.get_stats()
            logger.debug(f"Cache stats: {cache_stats}")
            
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
    
    async def _optimize_cache_performance(self):
        """Optimize cache performance based on usage patterns"""
        try:
            cache_stats = cache_manager.get_stats()
            
            # Analyze cache performance and adjust settings
            memory_utilization = cache_stats.get('memory_cache', {}).get('utilization', 0)
            
            if memory_utilization > 0.9:
                logger.warning("High cache utilization detected - consider increasing cache size")
            
        except Exception as e:
            logger.error(f"Cache optimization error: {e}")
    
    async def process_request_with_optimization(self, 
                                              request_type: str,
                                              request_data: Dict[str, Any],
                                              cache_key: Optional[str] = None) -> Dict[str, Any]:
        """Process request with full optimization pipeline"""
        start_time = time.time()
        self.metrics['requests_processed'] += 1
        
        try:
            # Step 1: Check cache
            if self.config.enable_caching and cache_key:
                cached_result = await cache_manager.get(request_type, cache_key=cache_key)
                if cached_result is not None:
                    self.metrics['cache_hits'] += 1
                    response_time = time.time() - start_time
                    performance_manager.record_api_metric(response_time * 1000, True, request_type)
                    return {
                        'success': True,
                        'data': cached_result,
                        'cached': True,
                        'response_time': response_time
                    }
                else:
                    self.metrics['cache_misses'] += 1
            
            # Step 2: Process request with optimization
            if request_type == 'ai_model':
                result = await self._process_ai_request(request_data)
            elif request_type == 'database':
                result = await self._process_database_request(request_data)
            else:
                result = await self._process_generic_request(request_data)
            
            # Step 3: Cache result
            if self.config.enable_caching and cache_key and result.get('success'):
                await cache_manager.set(request_type, result['data'], cache_key=cache_key)
            
            # Step 4: Record metrics
            response_time = time.time() - start_time
            performance_manager.record_api_metric(
                response_time * 1000, 
                result.get('success', False), 
                request_type
            )
            
            result['response_time'] = response_time
            result['cached'] = False
            
            return result
            
        except Exception as e:
            response_time = time.time() - start_time
            performance_manager.record_api_metric(response_time * 1000, False, request_type)
            
            logger.error(f"Request processing error: {e}")
            return {
                'success': False,
                'error': str(e),
                'response_time': response_time,
                'cached': False
            }
    
    async def _process_ai_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process AI request with batching optimization"""
        if not self.config.enable_ai_batching:
            return {'success': False, 'error': 'AI batching disabled'}
        
        try:
            # Use AI model manager for optimized processing
            from optimization.ai_batching import ModelType, Priority
            
            model_type = ModelType.TEXT_GENERATION  # Default
            if 'model_type' in request_data:
                model_type = ModelType(request_data['model_type'])
            
            priority = Priority.NORMAL
            if 'priority' in request_data:
                priority = Priority(request_data['priority'])
            
            result = await ai_model_manager.process_request(
                model_type=model_type,
                prompt=request_data.get('prompt', ''),
                parameters=request_data.get('parameters', {}),
                priority=priority
            )
            
            self.metrics['ai_requests_batched'] += 1
            
            return {
                'success': True,
                'data': result
            }
            
        except Exception as e:
            logger.error(f"AI request processing error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _process_database_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process database request with optimization"""
        if not self.config.enable_db_optimization:
            return {'success': False, 'error': 'Database optimization disabled'}
        
        try:
            query = request_data.get('query', '')
            params = request_data.get('params', ())
            cache_key = request_data.get('cache_key')
            
            result = await db_optimizer.execute_optimized_query(
                query=query,
                params=params,
                cache_key=cache_key
            )
            
            self.metrics['db_queries_optimized'] += 1
            
            return {
                'success': True,
                'data': result
            }
            
        except Exception as e:
            logger.error(f"Database request processing error: {e}")
            return {'success': False, 'error': str(e)}
    
    async def _process_generic_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process generic request"""
        # Simulate processing
        await asyncio.sleep(0.1)
        
        return {
            'success': True,
            'data': {
                'message': 'Request processed successfully',
                'input_data': request_data
            }
        }
    
    async def get_optimization_status(self) -> Dict[str, Any]:
        """Get comprehensive optimization status"""
        uptime = (datetime.now() - self.start_time).total_seconds() if self.start_time else 0
        
        status = {
            'running': self.running,
            'uptime_seconds': uptime,
            'configuration': asdict(self.config),
            'metrics': self.metrics.copy(),
            'components': {}
        }
        
        # Get component status
        if self.config.enable_caching:
            status['components']['cache'] = cache_manager.get_stats()
        
        if self.config.enable_db_optimization:
            status['components']['database'] = await db_optimizer.analyze_performance()
        
        if self.config.enable_ai_batching:
            status['components']['ai_batching'] = ai_model_manager.get_performance_stats()
        
        if self.config.enable_auto_scaling:
            status['components']['scaling'] = service_registry.get_service_stats()
        
        if self.config.enable_performance_monitoring:
            status['components']['performance'] = performance_manager.get_dashboard_data()
        
        return status
    
    async def run_optimization_audit(self) -> Dict[str, Any]:
        """Run comprehensive optimization audit"""
        logger.info("Starting optimization audit...")
        
        audit_results = {
            'audit_timestamp': datetime.now().isoformat(),
            'status': await self.get_optimization_status()
        }
        
        # Run performance audit if monitoring is enabled
        if self.config.enable_performance_monitoring:
            audit_results['performance_audit'] = await performance_manager.run_performance_audit()
        
        # Database performance analysis
        if self.config.enable_db_optimization:
            audit_results['database_analysis'] = await db_optimizer.analyze_performance()
        
        # Generate optimization recommendations
        audit_results['recommendations'] = await self._generate_optimization_recommendations()
        
        logger.info("Optimization audit completed")
        return audit_results
    
    async def _generate_optimization_recommendations(self) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        try:
            # Analyze metrics
            total_requests = self.metrics['requests_processed']
            if total_requests > 0:
                cache_hit_rate = self.metrics['cache_hits'] / total_requests
                if cache_hit_rate < 0.5:
                    recommendations.append("Consider increasing cache TTL or improving cache keys")
            
            # Check component status
            if self.config.enable_caching:
                cache_stats = cache_manager.get_stats()
                memory_utilization = cache_stats.get('memory_cache', {}).get('utilization', 0)
                if memory_utilization > 0.9:
                    recommendations.append("Increase memory cache size - current utilization > 90%")
            
            if self.config.enable_ai_batching:
                ai_stats = ai_model_manager.get_performance_stats()
                pending_requests = sum(
                    count for count in ai_stats.get('batching', {}).get('pending_by_model', {}).values()
                )
                if pending_requests > 100:
                    recommendations.append("High AI request queue - consider increasing batch size or instances")
            
            if not recommendations:
                recommendations.append("System optimization is performing well - no immediate improvements needed")
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            recommendations.append("Unable to generate recommendations due to analysis error")
        
        return recommendations


# Global production optimizer instance
production_optimizer = ProductionOptimizer()
