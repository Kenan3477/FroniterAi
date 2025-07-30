#!/usr/bin/env python3
"""
Test Runner Script for Business Operations Module

Provides convenient commands for running different test suites with proper configuration.
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path
from typing import List, Optional


class TestRunner:
    """Test runner for Business Operations module"""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.test_dir = self.base_dir / "tests" / "business_operations"
        self.reports_dir = self.base_dir / "reports"
        
        # Ensure reports directory exists
        self.reports_dir.mkdir(exist_ok=True)
    
    def run_command(self, cmd: List[str], description: str) -> bool:
        """Run a command and return success status"""
        print(f"\n🔄 {description}")
        print(f"Command: {' '.join(cmd)}")
        
        try:
            result = subprocess.run(cmd, check=True, cwd=self.base_dir)
            print(f"✅ {description} - PASSED")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ {description} - FAILED (exit code: {e.returncode})")
            return False
    
    def run_unit_tests(self, capability: Optional[str] = None, coverage: bool = True) -> bool:
        """Run unit tests"""
        cmd = ["python", "-m", "pytest"]
        
        if capability:
            test_pattern = f"tests/business_operations/unit/test_{capability}*.py"
            cmd.append(test_pattern)
        else:
            cmd.append("tests/business_operations/unit/")
        
        cmd.extend([
            "-v",
            "-m", "unit",
            "--junit-xml=reports/junit-unit.xml"
        ])
        
        if coverage:
            cmd.extend([
                "--cov=modules.business_operations",
                "--cov-report=html:reports/htmlcov-unit",
                "--cov-report=xml:reports/coverage-unit.xml"
            ])
        
        return self.run_command(cmd, f"Unit Tests{f' ({capability})' if capability else ''}")
    
    def run_integration_tests(self) -> bool:
        """Run integration tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/business_operations/integration/",
            "-v",
            "-m", "integration",
            "--junit-xml=reports/junit-integration.xml"
        ]
        
        return self.run_command(cmd, "Integration Tests")
    
    def run_e2e_tests(self) -> bool:
        """Run end-to-end tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/business_operations/e2e/",
            "-v",
            "-m", "e2e",
            "--timeout=1800",
            "--junit-xml=reports/junit-e2e.xml"
        ]
        
        return self.run_command(cmd, "End-to-End Tests")
    
    def run_performance_tests(self, include_stress: bool = False) -> bool:
        """Run performance tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/business_operations/performance/",
            "-v",
            "-m", "performance",
            "--benchmark-json=reports/benchmark-results.json",
            "--junit-xml=reports/junit-performance.xml"
        ]
        
        if include_stress:
            cmd.extend(["-m", "performance or stress"])
        
        return self.run_command(cmd, "Performance Tests")
    
    def run_compliance_tests(self) -> bool:
        """Run compliance validation tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/business_operations/",
            "-v",
            "-m", "compliance",
            "--junit-xml=reports/junit-compliance.xml"
        ]
        
        return self.run_command(cmd, "Compliance Tests")
    
    def run_accuracy_tests(self) -> bool:
        """Run accuracy validation tests"""
        cmd = [
            "python", "-m", "pytest", 
            "tests/business_operations/",
            "-v",
            "-m", "accuracy",
            "--junit-xml=reports/junit-accuracy.xml"
        ]
        
        return self.run_command(cmd, "Accuracy Tests")
    
    def run_ethical_tests(self) -> bool:
        """Run ethical constraints tests"""
        cmd = [
            "python", "-m", "pytest",
            "tests/business_operations/",
            "-v", 
            "-m", "ethical",
            "--junit-xml=reports/junit-ethical.xml"
        ]
        
        return self.run_command(cmd, "Ethical Constraints Tests")
    
    def run_code_quality_checks(self) -> bool:
        """Run code quality checks"""
        checks = [
            (["black", "--check", "modules/business_operations", "tests/business_operations"], "Code Formatting Check"),
            (["isort", "--check-only", "modules/business_operations", "tests/business_operations"], "Import Sorting Check"),
            (["flake8", "modules/business_operations", "tests/business_operations", "--max-line-length=100"], "Linting Check"),
            (["mypy", "modules/business_operations", "--ignore-missing-imports"], "Type Checking"),
            (["bandit", "-r", "modules/business_operations", "-f", "json", "-o", "reports/security-report.json"], "Security Scan")
        ]
        
        all_passed = True
        for cmd, description in checks:
            if not self.run_command(cmd, description):
                all_passed = False
        
        return all_passed
    
    def run_all_tests(self, include_performance: bool = False, include_stress: bool = False) -> bool:
        """Run all test suites"""
        print("🚀 Running comprehensive test suite for Business Operations module")
        
        results = {
            "Code Quality": self.run_code_quality_checks(),
            "Unit Tests": self.run_unit_tests(),
            "Integration Tests": self.run_integration_tests(),
            "E2E Tests": self.run_e2e_tests(),
            "Compliance Tests": self.run_compliance_tests(),
            "Accuracy Tests": self.run_accuracy_tests(),
            "Ethical Tests": self.run_ethical_tests()
        }
        
        if include_performance:
            results["Performance Tests"] = self.run_performance_tests(include_stress=include_stress)
        
        # Print summary
        print("\n" + "="*60)
        print("📊 TEST RESULTS SUMMARY")
        print("="*60)
        
        passed = 0
        total = len(results)
        
        for test_suite, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_suite:<20} {status}")
            if result:
                passed += 1
        
        print("="*60)
        print(f"OVERALL: {passed}/{total} test suites passed")
        
        if passed == total:
            print("🎉 All tests passed! Business Operations module is ready.")
            return True
        else:
            print(f"⚠️  {total - passed} test suite(s) failed. Please check the reports.")
            return False
    
    def run_quick_tests(self) -> bool:
        """Run a quick test suite for development"""
        print("⚡ Running quick test suite (unit tests only)")
        
        return self.run_unit_tests()
    
    def run_ci_tests(self) -> bool:
        """Run tests suitable for CI environment"""
        print("🔧 Running CI test suite")
        
        results = [
            self.run_code_quality_checks(),
            self.run_unit_tests(),
            self.run_integration_tests(),
            self.run_compliance_tests(),
            self.run_accuracy_tests()
        ]
        
        return all(results)
    
    def generate_coverage_report(self) -> bool:
        """Generate comprehensive coverage report"""
        cmd = [
            "python", "-m", "pytest",
            "tests/business_operations/unit/",
            "--cov=modules.business_operations",
            "--cov-branch",
            "--cov-report=html:reports/coverage-html",
            "--cov-report=xml:reports/coverage.xml",
            "--cov-report=term-missing",
            "--cov-fail-under=85"
        ]
        
        return self.run_command(cmd, "Coverage Report Generation")


def main():
    parser = argparse.ArgumentParser(description="Test runner for Business Operations module")
    parser.add_argument(
        "command",
        choices=[
            "unit", "integration", "e2e", "performance", "compliance", 
            "accuracy", "ethical", "quality", "all", "quick", "ci", "coverage"
        ],
        help="Test suite to run"
    )
    parser.add_argument(
        "--capability",
        choices=["financial", "strategic", "operations", "decision", "compliance"],
        help="Specific capability to test (unit tests only)"
    )
    parser.add_argument(
        "--no-coverage",
        action="store_true",
        help="Disable coverage reporting"
    )
    parser.add_argument(
        "--include-performance",
        action="store_true", 
        help="Include performance tests in 'all' command"
    )
    parser.add_argument(
        "--include-stress",
        action="store_true",
        help="Include stress tests in performance tests"
    )
    
    args = parser.parse_args()
    
    runner = TestRunner()
    
    # Run the specified command
    if args.command == "unit":
        success = runner.run_unit_tests(
            capability=args.capability, 
            coverage=not args.no_coverage
        )
    elif args.command == "integration":
        success = runner.run_integration_tests()
    elif args.command == "e2e":
        success = runner.run_e2e_tests()
    elif args.command == "performance":
        success = runner.run_performance_tests(include_stress=args.include_stress)
    elif args.command == "compliance":
        success = runner.run_compliance_tests()
    elif args.command == "accuracy":
        success = runner.run_accuracy_tests()
    elif args.command == "ethical":
        success = runner.run_ethical_tests()
    elif args.command == "quality":
        success = runner.run_code_quality_checks()
    elif args.command == "all":
        success = runner.run_all_tests(
            include_performance=args.include_performance,
            include_stress=args.include_stress
        )
    elif args.command == "quick":
        success = runner.run_quick_tests()
    elif args.command == "ci":
        success = runner.run_ci_tests()
    elif args.command == "coverage":
        success = runner.generate_coverage_report()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
