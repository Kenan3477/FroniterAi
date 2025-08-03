#!/usr/bin/env python3
"""
FrontierAI Frontend Dashboard - ChatGPT Style Interface
Business Integration Platform with Self-Evolution Monitoring
"""

import os
import json
import sqlite3
import asyncio
import threading
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import uuid
import hashlib
from dataclasses import dataclass, asdict
from flask import Flask, render_template, request, jsonify, session
from flask_socketio import SocketIO, emit, join_room, leave_room
import logging

# Import our existing systems
try:
    from advanced_ui import AdvancedConversationalUI
    from command_center import CommandRegistry
    from evolution_trail import EvolutionTrail
    from github_heartbeat_monitor import GitHubHeartbeatMonitor
    from production_evolution_manager import ProductionEvolutionManager
except ImportError as e:
    print(f"Warning: Some components not available: {e}")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class BusinessProfile:
    """Business profile for connected businesses"""
    business_id: str
    business_name: str
    created_at: datetime
    integrations: Dict[str, Any]
    custom_dashboard: Dict[str, Any]
    conversation_history: List[str]
    projects: List[str]
    dashboard_preferences: Dict[str, Any]
    statistics: Dict[str, Any]

@dataclass
class Integration:
    """Integration configuration"""
    integration_id: str
    integration_type: str  # crm, bookkeeping, sheets, make, etc.
    business_id: str
    config: Dict[str, Any]
    status: str  # connected, disconnected, error
    last_sync: Optional[datetime]
    data_points: Dict[str, Any]

