"""
Automated Financial Statement Analysis Engine

Advanced algorithms for automated analysis of financial statements including
anomaly detection, quality assessment, and comprehensive interpretation.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math
from scipy import stats
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')


class StatementType(str, Enum):
    """Types of financial statements"""
    INCOME_STATEMENT = "income_statement"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW = "cash_flow"
    STATEMENT_OF_EQUITY = "statement_of_equity"


class AnomalyType(str, Enum):
    """Types of financial anomalies"""
    REVENUE_MANIPULATION = "revenue_manipulation"
    EXPENSE_MANIPULATION = "expense_manipulation"
    ASSET_OVERSTATEMENT = "asset_overstatement"
    LIABILITY_UNDERSTATEMENT = "liability_understatement"
    CASH_FLOW_MISMATCH = "cash_flow_mismatch"
    RATIO_INCONSISTENCY = "ratio_inconsistency"
    SEASONAL_ANOMALY = "seasonal_anomaly"
    INDUSTRY_DEVIATION = "industry_deviation"


class QualityMetric(str, Enum):
    """Financial statement quality metrics"""
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    ACCURACY = "accuracy"
    TRANSPARENCY = "transparency"
    COMPARABILITY = "comparability"


@dataclass
class FinancialStatements:
    """Complete financial statements data structure"""
    # Income Statement
    revenue: float
    cost_of_goods_sold: float
    gross_profit: float
    operating_expenses: float
    operating_income: float
    interest_expense: float
    interest_income: float
    other_income: float
    earnings_before_tax: float
    tax_expense: float
    net_income: float
    
    # Balance Sheet
    cash_and_equivalents: float
    accounts_receivable: float
    inventory: float
    prepaid_expenses: float
    current_assets: float
    property_plant_equipment: float
    intangible_assets: float
    other_assets: float
    total_assets: float
    
    accounts_payable: float
    accrued_liabilities: float
    short_term_debt: float
    current_liabilities: float
    long_term_debt: float
    other_liabilities: float
    total_liabilities: float
    shareholders_equity: float
    
    # Cash Flow Statement
    net_cash_from_operations: float
    net_cash_from_investing: float
    net_cash_from_financing: float
    net_change_in_cash: float
    beginning_cash: float
    ending_cash: float
    
    # Additional metrics
    shares_outstanding: float
    period: str
    currency: str = "USD"


@dataclass
class AnomalyDetection:
    """Anomaly detection result"""
    anomaly_type: AnomalyType
    severity: str  # low, medium, high, critical
    confidence: float
    description: str
    affected_accounts: List[str]
    suggested_investigation: List[str]
    risk_score: float


@dataclass
class QualityAssessment:
    """Financial statement quality assessment"""
    overall_score: float
    quality_metrics: Dict[QualityMetric, float]
    strengths: List[str]
    weaknesses: List[str]
    improvement_recommendations: List[str]
    reliability_grade: str  # A+, A, B+, B, C+, C, D+, D, F


@dataclass
class FinancialAnalysisResult:
    """Complete financial statement analysis result"""
    statement_quality: QualityAssessment
    anomaly_detections: List[AnomalyDetection]
    key_insights: List[str]
    financial_health_score: float
    earnings_quality_score: float
    balance_sheet_strength: float
    cash_flow_quality: float
    
    # Detailed analysis
    ratio_analysis: Dict[str, Any]
    trend_analysis: Dict[str, Any]
    benchmarking: Dict[str, Any]
    
    # Recommendations
    management_attention_areas: List[str]
    investor_focus_points: List[str]
    audit_recommendations: List[str]


class FinancialStatementAnalyzer:
    """Automated financial statement analysis engine"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        
        # Industry benchmarks (simplified)
        self.industry_benchmarks = {
            "technology": {
                "gross_margin": 0.65,
                "operating_margin": 0.15,
                "current_ratio": 2.5,
                "debt_to_equity": 0.3,
                "roa": 0.08,
                "roe": 0.15
            },
            "manufacturing": {
                "gross_margin": 0.35,
                "operating_margin": 0.08,
                "current_ratio": 1.8,
                "debt_to_equity": 0.6,
                "roa": 0.05,
                "roe": 0.12
            },
            "retail": {
                "gross_margin": 0.40,
                "operating_margin": 0.06,
                "current_ratio": 1.5,
                "debt_to_equity": 0.8,
                "roa": 0.04,
                "roe": 0.10
            }
        }
    
    def analyze_financial_statements(self, statements: FinancialStatements,
                                   historical_data: Optional[List[FinancialStatements]] = None,
                                   industry: str = "general") -> FinancialAnalysisResult:
        """
        Perform comprehensive automated financial statement analysis
        
        Args:
            statements: Current period financial statements
            historical_data: Historical financial statements for trend analysis
            industry: Industry classification for benchmarking
            
        Returns:
            Comprehensive financial analysis results
        """
        
        # Quality assessment
        quality_assessment = self._assess_statement_quality(statements, historical_data)
        
        # Anomaly detection
        anomalies = self._detect_anomalies(statements, historical_data, industry)
        
        # Financial health scoring
        health_score = self._calculate_financial_health_score(statements)
        earnings_quality = self._assess_earnings_quality(statements)
        balance_sheet_strength = self._assess_balance_sheet_strength(statements)
        cash_flow_quality = self._assess_cash_flow_quality(statements)
        
        # Detailed analysis
        ratio_analysis = self._perform_ratio_analysis(statements, industry)
        trend_analysis = self._perform_trend_analysis(statements, historical_data)
        benchmarking = self._perform_industry_benchmarking(statements, industry)
        
        # Generate insights and recommendations
        key_insights = self._generate_key_insights(statements, anomalies, quality_assessment)
        management_areas = self._identify_management_attention_areas(statements, anomalies)
        investor_points = self._identify_investor_focus_points(statements, quality_assessment)
        audit_recommendations = self._generate_audit_recommendations(anomalies, quality_assessment)
        
        return FinancialAnalysisResult(
            statement_quality=quality_assessment,
            anomaly_detections=anomalies,
            key_insights=key_insights,
            financial_health_score=health_score,
            earnings_quality_score=earnings_quality,
            balance_sheet_strength=balance_sheet_strength,
            cash_flow_quality=cash_flow_quality,
            ratio_analysis=ratio_analysis,
            trend_analysis=trend_analysis,
            benchmarking=benchmarking,
            management_attention_areas=management_areas,
            investor_focus_points=investor_points,
            audit_recommendations=audit_recommendations
        )
    
    def _assess_statement_quality(self, statements: FinancialStatements,
                                historical_data: Optional[List[FinancialStatements]]) -> QualityAssessment:
        """Assess overall financial statement quality"""
        
        quality_scores = {}
        
        # Completeness assessment
        completeness = self._assess_completeness(statements)
        quality_scores[QualityMetric.COMPLETENESS] = completeness
        
        # Consistency assessment
        consistency = self._assess_consistency(statements)
        quality_scores[QualityMetric.CONSISTENCY] = consistency
        
        # Accuracy assessment (through cross-checks)
        accuracy = self._assess_accuracy(statements)
        quality_scores[QualityMetric.ACCURACY] = accuracy
        
        # Transparency assessment
        transparency = self._assess_transparency(statements)
        quality_scores[QualityMetric.TRANSPARENCY] = transparency
        
        # Comparability assessment
        comparability = self._assess_comparability(statements, historical_data)
        quality_scores[QualityMetric.COMPARABILITY] = comparability
        
        # Overall score
        overall_score = np.mean(list(quality_scores.values()))
        
        # Grade assignment
        reliability_grade = self._assign_quality_grade(overall_score)
        
        # Identify strengths and weaknesses
        strengths, weaknesses = self._identify_quality_strengths_weaknesses(quality_scores)
        
        # Improvement recommendations
        improvements = self._generate_quality_improvements(quality_scores)
        
        return QualityAssessment(
            overall_score=overall_score,
            quality_metrics=quality_scores,
            strengths=strengths,
            weaknesses=weaknesses,
            improvement_recommendations=improvements,
            reliability_grade=reliability_grade
        )
    
    def _detect_anomalies(self, statements: FinancialStatements,
                         historical_data: Optional[List[FinancialStatements]],
                         industry: str) -> List[AnomalyDetection]:
        """Detect potential anomalies in financial statements"""
        
        anomalies = []
        
        # Revenue recognition anomalies
        revenue_anomalies = self._detect_revenue_anomalies(statements, historical_data)
        anomalies.extend(revenue_anomalies)
        
        # Expense manipulation detection
        expense_anomalies = self._detect_expense_anomalies(statements, historical_data)
        anomalies.extend(expense_anomalies)
        
        # Asset valuation anomalies
        asset_anomalies = self._detect_asset_anomalies(statements)
        anomalies.extend(asset_anomalies)
        
        # Cash flow consistency checks
        cash_flow_anomalies = self._detect_cash_flow_anomalies(statements)
        anomalies.extend(cash_flow_anomalies)
        
        # Ratio inconsistencies
        ratio_anomalies = self._detect_ratio_anomalies(statements, industry)
        anomalies.extend(ratio_anomalies)
        
        # Industry deviation analysis
        industry_anomalies = self._detect_industry_deviations(statements, industry)
        anomalies.extend(industry_anomalies)
        
        return anomalies
    
    def _detect_revenue_anomalies(self, statements: FinancialStatements,
                                historical_data: Optional[List[FinancialStatements]]) -> List[AnomalyDetection]:
        """Detect revenue recognition anomalies"""
        
        anomalies = []
        
        # Revenue vs cash flow mismatch
        if statements.net_cash_from_operations < statements.net_income * 0.7:
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.REVENUE_MANIPULATION,
                severity="medium",
                confidence=0.7,
                description="Operating cash flow significantly lower than net income",
                affected_accounts=["revenue", "accounts_receivable", "operating_cash_flow"],
                suggested_investigation=[
                    "Review revenue recognition policies",
                    "Analyze accounts receivable aging",
                    "Examine customer payment patterns"
                ],
                risk_score=65
            ))
        
        # Accounts receivable growth vs revenue growth
        if historical_data and len(historical_data) > 0:
            current_ar_revenue_ratio = statements.accounts_receivable / statements.revenue
            previous_ar_revenue_ratio = historical_data[-1].accounts_receivable / historical_data[-1].revenue
            
            if current_ar_revenue_ratio > previous_ar_revenue_ratio * 1.3:
                anomalies.append(AnomalyDetection(
                    anomaly_type=AnomalyType.REVENUE_MANIPULATION,
                    severity="high",
                    confidence=0.8,
                    description="Accounts receivable growing faster than revenue",
                    affected_accounts=["accounts_receivable", "revenue"],
                    suggested_investigation=[
                        "Review customer creditworthiness",
                        "Analyze revenue recognition timing",
                        "Check for channel stuffing"
                    ],
                    risk_score=80
                ))
        
        return anomalies
    
    def _detect_expense_anomalies(self, statements: FinancialStatements,
                                historical_data: Optional[List[FinancialStatements]]) -> List[AnomalyDetection]:
        """Detect expense manipulation anomalies"""
        
        anomalies = []
        
        # Unusual gross margin changes
        if historical_data and len(historical_data) > 0:
            current_gross_margin = statements.gross_profit / statements.revenue
            previous_gross_margin = historical_data[-1].gross_profit / historical_data[-1].revenue
            
            margin_change = abs(current_gross_margin - previous_gross_margin)
            if margin_change > 0.05:  # 5% change
                severity = "high" if margin_change > 0.10 else "medium"
                anomalies.append(AnomalyDetection(
                    anomaly_type=AnomalyType.EXPENSE_MANIPULATION,
                    severity=severity,
                    confidence=0.6,
                    description=f"Significant gross margin change: {margin_change:.1%}",
                    affected_accounts=["cost_of_goods_sold", "gross_profit"],
                    suggested_investigation=[
                        "Review cost accounting methods",
                        "Analyze inventory valuation",
                        "Check for capitalization of expenses"
                    ],
                    risk_score=60 + margin_change * 200
                ))
        
        return anomalies
    
    def _detect_asset_anomalies(self, statements: FinancialStatements) -> List[AnomalyDetection]:
        """Detect asset valuation anomalies"""
        
        anomalies = []
        
        # Asset composition analysis
        total_assets = statements.total_assets
        intangible_ratio = statements.intangible_assets / total_assets
        
        if intangible_ratio > 0.4:  # High intangible asset ratio
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.ASSET_OVERSTATEMENT,
                severity="medium",
                confidence=0.6,
                description=f"High intangible assets ratio: {intangible_ratio:.1%}",
                affected_accounts=["intangible_assets", "goodwill"],
                suggested_investigation=[
                    "Review intangible asset valuation",
                    "Check for impairment testing",
                    "Analyze asset acquisition accounting"
                ],
                risk_score=55
            ))
        
        # Cash vs reported earnings
        cash_ratio = statements.cash_and_equivalents / statements.total_assets
        if cash_ratio < 0.05 and statements.net_income > 0:  # Low cash with positive earnings
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.CASH_FLOW_MISMATCH,
                severity="medium",
                confidence=0.7,
                description="Low cash position despite positive earnings",
                affected_accounts=["cash", "net_income"],
                suggested_investigation=[
                    "Analyze cash flow from operations",
                    "Review working capital management",
                    "Check for earnings quality issues"
                ],
                risk_score=60
            ))
        
        return anomalies
    
    def _detect_cash_flow_anomalies(self, statements: FinancialStatements) -> List[AnomalyDetection]:
        """Detect cash flow statement anomalies"""
        
        anomalies = []
        
        # Cash flow reconciliation
        calculated_change = (statements.net_cash_from_operations + 
                           statements.net_cash_from_investing + 
                           statements.net_cash_from_financing)
        
        reported_change = statements.net_change_in_cash
        
        if abs(calculated_change - reported_change) > statements.total_assets * 0.01:
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.CASH_FLOW_MISMATCH,
                severity="high",
                confidence=0.9,
                description="Cash flow reconciliation error",
                affected_accounts=["cash_flow_statement"],
                suggested_investigation=[
                    "Verify cash flow calculations",
                    "Check for foreign exchange adjustments",
                    "Review cash flow statement preparation"
                ],
                risk_score=85
            ))
        
        # Operating cash flow vs net income
        if statements.net_cash_from_operations < 0 and statements.net_income > 0:
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.CASH_FLOW_MISMATCH,
                severity="high",
                confidence=0.8,
                description="Negative operating cash flow with positive net income",
                affected_accounts=["operating_cash_flow", "net_income"],
                suggested_investigation=[
                    "Analyze working capital changes",
                    "Review revenue recognition timing",
                    "Check for non-cash expenses"
                ],
                risk_score=75
            ))
        
        return anomalies
    
    def _detect_ratio_anomalies(self, statements: FinancialStatements, industry: str) -> List[AnomalyDetection]:
        """Detect ratio inconsistencies and anomalies"""
        
        anomalies = []
        
        # Calculate key ratios
        current_ratio = statements.current_assets / statements.current_liabilities if statements.current_liabilities > 0 else float('inf')
        debt_to_equity = statements.total_liabilities / statements.shareholders_equity if statements.shareholders_equity > 0 else float('inf')
        
        # Industry benchmarks
        industry_benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["technology"])
        
        # Current ratio anomaly
        if current_ratio < 1.0:
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.RATIO_INCONSISTENCY,
                severity="high",
                confidence=0.9,
                description=f"Current ratio below 1.0: {current_ratio:.2f}",
                affected_accounts=["current_assets", "current_liabilities"],
                suggested_investigation=[
                    "Review liquidity management",
                    "Analyze working capital adequacy",
                    "Check for liquidity risks"
                ],
                risk_score=80
            ))
        
        # Debt-to-equity anomaly
        benchmark_de = industry_benchmarks.get("debt_to_equity", 0.5)
        if debt_to_equity > benchmark_de * 2:
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.RATIO_INCONSISTENCY,
                severity="medium",
                confidence=0.7,
                description=f"High debt-to-equity ratio: {debt_to_equity:.2f}",
                affected_accounts=["total_debt", "shareholders_equity"],
                suggested_investigation=[
                    "Review debt management strategy",
                    "Analyze leverage risks",
                    "Check debt covenant compliance"
                ],
                risk_score=65
            ))
        
        return anomalies
    
    def _detect_industry_deviations(self, statements: FinancialStatements, industry: str) -> List[AnomalyDetection]:
        """Detect significant deviations from industry norms"""
        
        anomalies = []
        industry_benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["technology"])
        
        # Gross margin deviation
        gross_margin = statements.gross_profit / statements.revenue if statements.revenue > 0 else 0
        benchmark_margin = industry_benchmarks.get("gross_margin", 0.4)
        
        if abs(gross_margin - benchmark_margin) > 0.2:  # 20% deviation
            anomalies.append(AnomalyDetection(
                anomaly_type=AnomalyType.INDUSTRY_DEVIATION,
                severity="medium",
                confidence=0.6,
                description=f"Gross margin significantly different from industry: {gross_margin:.1%} vs {benchmark_margin:.1%}",
                affected_accounts=["gross_profit", "revenue"],
                suggested_investigation=[
                    "Compare business model to industry peers",
                    "Analyze competitive positioning",
                    "Review pricing strategy"
                ],
                risk_score=50
            ))
        
        return anomalies
    
    def _assess_completeness(self, statements: FinancialStatements) -> float:
        """Assess completeness of financial statements"""
        
        required_fields = [
            'revenue', 'net_income', 'total_assets', 'total_liabilities',
            'shareholders_equity', 'net_cash_from_operations'
        ]
        
        complete_fields = 0
        for field in required_fields:
            value = getattr(statements, field, None)
            if value is not None and not (isinstance(value, float) and math.isnan(value)):
                complete_fields += 1
        
        return (complete_fields / len(required_fields)) * 100
    
    def _assess_consistency(self, statements: FinancialStatements) -> float:
        """Assess internal consistency of financial statements"""
        
        consistency_score = 100
        
        # Balance sheet equation check
        assets_liabilities_equity = statements.total_assets - (statements.total_liabilities + statements.shareholders_equity)
        if abs(assets_liabilities_equity) > statements.total_assets * 0.01:  # 1% tolerance
            consistency_score -= 20
        
        # Income statement consistency
        calculated_gross_profit = statements.revenue - statements.cost_of_goods_sold
        if abs(calculated_gross_profit - statements.gross_profit) > statements.revenue * 0.01:
            consistency_score -= 15
        
        # Cash flow consistency
        if statements.ending_cash != statements.beginning_cash + statements.net_change_in_cash:
            consistency_score -= 15
        
        return max(0, consistency_score)
    
    def _assess_accuracy(self, statements: FinancialStatements) -> float:
        """Assess accuracy through cross-checks and reasonableness tests"""
        
        accuracy_score = 100
        
        # Reasonableness tests
        # Revenue should be positive
        if statements.revenue <= 0:
            accuracy_score -= 25
        
        # Assets should be positive
        if statements.total_assets <= 0:
            accuracy_score -= 25
        
        # Current assets should be <= total assets
        if statements.current_assets > statements.total_assets:
            accuracy_score -= 15
        
        # Debt ratios should be reasonable
        if statements.total_liabilities > statements.total_assets * 1.1:  # 10% tolerance
            accuracy_score -= 15
        
        return max(0, accuracy_score)
    
    def _assess_transparency(self, statements: FinancialStatements) -> float:
        """Assess transparency and disclosure quality"""
        
        # Simplified transparency assessment
        # In practice, this would involve more detailed analysis of footnotes and disclosures
        
        transparency_score = 75  # Base score
        
        # Check for round numbers (potential sign of manipulation)
        round_number_fields = ['revenue', 'net_income', 'total_assets']
        round_numbers = 0
        
        for field in round_number_fields:
            value = getattr(statements, field, 0)
            if value % 10000 == 0 and value > 0:  # Round to nearest 10,000
                round_numbers += 1
        
        if round_numbers > 1:
            transparency_score -= 15
        
        return transparency_score
    
    def _assess_comparability(self, statements: FinancialStatements,
                            historical_data: Optional[List[FinancialStatements]]) -> float:
        """Assess comparability with historical periods"""
        
        if not historical_data or len(historical_data) == 0:
            return 60  # Neutral score when no historical data
        
        comparability_score = 100
        
        # Check for significant changes in key ratios
        previous = historical_data[-1]
        
        # Revenue growth check
        revenue_growth = (statements.revenue - previous.revenue) / previous.revenue if previous.revenue > 0 else 0
        if abs(revenue_growth) > 0.5:  # 50% change
            comparability_score -= 10
        
        # Margin consistency
        current_margin = statements.net_income / statements.revenue if statements.revenue > 0 else 0
        previous_margin = previous.net_income / previous.revenue if previous.revenue > 0 else 0
        margin_change = abs(current_margin - previous_margin)
        
        if margin_change > 0.1:  # 10% margin change
            comparability_score -= 15
        
        return max(0, comparability_score)
    
    def _assign_quality_grade(self, overall_score: float) -> str:
        """Assign quality grade based on overall score"""
        
        if overall_score >= 95:
            return "A+"
        elif overall_score >= 90:
            return "A"
        elif overall_score >= 85:
            return "B+"
        elif overall_score >= 80:
            return "B"
        elif overall_score >= 75:
            return "C+"
        elif overall_score >= 70:
            return "C"
        elif overall_score >= 65:
            return "D+"
        elif overall_score >= 60:
            return "D"
        else:
            return "F"
    
    def _identify_quality_strengths_weaknesses(self, quality_scores: Dict[QualityMetric, float]) -> Tuple[List[str], List[str]]:
        """Identify quality strengths and weaknesses"""
        
        strengths = []
        weaknesses = []
        
        for metric, score in quality_scores.items():
            if score >= 85:
                strengths.append(f"Strong {metric.value}: {score:.1f}/100")
            elif score <= 65:
                weaknesses.append(f"Weak {metric.value}: {score:.1f}/100")
        
        return strengths, weaknesses
    
    def _generate_quality_improvements(self, quality_scores: Dict[QualityMetric, float]) -> List[str]:
        """Generate quality improvement recommendations"""
        
        improvements = []
        
        for metric, score in quality_scores.items():
            if score < 75:
                if metric == QualityMetric.COMPLETENESS:
                    improvements.append("Ensure all required financial statement line items are reported")
                elif metric == QualityMetric.CONSISTENCY:
                    improvements.append("Review and reconcile internal statement relationships")
                elif metric == QualityMetric.ACCURACY:
                    improvements.append("Implement additional validation checks and reasonableness tests")
                elif metric == QualityMetric.TRANSPARENCY:
                    improvements.append("Enhance disclosure quality and footnote details")
                elif metric == QualityMetric.COMPARABILITY:
                    improvements.append("Maintain consistent accounting policies and presentation")
        
        return improvements
    
    def _calculate_financial_health_score(self, statements: FinancialStatements) -> float:
        """Calculate overall financial health score"""
        
        scores = []
        
        # Profitability score
        if statements.revenue > 0:
            net_margin = statements.net_income / statements.revenue
            profit_score = min(100, max(0, (net_margin + 0.1) * 500))  # Scale around 10% margin
            scores.append(profit_score)
        
        # Liquidity score
        if statements.current_liabilities > 0:
            current_ratio = statements.current_assets / statements.current_liabilities
            liquidity_score = min(100, max(0, current_ratio * 40))  # Scale around 2.5 ratio
            scores.append(liquidity_score)
        
        # Solvency score
        if statements.total_assets > 0:
            equity_ratio = statements.shareholders_equity / statements.total_assets
            solvency_score = min(100, max(0, equity_ratio * 200))  # Scale around 50% equity
            scores.append(solvency_score)
        
        # Cash flow score
        if statements.total_assets > 0:
            cash_flow_ratio = statements.net_cash_from_operations / statements.total_assets
            cf_score = min(100, max(0, (cash_flow_ratio + 0.05) * 1000))  # Scale around 5% of assets
            scores.append(cf_score)
        
        return np.mean(scores) if scores else 50
    
    def _assess_earnings_quality(self, statements: FinancialStatements) -> float:
        """Assess earnings quality"""
        
        quality_score = 50  # Base score
        
        # Cash flow backing
        if statements.net_income > 0:
            cash_backing = statements.net_cash_from_operations / statements.net_income
            if cash_backing >= 1.0:
                quality_score += 30
            elif cash_backing >= 0.8:
                quality_score += 20
            elif cash_backing >= 0.6:
                quality_score += 10
            else:
                quality_score -= 10
        
        # Revenue quality (simplified)
        if statements.revenue > 0 and statements.accounts_receivable > 0:
            ar_turnover = statements.revenue / statements.accounts_receivable
            if ar_turnover >= 8:  # Good collection
                quality_score += 10
            elif ar_turnover < 4:  # Poor collection
                quality_score -= 10
        
        return min(100, max(0, quality_score))
    
    def _assess_balance_sheet_strength(self, statements: FinancialStatements) -> float:
        """Assess balance sheet strength"""
        
        strength_score = 50  # Base score
        
        # Equity ratio
        if statements.total_assets > 0:
            equity_ratio = statements.shareholders_equity / statements.total_assets
            if equity_ratio >= 0.6:
                strength_score += 25
            elif equity_ratio >= 0.4:
                strength_score += 15
            elif equity_ratio >= 0.2:
                strength_score += 5
            else:
                strength_score -= 15
        
        # Current ratio
        if statements.current_liabilities > 0:
            current_ratio = statements.current_assets / statements.current_liabilities
            if current_ratio >= 2.0:
                strength_score += 15
            elif current_ratio >= 1.5:
                strength_score += 10
            elif current_ratio >= 1.0:
                strength_score += 5
            else:
                strength_score -= 20
        
        # Cash position
        if statements.total_assets > 0:
            cash_ratio = statements.cash_and_equivalents / statements.total_assets
            if cash_ratio >= 0.15:
                strength_score += 10
            elif cash_ratio < 0.05:
                strength_score -= 10
        
        return min(100, max(0, strength_score))
    
    def _assess_cash_flow_quality(self, statements: FinancialStatements) -> float:
        """Assess cash flow quality"""
        
        cf_quality = 50  # Base score
        
        # Operating cash flow positivity
        if statements.net_cash_from_operations > 0:
            cf_quality += 25
        else:
            cf_quality -= 25
        
        # Free cash flow (simplified)
        if statements.net_cash_from_operations > statements.net_cash_from_investing:
            cf_quality += 15
        
        # Cash flow stability (would need historical data for proper assessment)
        # For now, use a simplified approach
        if abs(statements.net_change_in_cash) < statements.total_assets * 0.1:
            cf_quality += 10  # Stable cash position
        
        return min(100, max(0, cf_quality))
    
    def _perform_ratio_analysis(self, statements: FinancialStatements, industry: str) -> Dict[str, Any]:
        """Perform comprehensive ratio analysis"""
        
        ratios = {}
        
        # Profitability ratios
        if statements.revenue > 0:
            ratios["gross_margin"] = statements.gross_profit / statements.revenue
            ratios["operating_margin"] = statements.operating_income / statements.revenue
            ratios["net_margin"] = statements.net_income / statements.revenue
        
        if statements.total_assets > 0:
            ratios["roa"] = statements.net_income / statements.total_assets
        
        if statements.shareholders_equity > 0:
            ratios["roe"] = statements.net_income / statements.shareholders_equity
        
        # Liquidity ratios
        if statements.current_liabilities > 0:
            ratios["current_ratio"] = statements.current_assets / statements.current_liabilities
            ratios["quick_ratio"] = (statements.current_assets - statements.inventory) / statements.current_liabilities
            ratios["cash_ratio"] = statements.cash_and_equivalents / statements.current_liabilities
        
        # Leverage ratios
        if statements.shareholders_equity > 0:
            ratios["debt_to_equity"] = statements.total_liabilities / statements.shareholders_equity
        
        if statements.total_assets > 0:
            ratios["debt_to_assets"] = statements.total_liabilities / statements.total_assets
            ratios["equity_ratio"] = statements.shareholders_equity / statements.total_assets
        
        # Efficiency ratios
        if statements.total_assets > 0 and statements.revenue > 0:
            ratios["asset_turnover"] = statements.revenue / statements.total_assets
        
        if statements.accounts_receivable > 0 and statements.revenue > 0:
            ratios["receivables_turnover"] = statements.revenue / statements.accounts_receivable
        
        if statements.inventory > 0 and statements.cost_of_goods_sold > 0:
            ratios["inventory_turnover"] = statements.cost_of_goods_sold / statements.inventory
        
        return {
            "calculated_ratios": ratios,
            "industry_comparison": self._compare_ratios_to_industry(ratios, industry),
            "ratio_grades": self._grade_ratios(ratios, industry)
        }
    
    def _perform_trend_analysis(self, statements: FinancialStatements,
                              historical_data: Optional[List[FinancialStatements]]) -> Dict[str, Any]:
        """Perform trend analysis"""
        
        if not historical_data or len(historical_data) == 0:
            return {"message": "Insufficient historical data for trend analysis"}
        
        trends = {}
        previous = historical_data[-1]
        
        # Revenue trend
        if previous.revenue > 0:
            revenue_growth = (statements.revenue - previous.revenue) / previous.revenue
            trends["revenue_growth"] = revenue_growth
        
        # Profitability trends
        current_margin = statements.net_income / statements.revenue if statements.revenue > 0 else 0
        previous_margin = previous.net_income / previous.revenue if previous.revenue > 0 else 0
        trends["margin_change"] = current_margin - previous_margin
        
        # Asset efficiency trends
        current_asset_turnover = statements.revenue / statements.total_assets if statements.total_assets > 0 else 0
        previous_asset_turnover = previous.revenue / previous.total_assets if previous.total_assets > 0 else 0
        trends["asset_turnover_change"] = current_asset_turnover - previous_asset_turnover
        
        return {
            "period_over_period_trends": trends,
            "trend_analysis": self._analyze_trend_direction(trends),
            "trend_sustainability": self._assess_trend_sustainability(trends)
        }
    
    def _perform_industry_benchmarking(self, statements: FinancialStatements, industry: str) -> Dict[str, Any]:
        """Perform industry benchmarking"""
        
        industry_benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["technology"])
        
        # Calculate key ratios
        company_metrics = {}
        if statements.revenue > 0:
            company_metrics["gross_margin"] = statements.gross_profit / statements.revenue
            company_metrics["operating_margin"] = statements.operating_income / statements.revenue
        
        if statements.current_liabilities > 0:
            company_metrics["current_ratio"] = statements.current_assets / statements.current_liabilities
        
        if statements.shareholders_equity > 0:
            company_metrics["debt_to_equity"] = statements.total_liabilities / statements.shareholders_equity
        
        if statements.total_assets > 0:
            company_metrics["roa"] = statements.net_income / statements.total_assets
        
        if statements.shareholders_equity > 0:
            company_metrics["roe"] = statements.net_income / statements.shareholders_equity
        
        # Compare to industry
        comparisons = {}
        for metric, company_value in company_metrics.items():
            if metric in industry_benchmarks:
                benchmark_value = industry_benchmarks[metric]
                difference = company_value - benchmark_value
                percentage_diff = (difference / benchmark_value * 100) if benchmark_value != 0 else 0
                
                comparisons[metric] = {
                    "company_value": company_value,
                    "industry_benchmark": benchmark_value,
                    "difference": difference,
                    "percentage_difference": percentage_diff,
                    "performance": "above" if difference > 0 else "below" if difference < 0 else "at"
                }
        
        return {
            "industry": industry,
            "benchmark_comparisons": comparisons,
            "overall_position": self._determine_industry_position(comparisons)
        }
    
    def _compare_ratios_to_industry(self, ratios: Dict[str, float], industry: str) -> Dict[str, str]:
        """Compare ratios to industry benchmarks"""
        
        industry_benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["technology"])
        comparisons = {}
        
        for ratio_name, ratio_value in ratios.items():
            if ratio_name in industry_benchmarks:
                benchmark = industry_benchmarks[ratio_name]
                if ratio_value > benchmark * 1.1:
                    comparisons[ratio_name] = "above_average"
                elif ratio_value < benchmark * 0.9:
                    comparisons[ratio_name] = "below_average"
                else:
                    comparisons[ratio_name] = "average"
            else:
                comparisons[ratio_name] = "no_benchmark"
        
        return comparisons
    
    def _grade_ratios(self, ratios: Dict[str, float], industry: str) -> Dict[str, str]:
        """Grade individual ratios"""
        
        grades = {}
        industry_benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["technology"])
        
        for ratio_name, ratio_value in ratios.items():
            if ratio_name in industry_benchmarks:
                benchmark = industry_benchmarks[ratio_name]
                
                # Determine if higher is better for this ratio
                higher_is_better = ratio_name in ["gross_margin", "operating_margin", "net_margin", 
                                                "roa", "roe", "current_ratio"]
                
                if higher_is_better:
                    if ratio_value >= benchmark * 1.3:
                        grades[ratio_name] = "A"
                    elif ratio_value >= benchmark * 1.1:
                        grades[ratio_name] = "B"
                    elif ratio_value >= benchmark * 0.9:
                        grades[ratio_name] = "C"
                    elif ratio_value >= benchmark * 0.7:
                        grades[ratio_name] = "D"
                    else:
                        grades[ratio_name] = "F"
                else:  # Lower is better (e.g., debt ratios)
                    if ratio_value <= benchmark * 0.7:
                        grades[ratio_name] = "A"
                    elif ratio_value <= benchmark * 0.9:
                        grades[ratio_name] = "B"
                    elif ratio_value <= benchmark * 1.1:
                        grades[ratio_name] = "C"
                    elif ratio_value <= benchmark * 1.3:
                        grades[ratio_name] = "D"
                    else:
                        grades[ratio_name] = "F"
            else:
                grades[ratio_name] = "N/A"
        
        return grades
    
    def _analyze_trend_direction(self, trends: Dict[str, float]) -> Dict[str, str]:
        """Analyze trend directions"""
        
        trend_analysis = {}
        
        for trend_name, trend_value in trends.items():
            if trend_value > 0.05:  # 5% improvement
                trend_analysis[trend_name] = "improving"
            elif trend_value < -0.05:  # 5% deterioration
                trend_analysis[trend_name] = "deteriorating"
            else:
                trend_analysis[trend_name] = "stable"
        
        return trend_analysis
    
    def _assess_trend_sustainability(self, trends: Dict[str, float]) -> str:
        """Assess sustainability of trends"""
        
        positive_trends = sum(1 for v in trends.values() if v > 0.02)
        negative_trends = sum(1 for v in trends.values() if v < -0.02)
        
        if positive_trends > negative_trends * 2:
            return "highly_sustainable"
        elif positive_trends > negative_trends:
            return "moderately_sustainable"
        elif negative_trends > positive_trends:
            return "concerning"
        else:
            return "mixed"
    
    def _determine_industry_position(self, comparisons: Dict[str, Dict[str, Any]]) -> str:
        """Determine overall industry position"""
        
        above_count = sum(1 for comp in comparisons.values() if comp["performance"] == "above")
        below_count = sum(1 for comp in comparisons.values() if comp["performance"] == "below")
        total_count = len(comparisons)
        
        if above_count / total_count >= 0.7:
            return "industry_leader"
        elif above_count / total_count >= 0.5:
            return "above_average"
        elif below_count / total_count >= 0.7:
            return "below_average"
        else:
            return "average"
    
    def _generate_key_insights(self, statements: FinancialStatements,
                             anomalies: List[AnomalyDetection],
                             quality_assessment: QualityAssessment) -> List[str]:
        """Generate key insights from analysis"""
        
        insights = []
        
        # Financial performance insights
        if statements.revenue > 0:
            net_margin = statements.net_income / statements.revenue
            if net_margin > 0.15:
                insights.append("Strong profitability with net margin above 15%")
            elif net_margin < 0:
                insights.append("Company reporting losses - investigate operational issues")
        
        # Liquidity insights
        if statements.current_liabilities > 0:
            current_ratio = statements.current_assets / statements.current_liabilities
            if current_ratio < 1.0:
                insights.append("Liquidity concerns - current liabilities exceed current assets")
            elif current_ratio > 3.0:
                insights.append("Excellent liquidity position but may indicate inefficient cash management")
        
        # Quality insights
        if quality_assessment.overall_score < 70:
            insights.append("Financial statement quality concerns identified - enhanced due diligence recommended")
        
        # Anomaly insights
        high_risk_anomalies = [a for a in anomalies if a.severity in ["high", "critical"]]
        if len(high_risk_anomalies) > 2:
            insights.append("Multiple high-risk anomalies detected - comprehensive investigation required")
        
        return insights
    
    def _identify_management_attention_areas(self, statements: FinancialStatements,
                                           anomalies: List[AnomalyDetection]) -> List[str]:
        """Identify areas requiring management attention"""
        
        attention_areas = []
        
        # Cash flow management
        if statements.net_cash_from_operations < statements.net_income * 0.8:
            attention_areas.append("Cash flow management - operating cash flow not keeping pace with earnings")
        
        # Working capital management
        if statements.current_liabilities > 0:
            current_ratio = statements.current_assets / statements.current_liabilities
            if current_ratio < 1.2:
                attention_areas.append("Working capital management - liquidity position needs improvement")
        
        # Debt management
        if statements.shareholders_equity > 0:
            debt_to_equity = statements.total_liabilities / statements.shareholders_equity
            if debt_to_equity > 1.5:
                attention_areas.append("Debt management - high leverage levels require monitoring")
        
        # Anomaly-driven areas
        for anomaly in anomalies:
            if anomaly.severity in ["high", "critical"]:
                attention_areas.append(f"Address {anomaly.anomaly_type.value}: {anomaly.description}")
        
        return attention_areas
    
    def _identify_investor_focus_points(self, statements: FinancialStatements,
                                      quality_assessment: QualityAssessment) -> List[str]:
        """Identify points of focus for investors"""
        
        focus_points = []
        
        # Growth prospects
        if statements.revenue > 0 and statements.net_income > 0:
            focus_points.append("Revenue growth sustainability and market expansion opportunities")
        
        # Profitability trends
        focus_points.append("Margin improvement initiatives and cost management effectiveness")
        
        # Capital allocation
        if statements.net_cash_from_operations > 0:
            focus_points.append("Capital allocation strategy including dividends, buybacks, and reinvestment")
        
        # Quality concerns
        if quality_assessment.overall_score < 80:
            focus_points.append("Financial reporting quality and transparency improvements")
        
        # Competitive position
        focus_points.append("Market position sustainability and competitive advantages")
        
        return focus_points
    
    def _generate_audit_recommendations(self, anomalies: List[AnomalyDetection],
                                      quality_assessment: QualityAssessment) -> List[str]:
        """Generate audit recommendations"""
        
        recommendations = []
        
        # Anomaly-based recommendations
        revenue_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.REVENUE_MANIPULATION]
        if revenue_anomalies:
            recommendations.append("Enhanced revenue recognition testing and cut-off procedures")
        
        asset_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.ASSET_OVERSTATEMENT]
        if asset_anomalies:
            recommendations.append("Detailed asset valuation and impairment testing")
        
        cash_flow_anomalies = [a for a in anomalies if a.anomaly_type == AnomalyType.CASH_FLOW_MISMATCH]
        if cash_flow_anomalies:
            recommendations.append("Comprehensive cash flow statement reconciliation and testing")
        
        # Quality-based recommendations
        if quality_assessment.quality_metrics.get(QualityMetric.CONSISTENCY, 100) < 80:
            recommendations.append("Enhanced analytical procedures to test account relationships")
        
        if quality_assessment.quality_metrics.get(QualityMetric.COMPLETENESS, 100) < 90:
            recommendations.append("Comprehensive completeness testing for all financial statement line items")
        
        return recommendations


