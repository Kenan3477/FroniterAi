"""
Financial Ratio Analysis Engine

Comprehensive financial ratio calculations including liquidity, profitability,
leverage, efficiency, and market ratios with industry benchmarking.
"""

import math
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np
import pandas as pd
from datetime import datetime


class RatioCategory(str, Enum):
    """Financial ratio categories"""
    LIQUIDITY = "liquidity"
    PROFITABILITY = "profitability"
    LEVERAGE = "leverage"
    EFFICIENCY = "efficiency"
    MARKET = "market"
    GROWTH = "growth"


@dataclass
class FinancialStatement:
    """Financial statement data structure"""
    # Balance Sheet
    total_assets: float
    current_assets: float
    cash_and_equivalents: float
    accounts_receivable: float
    inventory: float
    total_liabilities: float
    current_liabilities: float
    total_debt: float
    long_term_debt: float
    shareholders_equity: float
    
    # Income Statement
    revenue: float
    gross_profit: float
    operating_income: float
    ebitda: float
    net_income: float
    cost_of_goods_sold: float
    operating_expenses: float
    interest_expense: float
    
    # Cash Flow Statement
    operating_cash_flow: Optional[float] = None
    investing_cash_flow: Optional[float] = None
    financing_cash_flow: Optional[float] = None
    free_cash_flow: Optional[float] = None
    
    # Market Data
    market_cap: Optional[float] = None
    shares_outstanding: Optional[float] = None
    stock_price: Optional[float] = None


@dataclass
class RatioResult:
    """Individual ratio calculation result"""
    name: str
    value: float
    category: RatioCategory
    interpretation: str
    benchmark_comparison: Optional[str] = None
    grade: Optional[str] = None


