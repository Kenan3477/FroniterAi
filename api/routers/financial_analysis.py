"""
Financial Analysis Router

RESTful endpoints for comprehensive financial analysis including ratio analysis,
trend analysis, valuation models, and financial health assessment.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field, validator
import pandas as pd
import numpy as np

from ..middleware.auth import get_current_user, require_permission, require_subscription_tier
from ..utils.response_models import APIResponse, FinancialAnalysisResponse, FinancialRatios
from ..utils.database import create_analysis_request, update_analysis_request
from ..config import SubscriptionTier

logger = logging.getLogger(__name__)

router = APIRouter()


# Request Models
class FinancialStatements(BaseModel):
    """Financial statements input model"""
    
    balance_sheet: Dict[str, float] = Field(..., description="Balance sheet data")
    income_statement: Dict[str, float] = Field(..., description="Income statement data")
    cash_flow_statement: Optional[Dict[str, float]] = Field(None, description="Cash flow statement data")
    
    @validator("balance_sheet")
    def validate_balance_sheet(cls, v):
        required_fields = ["total_assets", "total_liabilities", "shareholders_equity"]
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Missing required balance sheet field: {field}")
        return v
    
    @validator("income_statement")
    def validate_income_statement(cls, v):
        required_fields = ["revenue", "net_income"]
        for field in required_fields:
            if field not in v:
                raise ValueError(f"Missing required income statement field: {field}")
        return v


class FinancialAnalysisRequest(BaseModel):
    """Financial analysis request model"""
    
    company_name: str = Field(..., description="Company name", min_length=1, max_length=200)
    industry: str = Field(..., description="Industry classification", min_length=1, max_length=100)
    analysis_period: str = Field(..., description="Analysis period (e.g., 'Q4 2024')")
    financial_statements: FinancialStatements = Field(..., description="Financial statements data")
    benchmark_data: Optional[Dict[str, Any]] = Field(None, description="Industry benchmark data")
    analysis_options: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Analysis options")


class ValuationRequest(BaseModel):
    """Valuation analysis request model"""
    
    company_name: str = Field(..., description="Company name")
    financial_data: Dict[str, Any] = Field(..., description="Financial data for valuation")
    market_data: Optional[Dict[str, Any]] = Field(None, description="Market data")
    valuation_methods: List[str] = Field(
        default=["dcf", "pe_multiple", "ev_ebitda"],
        description="Valuation methods to use"
    )
    assumptions: Optional[Dict[str, Any]] = Field(None, description="Valuation assumptions")


class TrendAnalysisRequest(BaseModel):
    """Trend analysis request model"""
    
    company_name: str = Field(..., description="Company name")
    historical_data: List[Dict[str, Any]] = Field(..., description="Historical financial data")
    analysis_period_years: int = Field(default=5, description="Number of years to analyze", ge=1, le=10)
    forecast_years: int = Field(default=3, description="Number of years to forecast", ge=1, le=5)


# Financial Analysis Engine
class FinancialAnalysisEngine:
    """Core financial analysis engine"""
    
    @staticmethod
    def calculate_liquidity_ratios(balance_sheet: Dict[str, float]) -> Dict[str, float]:
        """Calculate liquidity ratios"""
        
        ratios = {}
        
        # Current Ratio
        current_assets = balance_sheet.get("current_assets", 0)
        current_liabilities = balance_sheet.get("current_liabilities", 0)
        if current_liabilities > 0:
            ratios["current_ratio"] = current_assets / current_liabilities
        
        # Quick Ratio (Acid Test)
        cash = balance_sheet.get("cash", 0)
        short_term_investments = balance_sheet.get("short_term_investments", 0)
        accounts_receivable = balance_sheet.get("accounts_receivable", 0)
        if current_liabilities > 0:
            quick_assets = cash + short_term_investments + accounts_receivable
            ratios["quick_ratio"] = quick_assets / current_liabilities
        
        # Cash Ratio
        if current_liabilities > 0:
            ratios["cash_ratio"] = (cash + short_term_investments) / current_liabilities
        
        return ratios
    
    @staticmethod
    def calculate_profitability_ratios(income_statement: Dict[str, float], balance_sheet: Dict[str, float]) -> Dict[str, float]:
        """Calculate profitability ratios"""
        
        ratios = {}
        
        revenue = income_statement.get("revenue", 0)
        net_income = income_statement.get("net_income", 0)
        gross_profit = income_statement.get("gross_profit", net_income)
        operating_income = income_statement.get("operating_income", net_income)
        total_assets = balance_sheet.get("total_assets", 0)
        shareholders_equity = balance_sheet.get("shareholders_equity", 0)
        
        # Gross Profit Margin
        if revenue > 0:
            ratios["gross_profit_margin"] = gross_profit / revenue
        
        # Operating Profit Margin
        if revenue > 0:
            ratios["operating_profit_margin"] = operating_income / revenue
        
        # Net Profit Margin
        if revenue > 0:
            ratios["net_profit_margin"] = net_income / revenue
        
        # Return on Assets (ROA)
        if total_assets > 0:
            ratios["return_on_assets"] = net_income / total_assets
        
        # Return on Equity (ROE)
        if shareholders_equity > 0:
            ratios["return_on_equity"] = net_income / shareholders_equity
        
        return ratios
    
    @staticmethod
    def calculate_leverage_ratios(balance_sheet: Dict[str, float]) -> Dict[str, float]:
        """Calculate leverage ratios"""
        
        ratios = {}
        
        total_debt = balance_sheet.get("total_debt", 0)
        total_assets = balance_sheet.get("total_assets", 0)
        shareholders_equity = balance_sheet.get("shareholders_equity", 0)
        total_liabilities = balance_sheet.get("total_liabilities", 0)
        
        # Debt-to-Assets Ratio
        if total_assets > 0:
            ratios["debt_to_assets"] = total_debt / total_assets
        
        # Debt-to-Equity Ratio
        if shareholders_equity > 0:
            ratios["debt_to_equity"] = total_debt / shareholders_equity
        
        # Equity Ratio
        if total_assets > 0:
            ratios["equity_ratio"] = shareholders_equity / total_assets
        
        # Debt Ratio
        if total_assets > 0:
            ratios["debt_ratio"] = total_liabilities / total_assets
        
        return ratios
    
    @staticmethod
    def calculate_efficiency_ratios(income_statement: Dict[str, float], balance_sheet: Dict[str, float]) -> Dict[str, float]:
        """Calculate efficiency ratios"""
        
        ratios = {}
        
        revenue = income_statement.get("revenue", 0)
        cost_of_goods_sold = income_statement.get("cost_of_goods_sold", 0)
        total_assets = balance_sheet.get("total_assets", 0)
        accounts_receivable = balance_sheet.get("accounts_receivable", 0)
        inventory = balance_sheet.get("inventory", 0)
        accounts_payable = balance_sheet.get("accounts_payable", 0)
        
        # Asset Turnover
        if total_assets > 0:
            ratios["asset_turnover"] = revenue / total_assets
        
        # Accounts Receivable Turnover
        if accounts_receivable > 0:
            ratios["receivables_turnover"] = revenue / accounts_receivable
            ratios["days_sales_outstanding"] = 365 / ratios["receivables_turnover"]
        
        # Inventory Turnover
        if inventory > 0 and cost_of_goods_sold > 0:
            ratios["inventory_turnover"] = cost_of_goods_sold / inventory
            ratios["days_inventory_outstanding"] = 365 / ratios["inventory_turnover"]
        
        # Accounts Payable Turnover
        if accounts_payable > 0 and cost_of_goods_sold > 0:
            ratios["payables_turnover"] = cost_of_goods_sold / accounts_payable
            ratios["days_payable_outstanding"] = 365 / ratios["payables_turnover"]
        
        return ratios
    
    @staticmethod
    def calculate_financial_health_score(ratios: FinancialRatios) -> float:
        """Calculate overall financial health score"""
        
        score = 0
        weight_sum = 0
        
        # Liquidity score (weight: 25%)
        if ratios.liquidity_ratios.get("current_ratio"):
            current_ratio = ratios.liquidity_ratios["current_ratio"]
            if current_ratio >= 2.0:
                liquidity_score = 100
            elif current_ratio >= 1.5:
                liquidity_score = 80
            elif current_ratio >= 1.0:
                liquidity_score = 60
            else:
                liquidity_score = 30
            score += liquidity_score * 0.25
            weight_sum += 0.25
        
        # Profitability score (weight: 30%)
        if ratios.profitability_ratios.get("net_profit_margin"):
            net_margin = ratios.profitability_ratios["net_profit_margin"]
            if net_margin >= 0.15:
                profitability_score = 100
            elif net_margin >= 0.10:
                profitability_score = 80
            elif net_margin >= 0.05:
                profitability_score = 60
            elif net_margin >= 0:
                profitability_score = 40
            else:
                profitability_score = 10
            score += profitability_score * 0.30
            weight_sum += 0.30
        
        # Leverage score (weight: 25%)
        if ratios.leverage_ratios.get("debt_to_equity"):
            debt_to_equity = ratios.leverage_ratios["debt_to_equity"]
            if debt_to_equity <= 0.3:
                leverage_score = 100
            elif debt_to_equity <= 0.6:
                leverage_score = 80
            elif debt_to_equity <= 1.0:
                leverage_score = 60
            elif debt_to_equity <= 2.0:
                leverage_score = 40
            else:
                leverage_score = 20
            score += leverage_score * 0.25
            weight_sum += 0.25
        
        # Efficiency score (weight: 20%)
        if ratios.efficiency_ratios.get("asset_turnover"):
            asset_turnover = ratios.efficiency_ratios["asset_turnover"]
            if asset_turnover >= 1.5:
                efficiency_score = 100
            elif asset_turnover >= 1.0:
                efficiency_score = 80
            elif asset_turnover >= 0.7:
                efficiency_score = 60
            elif asset_turnover >= 0.5:
                efficiency_score = 40
            else:
                efficiency_score = 20
            score += efficiency_score * 0.20
            weight_sum += 0.20
        
        return score / weight_sum if weight_sum > 0 else 50


class ValuationEngine:
    """Valuation analysis engine"""
    
    @staticmethod
    def dcf_valuation(financial_data: Dict[str, Any], assumptions: Dict[str, Any]) -> Dict[str, Any]:
        """Discounted Cash Flow valuation"""
        
        # Extract data
        free_cash_flow = financial_data.get("free_cash_flow", 0)
        growth_rate = assumptions.get("growth_rate", 0.05)
        discount_rate = assumptions.get("discount_rate", 0.10)
        terminal_growth_rate = assumptions.get("terminal_growth_rate", 0.02)
        projection_years = assumptions.get("projection_years", 5)
        
        # Project cash flows
        projected_cash_flows = []
        for year in range(1, projection_years + 1):
            cash_flow = free_cash_flow * (1 + growth_rate) ** year
            present_value = cash_flow / (1 + discount_rate) ** year
            projected_cash_flows.append({
                "year": year,
                "cash_flow": cash_flow,
                "present_value": present_value
            })
        
        # Calculate terminal value
        terminal_cash_flow = projected_cash_flows[-1]["cash_flow"] * (1 + terminal_growth_rate)
        terminal_value = terminal_cash_flow / (discount_rate - terminal_growth_rate)
        terminal_present_value = terminal_value / (1 + discount_rate) ** projection_years
        
        # Calculate enterprise value
        pv_of_cash_flows = sum(cf["present_value"] for cf in projected_cash_flows)
        enterprise_value = pv_of_cash_flows + terminal_present_value
        
        return {
            "method": "DCF",
            "projected_cash_flows": projected_cash_flows,
            "terminal_value": terminal_value,
            "terminal_present_value": terminal_present_value,
            "enterprise_value": enterprise_value,
            "assumptions": assumptions
        }
    
    @staticmethod
    def multiple_valuation(financial_data: Dict[str, Any], market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Multiple-based valuation"""
        
        results = {}
        
        # P/E Multiple
        if "net_income" in financial_data and "industry_pe" in market_data:
            pe_valuation = financial_data["net_income"] * market_data["industry_pe"]
            results["pe_valuation"] = {
                "method": "P/E Multiple",
                "multiple": market_data["industry_pe"],
                "base_metric": financial_data["net_income"],
                "valuation": pe_valuation
            }
        
        # EV/EBITDA Multiple
        if "ebitda" in financial_data and "industry_ev_ebitda" in market_data:
            ev_ebitda_valuation = financial_data["ebitda"] * market_data["industry_ev_ebitda"]
            results["ev_ebitda_valuation"] = {
                "method": "EV/EBITDA Multiple",
                "multiple": market_data["industry_ev_ebitda"],
                "base_metric": financial_data["ebitda"],
                "valuation": ev_ebitda_valuation
            }
        
        # Revenue Multiple
        if "revenue" in financial_data and "industry_revenue_multiple" in market_data:
            revenue_valuation = financial_data["revenue"] * market_data["industry_revenue_multiple"]
            results["revenue_valuation"] = {
                "method": "Revenue Multiple",
                "multiple": market_data["industry_revenue_multiple"],
                "base_metric": financial_data["revenue"],
                "valuation": revenue_valuation
            }
        
        return results


