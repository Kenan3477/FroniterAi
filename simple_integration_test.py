#!/usr/bin/env python3
"""
Simple Market Integration Test
"""

print("🧪 Testing Market Analysis Integration...")

try:
    from comprehensive_evolution_system import ComprehensiveEvolutionSystem
    print("✅ Evolution system imported successfully")
    
    system = ComprehensiveEvolutionSystem(".")
    print("✅ Evolution system initialized")
    
    if system.market_analyzer:
        print("✅ Market analyzer is available")
    else:
        print("⚠️ Market analyzer not available")
    
    # Test get_system_stats with market data
    stats = system.get_system_stats()
    print(f"✅ System stats retrieved")
    print(f"Market analysis status: {stats.get('market_analysis', {}).get('status', 'Unknown')}")
    
    print("✅ Integration test completed successfully!")

except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
