"""
Partnership Programs Management
Handles affiliate, reseller, and technology partner programs
"""

from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import uuid
import hashlib

class PartnerType(Enum):
    """Types of partners"""
    AFFILIATE = "affiliate"
    RESELLER = "reseller"
    SYSTEM_INTEGRATOR = "system_integrator"
    TECHNOLOGY = "technology"
    CONSULTANT = "consultant"
    INFLUENCER = "influencer"

class PartnerTier(Enum):
    """Partner tier levels"""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"

class CommissionStructure(Enum):
    """Commission calculation methods"""
    PERCENTAGE = "percentage"
    FLAT_FEE = "flat_fee"
    TIERED = "tiered"
    HYBRID = "hybrid"

@dataclass
class Partner:
    """Partner data model"""
    id: str
    name: str
    contact_name: str
    email: str
    phone: Optional[str]
    company: str
    partner_type: PartnerType
    tier: PartnerTier
    status: str  # active, inactive, pending
    commission_rate: float
    referral_code: str
    signup_date: datetime
    last_activity: datetime
    total_referrals: int
    total_revenue: float
    total_commission_paid: float
    payment_details: Dict[str, Any]
    territory: Optional[str]
    specialties: List[str]
    certifications: List[str]
    metadata: Dict[str, Any]

@dataclass
class Referral:
    """Referral tracking data model"""
    id: str
    partner_id: str
    referral_code: str
    customer_email: str
    customer_name: str
    company: str
    deal_value: float
    commission_amount: float
    commission_rate: float
    status: str  # pending, qualified, paid, rejected
    conversion_date: Optional[datetime]
    commission_paid_date: Optional[datetime]
    subscription_id: Optional[str]
    notes: str
    created_at: datetime
    updated_at: datetime

@dataclass
class CommissionPayout:
    """Commission payout record"""
    id: str
    partner_id: str
    period_start: datetime
    period_end: datetime
    total_amount: float
    referral_count: int
    referral_ids: List[str]
    payment_method: str
    payment_reference: str
    status: str  # pending, processing, paid, failed
    created_at: datetime
    paid_at: Optional[datetime]

