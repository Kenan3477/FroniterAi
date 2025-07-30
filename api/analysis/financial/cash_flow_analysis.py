"""
Cash Flow Modeling Engine

Advanced cash flow analysis, forecasting, and modeling algorithms
for financial analysis and business planning.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import warnings
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler


class CashFlowType(str, Enum):
    """Types of cash flows"""
    OPERATING = "operating"
    INVESTING = "investing"
    FINANCING = "financing"
    FREE = "free"
    UNLEVERED_FREE = "unlevered_free"


class ForecastMethod(str, Enum):
    """Cash flow forecasting methods"""
    LINEAR_TREND = "linear_trend"
    PERCENTAGE_OF_SALES = "percentage_of_sales"
    HISTORICAL_AVERAGE = "historical_average"
    MONTE_CARLO = "monte_carlo"
    REGRESSION = "regression"


@dataclass
class CashFlowStatement:
    """Cash flow statement data structure"""
    period: str
    date: datetime
    
    # Operating Cash Flow Components
    net_income: float
    depreciation_amortization: float
    working_capital_changes: float
    accounts_receivable_change: float
    inventory_change: float
    accounts_payable_change: float
    other_operating_activities: float
    operating_cash_flow: float
    
    # Investing Cash Flow Components
    capital_expenditures: float
    acquisitions: float
    asset_sales: float
    investments: float
    other_investing_activities: float
    investing_cash_flow: float
    
    # Financing Cash Flow Components
    debt_issuance: float
    debt_repayment: float
    equity_issuance: float
    dividends_paid: float
    share_repurchases: float
    other_financing_activities: float
    financing_cash_flow: float
    
    # Summary
    net_change_in_cash: float
    beginning_cash: float
    ending_cash: float
    free_cash_flow: Optional[float] = None


@dataclass
class CashFlowForecast:
    """Cash flow forecast results"""
    forecast_periods: List[str]
    forecasted_values: Dict[str, List[float]]
    confidence_intervals: Dict[str, List[Tuple[float, float]]]
    methodology: ForecastMethod
    assumptions: Dict[str, Any]
    sensitivity_analysis: Optional[Dict[str, Any]] = None


class CashFlowAnalyzer:
    """Comprehensive cash flow analysis and modeling engine"""
    
    def __init__(self):
        self.scaler = StandardScaler()
    
    def analyze_cash_flows(self, cash_flow_data: List[CashFlowStatement],
                          company_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Comprehensive cash flow analysis
        
        Args:
            cash_flow_data: Historical cash flow statements
            company_info: Additional company information
            
        Returns:
            Complete cash flow analysis results
        """
        if len(cash_flow_data) < 2:
            raise ValueError("At least 2 periods of cash flow data required")
        
        # Calculate free cash flows
        for cf in cash_flow_data:
            if cf.free_cash_flow is None:
                cf.free_cash_flow = cf.operating_cash_flow - cf.capital_expenditures
        
        results = {
            "cash_flow_trends": self._analyze_trends(cash_flow_data),
            "cash_flow_quality": self._assess_quality(cash_flow_data),
            "cash_conversion_cycle": self._calculate_conversion_cycle(cash_flow_data),
            "cash_flow_ratios": self._calculate_cash_flow_ratios(cash_flow_data),
            "seasonality_analysis": self._analyze_seasonality(cash_flow_data),
            "volatility_analysis": self._analyze_volatility(cash_flow_data),
            "cash_flow_components": self._analyze_components(cash_flow_data),
            "liquidity_analysis": self._analyze_liquidity(cash_flow_data),
            "capital_efficiency": self._analyze_capital_efficiency(cash_flow_data),
            "sustainability_metrics": self._assess_sustainability(cash_flow_data)
        }
        
        return results
    
    def forecast_cash_flows(self, historical_data: List[CashFlowStatement],
                           forecast_periods: int = 5,
                           method: ForecastMethod = ForecastMethod.REGRESSION,
                           revenue_forecasts: Optional[List[float]] = None,
                           assumptions: Optional[Dict[str, Any]] = None) -> CashFlowForecast:
        """
        Forecast future cash flows using various methodologies
        
        Args:
            historical_data: Historical cash flow data
            forecast_periods: Number of periods to forecast
            method: Forecasting methodology
            revenue_forecasts: External revenue forecasts if available
            assumptions: Additional forecasting assumptions
            
        Returns:
            Cash flow forecast results
        """
        if len(historical_data) < 3:
            raise ValueError("At least 3 periods of historical data required for forecasting")
        
        # Prepare data
        df = self._prepare_forecast_data(historical_data)
        
        # Generate forecasts based on method
        if method == ForecastMethod.LINEAR_TREND:
            forecast = self._linear_trend_forecast(df, forecast_periods)
        elif method == ForecastMethod.PERCENTAGE_OF_SALES:
            forecast = self._percentage_of_sales_forecast(df, forecast_periods, revenue_forecasts)
        elif method == ForecastMethod.HISTORICAL_AVERAGE:
            forecast = self._historical_average_forecast(df, forecast_periods)
        elif method == ForecastMethod.MONTE_CARLO:
            forecast = self._monte_carlo_forecast(df, forecast_periods)
        elif method == ForecastMethod.REGRESSION:
            forecast = self._regression_forecast(df, forecast_periods, revenue_forecasts)
        else:
            raise ValueError(f"Unsupported forecast method: {method}")
        
        # Add sensitivity analysis
        forecast.sensitivity_analysis = self._sensitivity_analysis(df, forecast, assumptions)
        
        return forecast
    
    def build_dcf_model(self, historical_data: List[CashFlowStatement],
                       forecast_data: CashFlowForecast,
                       terminal_assumptions: Dict[str, float],
                       discount_rate: float) -> Dict[str, Any]:
        """
        Build discounted cash flow (DCF) valuation model
        
        Args:
            historical_data: Historical cash flow data
            forecast_data: Forecasted cash flows
            terminal_assumptions: Terminal value assumptions
            discount_rate: Weighted average cost of capital (WACC)
            
        Returns:
            DCF model results
        """
        # Get forecasted free cash flows
        fcf_forecasts = forecast_data.forecasted_values.get('free_cash_flow', [])
        
        if not fcf_forecasts:
            raise ValueError("Free cash flow forecasts required for DCF model")
        
        # Calculate present values
        present_values = []
        for i, fcf in enumerate(fcf_forecasts):
            pv = fcf / ((1 + discount_rate) ** (i + 1))
            present_values.append(pv)
        
        # Calculate terminal value
        terminal_growth_rate = terminal_assumptions.get('growth_rate', 0.02)
        terminal_fcf = fcf_forecasts[-1] * (1 + terminal_growth_rate)
        terminal_value = terminal_fcf / (discount_rate - terminal_growth_rate)
        terminal_pv = terminal_value / ((1 + discount_rate) ** len(fcf_forecasts))
        
        # Enterprise value
        enterprise_value = sum(present_values) + terminal_pv
        
        # Equity value calculations
        net_debt = terminal_assumptions.get('net_debt', 0)
        equity_value = enterprise_value - net_debt
        shares_outstanding = terminal_assumptions.get('shares_outstanding', 1)
        value_per_share = equity_value / shares_outstanding
        
        return {
            "enterprise_value": enterprise_value,
            "terminal_value": terminal_value,
            "terminal_pv": terminal_pv,
            "forecast_pv": sum(present_values),
            "equity_value": equity_value,
            "value_per_share": value_per_share,
            "dcf_components": {
                "annual_fcf": fcf_forecasts,
                "present_values": present_values,
                "discount_factors": [(1 + discount_rate) ** (i + 1) for i in range(len(fcf_forecasts))]
            },
            "sensitivity_table": self._dcf_sensitivity_analysis(
                fcf_forecasts, terminal_value, discount_rate, terminal_growth_rate, net_debt, shares_outstanding
            ),
            "assumptions": {
                "discount_rate": discount_rate,
                "terminal_growth_rate": terminal_growth_rate,
                "forecast_periods": len(fcf_forecasts),
                "net_debt": net_debt,
                "shares_outstanding": shares_outstanding
            }
        }
    
    def analyze_working_capital(self, cash_flow_data: List[CashFlowStatement],
                               revenue_data: Optional[List[float]] = None) -> Dict[str, Any]:
        """
        Analyze working capital dynamics and efficiency
        
        Args:
            cash_flow_data: Cash flow statements
            revenue_data: Revenue data for ratio calculations
            
        Returns:
            Working capital analysis results
        """
        working_capital_changes = [cf.working_capital_changes for cf in cash_flow_data]
        periods = [cf.period for cf in cash_flow_data]
        
        # Calculate working capital metrics
        total_wc_change = sum(working_capital_changes)
        avg_wc_change = np.mean(working_capital_changes)
        wc_volatility = np.std(working_capital_changes)
        
        # Component analysis
        components = {
            "accounts_receivable": [cf.accounts_receivable_change for cf in cash_flow_data],
            "inventory": [cf.inventory_change for cf in cash_flow_data],
            "accounts_payable": [cf.accounts_payable_change for cf in cash_flow_data]
        }
        
        component_analysis = {}
        for component, values in components.items():
            component_analysis[component] = {
                "total_change": sum(values),
                "average_change": np.mean(values),
                "volatility": np.std(values),
                "trend": self._calculate_trend(values)
            }
        
        # Working capital efficiency
        efficiency_metrics = {}
        if revenue_data and len(revenue_data) == len(working_capital_changes):
            wc_to_revenue_ratios = [abs(wc) / rev for wc, rev in zip(working_capital_changes, revenue_data) if rev > 0]
            if wc_to_revenue_ratios:
                efficiency_metrics = {
                    "avg_wc_to_revenue": np.mean(wc_to_revenue_ratios),
                    "wc_efficiency_trend": self._calculate_trend(wc_to_revenue_ratios)
                }
        
        return {
            "working_capital_summary": {
                "total_change": total_wc_change,
                "average_change": avg_wc_change,
                "volatility": wc_volatility,
                "periods_analyzed": len(working_capital_changes)
            },
            "component_analysis": component_analysis,
            "efficiency_metrics": efficiency_metrics,
            "trend_analysis": {
                "overall_trend": self._calculate_trend(working_capital_changes),
                "period_labels": periods
            },
            "insights": self._generate_working_capital_insights(working_capital_changes, component_analysis)
        }
    
    def stress_test_cash_flows(self, base_forecast: CashFlowForecast,
                              stress_scenarios: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Perform stress testing on cash flow forecasts
        
        Args:
            base_forecast: Base case cash flow forecast
            stress_scenarios: List of stress test scenarios
            
        Returns:
            Stress test results
        """
        stress_results = {}
        base_fcf = base_forecast.forecasted_values.get('free_cash_flow', [])
        
        for i, scenario in enumerate(stress_scenarios):
            scenario_name = scenario.get('name', f'Scenario_{i+1}')
            
            # Apply stress factors to base forecast
            stressed_fcf = []
            for j, base_value in enumerate(base_fcf):
                # Apply various stress factors
                revenue_stress = scenario.get('revenue_change', 0)
                margin_stress = scenario.get('margin_change', 0)
                capex_stress = scenario.get('capex_change', 0)
                
                # Simplified stress calculation
                stressed_value = base_value * (1 + revenue_stress) * (1 + margin_stress) - (base_value * 0.1 * capex_stress)
                stressed_fcf.append(stressed_value)
            
            # Calculate impact metrics
            total_impact = sum(stressed_fcf) - sum(base_fcf)
            min_fcf = min(stressed_fcf)
            
            stress_results[scenario_name] = {
                "stressed_fcf": stressed_fcf,
                "total_impact": total_impact,
                "average_impact": total_impact / len(stressed_fcf),
                "min_fcf": min_fcf,
                "years_negative": len([fcf for fcf in stressed_fcf if fcf < 0]),
                "recovery_period": self._calculate_recovery_period(stressed_fcf),
                "scenario_assumptions": scenario
            }
        
        return {
            "base_case": {
                "fcf": base_fcf,
                "total_fcf": sum(base_fcf)
            },
            "stress_scenarios": stress_results,
            "summary": self._summarize_stress_results(stress_results)
        }
    
    def _analyze_trends(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Analyze cash flow trends over time"""
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        investing_cf = [cf.investing_cash_flow for cf in cash_flow_data]
        financing_cf = [cf.financing_cash_flow for cf in cash_flow_data]
        free_cf = [cf.free_cash_flow for cf in cash_flow_data if cf.free_cash_flow is not None]
        
        trends = {}
        
        for name, data in [
            ("operating", operating_cf),
            ("investing", investing_cf),
            ("financing", financing_cf),
            ("free", free_cf)
        ]:
            if len(data) >= 2:
                trend_slope = self._calculate_trend(data)
                growth_rates = self._calculate_growth_rates(data)
                
                trends[f"{name}_cash_flow"] = {
                    "trend_slope": trend_slope,
                    "average_growth_rate": np.mean(growth_rates) if growth_rates else 0,
                    "volatility": np.std(data),
                    "compound_annual_growth_rate": self._calculate_cagr(data),
                    "data_points": len(data)
                }
        
        return trends
    
    def _assess_quality(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Assess the quality of cash flows"""
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        net_income = [cf.net_income for cf in cash_flow_data]
        free_cf = [cf.free_cash_flow for cf in cash_flow_data if cf.free_cash_flow is not None]
        
        quality_metrics = {}
        
        # Operating CF to Net Income ratio
        if len(operating_cf) == len(net_income):
            cf_ni_ratios = [ocf / ni if ni != 0 else 0 for ocf, ni in zip(operating_cf, net_income)]
            quality_metrics["cf_to_ni_ratio"] = {
                "average": np.mean(cf_ni_ratios),
                "consistency": 1 - (np.std(cf_ni_ratios) / np.mean(cf_ni_ratios)) if np.mean(cf_ni_ratios) != 0 else 0
            }
        
        # Cash flow stability
        if operating_cf:
            positive_periods = len([cf for cf in operating_cf if cf > 0])
            quality_metrics["operating_cf_stability"] = positive_periods / len(operating_cf)
        
        # Free cash flow quality
        if free_cf:
            positive_fcf_periods = len([fcf for fcf in free_cf if fcf > 0])
            quality_metrics["free_cf_quality"] = {
                "positive_periods_ratio": positive_fcf_periods / len(free_cf),
                "average_fcf": np.mean(free_cf),
                "fcf_volatility": np.std(free_cf)
            }
        
        # Working capital impact
        wc_changes = [cf.working_capital_changes for cf in cash_flow_data]
        if wc_changes:
            quality_metrics["working_capital_impact"] = {
                "average_drag": np.mean([abs(wc) for wc in wc_changes]),
                "volatility": np.std(wc_changes)
            }
        
        return quality_metrics
    
    def _calculate_conversion_cycle(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Calculate cash conversion cycle metrics"""
        # This is a simplified version - in practice, you'd need balance sheet data
        ar_changes = [cf.accounts_receivable_change for cf in cash_flow_data]
        inventory_changes = [cf.inventory_change for cf in cash_flow_data]
        ap_changes = [cf.accounts_payable_change for cf in cash_flow_data]
        
        return {
            "average_ar_change": np.mean(ar_changes),
            "average_inventory_change": np.mean(inventory_changes),
            "average_ap_change": np.mean(ap_changes),
            "working_capital_efficiency": np.mean([cf.working_capital_changes for cf in cash_flow_data])
        }
    
    def _calculate_cash_flow_ratios(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Calculate important cash flow ratios"""
        ratios = {}
        
        # Get latest period data
        latest = cash_flow_data[-1]
        
        # Operating cash flow ratios
        if latest.operating_cash_flow and latest.net_income:
            ratios["operating_cf_to_net_income"] = latest.operating_cash_flow / latest.net_income
        
        # Free cash flow ratios
        if latest.free_cash_flow and latest.operating_cash_flow:
            ratios["free_cf_to_operating_cf"] = latest.free_cash_flow / latest.operating_cash_flow
        
        # Capital expenditure ratios
        if latest.capital_expenditures and latest.operating_cash_flow:
            ratios["capex_to_operating_cf"] = abs(latest.capital_expenditures) / latest.operating_cash_flow
        
        return ratios
    
    def _analyze_seasonality(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Analyze seasonal patterns in cash flows"""
        if len(cash_flow_data) < 8:  # Need at least 2 years of quarterly data
            return {"seasonality_detected": False, "reason": "Insufficient data"}
        
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        
        # Simple seasonality detection using coefficient of variation
        quarterly_patterns = {}
        if len(operating_cf) >= 8:
            # Group by quarters (assuming quarterly data)
            quarters = [[] for _ in range(4)]
            for i, cf in enumerate(operating_cf):
                quarters[i % 4].append(cf)
            
            for i, quarter_data in enumerate(quarters):
                if quarter_data:
                    quarterly_patterns[f"Q{i+1}"] = {
                        "average": np.mean(quarter_data),
                        "volatility": np.std(quarter_data)
                    }
        
        return {
            "seasonality_detected": len(quarterly_patterns) > 0,
            "quarterly_patterns": quarterly_patterns,
            "overall_volatility": np.std(operating_cf)
        }
    
    def _analyze_volatility(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Analyze cash flow volatility"""
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        free_cf = [cf.free_cash_flow for cf in cash_flow_data if cf.free_cash_flow is not None]
        
        volatility_metrics = {}
        
        for name, data in [("operating", operating_cf), ("free", free_cf)]:
            if len(data) >= 2:
                cv = np.std(data) / np.mean(data) if np.mean(data) != 0 else 0
                volatility_metrics[f"{name}_cf_volatility"] = {
                    "coefficient_of_variation": cv,
                    "standard_deviation": np.std(data),
                    "range": max(data) - min(data),
                    "stability_score": max(0, 1 - cv)  # Higher is more stable
                }
        
        return volatility_metrics
    
    def _analyze_components(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Analyze cash flow components"""
        components = {
            "net_income": [cf.net_income for cf in cash_flow_data],
            "depreciation": [cf.depreciation_amortization for cf in cash_flow_data],
            "working_capital": [cf.working_capital_changes for cf in cash_flow_data],
            "capex": [cf.capital_expenditures for cf in cash_flow_data]
        }
        
        component_analysis = {}
        for component, values in components.items():
            component_analysis[component] = {
                "average": np.mean(values),
                "trend": self._calculate_trend(values),
                "volatility": np.std(values),
                "contribution_to_ocf": np.mean(values) / np.mean([cf.operating_cash_flow for cf in cash_flow_data]) if np.mean([cf.operating_cash_flow for cf in cash_flow_data]) != 0 else 0
            }
        
        return component_analysis
    
    def _analyze_liquidity(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Analyze liquidity from cash flow perspective"""
        cash_positions = [cf.ending_cash for cf in cash_flow_data]
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        
        return {
            "cash_position_trend": self._calculate_trend(cash_positions),
            "average_cash_position": np.mean(cash_positions),
            "cash_volatility": np.std(cash_positions),
            "operating_cf_coverage": np.mean([ocf for ocf in operating_cf if ocf > 0]),
            "liquidity_score": self._calculate_liquidity_score(cash_positions, operating_cf)
        }
    
    def _analyze_capital_efficiency(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Analyze capital allocation efficiency"""
        capex = [abs(cf.capital_expenditures) for cf in cash_flow_data]
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        
        efficiency_metrics = {}
        
        if capex and operating_cf:
            capex_intensity = [cx / ocf if ocf > 0 else 0 for cx, ocf in zip(capex, operating_cf)]
            efficiency_metrics["capex_intensity"] = {
                "average": np.mean(capex_intensity),
                "trend": self._calculate_trend(capex_intensity)
            }
            
            # Return on invested capital proxy
            if len(capex) > 1:
                roic_proxy = []
                for i in range(1, len(capex)):
                    if capex[i-1] > 0:
                        roic_proxy.append((operating_cf[i] - operating_cf[i-1]) / capex[i-1])
                
                if roic_proxy:
                    efficiency_metrics["roic_proxy"] = {
                        "average": np.mean(roic_proxy),
                        "trend": self._calculate_trend(roic_proxy)
                    }
        
        return efficiency_metrics
    
    def _assess_sustainability(self, cash_flow_data: List[CashFlowStatement]) -> Dict[str, Any]:
        """Assess cash flow sustainability"""
        free_cf = [cf.free_cash_flow for cf in cash_flow_data if cf.free_cash_flow is not None]
        operating_cf = [cf.operating_cash_flow for cf in cash_flow_data]
        
        sustainability_metrics = {}
        
        if free_cf:
            positive_fcf_years = len([fcf for fcf in free_cf if fcf > 0])
            sustainability_metrics["fcf_consistency"] = positive_fcf_years / len(free_cf)
            
            # Sustainability score based on multiple factors
            fcf_growth = self._calculate_trend(free_cf)
            fcf_stability = 1 - (np.std(free_cf) / np.mean(free_cf)) if np.mean(free_cf) != 0 else 0
            
            sustainability_metrics["sustainability_score"] = max(0, min(1, 
                0.4 * sustainability_metrics["fcf_consistency"] +
                0.3 * max(0, min(1, fcf_growth + 0.5)) +  # Normalized growth
                0.3 * max(0, fcf_stability)
            ))
        
        return sustainability_metrics
    
    def _prepare_forecast_data(self, historical_data: List[CashFlowStatement]) -> pd.DataFrame:
        """Prepare data for forecasting"""
        data = []
        for cf in historical_data:
            data.append({
                'period': cf.period,
                'date': cf.date,
                'operating_cash_flow': cf.operating_cash_flow,
                'investing_cash_flow': cf.investing_cash_flow,
                'financing_cash_flow': cf.financing_cash_flow,
                'free_cash_flow': cf.free_cash_flow,
                'net_income': cf.net_income,
                'capex': cf.capital_expenditures,
                'working_capital_change': cf.working_capital_changes
            })
        
        return pd.DataFrame(data)
    
    def _linear_trend_forecast(self, df: pd.DataFrame, periods: int) -> CashFlowForecast:
        """Linear trend forecasting"""
        forecasts = {}
        
        for column in ['operating_cash_flow', 'free_cash_flow', 'net_income']:
            if column in df.columns:
                values = df[column].values
                x = np.arange(len(values)).reshape(-1, 1)
                y = values
                
                model = LinearRegression()
                model.fit(x, y)
                
                future_x = np.arange(len(values), len(values) + periods).reshape(-1, 1)
                forecast_values = model.predict(future_x)
                
                forecasts[column] = forecast_values.tolist()
        
        return CashFlowForecast(
            forecast_periods=[f"Period_{i+1}" for i in range(periods)],
            forecasted_values=forecasts,
            confidence_intervals={},
            methodology=ForecastMethod.LINEAR_TREND,
            assumptions={"method": "linear_regression"}
        )
    
    def _percentage_of_sales_forecast(self, df: pd.DataFrame, periods: int, 
                                    revenue_forecasts: Optional[List[float]]) -> CashFlowForecast:
        """Percentage of sales forecasting"""
        if revenue_forecasts is None or len(revenue_forecasts) != periods:
            raise ValueError("Revenue forecasts required for percentage of sales method")
        
        # Calculate historical ratios
        if 'revenue' not in df.columns:
            # Estimate revenue from operating cash flow (simplified)
            df['revenue'] = df['operating_cash_flow'] * 2  # Rough approximation
        
        ratios = {}
        for column in ['operating_cash_flow', 'free_cash_flow']:
            if column in df.columns:
                ratio = (df[column] / df['revenue']).mean()
                ratios[column] = ratio
        
        # Apply ratios to revenue forecasts
        forecasts = {}
        for column, ratio in ratios.items():
            forecasts[column] = [rev * ratio for rev in revenue_forecasts]
        
        return CashFlowForecast(
            forecast_periods=[f"Period_{i+1}" for i in range(periods)],
            forecasted_values=forecasts,
            confidence_intervals={},
            methodology=ForecastMethod.PERCENTAGE_OF_SALES,
            assumptions={"ratios": ratios, "revenue_forecasts": revenue_forecasts}
        )
    
    def _historical_average_forecast(self, df: pd.DataFrame, periods: int) -> CashFlowForecast:
        """Historical average forecasting"""
        forecasts = {}
        
        for column in ['operating_cash_flow', 'free_cash_flow', 'net_income']:
            if column in df.columns:
                avg_value = df[column].mean()
                forecasts[column] = [avg_value] * periods
        
        return CashFlowForecast(
            forecast_periods=[f"Period_{i+1}" for i in range(periods)],
            forecasted_values=forecasts,
            confidence_intervals={},
            methodology=ForecastMethod.HISTORICAL_AVERAGE,
            assumptions={"method": "historical_average"}
        )
    
    def _monte_carlo_forecast(self, df: pd.DataFrame, periods: int, 
                            simulations: int = 1000) -> CashFlowForecast:
        """Monte Carlo simulation forecasting"""
        forecasts = {}
        confidence_intervals = {}
        
        for column in ['operating_cash_flow', 'free_cash_flow']:
            if column in df.columns:
                values = df[column].values
                mean_value = np.mean(values)
                std_value = np.std(values)
                
                # Run Monte Carlo simulations
                simulated_forecasts = []
                for _ in range(simulations):
                    forecast = []
                    current_value = values[-1]
                    
                    for _ in range(periods):
                        growth_rate = np.random.normal(0, std_value / mean_value)
                        current_value *= (1 + growth_rate)
                        forecast.append(current_value)
                    
                    simulated_forecasts.append(forecast)
                
                # Calculate statistics
                simulated_array = np.array(simulated_forecasts)
                mean_forecast = np.mean(simulated_array, axis=0)
                p5_forecast = np.percentile(simulated_array, 5, axis=0)
                p95_forecast = np.percentile(simulated_array, 95, axis=0)
                
                forecasts[column] = mean_forecast.tolist()
                confidence_intervals[column] = list(zip(p5_forecast, p95_forecast))
        
        return CashFlowForecast(
            forecast_periods=[f"Period_{i+1}" for i in range(periods)],
            forecasted_values=forecasts,
            confidence_intervals=confidence_intervals,
            methodology=ForecastMethod.MONTE_CARLO,
            assumptions={"simulations": simulations}
        )
    
    def _regression_forecast(self, df: pd.DataFrame, periods: int,
                           revenue_forecasts: Optional[List[float]]) -> CashFlowForecast:
        """Regression-based forecasting"""
        forecasts = {}
        
        # Use time trend and other available variables
        features = []
        for i in range(len(df)):
            feature_row = [i]  # Time trend
            if 'net_income' in df.columns:
                feature_row.append(df['net_income'].iloc[i])
            features.append(feature_row)
        
        X = np.array(features)
        
        for column in ['operating_cash_flow', 'free_cash_flow']:
            if column in df.columns:
                y = df[column].values
                
                model = LinearRegression()
                model.fit(X, y)
                
                # Create future features
                future_features = []
                for i in range(periods):
                    future_row = [len(df) + i]  # Continue time trend
                    if 'net_income' in df.columns:
                        # Use trend of net income for future values
                        last_ni = df['net_income'].iloc[-1]
                        trend = self._calculate_trend(df['net_income'].values)
                        future_ni = last_ni * (1 + trend) ** (i + 1)
                        future_row.append(future_ni)
                    future_features.append(future_row)
                
                future_X = np.array(future_features)
                forecast_values = model.predict(future_X)
                forecasts[column] = forecast_values.tolist()
        
        return CashFlowForecast(
            forecast_periods=[f"Period_{i+1}" for i in range(periods)],
            forecasted_values=forecasts,
            confidence_intervals={},
            methodology=ForecastMethod.REGRESSION,
            assumptions={"features_used": "time_trend_and_fundamentals"}
        )
    
    def _sensitivity_analysis(self, df: pd.DataFrame, forecast: CashFlowForecast,
                            assumptions: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Perform sensitivity analysis on forecasts"""
        if 'free_cash_flow' not in forecast.forecasted_values:
            return {}
        
        base_fcf = forecast.forecasted_values['free_cash_flow']
        sensitivity_results = {}
        
        # Test different scenarios
        scenarios = [
            {"name": "Revenue +10%", "factor": 1.1},
            {"name": "Revenue -10%", "factor": 0.9},
            {"name": "Margin +200bp", "factor": 1.05},
            {"name": "Margin -200bp", "factor": 0.95}
        ]
        
        for scenario in scenarios:
            adjusted_fcf = [fcf * scenario["factor"] for fcf in base_fcf]
            total_impact = sum(adjusted_fcf) - sum(base_fcf)
            
            sensitivity_results[scenario["name"]] = {
                "adjusted_fcf": adjusted_fcf,
                "total_impact": total_impact,
                "percentage_impact": (total_impact / sum(base_fcf)) * 100 if sum(base_fcf) != 0 else 0
            }
        
        return sensitivity_results
    
    def _dcf_sensitivity_analysis(self, fcf_forecasts: List[float], terminal_value: float,
                                discount_rate: float, terminal_growth: float,
                                net_debt: float, shares: float) -> Dict[str, Any]:
        """DCF sensitivity analysis"""
        sensitivity_table = {}
        
        # Test different discount rates and growth rates
        discount_rates = [discount_rate - 0.01, discount_rate, discount_rate + 0.01]
        growth_rates = [terminal_growth - 0.005, terminal_growth, terminal_growth + 0.005]
        
        for dr in discount_rates:
            sensitivity_table[f"WACC_{dr:.1%}"] = {}
            for gr in growth_rates:
                # Recalculate valuation
                present_values = [fcf / ((1 + dr) ** (i + 1)) for i, fcf in enumerate(fcf_forecasts)]
                term_val = (fcf_forecasts[-1] * (1 + gr)) / (dr - gr)
                term_pv = term_val / ((1 + dr) ** len(fcf_forecasts))
                enterprise_val = sum(present_values) + term_pv
                equity_val = enterprise_val - net_debt
                value_per_share = equity_val / shares
                
                sensitivity_table[f"WACC_{dr:.1%}"][f"Growth_{gr:.1%}"] = value_per_share
        
        return sensitivity_table
    
    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate trend slope"""
        if len(values) < 2:
            return 0
        
        x = np.arange(len(values))
        slope, _, _, _, _ = stats.linregress(x, values)
        return slope
    
    def _calculate_growth_rates(self, values: List[float]) -> List[float]:
        """Calculate period-over-period growth rates"""
        growth_rates = []
        for i in range(1, len(values)):
            if values[i-1] != 0:
                growth_rate = (values[i] - values[i-1]) / abs(values[i-1])
                growth_rates.append(growth_rate)
        return growth_rates
    
    def _calculate_cagr(self, values: List[float]) -> float:
        """Calculate compound annual growth rate"""
        if len(values) < 2 or values[0] <= 0:
            return 0
        
        periods = len(values) - 1
        cagr = (values[-1] / values[0]) ** (1/periods) - 1
        return cagr
    
    def _calculate_liquidity_score(self, cash_positions: List[float], 
                                 operating_cf: List[float]) -> float:
        """Calculate liquidity score"""
        if not cash_positions or not operating_cf:
            return 0
        
        avg_cash = np.mean(cash_positions)
        avg_ocf = np.mean([ocf for ocf in operating_cf if ocf > 0])
        
        if avg_ocf <= 0:
            return 0
        
        # Months of operating cash flow coverage
        coverage_months = (avg_cash / avg_ocf) * 12
        
        # Score based on coverage (higher is better, capped at 1.0)
        return min(1.0, coverage_months / 6)  # 6 months = perfect score
    
    def _calculate_recovery_period(self, cash_flows: List[float]) -> Optional[int]:
        """Calculate recovery period for stressed cash flows"""
        cumulative = 0
        for i, cf in enumerate(cash_flows):
            cumulative += cf
            if cumulative >= 0:
                return i + 1
        return None
    
    def _summarize_stress_results(self, stress_results: Dict[str, Any]) -> Dict[str, Any]:
        """Summarize stress test results"""
        all_impacts = [result["total_impact"] for result in stress_results.values()]
        worst_case = min(all_impacts) if all_impacts else 0
        best_case = max(all_impacts) if all_impacts else 0
        
        scenarios_with_negative_fcf = len([
            result for result in stress_results.values() 
            if result["years_negative"] > 0
        ])
        
        return {
            "worst_case_impact": worst_case,
            "best_case_impact": best_case,
            "scenarios_tested": len(stress_results),
            "scenarios_with_negative_fcf": scenarios_with_negative_fcf,
            "resilience_score": 1 - (scenarios_with_negative_fcf / len(stress_results)) if stress_results else 0
        }
    
    def _generate_working_capital_insights(self, wc_changes: List[float],
                                         component_analysis: Dict[str, Any]) -> List[str]:
        """Generate insights about working capital management"""
        insights = []
        
        avg_wc_change = np.mean(wc_changes)
        if avg_wc_change < -50000:  # Significant working capital drain
            insights.append("Working capital is a significant drag on cash flow")
        elif avg_wc_change > 50000:  # Working capital source
            insights.append("Working capital is contributing positively to cash flow")
        
        # Component-specific insights
        for component, analysis in component_analysis.items():
            if abs(analysis["total_change"]) > 100000:
                direction = "increased" if analysis["total_change"] > 0 else "decreased"
                insights.append(f"{component.replace('_', ' ').title()} has {direction} significantly")
        
        return insights


# Example usage
if __name__ == "__main__":
    # Sample cash flow data
    sample_cash_flows = [
        CashFlowStatement(
            period="2023-Q1", date=datetime(2023, 3, 31),
            net_income=50000, depreciation_amortization=20000,
            working_capital_changes=-15000, accounts_receivable_change=-10000,
            inventory_change=-8000, accounts_payable_change=3000,
            other_operating_activities=5000, operating_cash_flow=60000,
            capital_expenditures=-25000, acquisitions=0, asset_sales=0,
            investments=-5000, other_investing_activities=0, investing_cash_flow=-30000,
            debt_issuance=0, debt_repayment=-10000, equity_issuance=0,
            dividends_paid=-5000, share_repurchases=0, other_financing_activities=0,
            financing_cash_flow=-15000, net_change_in_cash=15000,
            beginning_cash=100000, ending_cash=115000, free_cash_flow=35000
        ),
        CashFlowStatement(
            period="2023-Q2", date=datetime(2023, 6, 30),
            net_income=55000, depreciation_amortization=22000,
            working_capital_changes=-20000, accounts_receivable_change=-12000,
            inventory_change=-10000, accounts_payable_change=2000,
            other_operating_activities=3000, operating_cash_flow=60000,
            capital_expenditures=-30000, acquisitions=0, asset_sales=0,
            investments=0, other_investing_activities=0, investing_cash_flow=-30000,
            debt_issuance=0, debt_repayment=-10000, equity_issuance=0,
            dividends_paid=-5000, share_repurchases=0, other_financing_activities=0,
            financing_cash_flow=-15000, net_change_in_cash=15000,
            beginning_cash=115000, ending_cash=130000, free_cash_flow=30000
        )
    ]
    
    analyzer = CashFlowAnalyzer()
    
    # Perform analysis
    results = analyzer.analyze_cash_flows(sample_cash_flows)
    print("Cash Flow Analysis Results:")
    print(f"Financial Health Score: {results.get('cash_flow_quality', {})}")
    
    # Forecast cash flows
    forecast = analyzer.forecast_cash_flows(sample_cash_flows, forecast_periods=4)
    print(f"\nForecast Results:")
    print(f"Forecasted Free Cash Flows: {forecast.forecasted_values.get('free_cash_flow', [])}")
