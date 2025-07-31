#!/usr/bin/env python3
"""
Quick verification that the GitHub API monitor is working with the production system
"""

import sys
import time
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

def verify_github_integration():
    """Verify GitHub API monitor integration"""
    print("🔍 Verifying GitHub API Monitor Integration")
    print("=" * 45)
    
    try:
        # Test the production evolution manager
        from production_evolution_manager import ProductionEvolutionManager
        
        workspace_path = Path(__file__).parent
        manager = ProductionEvolutionManager(workspace_path)
        
        print("✅ Production Evolution Manager loaded")
        print("🔗 GitHub API Monitor integrated")
        
        # Start the GitHub monitoring
        manager.github_monitor.start_monitoring()
        print("🚀 GitHub monitoring started")
        
        # Wait for data
        print("⏳ Waiting for GitHub data (15 seconds)...")
        time.sleep(18)
        
        # Get status
        status = manager.get_heartbeat_status()
        print(f"\n📊 GitHub Repository Status:")
        print(f"   🔗 Connection: {status.get('status', 'unknown')}")
        print(f"   📁 Total Files: {status.get('repository_stats', {}).get('total_files', 0)}")
        print(f"   🐍 Python Files: {status.get('repository_stats', {}).get('python_files', 0)}")
        print(f"   ⏰ Last Update: {status.get('last_update', 'N/A')}")
        
        # Test evolution stats
        evolution_stats = manager.get_evolution_stats()
        print(f"\n🤖 Evolution System Stats:")
        print(f"   📊 Repository Connection: {evolution_stats.get('repository_connection', 'unknown')}")
        print(f"   📁 Repository File Count: {evolution_stats.get('repository_file_count', 0)}")
        print(f"   🏃 System Running: {evolution_stats.get('running', False)}")
        
        # Stop monitoring
        manager.github_monitor.stop_monitoring()
        
        if status.get('repository_stats', {}).get('total_files', 0) > 0:
            print("\n🎉 SUCCESS!")
            print("✅ GitHub API monitor is connected and working")
            print("✅ Repository data is being fetched correctly")
            print("✅ Integration with production system complete")
            print(f"✅ Found {status.get('repository_stats', {}).get('total_files', 0)} files in FroniterAi repo")
            return True
        else:
            print("\n⚠️ Issue detected")
            print("❌ No files found in repository")
            return False
            
    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = verify_github_integration()
    
    if success:
        print("\n🚀 Ready for Railway deployment!")
        print("🔧 The system will now monitor https://github.com/Kenan3477/FroniterAi")
        print("📊 Dashboard will show real repository statistics")
        print("💡 Implementation opportunities will be detected")
        print("⚡ Upgrade suggestions will be generated")
        
        print("\n📝 To deploy:")
        print("1. Run: python deploy_heartbeat_monitor.py")
        print("2. Wait 2-3 minutes for Railway redeploy")
        print("3. Check your dashboard for GitHub connection status")
    else:
        print("\n❌ Issues found - check errors above")
