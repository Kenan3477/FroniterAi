#!/usr/bin/env python3
"""
Diagnostic script to check Railway deployment status
"""
import os
import sys
from datetime import datetime

print("🔍 RAILWAY DIAGNOSTIC REPORT")
print("=" * 50)
print(f"📅 Timestamp: {datetime.now()}")
print(f"🐍 Python Version: {sys.version}")
print(f"📁 Current Directory: {os.getcwd()}")
print(f"🌐 PORT Environment: {os.environ.get('PORT', 'Not set')}")
print(f"🔑 GitHub Token: {'Set' if os.environ.get('GITHUB_TOKEN') else 'Not set'}")
print("=" * 50)

# Check if app.py exists and can be imported
try:
    import app
    print("✅ app.py successfully imported")
    print(f"📊 frontier_system exists: {hasattr(app, 'frontier_system')}")
    if hasattr(app, 'frontier_system'):
        print(f"🤖 System running: {app.frontier_system.running}")
        print(f"📈 Evolution data: {app.frontier_system.evolution_data}")
except Exception as e:
    print(f"❌ Error importing app.py: {e}")

print("=" * 50)
print("🏁 Diagnostic complete")
