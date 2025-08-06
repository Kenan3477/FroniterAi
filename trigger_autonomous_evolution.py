#!/usr/bin/env python3
"""
🤖 TRIGGER AUTONOMOUS EVOLUTION 🤖
Force immediate autonomous code generation and Git commits
"""

import requests
import time
import json

def trigger_evolution():
    """Trigger immediate autonomous evolution with code generation"""
    print("🔥 TRIGGERING AUTONOMOUS EVOLUTION WITH CODE GENERATION...")
    
    try:
        # First check if the system is running
        response = requests.get('http://localhost:5000/api/system-pulse', timeout=10)
        if response.status_code == 200:
            print("✅ System is running and responsive")
            
            # Trigger evolution cycle
            evolution_response = requests.post('http://localhost:5000/api/force-evolution', timeout=30)
            if evolution_response.status_code == 200:
                print("🚀 AUTONOMOUS EVOLUTION TRIGGERED!")
                print("💡 Check your Git repository for new commits from the AI system")
                
                # Wait a moment and check Git status
                time.sleep(5)
                git_response = requests.get('http://localhost:5000/api/git-status', timeout=10)
                if git_response.status_code == 200:
                    git_data = git_response.json()
                    print(f"📊 Autonomous commits detected: {git_data.get('autonomous_commits_count', 0)}")
                    print(f"📈 Total commits: {len(git_data.get('recent_commits', []))}")
                    
                    # Show recent commits
                    print("\n🔗 RECENT COMMITS:")
                    for commit in git_data.get('recent_commits', [])[:5]:
                        icon = "🤖" if commit.get('autonomous') else "👤"
                        print(f"  {icon} {commit.get('hash', 'unknown')} - {commit.get('message', 'No message')}")
                
            else:
                print(f"❌ Evolution trigger failed: {evolution_response.status_code}")
                
        else:
            print(f"❌ System not responding: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to system. Make sure smart_main.py is running on port 5000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    trigger_evolution()