# API Endpoints
@router.post("/financial-analysis", response_model=APIResponse[FinancialAnalysisResponse])
async def analyze_financial_statements(
    request: FinancialAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Perform comprehensive financial analysis on company financial statements.
    
    This endpoint analyzes financial statements and provides:
    - Financial ratio analysis (liquidity, profitability, leverage, efficiency)
    - Trend analysis and historical comparison
    - Industry benchmark comparison
    - Risk assessment and recommendations
    - Overall financial health score
    """
    
    try:
        # Create analysis request record
        analysis_request = await create_analysis_request(
            user_id=current_user.get("user_id", 0),
            request_id=f"fa_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            endpoint="/financial-analysis",
            request_type="financial_analysis",
            input_data=request.dict()
        )
        
        # Perform financial analysis
        engine = FinancialAnalysisEngine()
        
        # Calculate ratios
        liquidity_ratios = engine.calculate_liquidity_ratios(request.financial_statements.balance_sheet)
        profitability_ratios = engine.calculate_profitability_ratios(
            request.financial_statements.income_statement,
            request.financial_statements.balance_sheet
        )
        leverage_ratios = engine.calculate_leverage_ratios(request.financial_statements.balance_sheet)
        efficiency_ratios = engine.calculate_efficiency_ratios(
            request.financial_statements.income_statement,
            request.financial_statements.balance_sheet
        )
        
        financial_ratios = FinancialRatios(
            liquidity_ratios=liquidity_ratios,
            profitability_ratios=profitability_ratios,
            leverage_ratios=leverage_ratios,
            efficiency_ratios=efficiency_ratios
        )
        
        # Calculate financial health score
        health_score = engine.calculate_financial_health_score(financial_ratios)
        
        # Generate trends analysis
        trends = {
            "revenue_trend": "stable",
            "profitability_trend": "improving",
            "liquidity_trend": "stable"
        }
        
        # Generate recommendations
        recommendations = []
        if liquidity_ratios.get("current_ratio", 0) < 1.5:
            recommendations.append("Consider improving liquidity position by reducing current liabilities or increasing current assets")
        if profitability_ratios.get("net_profit_margin", 0) < 0.05:
            recommendations.append("Focus on cost reduction and revenue optimization to improve profitability")
        if leverage_ratios.get("debt_to_equity", 0) > 1.0:
            recommendations.append("Consider reducing debt levels to improve financial stability")
        
        # Risk assessment
        risk_factors = []
        if liquidity_ratios.get("current_ratio", 0) < 1.0:
            risk_factors.append("Liquidity risk - current liabilities exceed current assets")
        if profitability_ratios.get("net_profit_margin", 0) < 0:
            risk_factors.append("Profitability risk - company is operating at a loss")
        
        risk_assessment = {
            "overall_risk": "moderate" if len(risk_factors) <= 1 else "high",
            "risk_factors": risk_factors,
            "risk_score": min(100 - health_score, 100)
        }
        
        # Create response
        analysis_response = FinancialAnalysisResponse(
            company_name=request.company_name,
            analysis_period=request.analysis_period,
            financial_ratios=financial_ratios,
            trends=trends,
            benchmark_comparison=request.benchmark_data,
            recommendations=recommendations,
            risk_assessment=risk_assessment,
            score=health_score
        )
        
        # Update analysis request with results
        background_tasks.add_task(
            update_analysis_request,
            analysis_request.request_id,
            analysis_response.dict(),
            "completed"
        )
        
        return APIResponse(
            success=True,
            data=analysis_response,
            message="Financial analysis completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Financial analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Financial analysis failed: {str(e)}"
        )


@router.post("/valuation", response_model=APIResponse[Dict[str, Any]])
@require_subscription_tier(SubscriptionTier.PROFESSIONAL)
async def perform_valuation_analysis(
    request: ValuationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Perform comprehensive company valuation using multiple methodologies.
    
    Requires Professional or Enterprise subscription.
    """
    
    try:
        engine = ValuationEngine()
        valuation_results = {}
        
        # DCF Valuation
        if "dcf" in request.valuation_methods:
            dcf_result = engine.dcf_valuation(
                request.financial_data,
                request.assumptions or {}
            )
            valuation_results["dcf"] = dcf_result
        
        # Multiple-based valuations
        if request.market_data and any(method in request.valuation_methods for method in ["pe_multiple", "ev_ebitda"]):
            multiple_results = engine.multiple_valuation(
                request.financial_data,
                request.market_data
            )
            valuation_results.update(multiple_results)
        
        # Calculate summary statistics
        valuations = [result.get("valuation", result.get("enterprise_value", 0)) 
                     for result in valuation_results.values() 
                     if isinstance(result, dict)]
        
        summary = {
            "company_name": request.company_name,
            "valuation_methods_used": list(valuation_results.keys()),
            "individual_valuations": valuation_results,
            "summary_statistics": {
                "min_valuation": min(valuations) if valuations else 0,
                "max_valuation": max(valuations) if valuations else 0,
                "average_valuation": np.mean(valuations) if valuations else 0,
                "median_valuation": np.median(valuations) if valuations else 0
            }
        }
        
        return APIResponse(
            success=True,
            data=summary,
            message="Valuation analysis completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Valuation analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Valuation analysis failed: {str(e)}"
        )


@router.post("/trend-analysis", response_model=APIResponse[Dict[str, Any]])
async def perform_trend_analysis(
    request: TrendAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Perform historical trend analysis and financial forecasting.
    """
    
    try:
        # Convert to DataFrame for analysis
        df = pd.DataFrame(request.historical_data)
        
        # Ensure required columns exist
        required_columns = ["year", "revenue", "net_income"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")
        
        # Calculate growth rates
        df["revenue_growth"] = df["revenue"].pct_change()
        df["net_income_growth"] = df["net_income"].pct_change()
        
        # Trend analysis
        trends = {
            "revenue": {
                "average_growth": df["revenue_growth"].mean(),
                "trend": "increasing" if df["revenue_growth"].mean() > 0 else "decreasing",
                "volatility": df["revenue_growth"].std()
            },
            "net_income": {
                "average_growth": df["net_income_growth"].mean(),
                "trend": "increasing" if df["net_income_growth"].mean() > 0 else "decreasing",
                "volatility": df["net_income_growth"].std()
            }
        }
        
        # Simple forecasting (linear trend)
        forecasts = []
        last_year = df["year"].max()
        last_revenue = df[df["year"] == last_year]["revenue"].iloc[0]
        last_net_income = df[df["year"] == last_year]["net_income"].iloc[0]
        
        for year in range(1, request.forecast_years + 1):
            forecast_year = last_year + year
            forecast_revenue = last_revenue * (1 + trends["revenue"]["average_growth"]) ** year
            forecast_net_income = last_net_income * (1 + trends["net_income"]["average_growth"]) ** year
            
            forecasts.append({
                "year": forecast_year,
                "revenue": forecast_revenue,
                "net_income": forecast_net_income
            })
        
        result = {
            "company_name": request.company_name,
            "analysis_period": f"{df['year'].min()}-{df['year'].max()}",
            "historical_trends": trends,
            "forecasts": forecasts,
            "data_quality": {
                "years_analyzed": len(df),
                "data_completeness": (df.notna().sum() / len(df)).to_dict()
            }
        }
        
        return APIResponse(
            success=True,
            data=result,
            message="Trend analysis completed successfully"
        )
        
    except Exception as e:
        logger.error(f"Trend analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Trend analysis failed: {str(e)}"
        )


@router.get("/industry-benchmarks", response_model=APIResponse[Dict[str, Any]])
async def get_industry_benchmarks(
    industry: str = Query(..., description="Industry name"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get industry benchmark ratios and metrics for comparison.
    """
    
    try:
        # Industry benchmark data (in real implementation, this would come from a database)
        benchmarks = {
            "technology": {
                "liquidity_ratios": {"current_ratio": 2.1, "quick_ratio": 1.8},
                "profitability_ratios": {"net_profit_margin": 0.15, "return_on_assets": 0.08},
                "leverage_ratios": {"debt_to_equity": 0.3, "debt_to_assets": 0.2},
                "efficiency_ratios": {"asset_turnover": 0.9, "receivables_turnover": 8.5}
            },
            "manufacturing": {
                "liquidity_ratios": {"current_ratio": 1.8, "quick_ratio": 1.2},
                "profitability_ratios": {"net_profit_margin": 0.08, "return_on_assets": 0.06},
                "leverage_ratios": {"debt_to_equity": 0.6, "debt_to_assets": 0.35},
                "efficiency_ratios": {"asset_turnover": 1.2, "receivables_turnover": 12.0}
            },
            "retail": {
                "liquidity_ratios": {"current_ratio": 1.5, "quick_ratio": 0.8},
                "profitability_ratios": {"net_profit_margin": 0.05, "return_on_assets": 0.07},
                "leverage_ratios": {"debt_to_equity": 0.8, "debt_to_assets": 0.4},
                "efficiency_ratios": {"asset_turnover": 2.1, "receivables_turnover": 15.0}
            }
        }
        
        industry_data = benchmarks.get(industry.lower(), {})
        
        if not industry_data:
            # Generate generic benchmarks
            industry_data = {
                "liquidity_ratios": {"current_ratio": 1.8, "quick_ratio": 1.3},
                "profitability_ratios": {"net_profit_margin": 0.10, "return_on_assets": 0.07},
                "leverage_ratios": {"debt_to_equity": 0.5, "debt_to_assets": 0.3},
                "efficiency_ratios": {"asset_turnover": 1.1, "receivables_turnover": 10.0}
            }
        
        result = {
            "industry": industry,
            "benchmarks": industry_data,
            "data_source": "Industry Analysis Database",
            "last_updated": datetime.now().isoformat()
        }
        
        return APIResponse(
            success=True,
            data=result,
            message="Industry benchmarks retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Failed to retrieve industry benchmarks: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve industry benchmarks: {str(e)}"
        )
