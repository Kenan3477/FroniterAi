"""
Financial Operations Module - Funding and Cash Flow Management
Advanced funding strategy recommendations and cash flow automation
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Tuple
import uuid
import numpy as np
import pandas as pd
from collections import defaultdict
import aiohttp

from .financial_engine import (
    EntityType, IndustryType, FundingStage, 
    FundingRecommendation, CashFlowForecast
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FundingType(Enum):
    """Types of business funding"""
    EQUITY = "equity"
    DEBT = "debt"
    REVENUE_BASED = "revenue_based"
    GRANT = "grant"
    CROWDFUNDING = "crowdfunding"
    CONVERTIBLE_NOTE = "convertible_note"
    SAFE = "safe"
    ANGEL_INVESTMENT = "angel_investment"
    VENTURE_CAPITAL = "venture_capital"
    PRIVATE_EQUITY = "private_equity"
    BANK_LOAN = "bank_loan"
    SBA_LOAN = "sba_loan"
    EQUIPMENT_FINANCING = "equipment_financing"
    INVOICE_FACTORING = "invoice_factoring"

class InvestorType(Enum):
    """Types of investors"""
    ANGEL_INVESTOR = "angel_investor"
    VENTURE_CAPITAL = "venture_capital"
    FAMILY_OFFICE = "family_office"
    STRATEGIC_INVESTOR = "strategic_investor"
    PRIVATE_EQUITY = "private_equity"
    CROWDFUNDING_PLATFORM = "crowdfunding_platform"
    GOVERNMENT_AGENCY = "government_agency"
    BANK = "bank"
    CREDIT_UNION = "credit_union"
    ALTERNATIVE_LENDER = "alternative_lender"

class CashFlowCategory(Enum):
    """Cash flow categorization"""
    OPERATING = "operating"
    INVESTING = "investing"
    FINANCING = "financing"

@dataclass
class FundingSource:
    """Individual funding source details"""
    source_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    funding_type: FundingType = FundingType.EQUITY
    investor_type: InvestorType = InvestorType.ANGEL_INVESTOR
    
    # Investment details
    typical_investment_range: Tuple[Decimal, Decimal] = field(default_factory=lambda: (Decimal('0'), Decimal('0')))
    preferred_stages: List[FundingStage] = field(default_factory=list)
    preferred_industries: List[IndustryType] = field(default_factory=list)
    geographic_focus: List[str] = field(default_factory=list)
    
    # Investment criteria
    minimum_revenue: Optional[Decimal] = None
    minimum_growth_rate: Optional[Decimal] = None
    investment_timeline: str = ""  # e.g., "2-6 months"
    
    # Terms and requirements
    typical_equity_range: Tuple[Decimal, Decimal] = field(default_factory=lambda: (Decimal('0'), Decimal('0')))
    board_seat_requirement: bool = False
    due_diligence_requirements: List[str] = field(default_factory=list)
    
    # Contact and application info
    contact_info: Dict[str, str] = field(default_factory=dict)
    application_process: str = ""
    success_rate: Optional[Decimal] = None
    
    # Track record
    portfolio_companies: List[str] = field(default_factory=list)
    average_check_size: Optional[Decimal] = None
    
    created_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class ValuationMetrics:
    """Business valuation calculations"""
    valuation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Financial metrics
    annual_revenue: Decimal = field(default_factory=lambda: Decimal('0'))
    monthly_recurring_revenue: Optional[Decimal] = None
    gross_profit: Decimal = field(default_factory=lambda: Decimal('0'))
    ebitda: Decimal = field(default_factory=lambda: Decimal('0'))
    
    # Growth metrics
    revenue_growth_rate: Decimal = field(default_factory=lambda: Decimal('0'))
    customer_growth_rate: Decimal = field(default_factory=lambda: Decimal('0'))
    market_size: Optional[Decimal] = None
    market_share: Optional[Decimal] = None
    
    # Valuation multiples
    revenue_multiple: Decimal = field(default_factory=lambda: Decimal('0'))
    ebitda_multiple: Decimal = field(default_factory=lambda: Decimal('0'))
    industry_revenue_multiple_range: Tuple[Decimal, Decimal] = field(default_factory=lambda: (Decimal('0'), Decimal('0')))
    
    # Calculated valuations
    revenue_based_valuation: Decimal = field(default_factory=lambda: Decimal('0'))
    dcf_valuation: Decimal = field(default_factory=lambda: Decimal('0'))
    comparable_company_valuation: Decimal = field(default_factory=lambda: Decimal('0'))
    
    # Final valuation range
    estimated_valuation_low: Decimal = field(default_factory=lambda: Decimal('0'))
    estimated_valuation_high: Decimal = field(default_factory=lambda: Decimal('0'))
    
    created_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class CashFlowItem:
    """Individual cash flow item"""
    item_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    date: date = field(default_factory=date.today)
    description: str = ""
    amount: Decimal = field(default_factory=lambda: Decimal('0'))
    category: CashFlowCategory = CashFlowCategory.OPERATING
    subcategory: str = ""
    
    # Prediction confidence
    is_actual: bool = False
    confidence_level: Decimal = field(default_factory=lambda: Decimal('0.8'))
    
    # Recurrence
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly, quarterly, annually
    
    # Customer/vendor info
    customer_vendor: Optional[str] = None
    invoice_number: Optional[str] = None
    payment_terms: Optional[str] = None
    
    # Status tracking
    status: str = "projected"  # projected, confirmed, received, overdue
    
    created_date: datetime = field(default_factory=datetime.utcnow)

class FundingStrategyEngine:
    """Advanced funding strategy and recommendations"""
    
    def __init__(self):
        self.funding_sources = self._load_funding_sources()
        self.industry_benchmarks = self._load_industry_funding_benchmarks()
        self.valuation_models = self._load_valuation_models()
    
    def _load_funding_sources(self) -> List[FundingSource]:
        """Load comprehensive funding source database"""
        
        sources = []
        
        # Angel Investors
        angel_source = FundingSource(
            name="Angel Investor Network",
            funding_type=FundingType.ANGEL_INVESTMENT,
            investor_type=InvestorType.ANGEL_INVESTOR,
            typical_investment_range=(Decimal('25000'), Decimal('250000')),
            preferred_stages=[FundingStage.PRE_SEED, FundingStage.SEED],
            preferred_industries=list(IndustryType),
            typical_equity_range=(Decimal('5'), Decimal('25')),
            investment_timeline="1-3 months",
            due_diligence_requirements=[
                "Business plan review",
                "Financial statements",
                "Reference checks",
                "Management team assessment"
            ],
            success_rate=Decimal('0.05')
        )
        sources.append(angel_source)
        
        # Venture Capital
        vc_source = FundingSource(
            name="Early Stage VC",
            funding_type=FundingType.VENTURE_CAPITAL,
            investor_type=InvestorType.VENTURE_CAPITAL,
            typical_investment_range=(Decimal('1000000'), Decimal('10000000')),
            preferred_stages=[FundingStage.SERIES_A, FundingStage.SERIES_B],
            preferred_industries=[IndustryType.TECHNOLOGY, IndustryType.HEALTHCARE],
            typical_equity_range=(Decimal('15'), Decimal('40')),
            investment_timeline="3-6 months",
            board_seat_requirement=True,
            minimum_revenue=Decimal('500000'),
            minimum_growth_rate=Decimal('0.50'),
            due_diligence_requirements=[
                "Comprehensive business plan",
                "Audited financial statements", 
                "Market analysis",
                "Technology assessment",
                "Legal review",
                "Management team evaluation"
            ],
            success_rate=Decimal('0.01')
        )
        sources.append(vc_source)
        
        # SBA Loans
        sba_source = FundingSource(
            name="SBA 7(a) Loan Program",
            funding_type=FundingType.SBA_LOAN,
            investor_type=InvestorType.GOVERNMENT_AGENCY,
            typical_investment_range=(Decimal('50000'), Decimal('5000000')),
            preferred_stages=[FundingStage.SEED, FundingStage.GROWTH],
            preferred_industries=list(IndustryType),
            investment_timeline="2-4 months",
            due_diligence_requirements=[
                "Personal credit score 680+",
                "Business plan",
                "Financial projections",
                "Collateral documentation",
                "Personal guarantee"
            ],
            success_rate=Decimal('0.30')
        )
        sources.append(sba_source)
        
        # Revenue-Based Financing
        rbf_source = FundingSource(
            name="Revenue-Based Financing",
            funding_type=FundingType.REVENUE_BASED,
            investor_type=InvestorType.ALTERNATIVE_LENDER,
            typical_investment_range=(Decimal('100000'), Decimal('2000000')),
            preferred_stages=[FundingStage.SEED, FundingStage.SERIES_A],
            preferred_industries=[IndustryType.TECHNOLOGY, IndustryType.SERVICES],
            minimum_revenue=Decimal('100000'),
            investment_timeline="2-6 weeks",
            due_diligence_requirements=[
                "12 months revenue history",
                "Bank statements",
                "Financial statements",
                "Customer concentration analysis"
            ],
            success_rate=Decimal('0.20')
        )
        sources.append(rbf_source)
        
        # Equipment Financing
        equipment_source = FundingSource(
            name="Equipment Financing",
            funding_type=FundingType.EQUIPMENT_FINANCING,
            investor_type=InvestorType.BANK,
            typical_investment_range=(Decimal('25000'), Decimal('1000000')),
            preferred_stages=list(FundingStage),
            preferred_industries=[IndustryType.MANUFACTURING, IndustryType.HEALTHCARE],
            investment_timeline="2-4 weeks",
            due_diligence_requirements=[
                "Equipment quotes",
                "Financial statements",
                "Credit history",
                "Equipment specifications"
            ],
            success_rate=Decimal('0.60')
        )
        sources.append(equipment_source)
        
        # Grants
        grant_source = FundingSource(
            name="SBIR/STTR Grants",
            funding_type=FundingType.GRANT,
            investor_type=InvestorType.GOVERNMENT_AGENCY,
            typical_investment_range=(Decimal('50000'), Decimal('1500000')),
            preferred_stages=[FundingStage.PRE_SEED, FundingStage.SEED],
            preferred_industries=[IndustryType.TECHNOLOGY, IndustryType.HEALTHCARE, IndustryType.ENERGY],
            investment_timeline="6-12 months",
            due_diligence_requirements=[
                "Research proposal",
                "Technical feasibility study",
                "Commercialization plan",
                "Principal investigator qualifications"
            ],
            success_rate=Decimal('0.15')
        )
        sources.append(grant_source)
        
        return sources
    
    def _load_industry_funding_benchmarks(self) -> Dict[IndustryType, Dict[str, Any]]:
        """Load industry-specific funding benchmarks"""
        
        return {
            IndustryType.TECHNOLOGY: {
                "typical_pre_money_valuation": {
                    FundingStage.PRE_SEED: (Decimal('500000'), Decimal('2000000')),
                    FundingStage.SEED: (Decimal('2000000'), Decimal('8000000')),
                    FundingStage.SERIES_A: (Decimal('8000000'), Decimal('25000000')),
                    FundingStage.SERIES_B: (Decimal('25000000'), Decimal('75000000'))
                },
                "funding_round_sizes": {
                    FundingStage.PRE_SEED: (Decimal('100000'), Decimal('500000')),
                    FundingStage.SEED: (Decimal('500000'), Decimal('2000000')),
                    FundingStage.SERIES_A: (Decimal('2000000'), Decimal('8000000')),
                    FundingStage.SERIES_B: (Decimal('8000000'), Decimal('20000000'))
                },
                "revenue_multiples": (Decimal('8'), Decimal('15')),
                "growth_rate_expectations": Decimal('1.0'),  # 100% YoY
                "time_between_rounds": 18  # months
            },
            
            IndustryType.RETAIL: {
                "typical_pre_money_valuation": {
                    FundingStage.PRE_SEED: (Decimal('250000'), Decimal('1000000')),
                    FundingStage.SEED: (Decimal('1000000'), Decimal('4000000')),
                    FundingStage.SERIES_A: (Decimal('4000000'), Decimal('12000000'))
                },
                "funding_round_sizes": {
                    FundingStage.PRE_SEED: (Decimal('50000'), Decimal('250000')),
                    FundingStage.SEED: (Decimal('250000'), Decimal('1000000')),
                    FundingStage.SERIES_A: (Decimal('1000000'), Decimal('4000000'))
                },
                "revenue_multiples": (Decimal('2'), Decimal('5')),
                "growth_rate_expectations": Decimal('0.3'),  # 30% YoY
                "time_between_rounds": 24  # months
            },
            
            IndustryType.HEALTHCARE: {
                "typical_pre_money_valuation": {
                    FundingStage.PRE_SEED: (Decimal('1000000'), Decimal('3000000')),
                    FundingStage.SEED: (Decimal('3000000'), Decimal('10000000')),
                    FundingStage.SERIES_A: (Decimal('10000000'), Decimal('30000000'))
                },
                "funding_round_sizes": {
                    FundingStage.PRE_SEED: (Decimal('250000'), Decimal('750000')),
                    FundingStage.SEED: (Decimal('750000'), Decimal('3000000')),
                    FundingStage.SERIES_A: (Decimal('3000000'), Decimal('10000000'))
                },
                "revenue_multiples": (Decimal('6'), Decimal('12')),
                "growth_rate_expectations": Decimal('0.5'),  # 50% YoY
                "time_between_rounds": 30  # months
            }
        }
    
    def _load_valuation_models(self) -> Dict[str, Dict[str, Any]]:
        """Load valuation methodologies"""
        
        return {
            "revenue_multiple": {
                "description": "Valuation based on revenue multiples",
                "applicability": ["growing companies with revenue"],
                "formula": "annual_revenue * industry_multiple"
            },
            "dcf": {
                "description": "Discounted Cash Flow model",
                "applicability": ["mature companies with predictable cash flows"],
                "formula": "sum(future_cash_flows / (1 + discount_rate)^period)"
            },
            "berkus_method": {
                "description": "Pre-revenue startup valuation method",
                "applicability": ["pre-revenue startups"],
                "components": {
                    "sound_idea": Decimal('500000'),
                    "prototype": Decimal('500000'),
                    "quality_management": Decimal('500000'),
                    "strategic_relationships": Decimal('500000'),
                    "product_rollout": Decimal('500000')
                }
            },
            "risk_factor_summation": {
                "description": "Adjusts base valuation for risk factors",
                "applicability": ["early-stage companies"],
                "base_valuation": Decimal('2000000'),
                "risk_factors": {
                    "management": (-500000, 500000),
                    "stage_of_business": (-500000, 500000),
                    "legislation": (-200000, 200000),
                    "competition": (-300000, 300000),
                    "technology_risk": (-400000, 400000),
                    "litigation_risk": (-200000, 200000),
                    "international_risk": (-300000, 300000),
                    "reputation_risk": (-200000, 200000),
                    "funding_risk": (-400000, 400000),
                    "exit_risk": (-300000, 300000),
                    "market_risk": (-400000, 400000)
                }
            }
        }
    
    def analyze_funding_needs(self, annual_revenue: Decimal,
                            growth_rate: Decimal,
                            current_cash: Decimal,
                            monthly_burn_rate: Decimal,
                            funding_stage: FundingStage,
                            industry: IndustryType) -> FundingRecommendation:
        """Analyze funding needs and provide recommendations"""
        
        # Calculate runway
        current_runway_months = int(current_cash / monthly_burn_rate) if monthly_burn_rate > 0 else 12
        
        # Determine funding amount needed
        target_runway_months = 18  # Target 18-month runway
        operating_buffer = monthly_burn_rate * 6  # 6-month buffer
        growth_investments = annual_revenue * Decimal('0.3')  # 30% of revenue for growth
        
        recommended_amount = (monthly_burn_rate * target_runway_months) + operating_buffer + growth_investments
        
        # Get industry benchmarks
        benchmarks = self.industry_benchmarks.get(industry, {})
        typical_round_sizes = benchmarks.get("funding_round_sizes", {})
        round_range = typical_round_sizes.get(funding_stage, (recommended_amount, recommended_amount))
        
        # Adjust recommendation to industry norms
        recommended_amount = max(min(recommended_amount, round_range[1]), round_range[0])
        
        # Determine best funding types
        suitable_sources = self._find_suitable_funding_sources(
            recommended_amount, funding_stage, industry, annual_revenue
        )
        
        # Calculate valuation range
        valuation_range = self._estimate_valuation_range(
            annual_revenue, growth_rate, industry, funding_stage
        )
        
        # Calculate equity dilution
        equity_dilution_low = (recommended_amount / valuation_range[1]) * 100
        equity_dilution_high = (recommended_amount / valuation_range[0]) * 100
        
        recommendation = FundingRecommendation(
            funding_stage=funding_stage,
            recommended_amount=recommended_amount,
            funding_type=suitable_sources[0].funding_type.value if suitable_sources else "equity",
            rationale=f"Based on {target_runway_months}-month runway target and growth investments",
            use_of_funds=[
                f"Operating expenses: {monthly_burn_rate * target_runway_months:,.0f}",
                f"Growth investments: {growth_investments:,.0f}",
                f"Operating buffer: {operating_buffer:,.0f}"
            ],
            expected_runway_months=target_runway_months,
            recommended_sources=[source.name for source in suitable_sources[:3]],
            investor_types=[source.investor_type.value for source in suitable_sources[:3]],
            suggested_valuation_range=valuation_range,
            equity_dilution_range=(equity_dilution_low, equity_dilution_high),
            preparation_requirements=self._get_preparation_requirements(suitable_sources),
            timeline_to_funding=self._estimate_funding_timeline(suitable_sources),
            alternative_options=self._get_alternative_funding_options(recommended_amount, industry)
        )
        
        return recommendation
    
    def _find_suitable_funding_sources(self, amount: Decimal, stage: FundingStage,
                                     industry: IndustryType, revenue: Decimal) -> List[FundingSource]:
        """Find funding sources suitable for the business"""
        
        suitable_sources = []
        
        for source in self.funding_sources:
            # Check stage compatibility
            if stage not in source.preferred_stages:
                continue
            
            # Check industry compatibility
            if source.preferred_industries and industry not in source.preferred_industries:
                continue
            
            # Check amount range
            if (amount < source.typical_investment_range[0] or 
                amount > source.typical_investment_range[1]):
                continue
            
            # Check revenue requirements
            if source.minimum_revenue and revenue < source.minimum_revenue:
                continue
            
            suitable_sources.append(source)
        
        # Sort by success rate and suitability
        suitable_sources.sort(key=lambda s: s.success_rate or Decimal('0'), reverse=True)
        
        return suitable_sources
    
    def _estimate_valuation_range(self, revenue: Decimal, growth_rate: Decimal,
                                industry: IndustryType, stage: FundingStage) -> Tuple[Decimal, Decimal]:
        """Estimate company valuation range"""
        
        benchmarks = self.industry_benchmarks.get(industry, {})
        
        if stage in benchmarks.get("typical_pre_money_valuation", {}):
            # Use industry benchmark valuations
            return benchmarks["typical_pre_money_valuation"][stage]
        
        # Calculate revenue-based valuation
        revenue_multiples = benchmarks.get("revenue_multiples", (Decimal('5'), Decimal('10')))
        
        if revenue > 0:
            # Revenue-based valuation
            valuation_low = revenue * revenue_multiples[0]
            valuation_high = revenue * revenue_multiples[1]
            
            # Adjust for growth rate
            growth_premium = min(growth_rate * Decimal('0.5'), Decimal('1.0'))  # Cap at 100% premium
            valuation_high = valuation_high * (1 + growth_premium)
        else:
            # Pre-revenue valuation using Berkus method approximation
            base_valuation = Decimal('2000000')
            valuation_low = base_valuation * Decimal('0.5')
            valuation_high = base_valuation * Decimal('1.5')
        
        return (valuation_low, valuation_high)
    
    def _get_preparation_requirements(self, sources: List[FundingSource]) -> List[str]:
        """Get preparation requirements for funding sources"""
        
        all_requirements = set()
        
        for source in sources[:3]:  # Top 3 sources
            all_requirements.update(source.due_diligence_requirements)
        
        return sorted(list(all_requirements))
    
    def _estimate_funding_timeline(self, sources: List[FundingSource]) -> str:
        """Estimate timeline to funding"""
        
        if not sources:
            return "Unknown"
        
        # Use the fastest source's timeline
        timelines = [source.investment_timeline for source in sources if source.investment_timeline]
        
        if timelines:
            return min(timelines, key=lambda x: self._parse_timeline_months(x))
        
        return "3-6 months"
    
    def _parse_timeline_months(self, timeline: str) -> int:
        """Parse timeline string to months for comparison"""
        
        if "week" in timeline.lower():
            # Extract weeks and convert to months
            weeks = int(''.join(filter(str.isdigit, timeline.split('-')[0])))
            return max(1, weeks // 4)
        elif "month" in timeline.lower():
            # Extract months
            months = int(''.join(filter(str.isdigit, timeline.split('-')[0])))
            return months
        
        return 6  # Default to 6 months
    
    def _get_alternative_funding_options(self, amount: Decimal, industry: IndustryType) -> List[str]:
        """Get alternative funding options"""
        
        alternatives = []
        
        if amount <= Decimal('100000'):
            alternatives.extend([
                "Personal savings and bootstrapping",
                "Friends and family funding",
                "Small business credit cards",
                "Crowdfunding platforms"
            ])
        
        if industry == IndustryType.TECHNOLOGY:
            alternatives.extend([
                "Accelerator programs",
                "Government tech grants",
                "Revenue-based financing"
            ])
        
        alternatives.extend([
            "Bank lines of credit",
            "Invoice factoring",
            "Equipment financing",
            "Strategic partnerships"
        ])
        
        return alternatives
    
    def calculate_valuation(self, revenue: Decimal, growth_rate: Decimal,
                          industry: IndustryType, stage: FundingStage,
                          method: str = "revenue_multiple") -> ValuationMetrics:
        """Calculate detailed business valuation"""
        
        valuation = ValuationMetrics(
            annual_revenue=revenue,
            revenue_growth_rate=growth_rate
        )
        
        benchmarks = self.industry_benchmarks.get(industry, {})
        
        if method == "revenue_multiple" and revenue > 0:
            # Revenue multiple valuation
            revenue_multiples = benchmarks.get("revenue_multiples", (Decimal('5'), Decimal('10')))
            valuation.revenue_multiple = (revenue_multiples[0] + revenue_multiples[1]) / 2
            valuation.revenue_based_valuation = revenue * valuation.revenue_multiple
            valuation.industry_revenue_multiple_range = revenue_multiples
        
        elif method == "berkus_method":
            # Berkus method for pre-revenue companies
            berkus_components = self._load_valuation_models()["berkus_method"]["components"]
            valuation.revenue_based_valuation = sum(berkus_components.values())
        
        elif method == "risk_factor_summation":
            # Risk factor summation method
            risk_model = self._load_valuation_models()["risk_factor_summation"]
            base_val = risk_model["base_valuation"]
            
            # Apply average risk adjustments (neutral scenario)
            total_adjustment = Decimal('0')
            valuation.revenue_based_valuation = base_val + total_adjustment
        
        # Set valuation range
        if valuation.revenue_based_valuation > 0:
            valuation.estimated_valuation_low = valuation.revenue_based_valuation * Decimal('0.8')
            valuation.estimated_valuation_high = valuation.revenue_based_valuation * Decimal('1.2')
        else:
            # Default range for early-stage companies
            valuation.estimated_valuation_low = Decimal('500000')
            valuation.estimated_valuation_high = Decimal('2000000')
        
        return valuation

class CashFlowManager:
    """Advanced cash flow forecasting and management"""
    
    def __init__(self):
        self.payment_patterns = self._load_payment_patterns()
        self.industry_benchmarks = self._load_cash_flow_benchmarks()
    
    def _load_payment_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Load typical payment patterns by customer type"""
        
        return {
            "b2b_enterprise": {
                "average_payment_days": 45,
                "payment_distribution": {
                    30: 0.2,  # 20% pay in 30 days
                    45: 0.5,  # 50% pay in 45 days
                    60: 0.25, # 25% pay in 60 days
                    90: 0.05  # 5% pay in 90 days
                }
            },
            
            "b2b_smb": {
                "average_payment_days": 30,
                "payment_distribution": {
                    15: 0.1,
                    30: 0.6,
                    45: 0.25,
                    60: 0.05
                }
            },
            
            "b2c_consumers": {
                "average_payment_days": 0,  # Immediate payment
                "payment_distribution": {
                    0: 0.95,
                    30: 0.05  # 5% chargebacks/returns
                }
            },
            
            "subscription_saas": {
                "average_payment_days": 0,
                "payment_distribution": {
                    0: 0.98,
                    30: 0.02  # Failed payments
                },
                "churn_rate": 0.05  # Monthly churn
            }
        }
    
    def _load_cash_flow_benchmarks(self) -> Dict[IndustryType, Dict[str, Any]]:
        """Load industry cash flow benchmarks"""
        
        return {
            IndustryType.TECHNOLOGY: {
                "days_sales_outstanding": 35,
                "days_payable_outstanding": 30,
                "cash_conversion_cycle": 35,
                "seasonal_factors": {month: 1.0 for month in range(12)},  # Minimal seasonality
                "working_capital_ratio": 0.15
            },
            
            IndustryType.RETAIL: {
                "days_sales_outstanding": 5,
                "days_payable_outstanding": 45,
                "cash_conversion_cycle": 75,  # Including inventory
                "seasonal_factors": {
                    0: 0.8, 1: 0.7, 2: 0.9, 3: 1.0, 4: 1.1, 5: 1.0,
                    6: 1.0, 7: 1.1, 8: 1.0, 9: 1.2, 10: 1.4, 11: 1.6
                },
                "working_capital_ratio": 0.25
            },
            
            IndustryType.SERVICES: {
                "days_sales_outstanding": 30,
                "days_payable_outstanding": 25,
                "cash_conversion_cycle": 30,
                "seasonal_factors": {
                    0: 0.9, 1: 0.9, 2: 1.0, 3: 1.1, 4: 1.1, 5: 0.8,
                    6: 0.8, 7: 0.8, 8: 1.0, 9: 1.1, 10: 1.1, 11: 1.0
                },
                "working_capital_ratio": 0.10
            }
        }
    
    def create_cash_flow_forecast(self, start_date: date, end_date: date,
                                opening_balance: Decimal,
                                projected_sales: Dict[date, Decimal],
                                recurring_expenses: Dict[str, Decimal],
                                customer_type: str = "b2b_smb",
                                industry: IndustryType = IndustryType.SERVICES) -> CashFlowForecast:
        """Create detailed cash flow forecast"""
        
        forecast = CashFlowForecast(
            period_start=start_date,
            period_end=end_date,
            opening_cash_balance=opening_balance
        )
        
        # Get payment patterns and benchmarks
        payment_pattern = self.payment_patterns.get(customer_type, self.payment_patterns["b2b_smb"])
        benchmarks = self.industry_benchmarks.get(industry, {})
        
        current_date = start_date
        daily_balances = {}
        
        # Initialize with opening balance
        current_balance = opening_balance
        
        while current_date <= end_date:
            daily_inflows = Decimal('0')
            daily_outflows = Decimal('0')
            
            # Calculate inflows (collections from previous sales)
            daily_inflows += self._calculate_daily_collections(
                current_date, projected_sales, payment_pattern
            )
            
            # Calculate outflows (recurring expenses and payables)
            daily_outflows += self._calculate_daily_expenses(
                current_date, recurring_expenses
            )
            
            # Update cash balance
            net_daily_flow = daily_inflows - daily_outflows
            current_balance += net_daily_flow
            
            daily_balances[current_date] = current_balance
            
            # Check for cash shortage
            minimum_threshold = forecast.minimum_cash_threshold
            if current_balance < minimum_threshold:
                forecast.cash_shortage_dates.append(current_date)
            
            current_date += timedelta(days=1)
        
        forecast.daily_balances = daily_balances
        
        # Generate recommendations for cash shortages
        if forecast.cash_shortage_dates:
            forecast.recommended_actions = self._generate_cash_flow_recommendations(
                forecast, projected_sales, recurring_expenses
            )
        
        return forecast
    
    def _calculate_daily_collections(self, current_date: date,
                                   projected_sales: Dict[date, Decimal],
                                   payment_pattern: Dict[str, Any]) -> Decimal:
        """Calculate daily cash collections based on payment patterns"""
        
        collections = Decimal('0')
        payment_distribution = payment_pattern["payment_distribution"]
        
        for sale_date, sale_amount in projected_sales.items():
            for payment_days, probability in payment_distribution.items():
                collection_date = sale_date + timedelta(days=payment_days)
                
                if collection_date == current_date:
                    collections += sale_amount * Decimal(str(probability))
        
        return collections
    
    def _calculate_daily_expenses(self, current_date: date,
                                recurring_expenses: Dict[str, Decimal]) -> Decimal:
        """Calculate daily expense outflows"""
        
        daily_expenses = Decimal('0')
        
        # Monthly expenses (pay on 1st of month)
        if current_date.day == 1:
            for expense_name, monthly_amount in recurring_expenses.items():
                if "monthly" in expense_name.lower():
                    daily_expenses += monthly_amount
        
        # Weekly expenses (pay on Mondays)
        if current_date.weekday() == 0:  # Monday
            for expense_name, weekly_amount in recurring_expenses.items():
                if "weekly" in expense_name.lower():
                    daily_expenses += weekly_amount
        
        # Daily expenses
        for expense_name, daily_amount in recurring_expenses.items():
            if "daily" in expense_name.lower():
                daily_expenses += daily_amount
        
        return daily_expenses
    
    def _generate_cash_flow_recommendations(self, forecast: CashFlowForecast,
                                          projected_sales: Dict[date, Decimal],
                                          recurring_expenses: Dict[str, Decimal]) -> List[str]:
        """Generate recommendations to address cash flow issues"""
        
        recommendations = []
        
        # Analyze the cash shortage
        shortage_days = len(forecast.cash_shortage_dates)
        if shortage_days > 0:
            
            # Short-term solutions
            if shortage_days <= 30:
                recommendations.extend([
                    "Accelerate receivables collection with early payment discounts",
                    "Negotiate extended payment terms with suppliers",
                    "Consider invoice factoring for immediate cash",
                    "Use business line of credit for short-term funding"
                ])
            
            # Medium-term solutions
            elif shortage_days <= 90:
                recommendations.extend([
                    "Secure short-term business loan or line of credit",
                    "Implement more aggressive collection procedures",
                    "Consider reducing non-essential expenses temporarily",
                    "Explore revenue-based financing options"
                ])
            
            # Long-term solutions
            else:
                recommendations.extend([
                    "Seek additional equity or debt funding",
                    "Restructure business model to improve cash flow timing",
                    "Consider strategic partnerships for cash injection",
                    "Implement subscription or recurring revenue model"
                ])
            
            # Specific recommendations based on expense analysis
            total_expenses = sum(recurring_expenses.values())
            if total_expenses > 0:
                largest_expense = max(recurring_expenses.items(), key=lambda x: x[1])
                recommendations.append(
                    f"Review and optimize largest expense category: {largest_expense[0]} (${largest_expense[1]:,.2f})"
                )
        
        return recommendations
    
    def optimize_cash_flow(self, forecast: CashFlowForecast) -> Dict[str, Any]:
        """Provide cash flow optimization strategies"""
        
        optimization_report = {
            "current_runway_days": 0,
            "optimization_strategies": [],
            "potential_savings": Decimal('0'),
            "working_capital_recommendations": [],
            "payment_terms_optimization": []
        }
        
        # Calculate current runway
        daily_balances = list(forecast.daily_balances.values())
        for i, balance in enumerate(daily_balances):
            if balance <= forecast.minimum_cash_threshold:
                optimization_report["current_runway_days"] = i
                break
        else:
            optimization_report["current_runway_days"] = len(daily_balances)
        
        # Working capital optimization
        optimization_report["working_capital_recommendations"] = [
            "Negotiate 2/10 net 30 payment terms with customers",
            "Implement automated invoicing to reduce DSO by 5-10 days",
            "Negotiate extended payment terms with suppliers (45-60 days)",
            "Consider inventory optimization to reduce carrying costs"
        ]
        
        # Payment terms optimization
        optimization_report["payment_terms_optimization"] = [
            "Offer early payment discounts (2% for 10-day payment)",
            "Implement late payment fees to encourage timely payment", 
            "Use automated payment reminders and follow-up sequences",
            "Consider requiring deposits or milestone payments for large projects"
        ]
        
        # Estimate potential savings
        estimated_dso_improvement = 7  # days
        monthly_revenue = sum(forecast.expected_receivables.values()) if forecast.expected_receivables else Decimal('100000')
        optimization_report["potential_savings"] = (monthly_revenue / 30) * estimated_dso_improvement
        
        return optimization_report

