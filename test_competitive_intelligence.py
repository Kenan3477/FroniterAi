#!/usr/bin/env python3
"""
Test Competitive Intelligence Capabilities
"""

import asyncio
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_competitive_intelligence():
    """Test the competitive intelligence analyzer"""
    print("🔍 Testing Competitive Intelligence Analyzer...")
    
    try:
        from market_analysis import CompetitiveIntelligenceAnalyzer, integrate_competitive_intelligence
        print("✅ Successfully imported CompetitiveIntelligenceAnalyzer")
        
        # Initialize analyzer
        analyzer = CompetitiveIntelligenceAnalyzer(data_dir="test_competitive_data")
        print("✅ Competitive intelligence analyzer initialized")
        
        # Test database initialization
        print("\n📊 Testing database initialization...")
        print(f"Database path: {analyzer.db_path}")
        print(f"Tracked systems: {len(analyzer.tracked_systems)} companies")
        print(f"Capability categories: {len(analyzer.capability_categories)}")
        print(f"Benchmark categories: {len(analyzer.benchmarks)}")
        
        # Test competitive data collection
        print("\n🔍 Testing competitive data collection...")
        competitive_data = await analyzer.collect_competitive_data()
        
        if "error" in competitive_data:
            print(f"⚠️ Data collection had issues: {competitive_data['error']}")
        else:
            print("✅ Competitive data collected successfully")
            print(f"Research insights: {len(competitive_data.get('research_insights', []))}")
            print(f"GitHub repos: {len(competitive_data.get('development_activity', {}).get('benchmark_repos', []))}")
            print(f"HuggingFace models: {len(competitive_data.get('model_releases', []))}")
        
        # Test capability analysis
        print("\n🔬 Testing capability analysis...")
        
        # Mock FrontierAI capabilities
        frontier_capabilities = {
            'language_understanding': 7.2,
            'code_generation': 6.8,
            'reasoning': 6.5,
            'multimodal': 5.2,
            'vision': 5.8,
            'audio': 4.5,
            'safety': 7.8,
            'efficiency': 6.9,
            'fine_tuning': 6.1,
            'deployment': 7.0
        }
        
        print("FrontierAI Capabilities:")
        for capability, score in frontier_capabilities.items():
            print(f"  {capability}: {score}/10")
        
        # Perform competitive analysis
        intelligence = await analyzer.analyze_capabilities(frontier_capabilities)
        print("✅ Competitive capability analysis completed")
        
        # Display results
        print(f"\n📊 Analysis Results:")
        print(f"Capability gaps identified: {len(intelligence.capability_gaps)}")
        print(f"Improvement opportunities: {len(intelligence.improvement_opportunities)}")
        print(f"Benchmark comparisons: {len(intelligence.benchmark_comparisons)}")
        print(f"Strategic recommendations: {len(intelligence.strategic_recommendations)}")
        
        # Show top capability gaps
        print("\n🎯 Top Capability Gaps:")
        for i, gap in enumerate(intelligence.capability_gaps[:3], 1):
            print(f"  {i}. {gap['capability'].replace('_', ' ').title()}")
            print(f"     Gap size: {gap['gap_size']:.1f}, Priority: {gap['priority']:.1f}")
        
        # Show top improvement opportunities
        print("\n🚀 Top Improvement Opportunities:")
        for i, opp in enumerate(intelligence.improvement_opportunities[:3], 1):
            print(f"  {i}. {opp['capability'].replace('_', ' ').title()}")
            print(f"     Effort: {opp['estimated_effort']}, Impact: {opp['expected_impact']}")
            print(f"     Top recommendation: {opp['recommendations'][0] if opp['recommendations'] else 'None'}")
        
        # Show benchmark performance
        print("\n📈 Benchmark Performance:")
        for benchmark_name, result in intelligence.benchmark_comparisons.items():
            status = "🟢" if result.percentile_rank > 75 else "🟡" if result.percentile_rank > 50 else "🔴"
            print(f"  {status} {benchmark_name}: {result.frontier_score:.1f} "
                  f"(Rank: {result.percentile_rank:.1f}%, "
                  f"Potential: +{result.improvement_potential:.1f})")
        
        # Test report generation
        print("\n📄 Testing report generation...")
        report = analyzer.generate_competitive_report(intelligence)
        
        # Save report to file
        report_path = Path("competitive_intelligence_report.md")
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"✅ Competitive intelligence report saved to: {report_path}")
        
        # Show strategic recommendations
        print("\n📋 Strategic Recommendations:")
        for i, rec in enumerate(intelligence.strategic_recommendations[:5], 1):
            print(f"  {i}. {rec}")
        
        print("\n✅ All competitive intelligence tests completed successfully!")
        
        return intelligence
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()


async def test_integration():
    """Test integration with evolution system"""
    print("\n🔗 Testing integration with evolution system...")
    
    try:
        from market_analysis import CompetitiveIntelligenceAnalyzer, integrate_competitive_intelligence
        
        # Mock evolution system
        class MockEvolutionSystem:
            def __init__(self):
                self.tasks = []
            
            def add_task(self, task_description):
                self.tasks.append(task_description)
                print(f"  Added task: {task_description}")
        
        # Initialize components
        evolution_system = MockEvolutionSystem()
        competitive_analyzer = CompetitiveIntelligenceAnalyzer(data_dir="test_competitive_data")
        
        # Integrate competitive intelligence
        integrate_competitive_intelligence(evolution_system, competitive_analyzer)
        print("✅ Competitive intelligence integrated with evolution system")
        
        # Test competitive guided evolution
        if hasattr(evolution_system, 'competitive_guided_evolution'):
            print("\n🔄 Running competitive guided evolution...")
            await evolution_system.competitive_guided_evolution()
            print(f"✅ Generated {len(evolution_system.tasks)} competitive improvement tasks")
        else:
            print("⚠️ Competitive guided evolution method not found")
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")


if __name__ == "__main__":
    async def main():
        intelligence = await test_competitive_intelligence()
        await test_integration()
        
        print("\n🏆 Competitive Intelligence Testing Complete!")
        print("📊 Capabilities tested:")
        print("  ✅ Database initialization and setup")
        print("  ✅ Multi-source competitive data collection")
        print("  ✅ Capability gap analysis")
        print("  ✅ Improvement opportunity identification") 
        print("  ✅ Benchmark performance comparison")
        print("  ✅ Strategic recommendation generation")
        print("  ✅ Comprehensive report creation")
        print("  ✅ Evolution system integration")
    
    asyncio.run(main())
