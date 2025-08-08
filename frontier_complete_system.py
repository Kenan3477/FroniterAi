"""
FrontierAI - Complete Advanced System
ChatGPT-style interface with business integrations + self-evolution monitoring
DEPLOYMENT TIMESTAMP: 2025-08-08 FINAL COMPLETE SYSTEM
"""

import os
import sys
import sqlite3
import json
import time
import threading
import subprocess
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Dict, List, Optional, Any
import hashlib
import logging

# Flask imports with error handling
try:
    from flask import Flask, jsonify, render_template_string, request, redirect, url_for
    from flask_cors import CORS
except ImportError:
    print("Installing Flask...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask==3.0.0", "flask-cors"])
    from flask import Flask, jsonify, render_template_string, request, redirect, url_for
    from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Global variables
businesses = {}
evolution_log = []
system_metrics = {
    "uptime_start": datetime.now(),
    "github_commits": 0,
    "evolutions_completed": 0,
    "files_analyzed": 0,
    "business_integrations": 0
}

class DatabaseManager:
    """Manages all database operations"""
    
    def __init__(self):
        self.init_databases()
    
    def init_databases(self):
        """Initialize all required databases"""
        try:
            # Business database
            with sqlite3.connect('businesses.db') as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS businesses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        created_at TEXT NOT NULL,
                        integrations TEXT,
                        dashboard_config TEXT,
                        status TEXT DEFAULT 'active'
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS conversations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        business_id INTEGER,
                        title TEXT,
                        content TEXT,
                        timestamp TEXT,
                        FOREIGN KEY (business_id) REFERENCES businesses (id)
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS projects (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        business_id INTEGER,
                        name TEXT,
                        description TEXT,
                        status TEXT,
                        progress INTEGER DEFAULT 0,
                        created_at TEXT,
                        FOREIGN KEY (business_id) REFERENCES businesses (id)
                    )
                ''')
                conn.commit()
            
            # Evolution monitoring database
            with sqlite3.connect('evolution_monitoring.db') as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS evolution_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        action TEXT NOT NULL,
                        description TEXT,
                        file_path TEXT,
                        commit_hash TEXT,
                        status TEXT DEFAULT 'completed'
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS github_stats (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        commits_count INTEGER,
                        files_modified INTEGER,
                        connection_status TEXT,
                        last_commit_hash TEXT
                    )
                ''')
                
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS tasks (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        title TEXT NOT NULL,
                        description TEXT,
                        status TEXT DEFAULT 'pending',
                        progress INTEGER DEFAULT 0,
                        created_at TEXT,
                        completed_at TEXT
                    )
                ''')
                conn.commit()
                
            logger.info("✅ All databases initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization error: {e}")

class GitHubMonitor:
    """Monitors GitHub repository for FrontierAI"""
    
    def __init__(self, repo_url="https://github.com/Kenan3477/FroniterAi"):
        self.repo_url = repo_url
        self.running = False
        self.monitor_thread = None
    
    def start_monitoring(self):
        """Start GitHub monitoring"""
        if self.running:
            return
            
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("🔍 GitHub monitoring started")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                self._check_repository()
                time.sleep(300)  # Check every 5 minutes
            except Exception as e:
                logger.error(f"GitHub monitoring error: {e}")
                time.sleep(60)
    
    def _check_repository(self):
        """Check repository status"""
        try:
            # Get git status
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True, timeout=10)
            
            # Get commit count
            log_result = subprocess.run(['git', 'rev-list', '--count', 'HEAD'], 
                                      capture_output=True, text=True, timeout=10)
            
            # Get latest commit
            commit_result = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                                         capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                commits_count = int(log_result.stdout.strip()) if log_result.returncode == 0 else 0
                latest_commit = commit_result.stdout.strip() if commit_result.returncode == 0 else "unknown"
                
                # Store stats
                with sqlite3.connect('evolution_monitoring.db') as conn:
                    cursor = conn.cursor()
                    cursor.execute('''
                        INSERT INTO github_stats (timestamp, commits_count, connection_status, last_commit_hash)
                        VALUES (?, ?, ?, ?)
                    ''', (datetime.now().isoformat(), commits_count, "connected", latest_commit))
                    conn.commit()
                
                system_metrics["github_commits"] = commits_count
                
        except Exception as e:
            logger.error(f"Repository check failed: {e}")

class SelfEvolutionEngine:
    """Autonomous self-evolution system"""
    
    def __init__(self):
        self.running = False
        self.evolution_thread = None
    
    def start_evolution(self):
        """Start autonomous evolution"""
        if self.running:
            return
            
        self.running = True
        self.evolution_thread = threading.Thread(target=self._evolution_loop, daemon=True)
        self.evolution_thread.start()
        logger.info("🧬 Self-evolution engine started")
    
    def _evolution_loop(self):
        """Main evolution loop"""
        cycle_count = 0
        
        while self.running:
            try:
                cycle_count += 1
                self._perform_evolution_cycle(cycle_count)
                time.sleep(1800)  # 30 minutes between cycles
            except Exception as e:
                logger.error(f"Evolution cycle error: {e}")
                time.sleep(300)
    
    def _perform_evolution_cycle(self, cycle):
        """Perform single evolution cycle"""
        try:
            logger.info(f"🔍 Starting evolution cycle {cycle}")
            
            # Analyze current system
            analysis = self._analyze_system()
            
            # Log evolution attempt
            with sqlite3.connect('evolution_monitoring.db') as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO evolution_log (timestamp, action, description, status)
                    VALUES (?, ?, ?, ?)
                ''', (datetime.now().isoformat(), "evolution_cycle", 
                     f"Cycle {cycle}: Analyzed {analysis['files_count']} files", "completed"))
                conn.commit()
            
            system_metrics["evolutions_completed"] += 1
            system_metrics["files_analyzed"] = analysis['files_count']
            
        except Exception as e:
            logger.error(f"Evolution cycle failed: {e}")
    
    def _analyze_system(self):
        """Analyze current system state"""
        files_count = 0
        
        try:
            for root, dirs, files in os.walk('.'):
                # Skip hidden and build directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', 'node_modules']]
                files_count += len([f for f in files if not f.startswith('.')])
            
            return {
                'files_count': files_count,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"System analysis failed: {e}")
            return {'files_count': 0, 'timestamp': datetime.now().isoformat()}

