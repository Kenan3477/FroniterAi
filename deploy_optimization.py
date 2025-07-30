"""
Production Optimization Deployment Script

Automated deployment and configuration script for production optimization
features including system checks, optimization setup, and monitoring.
"""

import asyncio
import argparse
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import subprocess
import platform

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from optimization.config import (
    ProductionOptimizationConfig, 
    Environment,
    DEVELOPMENT_CONFIG,
    STAGING_CONFIG,
    PRODUCTION_CONFIG
)


class OptimizationDeployer:
    """Deploy and configure production optimization"""
    
    def __init__(self, environment: Environment = Environment.PRODUCTION):
        self.environment = environment
        self.config = self._get_config_for_environment()
        self.deployment_log: List[str] = []
        
    def _get_config_for_environment(self) -> ProductionOptimizationConfig:
        """Get configuration for deployment environment"""
        if self.environment == Environment.DEVELOPMENT:
            return DEVELOPMENT_CONFIG
        elif self.environment == Environment.STAGING:
            return STAGING_CONFIG
        else:
            return PRODUCTION_CONFIG
    
    def log(self, message: str, level: str = "INFO"):
        """Log deployment message"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_entry = f"[{timestamp}] [{level}] {message}"
        print(log_entry)
        self.deployment_log.append(log_entry)
    
    async def deploy(self) -> bool:
        """Execute full optimization deployment"""
        self.log("Starting production optimization deployment...")
        
        try:
            # Step 1: System requirements check
            if not await self._check_system_requirements():
                self.log("System requirements check failed", "ERROR")
                return False
            
            # Step 2: Validate configuration
            if not self._validate_configuration():
                self.log("Configuration validation failed", "ERROR")
                return False
            
            # Step 3: Setup infrastructure dependencies
            if not await self._setup_infrastructure():
                self.log("Infrastructure setup failed", "ERROR")
                return False
            
            # Step 4: Deploy optimization components
            if not await self._deploy_optimization_components():
                self.log("Component deployment failed", "ERROR")
                return False
            
            # Step 5: Initialize monitoring
            if not await self._setup_monitoring():
                self.log("Monitoring setup failed", "ERROR")
                return False
            
            # Step 6: Run deployment verification
            if not await self._verify_deployment():
                self.log("Deployment verification failed", "ERROR")
                return False
            
            # Step 7: Generate deployment report
            await self._generate_deployment_report()
            
            self.log("Production optimization deployment completed successfully!")
            return True
            
        except Exception as e:
            self.log(f"Deployment failed with error: {e}", "ERROR")
            return False
    
    async def _check_system_requirements(self) -> bool:
        """Check system requirements for optimization"""
        self.log("Checking system requirements...")
        
        requirements = {
            "python_version": (3, 8),
            "memory_gb": 4,
            "disk_space_gb": 20,
            "cpu_cores": 2
        }
        
        # Check Python version
        python_version = sys.version_info
        if python_version < requirements["python_version"]:
            self.log(f"Python {requirements['python_version']} or higher required", "ERROR")
            return False
        
        # Check system resources
        try:
            import psutil
            
            # Memory check
            memory_gb = psutil.virtual_memory().total / (1024**3)
            if memory_gb < requirements["memory_gb"]:
                self.log(f"Insufficient memory: {memory_gb:.1f}GB available, {requirements['memory_gb']}GB required", "ERROR")
                return False
            
            # Disk space check
            disk_usage = psutil.disk_usage('/')
            disk_space_gb = disk_usage.free / (1024**3)
            if disk_space_gb < requirements["disk_space_gb"]:
                self.log(f"Insufficient disk space: {disk_space_gb:.1f}GB available, {requirements['disk_space_gb']}GB required", "ERROR")
                return False
            
            # CPU cores check
            cpu_cores = psutil.cpu_count()
            if cpu_cores < requirements["cpu_cores"]:
                self.log(f"Insufficient CPU cores: {cpu_cores} available, {requirements['cpu_cores']} required", "ERROR")
                return False
            
            self.log(f"System requirements satisfied: {memory_gb:.1f}GB RAM, {disk_space_gb:.1f}GB disk, {cpu_cores} CPUs")
            return True
            
        except ImportError:
            self.log("psutil not available for system checks", "WARNING")
            return True  # Continue without system checks
    
    def _validate_configuration(self) -> bool:
        """Validate optimization configuration"""
        self.log("Validating optimization configuration...")
        
        errors = self.config.validate()
        if errors:
            for error in errors:
                self.log(f"Configuration error: {error}", "ERROR")
            return False
        
        self.log("Configuration validation passed")
        return True
    
    async def _setup_infrastructure(self) -> bool:
        """Setup required infrastructure"""
        self.log("Setting up infrastructure dependencies...")
        
        # Setup Redis for caching
        if self.config.cache.enabled:
            if not await self._setup_redis():
                return False
        
        # Setup CDN
        if self.config.cdn.enabled:
            if not await self._setup_cdn():
                return False
        
        # Setup database optimizations
        if self.config.database.enabled:
            if not await self._setup_database():
                return False
        
        self.log("Infrastructure setup completed")
        return True
    
    async def _setup_redis(self) -> bool:
        """Setup Redis for caching"""
        self.log("Setting up Redis for caching...")
        
        try:
            # Check if Redis is available
            import redis.asyncio as redis
            
            client = redis.Redis(
                host=self.config.cache.redis_host,
                port=self.config.cache.redis_port,
                db=self.config.cache.redis_db,
                password=self.config.cache.redis_password
            )
            
            await client.ping()
            await client.close()
            
            self.log("Redis connection verified")
            return True
            
        except Exception as e:
            self.log(f"Redis setup failed: {e}", "ERROR")
            self.log("Consider installing Redis or updating connection settings", "INFO")
            return False
    
    async def _setup_cdn(self) -> bool:
        """Setup CDN configuration"""
        self.log("Setting up CDN configuration...")
        
        if not self.config.cdn.domain:
            self.log("CDN domain not configured, skipping CDN setup", "WARNING")
            return True
        
        # In production, this would configure actual CDN settings
        self.log(f"CDN configured for domain: {self.config.cdn.domain}")
        return True
    
    async def _setup_database(self) -> bool:
        """Setup database optimizations"""
        self.log("Setting up database optimizations...")
        
        # Create necessary database tables/indexes
        # In production, this would run actual database migrations
        
        self.log("Database optimization setup completed")
        return True
    
    async def _deploy_optimization_components(self) -> bool:
        """Deploy optimization components"""
        self.log("Deploying optimization components...")
        
        try:
            # Initialize optimization components
            from optimization.production_optimizer import production_optimizer
            
            await production_optimizer.initialize()
            self.log("Production optimizer initialized")
            
            # Start optimization services
            await production_optimizer.start()
            self.log("Optimization services started")
            
            return True
            
        except Exception as e:
            self.log(f"Component deployment failed: {e}", "ERROR")
            return False
    
    async def _setup_monitoring(self) -> bool:
        """Setup monitoring and alerting"""
        self.log("Setting up monitoring and alerting...")
        
        if not self.config.monitoring.enabled:
            self.log("Monitoring disabled in configuration", "INFO")
            return True
        
        try:
            from optimization.performance_monitor import performance_manager
            
            await performance_manager.start()
            self.log("Performance monitoring started")
            
            # Setup alerting
            if self.config.monitoring.enable_alerting:
                self.log("Alerting enabled")
                if self.config.monitoring.alert_email:
                    self.log(f"Alert email configured: {self.config.monitoring.alert_email}")
            
            return True
            
        except Exception as e:
            self.log(f"Monitoring setup failed: {e}", "ERROR")
            return False
    
    async def _verify_deployment(self) -> bool:
        """Verify deployment success"""
        self.log("Verifying deployment...")
        
        try:
            # Run optimization status check
            from optimization.production_optimizer import production_optimizer
            
            status = await production_optimizer.get_optimization_status()
            
            if status.get("running", False):
                self.log("✓ Production optimizer running")
            else:
                self.log("✗ Production optimizer not running", "ERROR")
                return False
            
            # Check component status
            components = status.get("components", {})
            
            if self.config.cache.enabled:
                if "cache" in components:
                    self.log("✓ Cache system operational")
                else:
                    self.log("✗ Cache system not operational", "ERROR")
                    return False
            
            if self.config.database.enabled:
                if "database" in components:
                    self.log("✓ Database optimization operational")
                else:
                    self.log("✗ Database optimization not operational", "ERROR")
                    return False
            
            if self.config.ai_batching.enabled:
                if "ai_batching" in components:
                    self.log("✓ AI batching operational")
                else:
                    self.log("✗ AI batching not operational", "ERROR")
                    return False
            
            if self.config.scaling.enabled:
                if "scaling" in components:
                    self.log("✓ Auto-scaling operational")
                else:
                    self.log("✗ Auto-scaling not operational", "ERROR")
                    return False
            
            self.log("Deployment verification passed")
            return True
            
        except Exception as e:
            self.log(f"Deployment verification failed: {e}", "ERROR")
            return False
    
    async def _generate_deployment_report(self):
        """Generate deployment report"""
        self.log("Generating deployment report...")
        
        report = {
            "deployment_timestamp": datetime.now().isoformat(),
            "environment": self.environment.value,
            "configuration": self.config.to_dict(),
            "deployment_log": self.deployment_log
        }
        
        # Save report to file
        report_file = f"deployment_report_{self.environment.value}_{int(time.time())}.json"
        report_path = project_root / "reports" / report_file
        
        # Create reports directory if it doesn't exist
        report_path.parent.mkdir(exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        self.log(f"Deployment report saved to: {report_path}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check of optimization system"""
        self.log("Performing health check...")
        
        health_status = {
            "timestamp": datetime.now().isoformat(),
            "environment": self.environment.value,
            "overall_health": "healthy",
            "components": {}
        }
        
        try:
            from optimization.production_optimizer import production_optimizer
            
            if production_optimizer.running:
                status = await production_optimizer.get_optimization_status()
                health_status["components"] = status.get("components", {})
                
                # Check for any unhealthy components
                for component, component_status in health_status["components"].items():
                    if isinstance(component_status, dict) and component_status.get("error"):
                        health_status["overall_health"] = "degraded"
            else:
                health_status["overall_health"] = "unhealthy"
                health_status["error"] = "Production optimizer not running"
        
        except Exception as e:
            health_status["overall_health"] = "unhealthy"
            health_status["error"] = str(e)
        
        self.log(f"Health check completed: {health_status['overall_health']}")
        return health_status
    
    async def rollback(self) -> bool:
        """Rollback optimization deployment"""
        self.log("Rolling back optimization deployment...")
        
        try:
            from optimization.production_optimizer import production_optimizer
            
            # Stop optimization services
            await production_optimizer.stop()
            self.log("Production optimizer stopped")
            
            # Clear caches
            from optimization.cache_manager import cache_manager
            await cache_manager.clear_all()
            self.log("Caches cleared")
            
            self.log("Rollback completed successfully")
            return True
            
        except Exception as e:
            self.log(f"Rollback failed: {e}", "ERROR")
            return False


