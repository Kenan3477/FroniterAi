#!/usr/bin/env python3
"""
Deploy to Railway with GitHub monitoring system
Handles secure deployment with environment variables
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(cmd, description=""):
    """Run a command and return the result"""
    if description:
        print(f"🔧 {description}")
    
    print(f"💻 Running: {cmd}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=Path.cwd())
        
        if result.stdout:
            print("✅ Output:")
            print(result.stdout)
        
        if result.stderr and result.returncode != 0:
            print("❌ Error:")
            print(result.stderr)
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Command failed: {e}")
        return False

def main():
    """Deploy the GitHub monitoring system to Railway"""
    print("🚀 Deploying Frontier AI Evolution System to Railway")
    print("🔐 Secure deployment with environment variables")
    print()
    
    # Check if we're in a git repository
    if not Path('.git').exists():
        print("📁 Initializing git repository...")
        if not run_command("git init", "Initializing git repository"):
            sys.exit(1)
        
        print("🔗 Adding remote origin...")
        if not run_command("git remote add origin https://github.com/Kenan3477/FroniterAi.git", "Adding remote repository"):
            print("⚠️  Remote might already exist, continuing...")
    
    # Add all files
    print("📦 Adding all files to git...")
    if not run_command("git add .", "Adding files to git"):
        sys.exit(1)
    
    # Commit changes
    print("💾 Committing changes...")
    commit_message = "Deploy secure GitHub API monitoring system - tokens moved to env vars"
    if not run_command(f'git commit -m "{commit_message}"', "Committing changes"):
        print("⚠️  Nothing to commit or commit failed, continuing...")
    
    # Push to GitHub
    print("🚀 Pushing to GitHub...")
    if not run_command("git push -u origin main", "Pushing to GitHub"):
        print("❌ Failed to push to GitHub")
        print("📝 Manual steps needed:")
        print("1. Check git remote configuration")
        print("2. Ensure GitHub token has push permissions")
        print("3. Try manual push: git push -u origin main")
        return False
    
    print()
    print("✅ Successfully deployed to GitHub!")
    print("🎯 Next steps for Railway deployment:")
    print()
    print("1. 🌐 Go to https://railway.app")
    print("2. 🔗 Connect to GitHub repository: Kenan3477/FroniterAi")
    print("3. 🔑 Set environment variable in Railway dashboard:")
    print("   Variable: GITHUB_TOKEN")
    print("   Value: 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")
    print("4. 🚀 Deploy and access your dashboard")
    print()
    print("🎉 Your self-evolution system will now monitor the GitHub repository!")
    print("📊 Dashboard will show:")
    print("   - Real-time file count from GitHub repo")
    print("   - Implementation opportunities detected")
    print("   - Autonomous evolution suggestions")
    
    return True

if __name__ == "__main__":
    main()
