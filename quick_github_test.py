#!/usr/bin/env python3
"""
Quick GitHub Token Test
"""

from github_real_analyzer import get_github_analyzer

print("🔍 TESTING GITHUB CONNECTION")
print("=" * 40)

try:
    analyzer = get_github_analyzer()
    stats = analyzer.get_repository_stats()
    
    print(f"Connection Status: {stats.get('connection_status')}")
    print(f"Total Files: {stats.get('total_files')}")
    print(f"Repository: {stats.get('repository')}")
    
    if stats.get('error_message'):
        print(f"❌ Error: {stats.get('error_message')}")
        print(f"🔧 Fix: {stats.get('fix_instructions')}")
    elif stats.get('total_files') > 0:
        print("✅ GitHub API working - real data retrieved!")
    else:
        print("⚠️ GitHub API connected but no files found")
        
except Exception as e:
    print(f"💥 Test failed: {e}")
