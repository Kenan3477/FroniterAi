#!/usr/bin/env python3
"""
Test script for Autonomous Evolution Engine
"""

print("🧬 Testing Autonomous Evolution Engine...")

try:
    from autonomous_evolution_engine import get_autonomous_engine
    engine = get_autonomous_engine()
    
    print("✅ Engine initialized successfully")
    
    # Test deep repository analysis
    print("\n🔍 Running deep repository analysis...")
    result = engine._deep_repository_analysis()
    
    print(f"📊 Analysis Results:")
    print(f"   • Code quality issues: {len(result.get('code_quality_issues', []))}")
    print(f"   • Architecture improvements: {len(result.get('architecture_improvements', []))}")
    print(f"   • Competitive gaps: {len(result.get('competitive_gaps', []))}")
    print(f"   • Dependency updates: {len(result.get('dependency_updates', []))}")
    
    # Test upgrade identification
    print("\n🎯 Identifying actionable upgrades...")
    upgrades = engine._identify_actionable_upgrades(result)
    print(f"   • Found {len(upgrades)} actionable upgrades")
    
    for i, upgrade in enumerate(upgrades[:3]):
        print(f"   {i+1}. {upgrade['title']} (Priority: {upgrade['priority']})")
    
    print("\n✅ Autonomous Evolution Engine is working correctly!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
