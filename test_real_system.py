#!/usr/bin/env python3
"""
REAL SYSTEM TEST - Verify FrontierAI actually works
"""

import sys
import os
sys.path.append('.')

def test_actual_implementor():
    """Test that the actual implementor creates real files"""
    print("🧪 Testing ActualTaskImplementor...")
    
    from actual_implementor import ActualTaskImplementor
    implementor = ActualTaskImplementor()
    
    # Test task implementation
    result = implementor.implement_task_for_real("TEST: Create a simple calculator function")
    
    print(f"Result: {result}")
    
    if result['success']:
        print(f"✅ REAL FILE CREATED: {result['file_created']}")
        
        # Verify file exists
        if os.path.exists(result['file_created']):
            print(f"✅ FILE VERIFIED: {result['file_created']} exists")
            
            # Show file content
            with open(result['file_created'], 'r') as f:
                content = f.read()
            print(f"📄 FILE CONTENT:\n{content[:200]}...")
            
            return True
        else:
            print(f"❌ FILE NOT FOUND: {result['file_created']}")
            return False
    else:
        print(f"❌ IMPLEMENTATION FAILED: {result.get('error', 'Unknown error')}")
        return False

def test_real_evolution_engine():
    """Test that the real evolution engine works"""
    print("\n🧪 Testing RealEvolutionEngine...")
    
    try:
        from real_evolution_engine import RealEvolutionEngine
        
        # Create engine instance
        engine = RealEvolutionEngine()
        
        # Test metrics
        metrics = engine.get_real_metrics()
        print(f"✅ REAL METRICS: {metrics}")
        
        # Test GitHub monitoring
        github_status = engine.monitor_github_repo()
        print(f"✅ GITHUB STATUS: {github_status['status']}")
        
        return True
        
    except Exception as e:
        print(f"❌ EVOLUTION ENGINE ERROR: {e}")
        return False

def test_main_system():
    """Test that the main system loads"""
    print("\n🧪 Testing Main System...")
    
    try:
        from frontier_ai_complete_system import app
        print("✅ MAIN SYSTEM LOADED")
        
        # Test basic routes
        with app.test_client() as client:
            response = client.get('/health')
            if response.status_code == 200:
                print("✅ HEALTH ENDPOINT WORKING")
                return True
            else:
                print(f"❌ HEALTH ENDPOINT FAILED: {response.status_code}")
                return False
                
    except Exception as e:
        print(f"❌ MAIN SYSTEM ERROR: {e}")
        return False

if __name__ == "__main__":
    print("🚀 FRONTIERAI SYSTEM TEST - VERIFYING REAL FUNCTIONALITY")
    print("=" * 60)
    
    all_tests_passed = True
    
    # Run tests
    test1 = test_actual_implementor()
    test2 = test_real_evolution_engine()
    test3 = test_main_system()
    
    all_tests_passed = test1 and test2 and test3
    
    print("\n" + "=" * 60)
    if all_tests_passed:
        print("🎉 ALL TESTS PASSED - SYSTEM IS REAL AND WORKING!")
    else:
        print("💥 SOME TESTS FAILED - BULLSHIT DETECTED!")
    
    print("=" * 60)
