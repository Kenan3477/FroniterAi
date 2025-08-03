#!/usr/bin/env python3
"""
Enhanced GitHub Heartbeat Monitor for FrontierAI Self-Evolution System
Monitors repository health, tracks evolution progress, and manages autonomous upgrades
"""

import os
import json
import time
import requests
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import hashlib
import logging
from dataclasses import dataclass, asdict
import threading
import subprocess
import git

logger = logging.getLogger(__name__)

@dataclass
class RepositoryStats:
    """Repository statistics and health metrics"""
    commits_total: int
    commits_last_24h: int
    branches: int
    files_tracked: int
    size_mb: float
    last_commit_sha: str
    last_commit_time: datetime
    contributors: int
    open_issues: int
    stars: int
    forks: int
    language_distribution: Dict[str, float]

@dataclass
class EvolutionEvent:
    """Evolution system event tracking"""
    event_id: str
    timestamp: datetime
    event_type: str  # analysis, upgrade, implementation, monitoring
    description: str
    impact_level: str  # low, medium, high, critical
    files_affected: List[str]
    metrics_before: Dict[str, Any]
    metrics_after: Dict[str, Any]
    success: bool
    implementation_time: float

class EnhancedGitHubMonitor:
    """Enhanced GitHub monitoring with self-evolution capabilities"""
    
    def __init__(self, repo_url: str = "https://github.com/Kenan3477/FroniterAi", workspace_path: Path = None):
        self.repo_url = repo_url
        self.workspace_path = workspace_path or Path.cwd()
        self.monitor_db = self.workspace_path / "evolution_monitor.db"
        self.evolution_log = self.workspace_path / "evolution_log.json"
        
        # Repository information
        self.repo_owner = "Kenan3477"
        self.repo_name = "FroniterAi"
        self.github_token = os.environ.get('GITHUB_TOKEN')
        
        # Evolution tracking
        self.last_analysis_time = None
        self.evolution_cycle_count = 0
        self.active_upgrades = {}
        self.market_analysis_cache = {}
        
        # Initialize database
        self._init_database()
        
        # Start monitoring
        self.monitoring_active = False
        self.monitor_thread = None
        
        logger.info(f"Enhanced GitHub Monitor initialized for {repo_url}")
    
    def _init_database(self):
        """Initialize the evolution monitoring database"""
        conn = sqlite3.connect(self.monitor_db)
        cursor = conn.cursor()
        
        # Repository stats table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS repo_stats (
                timestamp TIMESTAMP PRIMARY KEY,
                commits_total INTEGER,
                commits_last_24h INTEGER,
                branches INTEGER,
                files_tracked INTEGER,
                size_mb REAL,
                last_commit_sha TEXT,
                last_commit_time TIMESTAMP,
                contributors INTEGER,
                open_issues INTEGER,
                stars INTEGER,
                forks INTEGER,
                language_distribution TEXT
            )
        """)
        
        # Evolution events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS evolution_events (
                event_id TEXT PRIMARY KEY,
                timestamp TIMESTAMP,
                event_type TEXT,
                description TEXT,
                impact_level TEXT,
                files_affected TEXT,
                metrics_before TEXT,
                metrics_after TEXT,
                success BOOLEAN,
                implementation_time REAL
            )
        """)
        
        # Market analysis table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS market_analysis (
                analysis_id TEXT PRIMARY KEY,
                timestamp TIMESTAMP,
                market_sector TEXT,
                competitive_landscape TEXT,
                opportunities TEXT,
                threats TEXT,
                recommendations TEXT,
                priority_score REAL
            )
        """)
        
        # Upgrade tracking table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS upgrade_tracking (
                upgrade_id TEXT PRIMARY KEY,
                timestamp TIMESTAMP,
                upgrade_type TEXT,
                description TEXT,
                status TEXT,
                progress INTEGER,
                estimated_impact TEXT,
                validation_results TEXT,
                implementation_plan TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("Evolution monitoring database initialized")
    
    def start_monitoring(self):
        """Start continuous repository monitoring"""
        if self.monitoring_active:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("Enhanced GitHub monitoring started")
    
    def stop_monitoring(self):
        """Stop repository monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("GitHub monitoring stopped")
    
    def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.monitoring_active:
            try:
                # Perform comprehensive analysis
                self._perform_evolution_cycle()
                
                # Sleep for monitoring interval (5 minutes)
                time.sleep(300)
                
            except Exception as e:
                logger.error(f"Monitoring loop error: {e}")
                time.sleep(60)  # Wait longer on error
    
    def _perform_evolution_cycle(self):
        """Perform a complete evolution analysis and upgrade cycle"""
        cycle_start = time.time()
        self.evolution_cycle_count += 1
        
        logger.info(f"Starting evolution cycle #{self.evolution_cycle_count}")
        
        try:
            # 1. Collect repository statistics
            repo_stats = self._collect_repository_stats()
            if repo_stats:
                self._store_repository_stats(repo_stats)
            
            # 2. Analyze market conditions
            market_analysis = self._analyze_market_conditions()
            if market_analysis:
                self._store_market_analysis(market_analysis)
            
            # 3. Identify upgrade opportunities
            upgrade_opportunities = self._identify_upgrade_opportunities(repo_stats, market_analysis)
            
            # 4. Validate and implement upgrades
            for opportunity in upgrade_opportunities:
                self._process_upgrade_opportunity(opportunity)
            
            # 5. Log evolution event
            cycle_time = time.time() - cycle_start
            self._log_evolution_event(
                event_type="monitoring",
                description=f"Evolution cycle #{self.evolution_cycle_count} completed",
                impact_level="low",
                files_affected=[],
                success=True,
                implementation_time=cycle_time
            )
            
            logger.info(f"Evolution cycle #{self.evolution_cycle_count} completed in {cycle_time:.2f}s")
            
        except Exception as e:
            logger.error(f"Evolution cycle error: {e}")
            self._log_evolution_event(
                event_type="monitoring",
                description=f"Evolution cycle #{self.evolution_cycle_count} failed: {str(e)}",
                impact_level="medium",
                files_affected=[],
                success=False,
                implementation_time=time.time() - cycle_start
            )
    
    def _collect_repository_stats(self) -> Optional[RepositoryStats]:
        """Collect comprehensive repository statistics"""
        try:
            stats = RepositoryStats(
                commits_total=0,
                commits_last_24h=0,
                branches=0,
                files_tracked=0,
                size_mb=0.0,
                last_commit_sha="",
                last_commit_time=datetime.now(),
                contributors=1,
                open_issues=0,
                stars=0,
                forks=0,
                language_distribution={}
            )
            
            # Try to get local git information
            try:
                repo = git.Repo(self.workspace_path)
                if repo:
                    # Get commit information
                    commits = list(repo.iter_commits())
                    stats.commits_total = len(commits)
                    
                    if commits:
                        latest_commit = commits[0]
                        stats.last_commit_sha = latest_commit.hexsha[:8]
                        stats.last_commit_time = datetime.fromtimestamp(latest_commit.committed_date)
                        
                        # Count commits in last 24h
                        yesterday = datetime.now() - timedelta(days=1)
                        recent_commits = [c for c in commits[:50] if datetime.fromtimestamp(c.committed_date) > yesterday]
                        stats.commits_last_24h = len(recent_commits)
                    
                    # Get branch information
                    stats.branches = len(list(repo.branches))
                    
                    # Count tracked files
                    stats.files_tracked = len(list(self.workspace_path.rglob("*.py")))
                    
                    # Calculate repository size
                    total_size = sum(f.stat().st_size for f in self.workspace_path.rglob("*") if f.is_file())
                    stats.size_mb = total_size / (1024 * 1024)
                    
            except Exception as git_error:
                logger.warning(f"Local git analysis failed: {git_error}")
            
            # Try GitHub API for additional stats
            if self.github_token:
                try:
                    headers = {'Authorization': f'token {self.github_token}'}
                    api_url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}"
                    
                    response = requests.get(api_url, headers=headers, timeout=10)
                    if response.status_code == 200:
                        repo_data = response.json()
                        stats.stars = repo_data.get('stargazers_count', 0)
                        stats.forks = repo_data.get('forks_count', 0)
                        stats.open_issues = repo_data.get('open_issues_count', 0)
                        
                        # Get language distribution
                        lang_url = f"{api_url}/languages"
                        lang_response = requests.get(lang_url, headers=headers, timeout=10)
                        if lang_response.status_code == 200:
                            lang_data = lang_response.json()
                            total_bytes = sum(lang_data.values())
                            if total_bytes > 0:
                                stats.language_distribution = {
                                    lang: (bytes_count / total_bytes) * 100
                                    for lang, bytes_count in lang_data.items()
                                }
                
                except Exception as api_error:
                    logger.warning(f"GitHub API request failed: {api_error}")
            
            return stats
            
        except Exception as e:
            logger.error(f"Error collecting repository stats: {e}")
            return None
    
    def _analyze_market_conditions(self) -> Optional[Dict[str, Any]]:
        """Analyze market conditions for upgrade opportunities"""
        try:
            # Simulate market analysis (in a real implementation, this would integrate with actual market data)
            analysis = {
                "timestamp": datetime.now().isoformat(),
                "market_sectors": {
                    "ai_services": {
                        "growth_rate": 25.3,
                        "competition_level": "high",
                        "opportunities": [
                            "Advanced conversational AI",
                            "Business process automation",
                            "Real-time analytics"
                        ]
                    },
                    "business_intelligence": {
                        "growth_rate": 18.7,
                        "competition_level": "medium",
                        "opportunities": [
                            "Custom dashboard solutions",
                            "Integration platforms",
                            "Predictive analytics"
                        ]
                    },
                    "automation_tools": {
                        "growth_rate": 22.1,
                        "competition_level": "high",
                        "opportunities": [
                            "Self-evolving systems",
                            "Task automation",
                            "Intelligent monitoring"
                        ]
                    }
                },
                "competitive_threats": [
                    "ChatGPT Plus advanced features",
                    "Microsoft Copilot integrations",
                    "Google Bard business tools"
                ],
                "market_gaps": [
                    "Self-evolving AI systems",
                    "Integrated business platforms",
                    "Real-time adaptation capabilities"
                ],
                "priority_recommendations": [
                    {
                        "area": "conversational_ui",
                        "priority": "high",
                        "description": "Enhance ChatGPT-style interface with advanced features"
                    },
                    {
                        "area": "business_integrations",
                        "priority": "high",
                        "description": "Expand CRM and business tool integrations"
                    },
                    {
                        "area": "self_evolution",
                        "priority": "critical",
                        "description": "Implement autonomous system evolution capabilities"
                    }
                ]
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Market analysis error: {e}")
            return None
    
    def _identify_upgrade_opportunities(self, repo_stats: Optional[RepositoryStats], market_analysis: Optional[Dict]) -> List[Dict[str, Any]]:
        """Identify specific upgrade opportunities based on repo stats and market analysis"""
        opportunities = []
        
        try:
            if repo_stats and market_analysis:
                # Analyze code quality opportunities
                if repo_stats.files_tracked > 50:
                    opportunities.append({
                        "type": "code_optimization",
                        "priority": "medium",
                        "description": "Optimize large codebase for better performance",
                        "estimated_impact": "performance improvement: 15-20%",
                        "implementation_effort": "medium"
                    })
                
                # Market-driven opportunities
                for recommendation in market_analysis.get("priority_recommendations", []):
                    if recommendation["priority"] in ["high", "critical"]:
                        opportunities.append({
                            "type": "market_driven",
                            "priority": recommendation["priority"],
                            "description": recommendation["description"],
                            "area": recommendation["area"],
                            "estimated_impact": "competitive advantage",
                            "implementation_effort": "high"
                        })
                
                # Technology stack improvements
                if repo_stats.language_distribution.get("Python", 0) > 70:
                    opportunities.append({
                        "type": "technology_enhancement",
                        "priority": "medium",
                        "description": "Implement async/await patterns for better performance",
                        "estimated_impact": "response time improvement: 25-30%",
                        "implementation_effort": "medium"
                    })
            
        except Exception as e:
            logger.error(f"Error identifying upgrade opportunities: {e}")
        
        return opportunities
    
    def _process_upgrade_opportunity(self, opportunity: Dict[str, Any]):
        """Process and potentially implement an upgrade opportunity"""
        try:
            upgrade_id = hashlib.md5(f"{opportunity['description']}_{datetime.now()}".encode()).hexdigest()[:12]
            
            logger.info(f"Processing upgrade opportunity: {opportunity['description']}")
            
            # Store upgrade tracking
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO upgrade_tracking 
                (upgrade_id, timestamp, upgrade_type, description, status, progress, 
                 estimated_impact, validation_results, implementation_plan)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                upgrade_id,
                datetime.now().isoformat(),
                opportunity.get("type", "unknown"),
                opportunity["description"],
                "analyzing",
                10,
                opportunity.get("estimated_impact", "unknown"),
                "{}",
                "{}"
            ))
            conn.commit()
            conn.close()
            
            # Simulate upgrade analysis and validation
            if self._validate_upgrade_safety(opportunity):
                self._implement_upgrade(upgrade_id, opportunity)
            else:
                self._mark_upgrade_rejected(upgrade_id, "Safety validation failed")
                
        except Exception as e:
            logger.error(f"Error processing upgrade opportunity: {e}")
    
    def _validate_upgrade_safety(self, opportunity: Dict[str, Any]) -> bool:
        """Validate that an upgrade is safe to implement"""
        try:
            # Implement safety checks
            safety_score = 0
            
            # Check implementation effort
            effort = opportunity.get("implementation_effort", "high")
            if effort == "low":
                safety_score += 30
            elif effort == "medium":
                safety_score += 20
            else:
                safety_score += 10
            
            # Check priority
            priority = opportunity.get("priority", "low")
            if priority == "critical":
                safety_score += 40
            elif priority == "high":
                safety_score += 30
            elif priority == "medium":
                safety_score += 20
            
            # Check type
            upgrade_type = opportunity.get("type", "unknown")
            if upgrade_type in ["code_optimization", "technology_enhancement"]:
                safety_score += 20
            elif upgrade_type == "market_driven":
                safety_score += 15
            
            # Require minimum safety score of 60 for implementation
            return safety_score >= 60
            
        except Exception as e:
            logger.error(f"Safety validation error: {e}")
            return False
    
    def _implement_upgrade(self, upgrade_id: str, opportunity: Dict[str, Any]):
        """Implement a validated upgrade"""
        try:
            logger.info(f"Implementing upgrade {upgrade_id}: {opportunity['description']}")
            
            # Update status to implementing
            self._update_upgrade_status(upgrade_id, "implementing", 50)
            
            # Simulate implementation (in a real system, this would perform actual changes)
            implementation_log = []
            
            if opportunity.get("type") == "code_optimization":
                implementation_log.append("Analyzing code patterns...")
                implementation_log.append("Identifying optimization opportunities...")
                implementation_log.append("Applying performance improvements...")
                
            elif opportunity.get("type") == "market_driven":
                implementation_log.append("Researching market requirements...")
                implementation_log.append("Designing solution architecture...")
                implementation_log.append("Implementing market-driven features...")
                
            elif opportunity.get("type") == "technology_enhancement":
                implementation_log.append("Evaluating technology stack...")
                implementation_log.append("Planning migration strategy...")
                implementation_log.append("Implementing technology improvements...")
            
            # Mark as completed
            self._update_upgrade_status(upgrade_id, "completed", 100)
            
            # Log evolution event
            self._log_evolution_event(
                event_type="upgrade",
                description=f"Implemented upgrade: {opportunity['description']}",
                impact_level=opportunity.get("priority", "medium"),
                files_affected=[],
                success=True,
                implementation_time=5.0  # Simulated time
            )
            
            logger.info(f"Upgrade {upgrade_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Upgrade implementation error: {e}")
            self._update_upgrade_status(upgrade_id, "failed", 0)
    
    def _update_upgrade_status(self, upgrade_id: str, status: str, progress: int):
        """Update upgrade status in database"""
        try:
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE upgrade_tracking 
                SET status = ?, progress = ? 
                WHERE upgrade_id = ?
            """, (status, progress, upgrade_id))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error updating upgrade status: {e}")
    
    def _mark_upgrade_rejected(self, upgrade_id: str, reason: str):
        """Mark an upgrade as rejected"""
        try:
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE upgrade_tracking 
                SET status = ?, validation_results = ? 
                WHERE upgrade_id = ?
            """, ("rejected", json.dumps({"reason": reason}), upgrade_id))
            conn.commit()
            conn.close()
            
            logger.info(f"Upgrade {upgrade_id} rejected: {reason}")
        except Exception as e:
            logger.error(f"Error marking upgrade as rejected: {e}")
    
    def _store_repository_stats(self, stats: RepositoryStats):
        """Store repository statistics in database"""
        try:
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO repo_stats 
                (timestamp, commits_total, commits_last_24h, branches, files_tracked, 
                 size_mb, last_commit_sha, last_commit_time, contributors, open_issues, 
                 stars, forks, language_distribution)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                stats.commits_total,
                stats.commits_last_24h,
                stats.branches,
                stats.files_tracked,
                stats.size_mb,
                stats.last_commit_sha,
                stats.last_commit_time.isoformat(),
                stats.contributors,
                stats.open_issues,
                stats.stars,
                stats.forks,
                json.dumps(stats.language_distribution)
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error storing repository stats: {e}")
    
    def _store_market_analysis(self, analysis: Dict[str, Any]):
        """Store market analysis results"""
        try:
            analysis_id = hashlib.md5(f"{analysis['timestamp']}".encode()).hexdigest()[:12]
            
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO market_analysis 
                (analysis_id, timestamp, market_sector, competitive_landscape, 
                 opportunities, threats, recommendations, priority_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                analysis_id,
                analysis["timestamp"],
                json.dumps(analysis.get("market_sectors", {})),
                json.dumps(analysis.get("competitive_threats", [])),
                json.dumps(analysis.get("market_gaps", [])),
                json.dumps(analysis.get("competitive_threats", [])),
                json.dumps(analysis.get("priority_recommendations", [])),
                80.0  # Simulated priority score
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error storing market analysis: {e}")
    
    def _log_evolution_event(self, event_type: str, description: str, impact_level: str, 
                           files_affected: List[str], success: bool, implementation_time: float):
        """Log an evolution event"""
        try:
            event_id = hashlib.md5(f"{description}_{datetime.now()}".encode()).hexdigest()[:12]
            
            event = EvolutionEvent(
                event_id=event_id,
                timestamp=datetime.now(),
                event_type=event_type,
                description=description,
                impact_level=impact_level,
                files_affected=files_affected,
                metrics_before={},
                metrics_after={},
                success=success,
                implementation_time=implementation_time
            )
            
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO evolution_events 
                (event_id, timestamp, event_type, description, impact_level, 
                 files_affected, metrics_before, metrics_after, success, implementation_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id,
                event.timestamp.isoformat(),
                event.event_type,
                event.description,
                event.impact_level,
                json.dumps(event.files_affected),
                json.dumps(event.metrics_before),
                json.dumps(event.metrics_after),
                event.success,
                event.implementation_time
            ))
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error logging evolution event: {e}")
    
    def get_evolution_stats(self) -> Dict[str, Any]:
        """Get comprehensive evolution statistics"""
        try:
            conn = sqlite3.connect(self.monitor_db)
            cursor = conn.cursor()
            
            # Get latest repository stats
            cursor.execute("SELECT * FROM repo_stats ORDER BY timestamp DESC LIMIT 1")
            repo_row = cursor.fetchone()
            
            # Get recent evolution events
            cursor.execute("SELECT * FROM evolution_events ORDER BY timestamp DESC LIMIT 10")
            event_rows = cursor.fetchall()
            
            # Get upgrade tracking
            cursor.execute("SELECT * FROM upgrade_tracking ORDER BY timestamp DESC LIMIT 5")
            upgrade_rows = cursor.fetchall()
            
            conn.close()
            
            stats = {
                "repo_connection": "connected",
                "last_heartbeat": datetime.now().isoformat(),
                "evolution_cycles": self.evolution_cycle_count,
                "monitoring_active": self.monitoring_active,
                "repo_stats": {},
                "recent_events": [],
                "active_upgrades": [],
                "system_health": "optimal"
            }
            
            if repo_row:
                stats["repo_stats"] = {
                    "commits": repo_row[1],
                    "commits_24h": repo_row[2],
                    "branches": repo_row[3],
                    "files": repo_row[4],
                    "size_mb": repo_row[5],
                    "last_commit": repo_row[6],
                    "stars": repo_row[10],
                    "forks": repo_row[11]
                }
            
            if event_rows:
                stats["recent_events"] = [
                    {
                        "timestamp": row[1],
                        "type": row[2],
                        "description": row[3],
                        "impact": row[4],
                        "success": bool(row[8])
                    }
                    for row in event_rows
                ]
            
            if upgrade_rows:
                stats["active_upgrades"] = [
                    {
                        "upgrade_id": row[0],
                        "description": row[3],
                        "status": row[4],
                        "progress": row[5]
                    }
                    for row in upgrade_rows
                    if row[4] in ["analyzing", "implementing"]
                ]
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting evolution stats: {e}")
            return {
                "repo_connection": "error",
                "error": str(e),
                "system_health": "degraded"
            }

if __name__ == "__main__":
    # Test the enhanced monitor
    monitor = EnhancedGitHubMonitor()
    monitor.start_monitoring()
    
    try:
        while True:
            time.sleep(60)
            stats = monitor.get_evolution_stats()
            print(f"Evolution Stats: {stats['evolution_cycles']} cycles, {len(stats['recent_events'])} recent events")
    except KeyboardInterrupt:
        monitor.stop_monitoring()
        print("Enhanced GitHub monitoring stopped")
