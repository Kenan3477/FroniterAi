#!/usr/bin/env python3
"""
Startup script for FrontierAI Dashboard on Railway
Ensures correct application startup
"""

import os
import sys

# Set environment for production
os.environ.setdefault('FLASK_ENV', 'production')
os.environ.setdefault('FLASK_APP', 'dashboard_api.py')

print("🚀 Starting FrontierAI Dashboard...")
print(f"📍 Python executable: {sys.executable}")
print(f"📍 Working directory: {os.getcwd()}")
print(f"📍 Port: {os.environ.get('PORT', '5000')}")

# Import and run the main application
if __name__ == "__main__":
    try:
        import dashboard_api
        print("✅ Dashboard API imported successfully")
    except Exception as e:
        print(f"❌ Failed to import dashboard_api: {e}")
        sys.exit(1)
