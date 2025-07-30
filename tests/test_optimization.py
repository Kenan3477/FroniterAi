"""
Production Optimization Test Suite

Comprehensive test suite for all production optimization features including
caching, CDN, database optimization, AI batching, scaling, and performance monitoring.
"""

import pytest
import asyncio
import time
import json
from typing import Dict, Any, List
from datetime import datetime, timedelta
import random

# Import optimization modules for testing
from optimization.cache_manager import cache_manager, CacheLevel, BatchCacheManager
from optimization.cdn_manager import static_optimizer, cdn_integration
from optimization.database_optimizer import db_optimizer
from optimization.ai_batching import ai_model_manager, ModelType, Priority
from optimization.scaling_manager import service_registry, ServiceType
from optimization.performance_monitor import performance_manager
from optimization.production_optimizer import production_optimizer


class TestCacheManager:
    """Test cache management functionality"""
    
    @pytest.fixture(scope="session")
    async def setup_cache(self):
        """Setup cache for testing"""
        await cache_manager.initialize()
        yield
        await cache_manager.clear_all()
    
    async def test_cache_set_get(self, setup_cache):
        """Test basic cache set and get operations"""
        # Test financial analysis cache
        test_data = {
            "company_name": "Test Corp",
            "analysis_result": {"score": 85.5, "ratios": {"pe": 15.2}}
        }
        
        await cache_manager.set("financial_analysis", test_data, company="test_corp")
        cached_result = await cache_manager.get("financial_analysis", company="test_corp")
        
        assert cached_result is not None
        assert cached_result["company_name"] == "Test Corp"
        assert cached_result["analysis_result"]["score"] == 85.5
    
    async def test_cache_expiration(self, setup_cache):
        """Test cache TTL and expiration"""
        # Set cache with short TTL for testing
        test_data = {"test": "data"}
        
        # Temporarily modify TTL for testing
        original_config = cache_manager.CACHE_CONFIGS["market_data"]
        cache_manager.CACHE_CONFIGS["market_data"].ttl_seconds = 1
        
        await cache_manager.set("market_data", test_data, symbol="TEST")
        
        # Should be available immediately
        result = await cache_manager.get("market_data", symbol="TEST")
        assert result is not None
        
        # Wait for expiration
        await asyncio.sleep(2)
        
        # Should be expired now
        result = await cache_manager.get("market_data", symbol="TEST")
        assert result is None
        
        # Restore original config
        cache_manager.CACHE_CONFIGS["market_data"] = original_config
    
    async def test_cache_invalidation(self, setup_cache):
        """Test cache invalidation"""
        test_data = {"test": "invalidation"}
        
        await cache_manager.set("industry_benchmarks", test_data, industry="tech")
        
        # Verify cached
        result = await cache_manager.get("industry_benchmarks", industry="tech")
        assert result is not None
        
        # Invalidate
        await cache_manager.invalidate("industry_benchmarks", industry="tech")
        
        # Should be gone
        result = await cache_manager.get("industry_benchmarks", industry="tech")
        assert result is None
    
    async def test_batch_cache_operations(self, setup_cache):
        """Test batch cache operations"""
        batch_manager = BatchCacheManager(cache_manager)
        
        # Prepare batch data
        batch_params = [
            {"symbol": "AAPL"},
            {"symbol": "GOOGL"},
            {"symbol": "MSFT"}
        ]
        
        # Set some data first
        for params in batch_params:
            await cache_manager.set("market_data", {"price": random.uniform(100, 300)}, **params)
        
        # Test batch get
        results = await batch_manager.get_batch("market_data", batch_params)
        
        assert len(results) == 3
        assert all(result is not None for result in results)
    
    async def test_cache_stats(self, setup_cache):
        """Test cache statistics"""
        # Add some data to cache
        for i in range(10):
            await cache_manager.set("ai_model_responses", {"response": f"test_{i}"}, query=f"test_{i}")
        
        stats = cache_manager.get_stats()
        
        assert "memory_cache" in stats
        assert "cache_types" in stats
        assert len(stats["cache_types"]) > 0