class PartnershipManager:
    """Manages partnership programs"""
    
    def __init__(self, database, payment_processor=None):
        self.db = database
        self.payment_processor = payment_processor
    
    async def register_partner(
        self,
        partner_data: Dict[str, Any],
        partner_type: PartnerType
    ) -> Partner:
        """Register a new partner"""
        
        partner_id = str(uuid.uuid4())
        referral_code = self._generate_referral_code(partner_data["company"])
        now = datetime.utcnow()
        
        # Determine initial tier and commission rate
        tier, commission_rate = self._determine_initial_tier_and_rate(partner_type)
        
        partner = Partner(
            id=partner_id,
            name=partner_data["name"],
            contact_name=partner_data["contact_name"],
            email=partner_data["email"],
            phone=partner_data.get("phone"),
            company=partner_data["company"],
            partner_type=partner_type,
            tier=tier,
            status="pending",
            commission_rate=commission_rate,
            referral_code=referral_code,
            signup_date=now,
            last_activity=now,
            total_referrals=0,
            total_revenue=0.0,
            total_commission_paid=0.0,
            payment_details=partner_data.get("payment_details", {}),
            territory=partner_data.get("territory"),
            specialties=partner_data.get("specialties", []),
            certifications=partner_data.get("certifications", []),
            metadata=partner_data.get("metadata", {})
        )
        
        await self._store_partner(partner)
        await self._send_partner_welcome_email(partner)
        
        return partner
    
    async def approve_partner(self, partner_id: str) -> Partner:
        """Approve a pending partner"""
        
        partner = await self._get_partner(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        partner.status = "active"
        await self._store_partner(partner)
        
        # Send approval notification
        await self._send_partner_approval_email(partner)
        
        return partner
    
    async def track_referral(
        self,
        referral_code: str,
        customer_data: Dict[str, Any],
        deal_value: float
    ) -> Referral:
        """Track a new referral"""
        
        partner = await self._get_partner_by_referral_code(referral_code)
        if not partner:
            raise ValueError("Invalid referral code")
        
        referral_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Calculate commission
        commission_amount = self._calculate_commission(partner, deal_value)
        
        referral = Referral(
            id=referral_id,
            partner_id=partner.id,
            referral_code=referral_code,
            customer_email=customer_data["email"],
            customer_name=customer_data["name"],
            company=customer_data.get("company", ""),
            deal_value=deal_value,
            commission_amount=commission_amount,
            commission_rate=partner.commission_rate,
            status="pending",
            conversion_date=None,
            commission_paid_date=None,
            subscription_id=None,
            notes="",
            created_at=now,
            updated_at=now
        )
        
        await self._store_referral(referral)
        
        # Update partner stats
        partner.total_referrals += 1
        partner.last_activity = now
        await self._store_partner(partner)
        
        return referral
    
    async def qualify_referral(
        self,
        referral_id: str,
        subscription_id: str
    ) -> Referral:
        """Qualify a referral when customer subscribes"""
        
        referral = await self._get_referral(referral_id)
        if not referral:
            raise ValueError("Referral not found")
        
        referral.status = "qualified"
        referral.conversion_date = datetime.utcnow()
        referral.subscription_id = subscription_id
        referral.updated_at = datetime.utcnow()
        
        await self._store_referral(referral)
        
        # Update partner revenue
        partner = await self._get_partner(referral.partner_id)
        partner.total_revenue += referral.deal_value
        await self._store_partner(partner)
        
        # Check for tier upgrades
        await self._check_tier_upgrade(partner)
        
        return referral
    
    async def process_commissions(
        self,
        period_start: datetime,
        period_end: datetime
    ) -> List[CommissionPayout]:
        """Process commission payouts for a period"""
        
        # Get all qualified referrals in period
        qualified_referrals = await self._get_qualified_referrals_by_period(
            period_start, period_end
        )
        
        # Group by partner
        partner_referrals = {}
        for referral in qualified_referrals:
            if referral.partner_id not in partner_referrals:
                partner_referrals[referral.partner_id] = []
            partner_referrals[referral.partner_id].append(referral)
        
        payouts = []
        
        for partner_id, referrals in partner_referrals.items():
            partner = await self._get_partner(partner_id)
            if not partner or partner.status != "active":
                continue
            
            total_amount = sum(r.commission_amount for r in referrals)
            
            # Minimum payout threshold
            if total_amount < 100:  # $100 minimum
                continue
            
            payout_id = str(uuid.uuid4())
            payout = CommissionPayout(
                id=payout_id,
                partner_id=partner_id,
                period_start=period_start,
                period_end=period_end,
                total_amount=total_amount,
                referral_count=len(referrals),
                referral_ids=[r.id for r in referrals],
                payment_method=partner.payment_details.get("method", "bank_transfer"),
                payment_reference="",
                status="pending",
                created_at=datetime.utcnow(),
                paid_at=None
            )
            
            await self._store_payout(payout)
            payouts.append(payout)
            
            # Mark referrals as paid
            for referral in referrals:
                referral.status = "paid"
                referral.commission_paid_date = datetime.utcnow()
                await self._store_referral(referral)
            
            # Update partner total commission
            partner.total_commission_paid += total_amount
            await self._store_partner(partner)
        
        return payouts
    
    async def get_partner_dashboard(self, partner_id: str) -> Dict[str, Any]:
        """Get partner dashboard data"""
        
        partner = await self._get_partner(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        # Get referrals for current month
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
        
        monthly_referrals = await self._get_referrals_by_partner_and_period(
            partner_id, month_start, month_end
        )
        
        # Calculate metrics
        monthly_referrals_count = len(monthly_referrals)
        monthly_revenue = sum(r.deal_value for r in monthly_referrals if r.status == "qualified")
        monthly_commission = sum(r.commission_amount for r in monthly_referrals if r.status == "qualified")
        
        # Get recent activity
        recent_referrals = await self._get_recent_referrals(partner_id, limit=10)
        
        # Get pending commissions
        pending_commission = await self._get_pending_commission(partner_id)
        
        return {
            "partner": {
                "id": partner.id,
                "name": partner.name,
                "company": partner.company,
                "tier": partner.tier.value,
                "commission_rate": partner.commission_rate,
                "referral_code": partner.referral_code,
                "status": partner.status
            },
            "lifetime_stats": {
                "total_referrals": partner.total_referrals,
                "total_revenue": partner.total_revenue,
                "total_commission_paid": partner.total_commission_paid
            },
            "monthly_stats": {
                "referrals": monthly_referrals_count,
                "revenue": monthly_revenue,
                "commission": monthly_commission
            },
            "pending_commission": pending_commission,
            "recent_referrals": [
                {
                    "id": r.id,
                    "customer_name": r.customer_name,
                    "company": r.company,
                    "deal_value": r.deal_value,
                    "commission_amount": r.commission_amount,
                    "status": r.status,
                    "created_at": r.created_at.isoformat()
                }
                for r in recent_referrals
            ]
        }
    
    async def get_partner_leaderboard(
        self,
        period_start: datetime,
        period_end: datetime,
        metric: str = "revenue"
    ) -> List[Dict[str, Any]]:
        """Get partner leaderboard for period"""
        
        partners_stats = await self._get_partner_stats_by_period(period_start, period_end)
        
        # Sort by specified metric
        if metric == "revenue":
            partners_stats.sort(key=lambda x: x["revenue"], reverse=True)
        elif metric == "referrals":
            partners_stats.sort(key=lambda x: x["referrals"], reverse=True)
        elif metric == "commission":
            partners_stats.sort(key=lambda x: x["commission"], reverse=True)
        
        return partners_stats[:20]  # Top 20
    
    async def create_marketing_materials(self, partner_id: str) -> Dict[str, Any]:
        """Generate marketing materials for partner"""
        
        partner = await self._get_partner(partner_id)
        if not partner:
            raise ValueError("Partner not found")
        
        base_url = "https://frontier-operations.com"
        referral_url = f"{base_url}?ref={partner.referral_code}"
        
        materials = {
            "referral_url": referral_url,
            "email_templates": [
                {
                    "name": "Introduction Email",
                    "subject": "Transform Your Business Operations with AI",
                    "content": f"""
Hi [Customer Name],

I wanted to introduce you to Frontier Operations Platform - an AI-powered solution that's helping companies like yours streamline operations and boost productivity.

Key benefits:
• 50% reduction in manual tasks
• Real-time insights and analytics
• Enterprise-grade security and compliance
• 24/7 automated workflows

I think this could be a perfect fit for [Company Name]. You can learn more and start a free trial here:
{referral_url}

Best regards,
{partner.contact_name}
{partner.company}
                    """
                }
            ],
            "social_media": [
                {
                    "platform": "LinkedIn",
                    "content": f"""
🚀 Excited to partner with @FrontierOps! Their AI-powered operations platform is transforming how businesses work.

✅ 50% reduction in manual tasks
✅ Real-time insights & analytics  
✅ Enterprise security & compliance

Check it out: {referral_url}

#AI #BusinessOperations #Productivity
                    """
                },
                {
                    "platform": "Twitter",
                    "content": f"""
Just discovered @FrontierOps - AI that actually transforms business operations! 

🔥 50% less manual work
📊 Real-time insights
🔒 Enterprise security

Try it free: {referral_url}

#AI #Automation #BusinessOps
                    """
                }
            ],
            "banner_ads": [
                {
                    "size": "728x90",
                    "html": f'<a href="{referral_url}"><img src="{base_url}/assets/banners/728x90.png" alt="Frontier Operations Platform"></a>'
                },
                {
                    "size": "300x250",
                    "html": f'<a href="{referral_url}"><img src="{base_url}/assets/banners/300x250.png" alt="Frontier Operations Platform"></a>'
                }
            ],
            "case_studies": [
                {
                    "title": "Manufacturing Company Saves 40% on Operations Costs",
                    "url": f"{base_url}/case-studies/manufacturing?ref={partner.referral_code}"
                },
                {
                    "title": "Healthcare Provider Improves Patient Flow by 60%",
                    "url": f"{base_url}/case-studies/healthcare?ref={partner.referral_code}"
                }
            ]
        }
        
        return materials
    
    # Private helper methods
    
    def _generate_referral_code(self, company_name: str) -> str:
        """Generate unique referral code"""
        # Create code from company name + timestamp
        base = company_name.lower().replace(" ", "")[:8]
        timestamp = str(int(datetime.utcnow().timestamp()))[-6:]
        return f"{base}{timestamp}".upper()
    
    def _determine_initial_tier_and_rate(self, partner_type: PartnerType) -> tuple[PartnerTier, float]:
        """Determine initial tier and commission rate based on partner type"""
        
        tier_rates = {
            PartnerType.AFFILIATE: (PartnerTier.BRONZE, 0.10),  # 10%
            PartnerType.RESELLER: (PartnerTier.SILVER, 0.25),   # 25%
            PartnerType.SYSTEM_INTEGRATOR: (PartnerTier.GOLD, 0.30),  # 30%
            PartnerType.TECHNOLOGY: (PartnerTier.SILVER, 0.20), # 20%
            PartnerType.CONSULTANT: (PartnerTier.SILVER, 0.25), # 25%
            PartnerType.INFLUENCER: (PartnerTier.BRONZE, 0.15)  # 15%
        }
        
        return tier_rates.get(partner_type, (PartnerTier.BRONZE, 0.10))
    
    def _calculate_commission(self, partner: Partner, deal_value: float) -> float:
        """Calculate commission amount"""
        return deal_value * partner.commission_rate
    
    async def _check_tier_upgrade(self, partner: Partner) -> None:
        """Check if partner qualifies for tier upgrade"""
        
        # Tier upgrade criteria
        upgrade_criteria = {
            PartnerTier.SILVER: {"revenue": 10000, "referrals": 5},
            PartnerTier.GOLD: {"revenue": 50000, "referrals": 20},
            PartnerTier.PLATINUM: {"revenue": 200000, "referrals": 50}
        }
        
        current_tier_index = list(PartnerTier).index(partner.tier)
        
        for tier in list(PartnerTier)[current_tier_index + 1:]:
            criteria = upgrade_criteria.get(tier)
            if criteria and (partner.total_revenue >= criteria["revenue"] and 
                           partner.total_referrals >= criteria["referrals"]):
                
                old_tier = partner.tier
                partner.tier = tier
                
                # Increase commission rate for higher tiers
                rate_increases = {
                    PartnerTier.SILVER: 0.05,
                    PartnerTier.GOLD: 0.05,
                    PartnerTier.PLATINUM: 0.05
                }
                partner.commission_rate += rate_increases.get(tier, 0)
                
                await self._store_partner(partner)
                await self._send_tier_upgrade_email(partner, old_tier, tier)
                break
    
    async def _send_partner_welcome_email(self, partner: Partner) -> None:
        """Send welcome email to new partner"""
        # Implementation would send email via email service
        pass
    
    async def _send_partner_approval_email(self, partner: Partner) -> None:
        """Send approval email to partner"""
        # Implementation would send approval email
        pass
    
    async def _send_tier_upgrade_email(
        self,
        partner: Partner,
        old_tier: PartnerTier,
        new_tier: PartnerTier
    ) -> None:
        """Send tier upgrade notification"""
        # Implementation would send tier upgrade email
        pass
    
    # Database operations (implement based on your database choice)
    
    async def _store_partner(self, partner: Partner) -> None:
        """Store partner in database"""
        pass
    
    async def _store_referral(self, referral: Referral) -> None:
        """Store referral in database"""
        pass
    
    async def _store_payout(self, payout: CommissionPayout) -> None:
        """Store payout in database"""
        pass
    
    async def _get_partner(self, partner_id: str) -> Optional[Partner]:
        """Get partner by ID"""
        pass
    
    async def _get_partner_by_referral_code(self, referral_code: str) -> Optional[Partner]:
        """Get partner by referral code"""
        pass
    
    async def _get_referral(self, referral_id: str) -> Optional[Referral]:
        """Get referral by ID"""
        pass
    
    async def _get_qualified_referrals_by_period(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Referral]:
        """Get qualified referrals in period"""
        pass
    
    async def _get_referrals_by_partner_and_period(
        self,
        partner_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Referral]:
        """Get referrals for partner in period"""
        pass
    
    async def _get_recent_referrals(self, partner_id: str, limit: int) -> List[Referral]:
        """Get recent referrals for partner"""
        pass
    
    async def _get_pending_commission(self, partner_id: str) -> float:
        """Get pending commission amount for partner"""
        pass
    
    async def _get_partner_stats_by_period(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get partner statistics for period"""
        pass
