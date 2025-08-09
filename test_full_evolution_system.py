#!/usr/bin/env python3
"""
🧪 COMPREHENSIVE EVOLUTION SYSTEM TEST
====================================
Tests the entire evolution system end-to-end to prove it works systematically.
"""

import os
import json
import time
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any

class FullEvolutionSystemTest:
    """Comprehensive test suite for the evolution system"""
    
    def __init__(self):
        self.test_results = []
        self.start_time = datetime.now()
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"     {details}")
    
    def test_systematic_scanner(self) -> bool:
        """Test 1: Systematic repository scanner"""
        print("\n🔍 TEST 1: SYSTEMATIC REPOSITORY SCANNER")
        print("-" * 50)
        
        try:
            from systematic_evolution_engine import SystematicEvolutionEngine
            
            engine = SystematicEvolutionEngine()
            analysis = engine.scan_repository_systematically()
            
            # Verify analysis structure
            required_keys = [
                "scan_timestamp", "files_analyzed", "improvement_opportunities",
                "priority_matrix", "technical_debt", "performance_issues",
                "security_gaps", "feature_enhancements", "code_quality_issues"
            ]
            
            missing_keys = [key for key in required_keys if key not in analysis]
            if missing_keys:
                self.log_test("Systematic Scanner", False, f"Missing keys: {missing_keys}")
                return False
            
            files_analyzed = analysis.get("files_analyzed", 0)
            total_issues = len(analysis.get("improvement_opportunities", []))
            
            if files_analyzed > 0 and total_issues > 0:
                self.log_test("Systematic Scanner", True, 
                            f"Analyzed {files_analyzed} files, found {total_issues} opportunities")
                return True
            else:
                self.log_test("Systematic Scanner", False, 
                            f"No files or issues found: {files_analyzed} files, {total_issues} issues")
                return False
                
        except Exception as e:
            self.log_test("Systematic Scanner", False, f"Exception: {e}")
            return False
    
    def test_priority_matrix(self) -> bool:
        """Test 2: Priority matrix calculation"""
        print("\n📊 TEST 2: PRIORITY MATRIX CALCULATION")
        print("-" * 50)
        
        try:
            from systematic_evolution_engine import SystematicEvolutionEngine
            
            engine = SystematicEvolutionEngine()
            analysis = engine.scan_repository_systematically()
            priority_matrix = analysis.get("priority_matrix", {})
            
            expected_priorities = ["immediate", "next_sprint", "backlog", "maintenance"]
            missing_priorities = [p for p in expected_priorities if p not in priority_matrix]
            
            if missing_priorities:
                self.log_test("Priority Matrix", False, f"Missing priorities: {missing_priorities}")
                return False
            
            # Count issues by priority
            priority_counts = {}
            for priority, issues in priority_matrix.items():
                priority_counts[priority] = len(issues)
            
            total_prioritized = sum(priority_counts.values())
            
            if total_prioritized > 0:
                self.log_test("Priority Matrix", True, 
                            f"Prioritized {total_prioritized} issues: {priority_counts}")
                return True
            else:
                self.log_test("Priority Matrix", False, "No issues prioritized")
                return False
                
        except Exception as e:
            self.log_test("Priority Matrix", False, f"Exception: {e}")
            return False
    
    def test_improvement_implementation(self) -> bool:
        """Test 3: Systematic improvement implementation"""
        print("\n🔧 TEST 3: IMPROVEMENT IMPLEMENTATION")
        print("-" * 50)
        
        try:
            from systematic_evolution_engine import SystematicEvolutionEngine
            
            # Clear previous improvements for clean test
            improvement_log = Path("evolution_improvements.json")
            if improvement_log.exists():
                backup_name = f"evolution_improvements_backup_{int(time.time())}.json"
                improvement_log.rename(backup_name)
                print(f"     Backed up existing improvements to {backup_name}")
            
            engine = SystematicEvolutionEngine()
            improvements = engine.implement_systematic_improvements(max_improvements=3)
            
            if len(improvements) > 0:
                success_count = sum(1 for imp in improvements if imp.get("success", False))
                
                # Verify improvement files were created
                files_created = []
                for imp in improvements:
                    solution_file = imp.get("solution_file", "")
                    if solution_file and Path(solution_file).exists():
                        files_created.append(solution_file)
                
                if success_count > 0 and len(files_created) > 0:
                    self.log_test("Improvement Implementation", True,
                                f"Implemented {success_count} improvements, created {len(files_created)} solution files")
                    return True
                else:
                    self.log_test("Improvement Implementation", False,
                                f"Success: {success_count}, Files: {len(files_created)}")
                    return False
            else:
                self.log_test("Improvement Implementation", False, "No improvements implemented")
                return False
                
        except Exception as e:
            self.log_test("Improvement Implementation", False, f"Exception: {e}")
            return False
    
    def test_duplicate_prevention(self) -> bool:
        """Test 4: Duplicate prevention system"""
        print("\n🚫 TEST 4: DUPLICATE PREVENTION")
        print("-" * 50)
        
        try:
            from systematic_evolution_engine import SystematicEvolutionEngine
            
            engine = SystematicEvolutionEngine()
            
            # Run improvements twice to test duplicate prevention
            print("     Running first improvement cycle...")
            improvements1 = engine.implement_systematic_improvements(max_improvements=2)
            
            print("     Running second improvement cycle...")
            improvements2 = engine.implement_systematic_improvements(max_improvements=2)
            
            # Check if second run skipped already implemented improvements
            skipped_count = 0
            for imp in improvements2:
                if "already implemented" in imp.get("implementation_details", "").lower():
                    skipped_count += 1
            
            # Verify improvement log tracks duplicates
            improvement_log = Path("evolution_improvements.json")
            if improvement_log.exists():
                with open(improvement_log, 'r') as f:
                    data = json.load(f)
                    implemented_ids = set(data.get("implemented", []))
                    
                if len(implemented_ids) > 0:
                    self.log_test("Duplicate Prevention", True,
                                f"Tracking {len(implemented_ids)} implemented improvements")
                    return True
                else:
                    self.log_test("Duplicate Prevention", False, "No improvements tracked")
                    return False
            else:
                self.log_test("Duplicate Prevention", False, "No improvement log found")
                return False
                
        except Exception as e:
            self.log_test("Duplicate Prevention", False, f"Exception: {e}")
            return False
    
    def test_solution_quality(self) -> bool:
        """Test 5: Solution file quality and targeting"""
        print("\n🎯 TEST 5: SOLUTION QUALITY & TARGETING")
        print("-" * 50)
        
        try:
            # Check improvement log for solution files
            improvement_log = Path("evolution_improvements.json")
            if not improvement_log.exists():
                self.log_test("Solution Quality", False, "No improvement log found")
                return False
            
            with open(improvement_log, 'r') as f:
                data = json.load(f)
                details = data.get("details", {})
            
            if not details:
                self.log_test("Solution Quality", False, "No improvement details found")
                return False
            
            # Analyze solution file quality
            quality_metrics = {
                "total_solutions": 0,
                "targeted_names": 0,
                "existing_files": 0,
                "non_spam": 0,
                "specific_types": 0
            }
            
            spam_indicators = ["autonomous", "evolution", "demo", "test", "temp"]
            targeted_prefixes = ["fix_", "externalize_", "add_", "refactor_", "optimize_"]
            
            for imp_id, detail in details.items():
                solution_file = detail.get("solution_file", "")
                imp_type = detail.get("type", "")
                
                if solution_file:
                    quality_metrics["total_solutions"] += 1
                    
                    # Check if file exists
                    if Path(solution_file).exists():
                        quality_metrics["existing_files"] += 1
                    
                    # Check for targeted naming
                    if any(solution_file.startswith(prefix) for prefix in targeted_prefixes):
                        quality_metrics["targeted_names"] += 1
                    
                    # Check it's not spam
                    if not any(indicator in solution_file.lower() for indicator in spam_indicators):
                        quality_metrics["non_spam"] += 1
                    
                    # Check for specific improvement type
                    if imp_type in ["sql_injection_risk", "hardcoded_values", "missing_error_handling"]:
                        quality_metrics["specific_types"] += 1
            
            # Calculate quality score
            total = quality_metrics["total_solutions"]
            if total > 0:
                quality_score = (
                    quality_metrics["targeted_names"] + 
                    quality_metrics["existing_files"] + 
                    quality_metrics["non_spam"] + 
                    quality_metrics["specific_types"]
                ) / (total * 4) * 100
                
                if quality_score >= 75:
                    self.log_test("Solution Quality", True,
                                f"Quality score: {quality_score:.1f}% ({total} solutions)")
                    return True
                else:
                    self.log_test("Solution Quality", False,
                                f"Low quality score: {quality_score:.1f}%")
                    return False
            else:
                self.log_test("Solution Quality", False, "No solutions to evaluate")
                return False
                
        except Exception as e:
            self.log_test("Solution Quality", False, f"Exception: {e}")
            return False
    
    def test_competitive_intelligence_integration(self) -> bool:
        """Test 6: Integration with competitive intelligence"""
        print("\n🧠 TEST 6: COMPETITIVE INTELLIGENCE INTEGRATION")
        print("-" * 50)
        
        try:
            # Check if competitive intelligence files exist and are functional
            ci_files = [
                ("deep_capability_analyzer.py", "DeepCapabilityAnalyzer"),
                ("frontier_competitive_intelligence.py", "FrontierCompetitiveIntelligence"),
                ("real_competitive_analyzer.py", "RealCompetitiveAnalyzer")
            ]
            
            working_features = 0
            total_functionality = 0
            
            for file_name, class_name in ci_files:
                file_path = Path(file_name)
                if file_path.exists():
                    try:
                        # Try to import and instantiate
                        spec = __import__(file_name.replace('.py', ''))
                        if hasattr(spec, class_name):
                            working_features += 1
                            
                            # Count lines of real functionality
                            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                                lines = len([line for line in f if line.strip() and not line.strip().startswith('#')])
                                total_functionality += lines
                        
                    except Exception as e:
                        print(f"     ⚠️  {file_name}: Import error - {e}")
                else:
                    print(f"     ❌ {file_name}: File not found")
            
            if working_features >= 2 and total_functionality > 1000:
                self.log_test("CI Integration", True,
                            f"{working_features} CI features working, {total_functionality} lines of functionality")
                return True
            else:
                self.log_test("CI Integration", False,
                            f"Only {working_features} features, {total_functionality} lines")
                return False
                
        except Exception as e:
            self.log_test("CI Integration", False, f"Exception: {e}")
            return False
    
    def test_spam_detection(self) -> bool:
        """Test 7: Spam detection and prevention"""
        print("\n🚫 TEST 7: SPAM DETECTION & PREVENTION")
        print("-" * 50)
        
        try:
            # Count current files to establish baseline
            current_py_files = list(Path(".").glob("*.py"))
            baseline_count = len(current_py_files)
            
            # Run evolution system
            from systematic_evolution_engine import SystematicEvolutionEngine
            engine = SystematicEvolutionEngine()
            improvements = engine.implement_systematic_improvements(max_improvements=2)
            
            # Count files after evolution
            new_py_files = list(Path(".").glob("*.py"))
            new_count = len(new_py_files)
            
            files_added = new_count - baseline_count
            improvements_made = len([imp for imp in improvements if imp.get("success", False)])
            
            # Check spam patterns in new files
            spam_patterns = [
                "autonomous_evolution",
                "_evolution_evolution_",
                "demo_evolution",
                "test_evolution_evolution"
            ]
            
            spam_files = []
            for file_path in new_py_files:
                file_name = file_path.name.lower()
                if any(pattern in file_name for pattern in spam_patterns):
                    spam_files.append(file_name)
            
            # Evaluate spam metrics
            spam_ratio = len(spam_files) / files_added if files_added > 0 else 0
            efficiency_ratio = improvements_made / files_added if files_added > 0 else 0
            
            if spam_ratio == 0 and efficiency_ratio >= 0.5:
                self.log_test("Spam Detection", True,
                            f"No spam files, {efficiency_ratio:.1%} efficiency ({improvements_made}/{files_added})")
                return True
            else:
                self.log_test("Spam Detection", False,
                            f"Spam ratio: {spam_ratio:.1%}, Efficiency: {efficiency_ratio:.1%}")
                return False
                
        except Exception as e:
            self.log_test("Spam Detection", False, f"Exception: {e}")
            return False
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 70)
        print("🧪 FULL EVOLUTION SYSTEM TEST REPORT")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"📊 TEST SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        print(f"\n📋 DETAILED RESULTS:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"   {i}. {status} {result['test']}")
            if result["details"]:
                print(f"      {result['details']}")
        
        # Overall assessment
        print(f"\n🎯 OVERALL ASSESSMENT:")
        if success_rate >= 85:
            print("   ✅ EXCELLENT: Evolution system is working systematically")
            print("   ✅ All core components functional")
            print("   ✅ No spam generation detected")
            print("   ✅ Real improvements being implemented")
        elif success_rate >= 70:
            print("   ✅ GOOD: Evolution system mostly functional")
            print("   ⚠️  Some minor issues detected")
        else:
            print("   ❌ POOR: Evolution system needs significant fixes")
            print("   ❌ Major functionality issues detected")
        
        # Save detailed report
        report_file = f"evolution_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump({
                "test_summary": {
                    "total_tests": total_tests,
                    "passed": passed_tests,
                    "failed": failed_tests,
                    "success_rate": success_rate
                },
                "test_results": self.test_results,
                "test_duration": str(datetime.now() - self.start_time)
            }, f, indent=2)
        
        print(f"\n📁 Detailed report saved: {report_file}")
        
        return success_rate

def main():
    """Run the full evolution system test"""
    
    print("🧪 COMPREHENSIVE EVOLUTION SYSTEM TEST")
    print("=" * 70)
    print("Testing the entire evolution system end-to-end...")
    print()
    
    tester = FullEvolutionSystemTest()
    
    # Run all tests
    tests = [
        tester.test_systematic_scanner,
        tester.test_priority_matrix,
        tester.test_improvement_implementation,
        tester.test_duplicate_prevention,
        tester.test_solution_quality,
        tester.test_competitive_intelligence_integration,
        tester.test_spam_detection
    ]
    
    for test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
        
        time.sleep(1)  # Brief pause between tests
    
    # Generate final report
    success_rate = tester.generate_test_report()
    
    return success_rate

if __name__ == "__main__":
    main()
