"""
Go-to-Market Strategy API
FastAPI endpoints for managing sales processes, partnerships, and market strategies
"""

from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from .enterprise_sales import (
    EnterpriseSalesManager, Lead, Deal, SalesActivity,
    LeadSource, LeadStatus, DealStage, CompanySize
)
from .partnership_manager import (
    PartnershipManager, Partner, Referral, CommissionPayout,
    PartnerType, PartnerTier
)
from ..middleware.auth import get_current_user, require_roles
from ..utils.database import get_database

router = APIRouter(prefix="/api/v1/gtm", tags=["go-to-market"])

# Pydantic models for requests/responses

class CreateLeadRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    company: str
    job_title: str
    company_size: CompanySize
    industry: str
    source: LeadSource
    estimated_value: float = 0
    notes: str = ""
    metadata: Optional[Dict[str, Any]] = None

class CreateDealRequest(BaseModel):
    lead_id: str
    deal_name: str
    value: float
    expected_close_date: str
    sales_rep_id: str
    sales_engineer_id: Optional[str] = None
    champion_contact: str
    decision_makers: List[str] = []
    competitor_threats: List[str] = []
    custom_requirements: List[str] = []
    notes: str = ""

class ScheduleActivityRequest(BaseModel):
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    activity_type: str
    subject: str
    description: str
    scheduled_date: str
    sales_rep_id: str
    next_steps: str = ""

class RegisterPartnerRequest(BaseModel):
    name: str
    contact_name: str
    email: str
    phone: Optional[str] = None
    company: str
    partner_type: PartnerType
    territory: Optional[str] = None
    specialties: List[str] = []
    certifications: List[str] = []
    payment_details: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

class TrackReferralRequest(BaseModel):
    referral_code: str
    customer_name: str
    customer_email: str
    company: str = ""
    deal_value: float

# Dependency injection
async def get_sales_manager() -> EnterpriseSalesManager:
    """Get enterprise sales manager instance"""
    db = await get_database()
    return EnterpriseSalesManager(db)

async def get_partnership_manager() -> PartnershipManager:
    """Get partnership manager instance"""
    db = await get_database()
    return PartnershipManager(db)

# Sales Management Endpoints

