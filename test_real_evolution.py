#!/usr/bin/env python3
"""
🔥 TEST REAL AUTONOMOUS EVOLUTION SYSTEM 🔥
This script tests the REAL evolution engine to make sure it works properly
"""

import os
import sys
import json

def test_real_evolution():
    """Test the real autonomous evolution system"""
    print("🔥 TESTING REAL AUTONOMOUS EVOLUTION SYSTEM")
    print("=" * 60)
    
    try:
        # Import the real evolution engine
        from real_autonomous_evolution import real_autonomous_evolution
        print("✅ Successfully imported real_autonomous_evolution")
        
        # Run the evolution
        print("\n🚀 Running real autonomous evolution...")
        result = real_autonomous_evolution.run_real_autonomous_evolution()
        
        print("\n📊 EVOLUTION RESULTS:")
        print(f"Success: {result['success']}")
        
        if result['success']:
            print(f"Files improved: {result['files_improved']}")
            print(f"Commits made: {result['commits_made']}")
            print(f"Evolution target: {result['evolution_target']}")
            print(f"Improvements: {json.dumps(result['improvements'], indent=2)}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}")
            
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        print("Make sure real_autonomous_evolution.py exists and is valid")
        
    except Exception as e:
        print(f"❌ Execution failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_real_evolution()
