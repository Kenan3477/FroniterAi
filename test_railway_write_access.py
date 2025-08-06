#!/usr/bin/env python3
"""
🔥 TEST RAILWAY GITHUB WRITE ACCESS 🔥
This script tests if Railway can actually commit to GitHub
"""

import requests
import json
import os

def test_railway_autonomous_evolution():
    """Test if Railway deployment can trigger autonomous evolution"""
    
    # Your Railway URL
    railway_url = "https://web-production-3ef05.up.railway.app"
    
    print("🚀 TESTING RAILWAY AUTONOMOUS EVOLUTION...")
    print(f"📡 Railway URL: {railway_url}")
    
    try:
        # Test 1: Check if Railway app is running
        print("\n1️⃣ Testing Railway deployment status...")
        response = requests.get(f"{railway_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Railway deployment is RUNNING")
        else:
            print(f"❌ Railway deployment status: {response.status_code}")
            return
            
    except Exception as e:
        print(f"❌ Cannot reach Railway deployment: {e}")
        return
    
    try:
        # Test 2: Trigger autonomous evolution
        print("\n2️⃣ Triggering autonomous evolution...")
        response = requests.post(f"{railway_url}/api/trigger_evolution", timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ AUTONOMOUS EVOLUTION TRIGGERED!")
            print(f"📁 Files generated: {result.get('files_generated', 'Unknown')}")
            print(f"📝 Commits made: {result.get('commits_made', 'Unknown')}")
            print(f"🔗 GitHub repo: {result.get('github_repo', 'Unknown')}")
            
            if result.get('commits_made', 0) > 0:
                print("\n🎉 SUCCESS! Railway CAN make GitHub commits!")
                print("✅ Write access is WORKING!")
            else:
                print("\n⚠️  Evolution triggered but no commits made")
                print("❌ Write access may not be working properly")
                
        else:
            print(f"❌ Evolution trigger failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Error triggering evolution: {e}")
    
    try:
        # Test 3: Check GitHub repository for recent commits
        print("\n3️⃣ Checking GitHub repository for recent commits...")
        github_api_url = "https://api.github.com/repos/Kenan3477/FroniterAi/commits"
        
        headers = {}
        github_token = os.getenv('GITHUB_TOKEN')
        if github_token:
            headers['Authorization'] = f'token {github_token}'
        
        response = requests.get(github_api_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            commits = response.json()
            recent_commits = commits[:5]  # Last 5 commits
            
            print(f"📋 Recent commits in repository:")
            for i, commit in enumerate(recent_commits, 1):
                author = commit['commit']['author']['name']
                message = commit['commit']['message']
                date = commit['commit']['author']['date']
                print(f"  {i}. {author}: {message[:50]}... ({date})")
            
            # Check for autonomous commits
            autonomous_commits = [c for c in recent_commits if 'autonomous' in c['commit']['message'].lower() or 'railway' in c['commit']['author']['name'].lower()]
            
            if autonomous_commits:
                print(f"\n🤖 Found {len(autonomous_commits)} autonomous commits!")
                print("✅ Railway autonomous evolution is WORKING!")
            else:
                print("\n⚠️  No recent autonomous commits found")
                print("❌ Railway may not be making commits yet")
                
        else:
            print(f"❌ Cannot access GitHub repository: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error checking GitHub: {e}")

if __name__ == "__main__":
    test_railway_autonomous_evolution()
