"""
Beta Program Weekly Sessions Management
Coordination, scheduling, and management of weekly feedback sessions
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
import uuid
from pathlib import Path
import calendar

from beta_manager import BetaProgramManager, WeeklySession

@dataclass
class SessionAttendee:
    """Session attendee information"""
    name: str
    email: str
    company_id: str
    company_name: str
    role: str
    timezone: str = "EST"
    preferred_time: str = "afternoon"  # morning, afternoon, evening
    confirmed: bool = False
    join_url: str = ""

@dataclass
class SessionAgenda:
    """Detailed session agenda"""
    session_id: str
    date: datetime
    duration_minutes: int = 60
    
    # Agenda structure
    welcome_duration: int = 5
    updates_duration: int = 10
    feedback_duration: int = 30
    prioritization_duration: int = 10
    wrap_up_duration: int = 5
    
    # Content
    product_updates: List[str] = field(default_factory=list)
    demo_topics: List[str] = field(default_factory=list)
    discussion_topics: List[str] = field(default_factory=list)
    voting_items: List[str] = field(default_factory=list)
    
    # Resources
    presentation_url: str = ""
    demo_environment_url: str = ""
    feedback_form_url: str = ""
    meeting_room_url: str = ""

@dataclass
class ActionItem:
    """Action item from session"""
    id: str
    description: str
    owner: str
    due_date: datetime
    priority: str = "medium"  # low, medium, high, critical
    status: str = "open"      # open, in_progress, completed, blocked
    category: str = "feature" # feature, bug, process, documentation
    related_feedback_ids: List[str] = field(default_factory=list)
    completion_notes: str = ""
    estimated_effort: str = "medium"  # small, medium, large, xl

class WeeklySessionManager:
    """Manager for weekly feedback sessions"""
    
    def __init__(self, data_dir: str = "beta_program/data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.beta_manager = BetaProgramManager()
        self.session_agendas: List[SessionAgenda] = []
        self.action_items: List[ActionItem] = []
        
        # Load existing data
        self.load_session_data()
    
    def load_session_data(self):
        """Load session data from files"""
        try:
            agendas_file = self.data_dir / "session_agendas.json"
            if agendas_file.exists():
                with open(agendas_file, 'r') as f:
                    agendas_data = json.load(f)
                    self.session_agendas = [SessionAgenda(**agenda) for agenda in agendas_data]
            
            actions_file = self.data_dir / "action_items.json"
            if actions_file.exists():
                with open(actions_file, 'r') as f:
                    actions_data = json.load(f)
                    self.action_items = [ActionItem(**action) for action in actions_data]
                    
        except Exception as e:
            print(f"Error loading session data: {e}")
    
    def save_session_data(self):
        """Save session data to files"""
        try:
            # Save agendas
            agendas_data = [agenda.__dict__ for agenda in self.session_agendas]
            with open(self.data_dir / "session_agendas.json", 'w') as f:
                json.dump(agendas_data, f, indent=2, default=str)
            
            # Save action items
            actions_data = [action.__dict__ for action in self.action_items]
            with open(self.data_dir / "action_items.json", 'w') as f:
                json.dump(actions_data, f, indent=2, default=str)
                
        except Exception as e:
            print(f"Error saving session data: {e}")
    
    def create_session_schedule(self, start_date: datetime, num_weeks: int = 12,
                              session_day: str = "Friday", session_time: str = "14:00") -> List[WeeklySession]:
        """Create weekly session schedule"""
        
        sessions = []
        current_date = start_date
        
        # Find next occurrence of specified day
        target_weekday = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }[session_day.lower()]
        
        days_ahead = target_weekday - current_date.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        
        first_session_date = current_date + timedelta(days=days_ahead)
        
        # Parse session time
        hour, minute = map(int, session_time.split(':'))
        
        for week in range(num_weeks):
            session_date = first_session_date + timedelta(weeks=week)
            session_date = session_date.replace(hour=hour, minute=minute)
            
            session = WeeklySession(
                id=f"weekly_session_{week+1:02d}",
                session_date=session_date,
                attendees=[],
                duration_minutes=60,
                agenda_items=[
                    "Welcome and introductions (5 min)",
                    "Product updates and new features (10 min)", 
                    "User feedback discussion (30 min)",
                    "Feature prioritization voting (10 min)",
                    "Action items and wrap-up (5 min)"
                ],
                key_feedback=[],
                action_items=[],
                next_session_date=session_date + timedelta(days=7) if week < num_weeks - 1 else session_date
            )
            
            sessions.append(session)
        
        # Add to beta manager
        self.beta_manager.weekly_sessions.extend(sessions)
        self.beta_manager.save_data()
        
        return sessions
    
    def invite_companies_to_session(self, session_id: str, company_ids: List[str]) -> List[SessionAttendee]:
        """Invite companies to specific session"""
        
        session = next((s for s in self.beta_manager.weekly_sessions if s.id == session_id), None)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        attendees = []
        
        for company_id in company_ids:
            company = next((c for c in self.beta_manager.companies if c.id == company_id), None)
            if company:
                attendee = SessionAttendee(
                    name=company.primary_contact_name,
                    email=company.primary_contact_email,
                    company_id=company_id,
                    company_name=company.name,
                    role="Primary Contact"
                )
                attendees.append(attendee)
        
        return attendees
    
    def create_session_agenda(self, session_id: str, product_updates: List[str] = None,
                             demo_topics: List[str] = None) -> SessionAgenda:
        """Create detailed session agenda"""
        
        session = next((s for s in self.beta_manager.weekly_sessions if s.id == session_id), None)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Get recent feedback for discussion topics
        recent_feedback = sorted(
            self.beta_manager.feedback_items,
            key=lambda x: x.submission_date,
            reverse=True
        )[:10]
        
        discussion_topics = [
            f"Recent feedback: {feedback.title} ({feedback.feedback_type.value})"
            for feedback in recent_feedback
        ]
        
        # Get high-priority feedback for voting
        high_priority_feedback = [
            f for f in self.beta_manager.feedback_items 
            if f.priority.value in ['high', 'critical'] and f.status == 'open'
        ]
        
        voting_items = [
            f"Priority: {feedback.title}"
            for feedback in high_priority_feedback[:5]
        ]
        
        agenda = SessionAgenda(
            session_id=session_id,
            date=session.session_date,
            product_updates=product_updates or [
                "New financial analysis templates",
                "Enhanced API documentation", 
                "Performance improvements",
                "Bug fixes and stability updates"
            ],
            demo_topics=demo_topics or [
                "New dashboard features",
                "Advanced filtering options",
                "Export and sharing capabilities"
            ],
            discussion_topics=discussion_topics,
            voting_items=voting_items,
            presentation_url="https://frontier-beta.com/presentations/" + session_id,
            demo_environment_url="https://demo.frontier-beta.com",
            feedback_form_url="https://frontier-beta.com/feedback/" + session_id,
            meeting_room_url="https://meet.frontier-beta.com/" + session_id
        )
        
        self.session_agendas.append(agenda)
        self.save_session_data()
        
        return agenda
    
    def generate_invitation_email(self, session_id: str, attendee: SessionAttendee) -> Dict[str, str]:
        """Generate session invitation email"""
        
        session = next((s for s in self.beta_manager.weekly_sessions if s.id == session_id), None)
        agenda = next((a for a in self.session_agendas if a.session_id == session_id), None)
        
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        session_date_str = session.session_date.strftime("%A, %B %d, %Y")
        session_time_str = session.session_date.strftime("%I:%M %p EST")
        
        subject = f"Frontier Beta Weekly Session - {session_date_str}"
        
        body = f"""
