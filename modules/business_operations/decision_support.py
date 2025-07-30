"""
Decision Support Capability for Frontier Business Operations Module

Advanced decision support system that provides:
- Data-driven insights and analytics
- Predictive modeling and forecasting
- Decision trees and scenario analysis
- Cost-benefit analysis and ROI calculations
- Risk assessment and sensitivity analysis
- Multi-criteria decision analysis (MCDA)
"""

from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
from collections import defaultdict
import json

class DecisionType(Enum):
    """Types of business decisions"""
    STRATEGIC = "strategic_decision"
    OPERATIONAL = "operational_decision"
    TACTICAL = "tactical_decision"
    INVESTMENT = "investment_decision"
    RESOURCE_ALLOCATION = "resource_allocation"
    RISK_MANAGEMENT = "risk_management"

class AnalysisMethod(Enum):
    """Decision analysis methodologies"""
    COST_BENEFIT = "cost_benefit_analysis"
    NPV_IRR = "npv_irr_analysis"
    DECISION_TREE = "decision_tree"
    MONTE_CARLO = "monte_carlo_simulation"
    SENSITIVITY_ANALYSIS = "sensitivity_analysis"
    MULTI_CRITERIA = "multi_criteria_decision_analysis"
    PARETO_ANALYSIS = "pareto_analysis"
    BREAK_EVEN = "break_even_analysis"

