#!/usr/bin/env python3
"""
GitHub API Repository Monitor
Real-time monitoring of https://github.com/Kenan3477/FroniterAi
Uses GitHub API to fetch repository contents and analyze for upgrades
"""

import os
import json
import time
import requests
from datetime import datetime
from pathlib import Path
import threading
from typing import Dict, List, Any

class GitHubAPIMonitor:
    def __init__(self, workspace_path):
        self.workspace_path = Path(workspace_path)
        self.running = False
        
        # GitHub API configuration
        self.github_token = "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"
        self.repo_owner = "Kenan3477"
        self.repo_name = "FroniterAi"
        self.api_base = "https://api.github.com"
        
        # Headers for GitHub API
        self.headers = {
            "Authorization": f"token {self.github_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "FrontierAI-Monitor/1.0"
        }
        
        # Repository state
        self.repository_data = {
            "status": "initializing",
            "last_update": None,
            "files": {},
            "total_files": 0,
            "python_files": 0,
            "implementation_opportunities": [],
            "upgrade_suggestions": [],
            "connection_history": []
        }
        
        print(f"🔗 GitHub API Monitor initialized for {self.repo_owner}/{self.repo_name}")
    
    def start_monitoring(self):
        """Start continuous GitHub repository monitoring"""
        if self.running:
            print("📡 GitHub monitoring already running!")
            return
        
        self.running = True
        print("🚀 Starting GitHub API repository monitoring...")
        
        # Start monitoring thread
        monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        monitor_thread.start()
        
        print("✅ GitHub API monitoring started")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.running:
            try:
                self._fetch_repository_data()
                self._analyze_for_upgrades()
                time.sleep(30)  # Check every 30 seconds
            except Exception as e:
                print(f"❌ GitHub monitoring error: {e}")
                self.repository_data["status"] = "error"
                self.repository_data["error"] = str(e)
                time.sleep(60)  # Wait longer on error
    
    def _fetch_repository_data(self):
        """Fetch repository data from GitHub API"""
        try:
            print("📡 Fetching repository data from GitHub API...")
            
            # Get repository info
            repo_url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}"
            repo_response = requests.get(repo_url, headers=self.headers)
            
            if repo_response.status_code != 200:
                raise Exception(f"GitHub API error: {repo_response.status_code}")
            
            repo_info = repo_response.json()
            
            # Get repository contents
            contents_url = f"{self.api_base}/repos/{self.repo_owner}/{self.repo_name}/contents"
            contents_response = requests.get(contents_url, headers=self.headers)
            
            if contents_response.status_code != 200:
                raise Exception(f"Contents API error: {contents_response.status_code}")
            
            contents = contents_response.json()
            
            # Process repository data
            self._process_repository_contents(contents, repo_info)
            
            self.repository_data["status"] = "connected"
            self.repository_data["last_update"] = datetime.now().isoformat()
            
            # Add to connection history
            self.repository_data["connection_history"].append({
                "timestamp": datetime.now().isoformat(),
                "status": "success",
                "files_found": self.repository_data["total_files"]
            })
            
            # Keep only last 10 connection records
            if len(self.repository_data["connection_history"]) > 10:
                self.repository_data["connection_history"] = self.repository_data["connection_history"][-10:]
            
            print(f"✅ Repository data updated: {self.repository_data['total_files']} files found")
            
        except Exception as e:
            print(f"❌ Error fetching repository data: {e}")
            self.repository_data["status"] = "error"
            self.repository_data["error"] = str(e)
            
            # Add error to connection history
            self.repository_data["connection_history"].append({
                "timestamp": datetime.now().isoformat(),
                "status": "error",
                "error": str(e)
            })
    
    def _process_repository_contents(self, contents: List[Dict], repo_info: Dict):
        """Process and categorize repository contents"""
        files = {}
        total_files = 0
        python_files = 0
        
        for item in contents:
            if item["type"] == "file":
                file_info = {
                    "name": item["name"],
                    "path": item["path"],
                    "size": item["size"],
                    "url": item["download_url"],
                    "sha": item["sha"],
                    "last_modified": item.get("updated_at", "unknown")
                }
                
                files[item["name"]] = file_info
                total_files += 1
                
                # Categorize files
                if item["name"].endswith(".py"):
                    python_files += 1
                    # Analyze Python files for upgrade opportunities
                    self._analyze_python_file(file_info)
        
        # Update repository data
        self.repository_data.update({
            "files": files,
            "total_files": total_files,
            "python_files": python_files,
            "repository_info": {
                "name": repo_info["name"],
                "full_name": repo_info["full_name"],
                "description": repo_info.get("description", ""),
                "language": repo_info.get("language", ""),
                "stars": repo_info["stargazers_count"],
                "forks": repo_info["forks_count"],
                "updated_at": repo_info["updated_at"]
            }
        })
    
    def _analyze_python_file(self, file_info: Dict):
        """Analyze Python file for upgrade opportunities"""
        try:
            # Fetch file content
            content_response = requests.get(file_info["url"], headers=self.headers)
            if content_response.status_code == 200:
                content = content_response.text
                
                # Analyze for basic implementations that need upgrading
                upgrade_opportunities = []
                
                # Check for basic patterns that could be enhanced
                if "def " in content and len(content.split("def ")) < 5:
                    upgrade_opportunities.append(f"Few functions in {file_info['name']} - could be expanded")
                
                if "class " in content and "def __init__" not in content:
                    upgrade_opportunities.append(f"Class in {file_info['name']} missing proper initialization")
                
                if "TODO" in content or "FIXME" in content:
                    upgrade_opportunities.append(f"TODO/FIXME comments in {file_info['name']} need implementation")
                
                if "import " in content and "from " not in content:
                    upgrade_opportunities.append(f"Basic imports in {file_info['name']} could be optimized")
                
                # Add opportunities to the list
                if upgrade_opportunities:
                    self.repository_data["implementation_opportunities"].extend(upgrade_opportunities)
                
        except Exception as e:
            print(f"⚠️ Error analyzing {file_info['name']}: {e}")
    
    def _analyze_for_upgrades(self):
        """Analyze repository for upgrade opportunities"""
        try:
            upgrade_suggestions = []
            
            # Check file count and suggest improvements
            if self.repository_data["total_files"] < 50:
                upgrade_suggestions.append("Repository could benefit from more comprehensive file structure")
            
            if self.repository_data["python_files"] > 0:
                ratio = self.repository_data["python_files"] / self.repository_data["total_files"]
                if ratio > 0.8:
                    upgrade_suggestions.append("Consider adding configuration files, documentation, and tests")
            
            # Check for missing common files
            file_names = [f.lower() for f in self.repository_data["files"].keys()]
            
            if "readme.md" not in file_names:
                upgrade_suggestions.append("Add comprehensive README.md documentation")
            
            if "requirements.txt" not in file_names and self.repository_data["python_files"] > 0:
                upgrade_suggestions.append("Add requirements.txt for Python dependencies")
            
            if "dockerfile" not in file_names:
                upgrade_suggestions.append("Add Dockerfile for containerized deployment")
            
            # Update suggestions
            self.repository_data["upgrade_suggestions"] = upgrade_suggestions
            
        except Exception as e:
            print(f"⚠️ Error analyzing for upgrades: {e}")
    
    def get_monitor_status(self) -> Dict[str, Any]:
        """Get current monitoring status"""
        return {
            "status": self.repository_data["status"],
            "repository_url": f"https://github.com/{self.repo_owner}/{self.repo_name}",
            "last_update": self.repository_data["last_update"],
            "repository_stats": {
                "total_files": self.repository_data["total_files"],
                "python_files": self.repository_data["python_files"],
                "repository_info": self.repository_data.get("repository_info", {}),
            },
            "implementation_opportunities": self.repository_data["implementation_opportunities"][-5:],  # Last 5
            "upgrade_suggestions": self.repository_data["upgrade_suggestions"][-5:],  # Last 5
            "connection_history": self.repository_data["connection_history"][-3:],  # Last 3
            "last_heartbeat": self.repository_data["last_update"],
            "monitoring_active": self.running
        }
    
    def get_detailed_analysis(self) -> Dict[str, Any]:
        """Get detailed repository analysis"""
        return {
            "repository_data": self.repository_data,
            "files_list": list(self.repository_data["files"].keys()),
            "python_files_list": [name for name, info in self.repository_data["files"].items() if name.endswith(".py")],
            "all_opportunities": self.repository_data["implementation_opportunities"],
            "all_suggestions": self.repository_data["upgrade_suggestions"]
        }
    
    def stop_monitoring(self):
        """Stop monitoring"""
        self.running = False
        print("🛑 GitHub API monitoring stopped")

# Export for integration
__all__ = ['GitHubAPIMonitor']
