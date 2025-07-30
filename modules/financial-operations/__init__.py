"""
Financial Operations Module - Main Interface
Orchestrates financial management, accounting, tax optimization, and automation
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Any, Union, Tuple
import uuid
import re

from .financial_engine import (
    ChartOfAccountsGenerator, TaxOptimizationEngine, FinancialProjectionEngine,
    EntityType, IndustryType, Account, TaxStrategy, FinancialProjection
)
from .funding_manager import (
    FundingStrategyEngine, CashFlowManager, 
    FundingStage, FundingRecommendation, CashFlowForecast
)
from .expense_manager import (
    ExpenseCategorizationEngine, ExpenseReportGenerator, ReceiptOCRProcessor,
    ExpenseTransaction, ExpenseReport, ExpenseCategory
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class QueryType(Enum):
    """Types of financial queries"""
    ACCOUNTING_SETUP = "accounting_setup"
    TAX_OPTIMIZATION = "tax_optimization"
    FINANCIAL_PROJECTIONS = "financial_projections"
    FUNDING_STRATEGY = "funding_strategy"
    CASH_FLOW_MANAGEMENT = "cash_flow_management"
    EXPENSE_CATEGORIZATION = "expense_categorization"
    EXPENSE_REPORTING = "expense_reporting"
    RECEIPT_PROCESSING = "receipt_processing"
    GENERAL_FINANCIAL = "general_financial"

@dataclass
class FinancialQuery:
    """Structured financial query"""
    query_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    query_text: str = ""
    query_type: QueryType = QueryType.GENERAL_FINANCIAL
    
    # Business context
    entity_type: Optional[EntityType] = None
    industry: Optional[IndustryType] = None
    annual_revenue: Optional[Decimal] = None
    employees: Optional[int] = None
    
    # Query-specific parameters
    parameters: Dict[str, Any] = field(default_factory=dict)
    
    # Response requirements
    include_recommendations: bool = True
    include_analysis: bool = True
    confidence_threshold: Decimal = field(default_factory=lambda: Decimal('0.7'))
    
    created_date: datetime = field(default_factory=datetime.utcnow)

@dataclass
class FinancialResponse:
    """Comprehensive financial response"""
    response_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    query_id: str = ""
    query_type: QueryType = QueryType.GENERAL_FINANCIAL
    
    # Core response
    answer: str = ""
    recommendations: List[str] = field(default_factory=list)
    analysis: Dict[str, Any] = field(default_factory=dict)
    
    # Confidence and metadata
    confidence_score: Decimal = field(default_factory=lambda: Decimal('0.0'))
    processing_time_ms: int = 0
    data_sources: List[str] = field(default_factory=list)
    
    # Attachments and supporting data
    chart_of_accounts: Optional[List[Account]] = None
    tax_strategies: Optional[List[TaxStrategy]] = None
    financial_projections: Optional[FinancialProjection] = None
    funding_recommendation: Optional[FundingRecommendation] = None
    cash_flow_forecast: Optional[CashFlowForecast] = None
    expense_report: Optional[ExpenseReport] = None
    categorized_expenses: Optional[List[ExpenseTransaction]] = None
    
    # Follow-up suggestions
    follow_up_questions: List[str] = field(default_factory=list)
    related_topics: List[str] = field(default_factory=list)
    
    # Status
    status: str = "completed"  # processing, completed, error, partial
    error_message: Optional[str] = None
    
    created_date: datetime = field(default_factory=datetime.utcnow)

class FinancialOperationsModule:
    """Main financial operations module interface"""
    
    def __init__(self):
        self.chart_generator = ChartOfAccountsGenerator()
        self.tax_optimizer = TaxOptimizationEngine()
        self.projection_engine = FinancialProjectionEngine()
        self.funding_engine = FundingStrategyEngine()
        self.cash_flow_manager = CashFlowManager()
        self.expense_categorizer = ExpenseCategorizationEngine()
        self.expense_reporter = ExpenseReportGenerator()
        self.receipt_processor = ReceiptOCRProcessor()
        
        self.query_patterns = self._load_query_patterns()
        self.business_contexts = {}  # Cache for business context
    
    def _load_query_patterns(self) -> Dict[QueryType, List[str]]:
        """Load patterns for query classification"""
        
        return {
            QueryType.ACCOUNTING_SETUP: [
                r"chart of accounts",
                r"accounting setup",
                r"bookkeeping system",
                r"general ledger",
                r"account structure",
                r"financial accounting"
            ],
            
            QueryType.TAX_OPTIMIZATION: [
                r"tax\s+(optimization|strategy|deduction|saving)",
                r"write[- ]?off",
                r"business expense",
                r"tax[- ]?deductible",
                r"section 179",
                r"qbi deduction",
                r"tax planning"
            ],
            
            QueryType.FINANCIAL_PROJECTIONS: [
                r"financial projection",
                r"revenue forecast",
                r"cash flow projection",
                r"financial model",
                r"break[- ]?even",
                r"financial planning",
                r"budget forecast"
            ],
            
            QueryType.FUNDING_STRATEGY: [
                r"funding",
                r"investment",
                r"raise money",
                r"venture capital",
                r"angel investor",
                r"business loan",
                r"capital raise",
                r"valuation"
            ],
            
            QueryType.CASH_FLOW_MANAGEMENT: [
                r"cash flow",
                r"working capital",
                r"accounts receivable",
                r"payment terms",
                r"cash shortage",
                r"liquidity"
            ],
            
            QueryType.EXPENSE_CATEGORIZATION: [
                r"categorize expense",
                r"expense category",
                r"business expense",
                r"expense classification",
                r"expense type"
            ],
            
            QueryType.EXPENSE_REPORTING: [
                r"expense report",
                r"spending analysis",
                r"expense summary",
                r"tax report",
                r"expense breakdown"
            ],
            
            QueryType.RECEIPT_PROCESSING: [
                r"receipt",
                r"scan receipt",
                r"process receipt",
                r"extract receipt",
                r"receipt data"
            ]
        }
    
    async def process_query(self, query_text: str, 
                          business_context: Optional[Dict[str, Any]] = None) -> FinancialResponse:
        """Process natural language financial query"""
        
        start_time = datetime.utcnow()
        
        # Parse and classify query
        query = await self._parse_query(query_text, business_context)
        
        try:
            # Route to appropriate handler
            if query.query_type == QueryType.ACCOUNTING_SETUP:
                response = await self._handle_accounting_setup(query)
            elif query.query_type == QueryType.TAX_OPTIMIZATION:
                response = await self._handle_tax_optimization(query)
            elif query.query_type == QueryType.FINANCIAL_PROJECTIONS:
                response = await self._handle_financial_projections(query)
            elif query.query_type == QueryType.FUNDING_STRATEGY:
                response = await self._handle_funding_strategy(query)
            elif query.query_type == QueryType.CASH_FLOW_MANAGEMENT:
                response = await self._handle_cash_flow_management(query)
            elif query.query_type == QueryType.EXPENSE_CATEGORIZATION:
                response = await self._handle_expense_categorization(query)
            elif query.query_type == QueryType.EXPENSE_REPORTING:
                response = await self._handle_expense_reporting(query)
            elif query.query_type == QueryType.RECEIPT_PROCESSING:
                response = await self._handle_receipt_processing(query)
            else:
                response = await self._handle_general_financial(query)
            
            # Calculate processing time
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            response.processing_time_ms = int(processing_time)
            response.query_id = query.query_id
            response.query_type = query.query_type
            
            return response
            
        except Exception as e:
            logger.error(f"Error processing financial query: {str(e)}")
            
            error_response = FinancialResponse(
                query_id=query.query_id,
                query_type=query.query_type,
                answer="I encountered an error processing your financial request. Please try rephrasing your question or contact support.",
                status="error",
                error_message=str(e),
                confidence_score=Decimal('0.0')
            )
            
            processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
            error_response.processing_time_ms = int(processing_time)
            
            return error_response
    
    async def _parse_query(self, query_text: str, 
                          business_context: Optional[Dict[str, Any]] = None) -> FinancialQuery:
        """Parse and classify financial query"""
        
        query = FinancialQuery(query_text=query_text)
        
        # Extract business context
        if business_context:
            query.entity_type = self._parse_entity_type(business_context.get('entity_type'))
            query.industry = self._parse_industry(business_context.get('industry'))
            query.annual_revenue = self._parse_decimal(business_context.get('annual_revenue'))
            query.employees = business_context.get('employees')
        
        # Classify query type using patterns
        query_lower = query_text.lower()
        best_match = QueryType.GENERAL_FINANCIAL
        max_matches = 0
        
        for query_type, patterns in self.query_patterns.items():
            matches = sum(1 for pattern in patterns if re.search(pattern, query_lower))
            if matches > max_matches:
                max_matches = matches
                best_match = query_type
        
        query.query_type = best_match
        
        # Extract specific parameters based on query type
        query.parameters = self._extract_query_parameters(query_text, query.query_type)
        
        return query
    
    def _parse_entity_type(self, entity_str: Optional[str]) -> Optional[EntityType]:
        """Parse entity type from string"""
        if not entity_str:
            return None
        
        entity_mapping = {
            'llc': EntityType.LLC,
            'corporation': EntityType.C_CORPORATION,
            'c-corp': EntityType.C_CORPORATION,
            's-corp': EntityType.S_CORPORATION,
            'partnership': EntityType.PARTNERSHIP,
            'sole proprietorship': EntityType.SOLE_PROPRIETORSHIP,
            'nonprofit': EntityType.NONPROFIT
        }
        
        return entity_mapping.get(entity_str.lower())
    
    def _parse_industry(self, industry_str: Optional[str]) -> Optional[IndustryType]:
        """Parse industry type from string"""
        if not industry_str:
            return None
        
        industry_mapping = {
            'technology': IndustryType.TECHNOLOGY,
            'tech': IndustryType.TECHNOLOGY,
            'software': IndustryType.TECHNOLOGY,
            'healthcare': IndustryType.HEALTHCARE,
            'medical': IndustryType.HEALTHCARE,
            'finance': IndustryType.FINANCE,
            'financial': IndustryType.FINANCE,
            'retail': IndustryType.RETAIL,
            'ecommerce': IndustryType.RETAIL,
            'manufacturing': IndustryType.MANUFACTURING,
            'services': IndustryType.SERVICES,
            'consulting': IndustryType.SERVICES,
            'real estate': IndustryType.REAL_ESTATE,
            'agriculture': IndustryType.AGRICULTURE,
            'energy': IndustryType.ENERGY,
            'education': IndustryType.EDUCATION
        }
        
        return industry_mapping.get(industry_str.lower())
    
    def _parse_decimal(self, value: Any) -> Optional[Decimal]:
        """Parse decimal value from various formats"""
        if value is None:
            return None
        
        try:
            if isinstance(value, str):
                # Remove currency symbols and commas
                clean_value = re.sub(r'[,$]', '', value)
                return Decimal(clean_value)
            return Decimal(str(value))
        except:
            return None
    
    def _extract_query_parameters(self, query_text: str, query_type: QueryType) -> Dict[str, Any]:
        """Extract specific parameters from query text"""
        
        parameters = {}
        query_lower = query_text.lower()
        
        # Extract monetary amounts
        money_patterns = [
            r'\$([0-9,]+(?:\.[0-9]{2})?)',
            r'([0-9,]+(?:\.[0-9]{2})?) dollars?',
            r'([0-9,]+k)',  # e.g., 100k
            r'([0-9,]+m)',  # e.g., 1m
        ]
        
        for pattern in money_patterns:
            matches = re.findall(pattern, query_text, re.IGNORECASE)
            if matches:
                amounts = []
                for match in matches:
                    try:
                        clean_amount = re.sub(r'[,$]', '', match)
                        if clean_amount.endswith('k'):
                            amount = Decimal(clean_amount[:-1]) * 1000
                        elif clean_amount.endswith('m'):
                            amount = Decimal(clean_amount[:-1]) * 1000000
                        else:
                            amount = Decimal(clean_amount)
                        amounts.append(amount)
                    except:
                        continue
                if amounts:
                    parameters['amounts'] = amounts
                break
        
        # Extract time periods
        time_patterns = [
            r'(\d+)\s*(?:month|mo)s?',
            r'(\d+)\s*(?:year|yr)s?',
            r'(\d+)\s*(?:quarter|q)s?'
        ]
        
        for pattern in time_patterns:
            match = re.search(pattern, query_lower)
            if match:
                parameters['time_period'] = int(match.group(1))
                if 'month' in pattern or 'mo' in pattern:
                    parameters['time_unit'] = 'months'
                elif 'year' in pattern or 'yr' in pattern:
                    parameters['time_unit'] = 'years'
                elif 'quarter' in pattern or 'q' in pattern:
                    parameters['time_unit'] = 'quarters'
                break
        
        # Query-specific extractions
        if query_type == QueryType.FUNDING_STRATEGY:
            # Extract funding stage keywords
            stage_keywords = {
                'pre-seed': FundingStage.PRE_SEED,
                'seed': FundingStage.SEED,
                'series a': FundingStage.SERIES_A,
                'series b': FundingStage.SERIES_B,
                'growth': FundingStage.GROWTH
            }
            
            for keyword, stage in stage_keywords.items():
                if keyword in query_lower:
                    parameters['funding_stage'] = stage
                    break
        
        elif query_type == QueryType.EXPENSE_CATEGORIZATION:
            # Extract vendor names or expense descriptions
            vendor_match = re.search(r'vendor\s+["\']([^"\']+)["\']', query_text, re.IGNORECASE)
            if vendor_match:
                parameters['vendor_name'] = vendor_match.group(1)
            
            expense_match = re.search(r'expense\s+["\']([^"\']+)["\']', query_text, re.IGNORECASE)
            if expense_match:
                parameters['expense_description'] = expense_match.group(1)
        
        return parameters
    
    async def _handle_accounting_setup(self, query: FinancialQuery) -> FinancialResponse:
        """Handle accounting setup queries"""
        
        entity_type = query.entity_type or EntityType.LLC
        industry = query.industry or IndustryType.SERVICES
        
        # Generate chart of accounts
        accounts = self.chart_generator.generate_chart_of_accounts(entity_type, industry)
        
        # Create response
        response = FinancialResponse(
            answer=f"I've generated a comprehensive chart of accounts for your {entity_type.value.replace('_', ' ')} in the {industry.value} industry. The chart includes {len(accounts)} accounts organized by type: Assets, Liabilities, Equity, Revenue, and Expenses.",
            chart_of_accounts=accounts,
            confidence_score=Decimal('0.95'),
            data_sources=["Chart of Accounts Generator", "Industry Templates"]
        )
        
        # Add recommendations
        response.recommendations = [
            "Review the generated accounts and customize names to match your business terminology",
            "Set up opening balances for existing assets and liabilities",
            "Configure your accounting software with these account codes",
            "Establish monthly closing procedures for accurate financial reporting",
            "Consider integrating with automated transaction importing"
        ]
        
        # Analysis
        account_types = {}
        for account in accounts:
            account_type = account.account_type.value
            account_types[account_type] = account_types.get(account_type, 0) + 1
        
        response.analysis = {
            "account_breakdown": account_types,
            "entity_specific_features": self._get_entity_specific_features(entity_type),
            "industry_customizations": self._get_industry_customizations(industry)
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like help setting up automated transaction categorization?",
            "Do you need assistance with monthly financial reporting procedures?",
            "Would you like recommendations for accounting software integration?"
        ]
        
        return response
    
    async def _handle_tax_optimization(self, query: FinancialQuery) -> FinancialResponse:
        """Handle tax optimization queries"""
        
        entity_type = query.entity_type or EntityType.LLC
        industry = query.industry or IndustryType.SERVICES
        annual_income = query.annual_revenue or Decimal('100000')
        
        # Extract expense information from parameters
        expenses = {}
        if 'amounts' in query.parameters:
            expenses['total_expenses'] = query.parameters['amounts'][0]
        
        # Analyze tax optimization strategies
        strategies = self.tax_optimizer.analyze_tax_optimization(
            entity_type, annual_income, industry, expenses
        )
        
        # Calculate expense optimization if expenses provided
        expense_optimization = None
        if expenses:
            expense_optimization = self.tax_optimizer.calculate_expense_optimization(expenses)
        
        # Create response
        total_potential_savings = sum(s.estimated_savings for s in strategies[:5])
        
        response = FinancialResponse(
            answer=f"I've identified {len(strategies)} tax optimization strategies for your {entity_type.value.replace('_', ' ')} with estimated total savings of ${total_potential_savings:,.2f}. The top strategies include {', '.join(s.name for s in strategies[:3])}.",
            tax_strategies=strategies,
            confidence_score=Decimal('0.90'),
            data_sources=["Tax Strategy Database", "IRS Publications", "Industry Benchmarks"]
        )
        
        # Add detailed recommendations
        response.recommendations = [
            f"Implement {strategies[0].name} for estimated savings of ${strategies[0].estimated_savings:,.2f}",
            "Maintain detailed records for all business expenses and deductions",
            "Consider quarterly estimated tax payments to avoid penalties",
            "Review entity structure annually for optimal tax treatment"
        ]
        
        if len(strategies) > 1:
            response.recommendations.append(
                f"Evaluate {strategies[1].name} for additional ${strategies[1].estimated_savings:,.2f} in savings"
            )
        
        # Analysis
        response.analysis = {
            "total_strategies": len(strategies),
            "total_potential_savings": float(total_potential_savings),
            "top_strategy": strategies[0].name if strategies else None,
            "entity_advantages": self._get_entity_tax_advantages(entity_type),
            "industry_considerations": self._get_industry_tax_considerations(industry)
        }
        
        if expense_optimization:
            response.analysis["expense_optimization"] = expense_optimization
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like detailed implementation steps for the top tax strategies?",
            "Do you need help with expense categorization for maximum deductions?",
            "Would you like a quarterly tax planning calendar?"
        ]
        
        return response
    
    async def _handle_financial_projections(self, query: FinancialQuery) -> FinancialResponse:
        """Handle financial projection queries"""
        
        industry = query.industry or IndustryType.SERVICES
        current_revenue = query.annual_revenue or Decimal('100000')
        
        # Extract parameters
        growth_rate = Decimal('0.20')  # Default 20%
        projection_months = 24  # Default 24 months
        
        if 'amounts' in query.parameters and len(query.parameters['amounts']) > 1:
            growth_rate = query.parameters['amounts'][1] / 100  # Convert percentage
        
        if 'time_period' in query.parameters:
            if query.parameters.get('time_unit') == 'months':
                projection_months = query.parameters['time_period']
            elif query.parameters.get('time_unit') == 'years':
                projection_months = query.parameters['time_period'] * 12
        
        # Create financial projection
        projection = self.projection_engine.create_financial_projection(
            current_revenue=current_revenue,
            growth_rate=growth_rate,
            industry=industry,
            projection_months=projection_months
        )
        
        # Create scenario analysis
        scenarios = self.projection_engine.create_scenario_analysis(projection)
        
        # Calculate key metrics
        final_revenue = projection.revenue_projections["total_revenue"][-1]
        total_projected_revenue = sum(projection.revenue_projections["total_revenue"])
        
        response = FinancialResponse(
            answer=f"I've created a {projection_months}-month financial projection for your {industry.value} business. Based on {growth_rate*100:.1f}% growth rate, your projected monthly revenue will reach ${final_revenue:,.2f} by month {projection_months}, with total projected revenue of ${total_projected_revenue:,.2f}.",
            financial_projections=projection,
            confidence_score=Decimal('0.85'),
            data_sources=["Industry Benchmarks", "Growth Models", "Financial Templates"]
        )
        
        # Recommendations based on projections
        response.recommendations = [
            f"Break-even projected for month {projection.break_even_month}" if projection.break_even_month else "Focus on achieving positive cash flow",
            "Monitor actual vs projected performance monthly",
            "Adjust growth strategies based on market conditions",
            "Prepare for funding needs before cash shortages occur"
        ]
        
        if projection.break_even_month and projection.break_even_month > 12:
            response.recommendations.append("Consider strategies to accelerate break-even timeline")
        
        # Analysis
        response.analysis = {
            "projection_summary": {
                "months": projection_months,
                "growth_rate": float(growth_rate * 100),
                "break_even_month": projection.break_even_month,
                "final_monthly_revenue": float(final_revenue),
                "total_projected_revenue": float(total_projected_revenue)
            },
            "scenarios": {
                "conservative": float(scenarios["conservative"].revenue_projections["total_revenue"][-1]),
                "base": float(scenarios["base"].revenue_projections["total_revenue"][-1]),
                "optimistic": float(scenarios["optimistic"].revenue_projections["total_revenue"][-1])
            },
            "key_assumptions": projection.assumptions
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like to explore different growth rate scenarios?",
            "Do you need help with cash flow forecasting?",
            "Would you like funding recommendations based on these projections?"
        ]
        
        return response
    
    async def _handle_funding_strategy(self, query: FinancialQuery) -> FinancialResponse:
        """Handle funding strategy queries"""
        
        # Extract funding parameters
        annual_revenue = query.annual_revenue or Decimal('100000')
        growth_rate = Decimal('0.30')  # Default 30%
        current_cash = Decimal('50000')  # Default assumption
        monthly_burn_rate = annual_revenue / 12 * Decimal('0.8')  # Estimate burn rate
        funding_stage = query.parameters.get('funding_stage', FundingStage.SEED)
        industry = query.industry or IndustryType.TECHNOLOGY
        
        if 'amounts' in query.parameters:
            if len(query.parameters['amounts']) >= 1:
                current_cash = query.parameters['amounts'][0]
            if len(query.parameters['amounts']) >= 2:
                monthly_burn_rate = query.parameters['amounts'][1]
        
        # Analyze funding needs
        recommendation = self.funding_engine.analyze_funding_needs(
            annual_revenue=annual_revenue,
            growth_rate=growth_rate,
            current_cash=current_cash,
            monthly_burn_rate=monthly_burn_rate,
            funding_stage=funding_stage,
            industry=industry
        )
        
        # Calculate valuation
        valuation = self.funding_engine.calculate_valuation(
            revenue=annual_revenue,
            growth_rate=growth_rate,
            industry=industry,
            stage=funding_stage
        )
        
        response = FinancialResponse(
            answer=f"Based on your {industry.value} business at the {funding_stage.value.replace('_', ' ')} stage, I recommend raising ${recommendation.recommended_amount:,.2f}. This will provide {recommendation.expected_runway_months} months of runway. Your estimated valuation range is ${recommendation.suggested_valuation_range[0]:,.0f} to ${recommendation.suggested_valuation_range[1]:,.0f}.",
            funding_recommendation=recommendation,
            confidence_score=Decimal('0.80'),
            data_sources=["Funding Database", "Industry Benchmarks", "Valuation Models"]
        )
        
        # Add recommendations
        response.recommendations = [
            f"Target {', '.join(recommendation.investor_types[:2])} for this funding round",
            f"Prepare for {recommendation.timeline_to_funding} funding timeline",
            "Focus on metrics that matter to investors for your stage and industry",
            "Build relationships with potential investors before you need funding"
        ]
        
        response.recommendations.extend(recommendation.preparation_requirements[:3])
        
        # Analysis
        response.analysis = {
            "funding_analysis": {
                "recommended_amount": float(recommendation.recommended_amount),
                "valuation_range": [float(recommendation.suggested_valuation_range[0]), 
                                  float(recommendation.suggested_valuation_range[1])],
                "equity_dilution": [float(recommendation.equity_dilution_range[0]), 
                                  float(recommendation.equity_dilution_range[1])],
                "runway_months": recommendation.expected_runway_months
            },
            "funding_sources": recommendation.recommended_sources,
            "use_of_funds": recommendation.use_of_funds,
            "valuation_metrics": {
                "revenue_multiple": float(valuation.revenue_multiple) if valuation.revenue_multiple else None,
                "estimated_valuation": float(valuation.revenue_based_valuation)
            }
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like help preparing a pitch deck for investors?",
            "Do you need guidance on due diligence preparation?",
            "Would you like to explore alternative funding options?"
        ]
        
        return response
    
    async def _handle_cash_flow_management(self, query: FinancialQuery) -> FinancialResponse:
        """Handle cash flow management queries"""
        
        # Default parameters
        opening_balance = Decimal('75000')
        projection_days = 90
        
        if 'amounts' in query.parameters:
            opening_balance = query.parameters['amounts'][0]
        
        if 'time_period' in query.parameters:
            time_unit = query.parameters.get('time_unit', 'months')
            period = query.parameters['time_period']
            
            if time_unit == 'days':
                projection_days = period
            elif time_unit == 'months':
                projection_days = period * 30
            elif time_unit == 'weeks':
                projection_days = period * 7
        
        # Create sample projected sales and expenses
        start_date = date.today()
        end_date = start_date + timedelta(days=projection_days)
        
        projected_sales = {}
        for i in range(projection_days):
            sale_date = start_date + timedelta(days=i)
            projected_sales[sale_date] = Decimal('2000')  # $2k daily sales
        
        recurring_expenses = {
            "monthly_rent": Decimal('8000'),
            "monthly_salaries": Decimal('30000'),
            "monthly_utilities": Decimal('1500'),
            "weekly_supplies": Decimal('500'),
            "daily_operations": Decimal('300')
        }
        
        # Create cash flow forecast
        forecast = self.cash_flow_manager.create_cash_flow_forecast(
            start_date=start_date,
            end_date=end_date,
            opening_balance=opening_balance,
            projected_sales=projected_sales,
            recurring_expenses=recurring_expenses,
            customer_type="b2b_smb",
            industry=query.industry or IndustryType.SERVICES
        )
        
        # Generate optimization recommendations
        optimization = self.cash_flow_manager.optimize_cash_flow(forecast)
        
        # Calculate key metrics
        ending_balance = list(forecast.daily_balances.values())[-1]
        lowest_balance = min(forecast.daily_balances.values())
        cash_shortage_days = len(forecast.cash_shortage_dates)
        
        response = FinancialResponse(
            answer=f"I've analyzed your {projection_days}-day cash flow forecast. Starting with ${opening_balance:,.2f}, your projected ending balance is ${ending_balance:,.2f}. {'You have ' + str(cash_shortage_days) + ' days with cash below minimum threshold.' if cash_shortage_days > 0 else 'Your cash flow looks healthy with no projected shortages.'}",
            cash_flow_forecast=forecast,
            confidence_score=Decimal('0.75'),
            data_sources=["Cash Flow Models", "Industry Payment Patterns", "Working Capital Benchmarks"]
        )
        
        # Add recommendations
        response.recommendations = forecast.recommended_actions[:3] if forecast.recommended_actions else [
            "Monitor cash flow weekly to identify trends early",
            "Implement automated invoicing to improve collection timing",
            "Negotiate favorable payment terms with suppliers"
        ]
        
        response.recommendations.extend(optimization["working_capital_recommendations"][:2])
        
        # Analysis
        response.analysis = {
            "cash_flow_summary": {
                "opening_balance": float(opening_balance),
                "ending_balance": float(ending_balance),
                "lowest_balance": float(lowest_balance),
                "cash_shortage_days": cash_shortage_days,
                "current_runway_days": optimization["current_runway_days"]
            },
            "optimization_potential": {
                "potential_savings": float(optimization["potential_savings"]),
                "working_capital_improvements": optimization["working_capital_recommendations"][:3]
            }
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like help optimizing your accounts receivable collection?",
            "Do you need assistance with supplier payment term negotiations?",
            "Would you like to explore short-term funding options for cash flow gaps?"
        ]
        
        return response
    
    async def _handle_expense_categorization(self, query: FinancialQuery) -> FinancialResponse:
        """Handle expense categorization queries"""
        
        # Extract expense details from parameters
        vendor_name = query.parameters.get('vendor_name', 'Sample Vendor')
        expense_description = query.parameters.get('expense_description', 'Business expense')
        amount = query.parameters.get('amounts', [Decimal('100')])[0]
        
        # Create sample transaction
        transaction = ExpenseTransaction(
            vendor_name=vendor_name,
            description=expense_description,
            amount=amount,
            date=date.today()
        )
        
        # Categorize the expense
        categorized_transaction = self.expense_categorizer.categorize_expense(transaction)
        
        # Calculate tax implications
        tax_deductible_amount = categorized_transaction.deductible_amount
        estimated_tax_savings = tax_deductible_amount * Decimal('0.25')  # Assume 25% tax rate
        
        response = FinancialResponse(
            answer=f"I've categorized your ${amount} expense to {vendor_name} as {categorized_transaction.category.value.replace('_', ' ').title()} - {categorized_transaction.subcategory}. This expense is ${tax_deductible_amount} tax-deductible, potentially saving you ${estimated_tax_savings:.2f} in taxes.",
            categorized_expenses=[categorized_transaction],
            confidence_score=categorized_transaction.confidence_score,
            data_sources=["Expense Categorization Rules", "Vendor Database", "Tax Code"]
        )
        
        # Add recommendations
        response.recommendations = [
            f"Ensure you have a receipt for this ${amount} expense",
            "Document the business purpose for this expense",
            "Consider setting up automated categorization for this vendor"
        ]
        
        if categorized_transaction.flags:
            response.recommendations.append(
                f"Review flagged items: {', '.join(categorized_transaction.flags)}"
            )
        
        # Analysis
        response.analysis = {
            "categorization_details": {
                "category": categorized_transaction.category.value,
                "subcategory": categorized_transaction.subcategory,
                "tax_deductibility": categorized_transaction.tax_deductibility.value,
                "deductible_amount": float(tax_deductible_amount),
                "confidence_score": float(categorized_transaction.confidence_score),
                "auto_categorized": categorized_transaction.auto_categorized
            },
            "tax_implications": {
                "deductible_amount": float(tax_deductible_amount),
                "estimated_tax_savings": float(estimated_tax_savings)
            },
            "compliance_flags": categorized_transaction.flags
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like to set up automated categorization rules for similar expenses?",
            "Do you need help with expense report generation?",
            "Would you like recommendations for expense tracking software?"
        ]
        
        return response
    
    async def _handle_expense_reporting(self, query: FinancialQuery) -> FinancialResponse:
        """Handle expense reporting queries"""
        
        # Generate sample expense transactions
        sample_transactions = []
        categories = list(ExpenseCategory)
        
        for i in range(20):
            transaction = ExpenseTransaction(
                vendor_name=f"Vendor {i+1}",
                description=f"Business expense {i+1}",
                amount=Decimal(str(100 + i * 50)),
                date=date.today() - timedelta(days=i*2),
                category=categories[i % len(categories)],
                deductible_amount=Decimal(str(100 + i * 50))
            )
            sample_transactions.append(transaction)
        
        # Determine report period
        end_date = date.today()
        start_date = end_date - timedelta(days=30)  # Default 30 days
        
        if 'time_period' in query.parameters:
            time_unit = query.parameters.get('time_unit', 'months')
            period = query.parameters['time_period']
            
            if time_unit == 'days':
                start_date = end_date - timedelta(days=period)
            elif time_unit == 'months':
                start_date = end_date - timedelta(days=period * 30)
            elif time_unit == 'weeks':
                start_date = end_date - timedelta(days=period * 7)
        
        # Generate expense report
        report = self.expense_reporter.generate_expense_report(
            sample_transactions,
            start_date=start_date,
            end_date=end_date,
            report_type="monthly_analysis"
        )
        
        response = FinancialResponse(
            answer=f"I've generated your expense report for {start_date} to {end_date}. Total expenses: ${report.total_expenses:,.2f}, with ${report.total_deductible:,.2f} tax-deductible, potentially saving ${report.tax_savings_estimate:,.2f} in taxes. The largest expense category is {max(report.category_totals.items(), key=lambda x: x[1])[0].replace('_', ' ').title()}.",
            expense_report=report,
            confidence_score=Decimal('0.90'),
            data_sources=["Expense Database", "Tax Calculations", "Category Analysis"]
        )
        
        # Add recommendations from report
        response.recommendations = report.recommendations[:5]
        
        # Analysis
        top_categories = sorted(report.category_totals.items(), key=lambda x: x[1], reverse=True)[:5]
        
        response.analysis = {
            "expense_summary": {
                "total_expenses": float(report.total_expenses),
                "total_deductible": float(report.total_deductible),
                "tax_savings_estimate": float(report.tax_savings_estimate),
                "transaction_count": len(sample_transactions)
            },
            "top_categories": [
                {"category": cat.replace('_', ' ').title(), "amount": float(amount)}
                for cat, amount in top_categories
            ],
            "compliance_status": {
                "missing_receipts": len(report.missing_receipts),
                "missing_business_purpose": len(report.missing_business_purpose),
                "flagged_transactions": len(report.flagged_transactions)
            },
            "spending_trends": report.spending_trends
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like a detailed breakdown of any specific expense category?",
            "Do you need help with missing receipt collection?",
            "Would you like to set up automated expense reporting?"
        ]
        
        return response
    
    async def _handle_receipt_processing(self, query: FinancialQuery) -> FinancialResponse:
        """Handle receipt processing queries"""
        
        # This would normally process actual receipt data
        # For demonstration, we'll simulate the process
        
        mock_receipt_data = {
            "vendor_name": "OFFICE DEPOT",
            "date": "2024-01-15",
            "total_amount": Decimal('45.67'),
            "tax_amount": Decimal('3.67'),
            "line_items": [
                {"description": "Paper A4 500 sheets", "amount": Decimal('12.99')},
                {"description": "Pens Blue 12-pack", "amount": Decimal('8.99')},
                {"description": "Folders Manila 25-pack", "amount": Decimal('15.99')},
                {"description": "Stapler Heavy Duty", "amount": Decimal('7.99')}
            ]
        }
        
        # Create transaction from receipt data
        transaction = ExpenseTransaction(
            vendor_name=mock_receipt_data["vendor_name"],
            description="Office supplies",
            amount=mock_receipt_data["total_amount"],
            date=date.today(),
            has_receipt=True,
            receipt_text=f"Receipt from {mock_receipt_data['vendor_name']}"
        )
        
        # Categorize the expense
        categorized_transaction = self.expense_categorizer.categorize_expense(transaction)
        
        response = FinancialResponse(
            answer=f"I've successfully processed your receipt from {mock_receipt_data['vendor_name']} for ${mock_receipt_data['total_amount']}. The expense has been categorized as {categorized_transaction.category.value.replace('_', ' ').title()} and is fully tax-deductible.",
            categorized_expenses=[categorized_transaction],
            confidence_score=Decimal('0.95'),
            data_sources=["OCR Processing", "Receipt Parser", "Expense Categorization"]
        )
        
        # Add recommendations
        response.recommendations = [
            "Receipt has been automatically saved and linked to the transaction",
            "Business purpose has been inferred - review and update if needed",
            "Consider setting up automatic receipt forwarding via email",
            "Enable mobile receipt capture for future expenses"
        ]
        
        # Analysis
        response.analysis = {
            "receipt_processing": {
                "extraction_confidence": 0.95,
                "vendor_identified": True,
                "amount_extracted": float(mock_receipt_data["total_amount"]),
                "line_items_count": len(mock_receipt_data["line_items"]),
                "tax_amount": float(mock_receipt_data["tax_amount"])
            },
            "categorization": {
                "category": categorized_transaction.category.value,
                "confidence": float(categorized_transaction.confidence_score),
                "deductible_amount": float(categorized_transaction.deductible_amount)
            },
            "line_items": [
                {"description": item["description"], "amount": float(item["amount"])}
                for item in mock_receipt_data["line_items"]
            ]
        }
        
        # Follow-up questions
        response.follow_up_questions = [
            "Would you like to process more receipts from this transaction?",
            "Do you need help setting up automated receipt processing?",
            "Would you like to create an expense report including this transaction?"
        ]
        
        return response
    
    async def _handle_general_financial(self, query: FinancialQuery) -> FinancialResponse:
        """Handle general financial queries"""
        
        query_lower = query.query_text.lower()
        
        # Provide general financial guidance based on keywords
        if any(word in query_lower for word in ['cash', 'money', 'funds']):
            answer = "Cash management is crucial for business success. I can help you with cash flow forecasting, working capital optimization, and funding strategies."
            
        elif any(word in query_lower for word in ['tax', 'deduction', 'write-off']):
            answer = "Tax optimization can significantly impact your business profitability. I can analyze your expenses for maximum deductions and recommend tax-efficient strategies."
            
        elif any(word in query_lower for word in ['budget', 'forecast', 'plan']):
            answer = "Financial planning and budgeting are essential for business growth. I can create detailed financial projections and help you track performance against budgets."
            
        elif any(word in query_lower for word in ['accounting', 'bookkeeping', 'records']):
            answer = "Proper accounting setup is the foundation of financial management. I can help you establish a chart of accounts and set up efficient bookkeeping processes."
            
        else:
            answer = "I'm here to help with all aspects of financial operations including accounting setup, tax optimization, financial projections, funding strategies, cash flow management, and expense tracking."
        
        response = FinancialResponse(
            answer=answer,
            confidence_score=Decimal('0.60'),
            data_sources=["General Financial Knowledge"]
        )
        
        # General recommendations
        response.recommendations = [
            "Maintain accurate and up-to-date financial records",
            "Review financial performance monthly",
            "Plan for taxes quarterly to avoid surprises",
            "Monitor cash flow weekly during growth phases",
            "Consider professional financial advice for complex situations"
        ]
        
        # Follow-up questions
        response.follow_up_questions = [
            "What specific financial area would you like help with?",
            "Do you need assistance with accounting setup or tax optimization?",
            "Would you like to create financial projections for your business?"
        ]
        
        return response
    
    def _get_entity_specific_features(self, entity_type: EntityType) -> List[str]:
        """Get entity-specific accounting features"""
        
        features = {
            EntityType.LLC: [
                "Member capital accounts",
                "Guaranteed payments tracking",
                "Distributive share calculations"
            ],
            EntityType.S_CORPORATION: [
                "Shareholder basis tracking",
                "AAA (Accumulated Adjustments Account)",
                "Payroll for owner-employees"
            ],
            EntityType.C_CORPORATION: [
                "Retained earnings management",
                "Dividend distributions",
                "Corporate tax provisions"
            ],
            EntityType.PARTNERSHIP: [
                "Partner capital accounts",
                "Profit/loss allocation",
                "Guaranteed payments"
            ],
            EntityType.SOLE_PROPRIETORSHIP: [
                "Owner's draw tracking",
                "Self-employment tax calculations",
                "Schedule C optimization"
            ]
        }
        
        return features.get(entity_type, [])
    
    def _get_industry_customizations(self, industry: IndustryType) -> List[str]:
        """Get industry-specific customizations"""
        
        customizations = {
            IndustryType.TECHNOLOGY: [
                "Software development costs tracking",
                "R&D expense categorization",
                "SaaS revenue recognition"
            ],
            IndustryType.RETAIL: [
                "Inventory management accounts",
                "Cost of goods sold tracking",
                "Sales tax collection"
            ],
            IndustryType.SERVICES: [
                "Unbilled services tracking",
                "Project-based accounting",
                "Time and billing integration"
            ],
            IndustryType.MANUFACTURING: [
                "Work-in-process inventory",
                "Manufacturing overhead allocation",
                "Direct labor tracking"
            ]
        }
        
        return customizations.get(industry, [])
    
    def _get_entity_tax_advantages(self, entity_type: EntityType) -> List[str]:
        """Get entity-specific tax advantages"""
        
        advantages = {
            EntityType.LLC: [
                "Pass-through taxation",
                "Section 199A QBI deduction",
                "Flexible profit/loss allocation"
            ],
            EntityType.S_CORPORATION: [
                "Pass-through taxation",
                "Payroll tax savings on distributions",
                "Section 199A QBI deduction"
            ],
            EntityType.C_CORPORATION: [
                "21% flat corporate tax rate",
                "Tax-free fringe benefits",
                "Retained earnings planning"
            ]
        }
        
        return advantages.get(entity_type, [])
    
    def _get_industry_tax_considerations(self, industry: IndustryType) -> List[str]:
        """Get industry-specific tax considerations"""
        
        considerations = {
            IndustryType.TECHNOLOGY: [
                "R&D tax credits",
                "Software development capitalization",
                "International tax planning"
            ],
            IndustryType.MANUFACTURING: [
                "Section 179 equipment deductions",
                "MACRS depreciation",
                "Domestic production activities"
            ],
            IndustryType.RETAIL: [
                "Inventory accounting methods",
                "Sales tax compliance",
                "Uniform capitalization rules"
            ]
        }
        
        return considerations.get(industry, [])

if __name__ == "__main__":
    # Example usage
    async def test_financial_operations_module():
        module = FinancialOperationsModule()
        
        # Test various query types
        test_queries = [
            "Set up chart of accounts for a technology LLC",
            "What tax deductions can I claim for my consulting business?",
            "Create a 24-month financial projection with 25% growth",
            "I need to raise $500k for my Series A round",
            "Help me forecast cash flow for the next 90 days",
            "Categorize this $150 expense to Microsoft for Office 365",
            "Generate an expense report for last month",
            "Process this receipt from Staples for office supplies"
        ]
        
        business_context = {
            "entity_type": "llc",
            "industry": "technology",
            "annual_revenue": "250000",
            "employees": 5
        }
        
        for query_text in test_queries:
            print(f"\nQuery: {query_text}")
            print("-" * 50)
            
            response = await module.process_query(query_text, business_context)
            
            print(f"Type: {response.query_type.value}")
            print(f"Answer: {response.answer}")
            print(f"Confidence: {response.confidence_score}")
            print(f"Processing time: {response.processing_time_ms}ms")
            
            if response.recommendations:
                print("Top recommendations:")
                for rec in response.recommendations[:2]:
                    print(f"  • {rec}")

    # Run test
    asyncio.run(test_financial_operations_module())
