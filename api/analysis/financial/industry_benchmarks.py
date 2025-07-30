"""
Industry Benchmark Comparison System

Advanced benchmarking algorithms for comparing companies against industry peers,
sector averages, and best-in-class performers across multiple metrics.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA


class Industry(str, Enum):
    """Industry classifications"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCIAL_SERVICES = "financial_services"
    CONSUMER_DISCRETIONARY = "consumer_discretionary"
    CONSUMER_STAPLES = "consumer_staples"
    INDUSTRIALS = "industrials"
    ENERGY = "energy"
    MATERIALS = "materials"
    UTILITIES = "utilities"
    REAL_ESTATE = "real_estate"
    TELECOMMUNICATIONS = "telecommunications"


class BenchmarkType(str, Enum):
    """Types of benchmarks"""
    INDUSTRY_MEDIAN = "industry_median"
    INDUSTRY_MEAN = "industry_mean"
    PEER_GROUP = "peer_group"
    BEST_IN_CLASS = "best_in_class"
    WORST_IN_CLASS = "worst_in_class"
    TOP_QUARTILE = "top_quartile"
    BOTTOM_QUARTILE = "bottom_quartile"


class MetricCategory(str, Enum):
    """Financial metric categories"""
    PROFITABILITY = "profitability"
    LIQUIDITY = "liquidity"
    LEVERAGE = "leverage"
    EFFICIENCY = "efficiency"
    GROWTH = "growth"
    VALUATION = "valuation"
    MARKET = "market"


@dataclass
class CompanyBenchmarkData:
    """Company data for benchmarking analysis"""
    company_name: str
    industry: Industry
    market_cap: float
    revenue: float
    
    # Profitability metrics
    gross_margin: float
    operating_margin: float
    net_margin: float
    roa: float
    roe: float
    roic: float
    
    # Liquidity metrics
    current_ratio: float
    quick_ratio: float
    cash_ratio: float
    
    # Leverage metrics
    debt_to_equity: float
    debt_to_assets: float
    debt_to_capital: float
    interest_coverage: float
    
    # Efficiency metrics
    asset_turnover: float
    inventory_turnover: float
    receivables_turnover: float
    working_capital_turnover: float
    
    # Growth metrics
    revenue_growth_1y: float
    revenue_growth_3y: float
    earnings_growth_1y: float
    earnings_growth_3y: float
    
    # Valuation metrics
    pe_ratio: float
    pb_ratio: float
    ev_revenue: float
    ev_ebitda: float
    peg_ratio: float
    
    # Market metrics
    beta: float
    dividend_yield: float
    price_volatility: float
    
    # Additional context
    geographic_region: str = "global"
    sub_industry: Optional[str] = None
    company_size_tier: Optional[str] = None  # small, mid, large cap


@dataclass
class BenchmarkResult:
    """Benchmark comparison result"""
    metric_name: str
    company_value: float
    benchmark_value: float
    percentile_rank: float
    z_score: float
    relative_performance: str  # "above", "below", "at"
    
    # Additional context
    industry_median: float
    industry_mean: float
    industry_std: float
    best_in_class: float
    worst_in_class: float
    
    # Performance assessment
    performance_grade: str  # A+, A, B+, B, C+, C, D+, D, F
    improvement_potential: float  # % improvement to reach top quartile


@dataclass
class IndustryBenchmarks:
    """Industry benchmark statistics"""
    industry: Industry
    sample_size: int
    
    # Statistical measures for each metric
    profitability_benchmarks: Dict[str, Dict[str, float]]
    liquidity_benchmarks: Dict[str, Dict[str, float]]
    leverage_benchmarks: Dict[str, Dict[str, float]]
    efficiency_benchmarks: Dict[str, Dict[str, float]]
    growth_benchmarks: Dict[str, Dict[str, float]]
    valuation_benchmarks: Dict[str, Dict[str, float]]
    market_benchmarks: Dict[str, Dict[str, float]]
    
    # Peer group definitions
    peer_groups: Dict[str, List[str]]  # size-based, geography-based, etc.


