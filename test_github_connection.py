#!/usr/bin/env python3
"""
Test GitHub API Connection for FrontierAI
"""

import os
from dotenv import load_dotenv
from github_real_analyzer import GitHubRealTimeAnalyzer

def test_github_connection():
    print("🔗 Testing GitHub API Connection...")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv('.env.local')  # Load real token first
    load_dotenv('.env')  # Load defaults second
    
    # Check if token is available
    token = os.getenv('GITHUB_TOKEN')
    if not token or len(token) < 20:
        print("❌ No valid GitHub token found!")
        print("📋 To fix this:")
        print("   1. Create .env.local file")
        print("   2. Add: GITHUB_TOKEN=your_actual_token_here")
        print("   3. Run this test again")
        return False
    
    print(f"✅ GitHub token loaded (starts with: {token[:10]}...)")
    
    # Test the analyzer
    try:
        analyzer = GitHubRealTimeAnalyzer()
        print(f"🔗 Connecting to repository: {analyzer.repo_owner}/{analyzer.repo_name}")
        
        # Get repository stats
        stats = analyzer.get_repository_stats()
        
        if stats.get('connection_status') == 'connected':
            print("✅ REAL GitHub API connection successful!")
            print(f"📊 Repository: {stats.get('repository')}")
            print(f"📝 Total commits: {stats.get('total_commits')}")
            print(f"📁 Total files: {stats.get('total_files')}")
            print(f"🌟 Stars: {stats.get('stars')}")
            print(f"🍴 Forks: {stats.get('forks')}")
            print(f"👁 Watchers: {stats.get('watchers')}")
            print(f"💻 Language: {stats.get('language')}")
            
            # Test competitive analysis
            print("\n🎯 Testing competitive analysis...")
            analysis = analyzer.perform_competitive_analysis()
            print(f"📊 Competitive gaps identified: {len(analysis.get('competitive_gaps', []))}")
            print(f"🚀 Upgrade recommendations: {len(analysis.get('recommended_upgrades', []))}")
            
            return True
        else:
            print("⚠️ Using fallback data - API connection failed")
            return False
            
    except Exception as e:
        print(f"❌ Error testing connection: {e}")
        return False

if __name__ == "__main__":
    success = test_github_connection()
    
    if success:
        print("\n🎉 GitHub integration is working perfectly!")
        print("🚀 Your evolution dashboard will show REAL data")
    else:
        print("\n⚠️ Fix the issues above to enable real GitHub data")
        print("📋 Dashboard will use simulated data until fixed")
