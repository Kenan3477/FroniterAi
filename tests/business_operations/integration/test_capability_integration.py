"""
Integration Tests for Business Operations Module

Tests integration between different business operations capabilities:
- Cross-capability data flow
- Workflow orchestration
- Data consistency
- Performance under integrated scenarios
"""

import pytest
import asyncio
import numpy as np
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any, List
from datetime import datetime, timedelta

from modules.business_operations.core import BusinessOperationsOrchestrator
from modules.business_operations.financial_analysis import FinancialAnalysisCapability
from modules.business_operations.strategic_planning import StrategicPlanningCapability
from modules.business_operations.operations_management import OperationsManagementCapability
from modules.business_operations.decision_support import DecisionSupportCapability
from modules.business_operations.compliance_governance import ComplianceGovernanceCapability

from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    AccuracyValidator,
    ComplianceValidator,
    TEST_CONFIG
)

@pytest.mark.integration
class TestBusinessOperationsIntegration(BusinessOperationsTestFramework):
    """Integration tests for Business Operations capabilities"""
    
    @pytest.fixture
    def orchestrator(self):
        """Create business operations orchestrator with all capabilities"""
        config = {
            "financial_analysis": {
                "data_sources": ["internal_erp", "market_data"],
                "calculation_precision": "high"
            },
            "strategic_planning": {
                "planning_horizon": 3,
                "scenario_count": 3
            },
            "operations_management": {
                "optimization_algorithm": "linear_programming",
                "monitoring_frequency": "real_time"
            },
            "decision_support": {
                "decision_method": "analytical_hierarchy_process",
                "confidence_threshold": 0.75
            },
            "compliance_governance": {
                "regulatory_frameworks": ["sox", "gdpr"],
                "audit_frequency": "quarterly"
            }
        }
        return BusinessOperationsOrchestrator(config)
    
    @pytest.fixture
    def comprehensive_business_context(self):
        """Comprehensive business context for integration testing"""
        return TestDataGenerator.generate_comprehensive_business_context()
    
    def test_financial_strategic_integration(self, orchestrator, comprehensive_business_context):
        """Test integration between financial analysis and strategic planning"""
        
        # Step 1: Perform financial analysis
        financial_request = {
            "analysis_type": "comprehensive_financial_health",
            "business_context": comprehensive_business_context,
            "financial_statements": TestDataGenerator.generate_financial_statements("large", "technology"),
            "market_data": TestDataGenerator.generate_market_data("large", "technology")
        }
        
        financial_results = orchestrator.financial_analysis.analyze_financial_health(
            **financial_request
        )
        
        # Validate financial results structure
        assert "financial_ratios" in financial_results
        assert "valuation_metrics" in financial_results
        assert "trend_analysis" in financial_results
        
        # Step 2: Use financial results in strategic planning
        strategic_request = {
            "company_profile": comprehensive_business_context["company_profile"],
            "financial_context": financial_results,
            "market_analysis": financial_request["market_data"]
        }
        
        strategic_results = orchestrator.strategic_planning.generate_strategic_insights(
            **strategic_request
        )
        
        # Validate strategic results
        assert "swot_analysis" in strategic_results
        assert "strategic_recommendations" in strategic_results
        assert "action_plans" in strategic_results
        
        # Validate integration quality
        # Strategic recommendations should reference financial metrics
        recommendations = strategic_results["strategic_recommendations"]
        recommendation_text = " ".join([rec["description"] for rec in recommendations]).lower()
        
        financial_keywords = ["revenue", "profitability", "liquidity", "leverage", "roi"]
        assert any(keyword in recommendation_text for keyword in financial_keywords), \
            "Strategic recommendations should reference financial metrics"
        
        # Validate data consistency
        # Financial growth rates should align with strategic growth targets
        financial_growth = financial_results["trend_analysis"]["revenue_growth"]
        strategic_growth = next(
            (rec["target_value"] for rec in recommendations 
             if "revenue" in rec["description"].lower()), 
            None
        )
        
        if strategic_growth:
            # Strategic targets should be achievable relative to historical performance
            assert strategic_growth <= financial_growth * 2.0, \
                "Strategic growth targets should be realistic relative to financial performance"
    
    def test_operations_decision_support_integration(self, orchestrator, comprehensive_business_context):
        """Test integration between operations management and decision support"""
        
        # Step 1: Generate operational optimization scenarios
        resource_data = {
            "human_resources": {
                "total_staff": 200,
                "utilization": 0.85,
                "cost_per_hour": {"junior": 25, "mid": 40, "senior": 65}
            },
            "equipment": {
                "production_capacity": 1000,
                "availability": 0.92,
                "maintenance_cost": 500
            }
        }
        
        # Generate optimization alternatives
        optimization_scenarios = orchestrator.operations_management.generate_optimization_scenarios(
            resource_data=resource_data,
            demand_forecast={"daily_demand": 800, "growth_rate": 0.15}
        )
        
        # Validate optimization scenarios
        assert len(optimization_scenarios) >= 2
        assert all("scenario_name" in scenario for scenario in optimization_scenarios)
        assert all("resource_allocation" in scenario for scenario in optimization_scenarios)
        assert all("cost_projection" in scenario for scenario in optimization_scenarios)
        
        # Step 2: Use optimization scenarios in decision support
        decision_problem = {
            "problem_statement": "Select optimal operational configuration",
            "decision_criteria": [
                {"name": "total_cost", "weight": 0.4, "type": "cost"},
                {"name": "efficiency", "weight": 0.3, "type": "benefit"},
                {"name": "flexibility", "weight": 0.2, "type": "benefit"},
                {"name": "risk_level", "weight": 0.1, "type": "cost"}
            ],
            "alternatives": []
        }
        
        # Convert optimization scenarios to decision alternatives
        for i, scenario in enumerate(optimization_scenarios):
            alternative = {
                "id": f"ops_scenario_{i+1}",
                "name": scenario["scenario_name"],
                "description": scenario.get("description", "Operational scenario"),
                "attributes": {
                    "total_cost": scenario["cost_projection"]["total_cost"],
                    "efficiency": scenario.get("efficiency_score", 0.8),
                    "flexibility": scenario.get("flexibility_score", 0.7),
                    "risk_level": scenario.get("risk_score", 0.3)
                }
            }
            decision_problem["alternatives"].append(alternative)
        
        # Perform decision analysis
        decision_results = orchestrator.decision_support.perform_mcda_analysis(
            decision_problem=decision_problem
        )
        
        # Validate decision results
        assert "recommended_alternative" in decision_results
        assert "ranking" in decision_results
        assert "sensitivity_analysis" in decision_results
        
        # Validate integration quality
        recommended_alt_id = decision_results["recommended_alternative"]["alternative_id"]
        recommended_scenario = next(
            scenario for i, scenario in enumerate(optimization_scenarios)
            if f"ops_scenario_{i+1}" == recommended_alt_id
        )
        
        # Recommended scenario should have reasonable characteristics
        assert recommended_scenario["cost_projection"]["total_cost"] > 0
        assert "resource_allocation" in recommended_scenario
    
    def test_compliance_financial_integration(self, orchestrator, comprehensive_business_context):
        """Test integration between compliance governance and financial analysis"""
        
        # Step 1: Perform financial analysis with compliance context
        financial_data = TestDataGenerator.generate_financial_statements("large", "finance")
        
        # Financial analysis with compliance requirements
        financial_results = orchestrator.financial_analysis.analyze_with_compliance_context(
            financial_statements=financial_data,
            compliance_requirements=["sox", "basel_iii"],
            business_context=comprehensive_business_context
        )
        
        # Validate compliance-enhanced financial analysis
        assert "sox_metrics" in financial_results
        assert "basel_iii_metrics" in financial_results
        assert "compliance_ratios" in financial_results
        
        # Step 2: Use financial results in compliance assessment
        compliance_context = {
            "financial_metrics": financial_results,
            "business_profile": comprehensive_business_context["company_profile"],
            "regulatory_requirements": [
                {
                    "regulation_id": "SOX_404",
                    "framework": "sox",
                    "financial_thresholds": {
                        "revenue_threshold": 100000000,
                        "asset_threshold": 500000000
                    }
                },
                {
                    "regulation_id": "Basel_III_Capital",
                    "framework": "basel_iii",
                    "financial_thresholds": {
                        "capital_ratio_minimum": 0.08,
                        "leverage_ratio_minimum": 0.03
                    }
                }
            ]
        }
        
        compliance_results = orchestrator.compliance_governance.assess_financial_compliance(
            **compliance_context
        )
        
        # Validate compliance results
        assert "compliance_score" in compliance_results
        assert "threshold_analysis" in compliance_results
        assert "regulatory_alerts" in compliance_results
        
        # Validate integration quality
        threshold_analysis = compliance_results["threshold_analysis"]
        
        # SOX threshold analysis should reference actual financial metrics
        sox_analysis = next(
            (analysis for analysis in threshold_analysis 
             if analysis["regulation_id"] == "SOX_404"),
            None
        )
        
        if sox_analysis:
            assert "current_revenue" in sox_analysis
            assert "current_assets" in sox_analysis
            # Current values should match financial analysis results
            accuracy_validator = AccuracyValidator()
            assert accuracy_validator.validate_calculation_accuracy(
                sox_analysis["current_revenue"],
                financial_data["income_statement"]["revenue"],
                tolerance=0.01
            )
    
    def test_end_to_end_business_analysis_workflow(self, orchestrator, comprehensive_business_context):
        """Test complete end-to-end business analysis workflow"""
        
        # Comprehensive business analysis request
        analysis_request = {
            "business_context": comprehensive_business_context,
            "analysis_scope": "comprehensive",
            "planning_horizon": 3,
            "include_scenarios": True,
            "compliance_frameworks": ["sox", "gdpr"]
        }
        
        # Execute comprehensive analysis
        comprehensive_results = orchestrator.execute_comprehensive_analysis(
            **analysis_request
        )
        
        # Validate comprehensive results structure
        assert "financial_analysis" in comprehensive_results
        assert "strategic_planning" in comprehensive_results
        assert "operations_analysis" in comprehensive_results
        assert "decision_recommendations" in comprehensive_results
        assert "compliance_assessment" in comprehensive_results
        assert "integrated_insights" in comprehensive_results
        
        # Validate cross-capability insights
        integrated_insights = comprehensive_results["integrated_insights"]
        assert "financial_strategic_alignment" in integrated_insights
        assert "operational_efficiency_impact" in integrated_insights
        assert "compliance_risk_assessment" in integrated_insights
        assert "recommended_actions" in integrated_insights
        
        # Validate data flow consistency
        # Financial metrics should be consistent across all analyses
        financial_revenue = comprehensive_results["financial_analysis"]["revenue"]
        strategic_revenue_base = comprehensive_results["strategic_planning"]["current_revenue"]
        
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            financial_revenue, strategic_revenue_base, tolerance=0.01
        ), "Revenue should be consistent across financial and strategic analysis"
        
        # Validate recommendation coherence
        recommendations = comprehensive_results["decision_recommendations"]
        assert "priority_actions" in recommendations
        assert "resource_allocation" in recommendations
        assert "timeline" in recommendations
        
        # Priority actions should address findings from all capabilities
        priority_actions = recommendations["priority_actions"]
        action_categories = [action["category"] for action in priority_actions]
        
        expected_categories = ["financial", "strategic", "operational", "compliance"]
        coverage = sum(1 for cat in expected_categories if any(cat in ac for ac in action_categories))
        assert coverage >= 3, "Priority actions should cover multiple business areas"
    
    def test_cross_capability_data_validation(self, orchestrator):
        """Test data validation across capabilities"""
        
        # Generate test data with intentional inconsistencies
        inconsistent_data = {
            "financial_statements": {
                "revenue": 100000000,
                "total_assets": 500000000
            },
            "strategic_context": {
                "current_revenue": 95000000,  # Inconsistent with financial
                "market_position": "strong"
            },
            "operational_metrics": {
                "annual_revenue": 102000000,  # Another inconsistency
                "efficiency_score": 0.85
            }
        }
        
        # Validate data consistency
        validation_results = orchestrator.validate_cross_capability_data(
            inconsistent_data
        )
        
        # Should identify inconsistencies
        assert "data_inconsistencies" in validation_results
        assert "validation_errors" in validation_results
        assert "recommended_corrections" in validation_results
        
        inconsistencies = validation_results["data_inconsistencies"]
        assert len(inconsistencies) > 0
        
        # Should identify revenue inconsistencies
        revenue_issues = [
            issue for issue in inconsistencies 
            if "revenue" in issue["field_name"].lower()
        ]
        assert len(revenue_issues) >= 1, "Should identify revenue inconsistencies"
    
    def test_concurrent_capability_execution(self, orchestrator, comprehensive_business_context):
        """Test concurrent execution of multiple capabilities"""
        
        # Prepare data for concurrent analysis
        analysis_data = {
            "financial_data": TestDataGenerator.generate_financial_statements("large", "technology"),
            "market_data": TestDataGenerator.generate_market_data("large", "technology"),
            "operational_data": {
                "processes": [
                    {"id": "proc_001", "cycle_time": 2.5, "throughput": 150, "cost": 15.50}
                ]
            },
            "compliance_data": TestDataGenerator.generate_compliance_scenarios("technology")
        }
        
        # Execute capabilities concurrently
        concurrent_results = orchestrator.execute_concurrent_analysis(
            business_context=comprehensive_business_context,
            analysis_data=analysis_data
        )
        
        # Validate concurrent execution results
        assert "execution_results" in concurrent_results
        assert "execution_metadata" in concurrent_results
        assert "performance_metrics" in concurrent_results
        
        execution_results = concurrent_results["execution_results"]
        assert "financial_analysis" in execution_results
        assert "strategic_planning" in execution_results
        assert "operations_management" in execution_results
        assert "compliance_governance" in execution_results
        
        # Validate performance metrics
        performance_metrics = concurrent_results["performance_metrics"]
        assert "total_execution_time" in performance_metrics
        assert "individual_execution_times" in performance_metrics
        assert "concurrency_efficiency" in performance_metrics
        
        # Concurrent execution should be more efficient than sequential
        total_time = performance_metrics["total_execution_time"]
        individual_times = performance_metrics["individual_execution_times"]
        sequential_time = sum(individual_times.values())
        
        concurrency_efficiency = performance_metrics["concurrency_efficiency"]
        expected_efficiency = 1 - (total_time / sequential_time)
        
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            concurrency_efficiency, expected_efficiency, tolerance=0.1
        )
    
    def test_workflow_orchestration(self, orchestrator, comprehensive_business_context):
        """Test complex workflow orchestration"""
        
        # Define complex workflow
        workflow_definition = {
            "workflow_id": "comprehensive_business_review",
            "steps": [
                {
                    "step_id": "financial_baseline",
                    "capability": "financial_analysis",
                    "dependencies": [],
                    "outputs": ["financial_metrics", "trend_analysis"]
                },
                {
                    "step_id": "strategic_assessment",
                    "capability": "strategic_planning", 
                    "dependencies": ["financial_baseline"],
                    "inputs": ["financial_metrics"],
                    "outputs": ["strategic_recommendations", "market_analysis"]
                },
                {
                    "step_id": "operational_optimization",
                    "capability": "operations_management",
                    "dependencies": ["financial_baseline"],
                    "inputs": ["financial_metrics"],
                    "outputs": ["optimization_scenarios", "efficiency_metrics"]
                },
                {
                    "step_id": "decision_analysis",
                    "capability": "decision_support",
                    "dependencies": ["strategic_assessment", "operational_optimization"],
                    "inputs": ["strategic_recommendations", "optimization_scenarios"],
                    "outputs": ["decision_recommendations"]
                },
                {
                    "step_id": "compliance_validation",
                    "capability": "compliance_governance",
                    "dependencies": ["financial_baseline", "decision_analysis"],
                    "inputs": ["financial_metrics", "decision_recommendations"],
                    "outputs": ["compliance_assessment"]
                }
            ]
        }
        
        # Execute workflow
        workflow_results = orchestrator.execute_workflow(
            workflow_definition=workflow_definition,
            business_context=comprehensive_business_context,
            input_data={
                "financial_statements": TestDataGenerator.generate_financial_statements("large", "technology"),
                "market_conditions": TestDataGenerator.generate_market_data("large", "technology")
            }
        )
        
        # Validate workflow execution
        assert "workflow_execution_log" in workflow_results
        assert "step_results" in workflow_results
        assert "final_outputs" in workflow_results
        assert "execution_metadata" in workflow_results
        
        # Validate step execution order
        execution_log = workflow_results["workflow_execution_log"]
        step_order = [entry["step_id"] for entry in execution_log]
        
        # Financial baseline should be first
        assert step_order[0] == "financial_baseline"
        
        # Decision analysis should come after its dependencies
        decision_index = step_order.index("decision_analysis")
        strategic_index = step_order.index("strategic_assessment")
        operational_index = step_order.index("operational_optimization")
        
        assert decision_index > strategic_index
        assert decision_index > operational_index
        
        # Validate data propagation
        step_results = workflow_results["step_results"]
        
        # Financial metrics should be available to dependent steps
        financial_outputs = step_results["financial_baseline"]["outputs"]
        strategic_inputs = step_results["strategic_assessment"]["inputs"]
        
        assert "financial_metrics" in financial_outputs
        assert "financial_metrics" in strategic_inputs
    
    @pytest.mark.performance
    def test_integration_performance(self, orchestrator, comprehensive_business_context):
        """Test performance of integrated operations"""
        import time
        
        # Measure performance of comprehensive analysis
        start_time = time.time()
        
        analysis_request = {
            "business_context": comprehensive_business_context,
            "analysis_scope": "comprehensive",
            "planning_horizon": 3
        }
        
        results = orchestrator.execute_comprehensive_analysis(**analysis_request)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Should complete within performance threshold
        threshold = TEST_CONFIG["performance_thresholds"]["comprehensive_analysis_time"]
        assert total_time < threshold, f"Comprehensive analysis too slow: {total_time:.2f}s"
        
        # Validate results completeness despite performance constraints
        assert len(results) >= 5  # Should have results from all capabilities
    
    def test_error_handling_integration(self, orchestrator):
        """Test error handling across integrated capabilities"""
        
        # Test with invalid business context
        invalid_context = {
            "company_profile": {
                "name": "",  # Invalid empty name
                "industry": "invalid_industry"
            }
        }
        
        with pytest.raises(ValueError, match="Invalid business context"):
            orchestrator.execute_comprehensive_analysis(
                business_context=invalid_context,
                analysis_scope="comprehensive"
            )
        
        # Test with capability failure
        with patch.object(orchestrator.financial_analysis, 'analyze_financial_health') as mock_financial:
            mock_financial.side_effect = Exception("Financial analysis failed")
            
            # Should handle graceful degradation
            results = orchestrator.execute_comprehensive_analysis(
                business_context=self.sample_business_context,
                analysis_scope="partial",
                error_handling="graceful"
            )
            
            assert "execution_errors" in results
            assert "partial_results" in results
            
            # Should have results from other capabilities
            assert "strategic_planning" in results["partial_results"]
    
    def test_data_consistency_validation(self, orchestrator):
        """Test comprehensive data consistency validation"""
        
        # Test data with multiple consistency issues
        test_data = {
            "financial_data": {
                "revenue": 100000000,
                "net_income": 15000000,
                "total_assets": 500000000,
                "total_equity": 200000000
            },
            "strategic_data": {
                "current_revenue": 98000000,  # Inconsistent
                "target_revenue": 120000000,
                "growth_rate": 0.18  # Inconsistent with financial data
            },
            "operational_data": {
                "annual_output_value": 105000000,  # Another inconsistency
                "efficiency_metrics": {
                    "asset_turnover": 0.25  # Should be revenue/assets = 0.20
                }
            }
        }
        
        # Perform comprehensive validation
        validation_results = orchestrator.perform_comprehensive_data_validation(
            test_data
        )
        
        # Should identify multiple consistency issues
        assert "field_inconsistencies" in validation_results
        assert "calculation_errors" in validation_results
        assert "data_quality_score" in validation_results
        assert "recommended_corrections" in validation_results
        
        inconsistencies = validation_results["field_inconsistencies"]
        assert len(inconsistencies) >= 2, "Should identify multiple inconsistencies"
        
        # Should provide specific correction recommendations
        corrections = validation_results["recommended_corrections"]
        assert len(corrections) > 0
        
        # Data quality score should reflect issues
        quality_score = validation_results["data_quality_score"]
        assert 0 <= quality_score <= 1.0
        assert quality_score < 0.9, "Quality score should reflect data issues"
