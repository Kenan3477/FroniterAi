#!/usr/bin/env python3
"""
Check Railway deployment status
"""
import requests
import time
import sys

def check_deployment():
    url = "https://web-production-3ef05.up.railway.app/health"
    
    print("🔍 Checking Railway deployment status...")
    print(f"URL: {url}")
    print("-" * 50)
    
    for attempt in range(30):  # Check for 5 minutes
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ SUCCESS! Application is LIVE and responding!")
                print(f"Status: {data.get('status', 'unknown')}")
                print(f"System: {data.get('system', 'unknown')}")
                print(f"Uptime: {data.get('uptime', 0):.1f} seconds")
                print(f"\n🎯 Dashboard URL: https://web-production-3ef05.up.railway.app/")
                return True
            else:
                print(f"❌ Attempt {attempt + 1}: HTTP {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"⏳ Attempt {attempt + 1}: {type(e).__name__}")
        
        if attempt < 29:
            time.sleep(10)  # Wait 10 seconds between checks
    
    print("❌ Deployment check timed out after 5 minutes")
    return False

if __name__ == "__main__":
    success = check_deployment()
    sys.exit(0 if success else 1)
