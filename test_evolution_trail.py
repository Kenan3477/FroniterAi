#!/usr/bin/env python3
"""
Test script for Evolution Trail Module
Demonstrates comprehensive change tracking and reporting capabilities
"""

import asyncio
import sys
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from evolution_trail import EvolutionTrail, ChangeType, ChangeStatus, ImpactLevel

async def test_evolution_trail():
    """Test the evolution trail functionality"""
    
    print("🧬 Evolution Trail Module Test")
    print("=" * 50)
    
    # Create temporary test environment
    with tempfile.TemporaryDirectory() as temp_dir:
        # Initialize evolution trail
        trail = EvolutionTrail(
            database_path=os.path.join(temp_dir, "test_evolution.db"),
            repository_path=temp_dir
        )
        
        print(f"📁 Test environment: {temp_dir}")
        print(f"🗃️ Database: {trail.database_path}")
        
        # Test 1: Basic change tracking
        print(f"\n📝 Test 1: Basic Change Tracking")
        
        # Create a test file
        test_file = os.path.join(temp_dir, "test_feature.py")
        with open(test_file, 'w') as f:
            f.write("# Initial version\ndef hello():\n    return 'Hello World'\n")
        
        # Start tracking a feature addition
        change_id = trail.start_change_tracking(
            change_type=ChangeType.FEATURE_ADDITION,
            title="Add greeting functionality",
            description="Implement a simple greeting feature for testing",
            author="Test Developer",
            impact_level=ImpactLevel.LOW
        )
        
        print(f"   ✅ Started tracking: {change_id}")
        
        # Add files to tracking
        trail.add_file_changes(change_id, [test_file])
        print(f"   ✅ Added file to tracking: {test_file}")
        
        # Simulate development work
        await asyncio.sleep(0.5)
        
        # Modify the file
        with open(test_file, 'w') as f:
            f.write("""# Enhanced version
def hello(name="World"):
    \"\"\"
    Return a personalized greeting
    \"\"\"
    return f'Hello {name}!'

def goodbye(name="World"):
    \"\"\"
    Return a farewell message
    \"\"\"
    return f'Goodbye {name}!'
""")
        
        # Complete tracking
        change_record = trail.complete_change_tracking(
            change_id,
            decision_rationale="Added personalization and farewell functionality to improve user experience",
            test_results={
                "unit_tests": "passed",
                "coverage": 95.0,
                "performance": "within acceptable limits"
            },
            deployment_notes="Successfully deployed to test environment"
        )
        
        print(f"   ✅ Completed tracking")
        print(f"   📊 Lines added: {change_record.lines_added}")
        print(f"   📊 Lines removed: {change_record.lines_removed}")
        print(f"   📊 Files modified: {change_record.files_modified}")
        
        # Test 2: Multiple change types
        print(f"\n🔧 Test 2: Multiple Change Types")
        
        change_types_to_test = [
            (ChangeType.BUG_FIX, "Fix greeting bug", "Fixed issue with empty name parameter"),
            (ChangeType.PERFORMANCE_OPTIMIZATION, "Optimize string formatting", "Improved string concatenation performance"),
            (ChangeType.SECURITY_IMPROVEMENT, "Add input validation", "Added validation to prevent injection attacks"),
            (ChangeType.DOCUMENTATION_UPDATE, "Update docstrings", "Improved function documentation"),
            (ChangeType.REFACTORING, "Refactor greeting logic", "Simplified greeting implementation")
        ]
        
        change_ids = []
        for change_type, title, description in change_types_to_test:
            # Create/modify different files for each change
            change_file = os.path.join(temp_dir, f"module_{change_type.value}.py")
            with open(change_file, 'w') as f:
                f.write(f"# {title}\n# {description}\nprint('Test file for {change_type.value}')\n")
            
            # Track the change
            cid = trail.start_change_tracking(
                change_type=change_type,
                title=title,
                description=description,
                impact_level=ImpactLevel.MEDIUM if "security" in title.lower() else ImpactLevel.LOW
            )
            
            trail.add_file_changes(cid, [change_file])
            
            # Complete immediately for this test
            trail.complete_change_tracking(
                cid,
                decision_rationale=f"Implemented {title.lower()} as planned",
                test_results={"status": "passed"}
            )
            
            change_ids.append(cid)
            print(f"   ✅ {change_type.value}: {cid}")
        
        # Test 3: Query functionality
        print(f"\n🔍 Test 3: Query Functionality")
        
        # Query all changes
        all_changes = trail.query_changes(limit=100)
        print(f"   📊 Total changes tracked: {len(all_changes)}")
        
        # Query by type
        feature_changes = trail.query_changes(change_type=ChangeType.FEATURE_ADDITION)
        bug_fixes = trail.query_changes(change_type=ChangeType.BUG_FIX)
        security_changes = trail.query_changes(change_type=ChangeType.SECURITY_IMPROVEMENT)
        
        print(f"   📊 Feature additions: {len(feature_changes)}")
        print(f"   📊 Bug fixes: {len(bug_fixes)}")
        print(f"   📊 Security improvements: {len(security_changes)}")
        
        # Query by status
        implemented_changes = trail.query_changes(status=ChangeStatus.IMPLEMENTED)
        print(f"   📊 Implemented changes: {len(implemented_changes)}")
        
        # Query by date range
        today = datetime.now()
        yesterday = today - timedelta(days=1)
        recent_changes = trail.query_changes(start_date=yesterday, end_date=today)
        print(f"   📊 Changes in last 24 hours: {len(recent_changes)}")
        
        # Test 4: Statistics and reporting
        print(f"\n📈 Test 4: Statistics and Reporting")
        
        # Get evolution statistics
        stats = trail.get_evolution_statistics()
        print(f"   📊 Evolution Statistics:")
        print(f"      Total changes: {stats['total_changes']}")
        print(f"      Total lines added: {stats['total_lines_added']}")
        print(f"      Total lines removed: {stats['total_lines_removed']}")
        print(f"      Total files modified: {stats['total_files_modified']}")
        print(f"      Average duration: {stats['average_duration_hours']:.2f} hours")
        
        print(f"   📊 Change distribution by type:")
        for change_type, count in stats['by_type'].items():
            print(f"      {change_type}: {count}")
        
        print(f"   📊 Change distribution by status:")
        for status, count in stats['by_status'].items():
            print(f"      {status}: {count}")
        
        # Get timeline
        timeline = trail.get_evolution_timeline(days=1)
        print(f"   📊 Timeline entries: {len(timeline)}")
        if timeline:
            latest = timeline[0]
            print(f"      Latest day: {latest['date']}")
            print(f"      Changes: {latest['total_changes']}")
            print(f"      Lines added: {latest['total_lines_added']}")
        
        # Test 5: Report generation
        print(f"\n📄 Test 5: Report Generation")
        
        # Generate markdown report
        markdown_report = trail.generate_evolution_report(
            output_file=os.path.join(temp_dir, "evolution_report.md"),
            format="markdown",
            days=7
        )
        print(f"   ✅ Markdown report: {markdown_report}")
        
        # Generate HTML report
        html_report = trail.generate_evolution_report(
            output_file=os.path.join(temp_dir, "evolution_report.html"),
            format="html",
            days=7
        )
        print(f"   ✅ HTML report: {html_report}")
        
        # Generate JSON report
        json_report = trail.generate_evolution_report(
            output_file=os.path.join(temp_dir, "evolution_report.json"),
            format="json",
            days=7
        )
        print(f"   ✅ JSON report: {json_report}")
        
        # Test 6: Performance tracking
        print(f"\n⚡ Test 6: Performance Tracking")
        
        # Start a performance-related change
        perf_change_id = trail.start_change_tracking(
            change_type=ChangeType.PERFORMANCE_OPTIMIZATION,
            title="Optimize core algorithm",
            description="Implement faster sorting algorithm for improved performance",
            impact_level=ImpactLevel.HIGH
        )
        
        # Create performance test file
        perf_file = os.path.join(temp_dir, "performance_test.py")
        with open(perf_file, 'w') as f:
            f.write("""
import time

def slow_sort(data):
    # Intentionally slow bubble sort
    for i in range(len(data)):
        for j in range(len(data) - 1):
            if data[j] > data[j + 1]:
                data[j], data[j + 1] = data[j + 1], data[j]
    return data

def performance_test():
    data = list(range(100, 0, -1))
    start = time.time()
    slow_sort(data)
    return time.time() - start
""")
        
        trail.add_file_changes(perf_change_id, [perf_file])
        
        # Simulate optimization
        with open(perf_file, 'w') as f:
            f.write("""
import time

def fast_sort(data):
    # Use built-in efficient sort
    return sorted(data)

def performance_test():
    data = list(range(100, 0, -1))
    start = time.time()
    fast_sort(data)
    return time.time() - start
""")
        
        # Complete with performance metrics
        perf_record = trail.complete_change_tracking(
            perf_change_id,
            decision_rationale="Replaced bubble sort with built-in efficient sorting algorithm",
            test_results={
                "performance_improvement": "95% faster execution",
                "memory_usage": "reduced by 30%",
                "benchmark_score": "increased from 45 to 89"
            }
        )
        
        print(f"   ✅ Performance optimization tracked: {perf_change_id}")
        if perf_record.performance_before and perf_record.performance_after:
            print(f"   📊 Performance impact measured")
        
        # Test 7: Advanced features
        print(f"\n🎯 Test 7: Advanced Features")
        
        # Test change dependencies
        dependent_change_id = trail.start_change_tracking(
            change_type=ChangeType.FEATURE_ADDITION,
            title="Feature depending on optimization",
            description="New feature that requires the performance optimization",
            impact_level=ImpactLevel.MEDIUM
        )
        
        # Create dependent record with references
        dependent_record = trail.get_change_record(dependent_change_id)
        if dependent_record:
            dependent_record.depends_on = [perf_change_id]
            dependent_record.related_changes = [change_id]
            dependent_record.tags = ["feature", "dependent", "test"]
            dependent_record.external_references = ["https://github.com/test/issue/123"]
            trail._save_change_record(dependent_record)
        
        print(f"   ✅ Created dependent change: {dependent_change_id}")
        
        # Test file snapshot functionality
        snapshot = trail.create_file_snapshot(test_file)
        print(f"   ✅ File snapshot created:")
        print(f"      Hash: {snapshot.content_hash[:16]}...")
        print(f"      Size: {snapshot.size_bytes} bytes")
        print(f"      Lines: {snapshot.line_count}")
        
        # Display final results
        print(f"\n🎉 Evolution Trail Test Completed Successfully!")
        
        final_stats = trail.get_evolution_statistics()
        print(f"\n📊 Final Test Results:")
        print(f"   • Total changes tracked: {final_stats['total_changes']}")
        print(f"   • Total lines added: {final_stats['total_lines_added']}")
        print(f"   • Total lines removed: {final_stats['total_lines_removed']}")
        print(f"   • Total files modified: {final_stats['total_files_modified']}")
        print(f"   • Change types tested: {len(final_stats['by_type'])}")
        print(f"   • Database size: {os.path.getsize(trail.database_path) / 1024:.1f} KB")
        
        print(f"\n📁 Generated Files:")
        print(f"   • {trail.database_path} - Evolution database")
        print(f"   • {markdown_report} - Markdown report")
        print(f"   • {html_report} - HTML report")
        print(f"   • {json_report} - JSON report")
        
        # Copy reports to current directory for inspection
        import shutil
        current_dir = os.getcwd()
        
        try:
            shutil.copy2(markdown_report, os.path.join(current_dir, "test_evolution_report.md"))
            shutil.copy2(html_report, os.path.join(current_dir, "test_evolution_report.html"))
            shutil.copy2(json_report, os.path.join(current_dir, "test_evolution_report.json"))
            print(f"\n📋 Reports copied to current directory for inspection")
        except Exception as e:
            print(f"⚠️ Could not copy reports: {e}")

