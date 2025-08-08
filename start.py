#!/usr/bin/env python3
"""
RAILWAY STARTUP SCRIPT - Ensures correct system loads
"""
import os
import sys

print("🔧 RAILWAY STARTUP SCRIPT EXECUTING")
print(f"📁 Current directory: {os.getcwd()}")
print(f"📝 Files in directory: {os.listdir('.')}")
print(f"🐍 Python version: {sys.version}")
print(f"🌐 PORT environment: {os.environ.get('PORT', 'NOT SET')}")

# Ensure we're running the correct main file
print("🚀 Starting FULL AUTONOMOUS EVOLUTION SYSTEM...")
print("📂 Loading railway_main.py...")

try:
    import railway_main
    print("✅ railway_main.py loaded successfully!")
except Exception as e:
    print(f"❌ Error loading railway_main.py: {e}")
    print("🚨 This should not happen!")
    sys.exit(1)
