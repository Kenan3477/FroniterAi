"""
Phased Product Launch Management System
Comprehensive system for managing product launch phases from beta to full market release
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from enum import Enum
from dataclasses import dataclass, asdict
import uuid

class LaunchPhase(Enum):
    """Launch phase types"""
    BETA_SOFT_LAUNCH = "beta_soft_launch"
    LIMITED_RELEASE = "limited_release"
    REGIONAL_LAUNCH = "regional_launch"
    FULL_LAUNCH = "full_launch"
    POST_LAUNCH = "post_launch"

class LaunchStatus(Enum):
    """Launch status types"""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"
    CANCELLED = "cancelled"

class TaskPriority(Enum):
    """Task priority levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TaskStatus(Enum):
    """Task completion status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"

@dataclass
class LaunchTask:
    """Individual launch task"""
    id: str
    title: str
    description: str
    phase: LaunchPhase
    priority: TaskPriority
    status: TaskStatus
    assigned_to: str
    due_date: datetime
    estimated_hours: int
    actual_hours: Optional[int] = None
    dependencies: List[str] = None
    completion_date: Optional[datetime] = None
    notes: str = ""
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []

@dataclass
class LaunchMetric:
    """Launch success metric"""
    id: str
    name: str
    description: str
    target_value: float
    current_value: Optional[float] = None
    unit: str = ""
    category: str = "general"
    
@dataclass
class LaunchPhaseConfig:
    """Configuration for a launch phase"""
    phase: LaunchPhase
    name: str
    description: str
    start_date: datetime
    end_date: datetime
    status: LaunchStatus
    target_audience: List[str]
    success_criteria: List[str]
    tasks: List[LaunchTask]
    metrics: List[LaunchMetric]
    notes: str = ""

class ProductLaunchManager:
    """Main product launch management system"""
    
    def __init__(self, data_file: str = "launch_data.json"):
        self.data_file = data_file
        self.launch_phases: List[LaunchPhaseConfig] = []
        self.load_data()
    
    def load_data(self):
        """Load launch data from file"""
        if os.path.exists(self.data_file):
            try:
                with open(self.data_file, 'r') as f:
                    data = json.load(f)
                    self.launch_phases = [
                        LaunchPhaseConfig(
                            phase=LaunchPhase(phase_data['phase']),
                            name=phase_data['name'],
                            description=phase_data['description'],
                            start_date=datetime.fromisoformat(phase_data['start_date']),
                            end_date=datetime.fromisoformat(phase_data['end_date']),
                            status=LaunchStatus(phase_data['status']),
                            target_audience=phase_data['target_audience'],
                            success_criteria=phase_data['success_criteria'],
                            tasks=[
                                LaunchTask(
                                    id=task['id'],
                                    title=task['title'],
                                    description=task['description'],
                                    phase=LaunchPhase(task['phase']),
                                    priority=TaskPriority(task['priority']),
                                    status=TaskStatus(task['status']),
                                    assigned_to=task['assigned_to'],
                                    due_date=datetime.fromisoformat(task['due_date']),
                                    estimated_hours=task['estimated_hours'],
                                    actual_hours=task.get('actual_hours'),
                                    dependencies=task.get('dependencies', []),
                                    completion_date=datetime.fromisoformat(task['completion_date']) if task.get('completion_date') else None,
                                    notes=task.get('notes', '')
                                ) for task in phase_data['tasks']
                            ],
                            metrics=[
                                LaunchMetric(
                                    id=metric['id'],
                                    name=metric['name'],
                                    description=metric['description'],
                                    target_value=metric['target_value'],
                                    current_value=metric.get('current_value'),
                                    unit=metric.get('unit', ''),
                                    category=metric.get('category', 'general')
                                ) for metric in phase_data['metrics']
                            ],
                            notes=phase_data.get('notes', '')
                        ) for phase_data in data
                    ]
            except Exception as e:
                print(f"Error loading data: {e}")
                self.launch_phases = []
    
    def save_data(self):
        """Save launch data to file"""
        try:
            data = []
            for phase in self.launch_phases:
                phase_data = {
                    'phase': phase.phase.value,
                    'name': phase.name,
                    'description': phase.description,
                    'start_date': phase.start_date.isoformat(),
                    'end_date': phase.end_date.isoformat(),
                    'status': phase.status.value,
                    'target_audience': phase.target_audience,
                    'success_criteria': phase.success_criteria,
                    'tasks': [
                        {
                            'id': task.id,
                            'title': task.title,
                            'description': task.description,
                            'phase': task.phase.value,
                            'priority': task.priority.value,
                            'status': task.status.value,
                            'assigned_to': task.assigned_to,
                            'due_date': task.due_date.isoformat(),
                            'estimated_hours': task.estimated_hours,
                            'actual_hours': task.actual_hours,
                            'dependencies': task.dependencies,
                            'completion_date': task.completion_date.isoformat() if task.completion_date else None,
                            'notes': task.notes
                        } for task in phase.tasks
                    ],
                    'metrics': [
                        {
                            'id': metric.id,
                            'name': metric.name,
                            'description': metric.description,
                            'target_value': metric.target_value,
                            'current_value': metric.current_value,
                            'unit': metric.unit,
                            'category': metric.category
                        } for metric in phase.metrics
                    ],
                    'notes': phase.notes
                }
                data.append(phase_data)
            
            with open(self.data_file, 'w') as f:
                json.dump(data, f, indent=2)
                
        except Exception as e:
            print(f"Error saving data: {e}")
    
    def create_week1_soft_launch(self):
        """Create Week 1 soft launch phase with comprehensive tasks"""
        
        # Calculate dates
        start_date = datetime.now()
        end_date = start_date + timedelta(days=7)
        
        # Create tasks for Week 1 soft launch
        tasks = [
            # Technical Preparation
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Final Production Environment Setup",
                description="Ensure production environment is fully configured and tested",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.CRITICAL,
                status=TaskStatus.NOT_STARTED,
                assigned_to="DevOps Team",
                due_date=start_date + timedelta(days=1),
                estimated_hours=8
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Beta User Access Provisioning",
                description="Provision accounts and access for all beta users",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.CRITICAL,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Technical Team",
                due_date=start_date + timedelta(days=1),
                estimated_hours=4
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Monitoring and Analytics Setup",
                description="Configure comprehensive monitoring, logging, and analytics",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="DevOps Team",
                due_date=start_date + timedelta(days=1),
                estimated_hours=6
            ),
            
            # Communication & User Management
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Beta User Welcome Communications",
                description="Send welcome emails and onboarding materials to beta users",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Marketing Team",
                due_date=start_date + timedelta(days=1),
                estimated_hours=4
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Beta User Onboarding Sessions",
                description="Conduct live onboarding sessions for beta users",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Customer Success",
                due_date=start_date + timedelta(days=2),
                estimated_hours=12
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Support Channel Activation",
                description="Activate dedicated support channels for beta users",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Support Team",
                due_date=start_date + timedelta(days=1),
                estimated_hours=2
            ),
            
            # Content and Documentation
            LaunchTask(
                id=str(uuid.uuid4()),
                title="User Documentation Finalization",
                description="Complete and publish user guides, tutorials, and FAQ",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Technical Writing",
                due_date=start_date + timedelta(days=1),
                estimated_hours=8
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Video Tutorial Creation",
                description="Create getting-started video tutorials for beta users",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Marketing Team",
                due_date=start_date + timedelta(days=3),
                estimated_hours=16
            ),
            
            # Feedback and Iteration
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Daily Beta Feedback Collection",
                description="Implement daily feedback collection from beta users",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Product Team",
                due_date=start_date + timedelta(days=2),
                estimated_hours=2
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Rapid Issue Resolution Process",
                description="Establish rapid response process for critical issues",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.CRITICAL,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Development Team",
                due_date=start_date + timedelta(days=1),
                estimated_hours=4
            ),
            
            # Performance and Quality
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Performance Baseline Establishment",
                description="Establish performance baselines and SLA monitoring",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="DevOps Team",
                due_date=start_date + timedelta(days=2),
                estimated_hours=6
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Quality Assurance Final Check",
                description="Perform final QA check across all user journeys",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.CRITICAL,
                status=TaskStatus.NOT_STARTED,
                assigned_to="QA Team",
                due_date=start_date + timedelta(hours=12),
                estimated_hours=8
            ),
            
            # Analytics and Tracking
            LaunchTask(
                id=str(uuid.uuid4()),
                title="User Behavior Analytics Configuration",
                description="Configure detailed user behavior tracking and analytics",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Analytics Team",
                due_date=start_date + timedelta(days=2),
                estimated_hours=6
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Business Metrics Dashboard Setup",
                description="Setup business metrics dashboard for launch tracking",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Analytics Team",
                due_date=start_date + timedelta(days=3),
                estimated_hours=8
            ),
            
            # End-of-Week Activities
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Week 1 Retrospective and Analysis",
                description="Conduct comprehensive analysis of Week 1 performance",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Product Team",
                due_date=end_date,
                estimated_hours=4
            ),
            LaunchTask(
                id=str(uuid.uuid4()),
                title="Week 2 Planning and Preparation",
                description="Plan and prepare for Week 2 launch activities",
                phase=LaunchPhase.BETA_SOFT_LAUNCH,
                priority=TaskPriority.HIGH,
                status=TaskStatus.NOT_STARTED,
                assigned_to="Product Team",
                due_date=end_date,
                estimated_hours=6
            )
        ]
        
        # Create success metrics
        metrics = [
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="Beta User Activation Rate",
                description="Percentage of beta users who complete onboarding",
                target_value=85.0,
                unit="%",
                category="engagement"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="Daily Active Beta Users",
                description="Number of beta users active daily",
                target_value=12.0,
                unit="users",
                category="engagement"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="Average Session Duration",
                description="Average time beta users spend in the application",
                target_value=25.0,
                unit="minutes",
                category="engagement"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="Critical Issues Count",
                description="Number of critical issues reported by beta users",
                target_value=0.0,
                unit="issues",
                category="quality"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="System Uptime",
                description="System availability during beta launch",
                target_value=99.5,
                unit="%",
                category="performance"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="User Satisfaction Score",
                description="Average satisfaction score from beta user feedback",
                target_value=8.0,
                unit="score (1-10)",
                category="satisfaction"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="Feature Usage Rate",
                description="Percentage of core features used by beta users",
                target_value=75.0,
                unit="%",
                category="engagement"
            ),
            LaunchMetric(
                id=str(uuid.uuid4()),
                name="Support Ticket Volume",
                description="Number of support tickets from beta users",
                target_value=5.0,
                unit="tickets",
                category="support"
            )
        ]
        
        # Create the Week 1 launch phase
        week1_phase = LaunchPhaseConfig(
            phase=LaunchPhase.BETA_SOFT_LAUNCH,
            name="Week 1: Beta Soft Launch",
            description="Soft launch to existing beta users with comprehensive monitoring and feedback collection",
            start_date=start_date,
            end_date=end_date,
            status=LaunchStatus.PLANNED,
            target_audience=[
                "Existing beta program participants (15 companies)",
                "Internal stakeholders and team members",
                "Selected power users from beta program",
                "Key strategic partners"
            ],
            success_criteria=[
                "85%+ beta user activation rate",
                "Zero critical system issues",
                "Average user satisfaction score of 8+/10",
                "75%+ core feature usage rate",
                "System uptime >99.5%",
                "Daily feedback collection from all active users",
                "Successful completion of all onboarding sessions"
            ],
            tasks=tasks,
            metrics=metrics,
            notes="This is the first phase of our phased product launch. Focus on stability, user experience, and rapid iteration based on feedback."
        )
        
        # Add to launch phases
        self.launch_phases.append(week1_phase)
        self.save_data()
        
        return week1_phase
    
    def get_current_phase(self) -> Optional[LaunchPhaseConfig]:
        """Get the currently active launch phase"""
        now = datetime.now()
        for phase in self.launch_phases:
            if phase.start_date <= now <= phase.end_date and phase.status == LaunchStatus.IN_PROGRESS:
                return phase
        return None
    
    def get_upcoming_tasks(self, days_ahead: int = 3) -> List[LaunchTask]:
        """Get upcoming tasks within specified days"""
        cutoff_date = datetime.now() + timedelta(days=days_ahead)
        upcoming_tasks = []
        
        for phase in self.launch_phases:
            for task in phase.tasks:
                if (task.due_date <= cutoff_date and 
                    task.status in [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS]):
                    upcoming_tasks.append(task)
        
        return sorted(upcoming_tasks, key=lambda x: x.due_date)
    
    def update_task_status(self, task_id: str, new_status: TaskStatus, notes: str = ""):
        """Update task status"""
        for phase in self.launch_phases:
            for task in phase.tasks:
                if task.id == task_id:
                    task.status = new_status
                    if notes:
                        task.notes = notes
                    if new_status == TaskStatus.COMPLETED:
                        task.completion_date = datetime.now()
                    self.save_data()
                    return True
        return False
    
    def update_metric_value(self, metric_id: str, current_value: float):
        """Update metric current value"""
        for phase in self.launch_phases:
            for metric in phase.metrics:
                if metric.id == metric_id:
                    metric.current_value = current_value
                    self.save_data()
                    return True
        return False
    
    def generate_launch_status_report(self) -> Dict[str, Any]:
        """Generate comprehensive launch status report"""
        current_phase = self.get_current_phase()
        upcoming_tasks = self.get_upcoming_tasks()
        
        # Calculate overall progress
        total_tasks = sum(len(phase.tasks) for phase in self.launch_phases)
        completed_tasks = sum(
            len([task for task in phase.tasks if task.status == TaskStatus.COMPLETED])
            for phase in self.launch_phases
        )
        
        overall_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Phase-specific analysis
        phase_analysis = {}
        for phase in self.launch_phases:
            phase_total = len(phase.tasks)
            phase_completed = len([task for task in phase.tasks if task.status == TaskStatus.COMPLETED])
            phase_progress = (phase_completed / phase_total * 100) if phase_total > 0 else 0
            
            # Critical tasks analysis
            critical_tasks = [task for task in phase.tasks if task.priority == TaskPriority.CRITICAL]
            critical_completed = len([task for task in critical_tasks if task.status == TaskStatus.COMPLETED])
            
            # Metrics performance
            metrics_on_track = 0
            for metric in phase.metrics:
                if metric.current_value is not None:
                    if metric.current_value >= metric.target_value:
                        metrics_on_track += 1
            
            phase_analysis[phase.phase.value] = {
                "name": phase.name,
                "status": phase.status.value,
                "progress_percentage": round(phase_progress, 1),
                "tasks_completed": f"{phase_completed}/{phase_total}",
                "critical_tasks_completed": f"{critical_completed}/{len(critical_tasks)}",
                "metrics_on_track": f"{metrics_on_track}/{len(phase.metrics)}",
                "start_date": phase.start_date.strftime("%Y-%m-%d"),
                "end_date": phase.end_date.strftime("%Y-%m-%d")
            }
        
        return {
            "generated_at": datetime.now().isoformat(),
            "overall_progress": round(overall_progress, 1),
            "current_phase": current_phase.name if current_phase else "No active phase",
            "total_phases": len(self.launch_phases),
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "upcoming_tasks_count": len(upcoming_tasks),
            "phase_analysis": phase_analysis,
            "upcoming_tasks": [
                {
                    "id": task.id,
                    "title": task.title,
                    "phase": task.phase.value,
                    "priority": task.priority.value,
                    "due_date": task.due_date.strftime("%Y-%m-%d %H:%M"),
                    "assigned_to": task.assigned_to
                } for task in upcoming_tasks[:10]  # Limit to next 10 tasks
            ]
        }
    
    def start_phase(self, phase: LaunchPhase):
        """Start a launch phase"""
        for launch_phase in self.launch_phases:
            if launch_phase.phase == phase:
                launch_phase.status = LaunchStatus.IN_PROGRESS
                self.save_data()
                return True
        return False

def main():
    """Main function to demonstrate the launch manager"""
    
    print("🚀 Frontier Product Launch Manager")
    print("=" * 50)
    
    # Initialize launch manager
    manager = ProductLaunchManager()
    
    # Create Week 1 soft launch
    print("📋 Creating Week 1 Beta Soft Launch...")
    week1_phase = manager.create_week1_soft_launch()
    
    print(f"✅ Created '{week1_phase.name}' phase")
    print(f"📅 Duration: {week1_phase.start_date.strftime('%Y-%m-%d')} to {week1_phase.end_date.strftime('%Y-%m-%d')}")
    print(f"📊 Tasks: {len(week1_phase.tasks)}")
    print(f"📈 Metrics: {len(week1_phase.metrics)}")
    print(f"🎯 Target Audience: {len(week1_phase.target_audience)} groups")
    
    # Start the phase
    manager.start_phase(LaunchPhase.BETA_SOFT_LAUNCH)
    print("\n🎬 Week 1 Beta Soft Launch phase started!")
    
    # Generate status report
    print("\n📊 Launch Status Report:")
    report = manager.generate_launch_status_report()
    
    print(f"Overall Progress: {report['overall_progress']}%")
    print(f"Current Phase: {report['current_phase']}")
    print(f"Total Tasks: {report['total_tasks']}")
    print(f"Upcoming Tasks: {report['upcoming_tasks_count']}")
    
    print("\n📋 Next 5 Upcoming Tasks:")
    for i, task in enumerate(report['upcoming_tasks'][:5], 1):
        print(f"{i}. {task['title']} ({task['priority']}) - Due: {task['due_date']}")
    
    print("\n🎯 Success! Week 1 Beta Soft Launch is ready to execute.")
    print("💻 Use the launch dashboard to track progress and manage tasks.")

if __name__ == "__main__":
    main()
