#!/usr/bin/env python3
"""
FrontierAI Complete System
Advanced AI-powered business automation and self-evolution platform
"""

import os
import sys
import json
import time
import sqlite3
import logging
import traceback
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import requests
import subprocess

# Core Flask imports
from flask import Flask, render_template_string, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'frontier-ai-evolution-key-2025')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Database initialization
def init_database():
    """Initialize SQLite database for FrontierAI system"""
    conn = sqlite3.connect('frontier_ai_system.db')
    cursor = conn.cursor()
    
    # Businesses table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS businesses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        folder_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        integrations TEXT,
        dashboard_config TEXT,
        status TEXT DEFAULT 'active'
    )
    ''')
    
    # Conversations table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        conversation_data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id)
    )
    ''')
    
    # Projects table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_id INTEGER,
        project_name TEXT NOT NULL,
        project_type TEXT,
        status TEXT DEFAULT 'active',
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (business_id) REFERENCES businesses (id)
    )
    ''')
    
    # Self-evolution tasks table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS evolution_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        implementation_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        digital_record TEXT
    )
    ''')
    
    # GitHub monitoring table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS github_monitoring (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repo_url TEXT DEFAULT 'https://github.com/Kenan3477/FroniterAi',
        last_check TIMESTAMP,
        connection_status TEXT,
        repo_stats TEXT,
        heartbeat_status TEXT DEFAULT 'active'
    )
    ''')
    
    # Evolution footprint table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS evolution_footprint (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_type TEXT NOT NULL,
        description TEXT NOT NULL,
        implementation_details TEXT,
        benefits TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_changes TEXT
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_database()

# Business Integration Manager
class BusinessIntegrationManager:
    """Manages business integrations and custom dashboards"""
    
    SUPPORTED_INTEGRATIONS = {
        'crm': ['Salesforce', 'HubSpot', 'Zoho CRM', 'Pipedrive'],
        'bookkeeping': ['QuickBooks', 'Xero', 'Wave', 'FreshBooks'],
        'sheets': ['Google Sheets', 'Microsoft Excel', 'Airtable'],
        'automation': ['Make', 'Zapier', 'IFTTT', 'Microsoft Power Automate'],
        'ecommerce': ['Shopify', 'WooCommerce', 'Magento', 'BigCommerce'],
        'communication': ['Slack', 'Microsoft Teams', 'Discord', 'Zoom'],
        'storage': ['Google Drive', 'Dropbox', 'OneDrive', 'Box']
    }
    
    def create_business_folder(self, business_name: str) -> Dict[str, Any]:
        """Create business folder structure"""
        try:
            folder_path = f"businesses/{business_name.replace(' ', '_').lower()}"
            os.makedirs(folder_path, exist_ok=True)
            os.makedirs(f"{folder_path}/conversations", exist_ok=True)
            os.makedirs(f"{folder_path}/projects", exist_ok=True)
            os.makedirs(f"{folder_path}/integrations", exist_ok=True)
            os.makedirs(f"{folder_path}/reports", exist_ok=True)
            
            # Insert into database
            conn = sqlite3.connect('frontier_ai_system.db')
            cursor = conn.cursor()
            cursor.execute('''
            INSERT INTO businesses (name, folder_path, integrations, dashboard_config)
            VALUES (?, ?, ?, ?)
            ''', (business_name, folder_path, '{}', '{}'))
            business_id = cursor.lastrowid
            conn.commit()
            conn.close()
            
            return {
                'success': True,
                'business_id': business_id,
                'folder_path': folder_path,
                'message': f'Business "{business_name}" created successfully'
            }
        except Exception as e:
            logger.error(f"Error creating business folder: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_businesses(self) -> List[Dict[str, Any]]:
        """Get all businesses"""
        conn = sqlite3.connect('frontier_ai_system.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM businesses ORDER BY created_at DESC')
        businesses = []
        for row in cursor.fetchall():
            businesses.append({
                'id': row[0],
                'name': row[1],
                'folder_path': row[2],
                'created_at': row[3],
                'integrations': json.loads(row[4] or '{}'),
                'dashboard_config': json.loads(row[5] or '{}'),
                'status': row[6]
            })
        conn.close()
        return businesses

# Self-Evolution Engine
class SelfEvolutionEngine:
    """Advanced self-evolution system for continuous improvement"""
    
    def __init__(self):
        self.repo_url = "https://github.com/Kenan3477/FroniterAi"
        self.github_token = os.environ.get('GITHUB_TOKEN')
        self.evolution_active = True
        
    def monitor_github_repo(self) -> Dict[str, Any]:
        """Monitor GitHub repository for analysis"""
        try:
            # Get repo stats using GitHub API
            headers = {}
            if self.github_token:
                headers['Authorization'] = f'token {self.github_token}'
            
            response = requests.get(f"https://api.github.com/repos/Kenan3477/FroniterAi", headers=headers)
            repo_data = response.json() if response.status_code == 200 else {}
            
            # Update monitoring table
            conn = sqlite3.connect('frontier_ai_system.db')
            cursor = conn.cursor()
            cursor.execute('''
            INSERT OR REPLACE INTO github_monitoring 
            (repo_url, last_check, connection_status, repo_stats, heartbeat_status)
            VALUES (?, ?, ?, ?, ?)
            ''', (
                self.repo_url,
                datetime.now().isoformat(),
                'connected' if response.status_code == 200 else 'error',
                json.dumps(repo_data),
                'active'
            ))
            conn.commit()
            conn.close()
            
            return {
                'status': 'connected' if response.status_code == 200 else 'error',
                'repo_stats': repo_data,
                'last_check': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"GitHub monitoring error: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def analyze_market_upgrades(self) -> List[Dict[str, Any]]:
        """Analyze market for potential upgrades"""
        potential_upgrades = [
            {
                'upgrade_type': 'Enhanced NLP Processing',
                'description': 'Advanced natural language understanding for better business communication',
                'priority': 'high',
                'estimated_benefit': 'Improved user interaction and automation accuracy',
                'implementation_complexity': 'medium'
            },
            {
                'upgrade_type': 'Real-time Analytics Engine',
                'description': 'Live business metrics and predictive analytics',
                'priority': 'high',
                'estimated_benefit': 'Better decision making and trend prediction',
                'implementation_complexity': 'high'
            },
            {
                'upgrade_type': 'Advanced Integration Hub',
                'description': 'Support for 100+ business tools and APIs',
                'priority': 'medium',
                'estimated_benefit': 'Broader ecosystem connectivity',
                'implementation_complexity': 'medium'
            },
            {
                'upgrade_type': 'AI-Powered Business Strategy',
                'description': 'Automated business strategy generation and optimization',
                'priority': 'high',
                'estimated_benefit': 'Superior strategic insights and recommendations',
                'implementation_complexity': 'high'
            }
        ]
        return potential_upgrades
    
    def implement_task(self, task_description: str) -> int:
        """Add task to evolution queue and return task ID"""
        conn = sqlite3.connect('frontier_ai_system.db')
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO evolution_tasks (task_description, status, progress)
        VALUES (?, ?, ?)
        ''', (task_description, 'processing', 0))
        task_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Start background processing
        self._process_task_background(task_id)
        return task_id
    
    def _process_task_background(self, task_id: int):
        """Process task in background (simulated)"""
        import threading
        
        def process():
            try:
                # Simulate processing stages
                stages = [
                    (20, "Analyzing task requirements"),
                    (40, "Researching implementation approaches"),
                    (60, "Simulating changes"),
                    (80, "Testing implementation"),
                    (100, "Task completed successfully")
                ]
                
                for progress, status in stages:
                    time.sleep(2)  # Simulate processing time
                    
                    conn = sqlite3.connect('frontier_ai_system.db')
                    cursor = conn.cursor()
                    cursor.execute('''
                    UPDATE evolution_tasks 
                    SET progress = ?, implementation_details = ?
                    WHERE id = ?
                    ''', (progress, status, task_id))
                    
                    if progress == 100:
                        cursor.execute('''
                        UPDATE evolution_tasks 
                        SET status = ?, completed_at = ?, digital_record = ?
                        WHERE id = ?
                        ''', ('completed', datetime.now().isoformat(), 
                              f"Task implemented successfully. Benefits: Enhanced system capabilities.", task_id))
                    
                    conn.commit()
                    conn.close()
                    
                    # Emit progress update
                    socketio.emit('task_progress', {
                        'task_id': task_id,
                        'progress': progress,
                        'status': status
                    })
                    
            except Exception as e:
                logger.error(f"Task processing error: {e}")
        
        thread = threading.Thread(target=process)
        thread.daemon = True
        thread.start()