class TestCDNManager:
    """Test CDN and static asset optimization"""
    
    @pytest.fixture(scope="session")
    async def setup_cdn(self):
        """Setup CDN for testing"""
        await static_optimizer.initialize()
        yield
    
    async def test_asset_generation(self, setup_cdn):
        """Test static asset generation"""
        # Check that assets were generated
        assert len(static_optimizer.asset_manifest) > 0
        
        # Check for specific asset types
        css_assets = [path for path in static_optimizer.asset_manifest if path.endswith('.css')]
        js_assets = [path for path in static_optimizer.asset_manifest if path.endswith('.js')]
        
        assert len(css_assets) > 0
        assert len(js_assets) > 0
    
    async def test_asset_compression(self, setup_cdn):
        """Test asset compression"""
        # Check that compressible assets have compressed versions
        for path, asset_info in static_optimizer.asset_manifest.items():
            if asset_info.content_type in ['text/css', 'text/javascript']:
                assert asset_info.compressed_size is not None
                assert asset_info.compressed_size < asset_info.size
    
    async def test_asset_urls(self, setup_cdn):
        """Test asset URL generation"""
        # Test versioned URLs
        for path in list(static_optimizer.asset_manifest.keys())[:3]:
            url = static_optimizer.get_asset_url(path, versioned=True)
            assert "?v=" in url
            
            url_unversioned = static_optimizer.get_asset_url(path, versioned=False)
            assert "?v=" not in url_unversioned
    
    async def test_asset_headers(self, setup_cdn):
        """Test asset HTTP headers"""
        for path, asset_info in list(static_optimizer.asset_manifest.items())[:3]:
            headers = static_optimizer.get_asset_headers(path)
            
            assert "Content-Type" in headers
            assert "Cache-Control" in headers
            assert "ETag" in headers
            assert headers["Content-Type"] == asset_info.content_type


class TestDatabaseOptimizer:
    """Test database optimization"""
    
    @pytest.fixture(scope="session")
    async def setup_db_optimizer(self):
        """Setup database optimizer for testing"""
        await db_optimizer.initialize()
        yield
    
    async def test_query_execution(self, setup_db_optimizer):
        """Test optimized query execution"""
        # Test SELECT query
        result = await db_optimizer.execute_optimized_query(
            "SELECT 1 as test_value",
            cache_key="test_query"
        )
        
        assert result is not None
    
    async def test_query_caching(self, setup_db_optimizer):
        """Test query result caching"""
        cache_key = "test_cache_query"
        
        # First execution
        start_time = time.time()
        result1 = await db_optimizer.execute_optimized_query(
            "SELECT 1 as cached_value",
            cache_key=cache_key
        )
        first_time = time.time() - start_time
        
        # Second execution (should be cached)
        start_time = time.time()
        result2 = await db_optimizer.execute_optimized_query(
            "SELECT 1 as cached_value",
            cache_key=cache_key
        )
        second_time = time.time() - start_time
        
        assert result1 == result2
        assert second_time < first_time  # Cached should be faster
    
    async def test_performance_analysis(self, setup_db_optimizer):
        """Test database performance analysis"""
        # Execute some queries to generate metrics
        for i in range(5):
            await db_optimizer.execute_optimized_query(f"SELECT {i} as value")
        
        analysis = await db_optimizer.analyze_performance()
        
        assert "query_performance" in analysis
        assert "connection_pool" in analysis
        assert "system_resources" in analysis
    
    async def test_index_recommendations(self, setup_db_optimizer):
        """Test index recommendations"""
        # Generate some query patterns
        for i in range(10):
            query = f"SELECT * FROM test_table WHERE id = {i}"
            db_optimizer.query_analyzer.record_query(query, 0.1, 1)
        
        recommendations = db_optimizer.query_analyzer.get_index_recommendations()
        assert isinstance(recommendations, list)


