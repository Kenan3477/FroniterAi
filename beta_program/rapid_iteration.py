"""
Beta Program Rapid Iteration System
Implementation tracking, feedback analysis, and rapid development cycles
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import uuid
from pathlib import Path
import statistics

from beta_manager import BetaProgramManager, FeedbackItem, FeedbackType, Priority

class IterationStatus(Enum):
    """Iteration status"""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    TESTING = "testing"
    DEPLOYED = "deployed"
    VALIDATED = "validated"

class ImpactLevel(Enum):
    """Feature impact level"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class FeatureImplementation:
    """Feature implementation tracking"""
    id: str
    title: str
    description: str
    related_feedback_ids: List[str]
    
    # Planning
    priority_score: float
    effort_estimate: str  # small, medium, large, xl
    business_impact: ImpactLevel
    user_impact: ImpactLevel
    technical_complexity: str  # low, medium, high
    
    # Implementation
    assigned_developer: str = ""
    start_date: Optional[datetime] = None
    target_completion_date: Optional[datetime] = None
    actual_completion_date: Optional[datetime] = None
    status: IterationStatus = IterationStatus.PLANNING
    
    # Validation
    validation_criteria: List[str] = field(default_factory=list)
    validation_results: List[Dict[str, Any]] = field(default_factory=list)
    user_feedback_post_implementation: List[str] = field(default_factory=list)
    
    # Metrics
    usage_metrics: Dict[str, Any] = field(default_factory=dict)
    performance_impact: Dict[str, float] = field(default_factory=dict)
    user_satisfaction_score: Optional[float] = None

@dataclass
class IterationCycle:
    """2-week iteration cycle"""
    id: str
    cycle_number: int
    start_date: datetime
    end_date: datetime
    
    # Planning
    planned_features: List[str] = field(default_factory=list)
    sprint_goals: List[str] = field(default_factory=list)
    capacity_points: int = 40  # Total story points for 2 weeks
    
    # Execution
    completed_features: List[str] = field(default_factory=list)
    carried_over_features: List[str] = field(default_factory=list)
    emergency_fixes: List[str] = field(default_factory=list)
    
    # Outcomes
    velocity: int = 0  # Actual story points completed
    cycle_summary: str = ""
    key_learnings: List[str] = field(default_factory=list)
    user_feedback_incorporated: List[str] = field(default_factory=list)

@dataclass
class FeedbackAnalysis:
    """Analysis of feedback for prioritization"""
    feedback_id: str
    analysis_date: datetime
    
    # Categorization
    feature_category: str = ""  # ui/ux, performance, functionality, integration
    affected_user_segment: str = ""  # power_users, new_users, specific_industry
    implementation_complexity: str = "medium"  # low, medium, high
    
    # Scoring
    user_impact_score: float = 0.0      # 1-10 scale
    business_value_score: float = 0.0   # 1-10 scale  
    urgency_score: float = 0.0          # 1-10 scale
    effort_score: float = 5.0           # 1-10 scale (lower = less effort)
    
    # RICE scoring
    reach: int = 1           # Number of users affected per quarter
    impact: float = 1.0      # Impact per user (0.25, 0.5, 1, 2, 3)
    confidence: float = 0.5  # Confidence level (0.1-1.0)
    effort: float = 1.0      # Person-months of work
    
    rice_score: float = 0.0
    
    # Strategic alignment
    strategic_alignment: float = 5.0    # 1-10 scale
    competitive_advantage: float = 5.0  # 1-10 scale
    
    # Recommendation
    recommended_action: str = "evaluate"  # implement, evaluate, defer, reject
    recommended_timeline: str = "next_quarter"  # immediate, next_sprint, next_quarter, backlog

