#!/usr/bin/env python3
"""
GitHub Token Test - Verify your token works
"""

import os
import requests

def test_github_token():
    """Test if your GitHub token can access the repository"""
    
    print("🔍 GITHUB TOKEN TEST")
    print("=" * 40)
    
    # Get token from environment (for local testing)
    token = os.environ.get('GITHUB_TOKEN')
    
    if not token:
        print("❌ No GITHUB_TOKEN found in environment")
        print("💡 For local testing, set: set GITHUB_TOKEN=your_token_here")
        print("🚀 For Railway: Add GITHUB_TOKEN in Variables tab")
        return False
    
    print(f"✅ Token found (length: {len(token)} characters)")
    
    # Test GitHub API access
    try:
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
        
        print("🔍 Testing GitHub API access...")
        response = requests.get("https://api.github.com/repos/Kenan3477/FroniterAi/contents", 
                              headers=headers, timeout=10)
        
        if response.status_code == 200:
            files = response.json()
            python_files = [f for f in files if f.get('name', '').endswith('.py')]
            
            print("✅ GitHub API SUCCESS!")
            print(f"📄 Repository files: {len(files)}")
            print(f"🐍 Python files: {len(python_files)}")
            print(f"🔗 Repository: https://github.com/Kenan3477/FroniterAi")
            return True
        else:
            print(f"❌ GitHub API failed: {response.status_code}")
            print(f"📝 Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    if test_github_token():
        print("\n🎉 SUCCESS! Your token works!")
        print("🚀 Add this token to Railway Variables")
    else:
        print("\n❌ FAILED! Check your GitHub token")
        print("💡 Get new token: GitHub Settings > Developer settings > Personal access tokens")
