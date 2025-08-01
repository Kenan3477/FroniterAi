#!/usr/bin/env python3
"""
Railway-optimized entry point for Frontier AI Evolution System
Optimized startup process for cloud deployment with enhanced logging
Last deployed: 2025-08-01 13:34:34
"""

import os
import sys
import signal
from pathlib import Path

# Set environment variables for Railway
os.environ['PYTHONUNBUFFERED'] = '1'
os.environ['RAILWAY_ENVIRONMENT'] = 'production'

# Set GitHub token for API access (Railway environment variable)
# Note: In production, set GITHUB_TOKEN environment variable in Railway dashboard
if not os.environ.get('GITHUB_TOKEN'):
    print("⚠️  WARNING: GITHUB_TOKEN environment variable not set!")
    print("📝 Please set GITHUB_TOKEN in Railway dashboard for GitHub API access")
    print("🔑 Get your GitHub Personal Access Token from GitHub Settings > Developer settings > Personal access tokens")
    # For local development only, set the token as an environment variable
    # Example: set GITHUB_TOKEN=your_actual_token_here

def signal_handler(sig, frame):
    """Handle graceful shutdown"""
    print("🛑 Gracefully shutting down Frontier AI...")
    sys.exit(0)

def main():
    """Main entry point optimized for Railway deployment"""
    print("🚀 Starting Frontier AI Evolution System on Railway...")
    print(f"🕐 Deployment Time: 2025-08-01 13:34:34")
    print("🌐 Frontier AI - Advanced Business Intelligence Suite")
    print("💼 Financial Analysis | 🏢 Business Formation | 🌐 Web Development")
    print("📋 Compliance Management | 🚀 Marketing Automation")
    print("🤖 AUTONOMOUS EVOLUTION SYSTEM - PRODUCTION MODE")
    print("💓 GITHUB HEARTBEAT MONITORING - ENABLED")
    print()
    
    # Check if GitHub token is available
    if os.environ.get('GITHUB_TOKEN'):
        print("✅ GITHUB_TOKEN environment variable found!")
        print("🔗 GitHub API connection will be established...")
    else:
        print("❌ GITHUB_TOKEN environment variable missing!")
        print("📝 Please set GITHUB_TOKEN in Railway dashboard")
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
    
    # Create and start the systems
    try:
        print("🤖 Initializing Production Autonomous Evolution Manager...")
        from production_evolution_manager import ProductionEvolutionManager
        evolution_manager = ProductionEvolutionManager(workspace_path)
        
        print("🌐 Starting Enhanced Production Web Server...")
        import socketserver
        import threading
        from enhanced_production_handler import EnhancedProductionHandler
        
        # Start web server with enhanced handler
        host = '0.0.0.0'
        port_int = int(port)
        
        handler = lambda *args, **kwargs: EnhancedProductionHandler(
            *args, 
            evolution_system=None,
            evolution_manager=evolution_manager,
            **kwargs
        )
        
        server = socketserver.TCPServer((host, port_int), handler)
        server_thread = threading.Thread(target=server.serve_forever)
        server_thread.daemon = True
        server_thread.start()
        
        print("🔍 Starting autonomous evolution manager...")
        evolution_manager.start_autonomous_evolution()
        
        print("✅ All systems started successfully")
        print(f"🌐 Frontier AI Dashboard available at: {railway_url}")
        print("🤖 Conversational AI interface ready")
        print("📊 Business Operations Suite online")
        print("🔍 AUTONOMOUS REPOSITORY MONITORING: ACTIVE")
        print("💓 GITHUB HEARTBEAT MONITORING: ACTIVE")
        print("⚡ ADVANCED IMPLEMENTATION UPGRADES: ENABLED")
        print("📺 LIVE EVOLUTION FEED: BROADCASTING")
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
                
                # Show evolution stats
                try:
                    stats = evolution_manager.get_evolution_stats()
                    print(f"🤖 Evolution Stats: {stats['total_files_created']} files, Gen {stats['current_generation']}, {stats['upgrades_performed']} upgrades")
                except Exception as e:
                    print(f"📊 Stats collection error: {e}")
                
                # Show heartbeat status
                try:
                    heartbeat = evolution_manager.get_heartbeat_status()
                    print(f"💓 GitHub Status: {heartbeat.get('status', 'unknown')} - Files: {heartbeat.get('repository_stats', {}).get('total_files', 0)}")
                except Exception as e:
                    print(f"💓 Heartbeat check error: {e}")
                
    except KeyboardInterrupt:
        print("🛑 Received shutdown signal")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting system: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to basic server
        print("🔄 Starting fallback server...")
        try:
            from enhanced_frontier_dashboard import EnhancedFrontierDashboard
            dashboard = EnhancedFrontierDashboard(workspace_path)
            dashboard.start_server()
            
            while True:
                time.sleep(30)
                
        except Exception as fallback_error:
            print(f"❌ Fallback server failed: {fallback_error}")
            sys.exit(1)

if __name__ == "__main__":
    main()
