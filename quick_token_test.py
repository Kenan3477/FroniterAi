#!/usr/bin/env python3
"""
Quick GitHub Token Test
"""
import requests
import os

def test_new_token():
    token = os.getenv('GITHUB_TOKEN')
    if not token:
        print("❌ No GITHUB_TOKEN found in environment")
        return False
        
    headers = {"Authorization": f"token {token}"}
    
    print("🔑 Testing new GitHub token...")
    
    # Test authentication
    response = requests.get("https://api.github.com/user", headers=headers)
    print(f"Auth test: {response.status_code}")
    
    if response.status_code == 200:
        user = response.json()
        print(f"✅ Success! Authenticated as: {user.get('login')}")
        
        # Test repository
        repo_response = requests.get("https://api.github.com/repos/Kenan3477/FroniterAi", headers=headers)
        print(f"Repo test: {repo_response.status_code}")
        
        if repo_response.status_code == 200:
            print("✅ Repository access confirmed!")
            return True
    
    print("❌ Token test failed")
    return False

if __name__ == "__main__":
    test_new_token()