async def main():
    """Main deployment script"""
    parser = argparse.ArgumentParser(description="Deploy production optimization")
    parser.add_argument(
        "--environment", 
        choices=["development", "staging", "production"],
        default="production",
        help="Deployment environment"
    )
    parser.add_argument(
        "--action",
        choices=["deploy", "health-check", "rollback"],
        default="deploy",
        help="Action to perform"
    )
    parser.add_argument(
        "--config-file",
        help="Path to custom configuration file"
    )
    
    args = parser.parse_args()
    
    environment = Environment(args.environment)
    deployer = OptimizationDeployer(environment)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                FRONTIER OPTIMIZATION DEPLOYMENT               ║
║                                                              ║
║  Environment: {environment.value.upper():<47} ║
║  Action: {args.action.upper():<52} ║
╚══════════════════════════════════════════════════════════════╝
""")
    
    if args.action == "deploy":
        success = await deployer.deploy()
        if success:
            print("\n🎉 Deployment completed successfully!")
            print("\nOptimization features enabled:")
            print(f"  • Response Caching: {'✓' if deployer.config.cache.enabled else '✗'}")
            print(f"  • CDN Integration: {'✓' if deployer.config.cdn.enabled else '✗'}")
            print(f"  • Database Optimization: {'✓' if deployer.config.database.enabled else '✗'}")
            print(f"  • AI Request Batching: {'✓' if deployer.config.ai_batching.enabled else '✗'}")
            print(f"  • Auto-scaling: {'✓' if deployer.config.scaling.enabled else '✗'}")
            print(f"  • Performance Monitoring: {'✓' if deployer.config.monitoring.enabled else '✗'}")
            
            print(f"\n📊 System is optimized for production loads with:")
            print(f"  • Up to {deployer.config.scaling.max_instances} auto-scaled instances")
            print(f"  • {deployer.config.cache.memory_cache_size:,} cache entries")
            print(f"  • {deployer.config.database.max_connections} database connections")
            print(f"  • {deployer.config.ai_batching.default_batch_size} AI request batching")
            
            print(f"\n🔗 Access points:")
            print(f"  • API Documentation: http://localhost:8000/docs")
            print(f"  • Optimization Status: http://localhost:8000/optimization/status")
            print(f"  • Performance Dashboard: http://localhost:8000/optimization/performance/dashboard")
            
            sys.exit(0)
        else:
            print("\n❌ Deployment failed!")
            sys.exit(1)
    
    elif args.action == "health-check":
        health = await deployer.health_check()
        print(f"\nHealth Status: {health['overall_health'].upper()}")
        
        if health["overall_health"] == "healthy":
            print("✅ All optimization components are running normally")
            sys.exit(0)
        else:
            print("⚠️  Some optimization components need attention")
            if "error" in health:
                print(f"Error: {health['error']}")
            sys.exit(1)
    
    elif args.action == "rollback":
        success = await deployer.rollback()
        if success:
            print("\n↩️  Rollback completed successfully!")
            sys.exit(0)
        else:
            print("\n❌ Rollback failed!")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
