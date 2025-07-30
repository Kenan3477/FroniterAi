"""
Beta Program Company Selection and Onboarding System
Systematic process for selecting, inviting, and onboarding beta companies
"""

import json
import csv
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
import uuid

from beta_manager import BetaProgramManager, BetaCompany, Industry, CompanySize, BetaUserStatus

@dataclass
class CompanyLeadProfile:
    """Potential beta company profile for selection"""
    id: str
    name: str
    industry: Industry
    size: CompanySize
    location: str
    website: str
    description: str
    
    # Contact information
    primary_contact_name: str
    primary_contact_email: str
    primary_contact_phone: str
    primary_contact_title: str
    linkedin_profile: str = ""
    
    # Business profile
    annual_revenue: Optional[float] = None
    employee_count: Optional[int] = None
    year_founded: Optional[int] = None
    business_model: str = ""  # B2B, B2C, B2B2C
    
    # Technology profile
    current_tools: List[str] = None
    tech_stack: List[str] = None
    api_usage_experience: str = "beginner"  # beginner, intermediate, advanced
    data_analytics_maturity: str = "basic"  # basic, intermediate, advanced
    
    # Fit assessment
    pain_points: List[str] = None
    use_case_fit: List[str] = None  # Which modules they'd likely use
    decision_maker_access: bool = False
    budget_authority: str = "unknown"  # low, medium, high, unknown
    timeline_to_decide: str = "unknown"  # <3months, 3-6months, >6months
    
    # Lead scoring
    lead_score: float = 0.0
    fit_score: float = 0.0
    engagement_score: float = 0.0
    qualification_status: str = "unqualified"  # unqualified, qualified, invited, onboarded
    
    # Tracking
    first_contact_date: Optional[datetime] = None
    last_interaction_date: Optional[datetime] = None
    interaction_history: List[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.current_tools is None:
            self.current_tools = []
        if self.tech_stack is None:
            self.tech_stack = []
        if self.pain_points is None:
            self.pain_points = []
        if self.use_case_fit is None:
            self.use_case_fit = []
        if self.interaction_history is None:
            self.interaction_history = []

class CompanySelectionEngine:
    """Engine for selecting and qualifying beta companies"""
    
    def __init__(self, data_dir: str = "beta_program/data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.company_leads: List[CompanyLeadProfile] = []
        self.beta_manager = BetaProgramManager()
        
        # Load existing leads
        self.load_leads()
    
    def load_leads(self):
        """Load company leads from JSON file"""
        leads_file = self.data_dir / "company_leads.json"
        if leads_file.exists():
            try:
                with open(leads_file, 'r') as f:
                    leads_data = json.load(f)
                    self.company_leads = [CompanyLeadProfile(**lead) for lead in leads_data]
            except Exception as e:
                print(f"Error loading leads: {e}")
    
    def save_leads(self):
        """Save company leads to JSON file"""
        try:
            leads_data = []
            for lead in self.company_leads:
                lead_dict = lead.__dict__.copy()
                # Convert datetime objects to strings
                if lead_dict.get('first_contact_date'):
                    lead_dict['first_contact_date'] = lead_dict['first_contact_date'].isoformat()
                if lead_dict.get('last_interaction_date'):
                    lead_dict['last_interaction_date'] = lead_dict['last_interaction_date'].isoformat()
                leads_data.append(lead_dict)
            
            with open(self.data_dir / "company_leads.json", 'w') as f:
                json.dump(leads_data, f, indent=2, default=str)
        except Exception as e:
            print(f"Error saving leads: {e}")
    
    def create_ideal_customer_profile(self) -> Dict[str, Any]:
        """Define ideal customer profile for beta selection"""
        
        icp = {
            "company_characteristics": {
                "size_preference": [CompanySize.SMALL, CompanySize.MEDIUM, CompanySize.LARGE],
                "industry_focus": [
                    Industry.TECHNOLOGY,
                    Industry.FINANCE, 
                    Industry.HEALTHCARE,
                    Industry.CONSULTING,
                    Industry.MANUFACTURING
                ],
                "revenue_range": {
                    "min": 1000000,    # $1M minimum
                    "max": 100000000   # $100M maximum
                },
                "employee_range": {
                    "min": 10,
                    "max": 1000
                },
                "geographic_preference": [
                    "North America", "Europe", "Australia"
                ]
            },
            "business_profile": {
                "decision_making": "fast",  # <3 months decision cycle
                "budget_authority": "medium_to_high",
                "growth_stage": ["scaling", "established"],
                "innovation_mindset": "high",
                "data_driven": "medium_to_high"
            },
            "technology_profile": {
                "api_comfort": "intermediate_to_advanced",
                "current_tools": [
                    "Excel/Google Sheets",
                    "Business Intelligence tools",
                    "CRM systems",
                    "Financial software"
                ],
                "integration_requirements": "medium",
                "technical_team": "available"
            },
            "use_case_alignment": {
                "primary_use_cases": [
                    "financial_analysis",
                    "strategic_planning",
                    "market_research",
                    "competitive_analysis"
                ],
                "pain_points": [
                    "Manual data analysis",
                    "Lack of market insights",
                    "Time-consuming research",
                    "Inconsistent financial modeling",
                    "Poor competitive intelligence"
                ]
            },
            "engagement_indicators": {
                "website_engagement": "high",
                "content_consumption": "regular",
                "event_participation": "active",
                "referral_source": "trusted",
                "inbound_inquiry": "qualified"
            }
        }
        
        return icp
    
    def score_company_lead(self, lead: CompanyLeadProfile) -> Dict[str, float]:
        """Score company lead based on ICP fit"""
        
        icp = self.create_ideal_customer_profile()
        scores = {
            "company_fit": 0.0,
            "business_fit": 0.0, 
            "technology_fit": 0.0,
            "use_case_fit": 0.0,
            "engagement_fit": 0.0
        }
        
        # Company fit scoring (0-20 points)
        company_score = 0
        
        # Size scoring
        if lead.size in icp["company_characteristics"]["size_preference"]:
            company_score += 5
        
        # Industry scoring
        if lead.industry in icp["company_characteristics"]["industry_focus"]:
            company_score += 5
        
        # Revenue scoring
        if lead.annual_revenue:
            if icp["company_characteristics"]["revenue_range"]["min"] <= lead.annual_revenue <= icp["company_characteristics"]["revenue_range"]["max"]:
                company_score += 5
        
        # Employee count scoring
        if lead.employee_count:
            if icp["company_characteristics"]["employee_range"]["min"] <= lead.employee_count <= icp["company_characteristics"]["employee_range"]["max"]:
                company_score += 5
        
        scores["company_fit"] = company_score
        
        # Business fit scoring (0-20 points)
        business_score = 0
        
        if lead.decision_maker_access:
            business_score += 5
        
        if lead.budget_authority in ["medium", "high"]:
            business_score += 5
        
        if lead.timeline_to_decide in ["<3months", "3-6months"]:
            business_score += 5
        
        if lead.data_analytics_maturity in ["intermediate", "advanced"]:
            business_score += 5
        
        scores["business_fit"] = business_score
        
        # Technology fit scoring (0-20 points)
        tech_score = 0
        
        if lead.api_usage_experience in ["intermediate", "advanced"]:
            tech_score += 10
        elif lead.api_usage_experience == "beginner":
            tech_score += 5
        
        # Current tools alignment
        relevant_tools = ["excel", "sheets", "tableau", "powerbi", "salesforce", "hubspot"]
        tool_matches = sum(1 for tool in lead.current_tools if any(rt in tool.lower() for rt in relevant_tools))
        tech_score += min(tool_matches * 2, 10)
        
        scores["technology_fit"] = tech_score
        
        # Use case fit scoring (0-20 points)
        use_case_score = 0
        
        primary_use_cases = icp["use_case_alignment"]["primary_use_cases"]
        use_case_matches = len(set(lead.use_case_fit) & set(primary_use_cases))
        use_case_score += use_case_matches * 5
        
        # Pain point alignment
        icp_pain_points = icp["use_case_alignment"]["pain_points"]
        pain_point_keywords = ["manual", "data", "analysis", "research", "competitive", "financial"]
        pain_point_matches = sum(
            1 for pain in lead.pain_points 
            for keyword in pain_point_keywords 
            if keyword.lower() in pain.lower()
        )
        use_case_score += min(pain_point_matches * 2, 10)
        
        scores["use_case_fit"] = min(use_case_score, 20)
        
        # Engagement fit scoring (0-20 points)
        engagement_score = 0
        
        if lead.first_contact_date:
            # Recent engagement is better
            days_since_contact = (datetime.now() - lead.first_contact_date).days
            if days_since_contact <= 30:
                engagement_score += 10
            elif days_since_contact <= 90:
                engagement_score += 5
        
        if lead.interaction_history:
            # More interactions is better
            interaction_count = len(lead.interaction_history)
            engagement_score += min(interaction_count * 2, 10)
        
        scores["engagement_fit"] = engagement_score
        
        # Calculate overall scores
        total_score = sum(scores.values())
        lead.lead_score = total_score
        lead.fit_score = total_score / 100 * 100  # Convert to percentage
        
        return scores
    
    def generate_target_company_list(self) -> List[CompanyLeadProfile]:
        """Generate list of target companies for beta program"""
        
        target_companies = [
            # Technology Companies
            CompanyLeadProfile(
                id="lead_tech_001",
                name="DataFlow Analytics",
                industry=Industry.TECHNOLOGY,
                size=CompanySize.MEDIUM,
                location="San Francisco, CA",
                website="https://dataflow-analytics.com",
                description="Business intelligence platform for mid-market companies",
                primary_contact_name="Sarah Mitchell",
                primary_contact_email="sarah.mitchell@dataflow-analytics.com",
                primary_contact_phone="+1-415-555-1001",
                primary_contact_title="VP of Product",
                annual_revenue=15000000,
                employee_count=85,
                year_founded=2018,
                business_model="B2B",
                current_tools=["Tableau", "Salesforce", "Excel", "Google Analytics"],
                tech_stack=["Python", "React", "PostgreSQL", "AWS"],
                api_usage_experience="advanced",
                data_analytics_maturity="advanced",
                pain_points=[
                    "Manual financial analysis for clients",
                    "Time-consuming market research",
                    "Lack of standardized competitive analysis"
                ],
                use_case_fit=["financial_analysis", "market_research", "competitive_analysis"],
                decision_maker_access=True,
                budget_authority="high",
                timeline_to_decide="<3months"
            ),
            
            CompanyLeadProfile(
                id="lead_tech_002", 
                name="CloudScale Solutions",
                industry=Industry.TECHNOLOGY,
                size=CompanySize.SMALL,
                location="Austin, TX",
                website="https://cloudscale.com",
                description="Cloud infrastructure automation for startups",
                primary_contact_name="Marcus Chen",
                primary_contact_email="marcus@cloudscale.com",
                primary_contact_phone="+1-512-555-1002",
                primary_contact_title="Co-founder & CTO",
                annual_revenue=3500000,
                employee_count=25,
                year_founded=2020,
                business_model="B2B",
                current_tools=["Excel", "Stripe", "Mixpanel", "Slack"],
                tech_stack=["Node.js", "React", "MongoDB", "GCP"],
                api_usage_experience="advanced",
                data_analytics_maturity="intermediate",
                pain_points=[
                    "Manual investor reporting",
                    "Inconsistent financial modeling",
                    "Need better strategic planning tools"
                ],
                use_case_fit=["financial_analysis", "strategic_planning", "valuation"],
                decision_maker_access=True,
                budget_authority="medium",
                timeline_to_decide="3-6months"
            ),
            
            # Financial Services Companies
            CompanyLeadProfile(
                id="lead_fin_001",
                name="Regional Investment Partners",
                industry=Industry.FINANCE,
                size=CompanySize.MEDIUM,
                location="Boston, MA", 
                website="https://regionalinvest.com",
                description="Investment advisory firm for high-net-worth individuals",
                primary_contact_name="Jennifer Walsh",
                primary_contact_email="j.walsh@regionalinvest.com",
                primary_contact_phone="+1-617-555-2001",
                primary_contact_title="Managing Partner",
                annual_revenue=25000000,
                employee_count=45,
                year_founded=2015,
                business_model="B2B",
                current_tools=["Bloomberg Terminal", "Excel", "PowerBI", "Salesforce"],
                tech_stack=["Microsoft Stack", "SQL Server"],
                api_usage_experience="intermediate",
                data_analytics_maturity="advanced",
                pain_points=[
                    "Time-intensive client portfolio analysis",
                    "Manual market research compilation",
                    "Inconsistent valuation methodologies"
                ],
                use_case_fit=["financial_analysis", "valuation", "market_research"],
                decision_maker_access=True,
                budget_authority="high",
                timeline_to_decide="<3months"
            ),
            
            CompanyLeadProfile(
                id="lead_fin_002",
                name="FinTech Growth Capital",
                industry=Industry.FINANCE,
                size=CompanySize.SMALL,
                location="New York, NY",
                website="https://fintechgrowth.com",
                description="Venture capital focused on fintech startups",
                primary_contact_name="David Rodriguez",
                primary_contact_email="david@fintechgrowth.com",
                primary_contact_phone="+1-212-555-2002",
                primary_contact_title="Principal",
                annual_revenue=8000000,
                employee_count=15,
                year_founded=2019,
                business_model="B2B",
                current_tools=["Excel", "PitchBook", "Airtable", "Slack"],
                tech_stack=["Google Workspace", "Python"],
                api_usage_experience="intermediate",
                data_analytics_maturity="intermediate",
                pain_points=[
                    "Manual due diligence processes",
                    "Inconsistent startup valuation",
                    "Time-consuming market analysis"
                ],
                use_case_fit=["valuation", "market_research", "competitive_analysis"],
                decision_maker_access=True,
                budget_authority="medium",
                timeline_to_decide="3-6months"
            ),
            
            # Healthcare Companies
            CompanyLeadProfile(
                id="lead_health_001",
                name="MedTech Innovations",
                industry=Industry.HEALTHCARE,
                size=CompanySize.MEDIUM,
                location="San Diego, CA",
                website="https://medtech-innovations.com",
                description="Medical device development and manufacturing",
                primary_contact_name="Dr. Lisa Anderson",
                primary_contact_email="landerson@medtech-innovations.com",
                primary_contact_phone="+1-858-555-3001",
                primary_contact_title="VP of Strategy",
                annual_revenue=40000000,
                employee_count=120,
                year_founded=2012,
                business_model="B2B",
                current_tools=["Excel", "SAP", "Tableau", "Salesforce"],
                tech_stack=["Java", "Oracle", "AWS"],
                api_usage_experience="beginner",
                data_analytics_maturity="intermediate",
                pain_points=[
                    "Complex regulatory financial reporting",
                    "Manual competitive analysis", 
                    "Inefficient strategic planning processes"
                ],
                use_case_fit=["financial_analysis", "strategic_planning", "competitive_analysis"],
                decision_maker_access=False,
                budget_authority="medium",
                timeline_to_decide="3-6months"
            ),
            
            # Manufacturing Companies
            CompanyLeadProfile(
                id="lead_mfg_001",
                name="Precision Manufacturing Corp",
                industry=Industry.MANUFACTURING,
                size=CompanySize.LARGE,
                location="Milwaukee, WI",
                website="https://precisionmfg.com",
                description="Precision machining and assembly for aerospace",
                primary_contact_name="Robert Thompson",
                primary_contact_email="rthompson@precisionmfg.com",
                primary_contact_phone="+1-414-555-4001",
                primary_contact_title="CFO",
                annual_revenue=75000000,
                employee_count=350,
                year_founded=1995,
                business_model="B2B",
                current_tools=["Excel", "SAP", "PowerBI", "AutoCAD"],
                tech_stack=["Microsoft Stack", ".NET", "SQL Server"],
                api_usage_experience="beginner",
                data_analytics_maturity="basic",
                pain_points=[
                    "Manual financial analysis and reporting",
                    "Lack of industry benchmarking",
                    "Time-consuming budget planning"
                ],
                use_case_fit=["financial_analysis", "industry_benchmarks"],
                decision_maker_access=True,
                budget_authority="high",
                timeline_to_decide="3-6months"
            ),
            
            # Consulting Companies  
            CompanyLeadProfile(
                id="lead_consult_001",
                name="Strategic Growth Advisors",
                industry=Industry.CONSULTING,
                size=CompanySize.SMALL,
                location="Chicago, IL",
                website="https://strategicgrowth.com",
                description="Management consulting for mid-market companies",
                primary_contact_name="Emily Watson",
                primary_contact_email="ewatson@strategicgrowth.com",
                primary_contact_phone="+1-312-555-5001",
                primary_contact_title="Managing Director",
                annual_revenue=12000000,
                employee_count=30,
                year_founded=2017,
                business_model="B2B",
                current_tools=["Excel", "PowerPoint", "Tableau", "Salesforce"],
                tech_stack=["Microsoft Office", "Google Workspace"],
                api_usage_experience="intermediate",
                data_analytics_maturity="advanced",
                pain_points=[
                    "Time-intensive client research",
                    "Manual financial modeling for clients",
                    "Inconsistent competitive analysis methodology"
                ],
                use_case_fit=["financial_analysis", "strategic_planning", "market_research", "competitive_analysis"],
                decision_maker_access=True,
                budget_authority="high",
                timeline_to_decide="<3months"
            ),
            
            # Retail Companies
            CompanyLeadProfile(
                id="lead_retail_001", 
                name="Urban Fashion Collective",
                industry=Industry.RETAIL,
                size=CompanySize.MEDIUM,
                location="Los Angeles, CA",
                website="https://urbanfashion.com",
                description="Multi-brand fashion retailer with online and physical stores",
                primary_contact_name="Maria Gonzalez",
                primary_contact_email="mgonzalez@urbanfashion.com",
                primary_contact_phone="+1-323-555-6001",
                primary_contact_title="VP of Operations",
                annual_revenue=18000000,
                employee_count=65,
                year_founded=2014,
                business_model="B2C",
                current_tools=["Shopify", "Excel", "Google Analytics", "Mailchimp"],
                tech_stack=["PHP", "MySQL", "Shopify Plus"],
                api_usage_experience="beginner",
                data_analytics_maturity="intermediate",
                pain_points=[
                    "Manual financial analysis across channels",
                    "Lack of competitive pricing insights",
                    "Time-consuming market trend research"
                ],
                use_case_fit=["financial_analysis", "market_research", "competitive_analysis"],
                decision_maker_access=False,
                budget_authority="medium",
                timeline_to_decide="3-6months"
            )
        ]
        
        # Score all leads
        for lead in target_companies:
            self.score_company_lead(lead)
            lead.qualification_status = "qualified" if lead.fit_score >= 60 else "unqualified"
        
        # Add to leads list
        self.company_leads.extend(target_companies)
        self.save_leads()
        
        return target_companies
    
    def select_beta_candidates(self, target_count: int = 20) -> List[CompanyLeadProfile]:
        """Select top candidates for beta program invitation"""
        
        # Filter qualified leads
        qualified_leads = [lead for lead in self.company_leads if lead.qualification_status == "qualified"]
        
        # Sort by fit score
        sorted_leads = sorted(qualified_leads, key=lambda x: x.fit_score, reverse=True)
        
        # Ensure industry diversity
        selected_leads = []
        industry_counts = {}
        max_per_industry = max(1, target_count // len(Industry))
        
        for lead in sorted_leads:
            industry = lead.industry
            current_count = industry_counts.get(industry, 0)
            
            if current_count < max_per_industry and len(selected_leads) < target_count:
                selected_leads.append(lead)
                industry_counts[industry] = current_count + 1
        
        # Fill remaining slots with highest scoring leads
        remaining_slots = target_count - len(selected_leads)
        if remaining_slots > 0:
            remaining_leads = [lead for lead in sorted_leads if lead not in selected_leads]
            selected_leads.extend(remaining_leads[:remaining_slots])
        
        return selected_leads[:target_count]
    
    def create_invitation_email_template(self, lead: CompanyLeadProfile) -> Dict[str, str]:
        """Create personalized invitation email"""
        
        # Personalization based on industry and use cases
        industry_specific = {
            Industry.TECHNOLOGY: {
                "pain_point": "manual financial analysis and investor reporting",
                "benefit": "automated financial modeling and real-time analytics",
                "example": "streamline your monthly investor updates and quarterly planning"
            },
            Industry.FINANCE: {
                "pain_point": "time-intensive client analysis and market research",
                "benefit": "comprehensive financial analysis and market intelligence",
                "example": "enhance your client portfolio analysis and market research capabilities"
            },
            Industry.HEALTHCARE: {
                "pain_point": "complex regulatory reporting and strategic planning",
                "benefit": "automated compliance tracking and strategic insights",
                "example": "simplify your regulatory financial reporting and strategic planning"
            },
            Industry.MANUFACTURING: {
                "pain_point": "manual financial reporting and industry benchmarking",
                "benefit": "automated financial analysis and industry comparisons",
                "example": "optimize your financial planning and competitive positioning"
            },
            Industry.CONSULTING: {
                "pain_point": "time-consuming client research and analysis",
                "benefit": "comprehensive research tools and financial modeling",
                "example": "accelerate your client research and financial analysis delivery"
            },
            Industry.RETAIL: {
                "pain_point": "manual analysis across multiple channels and markets",
                "benefit": "integrated financial analysis and market insights",
                "example": "optimize your multi-channel financial performance and market positioning"
            }
        }
        
        industry_info = industry_specific.get(lead.industry, industry_specific[Industry.TECHNOLOGY])
        
        subject = f"Exclusive Invitation: Frontier Beta Program for {lead.name}"
        
        body = f"""
Dear {lead.primary_contact_name},

I hope this email finds you well. I'm reaching out because {lead.name} has caught our attention as an innovative {lead.industry.value} company that could significantly benefit from our new platform.

**Why We're Reaching Out to You**

At Frontier, we've developed a comprehensive business analytics platform specifically designed to address the challenges that companies like {lead.name} face with {industry_info['pain_point']}. 

Given your role as {lead.primary_contact_title} and {lead.name}'s focus on {lead.description.lower()}, I believe Frontier could help you {industry_info['example']}.

**What is Frontier?**

Frontier is an AI-powered business analytics platform that provides:
• Advanced financial analysis and modeling
• Strategic planning and scenario analysis  
• Comprehensive market research and competitive intelligence
• Industry benchmarking and performance insights
• Automated reporting and data visualization

**Exclusive Beta Program Invitation**

We're launching a selective beta program with just 15-20 companies across different industries, and we'd love to include {lead.name}. As a beta participant, you'll receive:

✅ **Free access** to our full platform for 3 months (normally $2,500/month)
✅ **Direct access** to our product team for feature requests and customization
✅ **Weekly feedback sessions** to ensure the platform meets your specific needs
✅ **Priority implementation** of features you request
✅ **First access** to new capabilities as we develop them
✅ **Preferred pricing** when you decide to continue after beta

**Why This Matters for {lead.name}**

Based on our research, we understand that {lead.name} likely deals with:
• {lead.pain_points[0] if lead.pain_points else 'Manual data analysis and reporting'}
• Time-consuming research and analysis processes
• Need for better strategic planning tools
• Desire for competitive insights and market intelligence

Frontier's {industry_info['benefit']} could help you overcome these challenges while saving significant time and improving decision-making quality.

**Next Steps**

If you're interested in learning more, I'd love to schedule a brief 15-minute call to:
1. Show you a quick demo tailored to {lead.name}'s needs
2. Discuss your current challenges and goals
3. Explain the beta program benefits in detail
4. Answer any questions you might have

Would you be available for a brief call this week or next? I'm happy to work around your schedule.

You can also visit our website at https://frontier-analytics.com to learn more about our platform and capabilities.

**Why Act Now?**

We're limiting this beta program to ensure we can provide exceptional support to each participant. We've already received significant interest and expect to fill our remaining spots quickly.

Thank you for your time, and I look forward to the possibility of working with {lead.name} to revolutionize your business analytics capabilities.

Best regards,

Kenneth [Your Name]
Founder & CEO, Frontier
Email: kenneth@frontier-analytics.com
Phone: +1-555-FRONTIER
Website: https://frontier-analytics.com

P.S. - If {lead.primary_contact_name} isn't the right person for this conversation, I'd appreciate it if you could point me in the right direction. Thank you!

---
This email was sent because we identified {lead.name} as a potential fit for our beta program based on your industry leadership and innovation. If you'd prefer not to receive further communications, please reply with "UNSUBSCRIBE" and we'll respect your preference.
"""
        
        return {
            "subject": subject,
            "body": body.strip(),
            "personalization_notes": f"Targeting {lead.industry.value} industry, addressing {industry_info['pain_point']}"
        }
    
    def generate_outreach_sequence(self, lead: CompanyLeadProfile) -> List[Dict[str, Any]]:
        """Generate multi-touch outreach sequence"""
        
        sequence = [
            # Initial invitation email
            {
                "type": "email",
                "day": 0,
                "title": "Initial Beta Program Invitation",
                "template": self.create_invitation_email_template(lead),
                "goal": "Generate interest and schedule demo call"
            },
            
            # Follow-up email (if no response)
            {
                "type": "email", 
                "day": 5,
                "title": "Follow-up: Beta Program Opportunity",
                "subject": f"Re: Frontier Beta Program for {lead.name} - Quick Question",
                "body": f"""
Hi {lead.primary_contact_name},

I wanted to follow up on my email from last week about our Frontier beta program.

I know you're busy, so I'll keep this brief. We're down to our final few spots in the beta program, and I'd hate for {lead.name} to miss out on this opportunity.

Quick question: Is improving your {', '.join(lead.pain_points[:2]) if lead.pain_points else 'financial analysis and strategic planning processes'} a priority for {lead.name} this quarter?

If so, would you be open to a brief 10-minute call to see if Frontier might be a fit?

If not, no worries at all - I'll stop reaching out.

Best regards,
Kenneth
""",
                "goal": "Get response - yes or no"
            },
            
            # Value-driven follow-up
            {
                "type": "email",
                "day": 12, 
                "title": "Case Study + Final Follow-up",
                "subject": f"How [Similar Company] saved 20 hours/week with Frontier",
                "body": f"""
Hi {lead.primary_contact_name},

I hope you're doing well. I wanted to share a quick success story that might be relevant to {lead.name}.

One of our beta users, a {lead.industry.value} company similar to {lead.name}, just shared that Frontier is saving their team 20+ hours per week on financial analysis and reporting.

Their VP said: "What used to take us 2 days of manual work now takes 30 minutes. We're making better decisions faster than ever before."

I thought this might resonate with your situation at {lead.name}.

This is my final follow-up - I don't want to be a bother. If you're interested in learning more, just reply with "YES" and I'll send over a quick demo video.

If not, I understand completely and wish you all the best with your current initiatives.

Best regards,
Kenneth

P.S. - We're closing beta enrollment this Friday, so this is the last chance to join at no cost.
""",
                "goal": "Final conversion attempt with social proof"
            },
            
            # LinkedIn connection request
            {
                "type": "linkedin",
                "day": 3,
                "title": "LinkedIn Connection Request", 
                "message": f"Hi {lead.primary_contact_name}, I sent you an email about our Frontier beta program for {lead.name}. Would love to connect and continue the conversation here if that's easier for you.",
                "goal": "Alternative communication channel"
            },
            
            # Phone call attempt
            {
                "type": "phone",
                "day": 7,
                "title": "Phone Call Attempt",
                "script": f"Hi {lead.primary_contact_name}, this is Kenneth from Frontier. I sent you an email about our beta program and wanted to see if you had a quick minute to chat about how we might be able to help {lead.name} with your {lead.pain_points[0] if lead.pain_points else 'analytics needs'}.",
                "goal": "Direct conversation"
            }
        ]
        
        return sequence
    
    def track_outreach_interaction(self, lead_id: str, interaction_type: str, 
                                  outcome: str, notes: str = ""):
        """Track outreach interaction"""
        
        lead = next((l for l in self.company_leads if l.id == lead_id), None)
        if not lead:
            return
        
        interaction = {
            "date": datetime.now().isoformat(),
            "type": interaction_type,  # email, phone, linkedin, demo, meeting
            "outcome": outcome,        # sent, delivered, opened, replied, answered, scheduled, etc.
            "notes": notes
        }
        
        lead.interaction_history.append(interaction)
        lead.last_interaction_date = datetime.now()
        
        # Update engagement score
        engagement_points = {
            "sent": 1,
            "delivered": 2, 
            "opened": 3,
            "replied": 10,
            "answered": 10,
            "scheduled": 15,
            "demo_completed": 20
        }
        
        lead.engagement_score += engagement_points.get(outcome, 0)
        
        self.save_leads()
    
    def convert_lead_to_beta_company(self, lead_id: str) -> BetaCompany:
        """Convert qualified lead to beta company"""
        
        lead = next((l for l in self.company_leads if l.id == lead_id), None)
        if not lead:
            raise ValueError(f"Lead {lead_id} not found")
        
        beta_company = BetaCompany(
            id=f"beta_{uuid.uuid4().hex[:8]}",
            name=lead.name,
            industry=lead.industry,
            size=lead.size,
            location=lead.location,
            website=lead.website,
            description=lead.description,
            primary_contact_name=lead.primary_contact_name,
            primary_contact_email=lead.primary_contact_email,
            primary_contact_phone=lead.primary_contact_phone,
            target_use_cases=lead.use_case_fit,
            expected_annual_value=self.estimate_annual_value(lead),
            probability_to_convert=lead.fit_score / 100,
            status=BetaUserStatus.INVITED
        )
        
        # Add to beta program
        self.beta_manager.companies.append(beta_company)
        self.beta_manager.save_data()
        
        # Update lead status
        lead.qualification_status = "invited"
        self.save_leads()
        
        return beta_company
    
    def estimate_annual_value(self, lead: CompanyLeadProfile) -> float:
        """Estimate potential annual contract value"""
        
        # Base pricing by company size
        base_pricing = {
            CompanySize.STARTUP: 8000,
            CompanySize.SMALL: 15000,
            CompanySize.MEDIUM: 25000,
            CompanySize.LARGE: 45000,
            CompanySize.ENTERPRISE: 75000
        }
        
        base_value = base_pricing.get(lead.size, 25000)
        
        # Industry multipliers
        industry_multipliers = {
            Industry.FINANCE: 1.3,      # Higher willingness to pay
            Industry.CONSULTING: 1.2,   # Values tools highly
            Industry.TECHNOLOGY: 1.1,   # Good fit, competitive market
            Industry.HEALTHCARE: 1.0,   # Standard pricing
            Industry.MANUFACTURING: 0.9, # More price sensitive
            Industry.RETAIL: 0.8        # Tight margins
        }
        
        industry_multiplier = industry_multipliers.get(lead.industry, 1.0)
        
        # Use case multiplier (more use cases = higher value)
        use_case_multiplier = 1.0 + (len(lead.use_case_fit) * 0.1)
        
        # Urgency multiplier
        urgency_multipliers = {
            "<3months": 1.2,
            "3-6months": 1.0, 
            ">6months": 0.8,
            "unknown": 0.9
        }
        
        urgency_multiplier = urgency_multipliers.get(lead.timeline_to_decide, 1.0)
        
        estimated_value = base_value * industry_multiplier * use_case_multiplier * urgency_multiplier
        
        return round(estimated_value, -2)  # Round to nearest $100
    
    def generate_selection_report(self) -> Dict[str, Any]:
        """Generate company selection and outreach report"""
        
        qualified_leads = [l for l in self.company_leads if l.qualification_status == "qualified"]
        invited_leads = [l for l in self.company_leads if l.qualification_status == "invited"]
        
        report = {
            "summary": {
                "total_leads": len(self.company_leads),
                "qualified_leads": len(qualified_leads),
                "invited_leads": len(invited_leads),
                "qualification_rate": len(qualified_leads) / len(self.company_leads) * 100 if self.company_leads else 0,
                "total_pipeline_value": sum([self.estimate_annual_value(l) for l in qualified_leads])
            },
            "lead_distribution": {
                "by_industry": {},
                "by_size": {},
                "by_score_range": {}
            },
            "outreach_metrics": {
                "emails_sent": 0,
                "response_rate": 0,
                "meeting_conversion": 0,
                "invitation_conversion": 0
            },
            "top_prospects": []
        }
        
        # Industry distribution
        for lead in qualified_leads:
            industry = lead.industry.value
            report["lead_distribution"]["by_industry"][industry] = \
                report["lead_distribution"]["by_industry"].get(industry, 0) + 1
        
        # Size distribution  
        for lead in qualified_leads:
            size = lead.size.value
            report["lead_distribution"]["by_size"][size] = \
                report["lead_distribution"]["by_size"].get(size, 0) + 1
        
        # Score range distribution
        score_ranges = {"80-100": 0, "60-79": 0, "40-59": 0, "0-39": 0}
        for lead in self.company_leads:
            score = lead.fit_score
            if score >= 80:
                score_ranges["80-100"] += 1
            elif score >= 60:
                score_ranges["60-79"] += 1
            elif score >= 40:
                score_ranges["40-59"] += 1
            else:
                score_ranges["0-39"] += 1
        
        report["lead_distribution"]["by_score_range"] = score_ranges
        
        # Outreach metrics calculation
        leads_with_outreach = [l for l in self.company_leads if l.interaction_history]
        if leads_with_outreach:
            total_emails = sum([
                len([i for i in l.interaction_history if i["type"] == "email"]) 
                for l in leads_with_outreach
            ])
            
            total_responses = sum([
                len([i for i in l.interaction_history if i["outcome"] in ["replied", "answered"]]) 
                for l in leads_with_outreach
            ])
            
            report["outreach_metrics"]["emails_sent"] = total_emails
            report["outreach_metrics"]["response_rate"] = \
                (total_responses / total_emails * 100) if total_emails > 0 else 0
        
        # Top prospects
        top_leads = sorted(qualified_leads, key=lambda x: x.fit_score, reverse=True)[:10]
        for lead in top_leads:
            report["top_prospects"].append({
                "name": lead.name,
                "industry": lead.industry.value,
                "fit_score": lead.fit_score,
                "estimated_value": self.estimate_annual_value(lead),
                "status": lead.qualification_status
            })
        
        return report

def main():
    """Main function to demonstrate company selection system"""
    
    selection_engine = CompanySelectionEngine()
    
    # Generate target company list
    print("🎯 Generating target company list...")
    target_companies = selection_engine.generate_target_company_list()
    print(f"Generated {len(target_companies)} target companies")
    
    # Select beta candidates
    print("\n🔍 Selecting beta candidates...")
    beta_candidates = selection_engine.select_beta_candidates(15)
    print(f"Selected {len(beta_candidates)} beta candidates")
    
    # Generate selection report
    print("\n📊 Generating selection report...")
    report = selection_engine.generate_selection_report()
    print(f"Total pipeline value: ${report['summary']['total_pipeline_value']:,.0f}")
    print(f"Qualification rate: {report['summary']['qualification_rate']:.1f}%")
    
    # Show top prospects
    print(f"\n🌟 Top 5 Prospects:")
    for i, prospect in enumerate(report['top_prospects'][:5], 1):
        print(f"{i}. {prospect['name']} ({prospect['industry']}) - Score: {prospect['fit_score']:.1f}, Value: ${prospect['estimated_value']:,.0f}")

if __name__ == "__main__":
    main()
