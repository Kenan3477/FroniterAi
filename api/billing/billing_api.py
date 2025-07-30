"""
Billing Integration API
FastAPI endpoints for subscription management, billing, and usage tracking
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import stripe
import os

from .subscription_manager import (
    SubscriptionManager, SubscriptionTier, SubscriptionStatus,
    PricingPlan, Subscription, PRICING_PLANS
)
from .usage_tracker import UsageTracker, UsageMetricType, UsagePeriod, UsageSummary
from ..middleware.auth import get_current_user, require_subscription_tier
from ..utils.database import get_database

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

router = APIRouter(prefix="/api/v1/billing", tags=["billing"])

# Pydantic models for requests/responses

class CreateSubscriptionRequest(BaseModel):
    tier: SubscriptionTier
    billing_cycle: str = Field(default="monthly", description="monthly or annual")
    trial_days: int = Field(default=0, description="Trial period in days")

class UpgradeSubscriptionRequest(BaseModel):
    new_tier: SubscriptionTier
    billing_cycle: str = Field(default="monthly", description="monthly or annual")

class UsageRecordRequest(BaseModel):
    metric_type: UsageMetricType
    value: int = 1
    metadata: Optional[Dict[str, Any]] = None

class SubscriptionResponse(BaseModel):
    id: str
    tier: SubscriptionTier
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime]
    canceled_at: Optional[datetime]

class UsageResponse(BaseModel):
    metric_type: UsageMetricType
    current_usage: int
    limit: int
    percentage_used: float
    is_unlimited: bool

class BillingOverviewResponse(BaseModel):
    subscription: SubscriptionResponse
    current_usage: List[UsageResponse]
    usage_alerts: List[Dict[str, Any]]
    next_billing_date: datetime
    amount_due: float

# Dependency injection
async def get_subscription_manager() -> SubscriptionManager:
    """Get subscription manager instance"""
    db = await get_database()
    return SubscriptionManager(stripe, db)

async def get_usage_tracker() -> UsageTracker:
    """Get usage tracker instance"""
    db = await get_database()
    return UsageTracker(db)

# Pricing endpoints

@router.get("/pricing")
async def get_pricing_plans():
    """Get all available pricing plans"""
    plans = []
    for tier, plan in PRICING_PLANS.items():
        plans.append({
            "tier": tier.value,
            "name": plan.name,
            "monthly_price": plan.monthly_price,
            "annual_price": plan.annual_price,
            "currency": plan.currency,
            "features": tier.value  # You can expand this with feature details
        })
    
    return {
        "success": True,
        "data": {
            "plans": plans,
            "currency": "USD"
        }
    }

@router.get("/tier-limits/{tier}")
async def get_tier_limits(
    tier: SubscriptionTier,
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Get usage limits for a subscription tier"""
    limits = subscription_manager.get_tier_limits(tier)
    
    return {
        "success": True,
        "data": {
            "tier": tier.value,
            "limits": {
                "max_users": limits.max_users,
                "max_workflows": limits.max_workflows,
                "max_executions_per_month": limits.max_executions_per_month,
                "max_storage_gb": limits.max_storage_gb,
                "max_api_calls_per_hour": limits.max_api_calls_per_hour,
                "max_integrations": limits.max_integrations,
                "support_level": limits.support_level,
                "features": limits.features
            }
        }
    }

# Subscription management endpoints

@router.post("/subscriptions")
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: Dict = Depends(get_current_user),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Create a new subscription"""
    try:
        subscription = await subscription_manager.create_subscription(
            user_id=current_user["id"],
            organization_id=current_user.get("organization_id"),
            tier=request.tier,
            billing_cycle=request.billing_cycle,
            trial_days=request.trial_days
        )
        
        return {
            "success": True,
            "data": {
                "subscription": SubscriptionResponse(
                    id=subscription.id,
                    tier=subscription.tier,
                    status=subscription.status,
                    current_period_start=subscription.current_period_start,
                    current_period_end=subscription.current_period_end,
                    trial_end=subscription.trial_end,
                    canceled_at=subscription.canceled_at
                ),
                "message": "Subscription created successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/subscriptions/current")
async def get_current_subscription(
    current_user: Dict = Depends(get_current_user),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Get current user's subscription"""
    subscription = await subscription_manager.get_subscription_by_user(current_user["id"])
    
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    return {
        "success": True,
        "data": {
            "subscription": SubscriptionResponse(
                id=subscription.id,
                tier=subscription.tier,
                status=subscription.status,
                current_period_start=subscription.current_period_start,
                current_period_end=subscription.current_period_end,
                trial_end=subscription.trial_end,
                canceled_at=subscription.canceled_at
            )
        }
    }

