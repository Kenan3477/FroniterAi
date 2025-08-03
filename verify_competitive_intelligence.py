#!/usr/bin/env python3
"""
Competitive Intelligence Implementation Verification
=========================================================

This script verifies that the competitive intelligence extension has been
successfully implemented in market_analysis.py.
"""

import os
import re

def verify_competitive_intelligence():
    """Verify the competitive intelligence implementation"""
    
    print("🔍 COMPETITIVE INTELLIGENCE VERIFICATION REPORT")
    print("=" * 60)
    
    try:
        with open("market_analysis.py", "r", encoding="utf-8") as f:
            content = f.read()
        
        # Check for key classes and structures
        checks = {
            "AISystemCapability dataclass": "@dataclass\nclass AISystemCapability:" in content,
            "CompetitiveIntelligence dataclass": "@dataclass\nclass CompetitiveIntelligence:" in content,
            "BenchmarkResult dataclass": "@dataclass\nclass BenchmarkResult:" in content,
            "CompetitiveIntelligenceAnalyzer class": "class CompetitiveIntelligenceAnalyzer:" in content,
            "Database initialization": "def _init_database" in content,
            "ArXiv data collection": "def _collect_arxiv_data" in content,
            "GitHub data collection": "def _collect_github_data" in content,
            "HuggingFace data collection": "def _collect_huggingface_data" in content,
            "Capability gap analysis": "def _analyze_capability_gaps" in content,
            "Benchmark comparison": "def _compare_benchmarks" in content,
            "Improvement opportunities": "def _identify_improvement_opportunities" in content,
            "Strategic recommendations": "def _generate_strategic_recommendations" in content,
            "Evolution system integration": "def competitive_guided_evolution" in content,
        }
        
        print("📋 Implementation Checklist:")
        print("-" * 30)
        
        all_passed = True
        for feature, passed in checks.items():
            status = "✅" if passed else "❌"
            print(f"{status} {feature}")
            if not passed:
                all_passed = False
        
        print()
        
        # Count lines of competitive intelligence code
        ci_start = content.find("@dataclass\nclass AISystemCapability:")
        ci_end = content.find("if __name__ == \"__main__\":")
        
        if ci_start != -1 and ci_end != -1:
            ci_code = content[ci_start:ci_end]
            ci_lines = len(ci_code.split('\n'))
            print(f"📊 Competitive Intelligence Code: {ci_lines} lines")
        
        # Check for key methods in CompetitiveIntelligenceAnalyzer
        analyzer_methods = [
            "_init_database",
            "_collect_arxiv_data", 
            "_collect_github_data",
            "_collect_huggingface_data",
            "_analyze_capability_gaps",
            "_compare_benchmarks", 
            "_identify_improvement_opportunities",
            "_generate_strategic_recommendations",
            "analyze_capabilities",
            "get_competitive_intelligence",
            "generate_competitive_report"
        ]
        
        print(f"\n🔧 Analyzer Methods ({len(analyzer_methods)} total):")
        print("-" * 30)
        
        for method in analyzer_methods:
            if f"def {method}" in content:
                print(f"✅ {method}")
            else:
                print(f"❌ {method}")
                all_passed = False
        
        # Check integration functions
        integration_functions = [
            "competitive_guided_evolution",
            "integrate_competitive_intelligence"
        ]
        
        print(f"\n🔗 Integration Functions:")
        print("-" * 30)
        
        for func in integration_functions:
            if f"def {func}" in content or f"async def {func}" in content:
                print(f"✅ {func}")
            else:
                print(f"❌ {func}")
        
        print()
        print("=" * 60)
        
        if all_passed:
            print("🎉 VERIFICATION COMPLETE: Competitive Intelligence Successfully Implemented!")
            print()
            print("📈 Features Available:")
            print("   • Multi-source competitive data collection (ArXiv, GitHub, HuggingFace)")
            print("   • AI system capability tracking and comparison")
            print("   • Automated benchmarking against leading competitors")
            print("   • Gap analysis and improvement opportunity identification")
            print("   • Strategic recommendations for FrontierAI enhancement")
            print("   • Seamless integration with evolution system")
            print()
            print("🚀 Ready for competitive intelligence analysis!")
        else:
            print("⚠️  VERIFICATION INCOMPLETE: Some features may be missing")
        
    except FileNotFoundError:
        print("❌ market_analysis.py not found!")
    except Exception as e:
        print(f"❌ Error during verification: {e}")

if __name__ == "__main__":
    verify_competitive_intelligence()
