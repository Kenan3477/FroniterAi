"""
Financial Analysis Models

Models for financial statements, analysis, valuation, and related data.
"""

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Float, JSON,
    ForeignKey, Index, CheckConstraint, Numeric
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from decimal import Decimal
from datetime import datetime
from typing import Dict, Any, Optional, List

from .base import EnhancedBaseModel, register_model

@register_model
class FinancialStatement(EnhancedBaseModel):
    """Base financial statement data"""
    __tablename__ = 'financial_statements'
    
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Statement metadata
    statement_type = Column(String(50), nullable=False)  # balance_sheet, income_statement, cash_flow
    period_type = Column(String(20), nullable=False)     # annual, quarterly, monthly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    fiscal_year = Column(Integer, nullable=False)
    fiscal_quarter = Column(Integer)  # 1, 2, 3, 4 for quarterly statements
    
    # Statement data (stored as JSON for flexibility)
    statement_data = Column(JSON, nullable=False)
    
    # Metadata
    currency = Column(String(3), default='USD', nullable=False)
    reporting_standard = Column(String(20))  # GAAP, IFRS, etc.
    audit_status = Column(String(20))  # audited, reviewed, compiled
    source = Column(String(50))  # manual_entry, import, api
    
    # Data quality indicators
    completeness_score = Column(Float)  # 0-100
    accuracy_verified = Column(Boolean, default=False)
    data_quality_notes = Column(Text)
    
    # Relationships
    company = relationship("Company", back_populates="financial_statements")
    user = relationship("User")
    financial_analyses = relationship("FinancialAnalysis", back_populates="financial_statement")
    
    __table_args__ = (
        CheckConstraint('statement_type IN ("balance_sheet", "income_statement", "cash_flow")',
                       name='valid_statement_type'),
        CheckConstraint('period_type IN ("annual", "quarterly", "monthly")',
                       name='valid_period_type'),
        CheckConstraint('fiscal_quarter IS NULL OR fiscal_quarter BETWEEN 1 AND 4',
                       name='valid_fiscal_quarter'),
        CheckConstraint('completeness_score IS NULL OR (completeness_score >= 0 AND completeness_score <= 100)',
                       name='valid_completeness_score'),
        Index('idx_financial_statement_company', 'company_id'),
        Index('idx_financial_statement_period', 'period_end', 'statement_type'),
        Index('idx_financial_statement_fiscal', 'fiscal_year', 'fiscal_quarter'),
    )
    
    def get_line_item(self, item_name: str, default: Decimal = Decimal('0')) -> Decimal:
        """Get specific line item value"""
        if not self.statement_data:
            return default
        
        value = self.statement_data.get(item_name, default)
        return Decimal(str(value)) if value is not None else default
    
    def set_line_item(self, item_name: str, value: Decimal):
        """Set specific line item value"""
        if not self.statement_data:
            self.statement_data = {}
        self.statement_data[item_name] = float(value)
    
    def calculate_completeness(self) -> float:
        """Calculate completeness score based on required fields"""
        required_fields = self._get_required_fields()
        if not required_fields:
            return 100.0
        
        completed_fields = 0
        for field in required_fields:
            value = self.get_line_item(field)
            if value != 0:
                completed_fields += 1
        
        score = (completed_fields / len(required_fields)) * 100
        self.completeness_score = round(score, 1)
        return self.completeness_score
    
    def _get_required_fields(self) -> List[str]:
        """Get required fields based on statement type"""
        required_fields_map = {
            'balance_sheet': [
                'total_assets', 'total_liabilities', 'shareholders_equity',
                'current_assets', 'current_liabilities', 'cash'
            ],
            'income_statement': [
                'revenue', 'net_income', 'gross_profit', 'operating_income',
                'cost_of_goods_sold'
            ],
            'cash_flow': [
                'operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow',
                'net_cash_flow', 'beginning_cash', 'ending_cash'
            ]
        }
        return required_fields_map.get(self.statement_type, [])

