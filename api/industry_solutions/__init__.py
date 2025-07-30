"""
Industry Solutions API - Main Module
Unified API for all industry-specific analytics and operational modules
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import asyncio
import json

# Import all industry modules
from .saas_metrics import SaaSMetricsCalculator
from .retail_inventory import InventoryManager, DemandForecaster, RetailAnalytics
from .healthcare_compliance import HIPAAComplianceManager, HealthcareBillingManager
from .manufacturing_efficiency import ManufacturingMetricsCalculator, SupplyChainAnalyzer
from .financial_services import RiskCalculationEngine

app = FastAPI(
    title="Industry Solutions API",
    description="Comprehensive industry-specific analytics and operational modules",
    version="1.0.0",
    docs_url="/industry-solutions/docs",
    redoc_url="/industry-solutions/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances (in production, these would be managed by dependency injection)
saas_calculator = SaaSMetricsCalculator()
inventory_manager = InventoryManager()
demand_forecaster = DemandForecaster(inventory_manager)
retail_analytics = RetailAnalytics(inventory_manager)
hipaa_manager = HIPAAComplianceManager()
billing_manager = HealthcareBillingManager()
manufacturing_calculator = ManufacturingMetricsCalculator()
supply_chain_analyzer = SupplyChainAnalyzer()
risk_engine = RiskCalculationEngine()

# ============================================================================
# SaaS Metrics Endpoints
# ============================================================================

@app.get("/saas/metrics/{customer_id}")
async def get_saas_metrics(
    customer_id: str,
    period_months: int = Query(12, description="Period in months for calculations")
):
    """Get comprehensive SaaS metrics for a customer"""
    try:
        metrics = saas_calculator.calculate_comprehensive_metrics(customer_id, period_months)
        return {"status": "success", "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saas/mrr")
async def get_mrr_analysis(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get Monthly Recurring Revenue analysis"""
    try:
        if start_date:
            start_date = datetime.fromisoformat(start_date)
        if end_date:
            end_date = datetime.fromisoformat(end_date)
        
        mrr_data = saas_calculator.calculate_mrr_metrics(start_date, end_date)
        return {"status": "success", "data": mrr_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saas/churn")
async def get_churn_analysis(
    period_months: int = Query(6, description="Period in months for analysis")
):
    """Get customer churn analysis"""
    try:
        churn_data = saas_calculator.calculate_churn_metrics(period_months)
        return {"status": "success", "data": churn_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saas/ltv/{customer_id}")
async def get_customer_ltv(customer_id: str):
    """Get Customer Lifetime Value for specific customer"""
    try:
        ltv_data = saas_calculator.calculate_customer_ltv(customer_id)
        return {"status": "success", "data": ltv_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saas/cohorts")
async def get_cohort_analysis(
    cohort_type: str = Query("monthly", description="Cohort type: monthly, quarterly"),
    metric: str = Query("retention", description="Metric: retention, revenue")
):
    """Get cohort analysis"""
    try:
        cohort_data = saas_calculator.calculate_cohort_analysis(cohort_type, metric)
        return {"status": "success", "data": cohort_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/saas/dashboard")
async def get_saas_dashboard():
    """Get comprehensive SaaS metrics dashboard"""
    try:
        dashboard = saas_calculator.generate_saas_dashboard()
        return {"status": "success", "data": dashboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Retail Inventory & Forecasting Endpoints
# ============================================================================

@app.get("/retail/inventory/status")
async def get_inventory_status(
    location_id: Optional[str] = Query(None, description="Specific location ID")
):
    """Get current inventory status"""
    try:
        if location_id:
            inventory_items = [item for item in inventory_manager.inventory if item.location_id == location_id]
        else:
            inventory_items = inventory_manager.inventory
        
        status_summary = {}
        for item in inventory_items:
            status = item.status.value
            status_summary[status] = status_summary.get(status, 0) + 1
        
        return {
            "status": "success",
            "data": {
                "total_items": len(inventory_items),
                "status_breakdown": status_summary,
                "location_id": location_id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/inventory/turnover/{product_id}")
async def get_inventory_turnover(
    product_id: str,
    location_id: str,
    days: int = Query(365, description="Period in days")
):
    """Get inventory turnover analysis for a product"""
    try:
        turnover_data = inventory_manager.calculate_inventory_turnover(product_id, location_id, days)
        return {"status": "success", "data": turnover_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/inventory/abc-analysis")
async def get_abc_analysis(
    location_id: Optional[str] = Query(None, description="Specific location ID")
):
    """Get ABC analysis of inventory"""
    try:
        abc_data = inventory_manager.calculate_abc_analysis(location_id)
        return {"status": "success", "data": abc_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/inventory/slow-moving")
async def get_slow_moving_items(
    days_threshold: int = Query(90, description="Days without sale threshold")
):
    """Get slow-moving inventory items"""
    try:
        slow_items = inventory_manager.identify_slow_moving_items(days_threshold)
        return {"status": "success", "data": slow_items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/inventory/reorder-recommendations")
async def get_reorder_recommendations():
    """Get reorder recommendations"""
    try:
        recommendations = inventory_manager.generate_reorder_recommendations()
        return {"status": "success", "data": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/forecast/{product_id}")
async def get_demand_forecast(
    product_id: str,
    location_id: str,
    forecast_days: int = Query(30, description="Number of days to forecast"),
    method: str = Query("exponential_smoothing", description="Forecasting method")
):
    """Get demand forecast for a product"""
    try:
        from .retail_inventory import ForecastMethod
        forecast_method = ForecastMethod(method)
        forecast_data = demand_forecaster.generate_forecast(product_id, location_id, forecast_days, forecast_method)
        return {"status": "success", "data": forecast_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/analytics/performance")
async def get_product_performance(
    days: int = Query(90, description="Period in days")
):
    """Get product performance analysis"""
    try:
        performance_data = retail_analytics.analyze_product_performance(days)
        return {"status": "success", "data": performance_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/retail/dashboard")
async def get_retail_dashboard(
    location_id: Optional[str] = Query(None, description="Specific location ID")
):
    """Get comprehensive retail dashboard"""
    try:
        dashboard = retail_analytics.generate_retail_dashboard(location_id)
        return {"status": "success", "data": dashboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Healthcare Compliance & Billing Endpoints
# ============================================================================

@app.get("/healthcare/compliance/audit")
async def run_compliance_audit(
    audit_type: str = Query("hipaa", description="Audit type: hipaa, hitech, internal")
):
    """Run comprehensive compliance audit"""
    try:
        from .healthcare_compliance import AuditType
        audit_type_enum = AuditType(audit_type.upper())
        audit_results = hipaa_manager.run_compliance_audit(audit_type_enum)
        return {"status": "success", "data": audit_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/healthcare/compliance/report")
async def get_compliance_report(
    days: int = Query(30, description="Period in days")
):
    """Get compliance status report"""
    try:
        report = hipaa_manager.generate_compliance_report(days)
        return {"status": "success", "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/healthcare/billing/metrics")
async def get_billing_metrics(
    days: int = Query(30, description="Period in days")
):
    """Get revenue cycle metrics"""
    try:
        metrics = billing_manager.calculate_revenue_metrics(days)
        return {"status": "success", "data": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/healthcare/billing/opportunities")
async def get_billing_opportunities():
    """Get billing optimization opportunities"""
    try:
        opportunities = billing_manager.identify_billing_opportunities()
        return {"status": "success", "data": opportunities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/healthcare/billing/dashboard")
async def get_billing_dashboard():
    """Get comprehensive billing dashboard"""
    try:
        dashboard = billing_manager.generate_billing_dashboard()
        return {"status": "success", "data": dashboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Manufacturing Efficiency & Supply Chain Endpoints
# ============================================================================

@app.get("/manufacturing/oee/{equipment_id}")
async def get_equipment_oee(
    equipment_id: str,
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)")
):
    """Get Overall Equipment Effectiveness (OEE) for equipment"""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        oee_data = manufacturing_calculator.calculate_oee(equipment_id, start_dt, end_dt)
        return {"status": "success", "data": oee_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manufacturing/cycle-time/{product_id}")
async def get_cycle_time_analysis(
    product_id: str,
    days: int = Query(30, description="Period in days")
):
    """Get manufacturing cycle time analysis"""
    try:
        cycle_time_data = manufacturing_calculator.calculate_cycle_time(product_id, days)
        return {"status": "success", "data": cycle_time_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manufacturing/quality/yield")
async def get_first_pass_yield(
    product_id: Optional[str] = Query(None, description="Specific product ID"),
    days: int = Query(30, description="Period in days")
):
    """Get first pass yield analysis"""
    try:
        yield_data = manufacturing_calculator.calculate_first_pass_yield(product_id, days)
        return {"status": "success", "data": yield_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manufacturing/work-center/{work_center_id}/efficiency")
async def get_work_center_efficiency(
    work_center_id: str,
    days: int = Query(30, description="Period in days")
):
    """Get work center efficiency metrics"""
    try:
        efficiency_data = manufacturing_calculator.calculate_work_center_efficiency(work_center_id, days)
        return {"status": "success", "data": efficiency_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manufacturing/schedule/performance")
async def get_schedule_performance(
    days: int = Query(30, description="Period in days")
):
    """Get production schedule adherence analysis"""
    try:
        schedule_data = manufacturing_calculator.analyze_production_schedule_performance(days)
        return {"status": "success", "data": schedule_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/supply-chain/supplier/{supplier_id}/performance")
async def get_supplier_performance(
    supplier_id: str,
    days: int = Query(90, description="Period in days")
):
    """Get supplier performance metrics"""
    try:
        performance_data = supply_chain_analyzer.calculate_supplier_performance(supplier_id, days)
        return {"status": "success", "data": performance_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/supply-chain/inventory/optimization")
async def get_inventory_optimization():
    """Get inventory optimization analysis"""
    try:
        optimization_data = supply_chain_analyzer.analyze_inventory_optimization()
        return {"status": "success", "data": optimization_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/supply-chain/risk/assessment")
async def get_supply_chain_risk():
    """Get supply chain risk assessment"""
    try:
        risk_data = supply_chain_analyzer.calculate_supply_chain_risk()
        return {"status": "success", "data": risk_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manufacturing/dashboard")
async def get_manufacturing_dashboard():
    """Get comprehensive manufacturing dashboard"""
    try:
        from .manufacturing_efficiency import generate_manufacturing_dashboard
        dashboard = generate_manufacturing_dashboard(manufacturing_calculator, supply_chain_analyzer)
        return {"status": "success", "data": dashboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Financial Services Risk & Compliance Endpoints
# ============================================================================

@app.get("/financial/risk/credit/{customer_id}")
async def get_credit_risk_analysis(customer_id: str):
    """Get credit risk analysis for a customer"""
    try:
        credit_risk = risk_engine.calculate_credit_risk(customer_id)
        return {"status": "success", "data": credit_risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial/risk/market/{portfolio_id}")
async def get_market_risk_analysis(portfolio_id: str):
    """Get market risk analysis for a portfolio"""
    try:
        market_risk = risk_engine.calculate_market_risk(portfolio_id)
        return {"status": "success", "data": market_risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial/compliance/aml")
async def get_aml_monitoring(
    customer_id: Optional[str] = Query(None, description="Specific customer ID")
):
    """Get Anti-Money Laundering monitoring results"""
    try:
        aml_data = risk_engine.monitor_aml_compliance(customer_id)
        return {"status": "success", "data": aml_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial/compliance/stress-test")
async def run_compliance_stress_test(
    framework: str = Query("basel_iii", description="Compliance framework: basel_iii, aml_bsa")
):
    """Run compliance stress testing"""
    try:
        from .financial_services import ComplianceFramework
        framework_enum = ComplianceFramework(framework.upper())
        stress_test_results = risk_engine.run_compliance_stress_test(framework_enum)
        return {"status": "success", "data": stress_test_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial/dashboard")
async def get_financial_risk_dashboard(
    period_days: int = Query(30, description="Period in days")
):
    """Get comprehensive financial risk dashboard"""
    try:
        dashboard = risk_engine.generate_risk_dashboard(period_days)
        return {"status": "success", "data": dashboard}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Cross-Industry Analytics Endpoints
# ============================================================================

@app.get("/analytics/industry-overview")
async def get_industry_overview():
    """Get overview of all industry solutions"""
    try:
        overview = {
            "available_industries": [
                {
                    "id": "saas",
                    "name": "SaaS & Technology",
                    "description": "Comprehensive SaaS metrics including MRR, ARR, churn, LTV, and cohort analysis",
                    "key_metrics": ["MRR", "ARR", "Churn Rate", "LTV", "CAC", "NRR"],
                    "endpoints_count": 6
                },
                {
                    "id": "retail",
                    "name": "Retail & E-commerce",
                    "description": "Inventory management, demand forecasting, and retail analytics",
                    "key_metrics": ["Inventory Turnover", "Stockout Rate", "Demand Forecast", "ABC Classification"],
                    "endpoints_count": 8
                },
                {
                    "id": "healthcare",
                    "name": "Healthcare",
                    "description": "HIPAA compliance tracking and revenue cycle management",
                    "key_metrics": ["Compliance Rate", "Denial Rate", "Collection Rate", "Days in A/R"],
                    "endpoints_count": 5
                },
                {
                    "id": "manufacturing",
                    "name": "Manufacturing",
                    "description": "Production efficiency and supply chain optimization",
                    "key_metrics": ["OEE", "Cycle Time", "First Pass Yield", "Schedule Adherence"],
                    "endpoints_count": 8
                },
                {
                    "id": "financial",
                    "name": "Financial Services",
                    "description": "Risk management and regulatory compliance",
                    "key_metrics": ["VaR", "Credit Risk Score", "Capital Ratio", "AML Alerts"],
                    "endpoints_count": 5
                }
            ],
            "total_endpoints": 32,
            "last_updated": datetime.now().isoformat()
        }
        return {"status": "success", "data": overview}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/performance-comparison")
async def get_performance_comparison(
    industries: List[str] = Query(["saas", "retail"], description="Industries to compare"),
    metric_type: str = Query("efficiency", description="Metric type: efficiency, compliance, risk")
):
    """Get cross-industry performance comparison"""
    try:
        # Simulate cross-industry comparison
        comparison_data = {
            "comparison_type": metric_type,
            "industries_compared": industries,
            "metrics": {},
            "benchmarks": {},
            "insights": []
        }
        
        for industry in industries:
            if industry == "saas":
                comparison_data["metrics"]["saas"] = {
                    "efficiency_score": 85.2,
                    "compliance_score": 92.1,
                    "risk_score": 15.3
                }
            elif industry == "retail":
                comparison_data["metrics"]["retail"] = {
                    "efficiency_score": 78.9,
                    "compliance_score": 88.5,
                    "risk_score": 22.1
                }
            elif industry == "healthcare":
                comparison_data["metrics"]["healthcare"] = {
                    "efficiency_score": 82.7,
                    "compliance_score": 95.8,
                    "risk_score": 18.9
                }
            elif industry == "manufacturing":
                comparison_data["metrics"]["manufacturing"] = {
                    "efficiency_score": 79.4,
                    "compliance_score": 89.2,
                    "risk_score": 20.5
                }
            elif industry == "financial":
                comparison_data["metrics"]["financial"] = {
                    "efficiency_score": 81.6,
                    "compliance_score": 94.3,
                    "risk_score": 25.8
                }
        
        # Generate insights
        if "saas" in industries and "retail" in industries:
            comparison_data["insights"].append("SaaS companies show higher compliance scores but similar efficiency")
            comparison_data["insights"].append("Retail operations have higher operational risk exposure")
        
        return {"status": "success", "data": comparison_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics/recommendations")
async def get_cross_industry_recommendations(
    industry: str = Query(..., description="Primary industry focus"),
    focus_area: str = Query("all", description="Focus area: efficiency, compliance, risk, all")
):
    """Get cross-industry best practice recommendations"""
    try:
        recommendations = {
            "industry": industry,
            "focus_area": focus_area,
            "recommendations": [],
            "best_practices": [],
            "implementation_priority": []
        }
        
        # Industry-specific recommendations
        if industry == "saas":
            recommendations["recommendations"].extend([
                "Implement automated churn prediction using ML models",
                "Optimize pricing tiers based on customer LTV analysis",
                "Establish cohort-based retention strategies"
            ])
        elif industry == "retail":
            recommendations["recommendations"].extend([
                "Implement demand sensing for improved forecasting accuracy",
                "Optimize safety stock levels using ABC analysis",
                "Deploy dynamic pricing based on inventory levels"
            ])
        elif industry == "healthcare":
            recommendations["recommendations"].extend([
                "Automate HIPAA compliance monitoring",
                "Implement predictive analytics for claim denials",
                "Optimize revenue cycle with AI-powered coding"
            ])
        elif industry == "manufacturing":
            recommendations["recommendations"].extend([
                "Implement predictive maintenance to improve OEE",
                "Optimize production scheduling using constraint theory",
                "Deploy real-time quality monitoring systems"
            ])
        elif industry == "financial":
            recommendations["recommendations"].extend([
                "Enhance real-time fraud detection capabilities",
                "Implement stress testing automation",
                "Deploy advanced AML transaction monitoring"
            ])
        
        # Cross-industry best practices
        recommendations["best_practices"] = [
            "Implement real-time dashboards for key metrics",
            "Establish automated alerting for threshold breaches",
            "Create regular reporting cadence for stakeholders",
            "Invest in staff training for analytics tools",
            "Establish data governance frameworks"
        ]
        
        return {"status": "success", "data": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Health Check and System Status
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "modules": {
            "saas_metrics": "operational",
            "retail_inventory": "operational",
            "healthcare_compliance": "operational",
            "manufacturing_efficiency": "operational",
            "financial_services": "operational"
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Industry Solutions API",
        "version": "1.0.0",
        "documentation": "/industry-solutions/docs",
        "industries_supported": [
            "SaaS & Technology",
            "Retail & E-commerce", 
            "Healthcare",
            "Manufacturing",
            "Financial Services"
        ],
        "total_endpoints": 32
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
