#!/usr/bin/env python3
"""
FrontierAI Evolution Trail Integration
Demonstrates integration with existing self-analysis and evolution systems
"""

import os
import sys
from datetime import datetime
from pathlib import Path

# Import existing FrontierAI modules
try:
    from evolution_trail import EvolutionTrail, ChangeType, ChangeStatus, ImpactLevel
    print("✅ Evolution Trail imported successfully")
except ImportError as e:
    print(f"❌ Could not import Evolution Trail: {e}")
    sys.exit(1)

class FrontierEvolutionManager:
    """
    Integration manager for FrontierAI evolution tracking
    Combines self-analysis, improvement prioritization, and evolution trail
    """
    
    def __init__(self, project_root=None):
        """Initialize the evolution manager"""
        self.project_root = project_root or os.getcwd()
        self.evolution_trail = EvolutionTrail(
            database_path=os.path.join(self.project_root, "frontier_evolution.db"),
            repository_path=self.project_root
        )
        print(f"🧬 FrontierAI Evolution Manager initialized")
        print(f"📁 Project root: {self.project_root}")
        print(f"🗃️ Database: frontier_evolution.db")
    
    def track_system_enhancement(self, enhancement_type, title, description, files_affected=None):
        """Track a system enhancement with complete lifecycle"""
        
        print(f"\n🚀 Tracking System Enhancement: {title}")
        print("-" * 50)
        
        # Map enhancement types to change types
        type_mapping = {
            "self_analysis": ChangeType.FEATURE_ADDITION,
            "prioritization": ChangeType.PERFORMANCE_OPTIMIZATION,
            "evolution_system": ChangeType.FEATURE_ADDITION,
            "evolution_trail": ChangeType.FEATURE_ADDITION,
            "dashboard": ChangeType.UI_UX_IMPROVEMENT,
            "deployment": ChangeType.INFRASTRUCTURE_CHANGE,
            "testing": ChangeType.TEST_ADDITION,
            "documentation": ChangeType.DOCUMENTATION_UPDATE,
            "optimization": ChangeType.PERFORMANCE_OPTIMIZATION,
            "security": ChangeType.SECURITY_IMPROVEMENT,
            "bug_fix": ChangeType.BUG_FIX
        }
        
        change_type = type_mapping.get(enhancement_type, ChangeType.FEATURE_ADDITION)
        
        # Determine impact level based on type and description
        impact_keywords = {
            ImpactLevel.CRITICAL: ["critical", "breaking", "major refactor", "system-wide"],
            ImpactLevel.HIGH: ["significant", "major", "important", "core functionality"],
            ImpactLevel.MEDIUM: ["moderate", "enhancement", "improvement", "feature"],
            ImpactLevel.LOW: ["minor", "documentation", "cosmetic", "cleanup"]
        }
        
        impact_level = ImpactLevel.MEDIUM  # Default
        desc_lower = description.lower()
        for level, keywords in impact_keywords.items():
            if any(keyword in desc_lower for keyword in keywords):
                impact_level = level
                break
        
        # Start tracking
        change_id = self.evolution_trail.start_change_tracking(
            change_type=change_type,
            title=title,
            description=description,
            author="FrontierAI System",
            impact_level=impact_level
        )
        
        print(f"   🆔 Change ID: {change_id}")
        print(f"   🏷️ Type: {change_type.value}")
        print(f"   ⚡ Impact: {impact_level.value}")
        
        # Add files if specified
        if files_affected:
            existing_files = [f for f in files_affected if os.path.exists(f)]
            if existing_files:
                self.evolution_trail.add_file_changes(change_id, existing_files)
                print(f"   📁 Tracking {len(existing_files)} files")
        
        return change_id
    
    def complete_enhancement_tracking(self, change_id, success=True, results=None, notes=None):
        """Complete the tracking of a system enhancement"""
        
        # Default results
        default_results = {
            "implementation_status": "successful" if success else "failed",
            "timestamp": datetime.now().isoformat(),
            "automated_tracking": True
        }
        
        if results:
            default_results.update(results)
        
        # Complete tracking
        change_record = self.evolution_trail.complete_change_tracking(
            change_id,
            decision_rationale=notes or "Automated enhancement tracking by FrontierAI system",
            test_results=default_results,
            deployment_notes="Tracked automatically by FrontierEvolutionManager"
        )
        
        print(f"   ✅ Enhancement tracking completed")
        if change_record:
            print(f"   📊 Files modified: {change_record.files_modified}")
            print(f"   📊 Lines added: {change_record.lines_added}")
        
        return change_record
    
    def analyze_recent_evolution(self, days=7):
        """Analyze recent system evolution"""
        
        print(f"\n📊 Recent Evolution Analysis ({days} days)")
        print("-" * 50)
        
        # Get recent changes
        from datetime import timedelta
        start_date = datetime.now() - timedelta(days=days)
        recent_changes = self.evolution_trail.query_changes(
            start_date=start_date,
            limit=50
        )
        
        if not recent_changes:
            print("   📋 No recent changes found")
            return
        
        print(f"   📈 Total changes: {len(recent_changes)}")
        
        # Analyze by type
        type_counts = {}
        for change in recent_changes:
            change_type = change.change_type.value
            type_counts[change_type] = type_counts.get(change_type, 0) + 1
        
        print(f"   🔄 Changes by type:")
        for change_type, count in sorted(type_counts.items()):
            print(f"      • {change_type.replace('_', ' ').title()}: {count}")
        
        # Analyze by impact
        impact_counts = {}
        for change in recent_changes:
            impact = change.impact_level.value
            impact_counts[impact] = impact_counts.get(impact, 0) + 1
        
        print(f"   ⚡ Changes by impact:")
        for impact, count in sorted(impact_counts.items()):
            print(f"      • {impact.title()}: {count}")
        
        # Show latest changes
        print(f"   📋 Latest changes:")
        for change in recent_changes[:5]:
            print(f"      • {change.timestamp.strftime('%Y-%m-%d')}: {change.title}")
        
        return recent_changes
    
    def generate_evolution_summary(self):
        """Generate a comprehensive evolution summary"""
        
        print(f"\n📄 Generating Evolution Summary Report")
        print("-" * 50)
        
        try:
            # Generate reports in multiple formats
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Markdown report
            md_report = self.evolution_trail.generate_evolution_report(
                output_file=f"frontier_evolution_summary_{timestamp}.md",
                format="markdown",
                days=30
            )
            print(f"   ✅ Markdown report: {os.path.basename(md_report)}")
            
            # HTML report
            html_report = self.evolution_trail.generate_evolution_report(
                output_file=f"frontier_evolution_summary_{timestamp}.html",
                format="html",
                days=30
            )
            print(f"   ✅ HTML report: {os.path.basename(html_report)}")
            
            # JSON data
            json_report = self.evolution_trail.generate_evolution_report(
                output_file=f"frontier_evolution_data_{timestamp}.json",
                format="json",
                days=30
            )
            print(f"   ✅ JSON data: {os.path.basename(json_report)}")
            
            return {
                "markdown": md_report,
                "html": html_report,
                "json": json_report
            }
            
        except Exception as e:
            print(f"   ❌ Report generation failed: {e}")
            return None
    
    def track_existing_project_components(self):
        """Track existing FrontierAI project components"""
        
        print(f"\n🔍 Tracking Existing Project Components")
        print("-" * 50)
        
        # Define existing components to track
        components = [
            {
                "name": "Self-Analysis System",
                "files": ["self_analysis.py"],
                "type": "self_analysis",
                "description": "Repository analysis and improvement identification system"
            },
            {
                "name": "Comprehensive Evolution System",
                "files": ["comprehensive_evolution_system.py"],
                "type": "evolution_system", 
                "description": "Advanced system evolution and improvement management"
            },
            {
                "name": "Evolution Trail System",
                "files": ["evolution_trail.py"],
                "type": "evolution_trail",
                "description": "Comprehensive change tracking and audit trail system"
            },
            {
                "name": "Enhanced Production Handler",
                "files": ["enhanced_production_handler.py"],
                "type": "deployment",
                "description": "Production deployment and management system"
            },
            {
                "name": "Market Integration Dashboard",
                "files": ["market_integrated_dashboard.py"],
                "type": "dashboard",
                "description": "Integrated market analysis and dashboard system"
            }
        ]
        
        tracked_components = []
        
        for component in components:
            # Check if files exist
            existing_files = [f for f in component["files"] if os.path.exists(f)]
            
            if existing_files:
                # Track this component
                change_id = self.track_system_enhancement(
                    enhancement_type=component["type"],
                    title=f"Document existing component: {component['name']}",
                    description=f"Track existing {component['description']}",
                    files_affected=existing_files
                )
                
                # Complete tracking immediately for documentation
                self.complete_enhancement_tracking(
                    change_id,
                    success=True,
                    results={"component_type": "existing", "documentation": True},
                    notes=f"Documented existing {component['name']} as part of evolution trail initialization"
                )
                
                tracked_components.append(component['name'])
                print(f"   ✅ Tracked: {component['name']}")
            else:
                print(f"   ⚠️ Skipped: {component['name']} (files not found)")
        
        print(f"   📊 Total components tracked: {len(tracked_components)}")
        return tracked_components

