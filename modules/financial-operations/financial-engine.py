"""
Financial Operations Module - Core Engine
Comprehensive financial management system for business operations
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Tuple
from pathlib import Path
import uuid
import numpy as np
import pandas as pd
from collections import defaultdict
import aiohttp
import yaml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AccountType(Enum):
    """Chart of accounts types"""
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"
    
class AccountSubType(Enum):
    """Detailed account subtypes"""
    # Assets
    CURRENT_ASSET = "current_asset"
    FIXED_ASSET = "fixed_asset"
    CASH = "cash"
    ACCOUNTS_RECEIVABLE = "accounts_receivable"
    INVENTORY = "inventory"
    PREPAID_EXPENSES = "prepaid_expenses"
    
    # Liabilities
    CURRENT_LIABILITY = "current_liability"
    LONG_TERM_LIABILITY = "long_term_liability"
    ACCOUNTS_PAYABLE = "accounts_payable"
    ACCRUED_EXPENSES = "accrued_expenses"
    LOANS_PAYABLE = "loans_payable"
    
    # Equity
    OWNERS_EQUITY = "owners_equity"
    RETAINED_EARNINGS = "retained_earnings"
    CAPITAL_STOCK = "capital_stock"
    
    # Revenue
    OPERATING_REVENUE = "operating_revenue"
    NON_OPERATING_REVENUE = "non_operating_revenue"
    
    # Expenses
    COST_OF_GOODS_SOLD = "cost_of_goods_sold"
    OPERATING_EXPENSE = "operating_expense"
    ADMINISTRATIVE_EXPENSE = "administrative_expense"

class EntityType(Enum):
    """Business entity types for tax optimization"""
    SOLE_PROPRIETORSHIP = "sole_proprietorship"
    PARTNERSHIP = "partnership"
    LLC = "llc"
    S_CORPORATION = "s_corporation"
    C_CORPORATION = "c_corporation"
    NONPROFIT = "nonprofit"

class FundingStage(Enum):
    """Business funding stages"""
    PRE_SEED = "pre_seed"
    SEED = "seed"
    SERIES_A = "series_a"
    SERIES_B = "series_b"
    SERIES_C = "series_c"
    GROWTH = "growth"
    IPO_READY = "ipo_ready"
    BOOTSTRAP = "bootstrap"
    REVENUE_BASED = "revenue_based"

class IndustryType(Enum):
    """Industry classifications for financial analysis"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    SERVICES = "services"
    REAL_ESTATE = "real_estate"
    AGRICULTURE = "agriculture"
    ENERGY = "energy"
    EDUCATION = "education"

