#!/usr/bin/env python3
"""
Simple FrontierAI Dashboard for Railway Deployment
Serves the frontend dashboard with basic API endpoints
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path

# Import evolution API integration
try:
    from evolution_api_integration import get_evolution_api
    evolution_api = get_evolution_api()
    EVOLUTION_INTEGRATION = True
    print("✅ Evolution API integration loaded")
except ImportError as e:
    print(f"⚠️ Evolution API integration not available: {e}")
    EVOLUTION_INTEGRATION = False
    evolution_api = None

app = Flask(__name__)
app.config['SECRET_KEY'] = 'frontierai_dashboard_secret_2025'
CORS(app)

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
    
    # Conversations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_id TEXT,
            role TEXT,
            content TEXT,
            timestamp TEXT,
            FOREIGN KEY (business_id) REFERENCES business_profiles (id)
        )
    """)
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    """Serve the main dashboard"""
    return send_from_directory('.', 'frontend_dashboard.html')

@app.route('/evolution')
def evolution_dashboard():
    """Serve the self-evolving AI dashboard"""
    return send_from_directory('.', 'evolution_dashboard.html')

@app.route('/health')
def health():
    """Health check endpoint for Railway"""
    return jsonify({
        'status': 'healthy',
        'service': 'FrontierAI Dashboard',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/businesses', methods=['GET', 'POST'])
def businesses():
    """Handle business profiles"""
    if request.method == 'POST':
        data = request.json
        conn = sqlite3.connect(BUSINESS_DB)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO business_profiles 
            (id, name, integrations, created_at, stats, settings)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            data['id'],
            data['name'],
            json.dumps(data.get('integrations', [])),
            data.get('created_at', datetime.now().isoformat()),
            json.dumps(data.get('stats', {})),
            json.dumps(data.get('settings', {}))
        ))
        
        conn.commit()
        conn.close()
        
        return jsonify({'status': 'success', 'message': 'Business profile saved'})
    
    else:  # GET
        conn = sqlite3.connect(BUSINESS_DB)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM business_profiles")
        rows = cursor.fetchall()
        
        businesses = []
        for row in rows:
            businesses.append({
                'id': row[0],
                'name': row[1],
                'integrations': json.loads(row[2] or '[]'),
                'created_at': row[3],
                'stats': json.loads(row[4] or '{}'),
                'settings': json.loads(row[5] or '{}')
            })
        
        conn.close()
        return jsonify(businesses)

