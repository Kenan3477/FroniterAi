#!/usr/bin/env python3
"""
COMPREHENSIVE FRONTIER AI DIAGNOSTIC
Identifies exactly why heartbeat monitoring isn't working
"""

import requests
import json
import os
from datetime import datetime

def diagnose_frontier_ai():
    """Complete diagnostic of GitHub repo and Railway deployment"""
    
    print("🔍 FRONTIER AI COMPREHENSIVE DIAGNOSTIC")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    # 1. GitHub Repository Analysis
    print("1️⃣ GITHUB REPOSITORY ANALYSIS")
    print("-" * 40)
    
    try:
        # Test GitHub API without authentication
        response = requests.get("https://api.github.com/repos/Kenan3477/FroniterAi", timeout=10)
        if response.status_code == 200:
            repo_data = response.json()
            print(f"✅ Repository exists: {repo_data['full_name']}")
            print(f"📊 Stars: {repo_data['stargazers_count']}")
            print(f"📁 Size: {repo_data['size']} KB")
            print(f"🔧 Language: {repo_data['language']}")
            print(f"📅 Updated: {repo_data['updated_at']}")
        else:
            print(f"❌ Repository not accessible: {response.status_code}")
    except Exception as e:
        print(f"❌ GitHub repository error: {e}")
    
    # 2. GitHub API Contents Test
    print("\\n2️⃣ GITHUB API CONTENTS TEST")
    print("-" * 40)
    
    try:
        response = requests.get("https://api.github.com/repos/Kenan3477/FroniterAi/contents", timeout=10)
        if response.status_code == 200:
            files = response.json()
            print(f"✅ Repository accessible via API")
            print(f"📄 Total files in root: {len(files)}")
            
            # Count file types
            python_files = [f for f in files if f.get('name', '').endswith('.py')]
            html_files = [f for f in files if f.get('name', '').endswith('.html')]
            md_files = [f for f in files if f.get('name', '').endswith('.md')]
            
            print(f"🐍 Python files: {len(python_files)}")
            print(f"🌐 HTML files: {len(html_files)}")
            print(f"📝 Markdown files: {len(md_files)}")
            
            # Look for app.py specifically
            app_py = next((f for f in files if f.get('name') == 'app.py'), None)
            if app_py:
                print(f"✅ app.py found - Size: {app_py.get('size', 0)} bytes")
            else:
                print("❌ app.py not found in repository")
                
        elif response.status_code == 403:
            print("🔐 Repository requires authentication (rate limited or private)")
            print("💡 This is normal for API rate limits")
        else:
            print(f"❌ API contents error: {response.status_code}")
    except Exception as e:
        print(f"❌ GitHub API error: {e}")
    
    # 3. Railway Deployment Test
    print("\\n3️⃣ RAILWAY DEPLOYMENT TEST")
    print("-" * 40)
    
    # Common Railway URLs to test
    railway_urls = [
        "https://frontier-ai-production.up.railway.app",
        "https://froniter-ai.up.railway.app", 
        "https://frontier-ai.up.railway.app",
        "https://kenan3477-froniterai.up.railway.app"
    ]
    
    working_url = None
    for url in railway_urls:
        try:
            print(f"🧪 Testing: {url}")
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                print(f"✅ Railway deployment found!")
                print(f"📡 Status: {response.status_code}")
                working_url = url
                
                # Check if it's the new version
                if "WORKING HEARTBEAT VERSION" in response.text:
                    print("🎯 NEW VERSION DETECTED!")
                elif "Frontier AI" in response.text:
                    print("⚠️  Old version detected")
                else:
                    print("❓ Unknown version")
                break
            else:
                print(f"❌ Not found: {response.status_code}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    if not working_url:
        print("❌ No Railway deployment found")
        print("💡 Please check your Railway dashboard for the correct URL")
    
    # 4. Heartbeat API Test
    if working_url:
        print("\\n4️⃣ HEARTBEAT API TEST")
        print("-" * 40)
        
        heartbeat_url = f"{working_url}/api/heartbeat-status"
        try:
            print(f"🧪 Testing: {heartbeat_url}")
            response = requests.get(heartbeat_url, timeout=10)
            if response.status_code == 200:
                print("✅ Heartbeat API working!")
                try:
                    data = response.json()
                    print(f"📊 Status: {data.get('status', 'unknown')}")
                    if 'repository_stats' in data:
                        stats = data['repository_stats']
                        print(f"📄 Total files: {stats.get('total_files', 0)}")
                        print(f"🐍 Python files: {stats.get('python_files', 0)}")
                    print("🎉 HEARTBEAT MONITORING IS WORKING!")
                except json.JSONDecodeError:
                    print("⚠️  API returned non-JSON response")
            elif response.status_code == 404:
                print("❌ Heartbeat API not found (404)")
                print("💡 Old version still deployed")
            else:
                print(f"❌ Heartbeat API error: {response.status_code}")
        except Exception as e:
            print(f"❌ Heartbeat API error: {e}")
    
    # 5. Local Environment Check
    print("\\n5️⃣ LOCAL ENVIRONMENT CHECK")
    print("-" * 40)
    
    github_token = os.environ.get('GITHUB_TOKEN')
    if github_token:
        print("✅ GITHUB_TOKEN found in environment")
        print(f"🔑 Token length: {len(github_token)} characters")
    else:
        print("❌ GITHUB_TOKEN not found in local environment")
        print("💡 This is OK for Railway deployment")
    
    # Check local files
    if os.path.exists('app.py'):
        with open('app.py', 'r', encoding='utf-8') as f:
            content = f.read()
        if "WORKING HEARTBEAT VERSION" in content:
            print("✅ Local app.py has working version")
        else:
            print("❌ Local app.py has old version")
    else:
        print("❌ Local app.py not found")
    
    # 6. Recommendations
    print("\\n6️⃣ RECOMMENDATIONS")
    print("-" * 40)
    
    if working_url:
        if "WORKING HEARTBEAT VERSION" not in response.text:
            print("🔄 SOLUTION: Railway is serving old cached version")
            print("   1. Go to https://railway.app")
            print("   2. Find your Frontier AI project") 
            print("   3. Go to Settings > General")
            print("   4. Click 'Restart Deployment'")
            print("   5. Wait 2-3 minutes")
        else:
            print("🎉 Everything looks good!")
    else:
        print("🚀 SOLUTION: Create new Railway deployment")
        print("   1. Go to https://railway.app")
        print("   2. Create new project from GitHub")
        print("   3. Select Kenan3477/FroniterAi repository")
        print("   4. Add GITHUB_TOKEN environment variable")
        print("   5. Deploy")
    
    print("\\n" + "=" * 60)
    print("🏁 DIAGNOSTIC COMPLETE")
    
if __name__ == "__main__":
    diagnose_frontier_ai()