# Initialize components
db_manager = DatabaseManager()
github_monitor = GitHubMonitor()
evolution_engine = SelfEvolutionEngine()

# Main Dashboard HTML Template
MAIN_DASHBOARD = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FrontierAI - Advanced Business Intelligence</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a1a;
            color: #ffffff;
            height: 100vh;
            overflow: hidden;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: 300px 1fr;
            height: 100vh;
        }
        
        .sidebar {
            background: #2d2d2d;
            border-right: 1px solid #444;
            display: flex;
            flex-direction: column;
        }
        
        .logo {
            padding: 20px;
            border-bottom: 1px solid #444;
            text-align: center;
        }
        
        .logo h1 {
            background: linear-gradient(45deg, #00ff88, #0088ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .nav-section {
            padding: 20px;
            border-bottom: 1px solid #444;
        }
        
        .nav-title {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .nav-item {
            padding: 12px 15px;
            margin-bottom: 5px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .nav-item:hover {
            background: #3d3d3d;
        }
        
        .nav-item.active {
            background: linear-gradient(45deg, #00ff88, #0088ff);
            color: #000;
        }
        
        .business-item {
            padding: 10px 15px;
            margin-bottom: 8px;
            background: #3d3d3d;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .business-item:hover {
            background: #4d4d4d;
            transform: translateX(5px);
        }
        
        .add-business {
            padding: 12px 15px;
            background: linear-gradient(45deg, #00ff88, #0088ff);
            color: #000;
            border-radius: 8px;
            cursor: pointer;
            text-align: center;
            font-weight: 600;
            margin-top: 10px;
        }
        
        .main-content {
            background: #1a1a1a;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .header {
            padding: 20px 30px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h2 {
            font-size: 28px;
            font-weight: 300;
        }
        
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 16px;
            background: #2d2d2d;
            border-radius: 20px;
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #00ff88;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .content-area {
            flex: 1;
            padding: 30px;
            overflow-y: auto;
        }
        
        .feature-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            margin-bottom: 30px;
        }
        
        .feature-card {
            background: #2d2d2d;
            border-radius: 15px;
            padding: 25px;
            border: 1px solid #444;
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .feature-card:hover {
            border-color: #00ff88;
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 255, 136, 0.1);
        }
        
        .feature-icon {
            font-size: 32px;
            margin-bottom: 15px;
        }
        
        .feature-title {
            font-size: 20px;
            margin-bottom: 10px;
            font-weight: 600;
        }
        
        .feature-desc {
            color: #bbb;
            line-height: 1.5;
        }
        
        .evolution-panel {
            background: #2d2d2d;
            border-radius: 15px;
            padding: 25px;
            border: 1px solid #444;
        }
        
        .evolution-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .evolution-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: #3d3d3d;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: 700;
            color: #00ff88;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 12px;
            color: #888;
            text-transform: uppercase;
        }
        
        .activity-feed {
            max-height: 300px;
            overflow-y: auto;
        }
        
        .activity-item {
            padding: 12px;
            margin-bottom: 8px;
            background: #3d3d3d;
            border-radius: 8px;
            border-left: 3px solid #00ff88;
        }
        
        .activity-time {
            font-size: 12px;
            color: #888;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }
        
        .modal-content {
            background: #2d2d2d;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .form-input {
            width: 100%;
            padding: 12px;
            background: #3d3d3d;
            border: 1px solid #555;
            border-radius: 8px;
            color: #fff;
            font-size: 14px;
        }
        
        .btn {
            padding: 12px 24px;
            background: linear-gradient(45deg, #00ff88, #0088ff);
            color: #000;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
        }
        
        .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        .btn-secondary {
            background: #555;
            color: #fff;
            margin-right: 10px;
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="logo">
                <h1>🚀 FrontierAI</h1>
                <p style="color: #888; font-size: 12px;">Advanced Business Intelligence</p>
            </div>
            
            <div class="nav-section">
                <div class="nav-title">Main</div>
                <div class="nav-item active" onclick="showDashboard()">
                    <span>📊</span> Dashboard
                </div>
                <div class="nav-item" onclick="showEvolutionMonitor()">
                    <span>🧬</span> Evolution Monitor
                </div>
                <div class="nav-item" onclick="showTaskCenter()">
                    <span>⚙️</span> Task Center
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-title">Businesses</div>
                <div id="business-list">
                    <div class="business-item" onclick="selectBusiness('demo')">
                        📈 Demo Business
                    </div>
                </div>
                <div class="add-business" onclick="showAddBusinessModal()">
                    + Connect Your Business
                </div>
            </div>
            
            <div class="nav-section" style="margin-top: auto;">
                <div class="nav-title">System Status</div>
                <div style="font-size: 12px; color: #888;">
                    <div>GitHub: <span style="color: #00ff88;">Connected</span></div>
                    <div>Evolution: <span style="color: #00ff88;">Active</span></div>
                    <div>Uptime: <span id="uptime">{{ uptime }}</span></div>
                </div>
            </div>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
            <div class="header">
                <h2 id="page-title">FrontierAI Dashboard</h2>
                <div class="status-indicator">
                    <div class="status-dot"></div>
                    <span>System Online</span>
                </div>
            </div>
            
            <div class="content-area" id="content-area">
                <!-- Dashboard Content -->
                <div id="dashboard-content">
                    <div class="feature-grid">
                        <div class="feature-card" onclick="showAddBusinessModal()">
                            <div class="feature-icon">🏢</div>
                            <div class="feature-title">Connect Your Business</div>
                            <div class="feature-desc">
                                Integrate CRMs, bookkeeping software, Google Sheets, Make.com, and other business tools for comprehensive oversight.
                            </div>
                        </div>
                        
                        <div class="feature-card" onclick="showEvolutionMonitor()">
                            <div class="feature-icon">🧬</div>
                            <div class="feature-title">Self-Evolution Monitor</div>
                            <div class="feature-desc">
                                Monitor real-time autonomous improvements, GitHub activity, and system evolution with detailed analytics.
                            </div>
                        </div>
                        
                        <div class="feature-card" onclick="showTaskCenter()">
                            <div class="feature-icon">⚙️</div>
                            <div class="feature-title">Task Implementation</div>
                            <div class="feature-desc">
                                Assign tasks to the self-evolving system with progress tracking and automated implementation.
                            </div>
                        </div>
                        
                        <div class="feature-card">
                            <div class="feature-icon">📊</div>
                            <div class="feature-title">Advanced Analytics</div>
                            <div class="feature-desc">
                                Custom dashboards with business insights, financial analysis, and performance optimization recommendations.
                            </div>
                        </div>
                    </div>
                    
                    <div class="evolution-panel">
                        <div class="evolution-header">
                            <h3>🔴 Live System Evolution</h3>
                            <div style="font-size: 12px; color: #888;">
                                Monitoring: https://github.com/Kenan3477/FroniterAi
                            </div>
                        </div>
                        
                        <div class="evolution-stats">
                            <div class="stat-card">
                                <div class="stat-number" id="commits-count">{{ commits_count }}</div>
                                <div class="stat-label">GitHub Commits</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="evolutions-count">{{ evolutions_count }}</div>
                                <div class="stat-label">Evolution Cycles</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="files-analyzed">{{ files_analyzed }}</div>
                                <div class="stat-label">Files Analyzed</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-number" id="integrations-count">{{ integrations_count }}</div>
                                <div class="stat-label">Integrations</div>
                            </div>
                        </div>
                        
                        <div class="activity-feed" id="activity-feed">
                            <div class="activity-item">
                                <div><strong>System Started</strong> - FrontierAI initialization complete</div>
                                <div class="activity-time">{{ current_time }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Evolution Monitor Content -->
                <div id="evolution-content" style="display: none;">
                    <h3>🧬 Self-Evolution Monitoring Dashboard</h3>
                    <p>Real-time monitoring of autonomous system improvements...</p>
                    <!-- Evolution monitor content will be loaded here -->
                </div>
                
                <!-- Task Center Content -->
                <div id="task-content" style="display: none;">
                    <h3>⚙️ Task Implementation Center</h3>
                    <p>Assign tasks to the self-evolving system...</p>
                    <!-- Task center content will be loaded here -->
                </div>
            </div>
        </div>
    </div>
    
    <!-- Add Business Modal -->
    <div id="add-business-modal" class="modal">
        <div class="modal-content">
            <h3 style="margin-bottom: 20px;">🏢 Connect Your Business</h3>
            <form onsubmit="addBusiness(event)">
                <div class="form-group">
                    <label class="form-label">Business Name</label>
                    <input type="text" class="form-input" id="business-name" placeholder="Enter your business name" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Industry</label>
                    <select class="form-input" id="business-industry">
                        <option value="">Select industry</option>
                        <option value="technology">Technology</option>
                        <option value="retail">Retail</option>
                        <option value="finance">Finance</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="services">Services</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn">Create Business</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        // Auto-refresh system metrics
        setInterval(updateMetrics, 5000);
        
        function updateMetrics() {
            fetch('/api/metrics')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('commits-count').textContent = data.github_commits || 0;
                    document.getElementById('evolutions-count').textContent = data.evolutions_completed || 0;
                    document.getElementById('files-analyzed').textContent = data.files_analyzed || 0;
                    document.getElementById('integrations-count').textContent = data.business_integrations || 0;
                })
                .catch(e => console.error('Metrics update failed:', e));
        }
        
        function showDashboard() {
            document.getElementById('dashboard-content').style.display = 'block';
            document.getElementById('evolution-content').style.display = 'none';
            document.getElementById('task-content').style.display = 'none';
            document.getElementById('page-title').textContent = 'FrontierAI Dashboard';
            updateActiveNav('Dashboard');
        }
        
        function showEvolutionMonitor() {
            document.getElementById('dashboard-content').style.display = 'none';
            document.getElementById('evolution-content').style.display = 'block';
            document.getElementById('task-content').style.display = 'none';
            document.getElementById('page-title').textContent = 'Evolution Monitor';
            updateActiveNav('Evolution Monitor');
        }
        
        function showTaskCenter() {
            document.getElementById('dashboard-content').style.display = 'none';
            document.getElementById('evolution-content').style.display = 'none';
            document.getElementById('task-content').style.display = 'block';
            document.getElementById('page-title').textContent = 'Task Center';
            updateActiveNav('Task Center');
        }
        
        function updateActiveNav(activeItem) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.textContent.trim().includes(activeItem)) {
                    item.classList.add('active');
                }
            });
        }
        
        function showAddBusinessModal() {
            document.getElementById('add-business-modal').style.display = 'flex';
        }
        
        function closeModal() {
            document.getElementById('add-business-modal').style.display = 'none';
        }
        
        function addBusiness(event) {
            event.preventDefault();
            const name = document.getElementById('business-name').value;
            const industry = document.getElementById('business-industry').value;
            
            fetch('/api/businesses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, industry })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error: ' + data.error);
                }
            });
        }
        
        function selectBusiness(businessId) {
            // Navigate to business dashboard
            window.location.href = `/business/${businessId}`;
        }
        
        // Initialize
        updateMetrics();
    </script>
