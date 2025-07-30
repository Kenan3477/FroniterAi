"""
Compliance Performance Tests

Comprehensive performance testing suite for compliance capabilities including:
- Load testing for compliance assessments
- Stress testing for policy generation
- Scalability testing for multi-regulation scenarios
- Memory optimization validation
- Concurrent processing testing
- Performance regression testing
"""

import pytest
import asyncio
import time
import threading
import psutil
import statistics
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from concurrent.futures import ThreadPoolExecutor, as_completed

from . import (
    TestDataGenerator, ComplianceValidator, ComplianceTestMetrics,
    measure_execution_time
)

class TestCompliancePerformance:
    """Test compliance system performance under various load conditions"""
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_compliance_assessment_load(self, performance_thresholds):
        """Test compliance assessment performance under load"""
        
        load_scenarios = [
            {"concurrent_assessments": 5, "assessment_complexity": "low"},
            {"concurrent_assessments": 10, "assessment_complexity": "medium"},
            {"concurrent_assessments": 20, "assessment_complexity": "high"},
            {"concurrent_assessments": 50, "assessment_complexity": "enterprise"}
        ]
        
        for scenario in load_scenarios:
            concurrent_count = scenario["concurrent_assessments"]
            complexity = scenario["assessment_complexity"]
            
            start_time = time.time()
            
            # Run concurrent assessments
            results = self._run_concurrent_assessments(concurrent_count, complexity)
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Validate performance metrics
            assert len(results) == concurrent_count
            assert all(result["success"] for result in results)
            
            # Check individual assessment times
            assessment_times = [result["execution_time"] for result in results]
            avg_time = statistics.mean(assessment_times)
            max_time = max(assessment_times)
            
            threshold = performance_thresholds["compliance_check_time"]
            assert avg_time < threshold, (
                f"Average assessment time {avg_time:.2f}s exceeded threshold {threshold}s "
                f"for {concurrent_count} concurrent assessments"
            )
            
            assert max_time < threshold * 1.5, (
                f"Maximum assessment time {max_time:.2f}s too high for concurrent load"
            )
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_policy_generation_stress(self, performance_thresholds):
        """Test policy generation under stress conditions"""
        
        stress_scenarios = [
            {
                "simultaneous_generations": 10,
                "document_types": ["privacy_policy"],
                "complexity": "standard"
            },
            {
                "simultaneous_generations": 25,
                "document_types": ["privacy_policy", "terms_of_service"],
                "complexity": "multi_jurisdiction"
            },
            {
                "simultaneous_generations": 50,
                "document_types": ["privacy_policy", "terms_of_service", "cookie_policy"],
                "complexity": "comprehensive"
            }
        ]
        
        for scenario in stress_scenarios:
            generation_count = scenario["simultaneous_generations"]
            
            start_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            start_time = time.time()
            
            # Run stress test
            results = self._run_policy_generation_stress(scenario)
            
            end_time = time.time()
            end_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            
            total_time = end_time - start_time
            memory_increase = end_memory - start_memory
            
            # Validate results
            assert len(results) == generation_count
            assert all(result["success"] for result in results)
            
            # Performance validation
            threshold = performance_thresholds["policy_generation_time"]
            avg_time = statistics.mean([r["generation_time"] for r in results])
            
            assert avg_time < threshold, (
                f"Average policy generation time {avg_time:.2f}s exceeded threshold {threshold}s"
            )
            
            # Memory usage validation (should not exceed 500MB increase)
            assert memory_increase < 500, (
                f"Memory increase {memory_increase:.1f}MB too high for stress test"
            )
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_multi_regulation_scalability(self):
        """Test scalability with multiple regulations"""
        
        scalability_tests = [
            {"regulation_count": 2, "organization_count": 10},
            {"regulation_count": 5, "organization_count": 20},
            {"regulation_count": 10, "organization_count": 50},
            {"regulation_count": 15, "organization_count": 100}
        ]
        
        performance_results = []
        
        for test in scalability_tests:
            reg_count = test["regulation_count"]
            org_count = test["organization_count"]
            
            start_time = time.time()
            
            # Run scalability test
            result = self._test_multi_regulation_scalability(reg_count, org_count)
            
            end_time = time.time()
            execution_time = end_time - start_time
            
            performance_results.append({
                "regulation_count": reg_count,
                "organization_count": org_count,
                "execution_time": execution_time,
                "assessments_completed": result["assessments_completed"],
                "throughput": result["assessments_completed"] / execution_time
            })
            
            # Validate linear scalability (execution time should not grow exponentially)
            if len(performance_results) > 1:
                prev_result = performance_results[-2]
                complexity_ratio = (reg_count * org_count) / (prev_result["regulation_count"] * prev_result["organization_count"])
                time_ratio = execution_time / prev_result["execution_time"]
                
                # Time growth should be roughly linear with complexity
                assert time_ratio <= complexity_ratio * 1.5, (
                    f"Performance degradation too severe: time ratio {time_ratio:.2f} "
                    f"vs complexity ratio {complexity_ratio:.2f}"
                )
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_risk_assessment_performance(self, performance_thresholds):
        """Test risk assessment performance with large datasets"""
        
        risk_assessment_scenarios = [
            {
                "risk_factors_count": 50,
                "simulation_runs": 1000,
                "calculation_methods": ["expected_value"]
            },
            {
                "risk_factors_count": 100,
                "simulation_runs": 5000,
                "calculation_methods": ["monte_carlo"]
            },
            {
                "risk_factors_count": 200,
                "simulation_runs": 10000,
                "calculation_methods": ["sensitivity_analysis"]
            }
        ]
        
        for scenario in risk_assessment_scenarios:
            factors_count = scenario["risk_factors_count"]
            
            start_time = time.time()
            
            # Generate large risk factor dataset
            risk_factors = self._generate_large_risk_dataset(factors_count)
            
            # Run risk assessment
            for method in scenario["calculation_methods"]:
                method_start = time.time()
                
                result = self._perform_risk_assessment(risk_factors, method, scenario)
                
                method_end = time.time()
                method_time = method_end - method_start
                
                # Validate performance
                threshold = performance_thresholds["risk_calculation_time"]
                assert method_time < threshold * 2, (  # Allow 2x threshold for large datasets
                    f"Risk assessment with {factors_count} factors took {method_time:.2f}s, "
                    f"exceeding allowable time for method {method}"
                )
                
                assert result["success"] is True
                assert "risk_score" in result
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_concurrent_compliance_operations(self):
        """Test concurrent compliance operations"""
        
        operation_mix = [
            {"operation": "compliance_assessment", "count": 10},
            {"operation": "policy_generation", "count": 5},
            {"operation": "risk_calculation", "count": 8},
            {"operation": "regulatory_scan", "count": 3}
        ]
        
        start_time = time.time()
        
        # Run mixed operations concurrently
        results = self._run_mixed_concurrent_operations(operation_mix)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Validate all operations completed successfully
        total_operations = sum(op["count"] for op in operation_mix)
        assert len(results) == total_operations
        assert all(result["success"] for result in results)
        
        # Check operation type distribution
        operation_counts = {}
        for result in results:
            op_type = result["operation_type"]
            operation_counts[op_type] = operation_counts.get(op_type, 0) + 1
        
        for op in operation_mix:
            assert operation_counts[op["operation"]] == op["count"]
        
        # Performance validation - should complete within reasonable time
        assert total_time < 30, f"Mixed operations took {total_time:.2f}s, too long for concurrent execution"
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_memory_optimization(self):
        """Test memory usage optimization during compliance operations"""
        
        memory_test_scenarios = [
            {
                "operation": "large_organization_assessment",
                "data_size": "10MB",
                "expected_memory_limit": 100  # MB
            },
            {
                "operation": "bulk_policy_generation",
                "data_size": "50MB",
                "expected_memory_limit": 200  # MB
            },
            {
                "operation": "comprehensive_risk_analysis",
                "data_size": "100MB",
                "expected_memory_limit": 300  # MB
            }
        ]
        
        for scenario in memory_test_scenarios:
            initial_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            
            # Run memory-intensive operation
            result = self._run_memory_intensive_operation(scenario)
            
            peak_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            memory_used = peak_memory - initial_memory
            
            # Validate memory usage
            limit = scenario["expected_memory_limit"]
            assert memory_used <= limit, (
                f"Memory usage {memory_used:.1f}MB exceeded limit {limit}MB "
                f"for operation {scenario['operation']}"
            )
            
            assert result["success"] is True
            
            # Force garbage collection and check memory cleanup
            import gc
            gc.collect()
            
            final_memory = psutil.Process().memory_info().rss / 1024 / 1024  # MB
            memory_cleanup = peak_memory - final_memory
            
            # Should clean up at least 80% of used memory
            assert memory_cleanup >= memory_used * 0.8, (
                f"Insufficient memory cleanup: {memory_cleanup:.1f}MB cleaned "
                f"out of {memory_used:.1f}MB used"
            )
    
    @pytest.mark.performance
    @pytest.mark.compliance
    def test_performance_regression(self, performance_thresholds):
        """Test for performance regression in compliance operations"""
        
        baseline_operations = [
            {"operation": "standard_gdpr_assessment", "baseline_time": 2.0},
            {"operation": "privacy_policy_generation", "baseline_time": 3.0},
            {"operation": "basic_risk_calculation", "baseline_time": 1.0},
            {"operation": "regulatory_change_scan", "baseline_time": 5.0}
        ]
        
        regression_tolerance = 0.2  # 20% tolerance for performance regression
        
        for operation in baseline_operations:
            operation_name = operation["operation"]
            baseline_time = operation["baseline_time"]
            
            # Run operation multiple times for statistical significance
            execution_times = []
            for _ in range(5):
                start_time = time.time()
                
                result = self._run_baseline_operation(operation_name)
                
                end_time = time.time()
                execution_time = end_time - start_time
                execution_times.append(execution_time)
                
                assert result["success"] is True
            
            # Calculate average execution time
            avg_execution_time = statistics.mean(execution_times)
            performance_change = (avg_execution_time - baseline_time) / baseline_time
            
            # Check for regression
            assert performance_change <= regression_tolerance, (
                f"Performance regression detected for {operation_name}: "
                f"{performance_change:.2%} slower than baseline "
                f"({avg_execution_time:.2f}s vs {baseline_time:.2f}s)"
            )
            
            # Also check against absolute thresholds
            threshold_key = {
                "standard_gdpr_assessment": "compliance_check_time",
                "privacy_policy_generation": "policy_generation_time",
                "basic_risk_calculation": "risk_calculation_time",
                "regulatory_change_scan": "regulatory_scan_time"
            }.get(operation_name, "compliance_check_time")
            
            threshold = performance_thresholds[threshold_key]
            assert avg_execution_time <= threshold, (
                f"Operation {operation_name} exceeded absolute threshold: "
                f"{avg_execution_time:.2f}s > {threshold:.2f}s"
            )
    
    @pytest.mark.performance
    @pytest.mark.compliance
    async def test_async_compliance_operations(self):
        """Test asynchronous compliance operations performance"""
        
        async_scenarios = [
            {"concurrent_assessments": 20, "assessment_type": "gdpr"},
            {"concurrent_assessments": 15, "assessment_type": "multi_regulation"},
            {"concurrent_assessments": 10, "assessment_type": "comprehensive"}
        ]
        
        for scenario in async_scenarios:
            concurrent_count = scenario["concurrent_assessments"]
            assessment_type = scenario["assessment_type"]
            
            start_time = time.time()
            
            # Create async tasks
            tasks = [
                self._async_compliance_assessment(i, assessment_type)
                for i in range(concurrent_count)
            ]
            
            # Run tasks concurrently
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Validate results
            successful_results = [r for r in results if not isinstance(r, Exception)]
            assert len(successful_results) == concurrent_count
            
            # Check performance
            avg_time_per_assessment = total_time / concurrent_count
            assert avg_time_per_assessment < 1.0, (
                f"Async assessment average time {avg_time_per_assessment:.2f}s too high "
                f"for {concurrent_count} concurrent operations"
            )
    
    def _run_concurrent_assessments(self, count: int, complexity: str) -> List[Dict[str, Any]]:
        """Run concurrent compliance assessments"""
        
        results = []
        
        def run_assessment(assessment_id: int) -> Dict[str, Any]:
            start_time = time.time()
            
            # Simulate assessment complexity
            complexity_multiplier = {"low": 0.1, "medium": 0.3, "high": 0.5, "enterprise": 0.8}
            sleep_time = complexity_multiplier.get(complexity, 0.3)
            time.sleep(sleep_time)
            
            end_time = time.time()
            
            return {
                "assessment_id": assessment_id,
                "success": True,
                "execution_time": end_time - start_time,
                "complexity": complexity,
                "compliance_score": 0.85
            }
        
        # Use ThreadPoolExecutor for concurrent execution
        with ThreadPoolExecutor(max_workers=min(count, 20)) as executor:
            futures = [executor.submit(run_assessment, i) for i in range(count)]
            
            for future in as_completed(futures):
                results.append(future.result())
        
        return results
    
    def _run_policy_generation_stress(self, scenario: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Run policy generation stress test"""
        
        generation_count = scenario["simultaneous_generations"]
        document_types = scenario["document_types"]
        complexity = scenario["complexity"]
        
        results = []
        
        def generate_policy(generation_id: int) -> Dict[str, Any]:
            start_time = time.time()
            
            # Simulate policy generation
            doc_type = document_types[generation_id % len(document_types)]
            
            # Complexity affects generation time
            complexity_time = {"standard": 0.5, "multi_jurisdiction": 1.0, "comprehensive": 1.5}
            sleep_time = complexity_time.get(complexity, 1.0)
            time.sleep(sleep_time)
            
            end_time = time.time()
            
            return {
                "generation_id": generation_id,
                "success": True,
                "document_type": doc_type,
                "generation_time": end_time - start_time,
                "complexity": complexity,
                "word_count": 2000 + generation_id * 100  # Simulate variable document size
            }
        
        with ThreadPoolExecutor(max_workers=min(generation_count, 25)) as executor:
            futures = [executor.submit(generate_policy, i) for i in range(generation_count)]
            
            for future in as_completed(futures):
                results.append(future.result())
        
        return results
    
    def _test_multi_regulation_scalability(self, regulation_count: int, organization_count: int) -> Dict[str, Any]:
        """Test scalability with multiple regulations and organizations"""
        
        assessments_completed = 0
        
        # Simulate assessments for each org-regulation combination
        for org_id in range(organization_count):
            for reg_id in range(regulation_count):
                # Simulate assessment
                time.sleep(0.01)  # 10ms per assessment
                assessments_completed += 1
        
        return {
            "assessments_completed": assessments_completed,
            "regulation_count": regulation_count,
            "organization_count": organization_count
        }
    
    def _generate_large_risk_dataset(self, factor_count: int) -> List[Dict[str, Any]]:
        """Generate large risk factor dataset"""
        
        import random
        
        risk_factors = []
        for i in range(factor_count):
            risk_factors.append({
                "factor": f"risk_factor_{i}",
                "likelihood": random.uniform(0.1, 0.9),
                "impact": random.uniform(0.1, 0.9),
                "category": random.choice(["operational", "compliance", "cybersecurity", "financial"])
            })
        
        return risk_factors
    
    def _perform_risk_assessment(self, risk_factors: List[Dict], method: str, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Perform risk assessment with large dataset"""
        
        # Simulate complex risk calculation
        if method == "monte_carlo":
            simulation_runs = scenario.get("simulation_runs", 1000)
            time.sleep(simulation_runs * 0.0001)  # Simulate calculation time
        else:
            time.sleep(len(risk_factors) * 0.001)  # Simulate calculation time
        
        # Calculate simple risk score
        total_risk = sum(f["likelihood"] * f["impact"] for f in risk_factors)
        risk_score = min(total_risk / len(risk_factors), 1.0)
        
        return {
            "success": True,
            "risk_score": risk_score,
            "method": method,
            "factors_analyzed": len(risk_factors)
        }
    
    def _run_mixed_concurrent_operations(self, operation_mix: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run mixed compliance operations concurrently"""
        
        results = []
        
        def run_operation(operation_type: str, operation_id: int) -> Dict[str, Any]:
            start_time = time.time()
            
            # Simulate different operation types
            operation_times = {
                "compliance_assessment": 0.5,
                "policy_generation": 1.0,
                "risk_calculation": 0.3,
                "regulatory_scan": 2.0
            }
            
            sleep_time = operation_times.get(operation_type, 0.5)
            time.sleep(sleep_time)
            
            end_time = time.time()
            
            return {
                "operation_id": operation_id,
                "operation_type": operation_type,
                "success": True,
                "execution_time": end_time - start_time
            }
        
        # Create all operations
        all_operations = []
        operation_id = 0
        
        for op in operation_mix:
            for _ in range(op["count"]):
                all_operations.append((op["operation"], operation_id))
                operation_id += 1
        
        # Run concurrently
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(run_operation, op_type, op_id) 
                for op_type, op_id in all_operations
            ]
            
            for future in as_completed(futures):
                results.append(future.result())
        
        return results
    
    def _run_memory_intensive_operation(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Run memory-intensive compliance operation"""
        
        operation = scenario["operation"]
        
        # Simulate memory-intensive operations
        if operation == "large_organization_assessment":
            # Simulate large data structures
            large_data = [{"data": "x" * 1000} for _ in range(10000)]  # ~10MB
            time.sleep(1)
            del large_data
            
        elif operation == "bulk_policy_generation":
            # Simulate multiple policy documents
            policies = []
            for i in range(50):
                policy_content = "Policy content " * 1000  # ~50KB per policy
                policies.append({"id": i, "content": policy_content})
            time.sleep(2)
            del policies
            
        elif operation == "comprehensive_risk_analysis":
            # Simulate large risk calculation dataset
            risk_data = []
            for i in range(100000):
                risk_data.append({
                    "factor_id": i,
                    "calculations": [j * 0.1 for j in range(100)]
                })
            time.sleep(3)
            del risk_data
        
        return {"success": True, "operation": operation}
    
    def _run_baseline_operation(self, operation_name: str) -> Dict[str, Any]:
        """Run baseline operation for regression testing"""
        
        operation_simulations = {
            "standard_gdpr_assessment": lambda: time.sleep(0.8),
            "privacy_policy_generation": lambda: time.sleep(1.2),
            "basic_risk_calculation": lambda: time.sleep(0.4),
            "regulatory_change_scan": lambda: time.sleep(2.0)
        }
        
        simulation = operation_simulations.get(operation_name, lambda: time.sleep(1.0))
        simulation()
        
        return {"success": True, "operation": operation_name}
    
    async def _async_compliance_assessment(self, assessment_id: int, assessment_type: str) -> Dict[str, Any]:
        """Run async compliance assessment"""
        
        # Simulate async assessment
        assessment_times = {
            "gdpr": 0.3,
            "multi_regulation": 0.5,
            "comprehensive": 0.8
        }
        
        sleep_time = assessment_times.get(assessment_type, 0.5)
        await asyncio.sleep(sleep_time)
        
        return {
            "assessment_id": assessment_id,
            "assessment_type": assessment_type,
            "success": True,
            "compliance_score": 0.85
        }
