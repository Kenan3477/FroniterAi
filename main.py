#!/usr/bin/env python3
"""
Main entry point for FrontierAI Dashboard on Railway
This is the ONLY file Railway should execute
"""

import os
import sys

# Ensure we're in the right directory
print(f"🎯 Starting FrontierAI Dashboard from: {os.getcwd()}")
print(f"🐍 Python executable: {sys.executable}")
print(f"🚪 Port: {os.environ.get('PORT', '5000')}")

# Import and run our simple dashboard
try:
    from simple_dashboard import app
    
    # Get port from environment
    port = int(os.environ.get('PORT', 5000))
    
    print("🚀 Starting FrontierAI Dashboard...")
    print(f"📍 Listening on 0.0.0.0:{port}")
    print(f"🌐 Health check: http://0.0.0.0:{port}/health")
    
    # Run the application
    app.run(host='0.0.0.0', port=port, debug=False)
    
except Exception as e:
    print(f"❌ Failed to start dashboard: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
