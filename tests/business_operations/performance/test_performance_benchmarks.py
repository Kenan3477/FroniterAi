"""
Performance Tests for Business Operations Module

Tests performance, scalability, and benchmarks:
- Individual capability performance
- Integration performance
- Memory and resource usage
- Concurrent execution performance
- Scalability limits
"""

import pytest
import time
import psutil
import asyncio
import numpy as np
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from unittest.mock import Mock
from typing import Dict, Any, List
import gc
import threading

from modules.business_operations.core import BusinessOperationsOrchestrator
from modules.business_operations.financial_analysis import FinancialAnalysisCapability
from modules.business_operations.strategic_planning import StrategicPlanningCapability
from modules.business_operations.operations_management import OperationsManagementCapability
from modules.business_operations.decision_support import DecisionSupportCapability
from modules.business_operations.compliance_governance import ComplianceGovernanceCapability

from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    TEST_CONFIG
)

@pytest.mark.performance
class TestBusinessOperationsPerformance(BusinessOperationsTestFramework):
    """Performance tests for Business Operations capabilities"""
    
    @pytest.fixture
    def performance_orchestrator(self):
        """Create orchestrator optimized for performance testing"""
        config = {
            "performance_mode": True,
            "cache_enabled": True,
            "parallel_processing": True,
            "memory_optimization": True
        }
        return BusinessOperationsOrchestrator(config)
    
    @pytest.fixture
    def large_dataset(self):
        """Generate large dataset for performance testing"""
        return {
            "financial_statements": TestDataGenerator.generate_large_financial_dataset(
                companies=100,
                years=5,
                complexity="high"
            ),
            "market_data": TestDataGenerator.generate_large_market_dataset(
                securities=1000,
                time_periods=252,  # 1 year of daily data
                indicators=50
            ),
            "operational_data": TestDataGenerator.generate_large_operational_dataset(
                processes=500,
                locations=50,
                time_periods=365
            ),
            "compliance_data": TestDataGenerator.generate_large_compliance_dataset(
                regulations=25,
                controls=200,
                entities=100
            )
        }
    
    def test_financial_analysis_performance(self, performance_orchestrator):
        """Test financial analysis performance under various loads"""
        
        # Test with increasing dataset sizes
        dataset_sizes = [10, 50, 100, 500, 1000]
        performance_results = []
        
        for size in dataset_sizes:
            # Generate dataset of specified size
            financial_data = TestDataGenerator.generate_financial_statements_batch(
                count=size,
                company_size="large",
                industry="technology"
            )
            
            # Measure analysis performance
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            
            results = performance_orchestrator.financial_analysis.analyze_portfolio(
                financial_data=financial_data,
                analysis_types=["ratios", "valuation", "trends", "peer_comparison"]
            )
            
            end_time = time.time()
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            
            performance_metrics = {
                "dataset_size": size,
                "execution_time": end_time - start_time,
                "memory_usage": end_memory - start_memory,
                "throughput": size / (end_time - start_time),  # companies per second
                "results_count": len(results)
            }
            
            performance_results.append(performance_metrics)
            
            # Validate performance thresholds
            max_time_per_company = TEST_CONFIG["performance_thresholds"]["financial_analysis_per_company"]
            assert performance_metrics["execution_time"] / size < max_time_per_company, \
                f"Financial analysis too slow: {performance_metrics['execution_time']:.2f}s for {size} companies"
            
            # Memory usage should be reasonable
            max_memory_per_company = TEST_CONFIG["performance_thresholds"]["memory_per_company"]
            assert performance_metrics["memory_usage"] / size < max_memory_per_company, \
                f"Memory usage too high: {performance_metrics['memory_usage']:.2f}MB for {size} companies"
        
        # Validate scalability - should show sub-linear growth in execution time
        for i in range(1, len(performance_results)):
            current = performance_results[i]
            previous = performance_results[i-1]
            
            size_ratio = current["dataset_size"] / previous["dataset_size"]
            time_ratio = current["execution_time"] / previous["execution_time"]
            
            # Time growth should be better than linear (< size_ratio)
            assert time_ratio < size_ratio * 1.2, \
                f"Performance degradation detected: {time_ratio:.2f} vs {size_ratio:.2f}"
    
    def test_strategic_planning_performance(self, performance_orchestrator):
        """Test strategic planning performance with complex scenarios"""
        
        # Test scenario complexity scaling
        scenario_counts = [3, 5, 10, 20]
        planning_horizons = [3, 5, 10]
        
        for scenario_count in scenario_counts:
            for horizon in planning_horizons:
                # Generate complex strategic context
                strategic_context = {
                    "company_profile": TestDataGenerator.generate_company_profile("large", "technology"),
                    "market_data": TestDataGenerator.generate_market_data("large", "technology"),
                    "scenarios": TestDataGenerator.generate_strategic_scenarios(count=scenario_count),
                    "planning_horizon": horizon
                }
                
                # Measure strategic planning performance
                start_time = time.time()
                cpu_before = psutil.Process().cpu_percent()
                
                strategic_results = performance_orchestrator.strategic_planning.execute_comprehensive_planning(
                    strategic_context=strategic_context,
                    include_monte_carlo=True,
                    monte_carlo_iterations=1000
                )
                
                end_time = time.time()
                execution_time = end_time - start_time
                
                # Validate performance
                max_time = TEST_CONFIG["performance_thresholds"]["strategic_planning_complex"]
                assert execution_time < max_time, \
                    f"Strategic planning too slow: {execution_time:.2f}s for {scenario_count} scenarios, {horizon} years"
                
                # Validate results completeness
                assert "scenario_analysis" in strategic_results
                assert len(strategic_results["scenario_analysis"]) == scenario_count
                assert "strategic_recommendations" in strategic_results
    
    def test_operations_optimization_performance(self, performance_orchestrator):
        """Test operations management optimization performance"""
        
        # Test with increasing operational complexity
        complexity_levels = [
            {"processes": 10, "resources": 20, "constraints": 5},
            {"processes": 50, "resources": 100, "constraints": 25},
            {"processes": 100, "resources": 200, "constraints": 50},
            {"processes": 200, "resources": 500, "constraints": 100}
        ]
        
        for complexity in complexity_levels:
            # Generate operational data
            operational_data = {
                "processes": TestDataGenerator.generate_process_data(complexity["processes"]),
                "resources": TestDataGenerator.generate_resource_data(complexity["resources"]),
                "constraints": TestDataGenerator.generate_constraint_data(complexity["constraints"])
            }
            
            # Measure optimization performance
            start_time = time.time()
            
            optimization_results = performance_orchestrator.operations_management.optimize_operations(
                operational_data=operational_data,
                optimization_objectives=["minimize_cost", "maximize_efficiency", "minimize_time"],
                algorithm="advanced_linear_programming"
            )
            
            end_time = time.time()
            optimization_time = end_time - start_time
            
            # Calculate complexity metric
            complexity_metric = complexity["processes"] * complexity["resources"] * complexity["constraints"]
            
            # Validate performance scales reasonably with complexity
            max_time_per_complexity = TEST_CONFIG["performance_thresholds"]["optimization_per_complexity"]
            normalized_time = optimization_time / (complexity_metric / 1000)  # per 1000 complexity units
            
            assert normalized_time < max_time_per_complexity, \
                f"Optimization too slow: {optimization_time:.2f}s for complexity {complexity_metric}"
            
            # Validate optimization quality
            assert "optimization_score" in optimization_results
            assert optimization_results["optimization_score"] > 0.7  # Should achieve good optimization
    
    def test_decision_support_performance(self, performance_orchestrator):
        """Test decision support performance with complex decision problems"""
        
        # Test with increasing decision complexity
        decision_complexities = [
            {"alternatives": 5, "criteria": 5, "stakeholders": 3},
            {"alternatives": 10, "criteria": 10, "stakeholders": 5},
            {"alternatives": 20, "criteria": 15, "stakeholders": 8},
            {"alternatives": 50, "criteria": 25, "stakeholders": 12}
        ]
        
        for complexity in decision_complexities:
            # Generate complex decision problem
            decision_problem = TestDataGenerator.generate_complex_decision_problem(
                num_alternatives=complexity["alternatives"],
                num_criteria=complexity["criteria"],
                num_stakeholders=complexity["stakeholders"]
            )
            
            # Measure decision analysis performance
            start_time = time.time()
            
            decision_results = performance_orchestrator.decision_support.perform_comprehensive_analysis(
                decision_problem=decision_problem,
                methods=["ahp", "topsis", "electre"],
                include_sensitivity=True,
                include_monte_carlo=True,
                monte_carlo_iterations=5000
            )
            
            end_time = time.time()
            analysis_time = end_time - start_time
            
            # Validate performance
            complexity_score = complexity["alternatives"] * complexity["criteria"] * complexity["stakeholders"]
            max_time = TEST_CONFIG["performance_thresholds"]["decision_analysis_complex"]
            normalized_time = analysis_time / (complexity_score / 100)  # per 100 complexity units
            
            assert normalized_time < max_time, \
                f"Decision analysis too slow: {analysis_time:.2f}s for complexity {complexity_score}"
            
            # Validate results quality
            assert "method_results" in decision_results
            assert len(decision_results["method_results"]) == 3  # Three methods
            assert "consensus_ranking" in decision_results
    
    def test_compliance_assessment_performance(self, performance_orchestrator):
        """Test compliance governance performance with large regulatory frameworks"""
        
        # Test with increasing compliance scope
        compliance_scopes = [
            {"regulations": 5, "controls": 50, "entities": 10},
            {"regulations": 10, "controls": 100, "entities": 25},
            {"regulations": 20, "controls": 250, "entities": 50},
            {"regulations": 50, "controls": 500, "entities": 100}
        ]
        
        for scope in compliance_scopes:
            # Generate compliance assessment data
            compliance_data = {
                "regulatory_requirements": TestDataGenerator.generate_regulatory_requirements(scope["regulations"]),
                "control_framework": TestDataGenerator.generate_control_framework(scope["controls"]),
                "business_entities": TestDataGenerator.generate_business_entities(scope["entities"])
            }
            
            # Measure compliance assessment performance
            start_time = time.time()
            
            compliance_results = performance_orchestrator.compliance_governance.perform_comprehensive_assessment(
                compliance_data=compliance_data,
                assessment_depth="thorough",
                include_gap_analysis=True,
                include_risk_assessment=True
            )
            
            end_time = time.time()
            assessment_time = end_time - start_time
            
            # Validate performance
            total_assessments = scope["regulations"] * scope["controls"] * scope["entities"]
            max_time_per_assessment = TEST_CONFIG["performance_thresholds"]["compliance_per_assessment"]
            time_per_assessment = assessment_time / total_assessments
            
            assert time_per_assessment < max_time_per_assessment, \
                f"Compliance assessment too slow: {time_per_assessment:.4f}s per assessment"
            
            # Validate assessment quality
            assert "overall_compliance_score" in compliance_results
            assert "detailed_assessments" in compliance_results
            assert len(compliance_results["detailed_assessments"]) == scope["regulations"]
    
    def test_concurrent_capability_performance(self, performance_orchestrator):
        """Test performance of concurrent capability execution"""
        
        # Prepare data for concurrent analysis
        concurrent_data = {
            "financial_data": TestDataGenerator.generate_financial_statements("large", "technology"),
            "strategic_data": TestDataGenerator.generate_strategic_context("large", "technology"),
            "operational_data": TestDataGenerator.generate_operational_metrics("large", "technology"),
            "decision_data": TestDataGenerator.generate_decision_problems(count=5),
            "compliance_data": TestDataGenerator.generate_compliance_scenarios("technology")
        }
        
        # Test sequential execution
        start_time = time.time()
        
        sequential_results = []
        sequential_results.append(
            performance_orchestrator.financial_analysis.analyze_financial_health(**concurrent_data["financial_data"])
        )
        sequential_results.append(
            performance_orchestrator.strategic_planning.generate_strategic_plan(**concurrent_data["strategic_data"])
        )
        sequential_results.append(
            performance_orchestrator.operations_management.optimize_operations(**concurrent_data["operational_data"])
        )
        sequential_results.append(
            performance_orchestrator.decision_support.analyze_decisions(**concurrent_data["decision_data"])
        )
        sequential_results.append(
            performance_orchestrator.compliance_governance.assess_compliance(**concurrent_data["compliance_data"])
        )
        
        sequential_time = time.time() - start_time
        
        # Test concurrent execution
        start_time = time.time()
        
        with ThreadPoolExecutor(max_workers=5) as executor:
            concurrent_futures = [
                executor.submit(performance_orchestrator.financial_analysis.analyze_financial_health, **concurrent_data["financial_data"]),
                executor.submit(performance_orchestrator.strategic_planning.generate_strategic_plan, **concurrent_data["strategic_data"]),
                executor.submit(performance_orchestrator.operations_management.optimize_operations, **concurrent_data["operational_data"]),
                executor.submit(performance_orchestrator.decision_support.analyze_decisions, **concurrent_data["decision_data"]),
                executor.submit(performance_orchestrator.compliance_governance.assess_compliance, **concurrent_data["compliance_data"])
            ]
            
            concurrent_results = [future.result() for future in concurrent_futures]
        
        concurrent_time = time.time() - start_time
        
        # Validate concurrency efficiency
        efficiency = 1 - (concurrent_time / sequential_time)
        min_efficiency = TEST_CONFIG["performance_thresholds"]["concurrency_efficiency"]
        
        assert efficiency > min_efficiency, \
            f"Concurrency efficiency too low: {efficiency:.2f} (sequential: {sequential_time:.2f}s, concurrent: {concurrent_time:.2f}s)"
        
        # Validate results consistency
        assert len(concurrent_results) == len(sequential_results)
        for i, (seq_result, conc_result) in enumerate(zip(sequential_results, concurrent_results)):
            assert type(seq_result) == type(conc_result), f"Result type mismatch for capability {i}"
    
    def test_memory_usage_optimization(self, performance_orchestrator):
        """Test memory usage and optimization"""
        
        # Monitor memory usage during large operations
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Generate large dataset
        large_data = {
            "financial_statements": TestDataGenerator.generate_financial_statements_batch(
                count=1000,
                company_size="large",
                industry="technology"
            ),
            "time_series_data": TestDataGenerator.generate_time_series_data(
                length=10000,
                features=100
            )
        }
        
        memory_samples = []
        
        # Process data in chunks and monitor memory
        chunk_size = 100
        for i in range(0, len(large_data["financial_statements"]), chunk_size):
            chunk = large_data["financial_statements"][i:i+chunk_size]
            
            # Process chunk
            results = performance_orchestrator.financial_analysis.analyze_portfolio(
                financial_data=chunk
            )
            
            # Sample memory usage
            current_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_samples.append(current_memory - initial_memory)
            
            # Clean up
            del results
            gc.collect()
        
        # Validate memory usage patterns
        max_memory_usage = max(memory_samples)
        avg_memory_usage = np.mean(memory_samples)
        memory_growth = memory_samples[-1] - memory_samples[0]
        
        max_allowed_memory = TEST_CONFIG["performance_thresholds"]["max_memory_usage"]
        assert max_memory_usage < max_allowed_memory, \
            f"Memory usage too high: {max_memory_usage:.2f}MB"
        
        # Memory should not grow significantly over time (no major leaks)
        max_allowed_growth = TEST_CONFIG["performance_thresholds"]["memory_growth_limit"]
        assert memory_growth < max_allowed_growth, \
            f"Potential memory leak detected: {memory_growth:.2f}MB growth"
    
    def test_scalability_limits(self, performance_orchestrator):
        """Test scalability limits and breaking points"""
        
        # Test financial analysis scalability
        max_companies = 0
        for company_count in [100, 500, 1000, 2000, 5000]:
            try:
                financial_data = TestDataGenerator.generate_financial_statements_batch(
                    count=company_count,
                    company_size="large", 
                    industry="technology"
                )
                
                start_time = time.time()
                results = performance_orchestrator.financial_analysis.analyze_portfolio(
                    financial_data=financial_data
                )
                execution_time = time.time() - start_time
                
                # Check if still within acceptable performance
                max_time = TEST_CONFIG["performance_thresholds"]["scalability_limit_time"]
                if execution_time > max_time:
                    break
                
                max_companies = company_count
                
            except (MemoryError, RuntimeError) as e:
                break
        
        # Document scalability limits
        assert max_companies >= TEST_CONFIG["performance_thresholds"]["min_scalability_limit"], \
            f"Scalability limit too low: {max_companies} companies"
        
        # Test operational complexity scalability
        max_processes = 0
        for process_count in [50, 100, 500, 1000, 2000]:
            try:
                operational_data = TestDataGenerator.generate_process_data(process_count)
                
                start_time = time.time()
                results = performance_orchestrator.operations_management.optimize_operations(
                    operational_data=operational_data
                )
                execution_time = time.time() - start_time
                
                max_time = TEST_CONFIG["performance_thresholds"]["scalability_limit_time"]
                if execution_time > max_time:
                    break
                
                max_processes = process_count
                
            except (MemoryError, RuntimeError) as e:
                break
        
        assert max_processes >= TEST_CONFIG["performance_thresholds"]["min_process_scalability"], \
            f"Process scalability limit too low: {max_processes} processes"
    
    def test_caching_performance(self, performance_orchestrator):
        """Test caching effectiveness for performance improvement"""
        
        # Test financial analysis caching
        financial_data = TestDataGenerator.generate_financial_statements("large", "technology")
        
        # First execution (cold cache)
        start_time = time.time()
        results1 = performance_orchestrator.financial_analysis.analyze_financial_health(
            financial_statements=financial_data,
            enable_caching=True
        )
        cold_cache_time = time.time() - start_time
        
        # Second execution (warm cache)
        start_time = time.time()
        results2 = performance_orchestrator.financial_analysis.analyze_financial_health(
            financial_statements=financial_data,
            enable_caching=True
        )
        warm_cache_time = time.time() - start_time
        
        # Validate cache effectiveness
        cache_speedup = cold_cache_time / warm_cache_time
        min_speedup = TEST_CONFIG["performance_thresholds"]["cache_speedup_ratio"]
        
        assert cache_speedup > min_speedup, \
            f"Cache speedup insufficient: {cache_speedup:.2f}x (cold: {cold_cache_time:.2f}s, warm: {warm_cache_time:.2f}s)"
        
        # Validate results consistency
        assert results1.keys() == results2.keys(), "Cached results should have same structure"
    
    def test_load_balancing_performance(self, performance_orchestrator):
        """Test load balancing across multiple workers"""
        
        # Prepare multiple analysis requests
        analysis_requests = []
        for i in range(20):
            request = {
                "financial_data": TestDataGenerator.generate_financial_statements("medium", "technology"),
                "request_id": f"req_{i}"
            }
            analysis_requests.append(request)
        
        # Test with single worker
        start_time = time.time()
        single_worker_results = []
        for request in analysis_requests:
            result = performance_orchestrator.financial_analysis.analyze_financial_health(
                **request["financial_data"]
            )
            single_worker_results.append(result)
        single_worker_time = time.time() - start_time
        
        # Test with multiple workers
        start_time = time.time()
        with ThreadPoolExecutor(max_workers=4) as executor:
            multi_worker_futures = [
                executor.submit(
                    performance_orchestrator.financial_analysis.analyze_financial_health,
                    **request["financial_data"]
                )
                for request in analysis_requests
            ]
            multi_worker_results = [future.result() for future in multi_worker_futures]
        multi_worker_time = time.time() - start_time
        
        # Validate load balancing efficiency
        load_balancing_speedup = single_worker_time / multi_worker_time
        min_speedup = TEST_CONFIG["performance_thresholds"]["load_balancing_speedup"]
        
        assert load_balancing_speedup > min_speedup, \
            f"Load balancing speedup insufficient: {load_balancing_speedup:.2f}x"
        
        # Validate results consistency
        assert len(multi_worker_results) == len(single_worker_results)
    
    @pytest.mark.stress
    def test_stress_conditions(self, performance_orchestrator):
        """Test performance under stress conditions"""
        
        # Test with maximum concurrent requests
        max_concurrent_requests = 50
        stress_requests = []
        
        for i in range(max_concurrent_requests):
            request = {
                "business_context": TestDataGenerator.generate_comprehensive_business_context(),
                "analysis_type": "comprehensive"
            }
            stress_requests.append(request)
        
        # Execute stress test
        start_time = time.time()
        successful_requests = 0
        failed_requests = 0
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            stress_futures = [
                executor.submit(
                    performance_orchestrator.execute_comprehensive_analysis,
                    **request
                )
                for request in stress_requests
            ]
            
            for future in stress_futures:
                try:
                    result = future.result(timeout=60)  # 60 second timeout
                    successful_requests += 1
                except Exception as e:
                    failed_requests += 1
        
        stress_test_time = time.time() - start_time
        
        # Validate stress test results
        success_rate = successful_requests / max_concurrent_requests
        min_success_rate = TEST_CONFIG["performance_thresholds"]["stress_success_rate"]
        
        assert success_rate > min_success_rate, \
            f"Stress test success rate too low: {success_rate:.2f} ({successful_requests}/{max_concurrent_requests})"
        
        # Average time per request should be reasonable under stress
        avg_time_per_request = stress_test_time / max_concurrent_requests
        max_avg_time = TEST_CONFIG["performance_thresholds"]["stress_avg_time"]
        
        assert avg_time_per_request < max_avg_time, \
            f"Average time per request under stress too high: {avg_time_per_request:.2f}s"
    
    def test_resource_cleanup(self, performance_orchestrator):
        """Test proper resource cleanup and garbage collection"""
        
        # Monitor resource usage over multiple analysis cycles
        initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
        memory_samples = []
        
        # Perform multiple analysis cycles
        for cycle in range(10):
            # Generate fresh data for each cycle
            analysis_data = {
                "financial_data": TestDataGenerator.generate_financial_statements("large", "technology"),
                "operational_data": TestDataGenerator.generate_operational_metrics("large", "technology")
            }
            
            # Perform analysis
            results = performance_orchestrator.execute_comprehensive_analysis(
                business_context=TestDataGenerator.generate_comprehensive_business_context(),
                prepared_data=analysis_data
            )
            
            # Explicitly clean up
            del analysis_data
            del results
            gc.collect()
            
            # Sample memory
            current_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            memory_samples.append(current_memory - initial_memory)
        
        # Validate memory growth pattern
        final_memory = memory_samples[-1]
        max_memory = max(memory_samples)
        
        # Final memory should not be significantly higher than initial
        max_acceptable_growth = TEST_CONFIG["performance_thresholds"]["memory_cleanup_limit"]
        assert final_memory < max_acceptable_growth, \
            f"Memory not properly cleaned up: {final_memory:.2f}MB growth after cleanup"
        
        # Memory should not continuously grow
        memory_trend = np.polyfit(range(len(memory_samples)), memory_samples, 1)[0]
        max_trend = TEST_CONFIG["performance_thresholds"]["memory_trend_limit"]
        
        assert memory_trend < max_trend, \
            f"Memory continuously growing: {memory_trend:.2f}MB per cycle"