@router.put("/subscriptions/upgrade")
async def upgrade_subscription(
    request: UpgradeSubscriptionRequest,
    current_user: Dict = Depends(get_current_user),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Upgrade subscription to a higher tier"""
    try:
        # Get current subscription
        current_subscription = await subscription_manager.get_subscription_by_user(
            current_user["id"]
        )
        
        if not current_subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        # Upgrade subscription
        updated_subscription = await subscription_manager.upgrade_subscription(
            subscription_id=current_subscription.id,
            new_tier=request.new_tier,
            billing_cycle=request.billing_cycle
        )
        
        return {
            "success": True,
            "data": {
                "subscription": SubscriptionResponse(
                    id=updated_subscription.id,
                    tier=updated_subscription.tier,
                    status=updated_subscription.status,
                    current_period_start=updated_subscription.current_period_start,
                    current_period_end=updated_subscription.current_period_end,
                    trial_end=updated_subscription.trial_end,
                    canceled_at=updated_subscription.canceled_at
                ),
                "message": "Subscription upgraded successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/subscriptions/cancel")
async def cancel_subscription(
    cancel_immediately: bool = False,
    current_user: Dict = Depends(get_current_user),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Cancel subscription"""
    try:
        # Get current subscription
        current_subscription = await subscription_manager.get_subscription_by_user(
            current_user["id"]
        )
        
        if not current_subscription:
            raise HTTPException(status_code=404, detail="No subscription found")
        
        # Cancel subscription
        canceled_subscription = await subscription_manager.cancel_subscription(
            subscription_id=current_subscription.id,
            cancel_immediately=cancel_immediately
        )
        
        return {
            "success": True,
            "data": {
                "subscription": SubscriptionResponse(
                    id=canceled_subscription.id,
                    tier=canceled_subscription.tier,
                    status=canceled_subscription.status,
                    current_period_start=canceled_subscription.current_period_start,
                    current_period_end=canceled_subscription.current_period_end,
                    trial_end=canceled_subscription.trial_end,
                    canceled_at=canceled_subscription.canceled_at
                ),
                "message": "Subscription canceled successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Usage tracking endpoints

@router.post("/usage/record")
async def record_usage(
    request: UsageRecordRequest,
    current_user: Dict = Depends(get_current_user),
    usage_tracker: UsageTracker = Depends(get_usage_tracker)
):
    """Record a usage event"""
    await usage_tracker.record_usage(
        user_id=current_user["id"],
        organization_id=current_user.get("organization_id"),
        metric_type=request.metric_type,
        value=request.value,
        metadata=request.metadata
    )
    
    return {
        "success": True,
        "data": {"message": "Usage recorded successfully"}
    }

@router.get("/usage/current")
async def get_current_usage(
    period: UsagePeriod = UsagePeriod.MONTHLY,
    current_user: Dict = Depends(get_current_user),
    usage_tracker: UsageTracker = Depends(get_usage_tracker),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Get current usage for all metrics"""
    subscription = await subscription_manager.get_subscription_by_user(current_user["id"])
    tier_limits = subscription_manager.get_tier_limits(subscription.tier) if subscription else None
    
    usage_data = []
    for metric_type in UsageMetricType:
        current_usage = await usage_tracker.get_current_usage(
            current_user["id"], metric_type, period
        )
        
        # Get limit for this metric
        limit = -1  # Unlimited by default
        if tier_limits:
            if metric_type == UsageMetricType.WORKFLOW_EXECUTIONS:
                limit = tier_limits.max_executions_per_month
            elif metric_type == UsageMetricType.API_CALLS:
                limit = tier_limits.max_api_calls_per_hour
            elif metric_type == UsageMetricType.STORAGE_USAGE:
                limit = tier_limits.max_storage_gb
        
        is_unlimited = limit == -1
        percentage_used = 0.0 if is_unlimited else (current_usage / limit) * 100
        
        usage_data.append(UsageResponse(
            metric_type=metric_type,
            current_usage=current_usage,
            limit=limit,
            percentage_used=percentage_used,
            is_unlimited=is_unlimited
        ))
    
    return {
        "success": True,
        "data": {
            "period": period.value,
            "usage": usage_data
        }
    }

@router.get("/usage/summary")
async def get_usage_summary(
    start_date: datetime,
    end_date: datetime,
    current_user: Dict = Depends(get_current_user),
    usage_tracker: UsageTracker = Depends(get_usage_tracker)
):
    """Get detailed usage summary for a period"""
    summary = await usage_tracker.get_usage_summary(
        user_id=current_user["id"],
        organization_id=current_user.get("organization_id"),
        start_date=start_date,
        end_date=end_date
    )
    
    return {
        "success": True,
        "data": {
            "period": {
                "start": summary.period_start.isoformat(),
                "end": summary.period_end.isoformat()
            },
            "metrics": {metric.value: value for metric, value in summary.metrics.items()},
            "overage_charges": summary.overage_charges,
            "total_overage": summary.total_overage
        }
    }

@router.get("/usage/alerts")
async def get_usage_alerts(
    current_user: Dict = Depends(get_current_user),
    usage_tracker: UsageTracker = Depends(get_usage_tracker)
):
    """Get usage alerts for threshold breaches"""
    alerts = await usage_tracker.get_usage_alerts(current_user["id"])
    
    return {
        "success": True,
        "data": {"alerts": alerts}
    }

# Billing overview endpoint

@router.get("/overview")
async def get_billing_overview(
    current_user: Dict = Depends(get_current_user),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager),
    usage_tracker: UsageTracker = Depends(get_usage_tracker)
):
    """Get comprehensive billing overview"""
    
    # Get subscription
    subscription = await subscription_manager.get_subscription_by_user(current_user["id"])
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    
    # Get current usage
    tier_limits = subscription_manager.get_tier_limits(subscription.tier)
    usage_data = []
    
    for metric_type in [UsageMetricType.WORKFLOW_EXECUTIONS, UsageMetricType.API_CALLS, UsageMetricType.STORAGE_USAGE]:
        current_usage = await usage_tracker.get_current_usage(
            current_user["id"], metric_type, UsagePeriod.MONTHLY
        )
        
        # Get limit for this metric
        if metric_type == UsageMetricType.WORKFLOW_EXECUTIONS:
            limit = tier_limits.max_executions_per_month
        elif metric_type == UsageMetricType.API_CALLS:
            limit = tier_limits.max_api_calls_per_hour
        elif metric_type == UsageMetricType.STORAGE_USAGE:
            limit = tier_limits.max_storage_gb
        else:
            limit = -1
        
        is_unlimited = limit == -1
        percentage_used = 0.0 if is_unlimited else (current_usage / limit) * 100
        
        usage_data.append(UsageResponse(
            metric_type=metric_type,
            current_usage=current_usage,
            limit=limit,
            percentage_used=percentage_used,
            is_unlimited=is_unlimited
        ))
    
    # Get usage alerts
    alerts = await usage_tracker.get_usage_alerts(current_user["id"])
    
    # Calculate next billing date and amount
    next_billing_date = subscription.current_period_end
    pricing_plan = subscription_manager.get_pricing_plan(subscription.tier)
    billing_cycle = subscription.metadata.get("billing_cycle", "monthly")
    amount_due = pricing_plan.annual_price if billing_cycle == "annual" else pricing_plan.monthly_price
    
    return {
        "success": True,
        "data": BillingOverviewResponse(
            subscription=SubscriptionResponse(
                id=subscription.id,
                tier=subscription.tier,
                status=subscription.status,
                current_period_start=subscription.current_period_start,
                current_period_end=subscription.current_period_end,
                trial_end=subscription.trial_end,
                canceled_at=subscription.canceled_at
            ),
            current_usage=usage_data,
            usage_alerts=alerts,
            next_billing_date=next_billing_date,
            amount_due=amount_due
        )
    }

# Enterprise reporting (requires Enterprise tier)

@router.get("/reports/organization")
@require_subscription_tier(SubscriptionTier.ENTERPRISE)
async def get_organization_usage_report(
    start_date: datetime,
    end_date: datetime,
    current_user: Dict = Depends(get_current_user),
    usage_tracker: UsageTracker = Depends(get_usage_tracker)
):
    """Get organization-wide usage report (Enterprise only)"""
    
    organization_id = current_user.get("organization_id")
    if not organization_id:
        raise HTTPException(status_code=400, detail="Organization ID required")
    
    report = await usage_tracker.generate_usage_report(
        organization_id=organization_id,
        start_date=start_date,
        end_date=end_date
    )
    
    return {
        "success": True,
        "data": report
    }

# Stripe webhook handler

@router.post("/webhooks/stripe")
async def handle_stripe_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Handle Stripe webhook events"""
    
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("WEBHOOK_ENDPOINT_SECRET")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle event in background
    background_tasks.add_task(
        subscription_manager.handle_webhook,
        event["type"],
        event["data"]
    )
    
    return {"success": True}

# Feature access helpers

@router.get("/feature-access/{feature}")
async def check_feature_access(
    feature: str,
    current_user: Dict = Depends(get_current_user),
    subscription_manager: SubscriptionManager = Depends(get_subscription_manager)
):
    """Check if user has access to a specific feature"""
    
    has_access = await subscription_manager.check_feature_access(
        current_user["id"], feature
    )
    
    return {
        "success": True,
        "data": {
            "feature": feature,
            "has_access": has_access
        }
    }

# Rate limiting check

@router.get("/rate-limit/{metric_type}")
async def check_rate_limit(
    metric_type: UsageMetricType,
    limit: int,
    period: UsagePeriod = UsagePeriod.HOURLY,
    current_user: Dict = Depends(get_current_user),
    usage_tracker: UsageTracker = Depends(get_usage_tracker)
):
    """Check if user is within rate limits"""
    
    within_limit = await usage_tracker.check_rate_limit(
        current_user["id"], metric_type, limit, period
    )
    
    current_usage = await usage_tracker.get_current_usage(
        current_user["id"], metric_type, period
    )
    
    return {
        "success": True,
        "data": {
            "metric_type": metric_type.value,
            "period": period.value,
            "current_usage": current_usage,
            "limit": limit,
            "within_limit": within_limit
        }
    }
