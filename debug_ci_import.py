#!/usr/bin/env python3
"""
Debug Competitive Intelligence Import
"""

import sys
print(f"Python version: {sys.version}")
print(f"Python path: {sys.path}")

print("🔍 Debugging Competitive Intelligence Import...")

try:
    print("Importing market_analysis module...")
    import market_analysis
    print(f"✅ market_analysis module imported: {type(market_analysis)}")
    
    print("Checking available classes...")
    classes = [name for name in dir(market_analysis) if not name.startswith('_')]
    print(f"Available classes/functions: {classes}")
    
    if hasattr(market_analysis, 'CompetitiveIntelligenceAnalyzer'):
        print("✅ CompetitiveIntelligenceAnalyzer found")
        analyzer = market_analysis.CompetitiveIntelligenceAnalyzer()
        print("✅ Analyzer instantiated successfully")
    else:
        print("❌ CompetitiveIntelligenceAnalyzer not found")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
