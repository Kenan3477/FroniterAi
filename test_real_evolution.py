#!/usr/bin/env python3
"""
Test Real Evolution System
Verify that the real evolution engine is actually working and committing changes
"""

import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from real_evolution_engine import RealEvolutionEngine
import time

def test_real_evolution():
    """Test that the real evolution engine actually works"""
    print("🧬 Testing Real Evolution Engine...")
    
    # Initialize the engine
    evolution_engine = RealEvolutionEngine()
    
    # Wait for initialization
    time.sleep(5)
    
    # Get real metrics
    metrics = evolution_engine.get_real_metrics()
    print(f"📊 Real Metrics: {metrics}")
    
    # Test implementing a user task
    print("\n🎯 Testing user task implementation...")
    task_id = evolution_engine.implement_user_task("Improve system documentation and add test comments")
    print(f"✅ Task submitted with ID: {task_id}")
    
    # Wait and check progress
    time.sleep(10)
    
    # Get evolution logs
    logs = evolution_engine.get_evolution_logs(limit=5)
    print(f"\n📝 Recent Evolution Activity:")
    for log in logs:
        print(f"  - {log['action_type']}: {log['description']}")
        if log.get('commit_hash'):
            print(f"    Commit: {log['commit_hash']}")
    
    print("\n✅ Real Evolution Test Complete!")
    print("📋 Summary:")
    print(f"  - Evolution Score: {metrics.get('evolution_score', 'N/A')}")
    print(f"  - Tasks Completed: {metrics.get('tasks_completed', 'N/A')}")
    print(f"  - Git Commits: {metrics.get('commits_made', 'N/A')}")
    print(f"  - System Uptime: {metrics.get('system_uptime', 'N/A')} hours")

if __name__ == "__main__":
    test_real_evolution()
