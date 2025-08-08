#!/usr/bin/env python3
"""
REAL FrontierAI System - No More Fake BS!
This implements actual functionality with real APIs, real code analysis, real GitHub integration
"""

import os
import json
import sqlite3
import logging
import threading
import time
import psutil
import requests
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, render_template_string
from typing import Dict, List, Any, Optional
import ast
import subprocess
from pathlib import Path
import tempfile
from git import Repo
import re

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Real Flask App
app = Flask(__name__)

# Global state for real metrics
real_metrics = {
    "start_time": datetime.now(),
    "github_analyses": 0,
    "code_files_analyzed": 0,
    "issues_found": 0,
    "repositories_cloned": 0,
    "background_tasks_running": 0,
    "database_operations": 0,
    "api_calls_made": 0
}

# Real database setup
def init_real_database():
    """Initialize the real database with actual tables"""
    conn = sqlite3.connect('real_frontier.db')
    cursor = conn.cursor()
    
    # Code analysis results table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS code_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repository TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            files_analyzed INTEGER,
            issues_found INTEGER,
            opportunities INTEGER,
            analysis_data TEXT,
            github_url TEXT
        )
    ''')
    
    # GitHub repositories table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS github_repos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            owner TEXT NOT NULL,
            repo TEXT NOT NULL,
            clone_path TEXT,
            last_analyzed DATETIME,
            total_files INTEGER,
            programming_language TEXT,
            stars INTEGER,
            forks INTEGER
        )
    ''')
    
    # System health monitoring
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS system_health (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            cpu_percent REAL,
            memory_percent REAL,
            disk_usage REAL,
            active_connections INTEGER,
            status TEXT
        )
    ''')
    
    # Background tasks tracking
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS background_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_type TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            result TEXT,
            error_message TEXT
        )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("✅ Real database initialized with actual tables")

class RealCodeAnalyzer:
    """REAL code analyzer that actually analyzes code"""
    
    def __init__(self):
        self.temp_dirs = []
    
    def analyze_github_repo(self, owner: str, repo: str, github_token: str = None) -> Dict[str, Any]:
        """Actually clone and analyze a GitHub repository"""
        try:
            repo_url = f"https://github.com/{owner}/{repo}.git"
            temp_dir = tempfile.mkdtemp(prefix=f"frontier_analysis_{owner}_{repo}_")
            self.temp_dirs.append(temp_dir)
            
            logger.info(f"🔍 Cloning repository {owner}/{repo} to {temp_dir}")
            
            # Actually clone the repository
            Repo.clone_from(repo_url, temp_dir)
            real_metrics["repositories_cloned"] += 1
            
            # Analyze the cloned repository
            analysis_results = self._analyze_directory(temp_dir)
            
            # Get GitHub repo info
            repo_info = self._get_github_repo_info(owner, repo, github_token)
            
            # Save to database
            self._save_analysis_to_db(f"{owner}/{repo}", analysis_results, repo_info)
            
            logger.info(f"✅ Analysis complete for {owner}/{repo}: {analysis_results['total_files']} files, {analysis_results['total_issues']} issues")
            
            return {
                "success": True,
                "repository": f"{owner}/{repo}",
                "analysis": analysis_results,
                "github_info": repo_info,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to analyze {owner}/{repo}: {str(e)}")
            return {
                "success": False,
                "repository": f"{owner}/{repo}",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _analyze_directory(self, directory: str) -> Dict[str, Any]:
        """Actually analyze Python files in a directory"""
        results = {
            "total_files": 0,
            "total_lines": 0,
            "total_issues": 0,
            "total_opportunities": 0,
            "files": {},
            "summary": {
                "functions_without_docstrings": 0,
                "classes_without_docstrings": 0,
                "security_issues": 0,
                "complexity_issues": 0,
                "import_issues": 0
            }
        }
        
        for root, dirs, files in os.walk(directory):
            # Skip common non-source directories
            dirs[:] = [d for d in dirs if d not in ['.git', '__pycache__', 'node_modules', '.venv', 'venv']]
            
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, directory)
                    
                    try:
                        file_analysis = self._analyze_python_file(file_path)
                        results["files"][rel_path] = file_analysis
                        results["total_files"] += 1
                        results["total_lines"] += file_analysis["lines_of_code"]
                        results["total_issues"] += len(file_analysis["issues"])
                        results["total_opportunities"] += len(file_analysis["opportunities"])
                        
                        # Update summary
                        for issue in file_analysis["issues"]:
                            if "docstring" in issue["type"]:
                                if "function" in issue["type"]:
                                    results["summary"]["functions_without_docstrings"] += 1
                                elif "class" in issue["type"]:
                                    results["summary"]["classes_without_docstrings"] += 1
                            elif "security" in issue["type"]:
                                results["summary"]["security_issues"] += 1
                            elif "complexity" in issue["type"]:
                                results["summary"]["complexity_issues"] += 1
                            elif "import" in issue["type"]:
                                results["summary"]["import_issues"] += 1
                                
                    except Exception as e:
                        logger.error(f"Error analyzing {rel_path}: {str(e)}")
                        results["files"][rel_path] = {"error": str(e)}
        
        real_metrics["code_files_analyzed"] += results["total_files"]
        real_metrics["issues_found"] += results["total_issues"]
        
        return results
    
    def _analyze_python_file(self, file_path: str) -> Dict[str, Any]:
        """Actually analyze a single Python file using AST"""
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        analysis = {
            "lines_of_code": len(content.splitlines()),
            "file_size": os.path.getsize(file_path),
            "issues": [],
            "opportunities": [],
            "functions": [],
            "classes": [],
            "imports": []
        }
        
        try:
            tree = ast.parse(content)
            
            # Analyze AST nodes
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_info = {
                        "name": node.name,
                        "line": node.lineno,
                        "args_count": len(node.args.args),
                        "has_docstring": bool(ast.get_docstring(node))
                    }
                    analysis["functions"].append(func_info)
                    
                    # Check for missing docstrings
                    if not func_info["has_docstring"]:
                        analysis["issues"].append({
                            "type": "missing_function_docstring",
                            "line": node.lineno,
                            "message": f"Function '{node.name}' missing docstring",
                            "severity": "medium"
                        })
                    
                    # Check for too many arguments
                    if func_info["args_count"] > 5:
                        analysis["issues"].append({
                            "type": "complexity_too_many_args",
                            "line": node.lineno,
                            "message": f"Function '{node.name}' has {func_info['args_count']} arguments (consider refactoring)",
                            "severity": "medium"
                        })
                
                elif isinstance(node, ast.ClassDef):
                    class_info = {
                        "name": node.name,
                        "line": node.lineno,
                        "has_docstring": bool(ast.get_docstring(node))
                    }
                    analysis["classes"].append(class_info)
                    
                    if not class_info["has_docstring"]:
                        analysis["issues"].append({
                            "type": "missing_class_docstring",
                            "line": node.lineno,
                            "message": f"Class '{node.name}' missing docstring",
                            "severity": "medium"
                        })
                
                elif isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            analysis["imports"].append(alias.name)
                    else:  # ImportFrom
                        module = node.module or ""
                        for alias in node.names:
                            analysis["imports"].append(f"{module}.{alias.name}")
                
                # Check for security issues
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name) and node.func.id in ['eval', 'exec']:
                        analysis["issues"].append({
                            "type": "security_dangerous_function",
                            "line": node.lineno,
                            "message": f"Dangerous function '{node.func.id}' detected",
                            "severity": "high"
                        })
                    
                    # Check for subprocess calls without shell=False
                    if isinstance(node.func, ast.Attribute) and node.func.attr in ['call', 'run', 'check_output']:
                        analysis["opportunities"].append({
                            "type": "security_subprocess",
                            "line": node.lineno,
                            "message": "Consider using shell=False for subprocess calls",
                            "severity": "low"
                        })
                
                # Check for bare except clauses
                elif isinstance(node, ast.ExceptHandler) and node.type is None:
                    analysis["issues"].append({
                        "type": "bad_practice_bare_except",
                        "line": node.lineno,
                        "message": "Bare except clause - should catch specific exceptions",
                        "severity": "medium"
                    })
        
        except SyntaxError as e:
            analysis["issues"].append({
                "type": "syntax_error",
                "line": e.lineno or 0,
                "message": f"Syntax error: {str(e)}",
                "severity": "high"
            })
        
        return analysis
    
    def _get_github_repo_info(self, owner: str, repo: str, github_token: str = None) -> Dict[str, Any]:
        """Get real repository information from GitHub API"""
        url = f"https://api.github.com/repos/{owner}/{repo}"
        headers = {"Accept": "application/vnd.github.v3+json"}
        
        if github_token:
            headers["Authorization"] = f"token {github_token}"
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            return {
                "name": data.get("name"),
                "full_name": data.get("full_name"),
                "description": data.get("description"),
                "language": data.get("language"),
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "size": data.get("size", 0),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "clone_url": data.get("clone_url"),
                "topics": data.get("topics", [])
            }
        except Exception as e:
            logger.error(f"Failed to get GitHub repo info: {str(e)}")
            return {"error": str(e)}
    
    def _save_analysis_to_db(self, repository: str, analysis: Dict[str, Any], github_info: Dict[str, Any]):
        """Save analysis results to real database"""
        try:
            conn = sqlite3.connect('real_frontier.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO code_analysis 
                (repository, files_analyzed, issues_found, opportunities, analysis_data, github_url)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                repository,
                analysis.get("total_files", 0),
                analysis.get("total_issues", 0),
                analysis.get("total_opportunities", 0),
                json.dumps(analysis),
                github_info.get("clone_url", "")
            ))
            
            # Also save GitHub repo info
            if "error" not in github_info:
                cursor.execute('''
                    INSERT OR REPLACE INTO github_repos 
                    (owner, repo, last_analyzed, total_files, programming_language, stars, forks)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    repository.split('/')[0],
                    repository.split('/')[1],
                    datetime.now(),
                    analysis.get("total_files", 0),
                    github_info.get("language", "Unknown"),
                    github_info.get("stars", 0),
                    github_info.get("forks", 0)
                ))
            
            conn.commit()
            conn.close()
            real_metrics["database_operations"] += 1
            
        except Exception as e:
            logger.error(f"Failed to save analysis to database: {str(e)}")
    
    def cleanup(self):
        """Clean up temporary directories"""
        for temp_dir in self.temp_dirs:
            try:
                import shutil
                shutil.rmtree(temp_dir)
            except Exception as e:
                logger.error(f"Failed to cleanup {temp_dir}: {str(e)}")

