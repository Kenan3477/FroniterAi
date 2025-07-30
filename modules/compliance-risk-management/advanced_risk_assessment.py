"""
Advanced Risk Assessment Module

Comprehensive risk assessment capabilities including quantitative analysis,
scenario modeling, stress testing, Value at Risk calculations, correlation 
analysis, and Monte Carlo simulations for compliance and operational risk.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import json
import math
import logging
from scipy import stats
from scipy.optimize import minimize
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

from .core_compliance_framework import (
    Regulation, Industry, Jurisdiction, RiskLevel, ComplianceStatus,
    RiskAssessment
)

logger = logging.getLogger(__name__)

class RiskType(Enum):
    """Types of risk assessments"""
    OPERATIONAL = "operational"
    COMPLIANCE = "compliance"
    FINANCIAL = "financial"
    CYBERSECURITY = "cybersecurity"
    REPUTATIONAL = "reputational"
    STRATEGIC = "strategic"
    REGULATORY = "regulatory"
    MARKET = "market"
    CREDIT = "credit"
    LIQUIDITY = "liquidity"

class ModelType(Enum):
    """Risk modeling approaches"""
    MONTE_CARLO = "monte_carlo"
    STRESS_TEST = "stress_test"
    SCENARIO_ANALYSIS = "scenario_analysis"
    VALUE_AT_RISK = "value_at_risk"
    CORRELATION_ANALYSIS = "correlation_analysis"
    QUANTITATIVE_ANALYSIS = "quantitative_analysis"
    QUALITATIVE_ANALYSIS = "qualitative_analysis"

@dataclass
class RiskFactor:
    """Individual risk factor definition"""
    factor_id: str
    name: str
    description: str
    risk_type: RiskType
    category: str
    probability: float  # 0-1
    impact_score: float  # 1-10
    current_value: Optional[float]
    historical_values: List[float]
    distribution_type: str  # normal, lognormal, uniform, etc.
    distribution_params: Dict[str, float]
    correlation_factors: Dict[str, float]
    mitigation_controls: List[str]
    control_effectiveness: float  # 0-1
@dataclass
class ScenarioDefinition:
    """Risk scenario definition"""
    scenario_id: str
    name: str
    description: str
    risk_factors: List[str]
    factor_adjustments: Dict[str, float]
    probability: float
    time_horizon: int  # days
    business_impact_areas: List[str]
    severity_level: RiskLevel

@dataclass
class StressTestDefinition:
    """Stress test scenario definition"""
    test_id: str
    name: str
    description: str
    stress_magnitude: float  # multiple of normal volatility
    affected_factors: List[str]
    test_duration: int  # days
    recovery_assumptions: Dict[str, Any]

@dataclass
class QuantitativeResult:
    """Quantitative risk analysis result"""
    metric_name: str
    value: float
    confidence_interval: Tuple[float, float]
    confidence_level: float
    methodology: str
    assumptions: List[str]
    limitations: List[str]

@dataclass
class SimulationResult:
    """Monte Carlo simulation result"""
    simulation_id: str
    iterations: int
    results_distribution: np.ndarray
    percentiles: Dict[str, float]
    mean: float
    std_dev: float
    var_95: float
    var_99: float
    expected_shortfall_95: float
    expected_shortfall_99: float
    worst_case: float
    best_case: float

class MonteCarloSimulator:
    """Monte Carlo simulation engine for risk assessment"""
    
    def __init__(self, random_seed: Optional[int] = None):
        if random_seed:
            np.random.seed(random_seed)
        self.simulation_cache = {}
    
    def run_simulation(
        self,
        risk_factors: List[RiskFactor],
        scenarios: List[ScenarioDefinition],
        iterations: int = 10000,
        time_horizon: int = 252  # trading days in a year
    ) -> SimulationResult:
        """Run Monte Carlo simulation for risk factors"""
        
        simulation_id = f"mc_sim_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Initialize factor distributions
        factor_distributions = {}
        for factor in risk_factors:
            factor_distributions[factor.factor_id] = self._create_distribution(factor)
        
        # Run simulation iterations
        simulation_results = []
        
        for i in range(iterations):
            iteration_result = self._run_single_iteration(
                risk_factors, factor_distributions, scenarios, time_horizon
            )
            simulation_results.append(iteration_result)
        
        results_array = np.array(simulation_results)
        
        # Calculate statistics
        percentiles = {
            "p1": np.percentile(results_array, 1),
            "p5": np.percentile(results_array, 5),
            "p10": np.percentile(results_array, 10),
            "p25": np.percentile(results_array, 25),
            "p50": np.percentile(results_array, 50),
            "p75": np.percentile(results_array, 75),
            "p90": np.percentile(results_array, 90),
            "p95": np.percentile(results_array, 95),
            "p99": np.percentile(results_array, 99)
        }
        
        # Calculate VaR and Expected Shortfall
        var_95 = np.percentile(results_array, 5)  # 95% VaR (5th percentile)
        var_99 = np.percentile(results_array, 1)  # 99% VaR (1st percentile)
        
        # Expected Shortfall (Conditional VaR)
        es_95_mask = results_array <= var_95
        es_99_mask = results_array <= var_99
        
        expected_shortfall_95 = np.mean(results_array[es_95_mask]) if np.any(es_95_mask) else var_95
        expected_shortfall_99 = np.mean(results_array[es_99_mask]) if np.any(es_99_mask) else var_99
        
        return SimulationResult(
            simulation_id=simulation_id,
            iterations=iterations,
            results_distribution=results_array,
            percentiles=percentiles,
            mean=np.mean(results_array),
            std_dev=np.std(results_array),
            var_95=var_95,
            var_99=var_99,
            expected_shortfall_95=expected_shortfall_95,
            expected_shortfall_99=expected_shortfall_99,
            worst_case=np.min(results_array),
            best_case=np.max(results_array)
        )
    
    def _create_distribution(self, factor: RiskFactor) -> stats.rv_continuous:
        """Create probability distribution for risk factor"""
        
        dist_type = factor.distribution_type.lower()
        params = factor.distribution_params
        
        if dist_type == "normal":
            return stats.norm(loc=params.get("mean", 0), scale=params.get("std", 1))
        elif dist_type == "lognormal":
            return stats.lognorm(s=params.get("sigma", 1), scale=params.get("scale", 1))
        elif dist_type == "uniform":
            return stats.uniform(loc=params.get("low", 0), scale=params.get("high", 1) - params.get("low", 0))
        elif dist_type == "beta":
            return stats.beta(a=params.get("alpha", 1), b=params.get("beta", 1))
        elif dist_type == "gamma":
            return stats.gamma(a=params.get("shape", 1), scale=params.get("scale", 1))
        else:
            # Default to normal distribution
            return stats.norm(loc=0, scale=1)
    
    def _run_single_iteration(
        self,
        risk_factors: List[RiskFactor],
        factor_distributions: Dict[str, stats.rv_continuous],
        scenarios: List[ScenarioDefinition],
        time_horizon: int
    ) -> float:
        """Run single Monte Carlo iteration"""
        
        total_impact = 0.0
        
        # Sample from risk factor distributions
        factor_values = {}
        for factor in risk_factors:
            distribution = factor_distributions[factor.factor_id]
            sampled_value = distribution.rvs()
            
            # Apply correlations (simplified approach)
            for corr_factor_id, correlation in factor.correlation_factors.items():
                if corr_factor_id in factor_values:
                    corr_adjustment = correlation * factor_values[corr_factor_id] * 0.1
                    sampled_value += corr_adjustment
            
            factor_values[factor.factor_id] = sampled_value
            
            # Calculate impact considering mitigation controls
            base_impact = factor.impact_score * abs(sampled_value)
            mitigated_impact = base_impact * (1 - factor.control_effectiveness)
            total_impact += mitigated_impact
        
        # Apply scenario adjustments
        for scenario in scenarios:
            if np.random.random() < scenario.probability:
                scenario_impact = 0.0
                for factor_id in scenario.risk_factors:
                    if factor_id in factor_values:
                        adjustment = scenario.factor_adjustments.get(factor_id, 1.0)
                        scenario_impact += factor_values[factor_id] * adjustment
                
                total_impact += scenario_impact
        
        return total_impact

class AdvancedRiskAssessmentEngine:
    """Comprehensive risk assessment engine orchestrating all risk analysis capabilities"""
    
    def __init__(self):
        self.monte_carlo = MonteCarloSimulator()
        
    def comprehensive_risk_assessment(
        self,
        risk_factors: List[RiskFactor],
        historical_data: pd.DataFrame,
        assessment_config: Dict[str, Any]
    ) -> RiskAssessment:
        """Perform comprehensive risk assessment using all available methods"""
        
        assessment_id = f"risk_assessment_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # 1. Monte Carlo Simulation
        scenarios = assessment_config.get("scenarios", [])
        mc_result = self.monte_carlo.run_simulation(
            risk_factors,
            scenarios,
            iterations=assessment_config.get("mc_iterations", 10000)
        )
        
        # 2. Quantitative Risk Metrics
        quantitative_metrics = self._calculate_quantitative_metrics(mc_result)
        
        # 3. Qualitative Risk Assessment
        qualitative_assessment = self._perform_qualitative_assessment(risk_factors)
        
        # 4. Risk Mitigation Analysis
        mitigation_analysis = self._analyze_mitigation_strategies(risk_factors)
        
        # 5. Overall Risk Rating
        risk_level = self._determine_overall_risk_level(quantitative_metrics, qualitative_assessment)
        
        return RiskAssessment(
            assessment_id=assessment_id,
            risk_type="comprehensive",
            assessment_date=datetime.now(),
            scope=assessment_config.get("scope", ["operational", "compliance", "financial"]),
            risk_factors=[asdict(factor) for factor in risk_factors],
            quantitative_metrics=quantitative_metrics,
            qualitative_assessment=qualitative_assessment,
            scenario_analysis={
                "monte_carlo": {
                    "simulation_id": mc_result.simulation_id,
                    "iterations": mc_result.iterations,
                    "mean": mc_result.mean,
                    "std_dev": mc_result.std_dev,
                    "var_95": mc_result.var_95,
                    "var_99": mc_result.var_99,
                    "expected_shortfall_95": mc_result.expected_shortfall_95,
                    "expected_shortfall_99": mc_result.expected_shortfall_99,
                    "percentiles": mc_result.percentiles
                }
            },
            mitigation_strategies=mitigation_analysis,
            residual_risk=risk_level,
            confidence_level=assessment_config.get("confidence_level", 0.85)
        )
    
    def _calculate_quantitative_metrics(self, mc_result: SimulationResult) -> Dict[str, float]:
        """Calculate comprehensive quantitative risk metrics"""
        
        metrics = {
            "expected_loss": mc_result.mean,
            "loss_volatility": mc_result.std_dev,
            "skewness": stats.skew(mc_result.results_distribution),
            "kurtosis": stats.kurtosis(mc_result.results_distribution),
            "var_95_mc": mc_result.var_95,
            "var_99_mc": mc_result.var_99,
            "expected_shortfall_95": mc_result.expected_shortfall_95,
            "expected_shortfall_99": mc_result.expected_shortfall_99,
            "worst_case_loss": mc_result.worst_case,
            "best_case_outcome": mc_result.best_case
        }
        
        return metrics
    
    def _perform_qualitative_assessment(self, risk_factors: List[RiskFactor]) -> Dict[str, str]:
        """Perform qualitative risk assessment"""
        
        # Assess risk factor characteristics
        high_impact_factors = [f for f in risk_factors if f.impact_score >= 7]
        high_probability_factors = [f for f in risk_factors if f.probability >= 0.7]
        poorly_controlled_factors = [f for f in risk_factors if f.control_effectiveness < 0.5]
        
        return {
            "risk_profile": self._classify_risk_profile(risk_factors),
            "key_vulnerabilities": f"{len(high_impact_factors)} high-impact factors, "
                                f"{len(poorly_controlled_factors)} poorly controlled factors",
            "control_maturity": self._assess_control_maturity(risk_factors),
            "risk_concentration": self._assess_risk_concentration(risk_factors),
            "emerging_risks": self._identify_emerging_risks(risk_factors)
        }
    
    def _classify_risk_profile(self, risk_factors: List[RiskFactor]) -> str:
        """Classify overall risk profile"""
        avg_impact = np.mean([f.impact_score for f in risk_factors])
        avg_probability = np.mean([f.probability for f in risk_factors])
        avg_control = np.mean([f.control_effectiveness for f in risk_factors])
        
        risk_score = (avg_impact * avg_probability) / (avg_control + 0.1)
        
        if risk_score > 6:
            return "High Risk"
        elif risk_score > 4:
            return "Medium-High Risk"
        elif risk_score > 2:
            return "Medium Risk"
        else:
            return "Low-Medium Risk"
    
    def _assess_control_maturity(self, risk_factors: List[RiskFactor]) -> str:
        """Assess control maturity level"""
        avg_effectiveness = np.mean([f.control_effectiveness for f in risk_factors])
        
        if avg_effectiveness >= 0.8:
            return "Mature"
        elif avg_effectiveness >= 0.6:
            return "Developing"
        else:
            return "Immature"
    
    def _assess_risk_concentration(self, risk_factors: List[RiskFactor]) -> str:
        """Assess risk concentration"""
        risk_types = [f.risk_type for f in risk_factors]
        type_counts = {rt: risk_types.count(rt) for rt in set(risk_types)}
        max_concentration = max(type_counts.values()) / len(risk_factors)
        
        if max_concentration > 0.5:
            return "High concentration"
        elif max_concentration > 0.3:
            return "Moderate concentration"
        else:
            return "Well diversified"
    
    def _identify_emerging_risks(self, risk_factors: List[RiskFactor]) -> str:
        """Identify emerging risk themes"""
        emerging_themes = []
        
        # Check for technology-related risks
        tech_risks = [f for f in risk_factors if "cyber" in f.name.lower() or "technology" in f.name.lower()]
        if len(tech_risks) > len(risk_factors) * 0.2:
            emerging_themes.append("Technology/Cyber risks")
        
        # Check for regulatory risks
        reg_risks = [f for f in risk_factors if "regulatory" in f.name.lower() or "compliance" in f.name.lower()]
        if len(reg_risks) > len(risk_factors) * 0.15:
            emerging_themes.append("Regulatory compliance risks")
        
        return ", ".join(emerging_themes) if emerging_themes else "No significant emerging themes"
    
    def _analyze_mitigation_strategies(self, risk_factors: List[RiskFactor]) -> List[Dict[str, Any]]:
        """Analyze and recommend risk mitigation strategies"""
        
        strategies = []
        
        for factor in risk_factors:
            if factor.control_effectiveness < 0.6 or factor.impact_score >= 7:
                mitigation_priority = "High" if factor.impact_score >= 8 and factor.control_effectiveness < 0.5 else "Medium"
                
                strategies.append({
                    "risk_factor": factor.name,
                    "current_controls": factor.mitigation_controls,
                    "control_effectiveness": factor.control_effectiveness,
                    "priority": mitigation_priority,
                    "recommended_actions": self._generate_mitigation_recommendations(factor),
                    "estimated_cost_impact": "High" if factor.impact_score >= 8 else "Medium",
                    "implementation_timeline": "Immediate" if mitigation_priority == "High" else "3-6 months"
                })
        
        # Sort by priority
        strategies.sort(key=lambda x: 0 if x["priority"] == "High" else 1)
        
        return strategies
    
    def _generate_mitigation_recommendations(self, factor: RiskFactor) -> List[str]:
        """Generate specific mitigation recommendations for a risk factor"""
        
        recommendations = []
        
        if factor.control_effectiveness < 0.3:
            recommendations.append("Implement comprehensive control framework")
        elif factor.control_effectiveness < 0.6:
            recommendations.append("Enhance existing controls")
        
        if factor.risk_type == RiskType.CYBERSECURITY:
            recommendations.extend([
                "Implement multi-factor authentication",
                "Conduct regular security assessments",
                "Enhance employee security training"
            ])
        elif factor.risk_type == RiskType.COMPLIANCE:
            recommendations.extend([
                "Establish compliance monitoring program",
                "Implement automated compliance checks",
                "Regular regulatory change monitoring"
            ])
        elif factor.risk_type == RiskType.OPERATIONAL:
            recommendations.extend([
                "Develop business continuity plans",
                "Implement process automation",
                "Establish backup procedures"
            ])
        
        if factor.impact_score >= 8:
            recommendations.append("Consider risk transfer mechanisms (insurance)")
        
        return recommendations
    
    def _determine_overall_risk_level(
        self,
        quantitative_metrics: Dict[str, float],
        qualitative_assessment: Dict[str, str]
    ) -> RiskLevel:
        """Determine overall risk level based on all assessments"""
        
        # Quantitative risk indicators
        var_95 = quantitative_metrics.get("var_95_mc", 0)
        expected_shortfall = quantitative_metrics.get("expected_shortfall_95", 0)
        
        # Qualitative risk indicators
        risk_profile = qualitative_assessment.get("risk_profile", "Medium Risk")
        control_maturity = qualitative_assessment.get("control_maturity", "Developing")
        
        # Risk scoring
        risk_score = 0
        
        # Quantitative factors
        if abs(var_95) > 10 or abs(expected_shortfall) > 15:
            risk_score += 3
        elif abs(var_95) > 5 or abs(expected_shortfall) > 10:
            risk_score += 2
        else:
            risk_score += 1
        
        # Qualitative factors
        if "High Risk" in risk_profile:
            risk_score += 3
        elif "Medium-High Risk" in risk_profile:
            risk_score += 2
        else:
            risk_score += 1
        
        if control_maturity == "Immature":
            risk_score += 2
        elif control_maturity == "Developing":
            risk_score += 1
        
        # Determine final risk level
        if risk_score >= 8:
            return RiskLevel.CRITICAL
        elif risk_score >= 6:
            return RiskLevel.HIGH
        elif risk_score >= 4:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
        portfolio_returns = daily_returns * portfolio_value
        
        # Scale to time horizon
        scaled_returns = portfolio_returns * math.sqrt(time_horizon_days)
        
        # Calculate VaR at confidence level
        var_value = np.percentile(scaled_returns, (1 - confidence_level) * 100)
        
        # Calculate Conditional VaR (Expected Shortfall)
        cvar_mask = scaled_returns <= var_value
        cvar_value = np.mean(scaled_returns[cvar_mask]) if np.any(cvar_mask) else var_value
        
        return {
            "value_at_risk": abs(var_value),
            "conditional_var": abs(cvar_value),
            "confidence_level": confidence_level,
            "time_horizon_days": time_horizon_days,
            "portfolio_value": portfolio_value
        }
    
    def run_multi_scenario_analysis(
        self,
        scenarios: List[ScenarioDefinition],
        simulation_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Run comprehensive multi-scenario analysis"""
        
        if simulation_config is None:
            simulation_config = {"num_simulations": 10000, "confidence_levels": [0.95, 0.99]}
        
        results = {
            "scenario_results": {},
            "comparative_analysis": {},
            "aggregate_metrics": {},
            "risk_correlations": {},
            "worst_case_scenarios": []
        }
        
        scenario_outcomes = []
        
        # Run simulation for each scenario
        for scenario in scenarios:
            logger.info(f"Running simulation for scenario: {scenario.name}")
            
            # Convert risk factors to distributions
            distributions = []
            for rf in scenario.risk_factors:
                dist_params = {
                    "mean": rf.impact_score,
                    "std": rf.impact_score * 0.2,  # Assume 20% volatility
                    "min_val": 0,
                    "max_val": 1
                }
                distributions.append(dist_params)
            
            # Run Monte Carlo simulation
            simulation_result = self.run_monte_carlo_simulation(
                distributions,
                scenario.correlation_matrix or np.eye(len(distributions)),
                simulation_config["num_simulations"]
            )
            
            # Store scenario results
            results["scenario_results"][scenario.scenario_id] = {
                "scenario_name": scenario.name,
                "simulation_result": simulation_result,
                "risk_metrics": self._calculate_scenario_risk_metrics(simulation_result),
                "probability_weighting": scenario.scenario_weight
            }
            
            scenario_outcomes.append({
                "scenario_id": scenario.scenario_id,
                "outcomes": simulation_result["simulation_outcomes"],
                "weight": scenario.scenario_weight
            })
        
        # Perform comparative analysis
        results["comparative_analysis"] = self._compare_scenarios(scenario_outcomes)
        
        # Calculate aggregate metrics
        results["aggregate_metrics"] = self._calculate_aggregate_metrics(scenario_outcomes)
        
        # Analyze risk correlations
        results["risk_correlations"] = self._analyze_risk_correlations(scenarios)
        
        # Identify worst-case scenarios
        results["worst_case_scenarios"] = self._identify_worst_case_scenarios(scenario_outcomes)
        
        return results
    
    def _calculate_scenario_risk_metrics(self, simulation_result: Dict[str, Any]) -> Dict[str, float]:
        """Calculate risk metrics for individual scenario"""
        
        outcomes = simulation_result["simulation_outcomes"]
        
        if len(outcomes) == 0:
            return {"mean": 0, "std": 0, "var_95": 0, "var_99": 0, "max_loss": 0}
        
        return {
            "mean": np.mean(outcomes),
            "std": np.std(outcomes),
            "var_95": np.percentile(outcomes, 95),
            "var_99": np.percentile(outcomes, 99),
            "max_loss": np.max(outcomes),
            "skewness": float(scipy.stats.skew(outcomes)),
            "kurtosis": float(scipy.stats.kurtosis(outcomes))
        }
    
    def _compare_scenarios(self, scenario_outcomes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compare different scenarios"""
        
        comparison = {
            "scenario_rankings": [],
            "relative_risks": {},
            "probability_distributions": {},
            "expected_values": {}
        }
        
        # Calculate expected values and rank scenarios
        scenario_expected_values = []
        for scenario in scenario_outcomes:
            expected_value = np.mean(scenario["outcomes"]) * scenario["weight"]
            scenario_expected_values.append({
                "scenario_id": scenario["scenario_id"],
                "expected_value": expected_value,
                "max_outcome": np.max(scenario["outcomes"]),
                "std": np.std(scenario["outcomes"])
            })
            
            comparison["expected_values"][scenario["scenario_id"]] = expected_value
        
        # Sort by expected value (descending for risk)
        scenario_expected_values.sort(key=lambda x: x["expected_value"], reverse=True)
        comparison["scenario_rankings"] = scenario_expected_values
        
        # Calculate relative risks
        if scenario_expected_values:
            baseline_risk = scenario_expected_values[-1]["expected_value"]  # Lowest risk as baseline
            for scenario in scenario_expected_values:
                relative_risk = scenario["expected_value"] / baseline_risk if baseline_risk > 0 else 1
                comparison["relative_risks"][scenario["scenario_id"]] = relative_risk
        
        return comparison
    
    def _calculate_aggregate_metrics(self, scenario_outcomes: List[Dict[str, Any]]) -> Dict[str, float]:
        """Calculate aggregate risk metrics across all scenarios"""
        
        # Combine all outcomes weighted by scenario probability
        all_weighted_outcomes = []
        for scenario in scenario_outcomes:
            weighted_outcomes = np.array(scenario["outcomes"]) * scenario["weight"]
            all_weighted_outcomes.extend(weighted_outcomes)
        
        if not all_weighted_outcomes:
            return {}
        
        all_weighted_outcomes = np.array(all_weighted_outcomes)
        
        return {
            "aggregate_mean": np.mean(all_weighted_outcomes),
            "aggregate_std": np.std(all_weighted_outcomes),
            "aggregate_var_95": np.percentile(all_weighted_outcomes, 95),
            "aggregate_var_99": np.percentile(all_weighted_outcomes, 99),
            "aggregate_max_loss": np.max(all_weighted_outcomes),
            "diversification_benefit": self._calculate_diversification_benefit(scenario_outcomes)
        }
    
    def _calculate_diversification_benefit(self, scenario_outcomes: List[Dict[str, Any]]) -> float:
        """Calculate diversification benefit from multiple scenarios"""
        
        # Calculate sum of individual risks
        individual_risk_sum = sum(
            np.std(scenario["outcomes"]) * scenario["weight"] 
            for scenario in scenario_outcomes
        )
        
        # Calculate portfolio risk
        all_weighted_outcomes = []
        for scenario in scenario_outcomes:
            weighted_outcomes = np.array(scenario["outcomes"]) * scenario["weight"]
            all_weighted_outcomes.extend(weighted_outcomes)
        
        portfolio_risk = np.std(all_weighted_outcomes) if all_weighted_outcomes else 0
        
        # Diversification benefit = (Sum of individual risks - Portfolio risk) / Sum of individual risks
        if individual_risk_sum > 0:
            return (individual_risk_sum - portfolio_risk) / individual_risk_sum
        return 0
    
    def _analyze_risk_correlations(self, scenarios: List[ScenarioDefinition]) -> Dict[str, Any]:
        """Analyze correlations between different risk scenarios"""
        
        correlations = {
            "factor_correlations": {},
            "scenario_similarities": {},
            "common_risk_factors": {}
        }
        
        # Analyze common risk factors between scenarios
        for i, scenario1 in enumerate(scenarios):
            for j, scenario2 in enumerate(scenarios[i+1:], i+1):
                factor_names1 = set(rf.factor_name for rf in scenario1.risk_factors)
                factor_names2 = set(rf.factor_name for rf in scenario2.risk_factors)
                
                common_factors = factor_names1.intersection(factor_names2)
                total_factors = factor_names1.union(factor_names2)
                
                similarity = len(common_factors) / len(total_factors) if total_factors else 0
                
                pair_key = f"{scenario1.scenario_id}_{scenario2.scenario_id}"
                correlations["scenario_similarities"][pair_key] = {
                    "similarity_score": similarity,
                    "common_factors": list(common_factors),
                    "unique_factors_1": list(factor_names1 - factor_names2),
                    "unique_factors_2": list(factor_names2 - factor_names1)
                }
        
        return correlations
    
    def _identify_worst_case_scenarios(self, scenario_outcomes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify worst-case scenarios and tail risks"""
        
        worst_cases = []
        
        for scenario in scenario_outcomes:
            outcomes = np.array(scenario["outcomes"])
            
            # Calculate tail risk metrics
            var_99 = np.percentile(outcomes, 99)
            tail_outcomes = outcomes[outcomes >= var_99]
            
            worst_case = {
                "scenario_id": scenario["scenario_id"],
                "worst_case_value": np.max(outcomes),
                "tail_risk_99": var_99,
                "tail_mean": np.mean(tail_outcomes) if len(tail_outcomes) > 0 else var_99,
                "probability_extreme": len(tail_outcomes) / len(outcomes),
                "scenario_weight": scenario["weight"]
            }
            
            worst_cases.append(worst_case)
        
        # Sort by worst-case value
        worst_cases.sort(key=lambda x: x["worst_case_value"], reverse=True)
        
        return worst_cases


# Utility functions for advanced risk assessment
def create_comprehensive_risk_scenario(
    scenario_id: str,
    name: str,
    risk_categories: List[str],
    jurisdiction: Jurisdiction = Jurisdiction.GLOBAL,
    regulations: List[Regulation] = None
) -> ScenarioDefinition:
    """Create comprehensive risk scenario with multiple risk categories"""
    
    if regulations is None:
        regulations = [Regulation.GDPR, Regulation.CCPA]
    
    risk_factors = []
    
    # Data privacy risks
    if "data_privacy" in risk_categories:
        risk_factors.extend([
            RiskFactor(
                factor_name="Data Breach",
                probability=0.15,
                impact_score=0.8,
                confidence_level=0.7,
                data_source="Industry reports",
                last_updated=datetime.now()
            ),
            RiskFactor(
                factor_name="Unauthorized Access",
                probability=0.25,
                impact_score=0.6,
                confidence_level=0.8,
                data_source="Security assessments",
                last_updated=datetime.now()
            )
        ])
    
    # Regulatory compliance risks
    if "regulatory" in risk_categories:
        risk_factors.extend([
            RiskFactor(
                factor_name="Regulatory Fine",
                probability=0.1,
                impact_score=0.7,
                confidence_level=0.9,
                data_source="Regulatory guidance",
                last_updated=datetime.now()
            ),
            RiskFactor(
                factor_name="Compliance Audit Failure",
                probability=0.2,
                impact_score=0.5,
                confidence_level=0.8,
                data_source="Historical audits",
                last_updated=datetime.now()
            )
        ])
    
    # Operational risks
    if "operational" in risk_categories:
        risk_factors.extend([
            RiskFactor(
                factor_name="System Downtime",
                probability=0.3,
                impact_score=0.4,
                confidence_level=0.9,
                data_source="System monitoring",
                last_updated=datetime.now()
            ),
            RiskFactor(
                factor_name="Process Failure",
                probability=0.2,
                impact_score=0.5,
                confidence_level=0.7,
                data_source="Process audits",
                last_updated=datetime.now()
            )
        ])
    
    # Generate correlation matrix
    num_factors = len(risk_factors)
    correlation_matrix = np.eye(num_factors)
    
    # Add some correlations between related risks
    for i in range(num_factors):
        for j in range(i+1, num_factors):
            if ("data" in risk_factors[i].factor_name.lower() and 
                "data" in risk_factors[j].factor_name.lower()):
                correlation_matrix[i][j] = correlation_matrix[j][i] = 0.4
            elif ("regulatory" in risk_factors[i].factor_name.lower() and 
                  "compliance" in risk_factors[j].factor_name.lower()):
                correlation_matrix[i][j] = correlation_matrix[j][i] = 0.6
    
    return ScenarioDefinition(
        scenario_id=scenario_id,
        name=name,
        description=f"Comprehensive risk scenario covering {', '.join(risk_categories)}",
        risk_factors=risk_factors,
        time_horizon=365,
        probability_distribution="beta",
        correlation_matrix=correlation_matrix.tolist(),
        scenario_weight=1.0
    )


if __name__ == "__main__":
    # Example usage and testing
    logger.info("Advanced Risk Assessment Module - Testing")
    
    try:
        # Initialize components
        db_manager = ComplianceDatabaseManager()
        risk_engine = AdvancedRiskAssessmentEngine()
        
        # Create comprehensive test scenario
        test_scenario = create_comprehensive_risk_scenario(
            scenario_id="test_scenario_001",
            name="Multi-Domain Risk Assessment",
            risk_categories=["data_privacy", "regulatory", "operational"],
            jurisdiction=Jurisdiction.EUROPEAN_UNION,
            regulations=[Regulation.GDPR, Regulation.ISO_27001]
        )
        
        # Run multi-scenario analysis
        scenarios = [test_scenario]
        results = risk_engine.run_multi_scenario_analysis(scenarios)
        
        logger.info(f"Risk assessment completed successfully")
        logger.info(f"Total scenarios analyzed: {len(scenarios)}")
        logger.info(f"Aggregate risk metrics calculated: {bool(results.get('aggregate_metrics'))}")
        
        print("Advanced Risk Assessment Module - Initialization Complete")
        print(f"- Risk scenarios: {len(scenarios)}")
        print(f"- Analysis results: {len(results)} components")
        print("- Ready for comprehensive risk assessment operations")
        
    except Exception as e:
        logger.error(f"Error during risk assessment testing: {e}")
        print(f"Error: {e}")
        raise