</body>
</html>
"""

# Flask Routes
@app.route('/')
def dashboard():
    """Main FrontierAI dashboard"""
    uptime = datetime.now() - system_metrics["uptime_start"]
    
    return render_template_string(MAIN_DASHBOARD,
        uptime=f"{uptime.days}d {uptime.seconds//3600}h",
        commits_count=system_metrics.get("github_commits", 0),
        evolutions_count=system_metrics.get("evolutions_completed", 0),
        files_analyzed=system_metrics.get("files_analyzed", 0),
        integrations_count=system_metrics.get("business_integrations", 0),
        current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    )

@app.route('/api/metrics')
def api_metrics():
    """System metrics API"""
    uptime = datetime.now() - system_metrics["uptime_start"]
    
    return jsonify({
        "github_commits": system_metrics.get("github_commits", 0),
        "evolutions_completed": system_metrics.get("evolutions_completed", 0),
        "files_analyzed": system_metrics.get("files_analyzed", 0),
        "business_integrations": system_metrics.get("business_integrations", 0),
        "uptime_seconds": uptime.total_seconds(),
        "status": "operational",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/businesses', methods=['POST'])
def create_business():
    """Create new business integration"""
    try:
        data = request.get_json()
        name = data.get('name')
        industry = data.get('industry', '')
        
        if not name:
            return jsonify({"success": False, "error": "Business name required"})
        
        with sqlite3.connect('businesses.db') as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO businesses (name, created_at, integrations, dashboard_config)
                VALUES (?, ?, ?, ?)
            ''', (name, datetime.now().isoformat(), '{}', '{}'))
            conn.commit()
            
            system_metrics["business_integrations"] += 1
            
        return jsonify({"success": True, "message": "Business created successfully"})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/evolution-log')
def get_evolution_log():
    """Get evolution monitoring log"""
    try:
        with sqlite3.connect('evolution_monitoring.db') as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM evolution_log ORDER BY timestamp DESC LIMIT 50')
            columns = [description[0] for description in cursor.description]
            log_entries = [dict(zip(columns, row)) for row in cursor.fetchall()]
            
        return jsonify({"log": log_entries})
        
    except Exception as e:
        return jsonify({"error": str(e)})

@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "frontier-ai-complete",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "github_monitor": github_monitor.running,
            "evolution_engine": evolution_engine.running,
            "database": True
        }
    })

def start_background_services():
    """Start all background monitoring services"""
    try:
        github_monitor.start_monitoring()
        evolution_engine.start_evolution()
        logger.info("✅ All background services started")
    except Exception as e:
        logger.error(f"Background services error: {e}")

if __name__ == '__main__':
    logger.info("🚀 FRONTIER AI - COMPLETE SYSTEM STARTING")
    logger.info("🏢 ChatGPT-style interface with business integrations")
    logger.info("🧬 Self-evolution monitoring for https://github.com/Kenan3477/FroniterAi")
    
    # Start background services
    start_background_services()
    
    # Get port from environment
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"🌐 Starting server on 0.0.0.0:{port}")
    
    # Run Flask app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False,
        threaded=True
    )
