#!/usr/bin/env python3
"""
Live Heartbeat Monitor Status Check
Shows real-time connection status between self-evolving AI and FrontierAI repository
"""

import sys
import time
import json
from pathlib import Path
from datetime import datetime

# Add current directory to path  
sys.path.append(str(Path(__file__).parent))

from github_heartbeat_monitor import GitHubHeartbeatMonitor

def display_heartbeat_status():
    """Display live heartbeat status"""
    workspace_path = Path(__file__).parent
    monitor = GitHubHeartbeatMonitor(workspace_path)
    
    print("💓 GitHub Heartbeat Monitor - Live Status")
    print("=" * 50)
    print("Press Ctrl+C to stop monitoring...\n")
    
    try:
        while True:
            # Get current status
            status = monitor.get_connection_status()
            
            # Clear screen (works on most terminals)
            print("\033[2J\033[H", end="")
            
            print("💓 FRONTIER AI REPOSITORY HEARTBEAT MONITOR")
            print("=" * 50)
            print(f"🕐 Last Update: {datetime.now().strftime('%H:%M:%S')}")
            print(f"🔗 Connection Status: {status.get('status', 'unknown').upper()}")
            print(f"📁 Repository Path: {status.get('repository_path', 'N/A')}")
            
            if 'repository_stats' in status:
                stats = status['repository_stats']
                print(f"📊 Total Files: {stats.get('total_files', 0)}")
                print(f"🐍 Python Files: {stats.get('python_files', 0)}")
                print(f"📄 Text Files: {stats.get('text_files', 0)}")
                print(f"📝 Config Files: {stats.get('config_files', 0)}")
                print(f"🔧 Git Status: {stats.get('git_status', 'unknown')}")
                print(f"🌿 Current Branch: {stats.get('current_branch', 'unknown')}")
            
            if 'last_heartbeat' in status:
                print(f"💓 Last Heartbeat: {status['last_heartbeat']}")
            
            if 'error' in status:
                print(f"❌ Error: {status['error']}")
            
            # Connection health indicator
            connection_status = status.get('status', 'unknown')
            if connection_status == 'connected':
                print("\n🟢 HEALTHY CONNECTION - AI can see repository files")
            elif connection_status == 'error':
                print("\n🔴 CONNECTION ERROR - Check repository access")
            else:
                print("\n⚠️ UNKNOWN STATUS - Checking connection...")
            
            print(f"\nNext update in 5 seconds...")
            time.sleep(5)
            
    except KeyboardInterrupt:
        print("\n\n👋 Heartbeat monitoring stopped")
    except Exception as e:
        print(f"\n❌ Error during monitoring: {e}")

def show_detailed_status():
    """Show detailed one-time status"""
    workspace_path = Path(__file__).parent
    monitor = GitHubHeartbeatMonitor(workspace_path)
    
    print("💓 GitHub Heartbeat Monitor - Detailed Status")
    print("=" * 50)
    
    try:
        status = monitor.get_connection_status()
        print(json.dumps(status, indent=2, default=str))
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--detailed":
        show_detailed_status()
    else:
        display_heartbeat_status()