def demonstrate_integration():
    """Demonstrate Evolution Trail integration with FrontierAI"""
    
    print("🧬 FrontierAI Evolution Trail Integration Demo")
    print("=" * 60)
    
    # Initialize evolution manager
    manager = FrontierEvolutionManager()
    
    # Track existing components
    tracked = manager.track_existing_project_components()
    
    # Analyze recent evolution
    recent_changes = manager.analyze_recent_evolution(days=30)
    
    # Get evolution statistics
    stats = manager.evolution_trail.get_evolution_statistics()
    print(f"\n📈 Evolution Statistics:")
    print(f"   • Total changes tracked: {stats['total_changes']}")
    print(f"   • Total files modified: {stats['total_files_modified']}")
    print(f"   • Total lines added: {stats['total_lines_added']}")
    
    # Generate summary report
    reports = manager.generate_evolution_summary()
    
    if reports:
        print(f"\n📋 Summary reports generated:")
        for format_type, file_path in reports.items():
            print(f"   • {format_type.upper()}: {os.path.basename(file_path)}")
    
    print(f"\n✨ Integration demonstration completed!")
    print(f"🚀 Evolution Trail is now integrated with FrontierAI system")
    
    return manager

if __name__ == "__main__":
    # Run the integration demonstration
    try:
        evolution_manager = demonstrate_integration()
        print(f"\n💡 The Evolution Trail is now ready to track all future changes to the FrontierAI system!")
    except Exception as e:
        print(f"\n❌ Integration demonstration failed: {e}")
        import traceback
        traceback.print_exc()
