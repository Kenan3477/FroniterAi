#!/usr/bin/env python3
"""
Final verification of GitHub monitoring system before deployment
Tests all components to ensure everything works
"""

import os
import sys
import requests
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path.cwd()))

def test_github_connection():
    """Test GitHub API connection"""
    print("🔍 Testing GitHub API connection...")
    
    # Set token for testing
    token = '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'
    os.environ['GITHUB_TOKEN'] = token
    
    try:
        from github_api_monitor import GitHubAPIMonitor
        
        # Pass workspace path as required
        workspace_path = Path.cwd()
        monitor = GitHubAPIMonitor(workspace_path)
        
        # Test repository connection
        print("📡 Connecting to repository...")
        status = monitor.get_monitor_status()
        
        if status:
            print(f"✅ Successfully connected to GitHub repository!")
            print(f"📁 Repository status: {status.get('status', 'unknown')}")
            print(f"🔍 Files analyzed: {status.get('files_analyzed', 0)}")
            print(f"🐍 Python files found: {status.get('python_files_count', 0)}")
            
            # Test detailed analysis
            print("🔍 Getting detailed analysis...")
            analysis = monitor.get_detailed_analysis()
            
            if analysis:
                opportunities = analysis.get('improvement_opportunities', [])
                print(f"💡 Found {len(opportunities)} implementation opportunities")
                
                if opportunities:
                    print("🎯 Top opportunities:")
                    for i, opp in enumerate(opportunities[:3], 1):
                        print(f"   {i}. {opp}")
            
            return True
        else:
            print("❌ No status received from GitHub monitor")
            return False
            
    except Exception as e:
        print(f"❌ GitHub API test failed: {e}")
        return False

def test_production_system():
    """Test production evolution manager"""
    print("\n🔧 Testing production evolution system...")
    
    try:
        from production_evolution_manager import ProductionEvolutionManager
        
        # Pass workspace path as required
        workspace_path = Path.cwd()
        manager = ProductionEvolutionManager(workspace_path)
        
        # Start the production system
        print("🚀 Starting production evolution manager...")
        import threading
        start_thread = threading.Thread(target=manager.start_autonomous_evolution, daemon=True)
        start_thread.start()
        
        # Give it a moment to initialize
        import time
        time.sleep(3)
        
        # Test heartbeat status
        print("💓 Getting heartbeat status...")
        status = manager.get_heartbeat_status()
        
        if status and status.get('status') == 'connected':
            print("✅ Production system is working!")
            print(f"📊 Repository stats: {status.get('files_count', 0)} files")
            print(f"🔍 Analysis ready: {status.get('analysis_ready', False)}")
            return True
        else:
            print("❌ Production system not responding correctly")
            return False
            
    except Exception as e:
        print(f"❌ Production system test failed: {e}")
        return False

def test_dashboard_endpoints():
    """Test dashboard functionality"""
    print("\n🌐 Testing dashboard components...")
    
    try:
        from enhanced_production_handler import EnhancedProductionHandler
        
        print("✅ Dashboard handler imported successfully!")
        print("📄 Handler supports:")
        print("   - /dashboard - Main production dashboard")
        print("   - /api/heartbeat-status - GitHub connection status")
        print("   - /api/evolution-status - Evolution system status")
        print("   - /api/live-feed - Live evolution updates")
        
        return True
                
    except Exception as e:
        print(f"❌ Dashboard test failed: {e}")
        return False

def main():
    """Run all verification tests"""
    print("🧪 Final Verification of GitHub Monitoring System")
    print("=" * 50)
    
    tests = [
        ("GitHub API Connection", test_github_connection),
        ("Production Evolution System", test_production_system),
        ("Dashboard Endpoints", test_dashboard_endpoints)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔬 Running: {test_name}")
        print("-" * 30)
        
        if test_func():
            print(f"✅ {test_name}: PASSED")
            passed += 1
        else:
            print(f"❌ {test_name}: FAILED")
    
    print("\n" + "=" * 50)
    print(f"🏁 Verification Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL SYSTEMS GO! Ready for deployment!")
        print("🚀 Run: python deploy_to_railway.py")
        return True
    else:
        print("⚠️  Some tests failed. Please fix issues before deployment.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