class RapidIterationEngine:
    """Engine for rapid iteration based on feedback"""
    
    def __init__(self, data_dir: str = "beta_program/data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.beta_manager = BetaProgramManager()
        self.feature_implementations: List[FeatureImplementation] = []
        self.iteration_cycles: List[IterationCycle] = []
        self.feedback_analyses: List[FeedbackAnalysis] = []
        
        # Load existing data
        self.load_iteration_data()
    
    def load_iteration_data(self):
        """Load iteration data from files"""
        try:
            features_file = self.data_dir / "feature_implementations.json"
            if features_file.exists():
                with open(features_file, 'r') as f:
                    features_data = json.load(f)
                    self.feature_implementations = [FeatureImplementation(**feature) for feature in features_data]
            
            cycles_file = self.data_dir / "iteration_cycles.json"
            if cycles_file.exists():
                with open(cycles_file, 'r') as f:
                    cycles_data = json.load(f)
                    self.iteration_cycles = [IterationCycle(**cycle) for cycle in cycles_data]
            
            analyses_file = self.data_dir / "feedback_analyses.json"
            if analyses_file.exists():
                with open(analyses_file, 'r') as f:
                    analyses_data = json.load(f)
                    self.feedback_analyses = [FeedbackAnalysis(**analysis) for analysis in analyses_data]
                    
        except Exception as e:
            print(f"Error loading iteration data: {e}")
    
    def save_iteration_data(self):
        """Save iteration data to files"""
        try:
            # Save feature implementations
            features_data = [feature.__dict__ for feature in self.feature_implementations]
            with open(self.data_dir / "feature_implementations.json", 'w') as f:
                json.dump(features_data, f, indent=2, default=str)
            
            # Save iteration cycles
            cycles_data = [cycle.__dict__ for cycle in self.iteration_cycles]
            with open(self.data_dir / "iteration_cycles.json", 'w') as f:
                json.dump(cycles_data, f, indent=2, default=str)
            
            # Save feedback analyses
            analyses_data = [analysis.__dict__ for analysis in self.feedback_analyses]
            with open(self.data_dir / "feedback_analyses.json", 'w') as f:
                json.dump(analyses_data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"Error saving iteration data: {e}")
    
    def analyze_feedback_item(self, feedback_id: str) -> FeedbackAnalysis:
        """Analyze feedback item for prioritization"""
        
        feedback_item = next((f for f in self.beta_manager.feedback_items if f.id == feedback_id), None)
        if not feedback_item:
            raise ValueError(f"Feedback item {feedback_id} not found")
        
        # Create analysis
        analysis = FeedbackAnalysis(
            feedback_id=feedback_id,
            analysis_date=datetime.now()
        )
        
        # Categorize feedback
        if feedback_item.feedback_type == FeedbackType.BUG_REPORT:
            analysis.feature_category = "bug_fix"
            analysis.urgency_score = self._map_priority_to_score(feedback_item.priority)
            analysis.business_value_score = 7.0  # Bug fixes have high business value
            analysis.user_impact_score = self._map_user_impact_to_score(feedback_item.user_impact)
            analysis.recommended_action = "implement" if feedback_item.priority.value in ['high', 'critical'] else "evaluate"
            analysis.recommended_timeline = "immediate" if feedback_item.priority.value == 'critical' else "next_sprint"
            
        elif feedback_item.feedback_type == FeedbackType.FEATURE_REQUEST:
            analysis.feature_category = "new_feature"
            analysis.urgency_score = 5.0  # Feature requests typically medium urgency
            analysis.business_value_score = self._estimate_feature_business_value(feedback_item)
            analysis.user_impact_score = self._estimate_feature_user_impact(feedback_item)
            analysis.recommended_action = "evaluate"
            analysis.recommended_timeline = "next_quarter"
            
        elif feedback_item.feedback_type == FeedbackType.PERFORMANCE_ISSUE:
            analysis.feature_category = "performance"
            analysis.urgency_score = 8.0  # Performance issues are high urgency
            analysis.business_value_score = 8.0
            analysis.user_impact_score = 9.0
            analysis.recommended_action = "implement"
            analysis.recommended_timeline = "next_sprint"
            
        elif feedback_item.feedback_type == FeedbackType.USABILITY_ISSUE:
            analysis.feature_category = "ui/ux"
            analysis.urgency_score = 6.0
            analysis.business_value_score = 7.0
            analysis.user_impact_score = 8.0
            analysis.recommended_action = "evaluate"
            analysis.recommended_timeline = "next_sprint"
        
        # Estimate reach (number of users affected)
        analysis.reach = self._estimate_reach(feedback_item)
        
        # Estimate impact per user
        analysis.impact = self._estimate_impact_per_user(feedback_item)
        
        # Estimate confidence
        analysis.confidence = self._estimate_confidence(feedback_item)
        
        # Estimate effort
        analysis.effort = self._estimate_effort(feedback_item)
        
        # Calculate RICE score
        analysis.rice_score = (analysis.reach * analysis.impact * analysis.confidence) / analysis.effort
        
        # Determine affected user segment
        company = next((c for c in self.beta_manager.companies if c.id == feedback_item.company_id), None)
        if company:
            if company.total_sessions > 20:
                analysis.affected_user_segment = "power_users"
            elif company.total_sessions < 5:
                analysis.affected_user_segment = "new_users"
            else:
                analysis.affected_user_segment = "regular_users"
        
        self.feedback_analyses.append(analysis)
        self.save_iteration_data()
        
        return analysis
    
    def _map_priority_to_score(self, priority: Priority) -> float:
        """Map priority enum to numeric score"""
        priority_scores = {
            Priority.CRITICAL: 10.0,
            Priority.HIGH: 8.0,
            Priority.MEDIUM: 5.0,
            Priority.LOW: 2.0
        }
        return priority_scores.get(priority, 5.0)
    
    def _map_user_impact_to_score(self, user_impact: str) -> float:
        """Map user impact string to numeric score"""
        impact_scores = {
            "blocker": 10.0,
            "high": 8.0,
            "medium": 5.0,
            "low": 2.0
        }
        return impact_scores.get(user_impact, 5.0)
    
    def _estimate_feature_business_value(self, feedback_item: FeedbackItem) -> float:
        """Estimate business value of feature request"""
        # Base score
        score = 5.0
        
        # Check if it's from a high-value company
        company = next((c for c in self.beta_manager.companies if c.id == feedback_item.company_id), None)
        if company and company.expected_annual_value > 30000:
            score += 2.0
        
        # Check affected module (some modules are more critical)
        high_value_modules = ["financial_analysis", "strategic_planning", "valuation"]
        if feedback_item.affected_module.lower() in high_value_modules:
            score += 1.5
        
        # Check for integration requests (high business value)
        if "integration" in feedback_item.description.lower():
            score += 1.5
        
        return min(score, 10.0)
    
    def _estimate_feature_user_impact(self, feedback_item: FeedbackItem) -> float:
        """Estimate user impact of feature request"""
        # Base score
        score = 5.0
        
        # Check if it saves time
        time_keywords = ["faster", "quick", "automate", "save time", "efficient"]
        if any(keyword in feedback_item.description.lower() for keyword in time_keywords):
            score += 2.0
        
        # Check if it improves core workflow
        workflow_keywords = ["workflow", "process", "daily", "routine", "core"]
        if any(keyword in feedback_item.description.lower() for keyword in workflow_keywords):
            score += 1.5
        
        return min(score, 10.0)
    
    def _estimate_reach(self, feedback_item: FeedbackItem) -> int:
        """Estimate number of users affected per quarter"""
        # Get similar feedback items
        similar_feedback = [
            f for f in self.beta_manager.feedback_items
            if f.affected_module == feedback_item.affected_module and f.id != feedback_item.id
        ]
        
        # Base reach is 1 (the user who submitted)
        reach = 1
        
        # Add reach based on similar feedback
        reach += len(similar_feedback)
        
        # Estimate based on module usage
        module_usage = {
            "financial_analysis": 15,  # Most companies use this
            "strategic_planning": 12,
            "market_research": 10,
            "competitive_analysis": 8,
            "valuation": 6,
            "industry_benchmarks": 8
        }
        
        module_reach = module_usage.get(feedback_item.affected_module, 5)
        reach = max(reach, module_reach)
        
        return reach
    
    def _estimate_impact_per_user(self, feedback_item: FeedbackItem) -> float:
        """Estimate impact per user (RICE scale)"""
        # RICE impact scale: 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
        
        if feedback_item.feedback_type == FeedbackType.BUG_REPORT:
            if feedback_item.priority == Priority.CRITICAL:
                return 3.0  # Massive impact
            elif feedback_item.priority == Priority.HIGH:
                return 2.0  # High impact
            else:
                return 1.0  # Medium impact
        
        elif feedback_item.feedback_type == FeedbackType.PERFORMANCE_ISSUE:
            return 2.0  # High impact
        
        elif feedback_item.feedback_type == FeedbackType.FEATURE_REQUEST:
            # Check if it's a core feature or nice-to-have
            core_keywords = ["essential", "critical", "must", "required", "needed"]
            if any(keyword in feedback_item.description.lower() for keyword in core_keywords):
                return 2.0
            else:
                return 1.0
        
        return 1.0  # Default medium impact
    
    def _estimate_confidence(self, feedback_item: FeedbackItem) -> float:
        """Estimate confidence in impact assessment"""
        # Start with base confidence
        confidence = 0.7
        
        # Higher confidence for bug reports (clear impact)
        if feedback_item.feedback_type == FeedbackType.BUG_REPORT:
            confidence = 0.9
        
        # Higher confidence if multiple users report similar issues
        similar_feedback = [
            f for f in self.beta_manager.feedback_items
            if f.affected_module == feedback_item.affected_module and 
            f.feedback_type == feedback_item.feedback_type and 
            f.id != feedback_item.id
        ]
        
        if len(similar_feedback) >= 2:
            confidence += 0.2
        
        # Higher confidence from power users
        company = next((c for c in self.beta_manager.companies if c.id == feedback_item.company_id), None)
        if company and company.total_sessions > 15:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _estimate_effort(self, feedback_item: FeedbackItem) -> float:
        """Estimate effort in person-months"""
        
        if feedback_item.feedback_type == FeedbackType.BUG_REPORT:
            # Bug fixes typically take less effort
            if feedback_item.priority == Priority.CRITICAL:
                return 0.5  # 2 weeks
            else:
                return 0.25  # 1 week
        
        elif feedback_item.feedback_type == FeedbackType.PERFORMANCE_ISSUE:
            return 1.0  # 1 month for performance optimization
        
        elif feedback_item.feedback_type == FeedbackType.USABILITY_ISSUE:
            return 0.5  # 2 weeks for UI/UX improvements
        
        elif feedback_item.feedback_type == FeedbackType.FEATURE_REQUEST:
            # Estimate based on complexity indicators
            complexity_keywords = {
                "simple": 0.5,
                "quick": 0.25,
                "integration": 2.0,
                "new module": 3.0,
                "dashboard": 1.5,
                "api": 1.0,
                "report": 0.5,
                "export": 0.5
            }
            
            description_lower = feedback_item.description.lower()
            for keyword, effort in complexity_keywords.items():
                if keyword in description_lower:
                    return effort
            
            return 1.0  # Default 1 month
        
        return 1.0  # Default effort
    
    def prioritize_feedback_items(self, feedback_ids: List[str] = None) -> List[Tuple[str, float]]:
        """Prioritize feedback items using RICE scoring"""
        
        if feedback_ids is None:
            # Analyze all unanalyzed feedback
            analyzed_ids = {a.feedback_id for a in self.feedback_analyses}
            feedback_ids = [
                f.id for f in self.beta_manager.feedback_items 
                if f.id not in analyzed_ids and f.status == "open"
            ]
        
        # Analyze feedback items that haven't been analyzed yet
        for feedback_id in feedback_ids:
            if not any(a.feedback_id == feedback_id for a in self.feedback_analyses):
                self.analyze_feedback_item(feedback_id)
        
        # Get analyses for requested feedback items
        relevant_analyses = [
            a for a in self.feedback_analyses 
            if a.feedback_id in feedback_ids
        ]
        
        # Sort by RICE score
        prioritized = sorted(
            relevant_analyses,
            key=lambda x: x.rice_score,
            reverse=True
        )
        
        return [(a.feedback_id, a.rice_score) for a in prioritized]
    
    def create_iteration_cycle(self, cycle_number: int, start_date: datetime) -> IterationCycle:
        """Create new 2-week iteration cycle"""
        
        end_date = start_date + timedelta(days=14)
        
        cycle = IterationCycle(
            id=f"cycle_{cycle_number:02d}",
            cycle_number=cycle_number,
            start_date=start_date,
            end_date=end_date,
            sprint_goals=[
                "Address critical user feedback",
                "Improve platform stability",
                "Enhance user experience",
                "Maintain development velocity"
            ]
        )
        
        self.iteration_cycles.append(cycle)
        self.save_iteration_data()
        
        return cycle
    
    def plan_iteration_sprint(self, cycle_id: str, feedback_priorities: List[Tuple[str, float]]) -> Dict[str, Any]:
        """Plan features for iteration sprint based on prioritized feedback"""
        
        cycle = next((c for c in self.iteration_cycles if c.id == cycle_id), None)
        if not cycle:
            raise ValueError(f"Cycle {cycle_id} not found")
        
        # Available capacity (story points)
        available_capacity = cycle.capacity_points
        
        # Convert high-priority feedback to features
        planned_features = []
        used_capacity = 0
        
        for feedback_id, rice_score in feedback_priorities:
            if used_capacity >= available_capacity:
                break
            
            analysis = next((a for a in self.feedback_analyses if a.feedback_id == feedback_id), None)
            if not analysis or analysis.recommended_action == "reject":
                continue
            
            feedback_item = next((f for f in self.beta_manager.feedback_items if f.id == feedback_id), None)
            if not feedback_item:
                continue
            
            # Estimate story points based on effort
            effort_to_points = {
                0.25: 2,   # 1 week = 2 points
                0.5: 5,    # 2 weeks = 5 points  
                1.0: 8,    # 1 month = 8 points
                1.5: 13,   # 6 weeks = 13 points
                2.0: 20,   # 2 months = 20 points
                3.0: 30    # 3 months = 30 points
            }
            
            story_points = 5  # Default
            for effort, points in effort_to_points.items():
                if analysis.effort <= effort:
                    story_points = points
                    break
            
            if used_capacity + story_points <= available_capacity:
                feature = FeatureImplementation(
                    id=f"feature_{uuid.uuid4().hex[:8]}",
                    title=feedback_item.title,
                    description=feedback_item.description,
                    related_feedback_ids=[feedback_id],
                    priority_score=rice_score,
                    effort_estimate=self._points_to_effort_estimate(story_points),
                    business_impact=self._score_to_impact_level(analysis.business_value_score),
                    user_impact=self._score_to_impact_level(analysis.user_impact_score),
                    technical_complexity=analysis.implementation_complexity,
                    target_completion_date=cycle.end_date,
                    validation_criteria=self._create_validation_criteria(feedback_item)
                )
                
                self.feature_implementations.append(feature)
                planned_features.append(feature.id)
                used_capacity += story_points
        
        # Update cycle with planned features
        cycle.planned_features = planned_features
        
        sprint_plan = {
            "cycle_id": cycle_id,
            "planned_features": len(planned_features),
            "total_story_points": used_capacity,
            "capacity_utilization": (used_capacity / available_capacity) * 100,
            "features": [
                {
                    "id": f.id,
                    "title": f.title,
                    "priority_score": f.priority_score,
                    "effort": f.effort_estimate,
                    "business_impact": f.business_impact.value,
                    "user_impact": f.user_impact.value
                }
                for f in self.feature_implementations if f.id in planned_features
            ]
        }
        
        self.save_iteration_data()
        return sprint_plan
    
    def _points_to_effort_estimate(self, story_points: int) -> str:
        """Convert story points to effort estimate"""
        if story_points <= 3:
            return "small"
        elif story_points <= 8:
            return "medium"
        elif story_points <= 20:
            return "large"
        else:
            return "xl"
    
    def _score_to_impact_level(self, score: float) -> ImpactLevel:
        """Convert numeric score to impact level enum"""
        if score >= 8.0:
            return ImpactLevel.CRITICAL
        elif score >= 6.0:
            return ImpactLevel.HIGH
        elif score >= 4.0:
            return ImpactLevel.MEDIUM
        else:
            return ImpactLevel.LOW
    
    def _create_validation_criteria(self, feedback_item: FeedbackItem) -> List[str]:
        """Create validation criteria for feature"""
        
        criteria = [
            "Feature works as described",
            "No new bugs introduced",
            "Performance impact is acceptable",
            "User can complete intended workflow"
        ]
        
        if feedback_item.feedback_type == FeedbackType.BUG_REPORT:
            criteria.extend([
                "Original bug no longer reproduces",
                "Edge cases are handled properly",
                "Fix doesn't break related functionality"
            ])
        
        elif feedback_item.feedback_type == FeedbackType.FEATURE_REQUEST:
            criteria.extend([
                "Feature meets specified requirements",
                "User interface is intuitive",
                "Feature integrates well with existing workflow"
            ])
        
        elif feedback_item.feedback_type == FeedbackType.PERFORMANCE_ISSUE:
            criteria.extend([
                "Performance meets target benchmarks",
                "Improvement is measurable",
                "No performance regression in other areas"
            ])
        
        return criteria
    
    def track_implementation_progress(self, feature_id: str, status: IterationStatus,
                                    notes: str = "") -> FeatureImplementation:
        """Track progress of feature implementation"""
        
        feature = next((f for f in self.feature_implementations if f.id == feature_id), None)
        if not feature:
            raise ValueError(f"Feature {feature_id} not found")
        
        feature.status = status
        
        if status == IterationStatus.IN_PROGRESS and not feature.start_date:
            feature.start_date = datetime.now()
        
        if status == IterationStatus.DEPLOYED and not feature.actual_completion_date:
            feature.actual_completion_date = datetime.now()
        
        self.save_iteration_data()
        return feature
    
    def validate_feature_implementation(self, feature_id: str, 
                                       validation_results: List[Dict[str, Any]]) -> FeatureImplementation:
        """Validate completed feature implementation"""
        
        feature = next((f for f in self.feature_implementations if f.id == feature_id), None)
        if not feature:
            raise ValueError(f"Feature {feature_id} not found")
        
        feature.validation_results = validation_results
        
        # Check if all validation criteria passed
        all_passed = all(result.get("passed", False) for result in validation_results)
        
        if all_passed:
            feature.status = IterationStatus.VALIDATED
        else:
            # Need to address validation failures
            feature.status = IterationStatus.TESTING
        
        self.save_iteration_data()
        return feature
    
    def collect_post_implementation_feedback(self, feature_id: str) -> Dict[str, Any]:
        """Collect feedback after feature implementation"""
        
        feature = next((f for f in self.feature_implementations if f.id == feature_id), None)
        if not feature:
            raise ValueError(f"Feature {feature_id} not found")
        
        # Get feedback related to this feature after implementation
        implementation_date = feature.actual_completion_date or datetime.now()
        
        related_feedback = []
        for feedback_id in feature.related_feedback_ids:
            # Look for new feedback from same companies/modules
            original_feedback = next((f for f in self.beta_manager.feedback_items if f.id == feedback_id), None)
            if original_feedback:
                new_feedback = [
                    f for f in self.beta_manager.feedback_items
                    if (f.company_id == original_feedback.company_id or 
                        f.affected_module == original_feedback.affected_module) and
                    f.submission_date > implementation_date
                ]
                related_feedback.extend(new_feedback)
        
        # Analyze sentiment of post-implementation feedback
        positive_feedback = []
        negative_feedback = []
        neutral_feedback = []
        
        for feedback in related_feedback:
            # Simple sentiment analysis based on keywords
            description_lower = feedback.description.lower()
            
            positive_keywords = ["better", "improved", "faster", "great", "love", "perfect", "excellent"]
            negative_keywords = ["worse", "broken", "slow", "bad", "hate", "terrible", "awful"]
            
            positive_score = sum(1 for keyword in positive_keywords if keyword in description_lower)
            negative_score = sum(1 for keyword in negative_keywords if keyword in description_lower)
            
            if positive_score > negative_score:
                positive_feedback.append(feedback)
            elif negative_score > positive_score:
                negative_feedback.append(feedback)
            else:
                neutral_feedback.append(feedback)
        
        # Calculate satisfaction score
        total_feedback = len(related_feedback)
        if total_feedback > 0:
            satisfaction_score = (len(positive_feedback) * 2 + len(neutral_feedback)) / (total_feedback * 2) * 10
            feature.user_satisfaction_score = satisfaction_score
        
        feedback_summary = {
            "feature_id": feature_id,
            "total_feedback_received": total_feedback,
            "positive_feedback": len(positive_feedback),
            "negative_feedback": len(negative_feedback),
            "neutral_feedback": len(neutral_feedback),
            "satisfaction_score": feature.user_satisfaction_score,
            "feedback_details": [
                {
                    "id": f.id,
                    "type": f.feedback_type.value,
                    "title": f.title,
                    "company": f.company_id,
                    "sentiment": "positive" if f in positive_feedback else "negative" if f in negative_feedback else "neutral"
                }
                for f in related_feedback
            ]
        }
        
        self.save_iteration_data()
        return feedback_summary
    
    def complete_iteration_cycle(self, cycle_id: str) -> Dict[str, Any]:
        """Complete iteration cycle and generate summary"""
        
        cycle = next((c for c in self.iteration_cycles if c.id == cycle_id), None)
        if not cycle:
            raise ValueError(f"Cycle {cycle_id} not found")
        
        # Get features planned for this cycle
        cycle_features = [
            f for f in self.feature_implementations 
            if f.id in cycle.planned_features
        ]
        
        # Calculate completion metrics
        completed_features = [f for f in cycle_features if f.status == IterationStatus.VALIDATED]
        in_progress_features = [f for f in cycle_features if f.status == IterationStatus.IN_PROGRESS]
        
        cycle.completed_features = [f.id for f in completed_features]
        cycle.carried_over_features = [f.id for f in in_progress_features]
        
        # Calculate velocity (completed story points)
        completed_points = 0
        for feature in completed_features:
            points_map = {"small": 3, "medium": 8, "large": 13, "xl": 20}
            completed_points += points_map.get(feature.effort_estimate, 8)
        
        cycle.velocity = completed_points
        
        # Generate cycle summary
        completion_rate = len(completed_features) / len(cycle_features) * 100 if cycle_features else 0
        
        cycle.cycle_summary = f"""
Cycle {cycle.cycle_number} Summary:
- Planned: {len(cycle_features)} features
- Completed: {len(completed_features)} features ({completion_rate:.1f}%)
- Carried over: {len(in_progress_features)} features
- Velocity: {completed_points} story points
"""
        
        # Key learnings
        cycle.key_learnings = [
            f"Completed {len(completed_features)} out of {len(cycle_features)} planned features",
            f"Achieved velocity of {completed_points} story points",
            "User feedback response time averaged X hours",
            "Most impactful feature was Y based on user feedback"
        ]
        
        # Track feedback incorporated
        feedback_addressed = []
        for feature in completed_features:
            feedback_addressed.extend(feature.related_feedback_ids)
        
        cycle.user_feedback_incorporated = feedback_addressed
        
        cycle_summary = {
            "cycle_id": cycle_id,
            "completion_rate": completion_rate,
            "velocity": completed_points,
            "features_completed": len(completed_features),
            "features_carried_over": len(in_progress_features),
            "feedback_items_addressed": len(feedback_addressed),
            "key_outcomes": [
                f"{len(completed_features)} features delivered",
                f"{len(feedback_addressed)} feedback items addressed",
                f"{completion_rate:.1f}% completion rate",
                f"{completed_points} story points velocity"
            ]
        }
        
        self.save_iteration_data()
        return cycle_summary
    
    def generate_iteration_analytics(self) -> Dict[str, Any]:
        """Generate analytics on iteration performance"""
        
        if not self.iteration_cycles:
            return {"error": "No iteration cycles found"}
        
        completed_cycles = [c for c in self.iteration_cycles if c.velocity > 0]
        
        analytics = {
            "cycle_performance": {
                "total_cycles": len(self.iteration_cycles),
                "completed_cycles": len(completed_cycles),
                "average_velocity": statistics.mean([c.velocity for c in completed_cycles]) if completed_cycles else 0,
                "velocity_trend": [c.velocity for c in completed_cycles],
                "average_completion_rate": statistics.mean([
                    len(c.completed_features) / len(c.planned_features) * 100 
                    for c in completed_cycles if c.planned_features
                ]) if completed_cycles else 0
            },
            "feature_delivery": {
                "total_features_implemented": len([f for f in self.feature_implementations if f.status == IterationStatus.VALIDATED]),
                "features_in_progress": len([f for f in self.feature_implementations if f.status == IterationStatus.IN_PROGRESS]),
                "average_implementation_time": 0,
                "feature_success_rate": 0
            },
            "feedback_response": {
                "total_feedback_analyzed": len(self.feedback_analyses),
                "feedback_implementation_rate": 0,
                "average_rice_score": statistics.mean([a.rice_score for a in self.feedback_analyses]) if self.feedback_analyses else 0,
                "top_feedback_sources": {}
            },
            "user_satisfaction": {
                "features_with_satisfaction_data": len([f for f in self.feature_implementations if f.user_satisfaction_score is not None]),
                "average_satisfaction_score": 0,
                "satisfaction_trend": []
            }
        }
        
        # Calculate average implementation time
        completed_features = [
            f for f in self.feature_implementations 
            if f.status == IterationStatus.VALIDATED and f.start_date and f.actual_completion_date
        ]
        
        if completed_features:
            implementation_times = [
                (f.actual_completion_date - f.start_date).days 
                for f in completed_features
            ]
            analytics["feature_delivery"]["average_implementation_time"] = statistics.mean(implementation_times)
        
        # Calculate feature success rate (validated / total implemented)
        total_implemented = len([f for f in self.feature_implementations if f.status in [IterationStatus.DEPLOYED, IterationStatus.VALIDATED]])
        if total_implemented > 0:
            success_rate = len([f for f in self.feature_implementations if f.status == IterationStatus.VALIDATED]) / total_implemented * 100
            analytics["feature_delivery"]["feature_success_rate"] = success_rate
        
        # Calculate feedback implementation rate
        total_feedback = len(self.beta_manager.feedback_items)
        implemented_feedback = len(set([
            feedback_id for feature in self.feature_implementations 
            if feature.status == IterationStatus.VALIDATED
            for feedback_id in feature.related_feedback_ids
        ]))
        
        if total_feedback > 0:
            analytics["feedback_response"]["feedback_implementation_rate"] = implemented_feedback / total_feedback * 100
        
        # Top feedback sources
        feedback_by_company = {}
        for feedback in self.beta_manager.feedback_items:
            company = next((c for c in self.beta_manager.companies if c.id == feedback.company_id), None)
            company_name = company.name if company else "Unknown"
            feedback_by_company[company_name] = feedback_by_company.get(company_name, 0) + 1
        
        analytics["feedback_response"]["top_feedback_sources"] = dict(
            sorted(feedback_by_company.items(), key=lambda x: x[1], reverse=True)[:5]
        )
        
        # Calculate average satisfaction score
        satisfaction_scores = [f.user_satisfaction_score for f in self.feature_implementations if f.user_satisfaction_score is not None]
        if satisfaction_scores:
            analytics["user_satisfaction"]["average_satisfaction_score"] = statistics.mean(satisfaction_scores)
            analytics["user_satisfaction"]["satisfaction_trend"] = satisfaction_scores
        
        return analytics

def main():
    """Main function to demonstrate rapid iteration system"""
    
    iteration_engine = RapidIterationEngine()
    
    # Analyze recent feedback
    print("🔍 Analyzing feedback for prioritization...")
    recent_feedback = [f.id for f in iteration_engine.beta_manager.feedback_items if f.status == "open"][:10]
    
    prioritized_feedback = iteration_engine.prioritize_feedback_items(recent_feedback)
    print(f"Prioritized {len(prioritized_feedback)} feedback items")
    
    # Create iteration cycle
    print("\n📅 Creating iteration cycle...")
    start_date = datetime.now() + timedelta(days=1)
    cycle = iteration_engine.create_iteration_cycle(1, start_date)
    print(f"Created cycle {cycle.id}")
    
    # Plan sprint
    print("\n🎯 Planning sprint...")
    sprint_plan = iteration_engine.plan_iteration_sprint(cycle.id, prioritized_feedback[:5])
    print(f"Planned {sprint_plan['planned_features']} features using {sprint_plan['capacity_utilization']:.1f}% capacity")
    
    # Generate analytics
    print("\n📊 Generating iteration analytics...")
    analytics = iteration_engine.generate_iteration_analytics()
    
    if "error" not in analytics:
        print(f"Total cycles: {analytics['cycle_performance']['total_cycles']}")
        print(f"Features implemented: {analytics['feature_delivery']['total_features_implemented']}")
        print(f"Feedback analyzed: {analytics['feedback_response']['total_feedback_analyzed']}")
    
    print("\n✅ Rapid iteration system ready!")

if __name__ == "__main__":
    main()