@router.post("/leads")
@require_roles(["sales", "admin"])
async def create_lead(
    request: CreateLeadRequest,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Create a new sales lead"""
    
    lead_data = request.dict()
    assigned_sales_rep = current_user["id"]  # Assign to current user
    
    try:
        lead = await sales_manager.create_lead(
            lead_data=lead_data,
            source=request.source,
            assigned_sales_rep=assigned_sales_rep
        )
        
        return {
            "success": True,
            "data": {
                "lead": {
                    "id": lead.id,
                    "name": f"{lead.first_name} {lead.last_name}",
                    "company": lead.company,
                    "email": lead.email,
                    "status": lead.status.value,
                    "estimated_value": lead.estimated_value,
                    "created_at": lead.created_at.isoformat()
                },
                "message": "Lead created successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/leads")
@require_roles(["sales", "admin"])
async def get_leads(
    status: Optional[LeadStatus] = None,
    source: Optional[LeadSource] = None,
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Get leads with filtering options"""
    
    # Implementation would fetch leads from database with filters
    # For now, return mock data structure
    
    return {
        "success": True,
        "data": {
            "leads": [],  # Would contain actual lead data
            "total": 0,
            "limit": limit,
            "offset": offset
        }
    }

@router.put("/leads/{lead_id}/qualify")
@require_roles(["sales", "admin"])
async def qualify_lead(
    lead_id: str,
    qualification_notes: str = "",
    estimated_value: float = 0,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Qualify a lead for enterprise sales"""
    
    try:
        lead = await sales_manager.qualify_lead(
            lead_id=lead_id,
            qualification_notes=qualification_notes,
            estimated_value=estimated_value
        )
        
        return {
            "success": True,
            "data": {
                "lead": {
                    "id": lead.id,
                    "status": lead.status.value,
                    "estimated_value": lead.estimated_value
                },
                "message": "Lead qualified successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/deals")
@require_roles(["sales", "admin"])
async def create_deal(
    request: CreateDealRequest,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Create an enterprise deal from qualified lead"""
    
    deal_data = request.dict()
    
    try:
        deal = await sales_manager.create_deal(
            lead_id=request.lead_id,
            deal_data=deal_data
        )
        
        return {
            "success": True,
            "data": {
                "deal": {
                    "id": deal.id,
                    "name": deal.deal_name,
                    "stage": deal.stage.value,
                    "value": deal.value,
                    "probability": deal.probability,
                    "expected_close_date": deal.expected_close_date.isoformat()
                },
                "message": "Deal created successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/deals/{deal_id}/advance")
@require_roles(["sales", "admin"])
async def advance_deal_stage(
    deal_id: str,
    new_stage: DealStage,
    notes: str = "",
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Advance deal to next stage"""
    
    try:
        deal = await sales_manager.advance_deal_stage(
            deal_id=deal_id,
            new_stage=new_stage,
            notes=notes
        )
        
        return {
            "success": True,
            "data": {
                "deal": {
                    "id": deal.id,
                    "stage": deal.stage.value,
                    "probability": deal.probability
                },
                "message": f"Deal advanced to {new_stage.value}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/pipeline")
@require_roles(["sales", "admin"])
async def get_sales_pipeline(
    sales_rep_id: Optional[str] = None,
    stage: Optional[DealStage] = None,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Get sales pipeline with filtering options"""
    
    # If no sales_rep_id specified and user is not admin, show only their deals
    if not sales_rep_id and "admin" not in current_user.get("roles", []):
        sales_rep_id = current_user["id"]
    
    try:
        pipeline = await sales_manager.get_sales_pipeline(
            sales_rep_id=sales_rep_id,
            stage=stage
        )
        
        pipeline_data = [
            {
                "id": deal.id,
                "name": deal.deal_name,
                "stage": deal.stage.value,
                "value": deal.value,
                "probability": deal.probability,
                "weighted_value": deal.value * deal.probability,
                "expected_close_date": deal.expected_close_date.isoformat(),
                "sales_rep_id": deal.sales_rep_id
            }
            for deal in pipeline
        ]
        
        return {
            "success": True,
            "data": {
                "pipeline": pipeline_data,
                "summary": {
                    "total_deals": len(pipeline_data),
                    "total_value": sum(d["value"] for d in pipeline_data),
                    "weighted_value": sum(d["weighted_value"] for d in pipeline_data)
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/forecast")
@require_roles(["sales", "admin"])
async def get_sales_forecast(
    start_date: datetime,
    end_date: datetime,
    sales_rep_id: Optional[str] = None,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Generate sales forecast for period"""
    
    # If no sales_rep_id specified and user is not admin, show only their forecast
    if not sales_rep_id and "admin" not in current_user.get("roles", []):
        sales_rep_id = current_user["id"]
    
    try:
        forecast = await sales_manager.get_sales_forecast(
            start_date=start_date,
            end_date=end_date,
            sales_rep_id=sales_rep_id
        )
        
        return {
            "success": True,
            "data": forecast
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/activities")
@require_roles(["sales", "admin"])
async def schedule_activity(
    request: ScheduleActivityRequest,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Schedule a sales activity"""
    
    activity_data = request.dict()
    
    try:
        activity = await sales_manager.schedule_activity(activity_data)
        
        return {
            "success": True,
            "data": {
                "activity": {
                    "id": activity.id,
                    "type": activity.activity_type,
                    "subject": activity.subject,
                    "scheduled_date": activity.scheduled_date.isoformat(),
                    "sales_rep_id": activity.sales_rep_id
                },
                "message": "Activity scheduled successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/leads/{lead_id}/score")
@require_roles(["sales", "admin"])
async def get_lead_score(
    lead_id: str,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Get lead scoring details"""
    
    try:
        score_data = await sales_manager.get_lead_scoring(lead_id)
        
        return {
            "success": True,
            "data": score_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/metrics")
@require_roles(["sales", "admin"])
async def get_enterprise_metrics(
    start_date: datetime,
    end_date: datetime,
    current_user: Dict = Depends(get_current_user),
    sales_manager: EnterpriseSalesManager = Depends(get_sales_manager)
):
    """Get enterprise sales metrics"""
    
    try:
        metrics = await sales_manager.get_enterprise_metrics(
            start_date=start_date,
            end_date=end_date
        )
        
        return {
            "success": True,
            "data": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Partnership Management Endpoints

@router.post("/partners/register")
async def register_partner(
    request: RegisterPartnerRequest,
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Register a new partner"""
    
    partner_data = request.dict()
    
    try:
        partner = await partnership_manager.register_partner(
            partner_data=partner_data,
            partner_type=request.partner_type
        )
        
        return {
            "success": True,
            "data": {
                "partner": {
                    "id": partner.id,
                    "name": partner.name,
                    "company": partner.company,
                    "partner_type": partner.partner_type.value,
                    "tier": partner.tier.value,
                    "referral_code": partner.referral_code,
                    "commission_rate": partner.commission_rate,
                    "status": partner.status
                },
                "message": "Partner registration submitted for approval"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/partners/{partner_id}/approve")
@require_roles(["admin"])
async def approve_partner(
    partner_id: str,
    current_user: Dict = Depends(get_current_user),
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Approve a pending partner"""
    
    try:
        partner = await partnership_manager.approve_partner(partner_id)
        
        return {
            "success": True,
            "data": {
                "partner": {
                    "id": partner.id,
                    "status": partner.status
                },
                "message": "Partner approved successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/referrals/track")
async def track_referral(
    request: TrackReferralRequest,
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Track a new referral"""
    
    customer_data = {
        "name": request.customer_name,
        "email": request.customer_email,
        "company": request.company
    }
    
    try:
        referral = await partnership_manager.track_referral(
            referral_code=request.referral_code,
            customer_data=customer_data,
            deal_value=request.deal_value
        )
        
        return {
            "success": True,
            "data": {
                "referral": {
                    "id": referral.id,
                    "customer_name": referral.customer_name,
                    "deal_value": referral.deal_value,
                    "commission_amount": referral.commission_amount,
                    "status": referral.status
                },
                "message": "Referral tracked successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/referrals/{referral_id}/qualify")
@require_roles(["sales", "admin"])
async def qualify_referral(
    referral_id: str,
    subscription_id: str,
    current_user: Dict = Depends(get_current_user),
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Qualify a referral when customer subscribes"""
    
    try:
        referral = await partnership_manager.qualify_referral(
            referral_id=referral_id,
            subscription_id=subscription_id
        )
        
        return {
            "success": True,
            "data": {
                "referral": {
                    "id": referral.id,
                    "status": referral.status,
                    "conversion_date": referral.conversion_date.isoformat() if referral.conversion_date else None
                },
                "message": "Referral qualified successfully"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/partners/{partner_id}/dashboard")
async def get_partner_dashboard(
    partner_id: str,
    current_user: Dict = Depends(get_current_user),
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Get partner dashboard data"""
    
    # Verify partner access (partner can only see their own dashboard)
    # Admin can see any partner dashboard
    if "admin" not in current_user.get("roles", []) and current_user["id"] != partner_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        dashboard_data = await partnership_manager.get_partner_dashboard(partner_id)
        
        return {
            "success": True,
            "data": dashboard_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/partners/leaderboard")
async def get_partner_leaderboard(
    start_date: datetime,
    end_date: datetime,
    metric: str = Query(default="revenue", regex="^(revenue|referrals|commission)$"),
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Get partner leaderboard for period"""
    
    try:
        leaderboard = await partnership_manager.get_partner_leaderboard(
            period_start=start_date,
            period_end=end_date,
            metric=metric
        )
        
        return {
            "success": True,
            "data": {
                "leaderboard": leaderboard,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "metric": metric
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/partners/{partner_id}/materials")
async def get_marketing_materials(
    partner_id: str,
    current_user: Dict = Depends(get_current_user),
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Generate marketing materials for partner"""
    
    # Verify partner access
    if "admin" not in current_user.get("roles", []) and current_user["id"] != partner_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        materials = await partnership_manager.create_marketing_materials(partner_id)
        
        return {
            "success": True,
            "data": materials
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/commissions/process")
@require_roles(["admin", "finance"])
async def process_commissions(
    start_date: datetime,
    end_date: datetime,
    background_tasks: BackgroundTasks,
    current_user: Dict = Depends(get_current_user),
    partnership_manager: PartnershipManager = Depends(get_partnership_manager)
):
    """Process commission payouts for a period"""
    
    # Run commission processing in background
    background_tasks.add_task(
        partnership_manager.process_commissions,
        start_date,
        end_date
    )
    
    return {
        "success": True,
        "data": {
            "message": "Commission processing started",
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
    }

# Market Strategy Endpoints

@router.get("/strategy/pricing")
async def get_pricing_strategy():
    """Get current pricing strategy and tiers"""
    
    from ..billing.subscription_manager import PRICING_PLANS, TIER_LIMITS
    
    strategy = {
        "pricing_plans": [],
        "market_positioning": {
            "value_proposition": "AI-powered operations platform that reduces manual work by 50%",
            "target_markets": ["Mid-market businesses", "Enterprise organizations", "Growing startups"],
            "competitive_advantages": [
                "Advanced AI automation",
                "No-code workflow builder",
                "Enterprise-grade security",
                "24/7 customer support",
                "Rapid ROI (typically 3-6 months)"
            ]
        },
        "go_to_market_phases": [
            {
                "phase": "Product-Led Growth",
                "duration": "Months 1-6",
                "tactics": ["Freemium model", "Content marketing", "SEO optimization", "Community building"],
                "target": "10,000 free users, 500 paid users"
            },
            {
                "phase": "Sales-Assisted Growth", 
                "duration": "Months 6-12",
                "tactics": ["Inside sales team", "Partner channels", "Marketing automation", "Account-based marketing"],
                "target": "2,500 paid users, $15M ARR"
            },
            {
                "phase": "Enterprise Expansion",
                "duration": "Months 12+", 
                "tactics": ["Enterprise sales", "Strategic partnerships", "International expansion"],
                "target": "10,000 paid users, $50M ARR"
            }
        ]
    }
    
    # Add pricing plan details
    for tier, plan in PRICING_PLANS.items():
        limits = TIER_LIMITS[tier]
        strategy["pricing_plans"].append({
            "tier": tier.value,
            "name": plan.name,
            "monthly_price": plan.monthly_price,
            "annual_price": plan.annual_price,
            "target_market": {
                "free": "Small teams, startups, proof-of-concept",
                "professional": "Growing businesses, mid-market companies", 
                "enterprise": "Large enterprises, complex operations"
            }[tier.value],
            "key_features": limits.features[:5],  # Top 5 features
            "user_limit": limits.max_users,
            "use_cases": {
                "free": ["Basic automation", "Small team collaboration", "Process documentation"],
                "professional": ["Advanced workflows", "Custom integrations", "Analytics & reporting"],
                "enterprise": ["Custom AI models", "Compliance & governance", "Dedicated support"]
            }[tier.value]
        })
    
    return {
        "success": True,
        "data": strategy
    }