# Initialize managers
business_manager = BusinessIntegrationManager()
evolution_engine = SelfEvolutionEngine()

# Main Dashboard Template
MAIN_DASHBOARD_TEMPLATE = '''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FrontierAI - Advanced Business Automation Platform</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.4/socket.io.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
            height: 100vh;
            overflow: hidden;
        }
        
        .container {
            display: flex;
            height: 100vh;
        }
        
        .sidebar {
            width: 320px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-right: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            flex-direction: column;
            box-shadow: 2px 0 20px rgba(0, 0, 0, 0.1);
        }
        
        .logo {
            padding: 25px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        
        .main-actions {
            padding: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .btn-primary {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 10px;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        
        .btn-secondary {
            width: 100%;
            padding: 12px;
            background: rgba(102, 126, 234, 0.1);
            color: #667eea;
            border: 2px solid #667eea;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-secondary:hover {
            background: #667eea;
            color: white;
        }
        
        .businesses-list {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .business-item {
            background: white;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s ease;
            border: 1px solid #eee;
        }
        
        .business-item:hover {
            transform: translateX(5px);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
        }
        
        .business-name {
            font-weight: 600;
            font-size: 16px;
            color: #333;
        }
        
        .business-stats {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        
        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
        }
        
        .header {
            background: white;
            padding: 20px 30px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            font-size: 28px;
            color: #333;
            font-weight: 700;
        }
        
        .evolution-btn {
            padding: 12px 20px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .evolution-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
        }
        
        .content-area {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        
        .welcome-screen {
            text-align: center;
            padding: 60px 20px;
        }
        
        .welcome-screen h2 {
            font-size: 36px;
            color: #333;
            margin-bottom: 20px;
            font-weight: 700;
        }
        
        .welcome-screen p {
            font-size: 18px;
            color: #666;
            max-width: 600px;
            margin: 0 auto 40px;
            line-height: 1.6;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-top: 40px;
        }
        
        .feature-card {
            background: white;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            border: 1px solid #f0f0f0;
        }
        
        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }
        
        .feature-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        
        .feature-title {
            font-size: 20px;
            font-weight: 700;
            color: #333;
            margin-bottom: 15px;
        }
        
        .feature-description {
            color: #666;
            line-height: 1.6;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }
        
        .modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 16px;
            padding: 40px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        
        .modal h3 {
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
            font-weight: 700;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
        }
        
        .form-group input {
            width: 100%;
            padding: 15px;
            border: 2px solid #eee;
            border-radius: 10px;
            font-size: 16px;
            transition: border-color 0.3s ease;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .modal-actions {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }
        
        .btn-cancel {
            flex: 1;
            padding: 15px;
            background: #f8f9fa;
            color: #666;
            border: none;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
        }
        
        .chat-interface {
            background: white;
            border-radius: 16px;
            height: 400px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        }
        
        .chat-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 20px;
            border-radius: 16px 16px 0 0;
            font-weight: 600;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .chat-input-area {
            padding: 20px;
            border-top: 1px solid #eee;
            display: flex;
            gap: 10px;
        }
        
        .chat-input {
            flex: 1;
            padding: 15px;
            border: 2px solid #eee;
            border-radius: 25px;
            font-size: 16px;
        }
        
        .chat-send {
            padding: 15px 25px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
        }
        
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        
        .status-active { background: #27ae60; }
        .status-warning { background: #f39c12; }
        .status-error { background: #e74c3c; }
        
        @media (max-width: 768px) {
            .sidebar {
                width: 100%;
                position: absolute;
                left: -100%;
                transition: left 0.3s ease;
                z-index: 999;
            }
            
            .sidebar.active {
                left: 0;
            }
            
            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="logo">
                🚀 FrontierAI
            </div>
            
            <div class="main-actions">
                <button class="btn-primary" onclick="openConnectBusinessModal()">
                    🏢 Connect Your Business
                </button>
                <button class="btn-secondary" onclick="showEvolutionDashboard()">
                    🧬 Self-Evolution Monitor
                </button>
            </div>
            
            <div class="businesses-list" id="businessesList">
                <div style="text-align: center; color: #666; padding: 20px;">
                    <p>No businesses connected yet.</p>
                    <p style="font-size: 14px; margin-top: 10px;">Click "Connect Your Business" to get started!</p>
                </div>
            </div>
        </div>
        
        <div class="main-content">
            <div class="header">
                <h1 id="pageTitle">Welcome to FrontierAI</h1>
                <button class="evolution-btn" onclick="showEvolutionDashboard()">
                    🧬 Evolution Dashboard
                </button>
            </div>
            
            <div class="content-area" id="contentArea">
                <div class="welcome-screen">
                    <h2>🚀 Advanced AI Business Automation</h2>
                    <p>
                        FrontierAI is your intelligent business companion that connects all your tools, 
                        analyzes your operations, and continuously evolves to serve you better. 
                        Start by connecting your business to unlock powerful automation and insights.
                    </p>
                    
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-icon">🔗</div>
                            <div class="feature-title">Universal Integrations</div>
                            <div class="feature-description">
                                Connect CRM, bookkeeping, Google Sheets, automation tools, and more. 
                                All your business tools in one intelligent dashboard.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">📊</div>
                            <div class="feature-title">Custom Dashboards</div>
                            <div class="feature-description">
                                AI-powered dashboards tailored to your business needs with real-time 
                                analytics and actionable insights.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">🧬</div>
                            <div class="feature-title">Self-Evolution</div>
                            <div class="feature-description">
                                Our AI continuously monitors, learns, and upgrades itself to stay 
                                ahead of the market and serve you better.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">💡</div>
                            <div class="feature-title">Business Intelligence</div>
                            <div class="feature-description">
                                Financial analysis, website development, process optimization - 
                                AI-powered solutions for business growth.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Connect Business Modal -->
    <div id="connectBusinessModal" class="modal">
        <div class="modal-content">
            <h3>🏢 Connect Your Business</h3>
            <p style="color: #666; margin-bottom: 25px;">
                Create a dedicated workspace for your business with integrated tools and custom dashboards.
            </p>
            
            <div class="form-group">
                <label for="businessName">Business Name</label>
                <input type="text" id="businessName" placeholder="Enter your business name">
            </div>
            
            <div class="modal-actions">
                <button class="btn-cancel" onclick="closeConnectBusinessModal()">Cancel</button>
                <button class="btn-primary" onclick="createBusiness()">Create Business Workspace</button>
            </div>
        </div>
    </div>

    <script>
        // Initialize Socket.IO
        const socket = io();
        let currentBusinessId = null;
        
        // Socket event handlers
        socket.on('connect', function() {
            console.log('Connected to FrontierAI');
        });
        
        socket.on('task_progress', function(data) {
            updateTaskProgress(data.task_id, data.progress, data.status);
        });
        
        // Load businesses on startup
        loadBusinesses();
        
        function openConnectBusinessModal() {
            document.getElementById('connectBusinessModal').style.display = 'block';
        }
        
        function closeConnectBusinessModal() {
            document.getElementById('connectBusinessModal').style.display = 'none';
            document.getElementById('businessName').value = '';
        }
        
        async function createBusiness() {
            const businessName = document.getElementById('businessName').value.trim();
            if (!businessName) {
                alert('Please enter a business name');
                return;
            }
            
            try {
                const response = await fetch('/api/create_business', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_name: businessName })
                });
                
                const result = await response.json();
                if (result.success) {
                    closeConnectBusinessModal();
                    loadBusinesses();
                    showBusinessDashboard(result.business_id);
                } else {
                    alert('Error creating business: ' + result.error);
                }
            } catch (error) {
                alert('Error creating business: ' + error.message);
            }
        }
        
        async function loadBusinesses() {
            try {
                const response = await fetch('/api/businesses');
                const businesses = await response.json();
                
                const container = document.getElementById('businessesList');
                if (businesses.length === 0) {
                    container.innerHTML = `
                        <div style="text-align: center; color: #666; padding: 20px;">
                            <p>No businesses connected yet.</p>
                            <p style="font-size: 14px; margin-top: 10px;">Click "Connect Your Business" to get started!</p>
                        </div>
                    `;
                } else {
                    container.innerHTML = businesses.map(business => `
                        <div class="business-item" onclick="showBusinessDashboard(${business.id})">
                            <div class="business-name">📁 ${business.name}</div>
                            <div class="business-stats">
                                <span class="status-indicator status-active"></span>
                                Created ${new Date(business.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    `).join('');
                }
            } catch (error) {
                console.error('Error loading businesses:', error);
            }
        }
        
        function showBusinessDashboard(businessId) {
            currentBusinessId = businessId;
            document.getElementById('pageTitle').textContent = 'Business Dashboard';
            
            document.getElementById('contentArea').innerHTML = `
                <div style="margin-bottom: 30px;">
                    <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                        <button class="btn-primary" onclick="showIntegrations()" style="width: auto; padding: 15px 25px;">
                            🔗 Manage Integrations
                        </button>
                        <button class="btn-primary" onclick="analyzeFinancials()" style="width: auto; padding: 15px 25px;">
                            📊 Analyze Financials
                        </button>
                        <button class="btn-primary" onclick="developWebsite()" style="width: auto; padding: 15px 25px;">
                            🌐 Develop Website
                        </button>
                    </div>
                    
                    <div class="feature-grid">
                        <div class="feature-card">
                            <div class="feature-title">💬 AI Business Chat</div>
                            <div class="chat-interface">
                                <div class="chat-header">
                                    FrontierAI Assistant
                                </div>
                                <div class="chat-messages" id="chatMessages">
                                    <div style="padding: 20px; color: #666; text-align: center;">
                                        Hello! I'm your AI business assistant. How can I help optimize your business today?
                                    </div>
                                </div>
                                <div class="chat-input-area">
                                    <input type="text" class="chat-input" id="chatInput" placeholder="Ask me anything about your business...">
                                    <button class="chat-send" onclick="sendMessage()">Send</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-title">📈 Business Overview</div>
                            <div style="text-align: center; padding: 20px;">
                                <h3 style="color: #667eea; margin-bottom: 15px;">Quick Stats</h3>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                                        <div style="font-size: 24px; font-weight: bold; color: #27ae60;">0</div>
                                        <div style="color: #666;">Integrations</div>
                                    </div>
                                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                                        <div style="font-size: 24px; font-weight: bold; color: #3498db;">0</div>
                                        <div style="color: #666;">Projects</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        function showEvolutionDashboard() {
            document.getElementById('pageTitle').textContent = 'Self-Evolution Monitoring';
            
            document.getElementById('contentArea').innerHTML = `
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-title">💓 GitHub Heartbeat Monitor</div>
                        <div id="githubStatus" style="padding: 20px;">
                            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                                <span class="status-indicator status-active"></span>
                                Repository: github.com/Kenan3477/FroniterAi
                            </div>
                            <div style="color: #666; font-size: 14px;">
                                Last Check: <span id="lastCheck">Loading...</span>
                            </div>
                            <button class="btn-secondary" onclick="checkGitHubStatus()" style="margin-top: 15px;">
                                🔄 Refresh Status
                            </button>
                        </div>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-title">🧬 Evolution Footprint</div>
                        <div id="evolutionFeed" style="max-height: 300px; overflow-y: auto; padding: 20px;">
                            <div style="color: #666; text-align: center;">
                                Evolution feed will appear here...
                            </div>
                        </div>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-title">🎯 Task Implementer</div>
                        <div style="padding: 20px;">
                            <div class="form-group">
                                <label for="evolutionTask">Give the AI a task to implement:</label>
                                <input type="text" id="evolutionTask" placeholder="e.g., Improve dashboard performance">
                            </div>
                            <button class="btn-primary" onclick="submitEvolutionTask()">
                                🚀 Submit Task
                            </button>
                            <div id="taskProgress" style="margin-top: 20px;"></div>
                        </div>
                    </div>
                    
                    <div class="feature-card">
                        <div class="feature-title">📊 Market Analysis</div>
                        <div id="marketAnalysis" style="padding: 20px;">
                            <p style="color: #666; margin-bottom: 15px;">
                                Analyzing market for potential upgrades...
                            </p>
                            <button class="btn-secondary" onclick="loadMarketAnalysis()">
                                📈 Load Analysis
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            loadEvolutionData();
        }
        
        async function checkGitHubStatus() {
            try {
                const response = await fetch('/api/github_status');
                const status = await response.json();
                
                document.getElementById('lastCheck').textContent = new Date().toLocaleString();
                
                const statusElement = document.querySelector('#githubStatus .status-indicator');
                statusElement.className = `status-indicator ${status.status === 'connected' ? 'status-active' : 'status-error'}`;
            } catch (error) {
                console.error('Error checking GitHub status:', error);
            }
        }
        
        async function submitEvolutionTask() {
            const taskInput = document.getElementById('evolutionTask');
            const task = taskInput.value.trim();
            
            if (!task) {
                alert('Please enter a task description');
                return;
            }
            
            try {
                const response = await fetch('/api/submit_task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task: task })
                });
                
                const result = await response.json();
                if (result.success) {
                    taskInput.value = '';
                    
                    document.getElementById('taskProgress').innerHTML = `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 10px;">
                            <div style="font-weight: 600; margin-bottom: 10px;">Task #${result.task_id}: ${task}</div>
                            <div class="progress-bar" style="background: #eee; height: 10px; border-radius: 5px; overflow: hidden;">
                                <div id="progress-${result.task_id}" style="background: #667eea; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                            </div>
                            <div id="status-${result.task_id}" style="color: #666; font-size: 14px; margin-top: 5px;">Starting...</div>
                        </div>
                    `;
                }
            } catch (error) {
                alert('Error submitting task: ' + error.message);
            }
        }
        
        function updateTaskProgress(taskId, progress, status) {
            const progressBar = document.getElementById(`progress-${taskId}`);
            const statusText = document.getElementById(`status-${taskId}`);
            
            if (progressBar) {
                progressBar.style.width = progress + '%';
            }
            if (statusText) {
                statusText.textContent = status;
            }
        }
        
        async function loadMarketAnalysis() {
            try {
                const response = await fetch('/api/market_analysis');
                const analysis = await response.json();
                
                document.getElementById('marketAnalysis').innerHTML = `
                    <div style="padding: 20px;">
                        <h4 style="margin-bottom: 15px; color: #333;">Potential Upgrades</h4>
                        ${analysis.map(upgrade => `
                            <div style="background: #f8f9fa; padding: 15px; margin-bottom: 10px; border-radius: 10px;">
                                <div style="font-weight: 600; color: #333;">${upgrade.upgrade_type}</div>
                                <div style="color: #666; font-size: 14px; margin: 5px 0;">${upgrade.description}</div>
                                <div style="font-size: 12px;">
                                    <span style="background: ${upgrade.priority === 'high' ? '#e74c3c' : '#f39c12'}; color: white; padding: 2px 8px; border-radius: 4px; margin-right: 5px;">
                                        ${upgrade.priority.toUpperCase()}
                                    </span>
                                    Complexity: ${upgrade.implementation_complexity}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } catch (error) {
                console.error('Error loading market analysis:', error);
            }
        }
        
        function loadEvolutionData() {
            checkGitHubStatus();
            loadMarketAnalysis();
        }
        
        function sendMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;
            
            const messagesContainer = document.getElementById('chatMessages');
            messagesContainer.innerHTML += `
                <div style="margin-bottom: 15px; text-align: right;">
                    <div style="background: #667eea; color: white; padding: 10px 15px; border-radius: 15px; display: inline-block; max-width: 80%;">
                        ${message}
                    </div>
                </div>
            `;
            
            input.value = '';
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Simulate AI response
            setTimeout(() => {
                messagesContainer.innerHTML += `
                    <div style="margin-bottom: 15px;">
                        <div style="background: #f8f9fa; color: #333; padding: 10px 15px; border-radius: 15px; display: inline-block; max-width: 80%;">
                            I understand you're asking about "${message}". I'm analyzing your business data to provide the best recommendations. How else can I assist you?
                        </div>
                    </div>
                `;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 1000);
        }
        
        // Handle Enter key in chat
        document.addEventListener('keypress', function(event) {
            if (event.key === 'Enter' && event.target.id === 'chatInput') {
                sendMessage();
            }
        });
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('connectBusinessModal');
            if (event.target === modal) {
                closeConnectBusinessModal();
            }
        }
    </script>
</body>
</html>
'''

