#!/usr/bin/env python3
"""
🧪 RAILWAY AUTONOMOUS EVOLUTION TESTER 🧪
Test if Railway deployment can make autonomous commits to GitHub
"""

import requests
import time
import json

def test_railway_autonomous_evolution():
    """Test Railway autonomous evolution with GitHub commits"""
    base_url = "https://web-production-3ef05.up.railway.app"
    
    print("🧪 TESTING RAILWAY AUTONOMOUS EVOLUTION...")
    print("=" * 50)
    
    # Wait for Railway to deploy updated code
    print("⏳ Waiting for Railway deployment...")
    time.sleep(30)
    
    try:
        # Test if GitHub authentication is configured
        print("🔑 Testing GitHub authentication...")
        response = requests.get(f'{base_url}/api/system-pulse', timeout=10)
        if response.status_code == 200:
            print("✅ Railway system is online")
        else:
            print(f"❌ Railway system error: {response.status_code}")
            return
        
        # Trigger Railway autonomous evolution
        print("🚀 Triggering Railway autonomous evolution...")
        response = requests.post(f'{base_url}/api/railway-autonomous-evolution', timeout=60)
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("status") == "RAILWAY_EVOLUTION_TRIGGERED":
                print("✅ Railway autonomous evolution triggered!")
                print(f"📂 GitHub repo: {data.get('github_repo')}")
                print(f"📝 Expected files: {len(data.get('expected_outputs', []))}")
                
                # Wait for evolution to complete
                print("⏳ Waiting for autonomous code generation and commits...")
                time.sleep(60)
                
                # Check Git status
                git_response = requests.get(f'{base_url}/api/git-status', timeout=10)
                if git_response.status_code == 200:
                    git_data = git_response.json()
                    autonomous_commits = git_data.get('autonomous_commits_count', 0)
                    
                    print(f"📊 Autonomous commits detected: {autonomous_commits}")
                    
                    if autonomous_commits > 0:
                        print("🎉 SUCCESS! Railway autonomous evolution is working!")
                        print("🔗 Check your GitHub repository for autonomous commits!")
                        
                        # Show recent commits
                        commits = git_data.get('recent_commits', [])[:5]
                        print("\\n📝 Recent commits:")
                        for commit in commits:
                            icon = "🚀" if "RAILWAY" in commit.get('message', '') else "🤖" if commit.get('autonomous') else "👤"
                            print(f"  {icon} {commit.get('hash', 'unknown')} - {commit.get('message', 'No message')}")
                    else:
                        print("⚠️ No autonomous commits detected yet. Check Railway logs for errors.")
                
            elif data.get("setup_required"):
                print("❌ SETUP REQUIRED!")
                print("🔧 GitHub token not configured in Railway")
                print("📋 Follow these steps:")
                print("   1. Create GitHub Personal Access Token")
                print("   2. Add GITHUB_TOKEN to Railway environment variables")
                print("   3. Add GITHUB_REPO and GITHUB_USER variables")
                print("   4. Redeploy Railway service")
                
            else:
                print(f"❌ Evolution failed: {data.get('message')}")
                
        else:
            print(f"❌ Railway autonomous evolution failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            except:
                print(f"   Response: {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Railway deployment")
        print("🔧 Make sure your Railway service is running")
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    print("\\n" + "=" * 50)
    print("🧪 RAILWAY AUTONOMOUS EVOLUTION TEST COMPLETE")

if __name__ == "__main__":
    test_railway_autonomous_evolution()