class TestAIBatching:
    """Test AI model batching system"""
    
    @pytest.fixture(scope="session")
    async def setup_ai_batching(self):
        """Setup AI batching for testing"""
        await ai_model_manager.initialize()
        yield
        await ai_model_manager.shutdown()
    
    async def test_single_request(self, setup_ai_batching):
        """Test single AI request processing"""
        result = await ai_model_manager.process_request(
            model_type=ModelType.TEXT_GENERATION,
            prompt="Test prompt",
            priority=Priority.HIGH
        )
        
        assert result is not None
        assert "text" in result
    
    async def test_batch_processing(self, setup_ai_batching):
        """Test batch processing of AI requests"""
        # Submit multiple requests concurrently
        tasks = []
        for i in range(5):
            task = ai_model_manager.process_request(
                model_type=ModelType.SENTIMENT_ANALYSIS,
                prompt=f"Test sentiment {i}",
                priority=Priority.NORMAL
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 5
        assert all("sentiment" in result for result in results)
    
    async def test_priority_handling(self, setup_ai_batching):
        """Test priority-based request handling"""
        # Submit high priority request
        high_priority_task = ai_model_manager.process_request(
            model_type=ModelType.BUSINESS_ANALYSIS,
            prompt="Critical analysis",
            priority=Priority.CRITICAL
        )
        
        # Submit normal priority request
        normal_priority_task = ai_model_manager.process_request(
            model_type=ModelType.BUSINESS_ANALYSIS,
            prompt="Normal analysis",
            priority=Priority.NORMAL
        )
        
        # Both should complete successfully
        high_result, normal_result = await asyncio.gather(high_priority_task, normal_priority_task)
        
        assert high_result is not None
        assert normal_result is not None
    
    async def test_model_load_balancing(self, setup_ai_batching):
        """Test model load balancing"""
        stats = ai_model_manager.get_performance_stats()
        
        assert "load_balancer" in stats
        assert stats["load_balancer"]["total_instances"] > 0


class TestScalingManager:
    """Test auto-scaling and load balancing"""
    
    @pytest.fixture(scope="session")
    async def setup_scaling(self):
        """Setup scaling manager for testing"""
        await service_registry.start()
        yield
        await service_registry.stop()
    
    async def test_service_registration(self, setup_scaling):
        """Test service instance registration"""
        from optimization.scaling_manager import ServiceInstance, HealthStatus
        
        # Register test instance
        instance = ServiceInstance(
            instance_id="test-api-1",
            service_type=ServiceType.API_SERVER,
            host="10.0.1.100",
            port=8000,
            health_status=HealthStatus.HEALTHY,
            last_health_check=datetime.now()
        )
        
        service_registry.register_service_instance(instance)
        
        # Verify registration
        retrieved_instance = await service_registry.get_service_instance(ServiceType.API_SERVER)
        assert retrieved_instance is not None
        assert retrieved_instance.instance_id == "test-api-1"
    
    async def test_load_balancing(self, setup_scaling):
        """Test load balancing algorithms"""
        # Register multiple instances
        from optimization.scaling_manager import ServiceInstance, HealthStatus
        
        for i in range(3):
            instance = ServiceInstance(
                instance_id=f"test-worker-{i}",
                service_type=ServiceType.WORKER,
                host=f"10.0.1.{100+i}",
                port=9000,
                health_status=HealthStatus.HEALTHY,
                last_health_check=datetime.now()
            )
            service_registry.register_service_instance(instance)
        
        # Test load balancing
        instances = []
        for _ in range(10):
            instance = await service_registry.get_service_instance(ServiceType.WORKER)
            if instance:
                instances.append(instance.instance_id)
        
        # Should distribute across instances
        unique_instances = set(instances)
        assert len(unique_instances) > 1
    
    async def test_health_monitoring(self, setup_scaling):
        """Test health monitoring"""
        stats = service_registry.get_service_stats()
        
        # Should have statistics for registered services
        assert isinstance(stats, dict)
        
        # Check for API server stats
        if ServiceType.API_SERVER.value in stats:
            api_stats = stats[ServiceType.API_SERVER.value]
            assert "load_balancer" in api_stats
            assert "auto_scaler" in api_stats


class TestPerformanceMonitoring:
    """Test performance monitoring system"""
    
    @pytest.fixture(scope="session")
    async def setup_performance_monitoring(self):
        """Setup performance monitoring for testing"""
        await performance_manager.start()
        yield
        await performance_manager.stop()
    
    async def test_metric_recording(self, setup_performance_monitoring):
        """Test performance metric recording"""
        # Record some API metrics
        for i in range(10):
            response_time = random.uniform(100, 1000)  # ms
            success = random.choice([True, False])
            performance_manager.record_api_metric(response_time, success, f"/api/test/{i}")
        
        # Get dashboard data
        dashboard = performance_manager.get_dashboard_data()
        assert "sla_compliance" in dashboard
        assert "system_performance" in dashboard
    
    async def test_benchmark_execution(self, setup_performance_monitoring):
        """Test benchmark execution"""
        # Run benchmarks
        results = await performance_manager.benchmark_suite.run_all_benchmarks()
        
        assert len(results) > 0
        assert all(hasattr(result, 'benchmark_name') for result in results)
    
    async def test_sla_monitoring(self, setup_performance_monitoring):
        """Test SLA monitoring"""
        # Generate metrics that should comply with SLA
        from optimization.performance_monitor import PerformanceMetric, MetricType
        
        for i in range(20):
            metric = PerformanceMetric(
                metric_type=MetricType.RESPONSE_TIME,
                value=random.uniform(200, 800),  # Within SLA
                timestamp=datetime.now()
            )
            performance_manager.sla_monitor.record_metric(metric)
        
        # Get SLA report
        report = performance_manager.sla_monitor.get_sla_compliance_report()
        
        assert "targets" in report
        assert "overall_compliance" in report
    
    async def test_performance_audit(self, setup_performance_monitoring):
        """Test comprehensive performance audit"""
        audit_results = await performance_manager.run_performance_audit()
        
        assert "audit_timestamp" in audit_results
        assert "benchmarks" in audit_results
        assert "sla_compliance" in audit_results
        assert "recommendations" in audit_results


class TestProductionOptimizer:
    """Test production optimizer integration"""
    
    @pytest.fixture(scope="session")
    async def setup_production_optimizer(self):
        """Setup production optimizer for testing"""
        await production_optimizer.initialize()
        await production_optimizer.start()
        yield
        await production_optimizer.stop()
    
    async def test_optimization_status(self, setup_production_optimizer):
        """Test optimization status reporting"""
        status = await production_optimizer.get_optimization_status()
        
        assert "running" in status
        assert "configuration" in status
        assert "metrics" in status
        assert "components" in status
    
    async def test_request_processing_with_optimization(self, setup_production_optimizer):
        """Test optimized request processing"""
        # Test AI request
        ai_result = await production_optimizer.process_request_with_optimization(
            request_type="ai_model",
            request_data={
                "model_type": "text_generation",
                "prompt": "Test optimization",
                "priority": "normal"
            },
            cache_key="test_ai_request"
        )
        
        assert ai_result["success"] is True
        assert "response_time" in ai_result
        
        # Test database request
        db_result = await production_optimizer.process_request_with_optimization(
            request_type="database",
            request_data={
                "query": "SELECT 1",
                "params": ()
            },
            cache_key="test_db_request"
        )
        
        assert db_result["success"] is True
    
    async def test_optimization_audit(self, setup_production_optimizer):
        """Test comprehensive optimization audit"""
        audit_results = await production_optimizer.run_optimization_audit()
        
        assert "audit_timestamp" in audit_results
        assert "status" in audit_results
        assert "recommendations" in audit_results
    
    async def test_cache_integration(self, setup_production_optimizer):
        """Test cache integration in optimization"""
        # First request should hit the actual service
        result1 = await production_optimizer.process_request_with_optimization(
            request_type="ai_model",
            request_data={"prompt": "Cached test"},
            cache_key="cache_test"
        )
        
        # Second request should hit cache
        result2 = await production_optimizer.process_request_with_optimization(
            request_type="ai_model",
            request_data={"prompt": "Cached test"},
            cache_key="cache_test"
        )
        
        assert result1["success"] is True
        assert result2["success"] is True
        assert result2["cached"] is True
        assert result2["response_time"] < result1["response_time"]


# Test configuration
class TestConfig:
    """Test configuration settings"""
    
    def test_optimization_config(self):
        """Test optimization configuration"""
        from optimization.production_optimizer import OptimizationConfig
        
        config = OptimizationConfig()
        
        assert config.enable_caching is True
        assert config.enable_cdn is True
        assert config.enable_db_optimization is True
        assert config.enable_ai_batching is True
        assert config.enable_auto_scaling is True
        assert config.enable_performance_monitoring is True


# Utility functions for running specific test suites
def run_cache_tests():
    """Run cache-specific tests"""
    pytest.main([
        __file__ + "::TestCacheManager",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_performance_tests():
    """Run performance-specific tests"""
    pytest.main([
        __file__ + "::TestPerformanceMonitoring",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_integration_tests():
    """Run integration tests"""
    pytest.main([
        __file__ + "::TestProductionOptimizer",
        "-v",
        "--tb=short",
        "--asyncio-mode=auto"
    ])


def run_all_optimization_tests():
    """Run all optimization tests"""
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "--asyncio-mode=auto",
        "--maxfail=5"  # Stop after 5 failures
    ])


if __name__ == "__main__":
    # Run all tests when script is executed directly
    run_all_optimization_tests()
