#!/usr/bin/env python3
"""
FrontierAI Autonomous Evolution Startup Script
Starts the complete autonomous evolution system
"""

import os
import sys
import time
import threading
from pathlib import Path

def start_autonomous_frontier():
    """Start the complete FrontierAI autonomous evolution system"""
    
    print("🚀 STARTING FRONTIERAI AUTONOMOUS EVOLUTION SYSTEM")
    print("=" * 70)
    
    # Check dependencies
    try:
        import git
        import schedule
        import psutil
        print("✅ All dependencies available")
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("💡 Run: pip install -r requirements.txt")
        return
    
    # Start autonomous evolution scheduler
    try:
        from autonomous_scheduler import start_autonomous_system
        print("🧬 Starting autonomous evolution scheduler...")
        
        # Start in background thread
        scheduler_thread = threading.Thread(target=start_autonomous_system)
        scheduler_thread.daemon = True
        scheduler_thread.start()
        
        print("✅ Autonomous evolution system started")
        
    except Exception as e:
        print(f"⚠️ Could not start autonomous evolution: {e}")
    
    # Start Flask dashboard
    try:
        print("🌐 Starting web dashboard...")
        from simple_dashboard import app
        
        # Get port from environment or use default
        port = int(os.environ.get('PORT', 5000))
        host = os.environ.get('HOST', '0.0.0.0')
        
        print(f"📡 Dashboard will be available at http://{host}:{port}")
        print("🎯 Evolution dashboard: http://localhost:{port}/evolution")
        
        # Start Flask app
        app.run(host=host, port=port, debug=False)
        
    except Exception as e:
        print(f"❌ Failed to start dashboard: {e}")

def show_system_info():
    """Show system capabilities and status"""
    print("\n📋 FRONTIERAI AUTONOMOUS CAPABILITIES:")
    print("-" * 50)
    print("🧬 AUTONOMOUS EVOLUTION:")
    print("   • Analyzes entire repository for improvements")
    print("   • Implements upgrades automatically")
    print("   • Tests changes before committing")
    print("   • Commits successful upgrades to repository")
    print("   • Pushes changes to GitHub automatically")
    
    print("\n🎯 COMPETITIVE INTELLIGENCE:")
    print("   • Real-time analysis vs market leaders")
    print("   • Automated gap identification")
    print("   • Smart upgrade recommendations")
    print("   • Market positioning tracking")
    
    print("\n🔍 MONITORING & HEALTH:")
    print("   • System performance monitoring")
    print("   • Real-time health checks")
    print("   • Configuration management")
    print("   • Evolution history tracking")
    
    print("\n⚡ CONTINUOUS IMPROVEMENT:")
    print("   • Runs evolution cycles every hour")
    print("   • Self-improves code quality")
    print("   • Adds new features autonomously")
    print("   • Enhances architecture automatically")
    
    print("\n" + "=" * 50)

if __name__ == "__main__":
    show_system_info()
    
    print("\nStarting in 3 seconds...")
    time.sleep(3)
    
    try:
        start_autonomous_frontier()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down FrontierAI Autonomous Evolution System...")
        print("👋 System stopped by user")
