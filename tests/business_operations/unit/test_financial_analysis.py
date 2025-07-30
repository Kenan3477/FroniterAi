"""
Unit Tests for Financial Analysis Capability

Tests for individual financial analysis methods including:
- Financial ratio calculations
- Valuation methods
- Trend analysis
- Industry benchmarking
- Error handling
"""

import pytest
import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
from decimal import Decimal
from typing import Dict, Any

from modules.business_operations.financial_analysis import (
    FinancialAnalysisCapability,
    FinancialStatement,
    FinancialRatios,
    FinancialMetricType,
    ValuationMethod
)
from tests.business_operations import (
    BusinessOperationsTestFramework,
    TestDataGenerator,
    AccuracyValidator,
    TEST_CONFIG
)

@pytest.mark.unit
class TestFinancialAnalysisUnit(BusinessOperationsTestFramework):
    """Unit tests for Financial Analysis Capability"""
    
    @pytest.fixture
    def financial_capability(self):
        """Create financial analysis capability instance"""
        config = {
            "industry_benchmarks_path": "test_benchmarks.json",
            "calculation_precision": 4,
            "currency": "USD"
        }
        return FinancialAnalysisCapability(config)
    
    @pytest.fixture
    def sample_statements(self):
        """Sample financial statements for testing"""
        return TestDataGenerator.generate_financial_statements(num_periods=4)
    
    @pytest.mark.accuracy
    def test_financial_ratios_calculation_accuracy(
        self, 
        financial_capability, 
        sample_financial_data
    ):
        """Test accuracy of financial ratio calculations"""
        
        # Calculate ratios
        ratios = financial_capability.calculate_financial_ratios(sample_financial_data)
        
        # Expected ratios (calculated manually)
        expected_ratios = {
            "current_ratio": 8000000 / 3000000,  # 2.67
            "quick_ratio": (8000000 - 1000000) / 3000000,  # 2.33
            "gross_profit_margin": 4000000 / 10000000,  # 0.40
            "net_profit_margin": 1050000 / 10000000,  # 0.105
            "return_on_assets": 1050000 / 15000000,  # 0.07
            "return_on_equity": 1050000 / 6000000,  # 0.175
            "debt_to_equity": 9000000 / 6000000,  # 1.5
            "asset_turnover": 10000000 / 15000000,  # 0.67
            "interest_coverage": 1500000 / 100000  # 15.0
        }
        
        # Validate accuracy
        accuracy_results = AccuracyValidator.validate_financial_ratios(
            calculated=ratios.__dict__,
            expected=expected_ratios,
            tolerance=TEST_CONFIG["accuracy_thresholds"]["ratio_calculation_tolerance"]
        )
        
        # Assert all calculations are accurate
        failed_ratios = [ratio for ratio, passed in accuracy_results.items() if not passed]
        assert not failed_ratios, f"Failed ratio calculations: {failed_ratios}"
        
        # Test specific critical ratios
        assert abs(ratios.current_ratio - 2.667) < 0.001
        assert abs(ratios.net_profit_margin - 0.105) < 0.001
        assert abs(ratios.return_on_equity - 0.175) < 0.001
    
    def test_dcf_valuation_calculation(self, financial_capability):
        """Test DCF valuation calculation"""
        
        # Sample cash flow projections
        cash_flows = [1000000, 1100000, 1210000, 1331000, 1464100]
        discount_rate = 0.10
        terminal_growth_rate = 0.03
        
        # Calculate DCF value
        dcf_value = financial_capability.calculate_dcf_valuation(
            cash_flows=cash_flows,
            discount_rate=discount_rate,
            terminal_growth_rate=terminal_growth_rate
        )
        
        # Expected calculation (manual verification)
        # PV of explicit cash flows + terminal value
        expected_range = (14000000, 16000000)  # Approximate range
        
        # Validate result is within expected range
        assert expected_range[0] <= dcf_value <= expected_range[1], \
            f"DCF value {dcf_value} outside expected range {expected_range}"
        
        # Test edge cases
        with pytest.raises(ValueError):
            financial_capability.calculate_dcf_valuation([], 0.10, 0.03)
        
        with pytest.raises(ValueError):
            financial_capability.calculate_dcf_valuation(cash_flows, -0.01, 0.03)
    
    def test_comparable_company_valuation(self, financial_capability):
        """Test comparable company valuation"""
        
        # Sample comparable companies data
        comparables = [
            {"revenue": 20000000, "market_cap": 100000000, "pe_ratio": 15.0},
            {"revenue": 15000000, "market_cap": 80000000, "pe_ratio": 12.0},
            {"revenue": 25000000, "market_cap": 120000000, "pe_ratio": 18.0}
        ]
        
        # Target company metrics
        target_metrics = {
            "revenue": 10000000,
            "net_income": 1050000,
            "ebitda": 2000000
        }
        
        # Calculate valuation
        valuation = financial_capability.calculate_comparable_valuation(
            target_metrics=target_metrics,
            comparable_companies=comparables
        )
        
        # Validate result structure
        assert "revenue_multiple_valuation" in valuation
        assert "pe_multiple_valuation" in valuation
        assert "median_valuation" in valuation
        
        # Validate reasonable ranges
        assert 30000000 <= valuation["revenue_multiple_valuation"] <= 60000000
        assert 10000000 <= valuation["pe_multiple_valuation"] <= 20000000
    
    def test_financial_trend_analysis(self, financial_capability, sample_statements):
        """Test financial trend analysis"""
        
        # Perform trend analysis
        trends = financial_capability.analyze_financial_trends(sample_statements)
        
        # Validate structure
        assert "revenue_trend" in trends
        assert "profitability_trend" in trends
        assert "growth_rates" in trends
        assert "trend_score" in trends
        
        # Validate growth calculations
        revenue_growth = trends["growth_rates"]["revenue_cagr"]
        assert isinstance(revenue_growth, float)
        assert 0.10 <= revenue_growth <= 0.20  # Expected growth range
        
        # Test trend direction
        assert trends["revenue_trend"]["direction"] in ["increasing", "decreasing", "stable"]
        assert isinstance(trends["trend_score"], float)
        assert 0 <= trends["trend_score"] <= 100
    
    def test_industry_benchmark_comparison(self, financial_capability, sample_financial_data):
        """Test industry benchmark comparison"""
        
        # Mock industry benchmarks
        mock_benchmarks = {
            "technology": {
                "current_ratio": {"median": 2.5, "q1": 2.0, "q3": 3.0},
                "net_profit_margin": {"median": 0.12, "q1": 0.08, "q3": 0.16},
                "return_on_equity": {"median": 0.15, "q1": 0.10, "q3": 0.20}
            }
        }
        
        with patch.object(financial_capability, 'industry_benchmarks', mock_benchmarks):
            # Perform benchmark comparison
            comparison = financial_capability.compare_to_industry_benchmarks(
                financial_data=sample_financial_data,
                industry="technology"
            )
        
        # Validate structure
        assert "ratio_comparisons" in comparison
        assert "overall_score" in comparison
        assert "percentile_rankings" in comparison
        
        # Validate specific comparisons
        ratio_comps = comparison["ratio_comparisons"]
        assert "current_ratio" in ratio_comps
        assert "performance" in ratio_comps["current_ratio"]
        assert ratio_comps["current_ratio"]["performance"] in ["above", "below", "at_median"]
    
    def test_sensitivity_analysis(self, financial_capability):
        """Test sensitivity analysis for key variables"""
        
        # Base case assumptions
        base_assumptions = {
            "revenue_growth": 0.15,
            "gross_margin": 0.40,
            "discount_rate": 0.10
        }
        
        # Sensitivity ranges
        sensitivity_ranges = {
            "revenue_growth": [0.10, 0.20],
            "gross_margin": [0.35, 0.45],
            "discount_rate": [0.08, 0.12]
        }
        
        # Perform sensitivity analysis
        sensitivity = financial_capability.perform_sensitivity_analysis(
            base_assumptions=base_assumptions,
            sensitivity_ranges=sensitivity_ranges,
            output_metric="valuation"
        )
        
        # Validate structure
        assert "base_case" in sensitivity
        assert "sensitivity_table" in sensitivity
        assert "tornado_chart_data" in sensitivity
        
        # Validate sensitivity calculations
        for variable in sensitivity_ranges:
            assert variable in sensitivity["sensitivity_table"]
            assert len(sensitivity["sensitivity_table"][variable]) > 1
    
    def test_monte_carlo_simulation(self, financial_capability):
        """Test Monte Carlo simulation for risk analysis"""
        
        # Distribution parameters
        distributions = {
            "revenue_growth": {"type": "normal", "mean": 0.15, "std": 0.05},
            "cost_ratio": {"type": "normal", "mean": 0.60, "std": 0.03},
            "discount_rate": {"type": "normal", "mean": 0.10, "std": 0.02}
        }
        
        # Run simulation
        simulation = financial_capability.monte_carlo_simulation(
            distributions=distributions,
            num_simulations=1000,
            output_metric="net_present_value"
        )
        
        # Validate results
        assert "mean" in simulation
        assert "std" in simulation
        assert "percentiles" in simulation
        assert "var_95" in simulation  # Value at Risk
        
        # Validate statistical properties
        assert isinstance(simulation["mean"], float)
        assert simulation["std"] > 0
        assert len(simulation["percentiles"]) > 0
    
    def test_error_handling(self, financial_capability):
        """Test error handling for invalid inputs"""
        
        # Test with invalid financial statement
        invalid_statement = FinancialStatement(
            period="Q1 2024",
            revenue=-1000000,  # Negative revenue
            cost_of_goods_sold=1200000,  # COGS > Revenue
            gross_profit=-200000,
            operating_expenses=500000,
            operating_income=-700000,
            interest_expense=50000,
            tax_expense=0,
            net_income=-750000,
            total_assets=0,  # Zero assets
            current_assets=0,
            total_liabilities=1000000,
            current_liabilities=500000,
            shareholders_equity=-1000000,  # Negative equity
            cash_and_equivalents=0,
            accounts_receivable=0,
            inventory=0,
            accounts_payable=300000,
            long_term_debt=700000
        )
        
        # Should handle gracefully and provide warnings
        with pytest.warns(UserWarning):
            ratios = financial_capability.calculate_financial_ratios(invalid_statement)
        
        # Test division by zero handling
        zero_statement = FinancialStatement(
            period="Q1 2024",
            revenue=0,
            cost_of_goods_sold=0,
            gross_profit=0,
            operating_expenses=0,
            operating_income=0,
            interest_expense=0,
            tax_expense=0,
            net_income=0,
            total_assets=0,
            current_assets=0,
            total_liabilities=0,
            current_liabilities=0,
            shareholders_equity=0,
            cash_and_equivalents=0,
            accounts_receivable=0,
            inventory=0,
            accounts_payable=0,
            long_term_debt=0
        )
        
        # Should handle division by zero
        ratios = financial_capability.calculate_financial_ratios(zero_statement)
        
        # Check that ratios are properly handled (None or infinity)
        assert ratios.current_ratio is None or np.isinf(ratios.current_ratio)
        assert ratios.return_on_assets is None or ratios.return_on_assets == 0
    
    def test_currency_conversion(self, financial_capability):
        """Test currency conversion functionality"""
        
        # Test with mock exchange rates
        mock_rates = {"EUR": 0.85, "GBP": 0.75, "JPY": 110.0}
        
        with patch.object(financial_capability, 'get_exchange_rates', return_value=mock_rates):
            # Convert financial statement to EUR
            converted = financial_capability.convert_currency(
                financial_data=sample_financial_data,
                target_currency="EUR"
            )
        
        # Validate conversion
        assert converted.revenue == sample_financial_data.revenue * 0.85
        assert converted.total_assets == sample_financial_data.total_assets * 0.85
    
    @pytest.mark.performance
    def test_calculation_performance(self, financial_capability, sample_financial_data):
        """Test performance of financial calculations"""
        import time
        
        # Measure calculation time
        start_time = time.time()
        
        # Perform multiple calculations
        for _ in range(100):
            ratios = financial_capability.calculate_financial_ratios(sample_financial_data)
        
        end_time = time.time()
        avg_time = (end_time - start_time) / 100
        
        # Should be fast (less than 10ms per calculation)
        assert avg_time < 0.01, f"Calculation too slow: {avg_time:.4f}s"
    
    def test_data_validation(self, financial_capability):
        """Test input data validation"""
        
        # Test with missing required fields
        incomplete_data = {
            "revenue": 1000000,
            "total_assets": 2000000
            # Missing other required fields
        }
        
        with pytest.raises(ValueError, match="Missing required financial data"):
            financial_capability.validate_financial_data(incomplete_data)
        
        # Test with invalid data types
        invalid_types = {
            "revenue": "1000000",  # String instead of number
            "total_assets": None
        }
        
        with pytest.raises(TypeError):
            financial_capability.validate_financial_data(invalid_types)
    
    def test_caching_mechanism(self, financial_capability, sample_financial_data):
        """Test calculation caching"""
        
        # First calculation
        ratios1 = financial_capability.calculate_financial_ratios(sample_financial_data)
        
        # Second calculation (should use cache)
        ratios2 = financial_capability.calculate_financial_ratios(sample_financial_data)
        
        # Results should be identical
        assert ratios1.__dict__ == ratios2.__dict__
        
        # Cache should contain the calculation
        cache_key = financial_capability._generate_cache_key(sample_financial_data)
        assert cache_key in financial_capability.analysis_cache
