#!/usr/bin/env python3
"""
🔧 REAL GITHUB AI - APPLY IMPROVEMENTS
=====================================
This will actually apply real improvements to your repository.
"""

from real_github_ai import RealGitHubConnectedAI
import subprocess

def main():
    print("🔧 APPLYING REAL IMPROVEMENTS TO YOUR REPOSITORY")
    print("=" * 60)
    
    # Get repository info
    result = subprocess.run(['git', 'remote', 'get-url', 'origin'], capture_output=True, text=True)
    if result.returncode == 0:
        remote_url = result.stdout.strip()
        if 'github.com' in remote_url:
            # Parse owner/repo from URL
            if remote_url.startswith('git@github.com:'):
                repo_part = remote_url.split('git@github.com:')[1].replace('.git', '')
            elif 'github.com/' in remote_url:
                repo_part = remote_url.split('github.com/')[1].replace('.git', '')
            
            repo_owner, repo_name = repo_part.split('/')
            
            # Initialize AI
            ai = RealGitHubConnectedAI(repo_owner, repo_name)
            
            # Get analysis
            analysis = ai.analyze_real_repository()
            
            # Show top issues
            print(f"\n📊 TOP IMPROVEMENT OPPORTUNITIES:")
            for i, improvement in enumerate(analysis["improvement_opportunities"][:10], 1):
                print(f"   {i}. {improvement['description']} ({improvement['severity']} priority)")
            
            # Apply top 3 improvements
            print(f"\n🔧 APPLYING TOP 3 IMPROVEMENTS:")
            applied = 0
            for improvement in analysis["improvement_opportunities"][:3]:
                if improvement["implementable"]:
                    print(f"\n   Applying: {improvement['description']}")
                    result = ai.implement_real_improvement(improvement)
                    if result.success:
                        applied += 1
                        print(f"   ✅ Successfully applied to {result.file_path}")
                    else:
                        print(f"   ❌ Failed: {result.reasoning}")
            
            # Commit changes
            if applied > 0:
                print(f"\n📤 COMMITTING {applied} IMPROVEMENTS TO GITHUB...")
                if ai.commit_improvements_to_github():
                    print(f"✅ Successfully committed {applied} real improvements!")
                    print(f"   Check your GitHub repository to see the changes.")
                else:
                    print(f"❌ Failed to commit changes")
            else:
                print(f"\n⚠️ No improvements were successfully applied")
            
            return ai
    
    return None

if __name__ == "__main__":
    main()
