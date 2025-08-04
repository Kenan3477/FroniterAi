# Create a local test file to check if the GitHub integration is working
import os
import sys
sys.path.append('.')

# Test environment variables
print("🔍 Testing Environment Variables...")
github_token = os.getenv('GITHUB_TOKEN')
print(f"GITHUB_TOKEN: {'✅ Set' if github_token else '❌ Not Set'}")

if github_token:
    print(f"Token starts with: {github_token[:10]}...")

# Test GitHub analyzer
try:
    from github_real_analyzer import GitHubRealTimeAnalyzer
    analyzer = GitHubRealTimeAnalyzer()
    
    print("\n🧬 Testing GitHub API Connection...")
    stats = analyzer.get_repository_stats()
    
    print(f"Connection Status: {stats.get('connection_status')}")
    print(f"Total Commits: {stats.get('total_commits')}")
    print(f"Total Files: {stats.get('total_files')}")
    print(f"Repository Size: {stats.get('repository_size')}")
    
    print("\n🎯 Testing Competitive Analysis...")
    analysis = analyzer.perform_competitive_analysis()
    print(f"Automation Level: {analysis['frontier_ai_capabilities']['automation_level']}%")
    print(f"Innovation Score: {analysis['frontier_ai_capabilities']['innovation_score']}%")
    print(f"Market Readiness: {analysis['frontier_ai_capabilities']['market_readiness']}%")
    
except Exception as e:
    print(f"❌ Error: {e}")