Hi {attendee.name},

I hope you're having a great week! This is a friendly reminder about our upcoming Frontier Beta weekly feedback session.

**Session Details:**
📅 Date: {session_date_str}
🕐 Time: {session_time_str}
⏱️ Duration: {session.duration_minutes} minutes
🔗 Join Link: {agenda.meeting_room_url if agenda else '[Meeting link will be provided]'}

**This Week's Agenda:**
"""
        
        if agenda:
            body += f"""
1. **Welcome & Introductions** ({agenda.welcome_duration} min)
   - Quick introductions for any new attendees
   - Agenda overview

2. **Product Updates** ({agenda.updates_duration} min)
"""
            for update in agenda.product_updates:
                body += f"   • {update}\n"
            
            if agenda.demo_topics:
                body += f"\n3. **Live Demo** (5 min)\n"
                for topic in agenda.demo_topics:
                    body += f"   • {topic}\n"
            
            body += f"""
4. **Feedback & Discussion** ({agenda.feedback_duration} min)
   - Share your recent experiences with Frontier
   - Discuss any challenges or pain points
   - Celebrate wins and success stories
"""
            
            if agenda.discussion_topics:
                body += f"   - Focus topics:\n"
                for topic in agenda.discussion_topics[:3]:
                    body += f"     • {topic}\n"
            
            if agenda.voting_items:
                body += f"""
5. **Feature Prioritization** ({agenda.prioritization_duration} min)
   - Vote on upcoming feature priorities
   - Quick poll on most important improvements
