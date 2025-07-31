#!/usr/bin/env python3
"""
Deploy Updated Heartbeat Monitor to Railway
Forces a redeploy with the new heartbeat monitoring features
"""

import os
import sys
import time
import subprocess
from pathlib import Path

def deploy_heartbeat_monitor():
    """Deploy the updated system with heartbeat monitor to Railway"""
    print("🚀 Deploying GitHub Heartbeat Monitor to Railway...")
    print("=" * 60)
    
    workspace_path = Path(__file__).parent
    
    # Check if we're in a git repository
    print("1️⃣ Checking Git repository status...")
    try:
        result = subprocess.run(['git', 'status', '--porcelain'], 
                              capture_output=True, text=True, cwd=workspace_path)
        if result.stdout.strip():
            print("📝 Found uncommitted changes:")
            print(result.stdout)
        else:
            print("✅ Working directory is clean")
    except Exception as e:
        print(f"⚠️ Git check failed: {e}")
    
    # Add and commit changes
    print("\n2️⃣ Committing heartbeat monitor changes...")
    try:
        subprocess.run(['git', 'add', '.'], cwd=workspace_path, check=True)
        subprocess.run(['git', 'commit', '-m', 'Add GitHub Heartbeat Monitor integration'], 
                      cwd=workspace_path, check=True)
        print("✅ Changes committed")
    except subprocess.CalledProcessError as e:
        print(f"⚠️ Commit failed (might be no changes): {e}")
    
    # Push to trigger Railway redeploy
    print("\n3️⃣ Pushing to trigger Railway redeploy...")
    try:
        subprocess.run(['git', 'push'], cwd=workspace_path, check=True)
        print("✅ Changes pushed to repository")
        print("🔄 Railway should automatically redeploy...")
    except subprocess.CalledProcessError as e:
        print(f"❌ Push failed: {e}")
        return False
    
    print("\n4️⃣ Monitoring deployment...")
    print("🌐 Your Railway app should redeploy with the heartbeat monitor")
    print("💓 New features:")
    print("   - GitHub Connection status indicator")
    print("   - Repository file count display")
    print("   - Real-time heartbeat monitoring")
    print("   - Git status information")
    print("   - Live connection health updates")
    
    print(f"\n🎯 Check your Railway dashboard in a few minutes:")
    print(f"   - Evolution section should show GitHub connection status")
    print(f"   - Heartbeat monitor will update every 5 seconds")
    print(f"   - Repository stats will be displayed in real-time")
    
    return True

def show_local_test():
    """Show how to test locally before deployment"""
    print("\n🧪 To test locally before deployment:")
    print("python app.py")
    print("Then visit: http://localhost:8889")
    print("Look for the new 'GitHub Connection Monitor' section")

if __name__ == "__main__":
    print("💓 GitHub Heartbeat Monitor Deployment")
    print("=" * 40)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--test-local":
        show_local_test()
    else:
        success = deploy_heartbeat_monitor()
        if success:
            print("\n🎉 Deployment initiated successfully!")
            print("⏰ Railway redeploy should complete in 2-3 minutes")
        else:
            print("\n❌ Deployment failed - check errors above")
        
        show_local_test()