class BenchmarkEngine:
    """Advanced industry benchmarking and comparison engine"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.industry_data = {}
        self._load_industry_benchmarks()
        
        # Performance grading thresholds (percentile-based)
        self.grade_thresholds = {
            "A+": (95, 100),
            "A": (85, 95),
            "B+": (75, 85),
            "B": (60, 75),
            "C+": (45, 60),
            "C": (30, 45),
            "D+": (15, 30),
            "D": (5, 15),
            "F": (0, 5)
        }
    
    def comprehensive_benchmark_analysis(self, company_data: CompanyBenchmarkData) -> Dict[str, Any]:
        """
        Perform comprehensive benchmarking analysis across all metric categories
        
        Args:
            company_data: Company data for benchmarking
            
        Returns:
            Complete benchmarking analysis results
        """
        
        # Get industry benchmarks
        industry_benchmarks = self._get_industry_benchmarks(company_data.industry)
        
        # Benchmark each metric category
        profitability_results = self._benchmark_profitability_metrics(company_data, industry_benchmarks)
        liquidity_results = self._benchmark_liquidity_metrics(company_data, industry_benchmarks)
        leverage_results = self._benchmark_leverage_metrics(company_data, industry_benchmarks)
        efficiency_results = self._benchmark_efficiency_metrics(company_data, industry_benchmarks)
        growth_results = self._benchmark_growth_metrics(company_data, industry_benchmarks)
        valuation_results = self._benchmark_valuation_metrics(company_data, industry_benchmarks)
        market_results = self._benchmark_market_metrics(company_data, industry_benchmarks)
        
        # Overall performance score
        overall_score = self._calculate_overall_performance_score([
            profitability_results, liquidity_results, leverage_results,
            efficiency_results, growth_results, valuation_results, market_results
        ])
        
        # Peer group analysis
        peer_analysis = self._peer_group_analysis(company_data, industry_benchmarks)
        
        # Competitive positioning
        competitive_position = self._analyze_competitive_position(company_data, industry_benchmarks)
        
        # Performance trends
        performance_trends = self._analyze_performance_trends(company_data)
        
        # Improvement recommendations
        improvement_plan = self._generate_improvement_recommendations(
            company_data, [profitability_results, liquidity_results, leverage_results,
                         efficiency_results, growth_results, valuation_results, market_results]
        )
        
        return {
            "overall_performance": overall_score,
            "category_benchmarks": {
                "profitability": profitability_results,
                "liquidity": liquidity_results,
                "leverage": leverage_results,
                "efficiency": efficiency_results,
                "growth": growth_results,
                "valuation": valuation_results,
                "market": market_results
            },
            "peer_group_analysis": peer_analysis,
            "competitive_positioning": competitive_position,
            "performance_trends": performance_trends,
            "improvement_recommendations": improvement_plan,
            "industry_context": {
                "industry": company_data.industry,
                "sample_size": industry_benchmarks.sample_size,
                "data_quality": self._assess_benchmark_data_quality(industry_benchmarks)
            }
        }
    
    def peer_group_comparison(self, company_data: CompanyBenchmarkData,
                            peer_selection_criteria: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Compare company against a custom peer group
        
        Args:
            company_data: Target company data
            peer_selection_criteria: Criteria for peer selection
            
        Returns:
            Peer group comparison results
        """
        
        # Define peer selection criteria
        if peer_selection_criteria is None:
            peer_selection_criteria = {
                "market_cap_range": (company_data.market_cap * 0.5, company_data.market_cap * 2.0),
                "revenue_range": (company_data.revenue * 0.3, company_data.revenue * 3.0),
                "same_industry": True,
                "geographic_region": company_data.geographic_region
            }
        
        # Find peer companies
        peer_companies = self._find_peer_companies(company_data, peer_selection_criteria)
        
        # Calculate peer statistics
        peer_statistics = self._calculate_peer_statistics(peer_companies)
        
        # Benchmark against peers
        peer_benchmarks = self._benchmark_against_peers(company_data, peer_statistics)
        
        # Peer ranking analysis
        peer_rankings = self._calculate_peer_rankings(company_data, peer_companies)
        
        # Competitive gaps analysis
        competitive_gaps = self._identify_competitive_gaps(company_data, peer_companies)
        
        return {
            "peer_group_summary": {
                "peer_count": len(peer_companies),
                "selection_criteria": peer_selection_criteria,
                "peer_companies": [comp.company_name for comp in peer_companies]
            },
            "peer_statistics": peer_statistics,
            "benchmark_results": peer_benchmarks,
            "peer_rankings": peer_rankings,
            "competitive_gaps": competitive_gaps,
            "peer_group_insights": self._generate_peer_insights(company_data, peer_companies)
        }
    
    def industry_leadership_analysis(self, company_data: CompanyBenchmarkData) -> Dict[str, Any]:
        """
        Analyze company's position as industry leader across different dimensions
        
        Args:
            company_data: Company data for analysis
            
        Returns:
            Industry leadership analysis results
        """
        
        industry_benchmarks = self._get_industry_benchmarks(company_data.industry)
        
        # Leadership scores by category
        leadership_scores = {}
        
        categories = [
            ("profitability", MetricCategory.PROFITABILITY),
            ("efficiency", MetricCategory.EFFICIENCY),
            ("growth", MetricCategory.GROWTH),
            ("financial_strength", MetricCategory.LEVERAGE),
            ("market_position", MetricCategory.MARKET)
        ]
        
        for category_name, category_type in categories:
            leadership_scores[category_name] = self._calculate_leadership_score(
                company_data, industry_benchmarks, category_type
            )
        
        # Overall leadership index
        overall_leadership = np.mean(list(leadership_scores.values()))
        
        # Leadership strengths and weaknesses
        strengths = self._identify_leadership_strengths(leadership_scores)
        weaknesses = self._identify_leadership_weaknesses(leadership_scores)
        
        # Market share and influence analysis
        market_influence = self._analyze_market_influence(company_data, industry_benchmarks)
        
        # Innovation and growth leadership
        innovation_leadership = self._assess_innovation_leadership(company_data)
        
        return {
            "overall_leadership_index": overall_leadership,
            "leadership_by_category": leadership_scores,
            "leadership_strengths": strengths,
            "leadership_weaknesses": weaknesses,
            "market_influence": market_influence,
            "innovation_leadership": innovation_leadership,
            "leadership_recommendations": self._generate_leadership_recommendations(
                company_data, leadership_scores
            )
        }
    
    def best_practice_benchmarking(self, company_data: CompanyBenchmarkData,
                                 focus_areas: List[str] = None) -> Dict[str, Any]:
        """
        Identify best practices from industry leaders
        
        Args:
            company_data: Company data for comparison
            focus_areas: Specific areas to focus on for best practices
            
        Returns:
            Best practice analysis and recommendations
        """
        
        industry_benchmarks = self._get_industry_benchmarks(company_data.industry)
        
        if focus_areas is None:
            focus_areas = ["profitability", "efficiency", "growth", "capital_management"]
        
        best_practices = {}
        
        for area in focus_areas:
            best_practices[area] = self._identify_best_practices(
                company_data, industry_benchmarks, area
            )
        
        # Implementation roadmap
        implementation_plan = self._create_best_practice_implementation_plan(
            company_data, best_practices
        )
        
        # Impact assessment
        impact_assessment = self._assess_best_practice_impact(company_data, best_practices)
        
        return {
            "best_practices_by_area": best_practices,
            "implementation_roadmap": implementation_plan,
            "expected_impact": impact_assessment,
            "priority_recommendations": self._prioritize_best_practices(best_practices),
            "success_metrics": self._define_success_metrics(focus_areas)
        }
    
    def trend_analysis(self, company_data: CompanyBenchmarkData,
                      historical_data: List[CompanyBenchmarkData] = None) -> Dict[str, Any]:
        """
        Analyze performance trends vs industry trends
        
        Args:
            company_data: Current company data
            historical_data: Historical company data points
            
        Returns:
            Trend analysis results
        """
        
        if historical_data is None:
            # Use synthetic historical data for demonstration
            historical_data = self._generate_synthetic_historical_data(company_data)
        
        # Calculate company trends
        company_trends = self._calculate_company_trends(historical_data + [company_data])
        
        # Get industry trends
        industry_trends = self._get_industry_trends(company_data.industry)
        
        # Compare trends
        trend_comparison = self._compare_trends(company_trends, industry_trends)
        
        # Forecast future performance
        performance_forecast = self._forecast_performance(company_data, company_trends, industry_trends)
        
        # Trend-based recommendations
        trend_recommendations = self._generate_trend_recommendations(trend_comparison)
        
        return {
            "company_trends": company_trends,
            "industry_trends": industry_trends,
            "trend_comparison": trend_comparison,
            "performance_forecast": performance_forecast,
            "trend_recommendations": trend_recommendations,
            "risk_assessment": self._assess_trend_risks(trend_comparison)
        }
    
    def _load_industry_benchmarks(self):
        """Load industry benchmark data"""
        
        # In a real implementation, this would load from a database
        # For demonstration, we'll create representative industry benchmarks
        
        for industry in Industry:
            self.industry_data[industry] = self._create_industry_benchmark_data(industry)
    
    def _create_industry_benchmark_data(self, industry: Industry) -> IndustryBenchmarks:
        """Create representative industry benchmark data"""
        
        # Industry-specific benchmark values (simplified)
        industry_profiles = {
            Industry.TECHNOLOGY: {
                "gross_margin": {"median": 0.65, "mean": 0.62, "std": 0.15},
                "operating_margin": {"median": 0.15, "mean": 0.12, "std": 0.08},
                "net_margin": {"median": 0.12, "mean": 0.10, "std": 0.06},
                "roa": {"median": 0.08, "mean": 0.07, "std": 0.04},
                "roe": {"median": 0.15, "mean": 0.14, "std": 0.08},
                "current_ratio": {"median": 2.5, "mean": 2.8, "std": 1.2},
                "debt_to_equity": {"median": 0.3, "mean": 0.4, "std": 0.3},
                "pe_ratio": {"median": 25, "mean": 28, "std": 12},
                "revenue_growth_1y": {"median": 0.15, "mean": 0.18, "std": 0.25}
            },
            Industry.HEALTHCARE: {
                "gross_margin": {"median": 0.72, "mean": 0.69, "std": 0.12},
                "operating_margin": {"median": 0.18, "mean": 0.16, "std": 0.09},
                "net_margin": {"median": 0.14, "mean": 0.12, "std": 0.07},
                "roa": {"median": 0.06, "mean": 0.05, "std": 0.03},
                "roe": {"median": 0.12, "mean": 0.11, "std": 0.06},
                "current_ratio": {"median": 3.2, "mean": 3.5, "std": 1.5},
                "debt_to_equity": {"median": 0.4, "mean": 0.5, "std": 0.4},
                "pe_ratio": {"median": 22, "mean": 24, "std": 10},
                "revenue_growth_1y": {"median": 0.08, "mean": 0.10, "std": 0.15}
            },
            # Add more industries...
        }
        
        # Use technology profile as default for other industries
        profile = industry_profiles.get(industry, industry_profiles[Industry.TECHNOLOGY])
        
        return IndustryBenchmarks(
            industry=industry,
            sample_size=150,  # Typical sample size
            profitability_benchmarks={
                "gross_margin": profile["gross_margin"],
                "operating_margin": profile["operating_margin"],
                "net_margin": profile["net_margin"],
                "roa": profile["roa"],
                "roe": profile["roe"]
            },
            liquidity_benchmarks={
                "current_ratio": profile["current_ratio"],
                "quick_ratio": {"median": 1.8, "mean": 2.0, "std": 0.8},
                "cash_ratio": {"median": 0.5, "mean": 0.6, "std": 0.4}
            },
            leverage_benchmarks={
                "debt_to_equity": profile["debt_to_equity"],
                "debt_to_assets": {"median": 0.25, "mean": 0.30, "std": 0.20},
                "interest_coverage": {"median": 8.5, "mean": 12.0, "std": 15.0}
            },
            efficiency_benchmarks={
                "asset_turnover": {"median": 0.8, "mean": 0.9, "std": 0.4},
                "inventory_turnover": {"median": 6.0, "mean": 7.5, "std": 4.0},
                "receivables_turnover": {"median": 8.0, "mean": 9.2, "std": 3.5}
            },
            growth_benchmarks={
                "revenue_growth_1y": profile["revenue_growth_1y"],
                "revenue_growth_3y": {"median": 0.12, "mean": 0.15, "std": 0.20},
                "earnings_growth_1y": {"median": 0.10, "mean": 0.12, "std": 0.30}
            },
            valuation_benchmarks={
                "pe_ratio": profile["pe_ratio"],
                "pb_ratio": {"median": 3.2, "mean": 4.1, "std": 2.8},
                "ev_ebitda": {"median": 15.0, "mean": 18.5, "std": 8.0}
            },
            market_benchmarks={
                "beta": {"median": 1.1, "mean": 1.0, "std": 0.4},
                "dividend_yield": {"median": 0.02, "mean": 0.025, "std": 0.02}
            },
            peer_groups={
                "large_cap": ["Company A", "Company B", "Company C"],
                "mid_cap": ["Company D", "Company E", "Company F"],
                "small_cap": ["Company G", "Company H", "Company I"]
            }
        )
    
    def _get_industry_benchmarks(self, industry: Industry) -> IndustryBenchmarks:
        """Get benchmark data for specific industry"""
        return self.industry_data.get(industry, self.industry_data[Industry.TECHNOLOGY])
    
    def _benchmark_profitability_metrics(self, company_data: CompanyBenchmarkData,
                                       industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark profitability metrics"""
        
        metrics = {
            "gross_margin": company_data.gross_margin,
            "operating_margin": company_data.operating_margin,
            "net_margin": company_data.net_margin,
            "roa": company_data.roa,
            "roe": company_data.roe,
            "roic": company_data.roic
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.profitability_benchmarks:
                benchmark_data = industry_benchmarks.profitability_benchmarks[metric_name]
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=True
                )
        
        return results
    
    def _benchmark_liquidity_metrics(self, company_data: CompanyBenchmarkData,
                                   industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark liquidity metrics"""
        
        metrics = {
            "current_ratio": company_data.current_ratio,
            "quick_ratio": company_data.quick_ratio,
            "cash_ratio": company_data.cash_ratio
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.liquidity_benchmarks:
                benchmark_data = industry_benchmarks.liquidity_benchmarks[metric_name]
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=True
                )
        
        return results
    
    def _benchmark_leverage_metrics(self, company_data: CompanyBenchmarkData,
                                  industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark leverage metrics"""
        
        metrics = {
            "debt_to_equity": company_data.debt_to_equity,
            "debt_to_assets": company_data.debt_to_assets,
            "debt_to_capital": company_data.debt_to_capital,
            "interest_coverage": company_data.interest_coverage
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.leverage_benchmarks:
                benchmark_data = industry_benchmarks.leverage_benchmarks[metric_name]
                # For debt ratios, lower is better; for coverage ratios, higher is better
                higher_is_better = metric_name in ["interest_coverage"]
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=higher_is_better
                )
        
        return results
    
    def _benchmark_efficiency_metrics(self, company_data: CompanyBenchmarkData,
                                    industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark efficiency metrics"""
        
        metrics = {
            "asset_turnover": company_data.asset_turnover,
            "inventory_turnover": company_data.inventory_turnover,
            "receivables_turnover": company_data.receivables_turnover,
            "working_capital_turnover": company_data.working_capital_turnover
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.efficiency_benchmarks:
                benchmark_data = industry_benchmarks.efficiency_benchmarks[metric_name]
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=True
                )
        
        return results
    
    def _benchmark_growth_metrics(self, company_data: CompanyBenchmarkData,
                                industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark growth metrics"""
        
        metrics = {
            "revenue_growth_1y": company_data.revenue_growth_1y,
            "revenue_growth_3y": company_data.revenue_growth_3y,
            "earnings_growth_1y": company_data.earnings_growth_1y,
            "earnings_growth_3y": company_data.earnings_growth_3y
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.growth_benchmarks:
                benchmark_data = industry_benchmarks.growth_benchmarks[metric_name]
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=True
                )
        
        return results
    
    def _benchmark_valuation_metrics(self, company_data: CompanyBenchmarkData,
                                   industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark valuation metrics"""
        
        metrics = {
            "pe_ratio": company_data.pe_ratio,
            "pb_ratio": company_data.pb_ratio,
            "ev_revenue": company_data.ev_revenue,
            "ev_ebitda": company_data.ev_ebitda,
            "peg_ratio": company_data.peg_ratio
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.valuation_benchmarks:
                benchmark_data = industry_benchmarks.valuation_benchmarks[metric_name]
                # For valuation metrics, interpretation depends on context
                # Generally, lower multiples might be better (cheaper), but context matters
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=False
                )
        
        return results
    
    def _benchmark_market_metrics(self, company_data: CompanyBenchmarkData,
                                industry_benchmarks: IndustryBenchmarks) -> Dict[str, BenchmarkResult]:
        """Benchmark market metrics"""
        
        metrics = {
            "beta": company_data.beta,
            "dividend_yield": company_data.dividend_yield,
            "price_volatility": company_data.price_volatility
        }
        
        results = {}
        for metric_name, company_value in metrics.items():
            if metric_name in industry_benchmarks.market_benchmarks:
                benchmark_data = industry_benchmarks.market_benchmarks[metric_name]
                # For market metrics, interpretation varies
                higher_is_better = metric_name in ["dividend_yield"]
                results[metric_name] = self._create_benchmark_result(
                    metric_name, company_value, benchmark_data, higher_is_better=higher_is_better
                )
        
        return results
    
    def _create_benchmark_result(self, metric_name: str, company_value: float,
                               benchmark_data: Dict[str, float],
                               higher_is_better: bool = True) -> BenchmarkResult:
        """Create a benchmark result for a specific metric"""
        
        median = benchmark_data["median"]
        mean = benchmark_data["mean"]
        std = benchmark_data["std"]
        
        # Calculate percentile rank
        z_score = (company_value - mean) / std if std > 0 else 0
        percentile_rank = stats.norm.cdf(z_score) * 100
        
        # Determine relative performance
        if higher_is_better:
            if company_value > median * 1.1:
                relative_performance = "above"
            elif company_value < median * 0.9:
                relative_performance = "below"
            else:
                relative_performance = "at"
        else:
            if company_value < median * 0.9:
                relative_performance = "above"
            elif company_value > median * 1.1:
                relative_performance = "below"
            else:
                relative_performance = "at"
        
        # Calculate best and worst in class (approximated)
        best_in_class = mean + (2 * std) if higher_is_better else mean - (2 * std)
        worst_in_class = mean - (2 * std) if higher_is_better else mean + (2 * std)
        
        # Performance grade
        performance_grade = self._calculate_performance_grade(percentile_rank, higher_is_better)
        
        # Improvement potential (to reach 75th percentile)
        target_percentile = 75
        target_value = mean + (stats.norm.ppf(target_percentile/100) * std)
        if higher_is_better:
            improvement_potential = max(0, (target_value - company_value) / company_value * 100) if company_value > 0 else 0
        else:
            improvement_potential = max(0, (company_value - target_value) / company_value * 100) if company_value > 0 else 0
        
        return BenchmarkResult(
            metric_name=metric_name,
            company_value=company_value,
            benchmark_value=median,
            percentile_rank=percentile_rank,
            z_score=z_score,
            relative_performance=relative_performance,
            industry_median=median,
            industry_mean=mean,
            industry_std=std,
            best_in_class=best_in_class,
            worst_in_class=worst_in_class,
            performance_grade=performance_grade,
            improvement_potential=improvement_potential
        )
    
    def _calculate_performance_grade(self, percentile_rank: float, higher_is_better: bool = True) -> str:
        """Calculate performance grade based on percentile rank"""
        
        # Adjust percentile for metrics where lower is better
        if not higher_is_better:
            percentile_rank = 100 - percentile_rank
        
        for grade, (min_percentile, max_percentile) in self.grade_thresholds.items():
            if min_percentile <= percentile_rank < max_percentile:
                return grade
        
        return "F"
    
    def _calculate_overall_performance_score(self, category_results: List[Dict[str, BenchmarkResult]]) -> Dict[str, Any]:
        """Calculate overall performance score across all categories"""
        
        all_percentiles = []
        category_scores = {}
        
        for category_result in category_results:
            category_percentiles = [result.percentile_rank for result in category_result.values()]
            if category_percentiles:
                category_score = np.mean(category_percentiles)
                category_scores[f"category_{len(category_scores)}"] = category_score
                all_percentiles.extend(category_percentiles)
        
        overall_percentile = np.mean(all_percentiles) if all_percentiles else 50
        overall_grade = self._calculate_performance_grade(overall_percentile, higher_is_better=True)
        
        # Performance tier
        if overall_percentile >= 90:
            performance_tier = "Industry Leader"
        elif overall_percentile >= 75:
            performance_tier = "Above Average"
        elif overall_percentile >= 50:
            performance_tier = "Average"
        elif overall_percentile >= 25:
            performance_tier = "Below Average"
        else:
            performance_tier = "Underperformer"
        
        return {
            "overall_percentile": overall_percentile,
            "overall_grade": overall_grade,
            "performance_tier": performance_tier,
            "category_scores": category_scores,
            "strengths_count": len([p for p in all_percentiles if p >= 75]),
            "weaknesses_count": len([p for p in all_percentiles if p <= 25])
        }
    
    def _peer_group_analysis(self, company_data: CompanyBenchmarkData,
                           industry_benchmarks: IndustryBenchmarks) -> Dict[str, Any]:
        """Analyze company's position within peer groups"""
        
        # Determine company size tier
        if company_data.market_cap >= 10000000000:  # $10B+
            size_tier = "large_cap"
        elif company_data.market_cap >= 2000000000:  # $2B+
            size_tier = "mid_cap"
        else:
            size_tier = "small_cap"
        
        # Get relevant peer group
        peer_group = industry_benchmarks.peer_groups.get(size_tier, [])
        
        return {
            "company_size_tier": size_tier,
            "peer_group_companies": peer_group,
            "peer_group_characteristics": {
                "typical_market_cap_range": self._get_size_tier_range(size_tier),
                "common_business_models": self._get_common_business_models(company_data.industry),
                "key_success_factors": self._get_key_success_factors(company_data.industry)
            }
        }
    
    def _analyze_competitive_position(self, company_data: CompanyBenchmarkData,
                                    industry_benchmarks: IndustryBenchmarks) -> Dict[str, Any]:
        """Analyze company's competitive position"""
        
        # Market share analysis (simplified)
        relative_size = company_data.market_cap / 5000000000  # Assume $5B industry average
        
        if relative_size >= 2.0:
            market_position = "Market Leader"
        elif relative_size >= 1.0:
            market_position = "Major Player"
        elif relative_size >= 0.5:
            market_position = "Significant Player"
        else:
            market_position = "Niche Player"
        
        # Competitive advantages
        competitive_advantages = []
        if company_data.gross_margin > industry_benchmarks.profitability_benchmarks["gross_margin"]["median"] * 1.2:
            competitive_advantages.append("Superior pricing power / cost structure")
        
        if company_data.roe > industry_benchmarks.profitability_benchmarks["roe"]["median"] * 1.2:
            competitive_advantages.append("Exceptional capital efficiency")
        
        if company_data.revenue_growth_1y > industry_benchmarks.growth_benchmarks["revenue_growth_1y"]["median"] * 1.5:
            competitive_advantages.append("Strong growth momentum")
        
        # Competitive threats
        competitive_threats = []
        if company_data.debt_to_equity > industry_benchmarks.leverage_benchmarks["debt_to_equity"]["median"] * 1.5:
            competitive_threats.append("High financial leverage")
        
        if company_data.current_ratio < industry_benchmarks.liquidity_benchmarks["current_ratio"]["median"] * 0.8:
            competitive_threats.append("Liquidity constraints")
        
        return {
            "market_position": market_position,
            "relative_size": relative_size,
            "competitive_advantages": competitive_advantages,
            "competitive_threats": competitive_threats,
            "competitive_moat_strength": self._assess_competitive_moat(company_data)
        }
    
    def _analyze_performance_trends(self, company_data: CompanyBenchmarkData) -> Dict[str, Any]:
        """Analyze performance trends"""
        
        # Compare 1-year vs 3-year growth
        revenue_acceleration = company_data.revenue_growth_1y - company_data.revenue_growth_3y
        earnings_acceleration = company_data.earnings_growth_1y - company_data.earnings_growth_3y
        
        trend_analysis = {
            "revenue_trend": "accelerating" if revenue_acceleration > 0.02 else "decelerating" if revenue_acceleration < -0.02 else "stable",
            "earnings_trend": "accelerating" if earnings_acceleration > 0.05 else "decelerating" if earnings_acceleration < -0.05 else "stable",
            "growth_consistency": self._assess_growth_consistency(company_data),
            "margin_trends": self._analyze_margin_trends(company_data)
        }
        
        return trend_analysis
    
    def _generate_improvement_recommendations(self, company_data: CompanyBenchmarkData,
                                           category_results: List[Dict[str, BenchmarkResult]]) -> List[Dict[str, Any]]:
        """Generate improvement recommendations based on benchmarking results"""
        
        recommendations = []
        
        # Analyze all benchmark results
        all_results = {}
        for category_result in category_results:
            all_results.update(category_result)
        
        # Identify areas with lowest percentile ranks
        weak_areas = [(name, result) for name, result in all_results.items() 
                     if result.percentile_rank < 25]
        
        # Sort by improvement potential
        weak_areas.sort(key=lambda x: x[1].improvement_potential, reverse=True)
        
        for metric_name, result in weak_areas[:5]:  # Top 5 improvement areas
            recommendations.append({
                "metric": metric_name,
                "current_performance": result.performance_grade,
                "improvement_potential": f"{result.improvement_potential:.1f}%",
                "target_value": result.industry_median * 1.2,  # Target 20% above median
                "priority": "High" if result.percentile_rank < 10 else "Medium",
                "recommended_actions": self._get_improvement_actions(metric_name, result)
            })
        
        return recommendations
    
    def _get_improvement_actions(self, metric_name: str, result: BenchmarkResult) -> List[str]:
        """Get specific improvement actions for a metric"""
        
        actions_map = {
            "gross_margin": [
                "Review pricing strategy and competitive positioning",
                "Optimize cost of goods sold through supplier negotiations",
                "Improve operational efficiency and automation",
                "Focus on higher-margin products/services"
            ],
            "operating_margin": [
                "Reduce operating expenses through efficiency improvements",
                "Optimize organizational structure and headcount",
                "Implement cost control measures",
                "Improve operational leverage"
            ],
            "current_ratio": [
                "Improve working capital management",
                "Optimize inventory levels",
                "Accelerate accounts receivable collection",
                "Build cash reserves"
            ],
            "debt_to_equity": [
                "Reduce debt levels through debt repayment",
                "Consider equity financing options",
                "Improve cash flow generation",
                "Refinance high-cost debt"
            ],
            "revenue_growth_1y": [
                "Enhance sales and marketing efforts",
                "Develop new products/services",
                "Expand into new markets",
                "Improve customer retention and expansion"
            ]
        }
        
        return actions_map.get(metric_name, ["Conduct detailed analysis to identify improvement opportunities"])
    
    def _find_peer_companies(self, company_data: CompanyBenchmarkData,
                           selection_criteria: Dict[str, Any]) -> List[CompanyBenchmarkData]:
        """Find peer companies based on selection criteria"""
        
        # In a real implementation, this would query a database
        # For demonstration, create synthetic peer companies
        
        peer_companies = []
        for i in range(5):  # Create 5 peer companies
            peer = CompanyBenchmarkData(
                company_name=f"Peer Company {i+1}",
                industry=company_data.industry,
                market_cap=company_data.market_cap * np.random.uniform(0.5, 2.0),
                revenue=company_data.revenue * np.random.uniform(0.3, 3.0),
                gross_margin=company_data.gross_margin * np.random.uniform(0.8, 1.2),
                operating_margin=company_data.operating_margin * np.random.uniform(0.7, 1.3),
                net_margin=company_data.net_margin * np.random.uniform(0.6, 1.4),
                roa=company_data.roa * np.random.uniform(0.7, 1.3),
                roe=company_data.roe * np.random.uniform(0.8, 1.2),
                roic=company_data.roic * np.random.uniform(0.8, 1.2),
                current_ratio=company_data.current_ratio * np.random.uniform(0.8, 1.3),
                quick_ratio=company_data.quick_ratio * np.random.uniform(0.8, 1.3),
                cash_ratio=company_data.cash_ratio * np.random.uniform(0.7, 1.4),
                debt_to_equity=company_data.debt_to_equity * np.random.uniform(0.5, 1.5),
                debt_to_assets=company_data.debt_to_assets * np.random.uniform(0.6, 1.4),
                debt_to_capital=company_data.debt_to_capital * np.random.uniform(0.6, 1.4),
                interest_coverage=company_data.interest_coverage * np.random.uniform(0.7, 1.5),
                asset_turnover=company_data.asset_turnover * np.random.uniform(0.8, 1.3),
                inventory_turnover=company_data.inventory_turnover * np.random.uniform(0.7, 1.4),
                receivables_turnover=company_data.receivables_turnover * np.random.uniform(0.8, 1.3),
                working_capital_turnover=company_data.working_capital_turnover * np.random.uniform(0.7, 1.3),
                revenue_growth_1y=company_data.revenue_growth_1y * np.random.uniform(0.5, 1.8),
                revenue_growth_3y=company_data.revenue_growth_3y * np.random.uniform(0.6, 1.6),
                earnings_growth_1y=company_data.earnings_growth_1y * np.random.uniform(0.4, 2.0),
                earnings_growth_3y=company_data.earnings_growth_3y * np.random.uniform(0.5, 1.8),
                pe_ratio=company_data.pe_ratio * np.random.uniform(0.7, 1.4),
                pb_ratio=company_data.pb_ratio * np.random.uniform(0.8, 1.3),
                ev_revenue=company_data.ev_revenue * np.random.uniform(0.6, 1.5),
                ev_ebitda=company_data.ev_ebitda * np.random.uniform(0.7, 1.4),
                peg_ratio=company_data.peg_ratio * np.random.uniform(0.6, 1.6),
                beta=company_data.beta * np.random.uniform(0.8, 1.3),
                dividend_yield=company_data.dividend_yield * np.random.uniform(0.5, 2.0),
                price_volatility=company_data.price_volatility * np.random.uniform(0.8, 1.3),
                geographic_region=company_data.geographic_region,
                sub_industry=company_data.sub_industry
            )
            peer_companies.append(peer)
        
        return peer_companies
    
    def _calculate_peer_statistics(self, peer_companies: List[CompanyBenchmarkData]) -> Dict[str, Dict[str, float]]:
        """Calculate statistics for peer group"""
        
        metrics = [
            "gross_margin", "operating_margin", "net_margin", "roa", "roe",
            "current_ratio", "quick_ratio", "debt_to_equity",
            "revenue_growth_1y", "pe_ratio"
        ]
        
        peer_stats = {}
        for metric in metrics:
            values = [getattr(peer, metric) for peer in peer_companies]
            peer_stats[metric] = {
                "median": np.median(values),
                "mean": np.mean(values),
                "std": np.std(values),
                "min": np.min(values),
                "max": np.max(values)
            }
        
        return peer_stats
    
    def _benchmark_against_peers(self, company_data: CompanyBenchmarkData,
                               peer_statistics: Dict[str, Dict[str, float]]) -> Dict[str, BenchmarkResult]:
        """Benchmark company against peer group"""
        
        results = {}
        
        for metric_name, peer_stats in peer_statistics.items():
            company_value = getattr(company_data, metric_name)
            results[metric_name] = self._create_benchmark_result(
                metric_name, company_value, peer_stats, higher_is_better=True
            )
        
        return results
    
    def _calculate_peer_rankings(self, company_data: CompanyBenchmarkData,
                               peer_companies: List[CompanyBenchmarkData]) -> Dict[str, Any]:
        """Calculate company's ranking among peers"""
        
        metrics = ["gross_margin", "operating_margin", "roa", "roe", "revenue_growth_1y"]
        rankings = {}
        
        for metric in metrics:
            all_values = [getattr(peer, metric) for peer in peer_companies] + [getattr(company_data, metric)]
            sorted_values = sorted(all_values, reverse=True)
            
            company_value = getattr(company_data, metric)
            rank = sorted_values.index(company_value) + 1
            total_companies = len(all_values)
            
            rankings[metric] = {
                "rank": rank,
                "out_of": total_companies,
                "percentile": (total_companies - rank) / total_companies * 100
            }
        
        return rankings
    
    def _identify_competitive_gaps(self, company_data: CompanyBenchmarkData,
                                 peer_companies: List[CompanyBenchmarkData]) -> Dict[str, Any]:
        """Identify competitive gaps vs peers"""
        
        gaps = {}
        
        # Find best-performing peer for each metric
        metrics = ["gross_margin", "operating_margin", "roa", "roe", "current_ratio"]
        
        for metric in metrics:
            peer_values = [getattr(peer, metric) for peer in peer_companies]
            best_peer_value = max(peer_values)
            company_value = getattr(company_data, metric)
            
            gap = (best_peer_value - company_value) / company_value * 100 if company_value > 0 else 0
            
            gaps[metric] = {
                "company_value": company_value,
                "best_peer_value": best_peer_value,
                "gap_percentage": gap,
                "improvement_needed": gap > 10  # Significant gap if >10%
            }
        
        return gaps
    
    def _generate_peer_insights(self, company_data: CompanyBenchmarkData,
                              peer_companies: List[CompanyBenchmarkData]) -> List[str]:
        """Generate insights from peer analysis"""
        
        insights = []
        
        # Calculate averages
        peer_avg_margins = np.mean([peer.gross_margin for peer in peer_companies])
        peer_avg_growth = np.mean([peer.revenue_growth_1y for peer in peer_companies])
        
        if company_data.gross_margin > peer_avg_margins * 1.1:
            insights.append("Company demonstrates superior margin performance vs peers")
        elif company_data.gross_margin < peer_avg_margins * 0.9:
            insights.append("Company margins lag behind peer group average")
        
        if company_data.revenue_growth_1y > peer_avg_growth * 1.2:
            insights.append("Company showing stronger growth momentum than peers")
        elif company_data.revenue_growth_1y < peer_avg_growth * 0.8:
            insights.append("Company growth is below peer group average")
        
        return insights
    
    # Additional helper methods for comprehensive analysis
    def _get_size_tier_range(self, size_tier: str) -> str:
        """Get market cap range for size tier"""
        ranges = {
            "large_cap": "$10B+",
            "mid_cap": "$2B - $10B",
            "small_cap": "Under $2B"
        }
        return ranges.get(size_tier, "Unknown")
    
    def _get_common_business_models(self, industry: Industry) -> List[str]:
        """Get common business models for industry"""
        models = {
            Industry.TECHNOLOGY: ["SaaS", "Platform", "Hardware", "Services"],
            Industry.HEALTHCARE: ["Pharmaceuticals", "Medical Devices", "Healthcare Services", "Biotechnology"],
            Industry.FINANCIAL_SERVICES: ["Banking", "Insurance", "Asset Management", "Fintech"]
        }
        return models.get(industry, ["Traditional", "Digital", "Hybrid"])
    
    def _get_key_success_factors(self, industry: Industry) -> List[str]:
        """Get key success factors for industry"""
        factors = {
            Industry.TECHNOLOGY: ["Innovation", "Scalability", "Market Timing", "Talent"],
            Industry.HEALTHCARE: ["R&D Capability", "Regulatory Compliance", "Distribution", "Clinical Efficacy"],
            Industry.FINANCIAL_SERVICES: ["Risk Management", "Customer Trust", "Technology", "Regulatory Compliance"]
        }
        return factors.get(industry, ["Market Position", "Operational Excellence", "Financial Strength"])
    
    def _assess_competitive_moat(self, company_data: CompanyBenchmarkData) -> str:
        """Assess competitive moat strength"""
        if company_data.roe > 0.20 and company_data.gross_margin > 0.60:
            return "Strong"
        elif company_data.roe > 0.15 and company_data.gross_margin > 0.40:
            return "Moderate"
        else:
            return "Weak"
    
    def _assess_growth_consistency(self, company_data: CompanyBenchmarkData) -> str:
        """Assess growth consistency"""
        growth_variance = abs(company_data.revenue_growth_1y - company_data.revenue_growth_3y)
        if growth_variance < 0.05:
            return "Highly Consistent"
        elif growth_variance < 0.15:
            return "Moderately Consistent"
        else:
            return "Volatile"
    
    def _analyze_margin_trends(self, company_data: CompanyBenchmarkData) -> Dict[str, str]:
        """Analyze margin trends"""
        # This would typically use historical data
        # For demonstration, provide general assessment
        return {
            "gross_margin_trend": "stable",
            "operating_margin_trend": "improving" if company_data.operating_margin > 0.1 else "declining",
            "net_margin_trend": "stable"
        }
    
    def _assess_benchmark_data_quality(self, industry_benchmarks: IndustryBenchmarks) -> str:
        """Assess quality of benchmark data"""
        if industry_benchmarks.sample_size >= 100:
            return "High"
        elif industry_benchmarks.sample_size >= 50:
            return "Medium"
        else:
            return "Low"


# Example usage
if __name__ == "__main__":
    # Sample company data
    sample_company = CompanyBenchmarkData(
        company_name="Sample Tech Company",
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
    
    # Perform comprehensive benchmarking
    benchmark_engine = BenchmarkEngine()
    results = benchmark_engine.comprehensive_benchmark_analysis(sample_company)
    
    print("Comprehensive Benchmark Analysis Results:")
    print(f"Overall Performance: {results['overall_performance']['performance_tier']}")
    print(f"Overall Grade: {results['overall_performance']['overall_grade']}")
    print(f"Overall Percentile: {results['overall_performance']['overall_percentile']:.1f}")
    
    print(f"\nProfitability Benchmarks:")
    for metric, result in results['category_benchmarks']['profitability'].items():
        print(f"  {metric}: {result.performance_grade} (Percentile: {result.percentile_rank:.1f})")
    
    print(f"\nTop Improvement Opportunities:")
    for rec in results['improvement_recommendations'][:3]:
        print(f"  {rec['metric']}: {rec['improvement_potential']} improvement potential")
