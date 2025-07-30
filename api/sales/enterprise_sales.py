"""
Enterprise Sales Process Management
Handles high-value customer sales pipeline, CRM integration, and enterprise onboarding
"""

from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import uuid
import json

class LeadSource(Enum):
    """Lead source types"""
    WEBSITE = "website"
    REFERRAL = "referral"
    PARTNER = "partner"
    COLD_OUTREACH = "cold_outreach"
    TRADE_SHOW = "trade_show"
    WEBINAR = "webinar"
    CONTENT_MARKETING = "content_marketing"
    SOCIAL_MEDIA = "social_media"
    DIRECT_SALES = "direct_sales"

class LeadStatus(Enum):
    """Lead status in sales pipeline"""
    NEW = "new"
    QUALIFIED = "qualified"
    CONTACTED = "contacted"
    DEMO_SCHEDULED = "demo_scheduled"
    PROPOSAL_SENT = "proposal_sent"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class DealStage(Enum):
    """Enterprise deal stages"""
    DISCOVERY = "discovery"
    QUALIFICATION = "qualification"
    NEEDS_ANALYSIS = "needs_analysis"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    LEGAL_REVIEW = "legal_review"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"

class CompanySize(Enum):
    """Company size categories"""
    STARTUP = "startup"  # 1-50 employees
    SMALL = "small"      # 51-200 employees
    MEDIUM = "medium"    # 201-1000 employees
    LARGE = "large"      # 1001-5000 employees
    ENTERPRISE = "enterprise"  # 5000+ employees

@dataclass
class Lead:
    """Sales lead data model"""
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    company: str
    job_title: str
    company_size: CompanySize
    industry: str
    source: LeadSource
    status: LeadStatus
    estimated_value: float
    notes: str
    assigned_sales_rep: str
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]

@dataclass
class Deal:
    """Enterprise deal data model"""
    id: str
    lead_id: str
    deal_name: str
    stage: DealStage
    value: float
    probability: float
    expected_close_date: datetime
    actual_close_date: Optional[datetime]
    sales_rep_id: str
    sales_engineer_id: Optional[str]
    champion_contact: str
    decision_makers: List[str]
    competitor_threats: List[str]
    custom_requirements: List[str]
    proposal_sent_date: Optional[datetime]
    demo_completed: bool
    poc_completed: bool
    contract_terms: Dict[str, Any]
    notes: str
    created_at: datetime
    updated_at: datetime

@dataclass
class SalesActivity:
    """Sales activity tracking"""
    id: str
    lead_id: Optional[str]
    deal_id: Optional[str]
    activity_type: str  # call, email, demo, meeting, etc.
    subject: str
    description: str
    completed: bool
    scheduled_date: datetime
    completed_date: Optional[datetime]
    sales_rep_id: str
    outcome: Optional[str]
    next_steps: str
    created_at: datetime

