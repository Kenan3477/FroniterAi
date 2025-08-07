#!/usr/bin/env python3
"""
Emergency Deployment Monitor
Monitors the emergency stable system deployment
"""

import requests
import time
import datetime

RAILWAY_URL = "https://web-production-3ef05.up.railway.app"

def check_emergency_deployment():
    """Check emergency deployment status"""
    print(f"🔍 Checking deployment at {datetime.datetime.now().strftime('%H:%M:%S')}")
    
    try:
        # Check health endpoint with longer timeout
        print("   📡 Testing health endpoint...")
        response = requests.get(f"{RAILWAY_URL}/health", timeout=15)
        
        if response.status_code == 200:
            health_data = response.json()
            print(f"   ✅ HEALTH CHECK PASSED!")
            print(f"   🚀 System: {health_data.get('system', 'Unknown')}")
            print(f"   📊 Status: {health_data.get('status', 'Unknown')}")
            
            # Test main dashboard
            print("   🎭 Testing main dashboard...")
            dashboard_response = requests.get(RAILWAY_URL, timeout=10)
            if dashboard_response.status_code == 200:
                print(f"   ✅ DASHBOARD ACCESSIBLE!")
                return True
            else:
                print(f"   ⚠️ Dashboard returned {dashboard_response.status_code}")
                return False
                
        else:
            print(f"   ❌ Health check failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("   ⏳ Connection refused - still starting...")
        return False
    except requests.exceptions.Timeout:
        print("   ⏳ Request timeout - slow response...")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Main monitoring function"""
    print("🆘 EMERGENCY DEPLOYMENT MONITOR")
    print("=" * 50)
    print(f"📡 URL: {RAILWAY_URL}")
    print(f"⏰ Started: {datetime.datetime.now().strftime('%H:%M:%S')}")
    print("-" * 50)
    
    attempt = 1
    max_attempts = 15  # 7.5 minutes max
    
    while attempt <= max_attempts:
        print(f"\n🔄 Attempt {attempt}/{max_attempts}:")
        
        if check_emergency_deployment():
            print("\n" + "=" * 50)
            print("🎉 EMERGENCY STABLE SYSTEM IS LIVE!")
            print("=" * 50)
            print(f"🌐 Dashboard: {RAILWAY_URL}")
            print(f"💊 Health: {RAILWAY_URL}/health")
            print(f"📊 Status: {RAILWAY_URL}/api/system-status")
            print(f"🚀 Evolution: {RAILWAY_URL}/api/force-evolution")
            print("=" * 50)
            break
        
        attempt += 1
        if attempt <= max_attempts:
            print(f"   ⏱️ Waiting 30 seconds before retry...")
            time.sleep(30)
    
    if attempt > max_attempts:
        print("\n" + "=" * 50)
        print("⏰ DEPLOYMENT TIMEOUT")
        print("=" * 50)
        print("❌ Emergency system failed to respond within 7.5 minutes")
        print("📋 Next steps:")
        print("   1. Check Railway logs for errors")
        print("   2. Verify Dockerfile and requirements.txt")
        print("   3. Consider using minimal fallback")
        print("=" * 50)

if __name__ == "__main__":
    main()
