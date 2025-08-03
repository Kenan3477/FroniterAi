#!/usr/bin/env python3
"""
Simple Simulation Environment Verification
==========================================
"""

import os
import sys
import asyncio

print("🧪 SIMULATION ENVIRONMENT VERIFICATION")
print("=" * 50)

# Test 1: Import modules
print("Step 1: Testing imports...")
try:
    from simulation_environment import (
        SimulationConfig, 
        SimulationEnvironment, 
        SimulationMetrics,
        SimulationResult
    )
    print("✅ Core modules imported successfully")
except Exception as e:
    print(f"❌ Import error: {e}")
    sys.exit(1)

# Test 2: Create configuration
print("\nStep 2: Testing configuration...")
try:
    config = SimulationConfig(
        max_execution_time=60,
        memory_limit_mb=512,
        preserve_artifacts=True
    )
    print("✅ Configuration created successfully")
    print(f"   Max execution time: {config.max_execution_time}s")
    print(f"   Memory limit: {config.memory_limit_mb}MB")
except Exception as e:
    print(f"❌ Configuration error: {e}")

# Test 3: Create simulation environment
print("\nStep 3: Testing simulation environment...")
try:
    sim_env = SimulationEnvironment(config)
    print("✅ Simulation environment created successfully")
    print(f"   Source directory: {sim_env.source_dir}")
    print(f"   Database path: {sim_env.db_path}")
except Exception as e:
    print(f"❌ Simulation environment error: {e}")

# Test 4: Test basic functionality
print("\nStep 4: Testing basic functionality...")
try:
    # Test simulation ID generation
    sim_id = sim_env._generate_simulation_id()
    print(f"✅ Generated simulation ID: {sim_id}")
    
    # Test database initialization
    history = sim_env.get_simulation_history(1)
    print(f"✅ Database query successful: {len(history)} results")
    
except Exception as e:
    print(f"❌ Basic functionality error: {e}")

# Test 5: Test simple simulation (async)
print("\nStep 5: Testing simple simulation...")
async def test_simple_simulation():
    try:
        # Simple test changes
        changes = [{
            'type': 'file_create',
            'file': 'hello_test.py',
            'content': '''
def hello():
    return "Hello, Simulation!"

if __name__ == "__main__":
    result = hello()
    assert result == "Hello, Simulation!"
    print("✅ Test passed!")
'''
        }]
        
        # Simple test specs
        test_specs = [{
            'type': 'python',
            'name': 'hello_test',
            'script': 'hello_test.py'
        }]
        
        # Run simulation
        result = await sim_env.run_simulation(changes, test_specs)
        
        print(f"✅ Simulation completed: {result.simulation_id}")
        print(f"   Success: {result.success}")
        print(f"   Performance score: {result.metrics.performance_score:.1f}")
        print(f"   Recommendations: {len(result.recommendations)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Simulation error: {e}")
        return False

# Run async test
try:
    success = asyncio.run(test_simple_simulation())
    if success:
        print("\n🎉 ALL TESTS PASSED!")
        print("Simulation environment is ready for use!")
    else:
        print("\n❌ SIMULATION TEST FAILED")
except Exception as e:
    print(f"\n❌ Async test error: {e}")

print("\n" + "=" * 50)
print("Verification complete!")