class EnterpriseSalesManager:
    """Manages enterprise sales process"""
    
    def __init__(self, database, crm_integration=None):
        self.db = database
        self.crm = crm_integration
    
    async def create_lead(
        self,
        lead_data: Dict[str, Any],
        source: LeadSource,
        assigned_sales_rep: str
    ) -> Lead:
        """Create a new sales lead"""
        
        lead_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        lead = Lead(
            id=lead_id,
            first_name=lead_data["first_name"],
            last_name=lead_data["last_name"],
            email=lead_data["email"],
            phone=lead_data.get("phone"),
            company=lead_data["company"],
            job_title=lead_data["job_title"],
            company_size=CompanySize(lead_data["company_size"]),
            industry=lead_data["industry"],
            source=source,
            status=LeadStatus.NEW,
            estimated_value=lead_data.get("estimated_value", 0),
            notes=lead_data.get("notes", ""),
            assigned_sales_rep=assigned_sales_rep,
            created_at=now,
            updated_at=now,
            metadata=lead_data.get("metadata", {})
        )
        
        # Store in database
        await self._store_lead(lead)
        
        # Sync with CRM if available
        if self.crm:
            await self._sync_lead_to_crm(lead)
        
        # Trigger lead scoring
        await self._score_lead(lead)
        
        return lead
    
    async def qualify_lead(
        self,
        lead_id: str,
        qualification_notes: str,
        estimated_value: float
    ) -> Lead:
        """Qualify a lead for enterprise sales"""
        
        lead = await self._get_lead(lead_id)
        if not lead:
            raise ValueError("Lead not found")
        
        lead.status = LeadStatus.QUALIFIED
        lead.estimated_value = estimated_value
        lead.notes += f"\n[QUALIFICATION] {qualification_notes}"
        lead.updated_at = datetime.utcnow()
        
        await self._store_lead(lead)
        
        # Auto-assign to enterprise sales rep if high value
        if estimated_value >= 100000:  # $100K+
            await self._assign_enterprise_rep(lead)
        
        return lead
    
    async def create_deal(
        self,
        lead_id: str,
        deal_data: Dict[str, Any]
    ) -> Deal:
        """Create an enterprise deal from qualified lead"""
        
        lead = await self._get_lead(lead_id)
        if not lead or lead.status != LeadStatus.QUALIFIED:
            raise ValueError("Lead must be qualified to create deal")
        
        deal_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        deal = Deal(
            id=deal_id,
            lead_id=lead_id,
            deal_name=deal_data["deal_name"],
            stage=DealStage.DISCOVERY,
            value=deal_data["value"],
            probability=0.1,  # 10% for discovery stage
            expected_close_date=datetime.fromisoformat(deal_data["expected_close_date"]),
            actual_close_date=None,
            sales_rep_id=deal_data["sales_rep_id"],
            sales_engineer_id=deal_data.get("sales_engineer_id"),
            champion_contact=deal_data["champion_contact"],
            decision_makers=deal_data.get("decision_makers", []),
            competitor_threats=deal_data.get("competitor_threats", []),
            custom_requirements=deal_data.get("custom_requirements", []),
            proposal_sent_date=None,
            demo_completed=False,
            poc_completed=False,
            contract_terms={},
            notes=deal_data.get("notes", ""),
            created_at=now,
            updated_at=now
        )
        
        await self._store_deal(deal)
        
        # Update lead status
        lead.status = LeadStatus.DEMO_SCHEDULED
        await self._store_lead(lead)
        
        return deal
    
    async def advance_deal_stage(
        self,
        deal_id: str,
        new_stage: DealStage,
        notes: str = ""
    ) -> Deal:
        """Advance deal to next stage"""
        
        deal = await self._get_deal(deal_id)
        if not deal:
            raise ValueError("Deal not found")
        
        old_stage = deal.stage
        deal.stage = new_stage
        deal.updated_at = datetime.utcnow()
        
        # Update probability based on stage
        stage_probabilities = {
            DealStage.DISCOVERY: 0.1,
            DealStage.QUALIFICATION: 0.2,
            DealStage.NEEDS_ANALYSIS: 0.4,
            DealStage.PROPOSAL: 0.6,
            DealStage.NEGOTIATION: 0.8,
            DealStage.LEGAL_REVIEW: 0.9,
            DealStage.CLOSED_WON: 1.0,
            DealStage.CLOSED_LOST: 0.0
        }
        
        deal.probability = stage_probabilities[new_stage]
        
        # Handle specific stage transitions
        if new_stage == DealStage.PROPOSAL:
            deal.proposal_sent_date = datetime.utcnow()
        elif new_stage == DealStage.CLOSED_WON:
            deal.actual_close_date = datetime.utcnow()
            await self._handle_deal_won(deal)
        elif new_stage == DealStage.CLOSED_LOST:
            deal.actual_close_date = datetime.utcnow()
            await self._handle_deal_lost(deal)
        
        if notes:
            deal.notes += f"\n[{old_stage.value.upper()} -> {new_stage.value.upper()}] {notes}"
        
        await self._store_deal(deal)
        return deal
    
    async def schedule_activity(
        self,
        activity_data: Dict[str, Any]
    ) -> SalesActivity:
        """Schedule a sales activity"""
        
        activity_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        activity = SalesActivity(
            id=activity_id,
            lead_id=activity_data.get("lead_id"),
            deal_id=activity_data.get("deal_id"),
            activity_type=activity_data["activity_type"],
            subject=activity_data["subject"],
            description=activity_data["description"],
            completed=False,
            scheduled_date=datetime.fromisoformat(activity_data["scheduled_date"]),
            completed_date=None,
            sales_rep_id=activity_data["sales_rep_id"],
            outcome=None,
            next_steps=activity_data.get("next_steps", ""),
            created_at=now
        )
        
        await self._store_activity(activity)
        return activity
    
    async def complete_activity(
        self,
        activity_id: str,
        outcome: str,
        next_steps: str = ""
    ) -> SalesActivity:
        """Mark activity as completed"""
        
        activity = await self._get_activity(activity_id)
        if not activity:
            raise ValueError("Activity not found")
        
        activity.completed = True
        activity.completed_date = datetime.utcnow()
        activity.outcome = outcome
        activity.next_steps = next_steps
        
        await self._store_activity(activity)
        return activity
    
    async def get_sales_pipeline(
        self,
        sales_rep_id: Optional[str] = None,
        stage: Optional[DealStage] = None
    ) -> List[Deal]:
        """Get sales pipeline with filtering options"""
        
        deals = await self._get_deals(sales_rep_id=sales_rep_id, stage=stage)
        return deals
    
    async def get_sales_forecast(
        self,
        start_date: datetime,
        end_date: datetime,
        sales_rep_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate sales forecast for period"""
        
        deals = await self._get_deals_by_close_date(start_date, end_date, sales_rep_id)
        
        total_pipeline = sum(deal.value for deal in deals if deal.stage != DealStage.CLOSED_LOST)
        weighted_pipeline = sum(deal.value * deal.probability for deal in deals)
        closed_won = sum(deal.value for deal in deals if deal.stage == DealStage.CLOSED_WON)
        
        # Calculate conversion rates
        total_deals = len(deals)
        won_deals = len([d for d in deals if d.stage == DealStage.CLOSED_WON])
        win_rate = (won_deals / total_deals * 100) if total_deals > 0 else 0
        
        # Group by stage
        stage_breakdown = {}
        for stage in DealStage:
            stage_deals = [d for d in deals if d.stage == stage]
            stage_breakdown[stage.value] = {
                "count": len(stage_deals),
                "value": sum(d.value for d in stage_deals),
                "deals": [{"id": d.id, "name": d.deal_name, "value": d.value} for d in stage_deals]
            }
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "metrics": {
                "total_pipeline": total_pipeline,
                "weighted_pipeline": weighted_pipeline,
                "closed_won": closed_won,
                "win_rate": win_rate,
                "total_deals": total_deals,
                "won_deals": won_deals
            },
            "stage_breakdown": stage_breakdown
        }
    
    async def get_lead_scoring(self, lead_id: str) -> Dict[str, Any]:
        """Get lead scoring details"""
        
        lead = await self._get_lead(lead_id)
        if not lead:
            raise ValueError("Lead not found")
        
        score = await self._calculate_lead_score(lead)
        return {
            "lead_id": lead_id,
            "score": score["total_score"],
            "grade": score["grade"],
            "factors": score["factors"],
            "recommendations": score["recommendations"]
        }
    
    async def get_enterprise_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get enterprise sales metrics"""
        
        leads = await self._get_leads_by_date_range(start_date, end_date)
        deals = await self._get_deals_by_date_range(start_date, end_date)
        
        # Lead metrics
        total_leads = len(leads)
        qualified_leads = len([l for l in leads if l.status == LeadStatus.QUALIFIED])
        lead_qualification_rate = (qualified_leads / total_leads * 100) if total_leads > 0 else 0
        
        # Deal metrics
        total_deals = len(deals)
        closed_deals = len([d for d in deals if d.stage in [DealStage.CLOSED_WON, DealStage.CLOSED_LOST]])
        won_deals = len([d for d in deals if d.stage == DealStage.CLOSED_WON])
        
        close_rate = (closed_deals / total_deals * 100) if total_deals > 0 else 0
        win_rate = (won_deals / closed_deals * 100) if closed_deals > 0 else 0
        
        # Revenue metrics
        total_revenue = sum(d.value for d in deals if d.stage == DealStage.CLOSED_WON)
        average_deal_size = total_revenue / won_deals if won_deals > 0 else 0
        
        # Sales cycle analysis
        closed_won_deals = [d for d in deals if d.stage == DealStage.CLOSED_WON and d.actual_close_date]
        if closed_won_deals:
            sales_cycles = [
                (d.actual_close_date - d.created_at).days
                for d in closed_won_deals
            ]
            average_sales_cycle = sum(sales_cycles) / len(sales_cycles)
        else:
            average_sales_cycle = 0
        
        return {
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "lead_metrics": {
                "total_leads": total_leads,
                "qualified_leads": qualified_leads,
                "qualification_rate": lead_qualification_rate
            },
            "deal_metrics": {
                "total_deals": total_deals,
                "closed_deals": closed_deals,
                "won_deals": won_deals,
                "close_rate": close_rate,
                "win_rate": win_rate
            },
            "revenue_metrics": {
                "total_revenue": total_revenue,
                "average_deal_size": average_deal_size,
                "average_sales_cycle_days": average_sales_cycle
            }
        }
    
    # Private helper methods
    
    async def _score_lead(self, lead: Lead) -> Dict[str, Any]:
        """Calculate lead score"""
        return await self._calculate_lead_score(lead)
    
    async def _calculate_lead_score(self, lead: Lead) -> Dict[str, Any]:
        """Calculate detailed lead score"""
        
        score = 0
        factors = []
        
        # Company size scoring
        size_scores = {
            CompanySize.STARTUP: 10,
            CompanySize.SMALL: 20,
            CompanySize.MEDIUM: 40,
            CompanySize.LARGE: 70,
            CompanySize.ENTERPRISE: 100
        }
        company_score = size_scores[lead.company_size]
        score += company_score
        factors.append(f"Company size ({lead.company_size.value}): +{company_score}")
        
        # Industry scoring
        high_value_industries = ["technology", "financial_services", "healthcare", "manufacturing"]
        if lead.industry.lower() in high_value_industries:
            industry_score = 30
            score += industry_score
            factors.append(f"High-value industry ({lead.industry}): +{industry_score}")
        
        # Job title scoring
        decision_maker_titles = ["ceo", "cto", "cfo", "vp", "director", "head of"]
        if any(title in lead.job_title.lower() for title in decision_maker_titles):
            title_score = 25
            score += title_score
            factors.append(f"Decision maker title: +{title_score}")
        
        # Source scoring
        source_scores = {
            LeadSource.REFERRAL: 40,
            LeadSource.PARTNER: 35,
            LeadSource.DIRECT_SALES: 30,
            LeadSource.WEBSITE: 20,
            LeadSource.WEBINAR: 15,
            LeadSource.CONTENT_MARKETING: 10,
            LeadSource.COLD_OUTREACH: 5
        }
        source_score = source_scores.get(lead.source, 10)
        score += source_score
        factors.append(f"Lead source ({lead.source.value}): +{source_score}")
        
        # Estimated value scoring
        if lead.estimated_value >= 500000:
            value_score = 50
        elif lead.estimated_value >= 100000:
            value_score = 30
        elif lead.estimated_value >= 50000:
            value_score = 15
        else:
            value_score = 0
        
        if value_score > 0:
            score += value_score
            factors.append(f"High estimated value (${lead.estimated_value:,.0f}): +{value_score}")
        
        # Determine grade
        if score >= 150:
            grade = "A"
        elif score >= 100:
            grade = "B"
        elif score >= 60:
            grade = "C"
        else:
            grade = "D"
        
        # Generate recommendations
        recommendations = []
        if grade in ["A", "B"]:
            recommendations.append("High priority - schedule demo within 24 hours")
            recommendations.append("Assign senior sales rep")
        elif grade == "C":
            recommendations.append("Medium priority - follow up within 3 days")
            recommendations.append("Qualify needs before demo")
        else:
            recommendations.append("Low priority - nurture with content marketing")
            recommendations.append("Re-qualify in 30 days")
        
        return {
            "total_score": score,
            "grade": grade,
            "factors": factors,
            "recommendations": recommendations
        }
    
    async def _assign_enterprise_rep(self, lead: Lead) -> None:
        """Auto-assign enterprise sales rep for high-value leads"""
        # Implementation would assign based on territory, availability, etc.
        pass
    
    async def _handle_deal_won(self, deal: Deal) -> None:
        """Handle deal won workflow"""
        # Trigger customer onboarding
        # Update CRM
        # Generate contract
        # Notify customer success team
        pass
    
    async def _handle_deal_lost(self, deal: Deal) -> None:
        """Handle deal lost workflow"""
        # Update CRM
        # Schedule follow-up for future
        # Analyze loss reasons
        pass
    
    async def _sync_lead_to_crm(self, lead: Lead) -> None:
        """Sync lead to external CRM"""
        if self.crm:
            await self.crm.create_lead(lead)
    
    # Database operations (implement based on your database choice)
    
    async def _store_lead(self, lead: Lead) -> None:
        """Store lead in database"""
        pass
    
    async def _store_deal(self, deal: Deal) -> None:
        """Store deal in database"""
        pass
    
    async def _store_activity(self, activity: SalesActivity) -> None:
        """Store activity in database"""
        pass
    
    async def _get_lead(self, lead_id: str) -> Optional[Lead]:
        """Get lead by ID"""
        pass
    
    async def _get_deal(self, deal_id: str) -> Optional[Deal]:
        """Get deal by ID"""
        pass
    
    async def _get_activity(self, activity_id: str) -> Optional[SalesActivity]:
        """Get activity by ID"""
        pass
    
    async def _get_deals(
        self,
        sales_rep_id: Optional[str] = None,
        stage: Optional[DealStage] = None
    ) -> List[Deal]:
        """Get deals with filters"""
        pass
    
    async def _get_deals_by_close_date(
        self,
        start_date: datetime,
        end_date: datetime,
        sales_rep_id: Optional[str] = None
    ) -> List[Deal]:
        """Get deals by expected close date"""
        pass
    
    async def _get_leads_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Lead]:
        """Get leads created in date range"""
        pass
    
    async def _get_deals_by_date_range(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Deal]:
        """Get deals created in date range"""
        pass
