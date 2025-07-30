"""
SaaS Metrics Module for Technology Companies
Comprehensive analytics and KPIs specifically designed for SaaS businesses
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import numpy as np
from dateutil.relativedelta import relativedelta

class SaaSMetricType(Enum):
    """Types of SaaS metrics"""
    REVENUE = "revenue"
    CUSTOMER = "customer"
    PRODUCT = "product"
    MARKETING = "marketing"
    OPERATIONS = "operations"
    FINANCIAL = "financial"

class ChurnType(Enum):
    """Types of churn calculations"""
    CUSTOMER_CHURN = "customer_churn"
    REVENUE_CHURN = "revenue_churn"
    GROSS_CHURN = "gross_churn"
    NET_CHURN = "net_churn"

@dataclass
class SaaSCustomer:
    """SaaS customer data structure"""
    id: str
    subscription_start_date: datetime
    subscription_end_date: Optional[datetime] = None
    monthly_recurring_revenue: float = 0.0
    annual_contract_value: float = 0.0
    customer_acquisition_cost: float = 0.0
    lifetime_value: float = 0.0
    plan_type: str = "basic"
    is_active: bool = True
    expansion_revenue: float = 0.0
    contraction_revenue: float = 0.0
    payment_method: str = "credit_card"
    industry: str = ""
    company_size: str = ""
    acquisition_channel: str = ""

@dataclass
class SaaSSubscription:
    """SaaS subscription data structure"""
    id: str
    customer_id: str
    plan_name: str
    billing_cycle: str  # monthly, quarterly, annual
    mrr: float
    arr: float
    start_date: datetime
    end_date: Optional[datetime] = None
    status: str = "active"  # active, cancelled, paused, trial
    trial_end_date: Optional[datetime] = None
    discount_amount: float = 0.0
    seats: int = 1
    features: List[str] = field(default_factory=list)

@dataclass
class SaaSRevenue:
    """SaaS revenue tracking"""
    period: datetime
    new_mrr: float = 0.0
    expansion_mrr: float = 0.0
    contraction_mrr: float = 0.0
    churned_mrr: float = 0.0
    net_new_mrr: float = 0.0
    total_mrr: float = 0.0
    arr: float = 0.0
    deferred_revenue: float = 0.0
    recognized_revenue: float = 0.0

class SaaSMetricsCalculator:
    """SaaS metrics calculation engine"""
    
    def __init__(self):
        self.customers: List[SaaSCustomer] = []
        self.subscriptions: List[SaaSSubscription] = []
        self.revenue_data: List[SaaSRevenue] = []
    
    def add_customer(self, customer: SaaSCustomer):
        """Add customer data"""
        self.customers.append(customer)
    
    def add_subscription(self, subscription: SaaSSubscription):
        """Add subscription data"""
        self.subscriptions.append(subscription)
    
    def add_revenue_data(self, revenue: SaaSRevenue):
        """Add revenue data"""
        self.revenue_data.append(revenue)
    
    # Core SaaS Metrics
    
    def calculate_mrr(self, date: datetime = None) -> float:
        """Calculate Monthly Recurring Revenue"""
        if date is None:
            date = datetime.now()
        
        active_subscriptions = [
            sub for sub in self.subscriptions
            if sub.status == "active" and sub.start_date <= date and 
            (sub.end_date is None or sub.end_date > date)
        ]
        
        total_mrr = 0.0
        for subscription in active_subscriptions:
            if subscription.billing_cycle == "monthly":
                total_mrr += subscription.mrr
            elif subscription.billing_cycle == "quarterly":
                total_mrr += subscription.arr / 12
            elif subscription.billing_cycle == "annual":
                total_mrr += subscription.arr / 12
        
        return total_mrr
    
    def calculate_arr(self, date: datetime = None) -> float:
        """Calculate Annual Recurring Revenue"""
        mrr = self.calculate_mrr(date)
        return mrr * 12
    
    def calculate_churn_rate(self, start_date: datetime, end_date: datetime, 
                           churn_type: ChurnType = ChurnType.CUSTOMER_CHURN) -> Dict[str, float]:
        """Calculate churn rate for specified period"""
        
        if churn_type == ChurnType.CUSTOMER_CHURN:
            start_customers = len([
                c for c in self.customers 
                if c.subscription_start_date <= start_date and 
                (c.subscription_end_date is None or c.subscription_end_date > start_date)
            ])
            
            churned_customers = len([
                c for c in self.customers
                if c.subscription_end_date and 
                start_date <= c.subscription_end_date <= end_date
            ])
            
            churn_rate = (churned_customers / start_customers * 100) if start_customers > 0 else 0
            
            return {
                "churn_rate": churn_rate,
                "churned_customers": churned_customers,
                "total_customers": start_customers
            }
        
        elif churn_type == ChurnType.REVENUE_CHURN:
            start_mrr = self.calculate_mrr(start_date)
            churned_mrr = sum([
                c.monthly_recurring_revenue for c in self.customers
                if c.subscription_end_date and 
                start_date <= c.subscription_end_date <= end_date
            ])
            
            churn_rate = (churned_mrr / start_mrr * 100) if start_mrr > 0 else 0
            
            return {
                "churn_rate": churn_rate,
                "churned_mrr": churned_mrr,
                "start_mrr": start_mrr
            }
    
    def calculate_customer_lifetime_value(self, customer_id: str = None) -> Dict[str, float]:
        """Calculate Customer Lifetime Value"""
        if customer_id:
            customer = next((c for c in self.customers if c.id == customer_id), None)
            if not customer:
                return {"error": "Customer not found"}
            
            customers_to_analyze = [customer]
        else:
            customers_to_analyze = self.customers
        
        total_ltv = 0.0
        count = 0
        
        for customer in customers_to_analyze:
            # Calculate average revenue per month
            if customer.subscription_end_date:
                months_active = (customer.subscription_end_date - customer.subscription_start_date).days / 30.44
            else:
                months_active = (datetime.now() - customer.subscription_start_date).days / 30.44
            
            if months_active > 0:
                avg_monthly_revenue = customer.monthly_recurring_revenue
                ltv = avg_monthly_revenue * months_active
                total_ltv += ltv
                count += 1
        
        avg_ltv = total_ltv / count if count > 0 else 0
        
        return {
            "average_ltv": avg_ltv,
            "total_customers_analyzed": count
        }
    
    def calculate_customer_acquisition_cost(self, period_start: datetime, 
                                          period_end: datetime, 
                                          marketing_spend: float) -> Dict[str, float]:
        """Calculate Customer Acquisition Cost"""
        new_customers = len([
            c for c in self.customers
            if period_start <= c.subscription_start_date <= period_end
        ])
        
        cac = marketing_spend / new_customers if new_customers > 0 else 0
        
        return {
            "cac": cac,
            "marketing_spend": marketing_spend,
            "new_customers": new_customers
        }
    
    def calculate_ltv_cac_ratio(self, ltv: float, cac: float) -> Dict[str, Any]:
        """Calculate LTV:CAC ratio"""
        ratio = ltv / cac if cac > 0 else 0
        
        # Industry benchmarks
        if ratio >= 3.0:
            health = "excellent"
        elif ratio >= 2.0:
            health = "good"
        elif ratio >= 1.0:
            health = "acceptable"
        else:
            health = "poor"
        
        return {
            "ltv_cac_ratio": ratio,
            "health_status": health,
            "recommendation": self._get_ltv_cac_recommendation(ratio)
        }
    
    def _get_ltv_cac_recommendation(self, ratio: float) -> str:
        """Get recommendation based on LTV:CAC ratio"""
        if ratio >= 3.0:
            return "Excellent ratio. Consider increasing marketing spend to accelerate growth."
        elif ratio >= 2.0:
            return "Good ratio. Monitor closely and optimize customer onboarding."
        elif ratio >= 1.0:
            return "Acceptable but needs improvement. Focus on reducing CAC or increasing LTV."
        else:
            return "Poor ratio. Immediately review marketing efficiency and pricing strategy."
    
    # Advanced SaaS Metrics
    
    def calculate_net_revenue_retention(self, start_date: datetime, end_date: datetime) -> Dict[str, float]:
        """Calculate Net Revenue Retention (NRR)"""
        cohort_customers = [
            c for c in self.customers
            if c.subscription_start_date <= start_date
        ]
        
        start_revenue = sum([c.monthly_recurring_revenue for c in cohort_customers])
        
        # Calculate end revenue for the same cohort
        end_revenue = 0.0
        for customer in cohort_customers:
            if customer.subscription_end_date is None or customer.subscription_end_date > end_date:
                # Customer still active
                end_revenue += customer.monthly_recurring_revenue + customer.expansion_revenue - customer.contraction_revenue
        
        nrr = (end_revenue / start_revenue) if start_revenue > 0 else 0
        
        return {
            "net_revenue_retention": nrr * 100,
            "start_revenue": start_revenue,
            "end_revenue": end_revenue,
            "cohort_size": len(cohort_customers)
        }
    
    def calculate_gross_revenue_retention(self, start_date: datetime, end_date: datetime) -> Dict[str, float]:
        """Calculate Gross Revenue Retention (GRR)"""
        cohort_customers = [
            c for c in self.customers
            if c.subscription_start_date <= start_date
        ]
        
        start_revenue = sum([c.monthly_recurring_revenue for c in cohort_customers])
        
        # Calculate retained revenue (excluding expansion)
        retained_revenue = 0.0
        for customer in cohort_customers:
            if customer.subscription_end_date is None or customer.subscription_end_date > end_date:
                # Customer still active, count base revenue minus contractions
                retained_revenue += max(0, customer.monthly_recurring_revenue - customer.contraction_revenue)
        
        grr = (retained_revenue / start_revenue) if start_revenue > 0 else 0
        
        return {
            "gross_revenue_retention": grr * 100,
            "start_revenue": start_revenue,
            "retained_revenue": retained_revenue
        }
    
    def calculate_expansion_metrics(self, period_start: datetime, period_end: datetime) -> Dict[str, float]:
        """Calculate expansion metrics"""
        expansion_revenue = sum([
            c.expansion_revenue for c in self.customers
            if period_start <= c.subscription_start_date <= period_end
        ])
        
        contraction_revenue = sum([
            c.contraction_revenue for c in self.customers
            if period_start <= c.subscription_start_date <= period_end
        ])
        
        total_start_revenue = sum([
            c.monthly_recurring_revenue for c in self.customers
            if c.subscription_start_date <= period_start
        ])
        
        expansion_rate = (expansion_revenue / total_start_revenue * 100) if total_start_revenue > 0 else 0
        contraction_rate = (contraction_revenue / total_start_revenue * 100) if total_start_revenue > 0 else 0
        
        return {
            "expansion_revenue": expansion_revenue,
            "contraction_revenue": contraction_revenue,
            "net_expansion_revenue": expansion_revenue - contraction_revenue,
            "expansion_rate": expansion_rate,
            "contraction_rate": contraction_rate,
            "net_expansion_rate": expansion_rate - contraction_rate
        }
    
    def calculate_saas_quick_ratio(self, period_start: datetime, period_end: datetime) -> Dict[str, float]:
        """Calculate SaaS Quick Ratio"""
        expansion_metrics = self.calculate_expansion_metrics(period_start, period_end)
        churn_metrics = self.calculate_churn_rate(period_start, period_end, ChurnType.REVENUE_CHURN)
        
        new_mrr = sum([
            c.monthly_recurring_revenue for c in self.customers
            if period_start <= c.subscription_start_date <= period_end
        ])
        
        churned_mrr = churn_metrics.get("churned_mrr", 0)
        expansion_mrr = expansion_metrics.get("expansion_revenue", 0)
        contraction_mrr = expansion_metrics.get("contraction_revenue", 0)
        
        quick_ratio = ((new_mrr + expansion_mrr) / (churned_mrr + contraction_mrr)) if (churned_mrr + contraction_mrr) > 0 else 0
        
        return {
            "saas_quick_ratio": quick_ratio,
            "new_mrr": new_mrr,
            "expansion_mrr": expansion_mrr,
            "churned_mrr": churned_mrr,
            "contraction_mrr": contraction_mrr
        }
    
    # Cohort Analysis
    
    def perform_cohort_analysis(self, months_back: int = 12) -> Dict[str, Any]:
        """Perform cohort analysis"""
        end_date = datetime.now()
        start_date = end_date - relativedelta(months=months_back)
        
        cohorts = {}
        
        for i in range(months_back):
            cohort_start = start_date + relativedelta(months=i)
            cohort_end = cohort_start + relativedelta(months=1)
            
            cohort_customers = [
                c for c in self.customers
                if cohort_start <= c.subscription_start_date < cohort_end
            ]
            
            if cohort_customers:
                cohort_data = {
                    "cohort_month": cohort_start.strftime("%Y-%m"),
                    "initial_customers": len(cohort_customers),
                    "initial_revenue": sum([c.monthly_recurring_revenue for c in cohort_customers]),
                    "retention_by_month": {}
                }
                
                # Calculate retention for each subsequent month
                for j in range(1, months_back - i + 1):
                    retention_month = cohort_start + relativedelta(months=j)
                    
                    active_customers = len([
                        c for c in cohort_customers
                        if c.subscription_end_date is None or c.subscription_end_date > retention_month
                    ])
                    
                    retention_rate = (active_customers / len(cohort_customers)) * 100
                    cohort_data["retention_by_month"][f"month_{j}"] = {
                        "active_customers": active_customers,
                        "retention_rate": retention_rate
                    }
                
                cohorts[cohort_start.strftime("%Y-%m")] = cohort_data
        
        return {
            "cohort_analysis": cohorts,
            "analysis_period": f"{start_date.strftime('%Y-%m')} to {end_date.strftime('%Y-%m')}"
        }
    
    # SaaS Health Scoring
    
    def calculate_saas_health_score(self, date: datetime = None) -> Dict[str, Any]:
        """Calculate overall SaaS health score"""
        if date is None:
            date = datetime.now()
        
        # Get key metrics
        mrr = self.calculate_mrr(date)
        arr = self.calculate_arr(date)
        
        period_start = date - relativedelta(months=1)
        churn_metrics = self.calculate_churn_rate(period_start, date)
        ltv_metrics = self.calculate_customer_lifetime_value()
        
        # Calculate health score components (0-100 each)
        scores = {}
        
        # Revenue Growth Score
        prev_month = date - relativedelta(months=1)
        prev_mrr = self.calculate_mrr(prev_month)
        growth_rate = ((mrr - prev_mrr) / prev_mrr * 100) if prev_mrr > 0 else 0
        
        if growth_rate >= 20:
            scores["revenue_growth"] = 100
        elif growth_rate >= 10:
            scores["revenue_growth"] = 80
        elif growth_rate >= 5:
            scores["revenue_growth"] = 60
        elif growth_rate >= 0:
            scores["revenue_growth"] = 40
        else:
            scores["revenue_growth"] = 20
        
        # Churn Score (lower churn = higher score)
        churn_rate = churn_metrics.get("churn_rate", 0)
        if churn_rate <= 2:
            scores["churn"] = 100
        elif churn_rate <= 5:
            scores["churn"] = 80
        elif churn_rate <= 10:
            scores["churn"] = 60
        elif churn_rate <= 15:
            scores["churn"] = 40
        else:
            scores["churn"] = 20
        
        # Customer Satisfaction Score (based on retention)
        if churn_rate <= 3:
            scores["satisfaction"] = 100
        elif churn_rate <= 7:
            scores["satisfaction"] = 80
        elif churn_rate <= 12:
            scores["satisfaction"] = 60
        else:
            scores["satisfaction"] = 40
        
        # Financial Health Score
        if arr >= 1000000:  # $1M+ ARR
            scores["financial_health"] = 100
        elif arr >= 500000:
            scores["financial_health"] = 80
        elif arr >= 100000:
            scores["financial_health"] = 60
        elif arr >= 50000:
            scores["financial_health"] = 40
        else:
            scores["financial_health"] = 20
        
        # Overall Score
        overall_score = sum(scores.values()) / len(scores)
        
        # Health Status
        if overall_score >= 80:
            health_status = "excellent"
        elif overall_score >= 60:
            health_status = "good"
        elif overall_score >= 40:
            health_status = "fair"
        else:
            health_status = "poor"
        
        return {
            "overall_score": overall_score,
            "health_status": health_status,
            "component_scores": scores,
            "key_metrics": {
                "mrr": mrr,
                "arr": arr,
                "growth_rate": growth_rate,
                "churn_rate": churn_rate
            },
            "recommendations": self._get_health_recommendations(scores, overall_score)
        }
    
    def _get_health_recommendations(self, scores: Dict[str, float], overall_score: float) -> List[str]:
        """Get recommendations based on health scores"""
        recommendations = []
        
        if scores.get("revenue_growth", 0) < 60:
            recommendations.append("Focus on customer acquisition and expansion strategies")
        
        if scores.get("churn", 0) < 60:
            recommendations.append("Implement customer retention programs and improve onboarding")
        
        if scores.get("satisfaction", 0) < 60:
            recommendations.append("Conduct customer satisfaction surveys and improve product features")
        
        if scores.get("financial_health", 0) < 60:
            recommendations.append("Optimize pricing strategy and improve sales efficiency")
        
        if overall_score >= 80:
            recommendations.append("Excellent performance! Consider scaling operations and expanding market reach")
        
        return recommendations
    
    # Advanced Analytics
    
    def calculate_unit_economics(self) -> Dict[str, Any]:
        """Calculate unit economics for the SaaS business"""
        avg_ltv = self.calculate_customer_lifetime_value()["average_ltv"]
        
        # Calculate average CAC
        total_cac = sum([c.customer_acquisition_cost for c in self.customers])
        avg_cac = total_cac / len(self.customers) if self.customers else 0
        
        # Calculate payback period
        avg_mrr = sum([c.monthly_recurring_revenue for c in self.customers]) / len(self.customers) if self.customers else 0
        payback_period = avg_cac / avg_mrr if avg_mrr > 0 else 0
        
        ltv_cac = self.calculate_ltv_cac_ratio(avg_ltv, avg_cac)
        
        return {
            "average_ltv": avg_ltv,
            "average_cac": avg_cac,
            "average_mrr": avg_mrr,
            "payback_period_months": payback_period,
            "ltv_cac_ratio": ltv_cac["ltv_cac_ratio"],
            "unit_economics_health": ltv_cac["health_status"]
        }
    
    def generate_saas_dashboard_data(self, date: datetime = None) -> Dict[str, Any]:
        """Generate comprehensive dashboard data"""
        if date is None:
            date = datetime.now()
        
        # Core metrics
        mrr = self.calculate_mrr(date)
        arr = self.calculate_arr(date)
        
        # Period calculations
        period_start = date - relativedelta(months=1)
        churn_metrics = self.calculate_churn_rate(period_start, date)
        expansion_metrics = self.calculate_expansion_metrics(period_start, date)
        nrr_metrics = self.calculate_net_revenue_retention(period_start, date)
        
        # Health scoring
        health_score = self.calculate_saas_health_score(date)
        
        # Unit economics
        unit_economics = self.calculate_unit_economics()
        
        # Customer metrics
        total_customers = len([c for c in self.customers if c.is_active])
        new_customers_this_month = len([
            c for c in self.customers
            if period_start <= c.subscription_start_date <= date
        ])
        
        return {
            "summary": {
                "mrr": mrr,
                "arr": arr,
                "total_customers": total_customers,
                "new_customers": new_customers_this_month,
                "churn_rate": churn_metrics.get("churn_rate", 0),
                "nrr": nrr_metrics.get("net_revenue_retention", 0)
            },
            "growth_metrics": {
                "new_mrr": expansion_metrics.get("expansion_revenue", 0),
                "expansion_mrr": expansion_metrics.get("expansion_revenue", 0),
                "churned_mrr": churn_metrics.get("churned_mrr", 0),
                "net_new_mrr": expansion_metrics.get("net_expansion_revenue", 0)
            },
            "unit_economics": unit_economics,
            "health_score": health_score,
            "retention_metrics": {
                "nrr": nrr_metrics.get("net_revenue_retention", 0),
                "customer_churn": churn_metrics.get("churn_rate", 0),
                "revenue_churn": churn_metrics.get("churn_rate", 0)
            },
            "generated_at": date.isoformat()
        }

# SaaS Benchmarking and Industry Comparisons

class SaaSBenchmarks:
    """SaaS industry benchmarks and comparisons"""
    
    INDUSTRY_BENCHMARKS = {
        "churn_rate": {
            "excellent": 2.0,
            "good": 5.0,
            "average": 10.0,
            "poor": 15.0
        },
        "nrr": {
            "excellent": 120.0,
            "good": 110.0,
            "average": 100.0,
            "poor": 90.0
        },
        "ltv_cac_ratio": {
            "excellent": 5.0,
            "good": 3.0,
            "average": 2.0,
            "poor": 1.0
        },
        "payback_period": {
            "excellent": 6.0,
            "good": 12.0,
            "average": 18.0,
            "poor": 24.0
        }
    }
    
    @classmethod
    def compare_to_benchmarks(cls, metrics: Dict[str, float]) -> Dict[str, str]:
        """Compare company metrics to industry benchmarks"""
        comparisons = {}
        
        for metric, value in metrics.items():
            if metric in cls.INDUSTRY_BENCHMARKS:
                benchmarks = cls.INDUSTRY_BENCHMARKS[metric]
                
                if metric in ["churn_rate", "payback_period"]:  # Lower is better
                    if value <= benchmarks["excellent"]:
                        comparisons[metric] = "excellent"
                    elif value <= benchmarks["good"]:
                        comparisons[metric] = "good"
                    elif value <= benchmarks["average"]:
                        comparisons[metric] = "average"
                    else:
                        comparisons[metric] = "poor"
                else:  # Higher is better
                    if value >= benchmarks["excellent"]:
                        comparisons[metric] = "excellent"
                    elif value >= benchmarks["good"]:
                        comparisons[metric] = "good"
                    elif value >= benchmarks["average"]:
                        comparisons[metric] = "average"
                    else:
                        comparisons[metric] = "poor"
        
        return comparisons

# Example usage and testing

async def example_saas_metrics():
    """Example of SaaS metrics calculation"""
    calculator = SaaSMetricsCalculator()
    
    # Add sample customers
    customers = [
        SaaSCustomer(
            id="cust_001",
            subscription_start_date=datetime(2024, 1, 1),
            monthly_recurring_revenue=500.0,
            annual_contract_value=6000.0,
            customer_acquisition_cost=1000.0,
            plan_type="professional",
            acquisition_channel="google_ads"
        ),
        SaaSCustomer(
            id="cust_002",
            subscription_start_date=datetime(2024, 2, 1),
            monthly_recurring_revenue=200.0,
            annual_contract_value=2400.0,
            customer_acquisition_cost=400.0,
            plan_type="basic",
            acquisition_channel="organic"
        ),
        SaaSCustomer(
            id="cust_003",
            subscription_start_date=datetime(2024, 1, 15),
            subscription_end_date=datetime(2024, 6, 15),
            monthly_recurring_revenue=300.0,
            annual_contract_value=3600.0,
            customer_acquisition_cost=600.0,
            plan_type="professional",
            acquisition_channel="referral"
        )
    ]
    
    for customer in customers:
        calculator.add_customer(customer)
    
    # Calculate metrics
    mrr = calculator.calculate_mrr()
    arr = calculator.calculate_arr()
    ltv = calculator.calculate_customer_lifetime_value()
    churn = calculator.calculate_churn_rate(
        datetime(2024, 1, 1), 
        datetime(2024, 7, 1)
    )
    health_score = calculator.calculate_saas_health_score()
    
    print(f"MRR: ${mrr:,.2f}")
    print(f"ARR: ${arr:,.2f}")
    print(f"Average LTV: ${ltv['average_ltv']:,.2f}")
    print(f"Churn Rate: {churn['churn_rate']:.2f}%")
    print(f"Health Score: {health_score['overall_score']:.1f} ({health_score['health_status']})")
    
    # Generate dashboard
    dashboard = calculator.generate_saas_dashboard_data()
    return dashboard

if __name__ == "__main__":
    asyncio.run(example_saas_metrics())
