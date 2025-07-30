"""
Campaign Manager Component
Handles creation, management, and orchestration of multi-channel marketing campaigns
"""

import asyncio
import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import asdict
import uuid
import logging

from .marketing_automation_module import CampaignConfig, CampaignType

logger = logging.getLogger(__name__)

class CampaignManager:
    """
    Manages the lifecycle of marketing campaigns across multiple channels
    """
    
    def __init__(self, parent_module):
        self.parent = parent_module
        self.active_campaigns = {}
        self.campaign_templates = self._load_campaign_templates()
    
    def _load_campaign_templates(self) -> Dict[str, Any]:
        """Load predefined campaign templates"""
        return {
            "product_launch": {
                "channels": ["email", "social_media", "paid_advertising", "content_marketing"],
                "duration_days": 30,
                "objectives": ["awareness", "consideration", "conversion"],
                "kpis": ["reach", "engagement", "conversions", "revenue"]
            },
            "brand_awareness": {
                "channels": ["social_media", "content_marketing", "influencer", "display_ads"],
                "duration_days": 60,
                "objectives": ["awareness", "brand_recognition"],
                "kpis": ["reach", "impressions", "brand_mentions", "share_of_voice"]
            },
            "lead_generation": {
                "channels": ["email", "content_marketing", "paid_search", "social_media"],
                "duration_days": 45,
                "objectives": ["lead_generation", "nurturing"],
                "kpis": ["leads", "cost_per_lead", "lead_quality_score", "conversion_rate"]
            },
            "customer_retention": {
                "channels": ["email", "social_media", "content_marketing"],
                "duration_days": 90,
                "objectives": ["retention", "loyalty", "upselling"],
                "kpis": ["retention_rate", "customer_lifetime_value", "repeat_purchase_rate"]
            }
        }
    
    async def create_campaign(self, campaign_config: CampaignConfig) -> Dict[str, Any]:
        """Create a new marketing campaign"""
        try:
            campaign_id = str(uuid.uuid4())
            
            # Validate campaign configuration
            validation_result = await self._validate_campaign_config(campaign_config)
            if not validation_result["valid"]:
                raise ValueError(f"Campaign validation failed: {validation_result['errors']}")
            
            # Create campaign structure
            campaign = {
                "id": campaign_id,
                "name": campaign_config.name,
                "type": campaign_config.type.value,
                "config": asdict(campaign_config),
                "status": "draft",
                "created_at": datetime.now(),
                "channels": {},
                "content_calendar": {},
                "budget_allocation": {},
                "performance_targets": {},
                "automation_rules": []
            }
            
            # Setup channel-specific configurations
            for channel in campaign_config.channels:
                channel_config = await self._setup_channel_config(channel, campaign_config)
                campaign["channels"][channel] = channel_config
            
            # Create content calendar
            content_calendar = await self._create_content_calendar(campaign_config)
            campaign["content_calendar"] = content_calendar
            
            # Allocate budget across channels
            budget_allocation = await self._allocate_budget(campaign_config)
            campaign["budget_allocation"] = budget_allocation
            
            # Set performance targets
            performance_targets = await self._set_performance_targets(campaign_config)
            campaign["performance_targets"] = performance_targets
            
            # Setup automation rules
            automation_rules = await self._setup_automation_rules(campaign_config)
            campaign["automation_rules"] = automation_rules
            
            # Save to database
            await self._save_campaign_to_db(campaign)
            
            # Store in memory
            self.active_campaigns[campaign_id] = campaign
            
            logger.info(f"Campaign created successfully: {campaign_id}")
            return campaign
            
        except Exception as e:
            logger.error(f"Error creating campaign: {e}")
            raise
    
    async def _validate_campaign_config(self, config: CampaignConfig) -> Dict[str, Any]:
        """Validate campaign configuration"""
        errors = []
        
        # Check required fields
        if not config.name:
            errors.append("Campaign name is required")
        
        if not config.channels:
            errors.append("At least one channel must be specified")
        
        if config.budget <= 0:
            errors.append("Budget must be greater than 0")
        
        if config.duration_days <= 0:
            errors.append("Campaign duration must be greater than 0")
        
        if config.start_date >= config.end_date:
            errors.append("End date must be after start date")
        
        # Validate channel compatibility
        channel_errors = await self._validate_channel_compatibility(config.channels)
        errors.extend(channel_errors)
        
        # Validate budget allocation
        if config.budget < len(config.channels) * 100:  # Minimum $100 per channel
            errors.append("Insufficient budget for selected channels")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
    
    async def _validate_channel_compatibility(self, channels: List[str]) -> List[str]:
        """Validate that selected channels are compatible"""
        errors = []
        
        # Define channel compatibility rules
        incompatible_combinations = [
            (["email", "sms"], "Cannot run high-frequency email and SMS simultaneously"),
            (["influencer", "competitor_targeting"], "Influencer campaigns conflict with competitor targeting")
        ]
        
        for incompatible_channels, error_message in incompatible_combinations:
            if all(channel in channels for channel in incompatible_channels):
                errors.append(error_message)
        
        return errors
    
    async def _setup_channel_config(self, channel: str, campaign_config: CampaignConfig) -> Dict[str, Any]:
        """Setup configuration for specific channel"""
        base_config = {
            "enabled": True,
            "priority": "medium",
            "automation_level": "semi-automated",
            "content_frequency": "daily",
            "targeting_parameters": {},
            "creative_requirements": {},
            "performance_thresholds": {}
        }
        
        # Channel-specific configurations
        if channel == "email":
            base_config.update({
                "send_frequency": "weekly",
                "list_segments": ["all_subscribers"],
                "ab_test_enabled": True,
                "personalization_level": "high",
                "automation_triggers": ["signup", "purchase", "abandonment"]
            })
        
        elif channel == "social_media":
            base_config.update({
                "platforms": ["facebook", "instagram", "twitter", "linkedin"],
                "post_frequency": "daily",
                "engagement_strategy": "active",
                "hashtag_strategy": "trending_and_branded",
                "influencer_collaboration": False
            })
        
        elif channel == "paid_advertising":
            base_config.update({
                "platforms": ["google_ads", "facebook_ads"],
                "bid_strategy": "target_cpa",
                "ad_formats": ["search", "display", "video"],
                "audience_targeting": "lookalike",
                "budget_optimization": "automatic"
            })
        
        elif channel == "content_marketing":
            base_config.update({
                "content_types": ["blog_posts", "whitepapers", "case_studies"],
                "publication_schedule": "bi-weekly",
                "seo_optimization": True,
                "distribution_channels": ["website", "social_media", "email"],
                "content_themes": campaign_config.objectives
            })
        
        return base_config
    
    async def _create_content_calendar(self, campaign_config: CampaignConfig) -> Dict[str, Any]:
        """Create content calendar for the campaign"""
        content_calendar = {
            "start_date": campaign_config.start_date.isoformat(),
            "end_date": campaign_config.end_date.isoformat(),
            "schedule": {},
            "themes": {},
            "milestones": []
        }
        
        # Generate daily schedule
        current_date = campaign_config.start_date
        while current_date <= campaign_config.end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            
            # Determine content for each channel
            daily_content = {}
            for channel in campaign_config.channels:
                channel_content = await self._plan_daily_content(channel, current_date, campaign_config)
                if channel_content:
                    daily_content[channel] = channel_content
            
            if daily_content:
                content_calendar["schedule"][date_str] = daily_content
            
            current_date += timedelta(days=1)
        
        # Add campaign milestones
        milestones = await self._create_campaign_milestones(campaign_config)
        content_calendar["milestones"] = milestones
        
        return content_calendar
    
    async def _plan_daily_content(self, channel: str, date: datetime, campaign_config: CampaignConfig) -> Dict[str, Any]:
        """Plan content for specific channel and date"""
        # Content frequency rules
        frequency_rules = {
            "email": {"frequency": "weekly", "days": [1]},  # Mondays
            "social_media": {"frequency": "daily", "days": list(range(7))},
            "paid_advertising": {"frequency": "daily", "days": list(range(7))},
            "content_marketing": {"frequency": "bi-weekly", "days": [1, 15]},  # 1st and 15th
            "influencer": {"frequency": "weekly", "days": [3, 5]}  # Wed, Fri
        }
        
        rule = frequency_rules.get(channel, {"frequency": "weekly", "days": [1]})
        
        # Check if content should be scheduled for this date
        if rule["frequency"] == "daily" or date.day in rule["days"]:
            return {
                "content_type": self._determine_content_type(channel, date, campaign_config),
                "priority": "medium",
                "estimated_effort": "2 hours",
                "dependencies": [],
                "approval_required": channel in ["paid_advertising", "influencer"]
            }
        
        return None
    
    def _determine_content_type(self, channel: str, date: datetime, campaign_config: CampaignConfig) -> str:
        """Determine appropriate content type for channel and date"""
        content_types = {
            "email": ["newsletter", "promotional", "educational", "announcement"],
            "social_media": ["post", "story", "video", "carousel", "poll"],
            "paid_advertising": ["search_ad", "display_ad", "video_ad", "shopping_ad"],
            "content_marketing": ["blog_post", "whitepaper", "case_study", "infographic"],
            "influencer": ["collaboration_post", "review", "tutorial", "unboxing"]
        }
        
        channel_types = content_types.get(channel, ["generic_content"])
        
        # Cycle through content types based on date
        type_index = date.day % len(channel_types)
        return channel_types[type_index]
    
    async def _allocate_budget(self, campaign_config: CampaignConfig) -> Dict[str, float]:
        """Allocate budget across channels based on performance expectations"""
        total_budget = campaign_config.budget
        num_channels = len(campaign_config.channels)
        
        # Default equal allocation
        base_allocation = total_budget / num_channels
        
        # Channel performance multipliers based on historical data
        channel_multipliers = {
            "paid_advertising": 1.3,
            "email": 0.8,
            "social_media": 1.0,
            "content_marketing": 0.9,
            "influencer": 1.2,
            "seo": 0.7
        }
        
        # Calculate weighted allocation
        total_weight = sum(channel_multipliers.get(channel, 1.0) for channel in campaign_config.channels)
        
        allocation = {}
        for channel in campaign_config.channels:
            weight = channel_multipliers.get(channel, 1.0)
            channel_allocation = (weight / total_weight) * total_budget
            allocation[channel] = round(channel_allocation, 2)
        
        return allocation
    
    async def _set_performance_targets(self, campaign_config: CampaignConfig) -> Dict[str, Any]:
        """Set performance targets for each KPI"""
        targets = {}
        
        # Base targets by campaign objective
        objective_targets = {
            "awareness": {
                "reach": 10000,
                "impressions": 50000,
                "brand_mentions": 100
            },
            "consideration": {
                "website_visits": 5000,
                "content_engagement": 1000,
                "lead_form_views": 500
            },
            "conversion": {
                "leads": 200,
                "sales": 50,
                "revenue": 10000
            }
        }
        
        for objective in campaign_config.objectives:
            if objective in objective_targets:
                targets.update(objective_targets[objective])
        
        # Adjust targets based on budget
        budget_multiplier = min(campaign_config.budget / 5000, 3.0)  # Max 3x for high budgets
        
        for kpi in targets:
            targets[kpi] = int(targets[kpi] * budget_multiplier)
        
        return targets
    
    async def _setup_automation_rules(self, campaign_config: CampaignConfig) -> List[Dict[str, Any]]:
        """Setup automation rules for campaign optimization"""
        rules = []
        
        # Performance-based automation rules
        rules.append({
            "id": str(uuid.uuid4()),
            "name": "Low CTR Optimization",
            "trigger": {
                "metric": "ctr",
                "condition": "less_than",
                "threshold": 0.01,
                "time_window": "24_hours"
            },
            "action": {
                "type": "pause_and_optimize",
                "parameters": {
                    "generate_new_creatives": True,
                    "adjust_targeting": True,
                    "notification_email": True
                }
            },
            "enabled": True
        })
        
        rules.append({
            "id": str(uuid.uuid4()),
            "name": "High CPA Alert",
            "trigger": {
                "metric": "cost_per_acquisition",
                "condition": "greater_than",
                "threshold": 100,
                "time_window": "48_hours"
            },
            "action": {
                "type": "reduce_bids",
                "parameters": {
                    "reduction_percentage": 20,
                    "send_alert": True
                }
            },
            "enabled": True
        })
        
        rules.append({
            "id": str(uuid.uuid4()),
            "name": "Budget Pacing",
            "trigger": {
                "metric": "budget_pace",
                "condition": "greater_than",
                "threshold": 120,  # 120% of daily budget
                "time_window": "daily"
            },
            "action": {
                "type": "adjust_daily_budget",
                "parameters": {
                    "adjustment_percentage": -10,
                    "redistribute_to_other_channels": True
                }
            },
            "enabled": True
        })
        
        return rules
    
    async def _create_campaign_milestones(self, campaign_config: CampaignConfig) -> List[Dict[str, Any]]:
        """Create key milestones for campaign tracking"""
        milestones = []
        
        # Calculate milestone dates
        campaign_duration = (campaign_config.end_date - campaign_config.start_date).days
        
        # 25% milestone
        milestone_25 = campaign_config.start_date + timedelta(days=campaign_duration * 0.25)
        milestones.append({
            "name": "25% Campaign Completion",
            "date": milestone_25.isoformat(),
            "type": "progress_check",
            "targets": {"budget_spent": 0.25, "kpi_progress": 0.2},
            "actions": ["performance_review", "optimization_check"]
        })
        
        # 50% milestone
        milestone_50 = campaign_config.start_date + timedelta(days=campaign_duration * 0.5)
        milestones.append({
            "name": "Mid-Campaign Review",
            "date": milestone_50.isoformat(),
            "type": "major_review",
            "targets": {"budget_spent": 0.5, "kpi_progress": 0.45},
            "actions": ["comprehensive_analysis", "strategy_adjustment", "content_refresh"]
        })
        
        # 75% milestone
        milestone_75 = campaign_config.start_date + timedelta(days=campaign_duration * 0.75)
        milestones.append({
            "name": "75% Campaign Completion",
            "date": milestone_75.isoformat(),
            "type": "optimization_focus",
            "targets": {"budget_spent": 0.75, "kpi_progress": 0.7},
            "actions": ["final_optimization", "end_game_strategy"]
        })
        
        # Campaign end
        milestones.append({
            "name": "Campaign Completion",
            "date": campaign_config.end_date.isoformat(),
            "type": "completion",
            "targets": {"budget_spent": 1.0, "kpi_progress": 1.0},
            "actions": ["final_report", "roi_analysis", "learnings_documentation"]
        })
        
        return milestones
    
    async def _save_campaign_to_db(self, campaign: Dict[str, Any]):
        """Save campaign to database"""
        conn = sqlite3.connect(self.parent.database_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO campaigns (id, name, type, config, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            campaign["id"],
            campaign["name"],
            campaign["type"],
            json.dumps(campaign["config"]),
            campaign["status"],
            campaign["created_at"].isoformat()
        ))
        
        conn.commit()
        conn.close()
    
    async def update_campaign_status(self, campaign_id: str, status: str) -> bool:
        """Update campaign status"""
        try:
            if campaign_id in self.active_campaigns:
                self.active_campaigns[campaign_id]["status"] = status
                
                # Update database
                conn = sqlite3.connect(self.parent.database_path)
                cursor = conn.cursor()
                
                cursor.execute('''
                    UPDATE campaigns SET status = ?, updated_at = ? WHERE id = ?
                ''', (status, datetime.now().isoformat(), campaign_id))
                
                conn.commit()
                conn.close()
                
                logger.info(f"Campaign status updated: {campaign_id} -> {status}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error updating campaign status: {e}")
            return False
    
    async def pause_campaign(self, campaign_id: str, reason: str = None) -> bool:
        """Pause active campaign"""
        return await self.update_campaign_status(campaign_id, "paused")
    
    async def resume_campaign(self, campaign_id: str) -> bool:
        """Resume paused campaign"""
        return await self.update_campaign_status(campaign_id, "active")
    
    async def get_campaign_performance(self, campaign_id: str) -> Dict[str, Any]:
        """Get real-time campaign performance data"""
        if campaign_id not in self.active_campaigns:
            return {}
        
        # This would integrate with actual analytics APIs
        # For now, return mock performance data
        return {
            "campaign_id": campaign_id,
            "status": self.active_campaigns[campaign_id]["status"],
            "budget_spent": 2500.00,
            "budget_remaining": 2500.00,
            "impressions": 45000,
            "clicks": 900,
            "conversions": 45,
            "ctr": 0.02,
            "conversion_rate": 0.05,
            "cost_per_click": 2.78,
            "cost_per_acquisition": 55.56,
            "roas": 3.2,
            "last_updated": datetime.now().isoformat()
        }
