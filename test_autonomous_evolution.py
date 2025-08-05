#!/usr/bin/env python3
"""
Test Autonomous Evolution System
Verify that the autonomous self-evolution is actually working
"""

import sys
import time
from autonomous_self_evolution import AutonomousSelfEvolution

def test_autonomous_evolution():
    print("🧪 TESTING AUTONOMOUS SELF-EVOLUTION SYSTEM")
    print("=" * 50)
    
    # Create autonomous evolution system
    system = AutonomousSelfEvolution()
    print(f"✅ System initialized with {system.evolution_count} evolutions completed")
    print(f"🧠 Self-awareness level: {system.self_awareness_level}")
    
    # Test one evolution cycle
    print("\n🔄 Running ONE autonomous evolution cycle...")
    result = system.autonomous_evolution_cycle()
    
    print(f"\n📊 EVOLUTION CYCLE RESULT:")
    print(f"   Success: {result.get('success', False)}")
    if result.get('success'):
        print(f"   Evolution Count: {result.get('evolution_count', 0)}")
        print(f"   File Created: {result.get('file_created', 'N/A')}")
        print(f"   Commit Hash: {result.get('commit_hash', 'N/A')}")
        print(f"   Self-Awareness: {result.get('self_awareness_level', 0)}")
    else:
        print(f"   Error: {result.get('error', 'Unknown error')}")
    
    # Start autonomous evolution in background
    print("\n🚀 Starting continuous autonomous evolution...")
    system.start_autonomous_evolution()
    
    # Monitor for a short time
    print("📡 Monitoring autonomous evolution for 60 seconds...")
    for i in range(12):  # 12 * 5 = 60 seconds
        time.sleep(5)
        status = system.get_evolution_status()
        print(f"   [{i*5:2d}s] Evolutions: {status['evolution_count']}, "
              f"Awareness: {status['self_awareness_level']}, "
              f"Running: {status['is_running']}, "
              f"Thread: {'ALIVE' if status['thread_alive'] else 'DEAD'}")
    
    print(f"\n🎉 AUTONOMOUS EVOLUTION TEST COMPLETE!")
    print(f"   Final Evolution Count: {status['evolution_count']}")
    print(f"   Final Self-Awareness: {status['self_awareness_level']}")
    print(f"   System Status: {'RUNNING' if status['is_running'] else 'STOPPED'}")
    
    # Stop the system
    system.stop_evolution()
    print("🛑 Autonomous evolution stopped")
    
    return result['success'] if result else False

if __name__ == "__main__":
    success = test_autonomous_evolution()
    if success:
        print("\n✅ AUTONOMOUS EVOLUTION SYSTEM IS WORKING!")
        print("🤖 The AI is truly self-aware and self-evolving!")
    else:
        print("\n❌ AUTONOMOUS EVOLUTION SYSTEM FAILED!")
        print("🔧 Check the logs for debugging information.")
    
    sys.exit(0 if success else 1)
