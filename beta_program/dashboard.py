"""
Beta Program Comprehensive Dashboard
Main dashboard for monitoring and managing the complete beta program
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json

from beta_manager import BetaProgramManager
from company_selection import CompanySelectionEngine
from weekly_sessions import WeeklySessionManager
from rapid_iteration import RapidIterationEngine
from case_studies import CaseStudyManager

class BetaProgramDashboard:
    """Comprehensive beta program dashboard"""
    
    def __init__(self):
        # Initialize all managers
        self.beta_manager = BetaProgramManager()
        self.selection_engine = CompanySelectionEngine()
        self.session_manager = WeeklySessionManager()
        self.iteration_engine = RapidIterationEngine()
        self.case_study_manager = CaseStudyManager()
    
    def render_main_dashboard(self):
        """Render main dashboard"""
        
        st.set_page_config(
            page_title="Frontier Beta Program Dashboard",
            page_icon="🚀",
            layout="wide",
            initial_sidebar_state="expanded"
        )
        
        # Custom CSS
        st.markdown("""
        <style>
        .main-header {
            background: linear-gradient(90deg, #1f77b4, #ff7f0e);
            color: white;
            padding: 1rem;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 2rem;
        }
        .metric-card {
            background-color: #f8f9fa;
            padding: 1.5rem;
            border-radius: 10px;
            border-left: 4px solid #1f77b4;
            margin: 0.5rem 0;
        }
        .success-card {
            background-color: #d4edda;
            border-color: #c3e6cb;
            color: #155724;
        }
        .warning-card {
            background-color: #fff3cd;
            border-color: #ffeaa7;
            color: #856404;
        }
        .info-card {
            background-color: #d1ecf1;
            border-color: #bee5eb;
            color: #0c5460;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Main header
        st.markdown("""
        <div class="main-header">
            <h1>🚀 Frontier Beta Program Dashboard</h1>
            <p>Comprehensive beta testing program management and analytics</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Sidebar navigation
        st.sidebar.title("Navigation")
        page = st.sidebar.selectbox("Choose a section", [
            "📊 Program Overview",
            "🎯 Company Selection",
            "📝 Feedback Management",
            "📅 Weekly Sessions",
            "⚡ Rapid Iteration",
            "📖 Case Studies",
            "📈 Analytics & Reports"
        ])
        
        # Page routing
        if page == "📊 Program Overview":
            self.render_program_overview()
        elif page == "🎯 Company Selection":
            self.render_company_selection()
        elif page == "📝 Feedback Management":
            self.render_feedback_management()
        elif page == "📅 Weekly Sessions":
            self.render_weekly_sessions()
        elif page == "⚡ Rapid Iteration":
            self.render_rapid_iteration()
        elif page == "📖 Case Studies":
            self.render_case_studies()
        elif page == "📈 Analytics & Reports":
            self.render_analytics_reports()
    
    def render_program_overview(self):
        """Render program overview"""
        
        st.header("📊 Program Overview")
        
        # Get analytics
        analytics = self.beta_manager.generate_beta_program_analytics()
        
        # Key metrics row
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Total Companies",
                analytics["program_overview"]["total_companies"],
                delta=f"+{analytics['program_overview']['active_companies']} active"
            )
        
        with col2:
            st.metric(
                "Activation Rate",
                f"{analytics['program_overview']['activation_rate']:.1f}%",
                delta="Target: 80%"
            )
        
        with col3:
            st.metric(
                "Total Feedback",
                analytics["feedback_analytics"]["total_feedback_items"],
                delta=f"{analytics['feedback_analytics']['resolution_rate']:.1f}% resolved"
            )
        
        with col4:
            st.metric(
                "Pipeline Value",
                f"${analytics['conversion_pipeline']['weighted_pipeline_value']:,.0f}",
                delta=f"Total: ${analytics['conversion_pipeline']['total_pipeline_value']:,.0f}"
            )
        
        st.markdown("---")
        
        # Program status cards
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("""
            <div class="metric-card success-card">
                <h3>✅ Program Health</h3>
                <ul>
                    <li>15 companies onboarded</li>
                    <li>High engagement levels</li>
                    <li>Regular feedback flow</li>
                    <li>Weekly sessions running</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
        
        with col2:
            st.markdown("""
            <div class="metric-card warning-card">
                <h3>⚠️ Action Items</h3>
                <ul>
                    <li>Follow up with 3 inactive companies</li>
                    <li>Review high-priority feedback</li>
                    <li>Schedule case study interviews</li>
                    <li>Update product roadmap</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
        
        with col3:
            st.markdown("""
            <div class="metric-card info-card">
                <h3>📅 This Week</h3>
                <ul>
                    <li>Weekly session: Friday 2 PM</li>
                    <li>Sprint demo preparation</li>
                    <li>New feature rollout</li>
                    <li>Feedback analysis review</li>
                </ul>
            </div>
            """, unsafe_allow_html=True)
        
        # Charts
        col1, col2 = st.columns(2)
        
        with col1:
            # Industry distribution
            if analytics["industry_distribution"]:
                fig = px.pie(
                    values=list(analytics["industry_distribution"].values()),
                    names=[name.replace('_', ' ').title() for name in analytics["industry_distribution"].keys()],
                    title="Companies by Industry"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Conversion probability
            if analytics["conversion_pipeline"]["conversion_probability_distribution"]:
                prob_dist = analytics["conversion_pipeline"]["conversion_probability_distribution"]
                fig = px.bar(
                    x=list(prob_dist.keys()),
                    y=list(prob_dist.values()),
                    title="Conversion Probability Distribution",
                    color=list(prob_dist.values()),
                    color_continuous_scale="Greens"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        # Recent activity
        st.subheader("📈 Recent Activity")
        
        # Mock recent activity data
        recent_activities = [
            {"date": "2024-01-15", "activity": "New company onboarded", "company": "CloudScale Solutions", "type": "success"},
            {"date": "2024-01-14", "activity": "Critical feedback received", "company": "DataFlow AI", "type": "warning"},
            {"date": "2024-01-13", "activity": "Weekly session conducted", "company": "All participants", "type": "info"},
            {"date": "2024-01-12", "activity": "Feature implemented", "company": "System update", "type": "success"},
            {"date": "2024-01-11", "activity": "Case study interview", "company": "Regional Investment", "type": "info"}
        ]
        
        for activity in recent_activities:
            icon = "✅" if activity["type"] == "success" else "⚠️" if activity["type"] == "warning" else "ℹ️"
            st.write(f"{icon} **{activity['date']}** - {activity['activity']} ({activity['company']})")
    
    def render_company_selection(self):
        """Render company selection interface"""
        
        st.header("🎯 Company Selection & Outreach")
        
        # Generate target companies button
        if st.button("🔄 Generate New Target Companies"):
            with st.spinner("Generating target companies..."):
                self.selection_engine.generate_target_company_list()
                st.success("Target companies generated!")
        
        # Selection report
        if st.button("📊 Generate Selection Report"):
            report = self.selection_engine.generate_selection_report()
            
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                st.metric("Total Leads", report["summary"]["total_leads"])
            with col2:
                st.metric("Qualified Leads", report["summary"]["qualified_leads"])
            with col3:
                st.metric("Qualification Rate", f"{report['summary']['qualification_rate']:.1f}%")
            with col4:
                st.metric("Pipeline Value", f"${report['summary']['total_pipeline_value']:,.0f}")
            
            # Top prospects
            st.subheader("🌟 Top Prospects")
            if report["top_prospects"]:
                prospects_df = pd.DataFrame(report["top_prospects"])
                st.dataframe(prospects_df, use_container_width=True)
        
        # Outreach management
        st.subheader("📧 Outreach Management")
        
        leads = self.selection_engine.company_leads
        if leads:
            lead_names = [f"{lead.name} ({lead.industry.value})" for lead in leads]
            selected_lead_name = st.selectbox("Select lead for outreach", lead_names)
            
            if selected_lead_name:
                selected_lead = leads[lead_names.index(selected_lead_name)]
                
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write("**Lead Information:**")
                    st.write(f"Industry: {selected_lead.industry.value}")
                    st.write(f"Size: {selected_lead.size.value}")
                    st.write(f"Fit Score: {selected_lead.fit_score:.1f}")
                    st.write(f"Contact: {selected_lead.primary_contact_name}")
                
                with col2:
                    if st.button("Generate Invitation Email"):
                        email_template = self.selection_engine.create_invitation_email_template(selected_lead)
                        st.subheader("Email Template")
                        st.write(f"**Subject:** {email_template['subject']}")
                        st.text_area("Email Body", email_template['body'], height=300)
    
    def render_feedback_management(self):
        """Render feedback management interface"""
        
        st.header("📝 Feedback Management")
        
        feedback_items = self.beta_manager.feedback_items
        
        if not feedback_items:
            st.info("No feedback items yet. Encourage beta users to submit feedback!")
            return
        
        # Feedback metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Feedback", len(feedback_items))
        
        with col2:
            open_items = len([f for f in feedback_items if f.status == "open"])
            st.metric("Open Items", open_items)
        
        with col3:
            high_priority = len([f for f in feedback_items if f.priority.value in ['high', 'critical']])
            st.metric("High Priority", high_priority)
        
        with col4:
            resolved_items = len([f for f in feedback_items if f.status == "resolved"])
            resolution_rate = (resolved_items / len(feedback_items)) * 100 if feedback_items else 0
            st.metric("Resolution Rate", f"{resolution_rate:.1f}%")
        
        # Feedback prioritization
        st.subheader("🎯 Feedback Prioritization")
        
        if st.button("Analyze & Prioritize Feedback"):
            with st.spinner("Analyzing feedback..."):
                # Get recent open feedback
                open_feedback_ids = [f.id for f in feedback_items if f.status == "open"][:10]
                
                if open_feedback_ids:
                    prioritized = self.iteration_engine.prioritize_feedback_items(open_feedback_ids)
                    
                    # Display prioritized feedback
                    priority_data = []
                    for feedback_id, rice_score in prioritized:
                        feedback_item = next((f for f in feedback_items if f.id == feedback_id), None)
                        if feedback_item:
                            priority_data.append({
                                "ID": feedback_id,
                                "Title": feedback_item.title,
                                "Type": feedback_item.feedback_type.value.replace('_', ' ').title(),
                                "Priority": feedback_item.priority.value.title(),
                                "RICE Score": f"{rice_score:.1f}",
                                "Company": feedback_item.company_id
                            })
                    
                    if priority_data:
                        st.subheader("📊 Prioritized Feedback (RICE Scoring)")
                        df = pd.DataFrame(priority_data)
                        st.dataframe(df, use_container_width=True)
                else:
                    st.info("No open feedback items to prioritize.")
        
        # Recent feedback
        st.subheader("📋 Recent Feedback")
        recent_feedback = sorted(feedback_items, key=lambda x: x.submission_date, reverse=True)[:10]
        
        for feedback in recent_feedback:
            with st.expander(f"{feedback.title} - {feedback.feedback_type.value.replace('_', ' ').title()}"):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write(f"**Priority:** {feedback.priority.value.title()}")
                    st.write(f"**Status:** {feedback.status.title()}")
                    st.write(f"**Company:** {feedback.company_id}")
                    st.write(f"**Submitted:** {feedback.submission_date.strftime('%Y-%m-%d')}")
                
                with col2:
                    st.write(f"**Affected Module:** {feedback.affected_module}")
                    st.write(f"**User Impact:** {feedback.user_impact}")
                    st.write(f"**Tags:** {', '.join(feedback.tags) if feedback.tags else 'None'}")
                
                st.write("**Description:**")
                st.write(feedback.description)
    
    def render_weekly_sessions(self):
        """Render weekly sessions interface"""
        
        st.header("📅 Weekly Sessions")
        
        sessions = self.beta_manager.weekly_sessions
        
        if not sessions:
            st.info("No sessions scheduled yet.")
            if st.button("Create Session Schedule"):
                with st.spinner("Creating session schedule..."):
                    start_date = datetime.now() + timedelta(days=7)
                    new_sessions = self.session_manager.create_session_schedule(start_date, 12)
                    st.success(f"Created {len(new_sessions)} weekly sessions!")
                    st.experimental_rerun()
            return
        
        # Session metrics
        conducted_sessions = [s for s in sessions if s.attendees]
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Sessions", len(sessions))
        
        with col2:
            st.metric("Conducted Sessions", len(conducted_sessions))
        
        with col3:
            avg_attendance = sum(len(s.attendees) for s in conducted_sessions) / len(conducted_sessions) if conducted_sessions else 0
            st.metric("Avg Attendance", f"{avg_attendance:.1f}")
        
        with col4:
            total_feedback = sum(len(s.key_feedback) for s in conducted_sessions)
            st.metric("Feedback Collected", total_feedback)
        
        # Upcoming sessions
        st.subheader("📅 Upcoming Sessions")
        
        upcoming_sessions = [s for s in sessions if s.session_date > datetime.now()][:3]
        
        for session in upcoming_sessions:
            with st.expander(f"Session {session.id} - {session.session_date.strftime('%Y-%m-%d %H:%M')}"):
                st.write(f"**Duration:** {session.duration_minutes} minutes")
                st.write("**Agenda:**")
                for item in session.agenda_items:
                    st.write(f"• {item}")
                
                if st.button(f"Generate Prep Materials for {session.id}"):
                    prep_materials = self.session_manager.conduct_session_prep(session.id)
                    st.json(prep_materials)
        
        # Session analytics
        if conducted_sessions:
            st.subheader("📊 Session Analytics")
            
            # Attendance trend
            attendance_data = []
            for session in conducted_sessions:
                attendance_data.append({
                    "Date": session.session_date.strftime("%Y-%m-%d"),
                    "Attendees": len(session.attendees),
                    "Feedback Items": len(session.key_feedback)
                })
            
            if attendance_data:
                df = pd.DataFrame(attendance_data)
                fig = px.line(df, x="Date", y="Attendees", title="Session Attendance Trend", markers=True)
                st.plotly_chart(fig, use_container_width=True)
    
    def render_rapid_iteration(self):
        """Render rapid iteration interface"""
        
        st.header("⚡ Rapid Iteration")
        
        # Iteration analytics
        analytics = self.iteration_engine.generate_iteration_analytics()
        
        if "error" not in analytics:
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.metric(
                    "Total Cycles", 
                    analytics["cycle_performance"]["total_cycles"]
                )
            
            with col2:
                st.metric(
                    "Avg Velocity",
                    f"{analytics['cycle_performance']['average_velocity']:.1f} pts"
                )
            
            with col3:
                st.metric(
                    "Features Implemented",
                    analytics["feature_delivery"]["total_features_implemented"]
                )
            
            with col4:
                st.metric(
                    "Feedback Analyzed",
                    analytics["feedback_response"]["total_feedback_analyzed"]
                )
        
        # Create new iteration cycle
        st.subheader("🔄 Create New Iteration Cycle")
        
        col1, col2 = st.columns(2)
        
        with col1:
            cycle_number = st.number_input("Cycle Number", min_value=1, value=1)
            start_date = st.date_input("Start Date", value=datetime.now().date())
        
        with col2:
            if st.button("Create Iteration Cycle"):
                with st.spinner("Creating iteration cycle..."):
                    cycle = self.iteration_engine.create_iteration_cycle(
                        cycle_number, 
                        datetime.combine(start_date, datetime.min.time())
                    )
                    st.success(f"Created cycle {cycle.id}!")
        
        # Feature implementation tracking
        st.subheader("🎯 Feature Implementation")
        
        features = self.iteration_engine.feature_implementations
        
        if features:
            feature_data = []
            for feature in features[-10:]:  # Show latest 10 features
                feature_data.append({
                    "ID": feature.id,
                    "Title": feature.title,
                    "Status": feature.status.value.title(),
                    "Priority": f"{feature.priority_score:.1f}",
                    "Effort": feature.effort_estimate.title(),
                    "Business Impact": feature.business_impact.value.title(),
                    "User Impact": feature.user_impact.value.title()
                })
            
            df = pd.DataFrame(feature_data)
            st.dataframe(df, use_container_width=True)
        else:
            st.info("No features in development yet.")
    
    def render_case_studies(self):
        """Render case studies interface"""
        
        st.header("📖 Case Studies")
        
        # Identify candidates
        if st.button("🎯 Identify Case Study Candidates"):
            with st.spinner("Identifying candidates..."):
                candidates = self.case_study_manager.identify_case_study_candidates()
                
                if candidates:
                    st.subheader("🌟 Top Case Study Candidates")
                    
                    for candidate in candidates[:5]:
                        with st.expander(f"{candidate['company_name']} - Score: {candidate['engagement_score']}"):
                            col1, col2 = st.columns(2)
                            
                            with col1:
                                st.write(f"**Industry:** {candidate['industry']}")
                                st.write(f"**Size:** {candidate['size']}")
                                st.write(f"**Sessions:** {candidate['total_sessions']}")
                                st.write(f"**Features Used:** {candidate['features_used']}")
                            
                            with col2:
                                st.write(f"**Conversion Prob:** {candidate['conversion_probability']*100:.0f}%")
                                st.write(f"**Expected Value:** ${candidate['expected_value']:,.0f}")
                                st.write(f"**Template:** {candidate['recommended_template'].value}")
                            
                            st.write("**Potential ROI Story:**")
                            roi_story = candidate['potential_roi_story']
                            st.write(f"• Time Savings: {roi_story['estimated_monthly_time_savings']}")
                            st.write(f"• Cost Savings: {roi_story['estimated_annual_cost_savings']}")
                            st.write(f"• Efficiency Gain: {roi_story['estimated_efficiency_gain']}")
                            
                            if st.button(f"Create Case Study for {candidate['company_name']}", key=candidate['company_id']):
                                outline = self.case_study_manager.create_case_study_outline(
                                    candidate['company_id'],
                                    candidate['recommended_template']
                                )
                                st.success(f"Case study outline created: {outline['title']}")
                else:
                    st.info("No suitable case study candidates found. Companies need higher engagement scores.")
        
        # Case study analytics
        analytics = self.case_study_manager.generate_case_study_analytics()
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Case Studies", analytics["program_overview"]["total_case_studies"])
        
        with col2:
            st.metric("Published", analytics["program_overview"]["published_case_studies"])
        
        with col3:
            st.metric("Interviews Conducted", analytics["program_overview"]["interviews_conducted"])
        
        with col4:
            st.metric("Companies Featured", analytics["program_overview"]["companies_featured"])
    
    def render_analytics_reports(self):
        """Render analytics and reports"""
        
        st.header("📈 Analytics & Reports")
        
        # Report type selector
        report_type = st.selectbox("Select Report Type", [
            "Program Overview Report",
            "Company Engagement Report", 
            "Feedback Analysis Report",
            "ROI Impact Report",
            "Conversion Pipeline Report"
        ])
        
        if report_type == "Program Overview Report":
            self.render_program_overview_report()
        elif report_type == "Company Engagement Report":
            self.render_company_engagement_report()
        elif report_type == "Feedback Analysis Report":
            self.render_feedback_analysis_report()
        elif report_type == "ROI Impact Report":
            self.render_roi_impact_report()
        elif report_type == "Conversion Pipeline Report":
            self.render_conversion_pipeline_report()
    
    def render_program_overview_report(self):
        """Render program overview report"""
        
        st.subheader("📊 Program Overview Report")
        
        analytics = self.beta_manager.generate_beta_program_analytics()
        
        # Executive summary
        st.write("**Executive Summary:**")
        st.write(f"""
        The Frontier Beta Program currently includes {analytics['program_overview']['total_companies']} companies 
        across {len(analytics['industry_distribution'])} industries with an activation rate of 
        {analytics['program_overview']['activation_rate']:.1f}%. The program has collected 
        {analytics['feedback_analytics']['total_feedback_items']} feedback items and generated a 
        weighted pipeline value of ${analytics['conversion_pipeline']['weighted_pipeline_value']:,.0f}.
        """)
        
        # Key metrics table
        st.write("**Key Metrics:**")
        metrics_data = {
            "Metric": [
                "Total Companies",
                "Active Companies", 
                "Activation Rate",
                "Total Feedback Items",
                "Feedback Resolution Rate",
                "Total Pipeline Value",
                "Weighted Pipeline Value"
            ],
            "Value": [
                analytics['program_overview']['total_companies'],
                analytics['program_overview']['active_companies'],
                f"{analytics['program_overview']['activation_rate']:.1f}%",
                analytics['feedback_analytics']['total_feedback_items'],
                f"{analytics['feedback_analytics']['resolution_rate']:.1f}%",
                f"${analytics['conversion_pipeline']['total_pipeline_value']:,.0f}",
                f"${analytics['conversion_pipeline']['weighted_pipeline_value']:,.0f}"
            ]
        }
        
        df = pd.DataFrame(metrics_data)
        st.dataframe(df, use_container_width=True)
        
        # Export report
        if st.button("📥 Export Report as JSON"):
            report_data = {
                "report_type": "Program Overview",
                "generated_date": datetime.now().isoformat(),
                "analytics": analytics
            }
            st.download_button(
                label="Download JSON Report",
                data=json.dumps(report_data, indent=2, default=str),
                file_name=f"beta_program_overview_{datetime.now().strftime('%Y%m%d')}.json",
                mime="application/json"
            )
    
    def render_company_engagement_report(self):
        """Render company engagement report"""
        
        st.subheader("👥 Company Engagement Report")
        
        companies = self.beta_manager.companies
        
        engagement_data = []
        for company in companies:
            engagement_data.append({
                "Company": company.name,
                "Industry": company.industry.value if hasattr(company.industry, 'value') else company.industry,
                "Status": company.status.value if hasattr(company.status, 'value') else company.status,
                "Total Sessions": company.total_sessions,
                "Features Used": len(company.features_used),
                "API Calls": company.api_calls_count,
                "Last Login": company.last_login_date.strftime("%Y-%m-%d") if company.last_login_date else "Never",
                "Expected Value": f"${company.expected_annual_value:,.0f}",
                "Conversion Prob": f"{company.probability_to_convert*100:.0f}%"
            })
        
        if engagement_data:
            df = pd.DataFrame(engagement_data)
            st.dataframe(df, use_container_width=True)
            
            # Engagement chart
            fig = px.scatter(
                df,
                x="Total Sessions",
                y="Features Used",
                size=[int(val.replace('$', '').replace(',', '')) for val in df["Expected Value"]],
                color="Industry",
                hover_data=["Company", "Conversion Prob"],
                title="Company Engagement Overview"
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No company data available.")
    
    def render_feedback_analysis_report(self):
        """Render feedback analysis report"""
        
        st.subheader("📝 Feedback Analysis Report")
        
        feedback_items = self.beta_manager.feedback_items
        
        if not feedback_items:
            st.info("No feedback data available.")
            return
        
        # Feedback by type
        type_counts = {}
        for item in feedback_items:
            feedback_type = item.feedback_type.value.replace('_', ' ').title()
            type_counts[feedback_type] = type_counts.get(feedback_type, 0) + 1
        
        # Feedback by priority
        priority_counts = {}
        for item in feedback_items:
            priority = item.priority.value.title()
            priority_counts[priority] = priority_counts.get(priority, 0) + 1
        
        col1, col2 = st.columns(2)
        
        with col1:
            if type_counts:
                fig = px.pie(
                    values=list(type_counts.values()),
                    names=list(type_counts.keys()),
                    title="Feedback by Type"
                )
                st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            if priority_counts:
                fig = px.bar(
                    x=list(priority_counts.keys()),
                    y=list(priority_counts.values()),
                    title="Feedback by Priority",
                    color=list(priority_counts.values()),
                    color_continuous_scale="Reds"
                )
                st.plotly_chart(fig, use_container_width=True)
    
    def render_roi_impact_report(self):
        """Render ROI impact report"""
        
        st.subheader("💰 ROI Impact Report")
        
        st.info("ROI impact data will be available after case studies are completed.")
        
        # Mock ROI data for demonstration
        roi_data = {
            "Company": ["CloudScale Solutions", "DataFlow AI", "Regional Investment"],
            "Implementation Cost": ["$25,000", "$8,000", "$35,000"],
            "Annual Savings": ["$75,000", "$32,000", "$120,000"],
            "ROI %": ["200%", "300%", "243%"],
            "Payback Period": ["4 months", "3 months", "3.5 months"]
        }
        
        df = pd.DataFrame(roi_data)
        st.dataframe(df, use_container_width=True)
    
    def render_conversion_pipeline_report(self):
        """Render conversion pipeline report"""
        
        st.subheader("🔄 Conversion Pipeline Report")
        
        companies = self.beta_manager.companies
        
        pipeline_data = []
        for company in companies:
            pipeline_data.append({
                "Company": company.name,
                "Expected Value": company.expected_annual_value,
                "Probability": company.probability_to_convert,
                "Weighted Value": company.expected_annual_value * company.probability_to_convert,
                "Timeline (months)": company.conversion_timeline_months,
                "Status": company.status.value if hasattr(company.status, 'value') else company.status
            })
        
        if pipeline_data:
            df = pd.DataFrame(pipeline_data)
            
            # Pipeline overview
            total_pipeline = df["Expected Value"].sum()
            weighted_pipeline = df["Weighted Value"].sum()
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Pipeline", f"${total_pipeline:,.0f}")
            with col2:
                st.metric("Weighted Pipeline", f"${weighted_pipeline:,.0f}")
            with col3:
                avg_probability = df["Probability"].mean()
                st.metric("Avg Conversion Prob", f"{avg_probability*100:.1f}%")
            
            # Pipeline chart
            fig = px.scatter(
                df,
                x="Timeline (months)",
                y="Expected Value",
                size="Weighted Value",
                color="Probability",
                hover_data=["Company"],
                title="Conversion Pipeline Overview"
            )
            st.plotly_chart(fig, use_container_width=True)
            
            st.dataframe(df, use_container_width=True)

def main():
    """Main function to run dashboard"""
    dashboard = BetaProgramDashboard()
    dashboard.render_main_dashboard()

if __name__ == "__main__":
    main()
