#!/usr/bin/env python3
"""
Railway Deployment Debug Script
Checks if GitHub integration is working properly in Railway environment
"""

import os
import json
import requests
from datetime import datetime

def check_railway_deployment():
    """Check if Railway deployment has real GitHub integration"""
    
    print("🚀 Railway Deployment Debug")
    print("=" * 50)
    
    # Test API endpoints
    base_url = "https://web-production-3ef05.up.railway.app"
    
    endpoints = [
        "/api/evolution/heartbeat",
        "/api/evolution/competitive-analysis"
    ]
    
    for endpoint in endpoints:
        try:
            print(f"\n🔍 Testing {endpoint}...")
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Status: {response.status_code}")
                
                if endpoint == "/api/evolution/heartbeat":
                    connection_status = data.get('connection_status', 'unknown')
                    total_commits = data.get('total_commits', 0)
                    total_files = data.get('total_files', 0)
                    
                    print(f"📊 Connection Status: {connection_status}")
                    print(f"📈 Total Commits: {total_commits}")
                    print(f"📁 Total Files: {total_files}")
                    
                    if connection_status == 'connected' and total_commits > 150:
                        print("✅ REAL GITHUB DATA DETECTED!")
                    else:
                        print("⚠️ FALLBACK/SIMULATED DATA DETECTED")
                        print("💡 Railway needs GITHUB_TOKEN environment variable")
                
                elif endpoint == "/api/evolution/competitive-analysis":
                    capabilities = data.get('frontier_ai_capabilities', {})
                    automation = capabilities.get('automation_level', 0)
                    innovation = capabilities.get('innovation_score', 0)
                    readiness = capabilities.get('market_readiness', 0)
                    
                    print(f"🤖 Automation Level: {automation}%")
                    print(f"💡 Innovation Score: {innovation}%")
                    print(f"🎯 Market Readiness: {readiness}%")
                    
                    if automation > 50 and innovation > 50:
                        print("✅ COMPETITIVE ANALYSIS WORKING")
                    else:
                        print("⚠️ COMPETITIVE ANALYSIS USING FALLBACK DATA")
            else:
                print(f"❌ Status: {response.status_code}")
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"❌ Error testing {endpoint}: {e}")
    
    print("\n" + "=" * 50)
    print("📋 RAILWAY SETUP CHECKLIST:")
    print("1. ✅ Code deployed to Railway")
    print("2. ❓ GITHUB_TOKEN environment variable set?")
    print("3. ❓ Dependencies installed (requests, python-dotenv)?")
    print("4. ❓ GitHub API rate limits not exceeded?")
    print("\n💡 TO FIX: Set GITHUB_TOKEN in Railway Dashboard Variables")

if __name__ == "__main__":
    check_railway_deployment()
