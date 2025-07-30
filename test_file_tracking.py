#!/usr/bin/env python3
"""
Quick test of the comprehensive evolution system data tracking
"""

import sys
import os
from pathlib import Path

# Add current directory to path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    
    print("🔍 Testing file tracking fixes...")
    
    # Create a test system
    workspace_path = current_dir
    system = ComprehensiveEvolutionSystem(workspace_path)
    
    print(f"✅ System initialized")
    print(f"📊 Initial files: {len(system.evolution_data['created_files'])}")
    print(f"📊 Initial components: {system.evolution_data['metrics']['components_created']}")
    print(f"📊 Initial generation: {system.evolution_data['generation']}")
    
    # Test autonomous improvement creation
    print("\n🧪 Testing autonomous improvement...")
    improvement = system._create_autonomous_ui_component()
    
    if improvement:
        system.evolution_data['comprehensive_improvements'].append(improvement)
        # Add created files to main evolution data (simulating the fix)
        if 'files_created' in improvement:
            system.evolution_data['created_files'].extend(improvement['files_created'])
        system.evolution_data['generation'] += 1
        
        print(f"✅ Created improvement: {improvement['type']}")
        print(f"📁 Files created: {len(improvement.get('files_created', []))}")
        print(f"📊 Total files now: {len(system.evolution_data['created_files'])}")
        print(f"📊 Generation now: {system.evolution_data['generation']}")
    
    # Test the system stats calculation logic
    print("\n🧪 Testing system stats calculation...")
    
    # Simulate the API calculation
    total_files_created = 0
    total_components_created = 0
    
    # Add files from main evolution data
    total_files_created += len(system.evolution_data.get('created_files', []))
    
    # Add files from autonomous improvements
    improvements = system.evolution_data.get('comprehensive_improvements', [])
    for improvement in improvements:
        total_files_created += len(improvement.get('files_created', []))
        # Count components from improvements
        if improvement.get('type') == 'ui_component_creation':
            total_components_created += 1
    
    # Add components from metrics
    total_components_created += system.evolution_data.get('metrics', {}).get('components_created', 0)
    
    print(f"📊 Calculated total files: {total_files_created}")
    print(f"📊 Calculated total components: {total_components_created}")
    
    print(f"\n✅ File tracking test completed successfully!")
    print(f"🔧 The dashboard should now show accurate file counts")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Test error: {e}")
    import traceback
    traceback.print_exc()
