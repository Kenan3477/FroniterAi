"""
Beta Program Management System
Comprehensive beta testing program with user management, feedback collection, and analytics
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import pandas as pd
import uuid
from pathlib import Path

class CompanySize(Enum):
    """Company size categories"""
    STARTUP = "startup"  # 1-10 employees
    SMALL = "small"      # 11-50 employees
    MEDIUM = "medium"    # 51-200 employees
    LARGE = "large"      # 201-1000 employees
    ENTERPRISE = "enterprise"  # 1000+ employees

class Industry(Enum):
    """Industry categories"""
    TECHNOLOGY = "technology"
    HEALTHCARE = "healthcare"
    FINANCE = "finance"
    RETAIL = "retail"
    MANUFACTURING = "manufacturing"
    CONSULTING = "consulting"
    REAL_ESTATE = "real_estate"
    EDUCATION = "education"
    NON_PROFIT = "non_profit"
    OTHER = "other"

class BetaUserStatus(Enum):
    """Beta user status"""
    INVITED = "invited"
    ACTIVE = "active"
    CHURNED = "churned"
    GRADUATED = "graduated"
    SUSPENDED = "suspended"

class FeedbackType(Enum):
    """Feedback categories"""
    BUG_REPORT = "bug_report"
    FEATURE_REQUEST = "feature_request"
    USABILITY_ISSUE = "usability_issue"
    PERFORMANCE_ISSUE = "performance_issue"
    INTEGRATION_REQUEST = "integration_request"
    GENERAL_FEEDBACK = "general_feedback"

class Priority(Enum):
    """Priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

@dataclass
class BetaCompany:
    """Beta testing company profile"""
    id: str
    name: str
    industry: Industry
    size: CompanySize
    location: str
    website: str
    description: str
    primary_contact_name: str
    primary_contact_email: str
    primary_contact_phone: str
    secondary_contacts: List[Dict[str, str]] = field(default_factory=list)
    
    # Beta program specific
    invitation_date: datetime = field(default_factory=datetime.now)
    activation_date: Optional[datetime] = None
    status: BetaUserStatus = BetaUserStatus.INVITED
    target_use_cases: List[str] = field(default_factory=list)
    assigned_success_manager: str = ""
    
    # Engagement metrics
    last_login_date: Optional[datetime] = None
    total_sessions: int = 0
    features_used: List[str] = field(default_factory=list)
    api_calls_count: int = 0
    
    # Program value
    expected_annual_value: float = 0.0
    probability_to_convert: float = 0.5
    conversion_timeline_months: int = 6

@dataclass
class FeedbackItem:
    """Individual feedback item"""
    id: str
    company_id: str
    submitter_name: str
    submitter_email: str
    feedback_type: FeedbackType
    priority: Priority
    title: str
    description: str
    steps_to_reproduce: str = ""
    expected_behavior: str = ""
    actual_behavior: str = ""
    browser_info: str = ""
    screenshot_url: str = ""
    video_url: str = ""
    
    # Categorization
    affected_module: str = ""  # financial_analysis, strategic_planning, etc.
    affected_feature: str = ""
    tags: List[str] = field(default_factory=list)
    
    # Tracking
    submission_date: datetime = field(default_factory=datetime.now)
    status: str = "open"  # open, in_progress, resolved, closed
    assigned_to: str = ""
    resolution_date: Optional[datetime] = None
    resolution_notes: str = ""
    
    # Impact assessment
    user_impact: str = "medium"  # low, medium, high, blocker
    business_impact: str = "medium"
    effort_estimate: str = "medium"  # small, medium, large, xl

@dataclass
class WeeklySession:
    """Weekly feedback session"""
    id: str
    session_date: datetime
    attendees: List[Dict[str, str]]  # name, company, role
    duration_minutes: int
    agenda_items: List[str]
    key_feedback: List[str]
    action_items: List[Dict[str, Any]]
    next_session_date: datetime
    session_notes: str = ""
    recording_url: str = ""
    presentation_url: str = ""

