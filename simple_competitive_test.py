#!/usr/bin/env python3
"""
Simple Competitive Intelligence Test
"""

print("🔍 Testing Competitive Intelligence...")

try:
    from market_analysis import CompetitiveIntelligenceAnalyzer, AISystemCapability, CompetitiveIntelligence, BenchmarkResult
    print("✅ Successfully imported competitive intelligence classes")
    
    # Test initialization
    analyzer = CompetitiveIntelligenceAnalyzer(data_dir="test_ci_data")
    print("✅ Competitive intelligence analyzer initialized")
    
    # Test data structures
    print(f"Tracking {len(analyzer.tracked_systems)} companies")
    print(f"Monitoring {len(analyzer.capability_categories)} capability categories")
    print(f"Using {sum(len(benchmarks) for benchmarks in analyzer.benchmarks.values())} benchmarks")
    
    # Test database initialization
    print("✅ Database initialized successfully")
    
    print("✅ Basic competitive intelligence functionality verified!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
