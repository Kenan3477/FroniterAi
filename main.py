#!/usr/bin/env python3
"""
FrontierAI - Railway Entry Point
Main entry point for Railway deployment
"""

import os
import sys
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Ensure we can import from the current directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set Railway environment indicator
os.environ['RAILWAY_ENVIRONMENT'] = 'production'

logger.info("🚀 FRONTIER AI - RAILWAY DEPLOYMENT STARTING")
logger.info("🌐 Setting up Railway environment...")

try:
    # Import the Flask app directly
    from app import app, start_background_services
    
    logger.info("✅ App imported successfully")
    
    # Start background services
    start_background_services()
    logger.info("✅ Background services started")
    
    # Get port from environment (Railway provides this)
    port = int(os.environ.get("PORT", 8080))
    
    logger.info(f"🌐 Starting server on 0.0.0.0:{port}")
    
    # Run the Flask app
    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,  # Never use debug=True in production
        threaded=True
    )
    
except Exception as e:
    logger.error(f"❌ Failed to start FrontierAI: {str(e)}")
    sys.exit(1)
