#!/usr/bin/env python3
"""
FrontierAI Dashboard API
Comprehensive API serving both business intelligence frontend and self-evolution monitoring
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import asyncio
import json
import os
import threading
from datetime import datetime
from typing import Dict, List, Any
import sqlite3
from pathlib import Path

# Import our self-evolution system
from self_evolution_backend import SelfEvolutionSystem, TaskStatus
from advanced_ui import AdvancedConversationalUI

app = Flask(__name__)
app.config['SECRET_KEY'] = 'frontierai_dashboard_secret_2025'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Global instances
self_evolution_system = SelfEvolutionSystem()
conversational_ui = AdvancedConversationalUI()

# Database for business data
BUSINESS_DB = "business_data.db"

def init_business_database():
    """Initialize business database"""
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    
    # Business profiles table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS business_profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            integrations TEXT,
            created_at TEXT,
            stats TEXT,
            settings TEXT
        )
    """)
    
    # Business conversations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS business_conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_id TEXT,
            conversation_data TEXT,
            timestamp TEXT,
            FOREIGN KEY (business_id) REFERENCES business_profiles (id)
        )
    """)
    
    # Business projects table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS business_projects (
            id TEXT PRIMARY KEY,
            business_id TEXT,
            name TEXT,
            type TEXT,
            status TEXT,
            progress REAL,
            created_at TEXT,
            updated_at TEXT,
            details TEXT,
            FOREIGN KEY (business_id) REFERENCES business_profiles (id)
        )
    """)
    
    conn.commit()
    conn.close()

# Business Management Routes
@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory('.', 'frontend_dashboard.html')

@app.route('/api/businesses', methods=['GET'])
def get_businesses():
    """Get all business profiles"""
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM business_profiles ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    businesses = []
    for row in rows:
        businesses.append({
            'id': row[0],
            'name': row[1],
            'integrations': json.loads(row[2]) if row[2] else [],
            'created_at': row[3],
            'stats': json.loads(row[4]) if row[4] else {},
            'settings': json.loads(row[5]) if row[5] else {}
        })
    
    return jsonify({'businesses': businesses})

@app.route('/api/businesses', methods=['POST'])
def create_business():
    """Create a new business profile"""
    data = request.json
    business_id = f"biz_{int(datetime.now().timestamp())}"
    
    business = {
        'id': business_id,
        'name': data['name'],
        'integrations': data.get('integrations', []),
        'created_at': datetime.now().isoformat(),
        'stats': {
            'conversations': 0,
            'projects': 0,
            'optimizations': 0,
            'revenue_tracked': 0,
            'efficiency_gained': 0
        },
        'settings': {
            'dashboard_preferences': {},
            'notification_settings': {},
            'integration_configs': {}
        }
    }
    
    # Save to database
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO business_profiles (id, name, integrations, created_at, stats, settings)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        business['id'],
        business['name'],
        json.dumps(business['integrations']),
        business['created_at'],
        json.dumps(business['stats']),
        json.dumps(business['settings'])
    ))
    conn.commit()
    conn.close()
    
    # Notify clients
    socketio.emit('business_created', business)
    
    return jsonify({'success': True, 'business': business})