"""
            
            body += f"""
6. **Action Items & Wrap-up** ({agenda.wrap_up_duration} min)
   - Review action items from last session
   - Plan for next week
   - Q&A

**Pre-Session Preparation:**
To make the most of our time together, please:
• Think about your experience with Frontier this week
• Note any specific questions or challenges you'd like to discuss
• Review any recent feedback you've submitted

**Quick Feedback Form:**
If you can't attend or want to share feedback in advance, please fill out our quick form: {agenda.feedback_form_url if agenda else '[Form link]'}

**Can't Make It?**
If you can't attend this session, no worries! The session will be recorded and shared with all beta participants. You can also:
• Submit feedback through our online form
• Schedule a 1-on-1 call with our team
• Join our Slack channel for ongoing discussions

**Looking Forward To:**
• Hearing about your latest wins with Frontier
• Understanding any roadblocks you're facing
• Getting your input on our product roadmap
• Sharing exciting new features and improvements

Thank you for being such a valuable part of our beta program. Your feedback is directly shaping the future of Frontier!

Best regards,

Kenneth
Founder & CEO, Frontier
Email: kenneth@frontier-analytics.com
Phone: +1-555-FRONTIER

**Beta Program Resources:**
• Beta Dashboard: https://beta.frontier-analytics.com
• Documentation: https://docs.frontier-analytics.com
• Support: beta-support@frontier-analytics.com
• Slack Channel: #frontier-beta

---
P.S. - If you know someone else at {attendee.company_name} who would benefit from joining these sessions, feel free to bring them along! Just let me know so I can send them the details.
"""
        else:
            body += """
1. Welcome and introductions (5 min)
2. Product updates and new features (10 min)
3. User feedback discussion (30 min)
4. Feature prioritization voting (10 min)
5. Action items and wrap-up (5 min)

We'll share the detailed agenda and meeting link closer to the session date.

Looking forward to our discussion and your valuable feedback!

Best regards,

Kenneth
Founder & CEO, Frontier
"""
        
        return {
            "subject": subject,
            "body": body.strip()
        }
    
    def conduct_session_prep(self, session_id: str) -> Dict[str, Any]:
        """Prepare materials for conducting session"""
        
        session = next((s for s in self.beta_manager.weekly_sessions if s.id == session_id), None)
        agenda = next((a for a in self.session_agendas if a.session_id == session_id), None)
        
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Get active companies
        active_companies = [
            c for c in self.beta_manager.companies 
            if c.status.value == 'active'
        ]
        
        # Get recent feedback
        recent_feedback = [
            f for f in self.beta_manager.feedback_items
            if f.submission_date >= datetime.now() - timedelta(days=7)
        ]
        
        # Get pending action items
        pending_actions = [
            a for a in self.action_items
            if a.status in ['open', 'in_progress']
        ]
        
        prep_materials = {
            "session_info": {
                "id": session_id,
                "date": session.session_date.strftime("%Y-%m-%d %H:%M"),
                "expected_attendees": len(active_companies),
                "agenda_prepared": agenda is not None
            },
            "recent_activity": {
                "new_feedback_count": len(recent_feedback),
                "pending_actions": len(pending_actions),
                "active_companies": len(active_companies)
            },
            "discussion_prep": {
                "recent_feedback": [
                    {
                        "id": f.id,
                        "company": next((c.name for c in self.beta_manager.companies if c.id == f.company_id), "Unknown"),
                        "type": f.feedback_type.value,
                        "title": f.title,
                        "priority": f.priority.value
                    }
                    for f in recent_feedback
                ],
                "feature_requests": [
                    f for f in recent_feedback 
                    if f.feedback_type.value == 'feature_request'
                ],
                "bug_reports": [
                    f for f in recent_feedback 
                    if f.feedback_type.value == 'bug_report'
                ]
            },
            "action_items_review": [
                {
                    "id": a.id,
                    "description": a.description,
                    "owner": a.owner,
                    "due_date": a.due_date.strftime("%Y-%m-%d"),
                    "status": a.status,
                    "priority": a.priority
                }
                for a in pending_actions
            ],
            "company_updates": [
                {
                    "name": c.name,
                    "last_login": c.last_login_date.strftime("%Y-%m-%d") if c.last_login_date else "Never",
                    "total_sessions": c.total_sessions,
                    "api_calls": c.api_calls_count,
                    "features_used": len(c.features_used)
                }
                for c in active_companies
            ]
        }
        
        return prep_materials
    
    def record_session_results(self, session_id: str, attendees: List[Dict[str, str]],
                              key_feedback: List[str], new_action_items: List[Dict[str, Any]],
                              session_notes: str = "") -> WeeklySession:
        """Record results from conducted session"""
        
        session = next((s for s in self.beta_manager.weekly_sessions if s.id == session_id), None)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Update session with results
        session.attendees = attendees
        session.key_feedback = key_feedback
        session.session_notes = session_notes
        
        # Create action items
        created_actions = []
        for item_data in new_action_items:
            action_item = ActionItem(
                id=f"action_{uuid.uuid4().hex[:8]}",
                description=item_data.get("description", ""),
                owner=item_data.get("owner", "Product Team"),
                due_date=datetime.now() + timedelta(days=item_data.get("due_days", 14)),
                priority=item_data.get("priority", "medium"),
                category=item_data.get("category", "feature"),
                estimated_effort=item_data.get("effort", "medium")
            )
            
            self.action_items.append(action_item)
            created_actions.append(action_item)
        
        # Convert action items to session format
        session.action_items = [
            {
                "id": a.id,
                "description": a.description,
                "owner": a.owner,
                "due_date": a.due_date.strftime("%Y-%m-%d"),
                "priority": a.priority
            }
            for a in created_actions
        ]
        
        # Save all data
        self.beta_manager.save_data()
        self.save_session_data()
        
        return session
    
    def generate_session_summary_email(self, session_id: str) -> Dict[str, str]:
        """Generate post-session summary email"""
        
        session = next((s for s in self.beta_manager.weekly_sessions if s.id == session_id), None)
        if not session or not session.attendees:
            raise ValueError(f"Session {session_id} not found or not conducted")
        
        session_date = session.session_date.strftime("%B %d, %Y")
        
        subject = f"Frontier Beta Session Summary - {session_date}"
        
        body = f"""
