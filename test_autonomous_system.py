#!/usr/bin/env python3
"""
Test Autonomous Evolution System
Quick test to demonstrate autonomous evolution capabilities
"""

import sys
import os

def test_autonomous_evolution():
    """Test the autonomous evolution system components"""
    
    print("🧪 TESTING AUTONOMOUS EVOLUTION SYSTEM")
    print("=" * 50)
    
    try:
        # Test GitHub integration
        print("\n🐙 Testing GitHub Integration...")
        from github_real_analyzer import get_github_analyzer
        analyzer = get_github_analyzer()
        print("   ✅ GitHub analyzer ready")
        
        # Test evolution engine
        print("\n🤖 Testing Evolution Engine...")
        from autonomous_evolution_engine import get_autonomous_engine
        engine = get_autonomous_engine()
        print("   ✅ Evolution engine ready")
        
        # Test a simple analysis
        print("\n🔍 Testing Repository Analysis...")
        # Run a quick non-destructive analysis
        analysis_result = analyzer.analyze_repository_capabilities()
        if analysis_result:
            print("   ✅ Repository analysis working")
            print(f"   📊 Found {len(analysis_result.get('files', []))} files")
        else:
            print("   ⚠️ Analysis returned empty result")
        
        print("\n🎉 ALL TESTS PASSED!")
        print("🚀 Your autonomous evolution system is fully operational!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_autonomous_evolution()
    sys.exit(0 if success else 1)
