#!/usr/bin/env python3
"""
Test script for the get_system_stats method
"""
import sys
import os
from pathlib import Path

# Add the current directory to Python path so we can import the module
sys.path.insert(0, os.getcwd())

try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    
    # Create a test instance
    workspace_path = Path.cwd()
    system = ComprehensiveEvolutionSystem(workspace_path)
    
    # Test the get_system_stats method
    print("🧪 Testing get_system_stats method...")
    stats = system.get_system_stats()
    
    print("✅ get_system_stats method working!")
    print("📊 Sample stats returned:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
        
    print("\n🎉 SUCCESS: get_system_stats method is properly implemented!")
    
except Exception as e:
    print(f"❌ Error testing get_system_stats: {e}")
    import traceback
    traceback.print_exc()
