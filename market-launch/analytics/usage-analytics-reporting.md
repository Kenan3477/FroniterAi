# Usage Analytics and Reporting System

## Overview

Comprehensive analytics platform to track API usage, user behavior, system performance, and business metrics. Provides actionable insights for both customers and internal teams.

## Customer-Facing Analytics Dashboard

### Real-Time Usage Metrics

```python
"""
Customer Analytics Dashboard Backend
Provides real-time usage tracking and insights for API customers
"""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import pandas as pd
from dataclasses import dataclass
from redis import Redis
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

@dataclass
class UsageMetrics:
    """Data class for usage metrics"""
    total_calls: int
    successful_calls: int
    error_calls: int
    average_response_time: float
    peak_usage_time: str
    most_used_endpoint: str
    daily_breakdown: List[Dict[str, Any]]

class CustomerAnalytics:
    """
    Customer-facing analytics service
    Provides usage insights and optimization recommendations
    """
    
    def __init__(self, redis_client: Redis, db_session):
        self.redis = redis_client
        self.db = db_session
    
    async def get_usage_summary(self, user_id: str, period: str = "month") -> UsageMetrics:
        """Get comprehensive usage summary for customer"""
        
        # Define time periods
        periods = {
            "day": timedelta(days=1),
            "week": timedelta(days=7),
            "month": timedelta(days=30),
            "quarter": timedelta(days=90)
        }
        
        start_date = datetime.now() - periods[period]
        
        # Get aggregated metrics from database
        query = text("""
            SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as successful_calls,
                SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_calls,
                AVG(response_time_ms) as avg_response_time,
                endpoint,
                DATE(timestamp) as call_date,
                EXTRACT(HOUR FROM timestamp) as call_hour
            FROM api_calls 
            WHERE user_id = :user_id 
            AND timestamp >= :start_date
            GROUP BY endpoint, call_date, call_hour
            ORDER BY timestamp DESC
        """)
        
        results = self.db.execute(query, {
            'user_id': user_id, 
            'start_date': start_date
        }).fetchall()
        
        # Process results
        df = pd.DataFrame(results)
        
        if df.empty:
            return UsageMetrics(0, 0, 0, 0.0, "", "", [])
        
        # Calculate metrics
        total_calls = df['total_calls'].sum()
        successful_calls = df['successful_calls'].sum()
        error_calls = df['error_calls'].sum()
        avg_response_time = df['avg_response_time'].mean()
        
        # Find peak usage time
        hourly_usage = df.groupby('call_hour')['total_calls'].sum()
        peak_hour = hourly_usage.idxmax()
        peak_usage_time = f"{int(peak_hour):02d}:00"
        
        # Most used endpoint
        endpoint_usage = df.groupby('endpoint')['total_calls'].sum()
        most_used_endpoint = endpoint_usage.idxmax() if not endpoint_usage.empty else ""
        
        # Daily breakdown
        daily_breakdown = df.groupby('call_date').agg({
            'total_calls': 'sum',
            'successful_calls': 'sum',
            'error_calls': 'sum',
            'avg_response_time': 'mean'
        }).to_dict('records')
        
        return UsageMetrics(
            total_calls=int(total_calls),
            successful_calls=int(successful_calls),
            error_calls=int(error_calls),
            average_response_time=float(avg_response_time),
            peak_usage_time=peak_usage_time,
            most_used_endpoint=most_used_endpoint,
            daily_breakdown=daily_breakdown
        )
    
    async def get_cost_analysis(self, user_id: str, period: str = "month") -> Dict[str, Any]:
        """Analyze customer's API costs and optimization opportunities"""
        
        usage = await self.get_usage_summary(user_id, period)
        user_plan = await self.get_user_plan(user_id)
        
        # Calculate costs
        plan_allowance = user_plan['monthly_calls']
        overage_calls = max(0, usage.total_calls - plan_allowance)
        overage_rate = self.get_overage_rate(user_plan['tier'])
        overage_cost = overage_calls * overage_rate
        
        # Cost per call analysis
        total_cost = user_plan['monthly_price'] + overage_cost
        cost_per_call = total_cost / max(1, usage.total_calls)
        
        # Optimization recommendations
        recommendations = self.generate_cost_recommendations(
            usage, user_plan, overage_calls
        )
        
        return {
            'current_plan': user_plan['tier'],
            'monthly_base_cost': user_plan['monthly_price'],
            'overage_calls': overage_calls,
            'overage_cost': overage_cost,
            'total_monthly_cost': total_cost,
            'cost_per_call': cost_per_call,
            'usage_efficiency': usage.successful_calls / max(1, usage.total_calls),
            'recommendations': recommendations
        }
    
    async def get_performance_insights(self, user_id: str) -> Dict[str, Any]:
        """Provide performance optimization insights"""
        
        # Get performance metrics
        query = text("""
            SELECT 
                endpoint,
                AVG(response_time_ms) as avg_response_time,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
                COUNT(*) as total_calls,
                SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
            FROM api_calls 
            WHERE user_id = :user_id 
            AND timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY endpoint
        """)
        
        results = self.db.execute(query, {'user_id': user_id}).fetchall()
        
        performance_data = []
        for row in results:
            error_rate = row.error_count / max(1, row.total_calls)
            performance_score = self.calculate_performance_score(
                row.avg_response_time, error_rate
            )
            
            performance_data.append({
                'endpoint': row.endpoint,
                'avg_response_time': row.avg_response_time,
                'p95_response_time': row.p95_response_time,
                'error_rate': error_rate,
                'performance_score': performance_score,
                'total_calls': row.total_calls
            })
        
        # Generate insights
        insights = self.generate_performance_insights(performance_data)
        
        return {
            'performance_data': performance_data,
            'insights': insights,
            'overall_score': sum(p['performance_score'] for p in performance_data) / len(performance_data) if performance_data else 0
        }
    
    def generate_cost_recommendations(self, usage: UsageMetrics, plan: Dict, overage: int) -> List[str]:
        """Generate cost optimization recommendations"""
        recommendations = []
        
        if overage > plan['monthly_calls'] * 0.2:  # 20% overage
            recommendations.append(
                "Consider upgrading to the next tier to reduce per-call costs"
            )
        
        if usage.error_calls > usage.total_calls * 0.05:  # >5% error rate
            recommendations.append(
                "Reduce API errors to avoid wasted calls - check your error handling"
            )
        
        if usage.average_response_time > 2000:  # >2 second average
            recommendations.append(
                "Optimize your integration to reduce unnecessary API calls"
            )
        
        return recommendations
    
    def calculate_performance_score(self, response_time: float, error_rate: float) -> float:
        """Calculate performance score (0-100)"""
        # Response time component (0-50 points)
        if response_time < 500:
            time_score = 50
        elif response_time < 1000:
            time_score = 40
        elif response_time < 2000:
            time_score = 30
        else:
            time_score = 20
        
        # Error rate component (0-50 points)
        if error_rate < 0.01:  # <1%
            error_score = 50
        elif error_rate < 0.05:  # <5%
            error_score = 40
        elif error_rate < 0.1:  # <10%
            error_score = 30
        else:
            error_score = 20
        
        return time_score + error_score


class ReportGenerator:
    """
    Generate comprehensive usage reports for customers
    """
    
    def __init__(self, analytics_service: CustomerAnalytics):
        self.analytics = analytics_service
    
    async def generate_monthly_report(self, user_id: str, month: int, year: int) -> Dict[str, Any]:
        """Generate comprehensive monthly usage report"""
        
        # Get all metrics
        usage = await self.analytics.get_usage_summary(user_id, "month")
        cost_analysis = await self.analytics.get_cost_analysis(user_id, "month")
        performance = await self.analytics.get_performance_insights(user_id)
        
        # Calculate trends (compare to previous month)
        prev_usage = await self.analytics.get_usage_summary(user_id, "month")  # Would need date range
        
        report = {
            'report_period': f"{year}-{month:02d}",
            'generated_at': datetime.now().isoformat(),
            'user_id': user_id,
            
            'executive_summary': {
                'total_api_calls': usage.total_calls,
                'success_rate': usage.successful_calls / max(1, usage.total_calls),
                'total_cost': cost_analysis['total_monthly_cost'],
                'cost_efficiency': cost_analysis['cost_per_call'],
                'performance_score': performance['overall_score']
            },
            
            'usage_analysis': {
                'daily_usage_pattern': usage.daily_breakdown,
                'peak_usage_time': usage.peak_usage_time,
                'most_popular_endpoint': usage.most_used_endpoint,
                'endpoint_breakdown': self.get_endpoint_breakdown(user_id, month, year)
            },
            
            'financial_analysis': cost_analysis,
            'performance_analysis': performance,
            
            'recommendations': {
                'cost_optimization': cost_analysis['recommendations'],
                'performance_improvements': performance['insights'],
                'usage_optimization': self.generate_usage_recommendations(usage)
            },
            
            'trends': {
                'month_over_month_growth': self.calculate_mom_growth(usage, prev_usage),
                'seasonal_patterns': self.identify_patterns(user_id)
            }
        }
        
        return report
    
    async def export_report(self, report: Dict[str, Any], format: str = "pdf") -> bytes:
        """Export report in specified format (PDF, Excel, etc.)"""
        
        if format.lower() == "pdf":
            return await self.generate_pdf_report(report)
        elif format.lower() == "excel":
            return await self.generate_excel_report(report)
        elif format.lower() == "json":
            return json.dumps(report, indent=2).encode()
        else:
            raise ValueError(f"Unsupported export format: {format}")


# React component for customer analytics dashboard
ANALYTICS_DASHBOARD_COMPONENT = """
import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AnalyticsDashboard = ({ userId }) => {
    const [metrics, setMetrics] = useState(null);
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, [userId, period]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/analytics/summary/${userId}?period=${period}`);
            const data = await response.json();
            setMetrics(data.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading analytics...</div>;

    return (
        <div className="analytics-dashboard">
            {/* Period Selector */}
            <div className="period-selector">
                {['day', 'week', 'month', 'quarter'].map(p => (
                    <button 
                        key={p}
                        className={period === p ? 'active' : ''}
                        onClick={() => setPeriod(p)}
                    >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                ))}
            </div>

            {/* Key Metrics Cards */}
            <div className="metrics-grid">
                <MetricCard 
                    title="Total API Calls"
                    value={metrics.total_calls.toLocaleString()}
                    trend={metrics.call_trend}
                    color="blue"
                />
                <MetricCard 
                    title="Success Rate"
                    value={`${(metrics.success_rate * 100).toFixed(1)}%`}
                    trend={metrics.success_trend}
                    color="green"
                />
                <MetricCard 
                    title="Avg Response Time"
                    value={`${metrics.avg_response_time}ms`}
                    trend={metrics.performance_trend}
                    color="orange"
                />
                <MetricCard 
                    title="Monthly Cost"
                    value={`$${metrics.total_cost.toFixed(2)}`}
                    trend={metrics.cost_trend}
                    color="purple"
                />
            </div>

            {/* Usage Over Time Chart */}
            <div className="chart-container">
                <h3>Usage Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.daily_breakdown}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="total_calls" stroke="#8884d8" name="API Calls" />
                        <Line type="monotone" dataKey="error_calls" stroke="#ff7300" name="Errors" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Endpoint Usage Distribution */}
            <div className="chart-container">
                <h3>Endpoint Usage Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={metrics.endpoint_breakdown}
                            dataKey="calls"
                            nameKey="endpoint"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            label
                        >
                            {metrics.endpoint_breakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Performance Insights */}
            <div className="insights-panel">
                <h3>Performance Insights</h3>
                <div className="insights-list">
                    {metrics.insights.map((insight, index) => (
                        <div key={index} className={`insight-item ${insight.type}`}>
                            <span className="insight-icon">{insight.icon}</span>
                            <span className="insight-text">{insight.message}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cost Optimization */}
            <div className="optimization-panel">
                <h3>Cost Optimization</h3>
                <div className="cost-breakdown">
                    <div className="cost-item">
                        <span>Base Plan Cost:</span>
                        <span>${metrics.base_cost.toFixed(2)}</span>
                    </div>
                    <div className="cost-item">
                        <span>Overage Cost:</span>
                        <span>${metrics.overage_cost.toFixed(2)}</span>
                    </div>
                    <div className="cost-item total">
                        <span>Total Cost:</span>
                        <span>${metrics.total_cost.toFixed(2)}</span>
                    </div>
                </div>
                
                {metrics.recommendations.length > 0 && (
                    <div className="recommendations">
                        <h4>Recommendations</h4>
                        <ul>
                            {metrics.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, trend, color }) => (
    <div className={`metric-card ${color}`}>
        <div className="metric-title">{title}</div>
        <div className="metric-value">{value}</div>
        {trend && (
            <div className={`metric-trend ${trend > 0 ? 'up' : 'down'}`}>
                {trend > 0 ? '↗' : '↘'} {Math.abs(trend).toFixed(1)}%
            </div>
        )}
    </div>
);

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default AnalyticsDashboard;
"""
```

## Internal Business Intelligence

### Executive Dashboard KPIs

```python
class BusinessIntelligence:
    """
    Internal analytics for business intelligence and decision making
    """
    
    def __init__(self, db_session):
        self.db = db_session
    
    async def get_executive_dashboard(self) -> Dict[str, Any]:
        """Get high-level business metrics for executives"""
        
        # Revenue Metrics
        revenue_metrics = await self.get_revenue_metrics()
        
        # User Growth Metrics
        user_metrics = await self.get_user_growth_metrics()
        
        # API Usage Metrics
        usage_metrics = await self.get_api_usage_metrics()
        
        # Customer Health Metrics
        health_metrics = await self.get_customer_health_metrics()
        
        return {
            'revenue': revenue_metrics,
            'users': user_metrics,
            'usage': usage_metrics,
            'customer_health': health_metrics,
            'generated_at': datetime.now().isoformat()
        }
    
    async def get_revenue_metrics(self) -> Dict[str, Any]:
        """Calculate revenue-related metrics"""
        
        # Monthly Recurring Revenue (MRR)
        mrr_query = text("""
            SELECT 
                DATE_TRUNC('month', created_at) as month,
                SUM(amount) as monthly_revenue,
                COUNT(DISTINCT customer_id) as paying_customers
            FROM subscriptions 
            WHERE status = 'active'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        """)
        
        mrr_data = self.db.execute(mrr_query).fetchall()
        
        current_mrr = mrr_data[0].monthly_revenue if mrr_data else 0
        prev_mrr = mrr_data[1].monthly_revenue if len(mrr_data) > 1 else 0
        mrr_growth = ((current_mrr - prev_mrr) / max(1, prev_mrr)) * 100
        
        # Average Revenue Per User (ARPU)
        arpu = current_mrr / max(1, mrr_data[0].paying_customers) if mrr_data else 0
        
        # Customer Lifetime Value (LTV)
        ltv_query = text("""
            SELECT AVG(total_revenue / EXTRACT(MONTH FROM age(cancelled_at, created_at))) as avg_monthly_revenue,
                   AVG(EXTRACT(MONTH FROM age(COALESCE(cancelled_at, NOW()), created_at))) as avg_lifetime_months
            FROM subscriptions 
            WHERE created_at >= NOW() - INTERVAL '12 months'
        """)
        
        ltv_data = self.db.execute(ltv_query).fetchone()
        ltv = (ltv_data.avg_monthly_revenue or 0) * (ltv_data.avg_lifetime_months or 1)
        
        return {
            'current_mrr': current_mrr,
            'mrr_growth_rate': mrr_growth,
            'arpu': arpu,
            'ltv': ltv,
            'mrr_trend': [{'month': r.month, 'revenue': r.monthly_revenue} for r in mrr_data]
        }
    
    async def get_api_usage_metrics(self) -> Dict[str, Any]:
        """Get API usage and performance metrics"""
        
        # Total API calls
        usage_query = text("""
            SELECT 
                DATE(timestamp) as date,
                COUNT(*) as total_calls,
                COUNT(DISTINCT user_id) as unique_users,
                AVG(response_time_ms) as avg_response_time,
                SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
            FROM api_calls 
            WHERE timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date DESC
        """)
        
        usage_data = self.db.execute(usage_query).fetchall()
        
        total_calls_30d = sum(r.total_calls for r in usage_data)
        avg_response_time = sum(r.avg_response_time for r in usage_data) / len(usage_data) if usage_data else 0
        error_rate = sum(r.error_count for r in usage_data) / max(1, total_calls_30d)
        
        # Endpoint popularity
        endpoint_query = text("""
            SELECT endpoint, COUNT(*) as calls
            FROM api_calls 
            WHERE timestamp >= NOW() - INTERVAL '30 days'
            GROUP BY endpoint
            ORDER BY calls DESC
            LIMIT 10
        """)
        
        popular_endpoints = self.db.execute(endpoint_query).fetchall()
        
        return {
            'total_calls_30d': total_calls_30d,
            'avg_response_time': avg_response_time,
            'error_rate': error_rate,
            'daily_usage': [{'date': r.date, 'calls': r.total_calls} for r in usage_data],
            'popular_endpoints': [{'endpoint': r.endpoint, 'calls': r.calls} for r in popular_endpoints]
        }

# Automated alerting system
class AlertSystem:
    """
    Automated alerting for business metrics and system health
    """
    
    def __init__(self, notification_service):
        self.notifications = notification_service
    
    async def check_business_alerts(self):
        """Check for business metric alerts"""
        
        alerts = []
        
        # Revenue alerts
        if await self.check_revenue_decline():
            alerts.append({
                'type': 'revenue',
                'severity': 'high',
                'message': 'Monthly revenue declined by >10%'
            })
        
        # Churn alerts
        churn_rate = await self.calculate_churn_rate()
        if churn_rate > 0.05:  # >5% monthly churn
            alerts.append({
                'type': 'churn',
                'severity': 'medium',
                'message': f'Monthly churn rate is {churn_rate:.1%}'
            })
        
        # Usage alerts
        if await self.check_usage_decline():
            alerts.append({
                'type': 'usage',
                'severity': 'medium',
                'message': 'API usage declined by >20% this week'
            })
        
        # Performance alerts
        error_rate = await self.get_error_rate()
        if error_rate > 0.05:  # >5% error rate
            alerts.append({
                'type': 'performance',
                'severity': 'high',
                'message': f'API error rate is {error_rate:.1%}'
            })
        
        # Send alerts
        for alert in alerts:
            await self.notifications.send_alert(alert)
        
        return alerts
```

This comprehensive analytics system provides both customer-facing insights and internal business intelligence to drive data-driven decisions and improve customer success.
