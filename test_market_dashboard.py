#!/usr/bin/env python3
"""
Test Market-Integrated Dashboard Startup
"""

print("🧪 Testing Market-Integrated Dashboard...")

try:
    from market_integrated_dashboard import MarketIntegratedDashboard
    print("✅ Successfully imported MarketIntegratedDashboard")
    
    # Initialize dashboard
    dashboard = MarketIntegratedDashboard(port=8892)  # Use different port
    print("✅ Dashboard initialized")
    
    # Test evolution system
    if dashboard.evolution_system:
        print("✅ Evolution system available")
        
        # Test market analyzer
        if dashboard.evolution_system.market_analyzer:
            print("✅ Market analyzer available")
        else:
            print("⚠️ Market analyzer not available")
        
        # Get system stats
        stats = dashboard.evolution_system.get_system_stats()
        market_info = stats.get('market_analysis', {})
        print(f"Market status: {market_info.get('status', 'Unknown')}")
        print(f"Market confidence: {market_info.get('confidence_score', 0)*100:.0f}%")
        
    else:
        print("⚠️ Evolution system not available")
    
    print("✅ Dashboard test completed successfully!")
    
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
