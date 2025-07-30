"""
Beta Program Case Study Documentation System
Creation and management of success case studies from beta users
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import uuid
from pathlib import Path
from enum import Enum

from beta_manager import BetaProgramManager, CaseStudy

class CaseStudyTemplate(Enum):
    """Case study template types"""
    COST_SAVINGS = "cost_savings"
    TIME_EFFICIENCY = "time_efficiency"
    REVENUE_GROWTH = "revenue_growth"
    DECISION_MAKING = "decision_making"
    PROCESS_IMPROVEMENT = "process_improvement"
    COMPETITIVE_ADVANTAGE = "competitive_advantage"

@dataclass
class ROIMetrics:
    """ROI calculation metrics"""
    initial_investment: float = 0.0
    annual_cost_savings: float = 0.0
    annual_revenue_increase: float = 0.0
    time_savings_hours_per_month: float = 0.0
    hourly_rate: float = 75.0
    
    # Calculated fields
    monthly_time_savings_value: float = 0.0
    annual_time_savings_value: float = 0.0
    total_annual_benefit: float = 0.0
    roi_percentage: float = 0.0
    payback_period_months: float = 0.0
    
    def calculate_roi(self):
        """Calculate all ROI metrics"""
        self.monthly_time_savings_value = self.time_savings_hours_per_month * self.hourly_rate
        self.annual_time_savings_value = self.monthly_time_savings_value * 12
        self.total_annual_benefit = self.annual_cost_savings + self.annual_revenue_increase + self.annual_time_savings_value
        
        if self.initial_investment > 0:
            self.roi_percentage = ((self.total_annual_benefit - self.initial_investment) / self.initial_investment) * 100
            self.payback_period_months = self.initial_investment / (self.total_annual_benefit / 12) if self.total_annual_benefit > 0 else 0
        else:
            self.roi_percentage = 0
            self.payback_period_months = 0

@dataclass
class CaseStudyInterview:
    """Case study interview session"""
    id: str
    case_study_id: str
    interview_date: datetime
    interviewer_name: str
    interviewee_name: str
    interviewee_title: str
    duration_minutes: int
    
    # Interview content
    questions_asked: List[str] = field(default_factory=list)
    key_quotes: List[str] = field(default_factory=list)
    challenges_discussed: List[str] = field(default_factory=list)
    benefits_discussed: List[str] = field(default_factory=list)
    metrics_shared: Dict[str, Any] = field(default_factory=dict)
    
    # Follow-up
    recording_url: str = ""
    transcript_url: str = ""
    follow_up_needed: bool = False
    follow_up_notes: str = ""

class CaseStudyManager:
    """Manager for creating and managing case studies"""
    
    def __init__(self, data_dir: str = "beta_program/data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.beta_manager = BetaProgramManager()
        self.case_study_interviews: List[CaseStudyInterview] = []
        
        # Load existing data
        self.load_case_study_data()
    
    def load_case_study_data(self):
        """Load case study data from files"""
        try:
            interviews_file = self.data_dir / "case_study_interviews.json"
            if interviews_file.exists():
                with open(interviews_file, 'r') as f:
                    interviews_data = json.load(f)
                    self.case_study_interviews = [CaseStudyInterview(**interview) for interview in interviews_data]
                    
        except Exception as e:
            print(f"Error loading case study data: {e}")
    
    def save_case_study_data(self):
        """Save case study data to files"""
        try:
            interviews_data = [interview.__dict__ for interview in self.case_study_interviews]
            with open(self.data_dir / "case_study_interviews.json", 'w') as f:
                json.dump(interviews_data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"Error saving case study data: {e}")
    
    def identify_case_study_candidates(self) -> List[Dict[str, Any]]:
        """Identify beta companies that are good candidates for case studies"""
        
        candidates = []
        
        for company in self.beta_manager.companies:
            if (hasattr(company.status, 'value') and company.status.value != 'active') or \
               (isinstance(company.status, str) and company.status != 'active'):
                continue
            
            # Calculate engagement score
            engagement_score = 0
            
            # High usage
            if company.total_sessions > 15:
                engagement_score += 30
            elif company.total_sessions > 10:
                engagement_score += 20
            elif company.total_sessions > 5:
                engagement_score += 10
            
            # Multiple features used
            if len(company.features_used) >= 4:
                engagement_score += 25
            elif len(company.features_used) >= 3:
                engagement_score += 20
            elif len(company.features_used) >= 2:
                engagement_score += 15
            
            # High conversion probability
            if company.probability_to_convert >= 0.8:
                engagement_score += 20
            elif company.probability_to_convert >= 0.6:
                engagement_score += 15
            elif company.probability_to_convert >= 0.4:
                engagement_score += 10
            
            # High value prospect
            if company.expected_annual_value >= 40000:
                engagement_score += 15
            elif company.expected_annual_value >= 25000:
                engagement_score += 10
            elif company.expected_annual_value >= 15000:
                engagement_score += 5
            
            # Recent activity
            if company.last_login_date and (datetime.now() - company.last_login_date).days <= 7:
                engagement_score += 10
            
            # Positive feedback
            company_feedback = [f for f in self.beta_manager.feedback_items if f.company_id == company.id]
            positive_feedback = len([f for f in company_feedback if "great" in f.description.lower() or "love" in f.description.lower() or "excellent" in f.description.lower()])
            total_feedback = len(company_feedback)
            
            if total_feedback > 0 and positive_feedback / total_feedback >= 0.5:
                engagement_score += 15
            
            # Only consider companies with engagement score >= 50
            if engagement_score >= 50:
                candidates.append({
                    "company_id": company.id,
                    "company_name": company.name,
                    "industry": company.industry.value if hasattr(company.industry, 'value') else company.industry,
                    "size": company.size.value if hasattr(company.size, 'value') else company.size,
                    "engagement_score": engagement_score,
                    "total_sessions": company.total_sessions,
                    "features_used": len(company.features_used),
                    "conversion_probability": company.probability_to_convert,
                    "expected_value": company.expected_annual_value,
                    "contact_name": company.primary_contact_name,
                    "contact_email": company.primary_contact_email,
                    "potential_roi_story": self._estimate_potential_roi_story(company),
                    "recommended_template": self._recommend_case_study_template(company)
                })
        
        # Sort by engagement score
        candidates.sort(key=lambda x: x["engagement_score"], reverse=True)
        
        return candidates
    
    def _estimate_potential_roi_story(self, company) -> Dict[str, str]:
        """Estimate potential ROI story for case study"""
        
        # Base estimates by company size
        size_estimates = {
            "startup": {
                "time_savings_hours": 20,
                "cost_savings": 5000,
                "efficiency_gain": "40%"
            },
            "small": {
                "time_savings_hours": 40,
                "cost_savings": 15000,
                "efficiency_gain": "35%"
            },
            "medium": {
                "time_savings_hours": 80,
                "cost_savings": 35000,
                "efficiency_gain": "30%"
            },
            "large": {
                "time_savings_hours": 160,
                "cost_savings": 75000,
                "efficiency_gain": "25%"
            },
            "enterprise": {
                "time_savings_hours": 320,
                "cost_savings": 150000,
                "efficiency_gain": "20%"
            }
        }
        
        estimates = size_estimates.get(company.size.value, size_estimates["medium"])
        
        # Industry-specific adjustments
        industry_multipliers = {
            "finance": 1.3,
            "consulting": 1.2,
            "technology": 1.1,
            "healthcare": 1.0,
            "manufacturing": 0.9,
            "retail": 0.8
        }
        
        industry_value = company.industry.value if hasattr(company.industry, 'value') else company.industry
        multiplier = industry_multipliers.get(industry_value, 1.0)
        
        return {
            "estimated_monthly_time_savings": f"{int(estimates['time_savings_hours'] * multiplier)} hours",
            "estimated_annual_cost_savings": f"${int(estimates['cost_savings'] * multiplier):,}",
            "estimated_efficiency_gain": estimates["efficiency_gain"],
            "estimated_roi": f"{int(200 * multiplier)}%"
        }
    
    def _recommend_case_study_template(self, company) -> CaseStudyTemplate:
        """Recommend case study template based on company profile"""
        
        # Consulting companies often have good time efficiency stories
        industry_value = company.industry.value if hasattr(company.industry, 'value') else company.industry
        if industry_value == "consulting":
            return CaseStudyTemplate.TIME_EFFICIENCY
        
        # Financial companies often have cost savings stories
        elif industry_value == "finance":
            return CaseStudyTemplate.COST_SAVINGS
        
        # Technology companies often have process improvement stories
        elif industry_value == "technology":
            return CaseStudyTemplate.PROCESS_IMPROVEMENT
        
        # Manufacturing companies often have efficiency stories
        elif industry_value == "manufacturing":
            return CaseStudyTemplate.TIME_EFFICIENCY
        
        # Healthcare companies often have decision-making stories
        elif industry_value == "healthcare":
            return CaseStudyTemplate.DECISION_MAKING
        
        # Default to cost savings
        else:
            return CaseStudyTemplate.COST_SAVINGS
    
    def create_case_study_outline(self, company_id: str, template: CaseStudyTemplate) -> Dict[str, Any]:
        """Create case study outline based on template"""
        
        company = next((c for c in self.beta_manager.companies if c.id == company_id), None)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        outlines = {
            CaseStudyTemplate.COST_SAVINGS: {
                "title": f"How {company.name} Reduced Costs by X% with Frontier Analytics",
                "executive_summary": f"Learn how {company.name}, a {company.industry.value} company, leveraged Frontier's analytics platform to achieve significant cost savings and operational efficiency improvements.",
                "sections": [
                    {
                        "title": "Company Background",
                        "content_outline": [
                            f"Introduction to {company.name}",
                            f"Industry: {company.industry.value if hasattr(company.industry, 'value') else company.industry}",
                            f"Company size: {company.size.value if hasattr(company.size, 'value') else company.size}",
                            "Business model and objectives",
                            "Previous analytics approach"
                        ]
                    },
                    {
                        "title": "Challenge",
                        "content_outline": [
                            "Manual processes causing high costs",
                            "Time-intensive analysis workflows",
                            "Lack of real-time insights",
                            "Decision-making delays",
                            "Resource allocation inefficiencies"
                        ]
                    },
                    {
                        "title": "Solution",
                        "content_outline": [
                            "Frontier platform implementation",
                            "Key features utilized",
                            "Integration with existing systems",
                            "Training and adoption process",
                            "Timeline of implementation"
                        ]
                    },
                    {
                        "title": "Results",
                        "content_outline": [
                            "Quantified cost savings",
                            "Time savings achieved", 
                            "Process improvements",
                            "ROI calculation",
                            "Efficiency metrics"
                        ]
                    },
                    {
                        "title": "Implementation Details",
                        "content_outline": [
                            "Technical setup process",
                            "User training approach",
                            "Change management strategy",
                            "Challenges overcome",
                            "Timeline and milestones"
                        ]
                    },
                    {
                        "title": "Long-term Impact",
                        "content_outline": [
                            "Sustained cost savings",
                            "Improved decision-making quality",
                            "Enhanced competitive position",
                            "Future expansion plans",
                            "Organizational transformation"
                        ]
                    }
                ],
                "key_metrics_to_collect": [
                    "Total cost savings ($ and %)",
                    "Time savings (hours per week/month)",
                    "Process efficiency improvements",
                    "ROI calculation",
                    "Payback period",
                    "Error reduction percentage",
                    "Decision-making speed improvement"
                ]
            },
            
            CaseStudyTemplate.TIME_EFFICIENCY: {
                "title": f"How {company.name} Saved X Hours Per Week with Frontier Analytics",
                "executive_summary": f"Discover how {company.name} transformed their analytical workflows and achieved dramatic time savings using Frontier's automated analytics platform.",
                "sections": [
                    {
                        "title": "Company Profile",
                        "content_outline": [
                            f"{company.name} overview",
                            "Team structure and roles",
                            "Previous workflow challenges",
                            "Time allocation before Frontier",
                            "Pain points with manual analysis"
                        ]
                    },
                    {
                        "title": "Time-Consuming Challenges",
                        "content_outline": [
                            "Manual data compilation",
                            "Spreadsheet-based analysis",
                            "Report generation process",
                            "Quality assurance time",
                            "Meeting preparation overhead"
                        ]
                    },
                    {
                        "title": "Frontier Implementation",
                        "content_outline": [
                            "Automated workflow setup",
                            "Template customization",
                            "Integration configuration",
                            "Team training process",
                            "Adoption timeline"
                        ]
                    },
                    {
                        "title": "Time Savings Achieved",
                        "content_outline": [
                            "Weekly time savings breakdown",
                            "Process automation benefits",
                            "Improved workflow efficiency",
                            "Quality improvements",
                            "Capacity for strategic work"
                        ]
                    },
                    {
                        "title": "Productivity Transformation",
                        "content_outline": [
                            "Before vs. after workflows",
                            "Team capacity optimization",
                            "Strategic focus shift",
                            "Client service improvements",
                            "Competitive advantages gained"
                        ]
                    }
                ],
                "key_metrics_to_collect": [
                    "Hours saved per week/month",
                    "Process completion time reduction",
                    "Report generation time savings",
                    "Meeting preparation time reduction",
                    "Analysis accuracy improvements",
                    "Team productivity increase",
                    "Strategic work time increase"
                ]
            },
            
            CaseStudyTemplate.REVENUE_GROWTH: {
                "title": f"How {company.name} Increased Revenue by X% Using Frontier Insights",
                "executive_summary": f"See how {company.name} leveraged Frontier's market intelligence and analytics to identify new opportunities and drive significant revenue growth.",
                "sections": [
                    {
                        "title": "Growth Challenges",
                        "content_outline": [
                            "Market opportunity identification",
                            "Competitive positioning gaps",
                            "Customer insight limitations",
                            "Strategic planning challenges",
                            "Resource allocation decisions"
                        ]
                    },
                    {
                        "title": "Strategic Implementation",
                        "content_outline": [
                            "Market research capabilities",
                            "Competitive analysis tools",
                            "Customer segmentation insights",
                            "Opportunity identification process",
                            "Strategic planning enhancement"
                        ]
                    },
                    {
                        "title": "Revenue Growth Results",
                        "content_outline": [
                            "New revenue streams identified",
                            "Market share improvements",
                            "Customer acquisition gains",
                            "Pricing optimization results",
                            "Strategic partnership outcomes"
                        ]
                    }
                ],
                "key_metrics_to_collect": [
                    "Revenue increase ($ and %)",
                    "New customer acquisition",
                    "Market share growth",
                    "Average deal size improvement",
                    "Sales cycle reduction",
                    "Customer lifetime value increase",
                    "Competitive win rate improvement"
                ]
            }
        }
        
        outline = outlines.get(template, outlines[CaseStudyTemplate.COST_SAVINGS])
        
        # Add company-specific customizations
        outline["company_id"] = company_id
        outline["template_type"] = template.value
        outline["estimated_completion_time"] = "2-3 weeks"
        outline["interview_requirements"] = [
            f"Primary contact: {company.primary_contact_name}",
            "Finance/Operations lead (for metrics)",
            "End users of the platform",
            "Decision maker/executive sponsor"
        ]
        
        return outline
    
    def schedule_case_study_interview(self, company_id: str, interviewee_name: str,
                                    interviewee_title: str, interview_date: datetime) -> CaseStudyInterview:
        """Schedule case study interview"""
        
        company = next((c for c in self.beta_manager.companies if c.id == company_id), None)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        # Find or create case study
        case_study = next((cs for cs in self.beta_manager.case_studies if cs.company_id == company_id), None)
        if not case_study:
            case_study = CaseStudy(
                id=f"case_study_{uuid.uuid4().hex[:8]}",
                company_id=company_id,
                title=f"{company.name} Success Story",
                executive_summary="",
                challenge_description="",
                solution_implemented="",
                results_achieved={},
                metrics_improved={},
                roi_calculation={},
                implementation_timeline="",
                key_features_used=company.features_used,
                testimonial_quote="",
                testimonial_author=company.primary_contact_name,
                testimonial_title=interviewee_title
            )
            self.beta_manager.case_studies.append(case_study)
        
        interview = CaseStudyInterview(
            id=f"interview_{uuid.uuid4().hex[:8]}",
            case_study_id=case_study.id,
            interview_date=interview_date,
            interviewer_name="Kenneth (Frontier CEO)",
            interviewee_name=interviewee_name,
            interviewee_title=interviewee_title,
            duration_minutes=45,
            questions_asked=self._get_interview_questions(company),
            recording_url=f"https://recordings.frontier.com/{case_study.id}",
            follow_up_needed=True
        )
        
        self.case_study_interviews.append(interview)
        self.save_case_study_data()
        self.beta_manager.save_data()
        
        return interview
    
    def _get_interview_questions(self, company) -> List[str]:
        """Get standard interview questions"""
        
        return [
            f"Can you tell me about {company.name} and your role there?",
            "What were the main challenges you were facing before using Frontier?",
            "How did you discover Frontier and what made you decide to try it?",
            "Can you walk me through your implementation process?",
            "What specific features have been most valuable to you?",
            "What results have you seen since implementing Frontier?",
            "Can you quantify any time savings, cost savings, or efficiency gains?",
            "How has Frontier changed your decision-making process?",
            "What has been the impact on your team's productivity?",
            "Have you seen any unexpected benefits from using Frontier?",
            "How would you compare Frontier to other tools you've used?",
            "What would you tell other companies considering Frontier?",
            "How do you see your use of Frontier evolving in the future?",
            "Is there anything we haven't covered that you'd like to mention?"
        ]
    
    def conduct_interview_and_capture_data(self, interview_id: str, 
                                         responses: Dict[str, str],
                                         metrics_shared: Dict[str, Any]) -> CaseStudyInterview:
        """Capture interview responses and metrics"""
        
        interview = next((i for i in self.case_study_interviews if i.id == interview_id), None)
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")
        
        # Extract key quotes from responses
        key_quotes = []
        for question, response in responses.items():
            if len(response) > 100 and any(word in response.lower() for word in ["amazing", "incredible", "fantastic", "game-changer", "transformed"]):
                key_quotes.append(response)
        
        interview.key_quotes = key_quotes
        interview.metrics_shared = metrics_shared
        
        # Extract challenges and benefits
        challenges = []
        benefits = []
        
        for response in responses.values():
            if any(word in response.lower() for word in ["challenge", "problem", "difficult", "frustrating"]):
                challenges.append(response)
            if any(word in response.lower() for word in ["benefit", "advantage", "improvement", "better", "faster"]):
                benefits.append(response)
        
        interview.challenges_discussed = challenges
        interview.benefits_discussed = benefits
        
        self.save_case_study_data()
        return interview
    
    def calculate_case_study_roi(self, company_id: str, metrics: Dict[str, Any]) -> ROIMetrics:
        """Calculate ROI for case study"""
        
        company = next((c for c in self.beta_manager.companies if c.id == company_id), None)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        roi = ROIMetrics(
            initial_investment=metrics.get("annual_subscription_cost", company.expected_annual_value),
            annual_cost_savings=metrics.get("annual_cost_savings", 0),
            annual_revenue_increase=metrics.get("annual_revenue_increase", 0),
            time_savings_hours_per_month=metrics.get("time_savings_hours_per_month", 0),
            hourly_rate=metrics.get("hourly_rate", 75)
        )
        
        roi.calculate_roi()
        return roi
    
    def generate_case_study_content(self, case_study_id: str) -> Dict[str, Any]:
        """Generate complete case study content"""
        
        case_study = next((cs for cs in self.beta_manager.case_studies if cs.id == case_study_id), None)
        if not case_study:
            raise ValueError(f"Case study {case_study_id} not found")
        
        company = next((c for c in self.beta_manager.companies if c.id == case_study.company_id), None)
        if not company:
            raise ValueError(f"Company {case_study.company_id} not found")
        
        # Get interview data
        interviews = [i for i in self.case_study_interviews if i.case_study_id == case_study_id]
        
        # Combine all quotes and insights
        all_quotes = []
        all_challenges = []
        all_benefits = []
        
        for interview in interviews:
            all_quotes.extend(interview.key_quotes)
            all_challenges.extend(interview.challenges_discussed)
            all_benefits.extend(interview.benefits_discussed)
        
        # Generate content
        content = {
            "header": {
                "title": case_study.title or f"How {company.name} Transformed Their Analytics with Frontier",
                "subtitle": f"A {company.size.value} {company.industry.value} company's journey to data-driven success",
                "company_logo_url": f"https://logos.frontier.com/{company.id}.png",
                "publication_date": datetime.now().strftime("%B %Y")
            },
            
            "executive_summary": {
                "challenge": self._extract_primary_challenge(all_challenges),
                "solution": f"Implemented Frontier's comprehensive analytics platform",
                "results": self._generate_results_summary(case_study.results_achieved),
                "roi_highlight": self._generate_roi_highlight(case_study.roi_calculation)
            },
            
            "company_background": {
                "name": company.name,
                "industry": (company.industry.value if hasattr(company.industry, 'value') else company.industry).title(),
                "size": (company.size.value if hasattr(company.size, 'value') else company.size).title(),
                "location": company.location,
                "description": company.description,
                "website": company.website,
                "key_contact": {
                    "name": company.primary_contact_name,
                    "title": case_study.testimonial_title,
                    "quote": case_study.testimonial_quote or self._select_best_quote(all_quotes)
                }
            },
            
            "challenge_section": {
                "primary_challenge": self._extract_primary_challenge(all_challenges),
                "pain_points": self._extract_pain_points(all_challenges),
                "business_impact": self._describe_business_impact(all_challenges),
                "previous_solutions": "Manual Excel-based analysis and reporting"
            },
            
            "solution_section": {
                "implementation_approach": case_study.solution_implemented,
                "key_features_used": case_study.key_features_used,
                "implementation_timeline": case_study.implementation_timeline,
                "training_process": "Comprehensive onboarding and ongoing support",
                "integration_details": "Seamless integration with existing workflows"
            },
            
            "results_section": {
                "quantified_results": case_study.results_achieved,
                "metrics_improved": case_study.metrics_improved,
                "roi_calculation": case_study.roi_calculation,
                "qualitative_benefits": self._extract_qualitative_benefits(all_benefits),
                "unexpected_benefits": "Enhanced team collaboration and decision-making speed"
            },
            
            "testimonials": {
                "primary_quote": case_study.testimonial_quote,
                "primary_author": case_study.testimonial_author,
                "primary_title": case_study.testimonial_title,
                "additional_quotes": all_quotes[:3],  # Top 3 additional quotes
                "video_testimonial_url": f"https://videos.frontier.com/{case_study_id}.mp4"
            },
            
            "implementation_details": {
                "timeline": case_study.implementation_timeline,
                "team_involved": ["Finance Team", "Operations Team", "Executive Leadership"],
                "training_hours": "8 hours total",
                "go_live_process": "Phased rollout with parallel testing",
                "support_received": "Dedicated customer success manager"
            },
            
            "lessons_learned": {
                "success_factors": [
                    "Strong executive sponsorship",
                    "Clear success metrics defined upfront", 
                    "Comprehensive team training",
                    "Regular feedback and optimization"
                ],
                "challenges_overcome": self._extract_challenges_overcome(interviews),
                "recommendations": [
                    "Start with pilot team for initial implementation",
                    "Establish clear success metrics early",
                    "Invest in comprehensive training",
                    "Leverage Frontier's customer success team"
                ]
            },
            
            "future_plans": {
                "expansion_areas": ["Additional team members", "New use cases", "Advanced features"],
                "continued_partnership": "Long-term strategic partnership with Frontier",
                "advocacy": f"{company.name} serves as a Frontier reference customer"
            }
        }
        
        return content
    
    def _extract_primary_challenge(self, challenges: List[str]) -> str:
        """Extract primary challenge from interview data"""
        if not challenges:
            return "Manual, time-intensive analytical processes limiting business growth"
        
        # Find the most comprehensive challenge description
        longest_challenge = max(challenges, key=len) if challenges else ""
        return longest_challenge[:200] + "..." if len(longest_challenge) > 200 else longest_challenge
    
    def _extract_pain_points(self, challenges: List[str]) -> List[str]:
        """Extract key pain points"""
        pain_points = []
        
        for challenge in challenges:
            if "time" in challenge.lower():
                pain_points.append("Time-intensive manual processes")
            if "data" in challenge.lower():
                pain_points.append("Data quality and consistency issues")
            if "report" in challenge.lower():
                pain_points.append("Complex reporting requirements")
            if "decision" in challenge.lower():
                pain_points.append("Delayed decision-making")
        
        # Remove duplicates and add defaults if empty
        pain_points = list(set(pain_points))
        if not pain_points:
            pain_points = [
                "Manual data compilation and analysis",
                "Time-intensive reporting processes",
                "Lack of real-time insights",
                "Inconsistent analytical approaches"
            ]
        
        return pain_points[:4]  # Top 4 pain points
    
    def _describe_business_impact(self, challenges: List[str]) -> str:
        """Describe business impact of challenges"""
        return "These challenges resulted in delayed strategic decisions, increased operational costs, and reduced competitive agility in the marketplace."
    
    def _generate_results_summary(self, results: Dict[str, Any]) -> str:
        """Generate results summary"""
        if not results:
            return "Achieved significant improvements in analytical efficiency, decision-making speed, and operational cost savings."
        
        summary_parts = []
        if "time_savings" in results:
            summary_parts.append(f"Saved {results['time_savings']} hours per month")
        if "cost_savings" in results:
            summary_parts.append(f"Reduced costs by ${results['cost_savings']:,}")
        if "efficiency_gain" in results:
            summary_parts.append(f"Improved efficiency by {results['efficiency_gain']}%")
        
        return ", ".join(summary_parts) if summary_parts else "Achieved measurable improvements across key operational metrics."
    
    def _generate_roi_highlight(self, roi_calc: Dict[str, float]) -> str:
        """Generate ROI highlight"""
        if roi_calc and "roi_percentage" in roi_calc:
            return f"Achieved {roi_calc['roi_percentage']:.0f}% ROI with {roi_calc.get('payback_period_months', 6):.1f} month payback period"
        return "Positive ROI achieved within first year of implementation"
    
    def _select_best_quote(self, quotes: List[str]) -> str:
        """Select best quote for testimonial"""
        if not quotes:
            return "Frontier has transformed how we approach business analytics and decision-making."
        
        # Select the quote with most positive sentiment
        best_quote = max(quotes, key=lambda q: sum(1 for word in ["amazing", "incredible", "fantastic", "love", "excellent", "perfect"] if word in q.lower()))
        
        return best_quote[:150] + "..." if len(best_quote) > 150 else best_quote
    
    def _extract_qualitative_benefits(self, benefits: List[str]) -> List[str]:
        """Extract qualitative benefits"""
        qual_benefits = []
        
        for benefit in benefits:
            if "confidence" in benefit.lower():
                qual_benefits.append("Increased confidence in decision-making")
            if "collaboration" in benefit.lower():
                qual_benefits.append("Enhanced team collaboration")
            if "strategic" in benefit.lower():
                qual_benefits.append("More strategic focus")
            if "competitive" in benefit.lower():
                qual_benefits.append("Improved competitive positioning")
        
        # Remove duplicates and add defaults
        qual_benefits = list(set(qual_benefits))
        if not qual_benefits:
            qual_benefits = [
                "Enhanced decision-making confidence",
                "Improved team productivity",
                "Better strategic insights",
                "Increased operational agility"
            ]
        
        return qual_benefits[:4]
    
    def _extract_challenges_overcome(self, interviews: List[CaseStudyInterview]) -> List[str]:
        """Extract implementation challenges that were overcome"""
        return [
            "Initial learning curve for new platform",
            "Data integration complexity",
            "Change management across teams",
            "Workflow process adjustments"
        ]
    
    def create_case_study_marketing_assets(self, case_study_id: str) -> Dict[str, Any]:
        """Create marketing assets from case study"""
        
        content = self.generate_case_study_content(case_study_id)
        
        assets = {
            "one_pager": {
                "title": content["header"]["title"],
                "company_overview": f"{content['company_background']['name']} - {content['company_background']['industry']}",
                "challenge_summary": content["challenge_section"]["primary_challenge"][:100] + "...",
                "solution_summary": "Implemented Frontier's comprehensive analytics platform",
                "key_results": [
                    f"ROI: {content['results_section']['roi_calculation'].get('roi_percentage', 'Positive')}%",
                    f"Time Savings: {content['results_section']['metrics_improved'].get('time_savings', 'Significant')}",
                    f"Cost Reduction: {content['results_section']['metrics_improved'].get('cost_savings', 'Measurable')}"
                ],
                "testimonial": content["testimonials"]["primary_quote"]
            },
            
            "social_media_posts": [
                {
                    "platform": "LinkedIn",
                    "content": f"🎉 {content['company_background']['name']} achieved {content['results_section']['roi_calculation'].get('roi_percentage', 'amazing')}% ROI with Frontier! See how they transformed their analytics: [link]",
                    "hashtags": ["#BusinessAnalytics", "#DigitalTransformation", "#ROI", "#CaseStudy"]
                },
                {
                    "platform": "Twitter",
                    "content": f"{content['company_background']['name']} saved hours weekly with @FrontierAnalytics! Read their success story 👇 [link]",
                    "hashtags": ["#Analytics", "#Efficiency", "#Business"]
                }
            ],
            
            "email_campaign": {
                "subject": f"Case Study: How {content['company_background']['name']} Achieved {content['results_section']['roi_calculation'].get('roi_percentage', 'Incredible')}% ROI",
                "preview_text": f"See how this {content['company_background']['industry']} company transformed their analytics",
                "key_points": [
                    content["challenge_section"]["primary_challenge"][:80] + "...",
                    content["solution_section"]["implementation_approach"] or "Comprehensive Frontier implementation",
                    content["executive_summary"]["roi_highlight"]
                ]
            },
            
            "website_snippet": {
                "customer_logo": content["header"]["company_logo_url"],
                "industry_tag": content["company_background"]["industry"],
                "result_highlight": content["executive_summary"]["roi_highlight"],
                "quote": content["testimonials"]["primary_quote"],
                "quote_author": f"{content['testimonials']['primary_author']}, {content['testimonials']['primary_title']}"
            },
            
            "sales_deck_slides": [
                {
                    "slide_title": f"{content['company_background']['name']} Success Story",
                    "content": [
                        f"Industry: {content['company_background']['industry']}",
                        f"Size: {content['company_background']['size']}",
                        f"Challenge: {content['challenge_section']['primary_challenge'][:60]}...",
                        f"Result: {content['executive_summary']['roi_highlight']}"
                    ]
                }
            ]
        }
        
        return assets
    
    def generate_case_study_analytics(self) -> Dict[str, Any]:
        """Generate analytics on case study program"""
        
        analytics = {
            "program_overview": {
                "total_case_studies": len(self.beta_manager.case_studies),
                "published_case_studies": len([cs for cs in self.beta_manager.case_studies if cs.publication_status == "published"]),
                "interviews_conducted": len(self.case_study_interviews),
                "companies_featured": len(set([cs.company_id for cs in self.beta_manager.case_studies]))
            },
            
            "case_study_performance": {
                "average_roi_reported": 0,
                "industries_covered": set(),
                "company_sizes_covered": set(),
                "most_common_benefits": {},
                "average_implementation_time": "3 months"
            },
            
            "marketing_impact": {
                "case_studies_in_sales_process": 0,
                "leads_influenced_by_case_studies": 0,
                "conversion_rate_with_case_studies": 0,
                "most_shared_case_studies": []
            },
            
            "content_metrics": {
                "total_quotes_collected": sum(len(i.key_quotes) for i in self.case_study_interviews),
                "average_interview_duration": sum(i.duration_minutes for i in self.case_study_interviews) / len(self.case_study_interviews) if self.case_study_interviews else 0,
                "testimonials_available": len([cs for cs in self.beta_manager.case_studies if cs.testimonial_quote])
            }
        }
        
        # Calculate average ROI
        roi_values = []
        for cs in self.beta_manager.case_studies:
            if cs.roi_calculation and "roi_percentage" in cs.roi_calculation:
                roi_values.append(cs.roi_calculation["roi_percentage"])
        
        if roi_values:
            analytics["case_study_performance"]["average_roi_reported"] = sum(roi_values) / len(roi_values)
        
        # Collect industries and sizes
        for cs in self.beta_manager.case_studies:
            company = next((c for c in self.beta_manager.companies if c.id == cs.company_id), None)
            if company:
                industry_value = company.industry.value if hasattr(company.industry, 'value') else company.industry
                size_value = company.size.value if hasattr(company.size, 'value') else company.size
                analytics["case_study_performance"]["industries_covered"].add(industry_value)
                analytics["case_study_performance"]["company_sizes_covered"].add(size_value)
        
        # Convert sets to lists for JSON serialization
        analytics["case_study_performance"]["industries_covered"] = list(analytics["case_study_performance"]["industries_covered"])
        analytics["case_study_performance"]["company_sizes_covered"] = list(analytics["case_study_performance"]["company_sizes_covered"])
        
        return analytics

def main():
    """Main function to demonstrate case study system"""
    
    case_study_manager = CaseStudyManager()
    
    # Identify candidates
    print("🎯 Identifying case study candidates...")
    candidates = case_study_manager.identify_case_study_candidates()
    print(f"Found {len(candidates)} potential candidates")
    
    if candidates:
        top_candidate = candidates[0]
        print(f"Top candidate: {top_candidate['company_name']} (Score: {top_candidate['engagement_score']})")
        
        # Create outline
        print("\n📋 Creating case study outline...")
        outline = case_study_manager.create_case_study_outline(
            top_candidate["company_id"], 
            top_candidate["recommended_template"]
        )
        print(f"Created outline: {outline['title']}")
        
        # Schedule interview
        print("\n📅 Scheduling interview...")
        interview_date = datetime.now() + timedelta(days=7)
        interview = case_study_manager.schedule_case_study_interview(
            top_candidate["company_id"],
            top_candidate["contact_name"],
            "VP of Operations",
            interview_date
        )
        print(f"Scheduled interview {interview.id}")
    
    # Generate analytics
    print("\n📊 Generating case study analytics...")
    analytics = case_study_manager.generate_case_study_analytics()
    print(f"Total case studies: {analytics['program_overview']['total_case_studies']}")
    print(f"Interviews conducted: {analytics['program_overview']['interviews_conducted']}")
    
    print("\n✅ Case study system ready!")

if __name__ == "__main__":
    main()
