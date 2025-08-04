#!/usr/bin/env python3
"""
Test Autonomous Evolution with New Token
"""

import sys
import os
sys.path.append('.')

# Get token from environment variables
token = os.getenv('GITHUB_TOKEN')
if token:
    os.environ['GITHUB_TOKEN'] = token
else:
    print("❌ No GITHUB_TOKEN found in environment")
    sys.exit(1)

try:
    from github_real_analyzer import GitHubRealTimeAnalyzer
    
    print("🔍 TESTING NEW GITHUB TOKEN")
    print("=" * 40)
    
    # Create analyzer
    analyzer = GitHubRealTimeAnalyzer()
    
    # Test repository stats
    print("📊 Testing repository connection...")
    stats = analyzer.get_repository_stats()
    
    print(f"Connection Status: {stats.get('connection_status')}")
    print(f"Repository: {stats.get('repository')}")
    print(f"Total Files: {stats.get('total_files')}")
    print(f"Total Commits: {stats.get('total_commits')}")
    print(f"Stars: {stats.get('stars')}")
    
    if stats.get('total_files', 0) > 0:
        print("\n✅ SUCCESS! GitHub connection is working!")
        print("🚀 Your autonomous evolution system now has REAL data access!")
    else:
        print("\n❌ Still showing 0 files - connection issue persists")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
