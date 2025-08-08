"""
FrontierAI - Complete Advanced System
ChatGPT-style interface with business integrations + self-evolution monitoring
DEPLOYMENT TIMESTAMP: 2025-08-08 FINAL COMPLETE SYSTEM - FORCE REDEPLOY
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

# Import our code analyzer
from code_analyzer import CodeAnalyzer, analyze_repository, CodeAnalysisScheduler

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

# HTML Templates
CODE_ANALYSIS_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FrontierAI - Code Analysis</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css">
    <style>
        body {
            background-color: #0d1117;
            color: #c9d1d9;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .navbar {
            background-color: #161b22;
            border-bottom: 1px solid #30363d;
        }
        .card {
            background-color: #161b22;
            border: 1px solid #30363d;
            border-radius: 6px;
            margin-bottom: 20px;
        }
        .card-header {
            background-color: #21262d;
            border-bottom: 1px solid #30363d;
        }
        .btn-primary {
            background-color: #238636;
            border-color: #238636;
        }
        .btn-primary:hover {
            background-color: #2ea043;
            border-color: #2ea043;
        }
        .badge {
            font-size: 0.9em;
        }
        .progress {
            height: 8px;
            background-color: #21262d;
        }
        .progress-bar {
            background-color: #238636;
        }
        .stat-card {
            text-align: center;
            padding: 15px;
        }
        .stat-card i {
            font-size: 2rem;
            margin-bottom: 10px;
            color: #58a6ff;
        }
        .stat-card .stat-value {
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .stat-card .stat-label {
            font-size: 0.9rem;
            color: #8b949e;
        }
        pre {
            background-color: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 15px;
            white-space: pre-wrap;
        }
        .markdown-body {
            padding: 20px;
            background-color: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.5;
        }
        .markdown-body h1, .markdown-body h2, .markdown-body h3 {
            margin-top: 24px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: #c9d1d9;
            border-bottom: 1px solid #21262d;
            padding-bottom: 0.3em;
        }
        .markdown-body h1 {
            font-size: 2em;
        }
        .markdown-body h2 {
            font-size: 1.5em;
        }
        .markdown-body h3 {
            font-size: 1.25em;
        }
        .markdown-body ul, .markdown-body ol {
            padding-left: 2em;
            margin-top: 0;
            margin-bottom: 16px;
        }
        .markdown-body li {
            margin-top: 0.25em;
        }
        .markdown-body code {
            background-color: #161b22;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
            font-size: 85%;
        }
        .markdown-body hr {
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: #30363d;
            border: 0;
        }
        #loadingIndicator {
            display: none;
            text-align: center;
            margin-top: 20px;
        }
        .spinner-border {
            color: #238636;
        }
        .issue-type {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8em;
            margin-right: 5px;
        }
        .issue-critical {
            background-color: #f85149;
            color: white;
        }
        .issue-warning {
            background-color: #f0883e;
            color: black;
        }
        .issue-improvement {
            background-color: #3fb950;
            color: black;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark mb-4">
        <div class="container-fluid">
            <a class="navbar-brand" href="/"><i class="bi bi-braces"></i> FrontierAI Code Analysis</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="/"><i class="bi bi-house"></i> Dashboard</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="/code-analysis"><i class="bi bi-code-square"></i> Code Analysis</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <div class="container">
        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="mb-0"><i class="bi bi-code-square"></i> Code Analysis Dashboard</h5>
                        <button id="runAnalysisBtn" class="btn btn-primary btn-sm">
                            <i class="bi bi-play-fill"></i> Run Analysis
                        </button>
                    </div>
                    <div class="card-body">
                        <p>This tool analyzes your FrontierAI GitHub repository to identify code quality issues and improvement opportunities.</p>
                        <div id="loadingIndicator">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                            <p class="mt-2">Analyzing repository... This may take a few minutes.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4" id="summaryStats" style="display: none;">
            <div class="col-md-3">
                <div class="card stat-card">
                    <i class="bi bi-file-code"></i>
                    <div class="stat-value" id="filesAnalyzed">0</div>
                    <div class="stat-label">Files Analyzed</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <i class="bi bi-code-slash"></i>
                    <div class="stat-value" id="totalLines">0</div>
                    <div class="stat-label">Lines of Code</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <i class="bi bi-exclamation-triangle"></i>
                    <div class="stat-value" id="totalIssues">0</div>
                    <div class="stat-label">Issues Found</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <i class="bi bi-lightbulb"></i>
                    <div class="stat-value" id="totalOpportunities">0</div>
                    <div class="stat-label">Improvements</div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-clock"></i> Scheduled Analysis</h5>
                    </div>
                    <div class="card-body">
                        <div id="schedulerStatus">Loading scheduler status...</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <div class="col-12">
                <div class="card" id="reportCard" style="display: none;">
                    <div class="card-header">
                        <h5 class="mb-0"><i class="bi bi-file-text"></i> Analysis Report</h5>
                    </div>
                    <div class="card-body">
                        <div class="markdown-body" id="reportContent">
                            <!-- Report content will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const runAnalysisBtn = document.getElementById('runAnalysisBtn');
            const loadingIndicator = document.getElementById('loadingIndicator');
            const summaryStats = document.getElementById('summaryStats');
            const reportCard = document.getElementById('reportCard');
            const reportContent = document.getElementById('reportContent');
            const schedulerStatus = document.getElementById('schedulerStatus');
            
            // Format numbers with commas
            function formatNumber(num) {
                return num.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
            }
            
            // Check if analysis results exist
            fetch('/api/code-analysis-results')
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data) {
                        updateStats(data.data.summary);
                        
                        // Get the markdown report
                        fetch('/api/code-analysis-report')
                            .then(response => response.json())
                            .then(reportData => {
                                if (reportData.success && reportData.markdown) {
                                    reportContent.innerHTML = marked.parse(reportData.markdown);
                                    reportCard.style.display = 'block';
                                }
                            });
                    }
                });
            
            // Run analysis button click handler
            runAnalysisBtn.addEventListener('click', function() {
                runAnalysisBtn.disabled = true;
                loadingIndicator.style.display = 'block';
                
                fetch('/api/run-code-analysis', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        updateStats(data.summary);
                        
                        // Get the markdown report
                        fetch('/api/code-analysis-report')
                            .then(response => response.json())
                            .then(reportData => {
                                if (reportData.success && reportData.markdown) {
                                    reportContent.innerHTML = marked.parse(reportData.markdown);
                                    reportCard.style.display = 'block';
                                }
                                
                                runAnalysisBtn.disabled = false;
                                loadingIndicator.style.display = 'none';
                            });
                    } else {
                        alert('Analysis failed: ' + data.error);
                        runAnalysisBtn.disabled = false;
                        loadingIndicator.style.display = 'none';
                    }
                })
                .catch(error => {
                    alert('Error: ' + error);
                    runAnalysisBtn.disabled = false;
                    loadingIndicator.style.display = 'none';
                });
            });
            
            // Update stats display
            function updateStats(summary) {
                document.getElementById('filesAnalyzed').textContent = summary.files_analyzed;
                document.getElementById('totalLines').textContent = formatNumber(summary.total_lines);
                document.getElementById('totalIssues').textContent = summary.total_issues;
                document.getElementById('totalOpportunities').textContent = summary.total_opportunities;
                summaryStats.style.display = 'flex';
            }
            
            // Get scheduler status
            function updateSchedulerStatus() {
                fetch('/api/code-analysis-scheduler')
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            const status = data.status;
                            let html = '<div class="d-flex justify-content-between align-items-center">';
                            
                            // Status badge
                            html += '<div><span class="badge ' + (status.running ? 'bg-success' : 'bg-secondary') + '">' + 
                                   (status.running ? 'Active' : 'Inactive') + '</span></div>';
                            
                            // Status details   
                            html += '<div>';
                            if (status.last_run) {
                                const lastRunDate = new Date(status.last_run);
                                html += '<div>Last analysis: ' + lastRunDate.toLocaleString() + '</div>';
                            }
                            
                            if (status.next_run) {
                                const nextRunDate = new Date(status.next_run);
                                html += '<div>Next scheduled: ' + nextRunDate.toLocaleString() + '</div>';
                            }
                            
                            html += '<div>Analysis frequency: Every ' + status.interval_hours + ' hours</div>';
                            html += '</div>';
                            html += '</div>';
                            
                            schedulerStatus.innerHTML = html;
                        } else {
                            schedulerStatus.innerHTML = '<div class="alert alert-warning">Unable to get scheduler status: ' + data.error + '</div>';
                        }
                    })
                    .catch(error => {
                        schedulerStatus.innerHTML = '<div class="alert alert-danger">Error: ' + error + '</div>';
                    });
            }
            
            // Initial load
            updateSchedulerStatus();
            
            // Refresh scheduler status every 60 seconds
            setInterval(updateSchedulerStatus, 60000);
        });
    </script>
</body>
</html>
"""

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
# Initialize code analysis scheduler with 12-hour interval
code_analyzer_scheduler = CodeAnalysisScheduler(os.getcwd(), interval_hours=12)

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
                <div class="nav-item" onclick="window.location.href='/code-analysis'">
                    <span>🔍</span> Code Analysis
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
                        
                        <div class="feature-card" onclick="window.location.href='/code-analysis'">
                            <div class="feature-icon">🔍</div>
                            <div class="feature-title">Code Analysis</div>
                            <div class="feature-desc">
                                Analyze repository code quality, detect issues, and receive improvement recommendations automatically.
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