class FinancialRatioAnalyzer:
    """Comprehensive financial ratio analysis engine"""
    
    def __init__(self):
        self.industry_benchmarks = self._load_industry_benchmarks()
    
    def analyze_ratios(self, financial_data: FinancialStatement, 
                      industry: str = "general") -> Dict[str, Any]:
        """
        Perform comprehensive ratio analysis
        
        Args:
            financial_data: Financial statement data
            industry: Industry for benchmarking
            
        Returns:
            Complete ratio analysis results
        """
        ratios = {}
        
        # Calculate all ratio categories
        ratios.update(self._calculate_liquidity_ratios(financial_data))
        ratios.update(self._calculate_profitability_ratios(financial_data))
        ratios.update(self._calculate_leverage_ratios(financial_data))
        ratios.update(self._calculate_efficiency_ratios(financial_data))
        
        if financial_data.market_cap:
            ratios.update(self._calculate_market_ratios(financial_data))
        
        # Add benchmark comparisons
        benchmarks = self.industry_benchmarks.get(industry, self.industry_benchmarks["general"])
        for ratio_name, ratio_data in ratios.items():
            if ratio_name in benchmarks:
                ratio_data.benchmark_comparison = self._compare_to_benchmark(
                    ratio_data.value, benchmarks[ratio_name]
                )
                ratio_data.grade = self._grade_ratio(
                    ratio_data.value, benchmarks[ratio_name], ratio_data.category
                )
        
        # Calculate overall financial health score
        health_score = self._calculate_financial_health_score(ratios, benchmarks)
        
        return {
            "ratios": ratios,
            "financial_health_score": health_score,
            "industry_comparison": self._generate_industry_comparison(ratios, benchmarks),
            "recommendations": self._generate_recommendations(ratios, financial_data),
            "summary": self._generate_ratio_summary(ratios)
        }
    
    def _calculate_liquidity_ratios(self, data: FinancialStatement) -> Dict[str, RatioResult]:
        """Calculate liquidity ratios"""
        ratios = {}
        
        # Current Ratio
        if data.current_liabilities > 0:
            current_ratio = data.current_assets / data.current_liabilities
            ratios["current_ratio"] = RatioResult(
                name="Current Ratio",
                value=current_ratio,
                category=RatioCategory.LIQUIDITY,
                interpretation=self._interpret_current_ratio(current_ratio)
            )
        
        # Quick Ratio (Acid Test)
        if data.current_liabilities > 0:
            quick_assets = data.current_assets - data.inventory
            quick_ratio = quick_assets / data.current_liabilities
            ratios["quick_ratio"] = RatioResult(
                name="Quick Ratio",
                value=quick_ratio,
                category=RatioCategory.LIQUIDITY,
                interpretation=self._interpret_quick_ratio(quick_ratio)
            )
        
        # Cash Ratio
        if data.current_liabilities > 0:
            cash_ratio = data.cash_and_equivalents / data.current_liabilities
            ratios["cash_ratio"] = RatioResult(
                name="Cash Ratio",
                value=cash_ratio,
                category=RatioCategory.LIQUIDITY,
                interpretation=self._interpret_cash_ratio(cash_ratio)
            )
        
        # Working Capital Ratio
        working_capital = data.current_assets - data.current_liabilities
        if data.total_assets > 0:
            working_capital_ratio = working_capital / data.total_assets
            ratios["working_capital_ratio"] = RatioResult(
                name="Working Capital Ratio",
                value=working_capital_ratio,
                category=RatioCategory.LIQUIDITY,
                interpretation=self._interpret_working_capital_ratio(working_capital_ratio)
            )
        
        return ratios
    
    def _calculate_profitability_ratios(self, data: FinancialStatement) -> Dict[str, RatioResult]:
        """Calculate profitability ratios"""
        ratios = {}
        
        # Return on Assets (ROA)
        if data.total_assets > 0:
            roa = data.net_income / data.total_assets
            ratios["roa"] = RatioResult(
                name="Return on Assets (ROA)",
                value=roa,
                category=RatioCategory.PROFITABILITY,
                interpretation=self._interpret_roa(roa)
            )
        
        # Return on Equity (ROE)
        if data.shareholders_equity > 0:
            roe = data.net_income / data.shareholders_equity
            ratios["roe"] = RatioResult(
                name="Return on Equity (ROE)",
                value=roe,
                category=RatioCategory.PROFITABILITY,
                interpretation=self._interpret_roe(roe)
            )
        
        # Gross Profit Margin
        if data.revenue > 0:
            gross_margin = data.gross_profit / data.revenue
            ratios["gross_margin"] = RatioResult(
                name="Gross Profit Margin",
                value=gross_margin,
                category=RatioCategory.PROFITABILITY,
                interpretation=self._interpret_gross_margin(gross_margin)
            )
        
        # Operating Margin
        if data.revenue > 0:
            operating_margin = data.operating_income / data.revenue
            ratios["operating_margin"] = RatioResult(
                name="Operating Margin",
                value=operating_margin,
                category=RatioCategory.PROFITABILITY,
                interpretation=self._interpret_operating_margin(operating_margin)
            )
        
        # Net Profit Margin
        if data.revenue > 0:
            net_margin = data.net_income / data.revenue
            ratios["net_margin"] = RatioResult(
                name="Net Profit Margin",
                value=net_margin,
                category=RatioCategory.PROFITABILITY,
                interpretation=self._interpret_net_margin(net_margin)
            )
        
        # EBITDA Margin
        if data.revenue > 0 and data.ebitda:
            ebitda_margin = data.ebitda / data.revenue
            ratios["ebitda_margin"] = RatioResult(
                name="EBITDA Margin",
                value=ebitda_margin,
                category=RatioCategory.PROFITABILITY,
                interpretation=self._interpret_ebitda_margin(ebitda_margin)
            )
        
        return ratios
    
    def _calculate_leverage_ratios(self, data: FinancialStatement) -> Dict[str, RatioResult]:
        """Calculate leverage/debt ratios"""
        ratios = {}
        
        # Debt-to-Equity Ratio
        if data.shareholders_equity > 0:
            debt_to_equity = data.total_debt / data.shareholders_equity
            ratios["debt_to_equity"] = RatioResult(
                name="Debt-to-Equity Ratio",
                value=debt_to_equity,
                category=RatioCategory.LEVERAGE,
                interpretation=self._interpret_debt_to_equity(debt_to_equity)
            )
        
        # Debt-to-Assets Ratio
        if data.total_assets > 0:
            debt_to_assets = data.total_debt / data.total_assets
            ratios["debt_to_assets"] = RatioResult(
                name="Debt-to-Assets Ratio",
                value=debt_to_assets,
                category=RatioCategory.LEVERAGE,
                interpretation=self._interpret_debt_to_assets(debt_to_assets)
            )
        
        # Equity Multiplier
        if data.shareholders_equity > 0:
            equity_multiplier = data.total_assets / data.shareholders_equity
            ratios["equity_multiplier"] = RatioResult(
                name="Equity Multiplier",
                value=equity_multiplier,
                category=RatioCategory.LEVERAGE,
                interpretation=self._interpret_equity_multiplier(equity_multiplier)
            )
        
        # Interest Coverage Ratio
        if data.interest_expense > 0:
            interest_coverage = data.operating_income / data.interest_expense
            ratios["interest_coverage"] = RatioResult(
                name="Interest Coverage Ratio",
                value=interest_coverage,
                category=RatioCategory.LEVERAGE,
                interpretation=self._interpret_interest_coverage(interest_coverage)
            )
        
        # Debt Service Coverage Ratio
        if data.operating_cash_flow and data.interest_expense > 0:
            debt_service_coverage = data.operating_cash_flow / (data.interest_expense + data.long_term_debt * 0.1)  # Assuming 10% principal payment
            ratios["debt_service_coverage"] = RatioResult(
                name="Debt Service Coverage Ratio",
                value=debt_service_coverage,
                category=RatioCategory.LEVERAGE,
                interpretation=self._interpret_debt_service_coverage(debt_service_coverage)
            )
        
        return ratios
    
    def _calculate_efficiency_ratios(self, data: FinancialStatement) -> Dict[str, RatioResult]:
        """Calculate efficiency/activity ratios"""
        ratios = {}
        
        # Asset Turnover
        if data.total_assets > 0:
            asset_turnover = data.revenue / data.total_assets
            ratios["asset_turnover"] = RatioResult(
                name="Asset Turnover",
                value=asset_turnover,
                category=RatioCategory.EFFICIENCY,
                interpretation=self._interpret_asset_turnover(asset_turnover)
            )
        
        # Inventory Turnover
        if data.inventory > 0:
            inventory_turnover = data.cost_of_goods_sold / data.inventory
            ratios["inventory_turnover"] = RatioResult(
                name="Inventory Turnover",
                value=inventory_turnover,
                category=RatioCategory.EFFICIENCY,
                interpretation=self._interpret_inventory_turnover(inventory_turnover)
            )
        
        # Receivables Turnover
        if data.accounts_receivable > 0:
            receivables_turnover = data.revenue / data.accounts_receivable
            ratios["receivables_turnover"] = RatioResult(
                name="Receivables Turnover",
                value=receivables_turnover,
                category=RatioCategory.EFFICIENCY,
                interpretation=self._interpret_receivables_turnover(receivables_turnover)
            )
        
        # Days Sales Outstanding (DSO)
        if data.accounts_receivable > 0:
            dso = (data.accounts_receivable / data.revenue) * 365
            ratios["days_sales_outstanding"] = RatioResult(
                name="Days Sales Outstanding",
                value=dso,
                category=RatioCategory.EFFICIENCY,
                interpretation=self._interpret_dso(dso)
            )
        
        # Days Inventory Outstanding (DIO)
        if data.inventory > 0:
            dio = (data.inventory / data.cost_of_goods_sold) * 365
            ratios["days_inventory_outstanding"] = RatioResult(
                name="Days Inventory Outstanding",
                value=dio,
                category=RatioCategory.EFFICIENCY,
                interpretation=self._interpret_dio(dio)
            )
        
        return ratios
    
    def _calculate_market_ratios(self, data: FinancialStatement) -> Dict[str, RatioResult]:
        """Calculate market-based ratios"""
        ratios = {}
        
        if not data.shares_outstanding or not data.stock_price:
            return ratios
        
        # Price-to-Earnings (P/E) Ratio
        if data.net_income > 0:
            eps = data.net_income / data.shares_outstanding
            pe_ratio = data.stock_price / eps
            ratios["pe_ratio"] = RatioResult(
                name="Price-to-Earnings Ratio",
                value=pe_ratio,
                category=RatioCategory.MARKET,
                interpretation=self._interpret_pe_ratio(pe_ratio)
            )
        
        # Price-to-Book (P/B) Ratio
        if data.shareholders_equity > 0:
            book_value_per_share = data.shareholders_equity / data.shares_outstanding
            pb_ratio = data.stock_price / book_value_per_share
            ratios["pb_ratio"] = RatioResult(
                name="Price-to-Book Ratio",
                value=pb_ratio,
                category=RatioCategory.MARKET,
                interpretation=self._interpret_pb_ratio(pb_ratio)
            )
        
        # Enterprise Value to EBITDA
        if data.ebitda and data.market_cap:
            enterprise_value = data.market_cap + data.total_debt - data.cash_and_equivalents
            ev_ebitda = enterprise_value / data.ebitda
            ratios["ev_ebitda"] = RatioResult(
                name="EV/EBITDA",
                value=ev_ebitda,
                category=RatioCategory.MARKET,
                interpretation=self._interpret_ev_ebitda(ev_ebitda)
            )
        
        return ratios
    
    def _calculate_financial_health_score(self, ratios: Dict[str, RatioResult], 
                                        benchmarks: Dict[str, float]) -> Dict[str, Any]:
        """Calculate overall financial health score"""
        scores = {}
        weights = {
            RatioCategory.LIQUIDITY: 0.25,
            RatioCategory.PROFITABILITY: 0.30,
            RatioCategory.LEVERAGE: 0.25,
            RatioCategory.EFFICIENCY: 0.20
        }
        
        category_scores = {}
        for category in weights.keys():
            category_ratios = [r for r in ratios.values() if r.category == category and r.grade]
            if category_ratios:
                grade_values = [self._grade_to_score(r.grade) for r in category_ratios]
                category_scores[category] = np.mean(grade_values)
        
        # Calculate weighted overall score
        overall_score = sum(
            category_scores.get(cat, 50) * weight 
            for cat, weight in weights.items()
        )
        
        return {
            "overall_score": round(overall_score, 1),
            "category_scores": {cat.value: round(score, 1) for cat, score in category_scores.items()},
            "grade": self._score_to_grade(overall_score),
            "interpretation": self._interpret_financial_health(overall_score)
        }
    
    def _load_industry_benchmarks(self) -> Dict[str, Dict[str, float]]:
        """Load industry benchmark data"""
        return {
            "general": {
                "current_ratio": 2.0,
                "quick_ratio": 1.0,
                "roa": 0.05,
                "roe": 0.15,
                "debt_to_equity": 0.5,
                "gross_margin": 0.4,
                "operating_margin": 0.1,
                "net_margin": 0.05
            },
            "technology": {
                "current_ratio": 2.5,
                "quick_ratio": 1.5,
                "roa": 0.08,
                "roe": 0.20,
                "debt_to_equity": 0.3,
                "gross_margin": 0.7,
                "operating_margin": 0.2,
                "net_margin": 0.15
            },
            "manufacturing": {
                "current_ratio": 1.8,
                "quick_ratio": 0.9,
                "roa": 0.04,
                "roe": 0.12,
                "debt_to_equity": 0.6,
                "gross_margin": 0.3,
                "operating_margin": 0.08,
                "net_margin": 0.04
            },
            "retail": {
                "current_ratio": 1.5,
                "quick_ratio": 0.8,
                "roa": 0.06,
                "roe": 0.18,
                "debt_to_equity": 0.4,
                "gross_margin": 0.35,
                "operating_margin": 0.05,
                "net_margin": 0.03
            },
            "finance": {
                "current_ratio": 1.2,
                "quick_ratio": 1.0,
                "roa": 0.01,
                "roe": 0.12,
                "debt_to_equity": 5.0,
                "gross_margin": 0.8,
                "operating_margin": 0.3,
                "net_margin": 0.2
            }
        }
    
    # Interpretation methods for each ratio
    def _interpret_current_ratio(self, ratio: float) -> str:
        if ratio >= 2.0:
            return "Strong liquidity position - company can easily meet short-term obligations"
        elif ratio >= 1.5:
            return "Good liquidity - adequate ability to pay short-term debts"
        elif ratio >= 1.0:
            return "Marginal liquidity - may struggle with short-term obligations"
        else:
            return "Poor liquidity - difficulty meeting short-term obligations"
    
    def _interpret_quick_ratio(self, ratio: float) -> str:
        if ratio >= 1.0:
            return "Excellent immediate liquidity without relying on inventory"
        elif ratio >= 0.7:
            return "Good liquidity for immediate obligations"
        elif ratio >= 0.5:
            return "Moderate liquidity position"
        else:
            return "Poor immediate liquidity position"
    
    def _interpret_cash_ratio(self, ratio: float) -> str:
        if ratio >= 0.5:
            return "Very strong cash position for immediate needs"
        elif ratio >= 0.2:
            return "Adequate cash for immediate obligations"
        elif ratio >= 0.1:
            return "Limited cash for immediate needs"
        else:
            return "Very limited cash position"
    
    def _interpret_working_capital_ratio(self, ratio: float) -> str:
        if ratio >= 0.2:
            return "Strong working capital position"
        elif ratio >= 0.1:
            return "Adequate working capital"
        elif ratio >= 0:
            return "Tight working capital position"
        else:
            return "Negative working capital - potential liquidity issues"
    
    def _interpret_roa(self, ratio: float) -> str:
        if ratio >= 0.15:
            return "Excellent asset utilization and profitability"
        elif ratio >= 0.1:
            return "Good return on assets"
        elif ratio >= 0.05:
            return "Average asset efficiency"
        elif ratio >= 0:
            return "Poor asset utilization"
        else:
            return "Negative returns - assets generating losses"
    
    def _interpret_roe(self, ratio: float) -> str:
        if ratio >= 0.2:
            return "Excellent returns for shareholders"
        elif ratio >= 0.15:
            return "Good shareholder returns"
        elif ratio >= 0.1:
            return "Average returns for equity investors"
        elif ratio >= 0:
            return "Poor returns for shareholders"
        else:
            return "Negative returns - destroying shareholder value"
    
    def _interpret_debt_to_equity(self, ratio: float) -> str:
        if ratio <= 0.3:
            return "Conservative debt levels - low financial risk"
        elif ratio <= 0.6:
            return "Moderate debt levels - balanced capital structure"
        elif ratio <= 1.0:
            return "Higher debt levels - increased financial risk"
        else:
            return "High debt levels - significant financial leverage and risk"
    
    def _interpret_gross_margin(self, ratio: float) -> str:
        if ratio >= 0.6:
            return "Excellent pricing power and cost control"
        elif ratio >= 0.4:
            return "Good gross profitability"
        elif ratio >= 0.2:
            return "Average gross margins"
        elif ratio >= 0:
            return "Low gross margins - pricing or cost pressures"
        else:
            return "Negative gross margins - unsustainable cost structure"
    
    def _interpret_operating_margin(self, ratio: float) -> str:
        if ratio >= 0.2:
            return "Excellent operational efficiency"
        elif ratio >= 0.1:
            return "Good operational performance"
        elif ratio >= 0.05:
            return "Average operational efficiency"
        elif ratio >= 0:
            return "Poor operational performance"
        else:
            return "Operational losses - efficiency issues"
    
    def _interpret_net_margin(self, ratio: float) -> str:
        if ratio >= 0.15:
            return "Excellent bottom-line profitability"
        elif ratio >= 0.1:
            return "Good net profitability"
        elif ratio >= 0.05:
            return "Average net margins"
        elif ratio >= 0:
            return "Low net profitability"
        else:
            return "Net losses - fundamental profitability issues"
    
    def _interpret_ebitda_margin(self, ratio: float) -> str:
        if ratio >= 0.25:
            return "Excellent operational cash generation"
        elif ratio >= 0.15:
            return "Good EBITDA performance"
        elif ratio >= 0.1:
            return "Average EBITDA margins"
        elif ratio >= 0:
            return "Low EBITDA generation"
        else:
            return "Negative EBITDA - operational cash flow issues"
    
    def _interpret_debt_to_assets(self, ratio: float) -> str:
        if ratio <= 0.3:
            return "Conservative debt relative to assets"
        elif ratio <= 0.5:
            return "Moderate debt levels"
        elif ratio <= 0.7:
            return "Higher debt relative to assets"
        else:
            return "High debt levels - potential solvency concerns"
    
    def _interpret_equity_multiplier(self, ratio: float) -> str:
        if ratio <= 2.0:
            return "Conservative leverage"
        elif ratio <= 3.0:
            return "Moderate leverage"
        elif ratio <= 4.0:
            return "Higher leverage"
        else:
            return "High leverage - increased financial risk"
    
    def _interpret_interest_coverage(self, ratio: float) -> str:
        if ratio >= 10:
            return "Excellent ability to service debt"
        elif ratio >= 5:
            return "Good interest coverage"
        elif ratio >= 2.5:
            return "Adequate interest coverage"
        elif ratio >= 1.5:
            return "Marginal interest coverage"
        else:
            return "Poor interest coverage - potential default risk"
    
    def _interpret_debt_service_coverage(self, ratio: float) -> str:
        if ratio >= 2.0:
            return "Strong debt service capability"
        elif ratio >= 1.5:
            return "Good debt service coverage"
        elif ratio >= 1.2:
            return "Adequate debt service coverage"
        elif ratio >= 1.0:
            return "Marginal debt service coverage"
        else:
            return "Insufficient cash flow for debt service"
    
    def _interpret_asset_turnover(self, ratio: float) -> str:
        if ratio >= 2.0:
            return "Excellent asset utilization efficiency"
        elif ratio >= 1.5:
            return "Good asset turnover"
        elif ratio >= 1.0:
            return "Average asset efficiency"
        elif ratio >= 0.5:
            return "Below average asset utilization"
        else:
            return "Poor asset efficiency"
    
    def _interpret_inventory_turnover(self, ratio: float) -> str:
        if ratio >= 12:
            return "Excellent inventory management"
        elif ratio >= 8:
            return "Good inventory turnover"
        elif ratio >= 4:
            return "Average inventory management"
        elif ratio >= 2:
            return "Slow inventory turnover"
        else:
            return "Very slow inventory movement"
    
    def _interpret_receivables_turnover(self, ratio: float) -> str:
        if ratio >= 12:
            return "Excellent collection efficiency"
        elif ratio >= 8:
            return "Good receivables management"
        elif ratio >= 6:
            return "Average collection performance"
        elif ratio >= 4:
            return "Slow receivables collection"
        else:
            return "Poor collection efficiency"
    
    def _interpret_dso(self, days: float) -> str:
        if days <= 30:
            return "Excellent collection period"
        elif days <= 45:
            return "Good collection efficiency"
        elif days <= 60:
            return "Average collection period"
        elif days <= 90:
            return "Slow collection period"
        else:
            return "Very slow collection - potential bad debt issues"
    
    def _interpret_dio(self, days: float) -> str:
        if days <= 30:
            return "Excellent inventory management"
        elif days <= 60:
            return "Good inventory turnover"
        elif days <= 90:
            return "Average inventory management"
        elif days <= 120:
            return "Slow inventory movement"
        else:
            return "Very slow inventory turnover"
    
    def _interpret_pe_ratio(self, ratio: float) -> str:
        if ratio <= 10:
            return "Value stock - potentially undervalued"
        elif ratio <= 20:
            return "Fairly valued stock"
        elif ratio <= 30:
            return "Growth stock - higher expectations"
        else:
            return "High growth expectations or potentially overvalued"
    
    def _interpret_pb_ratio(self, ratio: float) -> str:
        if ratio <= 1.0:
            return "Trading below book value - potential value opportunity"
        elif ratio <= 2.0:
            return "Reasonable valuation relative to book value"
        elif ratio <= 3.0:
            return "Premium to book value"
        else:
            return "High premium to book value"
    
    def _interpret_ev_ebitda(self, ratio: float) -> str:
        if ratio <= 8:
            return "Attractive valuation"
        elif ratio <= 12:
            return "Fair valuation"
        elif ratio <= 16:
            return "Premium valuation"
        else:
            return "High valuation - high growth expectations"
    
    def _compare_to_benchmark(self, value: float, benchmark: float) -> str:
        """Compare ratio value to industry benchmark"""
        difference = (value - benchmark) / benchmark
        
        if abs(difference) <= 0.1:
            return "In line with industry average"
        elif difference > 0.1:
            return f"Above industry average by {difference:.1%}"
        else:
            return f"Below industry average by {abs(difference):.1%}"
    
    def _grade_ratio(self, value: float, benchmark: float, category: RatioCategory) -> str:
        """Grade ratio performance"""
        ratio = value / benchmark if benchmark != 0 else 0
        
        # For leverage ratios, lower is often better
        if category == RatioCategory.LEVERAGE:
            if ratio <= 0.7:
                return "A"
            elif ratio <= 1.0:
                return "B"
            elif ratio <= 1.3:
                return "C"
            elif ratio <= 1.6:
                return "D"
            else:
                return "F"
        else:
            # For other ratios, higher is generally better
            if ratio >= 1.3:
                return "A"
            elif ratio >= 1.0:
                return "B"
            elif ratio >= 0.7:
                return "C"
            elif ratio >= 0.4:
                return "D"
            else:
                return "F"
    
    def _grade_to_score(self, grade: str) -> float:
        """Convert letter grade to numeric score"""
        grades = {"A": 90, "B": 80, "C": 70, "D": 60, "F": 40}
        return grades.get(grade, 50)
    
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
    
    def _interpret_financial_health(self, score: float) -> str:
        """Interpret overall financial health score"""
        if score >= 90:
            return "Excellent financial health - strong across all metrics"
        elif score >= 80:
            return "Good financial health - solid performance"
        elif score >= 70:
            return "Fair financial health - some areas for improvement"
        elif score >= 60:
            return "Below average financial health - multiple concerns"
        else:
            return "Poor financial health - significant financial risks"
    
    def _generate_industry_comparison(self, ratios: Dict[str, RatioResult], 
                                    benchmarks: Dict[str, float]) -> Dict[str, Any]:
        """Generate industry comparison analysis"""
        comparisons = {}
        
        for ratio_name, ratio_data in ratios.items():
            if ratio_name in benchmarks:
                benchmark = benchmarks[ratio_name]
                performance = "outperforming" if ratio_data.value > benchmark else "underperforming"
                
                comparisons[ratio_name] = {
                    "company_value": ratio_data.value,
                    "industry_benchmark": benchmark,
                    "performance": performance,
                    "variance": (ratio_data.value - benchmark) / benchmark if benchmark != 0 else 0
                }
        
        return comparisons
    
    def _generate_recommendations(self, ratios: Dict[str, RatioResult], 
                                data: FinancialStatement) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []
        
        # Liquidity recommendations
        if "current_ratio" in ratios and ratios["current_ratio"].value < 1.5:
            recommendations.append("Improve liquidity by reducing current liabilities or increasing current assets")
        
        # Profitability recommendations
        if "net_margin" in ratios and ratios["net_margin"].value < 0.05:
            recommendations.append("Focus on improving profitability through cost reduction or revenue enhancement")
        
        # Leverage recommendations
        if "debt_to_equity" in ratios and ratios["debt_to_equity"].value > 1.0:
            recommendations.append("Consider reducing debt levels to improve financial stability")
        
        # Efficiency recommendations
        if "asset_turnover" in ratios and ratios["asset_turnover"].value < 1.0:
            recommendations.append("Improve asset utilization to generate more revenue per dollar of assets")
        
        # ROE improvement using DuPont analysis
        if "roe" in ratios and ratios["roe"].value < 0.15:
            recommendations.append("Improve ROE through better profit margins, asset efficiency, or financial leverage")
        
        return recommendations
    
    def _generate_ratio_summary(self, ratios: Dict[str, RatioResult]) -> Dict[str, Any]:
        """Generate summary of ratio analysis"""
        categories = {}
        
        for ratio in ratios.values():
            if ratio.category.value not in categories:
                categories[ratio.category.value] = {
                    "ratios": [],
                    "average_grade": None,
                    "key_insights": []
                }
            
            categories[ratio.category.value]["ratios"].append({
                "name": ratio.name,
                "value": ratio.value,
                "grade": ratio.grade,
                "interpretation": ratio.interpretation
            })
        
        # Calculate average grades for each category
        for category_data in categories.values():
            grades = [r["grade"] for r in category_data["ratios"] if r["grade"]]
            if grades:
                grade_scores = [self._grade_to_score(g) for g in grades]
                avg_score = np.mean(grade_scores)
                category_data["average_grade"] = self._score_to_grade(avg_score)
        
        return categories


