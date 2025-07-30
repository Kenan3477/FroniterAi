"""
Subscription Management System
Handles subscription tiers, billing, and usage tracking for Frontier Operations Platform
"""

from enum import Enum
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
import uuid
import json

class SubscriptionTier(Enum):
    """Subscription tier definitions"""
    FREE = "free"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"

class SubscriptionStatus(Enum):
    """Subscription status definitions"""
    ACTIVE = "active"
    CANCELED = "canceled"
    PAST_DUE = "past_due"
    PAUSED = "paused"
    TRIAL = "trial"

@dataclass
class TierLimits:
    """Usage limits for each subscription tier"""
    max_users: int
    max_workflows: int
    max_executions_per_month: int
    max_storage_gb: int
    max_api_calls_per_hour: int
    max_integrations: int
    support_level: str
    features: List[str]

# Define tier limits
TIER_LIMITS = {
    SubscriptionTier.FREE: TierLimits(
        max_users=5,
        max_workflows=5,
        max_executions_per_month=1000,
        max_storage_gb=10,
        max_api_calls_per_hour=50,
        max_integrations=10,
        support_level="community",
        features=[
            "basic_workflows",
            "standard_dashboard",
            "basic_integrations",
            "email_support",
            "mobile_app"
        ]
    ),
    SubscriptionTier.PROFESSIONAL: TierLimits(
        max_users=100,
        max_workflows=-1,  # Unlimited
        max_executions_per_month=50000,
        max_storage_gb=500,
        max_api_calls_per_hour=1000,
        max_integrations=150,
        support_level="priority",
        features=[
            "advanced_workflows",
            "custom_dashboard",
            "premium_integrations",
            "priority_support",
            "advanced_analytics",
            "custom_branding",
            "sso_integration",
            "api_access",
            "workflow_templates",
            "ab_testing"
        ]
    ),
    SubscriptionTier.ENTERPRISE: TierLimits(
        max_users=-1,  # Unlimited
        max_workflows=-1,  # Unlimited
        max_executions_per_month=-1,  # Unlimited
        max_storage_gb=-1,  # Unlimited
        max_api_calls_per_hour=-1,  # Unlimited
        max_integrations=-1,  # Unlimited
        support_level="dedicated",
        features=[
            "custom_ai_models",
            "dedicated_infrastructure",
            "dedicated_support",
            "advanced_compliance",
            "custom_integrations",
            "on_premise_deployment",
            "audit_trails",
            "multi_region",
            "sla_guarantees",
            "training_programs",
            "strategic_consulting"
        ]
    )
}

@dataclass
class PricingPlan:
    """Pricing plan definition"""
    tier: SubscriptionTier
    name: str
    monthly_price: float
    annual_price: float
    stripe_monthly_price_id: str
    stripe_annual_price_id: str
    currency: str = "USD"

# Define pricing plans
PRICING_PLANS = {
    SubscriptionTier.FREE: PricingPlan(
        tier=SubscriptionTier.FREE,
        name="Starter",
        monthly_price=0.0,
        annual_price=0.0,
        stripe_monthly_price_id="",
        stripe_annual_price_id="",
        currency="USD"
    ),
    SubscriptionTier.PROFESSIONAL: PricingPlan(
        tier=SubscriptionTier.PROFESSIONAL,
        name="Growth",
        monthly_price=99.0,
        annual_price=89.0,  # Per month when billed annually
        stripe_monthly_price_id="price_professional_monthly",
        stripe_annual_price_id="price_professional_annual",
        currency="USD"
    ),
    SubscriptionTier.ENTERPRISE: PricingPlan(
        tier=SubscriptionTier.ENTERPRISE,
        name="Scale",
        monthly_price=299.0,  # Starting price
        annual_price=269.0,   # Per month when billed annually
        stripe_monthly_price_id="price_enterprise_monthly",
        stripe_annual_price_id="price_enterprise_annual",
        currency="USD"
    )
}