@dataclass
class Account:
    """Chart of accounts entry"""
    account_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    account_number: str = ""
    name: str = ""
    account_type: AccountType = AccountType.ASSET
    account_subtype: AccountSubType = AccountSubType.CURRENT_ASSET
    description: str = ""
    parent_account_id: Optional[str] = None
    is_active: bool = True
    balance: Decimal = field(default_factory=lambda: Decimal('0.00'))
    
    # Tax information
    tax_line_mapping: Optional[str] = None  # Maps to tax form lines
    deductible: bool = False
    depreciation_method: Optional[str] = None
    useful_life_years: Optional[int] = None
    
    # Reporting
    include_in_reports: bool = True
    notes: str = ""
    created_date: datetime = field(default_factory=datetime.utcnow)
    updated_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class Transaction:
    """Financial transaction record"""
    transaction_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    date: date = field(default_factory=date.today)
    description: str = ""
    reference_number: Optional[str] = None
    
    # Double-entry bookkeeping
    debit_entries: List[Dict[str, Any]] = field(default_factory=list)
    credit_entries: List[Dict[str, Any]] = field(default_factory=list)
    
    # Transaction details
    total_amount: Decimal = field(default_factory=lambda: Decimal('0.00'))
    currency: str = "USD"
    exchange_rate: Decimal = field(default_factory=lambda: Decimal('1.00'))
    
    # Categorization
    category: Optional[str] = None
    subcategory: Optional[str] = None
    tax_category: Optional[str] = None
    business_purpose: Optional[str] = None
    
    # Attachments and proof
    receipt_urls: List[str] = field(default_factory=list)
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    customer_name: Optional[str] = None
    
    # Status and audit
    status: str = "posted"  # draft, posted, reconciled, voided
    created_by: Optional[str] = None
    approved_by: Optional[str] = None
    reconciled_date: Optional[date] = None
    
    # Metadata
    created_date: datetime = field(default_factory=datetime.utcnow)
    updated_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class TaxStrategy:
    """Tax optimization strategy"""
    strategy_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    entity_type: EntityType = EntityType.LLC
    jurisdiction: str = "US"
    
    # Strategy details
    strategy_type: str = ""  # deduction, deferral, credit, structure
    estimated_savings: Decimal = field(default_factory=lambda: Decimal('0.00'))
    implementation_cost: Decimal = field(default_factory=lambda: Decimal('0.00'))
    net_benefit: Decimal = field(default_factory=lambda: Decimal('0.00'))
    
    # Requirements and risks
    requirements: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)
    compliance_notes: str = ""
    
    # Timeline
    implementation_timeline: str = ""
    annual_maintenance: bool = False
    
    # Applicability
    applicable_entities: List[EntityType] = field(default_factory=list)
    industry_specific: List[IndustryType] = field(default_factory=list)
    revenue_threshold_min: Optional[Decimal] = None
    revenue_threshold_max: Optional[Decimal] = None
    
    created_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class FinancialProjection:
    """Financial projection model"""
    projection_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    
    # Time frame
    start_date: date = field(default_factory=date.today)
    end_date: date = field(default_factory=lambda: date.today() + timedelta(days=365*3))
    projection_period_months: int = 36
    
    # Revenue projections
    revenue_projections: Dict[str, List[Decimal]] = field(default_factory=dict)
    revenue_growth_rate: Decimal = field(default_factory=lambda: Decimal('0.10'))
    seasonal_factors: Dict[int, Decimal] = field(default_factory=dict)  # month -> factor
    
    # Expense projections
    expense_projections: Dict[str, List[Decimal]] = field(default_factory=dict)
    fixed_expenses: Dict[str, Decimal] = field(default_factory=dict)
    variable_expense_rate: Decimal = field(default_factory=lambda: Decimal('0.60'))
    
    # Key metrics
    projected_net_income: List[Decimal] = field(default_factory=list)
    projected_cash_flow: List[Decimal] = field(default_factory=list)
    break_even_month: Optional[int] = None
    
    # Assumptions
    assumptions: Dict[str, Any] = field(default_factory=dict)
    scenario_type: str = "base"  # conservative, base, optimistic
    confidence_level: Decimal = field(default_factory=lambda: Decimal('0.70'))
    
    # Metadata
    created_date: datetime = field(default_factory=datetime.utcnow)
    updated_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class FundingRecommendation:
    """Funding strategy recommendation"""
    recommendation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    funding_stage: FundingStage = FundingStage.SEED
    recommended_amount: Decimal = field(default_factory=lambda: Decimal('0.00'))
    funding_type: str = ""  # equity, debt, grant, revenue_based
    
    # Rationale
    rationale: str = ""
    use_of_funds: List[str] = field(default_factory=list)
    expected_runway_months: int = 0
    
    # Sources
    recommended_sources: List[str] = field(default_factory=list)
    investor_types: List[str] = field(default_factory=list)
    
    # Terms
    suggested_valuation_range: Tuple[Decimal, Decimal] = field(default_factory=lambda: (Decimal('0'), Decimal('0')))
    equity_dilution_range: Tuple[Decimal, Decimal] = field(default_factory=lambda: (Decimal('0'), Decimal('0')))
    
    # Requirements
    preparation_requirements: List[str] = field(default_factory=list)
    timeline_to_funding: str = ""
    
    # Alternatives
    alternative_options: List[str] = field(default_factory=list)
    
    created_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class CashFlowForecast:
    """Cash flow management and forecasting"""
    forecast_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    period_start: date = field(default_factory=date.today)
    period_end: date = field(default_factory=lambda: date.today() + timedelta(days=90))
    
    # Opening balances
    opening_cash_balance: Decimal = field(default_factory=lambda: Decimal('0.00'))
    
    # Inflows
    expected_receivables: Dict[date, Decimal] = field(default_factory=dict)
    projected_sales: Dict[date, Decimal] = field(default_factory=dict)
    other_inflows: Dict[date, Decimal] = field(default_factory=dict)
    
    # Outflows
    scheduled_payables: Dict[date, Decimal] = field(default_factory=dict)
    recurring_expenses: Dict[date, Decimal] = field(default_factory=dict)
    planned_investments: Dict[date, Decimal] = field(default_factory=dict)
    
    # Daily cash balances
    daily_balances: Dict[date, Decimal] = field(default_factory=dict)
    minimum_cash_threshold: Decimal = field(default_factory=lambda: Decimal('10000.00'))
    
    # Alerts
    cash_shortage_dates: List[date] = field(default_factory=list)
    recommended_actions: List[str] = field(default_factory=list)
    
    created_date: datetime = field(default_factory=datetime.utcnow)