if __name__ == "__main__":
    # Example usage
    async def test_funding_and_cash_flow():
        # Test funding strategy
        funding_engine = FundingStrategyEngine()
        recommendation = funding_engine.analyze_funding_needs(
            annual_revenue=Decimal('500000'),
            growth_rate=Decimal('0.50'),
            current_cash=Decimal('50000'),
            monthly_burn_rate=Decimal('25000'),
            funding_stage=FundingStage.SERIES_A,
            industry=IndustryType.TECHNOLOGY
        )
        
        print(f"Funding recommendation: ${recommendation.recommended_amount:,.2f}")
        print(f"Suggested sources: {', '.join(recommendation.recommended_sources)}")
        print(f"Valuation range: ${recommendation.suggested_valuation_range[0]:,.0f} - ${recommendation.suggested_valuation_range[1]:,.0f}")
        
        # Test cash flow forecasting
        cash_flow_manager = CashFlowManager()
        
        # Sample projected sales
        projected_sales = {}
        base_date = date.today()
        for i in range(90):  # 90 days of sales
            sale_date = base_date + timedelta(days=i)
            projected_sales[sale_date] = Decimal('5000')  # $5k daily sales
        
        # Sample recurring expenses
        recurring_expenses = {
            "monthly_rent": Decimal('10000'),
            "monthly_salaries": Decimal('50000'),
            "monthly_software": Decimal('2000'),
            "weekly_marketing": Decimal('1000'),
            "daily_operations": Decimal('500')
        }
        
        forecast = cash_flow_manager.create_cash_flow_forecast(
            start_date=base_date,
            end_date=base_date + timedelta(days=90),
            opening_balance=Decimal('75000'),
            projected_sales=projected_sales,
            recurring_expenses=recurring_expenses,
            customer_type="b2b_smb",
            industry=IndustryType.TECHNOLOGY
        )
        
        print(f"\nCash flow forecast:")
        print(f"Cash shortage dates: {len(forecast.cash_shortage_dates)}")
        if forecast.recommended_actions:
            print("Recommendations:")
            for action in forecast.recommended_actions[:3]:
                print(f"  - {action}")

    # Run test
    asyncio.run(test_funding_and_cash_flow())
