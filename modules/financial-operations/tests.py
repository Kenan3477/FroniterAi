"""
Financial Operations Module Test Suite
Comprehensive testing for all financial management capabilities
"""

import pytest
import asyncio
from datetime import date, datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, patch, AsyncMock
import json

# Import the financial operations module components
from financial_engine import (
    ChartOfAccountsGenerator, TaxOptimizationEngine, FinancialProjectionEngine,
    EntityType, IndustryType, Account, TaxStrategy, AccountType
)
from funding_manager import (
    FundingStrategyEngine, CashFlowManager, 
    FundingStage, FundingRecommendation, CashFlowForecast
)
from expense_manager import (
    ExpenseCategorizationEngine, ExpenseReportGenerator, ReceiptOCRProcessor,
    ExpenseTransaction, ExpenseReport, ExpenseCategory
)
from __init__ import FinancialOperationsModule, FinancialQuery, QueryType

class TestChartOfAccountsGenerator:
    """Test chart of accounts generation"""
    
    def setup_method(self):
        self.generator = ChartOfAccountsGenerator()
    
    def test_generate_basic_chart(self):
        """Test basic chart of accounts generation"""
        accounts = self.generator.generate_chart_of_accounts(
            EntityType.LLC, 
            IndustryType.TECHNOLOGY
        )
        
        assert len(accounts) > 0
        assert any(acc.account_type == AccountType.ASSET for acc in accounts)
        assert any(acc.account_type == AccountType.LIABILITY for acc in accounts)
        assert any(acc.account_type == AccountType.EQUITY for acc in accounts)
        assert any(acc.account_type == AccountType.REVENUE for acc in accounts)
        assert any(acc.account_type == AccountType.EXPENSE for acc in accounts)
    
    def test_industry_specific_accounts(self):
        """Test industry-specific account generation"""
        tech_accounts = self.generator.generate_chart_of_accounts(
            EntityType.LLC, 
            IndustryType.TECHNOLOGY
        )
        
        retail_accounts = self.generator.generate_chart_of_accounts(
            EntityType.LLC, 
            IndustryType.RETAIL
        )
        
        # Should have different industry-specific accounts
        tech_names = [acc.name for acc in tech_accounts]
        retail_names = [acc.name for acc in retail_accounts]
        
        assert "Software License Revenue" in tech_names
        assert "Product Sales Revenue" in retail_names
    
    def test_entity_specific_accounts(self):
        """Test entity-specific account generation"""
        s_corp_accounts = self.generator.generate_chart_of_accounts(
            EntityType.S_CORPORATION, 
            IndustryType.SERVICES
        )
        
        partnership_accounts = self.generator.generate_chart_of_accounts(
            EntityType.PARTNERSHIP, 
            IndustryType.SERVICES
        )
        
        s_corp_names = [acc.name for acc in s_corp_accounts]
        partnership_names = [acc.name for acc in partnership_accounts]
        
        assert "Distributions to Shareholders" in s_corp_names
        assert "Partner A Capital" in partnership_names

class TestTaxOptimizationEngine:
    """Test tax optimization functionality"""
    
    def setup_method(self):
        self.tax_engine = TaxOptimizationEngine()
    
    def test_analyze_tax_optimization(self):
        """Test tax strategy analysis"""
        strategies = self.tax_engine.analyze_tax_optimization(
            EntityType.LLC,
            Decimal('150000'),  # Annual income
            IndustryType.TECHNOLOGY,
            {
                "office_expenses": Decimal('5000'),
                "equipment": Decimal('10000')
            }
        )
        
        assert len(strategies) > 0
        assert all(isinstance(s, TaxStrategy) for s in strategies)
        assert all(s.estimated_savings >= 0 for s in strategies)
    
    def test_expense_optimization(self):
        """Test expense optimization analysis"""
        expenses = {
            "office_expenses": Decimal('5000'),
            "travel_expenses": Decimal('3000'),
            "equipment": Decimal('10000')
        }
        
        optimization = self.tax_engine.calculate_expense_optimization(expenses)
        
        assert "total_deductible" in optimization
        assert "category_analysis" in optimization
        assert optimization["total_deductible"] > 0
    
    def test_marginal_tax_rate_calculation(self):
        """Test marginal tax rate calculation"""
        # Test different income levels
        low_income_rate = self.tax_engine._get_marginal_tax_rate(
            Decimal('50000'), EntityType.LLC
        )
        high_income_rate = self.tax_engine._get_marginal_tax_rate(
            Decimal('500000'), EntityType.LLC
        )
        
        assert low_income_rate < high_income_rate
        assert low_income_rate >= Decimal('0.10')
        assert high_income_rate <= Decimal('0.37')

