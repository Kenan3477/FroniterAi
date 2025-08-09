"""
FrontierAI: Real Autonomous Evolution System
Main integration module that orchestrates all components for genuine GitHub repository evolution
"""

import os
import sys
import logging
import signal
import threading
import time
from typing import Dict, List, Optional
from datetime import datetime

# Add src directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.core.app_factory import create_app
from src.database.manager import DatabaseManager
from src.evolution.autonomous_engine import AutonomousEvolutionEngine
from src.analysis.github_analyzer import GitHubAnalyzer
from src.monitoring.system_monitor import SystemMonitor, HealthChecker
from src.utils.helpers import setup_logging, ConfigManager, FileManager

class FrontierAI:
    """
    Main FrontierAI system orchestrator
    Coordinates all subsystems for autonomous repository evolution
    """
    
    def __init__(self, config_path: str = "config/config.json"):
        """
        Initialize FrontierAI system
        
        Args:
            config_path: Path to configuration file
        """
        self.config_path = config_path
        self.config_manager = None
        self.logger = None
        self.db_manager = None
        self.app = None
        self.evolution_engine = None
        self.github_analyzer = None
        self.system_monitor = None
        self.running = False
        self.shutdown_event = threading.Event()
        
        # Initialize system
        self._initialize_system()
    
    def _initialize_system(self):
        """Initialize all system components"""
        try:
            # Load configuration
            self.config_manager = ConfigManager(self.config_path)
            
            # Setup logging
            log_level = self.config_manager.get('frontier_ai.log_level', 'INFO')
            log_file = 'logs/frontier_ai.log'
            self.logger = setup_logging(log_level, log_file)
            self.logger.info("FrontierAI system initializing...")
            
            # Initialize database
            db_path = self.config_manager.get('frontier_ai.database.path', 'autonomous_evolution.db')
            self.db_manager = DatabaseManager(db_path)
            self.logger.info("Database manager initialized")
            
            # Initialize Flask app
            self.app = create_app(self.db_manager, self.config_manager)
            self.logger.info("Flask application created")
            
            # Initialize evolution engine
            self.evolution_engine = AutonomousEvolutionEngine(
                db_manager=self.db_manager,
                config_manager=self.config_manager
            )
            self.logger.info("Autonomous evolution engine initialized")
            
            # Initialize GitHub analyzer
            self.github_analyzer = GitHubAnalyzer(self.db_manager)
            self.logger.info("GitHub analyzer initialized")
            
            # Initialize system monitor
            self.system_monitor = SystemMonitor(self.db_manager)
            self.logger.info("System monitor initialized")
            
            # Setup signal handlers
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            self.logger.info("FrontierAI system initialization complete")
            
        except Exception as e:
            if self.logger:
                self.logger.critical(f"System initialization failed: {e}")
            else:
                print(f"CRITICAL: System initialization failed: {e}")
            raise
    
    def start(self):
        """Start the FrontierAI system"""
        try:
            self.logger.info("Starting FrontierAI system...")
            self.running = True
            
            # Perform system health check
            health_status = self._perform_health_check()
            if not health_status['healthy']:
                self.logger.error("System health check failed")
                for issue in health_status.get('issues', []):
                    self.logger.error(f"Health issue: {issue}")
                return False
            
            self.logger.info("System health check passed")
            
            # Start monitoring
            if self.config_manager.get('frontier_ai.monitoring.enabled', True):
                monitoring_interval = self.config_manager.get('frontier_ai.monitoring.interval_seconds', 60)
                self.system_monitor.start_monitoring(monitoring_interval)
                self.logger.info("System monitoring started")
            
            # Start autonomous evolution
            if self.config_manager.get('frontier_ai.evolution.enabled', True):
                self.evolution_engine.start()
                self.logger.info("Autonomous evolution engine started")
            
            # Log system startup
            self.db_manager.log_system_event("system_started", {
                "timestamp": datetime.now().isoformat(),
                "version": self.config_manager.get('frontier_ai.version', '1.0.0'),
                "components": ["database", "evolution", "analyzer", "monitor", "api"]
            })
            
            # Start Flask app in a separate thread for API access
            api_thread = threading.Thread(
                target=self._run_api_server,
                daemon=True
            )
            api_thread.start()
            
            self.logger.info("FrontierAI system started successfully!")
            self.logger.info("System is now autonomous and will evolve repositories automatically")
            
            # Main system loop
            self._main_loop()
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to start FrontierAI system: {e}")
            return False
    
    def stop(self):
        """Stop the FrontierAI system"""
        try:
            self.logger.info("Stopping FrontierAI system...")
            self.running = False
            self.shutdown_event.set()
            
            # Stop evolution engine
            if self.evolution_engine:
                self.evolution_engine.stop()
                self.logger.info("Evolution engine stopped")
            
            # Stop monitoring
            if self.system_monitor:
                self.system_monitor.stop_monitoring()
                self.logger.info("System monitoring stopped")
            
            # Log system shutdown
            if self.db_manager:
                self.db_manager.log_system_event("system_stopped", {
                    "timestamp": datetime.now().isoformat(),
                    "reason": "manual_shutdown"
                })
            
            self.logger.info("FrontierAI system stopped")
            
        except Exception as e:
            self.logger.error(f"Error during system shutdown: {e}")
    
    def _signal_handler(self, signum, frame):
        """Handle system signals for graceful shutdown"""
        self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.stop()
        sys.exit(0)
    
    def _perform_health_check(self) -> Dict:
        """Perform comprehensive system health check"""
        health_status = {
            "healthy": True,
            "issues": [],
            "checks": {}
        }
        
        try:
            # Database health check
            db_health = HealthChecker.check_database_health(self.db_manager)
            health_status["checks"]["database"] = db_health
            if db_health["status"] != "healthy":
                health_status["healthy"] = False
                health_status["issues"].append(f"Database: {db_health.get('message', 'Unknown issue')}")
            
            # System resources check
            resource_health = HealthChecker.check_system_resources()
            health_status["checks"]["resources"] = resource_health
            if resource_health["status"] not in ["healthy", "warning"]:
                health_status["healthy"] = False
                health_status["issues"].extend(resource_health.get("issues", []))
            
            # Evolution system check
            evolution_health = HealthChecker.check_evolution_system(self.db_manager)
            health_status["checks"]["evolution"] = evolution_health
            if evolution_health["status"] == "error":
                health_status["issues"].append(f"Evolution: {evolution_health.get('message', 'Unknown issue')}")
            
            # Configuration check
            config_health = self._check_configuration_health()
            health_status["checks"]["configuration"] = config_health
            if not config_health["valid"]:
                health_status["healthy"] = False
                health_status["issues"].extend(config_health.get("issues", []))
            
        except Exception as e:
            health_status["healthy"] = False
            health_status["issues"].append(f"Health check error: {e}")
        
        return health_status
    
    def _check_configuration_health(self) -> Dict:
        """Check configuration validity"""
        issues = []
        
        # Check required configuration sections
        required_sections = [
            'frontier_ai.database',
            'frontier_ai.evolution',
            'frontier_ai.monitoring'
        ]
        
        for section in required_sections:
            if not self.config_manager.get(section):
                issues.append(f"Missing configuration section: {section}")
        
        # Check file permissions
        db_path = self.config_manager.get('frontier_ai.database.path')
        if db_path:
            db_dir = os.path.dirname(db_path)
            if not os.access(db_dir, os.W_OK):
                issues.append(f"No write permission for database directory: {db_dir}")
        
        return {
            "valid": len(issues) == 0,
            "issues": issues
        }
    
    def _run_api_server(self):
        """Run Flask API server"""
        try:
            host = self.config_manager.get('frontier_ai.api.host', '0.0.0.0')
            port = self.config_manager.get('frontier_ai.api.port', 5000)
            debug = self.config_manager.get('frontier_ai.api.debug', False)
            
            self.logger.info(f"Starting API server on {host}:{port}")
            self.app.run(host=host, port=port, debug=debug, use_reloader=False)
            
        except Exception as e:
            self.logger.error(f"API server error: {e}")
    
    def _main_loop(self):
        """Main system loop - keeps system running and monitors status"""
        self.logger.info("Entering main system loop...")
        
        last_status_log = time.time()
        status_interval = 300  # Log status every 5 minutes
        
        while self.running and not self.shutdown_event.is_set():
            try:
                # Wait for shutdown signal or timeout
                if self.shutdown_event.wait(timeout=10):
                    break
                
                # Periodic status logging
                current_time = time.time()
                if current_time - last_status_log >= status_interval:
                    self._log_system_status()
                    last_status_log = current_time
                
                # Check for critical issues
                self._check_critical_issues()
                
            except Exception as e:
                self.logger.error(f"Main loop error: {e}")
                time.sleep(5)
        
        self.logger.info("Exiting main system loop")
    
    def _log_system_status(self):
        """Log current system status"""
        try:
            status = self.get_system_status()
            
            # Log key metrics
            health_score = status.get('health_score', 0)
            evolution_count = status.get('evolution_statistics', {}).get('total_evolutions', 0)
            last_evolution = status.get('evolution_statistics', {}).get('last_evolution_time', 'Never')
            
            self.logger.info(f"System Status - Health: {health_score:.1f}/100, "
                           f"Evolutions: {evolution_count}, Last: {last_evolution}")
            
            # Log any warnings
            if health_score < 70:
                self.logger.warning(f"System health below optimal: {health_score:.1f}/100")
            
        except Exception as e:
            self.logger.error(f"Failed to log system status: {e}")
    
    def _check_critical_issues(self):
        """Check for critical system issues"""
        try:
            # Check disk space
            import psutil
            disk_usage = psutil.disk_usage('/').percent
            if disk_usage > 95:
                self.logger.critical(f"Critical disk space: {disk_usage:.1f}% used")
            
            # Check memory usage
            memory_usage = psutil.virtual_memory().percent
            if memory_usage > 95:
                self.logger.critical(f"Critical memory usage: {memory_usage:.1f}% used")
            
            # Check evolution engine health
            if self.evolution_engine and not self.evolution_engine.is_running():
                self.logger.warning("Evolution engine is not running")
            
        except Exception as e:
            self.logger.error(f"Critical issue check failed: {e}")
    
    def get_system_status(self) -> Dict:
        """Get comprehensive system status"""
        try:
            # Collect status from all components
            status = {
                "timestamp": datetime.now().isoformat(),
                "running": self.running,
                "version": self.config_manager.get('frontier_ai.version', '1.0.0'),
                "uptime": self._calculate_uptime(),
                "components": {}
            }
            
            # Database status
            if self.db_manager:
                status["components"]["database"] = {
                    "connected": True,
                    "health": HealthChecker.check_database_health(self.db_manager)
                }
            
            # Evolution engine status
            if self.evolution_engine:
                status["components"]["evolution"] = {
                    "running": self.evolution_engine.is_running(),
                    "statistics": self.db_manager.get_evolution_statistics()
                }
            
            # System monitor status
            if self.system_monitor:
                status["components"]["monitor"] = {
                    "active": self.system_monitor.monitoring_active,
                    "system_status": self.system_monitor.get_system_status()
                }
            
            # Calculate overall health score
            status["health_score"] = self._calculate_overall_health()
            
            return status
            
        except Exception as e:
            self.logger.error(f"Failed to get system status: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "running": self.running
            }
    
    def _calculate_uptime(self) -> str:
        """Calculate system uptime"""
        # This would track actual start time in a real implementation
        return "System uptime tracking not implemented"
    
    def _calculate_overall_health(self) -> float:
        """Calculate overall system health score"""
        try:
            scores = []
            
            # Database health (25%)
            db_health = HealthChecker.check_database_health(self.db_manager)
            db_score = 100 if db_health["status"] == "healthy" else 50 if db_health["status"] == "warning" else 0
            scores.append(db_score * 0.25)
            
            # System resources health (25%)
            resource_health = HealthChecker.check_system_resources()
            resource_score = 100 if resource_health["status"] == "healthy" else 70 if resource_health["status"] == "warning" else 30
            scores.append(resource_score * 0.25)
            
            # Evolution system health (25%)
            evolution_health = HealthChecker.check_evolution_system(self.db_manager)
            evolution_score = 100 if evolution_health["status"] == "healthy" else 80 if evolution_health["status"] == "idle" else 40
            scores.append(evolution_score * 0.25)
            
            # Overall system running (25%)
            system_score = 100 if self.running else 0
            scores.append(system_score * 0.25)
            
            return sum(scores)
            
        except Exception as e:
            self.logger.error(f"Health calculation failed: {e}")
            return 50.0  # Default middle score
    
    def analyze_repository(self, repo_url: str) -> Dict:
        """Analyze a GitHub repository"""
        try:
            self.logger.info(f"Analyzing repository: {repo_url}")
            return self.github_analyzer.analyze_repository(repo_url)
        except Exception as e:
            self.logger.error(f"Repository analysis failed: {e}")
            return {"error": str(e)}
    
    def trigger_evolution(self, repo_url: str, target_improvements: Optional[List[str]] = None) -> Dict:
        """Manually trigger repository evolution"""
        try:
            self.logger.info(f"Triggering evolution for repository: {repo_url}")
            
            # First analyze the repository
            analysis = self.analyze_repository(repo_url)
            if "error" in analysis:
                return analysis
            
            # Trigger evolution
            return self.evolution_engine.evolve_repository(repo_url, analysis, target_improvements)
            
        except Exception as e:
            self.logger.error(f"Manual evolution trigger failed: {e}")
            return {"error": str(e)}

def main():
    """Main entry point for FrontierAI system"""
    print("FrontierAI: Real Autonomous Evolution System")
    print("=" * 50)
    
    try:
        # Initialize FrontierAI system
        system = FrontierAI()
        
        # Start the system
        if system.start():
            print("FrontierAI system is now running autonomously!")
            print("API available at: http://localhost:5000")
            print("Press Ctrl+C to stop the system")
            
            # Keep main thread alive
            try:
                while system.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                print("\nShutdown signal received...")
        else:
            print("Failed to start FrontierAI system")
            return 1
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