class RealSystemMonitor:
    """REAL system monitoring that tracks actual metrics"""
    
    def __init__(self):
        self.running = False
        self.monitor_thread = None
    
    def start_monitoring(self):
        """Start real system monitoring"""
        if self.running:
            return
            
        self.running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        real_metrics["background_tasks_running"] += 1
        logger.info("✅ Real system monitoring started")
    
    def stop_monitoring(self):
        """Stop system monitoring"""
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1.0)
        real_metrics["background_tasks_running"] = max(0, real_metrics["background_tasks_running"] - 1)
        logger.info("🛑 System monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop that collects real metrics"""
        while self.running:
            try:
                # Get real system metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Count network connections
                connections = len(psutil.net_connections())
                
                # Determine status
                status = "healthy"
                if cpu_percent > 80 or memory.percent > 90:
                    status = "warning"
                if cpu_percent > 95 or memory.percent > 95:
                    status = "critical"
                
                # Save to database
                self._save_health_metrics(cpu_percent, memory.percent, disk.percent, connections, status)
                
                time.sleep(30)  # Monitor every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in system monitoring: {str(e)}")
                time.sleep(60)  # Wait longer on error
    
    def _save_health_metrics(self, cpu: float, memory: float, disk: float, connections: int, status: str):
        """Save real health metrics to database"""
        try:
            conn = sqlite3.connect('real_frontier.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO system_health 
                (cpu_percent, memory_percent, disk_usage, active_connections, status)
                VALUES (?, ?, ?, ?, ?)
            ''', (cpu, memory, disk, connections, status))
            
            conn.commit()
            conn.close()
            real_metrics["database_operations"] += 1
            
        except Exception as e:
            logger.error(f"Failed to save health metrics: {str(e)}")
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current real system metrics"""
        try:
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            connections = len(psutil.net_connections())
            
            return {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": round(disk.percent, 1),
                "disk_free_gb": round(disk.free / (1024**3), 2),
                "active_connections": connections,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to get current metrics: {str(e)}")
            return {"error": str(e)}

# Initialize components
analyzer = RealCodeAnalyzer()
monitor = RealSystemMonitor()

# REAL API ENDPOINTS

@app.route('/')
def real_dashboard():
    """Real dashboard with actual data"""
    return render_template_string("""
<!DOCTYPE html>
<html>
<head>
    <title>REAL FrontierAI - Actually Working System</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: #00ff00; }
        .header { text-align: center; padding: 20px; background: #000; border: 2px solid #00ff00; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #2a2a2a; padding: 20px; border: 1px solid #00ff00; border-radius: 8px; }
        .metric-value { font-size: 2em; color: #00ff00; font-weight: bold; }
        .metric-label { color: #888; }
        .status-real { color: #00ff00; font-weight: bold; }
        .status-fake { color: #ff0000; font-weight: bold; }
        button { background: #00ff00; color: #000; border: none; padding: 10px 20px; cursor: pointer; margin: 5px; }
        button:hover { background: #00cc00; }
        .api-list { background: #2a2a2a; padding: 20px; border: 1px solid #00ff00; margin: 20px 0; }
        .api-endpoint { font-family: monospace; background: #000; padding: 5px; margin: 5px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔥 REAL FrontierAI - No More BS! 🔥</h1>
        <p class="status-real">✅ ACTUALLY WORKING SYSTEM ✅</p>
        <p>Real APIs • Real Analysis • Real Data • Real Results</p>
    </div>

    <div class="metrics" id="realMetrics">
        <div class="metric-card">
            <div class="metric-value" id="githubAnalyses">Loading...</div>
            <div class="metric-label">GitHub Repositories Analyzed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="filesAnalyzed">Loading...</div>
            <div class="metric-label">Code Files Analyzed</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="issuesFound">Loading...</div>
            <div class="metric-label">Issues Found</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="cpuUsage">Loading...</div>
            <div class="metric-label">CPU Usage</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="memoryUsage">Loading...</div>
            <div class="metric-label">Memory Usage</div>
        </div>
        <div class="metric-card">
            <div class="metric-value" id="uptime">Loading...</div>
            <div class="metric-label">System Uptime</div>
        </div>
    </div>

    <div style="text-align: center; margin: 20px;">
        <button onclick="testRealAnalysis()">🔍 Test Real GitHub Analysis</button>
        <button onclick="viewHealthMetrics()">💓 View Health Metrics</button>
        <button onclick="viewAnalysisResults()">📊 View Analysis Results</button>
    </div>

    <div class="api-list">
        <h3>🔗 Real API Endpoints (Actually Work!)</h3>
        <div class="api-endpoint">GET /api/real-metrics - Real system metrics</div>
        <div class="api-endpoint">POST /api/analyze-github - Actually analyze GitHub repos</div>
        <div class="api-endpoint">GET /api/health-real - Real health monitoring</div>
        <div class="api-endpoint">GET /api/analysis-results - Real analysis results from DB</div>
        <div class="api-endpoint">GET /api/system-status - Real system status</div>
    </div>

    <script>
        async function updateRealMetrics() {
            try {
                const response = await fetch('/api/real-metrics');
                const data = await response.json();
                
                document.getElementById('githubAnalyses').textContent = data.github_analyses;
                document.getElementById('filesAnalyzed').textContent = data.code_files_analyzed;
                document.getElementById('issuesFound').textContent = data.issues_found;
                document.getElementById('cpuUsage').textContent = data.system.cpu_percent + '%';
                document.getElementById('memoryUsage').textContent = data.system.memory_percent + '%';
                document.getElementById('uptime').textContent = data.uptime_hours + 'h';
            } catch (error) {
                console.error('Error updating metrics:', error);
            }
        }

        async function testRealAnalysis() {
            const repo = prompt('Enter GitHub repository (format: owner/repo):', 'octocat/Hello-World');
            if (!repo) return;
            
            const [owner, repoName] = repo.split('/');
            
            const button = event.target;
            button.textContent = '🔍 Analyzing...';
            button.disabled = true;
            
            try {
                const response = await fetch('/api/analyze-github', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owner, repo: repoName })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(`✅ Analysis Complete!\\n\\nRepository: ${result.repository}\\nFiles: ${result.analysis.total_files}\\nIssues: ${result.analysis.total_issues}\\nOpportunities: ${result.analysis.total_opportunities}`);
                } else {
                    alert(`❌ Analysis Failed: ${result.error}`);
                }
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            } finally {
                button.textContent = '🔍 Test Real GitHub Analysis';
                button.disabled = false;
                updateRealMetrics();
            }
        }

        async function viewHealthMetrics() {
            try {
                const response = await fetch('/api/health-real');
                const data = await response.json();
                alert(`💓 Real Health Metrics:\\n\\nCPU: ${data.cpu_percent}%\\nMemory: ${data.memory_percent}%\\nDisk: ${data.disk_percent}%\\nConnections: ${data.active_connections}\\nMemory Available: ${data.memory_available_gb}GB`);
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        }

        async function viewAnalysisResults() {
            try {
                const response = await fetch('/api/analysis-results');
                const data = await response.json();
                let message = `📊 Analysis Results (${data.length} total):\\n\\n`;
                data.slice(0, 5).forEach(result => {
                    message += `${result.repository}: ${result.files_analyzed} files, ${result.issues_found} issues\\n`;
                });
                alert(message);
            } catch (error) {
                alert(`❌ Error: ${error.message}`);
            }
        }

        // Update metrics every 10 seconds
        updateRealMetrics();
        setInterval(updateRealMetrics, 10000);
    </script>
</body>
</html>
""")

@app.route('/api/real-metrics')
def api_real_metrics():
    """Return REAL metrics from actual system monitoring"""
    try:
        uptime = datetime.now() - real_metrics["start_time"]
        system_metrics = monitor.get_current_metrics()
        
        return jsonify({
            "github_analyses": real_metrics["github_analyses"],
            "code_files_analyzed": real_metrics["code_files_analyzed"],
            "issues_found": real_metrics["issues_found"],
            "repositories_cloned": real_metrics["repositories_cloned"],
            "background_tasks_running": real_metrics["background_tasks_running"],
            "database_operations": real_metrics["database_operations"],
            "api_calls_made": real_metrics["api_calls_made"],
            "uptime_hours": round(uptime.total_seconds() / 3600, 1),
            "system": system_metrics,
            "timestamp": datetime.now().isoformat(),
            "status": "real_system_operational"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analyze-github', methods=['POST'])
def api_analyze_github():
    """Actually analyze a GitHub repository - REAL FUNCTIONALITY"""
    try:
        data = request.get_json()
        owner = data.get('owner')
        repo = data.get('repo')
        github_token = data.get('github_token', '')
        
        if not owner or not repo:
            return jsonify({"success": False, "error": "Owner and repo are required"}), 400
        
        real_metrics["api_calls_made"] += 1
        real_metrics["github_analyses"] += 1
        
        # Actually perform the analysis
        result = analyzer.analyze_github_repo(owner, repo, github_token)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"GitHub analysis API error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/health-real')
def api_health_real():
    """Return REAL health metrics from actual system monitoring"""
    try:
        metrics = monitor.get_current_metrics()
        real_metrics["api_calls_made"] += 1
        return jsonify(metrics)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis-results')
def api_analysis_results():
    """Return REAL analysis results from the database"""
    try:
        conn = sqlite3.connect('real_frontier.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT repository, timestamp, files_analyzed, issues_found, opportunities, github_url
            FROM code_analysis 
            ORDER BY timestamp DESC 
            LIMIT 50
        ''')
        
        results = []
        for row in cursor.fetchall():
            results.append({
                "repository": row[0],
                "timestamp": row[1],
                "files_analyzed": row[2],
                "issues_found": row[3],
                "opportunities": row[4],
                "github_url": row[5]
            })
        
        conn.close()
        real_metrics["api_calls_made"] += 1
        
        return jsonify(results)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/system-status')
def api_system_status():
    """Return comprehensive REAL system status"""
    try:
        # Get database stats
        conn = sqlite3.connect('real_frontier.db')
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM code_analysis')
        total_analyses = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM github_repos')
        total_repos = cursor.fetchone()[0]
        
        cursor.execute('SELECT COUNT(*) FROM system_health WHERE timestamp > datetime("now", "-1 hour")')
        health_records_hour = cursor.fetchone()[0]
        
        conn.close()
        
        uptime = datetime.now() - real_metrics["start_time"]
        
        return jsonify({
            "status": "operational",
            "uptime_seconds": uptime.total_seconds(),
            "database": {
                "total_analyses": total_analyses,
                "total_repos": total_repos,
                "health_records_last_hour": health_records_hour,
                "total_operations": real_metrics["database_operations"]
            },
            "system": monitor.get_current_metrics(),
            "background_services": {
                "system_monitor": monitor.running,
                "active_tasks": real_metrics["background_tasks_running"]
            },
            "metrics": real_metrics,
            "timestamp": datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Background task management
@app.route('/api/start-background-services', methods=['POST'])
def start_background_services():
    """Start real background services"""
    try:
        if not monitor.running:
            monitor.start_monitoring()
        
        return jsonify({
            "success": True,
            "message": "Background services started",
            "services": {
                "system_monitor": monitor.running
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/stop-background-services', methods=['POST'])
def stop_background_services():
    """Stop background services"""
    try:
        monitor.stop_monitoring()
        
        return jsonify({
            "success": True,
            "message": "Background services stopped"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def start_real_frontier_ai():
    """Start the REAL FrontierAI system"""
    logger.info("🔥 Starting REAL FrontierAI System - No More Fake BS!")
    
    # Initialize real database
    init_real_database()
    
    # Start real background services
    monitor.start_monitoring()
    
    # Get port from environment (Railway compatibility)
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"🌐 REAL FrontierAI running on port {port}")
    logger.info("✅ All systems ACTUALLY operational")
    
    try:
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
    finally:
        # Cleanup
        monitor.stop_monitoring()
        analyzer.cleanup()
        logger.info("🛑 REAL FrontierAI shutdown complete")

if __name__ == "__main__":
    start_real_frontier_ai()
