#!/usr/bin/env python3
"""
Railway Deployment Monitor
Checks when the Full Frontier AI Evolution System comes online
"""

import requests
import time
import datetime

RAILWAY_URL = "https://web-production-3ef05.up.railway.app"

def check_deployment():
    """Check if deployment is live"""
    try:
        # Check health endpoint
        response = requests.get(f"{RAILWAY_URL}/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✅ DEPLOYMENT LIVE! Health check successful")
            print(f"🚀 System: {health_data.get('system', 'Unknown')}")
            print(f"⏱️ Uptime: {health_data.get('uptime', 0):.2f} seconds")
            print(f"🤖 Evolution Active: {health_data.get('evolution_active', False)}")
            return True
            
    except requests.exceptions.ConnectionError:
        print("⏳ Deployment still starting (Connection refused)")
        return False
    except requests.exceptions.Timeout:
        print("⏳ Deployment responding slowly (Timeout)")
        return False
    except Exception as e:
        print(f"❌ Error checking deployment: {e}")
        return False

def monitor_deployment():
    """Monitor deployment until it comes online"""
    print("🔍 MONITORING RAILWAY DEPLOYMENT...")
    print(f"📡 URL: {RAILWAY_URL}")
    print(f"⏰ Started: {datetime.datetime.now().strftime('%H:%M:%S')}")
    print("-" * 50)
    
    attempt = 1
    while True:
        print(f"🔄 Attempt {attempt}: ", end="")
        
        if check_deployment():
            print("\n🎉 FULL FRONTIER AI SYSTEM IS NOW LIVE!")
            print(f"🌐 Dashboard: {RAILWAY_URL}")
            print(f"💊 Health: {RAILWAY_URL}/health")
            print(f"📊 API: {RAILWAY_URL}/api/system-status")
            break
        
        time.sleep(30)  # Wait 30 seconds between checks
        attempt += 1
        
        if attempt > 20:  # Stop after 10 minutes
            print("\n⏰ Timeout reached. Check Railway logs for issues.")
            break

if __name__ == "__main__":
    monitor_deployment()