class BusinessManager:
    """Manages business profiles and integrations"""
    
    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.businesses_dir = workspace_path / "businesses"
        self.businesses_dir.mkdir(exist_ok=True)
        self.db_path = workspace_path / "business_profiles.db"
        self._init_database()
    
    def _init_database(self):
        """Initialize the business profiles database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Business profiles table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS business_profiles (
                business_id TEXT PRIMARY KEY,
                business_name TEXT NOT NULL,
                created_at TIMESTAMP,
                integrations TEXT,
                custom_dashboard TEXT,
                conversation_history TEXT,
                projects TEXT,
                dashboard_preferences TEXT,
                statistics TEXT
            )
        """)
        
        # Integrations table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS integrations (
                integration_id TEXT PRIMARY KEY,
                integration_type TEXT NOT NULL,
                business_id TEXT,
                config TEXT,
                status TEXT,
                last_sync TIMESTAMP,
                data_points TEXT,
                FOREIGN KEY (business_id) REFERENCES business_profiles (business_id)
            )
        """)
        
        # Evolution tasks table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evolution_tasks (
                task_id TEXT PRIMARY KEY,
                task_description TEXT NOT NULL,
                status TEXT,
                progress INTEGER,
                created_at TIMESTAMP,
                completed_at TIMESTAMP,
                results TEXT,
                implementation_log TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("Business database initialized")
    
    def create_business(self, business_name: str) -> BusinessProfile:
        """Create a new business profile"""
        business_id = str(uuid.uuid4())
        business_dir = self.businesses_dir / business_name.replace(" ", "_").lower()
        business_dir.mkdir(exist_ok=True)
        
        # Create subdirectories
        (business_dir / "conversations").mkdir(exist_ok=True)
        (business_dir / "projects").mkdir(exist_ok=True)
        (business_dir / "integrations").mkdir(exist_ok=True)
        (business_dir / "dashboards").mkdir(exist_ok=True)
        
        business = BusinessProfile(
            business_id=business_id,
            business_name=business_name,
            created_at=datetime.now(),
            integrations={},
            custom_dashboard={},
            conversation_history=[],
            projects=[],
            dashboard_preferences={},
            statistics={}
        )
        
        # Save to database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO business_profiles 
            (business_id, business_name, created_at, integrations, custom_dashboard, 
             conversation_history, projects, dashboard_preferences, statistics)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            business.business_id,
            business.business_name,
            business.created_at.isoformat(),
            json.dumps(business.integrations),
            json.dumps(business.custom_dashboard),
            json.dumps(business.conversation_history),
            json.dumps(business.projects),
            json.dumps(business.dashboard_preferences),
            json.dumps(business.statistics)
        ))
        conn.commit()
        conn.close()
        
        logger.info(f"Created business profile: {business_name} ({business_id})")
        return business
    
    def get_business(self, business_id: str) -> Optional[BusinessProfile]:
        """Get business profile by ID"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM business_profiles WHERE business_id = ?", (business_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return BusinessProfile(
                business_id=row[0],
                business_name=row[1],
                created_at=datetime.fromisoformat(row[2]),
                integrations=json.loads(row[3]),
                custom_dashboard=json.loads(row[4]),
                conversation_history=json.loads(row[5]),
                projects=json.loads(row[6]),
                dashboard_preferences=json.loads(row[7]),
                statistics=json.loads(row[8])
            )
        return None
    
    def get_all_businesses(self) -> List[BusinessProfile]:
        """Get all business profiles"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM business_profiles ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        businesses = []
        for row in rows:
            businesses.append(BusinessProfile(
                business_id=row[0],
                business_name=row[1],
                created_at=datetime.fromisoformat(row[2]),
                integrations=json.loads(row[3]),
                custom_dashboard=json.loads(row[4]),
                conversation_history=json.loads(row[5]),
                projects=json.loads(row[6]),
                dashboard_preferences=json.loads(row[7]),
                statistics=json.loads(row[8])
            ))
        return businesses

class EvolutionTaskManager:
    """Manages self-evolution tasks and monitoring"""
    
    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.db_path = workspace_path / "business_profiles.db"
        self.github_monitor = None
        self.evolution_manager = None
        self._init_github_monitor()
    
    def _init_github_monitor(self):
        """Initialize GitHub monitoring"""
        try:
            self.github_monitor = GitHubHeartbeatMonitor()
            self.evolution_manager = ProductionEvolutionManager(self.workspace_path)
            logger.info("GitHub monitoring initialized")
        except Exception as e:
            logger.warning(f"GitHub monitoring not available: {e}")
    
    def create_task(self, task_description: str) -> str:
        """Create a new evolution task"""
        task_id = str(uuid.uuid4())
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO evolution_tasks 
            (task_id, task_description, status, progress, created_at, results, implementation_log)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            task_id,
            task_description,
            "pending",
            0,
            datetime.now().isoformat(),
            "{}",
            "[]"
        ))
        conn.commit()
        conn.close()
        
        # Start task processing in background
        threading.Thread(target=self._process_task, args=(task_id,), daemon=True).start()
        
        logger.info(f"Created evolution task: {task_id}")
        return task_id
    
    def _process_task(self, task_id: str):
        """Process an evolution task"""
        try:
            # Update status to processing
            self._update_task_status(task_id, "processing", 10)
            
            # Simulate task processing with progress updates
            progress_steps = [
                (20, "Analyzing task requirements"),
                (40, "Researching implementation strategies"),
                (60, "Simulating proposed changes"),
                (80, "Validating implementation safety"),
                (90, "Preparing implementation"),
                (100, "Implementation complete")
            ]
            
            for progress, status_msg in progress_steps:
                time.sleep(2)  # Simulate work
                self._update_task_status(task_id, "processing", progress, status_msg)
            
            # Mark as completed
            self._update_task_status(task_id, "completed", 100, "Task completed successfully")
            
        except Exception as e:
            self._update_task_status(task_id, "error", 0, f"Task failed: {str(e)}")
    
    def _update_task_status(self, task_id: str, status: str, progress: int, log_entry: str = ""):
        """Update task status and progress"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Get current implementation log
        cursor.execute("SELECT implementation_log FROM evolution_tasks WHERE task_id = ?", (task_id,))
        row = cursor.fetchone()
        current_log = json.loads(row[0]) if row else []
        
        # Add new log entry
        if log_entry:
            current_log.append({
                "timestamp": datetime.now().isoformat(),
                "message": log_entry,
                "progress": progress
            })
        
        # Update task
        update_fields = ["status = ?", "progress = ?", "implementation_log = ?"]
        update_values = [status, progress, json.dumps(current_log)]
        
        if status == "completed":
            update_fields.append("completed_at = ?")
            update_values.append(datetime.now().isoformat())
        
        cursor.execute(f"""
            UPDATE evolution_tasks 
            SET {', '.join(update_fields)}
            WHERE task_id = ?
        """, update_values + [task_id])
        
        conn.commit()
        conn.close()
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get task status and progress"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evolution_tasks WHERE task_id = ?", (task_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "task_id": row[0],
                "task_description": row[1],
                "status": row[2],
                "progress": row[3],
                "created_at": row[4],
                "completed_at": row[5],
                "results": json.loads(row[6]) if row[6] else {},
                "implementation_log": json.loads(row[7]) if row[7] else []
            }
        return {}
    
    def get_all_tasks(self) -> List[Dict[str, Any]]:
        """Get all evolution tasks"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM evolution_tasks ORDER BY created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        
        tasks = []
        for row in rows:
            tasks.append({
                "task_id": row[0],
                "task_description": row[1],
                "status": row[2],
                "progress": row[3],
                "created_at": row[4],
                "completed_at": row[5],
                "results": json.loads(row[6]) if row[6] else {},
                "implementation_log": json.loads(row[7]) if row[7] else []
            })
        return tasks
    
    def get_evolution_stats(self) -> Dict[str, Any]:
        """Get evolution system statistics"""
        stats = {
            "repo_connection": "connected" if self.github_monitor else "disconnected",
            "last_heartbeat": datetime.now().isoformat(),
            "repo_stats": {
                "commits": 0,
                "branches": 0,
                "files": 0,
                "last_commit": "No recent commits"
            },
            "evolution_feed": [],
            "system_health": "optimal"
        }
        
        if self.github_monitor:
            try:
                # Get repository statistics
                repo_info = self.github_monitor.get_repository_info()
                if repo_info:
                    stats["repo_stats"].update(repo_info)
                
                # Get recent evolution activities
                stats["evolution_feed"] = self._get_evolution_feed()
                
            except Exception as e:
                logger.warning(f"Error getting evolution stats: {e}")
                stats["system_health"] = "degraded"
        
        return stats
    
    def _get_evolution_feed(self) -> List[Dict[str, Any]]:
        """Get recent evolution activities"""
        # This would integrate with the evolution tracking system
        return [
            {
                "timestamp": datetime.now().isoformat(),
                "type": "analysis",
                "message": "Market analysis completed: 15 new opportunities identified",
                "impact": "medium"
            },
            {
                "timestamp": (datetime.now() - timedelta(minutes=5)).isoformat(),
                "type": "upgrade",
                "message": "UI enhancement implemented: Improved response time by 25%",
                "impact": "high"
            },
            {
                "timestamp": (datetime.now() - timedelta(minutes=10)).isoformat(),
                "type": "monitoring",
                "message": "Repository health check: All systems operational",
                "impact": "low"
            }
        ]

class FrontierDashboard:
    """Main dashboard application"""
    
    def __init__(self, workspace_path: Path):
        self.workspace_path = workspace_path
        self.business_manager = BusinessManager(workspace_path)
        self.task_manager = EvolutionTaskManager(workspace_path)
        self.conversational_ui = AdvancedConversationalUI()
        
        # Flask app setup
        self.app = Flask(__name__, template_folder='templates', static_folder='static')
        self.app.secret_key = os.environ.get('SECRET_KEY', 'frontier-ai-dashboard-key')
        self.socketio = SocketIO(self.app, cors_allowed_origins="*")
        
        self._setup_routes()
        self._setup_socket_events()
        
        logger.info("FrontierAI Dashboard initialized")
    
    def _setup_routes(self):
        """Setup Flask routes"""
        
        @self.app.route('/')
        def index():
            """Main dashboard page"""
            businesses = self.business_manager.get_all_businesses()
            evolution_stats = self.task_manager.get_evolution_stats()
            return render_template('dashboard.html', 
                                 businesses=businesses, 
                                 evolution_stats=evolution_stats)
        
        @self.app.route('/api/businesses', methods=['POST'])
        def create_business():
            """Create a new business"""
            data = request.get_json()
            business_name = data.get('business_name')
            
            if not business_name:
                return jsonify({"error": "Business name required"}), 400
            
            business = self.business_manager.create_business(business_name)
            return jsonify(asdict(business))
        
        @self.app.route('/api/businesses/<business_id>')
        def get_business(business_id):
            """Get business details"""
            business = self.business_manager.get_business(business_id)
            if business:
                return jsonify(asdict(business))
            return jsonify({"error": "Business not found"}), 404
        
        @self.app.route('/api/tasks', methods=['POST'])
        def create_task():
            """Create a new evolution task"""
            data = request.get_json()
            task_description = data.get('task_description')
            
            if not task_description:
                return jsonify({"error": "Task description required"}), 400
            
            task_id = self.task_manager.create_task(task_description)
            return jsonify({"task_id": task_id})
        
        @self.app.route('/api/tasks/<task_id>')
        def get_task_status(task_id):
            """Get task status"""
            task_status = self.task_manager.get_task_status(task_id)
            return jsonify(task_status)
        
        @self.app.route('/api/evolution/stats')
        def get_evolution_stats():
            """Get evolution system statistics"""
            stats = self.task_manager.get_evolution_stats()
            return jsonify(stats)
        
        @self.app.route('/api/chat/<business_id>', methods=['POST'])
        def chat_with_business(business_id):
            """Chat interface for business"""
            data = request.get_json()
            message = data.get('message')
            
            if not message:
                return jsonify({"error": "Message required"}), 400
            
            # Get or create conversation for this business
            conversation_id = f"business_{business_id}"
            
            # Process message through conversational UI
            try:
                response = asyncio.run(
                    self.conversational_ui.process_message(conversation_id, message)
                )
                return jsonify({"response": response})
            except Exception as e:
                logger.error(f"Chat error: {e}")
                return jsonify({"error": "Chat processing failed"}), 500
    
    def _setup_socket_events(self):
        """Setup WebSocket events for real-time updates"""
        
        @self.socketio.on('connect')
        def handle_connect():
            """Handle client connection"""
            emit('connected', {'status': 'connected'})
            logger.info("Client connected to dashboard")
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection"""
            logger.info("Client disconnected from dashboard")
        
        @self.socketio.on('join_business')
        def handle_join_business(data):
            """Join business room for updates"""
            business_id = data.get('business_id')
            if business_id:
                join_room(f"business_{business_id}")
                emit('joined_business', {'business_id': business_id})
        
        @self.socketio.on('leave_business')
        def handle_leave_business(data):
            """Leave business room"""
            business_id = data.get('business_id')
            if business_id:
                leave_room(f"business_{business_id}")
                emit('left_business', {'business_id': business_id})
    
    def start_background_monitoring(self):
        """Start background monitoring tasks"""
        def monitor_evolution():
            """Monitor evolution system and broadcast updates"""
            while True:
                try:
                    stats = self.task_manager.get_evolution_stats()
                    self.socketio.emit('evolution_update', stats)
                    time.sleep(30)  # Update every 30 seconds
                except Exception as e:
                    logger.error(f"Evolution monitoring error: {e}")
                    time.sleep(60)  # Wait longer on error
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=monitor_evolution, daemon=True)
        monitor_thread.start()
        logger.info("Background monitoring started")
    
    def run(self, host='0.0.0.0', port=8889, debug=False):
        """Run the dashboard server"""
        self.start_background_monitoring()
        logger.info(f"Starting FrontierAI Dashboard on {host}:{port}")
        self.socketio.run(self.app, host=host, port=port, debug=debug)

