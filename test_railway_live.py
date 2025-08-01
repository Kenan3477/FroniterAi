#!/usr/bin/env python3
"""
Test Railway Deployment Directly
Check what version is actually running on Railway
"""

import requests
import json

def test_railway_deployment():
    """Test the Railway deployment directly"""
    base_url = "https://web-production-3ef05.up.railway.app"
    
    print("🔍 TESTING RAILWAY DEPLOYMENT")
    print("=" * 40)
    print(f"🌐 URL: {base_url}")
    print()
    
    # Test main dashboard
    print("1. 🏠 Testing main dashboard...")
    try:
        response = requests.get(base_url, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if "GitHub Connection Monitor" in response.text:
            print("   ✅ NEW VERSION: Contains heartbeat monitor!")
        elif "Evolution Cycle" in response.text:
            print("   ❌ OLD VERSION: Still showing old dashboard")
        else:
            print("   ❓ UNKNOWN: Different content")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test heartbeat endpoint
    print("\n2. 💓 Testing heartbeat endpoint...")
    try:
        heartbeat_url = f"{base_url}/api/heartbeat-status"
        response = requests.get(heartbeat_url, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Heartbeat endpoint exists!")
            print(f"   📊 GitHub Status: {data.get('status', 'unknown')}")
            print(f"   📁 Files: {data.get('repository_stats', {}).get('total_files', 0)}")
        else:
            print("   ❌ Heartbeat endpoint not found")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test evolution endpoint  
    print("\n3. 📊 Testing evolution status...")
    try:
        evolution_url = f"{base_url}/api/evolution-status"
        response = requests.get(evolution_url, timeout=10)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Evolution endpoint working")
        else:
            print("   ❌ Evolution endpoint issues")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n🎯 DIAGNOSIS:")
    print("If heartbeat endpoint works but dashboard is old:")
    print("1. 🔄 Railway is running NEW code (has heartbeat API)")
    print("2. 🌐 But serving OLD cached dashboard HTML")
    print("3. 💡 Need to force dashboard refresh")
    
    print("\n🔧 SOLUTIONS:")
    print("1. Try: {base_url}/dashboard (direct dashboard URL)")
    print("2. Clear browser cache completely")
    print("3. Try incognito/private browsing")
    print("4. Force Railway restart")

if __name__ == "__main__":
    test_railway_deployment()
