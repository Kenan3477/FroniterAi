#!/usr/bin/env python3
"""
Test Market Analysis Integration with Evolution System
"""

import os
import sys
import asyncio
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_market_integration():
    """Test the market analysis integration with evolution system"""
    print("🧪 Testing Market Analysis Integration...")
    
    try:
        # Import the comprehensive evolution system
        from comprehensive_evolution_system import ComprehensiveEvolutionSystem
        print("✅ Successfully imported ComprehensiveEvolutionSystem")
        
        # Initialize the system
        workspace_path = Path(__file__).parent
        system = ComprehensiveEvolutionSystem(workspace_path)
        print("✅ Successfully initialized evolution system")
        
        # Check if market analyzer is available
        if system.market_analyzer:
            print("✅ Market analyzer is available")
            
            # Test market insights
            print("\n📊 Testing market insights...")
            insights = await system.get_market_insights()
            print(f"Market insights status: {insights['status']}")
            
            if insights['status'] == 'success':
                print("✅ Market insights retrieved successfully")
                print(f"Trending technologies: {len(insights['insights'].get('technologies', []))}")
                print(f"Recommendations: {len(insights['insights'].get('recommendations', []))}")
            
            # Test market-driven task generation
            print("\n🎯 Testing market-driven task generation...")
            tasks = await system.generate_market_driven_tasks()
            print(f"Generated {len(tasks)} market-driven tasks")
            
            for task in tasks[:3]:  # Show first 3 tasks
                print(f"  - {task['title']}: {task['description']}")
            
        else:
            print("⚠️ Market analyzer not available")
        
        # Test system stats with market data
        print("\n📈 Testing system stats with market integration...")
        stats = system.get_system_stats()
        
        print(f"System running: {stats.get('system_running', False)}")
        print(f"Market analysis status: {stats.get('market_analysis', {}).get('status', 'Unknown')}")
        print(f"Market-driven improvements: {stats.get('market_analysis', {}).get('market_driven_improvements', 0)}")
        print(f"Trending technologies: {len(stats.get('market_analysis', {}).get('trending_technologies', []))}")
        
        print("\n✅ All integration tests completed successfully!")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure market_analysis.py is in the same directory")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Run the test
    asyncio.run(test_market_integration())