# Example usage
if __name__ == "__main__":
    # Sample financial statements
    sample_statements = FinancialStatements(
        revenue=2000000,
        cost_of_goods_sold=1200000,
        gross_profit=800000,
        operating_expenses=500000,
        operating_income=300000,
        interest_expense=20000,
        interest_income=5000,
        other_income=10000,
        earnings_before_tax=295000,
        tax_expense=75000,
        net_income=220000,
        
        cash_and_equivalents=150000,
        accounts_receivable=300000,
        inventory=200000,
        prepaid_expenses=50000,
        current_assets=700000,
        property_plant_equipment=800000,
        intangible_assets=200000,
        other_assets=100000,
        total_assets=1800000,
        
        accounts_payable=180000,
        accrued_liabilities=120000,
        short_term_debt=100000,
        current_liabilities=400000,
        long_term_debt=600000,
        other_liabilities=100000,
        total_liabilities=1100000,
        shareholders_equity=700000,
        
        net_cash_from_operations=250000,
        net_cash_from_investing=-150000,
        net_cash_from_financing=-50000,
        net_change_in_cash=50000,
        beginning_cash=100000,
        ending_cash=150000,
        
        shares_outstanding=1000000,
        period="Q4 2024",
        currency="USD"
    )
    
    # Perform analysis
    analyzer = FinancialStatementAnalyzer()
    result = analyzer.analyze_financial_statements(sample_statements, industry="technology")
    
    print("Automated Financial Statement Analysis Results:")
    print(f"Financial Health Score: {result.financial_health_score:.1f}")
    print(f"Earnings Quality Score: {result.earnings_quality_score:.1f}")
    print(f"Statement Quality Grade: {result.statement_quality.reliability_grade}")
    print(f"Anomalies Detected: {len(result.anomaly_detections)}")
    
    print("\nKey Insights:")
    for insight in result.key_insights:
        print(f"- {insight}")
    
    print("\nManagement Attention Areas:")
    for area in result.management_attention_areas:
        print(f"- {area}")
    
    if result.anomaly_detections:
        print("\nAnomalies Detected:")
        for anomaly in result.anomaly_detections:
            print(f"- {anomaly.anomaly_type.value} ({anomaly.severity}): {anomaly.description}")
