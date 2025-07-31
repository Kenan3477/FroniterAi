#!/usr/bin/env python3
"""
Test script for GitHub Heartbeat Monitor Integration
"""

import sys
import time
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

from production_evolution_manager import ProductionEvolutionManager
from github_heartbeat_monitor import GitHubHeartbeatMonitor

def test_heartbeat_integration():
    """Test the integration of heartbeat monitor with production evolution manager"""
    print("🧪 Testing GitHub Heartbeat Monitor Integration")
    print("=" * 60)
    
    workspace_path = Path(__file__).parent
    
    # Test 1: Initialize ProductionEvolutionManager
    print("\n1️⃣ Initializing Production Evolution Manager...")
    try:
        manager = ProductionEvolutionManager(workspace_path)
        print("✅ Production Evolution Manager initialized successfully")
        print(f"   GitHub Monitor: {hasattr(manager, 'github_monitor')}")
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: Check heartbeat monitor functionality
    print("\n2️⃣ Testing GitHub Heartbeat Monitor...")
    try:
        heartbeat_status = manager.get_heartbeat_status()
        print("✅ Heartbeat status retrieved:")
        print(f"   Status: {heartbeat_status.get('status', 'unknown')}")
        print(f"   Timestamp: {heartbeat_status.get('timestamp', 'N/A')}")
        if 'repository_stats' in heartbeat_status:
            stats = heartbeat_status['repository_stats']
            print(f"   Total Files: {stats.get('total_files', 0)}")
            print(f"   Git Status: {stats.get('git_status', 'unknown')}")
    except Exception as e:
        print(f"❌ Error getting heartbeat status: {e}")
        return False
    
    # Test 3: Test evolution stats with heartbeat data
    print("\n3️⃣ Testing Evolution Stats with Heartbeat...")
    try:
        evolution_stats = manager.get_evolution_stats()
        print("✅ Evolution stats retrieved:")
        print(f"   Monitoring Status: {evolution_stats.get('monitoring_status', 'unknown')}")
        print(f"   Repository Connection: {evolution_stats.get('repository_connection', 'unknown')}")
        print(f"   Repository File Count: {evolution_stats.get('repository_file_count', 0)}")
        print(f"   Last Heartbeat: {evolution_stats.get('last_heartbeat', 'N/A')}")
    except Exception as e:
        print(f"❌ Error getting evolution stats: {e}")
        return False
    
    print("\n🎉 Integration Test Complete!")
    print("✅ GitHub Heartbeat Monitor successfully integrated with Production Evolution Manager")
    return True

if __name__ == "__main__":
    success = test_heartbeat_integration()
    if success:
        print("\n🚀 Ready for production deployment!")
    else:
        print("\n❌ Integration test failed - check errors above")
    
    sys.exit(0 if success else 1)