class TestFinancialProjectionEngine:
    """Test financial projection capabilities"""
    
    def setup_method(self):
        self.projection_engine = FinancialProjectionEngine()
    
    def test_create_financial_projection(self):
        """Test financial projection creation"""
        projection = self.projection_engine.create_financial_projection(
            current_revenue=Decimal('100000'),
            growth_rate=Decimal('0.20'),
            industry=IndustryType.TECHNOLOGY,
            projection_months=24
        )
        
        assert projection.projection_period_months == 24
        assert len(projection.revenue_projections["total_revenue"]) == 24
        assert len(projection.projected_cash_flow) == 24
        assert projection.revenue_growth_rate == Decimal('0.20')
    
    def test_scenario_analysis(self):
        """Test scenario analysis generation"""
        base_projection = self.projection_engine.create_financial_projection(
            current_revenue=Decimal('100000'),
            growth_rate=Decimal('0.20'),
            industry=IndustryType.TECHNOLOGY
        )
        
        scenarios = self.projection_engine.create_scenario_analysis(base_projection)
        
        assert "conservative" in scenarios
        assert "base" in scenarios  
        assert "optimistic" in scenarios
        
        # Conservative should be lower than optimistic
        conservative_final = scenarios["conservative"].revenue_projections["total_revenue"][-1]
        optimistic_final = scenarios["optimistic"].revenue_projections["total_revenue"][-1]
        assert conservative_final < optimistic_final
    
    def test_break_even_calculation(self):
        """Test break-even calculation"""
        # Create projection with positive cash flow
        cash_flows = [Decimal('-1000')] * 5 + [Decimal('500')] * 10
        break_even = self.projection_engine._calculate_break_even(cash_flows)
        
        assert break_even is not None
        assert break_even > 0

class TestFundingStrategyEngine:
    """Test funding strategy and recommendations"""
    
    def setup_method(self):
        self.funding_engine = FundingStrategyEngine()
    
    def test_analyze_funding_needs(self):
        """Test funding needs analysis"""
        recommendation = self.funding_engine.analyze_funding_needs(
            annual_revenue=Decimal('500000'),
            growth_rate=Decimal('0.50'),
            current_cash=Decimal('50000'),
            monthly_burn_rate=Decimal('25000'),
            funding_stage=FundingStage.SERIES_A,
            industry=IndustryType.TECHNOLOGY
        )
        
        assert isinstance(recommendation, FundingRecommendation)
        assert recommendation.recommended_amount > 0
        assert recommendation.expected_runway_months > 0
        assert len(recommendation.recommended_sources) > 0
    
    def test_valuation_calculation(self):
        """Test business valuation calculation"""
        valuation = self.funding_engine.calculate_valuation(
            revenue=Decimal('1000000'),
            growth_rate=Decimal('0.30'),
            industry=IndustryType.TECHNOLOGY,
            stage=FundingStage.SERIES_A,
            method="revenue_multiple"
        )
        
        assert valuation.annual_revenue == Decimal('1000000')
        assert valuation.revenue_growth_rate == Decimal('0.30')
        assert valuation.estimated_valuation_low > 0
        assert valuation.estimated_valuation_high > valuation.estimated_valuation_low
    
    def test_funding_source_matching(self):
        """Test funding source matching logic"""
        suitable_sources = self.funding_engine._find_suitable_funding_sources(
            amount=Decimal('2000000'),
            stage=FundingStage.SERIES_A,
            industry=IndustryType.TECHNOLOGY,
            revenue=Decimal('500000')
        )
        
        assert len(suitable_sources) > 0
        for source in suitable_sources:
            assert source.typical_investment_range[0] <= Decimal('2000000') <= source.typical_investment_range[1]

