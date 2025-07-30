"""
Risk Assessment Framework

Comprehensive risk analysis algorithms including credit scoring, financial distress prediction,
market risk assessment, and portfolio risk management.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math
from scipy import stats
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
import warnings
warnings.filterwarnings('ignore')


class RiskType(str, Enum):
    """Types of financial risk"""
    CREDIT_RISK = "credit_risk"
    MARKET_RISK = "market_risk"
    LIQUIDITY_RISK = "liquidity_risk"
    OPERATIONAL_RISK = "operational_risk"
    CONCENTRATION_RISK = "concentration_risk"
    COUNTERPARTY_RISK = "counterparty_risk"
    SYSTEMIC_RISK = "systemic_risk"


class CreditRating(str, Enum):
    """Credit rating categories"""
    AAA = "AAA"
    AA = "AA"
    A = "A"
    BBB = "BBB"
    BB = "BB"
    B = "B"
    CCC = "CCC"
    CC = "CC"
    C = "C"
    D = "D"


class RiskLevel(str, Enum):
    """Risk level classifications"""
    VERY_LOW = "very_low"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"
    EXTREME = "extreme"


@dataclass
class CompanyRiskData:
    """Company data for risk assessment"""
    # Financial metrics
    current_ratio: float
    quick_ratio: float
    debt_to_equity: float
    debt_to_assets: float
    interest_coverage: float
    times_interest_earned: float
    
    # Profitability metrics
    roa: float
    roe: float
    gross_margin: float
    operating_margin: float
    net_margin: float
    
    # Market metrics
    market_cap: float
    enterprise_value: float
    price_to_book: float
    price_to_earnings: float
    beta: float
    
    # Cash flow metrics
    operating_cash_flow: float
    free_cash_flow: float
    cash_conversion_cycle: float
    
    # Additional factors
    revenue_growth: float
    earnings_volatility: float
    industry_risk_score: float
    management_quality_score: float
    
    # Historical data
    financial_history_years: int = 5
    bankruptcy_history: bool = False
    default_history: bool = False
    audit_issues: bool = False


@dataclass
class RiskAssessmentResult:
    """Risk assessment result structure"""
    overall_risk_score: float
    risk_level: RiskLevel
    credit_rating: CreditRating
    probability_of_default: float
    
    # Risk component scores
    credit_risk_score: float
    market_risk_score: float
    liquidity_risk_score: float
    operational_risk_score: float
    
    # Risk factors
    key_risk_factors: List[str]
    risk_mitigation_suggestions: List[str]
    
    # Confidence metrics (must come before optional fields)
    assessment_confidence: float
    data_quality_score: float
    
    # Detailed analysis
    risk_breakdown: Dict[str, Any]
    stress_test_results: Optional[Dict[str, Any]] = None


@dataclass
class PortfolioRiskData:
    """Portfolio data for risk assessment"""
    positions: List[Dict[str, Any]]
    correlations: np.ndarray
    risk_free_rate: float
    market_return: float
    portfolio_value: float
    
    # Position details should include:
    # - asset_id, weight, expected_return, volatility, beta
    benchmark_weights: Optional[List[float]] = None


class RiskAssessmentEngine:
    """Comprehensive risk assessment and credit scoring engine"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.models = {}
        self._initialize_risk_models()
        
        # Risk thresholds
        self.risk_thresholds = {
            RiskLevel.VERY_LOW: (0, 20),
            RiskLevel.LOW: (20, 40),
            RiskLevel.MODERATE: (40, 60),
            RiskLevel.HIGH: (60, 80),
            RiskLevel.VERY_HIGH: (80, 95),
            RiskLevel.EXTREME: (95, 100)
        }
        
        # Credit rating mapping
        self.credit_rating_mapping = {
            (0, 5): CreditRating.AAA,
            (5, 15): CreditRating.AA,
            (15, 25): CreditRating.A,
            (25, 40): CreditRating.BBB,
            (40, 60): CreditRating.BB,
            (60, 80): CreditRating.B,
            (80, 90): CreditRating.CCC,
            (90, 95): CreditRating.CC,
            (95, 98): CreditRating.C,
            (98, 100): CreditRating.D
        }
    
    def assess_company_risk(self, company_data: CompanyRiskData,
                          include_stress_testing: bool = True) -> RiskAssessmentResult:
        """
        Comprehensive company risk assessment
        
        Args:
            company_data: Company financial and risk data
            include_stress_testing: Whether to include stress testing
            
        Returns:
            Comprehensive risk assessment results
        """
        
        # Calculate individual risk components
        credit_risk = self._assess_credit_risk(company_data)
        market_risk = self._assess_market_risk(company_data)
        liquidity_risk = self._assess_liquidity_risk(company_data)
        operational_risk = self._assess_operational_risk(company_data)
        
        # Calculate overall risk score
        overall_risk_score = self._calculate_overall_risk_score(
            credit_risk, market_risk, liquidity_risk, operational_risk
        )
        
        # Determine risk level and credit rating
        risk_level = self._determine_risk_level(overall_risk_score)
        credit_rating = self._determine_credit_rating(overall_risk_score)
        
        # Calculate probability of default
        probability_of_default = self._calculate_probability_of_default(company_data)
        
        # Identify key risk factors
        key_risk_factors = self._identify_key_risk_factors(company_data)
        
        # Generate risk mitigation suggestions
        risk_mitigation = self._generate_risk_mitigation_suggestions(company_data)
        
        # Detailed risk breakdown
        risk_breakdown = self._create_risk_breakdown(
            company_data, credit_risk, market_risk, liquidity_risk, operational_risk
        )
        
        # Stress testing if requested
        stress_test_results = None
        if include_stress_testing:
            stress_test_results = self._perform_stress_testing(company_data)
        
        # Assessment confidence
        assessment_confidence = self._calculate_assessment_confidence(company_data)
        data_quality_score = self._assess_data_quality(company_data)
        
        return RiskAssessmentResult(
            overall_risk_score=overall_risk_score,
            risk_level=risk_level,
            credit_rating=credit_rating,
            probability_of_default=probability_of_default,
            credit_risk_score=credit_risk["score"],
            market_risk_score=market_risk["score"],
            liquidity_risk_score=liquidity_risk["score"],
            operational_risk_score=operational_risk["score"],
            key_risk_factors=key_risk_factors,
            risk_mitigation_suggestions=risk_mitigation,
            risk_breakdown=risk_breakdown,
            stress_test_results=stress_test_results,
            assessment_confidence=assessment_confidence,
            data_quality_score=data_quality_score
        )
    
    def credit_scoring_model(self, company_data: CompanyRiskData) -> Dict[str, Any]:
        """
        Advanced credit scoring using machine learning models
        
        Args:
            company_data: Company data for credit assessment
            
        Returns:
            Credit scoring results with multiple model predictions
        """
        
        # Prepare features for ML models
        features = self._prepare_credit_features(company_data)
        
        # Get predictions from multiple models
        predictions = {}
        
        for model_name, model in self.models.items():
            if hasattr(model, 'predict_proba'):
                prob = model.predict_proba([features])[0]
                predictions[model_name] = {
                    "probability_of_default": prob[1] if len(prob) > 1 else prob[0],
                    "credit_score": max(0, min(100, (1 - prob[1]) * 100)) if len(prob) > 1 else 50
                }
            else:
                score = model.predict([features])[0]
                predictions[model_name] = {
                    "credit_score": max(0, min(100, score)),
                    "probability_of_default": max(0, min(1, (100 - score) / 100))
                }
        
        # Ensemble prediction
        ensemble_score = np.mean([pred["credit_score"] for pred in predictions.values()])
        ensemble_pod = np.mean([pred["probability_of_default"] for pred in predictions.values()])
        
        # Feature importance analysis
        feature_importance = self._analyze_feature_importance(features, company_data)
        
        return {
            "ensemble_credit_score": ensemble_score,
            "ensemble_probability_of_default": ensemble_pod,
            "individual_model_predictions": predictions,
            "feature_importance": feature_importance,
            "credit_grade": self._score_to_grade(ensemble_score),
            "risk_factors": self._identify_credit_risk_factors(company_data, features)
        }
    
    def portfolio_risk_analysis(self, portfolio_data: PortfolioRiskData) -> Dict[str, Any]:
        """
        Comprehensive portfolio risk analysis
        
        Args:
            portfolio_data: Portfolio positions and market data
            
        Returns:
            Portfolio risk metrics and analysis
        """
        
        # Extract portfolio information
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        returns = np.array([pos["expected_return"] for pos in portfolio_data.positions])
        volatilities = np.array([pos["volatility"] for pos in portfolio_data.positions])
        
        # Portfolio return and risk
        portfolio_return = np.sum(weights * returns)
        portfolio_variance = np.dot(weights, np.dot(portfolio_data.correlations * np.outer(volatilities, volatilities), weights))
        portfolio_volatility = np.sqrt(portfolio_variance)
        
        # Sharpe ratio
        sharpe_ratio = (portfolio_return - portfolio_data.risk_free_rate) / portfolio_volatility
        
        # Value at Risk (VaR)
        var_95 = self._calculate_portfolio_var(
            portfolio_return, portfolio_volatility, confidence_level=0.95
        )
        var_99 = self._calculate_portfolio_var(
            portfolio_return, portfolio_volatility, confidence_level=0.99
        )
        
        # Expected Shortfall (Conditional VaR)
        es_95 = self._calculate_expected_shortfall(
            portfolio_return, portfolio_volatility, confidence_level=0.95
        )
        es_99 = self._calculate_expected_shortfall(
            portfolio_return, portfolio_volatility, confidence_level=0.99
        )
        
        # Maximum drawdown
        max_drawdown = self._calculate_max_drawdown(portfolio_data)
        
        # Beta analysis
        portfolio_beta = self._calculate_portfolio_beta(portfolio_data)
        
        # Concentration risk
        concentration_risk = self._assess_concentration_risk(weights)
        
        # Risk attribution
        risk_attribution = self._calculate_risk_attribution(
            weights, volatilities, portfolio_data.correlations
        )
        
        # Stress testing
        stress_scenarios = self._portfolio_stress_testing(portfolio_data)
        
        return {
            "portfolio_metrics": {
                "expected_return": portfolio_return,
                "volatility": portfolio_volatility,
                "sharpe_ratio": sharpe_ratio,
                "portfolio_beta": portfolio_beta
            },
            "risk_metrics": {
                "var_95": var_95,
                "var_99": var_99,
                "expected_shortfall_95": es_95,
                "expected_shortfall_99": es_99,
                "max_drawdown": max_drawdown
            },
            "risk_attribution": risk_attribution,
            "concentration_analysis": concentration_risk,
            "stress_test_results": stress_scenarios,
            "risk_recommendations": self._generate_portfolio_risk_recommendations(portfolio_data)
        }
    
    def market_risk_assessment(self, portfolio_data: PortfolioRiskData,
                             risk_factors: Dict[str, float]) -> Dict[str, Any]:
        """
        Market risk assessment including factor exposures
        
        Args:
            portfolio_data: Portfolio data
            risk_factors: Market risk factor sensitivities
            
        Returns:
            Market risk analysis results
        """
        
        # Factor risk analysis
        factor_exposures = self._calculate_factor_exposures(portfolio_data, risk_factors)
        
        # Systematic vs idiosyncratic risk
        systematic_risk, idiosyncratic_risk = self._decompose_portfolio_risk(portfolio_data)
        
        # Tracking error (if benchmark provided)
        tracking_error = self._calculate_tracking_error(portfolio_data)
        
        # Risk scenarios
        scenario_analysis = self._market_scenario_analysis(portfolio_data, risk_factors)
        
        return {
            "factor_exposures": factor_exposures,
            "risk_decomposition": {
                "systematic_risk": systematic_risk,
                "idiosyncratic_risk": idiosyncratic_risk,
                "systematic_percentage": systematic_risk / (systematic_risk + idiosyncratic_risk) * 100
            },
            "tracking_error": tracking_error,
            "scenario_analysis": scenario_analysis,
            "risk_budget": self._calculate_risk_budget(portfolio_data)
        }
    
    def _initialize_risk_models(self):
        """Initialize machine learning models for risk assessment"""
        
        # This would typically be trained on historical data
        # For demonstration, we'll create placeholder models
        
        # Random Forest for credit scoring
        self.models["random_forest"] = RandomForestClassifier(
            n_estimators=100, random_state=42
        )
        
        # Gradient Boosting for default prediction
        self.models["gradient_boosting"] = GradientBoostingClassifier(
            n_estimators=100, random_state=42
        )
        
        # Logistic Regression for bankruptcy prediction
        self.models["logistic_regression"] = LogisticRegression(
            random_state=42
        )
        
        # Note: In practice, these models would be trained on historical data
        # with features like financial ratios and target variables like defaults
    
    def _assess_credit_risk(self, company_data: CompanyRiskData) -> Dict[str, Any]:
        """Assess credit risk based on financial metrics"""
        
        scores = {}
        
        # Leverage ratios
        debt_to_equity_score = min(100, max(0, (1 - company_data.debt_to_equity / 2) * 100))
        debt_to_assets_score = min(100, max(0, (1 - company_data.debt_to_assets) * 100))
        scores["leverage"] = (debt_to_equity_score + debt_to_assets_score) / 2
        
        # Coverage ratios
        interest_coverage_score = min(100, max(0, company_data.interest_coverage * 10))
        if company_data.times_interest_earned > 0:
            times_earned_score = min(100, max(0, company_data.times_interest_earned * 10))
        else:
            times_earned_score = 0
        scores["coverage"] = (interest_coverage_score + times_earned_score) / 2
        
        # Profitability
        roa_score = min(100, max(0, company_data.roa * 1000))  # Assuming ROA in decimal
        roe_score = min(100, max(0, company_data.roe * 500))
        scores["profitability"] = (roa_score + roe_score) / 2
        
        # Cash flow
        if company_data.operating_cash_flow > 0:
            ocf_score = min(100, 70)  # Positive OCF gets good score
        else:
            ocf_score = 10
        
        if company_data.free_cash_flow > 0:
            fcf_score = min(100, 70)
        else:
            fcf_score = 10
        scores["cash_flow"] = (ocf_score + fcf_score) / 2
        
        # Historical factors
        history_penalty = 0
        if company_data.bankruptcy_history:
            history_penalty += 30
        if company_data.default_history:
            history_penalty += 25
        if company_data.audit_issues:
            history_penalty += 15
        
        scores["historical"] = max(0, 100 - history_penalty)
        
        # Overall credit risk score (lower is better for risk)
        overall_score = np.mean(list(scores.values()))
        credit_risk_score = 100 - overall_score  # Convert to risk score
        
        return {
            "score": credit_risk_score,
            "components": scores,
            "risk_level": self._score_to_risk_level(credit_risk_score),
            "key_factors": self._identify_credit_risk_drivers(scores)
        }
    
    def _assess_market_risk(self, company_data: CompanyRiskData) -> Dict[str, Any]:
        """Assess market risk factors"""
        
        scores = {}
        
        # Beta risk
        if abs(company_data.beta) > 2:
            beta_score = 80  # High beta = high market risk
        elif abs(company_data.beta) > 1.5:
            beta_score = 60
        elif abs(company_data.beta) > 1:
            beta_score = 40
        else:
            beta_score = 20
        scores["beta_risk"] = beta_score
        
        # Valuation risk
        if company_data.price_to_earnings > 30:
            pe_score = 70
        elif company_data.price_to_earnings > 20:
            pe_score = 50
        elif company_data.price_to_earnings > 15:
            pe_score = 30
        else:
            pe_score = 20
        scores["valuation_risk"] = pe_score
        
        # Size risk (smaller companies = higher risk)
        if company_data.market_cap < 100000000:  # < $100M
            size_score = 70
        elif company_data.market_cap < 1000000000:  # < $1B
            size_score = 50
        elif company_data.market_cap < 10000000000:  # < $10B
            size_score = 30
        else:
            size_score = 20
        scores["size_risk"] = size_score
        
        # Earnings volatility
        volatility_score = min(80, company_data.earnings_volatility * 100)
        scores["earnings_volatility"] = volatility_score
        
        # Industry risk
        scores["industry_risk"] = company_data.industry_risk_score
        
        overall_score = np.mean(list(scores.values()))
        
        return {
            "score": overall_score,
            "components": scores,
            "risk_level": self._score_to_risk_level(overall_score),
            "key_factors": ["Beta exposure", "Valuation multiples", "Market cap", "Industry factors"]
        }
    
    def _assess_liquidity_risk(self, company_data: CompanyRiskData) -> Dict[str, Any]:
        """Assess liquidity risk"""
        
        scores = {}
        
        # Current ratio
        if company_data.current_ratio < 1:
            current_score = 80
        elif company_data.current_ratio < 1.5:
            current_score = 50
        elif company_data.current_ratio < 2:
            current_score = 30
        else:
            current_score = 20
        scores["current_ratio"] = current_score
        
        # Quick ratio
        if company_data.quick_ratio < 0.5:
            quick_score = 80
        elif company_data.quick_ratio < 1:
            quick_score = 50
        elif company_data.quick_ratio < 1.5:
            quick_score = 30
        else:
            quick_score = 20
        scores["quick_ratio"] = quick_score
        
        # Cash conversion cycle
        if company_data.cash_conversion_cycle > 90:
            ccc_score = 70
        elif company_data.cash_conversion_cycle > 60:
            ccc_score = 50
        elif company_data.cash_conversion_cycle > 30:
            ccc_score = 30
        else:
            ccc_score = 20
        scores["cash_conversion"] = ccc_score
        
        # Free cash flow
        if company_data.free_cash_flow < 0:
            fcf_score = 80
        elif company_data.free_cash_flow < company_data.operating_cash_flow * 0.5:
            fcf_score = 50
        else:
            fcf_score = 20
        scores["free_cash_flow"] = fcf_score
        
        overall_score = np.mean(list(scores.values()))
        
        return {
            "score": overall_score,
            "components": scores,
            "risk_level": self._score_to_risk_level(overall_score),
            "key_factors": ["Working capital management", "Cash generation", "Liquidity ratios"]
        }
    
    def _assess_operational_risk(self, company_data: CompanyRiskData) -> Dict[str, Any]:
        """Assess operational risk factors"""
        
        scores = {}
        
        # Management quality
        scores["management_quality"] = 100 - company_data.management_quality_score
        
        # Revenue volatility/growth
        if company_data.revenue_growth < -10:
            growth_score = 80
        elif company_data.revenue_growth < 0:
            growth_score = 60
        elif company_data.revenue_growth < 5:
            growth_score = 40
        elif company_data.revenue_growth < 15:
            growth_score = 30
        else:
            growth_score = 20
        scores["revenue_growth"] = growth_score
        
        # Margin stability
        margin_volatility = company_data.earnings_volatility  # Proxy for margin volatility
        scores["margin_stability"] = min(80, margin_volatility * 100)
        
        # Business model risk (industry-specific)
        scores["business_model"] = company_data.industry_risk_score
        
        # Data quality/reporting
        if company_data.audit_issues:
            reporting_score = 70
        elif company_data.financial_history_years < 3:
            reporting_score = 50
        else:
            reporting_score = 20
        scores["reporting_quality"] = reporting_score
        
        overall_score = np.mean(list(scores.values()))
        
        return {
            "score": overall_score,
            "components": scores,
            "risk_level": self._score_to_risk_level(overall_score),
            "key_factors": ["Management effectiveness", "Business model stability", "Operational efficiency"]
        }
    
    def _calculate_overall_risk_score(self, credit_risk: Dict[str, Any],
                                    market_risk: Dict[str, Any],
                                    liquidity_risk: Dict[str, Any],
                                    operational_risk: Dict[str, Any]) -> float:
        """Calculate weighted overall risk score"""
        
        # Risk component weights
        weights = {
            "credit": 0.35,
            "market": 0.25,
            "liquidity": 0.25,
            "operational": 0.15
        }
        
        overall_score = (
            credit_risk["score"] * weights["credit"] +
            market_risk["score"] * weights["market"] +
            liquidity_risk["score"] * weights["liquidity"] +
            operational_risk["score"] * weights["operational"]
        )
        
        return overall_score
    
    def _calculate_probability_of_default(self, company_data: CompanyRiskData) -> float:
        """Calculate probability of default using multiple approaches"""
        
        # Simplified Merton model approach
        # In practice, would use more sophisticated models like KMV or CreditMetrics
        
        # Z-score (Altman's)
        z_score = self._calculate_altman_z_score(company_data)
        
        # Convert Z-score to probability of default
        if z_score > 2.99:
            pod_zscore = 0.02
        elif z_score > 1.8:
            pod_zscore = 0.05
        elif z_score > 1.23:
            pod_zscore = 0.15
        else:
            pod_zscore = 0.35
        
        # Distance to default approach (simplified)
        dd = self._calculate_distance_to_default(company_data)
        pod_dd = stats.norm.cdf(-dd)
        
        # Average the approaches
        pod = (pod_zscore + pod_dd) / 2
        
        return min(0.99, max(0.001, pod))  # Cap between 0.1% and 99%
    
    def _calculate_altman_z_score(self, company_data: CompanyRiskData) -> float:
        """Calculate Altman Z-Score for bankruptcy prediction"""
        
        # Altman Z-Score = 1.2*A + 1.4*B + 3.3*C + 0.6*D + 1.0*E
        # A = Working Capital / Total Assets
        # B = Retained Earnings / Total Assets (approximated)
        # C = EBIT / Total Assets
        # D = Market Value of Equity / Total Debt
        # E = Sales / Total Assets
        
        # We'll need to approximate some values
        total_assets = 1  # Normalized
        
        # Working capital ratio
        wc_ratio = company_data.current_ratio - 1  # Approximation
        
        # Retained earnings ratio (approximated using ROA)
        re_ratio = company_data.roa * 2  # Rough approximation
        
        # EBIT ratio (approximated using operating margin)
        ebit_ratio = company_data.operating_margin
        
        # Market value ratio
        if company_data.debt_to_equity > 0:
            mv_ratio = 1 / company_data.debt_to_equity
        else:
            mv_ratio = 10  # Very high if no debt
        
        # Sales ratio (approximated)
        sales_ratio = 1.5  # Typical sales/assets ratio
        
        z_score = (
            1.2 * wc_ratio +
            1.4 * re_ratio +
            3.3 * ebit_ratio +
            0.6 * mv_ratio +
            1.0 * sales_ratio
        )
        
        return z_score
    
    def _calculate_distance_to_default(self, company_data: CompanyRiskData) -> float:
        """Calculate distance to default (simplified Merton model)"""
        
        # Simplified calculation
        # In practice, would need more detailed balance sheet data
        
        asset_value = company_data.market_cap + company_data.enterprise_value - company_data.market_cap
        debt_value = asset_value * company_data.debt_to_assets
        
        # Asset volatility (approximated from equity volatility)
        equity_vol = 0.3  # Assumed 30% equity volatility
        leverage = debt_value / asset_value if asset_value > 0 else 0
        asset_vol = equity_vol / (1 + leverage) if leverage < 1 else equity_vol
        
        # Distance to default
        if debt_value > 0 and asset_vol > 0:
            dd = (np.log(asset_value / debt_value) + 0.05) / asset_vol  # 5% risk-free rate assumed
        else:
            dd = 5  # High distance if no debt
        
        return max(0.1, min(10, dd))  # Cap between reasonable bounds
    
    def _determine_risk_level(self, risk_score: float) -> RiskLevel:
        """Determine risk level from score"""
        for level, (min_score, max_score) in self.risk_thresholds.items():
            if min_score <= risk_score < max_score:
                return level
        return RiskLevel.EXTREME
    
    def _determine_credit_rating(self, risk_score: float) -> CreditRating:
        """Determine credit rating from risk score"""
        for (min_score, max_score), rating in self.credit_rating_mapping.items():
            if min_score <= risk_score < max_score:
                return rating
        return CreditRating.D
    
    def _identify_key_risk_factors(self, company_data: CompanyRiskData) -> List[str]:
        """Identify the most significant risk factors"""
        risk_factors = []
        
        # Financial distress indicators
        if company_data.debt_to_equity > 2:
            risk_factors.append("High leverage (D/E > 2.0)")
        
        if company_data.current_ratio < 1:
            risk_factors.append("Liquidity concerns (Current ratio < 1.0)")
        
        if company_data.interest_coverage < 2:
            risk_factors.append("Weak interest coverage")
        
        if company_data.free_cash_flow < 0:
            risk_factors.append("Negative free cash flow")
        
        if company_data.roa < 0:
            risk_factors.append("Negative return on assets")
        
        # Market risks
        if abs(company_data.beta) > 1.5:
            risk_factors.append("High market beta")
        
        if company_data.price_to_earnings > 25:
            risk_factors.append("High valuation multiples")
        
        # Operational risks
        if company_data.revenue_growth < -5:
            risk_factors.append("Declining revenues")
        
        if company_data.earnings_volatility > 0.3:
            risk_factors.append("High earnings volatility")
        
        # Historical issues
        if company_data.bankruptcy_history:
            risk_factors.append("History of bankruptcy")
        
        if company_data.default_history:
            risk_factors.append("History of defaults")
        
        return risk_factors[:5]  # Return top 5 risk factors
    
    def _generate_risk_mitigation_suggestions(self, company_data: CompanyRiskData) -> List[str]:
        """Generate risk mitigation recommendations"""
        suggestions = []
        
        # Leverage management
        if company_data.debt_to_equity > 1.5:
            suggestions.append("Reduce debt levels through equity financing or debt repayment")
        
        # Liquidity improvement
        if company_data.current_ratio < 1.5:
            suggestions.append("Improve working capital management and liquidity position")
        
        # Profitability enhancement
        if company_data.roa < 0.05:
            suggestions.append("Focus on improving operational efficiency and profitability")
        
        # Cash flow management
        if company_data.free_cash_flow < 0:
            suggestions.append("Optimize cash flow through better receivables and inventory management")
        
        # Market risk mitigation
        if abs(company_data.beta) > 1.5:
            suggestions.append("Consider diversification to reduce market sensitivity")
        
        # Operational improvements
        if company_data.earnings_volatility > 0.2:
            suggestions.append("Implement measures to stabilize earnings and reduce volatility")
        
        return suggestions
    
    def _create_risk_breakdown(self, company_data: CompanyRiskData,
                             credit_risk: Dict[str, Any],
                             market_risk: Dict[str, Any],
                             liquidity_risk: Dict[str, Any],
                             operational_risk: Dict[str, Any]) -> Dict[str, Any]:
        """Create detailed risk breakdown"""
        
        return {
            "credit_risk": {
                "score": credit_risk["score"],
                "level": credit_risk["risk_level"],
                "components": credit_risk["components"],
                "weight": 0.35
            },
            "market_risk": {
                "score": market_risk["score"],
                "level": market_risk["risk_level"],
                "components": market_risk["components"],
                "weight": 0.25
            },
            "liquidity_risk": {
                "score": liquidity_risk["score"],
                "level": liquidity_risk["risk_level"],
                "components": liquidity_risk["components"],
                "weight": 0.25
            },
            "operational_risk": {
                "score": operational_risk["score"],
                "level": operational_risk["risk_level"],
                "components": operational_risk["components"],
                "weight": 0.15
            }
        }
    
    def _perform_stress_testing(self, company_data: CompanyRiskData) -> Dict[str, Any]:
        """Perform stress testing scenarios"""
        
        stress_scenarios = {}
        
        # Economic recession scenario
        recession_data = self._apply_recession_stress(company_data)
        recession_assessment = self.assess_company_risk(recession_data, include_stress_testing=False)
        stress_scenarios["recession"] = {
            "scenario": "Economic recession (30% revenue decline, 50% margin compression)",
            "risk_score": recession_assessment.overall_risk_score,
            "probability_of_default": recession_assessment.probability_of_default,
            "credit_rating": recession_assessment.credit_rating
        }
        
        # Interest rate shock
        interest_shock_data = self._apply_interest_rate_shock(company_data)
        interest_assessment = self.assess_company_risk(interest_shock_data, include_stress_testing=False)
        stress_scenarios["interest_rate_shock"] = {
            "scenario": "Interest rate increase (+300 bps)",
            "risk_score": interest_assessment.overall_risk_score,
            "probability_of_default": interest_assessment.probability_of_default,
            "credit_rating": interest_assessment.credit_rating
        }
        
        # Liquidity crisis
        liquidity_crisis_data = self._apply_liquidity_stress(company_data)
        liquidity_assessment = self.assess_company_risk(liquidity_crisis_data, include_stress_testing=False)
        stress_scenarios["liquidity_crisis"] = {
            "scenario": "Liquidity crisis (50% reduction in available credit)",
            "risk_score": liquidity_assessment.overall_risk_score,
            "probability_of_default": liquidity_assessment.probability_of_default,
            "credit_rating": liquidity_assessment.credit_rating
        }
        
        return stress_scenarios
    
    def _apply_recession_stress(self, company_data: CompanyRiskData) -> CompanyRiskData:
        """Apply recession stress scenario"""
        stressed_data = company_data
        
        # Revenue decline
        stressed_data.revenue_growth = -30
        
        # Margin compression
        stressed_data.gross_margin *= 0.5
        stressed_data.operating_margin *= 0.3
        stressed_data.net_margin *= 0.2
        
        # Profitability impact
        stressed_data.roa *= 0.3
        stressed_data.roe *= 0.3
        
        # Cash flow impact
        stressed_data.operating_cash_flow *= 0.4
        stressed_data.free_cash_flow *= 0.2
        
        # Market impact
        stressed_data.market_cap *= 0.6
        stressed_data.enterprise_value *= 0.6
        
        return stressed_data
    
    def _apply_interest_rate_shock(self, company_data: CompanyRiskData) -> CompanyRiskData:
        """Apply interest rate shock scenario"""
        stressed_data = company_data
        
        # Interest coverage deterioration
        stressed_data.interest_coverage *= 0.7
        stressed_data.times_interest_earned *= 0.7
        
        # Valuation impact
        stressed_data.price_to_earnings *= 0.8
        stressed_data.price_to_book *= 0.8
        
        # Market cap impact
        stressed_data.market_cap *= 0.85
        
        return stressed_data
    
    def _apply_liquidity_stress(self, company_data: CompanyRiskData) -> CompanyRiskData:
        """Apply liquidity stress scenario"""
        stressed_data = company_data
        
        # Liquidity ratios deterioration
        stressed_data.current_ratio *= 0.7
        stressed_data.quick_ratio *= 0.6
        
        # Cash conversion cycle extension
        stressed_data.cash_conversion_cycle *= 1.5
        
        # Cash flow reduction
        stressed_data.operating_cash_flow *= 0.7
        stressed_data.free_cash_flow *= 0.5
        
        return stressed_data
    
    def _calculate_assessment_confidence(self, company_data: CompanyRiskData) -> float:
        """Calculate confidence in risk assessment"""
        confidence_factors = []
        
        # Data history
        if company_data.financial_history_years >= 5:
            confidence_factors.append(0.9)
        elif company_data.financial_history_years >= 3:
            confidence_factors.append(0.7)
        else:
            confidence_factors.append(0.5)
        
        # Audit quality
        if not company_data.audit_issues:
            confidence_factors.append(0.9)
        else:
            confidence_factors.append(0.6)
        
        # Data completeness (check for missing values)
        completeness = 1.0  # Assume complete for this example
        confidence_factors.append(completeness)
        
        return np.mean(confidence_factors)
    
    def _assess_data_quality(self, company_data: CompanyRiskData) -> float:
        """Assess quality of input data"""
        quality_score = 100
        
        # Penalize for audit issues
        if company_data.audit_issues:
            quality_score -= 20
        
        # Penalize for short history
        if company_data.financial_history_years < 3:
            quality_score -= 15
        
        # Penalize for extreme values (data quality check)
        if company_data.debt_to_equity > 10:
            quality_score -= 10
        
        if abs(company_data.roa) > 1:  # ROA > 100% seems unrealistic
            quality_score -= 10
        
        return max(0, quality_score)
    
    def _prepare_credit_features(self, company_data: CompanyRiskData) -> List[float]:
        """Prepare features for machine learning models"""
        return [
            company_data.current_ratio,
            company_data.quick_ratio,
            company_data.debt_to_equity,
            company_data.debt_to_assets,
            company_data.interest_coverage,
            company_data.roa,
            company_data.roe,
            company_data.gross_margin,
            company_data.operating_margin,
            company_data.net_margin,
            np.log(company_data.market_cap) if company_data.market_cap > 0 else 0,
            company_data.beta,
            company_data.revenue_growth,
            company_data.earnings_volatility,
            company_data.industry_risk_score,
            int(company_data.bankruptcy_history),
            int(company_data.default_history),
            int(company_data.audit_issues)
        ]
    
    def _analyze_feature_importance(self, features: List[float],
                                  company_data: CompanyRiskData) -> Dict[str, float]:
        """Analyze feature importance for credit scoring"""
        
        feature_names = [
            "current_ratio", "quick_ratio", "debt_to_equity", "debt_to_assets",
            "interest_coverage", "roa", "roe", "gross_margin", "operating_margin",
            "net_margin", "log_market_cap", "beta", "revenue_growth",
            "earnings_volatility", "industry_risk", "bankruptcy_history",
            "default_history", "audit_issues"
        ]
        
        # Simplified importance based on risk contribution
        importance_weights = {
            "debt_to_equity": 0.15,
            "interest_coverage": 0.12,
            "current_ratio": 0.10,
            "roa": 0.10,
            "operating_margin": 0.08,
            "quick_ratio": 0.08,
            "debt_to_assets": 0.07,
            "roe": 0.06,
            "earnings_volatility": 0.05,
            "bankruptcy_history": 0.05,
            "default_history": 0.04,
            "revenue_growth": 0.04,
            "industry_risk": 0.03,
            "audit_issues": 0.03
        }
        
        return importance_weights
    
    def _identify_credit_risk_factors(self, company_data: CompanyRiskData,
                                    features: List[float]) -> List[str]:
        """Identify key credit risk factors"""
        risk_factors = []
        
        if company_data.debt_to_equity > 2:
            risk_factors.append("Excessive leverage")
        
        if company_data.interest_coverage < 2:
            risk_factors.append("Weak debt service capacity")
        
        if company_data.current_ratio < 1:
            risk_factors.append("Liquidity constraints")
        
        if company_data.roa < 0:
            risk_factors.append("Poor asset utilization")
        
        if company_data.free_cash_flow < 0:
            risk_factors.append("Negative cash generation")
        
        return risk_factors
    
    def _score_to_grade(self, score: float) -> str:
        """Convert credit score to letter grade"""
        if score >= 90:
            return "A+"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B+"
        elif score >= 60:
            return "B"
        elif score >= 50:
            return "C+"
        elif score >= 40:
            return "C"
        elif score >= 30:
            return "D+"
        elif score >= 20:
            return "D"
        else:
            return "F"
    
    def _score_to_risk_level(self, score: float) -> str:
        """Convert risk score to risk level"""
        if score < 20:
            return "Very Low"
        elif score < 40:
            return "Low"
        elif score < 60:
            return "Moderate"
        elif score < 80:
            return "High"
        else:
            return "Very High"
    
    def _identify_credit_risk_drivers(self, component_scores: Dict[str, float]) -> List[str]:
        """Identify main credit risk drivers"""
        sorted_components = sorted(component_scores.items(), key=lambda x: x[1], reverse=True)
        return [comp[0] for comp in sorted_components[:3]]
    
    # Portfolio risk methods
    def _calculate_portfolio_var(self, portfolio_return: float,
                               portfolio_volatility: float,
                               confidence_level: float) -> float:
        """Calculate portfolio Value at Risk"""
        z_score = stats.norm.ppf(1 - confidence_level)
        var = -(portfolio_return + z_score * portfolio_volatility)
        return var
    
    def _calculate_expected_shortfall(self, portfolio_return: float,
                                    portfolio_volatility: float,
                                    confidence_level: float) -> float:
        """Calculate Expected Shortfall (Conditional VaR)"""
        z_score = stats.norm.ppf(1 - confidence_level)
        es = -(portfolio_return - portfolio_volatility * stats.norm.pdf(z_score) / (1 - confidence_level))
        return es
    
    def _calculate_max_drawdown(self, portfolio_data: PortfolioRiskData) -> float:
        """Calculate maximum drawdown (simplified)"""
        # This would typically require historical return data
        # For now, return an estimated drawdown based on volatility
        estimated_vol = np.mean([pos["volatility"] for pos in portfolio_data.positions])
        return estimated_vol * 2  # Rough approximation
    
    def _calculate_portfolio_beta(self, portfolio_data: PortfolioRiskData) -> float:
        """Calculate portfolio beta"""
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        betas = np.array([pos.get("beta", 1.0) for pos in portfolio_data.positions])
        return np.sum(weights * betas)
    
    def _assess_concentration_risk(self, weights: np.ndarray) -> Dict[str, Any]:
        """Assess portfolio concentration risk"""
        # Herfindahl-Hirschman Index
        hhi = np.sum(weights**2)
        
        # Effective number of positions
        effective_positions = 1 / hhi if hhi > 0 else 0
        
        # Maximum weight
        max_weight = np.max(weights)
        
        # Concentration score
        if hhi > 0.25:
            concentration_level = "High"
        elif hhi > 0.15:
            concentration_level = "Moderate"
        else:
            concentration_level = "Low"
        
        return {
            "herfindahl_index": hhi,
            "effective_positions": effective_positions,
            "max_position_weight": max_weight,
            "concentration_level": concentration_level,
            "top_5_concentration": np.sum(np.sort(weights)[-5:])
        }
    
    def _calculate_risk_attribution(self, weights: np.ndarray,
                                  volatilities: np.ndarray,
                                  correlations: np.ndarray) -> Dict[str, Any]:
        """Calculate risk attribution by position"""
        
        # Portfolio variance
        portfolio_var = np.dot(weights, np.dot(correlations * np.outer(volatilities, volatilities), weights))
        portfolio_vol = np.sqrt(portfolio_var)
        
        # Marginal risk contribution
        marginal_contrib = np.dot(correlations * np.outer(volatilities, volatilities), weights) / portfolio_vol
        
        # Component risk contribution
        component_contrib = weights * marginal_contrib
        
        # Percentage contribution
        percent_contrib = component_contrib / portfolio_var * 100
        
        return {
            "marginal_contributions": marginal_contrib.tolist(),
            "component_contributions": component_contrib.tolist(),
            "percentage_contributions": percent_contrib.tolist(),
            "total_risk": portfolio_vol
        }
    
    def _portfolio_stress_testing(self, portfolio_data: PortfolioRiskData) -> Dict[str, Any]:
        """Portfolio stress testing scenarios"""
        
        base_returns = np.array([pos["expected_return"] for pos in portfolio_data.positions])
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        
        scenarios = {}
        
        # Market crash scenario (-30% across all positions)
        crash_returns = base_returns - 0.30
        crash_portfolio_return = np.sum(weights * crash_returns)
        scenarios["market_crash"] = {
            "scenario": "Market crash (-30%)",
            "portfolio_return": crash_portfolio_return,
            "portfolio_loss": crash_portfolio_return * portfolio_data.portfolio_value
        }
        
        # Sector rotation (top performer -10%, bottom performer +20%)
        rotation_returns = base_returns.copy()
        best_performer = np.argmax(base_returns)
        worst_performer = np.argmin(base_returns)
        rotation_returns[best_performer] -= 0.10
        rotation_returns[worst_performer] += 0.20
        rotation_portfolio_return = np.sum(weights * rotation_returns)
        scenarios["sector_rotation"] = {
            "scenario": "Sector rotation",
            "portfolio_return": rotation_portfolio_return,
            "portfolio_change": (rotation_portfolio_return - np.sum(weights * base_returns)) * portfolio_data.portfolio_value
        }
        
        # Interest rate shock
        # Assume longer duration assets are more sensitive
        rate_shock_returns = base_returns - 0.05  # Assume 5% decline
        rate_shock_portfolio_return = np.sum(weights * rate_shock_returns)
        scenarios["interest_rate_shock"] = {
            "scenario": "Interest rate shock (+200 bps)",
            "portfolio_return": rate_shock_portfolio_return,
            "portfolio_loss": rate_shock_portfolio_return * portfolio_data.portfolio_value
        }
        
        return scenarios
    
    def _calculate_factor_exposures(self, portfolio_data: PortfolioRiskData,
                                  risk_factors: Dict[str, float]) -> Dict[str, float]:
        """Calculate portfolio exposures to risk factors"""
        
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        
        # Calculate weighted exposure to each factor
        factor_exposures = {}
        for factor_name, factor_sensitivity in risk_factors.items():
            # In practice, would use position-specific factor loadings
            # For now, use equal sensitivity across positions
            portfolio_exposure = np.sum(weights) * factor_sensitivity
            factor_exposures[factor_name] = portfolio_exposure
        
        return factor_exposures
    
    def _decompose_portfolio_risk(self, portfolio_data: PortfolioRiskData) -> Tuple[float, float]:
        """Decompose portfolio risk into systematic and idiosyncratic components"""
        
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        betas = np.array([pos.get("beta", 1.0) for pos in portfolio_data.positions])
        total_volatilities = np.array([pos["volatility"] for pos in portfolio_data.positions])
        
        # Market volatility (assumed)
        market_volatility = 0.15  # 15% market volatility
        
        # Systematic risk for each position
        systematic_volatilities = betas * market_volatility
        
        # Idiosyncratic risk for each position
        idiosyncratic_volatilities = np.sqrt(total_volatilities**2 - systematic_volatilities**2)
        
        # Portfolio systematic risk
        portfolio_beta = np.sum(weights * betas)
        systematic_risk = portfolio_beta * market_volatility
        
        # Portfolio idiosyncratic risk (diversified)
        idiosyncratic_risk = np.sqrt(np.sum((weights * idiosyncratic_volatilities)**2))
        
        return systematic_risk, idiosyncratic_risk
    
    def _calculate_tracking_error(self, portfolio_data: PortfolioRiskData) -> float:
        """Calculate tracking error vs benchmark"""
        
        if portfolio_data.benchmark_weights is None:
            return 0.0
        
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        benchmark_weights = np.array(portfolio_data.benchmark_weights)
        volatilities = np.array([pos["volatility"] for pos in portfolio_data.positions])
        
        # Active weights
        active_weights = weights - benchmark_weights
        
        # Tracking error (simplified)
        tracking_error = np.sqrt(np.sum((active_weights * volatilities)**2))
        
        return tracking_error
    
    def _market_scenario_analysis(self, portfolio_data: PortfolioRiskData,
                                risk_factors: Dict[str, float]) -> Dict[str, Any]:
        """Market scenario analysis"""
        
        scenarios = {
            "bull_market": {
                "description": "Bull market (+20% equity, -2% bonds)",
                "factor_shocks": {"equity": 0.20, "bonds": -0.02, "commodities": 0.15}
            },
            "bear_market": {
                "description": "Bear market (-25% equity, +5% bonds)",
                "factor_shocks": {"equity": -0.25, "bonds": 0.05, "commodities": -0.20}
            },
            "recession": {
                "description": "Recession (-30% equity, +3% bonds, -40% commodities)",
                "factor_shocks": {"equity": -0.30, "bonds": 0.03, "commodities": -0.40}
            }
        }
        
        # Calculate portfolio impact for each scenario
        for scenario_name, scenario_data in scenarios.items():
            portfolio_impact = 0
            for factor, shock in scenario_data["factor_shocks"].items():
                if factor in risk_factors:
                    portfolio_impact += risk_factors[factor] * shock
            
            scenario_data["portfolio_impact"] = portfolio_impact
            scenario_data["portfolio_value_change"] = portfolio_impact * portfolio_data.portfolio_value
        
        return scenarios
    
    def _calculate_risk_budget(self, portfolio_data: PortfolioRiskData) -> Dict[str, Any]:
        """Calculate risk budget allocation"""
        
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        volatilities = np.array([pos["volatility"] for pos in portfolio_data.positions])
        
        # Risk budget = weight * volatility / sum(weight * volatility)
        risk_contributions = weights * volatilities
        total_risk = np.sum(risk_contributions)
        risk_budget = risk_contributions / total_risk
        
        return {
            "risk_contributions": risk_contributions.tolist(),
            "risk_budget_allocation": risk_budget.tolist(),
            "risk_concentration": np.max(risk_budget),
            "effective_risk_positions": 1 / np.sum(risk_budget**2)
        }
    
    def _generate_portfolio_risk_recommendations(self, portfolio_data: PortfolioRiskData) -> List[str]:
        """Generate portfolio risk management recommendations"""
        
        recommendations = []
        weights = np.array([pos["weight"] for pos in portfolio_data.positions])
        
        # Concentration risk
        max_weight = np.max(weights)
        if max_weight > 0.20:
            recommendations.append("Consider reducing concentration in largest position")
        
        # Diversification
        effective_positions = 1 / np.sum(weights**2)
        if effective_positions < 10:
            recommendations.append("Increase diversification by adding more positions")
        
        # Risk management
        recommendations.append("Implement regular portfolio rebalancing")
        recommendations.append("Consider hedging strategies for tail risk protection")
        recommendations.append("Monitor correlation changes during market stress")
        
        return recommendations


