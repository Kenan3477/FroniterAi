#!/usr/bin/env python3
"""
GitHub Repository Heartbeat Monitor
Real-time monitoring of FrontierAI repository connection and file access
"""

import os
import json
import time
import threading
import subprocess
import requests
import base64
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

class GitHubHeartbeatMonitor:
    def __init__(self, workspace_path, repo_owner="Kenan3477", repo_name="FroniterAi"):
        self.workspace_path = Path(workspace_path)
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.running = False
        
        # GitHub API configuration
        self.github_api_base = "https://api.github.com"
        self.github_repo_url = f"https://github.com/{repo_owner}/{repo_name}"
        self.github_token = os.environ.get('GITHUB_TOKEN')
        
        # Heartbeat data
        self.heartbeat_data = {
            "connection_status": "initializing",
            "last_heartbeat": None,
            "repository_stats": {},
            "file_access_log": [],
            "connection_history": [],
            "git_status": {},
            "real_time_files": [],
            "heartbeat_interval": 15,  # seconds
            "failed_attempts": 0,
            "last_successful_sync": None
        }
        
        print("💓 GitHub Heartbeat Monitor initialized")
        print(f"📡 Monitoring: {repo_owner}/{repo_name}")
        print(f"🔗 Repository: https://github.com/{repo_owner}/{repo_name}")
        print(f"🔑 GitHub Token: {'Available' if self.github_token else 'Using public API'}")
    
    def _get_github_headers(self):
        """Get headers for GitHub API requests"""
        headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'FrontierAI-Evolution-Monitor'
        }
        if self.github_token:
            headers['Authorization'] = f'token {self.github_token}'
        return headers
    
    def _fetch_github_repository_info(self):
        """Fetch repository information from GitHub API"""
        try:
            url = f"{self.github_api_base}/repos/{self.repo_owner}/{self.repo_name}"
            response = requests.get(url, headers=self._get_github_headers(), timeout=10)
            
            if response.status_code == 200:
                repo_data = response.json()
                return {
                    "name": repo_data.get("name"),
                    "full_name": repo_data.get("full_name"),
                    "description": repo_data.get("description"),
                    "size": repo_data.get("size"),
                    "default_branch": repo_data.get("default_branch"),
                    "language": repo_data.get("language"),
                    "updated_at": repo_data.get("updated_at"),
                    "pushed_at": repo_data.get("pushed_at")
                }
            else:
                print(f"❌ GitHub API error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching repository info: {e}")
            return None
    
    def _fetch_github_repository_contents(self, path=""):
        """Fetch repository contents from GitHub API"""
        try:
            url = f"{self.github_api_base}/repos/{self.repo_owner}/{self.repo_name}/contents/{path}"
            response = requests.get(url, headers=self._get_github_headers(), timeout=10)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ GitHub API error fetching contents: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error fetching repository contents: {e}")
            return None
    
    def _count_github_repository_files(self):
        """Count all files in the GitHub repository"""
        try:
            file_counts = {
                "total_files": 0,
                "python_files": 0,
                "text_files": 0,
                "config_files": 0,
                "html_files": 0,
                "javascript_files": 0,
                "directories": 0
            }
            
            def count_contents(path=""):
                contents = self._fetch_github_repository_contents(path)
                if not contents:
                    return
                
                for item in contents:
                    if item["type"] == "dir":
                        file_counts["directories"] += 1
                        # Recursively count files in subdirectories
                        count_contents(item["path"])
                    elif item["type"] == "file":
                        file_counts["total_files"] += 1
                        
                        # Categorize by file type
                        name = item["name"].lower()
                        if name.endswith(('.py', '.pyx', '.pyi')):
                            file_counts["python_files"] += 1
                        elif name.endswith(('.txt', '.md', '.rst', '.log')):
                            file_counts["text_files"] += 1
                        elif name.endswith(('.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf')):
                            file_counts["config_files"] += 1
                        elif name.endswith(('.html', '.htm')):
                            file_counts["html_files"] += 1
                        elif name.endswith(('.js', '.jsx', '.ts', '.tsx')):
                            file_counts["javascript_files"] += 1
            
            count_contents()
            return file_counts
            
        except Exception as e:
            print(f"❌ Error counting repository files: {e}")
            return {"total_files": 0, "error": str(e)}
    
    def start_heartbeat_monitoring(self):
        """Start the heartbeat monitoring system"""
        print("💓 STARTING GITHUB HEARTBEAT MONITORING")
        print("🔗 Real-time repository connection tracking")
        print("📊 Live file access monitoring")
        
        self.running = True
        
        # Start heartbeat threads
        self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop)
        self.heartbeat_thread.daemon = True
        self.heartbeat_thread.start()
        
        self.file_monitor_thread = threading.Thread(target=self._file_monitoring_loop)
        self.file_monitor_thread.daemon = True
        self.file_monitor_thread.start()
        
        self.git_status_thread = threading.Thread(target=self._git_status_loop)
        self.git_status_thread.daemon = True
        self.git_status_thread.start()
        
        print("✅ GitHub Heartbeat Monitor is LIVE!")
        print("💓 Broadcasting connection status every 15 seconds")
    
    def _heartbeat_loop(self):
        """Main heartbeat monitoring loop"""
        while self.running:
            try:
                heartbeat_time = datetime.now()
                print(f"💓 Heartbeat check - {heartbeat_time.strftime('%H:%M:%S')}")
                
                # Perform repository connection test
                connection_test = self._test_repository_connection()
                
                # Update heartbeat data
                self.heartbeat_data["last_heartbeat"] = heartbeat_time.isoformat()
                self.heartbeat_data["connection_status"] = connection_test["status"]
                
                # Log connection attempt
                self.heartbeat_data["connection_history"].append({
                    "timestamp": heartbeat_time.isoformat(),
                    "status": connection_test["status"],
                    "response_time": connection_test.get("response_time", 0),
                    "files_detected": connection_test.get("files_count", 0)
                })
                
                # Keep only last 50 history entries
                if len(self.heartbeat_data["connection_history"]) > 50:
                    self.heartbeat_data["connection_history"] = self.heartbeat_data["connection_history"][-50:]
                
                # Update failed attempts counter
                if connection_test["status"] == "connected":
                    self.heartbeat_data["failed_attempts"] = 0
                    self.heartbeat_data["last_successful_sync"] = heartbeat_time.isoformat()
                else:
                    self.heartbeat_data["failed_attempts"] += 1
                
                print(f"🔗 Connection: {connection_test['status'].upper()}")
                print(f"📁 Files detected: {connection_test.get('files_count', 0)}")
                
                time.sleep(self.heartbeat_data["heartbeat_interval"])
                
            except Exception as e:
                print(f"💔 Heartbeat error: {e}")
                self._log_connection_error(str(e))
                time.sleep(30)
    
    def _test_repository_connection(self):
        """Test connection to the GitHub repository"""
        try:
            start_time = time.time()
            
            # Test 1: Fetch repository information
            repo_info = self._fetch_github_repository_info()
            if not repo_info:
                return {
                    "status": "disconnected",
                    "error": "Cannot access GitHub repository",
                    "response_time": time.time() - start_time
                }
            
            # Test 2: Count files in GitHub repository
            file_counts = self._count_github_repository_files()
            
            # Test 3: Check repository accessibility
            total_files = file_counts.get("total_files", 0)
            
            response_time = time.time() - start_time
            
            # Determine overall status
            if total_files > 0:
                status = "connected"
                print(f"✅ GitHub connection successful - {total_files} files found")
            else:
                status = "disconnected"
                print(f"❌ GitHub connection failed - no files found")
            
            # Update repository stats
            self.heartbeat_data["repository_stats"] = {
                "total_files": total_files,
                "python_files": file_counts.get("python_files", 0),
                "text_files": file_counts.get("text_files", 0),
                "config_files": file_counts.get("config_files", 0),
                "html_files": file_counts.get("html_files", 0),
                "javascript_files": file_counts.get("javascript_files", 0),
                "directories": file_counts.get("directories", 0),
                "repository_name": repo_info.get("full_name", "unknown"),
                "default_branch": repo_info.get("default_branch", "unknown"),
                "last_updated": repo_info.get("updated_at", "unknown"),
                "repository_size": repo_info.get("size", 0),
                "git_status": "connected"
            }
            
            return {
                "status": status,
                "files_count": total_files,
                "git_accessible": True,
                "file_access": True,
                "response_time": round(response_time, 3)
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "response_time": time.time() - start_time
            }
    
    def _count_repository_files(self):
        """Count all files in the repository"""
        try:
            file_count = 0
            file_types = {}
            
            print(f"🔍 Scanning files in: {self.workspace_path}")
            
            # Count all files, including debug info
            total_scanned = 0
            ignored_count = 0
            
            for file_path in self.workspace_path.rglob('*'):
                total_scanned += 1
                if file_path.is_file():
                    if not self._should_ignore_file(file_path):
                        file_count += 1
                        
                        # Count by file type
                        ext = file_path.suffix.lower()
                        file_types[ext] = file_types.get(ext, 0) + 1
                    else:
                        ignored_count += 1
            
            print(f"📊 File scan results:")
            print(f"   Total items scanned: {total_scanned}")
            print(f"   Valid files found: {file_count}")
            print(f"   Files ignored: {ignored_count}")
            print(f"   File types: {file_types}")
            
            # Update repository stats
            self.heartbeat_data["repository_stats"] = {
                "total_files": file_count,
                "file_types": file_types,
                "last_scan": datetime.now().isoformat()
            }
            
            return file_count
            
        except Exception as e:
            print(f"📁 File count error: {e}")
            return 0
    
    def _test_git_access(self):
        """Test Git repository access"""
        try:
            # Check if .git directory exists
            git_dir = self.workspace_path / ".git"
            if not git_dir.exists():
                return False
            
            # Try to get git status
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            return result.returncode == 0
            
        except Exception as e:
            print(f"🔧 Git access test failed: {e}")
            return False
    
    def _test_file_access(self):
        """Test if we can actually read files"""
        try:
            # Try to read a few different file types
            test_files = []
            
            # Find some files to test
            for ext in ['.py', '.md', '.json', '.txt']:
                for file_path in self.workspace_path.rglob(f'*{ext}'):
                    if file_path.is_file() and len(test_files) < 3:
                        test_files.append(file_path)
                        break
            
            if not test_files:
                return False
            
            # Try to read each test file
            for file_path in test_files:
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read(100)  # Read first 100 chars
                        
                    # Log successful file access
                    self._log_file_access(file_path, len(content))
                    
                except Exception as e:
                    print(f"📄 File read test failed for {file_path}: {e}")
                    return False
            
            return True
            
        except Exception as e:
            print(f"📄 File access test error: {e}")
            return False
    
    def _file_monitoring_loop(self):
        """Monitor file access in real-time"""
        while self.running:
            try:
                # Get real-time file list
                current_files = self._get_current_file_snapshot()
                self.heartbeat_data["real_time_files"] = current_files
                
                # Check for new files
                self._detect_new_files(current_files)
                
                time.sleep(30)  # Update file list every 30 seconds
                
            except Exception as e:
                print(f"📂 File monitoring error: {e}")
                time.sleep(60)
    
    def _git_status_loop(self):
        """Monitor Git status"""
        while self.running:
            try:
                git_status = self._get_git_status()
                self.heartbeat_data["git_status"] = git_status
                
                time.sleep(60)  # Check Git status every minute
                
            except Exception as e:
                print(f"🔧 Git status error: {e}")
                time.sleep(120)
    
    def _get_current_file_snapshot(self):
        """Get current snapshot of repository files"""
        try:
            files_snapshot = []
            
            # Get recent files (modified in last 24 hours)
            cutoff_time = datetime.now() - timedelta(hours=24)
            
            for file_path in self.workspace_path.rglob('*'):
                if file_path.is_file() and not self._should_ignore_file(file_path):
                    try:
                        modified_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        
                        if modified_time > cutoff_time:
                            files_snapshot.append({
                                "path": str(file_path.relative_to(self.workspace_path)),
                                "size": file_path.stat().st_size,
                                "modified": modified_time.isoformat(),
                                "type": file_path.suffix
                            })
                            
                    except Exception as e:
                        continue
            
            # Sort by modification time, newest first
            files_snapshot.sort(key=lambda x: x["modified"], reverse=True)
            
            return files_snapshot[:20]  # Return 20 most recent files
            
        except Exception as e:
            print(f"📸 File snapshot error: {e}")
            return []
    
    def _detect_new_files(self, current_files):
        """Detect newly created files"""
        try:
            # Check if any files were created in the last 5 minutes
            cutoff_time = datetime.now() - timedelta(minutes=5)
            
            new_files = []
            for file_info in current_files:
                file_modified = datetime.fromisoformat(file_info["modified"])
                if file_modified > cutoff_time:
                    new_files.append(file_info)
            
            if new_files:
                print(f"🆕 Detected {len(new_files)} new files")
                for file_info in new_files:
                    self._log_file_access(file_info["path"], file_info["size"], "new_file")
                    
        except Exception as e:
            print(f"🔍 New file detection error: {e}")
    
    def _get_git_status(self):
        """Get current Git repository status"""
        try:
            # Get Git status
            status_result = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Get current branch
            branch_result = subprocess.run(
                ["git", "branch", "--show-current"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Get last commit
            commit_result = subprocess.run(
                ["git", "log", "-1", "--pretty=format:%H %s"],
                cwd=self.workspace_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            return {
                "status_available": status_result.returncode == 0,
                "current_branch": branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown",
                "modified_files": len(status_result.stdout.strip().split('\n')) if status_result.stdout.strip() else 0,
                "last_commit": commit_result.stdout.strip() if commit_result.returncode == 0 else "unknown",
                "last_check": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "status_available": False,
                "error": str(e),
                "last_check": datetime.now().isoformat()
            }
    
    def _log_file_access(self, file_path, size, access_type="read"):
        """Log file access activity"""
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "file_path": str(file_path),
            "size": size,
            "access_type": access_type
        }
        
        self.heartbeat_data["file_access_log"].append(log_entry)
        
        # Keep only last 100 entries
        if len(self.heartbeat_data["file_access_log"]) > 100:
            self.heartbeat_data["file_access_log"] = self.heartbeat_data["file_access_log"][-100:]
    
    def _log_connection_error(self, error_message):
        """Log connection errors"""
        self.heartbeat_data["connection_history"].append({
            "timestamp": datetime.now().isoformat(),
            "status": "error",
            "error": error_message
        })
    
    def _should_ignore_file(self, file_path):
        """Check if file should be ignored"""
        ignore_patterns = [
            '__pycache__', '.git', 'node_modules', '.vscode',
            '.pyc', '.log', '.tmp', '.cache', 'logs'
        ]
        path_str = str(file_path).lower()
        return any(pattern in path_str for pattern in ignore_patterns)
    
    def get_heartbeat_status(self):
        """Get current heartbeat status"""
        return {
            "connection_status": self.heartbeat_data["connection_status"],
            "last_heartbeat": self.heartbeat_data["last_heartbeat"],
            "failed_attempts": self.heartbeat_data["failed_attempts"],
            "last_successful_sync": self.heartbeat_data["last_successful_sync"],
            "repository_stats": self.heartbeat_data["repository_stats"],
            "git_status": self.heartbeat_data["git_status"],
            "heartbeat_interval": self.heartbeat_data["heartbeat_interval"]
        }
    
    def get_connection_status(self):
        """Get connection status in the format expected by production manager"""
        repo_stats = self.heartbeat_data["repository_stats"]
        
        return {
            "status": self.heartbeat_data["connection_status"],
            "last_heartbeat": self.heartbeat_data["last_heartbeat"],
            "repository_path": str(self.workspace_path),
            "repository_stats": {
                "total_files": repo_stats.get("total_files", 0),
                "python_files": repo_stats.get("file_types", {}).get(".py", 0),
                "text_files": repo_stats.get("file_types", {}).get(".txt", 0) + repo_stats.get("file_types", {}).get(".md", 0),
                "config_files": repo_stats.get("file_types", {}).get(".json", 0) + repo_stats.get("file_types", {}).get(".yml", 0),
                "git_status": self.heartbeat_data["git_status"].get("status", "unknown"),
                "current_branch": self.heartbeat_data["git_status"].get("branch", "unknown")
            },
            "timestamp": datetime.now().isoformat(),
            "error": None if self.heartbeat_data["connection_status"] == "connected" else "Connection issues detected"
        }
    
    def get_live_connection_data(self):
        """Get live connection data for dashboard"""
        return {
            "heartbeat": self.get_heartbeat_status(),
            "recent_files": self.heartbeat_data["real_time_files"][:10],
            "file_access_log": self.heartbeat_data["file_access_log"][-10:],
            "connection_history": self.heartbeat_data["connection_history"][-10:]
        }
    
    def get_detailed_repository_info(self):
        """Get detailed repository information"""
        return {
            "repository": f"{self.repo_owner}/{self.repo_name}",
            "workspace_path": str(self.workspace_path),
            "monitoring_status": "active" if self.running else "inactive",
            "stats": self.heartbeat_data["repository_stats"],
            "git_info": self.heartbeat_data["git_status"],
            "connection_health": {
                "status": self.heartbeat_data["connection_status"],
                "uptime": self._calculate_uptime(),
                "success_rate": self._calculate_success_rate()
            }
        }
    
    def _calculate_uptime(self):
        """Calculate monitoring uptime"""
        if not self.heartbeat_data["connection_history"]:
            return "0:00:00"
        
        first_entry = self.heartbeat_data["connection_history"][0]
        start_time = datetime.fromisoformat(first_entry["timestamp"])
        uptime = datetime.now() - start_time
        
        return str(uptime).split('.')[0]  # Remove microseconds
    
    def _calculate_success_rate(self):
        """Calculate connection success rate"""
        if not self.heartbeat_data["connection_history"]:
            return 0.0
        
        successful_connections = sum(
            1 for entry in self.heartbeat_data["connection_history"]
            if entry["status"] == "connected"
        )
        
        total_attempts = len(self.heartbeat_data["connection_history"])
        return round((successful_connections / total_attempts) * 100, 1)

# Export for integration
__all__ = ['GitHubHeartbeatMonitor']
