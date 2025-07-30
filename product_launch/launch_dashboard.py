"""
Product Launch Dashboard
Comprehensive dashboard for managing phased product launch
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import json
from launch_manager import ProductLaunchManager, LaunchPhase, LaunchStatus, TaskPriority, TaskStatus

class ProductLaunchDashboard:
    """Product launch management dashboard"""
    
    def __init__(self):
        self.launch_manager = ProductLaunchManager()
    
    def render_dashboard(self):
        """Render main launch dashboard"""
        
        st.set_page_config(
            page_title="Frontier Product Launch Dashboard",
            page_icon="🚀",
            layout="wide",
            initial_sidebar_state="expanded"
        )
        
        # Custom CSS
        st.markdown("""
        <style>
        .launch-header {
            background: linear-gradient(90deg, #FF6B6B, #4ECDC4, #45B7D1);
            color: white;
            padding: 1.5rem;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 2rem;
        }
        .metric-card {
            background-color: #f8f9fa;
            padding: 1.5rem;
            border-radius: 10px;
            border-left: 4px solid #FF6B6B;
            margin: 0.5rem 0;
        }
        .critical-task {
            background-color: #fff5f5;
            border-left: 4px solid #e53e3e;
            padding: 1rem;
            border-radius: 5px;
            margin: 0.5rem 0;
        }
        .high-task {
            background-color: #fff8e1;
            border-left: 4px solid #ff8f00;
            padding: 1rem;
            border-radius: 5px;
            margin: 0.5rem 0;
        }
        .completed-task {
            background-color: #f0fff4;
            border-left: 4px solid #38a169;
            padding: 1rem;
            border-radius: 5px;
            margin: 0.5rem 0;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Main header
        st.markdown("""
        <div class="launch-header">
            <h1>🚀 Frontier Product Launch</h1>
            <p>Week 1: Beta Soft Launch Management Dashboard</p>
        </div>
        """, unsafe_allow_html=True)
        
        # Sidebar navigation
        st.sidebar.title("Launch Navigation")
        page = st.sidebar.selectbox("Choose a section", [
            "🎯 Launch Overview",
            "📋 Task Management", 
            "📊 Metrics Tracking",
            "👥 Beta User Management",
            "📈 Performance Analytics",
            "🔄 Daily Operations",
            "📝 Launch Reports"
        ])
        
        # Page routing
        if page == "🎯 Launch Overview":
            self.render_launch_overview()
        elif page == "📋 Task Management":
            self.render_task_management()
        elif page == "📊 Metrics Tracking":
            self.render_metrics_tracking()
        elif page == "👥 Beta User Management":
            self.render_beta_user_management()
        elif page == "📈 Performance Analytics":
            self.render_performance_analytics()
        elif page == "🔄 Daily Operations":
            self.render_daily_operations()
        elif page == "📝 Launch Reports":
            self.render_launch_reports()
    
    def render_launch_overview(self):
        """Render launch overview"""
        
        st.header("🎯 Launch Overview")
        
        # Get current status
        report = self.launch_manager.generate_launch_status_report()
        current_phase = self.launch_manager.get_current_phase()
        
        if not current_phase:
            st.warning("No active launch phase found!")
            return
        
        # Key metrics row
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Phase Progress",
                f"{report['overall_progress']:.1f}%",
                delta="Week 1 Active"
            )
        
        with col2:
            st.metric(
                "Tasks Completed",
                f"{report['completed_tasks']}/{report['total_tasks']}",
                delta=f"{report['upcoming_tasks_count']} upcoming"
            )
        
        with col3:
            days_remaining = (current_phase.end_date - datetime.now()).days
            st.metric(
                "Days Remaining",
                days_remaining,
                delta="in Week 1"
            )
        
        with col4:
            # Calculate critical task completion
            critical_tasks = [task for task in current_phase.tasks if task.priority == TaskPriority.CRITICAL]
            critical_completed = len([task for task in critical_tasks if task.status == TaskStatus.COMPLETED])
            st.metric(
                "Critical Tasks",
                f"{critical_completed}/{len(critical_tasks)}",
                delta="completed"
            )
        
        st.markdown("---")
        
        # Current phase details
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📋 Current Phase: Week 1 Beta Soft Launch")
            st.write(f"**Start Date:** {current_phase.start_date.strftime('%Y-%m-%d %H:%M')}")
            st.write(f"**End Date:** {current_phase.end_date.strftime('%Y-%m-%d %H:%M')}")
            st.write(f"**Status:** {current_phase.status.value.title()}")
            
            st.write("**Target Audience:**")
            for audience in current_phase.target_audience:
                st.write(f"• {audience}")
        
        with col2:
            st.subheader("✅ Success Criteria")
            for i, criterion in enumerate(current_phase.success_criteria, 1):
                st.write(f"{i}. {criterion}")
        
        # Task priority breakdown
        st.subheader("📊 Task Breakdown by Priority")
        
        task_priority_data = {}
        for priority in TaskPriority:
            tasks_with_priority = [task for task in current_phase.tasks if task.priority == priority]
            completed_with_priority = len([task for task in tasks_with_priority if task.status == TaskStatus.COMPLETED])
            task_priority_data[priority.value.title()] = {
                "Total": len(tasks_with_priority),
                "Completed": completed_with_priority,
                "Remaining": len(tasks_with_priority) - completed_with_priority
            }
        
        # Create priority chart
        priority_df = pd.DataFrame(task_priority_data).T
        fig = px.bar(
            priority_df,
            x=priority_df.index,
            y=["Completed", "Remaining"],
            title="Task Completion by Priority",
            color_discrete_map={"Completed": "#38a169", "Remaining": "#e53e3e"}
        )
        st.plotly_chart(fig, use_container_width=True)
        
        # Urgent actions
        st.subheader("🚨 Urgent Actions Required")
        
        overdue_tasks = []
        critical_pending = []
        
        for task in current_phase.tasks:
            if task.due_date < datetime.now() and task.status != TaskStatus.COMPLETED:
                overdue_tasks.append(task)
            elif task.priority == TaskPriority.CRITICAL and task.status != TaskStatus.COMPLETED:
                critical_pending.append(task)
        
        if overdue_tasks:
            st.error(f"⚠️ {len(overdue_tasks)} overdue tasks!")
            for task in overdue_tasks:
                st.write(f"• **{task.title}** (Due: {task.due_date.strftime('%Y-%m-%d %H:%M')})")
        
        if critical_pending:
            st.warning(f"🔥 {len(critical_pending)} critical tasks pending!")
            for task in critical_pending[:3]:  # Show top 3
                st.write(f"• **{task.title}** (Due: {task.due_date.strftime('%Y-%m-%d %H:%M')})")
        
        if not overdue_tasks and not critical_pending:
            st.success("✅ No urgent actions required. Launch is on track!")
    
    def render_task_management(self):
        """Render task management interface"""
        
        st.header("📋 Task Management")
        
        current_phase = self.launch_manager.get_current_phase()
        if not current_phase:
            st.warning("No active launch phase found!")
            return
        
        # Task filters
        col1, col2, col3 = st.columns(3)
        
        with col1:
            priority_filter = st.selectbox("Filter by Priority", 
                ["All"] + [p.value.title() for p in TaskPriority])
        
        with col2:
            status_filter = st.selectbox("Filter by Status",
                ["All"] + [s.value.replace('_', ' ').title() for s in TaskStatus])
        
        with col3:
            assignee_filter = st.selectbox("Filter by Assignee",
                ["All"] + list(set(task.assigned_to for task in current_phase.tasks)))
        
        # Apply filters
        filtered_tasks = current_phase.tasks
        
        if priority_filter != "All":
            filtered_tasks = [task for task in filtered_tasks 
                            if task.priority.value.title() == priority_filter]
        
        if status_filter != "All":
            status_value = status_filter.lower().replace(' ', '_')
            filtered_tasks = [task for task in filtered_tasks 
                            if task.status.value == status_value]
        
        if assignee_filter != "All":
            filtered_tasks = [task for task in filtered_tasks 
                            if task.assigned_to == assignee_filter]
        
        # Task summary
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Total Tasks", len(filtered_tasks))
        
        with col2:
            completed = len([task for task in filtered_tasks if task.status == TaskStatus.COMPLETED])
            st.metric("Completed", completed)
        
        with col3:
            in_progress = len([task for task in filtered_tasks if task.status == TaskStatus.IN_PROGRESS])
            st.metric("In Progress", in_progress)
        
        with col4:
            not_started = len([task for task in filtered_tasks if task.status == TaskStatus.NOT_STARTED])
            st.metric("Not Started", not_started)
        
        # Task list with management options
        st.subheader("📝 Task List")
        
        for task in sorted(filtered_tasks, key=lambda x: (x.priority.value, x.due_date)):
            # Determine card style based on priority and status
            card_class = "completed-task" if task.status == TaskStatus.COMPLETED else \
                        "critical-task" if task.priority == TaskPriority.CRITICAL else \
                        "high-task" if task.priority == TaskPriority.HIGH else "metric-card"
            
            with st.expander(f"{task.title} ({task.priority.value.title()}) - {task.status.value.replace('_', ' ').title()}"):
                col1, col2 = st.columns(2)
                
                with col1:
                    st.write(f"**Description:** {task.description}")
                    st.write(f"**Assigned to:** {task.assigned_to}")
                    st.write(f"**Due Date:** {task.due_date.strftime('%Y-%m-%d %H:%M')}")
                    st.write(f"**Estimated Hours:** {task.estimated_hours}")
                    if task.actual_hours:
                        st.write(f"**Actual Hours:** {task.actual_hours}")
                    if task.dependencies:
                        st.write(f"**Dependencies:** {', '.join(task.dependencies)}")
                
                with col2:
                    # Status update
                    new_status = st.selectbox(
                        "Update Status",
                        [s.value.replace('_', ' ').title() for s in TaskStatus],
                        index=[s.value for s in TaskStatus].index(task.status.value),
                        key=f"status_{task.id}"
                    )
                    
                    notes = st.text_area(
                        "Notes",
                        value=task.notes,
                        key=f"notes_{task.id}"
                    )
                    
                    if st.button(f"Update Task", key=f"update_{task.id}"):
                        new_status_enum = TaskStatus(new_status.lower().replace(' ', '_'))
                        if self.launch_manager.update_task_status(task.id, new_status_enum, notes):
                            st.success("Task updated successfully!")
                            st.experimental_rerun()
        
        # Quick actions
        st.subheader("⚡ Quick Actions")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Mark All Critical Tasks as Started"):
                critical_tasks = [task for task in current_phase.tasks 
                                if task.priority == TaskPriority.CRITICAL and task.status == TaskStatus.NOT_STARTED]
                for task in critical_tasks:
                    self.launch_manager.update_task_status(task.id, TaskStatus.IN_PROGRESS)
                st.success(f"Started {len(critical_tasks)} critical tasks!")
                st.experimental_rerun()
        
        with col2:
            if st.button("Generate Task Summary Report"):
                # Generate and download task report
                task_data = []
                for task in current_phase.tasks:
                    task_data.append({
                        "Title": task.title,
                        "Priority": task.priority.value.title(),
                        "Status": task.status.value.replace('_', ' ').title(),
                        "Assigned To": task.assigned_to,
                        "Due Date": task.due_date.strftime('%Y-%m-%d %H:%M'),
                        "Estimated Hours": task.estimated_hours,
                        "Actual Hours": task.actual_hours or "N/A"
                    })
                
                df = pd.DataFrame(task_data)
                csv = df.to_csv(index=False)
                
                st.download_button(
                    label="Download Task Report (CSV)",
                    data=csv,
                    file_name=f"week1_launch_tasks_{datetime.now().strftime('%Y%m%d')}.csv",
                    mime="text/csv"
                )
        
        with col3:
            if st.button("Send Task Reminders"):
                upcoming_tasks = self.launch_manager.get_upcoming_tasks(1)  # Next 24 hours
                st.info(f"Would send reminders for {len(upcoming_tasks)} upcoming tasks")
    
    def render_metrics_tracking(self):
        """Render metrics tracking interface"""
        
        st.header("📊 Metrics Tracking")
        
        current_phase = self.launch_manager.get_current_phase()
        if not current_phase:
            st.warning("No active launch phase found!")
            return
        
        # Metrics overview
        col1, col2, col3, col4 = st.columns(4)
        
        metrics_on_track = 0
        metrics_behind = 0
        metrics_not_set = 0
        
        for metric in current_phase.metrics:
            if metric.current_value is None:
                metrics_not_set += 1
            elif metric.current_value >= metric.target_value:
                metrics_on_track += 1
            else:
                metrics_behind += 1
        
        with col1:
            st.metric("Total Metrics", len(current_phase.metrics))
        
        with col2:
            st.metric("On Track", metrics_on_track, delta="✅")
        
        with col3:
            st.metric("Behind Target", metrics_behind, delta="⚠️")
        
        with col4:
            st.metric("Not Set", metrics_not_set, delta="📝")
        
        # Metrics by category
        st.subheader("📈 Metrics by Category")
        
        categories = {}
        for metric in current_phase.metrics:
            if metric.category not in categories:
                categories[metric.category] = []
            categories[metric.category].append(metric)
        
        for category, metrics in categories.items():
            st.write(f"**{category.title()} Metrics:**")
            
            for metric in metrics:
                col1, col2, col3 = st.columns([2, 1, 1])
                
                with col1:
                    st.write(f"• **{metric.name}**")
                    st.write(f"  {metric.description}")
                
                with col2:
                    current_val = st.number_input(
                        "Current Value",
                        value=float(metric.current_value) if metric.current_value is not None else 0.0,
                        key=f"metric_{metric.id}"
                    )
                    
                    if st.button("Update", key=f"update_metric_{metric.id}"):
                        if self.launch_manager.update_metric_value(metric.id, current_val):
                            st.success("Updated!")
                            st.experimental_rerun()
                
                with col3:
                    target_display = f"{metric.target_value} {metric.unit}"
                    current_display = f"{metric.current_value or 0} {metric.unit}" 
                    
                    if metric.current_value is not None:
                        progress = (metric.current_value / metric.target_value) * 100
                        if progress >= 100:
                            st.success(f"🎯 {current_display}")
                        elif progress >= 80:
                            st.warning(f"⚠️ {current_display}")
                        else:
                            st.error(f"❌ {current_display}")
                    else:
                        st.info(f"📝 Target: {target_display}")
            
            st.markdown("---")
        
        # Metrics visualization
        st.subheader("📊 Metrics Performance")
        
        # Create metrics performance chart
        metrics_data = []
        for metric in current_phase.metrics:
            if metric.current_value is not None:
                progress = min((metric.current_value / metric.target_value) * 100, 150)  # Cap at 150%
                metrics_data.append({
                    "Metric": metric.name,
                    "Progress": progress,
                    "Category": metric.category.title()
                })
        
        if metrics_data:
            df = pd.DataFrame(metrics_data)
            fig = px.bar(
                df,
                x="Progress",
                y="Metric",
                color="Category",
                title="Metrics Performance (% of Target)",
                orientation='h'
            )
            
            # Add target line at 100%
            fig.add_vline(x=100, line_dash="dash", line_color="red", 
                         annotation_text="Target", annotation_position="top")
            
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No metric values set yet. Please update metric values above.")
    
    def render_beta_user_management(self):
        """Render beta user management interface"""
        
        st.header("👥 Beta User Management")
        
        # Integration with beta program
        st.info("🔗 Integrating with existing beta program data...")
        
        # Mock beta user data for Week 1 launch
        beta_users = [
            {"company": "CloudScale Solutions", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"},
            {"company": "DataFlow AI", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"},
            {"company": "Strategic Insights Co", "status": "Invited", "last_login": "Never", "onboarding": "Pending"},
            {"company": "Regional Investment", "status": "Active", "last_login": "2025-07-25", "onboarding": "Completed"},
            {"company": "TechFlow Dynamics", "status": "Active", "last_login": "2025-07-26", "onboarding": "In Progress"},
            {"company": "Global Solutions Ltd", "status": "Invited", "last_login": "Never", "onboarding": "Pending"},
            {"company": "Innovate Systems", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"},
            {"company": "Growth Partners", "status": "Active", "last_login": "2025-07-25", "onboarding": "Completed"},
            {"company": "Future Tech Corp", "status": "Invited", "last_login": "Never", "onboarding": "Pending"},
            {"company": "Smart Analytics Inc", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"},
            {"company": "Enterprise Solutions", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"},
            {"company": "Digital Transform Co", "status": "Active", "last_login": "2025-07-25", "onboarding": "In Progress"},
            {"company": "Quantum Insights", "status": "Invited", "last_login": "Never", "onboarding": "Pending"},
            {"company": "Apex Technologies", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"},
            {"company": "NextGen Business", "status": "Active", "last_login": "2025-07-26", "onboarding": "Completed"}
        ]
        
        # User status metrics
        col1, col2, col3, col4 = st.columns(4)
        
        active_users = len([u for u in beta_users if u["status"] == "Active"])
        invited_users = len([u for u in beta_users if u["status"] == "Invited"])
        completed_onboarding = len([u for u in beta_users if u["onboarding"] == "Completed"])
        
        with col1:
            st.metric("Total Beta Users", len(beta_users))
        
        with col2:
            st.metric("Active Users", active_users, delta=f"{(active_users/len(beta_users)*100):.1f}%")
        
        with col3:
            st.metric("Pending Invites", invited_users)
        
        with col4:
            st.metric("Onboarding Complete", completed_onboarding, delta=f"{(completed_onboarding/len(beta_users)*100):.1f}%")
        
        # User status breakdown
        st.subheader("📊 User Status Overview")
        
        df = pd.DataFrame(beta_users)
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Status distribution
            status_counts = df['status'].value_counts()
            fig1 = px.pie(values=status_counts.values, names=status_counts.index, 
                         title="User Status Distribution")
            st.plotly_chart(fig1, use_container_width=True)
        
        with col2:
            # Onboarding progress
            onboarding_counts = df['onboarding'].value_counts()
            fig2 = px.bar(x=onboarding_counts.index, y=onboarding_counts.values,
                         title="Onboarding Progress")
            st.plotly_chart(fig2, use_container_width=True)
        
        # User management table
        st.subheader("👥 Beta User List")
        
        # Add action buttons
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Send Welcome Emails to New Users"):
                new_users = [u for u in beta_users if u["status"] == "Invited"]
                st.success(f"Would send welcome emails to {len(new_users)} new users")
        
        with col2:
            if st.button("Send Onboarding Reminders"):
                pending_users = [u for u in beta_users if u["onboarding"] in ["Pending", "In Progress"]]
                st.success(f"Would send reminders to {len(pending_users)} users")
        
        with col3:
            if st.button("Schedule Follow-up Calls"):
                active_users_list = [u for u in beta_users if u["status"] == "Active"]
                st.success(f"Would schedule calls with {len(active_users_list)} active users")
        
        # User table with status indicators
        for user in beta_users:
            status_color = "🟢" if user["status"] == "Active" else "🟡"
            onboarding_icon = "✅" if user["onboarding"] == "Completed" else "🔄" if user["onboarding"] == "In Progress" else "⏳"
            
            col1, col2, col3, col4, col5 = st.columns(5)
            
            with col1:
                st.write(f"{status_color} **{user['company']}**")
            
            with col2:
                st.write(user["status"])
            
            with col3:
                st.write(f"{onboarding_icon} {user['onboarding']}")
            
            with col4:
                st.write(user["last_login"])
            
            with col5:
                if user["status"] == "Invited":
                    if st.button("Resend Invite", key=f"invite_{user['company']}"):
                        st.success(f"Invite resent to {user['company']}")
                elif user["onboarding"] != "Completed":
                    if st.button("Send Reminder", key=f"reminder_{user['company']}"):
                        st.success(f"Reminder sent to {user['company']}")
    
    def render_performance_analytics(self):
        """Render performance analytics"""
        
        st.header("📈 Performance Analytics")
        
        # Mock performance data for Week 1
        st.subheader("🚀 System Performance")
        
        # System metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("System Uptime", "99.8%", delta="Target: 99.5%")
        
        with col2:
            st.metric("Avg Response Time", "245ms", delta="-15ms from yesterday")
        
        with col3:
            st.metric("Concurrent Users", "28", delta="+5 from yesterday")
        
        with col4:
            st.metric("Error Rate", "0.02%", delta="Well below target")
        
        # Performance trends
        st.subheader("📊 Performance Trends")
        
        # Mock time series data
        dates = [datetime.now() - timedelta(days=x) for x in range(7, 0, -1)]
        performance_data = {
            "Date": dates,
            "Response Time (ms)": [280, 265, 250, 245, 240, 245, 245],
            "Active Users": [15, 18, 22, 25, 26, 28, 28],
            "System Load (%)": [45, 50, 55, 60, 58, 62, 60],
            "Error Count": [0, 1, 0, 0, 1, 0, 0]
        }
        
        df = pd.DataFrame(performance_data)
        
        # Response time chart
        fig1 = px.line(df, x="Date", y="Response Time (ms)", 
                      title="Response Time Trend", markers=True)
        st.plotly_chart(fig1, use_container_width=True)
        
        # User activity chart
        fig2 = px.bar(df, x="Date", y="Active Users",
                     title="Daily Active Users")
        st.plotly_chart(fig2, use_container_width=True)
        
        # Feature usage analytics
        st.subheader("🎯 Feature Usage Analytics")
        
        feature_usage = {
            "Feature": ["Financial Analysis", "Strategic Planning", "Market Research", 
                       "Competitive Analysis", "Trend Analysis", "Valuation Tools"],
            "Usage Count": [45, 32, 28, 15, 22, 18],
            "Unique Users": [12, 8, 9, 4, 7, 5]
        }
        
        feature_df = pd.DataFrame(feature_usage)
        
        fig3 = px.bar(feature_df, x="Feature", y="Usage Count",
                     title="Feature Usage During Beta Launch")
        fig3.update_xaxis(tickangle=45)
        st.plotly_chart(fig3, use_container_width=True)
        
        # User satisfaction
        st.subheader("😊 User Satisfaction")
        
        satisfaction_data = {
            "Metric": ["Overall Satisfaction", "Ease of Use", "Feature Completeness", 
                      "Performance", "Support Quality"],
            "Score": [8.2, 7.8, 8.5, 8.9, 9.1],
            "Target": [8.0, 8.0, 8.0, 8.5, 8.5]
        }
        
        sat_df = pd.DataFrame(satisfaction_data)
        
        fig4 = go.Figure()
        fig4.add_trace(go.Bar(name="Actual", x=sat_df["Metric"], y=sat_df["Score"]))
        fig4.add_trace(go.Bar(name="Target", x=sat_df["Metric"], y=sat_df["Target"]))
        fig4.update_layout(title="User Satisfaction Scores (1-10 scale)")
        st.plotly_chart(fig4, use_container_width=True)
    
    def render_daily_operations(self):
        """Render daily operations interface"""
        
        st.header("🔄 Daily Operations")
        
        # Daily checklist
        st.subheader("📋 Daily Launch Checklist")
        
        daily_tasks = [
            "Review system performance metrics",
            "Check for critical issues or bugs",
            "Monitor user activity and engagement",
            "Collect and review user feedback",
            "Update task status and progress",
            "Communicate with beta users",
            "Prepare daily status report",
            "Plan next day activities"
        ]
        
        completed_today = []
        
        for i, task in enumerate(daily_tasks):
            completed = st.checkbox(task, key=f"daily_{i}")
            if completed:
                completed_today.append(task)
        
        completion_rate = len(completed_today) / len(daily_tasks) * 100
        st.metric("Daily Checklist Completion", f"{completion_rate:.0f}%")
        
        if completion_rate == 100:
            st.success("🎉 All daily tasks completed!")
        elif completion_rate >= 75:
            st.warning("⚠️ Almost done! Complete remaining tasks.")
        else:
            st.error("📝 Several tasks remain incomplete.")
        
        # Quick status update
        st.subheader("📝 Quick Status Update")
        
        col1, col2 = st.columns(2)
        
        with col1:
            status_update = st.text_area(
                "Daily Status Summary",
                placeholder="Enter today's key updates, issues, and accomplishments..."
            )
        
        with col2:
            priority_items = st.text_area(
                "Priority Items for Tomorrow",
                placeholder="List priority items for next day..."
            )
        
        if st.button("Save Daily Update"):
            if status_update or priority_items:
                # In a real implementation, this would save to a database
                st.success("Daily update saved!")
            else:
                st.warning("Please enter at least one update.")
        
        # Communication center
        st.subheader("📢 Communication Center")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("Send Daily Update to Team"):
                st.success("Daily update email sent to team!")
        
        with col2:
            if st.button("Send User Check-in"):
                st.success("Check-in message sent to beta users!")
        
        with col3:
            if st.button("Alert for Critical Issues"):
                st.info("No critical issues to report today.")
        
        # Recent activity log
        st.subheader("📊 Recent Activity Log")
        
        activity_log = [
            {"time": "14:30", "event": "User feedback received from CloudScale Solutions", "type": "feedback"},
            {"time": "13:45", "event": "System performance check completed", "type": "monitoring"},
            {"time": "12:20", "event": "Onboarding session completed for 3 users", "type": "user_management"},
            {"time": "11:15", "event": "Critical task 'QA Final Check' marked as completed", "type": "task_update"},
            {"time": "10:30", "event": "Daily team standup completed", "type": "communication"},
            {"time": "09:45", "event": "System uptime check: 99.8%", "type": "monitoring"},
            {"time": "09:00", "event": "Day started - launch operations active", "type": "system"}
        ]
        
        for activity in activity_log:
            icon = "📝" if activity["type"] == "feedback" else \
                   "📊" if activity["type"] == "monitoring" else \
                   "👥" if activity["type"] == "user_management" else \
                   "✅" if activity["type"] == "task_update" else \
                   "💬" if activity["type"] == "communication" else "🔧"
            
            st.write(f"{icon} **{activity['time']}** - {activity['event']}")
    
    def render_launch_reports(self):
        """Render launch reports"""
        
        st.header("📝 Launch Reports")
        
        # Report type selector
        report_type = st.selectbox("Select Report Type", [
            "📊 Daily Status Report",
            "📈 Weekly Progress Report",
            "🎯 Metrics Performance Report",
            "👥 User Engagement Report",
            "🔧 Technical Performance Report"
        ])
        
        if report_type == "📊 Daily Status Report":
            self.render_daily_status_report()
        elif report_type == "📈 Weekly Progress Report":
            self.render_weekly_progress_report()
        elif report_type == "🎯 Metrics Performance Report":
            self.render_metrics_performance_report()
        elif report_type == "👥 User Engagement Report":
            self.render_user_engagement_report()
        elif report_type == "🔧 Technical Performance Report":
            self.render_technical_performance_report()
    
    def render_daily_status_report(self):
        """Render daily status report"""
        
        st.subheader("📊 Daily Status Report")
        
        report_date = st.date_input("Report Date", value=datetime.now().date())
        
        # Generate report
        report = self.launch_manager.generate_launch_status_report()
        
        st.write("**Executive Summary:**")
        st.write(f"""
        Week 1 Beta Soft Launch is {report['overall_progress']:.1f}% complete with {report['completed_tasks']} 
        of {report['total_tasks']} tasks finished. Currently {report['upcoming_tasks_count']} tasks are 
        scheduled for the next 3 days. The launch remains on schedule with strong user engagement 
        and system performance exceeding targets.
        """)
        
        # Key metrics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.write("**Tasks & Progress:**")
            st.write(f"• Tasks Completed: {report['completed_tasks']}/{report['total_tasks']}")
            st.write(f"• Overall Progress: {report['overall_progress']:.1f}%")
            st.write(f"• Upcoming Tasks: {report['upcoming_tasks_count']}")
        
        with col2:
            st.write("**User Metrics:**")
            st.write("• Active Beta Users: 12/15")
            st.write("• Onboarding Completion: 80%")
            st.write("• Daily Engagement: 85%")
        
        with col3:
            st.write("**System Performance:**")
            st.write("• System Uptime: 99.8%")
            st.write("• Avg Response Time: 245ms")
            st.write("• Error Rate: 0.02%")
        
        # Export report
        if st.button("📥 Export Daily Report"):
            report_data = {
                "report_date": report_date.isoformat(),
                "report_type": "Daily Status Report",
                "summary": report,
                "generated_at": datetime.now().isoformat()
            }
            
            st.download_button(
                label="Download Report (JSON)",
                data=json.dumps(report_data, indent=2, default=str),
                file_name=f"daily_status_report_{report_date.strftime('%Y%m%d')}.json",
                mime="application/json"
            )
    
    def render_weekly_progress_report(self):
        st.info("📈 Weekly Progress Report - Available at end of Week 1")
    
    def render_metrics_performance_report(self):
        st.info("🎯 Metrics Performance Report - Detailed metrics analysis")
    
    def render_user_engagement_report(self):
        st.info("👥 User Engagement Report - Beta user activity analysis")
    
    def render_technical_performance_report(self):
        st.info("🔧 Technical Performance Report - System performance deep dive")

def main():
    """Main function to run the dashboard"""
    dashboard = ProductLaunchDashboard()
    dashboard.render_dashboard()

if __name__ == "__main__":
    main()