# Example usage
if __name__ == "__main__":
    # Sample company risk data
    sample_risk_data = CompanyRiskData(
        current_ratio=1.2,
        quick_ratio=0.8,
        debt_to_equity=1.5,
        debt_to_assets=0.4,
        interest_coverage=3.5,
        times_interest_earned=3.2,
        roa=0.08,
        roe=0.15,
        gross_margin=0.35,
        operating_margin=0.12,
        net_margin=0.08,
        market_cap=1000000000,
        enterprise_value=1200000000,
        price_to_book=2.5,
        price_to_earnings=18.0,
        beta=1.2,
        operating_cash_flow=120000000,
        free_cash_flow=80000000,
        cash_conversion_cycle=45,
        revenue_growth=0.08,
        earnings_volatility=0.25,
        industry_risk_score=40,
        management_quality_score=75,
        financial_history_years=5,
        bankruptcy_history=False,
        default_history=False,
        audit_issues=False
    )
    
    # Perform risk assessment
    risk_engine = RiskAssessmentEngine()
    risk_result = risk_engine.assess_company_risk(sample_risk_data)
    
    print("Company Risk Assessment Results:")
    print(f"Overall Risk Score: {risk_result.overall_risk_score:.1f}")
    print(f"Risk Level: {risk_result.risk_level}")
    print(f"Credit Rating: {risk_result.credit_rating}")
    print(f"Probability of Default: {risk_result.probability_of_default:.2%}")
    print(f"Assessment Confidence: {risk_result.assessment_confidence:.1%}")
    
    print("\nKey Risk Factors:")
    for factor in risk_result.key_risk_factors:
        print(f"- {factor}")
    
    print("\nRisk Mitigation Suggestions:")
    for suggestion in risk_result.risk_mitigation_suggestions:
        print(f"- {suggestion}")
    
    # Credit scoring
    credit_results = risk_engine.credit_scoring_model(sample_risk_data)
    print(f"\nCredit Score: {credit_results['ensemble_credit_score']:.1f}")
    print(f"Credit Grade: {credit_results['credit_grade']}")
