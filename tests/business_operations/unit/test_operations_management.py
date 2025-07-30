"""
Unit Tests for Operations Management Capability

Tests for operations management methods including:
- Process optimization
- Resource allocation
- Supply chain management
- Quality management
- Performance monitoring
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch
from typing import Dict, Any, List
from datetime import datetime, timedelta

from modules.business_operations.operations_management import (
    OperationsManagementCapability,
    ProcessMetrics,
    ResourceAllocation,
    SupplyChainAnalysis,
    QualityMetrics,
    OperationalPlan
)
from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    AccuracyValidator,
    TEST_CONFIG
)

@pytest.mark.unit
class TestOperationsManagementUnit(BusinessOperationsTestFramework):
    """Unit tests for Operations Management Capability"""
    
    @pytest.fixture
    def operations_capability(self):
        """Create operations management capability instance"""
        config = {
            "optimization_algorithm": "linear_programming",
            "quality_standards": "iso_9001",
            "monitoring_frequency": "real_time"
        }
        return OperationsManagementCapability(config)
    
    @pytest.fixture
    def sample_process_data(self):
        """Sample process data for testing"""
        return {
            "processes": [
                {
                    "id": "proc_001",
                    "name": "Order Processing",
                    "cycle_time": 2.5,  # hours
                    "throughput": 150,  # orders/day
                    "error_rate": 0.02,
                    "cost_per_unit": 15.50,
                    "resources_required": ["staff", "system"]
                },
                {
                    "id": "proc_002", 
                    "name": "Quality Control",
                    "cycle_time": 1.0,
                    "throughput": 200,
                    "error_rate": 0.005,
                    "cost_per_unit": 8.75,
                    "resources_required": ["equipment", "specialist"]
                },
                {
                    "id": "proc_003",
                    "name": "Shipping",
                    "cycle_time": 0.5,
                    "throughput": 300,
                    "error_rate": 0.01,
                    "cost_per_unit": 12.00,
                    "resources_required": ["logistics", "packaging"]
                }
            ]
        }
    
    @pytest.fixture
    def sample_resource_data(self):
        """Sample resource data for testing"""
        return {
            "human_resources": {
                "total_staff": 120,
                "departments": {
                    "operations": 45,
                    "quality": 25,
                    "logistics": 30,
                    "management": 20
                },
                "skill_levels": {
                    "junior": 0.4,
                    "mid": 0.4,
                    "senior": 0.2
                },
                "availability": 0.85,  # 85% utilization
                "cost_per_hour": {
                    "junior": 25,
                    "mid": 40,
                    "senior": 65
                }
            },
            "equipment": {
                "production_line_1": {
                    "capacity": 100,  # units/hour
                    "availability": 0.92,
                    "maintenance_cost": 500,  # per day
                    "operator_required": 3
                },
                "quality_station": {
                    "capacity": 150,
                    "availability": 0.95,
                    "maintenance_cost": 200,
                    "operator_required": 2
                },
                "packaging_system": {
                    "capacity": 200,
                    "availability": 0.88,
                    "maintenance_cost": 300,
                    "operator_required": 2
                }
            },
            "facilities": {
                "total_space": 10000,  # sq ft
                "utilized_space": 8500,
                "cost_per_sqft": 15,
                "layout_efficiency": 0.78
            }
        }
    
    def test_process_optimization(self, operations_capability, sample_process_data):
        """Test process optimization functionality"""
        
        # Set optimization targets
        optimization_targets = {
            "minimize_cycle_time": True,
            "maximize_throughput": True,
            "minimize_costs": True,
            "quality_threshold": 0.99  # 99% quality rate
        }
        
        # Perform process optimization
        optimization_result = operations_capability.optimize_processes(
            process_data=sample_process_data,
            targets=optimization_targets
        )
        
        # Validate structure
        assert "optimized_processes" in optimization_result
        assert "improvement_metrics" in optimization_result
        assert "implementation_plan" in optimization_result
        
        # Validate optimization results
        optimized = optimization_result["optimized_processes"]
        assert len(optimized) == len(sample_process_data["processes"])
        
        # Check that optimization improved metrics
        improvements = optimization_result["improvement_metrics"]
        assert "cycle_time_reduction" in improvements
        assert "throughput_increase" in improvements
        assert "cost_reduction" in improvements
        
        # Validate improvement calculations
        original_total_cycle = sum(p["cycle_time"] for p in sample_process_data["processes"])
        optimized_total_cycle = sum(p["cycle_time"] for p in optimized)
        
        expected_reduction = (original_total_cycle - optimized_total_cycle) / original_total_cycle
        actual_reduction = improvements["cycle_time_reduction"]
        
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_percentage_accuracy(
            actual_reduction, expected_reduction, tolerance=0.05
        )
    
    def test_resource_allocation(self, operations_capability, sample_resource_data):
        """Test resource allocation optimization"""
        
        # Define demand forecast
        demand_forecast = {
            "daily_demand": 250,
            "peak_hours": [9, 10, 11, 14, 15, 16],
            "seasonal_factor": 1.15,
            "growth_rate": 0.08
        }
        
        # Perform resource allocation
        allocation_result = operations_capability.allocate_resources(
            available_resources=sample_resource_data,
            demand_forecast=demand_forecast,
            optimization_period=30  # days
        )
        
        # Validate structure
        assert isinstance(allocation_result, ResourceAllocation)
        assert allocation_result.human_resources is not None
        assert allocation_result.equipment_schedule is not None
        assert allocation_result.facility_utilization is not None
        assert allocation_result.total_cost is not None
        
        # Validate resource constraints
        hr_allocation = allocation_result.human_resources
        total_allocated = sum(hr_allocation["departments"].values())
        available_staff = sample_resource_data["human_resources"]["total_staff"]
        
        assert total_allocated <= available_staff, "Over-allocated human resources"
        
        # Validate cost calculations
        daily_hr_cost = 0
        for dept, count in hr_allocation["departments"].items():
            avg_cost = np.mean(list(sample_resource_data["human_resources"]["cost_per_hour"].values()))
            daily_hr_cost += count * avg_cost * 8  # 8-hour workday
        
        # Equipment costs
        daily_equipment_cost = sum(
            eq["maintenance_cost"] for eq in sample_resource_data["equipment"].values()
        )
        
        expected_daily_cost = daily_hr_cost + daily_equipment_cost
        actual_daily_cost = allocation_result.total_cost / 30  # per day
        
        # Validate cost accuracy within 10% tolerance
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            actual_daily_cost, expected_daily_cost, tolerance=0.10
        )
    
    def test_supply_chain_analysis(self, operations_capability):
        """Test supply chain analysis and optimization"""
        
        # Sample supply chain data
        supply_chain_data = {
            "suppliers": [
                {
                    "id": "sup_001",
                    "name": "Primary Supplier A",
                    "reliability": 0.95,
                    "lead_time": 7,  # days
                    "cost_per_unit": 25.50,
                    "capacity": 1000,  # units/month
                    "quality_rating": 0.98
                },
                {
                    "id": "sup_002",
                    "name": "Backup Supplier B", 
                    "reliability": 0.88,
                    "lead_time": 12,
                    "cost_per_unit": 28.00,
                    "capacity": 800,
                    "quality_rating": 0.95
                }
            ],
            "inventory_levels": {
                "raw_materials": {
                    "current_stock": 500,
                    "safety_stock": 150,
                    "reorder_point": 200,
                    "max_capacity": 1200
                },
                "work_in_progress": {
                    "current_stock": 200,
                    "target_level": 180
                },
                "finished_goods": {
                    "current_stock": 300,
                    "safety_stock": 100,
                    "target_level": 250
                }
            },
            "demand_pattern": {
                "monthly_demand": 800,
                "variability": 0.15,
                "seasonality": [1.0, 0.9, 1.1, 1.2, 1.3, 1.1, 0.8, 0.7, 0.9, 1.0, 1.2, 1.4]
            }
        }
        
        # Perform supply chain analysis
        sc_analysis = operations_capability.analyze_supply_chain(
            supply_chain_data=supply_chain_data
        )
        
        # Validate structure
        assert isinstance(sc_analysis, SupplyChainAnalysis)
        assert sc_analysis.supplier_performance is not None
        assert sc_analysis.inventory_optimization is not None
        assert sc_analysis.risk_assessment is not None
        assert sc_analysis.cost_analysis is not None
        
        # Validate supplier ranking
        supplier_perf = sc_analysis.supplier_performance
        assert len(supplier_perf["rankings"]) == 2
        
        # Primary supplier should rank higher (better reliability, lead time, quality)
        primary_score = next(
            s["score"] for s in supplier_perf["rankings"] if s["supplier_id"] == "sup_001"
        )
        backup_score = next(
            s["score"] for s in supplier_perf["rankings"] if s["supplier_id"] == "sup_002"
        )
        assert primary_score > backup_score, "Primary supplier should have higher score"
        
        # Validate inventory recommendations
        inventory_opt = sc_analysis.inventory_optimization
        assert "recommended_reorder_points" in inventory_opt
        assert "safety_stock_levels" in inventory_opt
        assert "holding_cost_optimization" in inventory_opt
        
        # Validate cost analysis
        cost_analysis = sc_analysis.cost_analysis
        assert "total_supply_chain_cost" in cost_analysis
        assert "cost_breakdown" in cost_analysis
        assert cost_analysis["total_supply_chain_cost"] > 0
    
    def test_quality_management(self, operations_capability):
        """Test quality management and control"""
        
        # Sample quality data
        quality_data = {
            "quality_metrics": {
                "defect_rate": 0.015,  # 1.5%
                "first_pass_yield": 0.94,
                "customer_satisfaction": 0.87,
                "return_rate": 0.008,
                "compliance_score": 0.96
            },
            "inspection_points": [
                {
                    "point_id": "qc_001",
                    "location": "incoming_materials",
                    "inspection_rate": 0.10,  # 10% sample
                    "pass_rate": 0.98,
                    "cost_per_inspection": 5.00
                },
                {
                    "point_id": "qc_002",
                    "location": "mid_process",
                    "inspection_rate": 0.05,
                    "pass_rate": 0.95,
                    "cost_per_inspection": 8.00
                },
                {
                    "point_id": "qc_003",
                    "location": "final_product",
                    "inspection_rate": 1.0,  # 100% inspection
                    "pass_rate": 0.97,
                    "cost_per_inspection": 12.00
                }
            ],
            "quality_issues": [
                {
                    "issue_type": "dimensional_variance",
                    "frequency": 0.008,
                    "impact": "medium",
                    "root_cause": "equipment_calibration"
                },
                {
                    "issue_type": "surface_defects",
                    "frequency": 0.005,
                    "impact": "low",
                    "root_cause": "material_quality"
                }
            ]
        }
        
        # Analyze quality metrics
        quality_analysis = operations_capability.analyze_quality_metrics(
            quality_data=quality_data
        )
        
        # Validate structure
        assert isinstance(quality_analysis, QualityMetrics)
        assert quality_analysis.overall_quality_score is not None
        assert quality_analysis.improvement_opportunities is not None
        assert quality_analysis.cost_of_quality is not None
        
        # Validate quality score calculation
        expected_score = (
            quality_data["quality_metrics"]["first_pass_yield"] * 0.3 +
            (1 - quality_data["quality_metrics"]["defect_rate"]) * 0.3 +
            quality_data["quality_metrics"]["customer_satisfaction"] * 0.2 +
            (1 - quality_data["quality_metrics"]["return_rate"]) * 0.1 +
            quality_data["quality_metrics"]["compliance_score"] * 0.1
        )
        
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            quality_analysis.overall_quality_score, expected_score, tolerance=0.02
        )
        
        # Validate improvement opportunities
        improvements = quality_analysis.improvement_opportunities
        assert len(improvements) > 0
        
        # Should identify dimensional variance as key issue
        issue_types = [imp["issue"] for imp in improvements]
        assert any("dimensional" in issue.lower() for issue in issue_types)
        
        # Validate cost of quality calculation
        coq = quality_analysis.cost_of_quality
        assert "prevention_costs" in coq
        assert "appraisal_costs" in coq
        assert "internal_failure_costs" in coq
        assert "external_failure_costs" in coq
    
    def test_performance_monitoring(self, operations_capability, sample_process_data):
        """Test operational performance monitoring"""
        
        # Historical performance data
        historical_data = {
            "time_series": [
                {"date": "2024-01-01", "throughput": 145, "cycle_time": 2.6, "quality": 0.97},
                {"date": "2024-01-02", "throughput": 152, "cycle_time": 2.4, "quality": 0.98},
                {"date": "2024-01-03", "throughput": 148, "cycle_time": 2.5, "quality": 0.96},
                {"date": "2024-01-04", "throughput": 155, "cycle_time": 2.3, "quality": 0.99},
                {"date": "2024-01-05", "throughput": 150, "cycle_time": 2.5, "quality": 0.98}
            ],
            "kpi_targets": {
                "throughput_target": 150,
                "cycle_time_target": 2.5,
                "quality_target": 0.98,
                "cost_target": 15.00
            }
        }
        
        # Monitor performance
        performance_report = operations_capability.monitor_performance(
            current_metrics=sample_process_data["processes"][0],  # Order processing
            historical_data=historical_data,
            monitoring_period=7  # days
        )
        
        # Validate structure
        assert "current_performance" in performance_report
        assert "trend_analysis" in performance_report
        assert "variance_analysis" in performance_report
        assert "alerts" in performance_report
        assert "recommendations" in performance_report
        
        # Validate trend analysis
        trends = performance_report["trend_analysis"]
        assert "throughput_trend" in trends
        assert "cycle_time_trend" in trends
        assert "quality_trend" in trends
        
        # Calculate expected throughput trend
        throughputs = [entry["throughput"] for entry in historical_data["time_series"]]
        expected_trend = (throughputs[-1] - throughputs[0]) / len(throughputs)
        actual_trend = trends["throughput_trend"]
        
        # Validate trend calculation accuracy
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            actual_trend, expected_trend, tolerance=0.1
        )
        
        # Validate variance analysis
        variance = performance_report["variance_analysis"]
        current_throughput = sample_process_data["processes"][0]["throughput"]
        target_throughput = historical_data["kpi_targets"]["throughput_target"]
        
        expected_variance = (current_throughput - target_throughput) / target_throughput
        assert abs(variance["throughput_variance"] - expected_variance) < 0.01
    
    def test_operational_planning(self, operations_capability, sample_resource_data):
        """Test operational planning and scheduling"""
        
        # Planning parameters
        planning_params = {
            "planning_horizon": 30,  # days
            "demand_forecast": {
                "daily_demand": [200, 220, 210, 240, 230, 250, 180],  # Week 1
                "seasonality": 1.1,
                "uncertainty": 0.15
            },
            "constraints": {
                "max_overtime": 0.20,  # 20% overtime allowed
                "maintenance_windows": [{"start": 5, "duration": 8}],  # Day 5, 8 hours
                "skill_requirements": {
                    "senior_staff_percentage": 0.20,
                    "specialist_availability": 0.90
                }
            },
            "objectives": {
                "minimize_cost": 0.4,
                "maximize_efficiency": 0.3,
                "maintain_quality": 0.3
            }
        }
        
        # Generate operational plan
        operational_plan = operations_capability.create_operational_plan(
            resources=sample_resource_data,
            planning_params=planning_params
        )
        
        # Validate structure
        assert isinstance(operational_plan, OperationalPlan)
        assert operational_plan.resource_schedule is not None
        assert operational_plan.production_schedule is not None
        assert operational_plan.maintenance_schedule is not None
        assert operational_plan.cost_projection is not None
        
        # Validate resource schedule
        resource_schedule = operational_plan.resource_schedule
        assert len(resource_schedule) == 30  # One entry per day
        
        # Validate overtime constraints
        for day_schedule in resource_schedule:
            if "overtime_hours" in day_schedule:
                regular_hours = day_schedule.get("regular_hours", 8)
                overtime_hours = day_schedule["overtime_hours"]
                overtime_ratio = overtime_hours / regular_hours
                assert overtime_ratio <= 0.20, f"Overtime constraint violated: {overtime_ratio}"
        
        # Validate maintenance scheduling
        maintenance_schedule = operational_plan.maintenance_schedule
        scheduled_maintenance = [m for m in maintenance_schedule if m["type"] == "planned"]
        
        # Should have maintenance window on day 5
        day_5_maintenance = [m for m in scheduled_maintenance if m["day"] == 5]
        assert len(day_5_maintenance) > 0, "Planned maintenance not scheduled"
        
        # Validate cost projection
        cost_projection = operational_plan.cost_projection
        assert "total_cost" in cost_projection
        assert "daily_costs" in cost_projection
        assert len(cost_projection["daily_costs"]) == 30
        assert cost_projection["total_cost"] > 0
    
    def test_bottleneck_analysis(self, operations_capability, sample_process_data):
        """Test bottleneck identification and analysis"""
        
        # Add capacity constraints to process data
        enhanced_process_data = sample_process_data.copy()
        for process in enhanced_process_data["processes"]:
            process["capacity_utilization"] = 0.85
            process["queue_time"] = process["cycle_time"] * 0.3  # 30% of cycle time in queue
        
        # Perform bottleneck analysis
        bottleneck_analysis = operations_capability.identify_bottlenecks(
            process_data=enhanced_process_data,
            demand_level=250  # units per day
        )
        
        # Validate structure
        assert "bottlenecks" in bottleneck_analysis
        assert "constraint_analysis" in bottleneck_analysis
        assert "improvement_recommendations" in bottleneck_analysis
        
        # Validate bottleneck identification
        bottlenecks = bottleneck_analysis["bottlenecks"]
        assert len(bottlenecks) > 0
        
        # Order processing should be identified as bottleneck (lowest throughput)
        bottleneck_ids = [b["process_id"] for b in bottlenecks]
        assert "proc_001" in bottleneck_ids, "Order processing should be identified as bottleneck"
        
        # Validate constraint analysis
        constraints = bottleneck_analysis["constraint_analysis"]
        assert "system_throughput" in constraints
        assert "cycle_time_impact" in constraints
        
        # System throughput should be limited by bottleneck
        expected_throughput = min(p["throughput"] for p in sample_process_data["processes"])
        actual_throughput = constraints["system_throughput"]
        assert abs(actual_throughput - expected_throughput) < 5, "System throughput calculation error"
    
    @pytest.mark.performance  
    def test_optimization_performance(self, operations_capability, sample_process_data):
        """Test performance of optimization algorithms"""
        import time
        
        # Measure optimization performance
        start_time = time.time()
        
        optimization_targets = {
            "minimize_cycle_time": True,
            "maximize_throughput": True,
            "minimize_costs": True
        }
        
        result = operations_capability.optimize_processes(
            process_data=sample_process_data,
            targets=optimization_targets
        )
        
        end_time = time.time()
        optimization_time = end_time - start_time
        
        # Should complete within performance threshold
        threshold = TEST_CONFIG["performance_thresholds"]["operations_optimization_time"]
        assert optimization_time < threshold, f"Optimization too slow: {optimization_time:.2f}s"
    
    def test_error_handling(self, operations_capability):
        """Test error handling for invalid inputs"""
        
        # Test with empty process data
        with pytest.raises(ValueError, match="No processes provided"):
            operations_capability.optimize_processes(
                process_data={"processes": []},
                targets={}
            )
        
        # Test with invalid resource allocation
        invalid_resources = {
            "human_resources": {
                "total_staff": -10,  # Negative staff
            }
        }
        
        with pytest.raises(ValueError, match="Invalid resource data"):
            operations_capability.allocate_resources(
                available_resources=invalid_resources,
                demand_forecast={"daily_demand": 100}
            )
        
        # Test with conflicting optimization targets
        conflicting_targets = {
            "minimize_cost": True,
            "maximize_quality": True,
            "minimize_resources": True,
            "maximize_capacity": True
        }
        
        with pytest.raises(ValueError, match="Conflicting optimization objectives"):
            operations_capability.validate_optimization_targets(conflicting_targets)
