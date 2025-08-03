#!/usr/bin/env python3
"""
🧪 Test Suite for Simulation Environment
=======================================

Comprehensive tests for the simulation environment module.
"""

import os
import sys
import asyncio
import tempfile
import shutil
import json
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add the current directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from simulation_environment import (
    SimulationConfig,
    SimulationMetrics,
    SimulationResult,
    SimulationEnvironment,
    RepositoryCloner,
    ChangeApplicator,
    TestRunner,
    MetricsEvaluator,
    SecurityValidator,
    SecurityError
)

class TestSimulationConfig(unittest.TestCase):
    """Test SimulationConfig dataclass"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = SimulationConfig()
        
        self.assertEqual(config.max_execution_time, 300)
        self.assertEqual(config.memory_limit_mb, 1024)
        self.assertEqual(config.cpu_limit_percent, 50.0)
        self.assertTrue(config.preserve_artifacts)
        self.assertFalse(config.enable_networking)
        self.assertIsNotNone(config.allowed_imports)
        self.assertIsNotNone(config.forbidden_operations)
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = SimulationConfig(
            max_execution_time=600,
            memory_limit_mb=2048,
            temp_dir="/custom/temp"
        )
        
        self.assertEqual(config.max_execution_time, 600)
        self.assertEqual(config.memory_limit_mb, 2048)
        self.assertEqual(config.temp_dir, "/custom/temp")

class TestSecurityValidator(unittest.TestCase):
    """Test SecurityValidator class"""
    
    def setUp(self):
        """Setup test environment"""
        self.config = SimulationConfig()
        self.validator = SecurityValidator(self.config)
    
    def test_safe_code(self):
        """Test validation of safe code"""
        safe_code = """
import os
import json

def safe_function():
    return "Hello, World!"
"""
        is_safe, issues = self.validator.validate_code(safe_code)
        self.assertTrue(is_safe)
        self.assertEqual(len(issues), 0)
    
    def test_forbidden_operations(self):
        """Test detection of forbidden operations"""
        dangerous_code = """
import subprocess
subprocess.run(['rm', '-rf', '/'])
"""
        is_safe, issues = self.validator.validate_code(dangerous_code)
        self.assertFalse(is_safe)
        self.assertGreater(len(issues), 0)
    
    def test_dangerous_imports(self):
        """Test detection of dangerous imports"""
        dangerous_code = """
import socket
import requests
"""
        is_safe, issues = self.validator.validate_code(dangerous_code)
        self.assertFalse(is_safe)
        self.assertGreater(len(issues), 0)
    
    def test_eval_exec_detection(self):
        """Test detection of eval/exec usage"""
        dangerous_code = """
