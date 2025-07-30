"""
Unit Tests for Decision Support Capability

Tests for decision support methods including:
- Decision analysis
- Scenario modeling
- Risk assessment
- Recommendation generation
- Multi-criteria decision making
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch
from typing import Dict, Any, List
from decimal import Decimal

from modules.business_operations.decision_support import (
    DecisionSupportCapability,
    DecisionCriteria,
    DecisionAlternative,
    DecisionMatrix,
    RecommendationEngine,
    ScenarioModel
)
from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    AccuracyValidator,
    TEST_CONFIG
)

@pytest.mark.unit
class TestDecisionSupportUnit(BusinessOperationsTestFramework):
    """Unit tests for Decision Support Capability"""
    
    @pytest.fixture
    def decision_capability(self):
        """Create decision support capability instance"""
        config = {
            "decision_method": "analytical_hierarchy_process",
            "risk_tolerance": "moderate",
            "confidence_threshold": 0.75
        }
        return DecisionSupportCapability(config)
    
    @pytest.fixture
    def sample_decision_problem(self):
        """Sample decision problem for testing"""
        return {
            "problem_statement": "Select optimal market expansion strategy",
            "decision_criteria": [
                {
                    "name": "financial_return",
                    "weight": 0.35,
                    "type": "benefit",
                    "scale": "ratio",
                    "target_value": 0.20  # 20% ROI
                },
                {
                    "name": "market_risk",
                    "weight": 0.25,
                    "type": "cost",
                    "scale": "ratio",
                    "target_value": 0.15  # 15% risk tolerance
                },
                {
                    "name": "implementation_ease",
                    "weight": 0.20,
                    "type": "benefit", 
                    "scale": "ordinal",
                    "target_value": 8  # Scale 1-10
                },
                {
                    "name": "strategic_alignment",
                    "weight": 0.20,
                    "type": "benefit",
                    "scale": "ordinal",
                    "target_value": 9
                }
            ],
            "alternatives": [
                {
                    "id": "alt_001",
                    "name": "Organic Growth",
                    "description": "Expand through internal resources and capabilities",
                    "attributes": {
                        "financial_return": 0.15,
                        "market_risk": 0.10,
                        "implementation_ease": 9,
                        "strategic_alignment": 8
                    }
                },
                {
                    "id": "alt_002", 
                    "name": "Strategic Partnership",
                    "description": "Partner with local companies for market entry",
                    "attributes": {
                        "financial_return": 0.18,
                        "market_risk": 0.12,
                        "implementation_ease": 7,
                        "strategic_alignment": 9
                    }
                },
                {
                    "id": "alt_003",
                    "name": "Acquisition",
                    "description": "Acquire existing player in target market", 
                    "attributes": {
                        "financial_return": 0.25,
                        "market_risk": 0.20,
                        "implementation_ease": 5,
                        "strategic_alignment": 7
                    }
                }
            ]
        }
    
    @pytest.fixture
    def sample_risk_factors(self):
        """Sample risk factors for decision analysis"""
        return [
            {
                "factor": "market_volatility",
                "probability": 0.30,
                "impact": 0.60,
                "category": "market"
            },
            {
                "factor": "regulatory_changes",
                "probability": 0.20,
                "impact": 0.70,
                "category": "regulatory"
            },
            {
                "factor": "competitive_response",
                "probability": 0.60,
                "impact": 0.40,
                "category": "competitive"
            },
            {
                "factor": "technology_disruption",
                "probability": 0.40,
                "impact": 0.80,
                "category": "technology"
            }
        ]
    
    def test_decision_matrix_construction(self, decision_capability, sample_decision_problem):
        """Test decision matrix construction and normalization"""
        
        # Build decision matrix
        decision_matrix = decision_capability.build_decision_matrix(
            problem_data=sample_decision_problem
        )
        
        # Validate structure
        assert isinstance(decision_matrix, DecisionMatrix)
        assert decision_matrix.criteria is not None
        assert decision_matrix.alternatives is not None
        assert decision_matrix.normalized_matrix is not None
        assert decision_matrix.weights is not None
        
        # Validate dimensions
        num_criteria = len(sample_decision_problem["decision_criteria"])
        num_alternatives = len(sample_decision_problem["alternatives"])
        
        matrix_shape = decision_matrix.normalized_matrix.shape
        assert matrix_shape == (num_alternatives, num_criteria)
        
        # Validate weight normalization
        weights = decision_matrix.weights
        assert len(weights) == num_criteria
        assert abs(sum(weights) - 1.0) < 0.001, "Weights should sum to 1.0"
        
        # Validate matrix normalization for benefit criteria
        normalized = decision_matrix.normalized_matrix
        for j, criterion in enumerate(sample_decision_problem["decision_criteria"]):
            if criterion["type"] == "benefit":
                # For benefit criteria, higher values should be normalized higher
                column_values = normalized[:, j]
                assert max(column_values) <= 1.0, "Normalized values should not exceed 1.0"
                assert min(column_values) >= 0.0, "Normalized values should not be negative"
    
    def test_ahp_analysis(self, decision_capability, sample_decision_problem):
        """Test Analytical Hierarchy Process (AHP) analysis"""
        
        # Perform AHP analysis
        ahp_result = decision_capability.perform_ahp_analysis(
            decision_problem=sample_decision_problem
        )
        
        # Validate structure
        assert "priority_scores" in ahp_result
        assert "ranking" in ahp_result
        assert "consistency_ratio" in ahp_result
        assert "sensitivity_analysis" in ahp_result
        
        # Validate priority scores
        priority_scores = ahp_result["priority_scores"]
        assert len(priority_scores) == len(sample_decision_problem["alternatives"])
        
        # Scores should sum to 1.0
        total_score = sum(score["priority"] for score in priority_scores)
        assert abs(total_score - 1.0) < 0.001, "Priority scores should sum to 1.0"
        
        # Validate ranking
        ranking = ahp_result["ranking"]
        assert len(ranking) == len(sample_decision_problem["alternatives"])
        assert ranking[0]["rank"] == 1, "First alternative should have rank 1"
        
        # Rankings should be in descending order of priority
        for i in range(len(ranking) - 1):
            assert ranking[i]["priority"] >= ranking[i+1]["priority"]
        
        # Validate consistency ratio
        consistency_ratio = ahp_result["consistency_ratio"]
        assert 0 <= consistency_ratio <= 1.0
        assert consistency_ratio < 0.10, "Consistency ratio should be < 0.10 for valid results"
        
        # Validate sensitivity analysis
        sensitivity = ahp_result["sensitivity_analysis"]
        assert "weight_sensitivity" in sensitivity
        assert "threshold_analysis" in sensitivity
    
    def test_multi_criteria_scoring(self, decision_capability, sample_decision_problem):
        """Test multi-criteria decision analysis scoring"""
        
        # Perform MCDA scoring
        mcda_result = decision_capability.perform_mcda_scoring(
            decision_problem=sample_decision_problem,
            method="weighted_sum"
        )
        
        # Validate structure
        assert "scores" in mcda_result
        assert "normalized_scores" in mcda_result
        assert "ranking" in mcda_result
        
        # Validate score calculations
        scores = mcda_result["scores"]
        
        # Manual calculation for first alternative (Organic Growth)
        organic_growth = sample_decision_problem["alternatives"][0]
        expected_score = 0
        
        for i, criterion in enumerate(sample_decision_problem["decision_criteria"]):
            weight = criterion["weight"]
            raw_value = organic_growth["attributes"][criterion["name"]]
            
            if criterion["type"] == "benefit":
                if criterion["scale"] == "ratio":
                    # Normalize ratio values
                    max_val = max(alt["attributes"][criterion["name"]] 
                                for alt in sample_decision_problem["alternatives"])
                    normalized_value = raw_value / max_val
                else:  # ordinal
                    normalized_value = raw_value / 10.0  # Assuming 1-10 scale
            else:  # cost
                # For cost criteria, invert the value
                max_val = max(alt["attributes"][criterion["name"]] 
                            for alt in sample_decision_problem["alternatives"])
                normalized_value = 1 - (raw_value / max_val)
            
            expected_score += weight * normalized_value
        
        actual_score = next(s["score"] for s in scores if s["alternative_id"] == "alt_001")
        
        # Validate score accuracy
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            actual_score, expected_score, tolerance=0.05
        )
    
    def test_scenario_modeling(self, decision_capability, sample_decision_problem):
        """Test scenario modeling and analysis"""
        
        # Define scenarios
        scenarios = [
            {
                "name": "optimistic",
                "probability": 0.25,
                "adjustments": {
                    "financial_return": 1.20,  # 20% better returns
                    "market_risk": 0.80,       # 20% lower risk
                    "implementation_ease": 1.10
                }
            },
            {
                "name": "pessimistic",
                "probability": 0.25,
                "adjustments": {
                    "financial_return": 0.75,  # 25% lower returns
                    "market_risk": 1.50,       # 50% higher risk
                    "implementation_ease": 0.85
                }
            },
            {
                "name": "most_likely",
                "probability": 0.50,
                "adjustments": {
                    "financial_return": 1.00,  # No change
                    "market_risk": 1.00,
                    "implementation_ease": 1.00
                }
            }
        ]
        
        # Perform scenario analysis
        scenario_result = decision_capability.analyze_scenarios(
            base_decision=sample_decision_problem,
            scenarios=scenarios
        )
        
        # Validate structure
        assert "scenario_results" in scenario_result
        assert "expected_values" in scenario_result
        assert "risk_analysis" in scenario_result
        assert "robustness_analysis" in scenario_result
        
        # Validate scenario results
        scenario_results = scenario_result["scenario_results"]
        assert len(scenario_results) == 3
        
        for scenario in scenario_results:
            assert "scenario_name" in scenario
            assert "ranking" in scenario
            assert "scores" in scenario
        
        # Validate expected value calculations
        expected_values = scenario_result["expected_values"]
        assert len(expected_values) == len(sample_decision_problem["alternatives"])
        
        # Calculate expected value for first alternative manually
        alt_id = "alt_001"
        expected_ev = 0
        
        for scenario in scenario_results:
            scenario_prob = next(s["probability"] for s in scenarios 
                               if s["name"] == scenario["scenario_name"])
            scenario_score = next(s["score"] for s in scenario["scores"] 
                                if s["alternative_id"] == alt_id)
            expected_ev += scenario_prob * scenario_score
        
        actual_ev = next(ev["expected_value"] for ev in expected_values 
                        if ev["alternative_id"] == alt_id)
        
        # Validate expected value accuracy
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            actual_ev, expected_ev, tolerance=0.02
        )
    
    def test_risk_assessment(self, decision_capability, sample_risk_factors):
        """Test risk assessment for decision alternatives"""
        
        # Alternative-specific risk profiles
        alternative_risks = {
            "alt_001": {  # Organic Growth
                "market_volatility": 0.8,      # Lower exposure
                "regulatory_changes": 0.6,     # Moderate exposure
                "competitive_response": 0.4,   # Lower exposure
                "technology_disruption": 0.7   # Moderate exposure
            },
            "alt_002": {  # Strategic Partnership
                "market_volatility": 0.6,
                "regulatory_changes": 0.8,
                "competitive_response": 0.6,
                "technology_disruption": 0.5
            },
            "alt_003": {  # Acquisition
                "market_volatility": 1.0,      # Full exposure
                "regulatory_changes": 1.0,     # High exposure
                "competitive_response": 0.8,   # High exposure
                "technology_disruption": 0.9   # High exposure
            }
        }
        
        # Perform risk assessment
        risk_assessment = decision_capability.assess_decision_risks(
            risk_factors=sample_risk_factors,
            alternative_risks=alternative_risks
        )
        
        # Validate structure
        assert "risk_scores" in risk_assessment
        assert "risk_matrix" in risk_assessment
        assert "mitigation_strategies" in risk_assessment
        
        # Validate risk score calculations
        risk_scores = risk_assessment["risk_scores"]
        assert len(risk_scores) == 3
        
        # Calculate expected risk score for organic growth
        expected_risk = 0
        for risk_factor in sample_risk_factors:
            factor_name = risk_factor["factor"]
            base_risk = risk_factor["probability"] * risk_factor["impact"]
            exposure = alternative_risks["alt_001"][factor_name]
            expected_risk += base_risk * exposure
        
        actual_risk = next(r["risk_score"] for r in risk_scores 
                          if r["alternative_id"] == "alt_001")
        
        # Validate risk calculation accuracy
        accuracy_validator = AccuracyValidator()
        assert accuracy_validator.validate_calculation_accuracy(
            actual_risk, expected_risk, tolerance=0.05
        )
        
        # Acquisition should have highest risk score
        acquisition_risk = next(r["risk_score"] for r in risk_scores 
                              if r["alternative_id"] == "alt_003")
        organic_risk = next(r["risk_score"] for r in risk_scores 
                           if r["alternative_id"] == "alt_001")
        
        assert acquisition_risk > organic_risk, "Acquisition should have higher risk than organic growth"
    
    def test_recommendation_engine(self, decision_capability, sample_decision_problem):
        """Test recommendation generation"""
        
        # Additional context for recommendations
        decision_context = {
            "company_profile": {
                "risk_tolerance": "moderate",
                "financial_position": "strong",
                "strategic_priorities": ["growth", "market_leadership"],
                "constraints": {
                    "budget_limit": 10000000,
                    "time_horizon": 24  # months
                }
            },
            "market_conditions": {
                "market_growth": 0.15,
                "competitive_intensity": "high",
                "regulatory_stability": "stable"
            }
        }
        
        # Generate recommendations
        recommendations = decision_capability.generate_recommendations(
            decision_problem=sample_decision_problem,
            context=decision_context
        )
        
        # Validate structure
        assert "primary_recommendation" in recommendations
        assert "alternative_recommendations" in recommendations
        assert "implementation_plan" in recommendations
        assert "risk_mitigation" in recommendations
        assert "success_factors" in recommendations
        
        # Validate primary recommendation
        primary = recommendations["primary_recommendation"]
        assert "alternative_id" in primary
        assert "rationale" in primary
        assert "confidence_score" in primary
        assert "expected_outcome" in primary
        
        # Confidence score should be reasonable
        assert 0 <= primary["confidence_score"] <= 1.0
        
        # Should have alternative recommendations
        alternatives = recommendations["alternative_recommendations"]
        assert len(alternatives) >= 1
        
        # Validate implementation plan
        impl_plan = recommendations["implementation_plan"]
        assert "phases" in impl_plan
        assert "timeline" in impl_plan
        assert "resource_requirements" in impl_plan
        assert "success_metrics" in impl_plan
    
    def test_sensitivity_analysis(self, decision_capability, sample_decision_problem):
        """Test sensitivity analysis for decision criteria"""
        
        # Perform sensitivity analysis
        sensitivity_result = decision_capability.perform_sensitivity_analysis(
            decision_problem=sample_decision_problem,
            sensitivity_range=0.20  # ±20% weight variation
        )
        
        # Validate structure
        assert "weight_sensitivity" in sensitivity_result
        assert "threshold_analysis" in sensitivity_result
        assert "stability_metrics" in sensitivity_result
        
        # Validate weight sensitivity
        weight_sensitivity = sensitivity_result["weight_sensitivity"]
        
        for criterion in sample_decision_problem["decision_criteria"]:
            criterion_name = criterion["name"]
            assert criterion_name in weight_sensitivity
            
            sensitivity_data = weight_sensitivity[criterion_name]
            assert "weight_range" in sensitivity_data
            assert "ranking_changes" in sensitivity_data
            assert "score_variations" in sensitivity_data
        
        # Validate threshold analysis
        threshold_analysis = sensitivity_result["threshold_analysis"]
        assert "switching_points" in threshold_analysis
        assert "critical_criteria" in threshold_analysis
        
        # Validate stability metrics
        stability = sensitivity_result["stability_metrics"]
        assert "rank_stability" in stability
        assert "score_volatility" in stability
        assert 0 <= stability["rank_stability"] <= 1.0
    
    def test_monte_carlo_simulation(self, decision_capability, sample_decision_problem):
        """Test Monte Carlo simulation for uncertainty analysis"""
        
        # Define uncertainty parameters
        uncertainty_params = {
            "financial_return": {
                "distribution": "normal",
                "mean_factor": 1.0,
                "std_factor": 0.15
            },
            "market_risk": {
                "distribution": "lognormal",
                "mean_factor": 1.0,
                "std_factor": 0.20
            },
            "implementation_ease": {
                "distribution": "triangular",
                "min_factor": 0.8,
                "mode_factor": 1.0,
                "max_factor": 1.2
            }
        }
        
        # Run Monte Carlo simulation
        mc_result = decision_capability.run_monte_carlo_simulation(
            decision_problem=sample_decision_problem,
            uncertainty_params=uncertainty_params,
            num_simulations=1000
        )
        
        # Validate structure
        assert "simulation_results" in mc_result
        assert "confidence_intervals" in mc_result
        assert "probability_distributions" in mc_result
        assert "risk_metrics" in mc_result
        
        # Validate simulation results
        sim_results = mc_result["simulation_results"]
        assert len(sim_results) == 1000
        
        # Each simulation should have scores for all alternatives
        for simulation in sim_results[:5]:  # Check first 5
            assert len(simulation["scores"]) == len(sample_decision_problem["alternatives"])
        
        # Validate confidence intervals
        confidence_intervals = mc_result["confidence_intervals"]
        for alt in sample_decision_problem["alternatives"]:
            alt_id = alt["id"]
            assert alt_id in confidence_intervals
            
            ci = confidence_intervals[alt_id]
            assert "mean" in ci
            assert "std" in ci
            assert "ci_95_lower" in ci
            assert "ci_95_upper" in ci
            
            # Confidence interval should be properly ordered
            assert ci["ci_95_lower"] <= ci["mean"] <= ci["ci_95_upper"]
    
    def test_group_decision_support(self, decision_capability, sample_decision_problem):
        """Test group decision making support"""
        
        # Stakeholder preferences
        stakeholder_preferences = [
            {
                "stakeholder": "ceo",
                "weight": 0.4,
                "criteria_weights": {
                    "financial_return": 0.5,
                    "market_risk": 0.2,
                    "implementation_ease": 0.1,
                    "strategic_alignment": 0.2
                }
            },
            {
                "stakeholder": "cfo",
                "weight": 0.3,
                "criteria_weights": {
                    "financial_return": 0.4,
                    "market_risk": 0.4,
                    "implementation_ease": 0.1,
                    "strategic_alignment": 0.1
                }
            },
            {
                "stakeholder": "cmo",
                "weight": 0.3,
                "criteria_weights": {
                    "financial_return": 0.2,
                    "market_risk": 0.1,
                    "implementation_ease": 0.3,
                    "strategic_alignment": 0.4
                }
            }
        ]
        
        # Perform group decision analysis
        group_result = decision_capability.analyze_group_decision(
            decision_problem=sample_decision_problem,
            stakeholder_preferences=stakeholder_preferences
        )
        
        # Validate structure
        assert "individual_rankings" in group_result
        assert "aggregated_ranking" in group_result
        assert "consensus_metrics" in group_result
        assert "disagreement_analysis" in group_result
        
        # Validate individual rankings
        individual_rankings = group_result["individual_rankings"]
        assert len(individual_rankings) == 3
        
        for ranking in individual_rankings:
            assert "stakeholder" in ranking
            assert "ranking" in ranking
            assert len(ranking["ranking"]) == len(sample_decision_problem["alternatives"])
        
        # Validate aggregated ranking
        aggregated = group_result["aggregated_ranking"]
        assert len(aggregated) == len(sample_decision_problem["alternatives"])
        
        # Validate consensus metrics
        consensus = group_result["consensus_metrics"]
        assert "kendall_tau" in consensus
        assert "rank_correlation" in consensus
        assert "agreement_level" in consensus
        assert 0 <= consensus["agreement_level"] <= 1.0
    
    @pytest.mark.performance
    def test_decision_analysis_performance(self, decision_capability, sample_decision_problem):
        """Test performance of decision analysis"""
        import time
        
        # Measure AHP analysis performance
        start_time = time.time()
        
        result = decision_capability.perform_ahp_analysis(
            decision_problem=sample_decision_problem
        )
        
        end_time = time.time()
        analysis_time = end_time - start_time
        
        # Should complete within performance threshold
        threshold = TEST_CONFIG["performance_thresholds"]["decision_analysis_time"]
        assert analysis_time < threshold, f"Decision analysis too slow: {analysis_time:.2f}s"
    
    def test_error_handling(self, decision_capability):
        """Test error handling for invalid inputs"""
        
        # Test with missing criteria weights
        invalid_problem = {
            "decision_criteria": [
                {"name": "criterion1"}  # Missing weight
            ],
            "alternatives": [
                {"id": "alt1", "attributes": {"criterion1": 1.0}}
            ]
        }
        
        with pytest.raises(ValueError, match="Missing criterion weight"):
            decision_capability.build_decision_matrix(invalid_problem)
        
        # Test with inconsistent alternatives
        inconsistent_problem = {
            "decision_criteria": [
                {"name": "criterion1", "weight": 1.0}
            ],
            "alternatives": [
                {"id": "alt1", "attributes": {"criterion1": 1.0}},
                {"id": "alt2", "attributes": {"different_criterion": 2.0}}  # Missing criterion1
            ]
        }
        
        with pytest.raises(ValueError, match="Inconsistent alternative attributes"):
            decision_capability.build_decision_matrix(inconsistent_problem)
        
        # Test with invalid weights (don't sum to 1)
        invalid_weights = {
            "decision_criteria": [
                {"name": "criterion1", "weight": 0.3},
                {"name": "criterion2", "weight": 0.8}  # Sum > 1
            ],
            "alternatives": [
                {"id": "alt1", "attributes": {"criterion1": 1.0, "criterion2": 2.0}}
            ]
        }
        
        with pytest.raises(ValueError, match="Criteria weights must sum to 1.0"):
            decision_capability.validate_decision_problem(invalid_weights)
