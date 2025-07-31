#!/usr/bin/env python3
"""
Debug the heartbeat monitor file counting issue
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

def debug_file_counting():
    """Debug the file counting issue"""
    print("🔍 Debugging Heartbeat Monitor File Counting")
    print("=" * 50)
    
    try:
        from github_heartbeat_monitor import GitHubHeartbeatMonitor
        
        workspace_path = Path(__file__).parent
        monitor = GitHubHeartbeatMonitor(workspace_path)
        
        print("✅ Heartbeat monitor initialized")
        print(f"📁 Workspace path: {workspace_path}")
        print(f"📂 Workspace exists: {workspace_path.exists()}")
        
        # Manually trigger a heartbeat check
        print("\n🔧 Manually triggering heartbeat check...")
        connection_result = monitor._test_repository_connection()
        
        print(f"\n📊 Connection test result:")
        for key, value in connection_result.items():
            print(f"   {key}: {value}")
        
        # Get the full heartbeat status
        print(f"\n💓 Full heartbeat status:")
        status = monitor.get_connection_status()
        for key, value in status.items():
            if key == "repository_stats":
                print(f"   {key}:")
                for sub_key, sub_value in value.items():
                    print(f"      {sub_key}: {sub_value}")
            else:
                print(f"   {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"❌ Debug failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    debug_file_counting()