code = "print('hello')"
eval(code)
exec(code)
"""
        is_safe, issues = self.validator.validate_code(dangerous_code)
        self.assertFalse(is_safe)
        self.assertGreater(len(issues), 0)

class TestRepositoryCloner(unittest.TestCase):
    """Test RepositoryCloner class"""
    
    def setUp(self):
        """Setup test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.source_dir = os.path.join(self.temp_dir, 'source')
        self.target_dir = os.path.join(self.temp_dir, 'target')
        
        os.makedirs(self.source_dir)
        os.makedirs(self.target_dir)
        
        # Create test files
        with open(os.path.join(self.source_dir, 'test.py'), 'w') as f:
            f.write('print("test")')
        
        with open(os.path.join(self.source_dir, 'requirements.txt'), 'w') as f:
            f.write('pytest==7.0.0')
        
        self.cloner = RepositoryCloner(self.source_dir)
    
    def tearDown(self):
        """Cleanup test environment"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_clone_specific_files(self):
        """Test cloning specific files"""
        components = ['test.py', 'requirements.txt']
        result = self.cloner.clone_components(self.target_dir, components)
        
        self.assertEqual(len(result), 2)
        self.assertTrue(os.path.exists(os.path.join(self.target_dir, 'test.py')))
        self.assertTrue(os.path.exists(os.path.join(self.target_dir, 'requirements.txt')))
    
    def test_clone_glob_pattern(self):
        """Test cloning with glob patterns"""
        components = ['*.py']
        result = self.cloner.clone_components(self.target_dir, components)
        
        self.assertGreater(len(result), 0)
        self.assertTrue(os.path.exists(os.path.join(self.target_dir, 'test.py')))

class TestChangeApplicator(unittest.TestCase):
    """Test ChangeApplicator class"""
    
    def setUp(self):
        """Setup test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.applicator = ChangeApplicator(self.temp_dir)
        
        # Create test file
        self.test_file = os.path.join(self.temp_dir, 'test.py')
        with open(self.test_file, 'w') as f:
            f.write('line 1\nline 2\nline 3\n')
    
    def tearDown(self):
        """Cleanup test environment"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_file_edit(self):
        """Test file content editing"""
        changes = [{
            'type': 'file_edit',
            'file': 'test.py',
            'content': 'new content'
        }]
        
        results = self.applicator.apply_changes(changes)
        
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['success'])
        
        with open(self.test_file, 'r') as f:
            content = f.read()
        self.assertEqual(content, 'new content')
    
    def test_file_create(self):
        """Test file creation"""
        changes = [{
            'type': 'file_create',
            'file': 'new_file.py',
            'content': 'new file content'
        }]
        
        results = self.applicator.apply_changes(changes)
        
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['success'])
        
        new_file = os.path.join(self.temp_dir, 'new_file.py')
        self.assertTrue(os.path.exists(new_file))
        
        with open(new_file, 'r') as f:
            content = f.read()
        self.assertEqual(content, 'new file content')
    
    def test_line_insert(self):
        """Test line insertion"""
        changes = [{
            'type': 'line_insert',
            'file': 'test.py',
            'line_number': 2,
            'content': 'inserted line'
        }]
        
        results = self.applicator.apply_changes(changes)
        
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['success'])
        
        with open(self.test_file, 'r') as f:
            lines = f.readlines()
        self.assertEqual(lines[1].strip(), 'inserted line')
    
    def test_line_replace(self):
        """Test line replacement"""
        changes = [{
            'type': 'line_replace',
            'file': 'test.py',
            'line_number': 2,
            'content': 'replaced line'
        }]
        
        results = self.applicator.apply_changes(changes)
        
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]['success'])
        
        with open(self.test_file, 'r') as f:
            lines = f.readlines()
        self.assertEqual(lines[1].strip(), 'replaced line')

class TestMetricsEvaluator(unittest.TestCase):
    """Test MetricsEvaluator class"""
    
    def setUp(self):
        """Setup test environment"""
        self.evaluator = MetricsEvaluator()
    
    def test_performance_score_calculation(self):
        """Test performance score calculation"""
        test_results = {'total_tests': 5, 'passed': 5, 'failed': 0}
        resource_metrics = SimulationMetrics(
            execution_time=30.0,
            memory_usage_mb=200.0,
            cpu_usage_percent=50.0
        )
        code_analysis = {}
        
        score = self.evaluator._calculate_performance_score(
            test_results, resource_metrics, code_analysis
        )
        
        self.assertGreater(score, 90)  # Should be high for good performance
    
    def test_stability_score_calculation(self):
        """Test stability score calculation"""
        test_results = {'total_tests': 10, 'passed': 9, 'failed': 1}
        resource_metrics = SimulationMetrics(error_count=1)
        code_analysis = {}
        
        score = self.evaluator._calculate_stability_score(
            test_results, resource_metrics, code_analysis
        )
        
        self.assertLess(score, 100)  # Should be penalized for failures
        self.assertGreater(score, 50)  # But not too low
    
    def test_security_score_calculation(self):
        """Test security score calculation"""
        test_results = {}
        resource_metrics = SimulationMetrics()
        code_analysis = {
            'security_issues': ['eval usage'],
            'dangerous_patterns': ['subprocess call']
        }
        
        score = self.evaluator._calculate_security_score(
            test_results, resource_metrics, code_analysis
        )
        
        self.assertLess(score, 80)  # Should be penalized for security issues

class TestSimulationEnvironment(unittest.TestCase):
    """Test SimulationEnvironment class"""
    
    def setUp(self):
        """Setup test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.config = SimulationConfig(
            temp_dir=self.temp_dir,
            preserve_artifacts=False  # Clean up for tests
        )
        self.sim_env = SimulationEnvironment(self.config, self.temp_dir)
    
    def tearDown(self):
        """Cleanup test environment"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    async def test_run_simulation_success(self):
        """Test successful simulation run"""
        changes = [{
            'type': 'file_create',
            'file': 'simple_test.py',
            'content': '''
def test_function():
    return True

if __name__ == "__main__":
    assert test_function()
    print("Test passed!")
'''
        }]
        
        test_specs = [{
            'type': 'python',
            'name': 'simple_test',
            'script': 'simple_test.py'
        }]
        
        result = await self.sim_env.run_simulation(changes, test_specs)
        
        self.assertIsInstance(result, SimulationResult)
        self.assertIsNotNone(result.simulation_id)
        self.assertIsInstance(result.metrics, SimulationMetrics)
    
    async def test_run_simulation_security_failure(self):
        """Test simulation with security validation failure"""
        changes = [{
            'type': 'file_create',
            'file': 'dangerous_test.py',
            'content': '''
import subprocess
subprocess.run(['echo', 'dangerous'])
'''
        }]
        
        result = await self.sim_env.run_simulation(changes)
        
        self.assertIsInstance(result, SimulationResult)
        self.assertFalse(result.success)
    
    def test_simulation_history(self):
        """Test simulation history retrieval"""
        history = self.sim_env.get_simulation_history()
        self.assertIsInstance(history, list)
    
    def test_get_nonexistent_result(self):
        """Test getting non-existent simulation result"""
        result = self.sim_env.get_simulation_result('nonexistent_id')
        self.assertIsNone(result)

class TestIntegration(unittest.TestCase):
    """Integration tests for the complete simulation environment"""
    
    def setUp(self):
        """Setup integration test environment"""
        self.temp_dir = tempfile.mkdtemp()
        self.source_dir = os.path.join(self.temp_dir, 'source')
        os.makedirs(self.source_dir)
        
        # Create a simple source file
        with open(os.path.join(self.source_dir, 'main.py'), 'w') as f:
            f.write('''
def hello_world():
    return "Hello, World!"

if __name__ == "__main__":
    print(hello_world())
''')
        
        self.config = SimulationConfig(
            temp_dir=self.temp_dir,
            preserve_artifacts=False
        )
        self.sim_env = SimulationEnvironment(self.config, self.source_dir)
    
    def tearDown(self):
        """Cleanup integration test environment"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    async def test_complete_simulation_workflow(self):
        """Test complete simulation workflow"""
        # Define improvement changes
        changes = [{
            'type': 'file_edit',
            'file': 'main.py',
            'content': '''
def hello_world(name="World"):
    return f"Hello, {name}!"

def test_hello_world():
    assert hello_world() == "Hello, World!"
    assert hello_world("Python") == "Hello, Python!"
    return True

if __name__ == "__main__":
    print(hello_world())
    test_hello_world()
    print("All tests passed!")
'''
        }]
        
        # Define test specifications
        test_specs = [{
            'type': 'python',
            'name': 'main_test',
            'script': 'main.py'
        }]
        
        # Run simulation
        result = await self.sim_env.run_simulation(
            changes=changes,
            test_specs=test_specs,
            components=['main.py']
        )
        
        # Verify results
        self.assertIsInstance(result, SimulationResult)
        self.assertTrue(result.success)
        self.assertGreater(len(result.logs), 0)
        self.assertGreater(len(result.recommendations), 0)
        
        # Verify metrics
        self.assertIsInstance(result.metrics, SimulationMetrics)
        self.assertGreater(result.metrics.performance_score, 0)
        self.assertGreater(result.metrics.stability_score, 0)
        
        # Verify simulation can be retrieved
        retrieved_result = self.sim_env.get_simulation_result(result.simulation_id)
        self.assertIsNotNone(retrieved_result)
        self.assertEqual(retrieved_result.simulation_id, result.simulation_id)

