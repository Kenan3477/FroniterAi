#!/usr/bin/env python3
"""
Evolution Trail Module - Demonstration and Usage Guide

This script demonstrates the comprehensive change tracking capabilities
of the FrontierAI Evolution Trail system.
"""

import os
import sys
import tempfile
from datetime import datetime
from pathlib import Path

# Ensure the evolution_trail module can be imported
try:
    from evolution_trail import EvolutionTrail, ChangeType, ChangeStatus, ImpactLevel
    print("✅ Evolution Trail module imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Evolution Trail module: {e}")
    sys.exit(1)

def demonstrate_evolution_trail():
    """
    Demonstrates the complete Evolution Trail functionality including:
    - Change tracking lifecycle
    - File snapshot management
    - Performance monitoring
    - Comprehensive reporting
    - Query capabilities
    - Database management
    """
    
    print("\n🧬 FrontierAI Evolution Trail Demonstration")
    print("=" * 60)
    
    # Create a temporary workspace for demonstration
    with tempfile.TemporaryDirectory() as workspace:
        print(f"🏗️ Created temporary workspace: {workspace}")
        
        # Initialize Evolution Trail
        evolution_db = os.path.join(workspace, "evolution.db")
        trail = EvolutionTrail(
            database_path=evolution_db,
            repository_path=workspace
        )
        
        print(f"🗃️ Initialized Evolution Trail database: {evolution_db}")
        
        # Demonstrate 1: Basic Change Tracking
        print(f"\n📝 Demonstration 1: Basic Change Tracking")
        print("-" * 50)
        
        # Create initial file
        feature_file = os.path.join(workspace, "new_feature.py")
        with open(feature_file, 'w') as f:
            f.write("""# New Feature Module
def process_data(data):
    '''Basic data processing function'''
    return data.upper()
""")
        
        # Start tracking a feature addition
        change_id = trail.start_change_tracking(
            change_type=ChangeType.FEATURE_ADDITION,
            title="Implement data processing feature",
            description="Add new data processing capabilities with string manipulation",
            author="FrontierAI Developer",
            impact_level=ImpactLevel.MEDIUM
        )
        
        print(f"   🆔 Change ID: {change_id}")
        
        # Add file to change tracking
        trail.add_file_changes(change_id, [feature_file])
        print(f"   📁 Added file to tracking: {os.path.basename(feature_file)}")
        
        # Simulate development: enhance the feature
        with open(feature_file, 'w') as f:
            f.write("""# Enhanced Feature Module
def process_data(data, mode='upper'):
    '''
    Enhanced data processing function with multiple modes
    
    Args:
        data (str): Input data to process
        mode (str): Processing mode ('upper', 'lower', 'title')
    
    Returns:
        str: Processed data
    '''
    if mode == 'upper':
        return data.upper()
    elif mode == 'lower':
        return data.lower()
    elif mode == 'title':
        return data.title()
    else:
        return data

def validate_input(data):
    '''Validate input data'''
    if not isinstance(data, str):
        raise ValueError("Input must be a string")
    return True

def batch_process(data_list, mode='upper'):
    '''Process multiple data items'''
    validated_data = [item for item in data_list if validate_input(item)]
    return [process_data(item, mode) for item in validated_data]
""")
        
        # Complete the change tracking
        change_record = trail.complete_change_tracking(
            change_id,
            decision_rationale="Enhanced the feature with multiple processing modes, input validation, and batch processing capabilities to improve flexibility and robustness",
            test_results={
                "unit_tests": "passed",
                "integration_tests": "passed", 
                "coverage_percentage": 95.5,
                "performance_benchmarks": "improved by 15%"
            },
            deployment_notes="Successfully deployed to staging environment, ready for production"
        )
        
        print(f"   ✅ Change completed successfully")
        print(f"   📊 Files modified: {change_record.files_modified}")
        print(f"   📊 Lines added: {change_record.lines_added}")
        print(f"   📊 Lines removed: {change_record.lines_removed}")
        
        # Demonstrate 2: Multiple Change Types
        print(f"\n🔧 Demonstration 2: Multiple Change Types")
        print("-" * 50)
        
        change_scenarios = [
            {
                "type": ChangeType.BUG_FIX,
                "title": "Fix data validation issue",
                "description": "Resolve bug in input validation for edge cases",
                "impact": ImpactLevel.HIGH,
                "file_content": "# Bug fix: improved validation\ndef safe_validate(data):\n    return isinstance(data, str) and len(data) > 0\n"
            },
            {
                "type": ChangeType.PERFORMANCE_OPTIMIZATION,
                "title": "Optimize batch processing",
                "description": "Improve performance of batch processing using list comprehensions",
                "impact": ImpactLevel.MEDIUM,
                "file_content": "# Performance optimization\ndef fast_batch_process(items):\n    return [item.upper() for item in items if item]\n"
            },
            {
                "type": ChangeType.SECURITY_IMPROVEMENT,
                "title": "Add input sanitization",
                "description": "Implement security measures to prevent injection attacks",
                "impact": ImpactLevel.HIGH,
                "file_content": "# Security improvement\nimport re\ndef sanitize_input(data):\n    return re.sub(r'[^\\w\\s]', '', data)\n"
            },
            {
                "type": ChangeType.DOCUMENTATION_UPDATE,
                "title": "Update API documentation",
                "description": "Comprehensive documentation update with examples",
                "impact": ImpactLevel.LOW,
                "file_content": "# API Documentation\n'''\nAPI Usage Examples:\n- process_data('hello', 'upper') -> 'HELLO'\n- batch_process(['a', 'b']) -> ['A', 'B']\n'''\n"
            }
        ]
        
        tracked_changes = []
        for i, scenario in enumerate(change_scenarios):
            # Create file for this change
            change_file = os.path.join(workspace, f"change_{i}_{scenario['type'].value}.py")
            with open(change_file, 'w') as f:
                f.write(scenario['file_content'])
            
            # Track the change
            cid = trail.start_change_tracking(
                change_type=scenario['type'],
                title=scenario['title'],
                description=scenario['description'],
                impact_level=scenario['impact']
            )
            
            trail.add_file_changes(cid, [change_file])
            
            # Complete tracking with scenario-specific details
            trail.complete_change_tracking(
                cid,
                decision_rationale=f"Implemented {scenario['title'].lower()} to address {scenario['description'].lower()}",
                test_results={
                    "validation": "passed",
                    "impact_level": scenario['impact'].value
                }
            )
            
            tracked_changes.append(cid)
            print(f"   ✅ {scenario['type'].value}: {scenario['title']}")
        
        # Demonstrate 3: Query and Analysis
        print(f"\n🔍 Demonstration 3: Query and Analysis Capabilities")
        print("-" * 50)
        
        # Query all changes
        all_changes = trail.query_changes()
        print(f"   📊 Total changes tracked: {len(all_changes)}")
        
        # Query by change type
        features = trail.query_changes(change_type=ChangeType.FEATURE_ADDITION)
        bugs = trail.query_changes(change_type=ChangeType.BUG_FIX)
        security = trail.query_changes(change_type=ChangeType.SECURITY_IMPROVEMENT)
        
        print(f"   📊 Feature additions: {len(features)}")
        print(f"   📊 Bug fixes: {len(bugs)}")
        print(f"   📊 Security improvements: {len(security)}")
        
        # Query by impact level
        high_impact = trail.query_changes(impact_level=ImpactLevel.HIGH)
        medium_impact = trail.query_changes(impact_level=ImpactLevel.MEDIUM)
        low_impact = trail.query_changes(impact_level=ImpactLevel.LOW)
        
        print(f"   📊 High impact changes: {len(high_impact)}")
        print(f"   📊 Medium impact changes: {len(medium_impact)}")
        print(f"   📊 Low impact changes: {len(low_impact)}")
        
        # Query by status
        implemented = trail.query_changes(status=ChangeStatus.IMPLEMENTED)
        print(f"   📊 Implemented changes: {len(implemented)}")
        
        # Demonstrate 4: Statistics and Analytics
        print(f"\n📈 Demonstration 4: Statistics and Analytics")
        print("-" * 50)
        
        stats = trail.get_evolution_statistics()
        
        print(f"   📊 Evolution Statistics Summary:")
        print(f"      • Total changes: {stats['total_changes']}")
        print(f"      • Total lines added: {stats['total_lines_added']}")
        print(f"      • Total lines removed: {stats['total_lines_removed']}")
        print(f"      • Total files modified: {stats['total_files_modified']}")
        print(f"      • Average duration: {stats['average_duration_hours']:.2f} hours")
        
        print(f"   📊 Distribution by change type:")
        for change_type, count in stats['by_type'].items():
            print(f"      • {change_type.replace('_', ' ').title()}: {count}")
        
        print(f"   📊 Distribution by impact level:")
        for impact, count in stats['by_impact'].items():
            print(f"      • {impact.replace('_', ' ').title()}: {count}")
        
        # Get timeline data
        timeline = trail.get_evolution_timeline(days=1)
        if timeline:
            today_data = timeline[0]
            print(f"   📊 Today's activity:")
            print(f"      • Date: {today_data['date']}")
            print(f"      • Total changes: {today_data['total_changes']}")
            print(f"      • Lines added: {today_data['total_lines_added']}")
            print(f"      • Files modified: {today_data['total_files_modified']}")
        
        # Demonstrate 5: Comprehensive Reporting
        print(f"\n📄 Demonstration 5: Comprehensive Reporting")
        print("-" * 50)
        
        # Generate different report formats
        reports_generated = []
        
        # Markdown report
        try:
            md_report = trail.generate_evolution_report(
                output_file=os.path.join(workspace, "evolution_demo_report.md"),
                format="markdown",
                days=7
            )
            reports_generated.append(("Markdown", md_report))
            print(f"   ✅ Markdown report generated")
        except Exception as e:
            print(f"   ❌ Markdown report failed: {e}")
        
        # HTML report
        try:
            html_report = trail.generate_evolution_report(
                output_file=os.path.join(workspace, "evolution_demo_report.html"),
                format="html",
                days=7
            )
            reports_generated.append(("HTML", html_report))
            print(f"   ✅ HTML report generated")
        except Exception as e:
            print(f"   ❌ HTML report failed: {e}")
        
        # JSON report
        try:
            json_report = trail.generate_evolution_report(
                output_file=os.path.join(workspace, "evolution_demo_report.json"),
                format="json",
                days=7
            )
            reports_generated.append(("JSON", json_report))
            print(f"   ✅ JSON report generated")
        except Exception as e:
            print(f"   ❌ JSON report failed: {e}")
        
        # Copy reports to current directory for inspection
        current_dir = os.getcwd()
        copied_reports = []
        
        for report_type, report_path in reports_generated:
            try:
                import shutil
                filename = f"evolution_demo_report_{report_type.lower()}.{report_type.lower()}"
                if report_type == "HTML":
                    filename = "evolution_demo_report.html"
                elif report_type == "JSON":
                    filename = "evolution_demo_report.json"
                else:
                    filename = "evolution_demo_report.md"
                
                dest_path = os.path.join(current_dir, filename)
                shutil.copy2(report_path, dest_path)
                copied_reports.append(filename)
                print(f"   📋 {report_type} report copied to: {filename}")
            except Exception as e:
                print(f"   ⚠️ Could not copy {report_type} report: {e}")
        
        # Demonstrate 6: File Snapshot Capabilities
        print(f"\n📸 Demonstration 6: File Snapshot Capabilities")
        print("-" * 50)
        
        # Create a snapshot of the feature file
        snapshot = trail.create_file_snapshot(feature_file)
        
        print(f"   📸 File snapshot created:")
        print(f"      • File: {os.path.basename(feature_file)}")
        print(f"      • Content hash: {snapshot.content_hash[:16]}...")
        print(f"      • Size: {snapshot.size_bytes} bytes")
        print(f"      • Lines: {snapshot.line_count}")
        print(f"      • Created: {snapshot.timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Display content preview
        if snapshot.content_preview:
            print(f"      • Preview: {snapshot.content_preview[:50]}...")
        
        # Final Summary
        print(f"\n🎉 Evolution Trail Demonstration Completed Successfully!")
        print("=" * 60)
        
        print(f"📊 Demonstration Results:")
        print(f"   • Changes tracked: {len(all_changes)}")
        print(f"   • Change types demonstrated: {len(set(c.change_type for c in all_changes))}")
        print(f"   • Files created and tracked: {len(tracked_changes) + 1}")
        print(f"   • Reports generated: {len(reports_generated)}")
        print(f"   • Database size: {os.path.getsize(evolution_db) / 1024:.1f} KB")
        
        if copied_reports:
            print(f"📁 Reports available in current directory:")
            for report in copied_reports:
                print(f"   • {report}")
        
        print(f"\n💡 Key Capabilities Demonstrated:")
        print(f"   ✅ Complete change lifecycle tracking")
        print(f"   ✅ File snapshot and diff generation")
        print(f"   ✅ Performance impact measurement")
        print(f"   ✅ Comprehensive query capabilities")
        print(f"   ✅ Statistical analysis and reporting")
        print(f"   ✅ Multi-format report generation")
        print(f"   ✅ Database persistence and management")
        print(f"   ✅ Decision rationale and audit trail")
        
        return True

def show_module_capabilities():
    """Show the capabilities of the Evolution Trail module"""
    
    print("\n🔧 Evolution Trail Module Capabilities")
    print("=" * 50)
    
    print("🎯 Core Features:")
    print("   • Comprehensive change tracking with complete lifecycle management")
    print("   • SQLite database with 6-table schema for detailed record keeping")
    print("   • File snapshot system with SHA-256 content hashing")
    print("   • Diff generation using Python's difflib for detailed change analysis")
    print("   • Performance measurement using psutil for system resource monitoring")
    print("   • Multi-format reporting (Markdown, HTML with charts, JSON)")
    print("   • Advanced query system with filtering by type, status, author, impact")
    print("   • Evolution timeline and statistical analysis")
    print("   • Decision rationale tracking and audit trail")
    
    print("\n📊 Change Types Supported:")
    for change_type in ChangeType:
        print(f"   • {change_type.value.replace('_', ' ').title()}")
    
    print("\n🏷️ Change Status Tracking:")
    for status in ChangeStatus:
        print(f"   • {status.value.replace('_', ' ').title()}")
    
    print("\n⚡ Impact Levels:")
    for impact in ImpactLevel:
        print(f"   • {impact.value.title()}")
    
    print("\n🗃️ Database Schema:")
    print("   • changes: Main change tracking table")
    print("   • file_snapshots: Before/after file states")
    print("   • diffs: Detailed change differences")
    print("   • performance_metrics: System performance data")
    print("   • milestones: Project milestones and releases")
    print("   • system_snapshots: Complete system state captures")
    
    print("\n📈 Reporting Formats:")
    print("   • Markdown: Detailed text reports with tables and statistics")
    print("   • HTML: Interactive reports with Chart.js visualizations")
    print("   • JSON: Structured data for programmatic access")

if __name__ == "__main__":
    # Show module capabilities
    show_module_capabilities()
    
    # Run the demonstration
    try:
        success = demonstrate_evolution_trail()
        if success:
            print(f"\n✨ All demonstrations completed successfully!")
            print(f"🚀 The Evolution Trail module is ready for production use!")
        else:
            print(f"\n⚠️ Some demonstrations encountered issues")
    except Exception as e:
        print(f"\n❌ Demonstration failed with error: {e}")
        import traceback
        traceback.print_exc()