@register_model
class BalanceSheet(EnhancedBaseModel):
    """Detailed balance sheet data"""
    __tablename__ = 'balance_sheets'
    
    financial_statement_id = Column(Integer, ForeignKey('financial_statements.id'), nullable=False, unique=True)
    
    # Assets
    cash = Column(Numeric(15, 2), default=0)
    short_term_investments = Column(Numeric(15, 2), default=0)
    accounts_receivable = Column(Numeric(15, 2), default=0)
    inventory = Column(Numeric(15, 2), default=0)
    prepaid_expenses = Column(Numeric(15, 2), default=0)
    other_current_assets = Column(Numeric(15, 2), default=0)
    total_current_assets = Column(Numeric(15, 2), default=0)
    
    property_plant_equipment = Column(Numeric(15, 2), default=0)
    accumulated_depreciation = Column(Numeric(15, 2), default=0)
    intangible_assets = Column(Numeric(15, 2), default=0)
    goodwill = Column(Numeric(15, 2), default=0)
    long_term_investments = Column(Numeric(15, 2), default=0)
    other_long_term_assets = Column(Numeric(15, 2), default=0)
    total_long_term_assets = Column(Numeric(15, 2), default=0)
    total_assets = Column(Numeric(15, 2), default=0)
    
    # Liabilities
    accounts_payable = Column(Numeric(15, 2), default=0)
    short_term_debt = Column(Numeric(15, 2), default=0)
    accrued_expenses = Column(Numeric(15, 2), default=0)
    deferred_revenue = Column(Numeric(15, 2), default=0)
    other_current_liabilities = Column(Numeric(15, 2), default=0)
    total_current_liabilities = Column(Numeric(15, 2), default=0)
    
    long_term_debt = Column(Numeric(15, 2), default=0)
    deferred_tax_liabilities = Column(Numeric(15, 2), default=0)
    other_long_term_liabilities = Column(Numeric(15, 2), default=0)
    total_long_term_liabilities = Column(Numeric(15, 2), default=0)
    total_liabilities = Column(Numeric(15, 2), default=0)
    
    # Equity
    common_stock = Column(Numeric(15, 2), default=0)
    preferred_stock = Column(Numeric(15, 2), default=0)
    retained_earnings = Column(Numeric(15, 2), default=0)
    accumulated_other_comprehensive_income = Column(Numeric(15, 2), default=0)
    treasury_stock = Column(Numeric(15, 2), default=0)
    total_shareholders_equity = Column(Numeric(15, 2), default=0)
    
    # Calculated fields
    working_capital = Column(Numeric(15, 2))
    net_tangible_assets = Column(Numeric(15, 2))
    
    # Relationships
    financial_statement = relationship("FinancialStatement")
    
    def calculate_totals(self):
        """Calculate total fields"""
        self.total_current_assets = (
            self.cash + self.short_term_investments + self.accounts_receivable +
            self.inventory + self.prepaid_expenses + self.other_current_assets
        )
        
        self.total_long_term_assets = (
            self.property_plant_equipment - self.accumulated_depreciation +
            self.intangible_assets + self.goodwill + self.long_term_investments +
            self.other_long_term_assets
        )
        
        self.total_assets = self.total_current_assets + self.total_long_term_assets
        
        self.total_current_liabilities = (
            self.accounts_payable + self.short_term_debt + self.accrued_expenses +
            self.deferred_revenue + self.other_current_liabilities
        )
        
        self.total_long_term_liabilities = (
            self.long_term_debt + self.deferred_tax_liabilities + self.other_long_term_liabilities
        )
        
        self.total_liabilities = self.total_current_liabilities + self.total_long_term_liabilities
        
        self.total_shareholders_equity = (
            self.common_stock + self.preferred_stock + self.retained_earnings +
            self.accumulated_other_comprehensive_income - self.treasury_stock
        )
        
        # Calculated metrics
        self.working_capital = self.total_current_assets - self.total_current_liabilities
        self.net_tangible_assets = self.total_assets - self.intangible_assets - self.goodwill

