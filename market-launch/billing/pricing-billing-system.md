# Pricing Strategy and Billing Integration

## Pricing Tiers Overview

### Starter Tier - $99/month
**Perfect for small businesses and startups**

**API Limits:**
- 10,000 API calls/month
- 60 requests/minute
- 1,000 requests/hour

**Features Included:**
- ✅ Financial Analysis
- ✅ Basic Trend Analysis
- ✅ Industry Benchmarking (limited)
- ✅ Email Support
- ✅ Documentation Access
- ✅ Community Forum
- ❌ Valuation Analysis
- ❌ Strategic Planning
- ❌ Competitive Analysis
- ❌ Phone Support

**Use Cases:**
- Basic financial health checks
- Simple trend monitoring
- Startup financial planning
- Small business analytics

---

### Professional Tier - $399/month
**Ideal for growing companies and consultants**

**API Limits:**
- 50,000 API calls/month
- 300 requests/minute
- 5,000 requests/hour

**Features Included:**
- ✅ All Starter features
- ✅ Company Valuation Analysis
- ✅ Advanced Trend Analysis
- ✅ Strategic Planning
- ✅ Complete Industry Benchmarking
- ✅ Priority Email Support
- ✅ Live Chat Support
- ✅ Phone Support (business hours)
- ✅ Video Call Support
- ✅ Advanced SDKs
- ❌ Competitive Analysis
- ❌ Custom Training

**Use Cases:**
- Comprehensive financial analysis
- Strategic business planning
- Investment decisions
- Consulting services
- Mid-market company analysis

---

### Enterprise Tier - $1,299/month
**Designed for large enterprises and financial institutions**

**API Limits:**
- 200,000 API calls/month
- 1,000 requests/minute
- 20,000 requests/hour

**Features Included:**
- ✅ All Professional features
- ✅ Competitive Analysis
- ✅ Custom Integrations
- ✅ Dedicated Customer Success Manager
- ✅ 24/7 Phone Support
- ✅ Priority Queue Processing
- ✅ Custom Training & Onboarding
- ✅ SLA Guarantees
- ✅ White-label Options
- ✅ Custom Reports
- ✅ Multi-user Management
- ✅ Advanced Analytics Dashboard

**Additional Benefits:**
- Custom rate limits available
- Priority feature requests
- Beta access to new features
- Quarterly business reviews
- Custom contract terms

**Use Cases:**
- Enterprise-wide financial analysis
- Investment banking
- Private equity analysis
- Large-scale consulting
- Financial technology platforms

---

### Custom/Enterprise+ - Contact Sales
**For unique requirements and high-volume usage**

**Features:**
- Custom API limits
- Dedicated infrastructure
- Custom feature development
- White-label solutions
- On-premise deployment options
- Custom SLAs
- 24/7 dedicated support

## Usage-Based Add-ons

### Additional API Calls
- **Starter**: $0.02 per additional call
- **Professional**: $0.015 per additional call  
- **Enterprise**: $0.01 per additional call

### Premium Features (Professional/Enterprise)
- **Real-time Data Feeds**: +$199/month
- **Advanced AI Models**: +$299/month
- **Custom Industry Models**: +$499/month
- **Multi-region Deployment**: +$399/month

### Professional Services
- **Implementation Consulting**: $200/hour
- **Custom Training**: $2,500/day
- **Custom Integration Development**: $300/hour
- **Dedicated Support Engineer**: $5,000/month

## Billing System Implementation

### Payment Processing Integration

