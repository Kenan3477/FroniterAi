#!/usr/bin/env python3
"""
VERIFY REAL AUTONOMOUS EVOLUTION
Test that the system actually generates code and makes Git commits
"""

import requests
import time
import subprocess

def test_real_autonomous_evolution():
    """Test the real autonomous evolution system"""
    print("🔥 TESTING REAL AUTONOMOUS EVOLUTION SYSTEM...")
    
    # Get initial Git commit count
    try:
        result = subprocess.run(['git', 'log', '--oneline'], capture_output=True, text=True)
        initial_commits = len(result.stdout.strip().split('\n'))
        print(f"📊 Initial commits: {initial_commits}")
    except:
        initial_commits = 0
    
    # Test the deployed system
    base_url = "https://web-production-3ef05.up.railway.app"
    
    try:
        print("⏳ Waiting for Railway to deploy updated system...")
        time.sleep(30)
        
        # Test system pulse
        response = requests.get(f'{base_url}/api/system-pulse', timeout=10)
        if response.status_code == 200:
            print("✅ System is running")
            data = response.json()
            print(f"   Current status: {data.get('status')}")
        else:
            print(f"❌ System not responding: {response.status_code}")
            return
        
        # Trigger autonomous evolution
        print("🚀 Triggering autonomous evolution...")
        response = requests.get(f'{base_url}/api/trigger-evolution', timeout=30)
        if response.status_code == 200:
            print("✅ Evolution triggered successfully")
        else:
            print(f"❌ Evolution trigger failed: {response.status_code}")
        
        # Wait for evolution to complete
        print("⏳ Waiting for autonomous code generation...")
        time.sleep(45)
        
        # Check for new commits
        try:
            result = subprocess.run(['git', 'pull'], capture_output=True, text=True)
            result = subprocess.run(['git', 'log', '--oneline'], capture_output=True, text=True)
            final_commits = len(result.stdout.strip().split('\n'))
            
            new_commits = final_commits - initial_commits
            print(f"📊 Final commits: {final_commits}")
            print(f"🎯 NEW COMMITS MADE: {new_commits}")
            
            if new_commits > 0:
                print("🎉 SUCCESS! REAL AUTONOMOUS EVOLUTION IS WORKING!")
                
                # Show the new commits
                result = subprocess.run(['git', 'log', '--oneline', '-5'], capture_output=True, text=True)
                print("\n📝 RECENT COMMITS:")
                for line in result.stdout.strip().split('\n'):
                    if "AUTONOMOUS" in line:
                        print(f"   🤖 {line}")
                    else:
                        print(f"   👤 {line}")
            else:
                print("❌ NO NEW COMMITS DETECTED - Evolution may not be working")
                
        except Exception as e:
            print(f"❌ Error checking Git commits: {e}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to deployed system")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_real_autonomous_evolution()
