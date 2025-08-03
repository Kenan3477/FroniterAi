#!/usr/bin/env python3
"""
Simple test for Evolution Trail Module
"""

import sys
import os
import tempfile

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from evolution_trail import EvolutionTrail, ChangeType, ChangeStatus, ImpactLevel

def simple_test():
    """Simple test of evolution trail functionality"""
    
    print("🧬 Evolution Trail Simple Test")
    print("=" * 40)
    
    # Create temporary test environment
    with tempfile.TemporaryDirectory() as temp_dir:
        # Initialize evolution trail
        trail = EvolutionTrail(
            database_path=os.path.join(temp_dir, "test.db"),
            repository_path=temp_dir
        )
        
        print(f"✅ Evolution trail initialized")
        
        # Create a test file
        test_file = os.path.join(temp_dir, "test.py")
        with open(test_file, 'w') as f:
            f.write("def hello():\n    return 'Hello World'\n")
        
        # Start tracking a change
        change_id = trail.start_change_tracking(
            change_type=ChangeType.FEATURE_ADDITION,
            title="Add hello function",
            description="Simple test function",
            author="Test User",
            impact_level=ImpactLevel.LOW
        )
        
        print(f"✅ Started tracking: {change_id}")
        
        # Add file to tracking
        trail.add_file_changes(change_id, [test_file])
        print(f"✅ Added file to tracking")
        
        # Modify the file
        with open(test_file, 'w') as f:
            f.write("def hello(name='World'):\n    return f'Hello {name}!'\n")
        
        # Complete tracking
        change_record = trail.complete_change_tracking(
            change_id,
            decision_rationale="Added name parameter for personalization"
        )
        
        print(f"✅ Completed tracking")
        print(f"📊 Files modified: {change_record.files_modified}")
        
        # Query changes
        changes = trail.query_changes()
        print(f"✅ Found {len(changes)} changes")
        
        if changes:
            change = changes[0]
            print(f"   Title: {change.title}")
            print(f"   Type: {change.change_type.value}")
            print(f"   Status: {change.status.value}")
        
        # Get statistics
        stats = trail.get_evolution_statistics()
        print(f"✅ Statistics:")
        print(f"   Total changes: {stats['total_changes']}")
        print(f"   Total files: {stats['total_files_modified']}")
        
        # Generate report
        report_file = trail.generate_evolution_report(
            output_file=os.path.join(temp_dir, "report.md"),
            format="markdown",
            days=1
        )
        
        print(f"✅ Generated report: {os.path.basename(report_file)}")
        
        # Copy report to current directory
        import shutil
        try:
            shutil.copy2(report_file, "evolution_test_report.md")
            print(f"✅ Report copied to current directory")
        except Exception as e:
            print(f"⚠️ Could not copy report: {e}")
        
        print(f"\n🎉 Simple test completed successfully!")

if __name__ == "__main__":
    simple_test()