```python
import stripe
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class BillingManager:
    """
    Comprehensive billing management system for Frontier Business API
    """
    
    def __init__(self, stripe_secret_key: str):
        stripe.api_key = stripe_secret_key
        self.pricing_plans = {
            'starter': {
                'price_id': 'price_starter_monthly',
                'monthly_calls': 10000,
                'rate_limits': {'minute': 60, 'hour': 1000},
                'price': 99.00,
                'features': ['financial_analysis', 'basic_trends', 'benchmarking']
            },
            'professional': {
                'price_id': 'price_professional_monthly',
                'monthly_calls': 50000,
                'rate_limits': {'minute': 300, 'hour': 5000},
                'price': 399.00,
                'features': ['all_starter', 'valuation', 'strategic_planning']
            },
            'enterprise': {
                'price_id': 'price_enterprise_monthly',
                'monthly_calls': 200000,
                'rate_limits': {'minute': 1000, 'hour': 20000},
                'price': 1299.00,
                'features': ['all_professional', 'competitive_analysis', 'dedicated_support']
            }
        }
    
    def create_customer(self, user_data: Dict[str, Any]) -> str:
        """Create Stripe customer"""
        try:
            customer = stripe.Customer.create(
                email=user_data['email'],
                name=user_data.get('name'),
                metadata={
                    'user_id': user_data['user_id'],
                    'company': user_data.get('company', ''),
                    'signup_date': datetime.now().isoformat()
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            raise BillingError(f"Failed to create customer: {e}")
    
    def create_subscription(self, customer_id: str, plan_name: str) -> Dict[str, Any]:
        """Create subscription for customer"""
        try:
            plan = self.pricing_plans.get(plan_name.lower())
            if not plan:
                raise ValueError(f"Invalid plan: {plan_name}")
            
            subscription = stripe.Subscription.create(
                customer=customer_id,
                items=[{'price': plan['price_id']}],
                metadata={
                    'plan_name': plan_name,
                    'monthly_call_limit': plan['monthly_calls']
                }
            )
            
            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'plan': plan_name
            }
        except stripe.error.StripeError as e:
            raise BillingError(f"Failed to create subscription: {e}")
    
    def handle_usage_billing(self, user_id: str, api_calls_used: int) -> Dict[str, Any]:
        """Handle overage billing for API calls"""
        try:
            user_subscription = self.get_user_subscription(user_id)
            plan = self.pricing_plans[user_subscription['plan']]
            
            if api_calls_used > plan['monthly_calls']:
                overage = api_calls_used - plan['monthly_calls']
                overage_cost = overage * self.get_overage_rate(user_subscription['plan'])
                
                # Create usage record
                stripe.SubscriptionItem.create_usage_record(
                    subscription_item=user_subscription['subscription_item_id'],
                    quantity=overage,
                    timestamp=int(datetime.now().timestamp())
                )
                
                return {
                    'overage_calls': overage,
                    'overage_cost': overage_cost,
                    'billing_status': 'charged'
                }
            
            return {'overage_calls': 0, 'overage_cost': 0.0, 'billing_status': 'within_limit'}
            
        except Exception as e:
            raise BillingError(f"Usage billing failed: {e}")
    
    def upgrade_subscription(self, user_id: str, new_plan: str) -> Dict[str, Any]:
        """Upgrade user subscription"""
        try:
            current_subscription = self.get_user_subscription(user_id)
            new_plan_config = self.pricing_plans[new_plan.lower()]
            
            # Update subscription
            updated_subscription = stripe.Subscription.modify(
                current_subscription['subscription_id'],
                items=[{
                    'id': current_subscription['subscription_item_id'],
                    'price': new_plan_config['price_id']
                }],
                proration_behavior='create_prorations'
            )
            
            return {
                'subscription_id': updated_subscription.id,
                'new_plan': new_plan,
                'prorated_amount': self.calculate_proration(current_subscription, new_plan_config),
                'effective_date': datetime.now().isoformat()
            }
            
        except stripe.error.StripeError as e:
            raise BillingError(f"Upgrade failed: {e}")
    
    def process_webhook(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process Stripe webhook events"""
        event_type = event_data['type']
        
        handlers = {
            'invoice.payment_succeeded': self.handle_payment_success,
            'invoice.payment_failed': self.handle_payment_failed,
            'customer.subscription.updated': self.handle_subscription_updated,
            'customer.subscription.deleted': self.handle_subscription_cancelled
        }
        
        handler = handlers.get(event_type)
        if handler:
            return handler(event_data['data']['object'])
        
        return {'status': 'unhandled', 'event_type': event_type}


class UsageTracker:
    """Track API usage for billing purposes"""
    
    def __init__(self, redis_client, database):
        self.redis = redis_client
        self.db = database
    
    def record_api_call(self, user_id: str, endpoint: str, timestamp: datetime = None):
        """Record an API call for billing"""
        if not timestamp:
            timestamp = datetime.now()
        
        # Current month key
        month_key = f"usage:{user_id}:{timestamp.strftime('%Y-%m')}"
        
        # Increment counters
        self.redis.hincrby(month_key, 'total_calls', 1)
        self.redis.hincrby(month_key, f'endpoint:{endpoint}', 1)
        self.redis.expire(month_key, 86400 * 32)  # Expire after 32 days
        
        # Rate limiting
        minute_key = f"rate_limit:{user_id}:{timestamp.strftime('%Y-%m-%d:%H:%M')}"
        hour_key = f"rate_limit:{user_id}:{timestamp.strftime('%Y-%m-%d:%H')}"
        
        current_minute = self.redis.incr(minute_key)
        current_hour = self.redis.incr(hour_key)
        
        self.redis.expire(minute_key, 60)
        self.redis.expire(hour_key, 3600)
        
        return {
            'calls_this_month': self.redis.hget(month_key, 'total_calls'),
            'calls_this_minute': current_minute,
            'calls_this_hour': current_hour
        }
    
    def get_monthly_usage(self, user_id: str, year: int, month: int) -> Dict[str, Any]:
        """Get usage statistics for a specific month"""
        month_key = f"usage:{user_id}:{year:04d}-{month:02d}"
        usage_data = self.redis.hgetall(month_key)
        
        return {
            'total_calls': int(usage_data.get('total_calls', 0)),
            'endpoint_breakdown': {
                k.replace('endpoint:', ''): int(v) 
                for k, v in usage_data.items() 
                if k.startswith('endpoint:')
            }
        }
    
    def check_rate_limits(self, user_id: str, plan_limits: Dict[str, int]) -> Dict[str, bool]:
        """Check if user is within rate limits"""
        now = datetime.now()
        minute_key = f"rate_limit:{user_id}:{now.strftime('%Y-%m-%d:%H:%M')}"
        hour_key = f"rate_limit:{user_id}:{now.strftime('%Y-%m-%d:%H')}"
        
        current_minute = int(self.redis.get(minute_key) or 0)
        current_hour = int(self.redis.get(hour_key) or 0)
        
        return {
            'within_minute_limit': current_minute < plan_limits['minute'],
            'within_hour_limit': current_hour < plan_limits['hour'],
            'current_minute_usage': current_minute,
            'current_hour_usage': current_hour
        }


class BillingError(Exception):
    """Custom billing error"""
    pass
```

