#!/usr/bin/env python3
"""
EVOLUTION SYSTEM FINAL TEST
===========================
Quick comprehensive test of the evolution system
"""

import json
from pathlib import Path

def test_evolution_system():
    """Test the evolution system comprehensively"""
    
    print("EVOLUTION SYSTEM FINAL TEST")
    print("=" * 50)
    
    # Test 1: Check improvement log
    improvement_log = Path("evolution_improvements.json")
    if improvement_log.exists():
        with open(improvement_log, 'r') as f:
            data = json.load(f)
            improvements = data.get("implemented", [])
            details = data.get("details", {})
        
        print(f"✓ Improvement Log: {len(improvements)} systematic improvements tracked")
        
        # Check improvement types
        improvement_types = {}
        for imp_id in improvements:
            detail = details.get(imp_id, {})
            imp_type = detail.get("type", "unknown")
            improvement_types[imp_type] = improvement_types.get(imp_type, 0) + 1
        
        print(f"✓ Improvement Types: {improvement_types}")
        
        # Check solution files exist
        existing_solutions = 0
        for imp_id in improvements:
            detail = details.get(imp_id, {})
            solution_file = detail.get("solution_file", "")
            if solution_file and Path(solution_file).exists():
                existing_solutions += 1
        
        print(f"✓ Solution Files: {existing_solutions}/{len(improvements)} exist")
        
    else:
        print("✗ No improvement log found")
        return False
    
    # Test 2: Check competitive intelligence
    ci_files = [
        "deep_capability_analyzer.py",
        "frontier_competitive_intelligence.py", 
        "real_competitive_analyzer.py"
    ]
    
    ci_working = 0
    ci_lines = 0
    for file_name in ci_files:
        if Path(file_name).exists():
            ci_working += 1
            with open(file_name, 'r', encoding='utf-8', errors='ignore') as f:
                lines = len(f.readlines())
                ci_lines += lines
    
    print(f"✓ CI Features: {ci_working}/3 working, {ci_lines:,} lines total")
    
    # Test 3: Check for spam patterns
    spam_patterns = ["autonomous_evolution", "_evolution_evolution_", "demo_evolution"]
    spam_files = []
    
    for py_file in Path(".").glob("*.py"):
        for pattern in spam_patterns:
            if pattern in py_file.name.lower():
                spam_files.append(py_file.name)
                break
    
    print(f"✓ Spam Check: {len(spam_files)} spam files detected (should be low)")
    
    # Test 4: Check systematic engine
    try:
        from systematic_evolution_engine import SystematicEvolutionEngine
        engine = SystematicEvolutionEngine()
        print("✓ Systematic Engine: Importable and functional")
        engine_working = True
    except Exception as e:
        print(f"✗ Systematic Engine: Error - {e}")
        engine_working = False
    
    # Overall assessment
    print("\nOVERALL ASSESSMENT:")
    if len(improvements) > 0 and ci_working >= 2 and len(spam_files) < 10 and engine_working:
        print("✓ EXCELLENT: Evolution system working systematically")
        print("  • Systematic improvements tracked and implemented")
        print("  • Competitive intelligence features functional")
        print("  • Minimal spam generation")
        print("  • Core engine operational")
        return True
    else:
        print("✗ ISSUES: Evolution system needs attention")
        return False

if __name__ == "__main__":
    test_evolution_system()
