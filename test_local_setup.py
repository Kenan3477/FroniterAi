#!/usr/bin/env python3
"""
Local GitHub Integration Test for FrontierAI
Tests token loading and system setup without requiring internet
"""

import os
from dotenv import load_dotenv

def test_local_setup():
    print("🔧 Testing Local GitHub Integration Setup...")
    print("=" * 60)
    
    # Test 1: Environment file existence
    print("1. Testing environment files...")
    
    env_local_exists = os.path.exists('.env.local')
    env_exists = os.path.exists('.env')
    
    print(f"   📁 .env.local exists: {'✅' if env_local_exists else '❌'}")
    print(f"   📁 .env exists: {'✅' if env_exists else '❌'}")
    
    if not env_local_exists:
        print("   ⚠️ .env.local not found - create it with your real GitHub token")
        return False
    
    # Test 2: Token loading order
    print("\n2. Testing token loading...")
    
    # Clear any existing environment variables
    os.environ.pop('GITHUB_TOKEN', None)
    
    # Load in correct order
    load_dotenv('.env.local')  # Real token first
    load_dotenv('.env')        # Placeholder second (won't override)
    
    token = os.getenv('GITHUB_TOKEN')
    
    if not token:
        print("   ❌ No token loaded")
        return False
    
    print(f"   📝 Token loaded: {token[:15]}...")
    print(f"   📏 Token length: {len(token)}")
    
    # Test 3: Token validation
    print("\n3. Validating token format...")
    
    is_real_token = token.startswith('ghp_') and len(token) >= 36
    is_placeholder = token.startswith('your_')
    
    print(f"   🔍 Is real GitHub token: {'✅' if is_real_token else '❌'}")
    print(f"   🔍 Is placeholder: {'❌' if not is_placeholder else '⚠️'}")
    
    if not is_real_token:
        print("   ⚠️ Token appears to be placeholder or invalid")
        print("   📋 Make sure .env.local contains: GITHUB_TOKEN=ghp_...")
        return False
    
    # Test 4: Import test
    print("\n4. Testing analyzer import...")
    
    try:
        from github_real_analyzer import GitHubRealTimeAnalyzer
        analyzer = GitHubRealTimeAnalyzer()
        print("   ✅ Analyzer imported successfully")
        print(f"   🔗 Repository: {analyzer.repo_owner}/{analyzer.repo_name}")
        print(f"   🔑 Token available: {'✅' if analyzer.github_token else '❌'}")
        
        # Check if token matches what we loaded
        token_matches = analyzer.github_token == token
        print(f"   🔄 Token matches loaded: {'✅' if token_matches else '❌'}")
        
        if not token_matches:
            print("   ⚠️ Analyzer token doesn't match loaded token")
            print(f"   📝 Analyzer token: {analyzer.github_token[:15] if analyzer.github_token else 'None'}...")
            
    except Exception as e:
        print(f"   ❌ Import error: {e}")
        return False
    
    # Test 5: Railway environment setup
    print("\n5. Railway environment setup...")
    
    print("   📋 For Railway deployment, set environment variable:")
    print("   🔧 Variable name: GITHUB_TOKEN")
    print("   🔑 Variable value: [Your GitHub Personal Access Token]")
    print("   🌐 Location: Railway Dashboard > Your Project > Variables")
    
    return True

def show_network_info():
    print("\n🌐 Network Connectivity Notes:")
    print("=" * 60)
    print("If you're experiencing network issues:")
    print("• Check your internet connection")
    print("• Try using a VPN if GitHub is blocked")
    print("• Verify firewall settings")
    print("• Railway deployment will work even if local testing fails")
    print("\nThe dashboard will show 'REAL API' once deployed to Railway")
    print("with the environment variable set correctly.")

if __name__ == "__main__":
    success = test_local_setup()
    
    if success:
        print("\n🎉 Local setup is PERFECT!")
        print("🚀 Your system is ready for real GitHub integration")
        print("📊 Dashboard will show real data once deployed")
    else:
        print("\n⚠️ Fix the issues above for real GitHub integration")
        
    show_network_info()
    
    print("\n📋 Next Steps:")
    print("1. Set GITHUB_TOKEN in Railway environment variables")
    print("2. Deploy to Railway")
    print("3. Check dashboard for 'REAL API' status")
    print("4. Enjoy real GitHub data and competitive analysis! 🎯")