@register_model
class IncomeStatement(EnhancedBaseModel):
    """Detailed income statement data"""
    __tablename__ = 'income_statements'
    
    financial_statement_id = Column(Integer, ForeignKey('financial_statements.id'), nullable=False, unique=True)
    
    # Revenue
    revenue = Column(Numeric(15, 2), default=0)
    other_revenue = Column(Numeric(15, 2), default=0)
    total_revenue = Column(Numeric(15, 2), default=0)
    
    # Costs and expenses
    cost_of_goods_sold = Column(Numeric(15, 2), default=0)
    gross_profit = Column(Numeric(15, 2), default=0)
    
    research_and_development = Column(Numeric(15, 2), default=0)
    sales_and_marketing = Column(Numeric(15, 2), default=0)
    general_and_administrative = Column(Numeric(15, 2), default=0)
    depreciation_and_amortization = Column(Numeric(15, 2), default=0)
    other_operating_expenses = Column(Numeric(15, 2), default=0)
    total_operating_expenses = Column(Numeric(15, 2), default=0)
    
    operating_income = Column(Numeric(15, 2), default=0)
    
    # Non-operating items
    interest_income = Column(Numeric(15, 2), default=0)
    interest_expense = Column(Numeric(15, 2), default=0)
    other_income = Column(Numeric(15, 2), default=0)
    other_expenses = Column(Numeric(15, 2), default=0)
    
    income_before_tax = Column(Numeric(15, 2), default=0)
    tax_expense = Column(Numeric(15, 2), default=0)
    net_income = Column(Numeric(15, 2), default=0)
    
    # Per share data
    shares_outstanding = Column(Numeric(15, 2))
    earnings_per_share = Column(Numeric(10, 4))
    diluted_earnings_per_share = Column(Numeric(10, 4))
    
    # EBITDA calculation
    ebitda = Column(Numeric(15, 2))
    
    # Relationships
    financial_statement = relationship("FinancialStatement")
    
    def calculate_totals(self):
        """Calculate derived fields"""
        self.total_revenue = self.revenue + self.other_revenue
        self.gross_profit = self.total_revenue - self.cost_of_goods_sold
        
        self.total_operating_expenses = (
            self.research_and_development + self.sales_and_marketing +
            self.general_and_administrative + self.depreciation_and_amortization +
            self.other_operating_expenses
        )
        
        self.operating_income = self.gross_profit - self.total_operating_expenses
        
        self.income_before_tax = (
            self.operating_income + self.interest_income - self.interest_expense +
            self.other_income - self.other_expenses
        )
        
        self.net_income = self.income_before_tax - self.tax_expense
        
        # Calculate EBITDA
        self.ebitda = self.operating_income + self.depreciation_and_amortization
        
        # Calculate EPS
        if self.shares_outstanding and self.shares_outstanding > 0:
            self.earnings_per_share = self.net_income / self.shares_outstanding

@register_model
class CashFlowStatement(EnhancedBaseModel):
    """Detailed cash flow statement data"""
    __tablename__ = 'cash_flow_statements'
    
    financial_statement_id = Column(Integer, ForeignKey('financial_statements.id'), nullable=False, unique=True)
    
    # Operating activities
    net_income = Column(Numeric(15, 2), default=0)
    depreciation_and_amortization = Column(Numeric(15, 2), default=0)
    stock_based_compensation = Column(Numeric(15, 2), default=0)
    deferred_tax = Column(Numeric(15, 2), default=0)
    
    # Changes in working capital
    change_in_accounts_receivable = Column(Numeric(15, 2), default=0)
    change_in_inventory = Column(Numeric(15, 2), default=0)
    change_in_accounts_payable = Column(Numeric(15, 2), default=0)
    change_in_other_working_capital = Column(Numeric(15, 2), default=0)
    
    other_operating_activities = Column(Numeric(15, 2), default=0)
    operating_cash_flow = Column(Numeric(15, 2), default=0)
    
    # Investing activities
    capital_expenditures = Column(Numeric(15, 2), default=0)
    acquisitions = Column(Numeric(15, 2), default=0)
    asset_sales = Column(Numeric(15, 2), default=0)
    investment_purchases = Column(Numeric(15, 2), default=0)
    investment_sales = Column(Numeric(15, 2), default=0)
    other_investing_activities = Column(Numeric(15, 2), default=0)
    investing_cash_flow = Column(Numeric(15, 2), default=0)
    
    # Financing activities
    debt_issuance = Column(Numeric(15, 2), default=0)
    debt_repayment = Column(Numeric(15, 2), default=0)
    equity_issuance = Column(Numeric(15, 2), default=0)
    share_repurchases = Column(Numeric(15, 2), default=0)
    dividends_paid = Column(Numeric(15, 2), default=0)
    other_financing_activities = Column(Numeric(15, 2), default=0)
    financing_cash_flow = Column(Numeric(15, 2), default=0)
    
    # Net cash flow
    net_cash_flow = Column(Numeric(15, 2), default=0)
    beginning_cash = Column(Numeric(15, 2), default=0)
    ending_cash = Column(Numeric(15, 2), default=0)
    
    # Free cash flow calculations
    free_cash_flow = Column(Numeric(15, 2))
    levered_free_cash_flow = Column(Numeric(15, 2))
    
    # Relationships
    financial_statement = relationship("FinancialStatement")
    
    def calculate_totals(self):
        """Calculate derived cash flow fields"""
        self.operating_cash_flow = (
            self.net_income + self.depreciation_and_amortization +
            self.stock_based_compensation + self.deferred_tax +
            self.change_in_accounts_receivable + self.change_in_inventory +
            self.change_in_accounts_payable + self.change_in_other_working_capital +
            self.other_operating_activities
        )
        
        self.investing_cash_flow = (
            -self.capital_expenditures - self.acquisitions + self.asset_sales -
            self.investment_purchases + self.investment_sales + self.other_investing_activities
        )
        
        self.financing_cash_flow = (
            self.debt_issuance - self.debt_repayment + self.equity_issuance -
            self.share_repurchases - self.dividends_paid + self.other_financing_activities
        )
        
        self.net_cash_flow = (
            self.operating_cash_flow + self.investing_cash_flow + self.financing_cash_flow
        )
        
        self.ending_cash = self.beginning_cash + self.net_cash_flow
        
        # Calculate free cash flow
        self.free_cash_flow = self.operating_cash_flow - self.capital_expenditures
        self.levered_free_cash_flow = self.free_cash_flow

