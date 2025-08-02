#!/usr/bin/env python3
"""
Test Basic System Stats Integration
"""

import traceback

print("🧪 Testing Basic Integration...")

try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    print("✅ Imported ComprehensiveEvolutionSystem")
    
    # Initialize system
    system = ComprehensiveEvolutionSystem(".")
    print("✅ Initialized system")
    
    # Test system stats
    stats = system.get_system_stats()
    print("✅ Retrieved system stats")
    
    # Print relevant info
    print(f"System running: {stats.get('system_running', False)}")
    print(f"Uptime hours: {stats.get('uptime_hours', 0)}")
    print(f"Files created: {stats.get('files_created', 0)}")
    print(f"Components built: {stats.get('components_built', 0)}")
    
    # Check market analysis section
    market_info = stats.get('market_analysis', {})
    print(f"\nMarket Analysis:")
    print(f"  Status: {market_info.get('status', 'Unknown')}")
    print(f"  Last analysis: {market_info.get('last_analysis', 'Never')}")
    print(f"  Trending technologies: {len(market_info.get('trending_technologies', []))}")
    print(f"  Market-driven improvements: {market_info.get('market_driven_improvements', 0)}")
    
    print("\n✅ All tests passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()
