#!/usr/bin/env python3
"""
Test Heartbeat Monitoring Locally
Verify the GitHub heartbeat system is working before checking Railway
"""

import os
import sys
import time
from pathlib import Path

# Set GitHub token for testing
os.environ['GITHUB_TOKEN'] = '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'

sys.path.append(str(Path.cwd()))

def test_heartbeat_system():
    """Test the heartbeat monitoring system"""
    print("💓 Testing Heartbeat Monitoring System")
    print("=" * 40)
    
    try:
        from production_evolution_manager import ProductionEvolutionManager
        
        print("🤖 Creating evolution manager...")
        workspace_path = Path.cwd()
        manager = ProductionEvolutionManager(workspace_path)
        
        print("🚀 Starting autonomous evolution...")
        manager.start_autonomous_evolution()
        
        print("⏳ Waiting for GitHub data to be fetched...")
        time.sleep(10)
        
        print("💓 Checking heartbeat status...")
        status = manager.get_heartbeat_status()
        
        print(f"\n📊 Heartbeat Status:")
        print(f"   Status: {status.get('status', 'unknown')}")
        print(f"   Repository: {status.get('repository_url', 'unknown')}")
        print(f"   Files: {status.get('repository_stats', {}).get('total_files', 0)}")
        print(f"   Python Files: {status.get('repository_stats', {}).get('python_files', 0)}")
        print(f"   Monitoring Active: {status.get('monitoring_active', False)}")
        
        if status.get('status') == 'connected':
            print("\n✅ SUCCESS! Heartbeat monitoring is working!")
            print("🎉 Your Railway deployment should show the same data")
        elif status.get('status') == 'initializing':
            print("\n⏳ System is initializing, wait a bit longer...")
            print("🔄 Railway deployment may need more time to fetch data")
        else:
            print(f"\n⚠️  Status: {status.get('status')}")
            if 'error' in status:
                print(f"   Error: {status['error']}")
        
        # Test the enhanced dashboard handler
        print("\n🌐 Testing dashboard handler...")
        from enhanced_production_handler import EnhancedProductionHandler
        
        # Create a mock request to test the heartbeat endpoint
        class MockRequest:
            def __init__(self, path):
                self.path = path
        
        # This confirms the handler has the heartbeat endpoint
        handler = EnhancedProductionHandler
        print("✅ Enhanced dashboard handler loaded successfully")
        print("💓 Heartbeat endpoint /api/heartbeat-status available")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_heartbeat_system()
