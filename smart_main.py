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

def try_frontier_complete_system():
    """Try to start the complete FrontierAI system first"""
    try:
        print("🌟 Attempting to start FrontierAI Complete System...")
        
        # Try importing dependencies
        import flask
        import flask_cors
        import flask_socketio
        import sqlite3
        import requests
        
        print("✅ All dependencies available")
        
        # If we get here, try starting the complete system
        print("🔄 Starting FrontierAI Complete System...")
        from frontier_ai_complete_system import app, socketio
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 FrontierAI Complete System starting on port {port}")
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
        
    except Exception as e:
        print(f"❌ FrontierAI Complete System failed: {e}")
        print("🔄 Falling back to Production Dashboard...")
        return False
    
    return True

def try_elite_frontier_system():
    """Try to start the Elite FrontierAI System first (best version)"""
    try:
        print("🚀 Attempting to start Elite FrontierAI System...")
        
        # Try importing dependencies
        import flask
        import flask_cors
        import flask_socketio
        from dotenv import load_dotenv
        
        print("✅ All dependencies available")
        
        # Try importing the elite system
        from elite_frontier_system import app, socketio
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 Elite FrontierAI System starting on port {port}")
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
        
    except Exception as e:
        print(f"❌ Elite FrontierAI System failed: {e}")
        print("🔄 Falling back to FrontierAI Complete System...")
        return False
    
    return True

def try_frontier_complete_system():
    """Try to start the FrontierAI Complete System"""
    try:
        print("🚀 Attempting to start FrontierAI Complete System...")
        
        # Try importing dependencies
        import flask
        import flask_cors
        import flask_socketio
        from dotenv import load_dotenv
        
        print("✅ All dependencies available")
        
        # Try importing the complete system
        from frontier_ai_complete_system import app, socketio
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 FrontierAI Complete System starting on port {port}")
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
        
    except Exception as e:
        print(f"❌ FrontierAI Complete System failed: {e}")
        print("🔄 Falling back to Production Dashboard...")
        return False
    
    return True

def try_production_dashboard():
    """Try to start the production dashboard first"""
    try:
        print("🚀 Attempting to start Production Dashboard...")
        
        # Try importing dependencies
        import flask
        import flask_cors
        import flask_socketio
        from dotenv import load_dotenv
        
        print("✅ All dependencies available")
        
        # If we get here, try starting the production dashboard
        print("🔄 Starting Production Dashboard...")
        from production_dashboard import app, socketio
        
        port = int(os.environ.get('PORT', 5000))
        print(f"📍 Production Dashboard starting on port {port}")
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
        
    except Exception as e:
        print(f"❌ Production Dashboard failed: {e}")
        print("🔄 Falling back to Complete Dashboard...")
        return False
    
    return True

def try_complete_dashboard():
    """Try to start the complete dashboard"""
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
        
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
        
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
    """Main startup function with Elite System priority"""
    print("🎯 FrontierAI Smart Startup v4.0 ELITE")
    print(f"🐍 Python: {sys.version}")
    print(f"📁 Working Directory: {os.getcwd()}")
    print(f"🚪 Port: {os.environ.get('PORT', '5000')}")
    print("=" * 70)
    
    # Try Elite FrontierAI system first (highest quality)
    if not try_elite_frontier_system():
        # Then try complete FrontierAI system
        if not try_frontier_complete_system():
            # Then try production dashboard (Railway-optimized)
            if not try_production_dashboard():
                # Then try complete dashboard
                if not try_complete_dashboard():
                    # Then try advanced dashboard
                    if not try_advanced_dashboard():
                        # Finally use emergency dashboard
                        start_emergency_dashboard()

if __name__ == '__main__':
    main()