Hi Beta Team,

Thank you for joining our weekly feedback session yesterday! It was great to hear from everyone and get your valuable insights.

**Session Highlights:**

👥 **Attendees:** {len(session.attendees)} participants
📅 **Date:** {session_date}
⏱️ **Duration:** {session.duration_minutes} minutes

**Key Feedback Received:**
"""
        
        for feedback in session.key_feedback:
            body += f"• {feedback}\n"
        
        if session.action_items:
            body += f"""
**Action Items & Next Steps:**
"""
            for item in session.action_items:
                body += f"• {item['description']} (Owner: {item['owner']}, Due: {item['due_date']})\n"
        
        body += f"""
**What We Heard You Need:**
Based on your feedback, our top priorities for the next sprint are:
• Enhanced performance optimization
• Improved data export capabilities  
• Better mobile responsiveness
• Additional integration options

**Coming Next Week:**
• New dashboard features demo
• API endpoint updates
• Performance improvements rollout
• Enhanced documentation

**Resources:**
• Session Recording: [Link will be shared separately]
• Updated Documentation: https://docs.frontier-analytics.com
• Feature Request Form: https://frontier-beta.com/feature-requests
• Bug Report Form: https://frontier-beta.com/bug-reports

**Next Session:**
📅 {session.next_session_date.strftime('%A, %B %d at %I:%M %p EST')}
🔗 Same meeting link: [Meeting URL]

**Between Sessions:**
• Continue testing new features
• Submit feedback through our forms
• Join our Slack channel for quick questions
• Schedule 1-on-1 calls if needed

**Personal Thank You:**
Your continued participation and honest feedback is what makes this beta program so valuable. Every suggestion helps us build a better product for you and future users.

If you have any questions or additional feedback before next week, don't hesitate to reach out!

Best regards,

Kenneth
Founder & CEO, Frontier
Email: kenneth@frontier-analytics.com

**Beta Program Team:**
• Kenneth - Product & Strategy
• Sarah - Engineering Lead  
• Mike - Customer Success
• Lisa - UX/Design

