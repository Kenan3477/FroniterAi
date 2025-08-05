#!/usr/bin/env python3
"""
Smart Startup Script for FrontierAI
Tries advanced dashboard first, falls back to emergency if needed
"""

import os
import sys
import traceback
import subprocess
import time

def try_complete_dashboard():
    """Try to start the complete dashboard first"""
    try:
        print("🚀 Attempting to start Complete Dashboard...")
        
        # Try importing dependencies
        import flask
        import flask_cors
        import flask_socketio
        from dotenv import load_dotenv
        
        print("✅ All dependencies available")
        
        # Try importing our modules
        try:
            from github_real_analyzer import get_github_analyzer
            print("✅ GitHub analyzer available")
        except ImportError:
            print("⚠️ GitHub analyzer not available (will use fallback)")
        
        # If we get here, try starting the complete dashboard
        print("🔄 Starting Complete Dashboard...")
        from complete_frontier_dashboard import app, socketio
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 Complete Dashboard starting on port {port}")
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        print(f"❌ Complete Dashboard failed: {e}")
        print("🔄 Falling back to Advanced Dashboard...")
        return False
    
    return True

def try_advanced_dashboard():
    """Try to start the advanced dashboard"""
    try:
        print("🚀 Attempting to start Advanced Dashboard...")
        
        # Try importing dependencies
        import flask
        import flask_cors
        from dotenv import load_dotenv
        
        print("✅ Basic dependencies available")
        
        # Try importing our modules
        try:
            from github_real_analyzer import get_github_analyzer
            print("✅ GitHub analyzer available")
        except ImportError:
            print("⚠️ GitHub analyzer not available (will use fallback)")
        
        try:
            from self_evolution_engine import get_evolution_engine
            print("✅ Evolution engine available")
        except ImportError:
            print("⚠️ Evolution engine not available (will use fallback)")
        
        # If we get here, try starting the advanced dashboard
        print("🔄 Starting Advanced Dashboard...")
        from advanced_dashboard import app
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 Advanced Dashboard starting on port {port}")
        
        app.run(host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        print(f"❌ Advanced Dashboard failed: {e}")
        print("🔄 Falling back to Emergency Dashboard...")
        return False
    
    return True

def start_emergency_dashboard():
    """Start the emergency dashboard as fallback"""
    try:
        print("🚨 Starting Emergency Dashboard (fallback mode)")
        
        from emergency_main import app
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 Emergency Dashboard starting on port {port}")
        
        app.run(host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        print(f"💥 Emergency Dashboard also failed: {e}")
        print("🔥 CRITICAL: Both dashboards failed to start!")
        traceback.print_exc()
        sys.exit(1)

def main():
    """Main startup function"""
    print("🎯 FrontierAI Smart Startup")
    print(f"🐍 Python: {sys.version}")
    print(f"📁 Working Directory: {os.getcwd()}")
    print(f"🚪 Port: {os.environ.get('PORT', '5000')}")
    print("=" * 50)
    
    # Try complete dashboard first, then advanced, then emergency
    if not try_complete_dashboard():
        if not try_advanced_dashboard():
            # If both fail, use emergency
            start_emergency_dashboard()

if __name__ == '__main__':
    main()
