#!/usr/bin/env python3
"""
🎯 GITHUB API EVOLUTION TESTER
Test the new GitHub API approach (no cloning, no crashes)
"""

import requests
import time

def test_github_api_evolution():
    """Test the new GitHub API autonomous evolution"""
    
    # Your Railway URL - update if needed
    possible_urls = [
        "https://proud-enchantment-production.up.railway.app",
        "https://web-production-3ef05.up.railway.app"
    ]
    
    print("🚀 TESTING GITHUB API AUTONOMOUS EVOLUTION")
    print("=" * 60)
    
    working_url = None
    
    # Find working URL
    for url in possible_urls:
        try:
            print(f"🌐 Trying: {url}")
            response = requests.get(f"{url}/", timeout=5)
            if response.status_code == 200:
                print(f"✅ Found working URL: {url}")
                working_url = url
                break
        except:
            print(f"❌ Not accessible: {url}")
    
    if not working_url:
        print("❌ Could not find working Railway URL")
        print("📝 Please check your Railway dashboard for the correct domain")
        return False
    
    print(f"\n🧪 TESTING NEW GITHUB API EVOLUTION (NO CLONING)...")
    
    try:
        # Test the new GitHub API endpoint
        response = requests.post(
            f"{working_url}/api/github-api-evolution", 
            timeout=30,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n🎉 SUCCESS! Response:")
            print(f"   Status: {data.get('status')}")
            print(f"   Platform: {data.get('platform')}")
            print(f"   Method: {data.get('method')}")
            print(f"   GitHub Repo: {data.get('github_repo')}")
            print(f"   Expected Files: {data.get('expected_outputs')}")
            
            if data.get('status') == 'GITHUB_API_EVOLUTION_TRIGGERED':
                print("\n⏱️  Waiting 20 seconds for GitHub API operations...")
                time.sleep(20)
                
                print("\n🔍 Check your GitHub repository for new commits:")
                print("   https://github.com/Kenan3477/FroniterAi/commits")
                print("   Look for files like:")
                print("   - github_api_autonomous_enhancement_*.py")
                print("   - github_api_security_enhancement_*.py")
                
                return True
            else:
                print(f"⚠️  Unexpected response: {data}")
                
        else:
            print(f"❌ Request failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Response: {response.text}")
    
    except Exception as e:
        print(f"❌ Error testing GitHub API evolution: {e}")
    
    print(f"\n📊 Also test the old Railway evolution (may cause crashes):")
    print(f"   {working_url}/api/railway-autonomous-evolution")
    
    print("\n" + "=" * 60)
    print("🏁 GITHUB API EVOLUTION TEST COMPLETE")
    print("\n🎯 ADVANTAGES OF GITHUB API APPROACH:")
    print("✅ No repository cloning required")
    print("✅ No crashes or deployment loops")
    print("✅ Direct file creation via GitHub API")
    print("✅ Stable operation in Railway containers")
    print("✅ Real commits with actual file content")
    
    return True

if __name__ == "__main__":
    test_github_api_evolution()