---
**Quick Feedback:** How was this session? Reply with a 👍 or 👎 and any suggestions for improvement.
"""
        
        return {
            "subject": subject,
            "body": body.strip()
        }
    
    def track_action_item_progress(self, action_id: str, status: str, 
                                  completion_notes: str = "") -> ActionItem:
        """Update action item progress"""
        
        action = next((a for a in self.action_items if a.id == action_id), None)
        if not action:
            raise ValueError(f"Action item {action_id} not found")
        
        action.status = status
        if status == "completed":
            action.completion_notes = completion_notes
        
        self.save_session_data()
        return action
    
    def generate_session_analytics(self) -> Dict[str, Any]:
        """Generate analytics on session performance"""
        
        conducted_sessions = [
            s for s in self.beta_manager.weekly_sessions 
            if s.attendees and len(s.attendees) > 0
        ]
        
        if not conducted_sessions:
            return {"error": "No conducted sessions found"}
        
        analytics = {
            "session_metrics": {
                "total_sessions_scheduled": len(self.beta_manager.weekly_sessions),
                "sessions_conducted": len(conducted_sessions),
                "attendance_rate": len(conducted_sessions) / len(self.beta_manager.weekly_sessions) * 100,
                "average_attendees": sum(len(s.attendees) for s in conducted_sessions) / len(conducted_sessions),
                "total_feedback_collected": sum(len(s.key_feedback) for s in conducted_sessions),
                "total_action_items_created": len(self.action_items)
            },
            "attendance_trends": [],
            "feedback_themes": {},
            "action_item_completion": {
                "total_items": len(self.action_items),
                "completed_items": len([a for a in self.action_items if a.status == "completed"]),
                "in_progress_items": len([a for a in self.action_items if a.status == "in_progress"]),
                "open_items": len([a for a in self.action_items if a.status == "open"]),
                "overdue_items": len([
                    a for a in self.action_items 
                    if a.due_date < datetime.now() and a.status != "completed"
                ])
            },
            "company_participation": {}
        }
        
        # Attendance trends
        for session in conducted_sessions:
            analytics["attendance_trends"].append({
                "date": session.session_date.strftime("%Y-%m-%d"),
                "attendees": len(session.attendees),
                "feedback_items": len(session.key_feedback)
            })
        
        # Company participation tracking
        for company in self.beta_manager.companies:
            company_sessions = sum(
                1 for session in conducted_sessions
                for attendee in session.attendees
                if attendee.get("company_id") == company.id
            )
            
            analytics["company_participation"][company.name] = {
                "sessions_attended": company_sessions,
                "participation_rate": company_sessions / len(conducted_sessions) * 100 if conducted_sessions else 0
            }
        
        return analytics
    
    def create_session_calendar_export(self) -> str:
        """Create calendar export for all sessions"""
        
        calendar_content = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Frontier//Beta Sessions//EN\n"
        
        for session in self.beta_manager.weekly_sessions:
            start_time = session.session_date.strftime("%Y%m%dT%H%M%S")
            end_time = (session.session_date + timedelta(minutes=session.duration_minutes)).strftime("%Y%m%dT%H%M%S")
            
            calendar_content += f"""BEGIN:VEVENT
UID:{session.id}@frontier-beta.com
DTSTART:{start_time}
DTEND:{end_time}
SUMMARY:Frontier Beta Weekly Session
DESCRIPTION:Weekly feedback session for Frontier beta participants
LOCATION:https://meet.frontier-beta.com/{session.id}
STATUS:CONFIRMED
END:VEVENT
"""
        
        calendar_content += "END:VCALENDAR"
        
        # Save to file
        calendar_file = self.data_dir / "beta_sessions.ics"
        with open(calendar_file, 'w') as f:
            f.write(calendar_content)
        
        return str(calendar_file)

def main():
    """Main function to demonstrate session management"""
    
    session_manager = WeeklySessionManager()
    
    # Create session schedule
    print("📅 Creating weekly session schedule...")
    start_date = datetime.now() + timedelta(days=1)
    sessions = session_manager.create_session_schedule(start_date, 12)
    print(f"Created {len(sessions)} weekly sessions")
    
    # Create agenda for first session
    print("\n📋 Creating session agenda...")
    first_session = sessions[0]
    agenda = session_manager.create_session_agenda(
        first_session.id,
        product_updates=[
            "New financial analysis templates released",
            "Enhanced API rate limiting implemented",
            "Mobile app beta version available",
            "Performance improvements across all modules"
        ],
        demo_topics=[
            "New dashboard filtering capabilities",
            "Enhanced export options",
            "Real-time collaboration features"
        ]
    )
    print(f"Created agenda for session {first_session.id}")
    
    # Generate invitation email
    print("\n📧 Generating invitation email...")
    sample_attendee = SessionAttendee(
        name="Sarah Chen",
        email="sarah@cloudscale.com", 
        company_id="beta_tech_001",
        company_name="CloudScale Solutions",
        role="VP of Product"
    )
    invitation = session_manager.generate_invitation_email(first_session.id, sample_attendee)
    print(f"Generated invitation email: {invitation['subject']}")
    
    # Generate session analytics
    print("\n📊 Generating session analytics...")
    analytics = session_manager.generate_session_analytics()
    print(f"Sessions scheduled: {analytics.get('session_metrics', {}).get('total_sessions_scheduled', 0)}")
    
    print("\n✅ Weekly session management system ready!")

if __name__ == "__main__":
    main()