class TestCashFlowManager:
    """Test cash flow management and forecasting"""
    
    def setup_method(self):
        self.cash_flow_manager = CashFlowManager()
    
    def test_create_cash_flow_forecast(self):
        """Test cash flow forecast creation"""
        start_date = date.today()
        end_date = start_date + timedelta(days=90)
        
        projected_sales = {}
        for i in range(90):
            sale_date = start_date + timedelta(days=i)
            projected_sales[sale_date] = Decimal('1000')
        
        recurring_expenses = {
            "monthly_rent": Decimal('5000'),
            "monthly_salaries": Decimal('20000')
        }
        
        forecast = self.cash_flow_manager.create_cash_flow_forecast(
            start_date=start_date,
            end_date=end_date,
            opening_balance=Decimal('50000'),
            projected_sales=projected_sales,
            recurring_expenses=recurring_expenses
        )
        
        assert isinstance(forecast, CashFlowForecast)
        assert len(forecast.daily_balances) == 91  # 90 days + 1
        assert forecast.opening_cash_balance == Decimal('50000')
    
    def test_cash_flow_optimization(self):
        """Test cash flow optimization recommendations"""
        # Create a forecast with cash shortages
        forecast = CashFlowForecast(
            opening_cash_balance=Decimal('10000'),
            minimum_cash_threshold=Decimal('15000')
        )
        
        # Add some cash shortage dates
        forecast.cash_shortage_dates = [
            date.today() + timedelta(days=i) for i in range(5, 15)
        ]
        
        optimization = self.cash_flow_manager.optimize_cash_flow(forecast)
        
        assert "working_capital_recommendations" in optimization
        assert "payment_terms_optimization" in optimization
        assert len(optimization["working_capital_recommendations"]) > 0

class TestExpenseCategorizationEngine:
    """Test expense categorization and automation"""
    
    def setup_method(self):
        self.categorizer = ExpenseCategorizationEngine()
    
    def test_categorize_expense(self):
        """Test automatic expense categorization"""
        transaction = ExpenseTransaction(
            vendor_name="MICROSOFT CORPORATION",
            description="Office 365 Business Premium",
            amount=Decimal('29.99'),
            date=date.today()
        )
        
        categorized = self.categorizer.categorize_expense(transaction)
        
        assert categorized.auto_categorized == True
        assert categorized.category == ExpenseCategory.SOFTWARE_SUBSCRIPTIONS
        assert categorized.confidence_score > Decimal('0.7')
        assert categorized.deductible_amount > 0
    
    def test_vendor_database_lookup(self):
        """Test vendor database lookup"""
        vendor_info = self.categorizer._lookup_vendor_info("MICROSOFT")
        
        assert vendor_info is not None
        assert vendor_info["category"] == ExpenseCategory.SOFTWARE_SUBSCRIPTIONS
    
    def test_compliance_flags(self):
        """Test compliance flag generation"""
        # Large amount without receipt
        transaction = ExpenseTransaction(
            vendor_name="Large Vendor",
            description="Large expense",
            amount=Decimal('2000'),
            date=date.today(),
            has_receipt=False
        )
        
        flagged = self.categorizer._add_compliance_flags(transaction)
        
        assert "large_amount" in flagged.flags
        assert "missing_receipt" in flagged.flags
        assert flagged.needs_approval == True
    
    def test_create_expense_rule(self):
        """Test custom rule creation"""
        transactions = [
            ExpenseTransaction(
                vendor_name="STARBUCKS",
                description="Coffee meeting",
                amount=Decimal('15.50')
            ),
            ExpenseTransaction(
                vendor_name="STARBUCKS",
                description="Client coffee",
                amount=Decimal('12.75')
            )
        ]
        
        rule = self.categorizer.create_expense_rule(
            transactions,
            ExpenseCategory.TRAVEL_MEALS,
            "Client Meetings"
        )
        
        assert rule.category == ExpenseCategory.TRAVEL_MEALS
        assert rule.subcategory == "Client Meetings"
        assert len(rule.vendor_patterns) > 0

