#!/usr/bin/env python3
import requests
import os

# Get token from environment
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')

if not GITHUB_TOKEN:
    print("❌ No GITHUB_TOKEN found in environment")
    exit(1)

print("🔍 MINIMAL GITHUB TEST")
print("=" * 30)

headers = {
    "Authorization": f"token {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "FrontierAI-Test"
}

# Test basic API
print("Testing GitHub API...")
response = requests.get("https://api.github.com/user", headers=headers)
print(f"User API Status: {response.status_code}")

if response.status_code == 200:
    user = response.json()
    print(f"✅ Authenticated as: {user.get('login')}")
else:
    print(f"❌ Auth failed: {response.text}")

# Test repository
print("\nTesting repository...")
repo_response = requests.get("https://api.github.com/repos/Kenan3477/FroniterAi", headers=headers)
print(f"Repo API Status: {repo_response.status_code}")

if repo_response.status_code == 200:
    repo = repo_response.json()
    print(f"✅ Repository: {repo.get('full_name')}")
    print(f"📊 Size: {repo.get('size')} KB")
else:
    print(f"❌ Repo failed: {repo_response.text}")

# Test contents
print("\nTesting contents...")
contents_response = requests.get("https://api.github.com/repos/Kenan3477/FroniterAi/contents", headers=headers)
print(f"Contents API Status: {contents_response.status_code}")

if contents_response.status_code == 200:
    contents = contents_response.json()
    print(f"✅ Contents found: {len(contents)} items")
    python_files = [item for item in contents if item['name'].endswith('.py')]
    print(f"🐍 Python files: {len(python_files)}")
    for py_file in python_files[:3]:
        print(f"   - {py_file['name']}")
else:
    print(f"❌ Contents failed: {contents_response.text}")