@app.route('/api/chat', methods=['POST'])
def chat():
    """Handle chat messages"""
    data = request.json
    message = data.get('message', '')
    business_id = data.get('business_id')
    
    # Save user message
    if business_id:
        conn = sqlite3.connect(BUSINESS_DB)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO conversations (business_id, role, content, timestamp)
            VALUES (?, ?, ?, ?)
        """, (business_id, 'user', message, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    # Generate AI response
    response = generate_ai_response(message)
    
    # Save AI response
    if business_id:
        conn = sqlite3.connect(BUSINESS_DB)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO conversations (business_id, role, content, timestamp)
            VALUES (?, ?, ?, ?)
        """, (business_id, 'ai', response, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    return jsonify({
        'response': response,
        'timestamp': datetime.now().isoformat()
    })

def generate_ai_response(message):
    """Generate AI response based on message"""
    message_lower = message.lower()
    
    if 'financial' in message_lower or 'money' in message_lower or 'revenue' in message_lower:
        return "📊 **Financial Analysis**: I can help analyze your revenue trends, optimize expenses, and provide cash flow insights. Would you like me to generate a detailed financial report?"
    
    elif 'website' in message_lower or 'develop' in message_lower or 'build' in message_lower:
        return "🌐 **Website Development**: I can help create a professional website that integrates with your systems and optimizes for conversions. What type of website are you looking to build?"
    
    elif 'marketing' in message_lower or 'customers' in message_lower:
        return "🎯 **Marketing Intelligence**: Let me analyze your customer data for segmentation, lead generation, and campaign optimization strategies."
    
    elif 'optimize' in message_lower or 'automate' in message_lower:
        return "⚡ **Process Optimization**: I can identify automation opportunities and streamline your workflows. Would you like me to analyze your current processes?"
    
    else:
        return f"I understand you're interested in '{message}'. Based on your business setup, I can provide detailed insights and recommendations. What specific aspect would you like me to focus on?"

@app.route('/api/conversations/<business_id>')
def get_conversations(business_id):
    """Get conversation history for a business"""
    conn = sqlite3.connect(BUSINESS_DB)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT role, content, timestamp FROM conversations 
        WHERE business_id = ? ORDER BY timestamp ASC
    """, (business_id,))
    
    rows = cursor.fetchall()
    conversations = [
        {
            'role': row[0],
            'content': row[1],
            'timestamp': row[2]
        }
        for row in rows
    ]
    
    conn.close()
    return jsonify(conversations)

@app.route('/api/evolution/status')
def evolution_status():
    """Get evolution system status"""
    try:
        if EVOLUTION_INTEGRATION and evolution_api:
            # Get real status from evolution systems
            status = evolution_api.get_evolution_status()
            return jsonify(status)
        else:
            # Fallback to simulated status
            status = {
                'system_active': True,
                'generation': 47,
                'capabilities': 94.2,
                'performance': 87,
                'automation': 78,
                'last_evolution': datetime.now().isoformat(),
                'github_connection': 'simulated',
                'evolution_trail_entries': 156,
                'optimizations_completed': 23,
                'connected_systems': ['simulation']
            }
            return jsonify(status)
    except Exception as e:
        return jsonify({
            'system_active': False,
            'error': str(e),
            'capabilities': 0,
            'performance': 0
        })

@app.route('/api/evolution/heartbeat')
def github_heartbeat():
    """Get GitHub repository heartbeat status"""
    try:
        if EVOLUTION_INTEGRATION and evolution_api:
            # Get real heartbeat data from GitHub monitor
            heartbeat_data = evolution_api.get_github_heartbeat_data()
            return jsonify(heartbeat_data)
        else:
            # Fallback to simulated data
            heartbeat_data = {
                'connection_status': 'simulated',
                'repository': 'Kenan3477/FroniterAi',
                'last_sync': datetime.now().isoformat(),
                'total_commits': 127,
                'total_files': 89,
                'branches': 3,
                'repository_size': '2.3MB',
                'recent_activity': [
                    {
                        'action': 'Fix Dockerfile to use main.py',
                        'timestamp': (datetime.now() - timedelta(minutes=2)).isoformat(),
                        'author': 'system'
                    },
                    {
                        'action': 'Simplify dashboard for Railway deployment',
                        'timestamp': (datetime.now() - timedelta(minutes=15)).isoformat(),
                        'author': 'system'
                    },
                    {
                        'action': 'Add evolution monitoring system',
                        'timestamp': (datetime.now() - timedelta(hours=1)).isoformat(),
                        'author': 'evolution_ai'
                    }
                ]
            }
            return jsonify(heartbeat_data)
    except Exception as e:
        return jsonify({
            'connection_status': 'error',
            'error': str(e)
        })

@app.route('/api/evolution/trail')
def evolution_trail():
    """Get evolution trail history"""
    try:
        if EVOLUTION_INTEGRATION and evolution_api:
            # Get real trail data from evolution trail system
            trail_data = evolution_api.get_evolution_trail_data()
            return jsonify(trail_data)
        else:
            # Fallback to simulated data
            trail_data = [
                {
                    'id': 'evt_001',
                    'timestamp': datetime.now().isoformat(),
                    'title': 'Railway Deployment Optimized',
                    'description': 'Fixed Docker configuration and simplified dependencies for reliable deployment',
                    'type': 'deployment_optimization',
                    'impact': 'high',
                    'performance_gain': 15,
                    'files_modified': 3,
                    'author': 'evolution_system'
                },
                {
                    'id': 'evt_002',
                    'timestamp': (datetime.now() - timedelta(minutes=47)).isoformat(),
                    'title': 'Self-Evolution Dashboard Created',
                    'description': 'Implemented comprehensive monitoring and control interface for autonomous evolution',
                    'type': 'feature_addition',
                    'impact': 'high',
                    'capabilities_gain': 25,
                    'files_added': 5,
                    'author': 'evolution_system'
                },
                {
                    'id': 'evt_003',
                    'timestamp': (datetime.now() - timedelta(minutes=92)).isoformat(),
                    'title': 'GitHub Heartbeat Monitor Enhanced',
                    'description': 'Improved real-time repository monitoring with connection resilience',
                    'type': 'enhancement',
                    'impact': 'medium',
                    'reliability_gain': 30,
                    'files_enhanced': 2,
                    'author': 'heartbeat_monitor'
                },
                {
                    'id': 'evt_004',
                    'timestamp': (datetime.now() - timedelta(hours=22, minutes=45)).isoformat(),
                    'title': 'Business Intelligence Integration',
                    'description': 'Connected multiple CRM and analytics platforms for comprehensive business insights',
                    'type': 'integration',
                    'impact': 'very_high',
                    'intelligence_gain': 40,
                    'integrations_added': 8,
                    'author': 'business_ai'
                }
            ]
            return jsonify(trail_data)
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/evolution/trigger', methods=['POST'])
def trigger_evolution():
    """Trigger evolution cycle"""
    data = request.json
    action = data.get('action', 'analyze')
    
    try:
        if EVOLUTION_INTEGRATION and evolution_api:
            # Use real evolution system integration
            result = evolution_api.trigger_evolution_action(action)
            return jsonify(result)
        else:
            # Fallback to simulated responses
            result = {
                'success': True,
                'action': action,
                'timestamp': datetime.now().isoformat(),
                'message': f'Evolution action "{action}" initiated successfully (simulation mode)'
            }
            
            if action == 'start_evolution':
                result['details'] = 'Evolution cycle started - analyzing system state and identifying improvements'
            elif action == 'analyze_repo':
                result['details'] = 'Repository analysis initiated - scanning 89 files for optimization opportunities'
            elif action == 'optimize_system':
                result['details'] = 'System optimization started - targeting performance bottlenecks'
            elif action == 'sync_github':
                result['details'] = 'GitHub synchronization initiated - fetching latest repository changes'
            
            return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'action': action
        })

if __name__ == '__main__':
    # Initialize database
    init_business_database()
    
    # Start evolution system background monitoring
    if EVOLUTION_INTEGRATION and evolution_api:
        try:
            evolution_api.start_background_monitoring()
            print("🧬 Evolution system background monitoring started")
        except Exception as e:
            print(f"⚠️ Could not start evolution monitoring: {e}")
    
    # Get port from environment
    port = int(os.environ.get('PORT', 5000))
    
    print(f"🚀 Starting FrontierAI Dashboard on port {port}")
    print(f"📍 Health check available at: http://0.0.0.0:{port}/health")
    print(f"🧬 Evolution dashboard available at: http://0.0.0.0:{port}/evolution")
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=False)