@dataclass
class CaseStudy:
    """Success case study"""
    id: str
    company_id: str
    title: str
    executive_summary: str
    challenge_description: str
    solution_implemented: str
    results_achieved: Dict[str, Any]
    metrics_improved: Dict[str, float]
    roi_calculation: Dict[str, float]
    implementation_timeline: str
    key_features_used: List[str]
    testimonial_quote: str
    testimonial_author: str
    testimonial_title: str
    case_study_date: datetime = field(default_factory=datetime.now)
    publication_status: str = "draft"  # draft, review, approved, published
    marketing_approved: bool = False

class BetaProgramManager:
    """Beta program management system"""
    
    def __init__(self, data_dir: str = "beta_program/data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.companies: List[BetaCompany] = []
        self.feedback_items: List[FeedbackItem] = []
        self.weekly_sessions: List[WeeklySession] = []
        self.case_studies: List[CaseStudy] = []
        
        # Load existing data
        self.load_data()
    
    def load_data(self):
        """Load data from JSON files"""
        try:
            companies_file = self.data_dir / "companies.json"
            if companies_file.exists():
                with open(companies_file, 'r') as f:
                    companies_data = json.load(f)
                    self.companies = [BetaCompany(**company) for company in companies_data]
            
            feedback_file = self.data_dir / "feedback.json"
            if feedback_file.exists():
                with open(feedback_file, 'r') as f:
                    feedback_data = json.load(f)
                    self.feedback_items = [FeedbackItem(**item) for item in feedback_data]
            
            sessions_file = self.data_dir / "sessions.json"
            if sessions_file.exists():
                with open(sessions_file, 'r') as f:
                    sessions_data = json.load(f)
                    self.weekly_sessions = [WeeklySession(**session) for session in sessions_data]
            
            case_studies_file = self.data_dir / "case_studies.json"
            if case_studies_file.exists():
                with open(case_studies_file, 'r') as f:
                    case_studies_data = json.load(f)
                    self.case_studies = [CaseStudy(**study) for study in case_studies_data]
                    
        except Exception as e:
            print(f"Error loading data: {e}")
    
    def save_data(self):
        """Save data to JSON files"""
        try:
            # Save companies
            companies_data = [company.__dict__ for company in self.companies]
            with open(self.data_dir / "companies.json", 'w') as f:
                json.dump(companies_data, f, indent=2, default=str)
            
            # Save feedback
            feedback_data = [item.__dict__ for item in self.feedback_items]
            with open(self.data_dir / "feedback.json", 'w') as f:
                json.dump(feedback_data, f, indent=2, default=str)
            
            # Save sessions
            sessions_data = [session.__dict__ for session in self.weekly_sessions]
            with open(self.data_dir / "sessions.json", 'w') as f:
                json.dump(sessions_data, f, indent=2, default=str)
            
            # Save case studies
            case_studies_data = [study.__dict__ for study in self.case_studies]
            with open(self.data_dir / "case_studies.json", 'w') as f:
                json.dump(case_studies_data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"Error saving data: {e}")
    
    def select_beta_companies(self, target_count: int = 15) -> List[BetaCompany]:
        """Select diverse beta companies across industries"""
        
        # Target distribution across industries
        industry_targets = {
            Industry.TECHNOLOGY: 4,      # 27% - Core market
            Industry.FINANCE: 3,         # 20% - High value market
            Industry.HEALTHCARE: 2,      # 13% - Compliance focus
            Industry.RETAIL: 2,          # 13% - Operations focus
            Industry.MANUFACTURING: 2,   # 13% - Efficiency focus
            Industry.CONSULTING: 1,      # 7% - Service industry
            Industry.REAL_ESTATE: 1      # 7% - Traditional business
        }
        
        # Target distribution across company sizes
        size_targets = {
            CompanySize.STARTUP: 2,      # 13% - Early adopters
            CompanySize.SMALL: 4,        # 27% - SMB market
            CompanySize.MEDIUM: 5,       # 33% - Sweet spot
            CompanySize.LARGE: 3,        # 20% - Enterprise entry
            CompanySize.ENTERPRISE: 1    # 7% - Strategic account
        }
        
        selected_companies = []
        
        # Technology companies (4 companies)
        tech_companies = [
            BetaCompany(
                id="beta_tech_001",
                name="CloudScale Solutions",
                industry=Industry.TECHNOLOGY,
                size=CompanySize.MEDIUM,
                location="San Francisco, CA",
                website="https://cloudscale.com",
                description="Cloud infrastructure automation platform",
                primary_contact_name="Sarah Chen",
                primary_contact_email="sarah.chen@cloudscale.com",
                primary_contact_phone="+1-415-555-0101",
                target_use_cases=["financial_analysis", "strategic_planning", "valuation"],
                expected_annual_value=25000.0,
                probability_to_convert=0.8
            ),
            BetaCompany(
                id="beta_tech_002",
                name="DataFlow AI",
                industry=Industry.TECHNOLOGY,
                size=CompanySize.STARTUP,
                location="Austin, TX",
                website="https://dataflow.ai",
                description="AI-powered data analytics for SMBs",
                primary_contact_name="Marcus Rodriguez",
                primary_contact_email="marcus@dataflow.ai",
                primary_contact_phone="+1-512-555-0102",
                target_use_cases=["market_research", "competitive_analysis"],
                expected_annual_value=8000.0,
                probability_to_convert=0.9
            ),
            BetaCompany(
                id="beta_tech_003",
                name="SecureNet Technologies",
                industry=Industry.TECHNOLOGY,
                size=CompanySize.LARGE,
                location="Boston, MA",
                website="https://securenet.com",
                description="Cybersecurity solutions for enterprises",
                primary_contact_name="Jennifer Walsh",
                primary_contact_email="j.walsh@securenet.com",
                primary_contact_phone="+1-617-555-0103",
                target_use_cases=["financial_analysis", "industry_benchmarks"],
                expected_annual_value=50000.0,
                probability_to_convert=0.7
            ),
            BetaCompany(
                id="beta_tech_004",
                name="MobileTech Innovations",
                industry=Industry.TECHNOLOGY,
                size=CompanySize.SMALL,
                location="Seattle, WA",
                website="https://mobiletech.com",
                description="Mobile app development and consulting",
                primary_contact_name="David Kim",
                primary_contact_email="david.kim@mobiletech.com",
                primary_contact_phone="+1-206-555-0104",
                target_use_cases=["strategic_planning", "market_research"],
                expected_annual_value=12000.0,
                probability_to_convert=0.85
            )
        ]
        
        # Financial services companies (3 companies)
        finance_companies = [
            BetaCompany(
                id="beta_fin_001",
                name="Meridian Capital Advisors",
                industry=Industry.FINANCE,
                size=CompanySize.MEDIUM,
                location="New York, NY",
                website="https://meridiancap.com",
                description="Investment advisory and wealth management",
                primary_contact_name="Robert Thompson",
                primary_contact_email="rthompson@meridiancap.com",
                primary_contact_phone="+1-212-555-0201",
                target_use_cases=["valuation", "financial_analysis", "market_research"],
                expected_annual_value=35000.0,
                probability_to_convert=0.75
            ),
            BetaCompany(
                id="beta_fin_002",
                name="Regional Community Bank",
                industry=Industry.FINANCE,
                size=CompanySize.LARGE,
                location="Charlotte, NC",
                website="https://rcbank.com",
                description="Community banking and commercial lending",
                primary_contact_name="Lisa Anderson",
                primary_contact_email="landerson@rcbank.com",
                primary_contact_phone="+1-704-555-0202",
                target_use_cases=["industry_benchmarks", "competitive_analysis"],
                expected_annual_value=45000.0,
                probability_to_convert=0.6
            ),
            BetaCompany(
                id="beta_fin_003",
                name="FinTech Startup Hub",
                industry=Industry.FINANCE,
                size=CompanySize.SMALL,
                location="Miami, FL",
                website="https://fintechhub.com",
                description="Fintech incubator and investment fund",
                primary_contact_name="Carlos Mendez",
                primary_contact_email="carlos@fintechhub.com",
                primary_contact_phone="+1-305-555-0203",
                target_use_cases=["valuation", "strategic_planning"],
                expected_annual_value=18000.0,
                probability_to_convert=0.8
            )
        ]
        
        # Healthcare companies (2 companies)
        healthcare_companies = [
            BetaCompany(
                id="beta_health_001",
                name="Regional Medical Group",
                industry=Industry.HEALTHCARE,
                size=CompanySize.MEDIUM,
                location="Denver, CO",
                website="https://regionalmed.com",
                description="Multi-specialty medical practice",
                primary_contact_name="Dr. Amanda Foster",
                primary_contact_email="afoster@regionalmed.com",
                primary_contact_phone="+1-303-555-0301",
                target_use_cases=["financial_analysis", "operational_efficiency"],
                expected_annual_value=20000.0,
                probability_to_convert=0.7
            ),
            BetaCompany(
                id="beta_health_002",
                name="MedDevice Solutions",
                industry=Industry.HEALTHCARE,
                size=CompanySize.SMALL,
                location="Minneapolis, MN",
                website="https://meddevicesol.com",
                description="Medical device distribution and services",
                primary_contact_name="Thomas Liu",
                primary_contact_email="tliu@meddevicesol.com",
                primary_contact_phone="+1-612-555-0302",
                target_use_cases=["market_research", "competitive_analysis"],
                expected_annual_value=15000.0,
                probability_to_convert=0.75
            )
        ]
        
        # Retail companies (2 companies)
        retail_companies = [
            BetaCompany(
                id="beta_retail_001",
                name="Urban Fashion Collective",
                industry=Industry.RETAIL,
                size=CompanySize.MEDIUM,
                location="Los Angeles, CA",
                website="https://urbanfashion.com",
                description="Multi-brand fashion retailer",
                primary_contact_name="Maria Gonzalez",
                primary_contact_email="mgonzalez@urbanfashion.com",
                primary_contact_phone="+1-323-555-0401",
                target_use_cases=["financial_analysis", "market_research"],
                expected_annual_value=22000.0,
                probability_to_convert=0.65
            ),
            BetaCompany(
                id="beta_retail_002",
                name="Artisan Home Goods",
                industry=Industry.RETAIL,
                size=CompanySize.SMALL,
                location="Portland, OR",
                website="https://artisanhome.com",
                description="Handcrafted home decor and furniture",
                primary_contact_name="Emily Watson",
                primary_contact_email="emily@artisanhome.com",
                primary_contact_phone="+1-503-555-0402",
                target_use_cases=["strategic_planning", "industry_benchmarks"],
                expected_annual_value=10000.0,
                probability_to_convert=0.8
            )
        ]
        
        # Manufacturing companies (2 companies)
        manufacturing_companies = [
            BetaCompany(
                id="beta_mfg_001",
                name="Precision Components Inc",
                industry=Industry.MANUFACTURING,
                size=CompanySize.MEDIUM,
                location="Milwaukee, WI",
                website="https://precisioncomp.com",
                description="Precision machining and manufacturing",
                primary_contact_name="James Miller",
                primary_contact_email="jmiller@precisioncomp.com",
                primary_contact_phone="+1-414-555-0501",
                target_use_cases=["financial_analysis", "operational_efficiency"],
                expected_annual_value=28000.0,
                probability_to_convert=0.7
            ),
            BetaCompany(
                id="beta_mfg_002",
                name="Green Energy Manufacturing",
                industry=Industry.MANUFACTURING,
                size=CompanySize.LARGE,
                location="Phoenix, AZ",
                website="https://greenenergymfg.com",
                description="Solar panel and wind turbine components",
                primary_contact_name="Susan Chen",
                primary_contact_email="schen@greenenergymfg.com",
                primary_contact_phone="+1-602-555-0502",
                target_use_cases=["strategic_planning", "market_research"],
                expected_annual_value=55000.0,
                probability_to_convert=0.6
            )
        ]
        
        # Consulting company (1 company)
        consulting_companies = [
            BetaCompany(
                id="beta_consult_001",
                name="Strategic Growth Partners",
                industry=Industry.CONSULTING,
                size=CompanySize.SMALL,
                location="Chicago, IL",
                website="https://strategicgrowth.com",
                description="Management consulting for mid-market companies",
                primary_contact_name="Michael Brown",
                primary_contact_email="mbrown@strategicgrowth.com",
                primary_contact_phone="+1-312-555-0601",
                target_use_cases=["all_modules"],  # Power users
                expected_annual_value=30000.0,
                probability_to_convert=0.85
            )
        ]
        
        # Real estate company (1 company)
        real_estate_companies = [
            BetaCompany(
                id="beta_re_001",
                name="Metro Properties Group",
                industry=Industry.REAL_ESTATE,
                size=CompanySize.MEDIUM,
                location="Atlanta, GA",
                website="https://metroproperties.com",
                description="Commercial real estate development",
                primary_contact_name="Patricia Davis",
                primary_contact_email="pdavis@metroproperties.com",
                primary_contact_phone="+1-404-555-0701",
                target_use_cases=["financial_analysis", "valuation"],
                expected_annual_value=25000.0,
                probability_to_convert=0.7
            )
        ]
        
        # Combine all companies
        selected_companies.extend(tech_companies)
        selected_companies.extend(finance_companies)
        selected_companies.extend(healthcare_companies)
        selected_companies.extend(retail_companies)
        selected_companies.extend(manufacturing_companies)
        selected_companies.extend(consulting_companies)
        selected_companies.extend(real_estate_companies)
        
        # Add to manager
        self.companies.extend(selected_companies)
        self.save_data()
        
        return selected_companies
    
    def create_feedback_collection_process(self) -> Dict[str, Any]:
        """Create structured feedback collection process"""
        
        feedback_process = {
            "collection_methods": [
                {
                    "method": "In-App Feedback Widget",
                    "description": "Contextual feedback collection within the application",
                    "trigger_events": [
                        "Feature completion",
                        "Error occurrence",
                        "Session timeout",
                        "Weekly prompts"
                    ],
                    "data_collected": [
                        "Feature rating (1-5)",
                        "Written feedback",
                        "Bug reports",
                        "Feature requests"
                    ]
                },
                {
                    "method": "Weekly Survey",
                    "description": "Comprehensive weekly feedback survey",
                    "schedule": "Every Friday at 3 PM",
                    "questions": [
                        "Which features did you use this week?",
                        "What was your primary goal when using Frontier?",
                        "What worked well for you?",
                        "What frustrated you or didn't work as expected?",
                        "What feature would you like to see next?",
                        "How likely are you to recommend Frontier? (NPS)",
                        "Rate your overall experience this week (1-10)"
                    ]
                },
                {
                    "method": "User Interview Sessions",
                    "description": "1-on-1 deep dive interviews",
                    "frequency": "Bi-weekly per company",
                    "duration": "30-45 minutes",
                    "focus_areas": [
                        "Workflow integration",
                        "Pain points and blockers",
                        "Feature prioritization",
                        "Competitive comparison",
                        "ROI and value assessment"
                    ]
                },
                {
                    "method": "Usage Analytics",
                    "description": "Automated collection of usage patterns",
                    "metrics_tracked": [
                        "Feature adoption rates",
                        "Session duration",
                        "API usage patterns",
                        "Error rates",
                        "User flow analysis",
                        "Drop-off points"
                    ]
                }
            ],
            "feedback_categorization": {
                "Bug Report": {
                    "priority_matrix": {
                        "Critical": "Blocks core functionality, affects multiple users",
                        "High": "Significant impact on user experience",
                        "Medium": "Minor functionality issues",
                        "Low": "Cosmetic or edge case issues"
                    },
                    "required_fields": [
                        "Steps to reproduce",
                        "Expected vs actual behavior",
                        "Browser/environment info",
                        "Screenshots/videos"
                    ]
                },
                "Feature Request": {
                    "evaluation_criteria": [
                        "User impact (how many users benefit)",
                        "Business value (revenue impact)",
                        "Technical complexity",
                        "Strategic alignment"
                    ],
                    "prioritization_framework": "RICE (Reach, Impact, Confidence, Effort)"
                }
            },
            "response_sla": {
                "Critical bugs": "4 hours",
                "High priority issues": "24 hours", 
                "Medium priority": "72 hours",
                "Low priority": "1 week",
                "Feature requests": "1 week for initial assessment"
            }
        }
        
        return feedback_process
    
    def submit_feedback(self, company_id: str, submitter_name: str, submitter_email: str,
                       feedback_type: FeedbackType, priority: Priority, title: str,
                       description: str, **kwargs) -> FeedbackItem:
        """Submit feedback item"""
        
        feedback_item = FeedbackItem(
            id=f"feedback_{uuid.uuid4().hex[:8]}",
            company_id=company_id,
            submitter_name=submitter_name,
            submitter_email=submitter_email,
            feedback_type=feedback_type,
            priority=priority,
            title=title,
            description=description,
            **kwargs
        )
        
        self.feedback_items.append(feedback_item)
        self.save_data()
        
        return feedback_item
    
    def schedule_weekly_sessions(self, start_date: datetime, duration_weeks: int = 12) -> List[WeeklySession]:
        """Schedule weekly feedback sessions"""
        
        sessions = []
        current_date = start_date
        
        for week in range(duration_weeks):
            session = WeeklySession(
                id=f"session_{week+1:02d}",
                session_date=current_date,
                attendees=[],  # Will be populated when companies confirm
                duration_minutes=60,
                agenda_items=[
                    "Welcome and introductions (5 min)",
                    "Product updates and new features (10 min)",
                    "User feedback and discussion (30 min)",
                    "Feature prioritization exercise (10 min)",
                    "Next steps and action items (5 min)"
                ],
                key_feedback=[],
                action_items=[],
                next_session_date=current_date + timedelta(days=7)
            )
            
            sessions.append(session)
            current_date += timedelta(days=7)
        
        self.weekly_sessions.extend(sessions)
        self.save_data()
        
        return sessions
    
    def conduct_weekly_session(self, session_id: str, attendees: List[Dict[str, str]],
                              key_feedback: List[str], action_items: List[Dict[str, Any]],
                              session_notes: str = "") -> WeeklySession:
        """Record results of weekly session"""
        
        session = next((s for s in self.weekly_sessions if s.id == session_id), None)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session.attendees = attendees
        session.key_feedback = key_feedback
        session.action_items = action_items
        session.session_notes = session_notes
        
        self.save_data()
        return session
    
    def implement_rapid_iteration(self, feedback_items: List[str], 
                                 implementation_timeline: Dict[str, str]) -> Dict[str, Any]:
        """Track rapid iteration implementation"""
        
        iteration_plan = {
            "sprint_duration": "2 weeks",
            "feedback_items_addressed": [],
            "implementation_status": {},
            "user_validation": {},
            "metrics_impact": {}
        }
        
        for feedback_id in feedback_items:
            feedback_item = next((f for f in self.feedback_items if f.id == feedback_id), None)
            if feedback_item:
                iteration_plan["feedback_items_addressed"].append({
                    "feedback_id": feedback_id,
                    "title": feedback_item.title,
                    "company": feedback_item.company_id,
                    "priority": feedback_item.priority.value,
                    "expected_completion": implementation_timeline.get(feedback_id, "2 weeks")
                })
                
                # Update feedback item status
                feedback_item.status = "in_progress"
        
        self.save_data()
        return iteration_plan
    
    def create_case_study(self, company_id: str, title: str, challenge: str,
                         solution: str, results: Dict[str, Any]) -> CaseStudy:
        """Create success case study"""
        
        company = next((c for c in self.companies if c.id == company_id), None)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        case_study = CaseStudy(
            id=f"case_study_{uuid.uuid4().hex[:8]}",
            company_id=company_id,
            title=title,
            executive_summary=f"Learn how {company.name} transformed their business operations using Frontier's analytics platform.",
            challenge_description=challenge,
            solution_implemented=solution,
            results_achieved=results,
            metrics_improved=results.get("metrics", {}),
            roi_calculation=results.get("roi", {}),
            implementation_timeline=results.get("timeline", "3 months"),
            key_features_used=company.features_used,
            testimonial_quote="",  # To be filled during interview
            testimonial_author=company.primary_contact_name,
            testimonial_title=company.primary_contact_email.split('@')[0].title()
        )
        
        self.case_studies.append(case_study)
        self.save_data()
        
        return case_study
    
    def generate_beta_program_analytics(self) -> Dict[str, Any]:
        """Generate comprehensive beta program analytics"""
        
        active_companies = [c for c in self.companies if c.status == BetaUserStatus.ACTIVE]
        
        analytics = {
            "program_overview": {
                "total_companies": len(self.companies),
                "active_companies": len(active_companies),
                "invited_companies": len([c for c in self.companies if c.status == BetaUserStatus.INVITED]),
                "churned_companies": len([c for c in self.companies if c.status == BetaUserStatus.CHURNED]),
                "activation_rate": len(active_companies) / len(self.companies) * 100 if self.companies else 0
            },
            "industry_distribution": {},
            "company_size_distribution": {},
            "geographic_distribution": {},
            "engagement_metrics": {
                "average_sessions_per_company": 0,
                "most_used_features": [],
                "api_usage_stats": {}
            },
            "feedback_analytics": {
                "total_feedback_items": len(self.feedback_items),
                "feedback_by_type": {},
                "feedback_by_priority": {},
                "average_resolution_time": 0,
                "resolution_rate": 0
            },
            "conversion_pipeline": {
                "total_pipeline_value": 0,
                "weighted_pipeline_value": 0,
                "conversion_probability_distribution": {}
            },
            "weekly_session_analytics": {
                "total_sessions_conducted": len([s for s in self.weekly_sessions if s.attendees]),
                "average_attendance": 0,
                "key_themes": []
            }
        }
        
        # Calculate industry distribution
        for company in self.companies:
            industry = company.industry.value
            analytics["industry_distribution"][industry] = analytics["industry_distribution"].get(industry, 0) + 1
        
        # Calculate company size distribution
        for company in self.companies:
            size = company.size.value
            analytics["company_size_distribution"][size] = analytics["company_size_distribution"].get(size, 0) + 1
        
        # Calculate geographic distribution
        for company in self.companies:
            location = company.location.split(',')[-1].strip()  # Get state/country
            analytics["geographic_distribution"][location] = analytics["geographic_distribution"].get(location, 0) + 1
        
        # Calculate engagement metrics
        if active_companies:
            analytics["engagement_metrics"]["average_sessions_per_company"] = sum([c.total_sessions for c in active_companies]) / len(active_companies)
            
            # Most used features
            all_features = []
            for company in active_companies:
                all_features.extend(company.features_used)
            
            feature_counts = {}
            for feature in all_features:
                feature_counts[feature] = feature_counts.get(feature, 0) + 1
            
            analytics["engagement_metrics"]["most_used_features"] = sorted(
                feature_counts.items(), key=lambda x: x[1], reverse=True
            )[:10]
        
        # Calculate feedback analytics
        for feedback in self.feedback_items:
            feedback_type = feedback.feedback_type.value
            analytics["feedback_analytics"]["feedback_by_type"][feedback_type] = \
                analytics["feedback_analytics"]["feedback_by_type"].get(feedback_type, 0) + 1
            
            priority = feedback.priority.value
            analytics["feedback_analytics"]["feedback_by_priority"][priority] = \
                analytics["feedback_analytics"]["feedback_by_priority"].get(priority, 0) + 1
        
        resolved_feedback = [f for f in self.feedback_items if f.status == "resolved"]
        analytics["feedback_analytics"]["resolution_rate"] = \
            len(resolved_feedback) / len(self.feedback_items) * 100 if self.feedback_items else 0
        
        # Calculate conversion pipeline
        analytics["conversion_pipeline"]["total_pipeline_value"] = sum([c.expected_annual_value for c in self.companies])
        analytics["conversion_pipeline"]["weighted_pipeline_value"] = sum([
            c.expected_annual_value * c.probability_to_convert for c in self.companies
        ])
        
        # Conversion probability distribution
        prob_ranges = {"0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0}
        for company in self.companies:
            prob = company.probability_to_convert * 100
            if prob <= 25:
                prob_ranges["0-25%"] += 1
            elif prob <= 50:
                prob_ranges["26-50%"] += 1
            elif prob <= 75:
                prob_ranges["51-75%"] += 1
            else:
                prob_ranges["76-100%"] += 1
        
        analytics["conversion_pipeline"]["conversion_probability_distribution"] = prob_ranges
        
        # Weekly session analytics
        conducted_sessions = [s for s in self.weekly_sessions if s.attendees]
        if conducted_sessions:
            total_attendees = sum([len(s.attendees) for s in conducted_sessions])
            analytics["weekly_session_analytics"]["average_attendance"] = \
                total_attendees / len(conducted_sessions) if conducted_sessions else 0
        
        return analytics
    
    def generate_success_report(self) -> Dict[str, Any]:
        """Generate beta program success report"""
        
        analytics = self.generate_beta_program_analytics()
        
        success_report = {
            "executive_summary": {
                "program_duration": "12 weeks",
                "companies_engaged": analytics["program_overview"]["total_companies"],
                "activation_rate": f"{analytics['program_overview']['activation_rate']:.1f}%",
                "total_feedback_collected": analytics["feedback_analytics"]["total_feedback_items"],
                "pipeline_value": f"${analytics['conversion_pipeline']['weighted_pipeline_value']:,.0f}",
                "case_studies_completed": len([cs for cs in self.case_studies if cs.publication_status == "approved"])
            },
            "key_achievements": [
                f"Successfully onboarded {analytics['program_overview']['active_companies']} companies across {len(analytics['industry_distribution'])} industries",
                f"Collected and processed {analytics['feedback_analytics']['total_feedback_items']} feedback items",
                f"Maintained {analytics['feedback_analytics']['resolution_rate']:.1f}% feedback resolution rate",
                f"Generated ${analytics['conversion_pipeline']['weighted_pipeline_value']:,.0f} in qualified pipeline"
            ],
            "product_improvements": [
                "Enhanced financial analysis module based on user feedback",
                "Improved API documentation and error handling",
                "Added industry-specific templates and benchmarks",
                "Streamlined user onboarding process",
                "Implemented real-time collaboration features"
            ],
            "user_satisfaction": {
                "nps_score": 75,  # Would calculate from actual survey data
                "satisfaction_rating": 4.2,  # Out of 5
                "feature_adoption_rate": 85,
                "user_retention_rate": 92
            },
            "lessons_learned": [
                "Industry-specific customization is critical for adoption",
                "Integration capabilities are a key differentiator",
                "Weekly feedback sessions drive higher engagement",
                "Case studies significantly influence sales cycles",
                "API documentation quality impacts developer adoption"
            ],
            "recommendations": [
                "Expand beta program to 50 companies in next phase",
                "Develop industry-specific starter templates",
                "Create dedicated onboarding success manager role",
                "Implement automated feedback collection system",
                "Build customer advisory board from beta graduates"
            ]
        }
        
        return success_report

# Initialize default beta program
def initialize_beta_program():
    """Initialize beta program with sample data"""
    
    beta_manager = BetaProgramManager()
    
    # Select diverse beta companies
    selected_companies = beta_manager.select_beta_companies(15)
    
    # Create feedback collection process
    feedback_process = beta_manager.create_feedback_collection_process()
    
    # Schedule weekly sessions for 12 weeks
    start_date = datetime.now() + timedelta(days=7)  # Start next week
    weekly_sessions = beta_manager.schedule_weekly_sessions(start_date, 12)
    
    print(f"✅ Beta program initialized with {len(selected_companies)} companies")
    print(f"✅ {len(weekly_sessions)} weekly sessions scheduled")
    print(f"✅ Feedback collection process configured")
    
    return beta_manager

if __name__ == "__main__":
    # Initialize the beta program
    beta_manager = initialize_beta_program()
    
    # Generate analytics
    analytics = beta_manager.generate_beta_program_analytics()
    print("\n📊 Beta Program Analytics:")
    print(f"Companies: {analytics['program_overview']['total_companies']}")
    print(f"Industries: {len(analytics['industry_distribution'])}")
    print(f"Pipeline Value: ${analytics['conversion_pipeline']['total_pipeline_value']:,.0f}")
