"""
Valuation Models Engine

Comprehensive valuation algorithms including DCF, comparable company analysis,
precedent transactions, and other valuation methodologies.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import math
from scipy import optimize
from sklearn.linear_model import LinearRegression


class ValuationMethod(str, Enum):
    """Valuation methodologies"""
    DCF = "dcf"
    COMPARABLE_COMPANY = "comparable_company"
    PRECEDENT_TRANSACTION = "precedent_transaction"
    ASSET_BASED = "asset_based"
    DIVIDEND_DISCOUNT = "dividend_discount"
    RESIDUAL_INCOME = "residual_income"
    SUM_OF_PARTS = "sum_of_parts"


class TerminalValueMethod(str, Enum):
    """Terminal value calculation methods"""
    PERPETUAL_GROWTH = "perpetual_growth"
    EXIT_MULTIPLE = "exit_multiple"
    LIQUIDATION_VALUE = "liquidation_value"


@dataclass
class CompanyFinancials:
    """Company financial data structure"""
    # Income Statement
    revenue: List[float]
    gross_profit: List[float]
    operating_income: List[float]
    ebitda: List[float]
    ebit: List[float]
    net_income: List[float]
    
    # Balance Sheet
    total_assets: float
    total_debt: float
    cash_and_equivalents: float
    shareholders_equity: float
    working_capital: float
    
    # Cash Flow
    free_cash_flow: List[float]
    operating_cash_flow: List[float]
    capital_expenditures: List[float]
    
    # Market Data
    shares_outstanding: float
    market_cap: Optional[float] = None
    enterprise_value: Optional[float] = None
    
    # Periods
    historical_periods: List[str] = None


@dataclass
class ValuationInputs:
    """Valuation model inputs"""
    discount_rate: float
    terminal_growth_rate: float
    forecast_periods: int
    tax_rate: float
    
    # Optional inputs
    terminal_multiple: Optional[float] = None
    beta: Optional[float] = None
    risk_free_rate: Optional[float] = None
    market_risk_premium: Optional[float] = None
    debt_cost: Optional[float] = None
    debt_weight: Optional[float] = None
    equity_weight: Optional[float] = None


@dataclass
class ComparableCompany:
    """Comparable company data"""
    name: str
    market_cap: float
    enterprise_value: float
    revenue: float
    ebitda: float
    ebit: float
    net_income: float
    book_value: float
    
    # Calculated multiples
    ev_revenue: Optional[float] = None
    ev_ebitda: Optional[float] = None
    ev_ebit: Optional[float] = None
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None


@dataclass
class ValuationResult:
    """Valuation result structure"""
    method: ValuationMethod
    enterprise_value: float
    equity_value: float
    value_per_share: float
    
    # Additional details
    terminal_value: Optional[float] = None
    forecast_value: Optional[float] = None
    discount_rate_used: Optional[float] = None
    terminal_growth_used: Optional[float] = None
    
    # Sensitivity analysis
    sensitivity_analysis: Optional[Dict[str, Any]] = None
    
    # Method-specific data
    method_details: Optional[Dict[str, Any]] = None


class ValuationEngine:
    """Comprehensive valuation analysis engine"""
    
    def __init__(self):
        self.risk_free_rate = 0.03  # Default 3%
        self.market_risk_premium = 0.06  # Default 6%
    
    def value_company(self, company_data: CompanyFinancials,
                     valuation_inputs: ValuationInputs,
                     methods: List[ValuationMethod] = None) -> Dict[str, ValuationResult]:
        """
        Perform comprehensive company valuation using multiple methods
        
        Args:
            company_data: Company financial data
            valuation_inputs: Valuation assumptions and inputs
            methods: List of valuation methods to use
            
        Returns:
            Dictionary of valuation results by method
        """
        if methods is None:
            methods = [ValuationMethod.DCF]
        
        results = {}
        
        for method in methods:
            if method == ValuationMethod.DCF:
                results[method.value] = self._dcf_valuation(company_data, valuation_inputs)
            elif method == ValuationMethod.COMPARABLE_COMPANY:
                # Would require comparable company data
                results[method.value] = self._comparable_company_valuation(company_data, valuation_inputs)
            elif method == ValuationMethod.DIVIDEND_DISCOUNT:
                results[method.value] = self._dividend_discount_valuation(company_data, valuation_inputs)
            elif method == ValuationMethod.ASSET_BASED:
                results[method.value] = self._asset_based_valuation(company_data, valuation_inputs)
            elif method == ValuationMethod.RESIDUAL_INCOME:
                results[method.value] = self._residual_income_valuation(company_data, valuation_inputs)
        
        return results
    
    def dcf_analysis(self, company_data: CompanyFinancials,
                    valuation_inputs: ValuationInputs,
                    detailed_projections: Optional[Dict[str, List[float]]] = None) -> Dict[str, Any]:
        """
        Detailed DCF analysis with projections and sensitivity
        
        Args:
            company_data: Company financial data
            valuation_inputs: Valuation inputs
            detailed_projections: Custom financial projections
            
        Returns:
            Comprehensive DCF analysis results
        """
        # Generate or use provided projections
        if detailed_projections:
            projections = detailed_projections
        else:
            projections = self._generate_financial_projections(company_data, valuation_inputs)
        
        # Calculate DCF valuation
        dcf_result = self._dcf_valuation(company_data, valuation_inputs, projections)
        
        # Perform sensitivity analysis
        sensitivity = self._dcf_sensitivity_analysis(
            projections, company_data, valuation_inputs
        )
        
        # Calculate scenario analysis
        scenarios = self._dcf_scenario_analysis(
            projections, company_data, valuation_inputs
        )
        
        # Sum of parts analysis if applicable
        sum_of_parts = self._sum_of_parts_analysis(company_data, valuation_inputs)
        
        return {
            "dcf_valuation": dcf_result,
            "financial_projections": projections,
            "sensitivity_analysis": sensitivity,
            "scenario_analysis": scenarios,
            "sum_of_parts": sum_of_parts,
            "key_assumptions": self._extract_key_assumptions(valuation_inputs),
            "valuation_bridge": self._create_valuation_bridge(dcf_result, projections)
        }
    
    def comparable_analysis(self, company_data: CompanyFinancials,
                          comparable_companies: List[ComparableCompany],
                          adjustments: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        """
        Comprehensive comparable company analysis
        
        Args:
            company_data: Target company data
            comparable_companies: List of comparable companies
            adjustments: Size, liquidity, and other adjustments
            
        Returns:
            Comparable company analysis results
        """
        # Calculate multiples for comparable companies
        comp_multiples = self._calculate_comparable_multiples(comparable_companies)
        
        # Apply multiples to target company
        valuation_by_multiple = self._apply_multiples_to_target(
            company_data, comp_multiples, adjustments
        )
        
        # Statistical analysis of multiples
        multiple_statistics = self._analyze_multiple_statistics(comp_multiples)
        
        # Premium/discount analysis
        premium_discount = self._calculate_premium_discount(
            valuation_by_multiple, comparable_companies
        )
        
        return {
            "comparable_multiples": comp_multiples,
            "target_valuation": valuation_by_multiple,
            "multiple_statistics": multiple_statistics,
            "premium_discount_analysis": premium_discount,
            "adjusted_valuations": self._apply_adjustments(valuation_by_multiple, adjustments),
            "football_field": self._create_football_field_chart(valuation_by_multiple)
        }
    
    def monte_carlo_valuation(self, company_data: CompanyFinancials,
                            valuation_inputs: ValuationInputs,
                            uncertainty_parameters: Dict[str, Tuple[float, float]],
                            simulations: int = 10000) -> Dict[str, Any]:
        """
        Monte Carlo simulation for valuation under uncertainty
        
        Args:
            company_data: Company financial data
            valuation_inputs: Base case valuation inputs
            uncertainty_parameters: Parameters with (mean, std) for normal distribution
            simulations: Number of Monte Carlo simulations
            
        Returns:
            Monte Carlo valuation results
        """
        simulation_results = []
        
        for _ in range(simulations):
            # Sample uncertain parameters
            sim_inputs = self._sample_uncertain_parameters(
                valuation_inputs, uncertainty_parameters
            )
            
            # Run DCF valuation with sampled inputs
            dcf_result = self._dcf_valuation(company_data, sim_inputs)
            simulation_results.append(dcf_result.value_per_share)
        
        # Analyze simulation results
        return self._analyze_monte_carlo_results(simulation_results, valuation_inputs)
    
    def _dcf_valuation(self, company_data: CompanyFinancials,
                      valuation_inputs: ValuationInputs,
                      projections: Optional[Dict[str, List[float]]] = None) -> ValuationResult:
        """Discounted Cash Flow valuation"""
        
        if projections is None:
            projections = self._generate_financial_projections(company_data, valuation_inputs)
        
        # Get projected free cash flows
        projected_fcf = projections.get('free_cash_flow', company_data.free_cash_flow[-1:] * valuation_inputs.forecast_periods)
        
        # Calculate present value of projected cash flows
        pv_fcf = []
        for i, fcf in enumerate(projected_fcf):
            pv = fcf / ((1 + valuation_inputs.discount_rate) ** (i + 1))
            pv_fcf.append(pv)
        
        forecast_value = sum(pv_fcf)
        
        # Calculate terminal value
        terminal_fcf = projected_fcf[-1] * (1 + valuation_inputs.terminal_growth_rate)
        terminal_value = terminal_fcf / (valuation_inputs.discount_rate - valuation_inputs.terminal_growth_rate)
        terminal_pv = terminal_value / ((1 + valuation_inputs.discount_rate) ** valuation_inputs.forecast_periods)
        
        # Enterprise value
        enterprise_value = forecast_value + terminal_pv
        
        # Equity value
        equity_value = enterprise_value - company_data.total_debt + company_data.cash_and_equivalents
        
        # Value per share
        value_per_share = equity_value / company_data.shares_outstanding
        
        # Sensitivity analysis
        sensitivity = self._calculate_dcf_sensitivity(
            projected_fcf, company_data, valuation_inputs
        )
        
        return ValuationResult(
            method=ValuationMethod.DCF,
            enterprise_value=enterprise_value,
            equity_value=equity_value,
            value_per_share=value_per_share,
            terminal_value=terminal_value,
            forecast_value=forecast_value,
            discount_rate_used=valuation_inputs.discount_rate,
            terminal_growth_used=valuation_inputs.terminal_growth_rate,
            sensitivity_analysis=sensitivity,
            method_details={
                "projected_fcf": projected_fcf,
                "pv_fcf": pv_fcf,
                "terminal_pv": terminal_pv,
                "terminal_multiple_implied": terminal_value / projected_fcf[-1] if projected_fcf[-1] > 0 else 0
            }
        )
    
    def _comparable_company_valuation(self, company_data: CompanyFinancials,
                                    valuation_inputs: ValuationInputs) -> ValuationResult:
        """Comparable company analysis (simplified version)"""
        
        # Use industry average multiples (in practice, would use actual comparable data)
        industry_multiples = {
            "ev_revenue": 3.5,
            "ev_ebitda": 12.0,
            "pe_ratio": 18.0,
            "pb_ratio": 2.5
        }
        
        # Calculate valuation based on different multiples
        latest_revenue = company_data.revenue[-1] if company_data.revenue else 0
        latest_ebitda = company_data.ebitda[-1] if company_data.ebitda else 0
        latest_net_income = company_data.net_income[-1] if company_data.net_income else 0
        
        valuations = {}
        
        # EV/Revenue
        if latest_revenue > 0:
            ev_revenue = latest_revenue * industry_multiples["ev_revenue"]
            equity_value_revenue = ev_revenue - company_data.total_debt + company_data.cash_and_equivalents
            valuations["ev_revenue"] = equity_value_revenue / company_data.shares_outstanding
        
        # EV/EBITDA
        if latest_ebitda > 0:
            ev_ebitda = latest_ebitda * industry_multiples["ev_ebitda"]
            equity_value_ebitda = ev_ebitda - company_data.total_debt + company_data.cash_and_equivalents
            valuations["ev_ebitda"] = equity_value_ebitda / company_data.shares_outstanding
        
        # P/E
        if latest_net_income > 0:
            eps = latest_net_income / company_data.shares_outstanding
            valuations["pe_ratio"] = eps * industry_multiples["pe_ratio"]
        
        # P/B
        book_value_per_share = company_data.shareholders_equity / company_data.shares_outstanding
        valuations["pb_ratio"] = book_value_per_share * industry_multiples["pb_ratio"]
        
        # Average valuation
        avg_valuation = np.mean(list(valuations.values())) if valuations else 0
        equity_value = avg_valuation * company_data.shares_outstanding
        enterprise_value = equity_value + company_data.total_debt - company_data.cash_and_equivalents
        
        return ValuationResult(
            method=ValuationMethod.COMPARABLE_COMPANY,
            enterprise_value=enterprise_value,
            equity_value=equity_value,
            value_per_share=avg_valuation,
            method_details={
                "multiples_used": industry_multiples,
                "valuation_by_multiple": valuations,
                "valuation_range": {
                    "min": min(valuations.values()) if valuations else 0,
                    "max": max(valuations.values()) if valuations else 0
                }
            }
        )
    
    def _dividend_discount_valuation(self, company_data: CompanyFinancials,
                                   valuation_inputs: ValuationInputs) -> ValuationResult:
        """Dividend Discount Model valuation"""
        
        # Estimate dividend based on payout ratio (simplified)
        latest_net_income = company_data.net_income[-1] if company_data.net_income else 0
        assumed_payout_ratio = 0.4  # 40% payout ratio
        estimated_dividend = (latest_net_income / company_data.shares_outstanding) * assumed_payout_ratio
        
        # Gordon Growth Model
        if valuation_inputs.discount_rate > valuation_inputs.terminal_growth_rate:
            value_per_share = estimated_dividend * (1 + valuation_inputs.terminal_growth_rate) / \
                             (valuation_inputs.discount_rate - valuation_inputs.terminal_growth_rate)
        else:
            value_per_share = 0
        
        equity_value = value_per_share * company_data.shares_outstanding
        enterprise_value = equity_value + company_data.total_debt - company_data.cash_and_equivalents
        
        return ValuationResult(
            method=ValuationMethod.DIVIDEND_DISCOUNT,
            enterprise_value=enterprise_value,
            equity_value=equity_value,
            value_per_share=value_per_share,
            method_details={
                "estimated_dividend": estimated_dividend,
                "payout_ratio_assumed": assumed_payout_ratio,
                "growth_rate_used": valuation_inputs.terminal_growth_rate
            }
        )
    
    def _asset_based_valuation(self, company_data: CompanyFinancials,
                             valuation_inputs: ValuationInputs) -> ValuationResult:
        """Asset-based valuation (book value approach)"""
        
        # Simplified asset-based valuation using book value
        # In practice, would need detailed asset appraisals
        
        # Adjust book value for estimated fair value
        asset_premium = 1.2  # Assume assets worth 20% more than book
        adjusted_asset_value = company_data.total_assets * asset_premium
        
        # Net asset value
        net_asset_value = adjusted_asset_value - company_data.total_debt
        value_per_share = net_asset_value / company_data.shares_outstanding
        
        return ValuationResult(
            method=ValuationMethod.ASSET_BASED,
            enterprise_value=adjusted_asset_value,
            equity_value=net_asset_value,
            value_per_share=value_per_share,
            method_details={
                "book_value_assets": company_data.total_assets,
                "asset_premium": asset_premium,
                "adjusted_asset_value": adjusted_asset_value
            }
        )
    
    def _residual_income_valuation(self, company_data: CompanyFinancials,
                                 valuation_inputs: ValuationInputs) -> ValuationResult:
        """Residual Income Model valuation"""
        
        # Calculate cost of equity
        cost_of_equity = valuation_inputs.discount_rate
        
        # Book value per share
        book_value_per_share = company_data.shareholders_equity / company_data.shares_outstanding
        
        # Latest ROE
        latest_net_income = company_data.net_income[-1] if company_data.net_income else 0
        roe = latest_net_income / company_data.shareholders_equity if company_data.shareholders_equity > 0 else 0
        
        # Residual income
        residual_income = latest_net_income - (cost_of_equity * company_data.shareholders_equity)
        residual_income_per_share = residual_income / company_data.shares_outstanding
        
        # Value = Book Value + PV of Residual Income
        if cost_of_equity > valuation_inputs.terminal_growth_rate:
            pv_residual_income = residual_income_per_share * (1 + valuation_inputs.terminal_growth_rate) / \
                               (cost_of_equity - valuation_inputs.terminal_growth_rate)
        else:
            pv_residual_income = 0
        
        value_per_share = book_value_per_share + pv_residual_income
        equity_value = value_per_share * company_data.shares_outstanding
        enterprise_value = equity_value + company_data.total_debt - company_data.cash_and_equivalents
        
        return ValuationResult(
            method=ValuationMethod.RESIDUAL_INCOME,
            enterprise_value=enterprise_value,
            equity_value=equity_value,
            value_per_share=value_per_share,
            method_details={
                "book_value_per_share": book_value_per_share,
                "roe": roe,
                "cost_of_equity": cost_of_equity,
                "residual_income": residual_income,
                "pv_residual_income": pv_residual_income
            }
        )
    
    def _generate_financial_projections(self, company_data: CompanyFinancials,
                                      valuation_inputs: ValuationInputs) -> Dict[str, List[float]]:
        """Generate financial projections for DCF"""
        
        projections = {}
        
        # Revenue projections (using historical growth trend)
        revenue_growth = self._calculate_growth_trend(company_data.revenue)
        revenue_projections = []
        last_revenue = company_data.revenue[-1]
        
        for i in range(valuation_inputs.forecast_periods):
            projected_revenue = last_revenue * ((1 + revenue_growth) ** (i + 1))
            revenue_projections.append(projected_revenue)
        
        projections['revenue'] = revenue_projections
        
        # EBITDA projections (using historical margin)
        if company_data.ebitda and company_data.revenue:
            ebitda_margin = company_data.ebitda[-1] / company_data.revenue[-1]
            projections['ebitda'] = [rev * ebitda_margin for rev in revenue_projections]
        
        # Free cash flow projections
        if company_data.free_cash_flow:
            fcf_growth = self._calculate_growth_trend(company_data.free_cash_flow)
            fcf_projections = []
            last_fcf = company_data.free_cash_flow[-1]
            
            for i in range(valuation_inputs.forecast_periods):
                projected_fcf = last_fcf * ((1 + fcf_growth) ** (i + 1))
                fcf_projections.append(projected_fcf)
            
            projections['free_cash_flow'] = fcf_projections
        else:
            # Estimate FCF from EBITDA if FCF not available
            if 'ebitda' in projections:
                # Simplified: FCF = EBITDA * conversion rate
                fcf_conversion_rate = 0.6  # Assume 60% of EBITDA converts to FCF
                projections['free_cash_flow'] = [ebitda * fcf_conversion_rate for ebitda in projections['ebitda']]
        
        return projections
    
    def _calculate_growth_trend(self, values: List[float]) -> float:
        """Calculate compound annual growth rate from historical data"""
        if len(values) < 2:
            return 0.05  # Default 5% growth
        
        # Remove any zero or negative values for CAGR calculation
        positive_values = [v for v in values if v > 0]
        if len(positive_values) < 2:
            return 0.05
        
        periods = len(positive_values) - 1
        cagr = (positive_values[-1] / positive_values[0]) ** (1/periods) - 1
        
        # Cap growth rate at reasonable levels
        return max(-0.2, min(0.3, cagr))  # Between -20% and +30%
    
    def _calculate_dcf_sensitivity(self, projected_fcf: List[float],
                                 company_data: CompanyFinancials,
                                 valuation_inputs: ValuationInputs) -> Dict[str, Any]:
        """Calculate DCF sensitivity to key variables"""
        
        base_valuation = self._dcf_valuation(company_data, valuation_inputs).value_per_share
        sensitivity_results = {}
        
        # Discount rate sensitivity
        discount_rates = [
            valuation_inputs.discount_rate - 0.01,
            valuation_inputs.discount_rate,
            valuation_inputs.discount_rate + 0.01
        ]
        
        dr_sensitivity = []
        for dr in discount_rates:
            adjusted_inputs = valuation_inputs
            adjusted_inputs.discount_rate = dr
            valuation = self._dcf_valuation(company_data, adjusted_inputs).value_per_share
            dr_sensitivity.append(valuation)
        
        sensitivity_results["discount_rate"] = {
            "rates": discount_rates,
            "valuations": dr_sensitivity,
            "base_case_index": 1
        }
        
        # Terminal growth sensitivity
        growth_rates = [
            valuation_inputs.terminal_growth_rate - 0.005,
            valuation_inputs.terminal_growth_rate,
            valuation_inputs.terminal_growth_rate + 0.005
        ]
        
        tg_sensitivity = []
        for gr in growth_rates:
            adjusted_inputs = valuation_inputs
            adjusted_inputs.terminal_growth_rate = gr
            valuation = self._dcf_valuation(company_data, adjusted_inputs).value_per_share
            tg_sensitivity.append(valuation)
        
        sensitivity_results["terminal_growth"] = {
            "rates": growth_rates,
            "valuations": tg_sensitivity,
            "base_case_index": 1
        }
        
        return sensitivity_results
    
    def _dcf_sensitivity_analysis(self, projections: Dict[str, List[float]],
                                company_data: CompanyFinancials,
                                valuation_inputs: ValuationInputs) -> Dict[str, Any]:
        """Comprehensive DCF sensitivity analysis"""
        
        # Create sensitivity table for discount rate vs terminal growth
        discount_rates = np.arange(
            valuation_inputs.discount_rate - 0.02,
            valuation_inputs.discount_rate + 0.03,
            0.005
        )
        
        terminal_growth_rates = np.arange(
            valuation_inputs.terminal_growth_rate - 0.01,
            valuation_inputs.terminal_growth_rate + 0.015,
            0.0025
        )
        
        sensitivity_table = {}
        
        for dr in discount_rates:
            sensitivity_table[f"{dr:.1%}"] = {}
            for tgr in terminal_growth_rates:
                if dr > tgr:  # Ensure discount rate > growth rate
                    temp_inputs = valuation_inputs
                    temp_inputs.discount_rate = dr
                    temp_inputs.terminal_growth_rate = tgr
                    valuation = self._dcf_valuation(company_data, temp_inputs, projections)
                    sensitivity_table[f"{dr:.1%}"][f"{tgr:.1%}"] = valuation.value_per_share
                else:
                    sensitivity_table[f"{dr:.1%}"][f"{tgr:.1%}"] = "N/A"
        
        return {
            "sensitivity_table": sensitivity_table,
            "base_case": {
                "discount_rate": valuation_inputs.discount_rate,
                "terminal_growth": valuation_inputs.terminal_growth_rate
            }
        }
    
    def _dcf_scenario_analysis(self, projections: Dict[str, List[float]],
                             company_data: CompanyFinancials,
                             valuation_inputs: ValuationInputs) -> Dict[str, Any]:
        """DCF scenario analysis (bull, base, bear cases)"""
        
        scenarios = {}
        base_fcf = projections.get('free_cash_flow', [])
        
        # Bull case: 25% higher cash flows, lower discount rate
        bull_fcf = [fcf * 1.25 for fcf in base_fcf]
        bull_inputs = valuation_inputs
        bull_inputs.discount_rate = valuation_inputs.discount_rate - 0.01
        bull_inputs.terminal_growth_rate = valuation_inputs.terminal_growth_rate + 0.005
        
        bull_projections = projections.copy()
        bull_projections['free_cash_flow'] = bull_fcf
        
        scenarios["bull"] = self._dcf_valuation(company_data, bull_inputs, bull_projections)
        
        # Base case
        scenarios["base"] = self._dcf_valuation(company_data, valuation_inputs, projections)
        
        # Bear case: 25% lower cash flows, higher discount rate
        bear_fcf = [fcf * 0.75 for fcf in base_fcf]
        bear_inputs = valuation_inputs
        bear_inputs.discount_rate = valuation_inputs.discount_rate + 0.01
        bear_inputs.terminal_growth_rate = max(0, valuation_inputs.terminal_growth_rate - 0.005)
        
        bear_projections = projections.copy()
        bear_projections['free_cash_flow'] = bear_fcf
        
        scenarios["bear"] = self._dcf_valuation(company_data, bear_inputs, bear_projections)
        
        return scenarios
    
    def _sum_of_parts_analysis(self, company_data: CompanyFinancials,
                             valuation_inputs: ValuationInputs) -> Dict[str, Any]:
        """Sum of parts analysis for diversified companies"""
        
        # Simplified sum of parts - in practice would break down by business segment
        parts = {
            "core_business": {
                "value": company_data.enterprise_value * 0.8 if company_data.enterprise_value else 0,
                "description": "Core operating business"
            },
            "investments": {
                "value": company_data.cash_and_equivalents,
                "description": "Cash and investments"
            },
            "other_assets": {
                "value": company_data.total_assets * 0.1,
                "description": "Other assets and investments"
            }
        }
        
        total_value = sum(part["value"] for part in parts.values())
        
        return {
            "parts": parts,
            "total_enterprise_value": total_value,
            "equity_value": total_value - company_data.total_debt,
            "value_per_share": (total_value - company_data.total_debt) / company_data.shares_outstanding
        }
    
    def _extract_key_assumptions(self, valuation_inputs: ValuationInputs) -> Dict[str, Any]:
        """Extract key valuation assumptions"""
        return {
            "discount_rate": valuation_inputs.discount_rate,
            "terminal_growth_rate": valuation_inputs.terminal_growth_rate,
            "forecast_periods": valuation_inputs.forecast_periods,
            "tax_rate": valuation_inputs.tax_rate,
            "terminal_multiple": valuation_inputs.terminal_multiple,
            "cost_of_capital_components": {
                "risk_free_rate": valuation_inputs.risk_free_rate,
                "market_risk_premium": self.market_risk_premium,
                "beta": valuation_inputs.beta,
                "debt_cost": valuation_inputs.debt_cost
            }
        }
    
    def _create_valuation_bridge(self, dcf_result: ValuationResult,
                               projections: Dict[str, List[float]]) -> Dict[str, Any]:
        """Create valuation bridge showing value components"""
        
        return {
            "forecast_value": dcf_result.forecast_value,
            "terminal_value": dcf_result.terminal_value,
            "enterprise_value": dcf_result.enterprise_value,
            "less_net_debt": dcf_result.enterprise_value - dcf_result.equity_value,
            "equity_value": dcf_result.equity_value,
            "value_per_share": dcf_result.value_per_share,
            "terminal_value_percentage": (dcf_result.terminal_value / dcf_result.enterprise_value) * 100
        }
    
    def _calculate_comparable_multiples(self, comparable_companies: List[ComparableCompany]) -> Dict[str, Any]:
        """Calculate trading multiples for comparable companies"""
        
        multiples = {
            "ev_revenue": [],
            "ev_ebitda": [],
            "pe_ratio": [],
            "pb_ratio": []
        }
        
        for comp in comparable_companies:
            if comp.revenue > 0:
                multiples["ev_revenue"].append(comp.enterprise_value / comp.revenue)
            if comp.ebitda > 0:
                multiples["ev_ebitda"].append(comp.enterprise_value / comp.ebitda)
            if comp.net_income > 0:
                multiples["pe_ratio"].append(comp.market_cap / comp.net_income)
            if comp.book_value > 0:
                multiples["pb_ratio"].append(comp.market_cap / comp.book_value)
        
        # Calculate statistics for each multiple
        multiple_stats = {}
        for multiple_type, values in multiples.items():
            if values:
                multiple_stats[multiple_type] = {
                    "mean": np.mean(values),
                    "median": np.median(values),
                    "min": np.min(values),
                    "max": np.max(values),
                    "std": np.std(values),
                    "count": len(values)
                }
        
        return multiple_stats
    
    def _apply_multiples_to_target(self, company_data: CompanyFinancials,
                                 comp_multiples: Dict[str, Any],
                                 adjustments: Optional[Dict[str, float]]) -> Dict[str, Any]:
        """Apply comparable multiples to target company"""
        
        valuations = {}
        
        # Apply each multiple
        for multiple_type, stats in comp_multiples.items():
            median_multiple = stats["median"]
            
            if multiple_type == "ev_revenue" and company_data.revenue:
                ev = company_data.revenue[-1] * median_multiple
                equity_value = ev - company_data.total_debt + company_data.cash_and_equivalents
                valuations[multiple_type] = equity_value / company_data.shares_outstanding
            
            elif multiple_type == "ev_ebitda" and company_data.ebitda:
                ev = company_data.ebitda[-1] * median_multiple
                equity_value = ev - company_data.total_debt + company_data.cash_and_equivalents
                valuations[multiple_type] = equity_value / company_data.shares_outstanding
            
            elif multiple_type == "pe_ratio" and company_data.net_income:
                eps = company_data.net_income[-1] / company_data.shares_outstanding
                valuations[multiple_type] = eps * median_multiple
            
            elif multiple_type == "pb_ratio":
                book_value_per_share = company_data.shareholders_equity / company_data.shares_outstanding
                valuations[multiple_type] = book_value_per_share * median_multiple
        
        # Apply adjustments if provided
        if adjustments:
            adjusted_valuations = {}
            for multiple_type, valuation in valuations.items():
                adjustment_factor = adjustments.get(multiple_type, 1.0)
                adjusted_valuations[multiple_type] = valuation * adjustment_factor
            valuations.update(adjusted_valuations)
        
        return valuations
    
    def _analyze_multiple_statistics(self, comp_multiples: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze statistical properties of comparable multiples"""
        
        analysis = {}
        
        for multiple_type, stats in comp_multiples.items():
            analysis[multiple_type] = {
                "central_tendency": {
                    "mean": stats["mean"],
                    "median": stats["median"]
                },
                "dispersion": {
                    "standard_deviation": stats["std"],
                    "coefficient_of_variation": stats["std"] / stats["mean"] if stats["mean"] > 0 else 0,
                    "range": stats["max"] - stats["min"]
                },
                "outlier_analysis": {
                    "q1": np.percentile([stats["min"], stats["max"]], 25),
                    "q3": np.percentile([stats["min"], stats["max"]], 75),
                    "iqr": np.percentile([stats["min"], stats["max"]], 75) - np.percentile([stats["min"], stats["max"]], 25)
                }
            }
        
        return analysis
    
    def _calculate_premium_discount(self, valuation_by_multiple: Dict[str, Any],
                                  comparable_companies: List[ComparableCompany]) -> Dict[str, Any]:
        """Calculate trading premium/discount to comparables"""
        
        # This would require current market price of target company
        # For now, return structure for premium/discount analysis
        
        return {
            "size_premium": {
                "description": "Premium/discount due to company size",
                "adjustment": 0.0  # Would calculate based on size comparison
            },
            "liquidity_discount": {
                "description": "Discount for lower liquidity",
                "adjustment": -0.05  # Example 5% discount
            },
            "control_premium": {
                "description": "Premium for control transaction",
                "adjustment": 0.25  # Example 25% control premium
            }
        }
    
    def _apply_adjustments(self, valuations: Dict[str, Any],
                         adjustments: Optional[Dict[str, float]]) -> Dict[str, Any]:
        """Apply size, liquidity, and other adjustments"""
        
        if not adjustments:
            return valuations
        
        adjusted_valuations = {}
        for multiple_type, valuation in valuations.items():
            total_adjustment = 1.0
            
            # Apply each adjustment
            for adj_type, adj_factor in adjustments.items():
                total_adjustment *= (1 + adj_factor)
            
            adjusted_valuations[f"{multiple_type}_adjusted"] = valuation * total_adjustment
        
        return adjusted_valuations
    
    def _create_football_field_chart(self, valuation_by_multiple: Dict[str, Any]) -> Dict[str, Any]:
        """Create football field chart data for valuation ranges"""
        
        if not valuation_by_multiple:
            return {}
        
        valuations = list(valuation_by_multiple.values())
        
        return {
            "min_valuation": min(valuations),
            "max_valuation": max(valuations),
            "mean_valuation": np.mean(valuations),
            "median_valuation": np.median(valuations),
            "valuation_range": max(valuations) - min(valuations),
            "individual_valuations": valuation_by_multiple
        }
    
    def _sample_uncertain_parameters(self, base_inputs: ValuationInputs,
                                   uncertainty_params: Dict[str, Tuple[float, float]]) -> ValuationInputs:
        """Sample uncertain parameters for Monte Carlo simulation"""
        
        sampled_inputs = base_inputs
        
        for param_name, (mean, std) in uncertainty_params.items():
            if param_name == "discount_rate":
                sampled_inputs.discount_rate = max(0.01, np.random.normal(mean, std))
            elif param_name == "terminal_growth_rate":
                sampled_inputs.terminal_growth_rate = max(0, min(0.1, np.random.normal(mean, std)))
            # Add other parameters as needed
        
        return sampled_inputs
    
    def _analyze_monte_carlo_results(self, simulation_results: List[float],
                                   base_inputs: ValuationInputs) -> Dict[str, Any]:
        """Analyze Monte Carlo simulation results"""
        
        return {
            "statistics": {
                "mean": np.mean(simulation_results),
                "median": np.median(simulation_results),
                "std": np.std(simulation_results),
                "min": np.min(simulation_results),
                "max": np.max(simulation_results)
            },
            "percentiles": {
                "p5": np.percentile(simulation_results, 5),
                "p10": np.percentile(simulation_results, 10),
                "p25": np.percentile(simulation_results, 25),
                "p75": np.percentile(simulation_results, 75),
                "p90": np.percentile(simulation_results, 90),
                "p95": np.percentile(simulation_results, 95)
            },
            "risk_metrics": {
                "probability_of_loss": len([x for x in simulation_results if x < 0]) / len(simulation_results),
                "value_at_risk_5%": np.percentile(simulation_results, 5),
                "expected_shortfall_5%": np.mean([x for x in simulation_results if x <= np.percentile(simulation_results, 5)])
            },
            "simulation_count": len(simulation_results)
        }