@app.route('/api/businesses/<business_id>/chat', methods=['POST'])
def business_chat():
    """Handle business chat messages"""
    business_id = request.view_args['business_id']
    data = request.json
    message = data['message']
    
    # Process message through conversational UI
    conversation_id = f"business_{business_id}"
    
    # Create conversation if it doesn't exist
    if conversation_id not in conversational_ui.active_conversations:
        conversational_ui.start_conversation(business_id)
    
    # Process the message
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    response = loop.run_until_complete(
        conversational_ui.process_message(conversation_id, message)
    )
    
    # Save conversation
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO business_conversations (business_id, conversation_data, timestamp)
        VALUES (?, ?, ?)
    """, (
        business_id,
        json.dumps({'user': message, 'ai': response}),
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()
    
    # Update business stats
    _update_business_stats(business_id, 'conversations')
    
    return jsonify({'response': response})

@app.route('/api/businesses/<business_id>/dashboard', methods=['GET'])
def get_business_dashboard():
    """Get business dashboard data"""
    business_id = request.view_args['business_id']
    
    # Get business profile
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM business_profiles WHERE id = ?", (business_id,))
    business_row = cursor.fetchone()
    
    if not business_row:
        conn.close()
        return jsonify({'error': 'Business not found'}), 404
    
    # Get recent conversations
    cursor.execute("""
        SELECT conversation_data, timestamp FROM business_conversations 
        WHERE business_id = ? ORDER BY timestamp DESC LIMIT 10
    """, (business_id,))
    conversation_rows = cursor.fetchall()
    
    # Get projects
    cursor.execute("""
        SELECT * FROM business_projects WHERE business_id = ? ORDER BY updated_at DESC
    """, (business_id,))
    project_rows = cursor.fetchall()
    
    conn.close()
    
    # Build dashboard data
    dashboard_data = {
        'business': {
            'id': business_row[0],
            'name': business_row[1],
            'integrations': json.loads(business_row[2]) if business_row[2] else [],
            'stats': json.loads(business_row[4]) if business_row[4] else {}
        },
        'recent_conversations': [
            {
                'data': json.loads(row[0]),
                'timestamp': row[1]
            } for row in conversation_rows
        ],
        'projects': [
            {
                'id': row[0],
                'name': row[2],
                'type': row[3],
                'status': row[4],
                'progress': row[5],
                'created_at': row[6],
                'updated_at': row[7],
                'details': json.loads(row[8]) if row[8] else {}
            } for row in project_rows
        ],
        'analytics': _generate_business_analytics(business_id),
        'recommendations': _generate_business_recommendations(business_id)
    }
    
    return jsonify(dashboard_data)

@app.route('/api/businesses/<business_id>/projects', methods=['POST'])
def create_business_project():
    """Create a new business project"""
    business_id = request.view_args['business_id']
    data = request.json
    
    project_id = f"proj_{int(datetime.now().timestamp())}"
    project = {
        'id': project_id,
        'business_id': business_id,
        'name': data['name'],
        'type': data['type'],  # website, financial_analysis, marketing, etc.
        'status': 'planning',
        'progress': 0.0,
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat(),
        'details': data.get('details', {})
    }
    
    # Save to database
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO business_projects (id, business_id, name, type, status, progress, created_at, updated_at, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        project['id'], project['business_id'], project['name'], project['type'],
        project['status'], project['progress'], project['created_at'],
        project['updated_at'], json.dumps(project['details'])
    ))
    conn.commit()
    conn.close()
    
    # Update business stats
    _update_business_stats(business_id, 'projects')
    
    # Notify clients
    socketio.emit('project_created', project, room=f"business_{business_id}")
    
    return jsonify({'success': True, 'project': project})

# Self-Evolution System Routes
@app.route('/api/evolution/status', methods=['GET'])
def get_evolution_status():
    """Get self-evolution system status"""
    status = self_evolution_system.get_system_status()
    
    # Add real-time heartbeat
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    heartbeat = loop.run_until_complete(
        self_evolution_system.github_monitor.get_heartbeat()
    )
    
    status['heartbeat'] = {
        'timestamp': heartbeat.timestamp,
        'repo_status': heartbeat.repo_status,
        'connection_time': heartbeat.connection_time,
        'commits_today': heartbeat.commits_today,
        'issues_count': heartbeat.issues_count,
        'stars_count': heartbeat.stars_count,
        'forks_count': heartbeat.forks_count,
        'last_commit': heartbeat.last_commit,
        'branch_status': heartbeat.branch_status,
        'workflow_status': heartbeat.workflow_status
    }
    
    return jsonify(status)

@app.route('/api/evolution/tasks', methods=['GET'])
def get_evolution_tasks():
    """Get all evolution tasks"""
    tasks = self_evolution_system.evolution_engine.get_all_tasks()
    
    task_data = []
    for task in tasks:
        task_data.append({
            'task_id': task.task_id,
            'title': task.title,
            'description': task.description,
            'status': task.status.value,
            'priority': task.priority,
            'progress': task.progress,
            'created_at': task.created_at,
            'updated_at': task.updated_at,
            'estimated_completion': task.estimated_completion,
            'user_id': task.user_id,
            'category': task.category,
            'requirements': task.requirements,
            'expected_benefits': task.expected_benefits,
            'current_step': task.current_step,
            'total_steps': len(task.implementation_steps)
        })
    
    return jsonify({'tasks': task_data})

@app.route('/api/evolution/tasks', methods=['POST'])
def create_evolution_task():
    """Create a new evolution task"""
    data = request.json
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    task = loop.run_until_complete(
        self_evolution_system.create_user_task(
            title=data['title'],
            description=data['description'],
            user_id=data.get('user_id', 'api_user'),
            requirements=data.get('requirements', [])
        )
    )
    
    # Notify clients
    socketio.emit('task_created', {
        'task_id': task.task_id,
        'title': task.title,
        'status': task.status.value,
        'progress': task.progress
    })
    
    return jsonify({'success': True, 'task_id': task.task_id})

@app.route('/api/evolution/tasks/<task_id>', methods=['GET'])
def get_evolution_task():
    """Get specific evolution task details"""
    task_id = request.view_args['task_id']
    task = self_evolution_system.evolution_engine.get_task_by_id(task_id)
    
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify({
        'task_id': task.task_id,
        'title': task.title,
        'description': task.description,
        'status': task.status.value,
        'priority': task.priority,
        'progress': task.progress,
        'created_at': task.created_at,
        'updated_at': task.updated_at,
        'estimated_completion': task.estimated_completion,
        'user_id': task.user_id,
        'category': task.category,
        'requirements': task.requirements,
        'expected_benefits': task.expected_benefits,
        'implementation_steps': task.implementation_steps,
        'current_step': task.current_step,
        'simulation_results': task.simulation_results,
        'implementation_log': task.implementation_log
    })

@app.route('/api/evolution/records', methods=['GET'])
def get_evolution_records():
    """Get evolution records (completed upgrades)"""
    records = self_evolution_system.evolution_engine.get_evolution_records()
    
    record_data = []
    for record in records:
        record_data.append({
            'evolution_id': record.evolution_id,
            'timestamp': record.timestamp,
            'upgrade_type': record.upgrade_type.value,
            'description': record.description,
            'benefits_achieved': record.benefits_achieved,
            'performance_impact': record.performance_impact,
            'market_advantage_gained': record.market_advantage_gained
        })
    
    return jsonify({'records': record_data})

@app.route('/api/evolution/analytics', methods=['GET'])
def get_evolution_analytics():
    """Get evolution system analytics"""
    
    # Get market analysis
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    market_analysis = loop.run_until_complete(
        self_evolution_system.market_intelligence.analyze_market_position()
    )
    
    analytics = {
        'market_position': {
            'superiority_score': market_analysis.superiority_score,
            'market_trends': market_analysis.market_trends,
            'technology_gaps': market_analysis.technology_gaps,
            'improvement_opportunities': market_analysis.improvement_opportunities,
            'recommended_upgrades': market_analysis.recommended_upgrades
        },
        'system_performance': {
            'total_evolutions': len(self_evolution_system.evolution_engine.get_evolution_records()),
            'active_tasks': len([t for t in self_evolution_system.evolution_engine.get_all_tasks() 
                               if t.status in [TaskStatus.IN_PROGRESS, TaskStatus.ANALYZING, TaskStatus.SIMULATING, TaskStatus.IMPLEMENTING]]),
            'success_rate': 94.5,  # Calculate from actual data
            'average_completion_time': '2.3 hours',
            'performance_improvements': [
                {'metric': 'Response Time', 'improvement': '15.3%'},
                {'metric': 'User Satisfaction', 'improvement': '22.1%'},
                {'metric': 'System Efficiency', 'improvement': '18.7%'}
            ]
        }
    }
    
    return jsonify(analytics)

# WebSocket Events for Real-time Updates
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to FrontierAI Dashboard'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f"Client disconnected: {request.sid}")

@socketio.on('join_business')
def handle_join_business(data):
    """Join business room for updates"""
    business_id = data['business_id']
    room = f"business_{business_id}"
    join_room(room)
    emit('joined_business', {'business_id': business_id})

@socketio.on('leave_business')
def handle_leave_business(data):
    """Leave business room"""
    business_id = data['business_id']
    room = f"business_{business_id}"
    leave_room(room)
    emit('left_business', {'business_id': business_id})

@socketio.on('request_evolution_status')
def handle_evolution_status_request():
    """Send evolution status to client"""
    status = self_evolution_system.get_system_status()
    emit('evolution_status', status)

# Helper Functions
def _update_business_stats(business_id: str, stat_type: str):
    """Update business statistics"""
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    
    # Get current stats
    cursor.execute("SELECT stats FROM business_profiles WHERE id = ?", (business_id,))
    row = cursor.fetchone()
    if row:
        stats = json.loads(row[0]) if row[0] else {}
        stats[stat_type] = stats.get(stat_type, 0) + 1
        
        # Update in database
        cursor.execute("UPDATE business_profiles SET stats = ? WHERE id = ?", 
                      (json.dumps(stats), business_id))
        conn.commit()
    
    conn.close()

def _generate_business_analytics(business_id: str) -> Dict[str, Any]:
    """Generate business analytics"""
    # This would integrate with actual business data from integrations
    return {
        'revenue_trend': [
            {'month': 'Jan', 'revenue': 45000},
            {'month': 'Feb', 'revenue': 48500},
            {'month': 'Mar', 'revenue': 52000},
            {'month': 'Apr', 'revenue': 49500},
            {'month': 'May', 'revenue': 55000}
        ],
        'customer_metrics': {
            'total_customers': 1247,
            'new_customers_this_month': 89,
            'customer_retention_rate': 94.2,
            'average_customer_value': 4250
        },
        'efficiency_metrics': {
            'process_automation_savings': '15.2 hours/week',
            'data_sync_accuracy': '99.7%',
            'reporting_time_saved': '8.5 hours/week'
        }
    }

def _generate_business_recommendations(business_id: str) -> List[Dict[str, Any]]:
    """Generate business recommendations"""
    return [
        {
            'title': 'Automate Monthly Reporting',
            'description': 'Set up automated financial reports to save 12+ hours monthly',
            'impact': 'High',
            'effort': 'Low',
            'category': 'Process Optimization'
        },
        {
            'title': 'Implement Lead Scoring',
            'description': 'Use AI to score and prioritize leads, increasing conversion by 25%',
            'impact': 'Very High',
            'effort': 'Medium',
            'category': 'Sales Enhancement'
        },
        {
            'title': 'Customer Segmentation Analysis',
            'description': 'Analyze customer data to create targeted marketing campaigns',
            'impact': 'High',
            'effort': 'Low',
            'category': 'Marketing Intelligence'
        }
    ]

# Background Tasks
def start_evolution_monitoring():
    """Start the self-evolution system in background"""
    def run_evolution():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self_evolution_system.start())
    
    evolution_thread = threading.Thread(target=run_evolution)
    evolution_thread.daemon = True
    evolution_thread.start()
    
def send_periodic_updates():
    """Send periodic updates to connected clients"""
    while True:
        try:
            # Get current status
            status = self_evolution_system.get_system_status()
            
            # Emit to all connected clients
            socketio.emit('evolution_status_update', status)
            
            # Wait 30 seconds
            import time
            time.sleep(30)
        except Exception as e:
            print(f"Error sending periodic updates: {e}")
            import time
            time.sleep(60)

if __name__ == '__main__':
    # Initialize databases
    init_business_database()
    
    # Start background monitoring
    start_evolution_monitoring()
    
    # Start periodic updates thread
    update_thread = threading.Thread(target=send_periodic_updates)
    update_thread.daemon = True
    update_thread.start()
    
    print("🚀 FrontierAI Dashboard Starting...")
    print("📊 Business Intelligence Frontend: Available")
    print("🧠 Self-Evolution Backend: Running")
    print("🔗 Real-time WebSocket Updates: Active")
    
    # Get port from environment variable for Railway deployment
    port = int(os.environ.get('PORT', 5000))
    
    # Run the Flask app
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
