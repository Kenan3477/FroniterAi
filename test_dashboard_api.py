#!/usr/bin/env python3
"""
Simple test to ensure dashboard_api.py runs correctly
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.getcwd())

print("🧪 Testing FrontierAI Dashboard API...")

try:
    print("📦 Importing dashboard_api...")
    import dashboard_api
    print("✅ dashboard_api imported successfully")
    
    print("📦 Checking Flask app...")
    app = dashboard_api.app
    print(f"✅ Flask app created: {app}")
    
    print("📦 Checking routes...")
    routes = [rule.rule for rule in app.url_map.iter_rules()]
    print(f"✅ Found {len(routes)} routes: {routes[:5]}...")
    
    print("🎯 Dashboard API is ready for deployment!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
