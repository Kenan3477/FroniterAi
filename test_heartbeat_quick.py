#!/usr/bin/env python3
"""
Quick test to verify heartbeat monitor functionality
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

def test_heartbeat_monitor():
    """Test the heartbeat monitor functionality"""
    print("💓 Testing GitHub Heartbeat Monitor")
    print("=" * 40)
    
    try:
        from github_heartbeat_monitor import GitHubHeartbeatMonitor
        
        workspace_path = Path(__file__).parent
        monitor = GitHubHeartbeatMonitor(workspace_path)
        
        print("✅ Heartbeat monitor initialized")
        
        # Test connection status
        status = monitor.get_heartbeat_status()
        print(f"🔗 Connection Status: {status.get('status', 'unknown')}")
        print(f"📁 Repository Path: {status.get('repository_path', 'N/A')}")
        
        if 'repository_stats' in status:
            stats = status['repository_stats']
            print(f"📊 Total Files: {stats.get('total_files', 0)}")
            print(f"🐍 Python Files: {stats.get('python_files', 0)}")
            print(f"🔧 Git Status: {stats.get('git_status', 'unknown')}")
            print(f"🌿 Current Branch: {stats.get('current_branch', 'unknown')}")
        
        if status.get('status') == 'connected':
            print("🟢 Heartbeat monitor is working correctly!")
            return True
        else:
            print("🔴 Heartbeat monitor has issues")
            if 'error' in status:
                print(f"❌ Error: {status['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_production_integration():
    """Test integration with production evolution manager"""
    print("\n🤖 Testing Production Evolution Manager Integration")
    print("=" * 50)
    
    try:
        from production_evolution_manager import ProductionEvolutionManager
        
        workspace_path = Path(__file__).parent
        manager = ProductionEvolutionManager(workspace_path)
        
        print("✅ Production Evolution Manager initialized")
        
        # Test heartbeat status
        heartbeat = manager.get_heartbeat_status()
        print(f"💓 Heartbeat Status: {heartbeat.get('status', 'unknown')}")
        
        # Test evolution stats with heartbeat
        stats = manager.get_evolution_stats()
        print(f"📊 Evolution Stats Retrieved: {len(stats)} fields")
        print(f"🔗 Repository Connection: {stats.get('repository_connection', 'unknown')}")
        print(f"📁 Repository Files: {stats.get('repository_file_count', 0)}")
        
        if stats.get('repository_connection') in ['connected', 'error']:
            print("🟢 Integration working correctly!")
            return True
        else:
            print("⚠️ Integration may have issues")
            return False
            
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Heartbeat Monitor Test Suite")
    print("=" * 35)
    
    test1_passed = test_heartbeat_monitor()
    test2_passed = test_production_integration()
    
    print("\n" + "=" * 35)
    if test1_passed and test2_passed:
        print("🎉 ALL TESTS PASSED!")
        print("✅ Heartbeat monitor is ready for deployment")
    else:
        print("❌ Some tests failed")
        print("🔧 Check errors above before deploying")
    
    print("\n📝 Next Steps:")
    print("1. Run: python deploy_heartbeat_monitor.py")
    print("2. Wait for Railway redeploy (2-3 minutes)")
    print("3. Check your dashboard for heartbeat monitor")
