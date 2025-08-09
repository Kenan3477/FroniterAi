#!/usr/bin/env python3
"""
Railway Deployment Debug Script
Helps debug Railway deployment issues with main.py
"""

import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def debug_railway_deployment():
    """Debug Railway deployment configuration"""
    logger.info("🔍 RAILWAY DEPLOYMENT DEBUG")
    logger.info("=" * 50)
    
    # Check current working directory
    logger.info(f"📁 Current working directory: {os.getcwd()}")
    
    # List files in current directory
    logger.info("📋 Files in current directory:")
    try:
        files = os.listdir('.')
        for file in sorted(files):
            if os.path.isfile(file):
                logger.info(f"   📄 {file}")
            else:
                logger.info(f"   📁 {file}/")
    except Exception as e:
        logger.error(f"❌ Error listing files: {str(e)}")
    
    # Check for main.py specifically
    main_py_exists = os.path.exists('main.py')
    logger.info(f"🐍 main.py exists: {main_py_exists}")
    
    if main_py_exists:
        try:
            stat = os.stat('main.py')
            logger.info(f"📊 main.py size: {stat.st_size} bytes")
            logger.info(f"📅 main.py modified: {stat.st_mtime}")
        except Exception as e:
            logger.error(f"❌ Error getting main.py stats: {str(e)}")
    
    # Check environment variables
    logger.info("🌐 Environment variables:")
    env_vars = ['PORT', 'RAILWAY_ENVIRONMENT', 'PYTHONUNBUFFERED', 'PWD']
    for var in env_vars:
        value = os.environ.get(var, 'NOT SET')
        logger.info(f"   {var}: {value}")
    
    # Check if we're in Railway environment
    is_railway = os.environ.get('RAILWAY_ENVIRONMENT') is not None
    logger.info(f"🚂 Running on Railway: {is_railway}")
    
    # Check Python version
    logger.info(f"🐍 Python version: {sys.version}")
    
    # Try to import app
    logger.info("📦 Testing app import...")
    try:
        from app import app
        logger.info("✅ App import successful")
        
        # Check if app has required attributes
        logger.info(f"🔧 App debug mode: {app.debug}")
        logger.info(f"🌐 App host: {getattr(app, 'host', 'Not set')}")
        
    except Exception as e:
        logger.error(f"❌ App import failed: {str(e)}")
    
    logger.info("=" * 50)
    logger.info("🏁 Debug complete")

if __name__ == "__main__":
    debug_railway_deployment()
