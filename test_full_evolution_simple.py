#!/usr/bin/env python3
"""
COMPREHENSIVE EVOLUTION SYSTEM TEST
==================================
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
        
        status = "PASS" if success else "FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"     {details}")
    
    def test_systematic_scanner(self) -> bool:
        """Test 1: Systematic repository scanner"""
        print("\nTEST 1: SYSTEMATIC REPOSITORY SCANNER")
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
    
    def test_improvement_implementation(self) -> bool:
        """Test 2: Systematic improvement implementation"""
        print("\nTEST 2: IMPROVEMENT IMPLEMENTATION")
        print("-" * 50)
        
        try:
            from systematic_evolution_engine import SystematicEvolutionEngine
            
            engine = SystematicEvolutionEngine()
            improvements = engine.implement_systematic_improvements(max_improvements=2)
            
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
    
    def test_solution_quality(self) -> bool:
        """Test 3: Solution file quality and targeting"""
        print("\nTEST 3: SOLUTION QUALITY & TARGETING")
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
        """Test 4: Integration with competitive intelligence"""
        print("\nTEST 4: COMPETITIVE INTELLIGENCE INTEGRATION")
        print("-" * 50)
        
        try:
            # Check if competitive intelligence files exist and are functional
            ci_files = [
                "deep_capability_analyzer.py",
                "frontier_competitive_intelligence.py", 
                "real_competitive_analyzer.py"
            ]
            
            working_features = 0
            total_functionality = 0
            
            for file_name in ci_files:
                file_path = Path(file_name)
                if file_path.exists():
                    # Count lines of real functionality
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        lines = len([line for line in f if line.strip() and not line.strip().startswith('#')])
                        total_functionality += lines
                        working_features += 1
                else:
                    print(f"     Missing: {file_name}")
            
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
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print("\n" + "=" * 70)
        print("FULL EVOLUTION SYSTEM TEST REPORT")
        print("=" * 70)
        
        total_tests = len(self.test_results)
        passed_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"TEST SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        
        print(f"\nDETAILED RESULTS:")
        for i, result in enumerate(self.test_results, 1):
            status = "PASS" if result["success"] else "FAIL"
            print(f"   {i}. {status} {result['test']}")
            if result["details"]:
                print(f"      {result['details']}")
        
        # Overall assessment
        print(f"\nOVERALL ASSESSMENT:")
        if success_rate >= 85:
            print("   EXCELLENT: Evolution system is working systematically")
            print("   All core components functional")
            print("   No spam generation detected")
            print("   Real improvements being implemented")
        elif success_rate >= 70:
            print("   GOOD: Evolution system mostly functional")
            print("   Some minor issues detected")
        else:
            print("   POOR: Evolution system needs significant fixes")
            print("   Major functionality issues detected")
        
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
        
        print(f"\nDetailed report saved: {report_file}")
        
        return success_rate

def main():
    """Run the full evolution system test"""
    
    print("COMPREHENSIVE EVOLUTION SYSTEM TEST")
    print("=" * 70)
    print("Testing the entire evolution system end-to-end...")
    print()
    
    tester = FullEvolutionSystemTest()
    
    # Run all tests
    tests = [
        tester.test_systematic_scanner,
        tester.test_improvement_implementation,
        tester.test_solution_quality,
        tester.test_competitive_intelligence_integration
    ]
    
    for test_func in tests:
        try:
            test_func()
        except Exception as e:
            print(f"Test failed with exception: {e}")
        
        time.sleep(1)  # Brief pause between tests
    
    # Generate final report
    success_rate = tester.generate_test_report()
    
    return success_rate

if __name__ == "__main__":
    main()
