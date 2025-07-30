"""
Production startup script for optimized Frontier system
"""

import asyncio
import uvicorn
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from optimization.production_optimizer import production_optimizer
from optimization.config import PRODUCTION_CONFIG


async def startup():
    """Initialize optimization before starting the server"""
    print("🚀 Starting Frontier with production optimizations...")
    
    # Initialize production optimizer
    await production_optimizer.initialize()
    
    # Start optimization services
    await production_optimizer.start()
    
    print("✅ Production optimizations active!")
    print(f"   • Multi-layer caching: {PRODUCTION_CONFIG.cache.enabled}")
    print(f"   • CDN integration: {PRODUCTION_CONFIG.cdn.enabled}")
    print(f"   • Database optimization: {PRODUCTION_CONFIG.database.enabled}")
    print(f"   • AI request batching: {PRODUCTION_CONFIG.ai_batching.enabled}")
    print(f"   • Auto-scaling: {PRODUCTION_CONFIG.scaling.enabled}")
    print(f"   • Performance monitoring: {PRODUCTION_CONFIG.monitoring.enabled}")


if __name__ == "__main__":
    # Run startup tasks
    asyncio.run(startup())
    
    # Start the production server
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        workers=4,
        loop="asyncio",
        access_log=True,
        reload=False
    )
