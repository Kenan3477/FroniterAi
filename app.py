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
    print("🤖 AUTONOMOUS EVOLUTION SYSTEM - PRODUCTION MODE")
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
        print("🤖 Initializing FrontierAI Frontend Dashboard...")
        from frontend_dashboard import FrontierDashboard, create_dashboard_templates
        
        # Create dashboard templates
        create_dashboard_templates()
        
        # Initialize dashboard
        dashboard = FrontierDashboard(workspace_path)
        
        print("🌐 Starting FrontierAI Dashboard Server...")
        print(f"🔧 Railway Configuration:")
        print(f"   📡 Port: {port}")
        print(f"   🌐 Public URL: {railway_url}")
        print(f"   📁 Workspace: {workspace_path}")
        print()
        
        print("✅ FrontierAI Dashboard Features:")
        print("   💬 ChatGPT-Style Conversational Interface")
        print("   🏢 Business Integration Platform")
        print("   📊 Custom Dashboard Builder")
        print("   🔗 CRM, Bookkeeping & Google Sheets Integration")
        print("   🤖 Self-Evolution Monitoring System")
        print("   📈 GitHub Repository Analytics")
        print("   ⚡ Real-time Task Implementation")
        print("   🎯 AI-Powered Business Growth Tools")
        print()
        
        print(f"🌐 FrontierAI Dashboard available at: {railway_url}")
        print("🚀 Starting dashboard server...")
        
        # Run the dashboard (this will block)
        dashboard.run(host='0.0.0.0', port=int(port), debug=False)
        
    except KeyboardInterrupt:
        print("🛑 Received shutdown signal")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting FrontierAI Dashboard: {e}")
        import traceback
        traceback.print_exc()
        
        # Fallback to basic server
        print("🔄 Starting fallback server...")
        try:
            import time
            from enhanced_frontier_dashboard import EnhancedFrontierDashboard
            dashboard = EnhancedFrontierDashboard(workspace_path)
            dashboard.start_server()
            
            print("✅ Fallback server started successfully")
            print(f"🌐 Available at: {railway_url}")
            
            while True:
                time.sleep(30)
                
        except Exception as fallback_error:
            print(f"❌ Fallback server failed: {fallback_error}")
            sys.exit(1)

if __name__ == "__main__":
    main()
