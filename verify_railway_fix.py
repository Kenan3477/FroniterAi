#!/usr/bin/env python3
"""
Verify Railway GitHub Integration
Run this after setting GITHUB_TOKEN in Railway Dashboard
"""

import requests
import time

def verify_railway_github_integration():
    print("🚀 Verifying Railway GitHub Integration")
    print("=" * 50)
    
    # Wait for Railway to redeploy
    print("⏳ Waiting for Railway to redeploy...")
    time.sleep(5)
    
    try:
        response = requests.get(
            "https://web-production-3ef05.up.railway.app/api/evolution/heartbeat",
            timeout=20
        )
        
        if response.status_code == 200:
            data = response.json()
            connection_status = data.get('connection_status')
            commits = data.get('total_commits', 0)
            files = data.get('total_files', 0)
            
            print(f"📡 Connection Status: {connection_status}")
            print(f"📊 Total Commits: {commits}")
            print(f"📁 Total Files: {files}")
            
            # Check if real data
            if connection_status == 'connected' and commits > 150:
                print("\n✅ SUCCESS! Real GitHub data is now active!")
                print("🎯 Your dashboard should now show:")
                print("   - Connected status")
                print("   - Real commit and file counts") 
                print("   - Live competitive analysis")
                print("   - Actual repository statistics")
            else:
                print("\n❌ Still using fallback data")
                print("💡 Double-check GITHUB_TOKEN is set in Railway Variables")
                print("🔄 Railway may still be deploying - wait 2-3 minutes")
        else:
            print(f"❌ API Error: {response.status_code}")
            
    except Exception as e:
        print(f"💥 Error: {e}")
        print("🔄 Railway may still be deploying...")
    
    print("\n" + "=" * 50)
    print("🎯 NEXT STEPS:")
    print("1. Set GITHUB_TOKEN in Railway Dashboard Variables")
    print("2. Wait 2-3 minutes for auto-redeploy") 
    print("3. Refresh your dashboard at:")
    print("   https://web-production-3ef05.up.railway.app/evolution")
    print("4. Look for 'Connected' status and real commit counts!")

if __name__ == "__main__":
    verify_railway_github_integration()