# Routes
@app.route('/')
def index():
    """Main dashboard route"""
    return render_template_string(MAIN_DASHBOARD_TEMPLATE)

@app.route('/api/create_business', methods=['POST'])
def create_business():
    """Create new business workspace"""
    try:
        data = request.get_json()
        business_name = data.get('business_name', '').strip()
        
        if not business_name:
            return jsonify({'success': False, 'error': 'Business name is required'})
        
        result = business_manager.create_business_folder(business_name)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error creating business: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/businesses')
def get_businesses():
    """Get all businesses"""
    try:
        businesses = business_manager.get_businesses()
        return jsonify(businesses)
    except Exception as e:
        logger.error(f"Error getting businesses: {e}")
        return jsonify([])

@app.route('/api/github_status')
def github_status():
    """Get GitHub repository status"""
    try:
        status = evolution_engine.monitor_github_repo()
        return jsonify(status)
    except Exception as e:
        logger.error(f"Error getting GitHub status: {e}")
        return jsonify({'status': 'error', 'error': str(e)})

@app.route('/api/submit_task', methods=['POST'])
def submit_task():
    """Submit task to evolution engine"""
    try:
        data = request.get_json()
        task = data.get('task', '').strip()
        
        if not task:
            return jsonify({'success': False, 'error': 'Task description is required'})
        
        task_id = evolution_engine.implement_task(task)
        return jsonify({'success': True, 'task_id': task_id})
    except Exception as e:
        logger.error(f"Error submitting task: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/market_analysis')
def market_analysis():
    """Get market analysis for potential upgrades"""
    try:
        analysis = evolution_engine.analyze_market_upgrades()
        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Error getting market analysis: {e}")
        return jsonify([])

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'FrontierAI Complete System',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0'
    })

