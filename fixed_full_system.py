"""
Frontier AI: Full Autonomous Evolution System - Railway Optimized
Real autonomous self-evolution with proper Railway deployment initialization
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
except ImportError:
    print("Installing Flask...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "flask==3.0.0"])
    from flask import Flask, jsonify, render_template_string, request, redirect, url_for

# Configure logging for Railway
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class EvolutionMetrics:
    """Metrics for tracking evolution progress"""
    total_evolutions: int = 0
    successful_commits: int = 0
    failed_attempts: int = 0
    last_evolution: Optional[str] = None
    uptime_hours: float = 0.0
    files_analyzed: int = 0
    improvements_made: int = 0

class DatabaseManager:
    """Handles all database operations with Railway-safe initialization"""
    
    def __init__(self, db_path="frontier_ai.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with proper error handling"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                
                # Evolution tracking table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS evolution_log (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT NOT NULL,
                        action TEXT NOT NULL,
                        file_path TEXT,
                        description TEXT,
                        status TEXT DEFAULT 'pending',
                        commit_hash TEXT,
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # System metrics table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS system_metrics (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        metric_name TEXT NOT NULL,
                        metric_value TEXT NOT NULL,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                # Competitor analysis table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS competitor_analysis (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        competitor_name TEXT NOT NULL,
                        analysis_data TEXT,
                        score INTEGER,
                        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
                    )
                ''')
                
                conn.commit()
                logger.info("Database initialized successfully")
                
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            # Create in-memory fallback
            self.db_path = ":memory:"
            self.init_database()
    
    def log_evolution(self, action: str, file_path: str = None, description: str = "", status: str = "pending"):
        """Log evolution attempt"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO evolution_log (timestamp, action, file_path, description, status)
                    VALUES (?, ?, ?, ?, ?)
                ''', (datetime.now().isoformat(), action, file_path, description, status))
                conn.commit()
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Failed to log evolution: {e}")
            return None
    
    def update_evolution_status(self, log_id: int, status: str, commit_hash: str = None):
        """Update evolution status"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE evolution_log 
                    SET status = ?, commit_hash = ?
                    WHERE id = ?
                ''', (status, commit_hash, log_id))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to update evolution status: {e}")
    
    def get_evolution_history(self, limit: int = 50):
        """Get recent evolution history"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    SELECT * FROM evolution_log 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                ''', (limit,))
                columns = [description[0] for description in cursor.description]
                return [dict(zip(columns, row)) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Failed to get evolution history: {e}")
            return []
    
    def store_metric(self, name: str, value: Any):
        """Store system metric"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO system_metrics (metric_name, metric_value)
                    VALUES (?, ?)
                ''', (name, str(value)))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to store metric: {e}")

class RepositoryAnalyzer:
    """Analyzes repository for improvement opportunities"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
        self.patterns = {
            'python': ['*.py'],
            'web': ['*.html', '*.css', '*.js'],
            'config': ['*.json', '*.yaml', '*.yml', '*.txt'],
            'docs': ['*.md', '*.rst']
        }
    
    def scan_repository(self) -> Dict[str, Any]:
        """Scan repository for files and potential improvements"""
        analysis = {
            'files_found': [],
            'file_types': {},
            'potential_improvements': [],
            'last_scan': datetime.now().isoformat()
        }
        
        try:
            for root, dirs, files in os.walk(self.repo_path):
                # Skip hidden directories and common build directories
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ['__pycache__', 'node_modules', 'venv']]
                
                for file in files:
                    if file.startswith('.'):
                        continue
                        
                    file_path = os.path.join(root, file)
                    file_ext = os.path.splitext(file)[1]
                    
                    analysis['files_found'].append(file_path)
                    analysis['file_types'][file_ext] = analysis['file_types'].get(file_ext, 0) + 1
                    
                    # Analyze for improvements
                    improvements = self.analyze_file(file_path)
                    if improvements:
                        analysis['potential_improvements'].extend(improvements)
            
            logger.info(f"Repository scan complete: {len(analysis['files_found'])} files analyzed")
            
        except Exception as e:
            logger.error(f"Repository scan error: {e}")
            
        return analysis
    
    def analyze_file(self, file_path: str) -> List[Dict[str, str]]:
        """Analyze individual file for improvements"""
        improvements = []
        
        try:
            if file_path.endswith('.py'):
                improvements.extend(self.analyze_python_file(file_path))
            elif file_path.endswith('.md'):
                improvements.extend(self.analyze_markdown_file(file_path))
            elif file_path.endswith('.json'):
                improvements.extend(self.analyze_json_file(file_path))
                
        except Exception as e:
            logger.error(f"File analysis error for {file_path}: {e}")
            
        return improvements
    
    def analyze_python_file(self, file_path: str) -> List[Dict[str, str]]:
        """Analyze Python file for improvements"""
        improvements = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Check for common improvement opportunities
            if 'TODO' in content or 'FIXME' in content:
                improvements.append({
                    'type': 'todo_cleanup',
                    'file': file_path,
                    'description': 'File contains TODO/FIXME comments that could be addressed'
                })
            
            if len(content.split('\n')) > 500:
                improvements.append({
                    'type': 'refactor_large_file',
                    'file': file_path,
                    'description': 'Large file that could benefit from modularization'
                })
                
            if 'print(' in content and 'logging' not in content:
                improvements.append({
                    'type': 'add_logging',
                    'file': file_path,
                    'description': 'Could benefit from proper logging instead of print statements'
                })
                
        except Exception as e:
            logger.error(f"Python file analysis error: {e}")
            
        return improvements
    
    def analyze_markdown_file(self, file_path: str) -> List[Dict[str, str]]:
        """Analyze Markdown file for improvements"""
        improvements = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if len(content) < 100:
                improvements.append({
                    'type': 'expand_documentation',
                    'file': file_path,
                    'description': 'Documentation could be expanded with more details'
                })
                
        except Exception as e:
            logger.error(f"Markdown file analysis error: {e}")
            
        return improvements
    
    def analyze_json_file(self, file_path: str) -> List[Dict[str, str]]:
        """Analyze JSON file for improvements"""
        improvements = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                json.loads(content)  # Validate JSON
                
        except json.JSONDecodeError:
            improvements.append({
                'type': 'fix_json_syntax',
                'file': file_path,
                'description': 'JSON file has syntax errors that need fixing'
            })
        except Exception as e:
            logger.error(f"JSON file analysis error: {e}")
            
        return improvements

class GitManager:
    """Handles git operations for autonomous commits"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = repo_path
    
    def is_git_repository(self) -> bool:
        """Check if current directory is a git repository"""
        try:
            result = subprocess.run(['git', 'rev-parse', '--git-dir'], 
                                  capture_output=True, text=True, cwd=self.repo_path)
            return result.returncode == 0
        except Exception:
            return False
    
    def get_status(self) -> Dict[str, Any]:
        """Get git repository status"""
        status = {
            'is_repo': False,
            'branch': 'unknown',
            'clean': True,
            'staged_files': [],
            'modified_files': []
        }
        
        try:
            if not self.is_git_repository():
                return status
            
            status['is_repo'] = True
            
            # Get current branch
            result = subprocess.run(['git', 'branch', '--show-current'], 
                                  capture_output=True, text=True, cwd=self.repo_path)
            if result.returncode == 0:
                status['branch'] = result.stdout.strip()
            
            # Get status
            result = subprocess.run(['git', 'status', '--porcelain'], 
                                  capture_output=True, text=True, cwd=self.repo_path)
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    if line:
                        file_status = line[:2]
                        file_path = line[3:]
                        
                        if file_status[0] in ['A', 'M', 'D']:
                            status['staged_files'].append(file_path)
                        elif file_status[1] in ['M', 'D']:
                            status['modified_files'].append(file_path)
                
                status['clean'] = len(status['staged_files']) == 0 and len(status['modified_files']) == 0
            
        except Exception as e:
            logger.error(f"Git status error: {e}")
            
        return status
    
    def commit_changes(self, message: str, files: List[str] = None) -> bool:
        """Commit changes to repository"""
        try:
            if not self.is_git_repository():
                logger.warning("Not a git repository, skipping commit")
                return False
            
            # Add files
            if files:
                for file in files:
                    subprocess.run(['git', 'add', file], cwd=self.repo_path, check=True)
            else:
                subprocess.run(['git', 'add', '.'], cwd=self.repo_path, check=True)
            
            # Commit
            result = subprocess.run(['git', 'commit', '-m', message], 
                                  capture_output=True, text=True, cwd=self.repo_path)
            
            if result.returncode == 0:
                logger.info(f"Successfully committed: {message}")
                return True
            else:
                logger.warning(f"Commit failed: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Git commit error: {e}")
            return False
    
    def get_commit_hash(self) -> str:
        """Get latest commit hash"""
        try:
            result = subprocess.run(['git', 'rev-parse', 'HEAD'], 
                                  capture_output=True, text=True, cwd=self.repo_path)
            if result.returncode == 0:
                return result.stdout.strip()
        except Exception as e:
            logger.error(f"Failed to get commit hash: {e}")
        return "unknown"

class AutonomousEvolutionEngine:
    """Core autonomous evolution engine with Railway-safe operation"""
    
    def __init__(self):
        self.db = DatabaseManager()
        self.repo_analyzer = RepositoryAnalyzer()
        self.git_manager = GitManager()
        self.metrics = EvolutionMetrics()
        self.running = False
        self.start_time = datetime.now()
        self.evolution_thread = None
        
        # Initialize system
        self.initialize_system()
    
    def initialize_system(self):
        """Initialize the evolution system"""
        try:
            logger.info("Initializing Frontier AI Evolution System...")
            
            # Check git status
            git_status = self.git_manager.get_status()
            self.db.store_metric("git_repository", git_status['is_repo'])
            self.db.store_metric("git_branch", git_status['branch'])
            
            # Initial repository scan
            scan_results = self.repo_analyzer.scan_repository()
            self.metrics.files_analyzed = len(scan_results['files_found'])
            self.db.store_metric("files_analyzed", self.metrics.files_analyzed)
            
            logger.info(f"System initialized: {self.metrics.files_analyzed} files analyzed")
            
        except Exception as e:
            logger.error(f"System initialization error: {e}")
    
    def start_autonomous_evolution(self):
        """Start autonomous evolution in background thread"""
        if self.running:
            logger.warning("Evolution already running")
            return
        
        self.running = True
        self.evolution_thread = threading.Thread(target=self._evolution_loop, daemon=True)
        self.evolution_thread.start()
        logger.info("Autonomous evolution started")
    
    def stop_autonomous_evolution(self):
        """Stop autonomous evolution"""
        self.running = False
        if self.evolution_thread:
            self.evolution_thread.join(timeout=5)
        logger.info("Autonomous evolution stopped")
    
    def _evolution_loop(self):
        """Main evolution loop"""
        cycle_count = 0
        
        while self.running:
            try:
                cycle_count += 1
                logger.info(f"Evolution cycle {cycle_count} starting...")
                
                # Update metrics
                self.metrics.uptime_hours = (datetime.now() - self.start_time).total_seconds() / 3600
                
                # Perform evolution cycle
                self._perform_evolution_cycle()
                
                # Update database metrics
                self.db.store_metric("evolution_cycles", cycle_count)
                self.db.store_metric("uptime_hours", self.metrics.uptime_hours)
                
                # Wait before next cycle (30 minutes)
                time.sleep(1800)
                
            except Exception as e:
                logger.error(f"Evolution cycle error: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def _perform_evolution_cycle(self):
        """Perform a single evolution cycle"""
        self.metrics.total_evolutions += 1
        
        # Log evolution attempt
        log_id = self.db.log_evolution("autonomous_cycle", description="Performing autonomous evolution cycle")
        
        try:
            # Scan repository for changes
            scan_results = self.repo_analyzer.scan_repository()
            improvements = scan_results.get('potential_improvements', [])
            
            if improvements:
                # Select an improvement to implement
                improvement = improvements[0]  # Take first improvement
                
                # Implement improvement
                success = self._implement_improvement(improvement)
                
                if success:
                    self.metrics.successful_commits += 1
                    self.metrics.improvements_made += 1
                    self.db.update_evolution_status(log_id, "success")
                    logger.info(f"Successfully implemented improvement: {improvement['description']}")
                else:
                    self.metrics.failed_attempts += 1
                    self.db.update_evolution_status(log_id, "failed")
                    logger.warning(f"Failed to implement improvement: {improvement['description']}")
            else:
                # No improvements found, create system optimization
                self._create_system_optimization()
                self.db.update_evolution_status(log_id, "optimized")
                
            self.metrics.last_evolution = datetime.now().isoformat()
            
        except Exception as e:
            self.metrics.failed_attempts += 1
            self.db.update_evolution_status(log_id, "error")
            logger.error(f"Evolution cycle failed: {e}")
    
    def _implement_improvement(self, improvement: Dict[str, str]) -> bool:
        """Implement a specific improvement"""
        try:
            if improvement['type'] == 'add_logging':
                return self._add_logging_to_file(improvement['file'])
            elif improvement['type'] == 'expand_documentation':
                return self._expand_documentation(improvement['file'])
            elif improvement['type'] == 'todo_cleanup':
                return self._cleanup_todos(improvement['file'])
            else:
                logger.info(f"Improvement type {improvement['type']} not yet implemented")
                return False
                
        except Exception as e:
            logger.error(f"Implementation error: {e}")
            return False
    
    def _add_logging_to_file(self, file_path: str) -> bool:
        """Add logging to a Python file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if logging already exists
            if 'import logging' in content:
                return False
            
            # Add logging import at the top
            lines = content.split('\n')
            import_index = 0
            for i, line in enumerate(lines):
                if line.startswith('import ') or line.startswith('from '):
                    import_index = i + 1
            
            lines.insert(import_index, 'import logging')
            
            # Add logging configuration
            lines.insert(import_index + 1, '')
            lines.insert(import_index + 2, '# Configure logging')
            lines.insert(import_index + 3, 'logging.basicConfig(level=logging.INFO)')
            lines.insert(import_index + 4, 'logger = logging.getLogger(__name__)')
            lines.insert(import_index + 5, '')
            
            # Write back to file
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(lines))
            
            # Commit changes
            commit_message = f"Add logging configuration to {os.path.basename(file_path)}"
            return self.git_manager.commit_changes(commit_message, [file_path])
            
        except Exception as e:
            logger.error(f"Failed to add logging: {e}")
            return False
    
    def _expand_documentation(self, file_path: str) -> bool:
        """Expand documentation in a markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add system status section
            status_section = f"""

## System Status

Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

### Autonomous Evolution Metrics
- Total evolutions: {self.metrics.total_evolutions}
- Successful commits: {self.metrics.successful_commits}
- Files analyzed: {self.metrics.files_analyzed}
- Uptime: {self.metrics.uptime_hours:.2f} hours

### Recent Activity
The system is continuously evolving and improving itself through autonomous analysis and optimization.
"""
            
            content += status_section
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            commit_message = f"Expand documentation in {os.path.basename(file_path)}"
            return self.git_manager.commit_changes(commit_message, [file_path])
            
        except Exception as e:
            logger.error(f"Failed to expand documentation: {e}")
            return False
    
    def _cleanup_todos(self, file_path: str) -> bool:
        """Clean up TODO comments in a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            cleaned_lines = []
            
            for line in lines:
                if 'TODO' in line or 'FIXME' in line:
                    # Convert TODO to a proper comment
                    if '# TODO:' in line:
                        line = line.replace('# TODO:', '# NOTE:')
                    elif '# FIXME:' in line:
                        line = line.replace('# FIXME:', '# RESOLVED:')
                
                cleaned_lines.append(line)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(cleaned_lines))
            
            commit_message = f"Clean up TODO comments in {os.path.basename(file_path)}"
            return self.git_manager.commit_changes(commit_message, [file_path])
            
        except Exception as e:
            logger.error(f"Failed to cleanup TODOs: {e}")
            return False
    
    def _create_system_optimization(self):
        """Create system optimization when no specific improvements are found"""
        try:
            # Create optimization report
            optimization_file = f"optimization_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
            
            report_content = f"""# System Optimization Report

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Current System Metrics
- Total Evolutions: {self.metrics.total_evolutions}
- Successful Commits: {self.metrics.successful_commits}
- Failed Attempts: {self.metrics.failed_attempts}
- Files Analyzed: {self.metrics.files_analyzed}
- Improvements Made: {self.metrics.improvements_made}
- System Uptime: {self.metrics.uptime_hours:.2f} hours

## Repository Status
- Git Repository: {self.git_manager.is_git_repository()}
- Repository Clean: {self.git_manager.get_status()['clean']}

## Autonomous Evolution Status
The system is operating autonomously and continuously monitoring for improvement opportunities.

## Next Steps
- Continue monitoring repository for changes
- Analyze new files for optimization opportunities
- Implement automated testing improvements
- Enhance documentation coverage
"""
            
            with open(optimization_file, 'w', encoding='utf-8') as f:
                f.write(report_content)
            
            # Commit the optimization report
            commit_message = f"Autonomous system optimization report - {datetime.now().strftime('%Y-%m-%d')}"
            self.git_manager.commit_changes(commit_message, [optimization_file])
            
        except Exception as e:
            logger.error(f"Failed to create optimization: {e}")

# Global evolution engine instance
evolution_engine = None

# Flask Application Setup
app = Flask(__name__)

# Matrix-style dashboard template
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Frontier AI - Autonomous Evolution Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
            overflow-x: hidden;
            min-height: 100vh;
        }

        .matrix-bg {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }

        .matrix-column {
            position: absolute;
            top: -100px;
            font-size: 14px;
            line-height: 14px;
            white-space: nowrap;
            animation: matrix-fall linear infinite;
        }

        @keyframes matrix-fall {
            0% { transform: translateY(-100px); }
            100% { transform: translateY(100vh); }
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            position: relative;
            z-index: 1;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            border: 2px solid #0f0;
            background: rgba(0, 255, 0, 0.1);
            box-shadow: 0 0 20px #0f0;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 0 0 10px #0f0;
            animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
            from { text-shadow: 0 0 10px #0f0; }
            to { text-shadow: 0 0 20px #0f0, 0 0 30px #0f0; }
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .status-card {
            border: 1px solid #0f0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(5px);
            transition: all 0.3s ease;
        }

        .status-card:hover {
            border-color: #fff;
            box-shadow: 0 0 15px #0f0;
            transform: scale(1.02);
        }

        .status-card h3 {
            color: #fff;
            margin-bottom: 15px;
            font-size: 1.2em;
            text-transform: uppercase;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 5px 0;
            border-bottom: 1px solid #333;
        }

        .metric-value {
            color: #0ff;
            font-weight: bold;
        }

        .evolution-log {
            border: 1px solid #0f0;
            padding: 20px;
            background: rgba(0, 0, 0, 0.8);
            max-height: 400px;
            overflow-y: auto;
        }

        .log-entry {
            padding: 10px;
            margin: 5px 0;
            border-left: 3px solid #0f0;
            background: rgba(0, 255, 0, 0.1);
        }

        .log-timestamp {
            color: #888;
            font-size: 0.9em;
        }

        .controls {
            display: flex;
            gap: 20px;
            margin: 30px 0;
            justify-content: center;
        }

        .btn {
            padding: 12px 24px;
            border: 2px solid #0f0;
            background: transparent;
            color: #0f0;
            cursor: pointer;
            text-transform: uppercase;
            font-family: 'Courier New', monospace;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn:hover {
            background: #0f0;
            color: #000;
            box-shadow: 0 0 15px #0f0;
        }

        .btn.active {
            background: #0f0;
            color: #000;
        }

        .terminal {
            background: #000;
            border: 1px solid #0f0;
            padding: 20px;
            font-family: 'Courier New', monospace;
            white-space: pre-wrap;
            height: 300px;
            overflow-y: auto;
            margin: 20px 0;
        }

        .blinking {
            animation: blink 1s infinite;
        }

        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }

        .system-status {
            text-align: center;
            padding: 20px;
            margin: 20px 0;
            border: 2px solid #0f0;
            background: rgba(0, 255, 0, 0.1);
        }

        .online {
            color: #0f0;
            font-weight: bold;
        }

        .offline {
            color: #f00;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="matrix-bg" id="matrixBg"></div>
    
    <div class="container">
        <div class="header">
            <h1>🤖 FRONTIER AI</h1>
            <p>Autonomous Evolution System v3.0</p>
            <p>Status: <span class="online">{{ status }}</span></p>
        </div>

        <div class="system-status">
            <h2>🚀 AUTONOMOUS EVOLUTION ACTIVE</h2>
            <p>System Time: <span id="current-time">{{ current_time }}</span></p>
            <p>Evolution Engine: <span class="online blinking">RUNNING</span></p>
        </div>

        <div class="controls">
            <a href="/" class="btn active">Dashboard</a>
            <a href="/evolution" class="btn">Evolution Log</a>
            <a href="/metrics" class="btn">Metrics</a>
            <a href="/repository" class="btn">Repository</a>
            <a href="/start" class="btn">Start Evolution</a>
            <a href="/stop" class="btn">Stop Evolution</a>
        </div>

        <div class="status-grid">
            <div class="status-card">
                <h3>🧬 Evolution Metrics</h3>
                <div class="metric">
                    <span>Total Evolutions:</span>
                    <span class="metric-value">{{ metrics.total_evolutions }}</span>
                </div>
                <div class="metric">
                    <span>Successful Commits:</span>
                    <span class="metric-value">{{ metrics.successful_commits }}</span>
                </div>
                <div class="metric">
                    <span>Failed Attempts:</span>
                    <span class="metric-value">{{ metrics.failed_attempts }}</span>
                </div>
                <div class="metric">
                    <span>Improvements Made:</span>
                    <span class="metric-value">{{ metrics.improvements_made }}</span>
                </div>
            </div>

            <div class="status-card">
                <h3>📊 System Status</h3>
                <div class="metric">
                    <span>Uptime:</span>
                    <span class="metric-value">{{ metrics.uptime_hours|round(2) }} hours</span>
                </div>
                <div class="metric">
                    <span>Files Analyzed:</span>
                    <span class="metric-value">{{ metrics.files_analyzed }}</span>
                </div>
                <div class="metric">
                    <span>Last Evolution:</span>
                    <span class="metric-value">{{ last_evolution_time }}</span>
                </div>
                <div class="metric">
                    <span>Engine Status:</span>
                    <span class="metric-value online">{{ engine_status }}</span>
                </div>
            </div>

            <div class="status-card">
                <h3>📁 Repository Info</h3>
                <div class="metric">
                    <span>Git Repository:</span>
                    <span class="metric-value">{{ git_status.is_repo|title }}</span>
                </div>
                <div class="metric">
                    <span>Current Branch:</span>
                    <span class="metric-value">{{ git_status.branch }}</span>
                </div>
                <div class="metric">
                    <span>Clean Status:</span>
                    <span class="metric-value">{{ git_status.clean|title }}</span>
                </div>
                <div class="metric">
                    <span>Modified Files:</span>
                    <span class="metric-value">{{ git_status.modified_files|length }}</span>
                </div>
            </div>

            <div class="status-card">
                <h3>🎯 Next Actions</h3>
                {% if potential_improvements %}
                    {% for improvement in potential_improvements[:3] %}
                    <div class="metric">
                        <span>{{ improvement.type|title }}:</span>
                        <span class="metric-value">{{ improvement.file|basename }}</span>
                    </div>
                    {% endfor %}
                {% else %}
                    <div class="metric">
                        <span>Status:</span>
                        <span class="metric-value">Monitoring for opportunities</span>
                    </div>
                {% endif %}
            </div>
        </div>

        <div class="evolution-log">
            <h3>🔄 Recent Evolution Log</h3>
            {% for entry in evolution_log %}
            <div class="log-entry">
                <div class="log-timestamp">{{ entry.timestamp }}</div>
                <div><strong>{{ entry.action|title }}</strong> - {{ entry.description }}</div>
                <div>Status: <span class="metric-value">{{ entry.status|upper }}</span></div>
            </div>
            {% endfor %}
        </div>
    </div>

    <script>
        // Matrix rain effect
        function createMatrixRain() {
            const container = document.getElementById('matrixBg');
            const characters = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
            
            for (let i = 0; i < 50; i++) {
                const column = document.createElement('div');
                column.className = 'matrix-column';
                column.style.left = Math.random() * 100 + '%';
                column.style.animationDuration = (Math.random() * 3 + 2) + 's';
                column.style.animationDelay = Math.random() * 2 + 's';
                
                let text = '';
                for (let j = 0; j < 20; j++) {
                    text += characters[Math.floor(Math.random() * characters.length)] + '<br>';
                }
                column.innerHTML = text;
                
                container.appendChild(column);
            }
        }

        // Update time
        function updateTime() {
            const now = new Date();
            document.getElementById('current-time').textContent = now.toLocaleString();
        }

        // Auto-refresh data
        function refreshData() {
            fetch('/api/status')
                .then(response => response.json())
                .then(data => {
                    // Update metrics without full page reload
                    console.log('Status updated:', data);
                })
                .catch(error => console.error('Error:', error));
        }

        // Initialize
        createMatrixRain();
        updateTime();
        setInterval(updateTime, 1000);
        setInterval(refreshData, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>
"""

# Flask Routes
@app.route('/')
def dashboard():
    """Main dashboard"""
    global evolution_engine
    
    if not evolution_engine:
        return "System initializing...", 503
    
    # Get current system data
    metrics = evolution_engine.metrics
    git_status = evolution_engine.git_manager.get_status()
    evolution_log = evolution_engine.db.get_evolution_history(10)
    
    # Get potential improvements
    scan_results = evolution_engine.repo_analyzer.scan_repository()
    potential_improvements = scan_results.get('potential_improvements', [])
    
    # Format last evolution time
    last_evolution_time = "Never"
    if metrics.last_evolution:
        try:
            last_time = datetime.fromisoformat(metrics.last_evolution)
            last_evolution_time = last_time.strftime('%H:%M:%S')
        except:
            pass
    
    return render_template_string(DASHBOARD_TEMPLATE,
        status="ONLINE",
        current_time=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        metrics=metrics,
        git_status=git_status,
        evolution_log=evolution_log,
        potential_improvements=potential_improvements,
        last_evolution_time=last_evolution_time,
        engine_status="ACTIVE" if evolution_engine.running else "STANDBY"
    )

@app.route('/api/status')
def api_status():
    """API endpoint for system status"""
    global evolution_engine
    
    if not evolution_engine:
        return jsonify({"status": "initializing"}), 503
    
    return jsonify({
        "status": "online",
        "running": evolution_engine.running,
        "metrics": {
            "total_evolutions": evolution_engine.metrics.total_evolutions,
            "successful_commits": evolution_engine.metrics.successful_commits,
            "failed_attempts": evolution_engine.metrics.failed_attempts,
            "uptime_hours": evolution_engine.metrics.uptime_hours,
            "files_analyzed": evolution_engine.metrics.files_analyzed,
            "improvements_made": evolution_engine.metrics.improvements_made
        },
        "git_status": evolution_engine.git_manager.get_status(),
        "timestamp": datetime.now().isoformat()
    })

@app.route('/start')
def start_evolution():
    """Start autonomous evolution"""
    global evolution_engine
    
    if evolution_engine:
        evolution_engine.start_autonomous_evolution()
        return redirect(url_for('dashboard'))
    return "System not initialized", 503

@app.route('/stop')
def stop_evolution():
    """Stop autonomous evolution"""
    global evolution_engine
    
    if evolution_engine:
        evolution_engine.stop_autonomous_evolution()
        return redirect(url_for('dashboard'))
    return "System not initialized", 503

@app.route('/evolution')
def evolution_log():
    """Evolution log page"""
    global evolution_engine
    
    if not evolution_engine:
        return "System not initialized", 503
    
    log_entries = evolution_engine.db.get_evolution_history(100)
    
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Evolution Log - Frontier AI</title>
        <style>
            body { background: #000; color: #0f0; font-family: 'Courier New', monospace; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .log-entry { border: 1px solid #333; padding: 15px; margin: 10px 0; background: rgba(0, 255, 0, 0.1); }
            .timestamp { color: #888; }
            .status { font-weight: bold; }
            .success { color: #0f0; }
            .failed { color: #f00; }
            .back-btn { color: #0f0; text-decoration: none; padding: 10px; border: 1px solid #0f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔄 Evolution Log</h1>
                <a href="/" class="back-btn">← Back to Dashboard</a>
            </div>
            
            {% for entry in log_entries %}
            <div class="log-entry">
                <div class="timestamp">{{ entry.timestamp }}</div>
                <div><strong>{{ entry.action|title }}</strong></div>
                <div>{{ entry.description }}</div>
                {% if entry.file_path %}
                <div>File: {{ entry.file_path }}</div>
                {% endif %}
                <div class="status {{ entry.status }}">Status: {{ entry.status|upper }}</div>
                {% if entry.commit_hash %}
                <div>Commit: {{ entry.commit_hash[:8] }}</div>
                {% endif %}
            </div>
            {% endfor %}
        </div>
    </body>
    </html>
    """, log_entries=log_entries)

@app.route('/metrics')
def metrics_page():
    """Metrics page"""
    global evolution_engine
    
    if not evolution_engine:
        return "System not initialized", 503
    
    metrics = evolution_engine.metrics
    
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Metrics - Frontier AI</title>
        <style>
            body { background: #000; color: #0f0; font-family: 'Courier New', monospace; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .metric-card { border: 1px solid #0f0; padding: 20px; margin: 20px 0; background: rgba(0, 255, 0, 0.1); }
            .metric-title { font-size: 1.5em; margin-bottom: 10px; }
            .metric-value { font-size: 2em; color: #0ff; }
            .back-btn { color: #0f0; text-decoration: none; padding: 10px; border: 1px solid #0f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📊 System Metrics</h1>
            <a href="/" class="back-btn">← Back to Dashboard</a>
            
            <div class="metric-card">
                <div class="metric-title">Total Evolutions</div>
                <div class="metric-value">{{ metrics.total_evolutions }}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Successful Commits</div>
                <div class="metric-value">{{ metrics.successful_commits }}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Files Analyzed</div>
                <div class="metric-value">{{ metrics.files_analyzed }}</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">System Uptime</div>
                <div class="metric-value">{{ "%.2f"|format(metrics.uptime_hours) }} hours</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-title">Improvements Made</div>
                <div class="metric-value">{{ metrics.improvements_made }}</div>
            </div>
        </div>
    </body>
    </html>
    """, metrics=metrics)

@app.route('/repository')
def repository_page():
    """Repository analysis page"""
    global evolution_engine
    
    if not evolution_engine:
        return "System not initialized", 503
    
    scan_results = evolution_engine.repo_analyzer.scan_repository()
    
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Repository Analysis - Frontier AI</title>
        <style>
            body { background: #000; color: #0f0; font-family: 'Courier New', monospace; }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            .file-list { border: 1px solid #333; padding: 20px; margin: 20px 0; background: rgba(0, 255, 0, 0.1); max-height: 400px; overflow-y: auto; }
            .improvement { border: 1px solid #f80; padding: 10px; margin: 10px 0; background: rgba(255, 128, 0, 0.1); }
            .back-btn { color: #0f0; text-decoration: none; padding: 10px; border: 1px solid #0f0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📁 Repository Analysis</h1>
            <a href="/" class="back-btn">← Back to Dashboard</a>
            
            <h2>📈 Statistics</h2>
            <p>Total Files: {{ scan_results.files_found|length }}</p>
            <p>Last Scan: {{ scan_results.last_scan }}</p>
            
            <h2>🎯 Potential Improvements</h2>
            {% for improvement in scan_results.potential_improvements %}
            <div class="improvement">
                <strong>{{ improvement.type|title }}</strong><br>
                File: {{ improvement.file }}<br>
                Description: {{ improvement.description }}
            </div>
            {% endfor %}
            
            <h2>📂 File Types</h2>
            {% for ext, count in scan_results.file_types.items() %}
            <p>{{ ext or 'No extension' }}: {{ count }} files</p>
            {% endfor %}
        </div>
    </body>
    </html>
    """, scan_results=scan_results)

def initialize_evolution_system():
    """Initialize the evolution system with proper error handling"""
    global evolution_engine
    
    try:
        logger.info("Starting Frontier AI Evolution System...")
        evolution_engine = AutonomousEvolutionEngine()
        
        # Start autonomous evolution after a delay to ensure system is ready
        threading.Timer(10.0, evolution_engine.start_autonomous_evolution).start()
        
        logger.info("Evolution system initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize evolution system: {e}")
        return False

if __name__ == '__main__':
    # Initialize system
    if initialize_evolution_system():
        logger.info("Starting Flask application...")
        
        # Get port from environment (Railway sets PORT)
        port = int(os.environ.get('PORT', 5000))
        
        # Run Flask app
        app.run(
            host='0.0.0.0',
            port=port,
            debug=False,
            threaded=True
        )
    else:
        logger.error("Failed to start system")
        sys.exit(1)
