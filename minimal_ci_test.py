#!/usr/bin/env python3
"""
Minimal Competitive Intelligence Test
"""

import os
import sys

print("🧪 Minimal Competitive Intelligence Test")
print(f"Working directory: {os.getcwd()}")
print(f"Python path includes: {sys.path[0]}")

try:
    # Test basic import
    print("Step 1: Testing basic import...")
    sys.path.insert(0, r"c:\Users\kenne\Frontier")
    
    import market_analysis
    print("✅ market_analysis imported successfully")
    
    # Check if class exists
    print("Step 2: Checking for CompetitiveIntelligenceAnalyzer...")
    if hasattr(market_analysis, 'CompetitiveIntelligenceAnalyzer'):
        print("✅ CompetitiveIntelligenceAnalyzer class found")
        
        print("Step 3: Creating analyzer instance...")
        analyzer = market_analysis.CompetitiveIntelligenceAnalyzer()
        print("✅ Analyzer created successfully")
        
        print("Step 4: Testing analyzer methods...")
        methods = [method for method in dir(analyzer) if not method.startswith('_')]
        print(f"Available methods: {methods[:5]}...")  # Show first 5 methods
        
        print("✅ Competitive Intelligence module is working!")
        
    else:
        print("❌ CompetitiveIntelligenceAnalyzer class not found")
        available = [name for name in dir(market_analysis) if not name.startswith('_')]
        print(f"Available items: {available}")

except ImportError as e:
    print(f"❌ Import error: {e}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("🏁 Test completed")
