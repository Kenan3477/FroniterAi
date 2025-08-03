#!/usr/bin/env python3
"""
Simple test of AutomatedTestGenerator
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_automated_test_generator():
    """Test the AutomatedTestGenerator functionality"""
    
    try:
        # Import the AutomatedTestGenerator
        from simulation_environment import AutomatedTestGenerator
        
        print("✅ AutomatedTestGenerator imported successfully")
        
        # Create instance
        test_generator = AutomatedTestGenerator()
        print("✅ AutomatedTestGenerator instance created")
        
        # Define sample changes
        sample_changes = [
            {
                'type': 'file_create',
                'file': 'test_module.py',
                'content': 'def test_function(): return True'
            }
        ]
        
        # Test comprehensive test suite generation
        test_suite = test_generator.generate_comprehensive_test_suite(sample_changes)
        print(f"✅ Generated comprehensive test suite with {len(test_suite)} tests")
        
        # Show test categories
        categories = set(test.get('category', 'unknown') for test in test_suite)
        print(f"📋 Test Categories Generated: {', '.join(sorted(categories))}")
        
        # Test individual template generation methods
        unit_tests = test_generator._generate_unit_test_template(sample_changes)
        print(f"✅ Generated {len(unit_tests)} unit tests")
        
        integration_tests = test_generator._generate_integration_test_template(sample_changes)
        print(f"✅ Generated {len(integration_tests)} integration tests")
        
        performance_tests = test_generator._generate_performance_test_template(sample_changes)
        print(f"✅ Generated {len(performance_tests)} performance tests")
        
        # Test report generation with mock results
        mock_results = [
            {'name': 'test1', 'status': 'passed', 'category': 'unit_test', 'priority': 'high'},
            {'name': 'test2', 'status': 'failed', 'category': 'security_test', 'priority': 'high', 'error': 'Security issue'},
            {'name': 'test3', 'status': 'passed', 'category': 'performance_test', 'priority': 'medium'}
        ]
        
        report = test_generator.generate_test_execution_report(mock_results, sample_changes)
        print(f"✅ Generated test execution report")
        print(f"   Summary: {report['summary']['total_tests']} tests, {report['summary']['success_rate']:.1f}% success rate")
        print(f"   Status: {report['summary']['overall_status']}")
        
        print("\n🎉 AutomatedTestGenerator test completed successfully!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error testing AutomatedTestGenerator: {e}")
        return False

if __name__ == "__main__":
    success = test_automated_test_generator()
    sys.exit(0 if success else 1)
