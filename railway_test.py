#!/usr/bin/env python3
"""
Simple test to verify Railway deployment
"""
import os
import sys

print("🔍 RAILWAY DEPLOYMENT TEST")
print(f"Python executable: {sys.executable}")
print(f"Python version: {sys.version}")
print(f"Current working directory: {os.getcwd()}")
print(f"Files in current directory:")
for f in os.listdir('.'):
    print(f"  - {f}")

print("\n🔍 Environment variables:")
for key in sorted(os.environ.keys()):
    if 'PORT' in key or 'PYTHON' in key or 'RAILWAY' in key:
        print(f"  {key}={os.environ[key]}")

print("\n🔍 Looking for app.py...")
if os.path.exists('app.py'):
    print("✅ app.py found!")
    stat = os.stat('app.py')
    print(f"   Size: {stat.st_size} bytes")
    print(f"   Modified: {stat.st_mtime}")
else:
    print("❌ app.py NOT found!")

print("\n🔍 Testing Flask import...")
try:
    from flask import Flask
    print("✅ Flask import successful!")
    
    # Create simple Flask app
    app = Flask(__name__)
    
    @app.route('/')
    def hello():
        return "🚀 Railway deployment working!"
    
    port = int(os.environ.get('PORT', 5000))
    print(f"🌐 Starting on port {port}")
    app.run(host='0.0.0.0', port=port)
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
