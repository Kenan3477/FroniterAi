"""
Usage Tracking System
Tracks and monitors usage metrics for billing and rate limiting
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import asyncio
import json
import uuid

class UsageMetricType(Enum):
    """Types of usage metrics to track"""
    WORKFLOW_EXECUTIONS = "workflow_executions"
    API_CALLS = "api_calls"
    STORAGE_USAGE = "storage_usage"
    USER_COUNT = "user_count"
    INTEGRATION_USAGE = "integration_usage"
    AI_OPERATIONS = "ai_operations"
    DATA_PROCESSING = "data_processing"
    CUSTOM_REPORTS = "custom_reports"

class UsagePeriod(Enum):
    """Usage tracking periods"""
    HOURLY = "hourly"
    DAILY = "daily"
    MONTHLY = "monthly"
    YEARLY = "yearly"

@dataclass
class UsageRecord:
    """Individual usage record"""
    id: str
    user_id: str
    organization_id: str
    metric_type: UsageMetricType
    value: int
    timestamp: datetime
    period: UsagePeriod
    metadata: Dict[str, Any]

@dataclass
class UsageSummary:
    """Usage summary for a period"""
    user_id: str
    organization_id: str
    period_start: datetime
    period_end: datetime
    metrics: Dict[UsageMetricType, int]
    overage_charges: Dict[str, float]
    total_overage: float

class UsageTracker:
    """Tracks and aggregates usage metrics"""
    
    def __init__(self, database, redis_client=None):
        self.db = database
        self.redis = redis_client  # For real-time tracking
        self.usage_cache = {}  # In-memory cache for current period
    
    async def record_usage(
        self,
        user_id: str,
        organization_id: str,
        metric_type: UsageMetricType,
        value: int = 1,
        metadata: Optional[Dict] = None
    ) -> None:
        """Record a usage event"""
        
        record_id = str(uuid.uuid4())
        timestamp = datetime.utcnow()
        
        # Create usage record
        record = UsageRecord(
            id=record_id,
            user_id=user_id,
            organization_id=organization_id,
            metric_type=metric_type,
            value=value,
            timestamp=timestamp,
            period=UsagePeriod.MONTHLY,  # Default to monthly tracking
            metadata=metadata or {}
        )
        
        # Store in database
        await self._store_usage_record(record)
        
        # Update real-time cache
        await self._update_cache(user_id, metric_type, value)
        
        # Update Redis for real-time tracking
        if self.redis:
            await self._update_redis_counters(user_id, metric_type, value, timestamp)
    
    async def get_current_usage(
        self,
        user_id: str,
        metric_type: UsageMetricType,
        period: UsagePeriod = UsagePeriod.MONTHLY
    ) -> int:
        """Get current usage for a metric"""
        
        # Check cache first
        cache_key = f"{user_id}:{metric_type.value}:{period.value}"
        if cache_key in self.usage_cache:
            return self.usage_cache[cache_key]
        
        # Check Redis for real-time data
        if self.redis:
            redis_value = await self._get_redis_counter(user_id, metric_type, period)
            if redis_value is not None:
                self.usage_cache[cache_key] = redis_value
                return redis_value
        
        # Fallback to database query
        start_date = self._get_period_start(period)
        usage = await self._get_usage_from_db(user_id, metric_type, start_date)
        
        # Cache the result
        self.usage_cache[cache_key] = usage
        return usage
    
    async def get_usage_summary(
        self,
        user_id: str,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> UsageSummary:
        """Get comprehensive usage summary for a period"""
        
        metrics = {}
        for metric_type in UsageMetricType:
            usage = await self._get_usage_from_db(
                user_id, metric_type, start_date, end_date
            )
            metrics[metric_type] = usage
        
        # Calculate overage charges
        overage_charges = await self._calculate_overage_charges(
            user_id, metrics, start_date, end_date
        )
        
        total_overage = sum(overage_charges.values())
        
        return UsageSummary(
            user_id=user_id,
            organization_id=organization_id,
            period_start=start_date,
            period_end=end_date,
            metrics=metrics,
            overage_charges=overage_charges,
            total_overage=total_overage
        )
    
    async def check_rate_limit(
        self,
        user_id: str,
        metric_type: UsageMetricType,
        limit: int,
        period: UsagePeriod = UsagePeriod.HOURLY
    ) -> bool:
        """Check if user is within rate limits"""
        
        current_usage = await self.get_current_usage(user_id, metric_type, period)
        return current_usage < limit
    
    async def get_usage_alerts(self, user_id: str) -> List[Dict[str, Any]]:
        """Get usage alerts for threshold breaches"""
        
        alerts = []
        
        # Get user's subscription limits
        from .subscription_manager import SubscriptionManager
        subscription_manager = SubscriptionManager(None, self.db)
        subscription = await subscription_manager.get_subscription_by_user(user_id)
        
        if not subscription:
            return alerts
        
        tier_limits = subscription_manager.get_tier_limits(subscription.tier)
        
        # Check each metric against limits
        current_usage = await self.get_current_usage(
            user_id, UsageMetricType.WORKFLOW_EXECUTIONS
        )
        if (tier_limits.max_executions_per_month > 0 and 
            current_usage > tier_limits.max_executions_per_month * 0.8):
            alerts.append({
                "type": "warning",
                "metric": "workflow_executions",
                "message": f"You've used {current_usage} of {tier_limits.max_executions_per_month} workflow executions this month",
                "threshold": 0.8,
                "current_usage": current_usage,
                "limit": tier_limits.max_executions_per_month
            })
        
        # Check API calls
        api_usage = await self.get_current_usage(
            user_id, UsageMetricType.API_CALLS, UsagePeriod.HOURLY
        )
        if (tier_limits.max_api_calls_per_hour > 0 and 
            api_usage > tier_limits.max_api_calls_per_hour * 0.8):
            alerts.append({
                "type": "warning",
                "metric": "api_calls",
                "message": f"You've used {api_usage} of {tier_limits.max_api_calls_per_hour} API calls this hour",
                "threshold": 0.8,
                "current_usage": api_usage,
                "limit": tier_limits.max_api_calls_per_hour
            })
        
        return alerts
    
    async def generate_usage_report(
        self,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate comprehensive usage report for organization"""
        
        # Get all users in organization
        users = await self._get_organization_users(organization_id)
        
        total_metrics = {metric: 0 for metric in UsageMetricType}
        user_summaries = []
        
        for user_id in users:
            summary = await self.get_usage_summary(
                user_id, organization_id, start_date, end_date
            )
            user_summaries.append(summary)
            
            # Aggregate totals
            for metric, value in summary.metrics.items():
                total_metrics[metric] += value
        
        # Calculate trends
        previous_period_start = start_date - (end_date - start_date)
        previous_summary = await self._get_organization_usage(
            organization_id, previous_period_start, start_date
        )
        
        trends = {}
        for metric, current_value in total_metrics.items():
            previous_value = previous_summary.get(metric, 0)
            if previous_value > 0:
                change = ((current_value - previous_value) / previous_value) * 100
                trends[metric.value] = {
                    "current": current_value,
                    "previous": previous_value,
                    "change_percent": round(change, 2)
                }
            else:
                trends[metric.value] = {
                    "current": current_value,
                    "previous": 0,
                    "change_percent": 0
                }
        
        return {
            "organization_id": organization_id,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "total_metrics": {metric.value: value for metric, value in total_metrics.items()},
            "trends": trends,
            "user_count": len(users),
            "user_summaries": [
                {
                    "user_id": summary.user_id,
                    "metrics": {metric.value: value for metric, value in summary.metrics.items()},
                    "total_overage": summary.total_overage
                }
                for summary in user_summaries
            ],
            "total_overage": sum(summary.total_overage for summary in user_summaries)
        }
    
    async def reset_usage_counters(
        self,
        user_id: str,
        metric_type: Optional[UsageMetricType] = None
    ) -> None:
        """Reset usage counters (typically at billing period end)"""
        
        if metric_type:
            # Reset specific metric
            cache_keys = [key for key in self.usage_cache.keys() 
                         if key.startswith(f"{user_id}:{metric_type.value}")]
            for key in cache_keys:
                del self.usage_cache[key]
            
            if self.redis:
                await self._reset_redis_counter(user_id, metric_type)
        else:
            # Reset all metrics for user
            cache_keys = [key for key in self.usage_cache.keys() 
                         if key.startswith(f"{user_id}:")]
            for key in cache_keys:
                del self.usage_cache[key]
            
            if self.redis:
                await self._reset_all_redis_counters(user_id)
    
    # Private helper methods
    
    def _get_period_start(self, period: UsagePeriod) -> datetime:
        """Get start date for usage period"""
        now = datetime.utcnow()
        
        if period == UsagePeriod.HOURLY:
            return now.replace(minute=0, second=0, microsecond=0)
        elif period == UsagePeriod.DAILY:
            return now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == UsagePeriod.MONTHLY:
            return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif period == UsagePeriod.YEARLY:
            return now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        return now
    
    async def _update_cache(
        self,
        user_id: str,
        metric_type: UsageMetricType,
        value: int
    ) -> None:
        """Update in-memory cache"""
        cache_key = f"{user_id}:{metric_type.value}:monthly"
        if cache_key in self.usage_cache:
            self.usage_cache[cache_key] += value
        else:
            # Load current value from database
            current = await self.get_current_usage(user_id, metric_type)
            self.usage_cache[cache_key] = current + value
    
    async def _update_redis_counters(
        self,
        user_id: str,
        metric_type: UsageMetricType,
        value: int,
        timestamp: datetime
    ) -> None:
        """Update Redis counters for real-time tracking"""
        if not self.redis:
            return
        
        # Update different period counters
        hour_key = f"usage:{user_id}:{metric_type.value}:hour:{timestamp.strftime('%Y%m%d%H')}"
        day_key = f"usage:{user_id}:{metric_type.value}:day:{timestamp.strftime('%Y%m%d')}"
        month_key = f"usage:{user_id}:{metric_type.value}:month:{timestamp.strftime('%Y%m')}"
        
        await self.redis.incr(hour_key, value)
        await self.redis.incr(day_key, value)
        await self.redis.incr(month_key, value)
        
        # Set expiration
        await self.redis.expire(hour_key, 7200)  # 2 hours
        await self.redis.expire(day_key, 86400 * 32)  # 32 days
        await self.redis.expire(month_key, 86400 * 365)  # 1 year
    
    async def _get_redis_counter(
        self,
        user_id: str,
        metric_type: UsageMetricType,
        period: UsagePeriod
    ) -> Optional[int]:
        """Get counter value from Redis"""
        if not self.redis:
            return None
        
        now = datetime.utcnow()
        if period == UsagePeriod.HOURLY:
            key = f"usage:{user_id}:{metric_type.value}:hour:{now.strftime('%Y%m%d%H')}"
        elif period == UsagePeriod.DAILY:
            key = f"usage:{user_id}:{metric_type.value}:day:{now.strftime('%Y%m%d')}"
        elif period == UsagePeriod.MONTHLY:
            key = f"usage:{user_id}:{metric_type.value}:month:{now.strftime('%Y%m')}"
        else:
            return None
        
        value = await self.redis.get(key)
        return int(value) if value else 0
    
    async def _calculate_overage_charges(
        self,
        user_id: str,
        metrics: Dict[UsageMetricType, int],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, float]:
        """Calculate overage charges based on usage"""
        
        from .subscription_manager import SubscriptionManager
        subscription_manager = SubscriptionManager(None, self.db)
        subscription = await subscription_manager.get_subscription_by_user(user_id)
        
        if not subscription:
            return {}
        
        tier_limits = subscription_manager.get_tier_limits(subscription.tier)
        overage_charges = {}
        
        # Calculate AI operations overage
        ai_usage = metrics.get(UsageMetricType.AI_OPERATIONS, 0)
        if (tier_limits.max_executions_per_month > 0 and 
            ai_usage > tier_limits.max_executions_per_month):
            overage = ai_usage - tier_limits.max_executions_per_month
            overage_charges["ai_operations"] = (overage / 1000) * 0.10  # $0.10 per 1000 operations
        
        # Calculate storage overage
        storage_usage = metrics.get(UsageMetricType.STORAGE_USAGE, 0)
        if (tier_limits.max_storage_gb > 0 and 
            storage_usage > tier_limits.max_storage_gb):
            overage = storage_usage - tier_limits.max_storage_gb
            overage_charges["storage"] = (overage / 100) * 2.0  # $2 per 100GB
        
        return overage_charges
    
    # Database operations (implement based on your database choice)
    
    async def _store_usage_record(self, record: UsageRecord) -> None:
        """Store usage record in database"""
        # Implementation depends on your database choice
        pass
    
    async def _get_usage_from_db(
        self,
        user_id: str,
        metric_type: UsageMetricType,
        start_date: datetime,
        end_date: Optional[datetime] = None
    ) -> int:
        """Get usage from database"""
        # Implementation depends on your database choice
        return 0
    
    async def _get_organization_users(self, organization_id: str) -> List[str]:
        """Get all user IDs in organization"""
        # Implementation depends on your database choice
        return []
    
    async def _get_organization_usage(
        self,
        organization_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[UsageMetricType, int]:
        """Get organization usage totals"""
        # Implementation depends on your database choice
        return {}
    
    async def _reset_redis_counter(
        self,
        user_id: str,
        metric_type: UsageMetricType
    ) -> None:
        """Reset Redis counter for specific metric"""
        if not self.redis:
            return
        
        pattern = f"usage:{user_id}:{metric_type.value}:*"
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)
    
    async def _reset_all_redis_counters(self, user_id: str) -> None:
        """Reset all Redis counters for user"""
        if not self.redis:
            return
        
        pattern = f"usage:{user_id}:*"
        keys = await self.redis.keys(pattern)
        if keys:
            await self.redis.delete(*keys)


# Usage tracking decorators for easy integration

def track_usage(metric_type: UsageMetricType, value: int = 1):
    """Decorator to automatically track usage"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract user_id from request context
            user_id = kwargs.get('user_id') or getattr(kwargs.get('request'), 'user_id', None)
            organization_id = kwargs.get('organization_id') or getattr(kwargs.get('request'), 'organization_id', None)
            
            if user_id:
                # Get tracker instance
                tracker = UsageTracker(None)  # Inject dependencies
                await tracker.record_usage(user_id, organization_id, metric_type, value)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Example usage:
# @track_usage(UsageMetricType.WORKFLOW_EXECUTIONS)
# async def execute_workflow(workflow_id: str, user_id: str):
#     # Workflow execution logic
#     pass
