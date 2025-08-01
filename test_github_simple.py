#!/usr/bin/env python3
"""
Simple GitHub API test
"""

import os
import sys
import requests

# Set GitHub token from environment variable
github_token = os.environ.get('GITHUB_TOKEN')
if not github_token:
    print("⚠️  Please set GITHUB_TOKEN environment variable")
    print("💡 Example: set GITHUB_TOKEN=your_actual_token_here")
    sys.exit(1)

token = github_token
headers = {
    "Authorization": f"token {token}",
    "Accept": "application/vnd.github.v3+json"
}

print(f"🔑 Testing GitHub API with token (length: {len(token)})")

# Test API connection
url = "https://api.github.com/repos/Kenan3477/FroniterAi"
response = requests.get(url, headers=headers)

print(f"📡 API Response: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"✅ Repository found: {data['name']}")
    print(f"📁 Description: {data.get('description', 'No description')}")
    print(f"⭐ Stars: {data.get('stargazers_count', 0)}")
    
    # Test contents
    contents_url = "https://api.github.com/repos/Kenan3477/FroniterAi/contents"
    contents_response = requests.get(contents_url, headers=headers)
    
    if contents_response.status_code == 200:
        contents = contents_response.json()
        print(f"📂 Files in root: {len(contents)}")
        
        python_files = [f for f in contents if f['name'].endswith('.py')]
        print(f"🐍 Python files: {len(python_files)}")
        
        print("✅ GitHub API is working perfectly!")
    else:
        print(f"❌ Contents fetch failed: {contents_response.status_code}")
        print(contents_response.text)
else:
    print(f"❌ API test failed: {response.status_code}")
    print(response.text)
