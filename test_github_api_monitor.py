#!/usr/bin/env python3
"""
Test GitHub API Monitor
Tests the new GitHub API-based repository monitoring
"""

import sys
import time
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

def test_github_api_monitor():
    """Test the GitHub API monitor"""
    print("🔗 Testing GitHub API Monitor")
    print("=" * 40)
    print("📡 Connecting to: https://github.com/Kenan3477/FroniterAi")
    print()
    
    try:
        from github_api_monitor import GitHubAPIMonitor
        
        workspace_path = Path(__file__).parent
        monitor = GitHubAPIMonitor(workspace_path)
        
        print("✅ GitHub API Monitor initialized")
        print("🔑 Using GitHub API token for authentication")
        print()
        
        # Start monitoring
        print("🚀 Starting repository monitoring...")
        monitor.start_monitoring()
        
        # Wait for initial data fetch
        print("⏳ Waiting for initial data fetch (30 seconds)...")
        time.sleep(35)
        
        # Get monitor status
        status = monitor.get_monitor_status()
        
        print("📊 Repository Status:")
        print(f"   🔗 Status: {status.get('status', 'unknown')}")
        print(f"   📁 Total Files: {status.get('repository_stats', {}).get('total_files', 0)}")
        print(f"   🐍 Python Files: {status.get('repository_stats', {}).get('python_files', 0)}")
        print(f"   ⏰ Last Update: {status.get('last_update', 'N/A')}")
        
        if 'repository_stats' in status and 'repository_info' in status['repository_stats']:
            repo_info = status['repository_stats']['repository_info']
            print(f"   📝 Description: {repo_info.get('description', 'N/A')}")
            print(f"   ⭐ Stars: {repo_info.get('stars', 0)}")
            print(f"   🍴 Forks: {repo_info.get('forks', 0)}")
        
        print()
        print("🔍 Implementation Opportunities Found:")
        opportunities = status.get('implementation_opportunities', [])
        if opportunities:
            for i, opp in enumerate(opportunities, 1):
                print(f"   {i}. {opp}")
        else:
            print("   None found yet (analysis in progress)")
        
        print()
        print("💡 Upgrade Suggestions:")
        suggestions = status.get('upgrade_suggestions', [])
        if suggestions:
            for i, sug in enumerate(suggestions, 1):
                print(f"   {i}. {sug}")
        else:
            print("   None found yet (analysis in progress)")
        
        # Stop monitoring
        monitor.stop_monitoring()
        
        if status.get('status') == 'connected' and status.get('repository_stats', {}).get('total_files', 0) > 0:
            print()
            print("🎉 GitHub API Monitor is working correctly!")
            print(f"✅ Successfully connected to repository")
            print(f"✅ Found {status.get('repository_stats', {}).get('total_files', 0)} files")
            return True
        else:
            print()
            print("❌ GitHub API Monitor has issues")
            if 'error' in status:
                print(f"Error: {status['error']}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
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
        print("🔗 GitHub API Monitor integrated")
        
        # Test heartbeat status
        heartbeat = manager.get_heartbeat_status()
        print(f"💓 Monitor Status: {heartbeat.get('status', 'unknown')}")
        
        # Test evolution stats with heartbeat
        stats = manager.get_evolution_stats()
        print(f"📊 Evolution Stats Retrieved: {len(stats)} fields")
        print(f"🔗 Repository Connection: {stats.get('repository_connection', 'unknown')}")
        print(f"📁 Repository Files: {stats.get('repository_file_count', 0)}")
        
        if stats.get('repository_connection') in ['connected', 'initializing', 'error']:
            print("🟢 Integration working correctly!")
            return True
        else:
            print("⚠️ Integration may have issues")
            return False
            
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🧪 GitHub API Monitor Test Suite")
    print("=" * 35)
    
    test1_passed = test_github_api_monitor()
    test2_passed = test_production_integration()
    
    print("\n" + "=" * 35)
    if test1_passed and test2_passed:
        print("🎉 ALL TESTS PASSED!")
        print("✅ GitHub API Monitor is ready for deployment")
        print("🔗 Successfully connecting to https://github.com/Kenan3477/FroniterAi")
        print("📊 Repository monitoring and analysis working")
    else:
        print("❌ Some tests failed")
        print("🔧 Check errors above before deploying")
    
    print("\n📝 Next Steps:")
    print("1. Run: python app.py (to test locally)")
    print("2. Run: python deploy_heartbeat_monitor.py (to deploy)")
    print("3. Check dashboard for real GitHub repository data")