### Subscription Management Dashboard

```javascript
// React component for subscription management
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const SubscriptionDashboard = ({ userId, currentPlan }) => {
    const [usage, setUsage] = useState(null);
    const [billingHistory, setBillingHistory] = useState([]);
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

    const plans = {
        starter: { name: 'Starter', price: 99, calls: 10000, color: 'blue' },
        professional: { name: 'Professional', price: 399, calls: 50000, color: 'purple' },
        enterprise: { name: 'Enterprise', price: 1299, calls: 200000, color: 'gold' }
    };

    useEffect(() => {
        fetchUsageData();
        fetchBillingHistory();
    }, [userId]);

    const fetchUsageData = async () => {
        const response = await fetch(`/api/billing/usage/${userId}`);
        const data = await response.json();
        setUsage(data);
    };

    const fetchBillingHistory = async () => {
        const response = await fetch(`/api/billing/history/${userId}`);
        const data = await response.json();
        setBillingHistory(data);
    };

    const handleUpgrade = async (newPlan) => {
        try {
            const response = await fetch('/api/billing/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newPlan })
            });
            
            if (response.ok) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Upgrade failed:', error);
        }
    };

    return (
        <div className="subscription-dashboard">
            {/* Current Plan Section */}
            <div className="current-plan">
                <h2>Current Plan: {plans[currentPlan]?.name}</h2>
                <div className="plan-details">
                    <span>${plans[currentPlan]?.price}/month</span>
                    <span>{plans[currentPlan]?.calls.toLocaleString()} API calls included</span>
                </div>
            </div>

            {/* Usage Overview */}
            {usage && (
                <div className="usage-overview">
                    <h3>This Month's Usage</h3>
                    <div className="usage-bar">
                        <div 
                            className="usage-fill"
                            style={{ width: `${(usage.calls_used / plans[currentPlan].calls) * 100}%` }}
                        />
                    </div>
                    <div className="usage-stats">
                        <span>{usage.calls_used.toLocaleString()} / {plans[currentPlan].calls.toLocaleString()}</span>
                        {usage.overage_calls > 0 && (
                            <span className="overage">
                                +{usage.overage_calls.toLocaleString()} overage calls
                                (${usage.overage_cost.toFixed(2)})
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Plan Comparison */}
            <div className="plan-comparison">
                <h3>Available Plans</h3>
                <div className="plans-grid">
                    {Object.entries(plans).map(([key, plan]) => (
                        <div 
                            key={key} 
                            className={`plan-card ${currentPlan === key ? 'current' : ''}`}
                        >
                            <h4>{plan.name}</h4>
                            <div className="price">${plan.price}/month</div>
                            <div className="calls">{plan.calls.toLocaleString()} API calls</div>
                            {currentPlan !== key && (
                                <button 
                                    onClick={() => handleUpgrade(key)}
                                    className="upgrade-btn"
                                >
                                    {plans[currentPlan].price < plan.price ? 'Upgrade' : 'Downgrade'}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Billing History */}
            <div className="billing-history">
                <h3>Billing History</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {billingHistory.map((invoice) => (
                            <tr key={invoice.id}>
                                <td>{new Date(invoice.date).toLocaleDateString()}</td>
                                <td>{invoice.description}</td>
                                <td>${invoice.amount.toFixed(2)}</td>
                                <td className={`status ${invoice.status}`}>
                                    {invoice.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubscriptionDashboard;
```

## Revenue Optimization Strategy

### Pricing Psychology
- **Anchor Pricing**: Enterprise tier establishes high-value perception
- **Good-Better-Best**: Three tiers optimize choice architecture
- **Usage-Based**: Aligns cost with value received
- **Annual Discounts**: 20% discount for annual payments

### Conversion Funnels
1. **Free Trial**: 14-day trial with all Professional features
2. **Freemium**: Limited Starter tier with upgrade prompts
3. **Usage Alerts**: Proactive upgrade suggestions at 80% usage
4. **Success Milestones**: Celebrate achievements, suggest upgrades

### Retention Strategies
- **Grandfathered Pricing**: Price increases don't affect existing customers
- **Loyalty Rewards**: API call bonuses for long-term customers
- **Pause Options**: Temporary suspension instead of cancellation
- **Win-back Campaigns**: Special offers for cancelled customers

This comprehensive billing system provides flexible pricing, transparent usage tracking, and seamless payment processing to maximize customer value and business revenue.
