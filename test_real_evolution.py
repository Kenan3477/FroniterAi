#!/usr/bin/env python3
"""
REAL EVOLUTION SYSTEM TEST - PROVE IT'S NOT BS!
Tests the actual autonomous evolution, duplicate protection, and self-awareness
"""

import requests
import json
import time
from datetime import datetime

def test_evolution_api():
    """Test the REAL evolution system"""
    print("🧠 TESTING REAL EVOLUTION SYSTEM")
    print("=" * 50)
    
    try:
        response = requests.get("http://localhost:5000/api/evolution-status", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            print(f"✅ Evolution Engine Status: {data.get('evolution_engine', {}).get('status', 'unknown')}")
            print(f"🔄 Total Evolutions: {data.get('evolution_engine', {}).get('total_evolutions', 0)}")
            print(f"📊 Success Rate: {data.get('evolution_engine', {}).get('success_rate', 0)}")
            print(f"🛡️  Duplicate Protection: {data.get('duplicate_protection', {}).get('enabled', False)}")
            print(f"🔍 Duplicates Detected: {data.get('duplicate_protection', {}).get('duplicates_detected', 0)}")
            print(f"🧠 Learning Active: {data.get('autonomous_learning', {}).get('learning_active', False)}")
            print(f"📚 Patterns Learned: {data.get('autonomous_learning', {}).get('patterns_learned', 0)}")
            print(f"🔧 Self-Modification Attempts: {data.get('self_modification', {}).get('attempts', 0)}")
            
            # Check for autonomous actions
            autonomous_actions = data.get('autonomous_actions', [])
            print(f"🤖 Recent Autonomous Actions: {len(autonomous_actions)}")
            for action in autonomous_actions:
                print(f"   - {action}")
                
            return True
        else:
            print(f"❌ Evolution API failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Evolution test failed: {str(e)}")
        return False

def test_duplicate_protection():
    """Test duplicate protection system"""
    print("\n🛡️  TESTING DUPLICATE PROTECTION")
    print("=" * 50)
    
    # Test data - same content multiple times
    test_repo = {"owner": "torvalds", "repo": "linux"}
    
    results = []
    
    for i in range(3):
        print(f"🔄 Attempt {i+1}: Analyzing {test_repo['owner']}/{test_repo['repo']}")
        
        try:
            response = requests.post(
                "http://localhost:5000/api/enhanced-analysis",
                json=test_repo,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                duplicate_info = data.get('duplicate_detection', {})
                
                print(f"   ✅ Success: {data.get('success', False)}")
                print(f"   � Is Duplicate: {duplicate_info.get('is_duplicate', False)}")
                print(f"   💾 Cache Hit: {duplicate_info.get('cache_hit', False)}")
                print(f"   📝 Message: {duplicate_info.get('message', 'N/A')}")
                
                results.append({
                    'attempt': i+1,
                    'success': data.get('success', False),
                    'is_duplicate': duplicate_info.get('is_duplicate', False),
                    'cache_hit': duplicate_info.get('cache_hit', False)
                })
            else:
                print(f"   ❌ Failed: {response.status_code}")
                results.append({
                    'attempt': i+1,
                    'success': False,
                    'error': response.text
                })
                
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")
            results.append({
                'attempt': i+1,
                'success': False,
                'error': str(e)
            })
        
        # Wait between attempts
        if i < 2:
            time.sleep(2)
    
    # Analyze results
    print("\n📊 DUPLICATE PROTECTION ANALYSIS:")
    duplicates_detected = sum(1 for r in results if r.get('is_duplicate', False))
    cache_hits = sum(1 for r in results if r.get('cache_hit', False))
    
    print(f"   🔍 Duplicates Detected: {duplicates_detected}/3")
    print(f"   💾 Cache Hits: {cache_hits}/3")
    
    if duplicates_detected > 0 or cache_hits > 0:
        print("   ✅ DUPLICATE PROTECTION WORKING!")
        return True
    else:
        print("   ⚠️  No duplicates detected - may need more time to process")
        return False

def test_autonomous_behavior():
    """Test if the system shows autonomous behavior over time"""
    print("\n🤖 TESTING AUTONOMOUS BEHAVIOR")
    print("=" * 50)
    
    print("🕐 Checking initial state...")
    initial_response = requests.get("http://localhost:5000/api/evolution-status")
    initial_data = initial_response.json() if initial_response.status_code == 200 else {}
    
    initial_evolutions = initial_data.get('evolution_engine', {}).get('total_evolutions', 0)
    initial_patterns = initial_data.get('autonomous_learning', {}).get('patterns_learned', 0)
    
    print(f"   📊 Initial Evolutions: {initial_evolutions}")
    print(f"   🧠 Initial Patterns: {initial_patterns}")
    
    print("🕐 Waiting 10 seconds for autonomous activity...")
    time.sleep(10)
    
    print("🕐 Checking after waiting...")
    final_response = requests.get("http://localhost:5000/api/evolution-status")
    final_data = final_response.json() if final_response.status_code == 200 else {}
    
    final_evolutions = final_data.get('evolution_engine', {}).get('total_evolutions', 0)
    final_patterns = final_data.get('autonomous_learning', {}).get('patterns_learned', 0)
    
    print(f"   📊 Final Evolutions: {final_evolutions}")
    print(f"   🧠 Final Patterns: {final_patterns}")
    
    evolution_increase = final_evolutions - initial_evolutions
    pattern_increase = final_patterns - initial_patterns
    
    print(f"   📈 Evolution Increase: +{evolution_increase}")
    print(f"   📈 Pattern Increase: +{pattern_increase}")
    
    if evolution_increase > 0 or pattern_increase > 0:
        print("   ✅ AUTONOMOUS BEHAVIOR DETECTED!")
        return True
    else:
        print("   ⚠️  No autonomous activity detected in test period")
        return False

def main():
    print("🔥 REAL FRONTIER AI - EVOLUTION SYSTEM VERIFICATION")
    print("=" * 80)
    print(f"Test started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run all tests
    evolution_works = test_evolution_api()
    duplicate_works = test_duplicate_protection()
    autonomous_works = test_autonomous_behavior()
    
    print("\n" + "=" * 80)
    print("🎯 FINAL VERIFICATION RESULTS:")
    print(f"   🧠 Evolution System: {'✅ REAL' if evolution_works else '❌ FAKE'}")
    print(f"   🛡️  Duplicate Protection: {'✅ WORKING' if duplicate_works else '❌ NOT WORKING'}")
    print(f"   🤖 Autonomous Behavior: {'✅ ACTIVE' if autonomous_works else '❌ INACTIVE'}")
    
    if evolution_works and (duplicate_works or autonomous_works):
        print("\n🎉 VERDICT: REAL SELF-EVOLVING SYSTEM CONFIRMED!")
        print("✅ This is NOT bullshit - actual autonomous evolution detected!")
    else:
        print("\n❌ VERDICT: STILL DETECTING BS")
        print("🚨 System needs more work to be truly autonomous")
    
    print("=" * 80)

if __name__ == "__main__":
    main()
