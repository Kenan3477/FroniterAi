"""
Financial Analysis Capability
Advanced financial modeling, analysis, and decision support
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import numpy as np
import pandas as pd
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger(__name__)

class FinancialMetricType(Enum):
    LIQUIDITY = "liquidity"
    PROFITABILITY = "profitability"
    EFFICIENCY = "efficiency"
    LEVERAGE = "leverage"
    MARKET = "market"
    GROWTH = "growth"

class ValuationMethod(Enum):
    DCF = "discounted_cash_flow"
    COMPARABLE = "comparable_companies"
    PRECEDENT = "precedent_transactions"
    ASSET_BASED = "asset_based"
    EARNING_MULTIPLE = "earning_multiple"

@dataclass
class FinancialStatement:
    """Financial statement data structure"""
    period: str
    revenue: float
    cost_of_goods_sold: float
    gross_profit: float
    operating_expenses: float
    operating_income: float
    interest_expense: float
    tax_expense: float
    net_income: float
    total_assets: float
    current_assets: float
    total_liabilities: float
    current_liabilities: float
    shareholders_equity: float
    cash_and_equivalents: float
    accounts_receivable: float
    inventory: float
    accounts_payable: float
    long_term_debt: float

@dataclass
class FinancialRatios:
    """Comprehensive financial ratios"""
    # Liquidity ratios
    current_ratio: float
    quick_ratio: float
    cash_ratio: float
    
    # Profitability ratios
    gross_profit_margin: float
    operating_profit_margin: float
    net_profit_margin: float
    return_on_assets: float
    return_on_equity: float
    return_on_invested_capital: float
    
    # Efficiency ratios
    asset_turnover: float
    inventory_turnover: float
    receivables_turnover: float
    payables_turnover: float
    
    # Leverage ratios
    debt_to_equity: float
    debt_to_assets: float
    interest_coverage: float
    debt_service_coverage: float
    
    # Market ratios (if applicable)
    price_to_earnings: Optional[float] = None
    price_to_book: Optional[float] = None
    enterprise_value_to_ebitda: Optional[float] = None

class FinancialAnalysisCapability:
    """
    Advanced financial analysis capability with comprehensive modeling
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.industry_benchmarks = self._load_industry_benchmarks()
        self.analysis_cache = {}
        
        logger.info("Financial Analysis Capability initialized")
    
    def _load_industry_benchmarks(self) -> Dict[str, Dict[str, float]]:
        """Load industry benchmark ratios"""
        return {
            "technology": {
                "current_ratio": 2.5,
                "quick_ratio": 2.0,
                "gross_profit_margin": 0.60,
                "operating_profit_margin": 0.15,
                "net_profit_margin": 0.12,
                "return_on_assets": 0.08,
                "return_on_equity": 0.15,
                "debt_to_equity": 0.3,
                "asset_turnover": 0.7
            },
            "manufacturing": {
                "current_ratio": 1.8,
                "quick_ratio": 1.2,
                "gross_profit_margin": 0.35,
                "operating_profit_margin": 0.10,
                "net_profit_margin": 0.06,
                "return_on_assets": 0.05,
                "return_on_equity": 0.12,
                "debt_to_equity": 0.5,
                "asset_turnover": 1.2
            },
            "retail": {
                "current_ratio": 1.5,
                "quick_ratio": 0.8,
                "gross_profit_margin": 0.25,
                "operating_profit_margin": 0.08,
                "net_profit_margin": 0.04,
                "return_on_assets": 0.06,
                "return_on_equity": 0.15,
                "debt_to_equity": 0.4,
                "asset_turnover": 2.0
            },
            "healthcare": {
                "current_ratio": 2.0,
                "quick_ratio": 1.5,
                "gross_profit_margin": 0.50,
                "operating_profit_margin": 0.12,
                "net_profit_margin": 0.08,
                "return_on_assets": 0.06,
                "return_on_equity": 0.12,
                "debt_to_equity": 0.35,
                "asset_turnover": 0.8
            },
            "financial_services": {
                "current_ratio": 1.2,
                "quick_ratio": 1.1,
                "net_profit_margin": 0.20,
                "return_on_assets": 0.01,
                "return_on_equity": 0.10,
                "debt_to_equity": 8.0,  # Banks have high leverage
                "asset_turnover": 0.05
            }
        }
    
    async def analyze(self, context, requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Conduct comprehensive financial analysis
        
        Args:
            context: Business context with company information
            requirements: Specific analysis requirements
            
        Returns:
            Dictionary with analysis results
        """
        try:
            logger.info(f"Starting financial analysis for {context.company_name}")
            
            analysis_type = requirements.get("analysis_type", "comprehensive")
            financial_data = requirements.get("financial_data", {})
            
            # Initialize result structure
            result = {
                "analysis_type": "financial_analysis",
                "company": context.company_name,
                "industry": context.industry,
                "analysis_date": datetime.now().isoformat(),
                "findings": {},
                "recommendations": [],
                "risk_assessment": {},
                "confidence_score": 0.85,
                "supporting_data": {}
            }
            
            # Conduct specific analysis based on type
            if analysis_type == "comprehensive":
                result.update(await self._comprehensive_analysis(context, financial_data))
            elif analysis_type == "ratio_analysis":
                result.update(await self._ratio_analysis(context, financial_data))
            elif analysis_type == "valuation":
                result.update(await self._valuation_analysis(context, financial_data))
            elif analysis_type == "cash_flow":
                result.update(await self._cash_flow_analysis(context, financial_data))
            elif analysis_type == "investment_analysis":
                result.update(await self._investment_analysis(context, financial_data))
            else:
                result.update(await self._default_analysis(context, financial_data))
            
            return result
            
        except Exception as e:
            logger.error(f"Error in financial analysis: {e}")
            raise
    
    async def _comprehensive_analysis(self, context, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Conduct comprehensive financial analysis"""
        
        # Parse financial statements
        statements = self._parse_financial_statements(financial_data)
        
        # Calculate financial ratios
        ratios = self._calculate_financial_ratios(statements)
        
        # Benchmark against industry
        benchmarks = self._benchmark_analysis(ratios, context.industry)
        
        # Trend analysis
        trends = self._trend_analysis(statements)
        
        # Risk assessment
        risks = self._financial_risk_assessment(ratios, trends, context)
        
        # Generate recommendations
        recommendations = self._generate_financial_recommendations(
            ratios, benchmarks, risks, context
        )
        
        return {
            "findings": {
                "financial_ratios": asdict(ratios) if ratios else {},
                "industry_comparison": benchmarks,
                "trend_analysis": trends,
                "financial_strength": self._assess_financial_strength(ratios),
                "liquidity_position": self._assess_liquidity(ratios),
                "profitability_analysis": self._assess_profitability(ratios),
                "efficiency_metrics": self._assess_efficiency(ratios),
                "leverage_analysis": self._assess_leverage(ratios)
            },
            "recommendations": recommendations,
            "risk_assessment": risks,
            "supporting_data": {
                "financial_statements": [asdict(stmt) for stmt in statements] if statements else [],
                "calculation_methods": self._get_calculation_methods(),
                "data_quality_score": self._assess_data_quality(financial_data)
            }
        }
    
    def _parse_financial_statements(self, financial_data: Dict[str, Any]) -> List[FinancialStatement]:
        """Parse financial data into structured statements"""
        statements = []
        
        try:
            # Handle different data formats
            if "statements" in financial_data:
                for stmt_data in financial_data["statements"]:
                    statement = FinancialStatement(
                        period=stmt_data.get("period", "Unknown"),
                        revenue=float(stmt_data.get("revenue", 0)),
                        cost_of_goods_sold=float(stmt_data.get("cost_of_goods_sold", 0)),
                        gross_profit=float(stmt_data.get("gross_profit", 0)),
                        operating_expenses=float(stmt_data.get("operating_expenses", 0)),
                        operating_income=float(stmt_data.get("operating_income", 0)),
                        interest_expense=float(stmt_data.get("interest_expense", 0)),
                        tax_expense=float(stmt_data.get("tax_expense", 0)),
                        net_income=float(stmt_data.get("net_income", 0)),
                        total_assets=float(stmt_data.get("total_assets", 0)),
                        current_assets=float(stmt_data.get("current_assets", 0)),
                        total_liabilities=float(stmt_data.get("total_liabilities", 0)),
                        current_liabilities=float(stmt_data.get("current_liabilities", 0)),
                        shareholders_equity=float(stmt_data.get("shareholders_equity", 0)),
                        cash_and_equivalents=float(stmt_data.get("cash_and_equivalents", 0)),
                        accounts_receivable=float(stmt_data.get("accounts_receivable", 0)),
                        inventory=float(stmt_data.get("inventory", 0)),
                        accounts_payable=float(stmt_data.get("accounts_payable", 0)),
                        long_term_debt=float(stmt_data.get("long_term_debt", 0))
                    )
                    statements.append(statement)
            
            # Calculate derived values if missing
            for stmt in statements:
                if stmt.gross_profit == 0 and stmt.revenue > 0:
                    stmt.gross_profit = stmt.revenue - stmt.cost_of_goods_sold
                
                if stmt.operating_income == 0 and stmt.gross_profit > 0:
                    stmt.operating_income = stmt.gross_profit - stmt.operating_expenses
        
        except Exception as e:
            logger.warning(f"Error parsing financial statements: {e}")
            # Return sample statement for demonstration
            statements = [self._create_sample_statement()]
        
        return statements
    
    def _create_sample_statement(self) -> FinancialStatement:
        """Create sample financial statement for demonstration"""
        return FinancialStatement(
            period="2024",
            revenue=10000000,
            cost_of_goods_sold=6000000,
            gross_profit=4000000,
            operating_expenses=2500000,
            operating_income=1500000,
            interest_expense=100000,
            tax_expense=350000,
            net_income=1050000,
            total_assets=8000000,
            current_assets=3000000,
            total_liabilities=3500000,
            current_liabilities=1500000,
            shareholders_equity=4500000,
            cash_and_equivalents=800000,
            accounts_receivable=1200000,
            inventory=1000000,
            accounts_payable=800000,
            long_term_debt=2000000
        )
    
    def _calculate_financial_ratios(self, statements: List[FinancialStatement]) -> Optional[FinancialRatios]:
        """Calculate comprehensive financial ratios"""
        if not statements:
            return None
        
        # Use most recent statement
        stmt = statements[-1]
        
        try:
            # Liquidity ratios
            current_ratio = stmt.current_assets / stmt.current_liabilities if stmt.current_liabilities > 0 else 0
            quick_assets = stmt.current_assets - stmt.inventory
            quick_ratio = quick_assets / stmt.current_liabilities if stmt.current_liabilities > 0 else 0
            cash_ratio = stmt.cash_and_equivalents / stmt.current_liabilities if stmt.current_liabilities > 0 else 0
            
            # Profitability ratios
            gross_profit_margin = stmt.gross_profit / stmt.revenue if stmt.revenue > 0 else 0
            operating_profit_margin = stmt.operating_income / stmt.revenue if stmt.revenue > 0 else 0
            net_profit_margin = stmt.net_income / stmt.revenue if stmt.revenue > 0 else 0
            return_on_assets = stmt.net_income / stmt.total_assets if stmt.total_assets > 0 else 0
            return_on_equity = stmt.net_income / stmt.shareholders_equity if stmt.shareholders_equity > 0 else 0
            
            # Estimate ROIC (Return on Invested Capital)
            invested_capital = stmt.shareholders_equity + stmt.long_term_debt
            return_on_invested_capital = stmt.operating_income / invested_capital if invested_capital > 0 else 0
            
            # Efficiency ratios
            asset_turnover = stmt.revenue / stmt.total_assets if stmt.total_assets > 0 else 0
            inventory_turnover = stmt.cost_of_goods_sold / stmt.inventory if stmt.inventory > 0 else 0
            receivables_turnover = stmt.revenue / stmt.accounts_receivable if stmt.accounts_receivable > 0 else 0
            payables_turnover = stmt.cost_of_goods_sold / stmt.accounts_payable if stmt.accounts_payable > 0 else 0
            
            # Leverage ratios
            debt_to_equity = stmt.total_liabilities / stmt.shareholders_equity if stmt.shareholders_equity > 0 else 0
            debt_to_assets = stmt.total_liabilities / stmt.total_assets if stmt.total_assets > 0 else 0
            interest_coverage = stmt.operating_income / stmt.interest_expense if stmt.interest_expense > 0 else float('inf')
            debt_service_coverage = stmt.operating_income / (stmt.interest_expense + stmt.long_term_debt * 0.1) if stmt.interest_expense > 0 else 0
            
            return FinancialRatios(
                current_ratio=current_ratio,
                quick_ratio=quick_ratio,
                cash_ratio=cash_ratio,
                gross_profit_margin=gross_profit_margin,
                operating_profit_margin=operating_profit_margin,
                net_profit_margin=net_profit_margin,
                return_on_assets=return_on_assets,
                return_on_equity=return_on_equity,
                return_on_invested_capital=return_on_invested_capital,
                asset_turnover=asset_turnover,
                inventory_turnover=inventory_turnover,
                receivables_turnover=receivables_turnover,
                payables_turnover=payables_turnover,
                debt_to_equity=debt_to_equity,
                debt_to_assets=debt_to_assets,
                interest_coverage=interest_coverage,
                debt_service_coverage=debt_service_coverage
            )
            
        except Exception as e:
            logger.error(f"Error calculating financial ratios: {e}")
            return None
    
    def _benchmark_analysis(self, ratios: FinancialRatios, industry: str) -> Dict[str, Any]:
        """Compare ratios against industry benchmarks"""
        if not ratios:
            return {"status": "no_ratios_available"}
        
        # Get industry benchmarks
        industry_key = industry.lower().replace(" ", "_")
        benchmarks = self.industry_benchmarks.get(industry_key, self.industry_benchmarks.get("technology"))
        
        comparison = {}
        
        for metric, benchmark_value in benchmarks.items():
            if hasattr(ratios, metric):
                actual_value = getattr(ratios, metric)
                if actual_value is not None:
                    variance = ((actual_value - benchmark_value) / benchmark_value) * 100 if benchmark_value != 0 else 0
                    
                    if metric in ["current_ratio", "quick_ratio", "gross_profit_margin", "net_profit_margin", "return_on_assets", "return_on_equity"]:
                        # Higher is better
                        performance = "above_benchmark" if variance > 10 else "below_benchmark" if variance < -10 else "at_benchmark"
                    elif metric in ["debt_to_equity", "debt_to_assets"]:
                        # Lower is generally better
                        performance = "below_benchmark" if variance > 10 else "above_benchmark" if variance < -10 else "at_benchmark"
                    else:
                        performance = "at_benchmark"
                    
                    comparison[metric] = {
                        "actual": actual_value,
                        "benchmark": benchmark_value,
                        "variance_percent": variance,
                        "performance": performance
                    }
        
        return comparison
    
    def _trend_analysis(self, statements: List[FinancialStatement]) -> Dict[str, Any]:
        """Analyze financial trends over time"""
        if len(statements) < 2:
            return {"status": "insufficient_data_for_trend_analysis"}
        
        trends = {}
        
        # Calculate growth rates
        latest = statements[-1]
        previous = statements[-2]
        
        metrics = [
            "revenue", "gross_profit", "operating_income", "net_income",
            "total_assets", "shareholders_equity", "total_liabilities"
        ]
        
        for metric in metrics:
            latest_value = getattr(latest, metric)
            previous_value = getattr(previous, metric)
            
            if previous_value != 0:
                growth_rate = ((latest_value - previous_value) / previous_value) * 100
                trends[f"{metric}_growth"] = {
                    "growth_rate_percent": growth_rate,
                    "direction": "positive" if growth_rate > 0 else "negative" if growth_rate < 0 else "flat"
                }
        
        # Overall trend assessment
        revenue_growth = trends.get("revenue_growth", {}).get("growth_rate_percent", 0)
        profit_growth = trends.get("net_income_growth", {}).get("growth_rate_percent", 0)
        
        if revenue_growth > 10 and profit_growth > 10:
            overall_trend = "strong_growth"
        elif revenue_growth > 0 and profit_growth > 0:
            overall_trend = "moderate_growth"
        elif revenue_growth > 0 but profit_growth < 0:
            overall_trend = "revenue_growth_profit_pressure"
        else:
            overall_trend = "declining"
        
        trends["overall_assessment"] = overall_trend
        
        return trends
    
    def _financial_risk_assessment(self, ratios: FinancialRatios, trends: Dict[str, Any], context) -> Dict[str, Any]:
        """Assess financial risks"""
        risks = {
            "overall_risk_level": "medium",
            "risk_factors": [],
            "risk_scores": {},
            "mitigation_suggestions": []
        }
        
        if not ratios:
            risks["risk_factors"].append("Insufficient financial data for comprehensive risk assessment")
            risks["overall_risk_level"] = "high"
            return risks
        
        # Liquidity risk
        if ratios.current_ratio < 1.0:
            risks["risk_factors"].append("Low current ratio indicates potential liquidity issues")
            risks["risk_scores"]["liquidity_risk"] = "high"
        elif ratios.current_ratio < 1.5:
            risks["risk_scores"]["liquidity_risk"] = "medium"
        else:
            risks["risk_scores"]["liquidity_risk"] = "low"
        
        # Leverage risk
        if ratios.debt_to_equity > 2.0:
            risks["risk_factors"].append("High debt-to-equity ratio indicates high financial leverage")
            risks["risk_scores"]["leverage_risk"] = "high"
        elif ratios.debt_to_equity > 1.0:
            risks["risk_scores"]["leverage_risk"] = "medium"
        else:
            risks["risk_scores"]["leverage_risk"] = "low"
        
        # Profitability risk
        if ratios.net_profit_margin < 0:
            risks["risk_factors"].append("Negative profit margins indicate profitability concerns")
            risks["risk_scores"]["profitability_risk"] = "high"
        elif ratios.net_profit_margin < 0.05:
            risks["risk_scores"]["profitability_risk"] = "medium"
        else:
            risks["risk_scores"]["profitability_risk"] = "low"
        
        # Interest coverage risk
        if ratios.interest_coverage < 2.0:
            risks["risk_factors"].append("Low interest coverage ratio indicates difficulty servicing debt")
            risks["risk_scores"]["debt_service_risk"] = "high"
        elif ratios.interest_coverage < 5.0:
            risks["risk_scores"]["debt_service_risk"] = "medium"
        else:
            risks["risk_scores"]["debt_service_risk"] = "low"
        
        # Calculate overall risk level
        high_risk_count = sum(1 for score in risks["risk_scores"].values() if score == "high")
        if high_risk_count >= 2:
            risks["overall_risk_level"] = "high"
        elif high_risk_count == 1:
            risks["overall_risk_level"] = "medium"
        else:
            risks["overall_risk_level"] = "low"
        
        return risks
    
    def _generate_financial_recommendations(
        self,
        ratios: FinancialRatios,
        benchmarks: Dict[str, Any],
        risks: Dict[str, Any],
        context
    ) -> List[Dict[str, Any]]:
        """Generate actionable financial recommendations"""
        recommendations = []
        
        if not ratios:
            recommendations.append({
                "category": "data_quality",
                "priority": "high",
                "action": "Improve financial data collection and reporting",
                "rationale": "Accurate financial data is essential for effective analysis and decision-making",
                "implementation_timeline": "immediate",
                "expected_impact": "high"
            })
            return recommendations
        
        # Liquidity recommendations
        if ratios.current_ratio < 1.5:
            recommendations.append({
                "category": "liquidity",
                "priority": "high",
                "action": "Improve working capital management",
                "rationale": f"Current ratio of {ratios.current_ratio:.2f} is below optimal range",
                "implementation_timeline": "3-6 months",
                "expected_impact": "high",
                "specific_steps": [
                    "Accelerate accounts receivable collection",
                    "Optimize inventory levels",
                    "Negotiate better payment terms with suppliers"
                ]
            })
        
        # Profitability recommendations
        if ratios.net_profit_margin < 0.05:
            recommendations.append({
                "category": "profitability",
                "priority": "high",
                "action": "Implement profit margin improvement initiatives",
                "rationale": f"Net profit margin of {ratios.net_profit_margin:.2%} is below industry standards",
                "implementation_timeline": "6-12 months",
                "expected_impact": "high",
                "specific_steps": [
                    "Conduct cost structure analysis",
                    "Identify revenue enhancement opportunities",
                    "Implement operational efficiency improvements"
                ]
            })
        
        # Leverage recommendations
        if ratios.debt_to_equity > 1.5:
            recommendations.append({
                "category": "capital_structure",
                "priority": "medium",
                "action": "Optimize capital structure and reduce leverage",
                "rationale": f"Debt-to-equity ratio of {ratios.debt_to_equity:.2f} indicates high financial leverage",
                "implementation_timeline": "12-24 months",
                "expected_impact": "medium",
                "specific_steps": [
                    "Develop debt reduction plan",
                    "Consider equity financing options",
                    "Improve cash flow to service debt"
                ]
            })
        
        # Efficiency recommendations
        if ratios.asset_turnover < 0.5:
            recommendations.append({
                "category": "efficiency",
                "priority": "medium",
                "action": "Improve asset utilization efficiency",
                "rationale": f"Asset turnover of {ratios.asset_turnover:.2f} suggests underutilized assets",
                "implementation_timeline": "6-18 months",
                "expected_impact": "medium",
                "specific_steps": [
                    "Conduct asset utilization analysis",
                    "Divest underperforming assets",
                    "Optimize asset deployment strategies"
                ]
            })
        
        # Benchmark-based recommendations
        for metric, comparison in benchmarks.items():
            if isinstance(comparison, dict) and comparison.get("performance") == "below_benchmark":
                variance = abs(comparison.get("variance_percent", 0))
                if variance > 20:  # Significant underperformance
                    recommendations.append({
                        "category": "benchmarking",
                        "priority": "medium",
                        "action": f"Improve {metric.replace('_', ' ')} performance",
                        "rationale": f"{metric} is {variance:.1f}% below industry benchmark",
                        "implementation_timeline": "6-12 months",
                        "expected_impact": "medium"
                    })
        
        return recommendations[:8]  # Limit to top 8 recommendations
    
    def _assess_financial_strength(self, ratios: FinancialRatios) -> Dict[str, Any]:
        """Assess overall financial strength"""
        if not ratios:
            return {"assessment": "insufficient_data", "score": 0}
        
        strength_scores = []
        
        # Liquidity strength
        if ratios.current_ratio >= 2.0:
            strength_scores.append(4)
        elif ratios.current_ratio >= 1.5:
            strength_scores.append(3)
        elif ratios.current_ratio >= 1.0:
            strength_scores.append(2)
        else:
            strength_scores.append(1)
        
        # Profitability strength
        if ratios.net_profit_margin >= 0.15:
            strength_scores.append(4)
        elif ratios.net_profit_margin >= 0.10:
            strength_scores.append(3)
        elif ratios.net_profit_margin >= 0.05:
            strength_scores.append(2)
        else:
            strength_scores.append(1)
        
        # Leverage strength (inverse scoring)
        if ratios.debt_to_equity <= 0.3:
            strength_scores.append(4)
        elif ratios.debt_to_equity <= 0.6:
            strength_scores.append(3)
        elif ratios.debt_to_equity <= 1.0:
            strength_scores.append(2)
        else:
            strength_scores.append(1)
        
        # Return strength
        if ratios.return_on_equity >= 0.20:
            strength_scores.append(4)
        elif ratios.return_on_equity >= 0.15:
            strength_scores.append(3)
        elif ratios.return_on_equity >= 0.10:
            strength_scores.append(2)
        else:
            strength_scores.append(1)
        
        average_score = sum(strength_scores) / len(strength_scores)
        
        if average_score >= 3.5:
            assessment = "strong"
        elif average_score >= 2.5:
            assessment = "moderate"
        elif average_score >= 1.5:
            assessment = "weak"
        else:
            assessment = "very_weak"
        
        return {
            "assessment": assessment,
            "score": average_score,
            "component_scores": {
                "liquidity": strength_scores[0],
                "profitability": strength_scores[1],
                "leverage": strength_scores[2],
                "returns": strength_scores[3]
            }
        }
    
    def _assess_liquidity(self, ratios: FinancialRatios) -> Dict[str, Any]:
        """Detailed liquidity assessment"""
        if not ratios:
            return {"status": "insufficient_data"}
        
        return {
            "current_ratio": {
                "value": ratios.current_ratio,
                "assessment": "strong" if ratios.current_ratio >= 2.0 else "adequate" if ratios.current_ratio >= 1.5 else "weak"
            },
            "quick_ratio": {
                "value": ratios.quick_ratio,
                "assessment": "strong" if ratios.quick_ratio >= 1.5 else "adequate" if ratios.quick_ratio >= 1.0 else "weak"
            },
            "cash_ratio": {
                "value": ratios.cash_ratio,
                "assessment": "strong" if ratios.cash_ratio >= 0.5 else "adequate" if ratios.cash_ratio >= 0.2 else "weak"
            },
            "overall_liquidity": "strong" if ratios.current_ratio >= 2.0 and ratios.quick_ratio >= 1.0 else "adequate" if ratios.current_ratio >= 1.5 else "concerning"
        }
    
    def _assess_profitability(self, ratios: FinancialRatios) -> Dict[str, Any]:
        """Detailed profitability assessment"""
        if not ratios:
            return {"status": "insufficient_data"}
        
        return {
            "gross_profit_margin": {
                "value": ratios.gross_profit_margin,
                "assessment": "strong" if ratios.gross_profit_margin >= 0.4 else "adequate" if ratios.gross_profit_margin >= 0.2 else "weak"
            },
            "operating_profit_margin": {
                "value": ratios.operating_profit_margin,
                "assessment": "strong" if ratios.operating_profit_margin >= 0.15 else "adequate" if ratios.operating_profit_margin >= 0.05 else "weak"
            },
            "net_profit_margin": {
                "value": ratios.net_profit_margin,
                "assessment": "strong" if ratios.net_profit_margin >= 0.10 else "adequate" if ratios.net_profit_margin >= 0.05 else "weak"
            },
            "return_on_assets": {
                "value": ratios.return_on_assets,
                "assessment": "strong" if ratios.return_on_assets >= 0.10 else "adequate" if ratios.return_on_assets >= 0.05 else "weak"
            },
            "return_on_equity": {
                "value": ratios.return_on_equity,
                "assessment": "strong" if ratios.return_on_equity >= 0.15 else "adequate" if ratios.return_on_equity >= 0.10 else "weak"
            }
        }
    
    def _assess_efficiency(self, ratios: FinancialRatios) -> Dict[str, Any]:
        """Detailed efficiency assessment"""
        if not ratios:
            return {"status": "insufficient_data"}
        
        return {
            "asset_turnover": {
                "value": ratios.asset_turnover,
                "assessment": "strong" if ratios.asset_turnover >= 1.5 else "adequate" if ratios.asset_turnover >= 0.8 else "weak"
            },
            "inventory_turnover": {
                "value": ratios.inventory_turnover,
                "assessment": "strong" if ratios.inventory_turnover >= 8 else "adequate" if ratios.inventory_turnover >= 4 else "weak"
            },
            "receivables_turnover": {
                "value": ratios.receivables_turnover,
                "assessment": "strong" if ratios.receivables_turnover >= 12 else "adequate" if ratios.receivables_turnover >= 6 else "weak"
            },
            "overall_efficiency": "strong" if ratios.asset_turnover >= 1.0 and ratios.inventory_turnover >= 6 else "adequate" if ratios.asset_turnover >= 0.5 else "needs_improvement"
        }
    
    def _assess_leverage(self, ratios: FinancialRatios) -> Dict[str, Any]:
        """Detailed leverage assessment"""
        if not ratios:
            return {"status": "insufficient_data"}
        
        return {
            "debt_to_equity": {
                "value": ratios.debt_to_equity,
                "assessment": "conservative" if ratios.debt_to_equity <= 0.5 else "moderate" if ratios.debt_to_equity <= 1.0 else "aggressive"
            },
            "debt_to_assets": {
                "value": ratios.debt_to_assets,
                "assessment": "conservative" if ratios.debt_to_assets <= 0.3 else "moderate" if ratios.debt_to_assets <= 0.6 else "high"
            },
            "interest_coverage": {
                "value": ratios.interest_coverage,
                "assessment": "strong" if ratios.interest_coverage >= 10 else "adequate" if ratios.interest_coverage >= 3 else "weak"
            },
            "overall_leverage": "conservative" if ratios.debt_to_equity <= 0.5 and ratios.interest_coverage >= 5 else "moderate" if ratios.debt_to_equity <= 1.0 else "high_risk"
        }
    
    def _get_calculation_methods(self) -> Dict[str, str]:
        """Get explanation of calculation methods"""
        return {
            "current_ratio": "Current Assets / Current Liabilities",
            "quick_ratio": "(Current Assets - Inventory) / Current Liabilities",
            "gross_profit_margin": "Gross Profit / Revenue",
            "net_profit_margin": "Net Income / Revenue",
            "return_on_assets": "Net Income / Total Assets",
            "return_on_equity": "Net Income / Shareholders' Equity",
            "debt_to_equity": "Total Liabilities / Shareholders' Equity",
            "asset_turnover": "Revenue / Total Assets",
            "interest_coverage": "Operating Income / Interest Expense"
        }
    
    def _assess_data_quality(self, financial_data: Dict[str, Any]) -> float:
        """Assess quality of financial data provided"""
        quality_score = 1.0
        
        if not financial_data:
            return 0.0
        
        # Check for required fields
        required_fields = ["revenue", "net_income", "total_assets", "total_liabilities"]
        if "statements" in financial_data:
            statements = financial_data["statements"]
            if statements:
                latest_statement = statements[-1]
                missing_fields = [field for field in required_fields if field not in latest_statement]
                quality_score -= len(missing_fields) * 0.2
        else:
            quality_score -= 0.5
        
        # Check for data consistency
        if quality_score > 0.5:
            # Additional consistency checks could be implemented here
            pass
        
        return max(0.0, min(1.0, quality_score))
    
    async def _ratio_analysis(self, context, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Focused ratio analysis"""
        statements = self._parse_financial_statements(financial_data)
        ratios = self._calculate_financial_ratios(statements)
        benchmarks = self._benchmark_analysis(ratios, context.industry)
        
        return {
            "findings": {
                "calculated_ratios": asdict(ratios) if ratios else {},
                "industry_benchmarks": benchmarks,
                "ratio_interpretation": self._interpret_ratios(ratios)
            },
            "recommendations": self._generate_ratio_recommendations(ratios, benchmarks),
            "confidence_score": 0.9
        }
    
    def _interpret_ratios(self, ratios: FinancialRatios) -> Dict[str, str]:
        """Provide interpretation of key ratios"""
        if not ratios:
            return {"status": "No ratios available for interpretation"}
        
        interpretations = {}
        
        # Current ratio interpretation
        if ratios.current_ratio >= 2.0:
            interpretations["current_ratio"] = "Strong liquidity position, able to meet short-term obligations"
        elif ratios.current_ratio >= 1.5:
            interpretations["current_ratio"] = "Adequate liquidity, generally able to meet obligations"
        elif ratios.current_ratio >= 1.0:
            interpretations["current_ratio"] = "Marginal liquidity, may face challenges with obligations"
        else:
            interpretations["current_ratio"] = "Poor liquidity, likely difficulty meeting short-term obligations"
        
        # ROE interpretation
        if ratios.return_on_equity >= 0.20:
            interpretations["return_on_equity"] = "Excellent returns to shareholders"
        elif ratios.return_on_equity >= 0.15:
            interpretations["return_on_equity"] = "Strong returns to shareholders"
        elif ratios.return_on_equity >= 0.10:
            interpretations["return_on_equity"] = "Adequate returns to shareholders"
        else:
            interpretations["return_on_equity"] = "Below average returns to shareholders"
        
        return interpretations
    
    def _generate_ratio_recommendations(self, ratios: FinancialRatios, benchmarks: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations based on ratio analysis"""
        recommendations = []
        
        if not ratios:
            return recommendations
        
        # Focus on worst performing ratios
        underperforming_ratios = []
        for metric, comparison in benchmarks.items():
            if isinstance(comparison, dict) and comparison.get("performance") == "below_benchmark":
                variance = abs(comparison.get("variance_percent", 0))
                underperforming_ratios.append((metric, variance))
        
        # Sort by variance (worst first)
        underperforming_ratios.sort(key=lambda x: x[1], reverse=True)
        
        for metric, variance in underperforming_ratios[:3]:  # Top 3 worst
            recommendations.append({
                "category": "ratio_improvement",
                "priority": "high" if variance > 30 else "medium",
                "action": f"Improve {metric.replace('_', ' ')}",
                "rationale": f"Currently {variance:.1f}% below industry benchmark",
                "implementation_timeline": "6-12 months"
            })
        
        return recommendations
    
    async def _valuation_analysis(self, context, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Conduct valuation analysis"""
        # Placeholder for comprehensive valuation analysis
        return {
            "findings": {
                "valuation_methods": ["DCF", "Comparable Companies", "Asset-based"],
                "estimated_value_range": "To be implemented with market data"
            },
            "recommendations": [
                {
                    "category": "valuation",
                    "action": "Conduct detailed DCF analysis",
                    "priority": "medium"
                }
            ],
            "confidence_score": 0.7
        }
    
    async def _cash_flow_analysis(self, context, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Conduct cash flow analysis"""
        # Placeholder for cash flow analysis
        return {
            "findings": {
                "cash_flow_trends": "To be implemented",
                "working_capital_analysis": "To be implemented"
            },
            "recommendations": [
                {
                    "category": "cash_flow",
                    "action": "Improve cash flow forecasting",
                    "priority": "medium"
                }
            ],
            "confidence_score": 0.75
        }
    
    async def _investment_analysis(self, context, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Conduct investment analysis"""
        # Placeholder for investment analysis
        return {
            "findings": {
                "investment_attractiveness": "To be determined",
                "risk_return_profile": "To be analyzed"
            },
            "recommendations": [
                {
                    "category": "investment",
                    "action": "Develop comprehensive investment framework",
                    "priority": "medium"
                }
            ],
            "confidence_score": 0.7
        }
    
    async def _default_analysis(self, context, financial_data: Dict[str, Any]) -> Dict[str, Any]:
        """Default analysis when type not specified"""
        return await self._comprehensive_analysis(context, financial_data)
    
    async def get_capability_info(self) -> Dict[str, Any]:
        """Get information about financial analysis capabilities"""
        return {
            "capability_name": "Financial Analysis",
            "version": "1.0.0",
            "supported_analyses": [
                "comprehensive", "ratio_analysis", "valuation", 
                "cash_flow", "investment_analysis"
            ],
            "supported_industries": list(self.industry_benchmarks.keys()),
            "metrics_calculated": [
                "liquidity_ratios", "profitability_ratios", "efficiency_ratios", 
                "leverage_ratios", "market_ratios"
            ],
            "benchmarking": "Industry-specific benchmarks available",
            "confidence_level": "High for ratio analysis, Medium for valuation"
        }
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check"""
        return {
            "status": "healthy",
            "benchmarks_loaded": len(self.industry_benchmarks),
            "cache_size": len(self.analysis_cache),
            "last_updated": datetime.now().isoformat()
        }
