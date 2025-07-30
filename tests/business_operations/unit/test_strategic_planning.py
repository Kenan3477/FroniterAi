"""
Unit Tests for Strategic Planning Capability

Tests for strategic planning methods including:
- SWOT analysis
- Market analysis
- Competitive analysis
- Strategic objective setting
- Action plan generation
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch
from typing import Dict, Any, List

from modules.business_operations.strategic_planning import (
    StrategicPlanningCapability,
    SWOTAnalysis,
    MarketAnalysis,
    CompetitiveAnalysis,
    StrategicObjective,
    ActionPlan
)
from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    TEST_CONFIG
)

@pytest.mark.unit
class TestStrategicPlanningUnit(BusinessOperationsTestFramework):
    """Unit tests for Strategic Planning Capability"""
    
    @pytest.fixture
    def strategic_capability(self):
        """Create strategic planning capability instance"""
        config = {
            "market_data_source": "test_source",
            "competitive_intelligence": "enabled",
            "planning_horizon": 3
        }
        return StrategicPlanningCapability(config)
    
    @pytest.fixture
    def sample_company_profile(self):
        """Sample company profile for testing"""
        return {
            "name": "Test Strategic Corp",
            "industry": "technology",
            "size": "medium",
            "geography": ["north_america", "europe"],
            "business_model": "SaaS platform",
            "key_products_services": ["Software platform", "Consulting services"],
            "target_customers": ["Enterprise", "SMB"],
            "current_revenue": 50000000,
            "employee_count": 250,
            "founded_year": 2015
        }
    
    @pytest.fixture
    def sample_market_data(self):
        """Sample market data for testing"""
        return TestDataGenerator.generate_market_data(
            company_size="medium",
            industry="technology"
        )
    
    def test_swot_analysis_generation(self, strategic_capability, sample_company_profile):
        """Test SWOT analysis generation"""
        
        # Additional context for SWOT
        context = {
            "financial_performance": {
                "revenue_growth": 0.25,
                "profitability": 0.15,
                "cash_position": "strong"
            },
            "market_position": {
                "market_share": 0.08,
                "brand_recognition": "moderate",
                "customer_satisfaction": 0.85
            },
            "internal_capabilities": {
                "technology_stack": "modern",
                "team_expertise": "high",
                "operational_efficiency": "good"
            }
        }
        
        # Generate SWOT analysis
        swot = strategic_capability.generate_swot_analysis(
            company_profile=sample_company_profile,
            context=context
        )
        
        # Validate structure
        assert isinstance(swot, SWOTAnalysis)
        assert len(swot.strengths) > 0
        assert len(swot.weaknesses) > 0
        assert len(swot.opportunities) > 0
        assert len(swot.threats) > 0
        
        # Validate content quality
        strengths = [s.lower() for s in swot.strengths]
        assert any("growth" in s or "revenue" in s for s in strengths)
        
        # Check for industry-specific insights
        tech_keywords = ["technology", "innovation", "digital", "software"]
        swot_text = " ".join(swot.strengths + swot.opportunities).lower()
        assert any(keyword in swot_text for keyword in tech_keywords)
    
    def test_market_analysis(self, strategic_capability, sample_company_profile):
        """Test market analysis functionality"""
        
        # Mock market data
        mock_market_data = {
            "market_size": {
                "total_addressable_market": 50000000000,
                "serviceable_addressable_market": 5000000000,
                "serviceable_obtainable_market": 500000000
            },
            "growth_trends": {
                "historical_cagr": 0.15,
                "projected_cagr": 0.12,
                "growth_drivers": ["digital transformation", "AI adoption"]
            },
            "market_segments": [
                {"segment": "enterprise", "size": 0.6, "growth": 0.10},
                {"segment": "mid_market", "size": 0.3, "growth": 0.15},
                {"segment": "small_business", "size": 0.1, "growth": 0.20}
            ]
        }
        
        with patch.object(strategic_capability, 'get_market_data', return_value=mock_market_data):
            # Perform market analysis
            market_analysis = strategic_capability.analyze_market(
                industry=sample_company_profile["industry"],
                geography=sample_company_profile["geography"]
            )
        
        # Validate structure
        assert isinstance(market_analysis, MarketAnalysis)
        assert market_analysis.total_market_size > 0
        assert market_analysis.growth_rate > 0
        assert len(market_analysis.key_trends) > 0
        assert len(market_analysis.market_segments) > 0
        
        # Validate calculations
        assert market_analysis.total_market_size == 50000000000
        assert market_analysis.growth_rate == 0.12
        
        # Validate segment analysis
        enterprise_segment = next(
            (seg for seg in market_analysis.market_segments if seg["name"] == "enterprise"),
            None
        )
        assert enterprise_segment is not None
        assert enterprise_segment["size"] == 0.6
    
    def test_competitive_analysis(self, strategic_capability, sample_company_profile):
        """Test competitive analysis"""
        
        # Sample competitors
        competitors = [
            {
                "name": "Competitor A",
                "market_share": 0.15,
                "revenue": 100000000,
                "strengths": ["brand recognition", "enterprise sales"],
                "weaknesses": ["legacy technology", "high prices"]
            },
            {
                "name": "Competitor B", 
                "market_share": 0.12,
                "revenue": 80000000,
                "strengths": ["innovation", "user experience"],
                "weaknesses": ["limited market presence", "small team"]
            }
        ]
        
        # Perform competitive analysis
        competitive_analysis = strategic_capability.analyze_competition(
            company_profile=sample_company_profile,
            competitors=competitors
        )
        
        # Validate structure
        assert isinstance(competitive_analysis, CompetitiveAnalysis)
        assert len(competitive_analysis.competitor_profiles) == 2
        assert competitive_analysis.market_positioning is not None
        assert len(competitive_analysis.competitive_advantages) > 0
        assert len(competitive_analysis.competitive_threats) > 0
        
        # Validate market positioning
        positioning = competitive_analysis.market_positioning
        assert "revenue_ranking" in positioning
        assert "market_share_ranking" in positioning
        
        # Validate competitive insights
        advantages = competitive_analysis.competitive_advantages
        assert any("agility" in adv.lower() or "technology" in adv.lower() for adv in advantages)
    
    def test_strategic_objectives_setting(self, strategic_capability, sample_company_profile):
        """Test strategic objectives setting"""
        
        # Current state
        current_state = {
            "revenue": 50000000,
            "market_share": 0.08,
            "geographic_presence": ["north_america", "europe"],
            "product_portfolio": ["core_platform", "analytics_module"]
        }
        
        # Desired outcomes
        desired_outcomes = [
            "increase_revenue_100M",
            "expand_asia_pacific",
            "develop_ai_capabilities",
            "improve_customer_retention"
        ]
        
        # Generate strategic objectives
        objectives = strategic_capability.set_strategic_objectives(
            current_state=current_state,
            desired_outcomes=desired_outcomes,
            time_horizon=3
        )
        
        # Validate structure
        assert len(objectives) > 0
        assert all(isinstance(obj, StrategicObjective) for obj in objectives)
        
        # Validate SMART criteria
        for objective in objectives:
            assert objective.description is not None
            assert objective.target_value is not None
            assert objective.timeline is not None
            assert objective.success_metrics is not None
            assert objective.priority in ["high", "medium", "low"]
        
        # Validate content
        objective_texts = [obj.description.lower() for obj in objectives]
        assert any("revenue" in text for text in objective_texts)
        assert any("market" in text or "expansion" in text for text in objective_texts)
    
    def test_action_plan_generation(self, strategic_capability):
        """Test action plan generation"""
        
        # Sample strategic objectives
        objectives = [
            StrategicObjective(
                id="obj_1",
                description="Increase annual revenue to $100M",
                target_value=100000000,
                timeline=3,
                success_metrics=["revenue", "customer_count"],
                priority="high"
            ),
            StrategicObjective(
                id="obj_2",
                description="Expand to Asia-Pacific market",
                target_value=0.05,  # 5% market share
                timeline=2,
                success_metrics=["market_presence", "local_partnerships"],
                priority="medium"
            )
        ]
        
        # Generate action plan
        action_plan = strategic_capability.generate_action_plan(
            objectives=objectives,
            resources_available={
                "budget": 10000000,
                "team_size": 250,
                "technology_budget": 2000000
            }
        )
        
        # Validate structure
        assert isinstance(action_plan, ActionPlan)
        assert len(action_plan.initiatives) > 0
        assert len(action_plan.milestones) > 0
        assert action_plan.resource_allocation is not None
        assert action_plan.timeline is not None
        
        # Validate initiatives
        for initiative in action_plan.initiatives:
            assert initiative["objective_id"] in ["obj_1", "obj_2"]
            assert "actions" in initiative
            assert "owner" in initiative
            assert "timeline" in initiative
            assert "budget" in initiative
        
        # Validate resource allocation
        resource_allocation = action_plan.resource_allocation
        total_budget = sum(initiative["budget"] for initiative in action_plan.initiatives)
        assert total_budget <= 10000000  # Within available budget
    
    def test_scenario_planning(self, strategic_capability, sample_company_profile):
        """Test scenario planning functionality"""
        
        # Define scenarios
        scenarios = [
            {
                "name": "optimistic",
                "assumptions": {
                    "market_growth": 0.20,
                    "competition_intensity": "low",
                    "economic_conditions": "favorable"
                }
            },
            {
                "name": "pessimistic",
                "assumptions": {
                    "market_growth": 0.05,
                    "competition_intensity": "high",
                    "economic_conditions": "recession"
                }
            },
            {
                "name": "most_likely",
                "assumptions": {
                    "market_growth": 0.12,
                    "competition_intensity": "moderate",
                    "economic_conditions": "stable"
                }
            }
        ]
        
        # Perform scenario planning
        scenario_analysis = strategic_capability.analyze_scenarios(
            base_case=sample_company_profile,
            scenarios=scenarios,
            planning_horizon=5
        )
        
        # Validate structure
        assert len(scenario_analysis) == 3
        assert all(scenario["name"] in ["optimistic", "pessimistic", "most_likely"] 
                  for scenario in scenario_analysis)
        
        # Validate projections
        for scenario in scenario_analysis:
            assert "projections" in scenario
            assert "revenue_forecast" in scenario["projections"]
            assert "market_share_forecast" in scenario["projections"]
            assert "risk_factors" in scenario
        
        # Validate logical relationships
        optimistic = next(s for s in scenario_analysis if s["name"] == "optimistic")
        pessimistic = next(s for s in scenario_analysis if s["name"] == "pessimistic")
        
        opt_revenue = optimistic["projections"]["revenue_forecast"][-1]  # Final year
        pess_revenue = pessimistic["projections"]["revenue_forecast"][-1]
        
        assert opt_revenue > pess_revenue, "Optimistic scenario should have higher revenue"
    
    def test_risk_assessment(self, strategic_capability):
        """Test strategic risk assessment"""
        
        # Strategic context
        strategic_context = {
            "objectives": ["revenue_growth", "market_expansion", "product_innovation"],
            "current_position": {
                "market_share": 0.08,
                "competitive_position": "strong",
                "financial_health": "good"
            },
            "external_factors": {
                "market_volatility": "moderate",
                "regulatory_changes": "low",
                "economic_outlook": "stable"
            }
        }
        
        # Assess risks
        risk_assessment = strategic_capability.assess_strategic_risks(
            strategic_context=strategic_context
        )
        
        # Validate structure
        assert "strategic_risks" in risk_assessment
        assert "risk_matrix" in risk_assessment
        assert "mitigation_strategies" in risk_assessment
        
        # Validate risk categories
        risks = risk_assessment["strategic_risks"]
        risk_categories = [risk["category"] for risk in risks]
        expected_categories = ["market", "competitive", "operational", "financial"]
        assert any(cat in risk_categories for cat in expected_categories)
        
        # Validate risk scoring
        for risk in risks:
            assert "probability" in risk
            assert "impact" in risk
            assert "risk_score" in risk
            assert 0 <= risk["probability"] <= 1
            assert 0 <= risk["impact"] <= 1
            assert 0 <= risk["risk_score"] <= 1
    
    def test_strategic_metrics_tracking(self, strategic_capability):
        """Test strategic metrics tracking"""
        
        # Sample objectives with KPIs
        objectives_with_kpis = [
            {
                "objective": "revenue_growth",
                "target": 100000000,
                "current": 50000000,
                "kpis": ["monthly_recurring_revenue", "customer_acquisition_cost"]
            },
            {
                "objective": "market_expansion",
                "target": 0.15,  # 15% market share
                "current": 0.08,
                "kpis": ["new_market_penetration", "brand_awareness"]
            }
        ]
        
        # Define tracking metrics
        tracking_metrics = strategic_capability.define_tracking_metrics(
            objectives=objectives_with_kpis
        )
        
        # Validate structure
        assert len(tracking_metrics) > 0
        assert all("metric_name" in metric for metric in tracking_metrics)
        assert all("target_value" in metric for metric in tracking_metrics)
        assert all("measurement_frequency" in metric for metric in tracking_metrics)
        assert all("data_source" in metric for metric in tracking_metrics)
        
        # Validate metric types
        metric_names = [metric["metric_name"] for metric in tracking_metrics]
        assert any("revenue" in name.lower() for name in metric_names)
        assert any("market" in name.lower() for name in metric_names)
    
    @pytest.mark.performance
    def test_analysis_performance(self, strategic_capability, sample_company_profile):
        """Test performance of strategic analysis"""
        import time
        
        # Measure SWOT analysis performance
        start_time = time.time()
        
        context = {
            "financial_performance": {"revenue_growth": 0.15},
            "market_position": {"market_share": 0.08}
        }
        
        swot = strategic_capability.generate_swot_analysis(
            company_profile=sample_company_profile,
            context=context
        )
        
        end_time = time.time()
        analysis_time = end_time - start_time
        
        # Should complete within performance threshold
        threshold = TEST_CONFIG["performance_thresholds"]["strategic_planning_time"]
        assert analysis_time < threshold, f"Analysis too slow: {analysis_time:.2f}s"
    
    def test_data_validation(self, strategic_capability):
        """Test input data validation"""
        
        # Test with invalid company profile
        invalid_profile = {
            "name": "",  # Empty name
            "industry": "invalid_industry",
            "size": "huge",  # Invalid size
            "geography": [],  # Empty geography
        }
        
        with pytest.raises(ValueError, match="Invalid company profile"):
            strategic_capability.validate_company_profile(invalid_profile)
        
        # Test with missing required fields
        incomplete_profile = {
            "name": "Test Company"
            # Missing other required fields
        }
        
        with pytest.raises(ValueError, match="Missing required fields"):
            strategic_capability.validate_company_profile(incomplete_profile)
    
    def test_integration_with_financial_data(self, strategic_capability, sample_company_profile):
        """Test integration with financial analysis data"""
        
        # Sample financial metrics
        financial_metrics = {
            "revenue_growth": 0.25,
            "profitability": 0.15,
            "liquidity_ratio": 2.5,
            "debt_to_equity": 0.8,
            "return_on_equity": 0.18
        }
        
        # Generate strategic insights with financial context
        insights = strategic_capability.generate_financial_strategic_insights(
            company_profile=sample_company_profile,
            financial_metrics=financial_metrics
        )
        
        # Validate integration
        assert "financial_strengths" in insights
        assert "financial_constraints" in insights
        assert "strategic_recommendations" in insights
        
        # Validate financial insight quality
        strengths = insights["financial_strengths"]
        assert any("growth" in strength.lower() for strength in strengths)
        assert any("profitability" in strength.lower() for strength in strengths)
        
        # Validate recommendations align with financial position
        recommendations = insights["strategic_recommendations"]
        assert len(recommendations) > 0
        assert any("leverage" in rec.lower() or "investment" in rec.lower() 
                  for rec in recommendations)