# Code Analysis Routes
@app.route('/code-analysis')
def code_analysis_dashboard():
    """Dashboard for code analysis results"""
    return render_template_string(CODE_ANALYSIS_TEMPLATE)

@app.route('/api/run-code-analysis', methods=['POST'])
def run_code_analysis():
    """Run code analysis on the repository"""
    try:
        data = request.json or {}
        # Check if we're analyzing a GitHub repository
        github_repo = data.get('github_repo')
        github_token = data.get('github_token') or os.environ.get('GITHUB_TOKEN')
        
        # Get repo path - local or from Railway adapter
        if hasattr(CodeAnalyzer, 'RailwayEnvironmentAdapter') and CodeAnalyzer.RailwayEnvironmentAdapter.is_railway_environment():
            repo_path = CodeAnalyzer.RailwayEnvironmentAdapter.get_repo_path()
            output_dir = CodeAnalyzer.RailwayEnvironmentAdapter.setup_analysis_dir()
        else:
            repo_path = os.environ.get('REPO_PATH', os.getcwd())
            output_dir = os.path.join(repo_path, 'analysis')
            os.makedirs(output_dir, exist_ok=True)
            
        output_md = os.path.join(output_dir, "code_analysis_report.md")
        output_json = os.path.join(output_dir, "code_analysis_data.json")
        
        # Initialize analyzer with GitHub repo info if provided
        if github_repo:
            logger.info(f"Analyzing GitHub repository: {github_repo}")
            # Create a temporary directory for the cloned repo
            with tempfile.TemporaryDirectory() as temp_dir:
                # Clone the repo
                analyzer = CodeAnalyzer(temp_dir, github_repo=github_repo, github_token=github_token)
                analyzer.clone_github_repo(target_dir=temp_dir)
                # Run analysis on the cloned repo
                analyzer.scan_repository()
                analyzer.generate_report(output_md)
                analyzer.save_results(output_json)
        else:
            # Run analysis on local repo
            logger.info(f"Starting code analysis on {repo_path}")
            analyzer = analyze_repository(repo_path, output_md, output_json)
        
        # Update system metrics
        system_metrics["files_analyzed"] = analyzer.get_summary_stats()["files_analyzed"]
        
        return jsonify({
            "success": True,
            "summary": analyzer.get_summary_stats(),
            "report_path": output_md
        })
    except Exception as e:
        logger.error(f"Code analysis error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        })
        
@app.route('/api/github-analysis', methods=['POST'])
def github_repo_analysis():
    """Run code analysis on a GitHub repository"""
    try:
        data = request.json
        if not data or 'repo' not in data:
            return jsonify({
                "success": False,
                "error": "Missing required parameter: 'repo'"
            }), 400
            
        github_repo = data['repo']  # Format: "username/repo"
        github_token = data.get('token') or os.environ.get('GITHUB_TOKEN')
        branch = data.get('branch', 'main')
        
        logger.info(f"Starting GitHub repository analysis: {github_repo}")
        
        # Create a temporary directory for the cloned repo
        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                # Initialize analyzer with GitHub repo info
                analyzer = CodeAnalyzer(temp_dir, github_repo=github_repo, github_token=github_token)
                
                # Get repository info from GitHub API
                repo_info = analyzer.get_github_repo_info()
                if not repo_info:
                    return jsonify({
                        "success": False,
                        "error": "Failed to fetch repository information"
                    }), 400
                
                # Clone the repository
                analyzer.clone_github_repo(target_dir=temp_dir, branch=branch)
                
                # Run analysis
                results = analyzer.scan_repository()
                
                # Set up output paths using Railway adapter if available
                if hasattr(analyzer, 'is_railway') and analyzer.is_railway:
                    from code_analyzer import RailwayEnvironmentAdapter
                    output_dir = RailwayEnvironmentAdapter.setup_analysis_dir()
                else:
                    output_dir = os.path.join(os.getcwd(), 'analysis')
                    os.makedirs(output_dir, exist_ok=True)
                
                # Generate timestamp for unique filenames
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                repo_slug = github_repo.replace('/', '_')
                output_md = os.path.join(output_dir, f"{repo_slug}_{timestamp}_analysis.md")
                output_json = os.path.join(output_dir, f"{repo_slug}_{timestamp}_analysis.json")
                
                # Generate report and save results
                analyzer.generate_report(output_md)
                analyzer.save_results(output_json)
                
                # Return results
                return jsonify({
                    "success": True,
                    "repository": github_repo,
                    "analysis_timestamp": timestamp,
                    "repository_info": {
                        "name": repo_info.get('name'),
                        "description": repo_info.get('description'),
                        "stars": repo_info.get('stargazers_count'),
                        "forks": repo_info.get('forks_count'),
                        "created_at": repo_info.get('created_at'),
                        "updated_at": repo_info.get('updated_at'),
                        "default_branch": repo_info.get('default_branch')
                    },
                    "summary": analyzer.get_summary_stats(),
                    "report_path": output_md,
                    "data_path": output_json
                })
            except Exception as e:
                logger.error(f"Error analyzing GitHub repository: {str(e)}")
                return jsonify({
                    "success": False,
                    "error": f"Failed to analyze repository: {str(e)}"
                }), 500
    except Exception as e:
        logger.error(f"Error in GitHub analysis endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/code-analysis-results')
def get_code_analysis_results():
    """Get the latest code analysis results"""
    try:
        repo_path = os.environ.get('REPO_PATH', os.getcwd())
        json_path = os.path.join(repo_path, 'analysis', 'code_analysis_data.json')
        
        if os.path.exists(json_path):
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify({"success": True, "data": data})
        else:
            return jsonify({
                "success": False, 
                "error": "No analysis results found", 
                "message": "Run analysis first"
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/code-analysis-report')
def get_code_analysis_report():
    """Get the latest code analysis report in Markdown"""
    try:
        repo_path = os.environ.get('REPO_PATH', os.getcwd())
        md_path = os.path.join(repo_path, 'analysis', 'code_analysis_report.md')
        
        if os.path.exists(md_path):
            with open(md_path, 'r', encoding='utf-8') as f:
                markdown_content = f.read()
            return jsonify({"success": True, "markdown": markdown_content})
        else:
            return jsonify({
                "success": False, 
                "error": "No analysis report found",
                "message": "Run analysis first"
            })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/code-analysis-scheduler')
def get_code_analysis_scheduler_status():
    """Get the status of the code analysis scheduler"""
    try:
        status = code_analyzer_scheduler.get_status()
        return jsonify({
            "success": True,
            "status": status
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

def start_background_services():
    """Start all background monitoring services"""
    try:
        github_monitor.start_monitoring()
        evolution_engine.start_evolution()
        code_analyzer_scheduler.start_scheduling()
        logger.info("✅ All background services started")
    except Exception as e:
        logger.error(f"Background services error: {e}")

# Only run directly if this file is executed, not when imported by main.py
if __name__ == '__main__':
    logger.info("🚀 FRONTIER AI - COMPLETE SYSTEM STARTING")
    logger.info("🏢 ChatGPT-style interface with business integrations")
    logger.info("🧬 Self-evolution monitoring for https://github.com/Kenan3477/FroniterAi")
    logger.info("🔍 Code analysis module integrated with automatic scheduling")
    
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