async def test_integration_scenarios():
    """Test integration scenarios with existing systems"""
    
    print(f"\n🔗 Testing Integration Scenarios")
    print("=" * 50)
    
    # Test with actual project files
    trail = EvolutionTrail()
    
    print("📂 Testing with actual project files...")
    
    # Check if we can track changes to existing files
    project_files = [
        "self_analysis.py",
        "comprehensive_evolution_system.py",
        "evolution_trail.py"
    ]
    
    existing_files = [f for f in project_files if os.path.exists(f)]
    print(f"   Found {len(existing_files)} existing project files")
    
    if existing_files:
        # Start tracking a documentation update
        doc_change_id = trail.start_change_tracking(
            change_type=ChangeType.DOCUMENTATION_UPDATE,
            title="Update project documentation",
            description="Add evolution trail documentation to existing modules",
            impact_level=ImpactLevel.LOW
        )
        
        trail.add_file_changes(doc_change_id, existing_files[:1])  # Track just one file
        
        # Complete the change
        trail.complete_change_tracking(
            doc_change_id,
            decision_rationale="Documentation needed to be updated for new evolution trail functionality"
        )
        
        print(f"   ✅ Tracked documentation update: {doc_change_id}")
    
    # Test querying real data
    all_changes = trail.query_changes(limit=10)
    print(f"   📊 Found {len(all_changes)} changes in project database")
    
    if all_changes:
        latest = all_changes[0]
        print(f"   📋 Latest change: {latest.title}")
        print(f"   📅 Date: {latest.timestamp.strftime('%Y-%m-%d %H:%M')}")
        print(f"   👤 Author: {latest.author}")
        print(f"   🏷️ Type: {latest.change_type.value}")
    
    # Generate a real project report
    print(f"\n📄 Generating project evolution report...")
    try:
        project_report = trail.generate_evolution_report(
            output_file="project_evolution_report.md",
            format="markdown",
            days=30
        )
        print(f"   ✅ Project report generated: {project_report}")
    except Exception as e:
        print(f"   ⚠️ Could not generate project report: {e}")

if __name__ == "__main__":
    async def main():
        await test_evolution_trail()
        await test_integration_scenarios()
    
    asyncio.run(main())
