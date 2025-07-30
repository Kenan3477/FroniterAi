#!/usr/bin/env python3
"""
Railway-optimized entry point for Frontier AI Evolution System
Optimized startup process for cloud deployment with enhanced logging
"""

import os
import sys
import signal
from pathlib import Path

# Set environment variables for Railway
os.environ['PYTHONUNBUFFERED'] = '1'
os.environ['RAILWAY_ENVIRONMENT'] = 'production'

# Import the main system
from comprehensive_evolution_system import ComprehensiveEvolutionSystem

def signal_handler(sig, frame):
    """Handle graceful shutdown"""
    print("🛑 Gracefully shutting down Frontier AI...")
    sys.exit(0)

def main():
    """Main entry point optimized for Railway deployment"""
    print("🚀 Starting Frontier AI Evolution System on Railway...")
    print("🌐 Frontier AI - Advanced Business Intelligence Suite")
    print("💼 Financial Analysis | 🏢 Business Formation | 🌐 Web Development")
    print("📋 Compliance Management | 🚀 Marketing Automation")
    print()
    
    # Set up signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Set up workspace
    workspace_path = Path.cwd()
    
    # Get Railway environment info
    port = os.environ.get('PORT', '8889')
    railway_url = os.environ.get('RAILWAY_PUBLIC_URL', f'http://localhost:{port}')
    
    print(f"🔧 Railway Configuration:")
    print(f"   📡 Port: {port}")
    print(f"   🌐 Public URL: {railway_url}")
    print(f"   📁 Workspace: {workspace_path}")
    print()
    
    # Create and start the system
    try:
        system = ComprehensiveEvolutionSystem(workspace_path)
        system.start_comprehensive_evolution()
        
        print("✅ Evolution system started successfully")
        print(f"🌐 Frontier AI Dashboard available at: {railway_url}")
        print("🤖 Conversational AI interface ready")
        print("📊 Business Operations Suite online")
        print()
        print("🎯 Ready to serve users worldwide!")
        
        # Keep the process alive with enhanced monitoring
        import time
        cycle_count = 0
        while True:
            cycle_count += 1
            time.sleep(30)  # Check every 30 seconds
            
            # Log status every 10 cycles (5 minutes)
            if cycle_count % 10 == 0:
                print(f"💫 Frontier AI running stable - Cycle {cycle_count}")
                print(f"🌐 Available at: {railway_url}")
                
    except KeyboardInterrupt:
        print("🛑 Received shutdown signal")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
