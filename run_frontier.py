"""
Frontier System Launcher

Complete system startup script that initializes and orchestrates all components:
- FastAPI application with business operations
- Integration hub connecting all systems
- Real-time data feeds
- WebSocket server for streaming
- Performance monitoring
- Error handling and recovery
- Comprehensive logging
"""

import asyncio
import logging
import sys
import signal
import uvicorn
from pathlib import Path
from datetime import datetime
import multiprocessing as mp

# Add project path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
    handlers=[
        logging.FileHandler('logs/frontier_system.log'),
        logging.StreamHandler()
    ]
)

# Create logs directory if it doesn't exist
Path('logs').mkdir(exist_ok=True)

logger = logging.getLogger(__name__)


class FrontierSystemLauncher:
    """
    Main system launcher for Frontier Business Solutions
    """
    
    def __init__(self):
        self.processes = []
        self.shutdown_event = asyncio.Event()
        self.api_process = None
        
        # Configuration
        self.api_host = "0.0.0.0"
        self.api_port = 8000
        self.websocket_port = 8765
        self.workers = 1  # Start with 1 worker, can be increased
        
        logger.info("Frontier System Launcher initialized")
    
    async def start_system(self):
        """Start the complete Frontier system"""
        
        logger.info("=" * 80)
        logger.info("🚀 Starting Frontier Business Solutions Platform")
        logger.info("=" * 80)
        
        try:
            # Print system information
            await self._print_system_info()
            
            # Setup signal handlers for graceful shutdown
            self._setup_signal_handlers()
            
            # Pre-flight checks
            await self._pre_flight_checks()
            
            # Start API server
            await self._start_api_server()
            
            logger.info("✅ All systems started successfully!")
            logger.info("🌐 API Server: http://localhost:8000")
            logger.info("📊 API Docs: http://localhost:8000/docs")
            logger.info("🔌 WebSocket: ws://localhost:8765")
            logger.info("📈 Monitoring: http://localhost:8000/integration/status")
            
            # Wait for shutdown signal
            await self.shutdown_event.wait()
            
        except Exception as e:
            logger.error(f"❌ System startup failed: {e}")
            raise
        finally:
            await self._shutdown_system()
    
    async def _print_system_info(self):
        """Print system information"""
        
        logger.info("📋 System Information:")
        logger.info(f"   Python: {sys.version}")
        logger.info(f"   Platform: {sys.platform}")
        logger.info(f"   CPU Cores: {mp.cpu_count()}")
        logger.info(f"   Working Directory: {Path.cwd()}")
        logger.info(f"   Startup Time: {datetime.now()}")
        logger.info("")
    
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        
        def signal_handler(signum, frame):
            logger.info(f"📢 Received signal {signum}, initiating graceful shutdown...")
            asyncio.create_task(self._trigger_shutdown())
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        logger.info("🛡️  Signal handlers configured")
    
    async def _trigger_shutdown(self):
        """Trigger graceful shutdown"""
        self.shutdown_event.set()
    
    async def _pre_flight_checks(self):
        """Perform pre-flight system checks"""
        
        logger.info("🔍 Performing pre-flight checks...")
        
        # Check required directories
        required_dirs = ['logs', 'data', 'temp']
        for dir_name in required_dirs:
            dir_path = Path(dir_name)
            if not dir_path.exists():
                dir_path.mkdir(exist_ok=True)
                logger.info(f"   Created directory: {dir_name}")
        
        # Check Python version
        if sys.version_info < (3, 8):
            raise RuntimeError("Python 3.8 or higher is required")
        
        # Import key modules to check dependencies
        try:
            import fastapi
            import uvicorn
            import redis
            import aiohttp
            import websockets
            import pandas
            import numpy
            
            logger.info("   ✅ Core dependencies verified")
            
        except ImportError as e:
            logger.error(f"   ❌ Missing dependency: {e}")
            raise
        
        # Check configuration
        from api.config import settings
        
        required_settings = [
            'SECRET_KEY',
            'REDIS_HOST',
            'REDIS_PORT'
        ]
        
        for setting in required_settings:
            if not hasattr(settings, setting):
                logger.warning(f"   ⚠️  Missing configuration: {setting}")
        
        logger.info("   ✅ Pre-flight checks completed")
    
    async def _start_api_server(self):
        """Start the FastAPI server"""
        
        logger.info("🌐 Starting FastAPI server...")
        
        try:
            # Import the FastAPI app
            from api.main import app
            
            # Configure uvicorn
            config = uvicorn.Config(
                app=app,
                host=self.api_host,
                port=self.api_port,
                workers=self.workers,
                log_level="info",
                access_log=True,
                reload=False,  # Disable reload in production
                loop="asyncio"
            )
            
            # Create and start server
            server = uvicorn.Server(config)
            
            # Start server in background task
            server_task = asyncio.create_task(server.serve())
            
            # Wait a moment for server to start
            await asyncio.sleep(2)
            
            if not server_task.done():
                logger.info(f"   ✅ FastAPI server started on {self.api_host}:{self.api_port}")
            else:
                raise Exception("FastAPI server failed to start")
            
            # Store server task for shutdown
            self.api_server_task = server_task
            self.api_server = server
            
        except Exception as e:
            logger.error(f"   ❌ Failed to start FastAPI server: {e}")
            raise
    
    async def _shutdown_system(self):
        """Graceful system shutdown"""
        
        logger.info("🛑 Initiating graceful system shutdown...")
        
        try:
            # Shutdown API server
            if hasattr(self, 'api_server'):
                logger.info("   🌐 Shutting down FastAPI server...")
                self.api_server.should_exit = True
                if hasattr(self, 'api_server_task'):
                    await asyncio.sleep(1)  # Give server time to cleanup
                    if not self.api_server_task.done():
                        self.api_server_task.cancel()
                logger.info("   ✅ FastAPI server shutdown complete")
            
            # Note: Integration components are shutdown via FastAPI lifespan manager
            
        except Exception as e:
            logger.error(f"   ❌ Error during shutdown: {e}")
        
        logger.info("✅ System shutdown complete")
        logger.info("=" * 80)


async def main():
    """Main entry point"""
    
    try:
        launcher = FrontierSystemLauncher()
        await launcher.start_system()
        
    except KeyboardInterrupt:
        logger.info("👋 Shutdown requested by user")
    except Exception as e:
        logger.error(f"💥 System error: {e}")
        sys.exit(1)


def run_system():
    """Run the system (sync wrapper for async main)"""
    
    try:
        # Set event loop policy for Windows
        if sys.platform == "win32":
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
        # Run the main async function
        asyncio.run(main())
        
    except Exception as e:
        logger.error(f"💥 Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Development server launcher
    print("🚀 Frontier Business Solutions - Development Server")
    print("=" * 60)
    
    # Create logs directory
    Path('logs').mkdir(exist_ok=True)
    
    # Check if this is a direct run
    if len(sys.argv) > 1 and sys.argv[1] == "--dev":
        # Development mode with hot reload
        logger.info("🔧 Starting in development mode with hot reload")
        
        uvicorn.run(
            "api.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            access_log=True
        )
    else:
        # Production mode with full integration
        logger.info("🏭 Starting in production mode with full integration")
        run_system()
