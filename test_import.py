#!/usr/bin/env python3
"""Test import of comprehensive_evolution_system module"""

try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    print("✅ SUCCESS: Module imported successfully!")
    
    # Test if get_system_stats method exists
    if hasattr(ComprehensiveEvolutionSystem, 'get_system_stats'):
        print("✅ SUCCESS: get_system_stats method exists!")
    else:
        print("❌ ERROR: get_system_stats method not found!")
        
except SyntaxError as e:
    print(f"❌ SYNTAX ERROR: {e}")
    print("❌ File has malformed content preventing import")
except ImportError as e:
    print(f"❌ IMPORT ERROR: {e}")
except Exception as e:
    print(f"❌ OTHER ERROR: {e}")
