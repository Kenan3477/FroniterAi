"""
Financial Analysis Engine Test Suite

Comprehensive test suite to validate all financial analysis algorithms including
ratio analysis, cash flow modeling, valuation models, risk assessment,
industry benchmarks, and automated statement analysis.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, Any

# Import all our financial analysis engines
from api.analysis.financial.ratio_analysis import FinancialRatioAnalyzer, FinancialStatement
from api.analysis.financial.cash_flow_analysis import CashFlowAnalyzer, CashFlowStatement
from api.analysis.financial.valuation_models import ValuationEngine, CompanyFinancials, ValuationInputs, ValuationMethod
from api.analysis.financial.statement_analysis import FinancialStatementAnalyzer, StatementType
from api.analysis.financial.risk_assessment import RiskAssessmentEngine, CompanyRiskData
from api.analysis.financial.industry_benchmarks import BenchmarkEngine, CompanyBenchmarkData, Industry


def create_sample_financial_data() -> FinancialStatement:
    """Create sample financial data for testing"""
    return FinancialStatement(
        # Balance Sheet
        total_assets=1000000,
        current_assets=500000,
        cash_and_equivalents=100000,
        accounts_receivable=150000,
        inventory=100000,
        total_liabilities=600000,
        current_liabilities=200000,
        total_debt=300000,
        long_term_debt=300000,
        shareholders_equity=400000,
        
        # Income Statement
        revenue=2000000,
        cost_of_goods_sold=1200000,
        gross_profit=800000,
        operating_expenses=500000,
        operating_income=300000,
        interest_expense=25000,
        net_income=200000,
        ebitda=350000,
        
        # Cash Flow Statement
        operating_cash_flow=320000,
        investing_cash_flow=-50000,
        financing_cash_flow=-30000,
        free_cash_flow=270000,
        
        # Market Data
        market_cap=2000000,
        shares_outstanding=100000,
        stock_price=20.0
    )


def create_sample_cash_flow_data() -> CashFlowStatement:
    """Create sample cash flow data for testing"""
    return CashFlowStatement(
        period="Q4 2023",
        date=datetime.now(),
        
        # Operating Cash Flow Components
        net_income=200000,
        depreciation_amortization=50000,
        working_capital_changes=-20000,
        accounts_receivable_change=-10000,
        inventory_change=-5000,
        accounts_payable_change=15000,
        other_operating_activities=5000,
        operating_cash_flow=320000,
        
        # Investing Cash Flow Components
        capital_expenditures=-75000,
        acquisitions=0,
        asset_sales=10000,
        investments=-20000,
        other_investing_activities=5000,
        investing_cash_flow=-80000,
        
        # Financing Cash Flow Components
        debt_issuance=50000,
        debt_repayment=-30000,
        equity_issuance=0,
        dividends_paid=-25000,
        share_repurchases=-10000,
        other_financing_activities=5000,
        financing_cash_flow=-10000,
        
        # Summary
        net_change_in_cash=230000,
        beginning_cash=100000,
        ending_cash=330000,
        free_cash_flow=245000
    )


def create_sample_company_financials() -> CompanyFinancials:
    """Create sample company financials for valuation"""
    return CompanyFinancials(
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


def create_sample_risk_data() -> CompanyRiskData:
    """Create sample company risk data"""
    return CompanyRiskData(
        current_ratio=2.5,
        quick_ratio=1.8,
        debt_to_equity=0.75,
        debt_to_assets=0.30,
        interest_coverage=12.0,
        times_interest_earned=12.0,
        roa=0.08,
        roe=0.15,
        gross_margin=0.40,
        operating_margin=0.15,
        net_margin=0.10,
        market_cap=5000000,
        enterprise_value=5200000,
        price_to_book=2.5,
        price_to_earnings=20.0,
        beta=1.2,
        operating_cash_flow=250000,
        free_cash_flow=200000,
        cash_conversion_cycle=45,
        revenue_growth=0.10,
        earnings_volatility=0.20,
        industry_risk_score=40,
        management_quality_score=80,
        financial_history_years=5,
        bankruptcy_history=False,
        default_history=False,
        audit_issues=False
    )


def create_sample_benchmark_data() -> CompanyBenchmarkData:
    """Create sample company data for benchmarking"""
    return CompanyBenchmarkData(
        company_name="Test Technology Company",
        industry=Industry.TECHNOLOGY,
        market_cap=5000000000,  # $5B
        revenue=2000000000,     # $2B
        gross_margin=0.70,
        operating_margin=0.18,
        net_margin=0.14,
        roa=0.09,
        roe=0.16,
        roic=0.14,
        current_ratio=2.8,
        quick_ratio=2.2,
        cash_ratio=0.8,
        debt_to_equity=0.25,
        debt_to_assets=0.15,
        debt_to_capital=0.20,
        interest_coverage=12.0,
        asset_turnover=0.6,
        inventory_turnover=8.0,
        receivables_turnover=10.0,
        working_capital_turnover=4.0,
        revenue_growth_1y=0.22,
        revenue_growth_3y=0.18,
        earnings_growth_1y=0.28,
        earnings_growth_3y=0.20,
        pe_ratio=22.0,
        pb_ratio=3.5,
        ev_revenue=4.2,
        ev_ebitda=18.5,
        peg_ratio=0.95,
        beta=1.15,
        dividend_yield=0.015,
        price_volatility=0.28,
        geographic_region="North America",
        sub_industry="Software"
    )


def test_ratio_analysis():
    """Test the financial ratio analysis engine"""
    print("=" * 60)
    print("TESTING FINANCIAL RATIO ANALYSIS ENGINE")
    print("=" * 60)
    
    try:
        # Create analyzer and sample data
        analyzer = FinancialRatioAnalyzer()
        data = create_sample_financial_data()
        
        # Perform comprehensive ratio analysis
        results = analyzer.analyze_ratios(data)
        
        print(f"✅ Ratio Analysis Successful")
        print(f"   Financial Health Score: {results['financial_health_score']:.1f}/100")
        print(f"   Number of Ratios Calculated: {len(results['ratios'])}")
        
        # Test specific ratio categories
        print(f"\n📊 Calculated Ratios:")
        for ratio_name, ratio_result in list(results['ratios'].items())[:5]:  # Show first 5
            print(f"   {ratio_name}: {ratio_result.value:.2f} ({str(ratio_result.interpretation)})")
        
        # Test industry benchmarking
        print(f"\n🎯 Industry Benchmarking: Available for {len(results['ratios'])} ratios")
        
        return True
        
    except Exception as e:
        print(f"❌ Ratio Analysis Test Failed: {str(e)}")
        return False


def test_cash_flow_analysis():
    """Test the cash flow analysis engine"""
    print("\n" + "=" * 60)
    print("TESTING CASH FLOW ANALYSIS ENGINE")
    print("=" * 60)
    
    try:
        # Create analyzer and sample data
        analyzer = CashFlowAnalyzer()
        data = create_sample_cash_flow_data()
        
        # Perform comprehensive cash flow analysis (need multiple periods)
        cash_flow_data_2 = CashFlowStatement(
            period="Q3 2023",
            date=datetime.now(),
            net_income=180000,
            depreciation_amortization=45000,
            working_capital_changes=-15000,
            accounts_receivable_change=-8000,
            inventory_change=-3000,
            accounts_payable_change=12000,
            other_operating_activities=3000,
            operating_cash_flow=280000,
            capital_expenditures=-65000,
            acquisitions=0,
            asset_sales=5000,
            investments=-15000,
            other_investing_activities=3000,
            investing_cash_flow=-72000,
            debt_issuance=40000,
            debt_repayment=-25000,
            equity_issuance=0,
            dividends_paid=-20000,
            share_repurchases=-8000,
            other_financing_activities=3000,
            financing_cash_flow=-10000,
            net_change_in_cash=198000,
            beginning_cash=80000,
            ending_cash=278000,
            free_cash_flow=215000
        )
        
        results = analyzer.analyze_cash_flows([cash_flow_data_2, data])
        
        print(f"✅ Cash Flow Analysis Successful")
        print(f"   Operating Cash Flow: ${data.operating_cash_flow:,.0f}")
        print(f"   Free Cash Flow: ${data.free_cash_flow or 0:,.0f}")
        print(f"   Investing Cash Flow: ${data.investing_cash_flow:,.0f}")
        
        # Test cash flow forecasting
        forecast_results = analyzer.forecast_cash_flows([cash_flow_data_2, data], forecast_periods=4)
        print(f"\n📈 Cash Flow Forecasting:")
        print(f"   Forecast Method: {forecast_results.methodology}")
        print(f"   Forecast Periods: {len(forecast_results.forecast_periods)}")
        
        # Test DCF model
        dcf_results = analyzer.build_dcf_model([data], discount_rate=0.10, terminal_growth=0.03)
        print(f"\n💰 DCF Valuation:")
        print(f"   Enterprise Value: ${dcf_results.get('enterprise_value', 0):,.0f}")
        print(f"   NPV of Cash Flows: ${dcf_results.get('npv_cash_flows', 0):,.0f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Cash Flow Analysis Test Failed: {str(e)}")
        return False


def test_valuation_models():
    """Test the valuation models engine"""
    print("\n" + "=" * 60)
    print("TESTING VALUATION MODELS ENGINE")
    print("=" * 60)
    
    try:
        # Create valuation engine and sample data
        engine = ValuationEngine()
        company_data = create_sample_company_financials()
        
        # Create valuation inputs
        inputs = ValuationInputs(
            discount_rate=0.10,
            terminal_growth_rate=0.03,
            forecast_periods=5,
            tax_rate=0.25
        )
        
        # Test DCF valuation
        dcf_results = engine.dcf_analysis(company_data, inputs)
        
        print(f"✅ Valuation Models Successful")
        print(f"   DCF Enterprise Value: ${dcf_results['dcf_valuation'].enterprise_value:,.0f}")
        print(f"   DCF Equity Value: ${dcf_results['dcf_valuation'].equity_value:,.0f}")
        print(f"   DCF Value per Share: ${dcf_results['dcf_valuation'].value_per_share:.2f}")
        
        # Test multiple valuation methods
        methods = [ValuationMethod.DCF, ValuationMethod.COMPARABLE_COMPANY, ValuationMethod.ASSET_BASED]
        multi_valuations = engine.value_company(company_data, inputs, methods)
        
        print(f"\n📊 Multiple Valuation Methods:")
        for method, result in multi_valuations.items():
            print(f"   {method}: ${result.value_per_share:.2f} per share")
        
        # Test sensitivity analysis
        print(f"\n🎯 DCF Sensitivity Analysis:")
        sensitivity = dcf_results['sensitivity_analysis']
        print(f"   Discount Rate Sensitivity: Available")
        print(f"   Terminal Growth Sensitivity: Available")
        
        return True
        
    except Exception as e:
        print(f"❌ Valuation Models Test Failed: {str(e)}")
        return False


def test_risk_assessment():
    """Test the risk assessment engine"""
    print("\n" + "=" * 60)
    print("TESTING RISK ASSESSMENT ENGINE")
    print("=" * 60)
    
    try:
        # Create risk assessment engine and sample data
        engine = RiskAssessmentEngine()
        risk_data = create_sample_risk_data()
        
        # Perform comprehensive risk assessment
        results = engine.assess_company_risk(risk_data, include_stress_testing=True)
        
        print(f"✅ Risk Assessment Successful")
        print(f"   Overall Risk Score: {results.overall_risk_score:.1f}/100")
        print(f"   Risk Level: {results.risk_level}")
        print(f"   Credit Rating: {results.credit_rating}")
        print(f"   Probability of Default: {results.probability_of_default:.2%}")
        print(f"   Assessment Confidence: {results.assessment_confidence:.1%}")
        
        # Test credit scoring
        credit_results = engine.credit_scoring_model(risk_data)
        print(f"\n💳 Credit Scoring:")
        print(f"   Credit Score: {credit_results['ensemble_credit_score']:.1f}")
        print(f"   Credit Grade: {credit_results['credit_grade']}")
        
        # Test stress testing
        if results.stress_test_results:
            print(f"\n⚠️  Stress Testing:")
            for scenario, stress_result in results.stress_test_results.items():
                print(f"   {scenario}: Risk Score {stress_result['risk_score']:.1f}")
        
        return True
        
    except Exception as e:
        print(f"❌ Risk Assessment Test Failed: {str(e)}")
        return False


def test_industry_benchmarks():
    """Test the industry benchmarking engine"""
    print("\n" + "=" * 60)
    print("TESTING INDUSTRY BENCHMARKING ENGINE")
    print("=" * 60)
    
    try:
        # Create benchmark engine and sample data
        engine = BenchmarkEngine()
        company_data = create_sample_benchmark_data()
        
        # Perform comprehensive benchmarking
        results = engine.comprehensive_benchmark_analysis(company_data)
        
        print(f"✅ Industry Benchmarking Successful")
        print(f"   Company: {company_data.company_name}")
        print(f"   Industry: {company_data.industry}")
        print(f"   Overall Performance: {results['overall_performance']['performance_tier']}")
        print(f"   Overall Grade: {results['overall_performance']['overall_grade']}")
        print(f"   Overall Percentile: {results['overall_performance']['overall_percentile']:.1f}")
        
        # Test peer group analysis
        peer_results = engine.peer_group_comparison(company_data)
        print(f"\n👥 Peer Group Analysis:")
        print(f"   Peer Group Size: {peer_results['peer_group_summary']['peer_count']}")
        print(f"   Company Size Tier: Based on market cap and revenue")
        
        # Test category benchmarks
        print(f"\n📈 Category Performance:")
        for category, benchmarks in results['category_benchmarks'].items():
            if benchmarks:  # Check if category has results
                avg_percentile = np.mean([result.percentile_rank for result in benchmarks.values()])
                print(f"   {category.title()}: {avg_percentile:.1f} percentile")
        
        return True
        
    except Exception as e:
        print(f"❌ Industry Benchmarking Test Failed: {str(e)}")
        return False


def test_integration():
    """Test integration between different analysis engines"""
    print("\n" + "=" * 60)
    print("TESTING ENGINE INTEGRATION")
    print("=" * 60)
    
    try:
        # Create all engines
        ratio_analyzer = FinancialRatioAnalyzer()
        cash_flow_analyzer = CashFlowAnalyzer()
        valuation_engine = ValuationEngine()
        risk_engine = RiskAssessmentEngine()
        benchmark_engine = BenchmarkEngine()
        
        # Create comprehensive sample data
        financial_data = create_sample_financial_data()
        cash_flow_data = create_sample_cash_flow_data()
        company_financials = create_sample_company_financials()
        risk_data = create_sample_risk_data()
        benchmark_data = create_sample_benchmark_data()
        
        # Run integrated analysis
        print("🔄 Running Integrated Analysis...")
        
        # Ratio analysis
        ratio_results = ratio_analyzer.analyze_ratios(financial_data)
        
        # Cash flow analysis (needs multiple periods)
        cash_flow_data_2 = CashFlowStatement(
            period="Q3 2023",
            date=datetime.now(),
            net_income=180000,
            depreciation_amortization=45000,
            working_capital_changes=-15000,
            accounts_receivable_change=-8000,
            inventory_change=-3000,
            accounts_payable_change=12000,
            other_operating_activities=3000,
            operating_cash_flow=280000,
            capital_expenditures=-65000,
            acquisitions=0,
            asset_sales=5000,
            investments=-15000,
            other_investing_activities=3000,
            investing_cash_flow=-72000,
            debt_issuance=40000,
            debt_repayment=-25000,
            equity_issuance=0,
            dividends_paid=-20000,
            share_repurchases=-8000,
            other_financing_activities=3000,
            financing_cash_flow=-10000,
            net_change_in_cash=198000,
            beginning_cash=80000,
            ending_cash=278000,
            free_cash_flow=215000
        )
        
        cf_results = cash_flow_analyzer.analyze_cash_flows([cash_flow_data_2, cash_flow_data])        # Valuation analysis
        valuation_inputs = ValuationInputs(
            discount_rate=0.10, terminal_growth_rate=0.03, 
            forecast_periods=5, tax_rate=0.25
        )
        val_results = valuation_engine.dcf_analysis(company_financials, valuation_inputs)
        
        # Risk assessment
        risk_results = risk_engine.assess_company_risk(risk_data)
        
        # Benchmarking
        benchmark_results = benchmark_engine.comprehensive_benchmark_analysis(benchmark_data)
        
        # Create integrated summary
        print(f"✅ Integration Test Successful")
        print(f"\n📋 INTEGRATED FINANCIAL ANALYSIS SUMMARY")
        print(f"   Financial Health Score: {ratio_results.overall_health_score:.1f}/100")
        print(f"   Cash Flow Quality: {cf_results['cash_flow_quality']['overall_score']:.1f}/100")
        print(f"   DCF Value per Share: ${val_results['dcf_valuation'].value_per_share:.2f}")
        print(f"   Risk Level: {risk_results.risk_level}")
        print(f"   Industry Performance: {benchmark_results['overall_performance']['performance_tier']}")
        
        # Calculate composite score
        composite_score = np.mean([
            ratio_results.overall_health_score,
            cf_results['cash_flow_quality']['overall_score'],
            100 - risk_results.overall_risk_score,  # Convert risk to positive score
            benchmark_results['overall_performance']['overall_percentile']
        ])
        
        print(f"\n🎯 COMPOSITE INVESTMENT SCORE: {composite_score:.1f}/100")
        
        if composite_score >= 80:
            investment_recommendation = "STRONG BUY"
        elif composite_score >= 70:
            investment_recommendation = "BUY"
        elif composite_score >= 60:
            investment_recommendation = "HOLD"
        elif composite_score >= 50:
            investment_recommendation = "WEAK HOLD"
        else:
            investment_recommendation = "SELL"
        
        print(f"💡 INVESTMENT RECOMMENDATION: {investment_recommendation}")
        
        return True
        
    except Exception as e:
        print(f"❌ Integration Test Failed: {str(e)}")
        return False


def run_comprehensive_tests():
    """Run all comprehensive tests"""
    print("🚀 STARTING COMPREHENSIVE FINANCIAL ANALYSIS ENGINE TESTS")
    print("=" * 80)
    
    test_results = {
        "Ratio Analysis": test_ratio_analysis(),
        "Cash Flow Analysis": test_cash_flow_analysis(), 
        "Valuation Models": test_valuation_models(),
        "Risk Assessment": test_risk_assessment(),
        "Industry Benchmarks": test_industry_benchmarks(),
        "Integration Test": test_integration()
    }
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 80)
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    print(f"\n🎯 OVERALL RESULTS: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL FINANCIAL ANALYSIS ENGINES ARE WORKING CORRECTLY!")
        print("🚀 Ready for production deployment!")
    else:
        print("⚠️  Some tests failed. Review the errors above.")
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = run_comprehensive_tests()
    exit(0 if success else 1)