class TestExpenseReportGenerator:
    """Test expense reporting functionality"""
    
    def setup_method(self):
        self.reporter = ExpenseReportGenerator()
    
    def test_generate_expense_report(self):
        """Test expense report generation"""
        # Create sample transactions
        transactions = []
        for i in range(10):
            transaction = ExpenseTransaction(
                vendor_name=f"Vendor {i}",
                description=f"Expense {i}",
                amount=Decimal(str(100 + i * 10)),
                date=date.today() - timedelta(days=i),
                category=ExpenseCategory.OFFICE_EXPENSES,
                deductible_amount=Decimal(str(100 + i * 10))
            )
            transactions.append(transaction)
        
        report = self.reporter.generate_expense_report(
            transactions,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        assert isinstance(report, ExpenseReport)
        assert report.total_expenses > 0
        assert report.total_deductible > 0
        assert len(report.category_totals) > 0
    
    def test_export_report(self):
        """Test report export functionality"""
        report = ExpenseReport(
            total_expenses=Decimal('1000'),
            total_deductible=Decimal('800'),
            category_totals={"office_expenses": Decimal('500')},
            deductible_by_category={"office_expenses": Decimal('500')}
        )
        
        # Test JSON export
        json_export = self.reporter.export_report(report, format="json")
        assert json_export is not None
        json_data = json.loads(json_export)
        assert "total_expenses" in json_data
        
        # Test CSV export
        csv_export = self.reporter.export_report(report, format="csv")
        assert "Category,Total Amount" in csv_export
        
        # Test summary export
        summary_export = self.reporter.export_report(report, format="summary")
        assert "Expense Report Summary" in summary_export

class TestReceiptOCRProcessor:
    """Test receipt OCR processing"""
    
    def setup_method(self):
        self.processor = ReceiptOCRProcessor()
    
    @pytest.mark.asyncio
    async def test_parse_receipt_text(self):
        """Test receipt text parsing"""
        sample_text = """
        OFFICE DEPOT
        123 MAIN ST
        ANYTOWN, ST 12345
        
        01/15/2024
        
        Paper A4 500 sheets    $12.99
        Pens Blue 12-pack       $8.99
        
        SUBTOTAL              $21.98
        TAX                    $1.76
        TOTAL                 $23.74
        """
        
        parsed_data = self.processor._parse_receipt_text(sample_text)
        
        assert "vendor_name" in parsed_data
        assert "total_amount" in parsed_data
        assert parsed_data["vendor_name"] == "OFFICE DEPOT"
        assert parsed_data["total_amount"] == Decimal('23.74')
    
    def test_extract_line_items(self):
        """Test line item extraction"""
        sample_text = """
        Paper A4 500 sheets    $12.99
        Pens Blue 12-pack       $8.99
        Folders Manila          $5.49
        TOTAL                 $27.47
        """
        
        line_items = self.processor._extract_line_items(sample_text)
        
        assert len(line_items) == 3
        assert line_items[0]["description"] == "Paper A4 500 sheets"
        assert line_items[0]["amount"] == Decimal('12.99')
    
    def test_ocr_confidence_calculation(self):
        """Test OCR confidence calculation"""
        good_text = "OFFICE DEPOT 01/15/2024 TOTAL $23.74"
        poor_text = "a1b2c3!@#"
        
        good_confidence = self.processor._calculate_ocr_confidence(good_text)
        poor_confidence = self.processor._calculate_ocr_confidence(poor_text)
        
        assert good_confidence > poor_confidence
        assert 0 <= good_confidence <= 1
        assert 0 <= poor_confidence <= 1

class TestFinancialOperationsModule:
    """Test main module interface"""
    
    def setup_method(self):
        self.module = FinancialOperationsModule()
    
    @pytest.mark.asyncio
    async def test_process_accounting_query(self):
        """Test accounting setup query processing"""
        response = await self.module.process_query(
            "Set up chart of accounts for a technology LLC",
            {"entity_type": "llc", "industry": "technology"}
        )
        
        assert response.query_type == QueryType.ACCOUNTING_SETUP
        assert response.confidence_score > Decimal('0.7')
        assert response.chart_of_accounts is not None
        assert len(response.chart_of_accounts) > 0
    
    @pytest.mark.asyncio
    async def test_process_tax_query(self):
        """Test tax optimization query processing"""
        response = await self.module.process_query(
            "What tax deductions can I claim for my consulting business?",
            {"entity_type": "llc", "industry": "services", "annual_revenue": "150000"}
        )
        
        assert response.query_type == QueryType.TAX_OPTIMIZATION
        assert response.confidence_score > Decimal('0.7')
        assert response.tax_strategies is not None
        assert len(response.tax_strategies) > 0
    
    @pytest.mark.asyncio
    async def test_process_projection_query(self):
        """Test financial projection query processing"""
        response = await self.module.process_query(
            "Create a 24-month financial projection with 25% growth",
            {"annual_revenue": "200000", "industry": "technology"}
        )
        
        assert response.query_type == QueryType.FINANCIAL_PROJECTIONS
        assert response.confidence_score > Decimal('0.7')
        assert response.financial_projections is not None
    
    @pytest.mark.asyncio
    async def test_process_funding_query(self):
        """Test funding strategy query processing"""
        response = await self.module.process_query(
            "I need to raise $500k for my Series A round",
            {"entity_type": "c_corporation", "industry": "technology", "annual_revenue": "300000"}
        )
        
        assert response.query_type == QueryType.FUNDING_STRATEGY
        assert response.confidence_score > Decimal('0.7')
        assert response.funding_recommendation is not None
    
    @pytest.mark.asyncio
    async def test_process_expense_query(self):
        """Test expense categorization query processing"""
        response = await self.module.process_query(
            "Categorize this $150 expense to Microsoft for Office 365"
        )
        
        assert response.query_type == QueryType.EXPENSE_CATEGORIZATION
        assert response.confidence_score > Decimal('0.7')
        assert response.categorized_expenses is not None
        assert len(response.categorized_expenses) > 0
    
    def test_query_classification(self):
        """Test query type classification"""
        test_cases = [
            ("chart of accounts", QueryType.ACCOUNTING_SETUP),
            ("tax deduction", QueryType.TAX_OPTIMIZATION),
            ("financial projection", QueryType.FINANCIAL_PROJECTIONS),
            ("raise funding", QueryType.FUNDING_STRATEGY),
            ("cash flow forecast", QueryType.CASH_FLOW_MANAGEMENT),
            ("categorize expense", QueryType.EXPENSE_CATEGORIZATION),
            ("expense report", QueryType.EXPENSE_REPORTING),
            ("process receipt", QueryType.RECEIPT_PROCESSING)
        ]
        
        for query_text, expected_type in test_cases:
            query = asyncio.run(self.module._parse_query(query_text))
            assert query.query_type == expected_type
    
    def test_parameter_extraction(self):
        """Test parameter extraction from queries"""
        query = asyncio.run(self.module._parse_query(
            "I need $250,000 for 18 months of runway"
        ))
        
        assert "amounts" in query.parameters
        assert query.parameters["amounts"][0] == Decimal('250000')
        assert "time_period" in query.parameters
        assert query.parameters["time_period"] == 18

class TestPerformanceAndScalability:
    """Test performance and scalability requirements"""
    
    def setup_method(self):
        self.module = FinancialOperationsModule()
    
    @pytest.mark.asyncio
    async def test_response_time_targets(self):
        """Test that responses meet time targets"""
        start_time = datetime.utcnow()
        
        response = await self.module.process_query(
            "Categorize this $50 expense to Starbucks"
        )
        
        end_time = datetime.utcnow()
        processing_time = (end_time - start_time).total_seconds() * 1000
        
        # Expense categorization should be under 1 second
        assert processing_time < 1000
        assert response.processing_time_ms < 1000
    
    @pytest.mark.asyncio
    async def test_concurrent_processing(self):
        """Test concurrent query processing"""
        queries = [
            "Set up chart of accounts for LLC",
            "What are my tax deductions?",
            "Create financial projections",
            "Analyze funding needs",
            "Forecast cash flow"
        ] * 10  # 50 total queries
        
        start_time = datetime.utcnow()
        
        # Process queries concurrently
        tasks = [self.module.process_query(query) for query in queries]
        responses = await asyncio.gather(*tasks)
        
        end_time = datetime.utcnow()
        total_time = (end_time - start_time).total_seconds()
        
        assert len(responses) == 50
        assert all(r.status == "completed" for r in responses)
        # Should handle 50 queries in under 30 seconds
        assert total_time < 30

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])
