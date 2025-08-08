"""
Test Script for GitHub Integration in the Code Analyzer
This script tests the GitHub repository analysis functionality specifically for Railway deployment.
"""

import os
import sys
import json
import tempfile
from datetime import datetime

# Add the current directory to the path to import code_analyzer
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import our code analyzer
from code_analyzer import CodeAnalyzer, RailwayEnvironmentAdapter

def test_github_analysis_for_railway():
    """Test GitHub repository analysis with Railway-specific optimizations"""
    # GitHub repository to analyze (public repo for testing)
    github_repo = "Kenan3477/FroniterAi"  # Replace with your actual repository
    
    print(f"🚂 Testing GitHub repository analysis for Railway deployment: {github_repo}")
    
    # Create a temporary directory for the cloned repo
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Initialize analyzer with GitHub repo info
            analyzer = CodeAnalyzer(temp_dir, github_repo=github_repo)
            analyzer.is_railway = True  # Simulate Railway environment
            
            # Get repository info from GitHub API
            print("📊 Fetching repository information from GitHub API...")
            repo_info = analyzer.get_github_repo_info()
            if not repo_info:
                print("❌ Failed to fetch repository information")
                return False
                
            print(f"✅ Repository info retrieved: {repo_info.get('name')} - {repo_info.get('description')}")
            
            # Clone the repository
            print("📥 Cloning repository...")
            analyzer.clone_github_repo(target_dir=temp_dir)
            print(f"✅ Repository cloned to: {temp_dir}")
            
            # Run analysis
            print("🔍 Running code analysis...")
            results = analyzer.scan_repository()
            
            # Set up output paths for Railway
            output_dir = RailwayEnvironmentAdapter.setup_analysis_dir()
            
            # Generate timestamp for unique filenames
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            repo_slug = github_repo.replace('/', '_')
            output_md = os.path.join(output_dir, f"{repo_slug}_{timestamp}_analysis.md")
            output_json = os.path.join(output_dir, f"{repo_slug}_{timestamp}_analysis.json")
            
            # Generate report and save results
            print("📝 Generating report...")
            analyzer.generate_report(output_md)
            analyzer.save_results(output_json)
            
            # Get summary statistics
            summary = analyzer.get_summary_stats()
            print("\n📊 Analysis Summary:")
            print(f"- Files analyzed: {summary.get('files_analyzed', 0)}")
            print(f"- Lines of code: {summary.get('total_lines', 0)}")
            print(f"- Issues found: {summary.get('total_issues', 0)}")
            print(f"- Improvement opportunities: {summary.get('total_opportunities', 0)}")
            
            print(f"\n✅ Analysis completed successfully")
            print(f"- Report saved to: {output_md}")
            print(f"- Data saved to: {output_json}")
            
            # Test getting commit history
            print("\n📜 Fetching commit history...")
            commits = analyzer.get_github_commit_history(limit=5)
            if commits:
                print(f"✅ Retrieved {len(commits)} commits")
                for i, commit in enumerate(commits[:3], 1):
                    sha = commit.get('sha', '')[:7]
                    message = commit.get('commit', {}).get('message', '').split('\n')[0]
                    author = commit.get('commit', {}).get('author', {}).get('name', 'Unknown')
                    print(f"  {i}. [{sha}] {message} (by {author})")
            else:
                print("❌ Failed to fetch commit history")
            
            return True
        except Exception as e:
            print(f"❌ Error during GitHub analysis for Railway: {str(e)}")
            return False

if __name__ == "__main__":
    print("🚂 RAILWAY INTEGRATION TEST - GitHub Repository Analysis 🚂")
    print("="*60 + "\n")
    
    # Test Railway environment adapter
    print("🔧 Testing Railway environment configuration...")
    is_railway = RailwayEnvironmentAdapter.is_railway_environment()
    print(f"- Is Railway environment: {is_railway}")
    repo_path = RailwayEnvironmentAdapter.get_repo_path()
    print(f"- Repository path: {repo_path}")
    analysis_dir = RailwayEnvironmentAdapter.setup_analysis_dir()
    print(f"- Analysis directory: {analysis_dir}")
    
    print("\n" + "="*60 + "\n")
    
    # Test GitHub repository analysis for Railway
    success = test_github_analysis_for_railway()
    
    if success:
        print("\n🎉 Railway integration tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Railway integration tests failed")
        sys.exit(1)
