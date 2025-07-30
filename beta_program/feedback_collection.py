"""
Beta Program Feedback Collection System
Interactive feedback forms, surveys, and collection interfaces
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List
import plotly.express as px
import plotly.graph_objects as go
from beta_manager import BetaProgramManager, FeedbackType, Priority, BetaUserStatus

class FeedbackCollectionSystem:
    """Streamlit-based feedback collection system"""
    
    def __init__(self):
        self.beta_manager = BetaProgramManager()
        
        if 'beta_manager' not in st.session_state:
            st.session_state.beta_manager = self.beta_manager
    
    def render_feedback_dashboard(self):
        """Main feedback collection dashboard"""
        
        st.title("🚀 Frontier Beta Program - Feedback Collection")
        st.markdown("---")
        
        # Sidebar for navigation
        st.sidebar.title("Navigation")
        page = st.sidebar.selectbox("Choose a page", [
            "📝 Submit Feedback",
            "📊 Feedback Analytics", 
            "👥 Company Dashboard",
            "📅 Weekly Sessions",
            "📈 Program Overview"
        ])
        
        if page == "📝 Submit Feedback":
            self.render_feedback_form()
        elif page == "📊 Feedback Analytics":
            self.render_feedback_analytics()
        elif page == "👥 Company Dashboard":
            self.render_company_dashboard()
        elif page == "📅 Weekly Sessions":
            self.render_weekly_sessions()
        elif page == "📈 Program Overview":
            self.render_program_overview()
    
    def render_feedback_form(self):
        """Feedback submission form"""
        
        st.header("Submit Feedback")
        st.markdown("Help us improve Frontier by sharing your experience!")
        
        # Company selection
        companies = self.beta_manager.companies
        company_options = {f"{c.name} ({c.industry.value})": c.id for c in companies}
        
        selected_company = st.selectbox(
            "Select your company",
            options=list(company_options.keys())
        )
        company_id = company_options[selected_company]
        
        # Contact information
        col1, col2 = st.columns(2)
        with col1:
            submitter_name = st.text_input("Your name", placeholder="John Smith")
        with col2:
            submitter_email = st.text_input("Your email", placeholder="john@company.com")
        
        # Feedback type and priority
        col1, col2 = st.columns(2)
        with col1:
            feedback_type = st.selectbox(
                "Feedback type",
                options=[ft.value.replace('_', ' ').title() for ft in FeedbackType],
                help="What type of feedback are you providing?"
            )
        with col2:
            priority = st.selectbox(
                "Priority level",
                options=[p.value.title() for p in Priority],
                help="How urgent is this issue?"
            )
        
        # Feedback details
        title = st.text_input(
            "Title",
            placeholder="Brief description of your feedback",
            help="Provide a clear, concise title"
        )
        
        description = st.text_area(
            "Detailed description",
            placeholder="Please provide as much detail as possible...",
            height=150,
            help="Describe the issue, feature request, or feedback in detail"
        )
        
        # Additional fields based on feedback type
        if "bug" in feedback_type.lower():
            st.subheader("Bug Report Details")
            
            col1, col2 = st.columns(2)
            with col1:
                steps_to_reproduce = st.text_area(
                    "Steps to reproduce",
                    placeholder="1. Go to...\n2. Click on...\n3. See error",
                    height=100
                )
            with col2:
                expected_behavior = st.text_area(
                    "Expected behavior",
                    placeholder="What should have happened?",
                    height=100
                )
            
            actual_behavior = st.text_area(
                "Actual behavior",
                placeholder="What actually happened?",
                height=80
            )
            
            browser_info = st.text_input(
                "Browser/Environment",
                placeholder="Chrome 96, Windows 11, etc."
            )
            
            screenshot_file = st.file_uploader(
                "Screenshot (optional)",
                type=['png', 'jpg', 'jpeg'],
                help="Upload a screenshot if applicable"
            )
        
        # Feature context
        st.subheader("Feature Context")
        affected_modules = [
            "Financial Analysis",
            "Strategic Planning", 
            "Market Research",
            "Competitive Analysis",
            "Valuation Tools",
            "Industry Benchmarks",
            "Dashboard/UI",
            "API/Integrations",
            "Other"
        ]
        
        col1, col2 = st.columns(2)
        with col1:
            affected_module = st.selectbox(
                "Which module/feature?",
                options=affected_modules
            )
        with col2:
            affected_feature = st.text_input(
                "Specific feature",
                placeholder="e.g., DCF Calculator, Industry Comparison"
            )
        
        # Tags
        tags = st.multiselect(
            "Tags (optional)",
            options=[
                "ui/ux", "performance", "data-accuracy", "integration", 
                "mobile", "accessibility", "documentation", "training",
                "billing", "security", "api", "export", "collaboration"
            ],
            help="Add relevant tags to categorize your feedback"
        )
        
        # Impact assessment
        st.subheader("Impact Assessment")
        col1, col2, col3 = st.columns(3)
        
        with col1:
            user_impact = st.selectbox(
                "User impact",
                options=["Low", "Medium", "High", "Blocker"],
                help="How does this affect your ability to use Frontier?"
            )
        
        with col2:
            business_impact = st.selectbox(
                "Business impact", 
                options=["Low", "Medium", "High"],
                help="How does this affect your business processes?"
            )
        
        with col3:
            urgency = st.selectbox(
                "Urgency",
                options=["Can wait", "Soon", "This week", "ASAP"],
                help="When do you need this addressed?"
            )
        
        # Submit button
        st.markdown("---")
        if st.button("Submit Feedback", type="primary"):
            if not all([submitter_name, submitter_email, title, description]):
                st.error("Please fill in all required fields (name, email, title, description)")
            else:
                try:
                    # Convert string values back to enums
                    feedback_type_enum = FeedbackType[feedback_type.upper().replace(' ', '_')]
                    priority_enum = Priority[priority.upper()]
                    
                    # Prepare additional data
                    additional_data = {
                        "affected_module": affected_module,
                        "affected_feature": affected_feature,
                        "tags": tags,
                        "user_impact": user_impact.lower(),
                        "business_impact": business_impact.lower()
                    }
                    
                    # Add bug-specific fields if applicable
                    if "bug" in feedback_type.lower():
                        additional_data.update({
                            "steps_to_reproduce": steps_to_reproduce,
                            "expected_behavior": expected_behavior,
                            "actual_behavior": actual_behavior,
                            "browser_info": browser_info
                        })
                    
                    # Submit feedback
                    feedback_item = self.beta_manager.submit_feedback(
                        company_id=company_id,
                        submitter_name=submitter_name,
                        submitter_email=submitter_email,
                        feedback_type=feedback_type_enum,
                        priority=priority_enum,
                        title=title,
                        description=description,
                        **additional_data
                    )
                    
                    st.success(f"✅ Feedback submitted successfully! ID: {feedback_item.id}")
                    st.balloons()
                    
                    # Show what happens next
                    st.info(f"""
                    **What happens next:**
                    - You'll receive an email confirmation within 30 minutes
                    - Our team will review your feedback within 24 hours
                    - For {priority.lower()} priority items, expect initial response within: 
                      {self.get_response_sla(priority)}
                    - You can track status updates in your company dashboard
                    """)
                    
                except Exception as e:
                    st.error(f"Error submitting feedback: {str(e)}")
    
    def get_response_sla(self, priority: str) -> str:
        """Get SLA response time for priority level"""
        sla_map = {
            "Critical": "4 hours",
            "High": "24 hours", 
            "Medium": "72 hours",
            "Low": "1 week"
        }
        return sla_map.get(priority, "1 week")
    
    def render_feedback_analytics(self):
        """Feedback analytics dashboard"""
        
        st.header("📊 Feedback Analytics")
        
        feedback_items = self.beta_manager.feedback_items
        
        if not feedback_items:
            st.info("No feedback submitted yet. Encourage beta users to submit feedback!")
            return
        
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Feedback", len(feedback_items))
        
        with col2:
            open_items = len([f for f in feedback_items if f.status == "open"])
            st.metric("Open Items", open_items)
        
        with col3:
            resolved_items = len([f for f in feedback_items if f.status == "resolved"])
            resolution_rate = (resolved_items / len(feedback_items)) * 100 if feedback_items else 0
            st.metric("Resolution Rate", f"{resolution_rate:.1f}%")
        
        with col4:
            high_priority = len([f for f in feedback_items if f.priority in [Priority.CRITICAL, Priority.HIGH]])
            st.metric("High Priority", high_priority)
        
        st.markdown("---")
        
        # Feedback by type
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Feedback by Type")
            type_counts = {}
            for item in feedback_items:
                feedback_type = item.feedback_type.value.replace('_', ' ').title()
                type_counts[feedback_type] = type_counts.get(feedback_type, 0) + 1
            
            if type_counts:
                fig = px.pie(
                    values=list(type_counts.values()),
                    names=list(type_counts.keys()),
                    title="Distribution of Feedback Types"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.subheader("Feedback by Priority")
            priority_counts = {}
            for item in feedback_items:
                priority = item.priority.value.title()
                priority_counts[priority] = priority_counts.get(priority, 0) + 1
            
            if priority_counts:
                fig = px.bar(
                    x=list(priority_counts.keys()),
                    y=list(priority_counts.values()),
                    title="Feedback by Priority Level",
                    color=list(priority_counts.values()),
                    color_continuous_scale="Reds"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        # Recent feedback timeline
        st.subheader("Feedback Timeline")
        
        # Create timeline data
        df_data = []
        for item in feedback_items:
            df_data.append({
                'Date': item.submission_date,
                'Type': item.feedback_type.value.replace('_', ' ').title(),
                'Priority': item.priority.value.title(),
                'Company': item.company_id,
                'Title': item.title
            })
        
        if df_data:
            df = pd.DataFrame(df_data)
            df['Date'] = pd.to_datetime(df['Date'])
            
            # Group by date
            daily_counts = df.groupby(df['Date'].dt.date).size().reset_index()
            daily_counts.columns = ['Date', 'Count']
            
            fig = px.line(
                daily_counts,
                x='Date',
                y='Count',
                title="Daily Feedback Submissions",
                markers=True
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Recent feedback table
        st.subheader("Recent Feedback Items")
        
        # Display recent items
        recent_items = sorted(feedback_items, key=lambda x: x.submission_date, reverse=True)[:10]
        
        display_data = []
        for item in recent_items:
            company_name = next((c.name for c in self.beta_manager.companies if c.id == item.company_id), "Unknown")
            
            display_data.append({
                "ID": item.id,
                "Company": company_name,
                "Type": item.feedback_type.value.replace('_', ' ').title(),
                "Priority": item.priority.value.title(),
                "Title": item.title,
                "Status": item.status.title(),
                "Submitted": item.submission_date.strftime("%Y-%m-%d %H:%M")
            })
        
        if display_data:
            df_display = pd.DataFrame(display_data)
            st.dataframe(df_display, use_container_width=True)
    
    def render_company_dashboard(self):
        """Company-specific dashboard"""
        
        st.header("👥 Company Dashboard")
        
        companies = self.beta_manager.companies
        if not companies:
            st.info("No companies in beta program yet.")
            return
        
        # Company selector
        company_options = {f"{c.name} ({c.industry.value})": c for c in companies}
        selected_company_name = st.selectbox(
            "Select a company",
            options=list(company_options.keys())
        )
        selected_company = company_options[selected_company_name]
        
        # Company overview
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.subheader("Company Info")
            st.write(f"**Industry:** {selected_company.industry.value.title()}")
            st.write(f"**Size:** {selected_company.size.value.title()}")
            st.write(f"**Location:** {selected_company.location}")
            st.write(f"**Status:** {selected_company.status.value.title()}")
        
        with col2:
            st.subheader("Engagement")
            st.metric("Total Sessions", selected_company.total_sessions)
            st.metric("API Calls", selected_company.api_calls_count)
            if selected_company.last_login_date:
                last_login = selected_company.last_login_date.strftime("%Y-%m-%d")
                st.write(f"**Last Login:** {last_login}")
        
        with col3:
            st.subheader("Business Value")
            st.metric("Expected Annual Value", f"${selected_company.expected_annual_value:,.0f}")
            st.metric("Conversion Probability", f"{selected_company.probability_to_convert*100:.0f}%")
            st.metric("Timeline (months)", selected_company.conversion_timeline_months)
        
        # Features used
        if selected_company.features_used:
            st.subheader("Features Used")
            features_df = pd.DataFrame({
                'Feature': selected_company.features_used,
                'Used': ['✅'] * len(selected_company.features_used)
            })
            st.dataframe(features_df, use_container_width=True)
        
        # Company feedback
        company_feedback = [f for f in self.beta_manager.feedback_items if f.company_id == selected_company.id]
        
        if company_feedback:
            st.subheader(f"Feedback from {selected_company.name}")
            
            # Feedback metrics
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Feedback", len(company_feedback))
            with col2:
                open_feedback = len([f for f in company_feedback if f.status == "open"])
                st.metric("Open Items", open_feedback)
            with col3:
                avg_priority = "Medium"  # Could calculate actual average
                st.metric("Avg Priority", avg_priority)
            
            # Feedback list
            feedback_data = []
            for item in sorted(company_feedback, key=lambda x: x.submission_date, reverse=True):
                feedback_data.append({
                    "ID": item.id,
                    "Type": item.feedback_type.value.replace('_', ' ').title(),
                    "Priority": item.priority.value.title(),
                    "Title": item.title,
                    "Status": item.status.title(),
                    "Submitted": item.submission_date.strftime("%Y-%m-%d")
                })
            
            if feedback_data:
                st.dataframe(pd.DataFrame(feedback_data), use_container_width=True)
        else:
            st.info("No feedback submitted by this company yet.")
        
        # Contact information
        st.subheader("Contact Information")
        col1, col2 = st.columns(2)
        
        with col1:
            st.write(f"**Primary Contact:** {selected_company.primary_contact_name}")
            st.write(f"**Email:** {selected_company.primary_contact_email}")
            st.write(f"**Phone:** {selected_company.primary_contact_phone}")
        
        with col2:
            if selected_company.assigned_success_manager:
                st.write(f"**Success Manager:** {selected_company.assigned_success_manager}")
            st.write(f"**Website:** [{selected_company.website}]({selected_company.website})")
    
    def render_weekly_sessions(self):
        """Weekly sessions management"""
        
        st.header("📅 Weekly Feedback Sessions")
        
        sessions = self.beta_manager.weekly_sessions
        
        if not sessions:
            st.info("No weekly sessions scheduled yet.")
            return
        
        # Session selector
        session_options = {f"Session {s.id} - {s.session_date.strftime('%Y-%m-%d')}": s for s in sessions}
        selected_session_name = st.selectbox(
            "Select a session",
            options=list(session_options.keys())
        )
        selected_session = session_options[selected_session_name]
        
        # Session details
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Session Info")
            st.write(f"**Date:** {selected_session.session_date.strftime('%Y-%m-%d %H:%M')}")
            st.write(f"**Duration:** {selected_session.duration_minutes} minutes")
            st.write(f"**Attendees:** {len(selected_session.attendees)}")
        
        with col2:
            st.subheader("Status")
            has_notes = bool(selected_session.session_notes)
            has_attendees = bool(selected_session.attendees)
            
            status = "✅ Completed" if has_notes and has_attendees else "⏳ Scheduled"
            st.write(f"**Status:** {status}")
            
            if selected_session.next_session_date:
                next_date = selected_session.next_session_date.strftime('%Y-%m-%d')
                st.write(f"**Next Session:** {next_date}")
        
        # Agenda
        st.subheader("Agenda")
        for i, item in enumerate(selected_session.agenda_items, 1):
            st.write(f"{i}. {item}")
        
        # Attendees
        if selected_session.attendees:
            st.subheader("Attendees")
            attendees_df = pd.DataFrame(selected_session.attendees)
            st.dataframe(attendees_df, use_container_width=True)
        
        # Key feedback
        if selected_session.key_feedback:
            st.subheader("Key Feedback")
            for feedback in selected_session.key_feedback:
                st.write(f"• {feedback}")
        
        # Action items
        if selected_session.action_items:
            st.subheader("Action Items")
            for item in selected_session.action_items:
                st.write(f"• {item}")
        
        # Session notes
        if selected_session.session_notes:
            st.subheader("Session Notes")
            st.text_area(
                "Notes",
                value=selected_session.session_notes,
                height=200,
                disabled=True
            )
    
    def render_program_overview(self):
        """Program overview and analytics"""
        
        st.header("📈 Beta Program Overview")
        
        analytics = self.beta_manager.generate_beta_program_analytics()
        
        # Key metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Total Companies",
                analytics["program_overview"]["total_companies"]
            )
        
        with col2:
            st.metric(
                "Active Companies", 
                analytics["program_overview"]["active_companies"]
            )
        
        with col3:
            st.metric(
                "Activation Rate",
                f"{analytics['program_overview']['activation_rate']:.1f}%"
            )
        
        with col4:
            st.metric(
                "Total Feedback",
                analytics["feedback_analytics"]["total_feedback_items"]
            )
        
        st.markdown("---")
        
        # Industry and size distribution
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("Industry Distribution")
            if analytics["industry_distribution"]:
                fig = px.pie(
                    values=list(analytics["industry_distribution"].values()),
                    names=[name.replace('_', ' ').title() for name in analytics["industry_distribution"].keys()],
                    title="Companies by Industry"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            st.subheader("Company Size Distribution")
            if analytics["company_size_distribution"]:
                fig = px.bar(
                    x=[size.title() for size in analytics["company_size_distribution"].keys()],
                    y=list(analytics["company_size_distribution"].values()),
                    title="Companies by Size",
                    color=list(analytics["company_size_distribution"].values()),
                    color_continuous_scale="Blues"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        # Pipeline analytics
        st.subheader("💰 Pipeline Analytics")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.metric(
                "Total Pipeline Value",
                f"${analytics['conversion_pipeline']['total_pipeline_value']:,.0f}"
            )
        
        with col2:
            st.metric(
                "Weighted Pipeline",
                f"${analytics['conversion_pipeline']['weighted_pipeline_value']:,.0f}"
            )
        
        with col3:
            avg_deal_size = analytics['conversion_pipeline']['total_pipeline_value'] / max(1, analytics['program_overview']['total_companies'])
            st.metric(
                "Avg Deal Size",
                f"${avg_deal_size:,.0f}"
            )
        
        # Conversion probability distribution
        if analytics["conversion_pipeline"]["conversion_probability_distribution"]:
            st.subheader("Conversion Probability Distribution")
            prob_dist = analytics["conversion_pipeline"]["conversion_probability_distribution"]
            
            fig = px.bar(
                x=list(prob_dist.keys()),
                y=list(prob_dist.values()),
                title="Companies by Conversion Probability",
                labels={"x": "Probability Range", "y": "Number of Companies"},
                color=list(prob_dist.values()),
                color_continuous_scale="Greens"
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Success metrics
        st.subheader("🎯 Success Metrics")
        
        # Most used features
        if analytics["engagement_metrics"]["most_used_features"]:
            st.write("**Top Features by Usage:**")
            for feature, count in analytics["engagement_metrics"]["most_used_features"][:5]:
                st.write(f"• {feature}: {count} companies")
        
        # Geographic distribution
        if analytics["geographic_distribution"]:
            st.write("**Geographic Distribution:**")
            for location, count in analytics["geographic_distribution"].items():
                st.write(f"• {location}: {count} companies")

def main():
    """Main Streamlit app"""
    
    st.set_page_config(
        page_title="Frontier Beta Program",
        page_icon="🚀",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Custom CSS
    st.markdown("""
    <style>
    .main-header {
        font-size: 2.5rem;
        color: #1f77b4;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Initialize feedback system
    feedback_system = FeedbackCollectionSystem()
    feedback_system.render_feedback_dashboard()

if __name__ == "__main__":
    main()