@dataclass
class Subscription:
    """Subscription data model"""
    id: str
    user_id: str
    organization_id: str
    tier: SubscriptionTier
    status: SubscriptionStatus
    stripe_subscription_id: Optional[str]
    stripe_customer_id: str
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime]
    canceled_at: Optional[datetime]
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

class SubscriptionManager:
    """Manages subscription operations"""
    
    def __init__(self, stripe_client, database):
        self.stripe = stripe_client
        self.db = database
    
    def get_tier_limits(self, tier: SubscriptionTier) -> TierLimits:
        """Get usage limits for a subscription tier"""
        return TIER_LIMITS[tier]
    
    def get_pricing_plan(self, tier: SubscriptionTier) -> PricingPlan:
        """Get pricing plan for a subscription tier"""
        return PRICING_PLANS[tier]
    
    async def create_subscription(
        self,
        user_id: str,
        organization_id: str,
        tier: SubscriptionTier,
        billing_cycle: str = "monthly",
        trial_days: int = 0
    ) -> Subscription:
        """Create a new subscription"""
        
        subscription_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Handle free tier
        if tier == SubscriptionTier.FREE:
            subscription = Subscription(
                id=subscription_id,
                user_id=user_id,
                organization_id=organization_id,
                tier=tier,
                status=SubscriptionStatus.ACTIVE,
                stripe_subscription_id=None,
                stripe_customer_id="",
                current_period_start=now,
                current_period_end=now + timedelta(days=30),
                trial_end=None,
                canceled_at=None,
                metadata={},
                created_at=now,
                updated_at=now
            )
        else:
            # Create Stripe customer and subscription for paid tiers
            pricing_plan = self.get_pricing_plan(tier)
            price_id = (pricing_plan.stripe_annual_price_id 
                       if billing_cycle == "annual" 
                       else pricing_plan.stripe_monthly_price_id)
            
            # Create Stripe subscription
            stripe_subscription = await self._create_stripe_subscription(
                user_id, price_id, trial_days
            )
            
            trial_end = None
            if trial_days > 0:
                trial_end = now + timedelta(days=trial_days)
            
            subscription = Subscription(
                id=subscription_id,
                user_id=user_id,
                organization_id=organization_id,
                tier=tier,
                status=SubscriptionStatus.TRIAL if trial_days > 0 else SubscriptionStatus.ACTIVE,
                stripe_subscription_id=stripe_subscription["id"],
                stripe_customer_id=stripe_subscription["customer"],
                current_period_start=datetime.fromtimestamp(stripe_subscription["current_period_start"]),
                current_period_end=datetime.fromtimestamp(stripe_subscription["current_period_end"]),
                trial_end=trial_end,
                canceled_at=None,
                metadata={"billing_cycle": billing_cycle},
                created_at=now,
                updated_at=now
            )
        
        # Store in database
        await self._store_subscription(subscription)
        return subscription
    
    async def upgrade_subscription(
        self,
        subscription_id: str,
        new_tier: SubscriptionTier,
        billing_cycle: str = "monthly"
    ) -> Subscription:
        """Upgrade a subscription to a higher tier"""
        
        subscription = await self._get_subscription(subscription_id)
        if not subscription:
            raise ValueError("Subscription not found")
        
        # Handle upgrade from free to paid
        if subscription.tier == SubscriptionTier.FREE and new_tier != SubscriptionTier.FREE:
            # Create new Stripe subscription
            pricing_plan = self.get_pricing_plan(new_tier)
            price_id = (pricing_plan.stripe_annual_price_id 
                       if billing_cycle == "annual" 
                       else pricing_plan.stripe_monthly_price_id)
            
            stripe_subscription = await self._create_stripe_subscription(
                subscription.user_id, price_id, 0
            )
            
            subscription.stripe_subscription_id = stripe_subscription["id"]
            subscription.stripe_customer_id = stripe_subscription["customer"]
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription["current_period_start"]
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription["current_period_end"]
            )
        
        elif subscription.stripe_subscription_id:
            # Update existing Stripe subscription
            pricing_plan = self.get_pricing_plan(new_tier)
            price_id = (pricing_plan.stripe_annual_price_id 
                       if billing_cycle == "annual" 
                       else pricing_plan.stripe_monthly_price_id)
            
            await self._update_stripe_subscription(
                subscription.stripe_subscription_id, price_id
            )
        
        subscription.tier = new_tier
        subscription.updated_at = datetime.utcnow()
        subscription.metadata["billing_cycle"] = billing_cycle
        
        await self._store_subscription(subscription)
        return subscription
    
    async def cancel_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool = False
    ) -> Subscription:
        """Cancel a subscription"""
        
        subscription = await self._get_subscription(subscription_id)
        if not subscription:
            raise ValueError("Subscription not found")
        
        # Cancel Stripe subscription if exists
        if subscription.stripe_subscription_id:
            await self._cancel_stripe_subscription(
                subscription.stripe_subscription_id, cancel_immediately
            )
        
        subscription.status = SubscriptionStatus.CANCELED
        subscription.canceled_at = datetime.utcnow()
        subscription.updated_at = datetime.utcnow()
        
        # If canceling immediately, downgrade to free
        if cancel_immediately:
            subscription.tier = SubscriptionTier.FREE
            subscription.current_period_end = datetime.utcnow()
        
        await self._store_subscription(subscription)
        return subscription
    
    async def handle_webhook(self, event_type: str, event_data: Dict) -> None:
        """Handle Stripe webhook events"""
        
        if event_type == "invoice.payment_succeeded":
            await self._handle_payment_succeeded(event_data)
        elif event_type == "invoice.payment_failed":
            await self._handle_payment_failed(event_data)
        elif event_type == "customer.subscription.updated":
            await self._handle_subscription_updated(event_data)
        elif event_type == "customer.subscription.deleted":
            await self._handle_subscription_deleted(event_data)
    
    async def get_subscription_by_user(self, user_id: str) -> Optional[Subscription]:
        """Get subscription for a user"""
        return await self._get_subscription_by_user(user_id)
    
    async def check_feature_access(
        self,
        user_id: str,
        feature: str
    ) -> bool:
        """Check if user has access to a specific feature"""
        
        subscription = await self.get_subscription_by_user(user_id)
        if not subscription:
            return False
        
        tier_limits = self.get_tier_limits(subscription.tier)
        return feature in tier_limits.features
    
    async def check_usage_limit(
        self,
        user_id: str,
        limit_type: str,
        current_usage: int
    ) -> bool:
        """Check if user is within usage limits"""
        
        subscription = await self.get_subscription_by_user(user_id)
        if not subscription:
            return False
        
        tier_limits = self.get_tier_limits(subscription.tier)
        
        limit_map = {
            "users": tier_limits.max_users,
            "workflows": tier_limits.max_workflows,
            "executions": tier_limits.max_executions_per_month,
            "storage": tier_limits.max_storage_gb,
            "api_calls": tier_limits.max_api_calls_per_hour,
            "integrations": tier_limits.max_integrations
        }
        
        limit = limit_map.get(limit_type)
        if limit == -1:  # Unlimited
            return True
        
        return current_usage < limit
    
    # Private methods for Stripe and database operations
    
    async def _create_stripe_subscription(
        self,
        user_id: str,
        price_id: str,
        trial_days: int
    ) -> Dict:
        """Create Stripe subscription"""
        
        # Get or create Stripe customer
        customer = await self._get_or_create_stripe_customer(user_id)
        
        subscription_params = {
            "customer": customer["id"],
            "items": [{"price": price_id}],
            "payment_behavior": "default_incomplete",
            "expand": ["latest_invoice.payment_intent"],
        }
        
        if trial_days > 0:
            subscription_params["trial_period_days"] = trial_days
        
        return self.stripe.Subscription.create(**subscription_params)
    
    async def _update_stripe_subscription(
        self,
        subscription_id: str,
        price_id: str
    ) -> Dict:
        """Update Stripe subscription"""
        
        subscription = self.stripe.Subscription.retrieve(subscription_id)
        
        return self.stripe.Subscription.modify(
            subscription_id,
            items=[{
                "id": subscription["items"]["data"][0]["id"],
                "price": price_id,
            }],
            proration_behavior="create_prorations"
        )
    
    async def _cancel_stripe_subscription(
        self,
        subscription_id: str,
        cancel_immediately: bool
    ) -> Dict:
        """Cancel Stripe subscription"""
        
        if cancel_immediately:
            return self.stripe.Subscription.delete(subscription_id)
        else:
            return self.stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
    
    async def _get_or_create_stripe_customer(self, user_id: str) -> Dict:
        """Get or create Stripe customer for user"""
        
        # Check if customer exists in database
        existing_customer = await self._get_stripe_customer_by_user(user_id)
        if existing_customer:
            return existing_customer
        
        # Create new Stripe customer
        user = await self._get_user(user_id)
        customer = self.stripe.Customer.create(
            email=user["email"],
            metadata={"user_id": user_id}
        )
        
        # Store customer ID in database
        await self._store_stripe_customer(user_id, customer["id"])
        
        return customer
    
    async def _handle_payment_succeeded(self, event_data: Dict) -> None:
        """Handle successful payment webhook"""
        subscription_id = event_data["object"]["subscription"]
        
        # Update subscription status to active
        subscription = await self._get_subscription_by_stripe_id(subscription_id)
        if subscription:
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.updated_at = datetime.utcnow()
            await self._store_subscription(subscription)
    
    async def _handle_payment_failed(self, event_data: Dict) -> None:
        """Handle failed payment webhook"""
        subscription_id = event_data["object"]["subscription"]
        
        # Update subscription status to past due
        subscription = await self._get_subscription_by_stripe_id(subscription_id)
        if subscription:
            subscription.status = SubscriptionStatus.PAST_DUE
            subscription.updated_at = datetime.utcnow()
            await self._store_subscription(subscription)
    
    async def _handle_subscription_updated(self, event_data: Dict) -> None:
        """Handle subscription updated webhook"""
        stripe_subscription = event_data["object"]
        
        subscription = await self._get_subscription_by_stripe_id(
            stripe_subscription["id"]
        )
        if subscription:
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription["current_period_start"]
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription["current_period_end"]
            )
            subscription.updated_at = datetime.utcnow()
            await self._store_subscription(subscription)
    
    async def _handle_subscription_deleted(self, event_data: Dict) -> None:
        """Handle subscription deleted webhook"""
        stripe_subscription_id = event_data["object"]["id"]
        
        subscription = await self._get_subscription_by_stripe_id(stripe_subscription_id)
        if subscription:
            subscription.status = SubscriptionStatus.CANCELED
            subscription.canceled_at = datetime.utcnow()
            subscription.updated_at = datetime.utcnow()
            await self._store_subscription(subscription)
    
    # Database operations (to be implemented based on your database choice)
    
    async def _store_subscription(self, subscription: Subscription) -> None:
        """Store subscription in database"""
        # Implementation depends on your database choice
        pass
    
    async def _get_subscription(self, subscription_id: str) -> Optional[Subscription]:
        """Get subscription by ID"""
        # Implementation depends on your database choice
        pass
    
    async def _get_subscription_by_user(self, user_id: str) -> Optional[Subscription]:
        """Get subscription by user ID"""
        # Implementation depends on your database choice
        pass
    
    async def _get_subscription_by_stripe_id(self, stripe_id: str) -> Optional[Subscription]:
        """Get subscription by Stripe subscription ID"""
        # Implementation depends on your database choice
        pass
    
    async def _get_user(self, user_id: str) -> Dict:
        """Get user data"""
        # Implementation depends on your database choice
        pass
    
    async def _store_stripe_customer(self, user_id: str, customer_id: str) -> None:
        """Store Stripe customer ID"""
        # Implementation depends on your database choice
        pass
    
    async def _get_stripe_customer_by_user(self, user_id: str) -> Optional[Dict]:
        """Get Stripe customer by user ID"""
        # Implementation depends on your database choice
        pass