class ChartOfAccountsGenerator:
    """Generates industry-specific chart of accounts"""
    
    def __init__(self):
        self.industry_templates = self._load_industry_templates()
        self.standard_accounts = self._load_standard_accounts()
    
    def _load_industry_templates(self) -> Dict[IndustryType, Dict[str, Any]]:
        """Load industry-specific account templates"""
        
        return {
            IndustryType.TECHNOLOGY: {
                "revenue_accounts": [
                    "Software License Revenue",
                    "SaaS Subscription Revenue", 
                    "Professional Services Revenue",
                    "Support and Maintenance Revenue"
                ],
                "expense_accounts": [
                    "Research and Development",
                    "Software Development Costs",
                    "Cloud Infrastructure Costs",
                    "Third-party Software Licenses",
                    "Technical Support Costs"
                ],
                "asset_accounts": [
                    "Developed Software",
                    "Customer Data and Lists",
                    "Domain Names and Trademarks"
                ]
            },
            
            IndustryType.RETAIL: {
                "revenue_accounts": [
                    "Product Sales Revenue",
                    "Online Sales Revenue",
                    "Wholesale Revenue",
                    "Shipping and Handling Revenue"
                ],
                "expense_accounts": [
                    "Cost of Goods Sold",
                    "Inventory Shrinkage",
                    "Store Rent and Utilities",
                    "Point of Sale System Costs",
                    "Shipping and Fulfillment Costs"
                ],
                "asset_accounts": [
                    "Inventory - Raw Materials",
                    "Inventory - Finished Goods",
                    "Store Fixtures and Equipment",
                    "Point of Sale Systems"
                ]
            },
            
            IndustryType.SERVICES: {
                "revenue_accounts": [
                    "Professional Services Revenue",
                    "Consulting Revenue",
                    "Training Revenue",
                    "Retainer Revenue"
                ],
                "expense_accounts": [
                    "Subcontractor Costs",
                    "Professional Development",
                    "Client Entertainment",
                    "Travel and Transportation"
                ],
                "asset_accounts": [
                    "Unbilled Services",
                    "Client Contracts",
                    "Professional Equipment"
                ]
            },
            
            IndustryType.MANUFACTURING: {
                "revenue_accounts": [
                    "Product Sales Revenue",
                    "Contract Manufacturing Revenue",
                    "Custom Manufacturing Revenue"
                ],
                "expense_accounts": [
                    "Raw Materials",
                    "Direct Labor",
                    "Manufacturing Overhead",
                    "Factory Utilities",
                    "Equipment Maintenance"
                ],
                "asset_accounts": [
                    "Raw Materials Inventory",
                    "Work in Process Inventory",
                    "Finished Goods Inventory",
                    "Manufacturing Equipment",
                    "Factory Building"
                ]
            }
        }
    
    def _load_standard_accounts(self) -> List[Account]:
        """Load standard accounts common to all businesses"""
        
        standard_accounts = []
        
        # Standard asset accounts
        asset_accounts = [
            ("1000", "Cash - Operating", AccountType.ASSET, AccountSubType.CASH),
            ("1010", "Cash - Savings", AccountType.ASSET, AccountSubType.CASH),
            ("1100", "Accounts Receivable", AccountType.ASSET, AccountSubType.ACCOUNTS_RECEIVABLE),
            ("1200", "Prepaid Expenses", AccountType.ASSET, AccountSubType.PREPAID_EXPENSES),
            ("1500", "Equipment", AccountType.ASSET, AccountSubType.FIXED_ASSET),
            ("1510", "Accumulated Depreciation - Equipment", AccountType.ASSET, AccountSubType.FIXED_ASSET),
        ]
        
        # Standard liability accounts
        liability_accounts = [
            ("2000", "Accounts Payable", AccountType.LIABILITY, AccountSubType.ACCOUNTS_PAYABLE),
            ("2100", "Accrued Expenses", AccountType.LIABILITY, AccountSubType.ACCRUED_EXPENSES),
            ("2200", "Payroll Liabilities", AccountType.LIABILITY, AccountSubType.CURRENT_LIABILITY),
            ("2300", "Income Tax Payable", AccountType.LIABILITY, AccountSubType.CURRENT_LIABILITY),
            ("2500", "Long-term Debt", AccountType.LIABILITY, AccountSubType.LONG_TERM_LIABILITY),
        ]
        
        # Standard equity accounts
        equity_accounts = [
            ("3000", "Owner's Equity", AccountType.EQUITY, AccountSubType.OWNERS_EQUITY),
            ("3100", "Retained Earnings", AccountType.EQUITY, AccountSubType.RETAINED_EARNINGS),
            ("3200", "Capital Stock", AccountType.EQUITY, AccountSubType.CAPITAL_STOCK),
        ]
        
        # Standard revenue accounts
        revenue_accounts = [
            ("4000", "Revenue", AccountType.REVENUE, AccountSubType.OPERATING_REVENUE),
            ("4100", "Interest Income", AccountType.REVENUE, AccountSubType.NON_OPERATING_REVENUE),
        ]
        
        # Standard expense accounts
        expense_accounts = [
            ("5000", "Cost of Goods Sold", AccountType.EXPENSE, AccountSubType.COST_OF_GOODS_SOLD),
            ("6000", "Salaries and Wages", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6100", "Payroll Taxes", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6200", "Employee Benefits", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6300", "Rent Expense", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6400", "Utilities", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6500", "Office Supplies", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6600", "Professional Services", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6700", "Insurance", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("6800", "Depreciation Expense", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
            ("7000", "Interest Expense", AccountType.EXPENSE, AccountSubType.OPERATING_EXPENSE),
        ]
        
        all_accounts = asset_accounts + liability_accounts + equity_accounts + revenue_accounts + expense_accounts
        
        for account_number, name, account_type, account_subtype in all_accounts:
            account = Account(
                account_number=account_number,
                name=name,
                account_type=account_type,
                account_subtype=account_subtype,
                include_in_reports=True
            )
            standard_accounts.append(account)
        
        return standard_accounts
    
    def generate_chart_of_accounts(self, entity_type: EntityType, 
                                 industry: IndustryType) -> List[Account]:
        """Generate complete chart of accounts"""
        
        accounts = self.standard_accounts.copy()
        
        # Add industry-specific accounts
        industry_template = self.industry_templates.get(industry, {})
        account_number = 8000  # Start industry-specific accounts at 8000
        
        # Add industry revenue accounts
        for revenue_account in industry_template.get("revenue_accounts", []):
            account = Account(
                account_number=str(account_number),
                name=revenue_account,
                account_type=AccountType.REVENUE,
                account_subtype=AccountSubType.OPERATING_REVENUE
            )
            accounts.append(account)
            account_number += 10
        
        # Add industry expense accounts
        for expense_account in industry_template.get("expense_accounts", []):
            account = Account(
                account_number=str(account_number),
                name=expense_account,
                account_type=AccountType.EXPENSE,
                account_subtype=AccountSubType.OPERATING_EXPENSE
            )
            accounts.append(account)
            account_number += 10
        
        # Add industry asset accounts
        for asset_account in industry_template.get("asset_accounts", []):
            account = Account(
                account_number=str(account_number),
                name=asset_account,
                account_type=AccountType.ASSET,
                account_subtype=AccountSubType.CURRENT_ASSET
            )
            accounts.append(account)
            account_number += 10
        
        # Entity-specific adjustments
        if entity_type == EntityType.S_CORPORATION:
            # Add S-Corp specific equity accounts
            s_corp_accounts = [
                Account(
                    account_number="3300",
                    name="Distributions to Shareholders",
                    account_type=AccountType.EQUITY,
                    account_subtype=AccountSubType.OWNERS_EQUITY
                ),
                Account(
                    account_number="3400",
                    name="AAA (Accumulated Adjustments Account)",
                    account_type=AccountType.EQUITY,
                    account_subtype=AccountSubType.RETAINED_EARNINGS
                )
            ]
            accounts.extend(s_corp_accounts)
        
        elif entity_type == EntityType.PARTNERSHIP:
            # Add partnership equity accounts
            partnership_accounts = [
                Account(
                    account_number="3300",
                    name="Partner A Capital",
                    account_type=AccountType.EQUITY,
                    account_subtype=AccountSubType.OWNERS_EQUITY
                ),
                Account(
                    account_number="3310",
                    name="Partner B Capital",
                    account_type=AccountType.EQUITY,
                    account_subtype=AccountSubType.OWNERS_EQUITY
                ),
                Account(
                    account_number="3400",
                    name="Partner Distributions",
                    account_type=AccountType.EQUITY,
                    account_subtype=AccountSubType.OWNERS_EQUITY
                )
            ]
            accounts.extend(partnership_accounts)
        
        return accounts

class TaxOptimizationEngine:
    """Advanced tax optimization strategies"""
    
    def __init__(self):
        self.tax_strategies = self._load_tax_strategies()
        self.deduction_categories = self._load_deduction_categories()
        self.tax_rates = self._load_tax_rates()
    
    def _load_tax_strategies(self) -> List[TaxStrategy]:
        """Load comprehensive tax optimization strategies"""
        
        strategies = []
        
        # Section 199A QBI Deduction
        qbi_strategy = TaxStrategy(
            name="Section 199A QBI Deduction",
            description="Qualified Business Income deduction for pass-through entities",
            strategy_type="deduction",
            applicable_entities=[EntityType.LLC, EntityType.S_CORPORATION, EntityType.PARTNERSHIP],
            estimated_savings=Decimal('5000.00'),
            requirements=[
                "Qualified business income from eligible business",
                "Income limitations apply",
                "May require W-2 wages or qualified property"
            ],
            compliance_notes="Must maintain detailed records of qualified business income"
        )
        strategies.append(qbi_strategy)
        
        # Augusta Rule (Home Office Rental)
        augusta_strategy = TaxStrategy(
            name="Augusta Rule Home Office Rental",
            description="Rent home office to business for up to 14 days tax-free",
            strategy_type="deduction",
            applicable_entities=[EntityType.LLC, EntityType.S_CORPORATION, EntityType.C_CORPORATION],
            estimated_savings=Decimal('3000.00'),
            requirements=[
                "Legitimate business meetings in home",
                "Market rate rental charges",
                "Limited to 14 days per year"
            ],
            risks=["IRS scrutiny if rates are not reasonable"],
            compliance_notes="Document all meetings and maintain fair market rent documentation"
        )
        strategies.append(augusta_strategy)
        
        # Accountable Plan
        accountable_plan_strategy = TaxStrategy(
            name="Accountable Plan for Expense Reimbursements",
            description="Structure expense reimbursements to avoid taxation",
            strategy_type="structure",
            applicable_entities=[EntityType.LLC, EntityType.S_CORPORATION, EntityType.C_CORPORATION],
            estimated_savings=Decimal('2000.00'),
            requirements=[
                "Business connection requirement",
                "Substantiation requirement",
                "Return of excess reimbursements"
            ],
            implementation_timeline="1-2 weeks",
            annual_maintenance=True
        )
        strategies.append(accountable_plan_strategy)
        
        # Equipment Section 179 Deduction
        section_179_strategy = TaxStrategy(
            name="Section 179 Equipment Deduction",
            description="Immediate deduction for business equipment purchases",
            strategy_type="deduction",
            applicable_entities=list(EntityType),
            estimated_savings=Decimal('10000.00'),
            requirements=[
                "Equipment used more than 50% for business",
                "Annual purchase limits apply",
                "Business income limitations"
            ],
            compliance_notes="Maintain detailed equipment usage logs"
        )
        strategies.append(section_179_strategy)
        
        # R&D Tax Credit
        rd_credit_strategy = TaxStrategy(
            name="Research and Development Tax Credit",
            description="Credit for qualified research expenditures",
            strategy_type="credit",
            applicable_entities=list(EntityType),
            industry_specific=[IndustryType.TECHNOLOGY, IndustryType.MANUFACTURING],
            estimated_savings=Decimal('15000.00'),
            requirements=[
                "Qualified research activities",
                "Technological in nature",
                "Elimination of uncertainty",
                "Process of experimentation"
            ],
            compliance_notes="Detailed documentation of research activities required"
        )
        strategies.append(rd_credit_strategy)
        
        # Entity Election Optimization
        entity_optimization_strategy = TaxStrategy(
            name="S-Corporation Election",
            description="Elect S-Corp status to reduce self-employment taxes",
            strategy_type="structure",
            applicable_entities=[EntityType.LLC],
            estimated_savings=Decimal('7500.00'),
            requirements=[
                "Reasonable salary for owner-employees",
                "Single class of stock",
                "Limited to 100 shareholders",
                "Domestic entity only"
            ],
            risks=["Payroll compliance requirements", "Reasonable salary determination"],
            implementation_timeline="2-3 months"
        )
        strategies.append(entity_optimization_strategy)
        
        return strategies
    
    def _load_deduction_categories(self) -> Dict[str, Dict[str, Any]]:
        """Load business deduction categories and rules"""
        
        return {
            "office_expenses": {
                "name": "Office and Administrative Expenses",
                "deductible_percentage": 100,
                "subcategories": [
                    "Office supplies",
                    "Software subscriptions", 
                    "Phone and internet",
                    "Office equipment",
                    "Postage and shipping"
                ],
                "documentation_required": "Receipts and business purpose"
            },
            
            "travel_expenses": {
                "name": "Business Travel",
                "deductible_percentage": 100,
                "subcategories": [
                    "Airfare and transportation",
                    "Hotels and lodging",
                    "Meals (50% deductible)",
                    "Conference fees",
                    "Local transportation"
                ],
                "documentation_required": "Receipts, business purpose, dates, locations"
            },
            
            "vehicle_expenses": {
                "name": "Vehicle and Transportation",
                "deductible_percentage": 100,
                "subcategories": [
                    "Mileage (standard rate)",
                    "Actual vehicle expenses",
                    "Parking and tolls",
                    "Vehicle insurance",
                    "Maintenance and repairs"
                ],
                "documentation_required": "Mileage logs or expense receipts"
            },
            
            "marketing_expenses": {
                "name": "Marketing and Advertising",
                "deductible_percentage": 100,
                "subcategories": [
                    "Digital advertising",
                    "Print materials",
                    "Website development",
                    "Social media management",
                    "Trade shows and events"
                ],
                "documentation_required": "Receipts and campaign documentation"
            },
            
            "professional_services": {
                "name": "Professional Services",
                "deductible_percentage": 100,
                "subcategories": [
                    "Legal fees",
                    "Accounting services",
                    "Consulting fees",
                    "Banking fees",
                    "Insurance premiums"
                ],
                "documentation_required": "Invoices and service agreements"
            },
            
            "home_office": {
                "name": "Home Office Deduction",
                "deductible_percentage": 100,
                "subcategories": [
                    "Simplified method ($5/sq ft)",
                    "Actual expense method",
                    "Utilities allocation",
                    "Mortgage interest allocation",
                    "Property tax allocation"
                ],
                "documentation_required": "Home office measurements and expense records"
            }
        }
    
    def _load_tax_rates(self) -> Dict[str, Dict[str, Any]]:
        """Load current tax rates by entity type and income level"""
        
        return {
            EntityType.SOLE_PROPRIETORSHIP.value: {
                "federal_income_tax": {
                    "brackets": [
                        (11000, 0.10),
                        (44725, 0.12),
                        (95375, 0.22),
                        (182050, 0.24),
                        (231250, 0.32),
                        (578125, 0.35),
                        (float('inf'), 0.37)
                    ]
                },
                "self_employment_tax": 0.1413,  # 2.9% Medicare + 12.4% Social Security
                "state_tax_avg": 0.05
            },
            
            EntityType.S_CORPORATION.value: {
                "federal_income_tax": "pass_through",  # Same as individual rates
                "payroll_tax": 0.0765,  # Employer portion
                "state_tax_avg": 0.05
            },
            
            EntityType.C_CORPORATION.value: {
                "federal_corporate_tax": 0.21,
                "state_corporate_tax_avg": 0.06,
                "double_taxation": True
            },
            
            EntityType.LLC.value: {
                "federal_income_tax": "pass_through",
                "self_employment_tax": 0.1413,
                "state_tax_avg": 0.05
            }
        }
    
    def analyze_tax_optimization(self, entity_type: EntityType, 
                               annual_income: Decimal,
                               industry: IndustryType,
                               expenses: Dict[str, Decimal]) -> List[TaxStrategy]:
        """Analyze and recommend tax optimization strategies"""
        
        applicable_strategies = []
        
        for strategy in self.tax_strategies:
            # Check entity type compatibility
            if entity_type not in strategy.applicable_entities:
                continue
            
            # Check industry compatibility
            if strategy.industry_specific and industry not in strategy.industry_specific:
                continue
            
            # Check income thresholds
            if strategy.revenue_threshold_min and annual_income < strategy.revenue_threshold_min:
                continue
            if strategy.revenue_threshold_max and annual_income > strategy.revenue_threshold_max:
                continue
            
            # Calculate estimated savings for this business
            strategy.estimated_savings = self._calculate_strategy_savings(
                strategy, entity_type, annual_income, expenses
            )
            
            applicable_strategies.append(strategy)
        
        # Sort by net benefit (savings - implementation cost)
        applicable_strategies.sort(
            key=lambda s: s.estimated_savings - s.implementation_cost,
            reverse=True
        )
        
        return applicable_strategies
    
    def _calculate_strategy_savings(self, strategy: TaxStrategy, 
                                  entity_type: EntityType,
                                  annual_income: Decimal,
                                  expenses: Dict[str, Decimal]) -> Decimal:
        """Calculate estimated tax savings for a specific strategy"""
        
        tax_rates = self._load_tax_rates()
        entity_rates = tax_rates.get(entity_type.value, {})
        
        if strategy.name == "Section 199A QBI Deduction":
            # QBI deduction is 20% of qualified business income
            qbi_deduction = min(annual_income * Decimal('0.20'), annual_income * Decimal('0.20'))
            marginal_rate = self._get_marginal_tax_rate(annual_income, entity_type)
            return qbi_deduction * marginal_rate
        
        elif strategy.name == "S-Corporation Election":
            # Savings from reduced self-employment tax
            if entity_type == EntityType.LLC:
                # Assume reasonable salary is 60% of income
                reasonable_salary = annual_income * Decimal('0.60')
                se_tax_current = annual_income * Decimal('0.1413')
                se_tax_s_corp = reasonable_salary * Decimal('0.0765')  # Employer portion only
                return se_tax_current - se_tax_s_corp
        
        elif strategy.name == "Section 179 Equipment Deduction":
            # Savings based on equipment purchases
            equipment_expense = expenses.get("equipment", Decimal('0'))
            if equipment_expense > 0:
                marginal_rate = self._get_marginal_tax_rate(annual_income, entity_type)
                return min(equipment_expense, Decimal('1080000')) * marginal_rate  # 2024 limit
        
        # Default calculation based on strategy type
        if strategy.strategy_type == "deduction":
            marginal_rate = self._get_marginal_tax_rate(annual_income, entity_type)
            return strategy.estimated_savings * marginal_rate
        elif strategy.strategy_type == "credit":
            return strategy.estimated_savings  # Credits are dollar-for-dollar savings
        
        return strategy.estimated_savings
    
    def _get_marginal_tax_rate(self, income: Decimal, entity_type: EntityType) -> Decimal:
        """Calculate marginal tax rate for given income and entity type"""
        
        tax_rates = self._load_tax_rates()
        entity_rates = tax_rates.get(entity_type.value, {})
        
        if entity_type == EntityType.C_CORPORATION:
            return Decimal('0.21')  # Flat corporate rate
        
        # For pass-through entities, use individual tax brackets
        brackets = entity_rates.get("federal_income_tax", {}).get("brackets", [])
        
        for threshold, rate in brackets:
            if income <= threshold:
                return Decimal(str(rate))
        
        return Decimal('0.37')  # Highest bracket
    
    def calculate_expense_optimization(self, expenses: Dict[str, Decimal]) -> Dict[str, Any]:
        """Analyze expenses for optimization opportunities"""
        
        optimization_report = {
            "total_deductible": Decimal('0'),
            "category_analysis": {},
            "recommendations": [],
            "missing_deductions": [],
            "documentation_requirements": []
        }
        
        for category, amount in expenses.items():
            category_info = self.deduction_categories.get(category, {})
            
            if category_info:
                deductible_percentage = category_info.get("deductible_percentage", 100) / 100
                deductible_amount = amount * Decimal(str(deductible_percentage))
                
                optimization_report["category_analysis"][category] = {
                    "amount": amount,
                    "deductible_amount": deductible_amount,
                    "deductible_percentage": category_info.get("deductible_percentage", 100),
                    "subcategories": category_info.get("subcategories", []),
                    "documentation_required": category_info.get("documentation_required", "")
                }
                
                optimization_report["total_deductible"] += deductible_amount
                
                # Add documentation requirements
                doc_req = category_info.get("documentation_required", "")
                if doc_req:
                    optimization_report["documentation_requirements"].append(
                        f"{category}: {doc_req}"
                    )
        
        # Generate recommendations
        if "home_office" not in expenses:
            optimization_report["missing_deductions"].append(
                "Home Office Deduction - Consider if you work from home"
            )
        
        if "vehicle_expenses" not in expenses:
            optimization_report["missing_deductions"].append(
                "Vehicle Expenses - Track business mileage and vehicle costs"
            )
        
        if "professional_services" not in expenses:
            optimization_report["missing_deductions"].append(
                "Professional Services - Legal, accounting, and consulting fees are deductible"
            )
        
        return optimization_report

class FinancialProjectionEngine:
    """Advanced financial modeling and projections"""
    
    def __init__(self):
        self.industry_benchmarks = self._load_industry_benchmarks()
        self.growth_models = self._load_growth_models()
    
    def _load_industry_benchmarks(self) -> Dict[IndustryType, Dict[str, Any]]:
        """Load industry-specific financial benchmarks"""
        
        return {
            IndustryType.TECHNOLOGY: {
                "gross_margin": 0.75,
                "operating_margin": 0.15,
                "revenue_growth_rate": 0.30,
                "customer_acquisition_cost_ratio": 0.25,
                "lifetime_value_multiplier": 3.0,
                "burn_rate_months": 18,
                "typical_funding_rounds": [100000, 1000000, 5000000]
            },
            
            IndustryType.RETAIL: {
                "gross_margin": 0.40,
                "operating_margin": 0.08,
                "revenue_growth_rate": 0.12,
                "inventory_turnover": 6.0,
                "days_sales_outstanding": 30,
                "typical_funding_rounds": [50000, 500000, 2000000]
            },
            
            IndustryType.SERVICES: {
                "gross_margin": 0.65,
                "operating_margin": 0.20,
                "revenue_growth_rate": 0.18,
                "utilization_rate": 0.75,
                "client_retention_rate": 0.85,
                "typical_funding_rounds": [25000, 250000, 1000000]
            },
            
            IndustryType.MANUFACTURING: {
                "gross_margin": 0.35,
                "operating_margin": 0.12,
                "revenue_growth_rate": 0.08,
                "inventory_turnover": 4.0,
                "asset_turnover": 1.2,
                "typical_funding_rounds": [100000, 1000000, 5000000]
            }
        }
    
    def _load_growth_models(self) -> Dict[str, Any]:
        """Load different growth projection models"""
        
        return {
            "linear": {
                "description": "Steady, consistent growth rate",
                "formula": "revenue * (1 + growth_rate) ^ period"
            },
            "exponential": {
                "description": "Accelerating growth rate",
                "formula": "revenue * e^(growth_rate * period)"
            },
            "s_curve": {
                "description": "Slow start, rapid growth, then plateau",
                "formula": "max_revenue / (1 + e^(-growth_rate * (period - inflection_point)))"
            },
            "seasonal": {
                "description": "Growth with seasonal variations",
                "formula": "base_growth * seasonal_factor[month]"
            }
        }
    
    def create_financial_projection(self, 
                                  current_revenue: Decimal,
                                  growth_rate: Decimal,
                                  industry: IndustryType,
                                  projection_months: int = 36,
                                  scenario: str = "base") -> FinancialProjection:
        """Create comprehensive financial projection"""
        
        benchmarks = self.industry_benchmarks.get(industry, {})
        
        projection = FinancialProjection(
            name=f"{industry.value.title()} {scenario.title()} Projection",
            projection_period_months=projection_months,
            revenue_growth_rate=growth_rate,
            scenario_type=scenario
        )
        
        # Adjust growth rate based on scenario
        if scenario == "conservative":
            growth_rate = growth_rate * Decimal('0.7')
            projection.confidence_level = Decimal('0.85')
        elif scenario == "optimistic":
            growth_rate = growth_rate * Decimal('1.3')
            projection.confidence_level = Decimal('0.55')
        
        # Generate monthly projections
        revenue_projections = []
        expense_projections = []
        cash_flow_projections = []
        
        base_monthly_revenue = current_revenue / 12
        
        for month in range(projection_months):
            # Revenue projection with seasonal adjustments
            monthly_growth = (1 + growth_rate / 12) ** month
            seasonal_factor = self._get_seasonal_factor(month % 12, industry)
            
            monthly_revenue = base_monthly_revenue * monthly_growth * seasonal_factor
            revenue_projections.append(monthly_revenue)
            
            # Expense projections based on industry benchmarks
            gross_margin = Decimal(str(benchmarks.get("gross_margin", 0.5)))
            operating_margin = Decimal(str(benchmarks.get("operating_margin", 0.1)))
            
            cogs = monthly_revenue * (1 - gross_margin)
            operating_expenses = monthly_revenue * (gross_margin - operating_margin)
            
            total_expenses = cogs + operating_expenses
            expense_projections.append(total_expenses)
            
            # Cash flow (simplified)
            net_income = monthly_revenue - total_expenses
            cash_flow_projections.append(net_income)
        
        projection.revenue_projections = {"total_revenue": revenue_projections}
        projection.expense_projections = {"total_expenses": expense_projections}
        projection.projected_cash_flow = cash_flow_projections
        projection.projected_net_income = cash_flow_projections
        
        # Calculate break-even point
        projection.break_even_month = self._calculate_break_even(cash_flow_projections)
        
        # Add assumptions
        projection.assumptions = {
            "industry_benchmarks": benchmarks,
            "growth_model": "compound",
            "seasonal_adjustments": True,
            "market_conditions": "stable",
            "competitive_factors": "moderate"
        }
        
        return projection
    
    def _get_seasonal_factor(self, month: int, industry: IndustryType) -> Decimal:
        """Get seasonal adjustment factor for given month and industry"""
        
        seasonal_patterns = {
            IndustryType.RETAIL: {
                0: 0.9,   # January
                1: 0.85,  # February  
                2: 0.95,  # March
                3: 1.0,   # April
                4: 1.05,  # May
                5: 1.0,   # June
                6: 1.0,   # July
                7: 1.05,  # August
                8: 1.0,   # September
                9: 1.1,   # October
                10: 1.3,  # November
                11: 1.4   # December
            },
            
            IndustryType.TECHNOLOGY: {
                # Relatively stable with slight Q4 boost
                month: 1.0 + (0.1 if month in [10, 11] else 0) for month in range(12)
            },
            
            IndustryType.SERVICES: {
                # Lower in summer months
                month: 0.9 if month in [5, 6, 7] else 1.0 for month in range(12)
            }
        }
        
        pattern = seasonal_patterns.get(industry, {month: 1.0 for month in range(12)})
        return Decimal(str(pattern.get(month, 1.0)))
    
    def _calculate_break_even(self, cash_flows: List[Decimal]) -> Optional[int]:
        """Calculate break-even month from cash flow projections"""
        
        cumulative_cash_flow = Decimal('0')
        
        for month, cash_flow in enumerate(cash_flows):
            cumulative_cash_flow += cash_flow
            if cumulative_cash_flow >= 0:
                return month + 1
        
        return None
    
    def create_scenario_analysis(self, base_projection: FinancialProjection) -> Dict[str, FinancialProjection]:
        """Create multiple scenario projections"""
        
        scenarios = {}
        
        # Conservative scenario (70% of base growth)
        conservative = self.create_financial_projection(
            current_revenue=base_projection.revenue_projections["total_revenue"][0] * 12,
            growth_rate=base_projection.revenue_growth_rate * Decimal('0.7'),
            industry=IndustryType.TECHNOLOGY,  # Would be passed as parameter
            projection_months=base_projection.projection_period_months,
            scenario="conservative"
        )
        scenarios["conservative"] = conservative
        
        # Optimistic scenario (130% of base growth)
        optimistic = self.create_financial_projection(
            current_revenue=base_projection.revenue_projections["total_revenue"][0] * 12,
            growth_rate=base_projection.revenue_growth_rate * Decimal('1.3'),
            industry=IndustryType.TECHNOLOGY,
            projection_months=base_projection.projection_period_months,
            scenario="optimistic"
        )
        scenarios["optimistic"] = optimistic
        
        scenarios["base"] = base_projection
        
        return scenarios
    
    def analyze_financial_ratios(self, revenue: Decimal, expenses: Decimal, 
                                assets: Decimal, liabilities: Decimal) -> Dict[str, Decimal]:
        """Calculate key financial ratios"""
        
        ratios = {}
        
        # Profitability ratios
        if revenue > 0:
            ratios["gross_profit_margin"] = (revenue - expenses) / revenue * 100
            ratios["net_profit_margin"] = (revenue - expenses) / revenue * 100
        
        # Liquidity ratios
        current_assets = assets * Decimal('0.6')  # Assumption
        current_liabilities = liabilities * Decimal('0.8')  # Assumption
        
        if current_liabilities > 0:
            ratios["current_ratio"] = current_assets / current_liabilities
        
        # Leverage ratios
        equity = assets - liabilities
        if equity > 0:
            ratios["debt_to_equity"] = liabilities / equity
        
        if assets > 0:
            ratios["debt_ratio"] = liabilities / assets * 100
        
        # Efficiency ratios
        if assets > 0:
            ratios["asset_turnover"] = revenue / assets
        
        return ratios

if __name__ == "__main__":
    # Example usage
    async def test_financial_operations():
        # Test chart of accounts generation
        coa_generator = ChartOfAccountsGenerator()
        accounts = coa_generator.generate_chart_of_accounts(
            EntityType.LLC, 
            IndustryType.TECHNOLOGY
        )
        
        print(f"Generated {len(accounts)} accounts for Technology LLC")
        for account in accounts[:5]:
            print(f"  {account.account_number}: {account.name} ({account.account_type.value})")
        
        # Test tax optimization
        tax_engine = TaxOptimizationEngine()
        strategies = tax_engine.analyze_tax_optimization(
            EntityType.LLC,
            Decimal('150000'),  # Annual income
            IndustryType.TECHNOLOGY,
            {
                "office_expenses": Decimal('5000'),
                "travel_expenses": Decimal('3000'),
                "equipment": Decimal('10000')
            }
        )
        
        print(f"\nFound {len(strategies)} tax optimization strategies:")
        for strategy in strategies[:3]:
            print(f"  {strategy.name}: ${strategy.estimated_savings} estimated savings")
        
        # Test financial projections
        projection_engine = FinancialProjectionEngine()
        projection = projection_engine.create_financial_projection(
            current_revenue=Decimal('100000'),
            growth_rate=Decimal('0.20'),
            industry=IndustryType.TECHNOLOGY,
            projection_months=24
        )
        
        print(f"\nFinancial projection created:")
        print(f"  Break-even month: {projection.break_even_month}")
        print(f"  24-month revenue: ${projection.revenue_projections['total_revenue'][-1]:,.2f}")

    # Run test
    asyncio.run(test_financial_operations())