class RiskLevel(Enum):
    """Risk assessment levels"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

class ConfidenceLevel(Enum):
    """Confidence levels for predictions and recommendations"""
    VERY_LOW = "very_low"  # <50%
    LOW = "low"           # 50-65%
    MEDIUM = "medium"     # 65-80%
    HIGH = "high"         # 80-90%
    VERY_HIGH = "very_high"  # >90%

@dataclass
class DecisionCriterion:
    """Decision evaluation criterion"""
    name: str
    description: str
    weight: float  # 0-1, relative importance
    scale: str  # "higher_better", "lower_better"
    min_value: float
    max_value: float
    data_type: str  # "quantitative", "qualitative"

@dataclass
class DecisionAlternative:
    """Decision alternative option"""
    alternative_id: str
    name: str
    description: str
    criteria_scores: Dict[str, float]
    costs: Dict[str, float]
    benefits: Dict[str, float]
    risks: Dict[str, Any]
    implementation_timeline: Dict[str, datetime]
    resource_requirements: Dict[str, Any]

@dataclass
class DecisionAnalysis:
    """Comprehensive decision analysis results"""
    decision_type: DecisionType
    alternatives: List[DecisionAlternative]
    criteria: List[DecisionCriterion]
    analysis_methods: List[AnalysisMethod]
    rankings: Dict[str, List[str]]  # method -> ranked alternative IDs
    recommended_alternative: str
    confidence_level: ConfidenceLevel
    sensitivity_analysis: Dict[str, Any]
    risk_assessment: Dict[str, Any]

@dataclass
class PredictiveModel:
    """Predictive modeling results"""
    model_type: str
    target_variable: str
    features: List[str]
    predictions: Dict[str, float]
    confidence_intervals: Dict[str, Tuple[float, float]]
    model_accuracy: float
    feature_importance: Dict[str, float]
    assumptions: List[str]
    limitations: List[str]

@dataclass
class CostBenefitAnalysis:
    """Cost-benefit analysis results"""
    costs: Dict[str, float]
    benefits: Dict[str, float]
    net_present_value: float
    internal_rate_of_return: float
    payback_period: float
    benefit_cost_ratio: float
    sensitivity_factors: Dict[str, float]
    break_even_point: Dict[str, float]

class DecisionSupportCapability:
    """
    Advanced decision support capability providing comprehensive
    decision analysis, predictive modeling, and optimization
    """
    
    def __init__(self):
        self.name = "decision_support"
        self.version = "1.0.0"
        self.analysis_methods = {
            method.value: self._load_analysis_framework(method)
            for method in AnalysisMethod
        }
        self.risk_models = self._load_risk_models()
        self.prediction_algorithms = self._load_prediction_algorithms()
        
    def analyze_decision(
        self,
        business_context: Dict[str, Any],
        decision_context: Dict[str, Any],
        alternatives: List[Dict[str, Any]],
        criteria: List[Dict[str, Any]]
    ) -> DecisionAnalysis:
        """
        Comprehensive decision analysis using multiple methodologies
        
        Args:
            business_context: Business context and constraints
            decision_context: Specific decision context and requirements
            alternatives: List of decision alternatives
            criteria: Decision evaluation criteria
            
        Returns:
            Comprehensive decision analysis with recommendations
        """
        try:
            # Process decision alternatives
            processed_alternatives = [
                self._process_alternative(alt, business_context)
                for alt in alternatives
            ]
            
            # Process decision criteria
            processed_criteria = [
                self._process_criterion(crit)
                for crit in criteria
            ]
            
            # Determine decision type
            decision_type = self._classify_decision_type(decision_context)
            
            # Select appropriate analysis methods
            analysis_methods = self._select_analysis_methods(decision_type, decision_context)
            
            # Perform analysis using each method
            rankings = {}
            for method in analysis_methods:
                ranking = self._analyze_with_method(
                    method, processed_alternatives, processed_criteria, decision_context
                )
                rankings[method.value] = ranking
            
            # Generate consolidated recommendation
            recommended_alternative = self._generate_recommendation(
                rankings, processed_alternatives, processed_criteria
            )
            
            # Assess confidence level
            confidence_level = self._assess_recommendation_confidence(
                rankings, processed_alternatives, decision_context
            )
            
            # Sensitivity analysis
            sensitivity_analysis = self._perform_sensitivity_analysis(
                processed_alternatives, processed_criteria, decision_context
            )
            
            # Risk assessment
            risk_assessment = self._assess_decision_risks(
                processed_alternatives, decision_context
            )
            
            return DecisionAnalysis(
                decision_type=decision_type,
                alternatives=processed_alternatives,
                criteria=processed_criteria,
                analysis_methods=analysis_methods,
                rankings=rankings,
                recommended_alternative=recommended_alternative,
                confidence_level=confidence_level,
                sensitivity_analysis=sensitivity_analysis,
                risk_assessment=risk_assessment
            )
            
        except Exception as e:
            return DecisionAnalysis(
                decision_type=DecisionType.OPERATIONAL,
                alternatives=[], criteria=[], analysis_methods=[],
                rankings={}, recommended_alternative="",
                confidence_level=ConfidenceLevel.VERY_LOW,
                sensitivity_analysis={'error': str(e)}, risk_assessment={}
            )
    
    def conduct_cost_benefit_analysis(
        self,
        business_context: Dict[str, Any],
        investment_data: Dict[str, Any],
        time_horizon: int = 5,
        discount_rate: float = 0.10
    ) -> CostBenefitAnalysis:
        """
        Conduct comprehensive cost-benefit analysis
        
        Args:
            business_context: Business context
            investment_data: Investment costs and benefits data
            time_horizon: Analysis time horizon in years
            discount_rate: Discount rate for NPV calculation
            
        Returns:
            Cost-benefit analysis results
        """
        try:
            # Extract and categorize costs
            costs = self._categorize_costs(investment_data, time_horizon)
            
            # Extract and categorize benefits
            benefits = self._categorize_benefits(investment_data, time_horizon)
            
            # Calculate NPV
            npv = self._calculate_npv(costs, benefits, discount_rate, time_horizon)
            
            # Calculate IRR
            irr = self._calculate_irr(costs, benefits, time_horizon)
            
            # Calculate payback period
            payback_period = self._calculate_payback_period(costs, benefits)
            
            # Calculate benefit-cost ratio
            bcr = self._calculate_benefit_cost_ratio(costs, benefits, discount_rate)
            
            # Sensitivity analysis
            sensitivity_factors = self._analyze_cost_benefit_sensitivity(
                costs, benefits, discount_rate, time_horizon
            )
            
            # Break-even analysis
            break_even_point = self._calculate_break_even_point(costs, benefits)
            
            return CostBenefitAnalysis(
                costs=costs,
                benefits=benefits,
                net_present_value=npv,
                internal_rate_of_return=irr,
                payback_period=payback_period,
                benefit_cost_ratio=bcr,
                sensitivity_factors=sensitivity_factors,
                break_even_point=break_even_point
            )
            
        except Exception as e:
            return CostBenefitAnalysis(
                costs={}, benefits={}, net_present_value=0.0,
                internal_rate_of_return=0.0, payback_period=0.0,
                benefit_cost_ratio=0.0, sensitivity_factors={},
                break_even_point={'error': str(e)}
            )
    
    def generate_predictions(
        self,
        business_context: Dict[str, Any],
        historical_data: Dict[str, Any],
        prediction_targets: List[str],
        time_horizon: int = 12  # months
    ) -> Dict[str, PredictiveModel]:
        """
        Generate predictive models and forecasts
        
        Args:
            business_context: Business context
            historical_data: Historical data for modeling
            prediction_targets: Variables to predict
            time_horizon: Prediction time horizon in months
            
        Returns:
            Predictive models for each target variable
        """
        try:
            predictions = {}
            
            for target in prediction_targets:
                # Prepare data for modeling
                model_data = self._prepare_modeling_data(
                    historical_data, target, business_context
                )
                
                # Select appropriate model type
                model_type = self._select_model_type(target, model_data)
                
                # Train predictive model
                model_results = self._train_predictive_model(
                    model_data, target, model_type, time_horizon
                )
                
                # Generate predictions
                forecasts = self._generate_forecasts(
                    model_results, time_horizon
                )
                
                # Calculate confidence intervals
                confidence_intervals = self._calculate_confidence_intervals(
                    model_results, forecasts
                )
                
                # Feature importance analysis
                feature_importance = self._analyze_feature_importance(model_results)
                
                # Model validation
                accuracy = self._validate_model(model_results, model_data)
                
                predictions[target] = PredictiveModel(
                    model_type=model_type,
                    target_variable=target,
                    features=list(model_data.keys()),
                    predictions=forecasts,
                    confidence_intervals=confidence_intervals,
                    model_accuracy=accuracy,
                    feature_importance=feature_importance,
                    assumptions=self._get_model_assumptions(model_type),
                    limitations=self._get_model_limitations(model_type, model_data)
                )
            
            return predictions
            
        except Exception as e:
            return {
                target: PredictiveModel(
                    model_type="error", target_variable=target, features=[],
                    predictions={}, confidence_intervals={}, model_accuracy=0.0,
                    feature_importance={}, assumptions=[], limitations=[str(e)]
                )
                for target in prediction_targets
            }
    
    def perform_risk_analysis(
        self,
        business_context: Dict[str, Any],
        decision_alternatives: List[Dict[str, Any]],
        risk_factors: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Perform comprehensive risk analysis for decision alternatives
        
        Args:
            business_context: Business context
            decision_alternatives: Alternatives to analyze
            risk_factors: Identified risk factors
            
        Returns:
            Risk analysis results and mitigation recommendations
        """
        try:
            risk_analysis = {
                'alternative_risk_profiles': {},
                'risk_factor_impacts': {},
                'mitigation_strategies': {},
                'risk_rankings': {},
                'overall_risk_assessment': {}
            }
            
            # Analyze each alternative
            for alternative in decision_alternatives:
                alt_id = alternative.get('id', f"alt_{len(risk_analysis['alternative_risk_profiles'])}")
                
                # Risk profile for this alternative
                risk_profile = self._assess_alternative_risks(
                    alternative, risk_factors, business_context
                )
                
                risk_analysis['alternative_risk_profiles'][alt_id] = risk_profile
                
                # Risk mitigation strategies
                mitigation = self._generate_risk_mitigation_strategies(
                    risk_profile, alternative, business_context
                )
                
                risk_analysis['mitigation_strategies'][alt_id] = mitigation
            
            # Risk factor impact analysis
            risk_analysis['risk_factor_impacts'] = self._analyze_risk_factor_impacts(
                risk_factors, decision_alternatives, business_context
            )
            
            # Risk rankings
            risk_analysis['risk_rankings'] = self._rank_alternatives_by_risk(
                risk_analysis['alternative_risk_profiles']
            )
            
            # Overall assessment
            risk_analysis['overall_risk_assessment'] = self._generate_overall_risk_assessment(
                risk_analysis
            )
            
            return risk_analysis
            
        except Exception as e:
            return {
                'error': f"Risk analysis failed: {str(e)}",
                'alternative_risk_profiles': {},
                'risk_factor_impacts': {},
                'mitigation_strategies': {},
                'risk_rankings': {},
                'overall_risk_assessment': {}
            }
    
    def _process_alternative(
        self,
        alternative_data: Dict[str, Any],
        business_context: Dict[str, Any]
    ) -> DecisionAlternative:
        """Process and validate decision alternative"""
        return DecisionAlternative(
            alternative_id=alternative_data.get('id', f"alt_{hash(str(alternative_data))}"),
            name=alternative_data.get('name', 'Unnamed Alternative'),
            description=alternative_data.get('description', ''),
            criteria_scores=alternative_data.get('criteria_scores', {}),
            costs=alternative_data.get('costs', {}),
            benefits=alternative_data.get('benefits', {}),
            risks=alternative_data.get('risks', {}),
            implementation_timeline=alternative_data.get('timeline', {}),
            resource_requirements=alternative_data.get('resources', {})
        )
    
    def _process_criterion(self, criterion_data: Dict[str, Any]) -> DecisionCriterion:
        """Process and validate decision criterion"""
        return DecisionCriterion(
            name=criterion_data.get('name', 'Unnamed Criterion'),
            description=criterion_data.get('description', ''),
            weight=min(1.0, max(0.0, criterion_data.get('weight', 0.5))),
            scale=criterion_data.get('scale', 'higher_better'),
            min_value=criterion_data.get('min_value', 0.0),
            max_value=criterion_data.get('max_value', 100.0),
            data_type=criterion_data.get('data_type', 'quantitative')
        )
    
    def _classify_decision_type(self, decision_context: Dict[str, Any]) -> DecisionType:
        """Classify the type of decision based on context"""
        # Analyze decision characteristics
        impact_level = decision_context.get('impact_level', 'medium')
        time_horizon = decision_context.get('time_horizon', 'medium_term')
        resource_commitment = decision_context.get('resource_commitment', 'medium')
        
        # Classification logic
        if impact_level == 'high' and time_horizon == 'long_term':
            return DecisionType.STRATEGIC
        elif 'investment' in decision_context.get('category', '').lower():
            return DecisionType.INVESTMENT
        elif 'resource' in decision_context.get('category', '').lower():
            return DecisionType.RESOURCE_ALLOCATION
        elif 'risk' in decision_context.get('category', '').lower():
            return DecisionType.RISK_MANAGEMENT
        elif time_horizon == 'short_term':
            return DecisionType.OPERATIONAL
        else:
            return DecisionType.TACTICAL
    
    def _select_analysis_methods(
        self,
        decision_type: DecisionType,
        decision_context: Dict[str, Any]
    ) -> List[AnalysisMethod]:
        """Select appropriate analysis methods based on decision type"""
        method_mapping = {
            DecisionType.STRATEGIC: [
                AnalysisMethod.MULTI_CRITERIA,
                AnalysisMethod.SENSITIVITY_ANALYSIS,
                AnalysisMethod.DECISION_TREE
            ],
            DecisionType.INVESTMENT: [
                AnalysisMethod.NPV_IRR,
                AnalysisMethod.COST_BENEFIT,
                AnalysisMethod.SENSITIVITY_ANALYSIS
            ],
            DecisionType.OPERATIONAL: [
                AnalysisMethod.COST_BENEFIT,
                AnalysisMethod.PARETO_ANALYSIS,
                AnalysisMethod.BREAK_EVEN
            ],
            DecisionType.RISK_MANAGEMENT: [
                AnalysisMethod.MONTE_CARLO,
                AnalysisMethod.SENSITIVITY_ANALYSIS,
                AnalysisMethod.DECISION_TREE
            ]
        }
        
        return method_mapping.get(decision_type, [AnalysisMethod.MULTI_CRITERIA])
    
    def _calculate_npv(
        self,
        costs: Dict[str, float],
        benefits: Dict[str, float],
        discount_rate: float,
        time_horizon: int
    ) -> float:
        """Calculate Net Present Value"""
        try:
            total_costs = sum(costs.values())
            total_annual_benefits = sum(benefits.values())
            
            # Simple NPV calculation
            npv = -total_costs  # Initial investment
            
            for year in range(1, time_horizon + 1):
                discounted_benefit = total_annual_benefits / ((1 + discount_rate) ** year)
                npv += discounted_benefit
            
            return npv
            
        except Exception:
            return 0.0
    
    def _calculate_irr(
        self,
        costs: Dict[str, float],
        benefits: Dict[str, float],
        time_horizon: int
    ) -> float:
        """Calculate Internal Rate of Return (simplified)"""
        try:
            total_costs = sum(costs.values())
            total_annual_benefits = sum(benefits.values())
            
            if total_costs <= 0:
                return 0.0
            
            # Simplified IRR approximation
            annual_return = total_annual_benefits / total_costs
            irr = annual_return - 1.0
            
            return max(0.0, min(1.0, irr))
            
        except Exception:
            return 0.0
    
    def _load_analysis_framework(self, method: AnalysisMethod) -> Dict[str, Any]:
        """Load analysis framework for specific method"""
        frameworks = {
            AnalysisMethod.COST_BENEFIT: {
                'steps': ['identify_costs', 'identify_benefits', 'quantify_values', 
                         'discount_future_values', 'compare_alternatives'],
                'metrics': ['npv', 'bcr', 'payback_period', 'irr'],
                'considerations': ['time_value_money', 'risk_adjustment', 'sensitivity']
            },
            AnalysisMethod.MULTI_CRITERIA: {
                'steps': ['define_criteria', 'weight_criteria', 'score_alternatives',
                         'aggregate_scores', 'sensitivity_analysis'],
                'methods': ['weighted_sum', 'ahp', 'topsis', 'promethee'],
                'considerations': ['criterion_independence', 'weight_elicitation', 'scale_effects']
            },
            AnalysisMethod.DECISION_TREE: {
                'components': ['decision_nodes', 'chance_nodes', 'outcome_nodes'],
                'calculations': ['expected_value', 'utility_analysis', 'sensitivity'],
                'considerations': ['probability_assessment', 'outcome_valuation', 'risk_attitude']
            }
        }
        
        return frameworks.get(method, {})
    
    def _load_risk_models(self) -> Dict[str, Any]:
        """Load risk assessment models and frameworks"""
        return {
            'financial_risk': {
                'factors': ['market_risk', 'credit_risk', 'liquidity_risk', 'operational_risk'],
                'metrics': ['var', 'expected_shortfall', 'sharpe_ratio'],
                'models': ['monte_carlo', 'historical_simulation', 'parametric']
            },
            'operational_risk': {
                'factors': ['process_risk', 'people_risk', 'system_risk', 'external_risk'],
                'metrics': ['frequency', 'severity', 'loss_distribution'],
                'models': ['bow_tie', 'fault_tree', 'event_tree']
            },
            'strategic_risk': {
                'factors': ['market_risk', 'competitive_risk', 'technology_risk', 'regulatory_risk'],
                'metrics': ['probability_impact', 'risk_velocity', 'risk_appetite'],
                'models': ['scenario_analysis', 'stress_testing', 'war_gaming']
            }
        }
    
    def _load_prediction_algorithms(self) -> Dict[str, Any]:
        """Load predictive modeling algorithms and configurations"""
        return {
            'time_series': {
                'algorithms': ['arima', 'exponential_smoothing', 'prophet', 'lstm'],
                'use_cases': ['demand_forecasting', 'sales_prediction', 'financial_forecasting'],
                'considerations': ['seasonality', 'trend', 'external_factors']
            },
            'regression': {
                'algorithms': ['linear_regression', 'polynomial_regression', 'ridge_regression'],
                'use_cases': ['cost_estimation', 'performance_prediction', 'resource_planning'],
                'considerations': ['multicollinearity', 'outliers', 'assumptions']
            },
            'classification': {
                'algorithms': ['logistic_regression', 'decision_tree', 'random_forest'],
                'use_cases': ['risk_classification', 'customer_segmentation', 'quality_prediction'],
                'considerations': ['class_imbalance', 'feature_selection', 'overfitting']
            }
        }

    def get_capability_info(self) -> Dict[str, Any]:
        """Return capability information and metadata"""
        return {
            'name': self.name,
            'version': self.version,
            'description': 'Advanced decision support and predictive analytics capability',
            'supported_methods': [m.value for m in AnalysisMethod],
            'capabilities': [
                'Decision Analysis',
                'Cost-Benefit Analysis',
                'Predictive Modeling',
                'Risk Assessment',
                'Sensitivity Analysis',
                'Multi-Criteria Decision Analysis',
                'Investment Analysis'
            ],
            'analysis_types': [
                'decision_analysis',
                'cost_benefit_analysis',
                'predictive_modeling',
                'risk_analysis',
                'investment_analysis',
                'scenario_analysis'
            ]
        }
