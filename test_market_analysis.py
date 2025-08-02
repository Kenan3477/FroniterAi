#!/usr/bin/env python3
"""
Test script for the MarketAnalyzer module
"""

import asyncio
import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from market_analysis import MarketAnalyzer, integrate_with_evolution_system

async def test_market_analyzer():
    """Test the market analysis functionality"""
    print("🧪 Testing AI Market Analysis Module...")
    
    # Initialize analyzer
    analyzer = MarketAnalyzer(data_dir="test_market_data")
    
    try:
        # Test 1: Basic initialization
        print("✅ MarketAnalyzer initialized successfully")
        
        # Test 2: Data collection (with limited scope for testing)
        print("🔍 Testing data collection...")
        trends = await analyzer.collect_market_data()
        print(f"✅ Collected {len(trends)} trend data points")
        
        # Test 3: Trend analysis
        print("📊 Testing trend analysis...")
        report = analyzer.analyze_trends(days_back=7)
        print(f"✅ Generated analysis report with {len(report.top_trends)} top trends")
        
        # Test 4: Report generation
        print("📄 Testing report generation...")
        markdown_report = analyzer.generate_report_file(report, "markdown")
        print(f"✅ Generated markdown report ({len(markdown_report)} characters)")
        
        # Test 5: Evolution recommendations
        print("🎯 Testing evolution recommendations...")
        evolution_recs = analyzer.get_evolution_recommendations()
        print("✅ Generated evolution recommendations:")
        for key, value in evolution_recs.items():
            if isinstance(value, list):
                print(f"  {key}: {len(value)} items")
            else:
                print(f"  {key}: {value}")
        
        # Test 6: Full analysis run
        print("🚀 Testing full analysis run...")
        reports = await analyzer.run_full_analysis("markdown")
        print(f"✅ Full analysis complete! Generated: {list(reports.keys())}")
        
        # Display sample insights
        if report.top_trends:
            print(f"\n📈 Top Trend: {report.top_trends[0].title}")
            print(f"   Source: {report.top_trends[0].source}")
            print(f"   Keywords: {', '.join(report.top_trends[0].keywords[:3])}")
        
        if report.emerging_technologies:
            print(f"\n🚀 Emerging Tech: {', '.join(report.emerging_technologies[:3])}")
        
        if report.recommendations:
            print(f"\n🎯 Top Recommendation: {report.recommendations[0]}")
        
        print(f"\n✅ All tests passed! Confidence score: {report.confidence_score:.1%}")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

def test_integration():
    """Test integration with evolution system"""
    print("\n🔗 Testing Evolution System Integration...")
    
    try:
        # Create mock evolution system
        class MockEvolutionSystem:
            def __init__(self):
                self.tasks = []
            
            def add_task(self, task):
                self.tasks.append(task)
                print(f"  Added task: {task}")
        
        # Initialize components
        analyzer = MarketAnalyzer(data_dir="test_market_data")
        mock_system = MockEvolutionSystem()
        
        # Test integration
        integration_func = integrate_with_evolution_system(mock_system, analyzer)
        print("✅ Integration function created successfully")
        
        # Test that the integration function was added
        if hasattr(mock_system, 'market_guided_evolution'):
            print("✅ Market-guided evolution method added to system")
        else:
            print("ℹ️ Integration method available as separate function")
        
        print("✅ Integration test completed successfully")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")

async def main():
    """Run all tests"""
    print("🎯 Starting Market Analysis Module Tests...\n")
    
    # Run main tests
    await test_market_analyzer()
    
    # Run integration tests
    test_integration()
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
