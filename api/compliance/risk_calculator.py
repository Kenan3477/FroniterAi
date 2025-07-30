"""
Risk Calculator with Monte Carlo Simulations

Calculates compliance risk using probabilistic models and Monte Carlo simulations
for sophisticated risk assessment and scenario analysis.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
from dataclasses import dataclass
import numpy as np
import logging
import random
from statistics import mean, median, stdev

logger = logging.getLogger(__name__)


class RiskCategory(Enum):
    """Risk categories for compliance assessment"""
    REGULATORY = "regulatory"
    OPERATIONAL = "operational"
    FINANCIAL = "financial"
    REPUTATIONAL = "reputational"
    STRATEGIC = "strategic"
    TECHNOLOGY = "technology"
    LEGAL = "legal"


class RiskLevel(Enum):
    """Risk level classifications"""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"
    CRITICAL = "critical"


class ImpactType(Enum):
    """Types of impact from compliance failures"""
    FINANCIAL_PENALTY = "financial_penalty"
    BUSINESS_DISRUPTION = "business_disruption"
    REPUTATION_DAMAGE = "reputation_damage"
    LEGAL_ACTION = "legal_action"
    REGULATORY_ACTION = "regulatory_action"
    CUSTOMER_LOSS = "customer_loss"
    OPERATIONAL_COST = "operational_cost"


@dataclass
class RiskFactor:
    """Individual risk factor definition"""
    factor_id: str
    name: str
    category: RiskCategory
    description: str
    probability_distribution: str  # "normal", "beta", "triangular", "uniform"
    probability_params: Dict[str, float]  # Parameters for distribution
    impact_distribution: str
    impact_params: Dict[str, float]
    weight: float  # Importance weight (0-1)
    dependencies: List[str]  # IDs of dependent risk factors


@dataclass
class RiskScenario:
    """Risk scenario for Monte Carlo simulation"""
    scenario_id: str
    name: str
    description: str
    risk_factors: List[RiskFactor]
    time_horizon: int  # days
    correlation_matrix: Optional[np.ndarray] = None


@dataclass
class MonteCarloResult:
    """Results from Monte Carlo simulation"""
    scenario_id: str
    num_simulations: int
    confidence_level: float
    results: Dict[str, Any]
    risk_metrics: Dict[str, float]
    percentiles: Dict[str, float]
    distribution_stats: Dict[str, float]
    risk_contributions: Dict[str, float]
    simulation_data: Optional[np.ndarray] = None


@dataclass
class RiskAssessment:
    """Comprehensive risk assessment result"""
    assessment_id: str
    assessment_date: datetime
    organization: str
    regulation: str
    overall_risk_score: float
    risk_level: RiskLevel
    risk_factors: List[RiskFactor]
    monte_carlo_results: List[MonteCarloResult]
    recommendations: List[str]
    mitigation_strategies: List[Dict[str, Any]]
    confidence_score: float


class RiskCalculator:
    """
    Advanced risk calculator with Monte Carlo simulations
    """
    
    def __init__(self, random_seed: Optional[int] = None):
        if random_seed:
            np.random.seed(random_seed)
            random.seed(random_seed)
        
        self.risk_factors = self._load_risk_factors()
        self.scenarios = self._load_risk_scenarios()
        logger.info("Risk calculator initialized")
    
    def _load_risk_factors(self) -> Dict[str, RiskFactor]:
        """Load predefined risk factors for different regulations"""
        
        factors = {}
        
        # GDPR Risk Factors
        factors["gdpr_data_breach"] = RiskFactor(
            factor_id="gdpr_data_breach",
            name="GDPR Data Breach Risk",
            category=RiskCategory.REGULATORY,
            description="Risk of personal data breach leading to GDPR violations",
            probability_distribution="beta",
            probability_params={"alpha": 2, "beta": 8, "scale": 0.1},  # Low probability
            impact_distribution="triangular",
            impact_params={"left": 50000, "mode": 500000, "right": 20000000},  # GDPR fines
            weight=0.9,
            dependencies=["data_protection_controls", "employee_training"]
        )
        
        factors["gdpr_consent_violations"] = RiskFactor(
            factor_id="gdpr_consent_violations",
            name="GDPR Consent Violations",
            category=RiskCategory.REGULATORY,
            description="Risk of improper consent management",
            probability_distribution="beta",
            probability_params={"alpha": 3, "beta": 7, "scale": 0.15},
            impact_distribution="triangular",
            impact_params={"left": 10000, "mode": 100000, "right": 2000000},
            weight=0.7,
            dependencies=["consent_management_system"]
        )
        
        factors["gdpr_data_subject_rights"] = RiskFactor(
            factor_id="gdpr_data_subject_rights",
            name="GDPR Data Subject Rights Violations",
            category=RiskCategory.REGULATORY,
            description="Risk of failing to honor data subject rights",
            probability_distribution="beta",
            probability_params={"alpha": 4, "beta": 6, "scale": 0.2},
            impact_distribution="triangular",
            impact_params={"left": 5000, "mode": 50000, "right": 500000},
            weight=0.6,
            dependencies=["data_subject_procedures"]
        )
        
        # HIPAA Risk Factors
        factors["hipaa_phi_breach"] = RiskFactor(
            factor_id="hipaa_phi_breach",
            name="HIPAA PHI Breach Risk",
            category=RiskCategory.REGULATORY,
            description="Risk of protected health information breach",
            probability_distribution="beta",
            probability_params={"alpha": 2, "beta": 8, "scale": 0.08},
            impact_distribution="triangular",
            impact_params={"left": 100000, "mode": 1000000, "right": 10000000},
            weight=0.95,
            dependencies=["technical_safeguards", "physical_safeguards"]
        )
        
        factors["hipaa_access_violations"] = RiskFactor(
            factor_id="hipaa_access_violations",
            name="HIPAA Access Control Violations",
            category=RiskCategory.OPERATIONAL,
            description="Risk of unauthorized PHI access",
            probability_distribution="beta",
            probability_params={"alpha": 3, "beta": 7, "scale": 0.12},
            impact_distribution="triangular",
            impact_params={"left": 25000, "mode": 250000, "right": 2500000},
            weight=0.8,
            dependencies=["access_controls", "audit_procedures"]
        )
        
        # SOX Risk Factors
        factors["sox_internal_controls"] = RiskFactor(
            factor_id="sox_internal_controls",
            name="SOX Internal Controls Deficiency",
            category=RiskCategory.FINANCIAL,
            description="Risk of material weakness in internal controls",
            probability_distribution="beta",
            probability_params={"alpha": 4, "beta": 6, "scale": 0.25},
            impact_distribution="triangular",
            impact_params={"left": 500000, "mode": 5000000, "right": 50000000},
            weight=0.9,
            dependencies=["control_testing", "management_assessment"]
        )
        
        factors["sox_financial_misstatement"] = RiskFactor(
            factor_id="sox_financial_misstatement",
            name="SOX Financial Misstatement Risk",
            category=RiskCategory.FINANCIAL,
            description="Risk of material misstatement in financial reports",
            probability_distribution="beta",
            probability_params={"alpha": 2, "beta": 8, "scale": 0.05},
            impact_distribution="triangular",
            impact_params={"left": 1000000, "mode": 10000000, "right": 100000000},
            weight=0.95,
            dependencies=["financial_controls", "disclosure_controls"]
        )
        
        # PCI DSS Risk Factors
        factors["pci_cardholder_data_breach"] = RiskFactor(
            factor_id="pci_cardholder_data_breach",
            name="PCI DSS Cardholder Data Breach",
            category=RiskCategory.REGULATORY,
            description="Risk of cardholder data compromise",
            probability_distribution="beta",
            probability_params={"alpha": 2, "beta": 8, "scale": 0.06},
            impact_distribution="triangular",
            impact_params={"left": 200000, "mode": 2000000, "right": 20000000},
            weight=0.9,
            dependencies=["encryption_controls", "network_security"]
        )
        
        factors["pci_compliance_failure"] = RiskFactor(
            factor_id="pci_compliance_failure",
            name="PCI DSS Compliance Failure",
            category=RiskCategory.OPERATIONAL,
            description="Risk of failing PCI DSS assessment",
            probability_distribution="beta",
            probability_params={"alpha": 3, "beta": 7, "scale": 0.15},
            impact_distribution="triangular",
            impact_params={"left": 50000, "mode": 500000, "right": 5000000},
            weight=0.8,
            dependencies=["security_controls", "vulnerability_management"]
        )
        
        # Operational Risk Factors
        factors["employee_training"] = RiskFactor(
            factor_id="employee_training",
            name="Inadequate Employee Training",
            category=RiskCategory.OPERATIONAL,
            description="Risk from insufficient compliance training",
            probability_distribution="beta",
            probability_params={"alpha": 5, "beta": 5, "scale": 0.3},
            impact_distribution="triangular",
            impact_params={"left": 10000, "mode": 100000, "right": 1000000},
            weight=0.6,
            dependencies=[]
        )
        
        factors["vendor_risk"] = RiskFactor(
            factor_id="vendor_risk",
            name="Third-Party Vendor Risk",
            category=RiskCategory.OPERATIONAL,
            description="Risk from third-party vendor compliance failures",
            probability_distribution="beta",
            probability_params={"alpha": 4, "beta": 6, "scale": 0.2},
            impact_distribution="triangular",
            impact_params={"left": 25000, "mode": 250000, "right": 2500000},
            weight=0.7,
            dependencies=["vendor_management"]
        )
        
        return factors
    
    def _load_risk_scenarios(self) -> Dict[str, RiskScenario]:
        """Load predefined risk scenarios"""
        
        scenarios = {}
        
        # GDPR Compliance Risk Scenario
        scenarios["gdpr_comprehensive"] = RiskScenario(
            scenario_id="gdpr_comprehensive",
            name="Comprehensive GDPR Risk Assessment",
            description="Full GDPR compliance risk assessment including all major risk factors",
            risk_factors=[
                self.risk_factors["gdpr_data_breach"],
                self.risk_factors["gdpr_consent_violations"],
                self.risk_factors["gdpr_data_subject_rights"],
                self.risk_factors["employee_training"],
                self.risk_factors["vendor_risk"]
            ],
            time_horizon=365
        )
        
        # HIPAA Compliance Risk Scenario
        scenarios["hipaa_comprehensive"] = RiskScenario(
            scenario_id="hipaa_comprehensive",
            name="Comprehensive HIPAA Risk Assessment",
            description="Full HIPAA compliance risk assessment",
            risk_factors=[
                self.risk_factors["hipaa_phi_breach"],
                self.risk_factors["hipaa_access_violations"],
                self.risk_factors["employee_training"],
                self.risk_factors["vendor_risk"]
            ],
            time_horizon=365
        )
        
        # SOX Compliance Risk Scenario
        scenarios["sox_comprehensive"] = RiskScenario(
            scenario_id="sox_comprehensive",
            name="Comprehensive SOX Risk Assessment",
            description="Full SOX compliance risk assessment",
            risk_factors=[
                self.risk_factors["sox_internal_controls"],
                self.risk_factors["sox_financial_misstatement"],
                self.risk_factors["employee_training"]
            ],
            time_horizon=365
        )
        
        # PCI DSS Compliance Risk Scenario
        scenarios["pci_comprehensive"] = RiskScenario(
            scenario_id="pci_comprehensive",
            name="Comprehensive PCI DSS Risk Assessment",
            description="Full PCI DSS compliance risk assessment",
            risk_factors=[
                self.risk_factors["pci_cardholder_data_breach"],
                self.risk_factors["pci_compliance_failure"],
                self.risk_factors["employee_training"],
                self.risk_factors["vendor_risk"]
            ],
            time_horizon=365
        )
        
        return scenarios
    
    async def calculate_compliance_risk(
        self,
        organization_data: Dict[str, Any],
        regulation: str,
        scenario_id: Optional[str] = None,
        custom_factors: Optional[List[RiskFactor]] = None
    ) -> RiskAssessment:
        """Calculate comprehensive compliance risk assessment"""
        
        logger.info(f"Calculating compliance risk for {regulation}")
        
        # Select scenario or create custom
        if scenario_id:
            scenario = self.scenarios.get(scenario_id)
            if not scenario:
                raise ValueError(f"Scenario '{scenario_id}' not found")
        else:
            scenario = self._create_scenario_for_regulation(regulation, custom_factors)
        
        # Adjust risk factors based on organization data
        adjusted_factors = self._adjust_risk_factors(scenario.risk_factors, organization_data)
        
        # Run Monte Carlo simulation
        monte_carlo_results = await self._run_monte_carlo_simulation(
            adjusted_factors,
            num_simulations=10000,
            confidence_level=0.95
        )
        
        # Calculate overall risk score
        overall_risk_score = self._calculate_overall_risk_score(monte_carlo_results, adjusted_factors)
        
        # Determine risk level
        risk_level = self._determine_risk_level(overall_risk_score)
        
        # Generate recommendations
        recommendations = self._generate_risk_recommendations(
            adjusted_factors,
            monte_carlo_results,
            organization_data
        )
        
        # Generate mitigation strategies
        mitigation_strategies = self._generate_mitigation_strategies(
            adjusted_factors,
            monte_carlo_results
        )
        
        # Calculate confidence score
        confidence_score = self._calculate_confidence_score(organization_data, adjusted_factors)
        
        assessment = RiskAssessment(
            assessment_id=f"risk_assessment_{regulation}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            assessment_date=datetime.now(),
            organization=organization_data.get("name", "Unknown"),
            regulation=regulation.upper(),
            overall_risk_score=overall_risk_score,
            risk_level=risk_level,
            risk_factors=adjusted_factors,
            monte_carlo_results=[monte_carlo_results],
            recommendations=recommendations,
            mitigation_strategies=mitigation_strategies,
            confidence_score=confidence_score
        )
        
        logger.info(f"Risk assessment completed - Overall risk: {risk_level.value} ({overall_risk_score:.2f})")
        
        return assessment
    
    def _create_scenario_for_regulation(
        self,
        regulation: str,
        custom_factors: Optional[List[RiskFactor]] = None
    ) -> RiskScenario:
        """Create risk scenario for specific regulation"""
        
        regulation_lower = regulation.lower()
        
        if custom_factors:
            risk_factors = custom_factors
        elif regulation_lower == "gdpr":
            risk_factors = [
                self.risk_factors["gdpr_data_breach"],
                self.risk_factors["gdpr_consent_violations"],
                self.risk_factors["gdpr_data_subject_rights"]
            ]
        elif regulation_lower == "hipaa":
            risk_factors = [
                self.risk_factors["hipaa_phi_breach"],
                self.risk_factors["hipaa_access_violations"]
            ]
        elif regulation_lower == "sox":
            risk_factors = [
                self.risk_factors["sox_internal_controls"],
                self.risk_factors["sox_financial_misstatement"]
            ]
        elif regulation_lower == "pci_dss":
            risk_factors = [
                self.risk_factors["pci_cardholder_data_breach"],
                self.risk_factors["pci_compliance_failure"]
            ]
        else:
            risk_factors = [self.risk_factors["employee_training"]]
        
        return RiskScenario(
            scenario_id=f"{regulation_lower}_custom",
            name=f"{regulation.upper()} Risk Scenario",
            description=f"Risk assessment for {regulation.upper()} compliance",
            risk_factors=risk_factors,
            time_horizon=365
        )
    
    def _adjust_risk_factors(
        self,
        risk_factors: List[RiskFactor],
        organization_data: Dict[str, Any]
    ) -> List[RiskFactor]:
        """Adjust risk factor parameters based on organization data"""
        
        adjusted_factors = []
        
        for factor in risk_factors:
            # Create copy of factor
            adjusted_factor = RiskFactor(
                factor_id=factor.factor_id,
                name=factor.name,
                category=factor.category,
                description=factor.description,
                probability_distribution=factor.probability_distribution,
                probability_params=factor.probability_params.copy(),
                impact_distribution=factor.impact_distribution,
                impact_params=factor.impact_params.copy(),
                weight=factor.weight,
                dependencies=factor.dependencies.copy()
            )
            
            # Adjust based on organization characteristics
            org_size = organization_data.get("size", "medium")
            revenue = organization_data.get("annual_revenue", 10000000)
            maturity = organization_data.get("compliance_maturity", "medium")
            
            # Adjust probability based on maturity
            if maturity == "high":
                # Reduce probability for mature organizations
                if factor.probability_distribution == "beta":
                    adjusted_factor.probability_params["scale"] *= 0.7
            elif maturity == "low":
                # Increase probability for immature organizations
                if factor.probability_distribution == "beta":
                    adjusted_factor.probability_params["scale"] *= 1.5
            
            # Adjust impact based on organization size and revenue
            size_multiplier = {"small": 0.5, "medium": 1.0, "large": 2.0}.get(org_size, 1.0)
            revenue_multiplier = min(revenue / 10000000, 10)  # Cap at 10x
            
            for key in adjusted_factor.impact_params:
                adjusted_factor.impact_params[key] *= size_multiplier * revenue_multiplier
            
            adjusted_factors.append(adjusted_factor)
        
        return adjusted_factors
    
    async def _run_monte_carlo_simulation(
        self,
        risk_factors: List[RiskFactor],
        num_simulations: int = 10000,
        confidence_level: float = 0.95
    ) -> MonteCarloResult:
        """Run Monte Carlo simulation for risk assessment"""
        
        logger.info(f"Running Monte Carlo simulation with {num_simulations} iterations")
        
        # Initialize arrays for simulation results
        total_losses = np.zeros(num_simulations)
        factor_contributions = {factor.factor_id: np.zeros(num_simulations) for factor in risk_factors}
        
        # Run simulations
        for sim in range(num_simulations):
            simulation_loss = 0
            
            for factor in risk_factors:
                # Sample probability
                probability = self._sample_from_distribution(
                    factor.probability_distribution,
                    factor.probability_params
                )
                
                # Sample impact (if event occurs)
                impact = self._sample_from_distribution(
                    factor.impact_distribution,
                    factor.impact_params
                )
                
                # Determine if event occurs
                if np.random.random() < probability:
                    factor_loss = impact * factor.weight
                    simulation_loss += factor_loss
                    factor_contributions[factor.factor_id][sim] = factor_loss
            
            total_losses[sim] = simulation_loss
        
        # Calculate statistics
        mean_loss = np.mean(total_losses)
        median_loss = np.median(total_losses)
        std_loss = np.std(total_losses)
        
        # Calculate percentiles
        percentiles = {
            "5th": np.percentile(total_losses, 5),
            "10th": np.percentile(total_losses, 10),
            "25th": np.percentile(total_losses, 25),
            "50th": np.percentile(total_losses, 50),
            "75th": np.percentile(total_losses, 75),
            "90th": np.percentile(total_losses, 90),
            "95th": np.percentile(total_losses, 95),
            "99th": np.percentile(total_losses, 99)
        }
        
        # Calculate Value at Risk (VaR) and Expected Shortfall (ES)
        var_95 = np.percentile(total_losses, 95)
        var_99 = np.percentile(total_losses, 99)
        
        # Expected Shortfall (ES) - average loss beyond VaR
        es_95 = np.mean(total_losses[total_losses >= var_95])
        es_99 = np.mean(total_losses[total_losses >= var_99])
        
        # Calculate risk contributions
        risk_contributions = {}
        for factor_id, contributions in factor_contributions.items():
            risk_contributions[factor_id] = np.mean(contributions) / mean_loss if mean_loss > 0 else 0
        
        result = MonteCarloResult(
            scenario_id="monte_carlo_simulation",
            num_simulations=num_simulations,
            confidence_level=confidence_level,
            results={
                "total_simulations": num_simulations,
                "successful_simulations": num_simulations,
                "simulation_time": "completed"
            },
            risk_metrics={
                "var_95": var_95,
                "var_99": var_99,
                "expected_shortfall_95": es_95,
                "expected_shortfall_99": es_99,
                "probability_of_loss": np.sum(total_losses > 0) / num_simulations
            },
            percentiles=percentiles,
            distribution_stats={
                "mean": mean_loss,
                "median": median_loss,
                "std_dev": std_loss,
                "skewness": float(np.mean(((total_losses - mean_loss) / std_loss) ** 3)) if std_loss > 0 else 0,
                "kurtosis": float(np.mean(((total_losses - mean_loss) / std_loss) ** 4)) if std_loss > 0 else 0
            },
            risk_contributions=risk_contributions,
            simulation_data=total_losses
        )
        
        logger.info(f"Monte Carlo simulation completed - Mean loss: ${mean_loss:,.0f}")
        
        return result
    
    def _sample_from_distribution(
        self,
        distribution: str,
        params: Dict[str, float]
    ) -> float:
        """Sample value from specified probability distribution"""
        
        if distribution == "normal":
            return np.random.normal(params["mean"], params["std"])
        elif distribution == "beta":
            sample = np.random.beta(params["alpha"], params["beta"])
            return sample * params.get("scale", 1.0)
        elif distribution == "triangular":
            return np.random.triangular(params["left"], params["mode"], params["right"])
        elif distribution == "uniform":
            return np.random.uniform(params["low"], params["high"])
        elif distribution == "exponential":
            return np.random.exponential(params["scale"])
        elif distribution == "gamma":
            return np.random.gamma(params["shape"], params["scale"])
        else:
            # Default to normal distribution
            return np.random.normal(params.get("mean", 0), params.get("std", 1))
    
    def _calculate_overall_risk_score(
        self,
        monte_carlo_results: MonteCarloResult,
        risk_factors: List[RiskFactor]
    ) -> float:
        """Calculate overall risk score from Monte Carlo results"""
        
        # Normalize VaR 95 to a 0-100 scale
        var_95 = monte_carlo_results.risk_metrics["var_95"]
        
        # Create scale based on maximum possible impact
        max_possible_impact = sum(
            max(factor.impact_params.values()) * factor.weight
            for factor in risk_factors
        )
        
        if max_possible_impact > 0:
            risk_score = min((var_95 / max_possible_impact) * 100, 100)
        else:
            risk_score = 0
        
        return risk_score
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Determine risk level from risk score"""
        
        if risk_score < 10:
            return RiskLevel.VERY_LOW
        elif risk_score < 25:
            return RiskLevel.LOW
        elif risk_score < 50:
            return RiskLevel.MEDIUM
        elif risk_score < 75:
            return RiskLevel.HIGH
        elif risk_score < 90:
            return RiskLevel.VERY_HIGH
        else:
            return RiskLevel.CRITICAL
    
    def _generate_risk_recommendations(
        self,
        risk_factors: List[RiskFactor],
        monte_carlo_results: MonteCarloResult,
        organization_data: Dict[str, Any]
    ) -> List[str]:
        """Generate risk-based recommendations"""
        
        recommendations = []
        
        # Analyze risk contributions
        for factor_id, contribution in monte_carlo_results.risk_contributions.items():
            if contribution > 0.2:  # High contribution factors
                factor = next((f for f in risk_factors if f.factor_id == factor_id), None)
                if factor:
                    if factor.category == RiskCategory.REGULATORY:
                        recommendations.append(
                            f"HIGH PRIORITY: Address {factor.name} - contributes {contribution:.1%} to total risk"
                        )
                    elif factor.category == RiskCategory.OPERATIONAL:
                        recommendations.append(
                            f"Implement operational controls for {factor.name}"
                        )
        
        # VaR-based recommendations
        var_95 = monte_carlo_results.risk_metrics["var_95"]
        if var_95 > 1000000:  # $1M threshold
            recommendations.append(
                f"CRITICAL: 95% VaR of ${var_95:,.0f} requires immediate risk mitigation"
            )
        elif var_95 > 100000:  # $100K threshold
            recommendations.append(
                f"HIGH: 95% VaR of ${var_95:,.0f} requires enhanced controls"
            )
        
        # Probability-based recommendations
        prob_loss = monte_carlo_results.risk_metrics["probability_of_loss"]
        if prob_loss > 0.3:
            recommendations.append(
                f"High probability of compliance incidents ({prob_loss:.1%}) - strengthen preventive controls"
            )
        
        return recommendations
    
    def _generate_mitigation_strategies(
        self,
        risk_factors: List[RiskFactor],
        monte_carlo_results: MonteCarloResult
    ) -> List[Dict[str, Any]]:
        """Generate specific mitigation strategies"""
        
        strategies = []
        
        # Risk factor specific strategies
        for factor in risk_factors:
            contribution = monte_carlo_results.risk_contributions.get(factor.factor_id, 0)
            
            if contribution > 0.1:  # Significant contributors
                if "data_breach" in factor.factor_id:
                    strategies.append({
                        "risk_factor": factor.name,
                        "strategy": "Data Protection Enhancement",
                        "actions": [
                            "Implement advanced encryption",
                            "Deploy data loss prevention (DLP)",
                            "Enhance access controls",
                            "Increase security monitoring"
                        ],
                        "priority": "high" if contribution > 0.3 else "medium",
                        "estimated_cost": 100000 * contribution,
                        "risk_reduction": 60
                    })
                elif "training" in factor.factor_id:
                    strategies.append({
                        "risk_factor": factor.name,
                        "strategy": "Training and Awareness Program",
                        "actions": [
                            "Develop comprehensive training program",
                            "Implement regular assessments",
                            "Create awareness campaigns",
                            "Establish competency requirements"
                        ],
                        "priority": "medium",
                        "estimated_cost": 50000,
                        "risk_reduction": 40
                    })
                elif "controls" in factor.factor_id:
                    strategies.append({
                        "risk_factor": factor.name,
                        "strategy": "Internal Controls Strengthening",
                        "actions": [
                            "Redesign control framework",
                            "Implement automated controls",
                            "Enhance testing procedures",
                            "Improve documentation"
                        ],
                        "priority": "high",
                        "estimated_cost": 200000 * contribution,
                        "risk_reduction": 70
                    })
        
        return strategies
    
    def _calculate_confidence_score(
        self,
        organization_data: Dict[str, Any],
        risk_factors: List[RiskFactor]
    ) -> float:
        """Calculate confidence score for risk assessment"""
        
        confidence_factors = []
        
        # Data completeness
        required_fields = ["name", "size", "annual_revenue", "compliance_maturity"]
        completeness = sum(1 for field in required_fields if organization_data.get(field)) / len(required_fields)
        confidence_factors.append(completeness)
        
        # Risk factor coverage
        coverage = min(len(risk_factors) / 5, 1.0)  # Assume 5 is optimal
        confidence_factors.append(coverage)
        
        # Assessment recency (assume recent for new assessment)
        confidence_factors.append(1.0)
        
        return mean(confidence_factors)
    
    async def perform_scenario_analysis(
        self,
        base_scenario: RiskScenario,
        scenario_variations: List[Dict[str, Any]],
        num_simulations: int = 5000
    ) -> List[MonteCarloResult]:
        """Perform scenario analysis with different parameter variations"""
        
        logger.info(f"Performing scenario analysis with {len(scenario_variations)} variations")
        
        results = []
        
        for i, variation in enumerate(scenario_variations):
            # Create modified scenario
            modified_factors = []
            
            for factor in base_scenario.risk_factors:
                modified_factor = RiskFactor(
                    factor_id=factor.factor_id,
                    name=factor.name,
                    category=factor.category,
                    description=factor.description,
                    probability_distribution=factor.probability_distribution,
                    probability_params=factor.probability_params.copy(),
                    impact_distribution=factor.impact_distribution,
                    impact_params=factor.impact_params.copy(),
                    weight=factor.weight,
                    dependencies=factor.dependencies.copy()
                )
                
                # Apply variations
                if factor.factor_id in variation:
                    factor_variation = variation[factor.factor_id]
                    
                    # Modify probability parameters
                    if "probability_multiplier" in factor_variation:
                        multiplier = factor_variation["probability_multiplier"]
                        if "scale" in modified_factor.probability_params:
                            modified_factor.probability_params["scale"] *= multiplier
                    
                    # Modify impact parameters
                    if "impact_multiplier" in factor_variation:
                        multiplier = factor_variation["impact_multiplier"]
                        for key in modified_factor.impact_params:
                            modified_factor.impact_params[key] *= multiplier
                
                modified_factors.append(modified_factor)
            
            # Run simulation for this scenario
            result = await self._run_monte_carlo_simulation(
                modified_factors,
                num_simulations
            )
            result.scenario_id = f"{base_scenario.scenario_id}_variation_{i+1}"
            
            results.append(result)
        
        logger.info(f"Scenario analysis completed for {len(results)} scenarios")
        
        return results
    
    async def calculate_risk_appetite(
        self,
        organization_data: Dict[str, Any],
        financial_constraints: Dict[str, float]
    ) -> Dict[str, Any]:
        """Calculate organization's risk appetite and tolerance levels"""
        
        # Extract financial data
        annual_revenue = organization_data.get("annual_revenue", 10000000)
        profit_margin = organization_data.get("profit_margin", 0.1)
        risk_budget = financial_constraints.get("max_annual_risk_budget", annual_revenue * 0.02)
        
        # Calculate risk appetite metrics
        risk_appetite = {
            "maximum_single_loss": risk_budget * 0.5,  # 50% of risk budget
            "maximum_annual_aggregate": risk_budget,
            "acceptable_probability": 0.05,  # 5% acceptable probability of exceeding limits
            "risk_tolerance_levels": {
                "low_impact": risk_budget * 0.1,
                "medium_impact": risk_budget * 0.25,
                "high_impact": risk_budget * 0.5,
                "critical_impact": risk_budget
            },
            "regulatory_risk_limits": {
                "gdpr": min(annual_revenue * 0.04, 20000000),  # GDPR max penalty
                "hipaa": 1500000,  # HIPAA max penalty
                "sox": annual_revenue * 0.1,  # Estimated SOX impact
                "pci_dss": min(annual_revenue * 0.02, 5000000)  # PCI DSS estimated max
            }
        }
        
        return risk_appetite
