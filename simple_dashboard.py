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
from datetime import datetime
from pathlib import Path

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

if __name__ == '__main__':
    # Initialize database
    init_business_database()
    
    # Get port from environment
    port = int(os.environ.get('PORT', 5000))
    
    print(f"🚀 Starting FrontierAI Dashboard on port {port}")
    print(f"📍 Health check available at: http://0.0.0.0:{port}/health")
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=False)