# Example usage
if __name__ == "__main__":
    # Sample company data
    sample_company = CompanyFinancials(
        revenue=[1800000, 2000000, 2200000],
        gross_profit=[720000, 800000, 880000],
        operating_income=[270000, 300000, 330000],
        ebitda=[320000, 350000, 380000],
        ebit=[270000, 300000, 330000],
        net_income=[180000, 200000, 220000],
        total_assets=1000000,
        total_debt=300000,
        cash_and_equivalents=100000,
        shareholders_equity=400000,
        working_capital=200000,
        free_cash_flow=[150000, 180000, 200000],
        operating_cash_flow=[200000, 230000, 250000],
        capital_expenditures=[50000, 50000, 50000],
        shares_outstanding=100000
    )
    
    # Valuation inputs
    inputs = ValuationInputs(
        discount_rate=0.10,
        terminal_growth_rate=0.03,
        forecast_periods=5,
        tax_rate=0.25
    )
    
    # Perform valuation
    valuation_engine = ValuationEngine()
    
    # DCF Valuation
    dcf_results = valuation_engine.dcf_analysis(sample_company, inputs)
    print("DCF Valuation Results:")
    print(f"Enterprise Value: ${dcf_results['dcf_valuation'].enterprise_value:,.0f}")
    print(f"Equity Value: ${dcf_results['dcf_valuation'].equity_value:,.0f}")
    print(f"Value per Share: ${dcf_results['dcf_valuation'].value_per_share:.2f}")
    
    # Multiple methods
    methods = [ValuationMethod.DCF, ValuationMethod.COMPARABLE_COMPANY, ValuationMethod.ASSET_BASED]
    all_valuations = valuation_engine.value_company(sample_company, inputs, methods)
    
    print("\nValuation Summary by Method:")
    for method, result in all_valuations.items():
        print(f"{method}: ${result.value_per_share:.2f} per share")