# SocketIO events
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info('Client connected to FrontierAI')
    emit('status', {'message': 'Connected to FrontierAI'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info('Client disconnected from FrontierAI')

@socketio.on('join_business')
def handle_join_business(data):
    """Join business room for updates"""
    business_id = data.get('business_id')
    if business_id:
        join_room(f'business_{business_id}')
        emit('status', {'message': f'Joined business {business_id}'})

@socketio.on('chat_message')
def handle_chat_message(data):
    """Handle chat message"""
    business_id = data.get('business_id')
    message = data.get('message')
    
    if business_id and message:
        # Store conversation in database
        conn = sqlite3.connect('frontier_ai_system.db')
        cursor = conn.cursor()
        cursor.execute('''
        INSERT INTO conversations (business_id, conversation_data)
        VALUES (?, ?)
        ''', (business_id, json.dumps({'message': message, 'timestamp': datetime.now().isoformat()})))
        conn.commit()
        conn.close()
        
        # Emit to business room
        socketio.emit('chat_response', {
            'message': f"I received your message: {message}. I'm analyzing this and will provide recommendations.",
            'timestamp': datetime.now().isoformat()
        }, room=f'business_{business_id}')

if __name__ == '__main__':
    logger.info("🚀 Starting FrontierAI Complete System...")
    
    try:
        port = int(os.environ.get('PORT', 5000))
        logger.info(f"📍 FrontierAI Complete System starting on port {port}")
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        logger.error(f"💥 Failed to start FrontierAI Complete System: {e}")
        traceback.print_exc()
        sys.exit(1)
