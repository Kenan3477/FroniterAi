"""
Automated Financial Statement Analysis Engine

Advanced algorithms for automated analysis of financial statements including
anomaly detection, trend analysis, quality assessment, and comprehensive insights.
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
from sklearn.cluster import DBSCAN
import warnings
warnings.filterwarnings('ignore')


class StatementType(str, Enum):
    """Types of financial statements"""
    INCOME_STATEMENT = "income_statement"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW_STATEMENT = "cash_flow_statement"
    STATEMENT_OF_EQUITY = "statement_of_equity"


class AnalysisType(str, Enum):
    """Types of financial analysis"""
    HORIZONTAL_ANALYSIS = "horizontal_analysis"
    VERTICAL_analysis = "vertical_analysis"
    RATIO_ANALYSIS = "ratio_analysis"
    TREND_ANALYSIS = "trend_analysis"
    ANOMALY_DETECTION = "anomaly_detection"
    QUALITY_ASSESSMENT = "quality_assessment"


class AnomalyType(str, Enum):
    """Types of financial anomalies"""
    STATISTICAL_OUTLIER = "statistical_outlier"
    TREND_BREAK = "trend_break"
    RATIO_INCONSISTENCY = "ratio_inconsistency"
    BENFORD_LAW_VIOLATION = "benford_law_violation"
    SEASONAL_DEVIATION = "seasonal_deviation"
    PEER_DEVIATION = "peer_deviation"


@dataclass
class FinancialStatement:
    """Financial statement data structure"""
    statement_type: StatementType
    period: str
    data: Dict[str, float]
    currency: str = "USD"
    reporting_standard: str = "GAAP"
    audited: bool = True
    
    # Additional metadata
    fiscal_year_end: Optional[str] = None
    reporting_frequency: str = "annual"  # annual, quarterly, monthly
    restatement: bool = False


@dataclass
class HistoricalStatements:
    """Collection of historical financial statements"""
    company_name: str
    statements: List[FinancialStatement]
    industry: str
    market_cap: Optional[float] = None
    
    # Statement organization
    income_statements: List[FinancialStatement] = None
    balance_sheets: List[FinancialStatement] = None
    cash_flow_statements: List[FinancialStatement] = None
    
    def __post_init__(self):
        """Organize statements by type"""
        self.income_statements = [s for s in self.statements if s.statement_type == StatementType.INCOME_STATEMENT]
        self.balance_sheets = [s for s in self.statements if s.statement_type == StatementType.BALANCE_SHEET]
        self.cash_flow_statements = [s for s in self.statements if s.statement_type == StatementType.CASH_FLOW_STATEMENT]


@dataclass
class FinancialAnomaly:
    """Financial anomaly detection result"""
    anomaly_type: AnomalyType
    severity: str  # low, medium, high, critical
    description: str
    affected_items: List[str]
    statistical_significance: float
    
    # Context
    period: str
    expected_value: Optional[float] = None
    actual_value: Optional[float] = None
    deviation_percentage: Optional[float] = None
    
    # Recommendations
    investigation_priority: str = "medium"
    suggested_actions: List[str] = None


@dataclass
class StatementQualityAssessment:
    """Financial statement quality assessment"""
    overall_quality_score: float  # 0-100
    reliability_indicators: Dict[str, float]
    red_flags: List[str]
    quality_trends: Dict[str, str]
    
    # Detailed assessments
    consistency_score: float
    completeness_score: float
    accuracy_indicators: Dict[str, float]
    transparency_score: float
    
    # Recommendations
    quality_improvement_suggestions: List[str]


class FinancialStatementAnalyzer:
    """Comprehensive automated financial statement analysis engine"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        
        # Standard financial statement line items
        self.standard_income_items = [
            'revenue', 'cost_of_goods_sold', 'gross_profit', 'operating_expenses',
            'operating_income', 'interest_expense', 'tax_expense', 'net_income',
            'ebitda', 'depreciation_and_amortization'
        ]
        
        self.standard_balance_items = [
            'total_assets', 'current_assets', 'cash_and_equivalents', 'accounts_receivable',
            'inventory', 'property_plant_equipment', 'total_liabilities', 'current_liabilities',
            'accounts_payable', 'long_term_debt', 'shareholders_equity', 'retained_earnings'
        ]
        
        self.standard_cashflow_items = [
            'operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow',
            'net_change_in_cash', 'capital_expenditures', 'free_cash_flow',
            'dividends_paid', 'stock_repurchases'
        ]
        
        # Quality indicators
        self.quality_metrics = {
            'revenue_quality', 'earnings_quality', 'balance_sheet_quality',
            'cash_flow_quality', 'disclosure_quality'
        }
    
    def comprehensive_statement_analysis(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """
        Perform comprehensive automated analysis of financial statements
        
        Args:
            historical_statements: Historical financial statement data
            
        Returns:
            Complete automated analysis results
        """
        
        # Horizontal analysis (period-over-period changes)
        horizontal_analysis = self._perform_horizontal_analysis(historical_statements)
        
        # Vertical analysis (common-size statements)
        vertical_analysis = self._perform_vertical_analysis(historical_statements)
        
        # Automated ratio analysis
        ratio_analysis = self._automated_ratio_analysis(historical_statements)
        
        # Trend analysis
        trend_analysis = self._comprehensive_trend_analysis(historical_statements)
        
        # Anomaly detection
        anomaly_detection = self._detect_financial_anomalies(historical_statements)
        
        # Quality assessment
        quality_assessment = self._assess_statement_quality(historical_statements)
        
        # Pattern recognition
        pattern_analysis = self._identify_financial_patterns(historical_statements)
        
        # Predictive insights
        predictive_insights = self._generate_predictive_insights(historical_statements)
        
        # Executive summary
        executive_summary = self._create_executive_summary(
            historical_statements, horizontal_analysis, vertical_analysis,
            ratio_analysis, trend_analysis, anomaly_detection, quality_assessment
        )
        
        return {
            "executive_summary": executive_summary,
            "horizontal_analysis": horizontal_analysis,
            "vertical_analysis": vertical_analysis,
            "ratio_analysis": ratio_analysis,
            "trend_analysis": trend_analysis,
            "anomaly_detection": anomaly_detection,
            "quality_assessment": quality_assessment,
            "pattern_analysis": pattern_analysis,
            "predictive_insights": predictive_insights,
            "analysis_metadata": {
                "analysis_date": pd.Timestamp.now().isoformat(),
                "periods_analyzed": len(historical_statements.statements),
                "statement_types": list(set(s.statement_type for s in historical_statements.statements)),
                "data_quality_score": quality_assessment.overall_quality_score
            }
        }
    
    def automated_red_flag_detection(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """
        Automated detection of financial red flags and warning signs
        
        Args:
            historical_statements: Financial statement data
            
        Returns:
            Red flag analysis results
        """
        
        red_flags = []
        
        # Revenue recognition red flags
        revenue_flags = self._detect_revenue_red_flags(historical_statements)
        red_flags.extend(revenue_flags)
        
        # Earnings management red flags
        earnings_flags = self._detect_earnings_management_flags(historical_statements)
        red_flags.extend(earnings_flags)
        
        # Balance sheet red flags
        balance_sheet_flags = self._detect_balance_sheet_red_flags(historical_statements)
        red_flags.extend(balance_sheet_flags)
        
        # Cash flow red flags
        cash_flow_flags = self._detect_cash_flow_red_flags(historical_statements)
        red_flags.extend(cash_flow_flags)
        
        # Related party transaction flags
        related_party_flags = self._detect_related_party_flags(historical_statements)
        red_flags.extend(related_party_flags)
        
        # Overall risk assessment
        risk_score = self._calculate_overall_risk_score(red_flags)
        
        return {
            "overall_risk_score": risk_score,
            "risk_level": self._categorize_risk_level(risk_score),
            "red_flags_by_category": {
                "revenue_recognition": revenue_flags,
                "earnings_management": earnings_flags,
                "balance_sheet": balance_sheet_flags,
                "cash_flow": cash_flow_flags,
                "related_party": related_party_flags
            },
            "critical_flags": [flag for flag in red_flags if flag.severity == "critical"],
            "investigation_priorities": self._prioritize_investigations(red_flags),
            "monitoring_recommendations": self._generate_monitoring_recommendations(red_flags)
        }
    
    def earnings_quality_analysis(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """
        Comprehensive earnings quality analysis
        
        Args:
            historical_statements: Financial statement data
            
        Returns:
            Earnings quality assessment results
        """
        
        # Accruals quality
        accruals_quality = self._analyze_accruals_quality(historical_statements)
        
        # Earnings persistence
        persistence_analysis = self._analyze_earnings_persistence(historical_statements)
        
        # Earnings predictability
        predictability_analysis = self._analyze_earnings_predictability(historical_statements)
        
        # Revenue quality
        revenue_quality = self._analyze_revenue_quality(historical_statements)
        
        # Cash flow vs earnings analysis
        cash_earnings_analysis = self._analyze_cash_vs_earnings(historical_statements)
        
        # Overall earnings quality score
        overall_score = self._calculate_earnings_quality_score(
            accruals_quality, persistence_analysis, predictability_analysis,
            revenue_quality, cash_earnings_analysis
        )
        
        return {
            "overall_earnings_quality_score": overall_score,
            "earnings_quality_grade": self._score_to_grade(overall_score),
            "component_analysis": {
                "accruals_quality": accruals_quality,
                "earnings_persistence": persistence_analysis,
                "earnings_predictability": predictability_analysis,
                "revenue_quality": revenue_quality,
                "cash_vs_earnings": cash_earnings_analysis
            },
            "quality_trends": self._analyze_quality_trends(historical_statements),
            "peer_comparison": self._compare_earnings_quality_to_peers(historical_statements),
            "improvement_recommendations": self._generate_earnings_quality_recommendations(overall_score)
        }
    
    def financial_statement_forecasting(self, historical_statements: HistoricalStatements,
                                      forecast_periods: int = 3) -> Dict[str, Any]:
        """
        Automated financial statement forecasting
        
        Args:
            historical_statements: Historical financial data
            forecast_periods: Number of periods to forecast
            
        Returns:
            Financial statement forecasts
        """
        
        # Income statement forecasting
        income_forecasts = self._forecast_income_statement(historical_statements, forecast_periods)
        
        # Balance sheet forecasting
        balance_forecasts = self._forecast_balance_sheet(historical_statements, forecast_periods)
        
        # Cash flow statement forecasting
        cashflow_forecasts = self._forecast_cash_flow_statement(historical_statements, forecast_periods)
        
        # Forecast validation and reasonableness checks
        validation_results = self._validate_forecasts(
            income_forecasts, balance_forecasts, cashflow_forecasts
        )
        
        # Scenario analysis
        scenario_forecasts = self._generate_scenario_forecasts(
            historical_statements, forecast_periods
        )
        
        # Forecast accuracy metrics
        accuracy_metrics = self._calculate_forecast_accuracy(historical_statements)
        
        return {
            "forecast_periods": forecast_periods,
            "income_statement_forecasts": income_forecasts,
            "balance_sheet_forecasts": balance_forecasts,
            "cash_flow_forecasts": cashflow_forecasts,
            "scenario_analysis": scenario_forecasts,
            "validation_results": validation_results,
            "accuracy_metrics": accuracy_metrics,
            "key_assumptions": self._extract_forecast_assumptions(historical_statements),
            "sensitivity_analysis": self._perform_forecast_sensitivity_analysis(
                income_forecasts, balance_forecasts, cashflow_forecasts
            )
        }
    
    def _perform_horizontal_analysis(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """Perform horizontal analysis (period-over-period changes)"""
        
        horizontal_results = {}
        
        # Income statement horizontal analysis
        if len(historical_statements.income_statements) >= 2:
            horizontal_results["income_statement"] = self._calculate_horizontal_changes(
                historical_statements.income_statements, self.standard_income_items
            )
        
        # Balance sheet horizontal analysis
        if len(historical_statements.balance_sheets) >= 2:
            horizontal_results["balance_sheet"] = self._calculate_horizontal_changes(
                historical_statements.balance_sheets, self.standard_balance_items
            )
        
        # Cash flow horizontal analysis
        if len(historical_statements.cash_flow_statements) >= 2:
            horizontal_results["cash_flow"] = self._calculate_horizontal_changes(
                historical_statements.cash_flow_statements, self.standard_cashflow_items
            )
        
        return horizontal_results
    
    def _calculate_horizontal_changes(self, statements: List[FinancialStatement],
                                    line_items: List[str]) -> Dict[str, Any]:
        """Calculate horizontal changes for a statement type"""
        
        if len(statements) < 2:
            return {}
        
        # Sort statements by period
        sorted_statements = sorted(statements, key=lambda x: x.period)
        
        changes = {}
        for i in range(1, len(sorted_statements)):
            current = sorted_statements[i]
            previous = sorted_statements[i-1]
            
            period_key = f"{previous.period}_to_{current.period}"
            changes[period_key] = {}
            
            for item in line_items:
                if item in current.data and item in previous.data:
                    current_value = current.data[item]
                    previous_value = previous.data[item]
                    
                    if previous_value != 0:
                        percentage_change = (current_value - previous_value) / abs(previous_value) * 100
                    else:
                        percentage_change = 0 if current_value == 0 else float('inf')
                    
                    changes[period_key][item] = {
                        "absolute_change": current_value - previous_value,
                        "percentage_change": percentage_change,
                        "current_value": current_value,
                        "previous_value": previous_value
                    }
        
        return changes
    
    def _perform_vertical_analysis(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """Perform vertical analysis (common-size statements)"""
        
        vertical_results = {}
        
        # Income statement vertical analysis (% of revenue)
        if historical_statements.income_statements:
            vertical_results["income_statement"] = self._calculate_common_size_income(
                historical_statements.income_statements
            )
        
        # Balance sheet vertical analysis (% of total assets)
        if historical_statements.balance_sheets:
            vertical_results["balance_sheet"] = self._calculate_common_size_balance(
                historical_statements.balance_sheets
            )
        
        return vertical_results
    
    def _calculate_common_size_income(self, statements: List[FinancialStatement]) -> Dict[str, Any]:
        """Calculate common-size income statement"""
        
        common_size = {}
        
        for statement in statements:
            period = statement.period
            revenue = statement.data.get('revenue', 0)
            
            if revenue == 0:
                continue
            
            common_size[period] = {}
            for item, value in statement.data.items():
                common_size[period][item] = {
                    "amount": value,
                    "percentage_of_revenue": (value / revenue * 100) if revenue != 0 else 0
                }
        
        return common_size
    
    def _calculate_common_size_balance(self, statements: List[FinancialStatement]) -> Dict[str, Any]:
        """Calculate common-size balance sheet"""
        
        common_size = {}
        
        for statement in statements:
            period = statement.period
            total_assets = statement.data.get('total_assets', 0)
            
            if total_assets == 0:
                continue
            
            common_size[period] = {}
            for item, value in statement.data.items():
                common_size[period][item] = {
                    "amount": value,
                    "percentage_of_assets": (value / total_assets * 100) if total_assets != 0 else 0
                }
        
        return common_size
    
    def _automated_ratio_analysis(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """Perform automated ratio analysis"""
        
        ratios = {}
        
        for statement in historical_statements.statements:
            period = statement.period
            
            if statement.statement_type == StatementType.INCOME_STATEMENT:
                # Get corresponding balance sheet for the same period
                balance_sheet = self._find_matching_statement(
                    historical_statements.balance_sheets, period
                )
                
                if balance_sheet:
                    ratios[period] = self._calculate_comprehensive_ratios(statement, balance_sheet)
        
        # Ratio trends
        ratio_trends = self._analyze_ratio_trends(ratios)
        
        return {
            "ratios_by_period": ratios,
            "ratio_trends": ratio_trends,
            "ratio_analysis_summary": self._summarize_ratio_analysis(ratios, ratio_trends)
        }
    
    def _calculate_comprehensive_ratios(self, income_statement: FinancialStatement,
                                      balance_sheet: FinancialStatement) -> Dict[str, float]:
        """Calculate comprehensive financial ratios"""
        
        # Income statement data
        revenue = income_statement.data.get('revenue', 0)
        net_income = income_statement.data.get('net_income', 0)
        operating_income = income_statement.data.get('operating_income', 0)
        gross_profit = income_statement.data.get('gross_profit', 0)
        cost_of_goods_sold = income_statement.data.get('cost_of_goods_sold', 0)
        
        # Balance sheet data
        total_assets = balance_sheet.data.get('total_assets', 0)
        current_assets = balance_sheet.data.get('current_assets', 0)
        current_liabilities = balance_sheet.data.get('current_liabilities', 0)
        total_debt = balance_sheet.data.get('long_term_debt', 0) + balance_sheet.data.get('current_liabilities', 0)
        shareholders_equity = balance_sheet.data.get('shareholders_equity', 0)
        cash = balance_sheet.data.get('cash_and_equivalents', 0)
        accounts_receivable = balance_sheet.data.get('accounts_receivable', 0)
        inventory = balance_sheet.data.get('inventory', 0)
        
        ratios = {}
        
        # Profitability ratios
        ratios['gross_margin'] = (gross_profit / revenue * 100) if revenue > 0 else 0
        ratios['operating_margin'] = (operating_income / revenue * 100) if revenue > 0 else 0
        ratios['net_margin'] = (net_income / revenue * 100) if revenue > 0 else 0
        ratios['roa'] = (net_income / total_assets * 100) if total_assets > 0 else 0
        ratios['roe'] = (net_income / shareholders_equity * 100) if shareholders_equity > 0 else 0
        
        # Liquidity ratios
        ratios['current_ratio'] = (current_assets / current_liabilities) if current_liabilities > 0 else 0
        ratios['quick_ratio'] = ((current_assets - inventory) / current_liabilities) if current_liabilities > 0 else 0
        ratios['cash_ratio'] = (cash / current_liabilities) if current_liabilities > 0 else 0
        
        # Leverage ratios
        ratios['debt_to_equity'] = (total_debt / shareholders_equity) if shareholders_equity > 0 else 0
        ratios['debt_to_assets'] = (total_debt / total_assets) if total_assets > 0 else 0
        
        # Efficiency ratios
        ratios['asset_turnover'] = (revenue / total_assets) if total_assets > 0 else 0
        ratios['receivables_turnover'] = (revenue / accounts_receivable) if accounts_receivable > 0 else 0
        ratios['inventory_turnover'] = (cost_of_goods_sold / inventory) if inventory > 0 else 0
        
        return ratios
    
    def _comprehensive_trend_analysis(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """Perform comprehensive trend analysis"""
        
        trends = {}
        
        # Revenue trends
        revenue_data = self._extract_time_series_data(
            historical_statements.income_statements, 'revenue'
        )
        if revenue_data:
            trends['revenue'] = self._analyze_time_series_trend(revenue_data)
        
        # Profitability trends
        profitability_metrics = ['gross_profit', 'operating_income', 'net_income']
        for metric in profitability_metrics:
            data = self._extract_time_series_data(
                historical_statements.income_statements, metric
            )
            if data:
                trends[metric] = self._analyze_time_series_trend(data)
        
        # Balance sheet trends
        balance_metrics = ['total_assets', 'total_debt', 'shareholders_equity']
        for metric in balance_metrics:
            data = self._extract_time_series_data(
                historical_statements.balance_sheets, metric
            )
            if data:
                trends[metric] = self._analyze_time_series_trend(data)
        
        # Overall trend summary
        trend_summary = self._summarize_trends(trends)
        
        return {
            "individual_trends": trends,
            "trend_summary": trend_summary,
            "trend_quality_score": self._calculate_trend_quality_score(trends)
        }
    
    def _extract_time_series_data(self, statements: List[FinancialStatement],
                                 metric: str) -> List[Tuple[str, float]]:
        """Extract time series data for a specific metric"""
        
        data = []
        for statement in statements:
            if metric in statement.data:
                data.append((statement.period, statement.data[metric]))
        
        # Sort by period
        data.sort(key=lambda x: x[0])
        return data
    
    def _analyze_time_series_trend(self, data: List[Tuple[str, float]]) -> Dict[str, Any]:
        """Analyze trend for time series data"""
        
        if len(data) < 2:
            return {"trend": "insufficient_data"}
        
        values = [item[1] for item in data]
        periods = list(range(len(values)))
        
        # Calculate trend using linear regression
        if len(values) >= 2:
            slope, intercept, r_value, p_value, std_err = stats.linregress(periods, values)
            
            # Determine trend direction
            if abs(slope) < 0.01 * np.mean(values):
                trend_direction = "stable"
            elif slope > 0:
                trend_direction = "increasing"
            else:
                trend_direction = "decreasing"
            
            # Calculate growth rate
            if len(values) >= 2 and values[0] != 0:
                cagr = (values[-1] / values[0]) ** (1 / (len(values) - 1)) - 1
            else:
                cagr = 0
            
            return {
                "trend": trend_direction,
                "slope": slope,
                "r_squared": r_value ** 2,
                "p_value": p_value,
                "cagr": cagr * 100,  # Convert to percentage
                "volatility": np.std(values) / np.mean(values) if np.mean(values) != 0 else 0,
                "data_points": len(values)
            }
        
        return {"trend": "insufficient_data"}
    
    def _detect_financial_anomalies(self, historical_statements: HistoricalStatements) -> Dict[str, Any]:
        """Detect financial anomalies using multiple techniques"""
        
        anomalies = []
        
        # Statistical outlier detection
        statistical_anomalies = self._detect_statistical_outliers(historical_statements)
        anomalies.extend(statistical_anomalies)
        
        # Trend break detection
        trend_anomalies = self._detect_trend_breaks(historical_statements)
        anomalies.extend(trend_anomalies)
        
        # Ratio inconsistency detection
        ratio_anomalies = self._detect_ratio_inconsistencies(historical_statements)
        anomalies.extend(ratio_anomalies)
        
        # Benford's Law analysis
        benford_anomalies = self._analyze_benfords_law(historical_statements)
        anomalies.extend(benford_anomalies)
        
        # Seasonal deviation detection
        seasonal_anomalies = self._detect_seasonal_deviations(historical_statements)
        anomalies.extend(seasonal_anomalies)
        
        # Prioritize anomalies by severity
        critical_anomalies = [a for a in anomalies if a.severity == "critical"]
        high_anomalies = [a for a in anomalies if a.severity == "high"]
        
        return {
            "total_anomalies_detected": len(anomalies),
            "critical_anomalies": critical_anomalies,
            "high_priority_anomalies": high_anomalies,
            "all_anomalies": anomalies,
            "anomaly_summary": self._summarize_anomalies(anomalies),
            "investigation_recommendations": self._generate_anomaly_investigation_plan(anomalies)
        }
    
    def _detect_statistical_outliers(self, historical_statements: HistoricalStatements) -> List[FinancialAnomaly]:
        """Detect statistical outliers in financial data"""
        
        anomalies = []
        
        # Analyze key metrics for outliers
        key_metrics = ['revenue', 'net_income', 'total_assets', 'operating_cash_flow']
        
        for metric in key_metrics:
            # Get data for income statements
            income_data = self._extract_time_series_data(
                historical_statements.income_statements, metric
            )
            
            if len(income_data) >= 5:  # Need sufficient data points
                values = [item[1] for item in income_data]
                periods = [item[0] for item in income_data]
                
                # Use IQR method for outlier detection
                q1 = np.percentile(values, 25)
                q3 = np.percentile(values, 75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                for i, (period, value) in enumerate(zip(periods, values)):
                    if value < lower_bound or value > upper_bound:
                        # Calculate deviation percentage
                        median_value = np.median(values)
                        deviation_pct = abs(value - median_value) / median_value * 100 if median_value != 0 else 0
                        
                        severity = "critical" if deviation_pct > 50 else "high" if deviation_pct > 25 else "medium"
                        
                        anomaly = FinancialAnomaly(
                            anomaly_type=AnomalyType.STATISTICAL_OUTLIER,
                            severity=severity,
                            description=f"{metric} in {period} is a statistical outlier",
                            affected_items=[metric],
                            statistical_significance=deviation_pct,
                            period=period,
                            expected_value=median_value,
                            actual_value=value,
                            deviation_percentage=deviation_pct,
                            suggested_actions=[
                                f"Investigate {metric} calculation for {period}",
                                "Verify underlying business events",
                                "Check for one-time items or restatements"
                            ]
                        )
                        anomalies.append(anomaly)
        
        return anomalies
    
    def _detect_trend_breaks(self, historical_statements: HistoricalStatements) -> List[FinancialAnomaly]:
        """Detect significant trend breaks in financial data"""
        
        anomalies = []
        
        # Analyze revenue trend breaks
        revenue_data = self._extract_time_series_data(
            historical_statements.income_statements, 'revenue'
        )
        
        if len(revenue_data) >= 4:  # Need sufficient data for trend analysis
            values = [item[1] for item in revenue_data]
            periods = [item[0] for item in revenue_data]
            
            # Calculate rolling growth rates
            growth_rates = []
            for i in range(1, len(values)):
                if values[i-1] != 0:
                    growth_rate = (values[i] - values[i-1]) / abs(values[i-1])
                    growth_rates.append((periods[i], growth_rate))
            
            # Detect significant changes in growth rate
            if len(growth_rates) >= 3:
                for i in range(2, len(growth_rates)):
                    current_growth = growth_rates[i][1]
                    prev_avg_growth = np.mean([gr[1] for gr in growth_rates[i-2:i]])
                    
                    # Check for significant deviation
                    if abs(current_growth - prev_avg_growth) > 0.2:  # 20% deviation
                        severity = "high" if abs(current_growth - prev_avg_growth) > 0.5 else "medium"
                        
                        anomaly = FinancialAnomaly(
                            anomaly_type=AnomalyType.TREND_BREAK,
                            severity=severity,
                            description=f"Significant trend break in revenue growth in {growth_rates[i][0]}",
                            affected_items=["revenue"],
                            statistical_significance=abs(current_growth - prev_avg_growth) * 100,
                            period=growth_rates[i][0],
                            suggested_actions=[
                                "Analyze market conditions and competitive factors",
                                "Review business strategy changes",
                                "Investigate operational changes"
                            ]
                        )
                        anomalies.append(anomaly)
        
        return anomalies
    
    def _detect_ratio_inconsistencies(self, historical_statements: HistoricalStatements) -> List[FinancialAnomaly]:
        """Detect inconsistencies in financial ratios"""
        
        anomalies = []
        
        # Check for impossible or highly unusual ratio combinations
        for period in [s.period for s in historical_statements.statements]:
            income_stmt = self._find_matching_statement(historical_statements.income_statements, period)
            balance_sheet = self._find_matching_statement(historical_statements.balance_sheets, period)
            
            if income_stmt and balance_sheet:
                ratios = self._calculate_comprehensive_ratios(income_stmt, balance_sheet)
                
                # Check for ratio inconsistencies
                inconsistencies = self._identify_ratio_inconsistencies(ratios, period)
                anomalies.extend(inconsistencies)
        
        return anomalies
    
    def _identify_ratio_inconsistencies(self, ratios: Dict[str, float], period: str) -> List[FinancialAnomaly]:
        """Identify specific ratio inconsistencies"""
        
        inconsistencies = []
        
        # Check for impossible values
        if ratios.get('current_ratio', 0) < 0:
            inconsistencies.append(FinancialAnomaly(
                anomaly_type=AnomalyType.RATIO_INCONSISTENCY,
                severity="critical",
                description="Negative current ratio detected",
                affected_items=["current_ratio"],
                statistical_significance=100,
                period=period
            ))
        
        # Check for highly unusual combinations
        if ratios.get('roe', 0) > 100 and ratios.get('debt_to_equity', 0) < 0.1:
            inconsistencies.append(FinancialAnomaly(
                anomaly_type=AnomalyType.RATIO_INCONSISTENCY,
                severity="high",
                description="Extremely high ROE with very low leverage - unusual combination",
                affected_items=["roe", "debt_to_equity"],
                statistical_significance=95,
                period=period
            ))
        
        return inconsistencies
    
    def _analyze_benfords_law(self, historical_statements: HistoricalStatements) -> List[FinancialAnomaly]:
        """Analyze financial data against Benford's Law"""
        
        anomalies = []
        
        # Collect all financial figures
        all_figures = []
        for statement in historical_statements.statements:
            for value in statement.data.values():
                if value > 0:  # Only positive values
                    all_figures.append(value)
        
        if len(all_figures) >= 50:  # Need sufficient sample size
            # Get first digits
            first_digits = [int(str(int(abs(x)))[0]) for x in all_figures if x >= 1]
            
            if len(first_digits) >= 50:
                # Calculate observed frequencies
                observed_freq = {}
                for digit in range(1, 10):
                    observed_freq[digit] = first_digits.count(digit) / len(first_digits)
                
                # Benford's Law expected frequencies
                expected_freq = {}
                for digit in range(1, 10):
                    expected_freq[digit] = math.log10(1 + 1/digit)
                
                # Chi-square test
                chi_square = 0
                for digit in range(1, 10):
                    expected_count = expected_freq[digit] * len(first_digits)
                    observed_count = observed_freq[digit] * len(first_digits)
                    if expected_count > 0:
                        chi_square += (observed_count - expected_count) ** 2 / expected_count
                
                # Check if deviation is significant
                critical_value = 15.507  # Chi-square critical value for 8 degrees of freedom at 95% confidence
                
                if chi_square > critical_value:
                    anomalies.append(FinancialAnomaly(
                        anomaly_type=AnomalyType.BENFORD_LAW_VIOLATION,
                        severity="medium",
                        description="Financial data shows significant deviation from Benford's Law",
                        affected_items=["financial_figures"],
                        statistical_significance=chi_square,
                        period="all_periods",
                        suggested_actions=[
                            "Review data entry procedures",
                            "Check for potential data manipulation",
                            "Investigate rounding or approximation practices"
                        ]
                    ))
        
        return anomalies
    
    def _detect_seasonal_deviations(self, historical_statements: HistoricalStatements) -> List[FinancialAnomaly]:
        """Detect seasonal deviations in quarterly data"""
        
        anomalies = []
        
        # Only analyze if we have quarterly data
        quarterly_statements = [s for s in historical_statements.statements if 'Q' in s.period]
        
        if len(quarterly_statements) >= 8:  # At least 2 years of quarterly data
            # Group by quarter
            quarters = {}
            for stmt in quarterly_statements:
                quarter = stmt.period[-2:]  # Extract Q1, Q2, Q3, Q4
                if quarter not in quarters:
                    quarters[quarter] = []
                quarters[quarter].append(stmt)
            
            # Analyze revenue seasonality
            for quarter, stmts in quarters.items():
                if len(stmts) >= 3:  # Need multiple years
                    revenues = [s.data.get('revenue', 0) for s in stmts]
                    if revenues and all(r > 0 for r in revenues):
                        # Calculate coefficient of variation
                        cv = np.std(revenues) / np.mean(revenues)
                        
                        # If CV is very high for a specific quarter, flag as anomaly
                        if cv > 0.3:  # 30% coefficient of variation
                            anomalies.append(FinancialAnomaly(
                                anomaly_type=AnomalyType.SEASONAL_DEVIATION,
                                severity="medium",
                                description=f"High revenue volatility detected in {quarter}",
                                affected_items=["revenue"],
                                statistical_significance=cv * 100,
                                period=quarter,
                                suggested_actions=[
                                    f"Investigate business factors affecting {quarter} performance",
                                    "Review seasonal adjustment procedures",
                                    "Analyze industry seasonal patterns"
                                ]
                            ))
        
        return anomalies
    
    def _assess_statement_quality(self, historical_statements: HistoricalStatements) -> StatementQualityAssessment:
        """Assess overall quality of financial statements"""
        
        # Consistency assessment
        consistency_score = self._assess_consistency(historical_statements)
        
        # Completeness assessment
        completeness_score = self._assess_completeness(historical_statements)
        
        # Accuracy indicators
        accuracy_indicators = self._assess_accuracy_indicators(historical_statements)
        
        # Transparency assessment
        transparency_score = self._assess_transparency(historical_statements)
        
        # Reliability indicators
        reliability_indicators = {
            "audit_status": self._assess_audit_status(historical_statements),
            "restatement_frequency": self._assess_restatement_frequency(historical_statements),
            "reporting_timeliness": self._assess_reporting_timeliness(historical_statements)
        }
        
        # Overall quality score
        overall_quality = (
            consistency_score * 0.25 +
            completeness_score * 0.25 +
            np.mean(list(accuracy_indicators.values())) * 0.25 +
            transparency_score * 0.25
        )
        
        # Identify red flags
        red_flags = self._identify_quality_red_flags(
            historical_statements, consistency_score, completeness_score,
            accuracy_indicators, transparency_score
        )
        
        # Quality trends
        quality_trends = self._analyze_quality_trends_over_time(historical_statements)
        
        # Improvement suggestions
        improvement_suggestions = self._generate_quality_improvement_suggestions(
            consistency_score, completeness_score, accuracy_indicators, transparency_score
        )
        
        return StatementQualityAssessment(
            overall_quality_score=overall_quality,
            reliability_indicators=reliability_indicators,
            red_flags=red_flags,
            quality_trends=quality_trends,
            consistency_score=consistency_score,
            completeness_score=completeness_score,
            accuracy_indicators=accuracy_indicators,
            transparency_score=transparency_score,
            quality_improvement_suggestions=improvement_suggestions
        )
    
    def _assess_consistency(self, historical_statements: HistoricalStatements) -> float:
        """Assess consistency of financial statements"""
        
        consistency_factors = []
        
        # Check accounting method consistency
        reporting_standards = [s.reporting_standard for s in historical_statements.statements]
        if len(set(reporting_standards)) == 1:
            consistency_factors.append(100)  # Consistent standards
        else:
            consistency_factors.append(60)   # Mixed standards
        
        # Check period consistency
        periods = [s.reporting_frequency for s in historical_statements.statements]
        if len(set(periods)) == 1:
            consistency_factors.append(100)  # Consistent frequency
        else:
            consistency_factors.append(70)   # Mixed frequency
        
        # Check data completeness consistency
        completeness_scores = []
        for stmt in historical_statements.statements:
            if stmt.statement_type == StatementType.INCOME_STATEMENT:
                expected_items = self.standard_income_items
            elif stmt.statement_type == StatementType.BALANCE_SHEET:
                expected_items = self.standard_balance_items
            else:
                expected_items = self.standard_cashflow_items
            
            present_items = len([item for item in expected_items if item in stmt.data])
            completeness_scores.append(present_items / len(expected_items) * 100)
        
        if completeness_scores:
            avg_completeness = np.mean(completeness_scores)
            consistency_factors.append(avg_completeness)
        
        return np.mean(consistency_factors) if consistency_factors else 50
    
    def _assess_completeness(self, historical_statements: HistoricalStatements) -> float:
        """Assess completeness of financial statement data"""
        
        completeness_scores = []
        
        # Check each statement type
        statement_types = [StatementType.INCOME_STATEMENT, StatementType.BALANCE_SHEET, StatementType.CASH_FLOW_STATEMENT]
        
        for stmt_type in statement_types:
            statements = [s for s in historical_statements.statements if s.statement_type == stmt_type]
            
            if statements:
                if stmt_type == StatementType.INCOME_STATEMENT:
                    expected_items = self.standard_income_items
                elif stmt_type == StatementType.BALANCE_SHEET:
                    expected_items = self.standard_balance_items
                else:
                    expected_items = self.standard_cashflow_items
                
                # Average completeness across periods
                period_completeness = []
                for stmt in statements:
                    present_items = len([item for item in expected_items if item in stmt.data and stmt.data[item] is not None])
                    period_completeness.append(present_items / len(expected_items) * 100)
                
                if period_completeness:
                    completeness_scores.append(np.mean(period_completeness))
        
        return np.mean(completeness_scores) if completeness_scores else 0
    
    def _assess_accuracy_indicators(self, historical_statements: HistoricalStatements) -> Dict[str, float]:
        """Assess accuracy indicators"""
        
        indicators = {}
        
        # Balance sheet equation check
        balance_accuracy = self._check_balance_sheet_equation(historical_statements)
        indicators["balance_sheet_equation"] = balance_accuracy
        
        # Cash flow reconciliation
        cash_flow_accuracy = self._check_cash_flow_reconciliation(historical_statements)
        indicators["cash_flow_reconciliation"] = cash_flow_accuracy
        
        # Arithmetic consistency
        arithmetic_accuracy = self._check_arithmetic_consistency(historical_statements)
        indicators["arithmetic_consistency"] = arithmetic_accuracy
        
        return indicators
    
    def _check_balance_sheet_equation(self, historical_statements: HistoricalStatements) -> float:
        """Check balance sheet equation: Assets = Liabilities + Equity"""
        
        accuracy_scores = []
        
        for balance_sheet in historical_statements.balance_sheets:
            total_assets = balance_sheet.data.get('total_assets', 0)
            total_liabilities = balance_sheet.data.get('total_liabilities', 0)
            shareholders_equity = balance_sheet.data.get('shareholders_equity', 0)
            
            if total_assets > 0:
                difference = abs(total_assets - (total_liabilities + shareholders_equity))
                accuracy_percentage = max(0, 100 - (difference / total_assets * 100))
                accuracy_scores.append(accuracy_percentage)
        
        return np.mean(accuracy_scores) if accuracy_scores else 0
    
    def _check_cash_flow_reconciliation(self, historical_statements: HistoricalStatements) -> float:
        """Check cash flow statement reconciliation"""
        
        accuracy_scores = []
        
        for cash_flow_stmt in historical_statements.cash_flow_statements:
            operating_cf = cash_flow_stmt.data.get('operating_cash_flow', 0)
            investing_cf = cash_flow_stmt.data.get('investing_cash_flow', 0)
            financing_cf = cash_flow_stmt.data.get('financing_cash_flow', 0)
            net_change = cash_flow_stmt.data.get('net_change_in_cash', 0)
            
            calculated_change = operating_cf + investing_cf + financing_cf
            
            if abs(net_change) > 0:
                difference = abs(calculated_change - net_change)
                accuracy_percentage = max(0, 100 - (difference / abs(net_change) * 100))
                accuracy_scores.append(accuracy_percentage)
        
        return np.mean(accuracy_scores) if accuracy_scores else 0
    
    def _check_arithmetic_consistency(self, historical_statements: HistoricalStatements) -> float:
        """Check arithmetic consistency in statements"""
        
        accuracy_scores = []
        
        # Check income statement arithmetic
        for income_stmt in historical_statements.income_statements:
            revenue = income_stmt.data.get('revenue', 0)
            cogs = income_stmt.data.get('cost_of_goods_sold', 0)
            gross_profit = income_stmt.data.get('gross_profit', 0)
            
            if revenue > 0 and gross_profit > 0:
                calculated_gross = revenue - cogs
                difference = abs(calculated_gross - gross_profit)
                accuracy_percentage = max(0, 100 - (difference / gross_profit * 100))
                accuracy_scores.append(accuracy_percentage)
        
        return np.mean(accuracy_scores) if accuracy_scores else 100
    
    def _assess_transparency(self, historical_statements: HistoricalStatements) -> float:
        """Assess transparency of financial reporting"""
        
        transparency_factors = []
        
        # Check for audited statements
        audited_count = len([s for s in historical_statements.statements if s.audited])
        audit_transparency = (audited_count / len(historical_statements.statements) * 100) if historical_statements.statements else 0
        transparency_factors.append(audit_transparency)
        
        # Check for restatements (lower transparency if frequent restatements)
        restatement_count = len([s for s in historical_statements.statements if s.restatement])
        restatement_penalty = min(restatement_count * 10, 30)  # Max 30% penalty
        restatement_transparency = 100 - restatement_penalty
        transparency_factors.append(restatement_transparency)
        
        # Check data richness (more line items = higher transparency)
        avg_line_items = np.mean([len(s.data) for s in historical_statements.statements])
        if avg_line_items >= 20:
            richness_score = 100
        elif avg_line_items >= 15:
            richness_score = 80
        elif avg_line_items >= 10:
            richness_score = 60
        else:
            richness_score = 40
        transparency_factors.append(richness_score)
        
        return np.mean(transparency_factors) if transparency_factors else 50
    
    # Helper methods
    def _find_matching_statement(self, statements: List[FinancialStatement], period: str) -> Optional[FinancialStatement]:
        """Find statement matching a specific period"""
        for stmt in statements:
            if stmt.period == period:
                return stmt
        return None
    
    def _summarize_anomalies(self, anomalies: List[FinancialAnomaly]) -> Dict[str, Any]:
        """Summarize detected anomalies"""
        
        severity_counts = {
            "critical": len([a for a in anomalies if a.severity == "critical"]),
            "high": len([a for a in anomalies if a.severity == "high"]),
            "medium": len([a for a in anomalies if a.severity == "medium"]),
            "low": len([a for a in anomalies if a.severity == "low"])
        }
        
        type_counts = {}
        for anomaly_type in AnomalyType:
            type_counts[anomaly_type.value] = len([a for a in anomalies if a.anomaly_type == anomaly_type])
        
        return {
            "severity_distribution": severity_counts,
            "type_distribution": type_counts,
            "average_significance": np.mean([a.statistical_significance for a in anomalies]) if anomalies else 0,
            "most_affected_periods": self._get_most_affected_periods(anomalies)
        }
    
    def _get_most_affected_periods(self, anomalies: List[FinancialAnomaly]) -> List[str]:
        """Get periods with most anomalies"""
        
        period_counts = {}
        for anomaly in anomalies:
            period = anomaly.period
            period_counts[period] = period_counts.get(period, 0) + 1
        
        # Sort by count and return top 3
        sorted_periods = sorted(period_counts.items(), key=lambda x: x[1], reverse=True)
        return [period for period, count in sorted_periods[:3]]
    
    def _score_to_grade(self, score: float) -> str:
        """Convert numeric score to letter grade"""
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    # Additional helper methods would be implemented here for:
    # - Revenue red flag detection
    # - Earnings management flag detection
    # - Balance sheet red flag detection
    # - Cash flow red flag detection
    # - Forecasting algorithms
    # - Quality trend analysis
    # - And other supporting functionality
    
    def _create_executive_summary(self, historical_statements: HistoricalStatements,
                                horizontal_analysis: Dict, vertical_analysis: Dict,
                                ratio_analysis: Dict, trend_analysis: Dict,
                                anomaly_detection: Dict, quality_assessment: StatementQualityAssessment) -> Dict[str, Any]:
        """Create executive summary of financial statement analysis"""
        
        # Key findings
        key_findings = []
        
        # Financial performance summary
        if historical_statements.income_statements:
            latest_income = historical_statements.income_statements[-1]
            revenue = latest_income.data.get('revenue', 0)
            net_income = latest_income.data.get('net_income', 0)
            
            key_findings.append(f"Latest revenue: ${revenue:,.0f}")
            key_findings.append(f"Latest net income: ${net_income:,.0f}")
        
        # Quality assessment summary
        quality_grade = self._score_to_grade(quality_assessment.overall_quality_score)
        key_findings.append(f"Financial statement quality grade: {quality_grade}")
        
        # Anomaly summary
        critical_anomalies = anomaly_detection.get("critical_anomalies", [])
        if critical_anomalies:
            key_findings.append(f"{len(critical_anomalies)} critical anomalies detected")
        
        # Overall assessment
        if quality_assessment.overall_quality_score >= 80 and len(critical_anomalies) == 0:
            overall_assessment = "Strong financial reporting quality with no critical issues"
        elif quality_assessment.overall_quality_score >= 60:
            overall_assessment = "Adequate financial reporting quality with some areas for improvement"
        else:
            overall_assessment = "Financial reporting quality requires significant attention"
        
        return {
            "overall_assessment": overall_assessment,
            "key_findings": key_findings,
            "quality_score": quality_assessment.overall_quality_score,
            "quality_grade": quality_grade,
            "critical_issues": len(critical_anomalies),
            "analysis_confidence": min(100, quality_assessment.overall_quality_score + 10),
            "recommendation": self._generate_overall_recommendation(quality_assessment, critical_anomalies)
        }
    
    def _generate_overall_recommendation(self, quality_assessment: StatementQualityAssessment,
                                       critical_anomalies: List) -> str:
        """Generate overall recommendation based on analysis"""
        
        if quality_assessment.overall_quality_score >= 85 and len(critical_anomalies) == 0:
            return "Financial statements demonstrate high quality and reliability. Continue current reporting practices."
        elif quality_assessment.overall_quality_score >= 70:
            return "Financial statements show good quality with minor improvement opportunities. Address identified areas for enhancement."
        elif len(critical_anomalies) > 0:
            return "Critical anomalies detected. Immediate investigation and remediation required before relying on financial data."
        else:
            return "Financial statement quality requires comprehensive review and improvement of reporting processes."


# Example usage
if __name__ == "__main__":
    # Sample financial statements
    sample_statements = [
        FinancialStatement(
            statement_type=StatementType.INCOME_STATEMENT,
            period="2023",
            data={
                "revenue": 2000000,
                "cost_of_goods_sold": 1200000,
                "gross_profit": 800000,
                "operating_expenses": 500000,
                "operating_income": 300000,
                "interest_expense": 50000,
                "tax_expense": 75000,
                "net_income": 175000
            }
        ),
        FinancialStatement(
            statement_type=StatementType.BALANCE_SHEET,
            period="2023",
            data={
                "total_assets": 1500000,
                "current_assets": 600000,
                "cash_and_equivalents": 200000,
                "accounts_receivable": 250000,
                "inventory": 150000,
                "property_plant_equipment": 900000,
                "total_liabilities": 800000,
                "current_liabilities": 300000,
                "long_term_debt": 500000,
                "shareholders_equity": 700000
            }
        )
    ]
    
    historical_data = HistoricalStatements(
        company_name="Sample Company",
        statements=sample_statements,
        industry="technology"
    )
    
    # Perform comprehensive analysis
    analyzer = FinancialStatementAnalyzer()
    results = analyzer.comprehensive_statement_analysis(historical_data)
    
    print("Financial Statement Analysis Results:")
    print(f"Overall Assessment: {results['executive_summary']['overall_assessment']}")
    print(f"Quality Score: {results['executive_summary']['quality_score']:.1f}")
    print(f"Quality Grade: {results['executive_summary']['quality_grade']}")
    
    print(f"\nKey Findings:")
    for finding in results['executive_summary']['key_findings']:
        print(f"- {finding}")
    
    # Quality assessment
    quality = results['quality_assessment']
    print(f"\nQuality Assessment:")
    print(f"Consistency Score: {quality.consistency_score:.1f}")
    print(f"Completeness Score: {quality.completeness_score:.1f}")
    print(f"Transparency Score: {quality.transparency_score:.1f}")
    
    # Anomalies
    anomalies = results['anomaly_detection']
    print(f"\nAnomalies Detected: {anomalies['total_anomalies_detected']}")
    if anomalies['critical_anomalies']:
        print("Critical Anomalies:")
        for anomaly in anomalies['critical_anomalies']:
            print(f"- {anomaly.description}")