@register_model
class FinancialRatio(EnhancedBaseModel):
    """Calculated financial ratios"""
    __tablename__ = 'financial_ratios'
    
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    financial_statement_id = Column(Integer, ForeignKey('financial_statements.id'), nullable=False)
    
    # Calculation metadata
    calculation_date = Column(DateTime, default=func.now(), nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Liquidity ratios
    current_ratio = Column(Numeric(10, 4))
    quick_ratio = Column(Numeric(10, 4))
    cash_ratio = Column(Numeric(10, 4))
    working_capital_ratio = Column(Numeric(10, 4))
    
    # Efficiency ratios
    asset_turnover = Column(Numeric(10, 4))
    inventory_turnover = Column(Numeric(10, 4))
    receivables_turnover = Column(Numeric(10, 4))
    payables_turnover = Column(Numeric(10, 4))
    
    # Leverage ratios
    debt_to_equity = Column(Numeric(10, 4))
    debt_to_assets = Column(Numeric(10, 4))
    equity_ratio = Column(Numeric(10, 4))
    interest_coverage = Column(Numeric(10, 4))
    debt_service_coverage = Column(Numeric(10, 4))
    
    # Profitability ratios
    gross_margin = Column(Numeric(10, 4))
    operating_margin = Column(Numeric(10, 4))
    net_margin = Column(Numeric(10, 4))
    roa = Column(Numeric(10, 4))  # Return on Assets
    roe = Column(Numeric(10, 4))  # Return on Equity
    roic = Column(Numeric(10, 4))  # Return on Invested Capital
    
    # Market ratios (if applicable)
    price_to_earnings = Column(Numeric(10, 4))
    price_to_book = Column(Numeric(10, 4))
    price_to_sales = Column(Numeric(10, 4))
    ev_to_ebitda = Column(Numeric(10, 4))
    
    # Cash flow ratios
    operating_cash_flow_ratio = Column(Numeric(10, 4))
    free_cash_flow_yield = Column(Numeric(10, 4))
    cash_conversion_cycle = Column(Numeric(10, 4))
    
    # Growth ratios (year-over-year)
    revenue_growth = Column(Numeric(10, 4))
    earnings_growth = Column(Numeric(10, 4))
    asset_growth = Column(Numeric(10, 4))
    
    # Quality scores
    calculation_quality_score = Column(Float)  # 0-100
    data_completeness = Column(Float)  # 0-100
    
    # Relationships
    company = relationship("Company")
    financial_statement = relationship("FinancialStatement")
    
    __table_args__ = (
        Index('idx_financial_ratio_company', 'company_id'),
        Index('idx_financial_ratio_period', 'period_end'),
    )

@register_model
class FinancialAnalysis(EnhancedBaseModel):
    """Comprehensive financial analysis results"""
    __tablename__ = 'financial_analyses'
    
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    financial_statement_id = Column(Integer, ForeignKey('financial_statements.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Analysis metadata
    analysis_type = Column(String(50), nullable=False)  # comprehensive, quick, custom
    analysis_date = Column(DateTime, default=func.now(), nullable=False)
    
    # Overall scores
    financial_health_score = Column(Float)  # 0-100
    liquidity_score = Column(Float)  # 0-100
    profitability_score = Column(Float)  # 0-100
    efficiency_score = Column(Float)  # 0-100
    leverage_score = Column(Float)  # 0-100
    
    # Analysis results (stored as JSON)
    ratio_analysis = Column(JSON)
    trend_analysis = Column(JSON)
    peer_comparison = Column(JSON)
    industry_benchmarks = Column(JSON)
    
    # Key findings
    strengths = Column(JSON)  # Array of strength indicators
    weaknesses = Column(JSON)  # Array of weakness indicators
    recommendations = Column(JSON)  # Array of recommendations
    risk_factors = Column(JSON)  # Array of identified risks
    
    # Executive summary
    executive_summary = Column(Text)
    key_insights = Column(JSON)
    
    # Confidence and quality metrics
    analysis_confidence = Column(Float)  # 0-100
    data_quality_score = Column(Float)  # 0-100
    
    # Relationships
    company = relationship("Company")
    financial_statement = relationship("FinancialStatement", back_populates="financial_analyses")
    user = relationship("User")
    
    __table_args__ = (
        CheckConstraint('analysis_type IN ("comprehensive", "quick", "custom")',
                       name='valid_analysis_type'),
        Index('idx_financial_analysis_company', 'company_id'),
        Index('idx_financial_analysis_date', 'analysis_date'),
    )

@register_model
class ValuationModel(EnhancedBaseModel):
    """Company valuation models and results"""
    __tablename__ = 'valuation_models'
    
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Model metadata
    model_type = Column(String(50), nullable=False)  # dcf, comparables, precedent_transactions
    valuation_date = Column(DateTime, default=func.now(), nullable=False)
    base_date = Column(DateTime, nullable=False)  # Date of financial data used
    
    # Input assumptions (stored as JSON)
    assumptions = Column(JSON, nullable=False)
    
    # Valuation results
    enterprise_value = Column(Numeric(15, 2))
    equity_value = Column(Numeric(15, 2))
    per_share_value = Column(Numeric(10, 4))
    
    # Sensitivity analysis
    sensitivity_analysis = Column(JSON)
    scenario_analysis = Column(JSON)
    
    # Model details
    model_details = Column(JSON)  # Detailed calculations and intermediate results
    
    # Quality metrics
    model_confidence = Column(Float)  # 0-100
    assumption_confidence = Column(Float)  # 0-100
    
    # Relationships
    company = relationship("Company")
    user = relationship("User")
    
    __table_args__ = (
        CheckConstraint('model_type IN ("dcf", "comparables", "precedent_transactions", "asset_based")',
                       name='valid_model_type'),
        Index('idx_valuation_company', 'company_id'),
        Index('idx_valuation_date', 'valuation_date'),
    )

@register_model
class TrendAnalysis(EnhancedBaseModel):
    """Historical trend analysis for financial metrics"""
    __tablename__ = 'trend_analyses'
    
    company_id = Column(Integer, ForeignKey('companies.id'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Analysis metadata
    analysis_date = Column(DateTime, default=func.now(), nullable=False)
    analysis_period_start = Column(DateTime, nullable=False)
    analysis_period_end = Column(DateTime, nullable=False)
    
    # Trend data (stored as JSON)
    revenue_trends = Column(JSON)
    profitability_trends = Column(JSON)
    liquidity_trends = Column(JSON)
    leverage_trends = Column(JSON)
    efficiency_trends = Column(JSON)
    
    # Forecasting results
    revenue_forecast = Column(JSON)
    earnings_forecast = Column(JSON)
    cash_flow_forecast = Column(JSON)
    
    # Trend indicators
    overall_trend_direction = Column(String(20))  # improving, declining, stable
    trend_strength = Column(Float)  # 0-100
    forecast_confidence = Column(Float)  # 0-100
    
    # Key insights
    trend_insights = Column(JSON)
    forecast_assumptions = Column(JSON)
    
    # Relationships
    company = relationship("Company")
    user = relationship("User")
    
    __table_args__ = (
        CheckConstraint('overall_trend_direction IN ("improving", "declining", "stable", "volatile")',
                       name='valid_trend_direction'),
        Index('idx_trend_analysis_company', 'company_id'),
        Index('idx_trend_analysis_period', 'analysis_period_end'),
    )
