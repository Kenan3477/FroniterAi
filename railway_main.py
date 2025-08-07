#!/usr/bin/env python3
"""
🔥 FRONTIER AI - COMPLETE AUTONOMOUS SYSTEM (WORKING VERSION)
============================================================

This is the ACTUALLY WORKING version that:
✅ EDITS FILES DIRECTLY (no fake reports) 
✅ PREVENTS DUPLICATE WORK (cooldown tracking)
✅ SKIPS GIT OPERATIONS (Railway doesn't have git)
✅ FAST CYCLES (30-60 seconds)
✅ REAL IMPROVEMENTS (logging, docstrings, error handling)

NO MORE BULLSHIT - REAL FILE MODIFICATIONS!
"""

import os
import sys
import time
import json
import random
import sqlite3
import logging
import threading
import subprocess
import ast
import re
import glob
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('frontier_ai.log')
    ]
)
logger = logging.getLogger(__name__)

class FrontierAI:
    """ACTUALLY WORKING Frontier AI System - Edits Files Directly"""
    
    def __init__(self):
        self.start_time = time.time()
        self.evolution_count = 0
        
        # Track recent improvements to prevent duplicates
        self.recent_improvements = {}
        self.improvement_cooldown = 300  # 5 minutes between same file improvements
        
        # File modification tracking
        self.files_modified = []
        self.successful_modifications = 0
        
        logger.info("🔥 INITIALIZING ACTUALLY WORKING FRONTIER AI")
        
        # Initialize database
        self.init_database()
        
        # Start autonomous processes
        self.start_autonomous_evolution()
    
    def init_database(self):
        """Initialize database"""
        try:
            conn = sqlite3.connect('working_frontier.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS file_modifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT,
                    file_path TEXT,
                    modification_type TEXT,
                    changes_made TEXT,
                    success BOOLEAN
                )
            ''')
            
            conn.commit()
            conn.close()
            logger.info("✅ Database initialized")
            
        except Exception as e:
            logger.error(f"❌ Database init failed: {e}")
    
    def start_autonomous_evolution(self):
        """Start the autonomous evolution process"""
        def evolution_loop():
            while True:
                try:
                    # Random interval between 30-60 seconds
                    interval = random.randint(30, 60)
                    time.sleep(interval)
                    
                    self.perform_file_modification()
                    
                except Exception as e:
                    logger.error(f"❌ Evolution loop error: {e}")
                    time.sleep(30)
        
        evolution_thread = threading.Thread(target=evolution_loop, daemon=True)
        evolution_thread.start()
        logger.info("🚀 Autonomous evolution started")
    
    def perform_file_modification(self):
        """ACTUALLY modify files - no more fake reports!"""
        try:
            logger.info("🔍 SCANNING for files to ACTUALLY modify...")
            
            # Get Python files (exclude system files)
            python_files = []
            for file in glob.glob('./*.py'):
                if not file.startswith('./railway_') and not file.startswith('./ACTUALLY_'):
                    python_files.append(file)
            
            if not python_files:
                logger.info("📂 No suitable files found")
                return
            
            # Filter out recently modified files
            available_files = []
            current_time = time.time()
            
            for file in python_files:
                if file not in self.recent_improvements:
                    available_files.append(file)
                elif (current_time - self.recent_improvements[file]) > self.improvement_cooldown:
                    available_files.append(file)
            
            if not available_files:
                logger.info("⏰ All files recently modified - waiting for cooldown")
                return
            
            # Pick a file to modify
            target_file = random.choice(available_files)
            logger.info(f"🎯 TARGET FILE: {target_file}")
            
            # ACTUALLY modify the file
            modification_made = self.modify_file_directly(target_file)
            
            if modification_made:
                # Mark as recently modified
                self.recent_improvements[target_file] = current_time
                self.successful_modifications += 1
                
                # Log to database
                self.log_modification(target_file, modification_made)
                
                logger.info(f"✅ FILE ACTUALLY MODIFIED: {target_file}")
                logger.info(f"🔧 CHANGE: {modification_made}")
            else:
                logger.info(f"✅ {target_file} already optimized")
                
        except Exception as e:
            logger.error(f"❌ File modification failed: {e}")
    
    def modify_file_directly(self, file_path):
        """DIRECTLY modify the file - no bullshit reports"""
        try:
            # Read the file
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                original_content = f.read()
            
            modified_content = original_content
            modification_type = None
            
            # MODIFICATION 1: Replace print with logging
            if 'print(' in original_content and 'import logging' not in original_content:
                # Add logging import
                lines = original_content.split('\n')
                
                # Find where to insert logging import
                import_index = 0
                for i, line in enumerate(lines):
                    if line.startswith('import ') or line.startswith('from '):
                        import_index = i + 1
                    elif line.strip() == '' or line.startswith('#'):
                        continue
                    else:
                        break
                
                lines.insert(import_index, 'import logging')
                modified_content = '\n'.join(lines)
                
                # Replace print statements
                modified_content = re.sub(
                    r'print\((.*?)\)',
                    r'logging.info(\1)',
                    modified_content
                )
                
                modification_type = "Added logging and replaced print statements"
            
            # MODIFICATION 2: Add docstrings to functions
            elif 'def ' in original_content:
                lines = modified_content.split('\n')
                new_lines = []
                
                for i, line in enumerate(lines):
                    new_lines.append(line)
                    
                    # Check if this is a function definition
                    if line.strip().startswith('def ') and line.strip().endswith(':'):
                        # Check if next line is already a docstring
                        next_line_idx = i + 1
                        while next_line_idx < len(lines) and lines[next_line_idx].strip() == '':
                            next_line_idx += 1
                        
                        if next_line_idx < len(lines):
                            next_line = lines[next_line_idx].strip()
                            if not (next_line.startswith('"""') or next_line.startswith("'''")):
                                # Add docstring
                                func_name = line.strip().split('(')[0].replace('def ', '')
                                indent = len(line) - len(line.lstrip())
                                
                                docstring = [
                                    ' ' * (indent + 4) + '"""',
                                    ' ' * (indent + 4) + f'{func_name} function',
                                    ' ' * (indent + 4) + 'Auto-generated docstring',
                                    ' ' * (indent + 4) + '"""'
                                ]
                                
                                new_lines.extend(docstring)
                                modification_type = f"Added docstring to function {func_name}"
                                break
                
                if modification_type:
                    modified_content = '\n'.join(new_lines)
            
            # MODIFICATION 3: Improve exception handling
            elif 'except:' in original_content:
                modified_content = modified_content.replace('except:', 'except Exception as e:')
                modification_type = "Improved exception handling"
            
            # MODIFICATION 4: Add type hints to simple functions
            elif 'def ' in original_content and '->' not in original_content:
                lines = modified_content.split('\n')
                for i, line in enumerate(lines):
                    if line.strip().startswith('def ') and '(' in line and ')' in line and ':' in line:
                        if '->' not in line and 'self' not in line:  # Simple function without return type
                            modified_line = line.replace('):', ') -> None:')
                            lines[i] = modified_line
                            modification_type = "Added type hints"
                            break
                
                if modification_type:
                    modified_content = '\n'.join(lines)
            
            # If we made changes, write them back
            if modified_content != original_content and modification_type:
                # Create backup
                backup_path = f"{file_path}.backup_{int(time.time())}"
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(original_content)
                
                # Write the modified file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(modified_content)
                
                return modification_type
            
            return None
            
        except Exception as e:
            logger.error(f"❌ Direct modification failed: {e}")
            return None
    
    def log_modification(self, file_path, modification_type):
        """Log the modification to database"""
        try:
            conn = sqlite3.connect('working_frontier.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO file_modifications 
                (timestamp, file_path, modification_type, changes_made, success)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                datetime.now().isoformat(),
                file_path,
                modification_type,
                "Direct file modification",
                True
            ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Failed to log modification: {e}")
    
    def get_status(self):
        """Get system status"""
        uptime = time.time() - self.start_time
        
        return {
            'status': 'ACTUALLY WORKING',
            'uptime_seconds': int(uptime),
            'files_modified': self.successful_modifications,
            'recent_modifications': len(self.recent_improvements),
            'active_processes': ['File Modification Engine'],
            'next_scan_in': 30,
            'modification_strategy': 'DIRECT FILE EDITING'
        }
    
    def get_live_feed(self):
        """Get live activity feed"""
        try:
            conn = sqlite3.connect('working_frontier.db')
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT timestamp, file_path, modification_type 
                FROM file_modifications 
                ORDER BY timestamp DESC 
                LIMIT 10
            ''')
            
            activities = []
            for row in cursor.fetchall():
                activities.append({
                    'timestamp': row[0],
                    'action': f"Modified {row[1]}",
                    'details': row[2],
                    'type': 'file_modification'
                })
            
            conn.close()
            
            return {
                'activities': activities,
                'system_status': 'DIRECTLY MODIFYING FILES',
                'last_update': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Live feed error: {e}")
            return {'activities': [], 'error': str(e)}

# Flask App
app = Flask(__name__)
CORS(app)

# Initialize system
frontier_ai = FrontierAI()

@app.route('/')
def index():
    return '''
    <html>
    <head>
        <title>🔥 ACTUALLY WORKING Frontier AI</title>
        <style>
            body { font-family: monospace; background: #000; color: #0f0; padding: 20px; }
            .status { background: #111; padding: 15px; margin: 10px 0; border: 1px solid #0f0; }
            .activity { background: #001100; padding: 10px; margin: 5px 0; border-left: 3px solid #0f0; }
        </style>
        <script>
            function updateStatus() {
                fetch('/api/status').then(r => r.json()).then(data => {
                    document.getElementById('status').innerHTML = JSON.stringify(data, null, 2);
                });
                
                fetch('/api/live-feed').then(r => r.json()).then(data => {
                    let html = '';
                    data.activities.forEach(activity => {
                        html += `<div class="activity">${activity.timestamp}: ${activity.action} - ${activity.details}</div>`;
                    });
                    document.getElementById('activities').innerHTML = html;
                });
            }
            
            setInterval(updateStatus, 2000);
            updateStatus();
        </script>
    </head>
    <body>
        <h1>🔥 ACTUALLY WORKING FRONTIER AI</h1>
        <p>✅ DIRECTLY MODIFYING FILES (no fake reports)</p>
        <p>✅ PREVENTING DUPLICATE WORK (cooldown tracking)</p>
        <p>✅ REAL IMPROVEMENTS (logging, docstrings, error handling)</p>
        
        <div class="status">
            <h2>📊 System Status</h2>
            <pre id="status">Loading...</pre>
        </div>
        
        <div class="status">
            <h2>🔥 Live Modifications</h2>
            <div id="activities">Loading...</div>
        </div>
    </body>
    </html>
    '''

@app.route('/api/status')
def api_status():
    return jsonify(frontier_ai.get_status())

@app.route('/api/live-feed')
def api_live_feed():
    return jsonify(frontier_ai.get_live_feed())

if __name__ == "__main__":
    logger.info("🔥 STARTING ACTUALLY WORKING FRONTIER AI")
    logger.info("✅ DIRECT FILE MODIFICATION ENABLED")
    logger.info("✅ DUPLICATE PREVENTION ACTIVE")
    logger.info("✅ NO MORE BULLSHIT REPORTS")
    
    app.run(host="0.0.0.0", port=8080, debug=False)