# Async test runner
class AsyncTestRunner:
    """Helper class to run async tests"""
    
    @staticmethod
    def run_async_test(test_func):
        """Run async test function"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(test_func())
        finally:
            loop.close()

def run_async_tests():
    """Run all async tests"""
    print("🧪 Running Async Tests...")
    
    # Create test instances
    env_test = TestSimulationEnvironment()
    env_test.setUp()
    
    integration_test = TestIntegration()
    integration_test.setUp()
    
    try:
        # Run async tests
        print("  Testing simulation success...")
        AsyncTestRunner.run_async_test(env_test.test_run_simulation_success)
        print("  ✅ Simulation success test passed")
        
        print("  Testing simulation security...")
        AsyncTestRunner.run_async_test(env_test.test_run_simulation_security_failure)
        print("  ✅ Simulation security test passed")
        
        print("  Testing complete workflow...")
        AsyncTestRunner.run_async_test(integration_test.test_complete_simulation_workflow)
        print("  ✅ Complete workflow test passed")
        
    finally:
        env_test.tearDown()
        integration_test.tearDown()
    
    print("✅ All async tests passed!")

def main():
    """Main test runner"""
    print("🧪 SIMULATION ENVIRONMENT TEST SUITE")
    print("=" * 50)
    
    # Run sync tests
    print("Running synchronous tests...")
    test_loader = unittest.TestLoader()
    test_suite = unittest.TestSuite()
    
    # Add test classes
    sync_test_classes = [
        TestSimulationConfig,
        TestSecurityValidator,
        TestRepositoryCloner,
        TestChangeApplicator,
        TestMetricsEvaluator
    ]
    
    for test_class in sync_test_classes:
        tests = test_loader.loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # Run sync tests
    runner = unittest.TextTestRunner(verbosity=2)
    sync_result = runner.run(test_suite)
    
    print("\n" + "=" * 50)
    
    # Run async tests
    run_async_tests()
    
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print(f"Sync Tests Run: {sync_result.testsRun}")
    print(f"Sync Tests Failed: {len(sync_result.failures)}")
    print(f"Sync Tests Errors: {len(sync_result.errors)}")
    
    if sync_result.wasSuccessful():
        print("🎉 ALL TESTS PASSED!")
    else:
        print("❌ SOME TESTS FAILED!")
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
