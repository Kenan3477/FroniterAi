#!/usr/bin/env python3
"""
🔥 TEST REAL EVOLUTION API ENDPOINT 🔥
This script tests the Railway deployment's new REAL evolution endpoint
"""

import requests
import json
import time

def test_real_evolution_api():
    """Test the /api/real-autonomous-evolution endpoint"""
    
    railway_url = "https://frontierai-production.up.railway.app"
    endpoint = f"{railway_url}/api/real-autonomous-evolution"
    
    print("🔥 TESTING REAL AUTONOMOUS EVOLUTION API")
    print("=" * 60)
    print(f"URL: {endpoint}")
    
    try:
        print("\n🚀 Sending POST request to trigger REAL evolution...")
        
        response = requests.post(endpoint, timeout=30)
        
        print(f"\n📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS! Real evolution API responded")
            print(f"Evolution Success: {data.get('success', 'Unknown')}")
            print(f"Files Improved: {data.get('files_improved', 'Unknown')}")
            print(f"Commits Made: {data.get('commits_made', 'Unknown')}")
            print(f"Evolution Target: {data.get('evolution_target', 'Unknown')}")
            print(f"Evolution Type: {data.get('evolution_type', 'Unknown')}")
            
            if data.get('improvements'):
                print(f"Improvements: {json.dumps(data['improvements'], indent=2)}")
                
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.Timeout:
        print("⏰ Request timed out (this is normal for long-running evolution)")
        
    except Exception as e:
        print(f"❌ Request failed: {e}")

def test_dashboard():
    """Test that the main dashboard loads"""
    railway_url = "https://frontierai-production.up.railway.app"
    
    try:
        print("\n🔍 Testing main dashboard...")
        response = requests.get(railway_url, timeout=10)
        
        if response.status_code == 200:
            print("✅ Dashboard loads successfully")
        else:
            print(f"❌ Dashboard error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Dashboard test failed: {e}")

if __name__ == "__main__":
    test_dashboard()
    test_real_evolution_api()
    print("\n🔥 Test complete - check Railway logs for evolution progress!")