# Example usage
if __name__ == "__main__":
    # Sample financial data
    sample_data = FinancialStatement(
        total_assets=1000000,
        current_assets=500000,
        cash_and_equivalents=100000,
        accounts_receivable=150000,
        inventory=100000,
        total_liabilities=600000,
        current_liabilities=200000,
        total_debt=300000,
        long_term_debt=250000,
        shareholders_equity=400000,
        revenue=2000000,
        gross_profit=800000,
        operating_income=300000,
        ebitda=350000,
        net_income=200000,
        cost_of_goods_sold=1200000,
        operating_expenses=500000,
        interest_expense=30000,
        operating_cash_flow=250000,
        free_cash_flow=200000,
        market_cap=2000000,
        shares_outstanding=100000,
        stock_price=20.0
    )
    
    analyzer = FinancialRatioAnalyzer()
    results = analyzer.analyze_ratios(sample_data, "technology")
    
    print("Financial Ratio Analysis Results:")
    print(f"Overall Financial Health Score: {results['financial_health_score']['overall_score']}")
    print(f"Grade: {results['financial_health_score']['grade']}")
    print("\nKey Ratios:")
    for name, ratio in results['ratios'].items():
        print(f"{ratio.name}: {ratio.value:.3f} (Grade: {ratio.grade})")