def create_dashboard_templates():
    """Create HTML templates for the dashboard"""
    templates_dir = Path("templates")
    templates_dir.mkdir(exist_ok=True)
    
    # Main dashboard template
    dashboard_html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FrontierAI Dashboard</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1a1a1a; color: #e0e0e0; }
        
        .dashboard { display: flex; height: 100vh; }
        .sidebar { width: 300px; background: #2d2d2d; border-right: 1px solid #404040; overflow-y: auto; }
        .main-content { flex: 1; display: flex; flex-direction: column; }
        
        .sidebar-header { padding: 20px; border-bottom: 1px solid #404040; }
        .logo { font-size: 24px; font-weight: bold; color: #4ade80; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #9ca3af; }
        
        .sidebar-section { padding: 20px; border-bottom: 1px solid #404040; }
        .section-title { font-size: 16px; font-weight: 600; margin-bottom: 15px; color: #f3f4f6; }
        
        .connect-business-btn { width: 100%; padding: 12px; background: #4ade80; color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .connect-business-btn:hover { background: #22c55e; }
        
        .business-list { margin-top: 15px; }
        .business-item { padding: 10px; margin-bottom: 8px; background: #374151; border-radius: 6px; cursor: pointer; }
        .business-item:hover { background: #4b5563; }
        .business-name { font-weight: 500; }
        .business-stats { font-size: 12px; color: #9ca3af; margin-top: 4px; }
        
        .evolution-status { background: #1f2937; border-radius: 8px; padding: 15px; margin-top: 15px; }
        .status-indicator { display: flex; align-items: center; margin-bottom: 10px; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }
        .status-connected { background: #10b981; }
        .status-disconnected { background: #ef4444; }
        
        .main-header { padding: 20px; border-bottom: 1px solid #404040; background: #2d2d2d; }
        .chat-container { flex: 1; display: flex; flex-direction: column; }
        .chat-messages { flex: 1; padding: 20px; overflow-y: auto; }
        .chat-input-container { padding: 20px; border-top: 1px solid #404040; }
        .chat-input { width: 100%; padding: 15px; background: #374151; border: 1px solid #4b5563; border-radius: 10px; color: #e0e0e0; }
        
        .message { margin-bottom: 20px; }
        .message-user { text-align: right; }
        .message-content { display: inline-block; padding: 12px 16px; border-radius: 18px; max-width: 70%; }
        .message-user .message-content { background: #4ade80; color: #000; }
        .message-assistant .message-content { background: #374151; color: #e0e0e0; }
        
        .evolution-dashboard { padding: 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #2d2d2d; padding: 20px; border-radius: 10px; border: 1px solid #404040; }
        .stat-value { font-size: 28px; font-weight: bold; color: #4ade80; }
        .stat-label { font-size: 14px; color: #9ca3af; margin-top: 5px; }
        
        .task-section { background: #2d2d2d; padding: 20px; border-radius: 10px; border: 1px solid #404040; }
        .task-input { width: 100%; padding: 12px; background: #374151; border: 1px solid #4b5563; border-radius: 8px; color: #e0e0e0; margin-bottom: 10px; }
        .task-btn { padding: 12px 24px; background: #4ade80; color: #000; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
        
        .progress-bar { width: 100%; height: 6px; background: #374151; border-radius: 3px; overflow: hidden; margin: 10px 0; }
        .progress-fill { height: 100%; background: #4ade80; transition: width 0.3s; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; }
        .modal-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2d2d2d; padding: 30px; border-radius: 10px; width: 400px; }
        .modal-input { width: 100%; padding: 12px; background: #374151; border: 1px solid #4b5563; border-radius: 8px; color: #e0e0e0; margin: 10px 0; }
        .modal-buttons { display: flex; gap: 10px; margin-top: 20px; }
        .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .btn-primary { background: #4ade80; color: #000; }
        .btn-secondary { background: #6b7280; color: #fff; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="logo">🚀 FrontierAI</div>
                <div class="subtitle">Business Intelligence Suite</div>
            </div>
            
            <div class="sidebar-section">
                <div class="section-title">Business Connections</div>
                <button class="connect-business-btn" onclick="showConnectBusinessModal()">
                    + Connect Your Business
                </button>
                
                <div class="business-list" id="businessList">
                    {% for business in businesses %}
                    <div class="business-item" onclick="selectBusiness('{{ business.business_id }}')">
                        <div class="business-name">{{ business.business_name }}</div>
                        <div class="business-stats">{{ business.integrations|length }} integrations</div>
                    </div>
                    {% endfor %}
                </div>
            </div>
            
            <div class="sidebar-section">
                <div class="section-title">Self-Evolution Monitor</div>
                <div class="evolution-status">
                    <div class="status-indicator">
                        <div class="status-dot status-{{ 'connected' if evolution_stats.repo_connection == 'connected' else 'disconnected' }}"></div>
                        <span>GitHub Connection</span>
                    </div>
                    <div style="font-size: 12px; color: #9ca3af;">
                        Last heartbeat: Just now<br>
                        System health: {{ evolution_stats.system_health|title }}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="main-content">
            <div class="main-header">
                <h1 id="mainTitle">Welcome to FrontierAI</h1>
                <p id="mainSubtitle">Select a business or explore evolution monitoring</p>
            </div>
            
            <div id="chatContainer" class="chat-container" style="display: none;">
                <div class="chat-messages" id="chatMessages"></div>
                <div class="chat-input-container">
                    <input type="text" id="chatInput" class="chat-input" placeholder="Ask FrontierAI anything..." onkeypress="handleChatKeypress(event)">
                </div>
            </div>
            
            <div id="evolutionDashboard" class="evolution-dashboard">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{{ evolution_stats.repo_stats.commits|default(0) }}</div>
                        <div class="stat-label">Repository Commits</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ evolution_stats.repo_stats.files|default(0) }}</div>
                        <div class="stat-label">Tracked Files</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="activeTasksCount">0</div>
                        <div class="stat-label">Active Tasks</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{ evolution_stats.system_health|title }}</div>
                        <div class="stat-label">System Health</div>
                    </div>
                </div>
                
                <div class="task-section">
                    <h3 style="margin-bottom: 15px;">Task Implementation</h3>
                    <input type="text" id="taskInput" class="task-input" placeholder="Describe a task for the self-evolving system...">
                    <button class="task-btn" onclick="createEvolutionTask()">Implement Task</button>
                    
                    <div id="activeTasks" style="margin-top: 20px;"></div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Connect Business Modal -->
    <div id="connectBusinessModal" class="modal">
        <div class="modal-content">
            <h3 style="margin-bottom: 20px;">Connect Your Business</h3>
            <input type="text" id="businessNameInput" class="modal-input" placeholder="Enter business name...">
            <div class="modal-buttons">
                <button class="btn btn-primary" onclick="createBusiness()">Connect</button>
                <button class="btn btn-secondary" onclick="hideConnectBusinessModal()">Cancel</button>
            </div>
        </div>
    </div>
    
    <script>
        const socket = io();
        let currentBusinessId = null;
        let activeTasks = {};
        
        socket.on('connect', function() {
            console.log('Connected to FrontierAI Dashboard');
        });
        
        socket.on('evolution_update', function(data) {
            updateEvolutionStats(data);
        });
        
        function showConnectBusinessModal() {
            document.getElementById('connectBusinessModal').style.display = 'block';
        }
        
        function hideConnectBusinessModal() {
            document.getElementById('connectBusinessModal').style.display = 'none';
            document.getElementById('businessNameInput').value = '';
        }
        
        async function createBusiness() {
            const businessName = document.getElementById('businessNameInput').value.trim();
            if (!businessName) return;
            
            try {
                const response = await fetch('/api/businesses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_name: businessName })
                });
                
                if (response.ok) {
                    location.reload(); // Refresh to show new business
                }
            } catch (error) {
                console.error('Error creating business:', error);
            }
        }
        
        function selectBusiness(businessId) {
            currentBusinessId = businessId;
            
            // Update UI
            document.getElementById('mainTitle').textContent = 'Business Chat';
            document.getElementById('mainSubtitle').textContent = 'Chat with FrontierAI about your business';
            document.getElementById('chatContainer').style.display = 'flex';
            document.getElementById('evolutionDashboard').style.display = 'none';
            
            // Join business room
            socket.emit('join_business', { business_id: businessId });
            
            // Clear chat
            document.getElementById('chatMessages').innerHTML = '';
        }
        
        function handleChatKeypress(event) {
            if (event.key === 'Enter') {
                sendChatMessage();
            }
        }
        
        async function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message || !currentBusinessId) return;
            
            // Add user message to chat
            addChatMessage('user', message);
            input.value = '';
            
            try {
                const response = await fetch(`/api/chat/${currentBusinessId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: message })
                });
                
                const data = await response.json();
                if (data.response) {
                    addChatMessage('assistant', data.response);
                }
            } catch (error) {
                console.error('Chat error:', error);
                addChatMessage('assistant', 'Sorry, I encountered an error processing your message.');
            }
        }
        
        function addChatMessage(role, content) {
            const messagesContainer = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${role}`;
            
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;
            
            messageDiv.appendChild(contentDiv);
            messagesContainer.appendChild(messageDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        async function createEvolutionTask() {
            const input = document.getElementById('taskInput');
            const taskDescription = input.value.trim();
            if (!taskDescription) return;
            
            try {
                const response = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_description: taskDescription })
                });
                
                const data = await response.json();
                if (data.task_id) {
                    input.value = '';
                    addTaskToDisplay(data.task_id, taskDescription);
                    monitorTask(data.task_id);
                }
            } catch (error) {
                console.error('Error creating task:', error);
            }
        }
        
        function addTaskToDisplay(taskId, description) {
            const container = document.getElementById('activeTasks');
            const taskDiv = document.createElement('div');
            taskDiv.id = `task-${taskId}`;
            taskDiv.style.cssText = 'background: #374151; padding: 15px; border-radius: 8px; margin-top: 15px;';
            
            taskDiv.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 10px;">${description}</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-${taskId}" style="width: 0%;"></div>
                </div>
                <div id="status-${taskId}" style="font-size: 12px; color: #9ca3af;">Initializing...</div>
            `;
            
            container.appendChild(taskDiv);
            activeTasks[taskId] = taskDiv;
            updateActiveTasksCount();
        }
        
        async function monitorTask(taskId) {
            const updateTask = async () => {
                try {
                    const response = await fetch(`/api/tasks/${taskId}`);
                    const task = await response.json();
                    
                    if (task.task_id) {
                        const progressBar = document.getElementById(`progress-${taskId}`);
                        const statusDiv = document.getElementById(`status-${taskId}`);
                        
                        if (progressBar) progressBar.style.width = `${task.progress}%`;
                        if (statusDiv) {
                            const latestLog = task.implementation_log?.[task.implementation_log.length - 1];
                            statusDiv.textContent = latestLog?.message || `Status: ${task.status}`;
                        }
                        
                        if (task.status === 'completed' || task.status === 'error') {
                            setTimeout(() => {
                                if (activeTasks[taskId]) {
                                    activeTasks[taskId].remove();
                                    delete activeTasks[taskId];
                                    updateActiveTasksCount();
                                }
                            }, 5000);
                        } else {
                            setTimeout(updateTask, 2000);
                        }
                    }
                } catch (error) {
                    console.error('Error monitoring task:', error);
                }
            };
            
            updateTask();
        }
        
        function updateActiveTasksCount() {
            document.getElementById('activeTasksCount').textContent = Object.keys(activeTasks).length;
        }
        
        function updateEvolutionStats(stats) {
            // Update evolution statistics in real-time
            console.log('Evolution update:', stats);
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('connectBusinessModal');
            if (event.target === modal) {
                hideConnectBusinessModal();
            }
        }
    </script>
</body>
</html>"""
    
    with open(templates_dir / "dashboard.html", "w", encoding="utf-8") as f:
        f.write(dashboard_html)
    
    logger.info("Dashboard templates created")

if __name__ == "__main__":
    workspace_path = Path.cwd()
    
    # Create templates
    create_dashboard_templates()
    
    # Create and run dashboard
    dashboard = FrontierDashboard(workspace_path)
    
    # Get port from environment
    port = int(os.environ.get('PORT', 8889))
    
    dashboard.run(host='0.0.0.0', port=port, debug=False)
