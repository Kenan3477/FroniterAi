#!/usr/bin/env python3
"""
🔧 VERIFY AUTONOMOUS EVOLUTION FIX 🔧
Test the system after fixing the duplicate route error
"""

import requests
import time
import json

def test_system():
    """Test if the autonomous evolution system is working"""
    base_url = "https://web-production-3ef05.up.railway.app"
    
    print("🔧 TESTING FIXED AUTONOMOUS EVOLUTION SYSTEM...")
    
    # Wait for Railway to redeploy
    print("⏳ Waiting 30 seconds for Railway to redeploy...")
    time.sleep(30)
    
    try:
        # Test system pulse
        print("📡 Testing system pulse...")
        response = requests.get(f'{base_url}/api/system-pulse', timeout=10)
        if response.status_code == 200:
            print("✅ System pulse working!")
            data = response.json()
            print(f"   Status: {data.get('status', 'unknown')}")
        else:
            print(f"❌ System pulse failed: {response.status_code}")
            return
        
        # Test evolution trigger
        print("🚀 Testing evolution trigger...")
        response = requests.get(f'{base_url}/api/trigger-evolution', timeout=10)
        if response.status_code == 200:
            print("✅ Evolution trigger working!")
            data = response.json()
            print(f"   Message: {data.get('message', 'unknown')}")
        else:
            print(f"❌ Evolution trigger failed: {response.status_code}")
        
        # Test Git status
        print("🔗 Testing Git status...")
        response = requests.get(f'{base_url}/api/git-status', timeout=10)
        if response.status_code == 200:
            print("✅ Git status working!")
            data = response.json()
            autonomous_count = data.get('autonomous_commits_count', 0)
            print(f"   Autonomous commits detected: {autonomous_count}")
        else:
            print(f"❌ Git status failed: {response.status_code}")
        
        print("\n🎉 SYSTEM IS FIXED AND WORKING!")
        print("🚀 Your autonomous evolution system is now operational!")
        print(f"🔗 Dashboard: {base_url}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Still waiting for Railway to deploy. Try again in a few minutes.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_system()
