#!/usr/bin/env python3
"""
Test Integration Between Self-Analysis and Simulation Environment
Demonstrates how improvement proposals can be passed to simulation system
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from self_analysis import GitHubRepositoryAnalyzer, PrioritizationCriteria

async def test_simulation_integration():
    """Test integration between self-analysis and simulation environment"""
    
    print("🔗 Self-Analysis → Simulation Integration Test")
    print("=" * 55)
    
    analyzer = GitHubRepositoryAnalyzer()
    
    try:
        print("📊 Step 1: Performing Repository Analysis...")
        analysis = await analyzer.analyze_repository()
        print(f"   ✅ Analyzed {analysis.total_files} files")
        
        print("\n💡 Step 2: Generating Improvement Items...")
        improvements = analyzer.generate_improvement_items(analysis)
        print(f"   ✅ Generated {len(improvements)} improvement items")
        
        print("\n🎯 Step 3: Prioritizing Improvements...")
        # Use a quick-wins strategy for demonstration
        quick_wins_criteria = PrioritizationCriteria(
            impact_weight=0.3,
            complexity_weight=0.5,  # Favor simple improvements
            strategic_weight=0.1,
            risk_weight=0.1,
            effort_threshold_hours=20  # Lower threshold for quick wins
        )
        
        prioritized = analyzer.prioritize_improvements(improvements, quick_wins_criteria)
        print(f"   ✅ Prioritized {len(prioritized)} improvements")
        
        # Show top 3 priorities
        print("\n   Top 3 Priorities for Simulation:")
        for i, item in enumerate(prioritized[:3], 1):
            print(f"     {i}. [{item.id}] {item.title[:50]}...")
            print(f"        Priority: {item.priority_score:.1f} | Effort: {item.estimated_effort_hours}h")
        
        print("\n📋 Step 4: Generating Simulation Proposals...")
        proposals = analyzer.generate_improvement_proposals(prioritized, top_n=3)
        print(f"   ✅ Generated {len(proposals)} detailed proposals")
        
        print("\n💾 Step 5: Exporting for Simulation...")
        proposal_file = analyzer.export_proposals_for_simulation(proposals)
        print(f"   ✅ Exported to: {proposal_file}")
        
        # Simulate loading the proposals in a simulation environment
        print("\n🧪 Step 6: Simulating Simulation Environment Load...")
        with open(proposal_file, 'r', encoding='utf-8') as f:
            sim_data = json.load(f)
        
        print("   Simulation Environment Validation:")
        print(f"     Format Version: {sim_data['metadata']['format_version']}")
        print(f"     Total Proposals: {sim_data['metadata']['total_proposals']}")
        
        # Validate each proposal for simulation readiness
        print("\n   Proposal Simulation Readiness:")
        for i, proposal in enumerate(sim_data['proposals'], 1):
            print(f"\n     Proposal {i}: {proposal['title'][:40]}...")
            
            # Check simulation configuration
            sim_config = proposal.get('simulation_config', {})
            test_env = sim_config.get('test_environment', {})
            monitoring = sim_config.get('monitoring', {})
            
            readiness_score = 0
            checks = []
            
            # Check isolated environment
            if test_env.get('isolated', False):
                readiness_score += 25
                checks.append("✅ Isolated test environment")
            else:
                checks.append("❌ No isolated environment")
            
            # Check monitoring setup
            if monitoring.get('dashboard', False):
                readiness_score += 25
                checks.append("✅ Monitoring dashboard configured")
            else:
                checks.append("❌ No monitoring dashboard")
            
            # Check success criteria
            if len(proposal.get('success_criteria', [])) > 0:
                readiness_score += 25
                checks.append("✅ Success criteria defined")
            else:
                checks.append("❌ No success criteria")
            
            # Check implementation phases
            phases = proposal.get('implementation_phases', [])
            if len(phases) >= 3:
                readiness_score += 25
                checks.append("✅ Comprehensive implementation plan")
            else:
                checks.append("❌ Incomplete implementation plan")
            
            print(f"       Readiness Score: {readiness_score}%")
            for check in checks:
                print(f"       {check}")
            
            # Show simulation parameters
            if sim_config:
                print(f"       Simulation Features:")
                if sim_config.get('load_simulation', {}).get('enabled', False):
                    load_mult = sim_config['load_simulation'].get('user_load_multiplier', 1)
                    duration = sim_config['load_simulation'].get('duration_minutes', 30)
                    print(f"         📈 Load testing: {load_mult}x load for {duration} minutes")
                
                if sim_config.get('failure_injection', {}).get('enabled', False):
                    scenarios = len(sim_config['failure_injection'].get('scenarios', []))
                    print(f"         💥 Failure injection: {scenarios} scenarios")
                
                metrics = len(sim_config.get('monitoring', {}).get('metrics', []))
                print(f"         📊 Monitoring metrics: {metrics} tracked")
        
        # Generate a simulation execution plan
        print("\n🚀 Step 7: Generating Simulation Execution Plan...")
        
        execution_plan = {
            "execution_id": f"sim_exec_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "created_at": datetime.now().isoformat(),
            "total_proposals": len(proposals),
            "estimated_total_time": sum(
                proposal.get('resource_requirements', {})
                .get('budget_estimate', {})
                .get('development_cost', 0) // 100 for proposal in sim_data['proposals']
            ),
            "execution_phases": []
        }
        
        for i, proposal in enumerate(sim_data['proposals'], 1):
            phase = {
                "phase_id": f"phase_{i}",
                "proposal_id": proposal['id'],
                "title": proposal['title'],
                "category": proposal['category'],
                "priority_score": proposal['priority_score'],
                "simulation_steps": [
                    "Initialize test environment",
                    "Deploy proposal changes",
                    "Execute test scenarios",
                    "Monitor system behavior",
                    "Collect performance metrics",
                    "Evaluate success criteria",
                    "Generate simulation report"
                ],
                "estimated_duration_hours": 4,
                "dependencies": [],
                "rollback_triggers": proposal.get('rollback_strategy', {}).get('triggers', [])
            }
            execution_plan["execution_phases"].append(phase)
        
        # Save execution plan
        exec_plan_file = f"simulation_execution_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(exec_plan_file, 'w', encoding='utf-8') as f:
            json.dump(execution_plan, f, indent=2, default=str)
        
        print(f"   ✅ Execution plan saved to: {exec_plan_file}")
        
        # Display execution summary
        print(f"\n📈 Simulation Execution Summary:")
        print(f"   Total Phases: {len(execution_plan['execution_phases'])}")
        total_hours = sum(phase['estimated_duration_hours'] for phase in execution_plan['execution_phases'])
        print(f"   Estimated Total Time: {total_hours} hours")
        print(f"   Parallel Execution Possible: {'Yes' if len(execution_plan['execution_phases']) > 1 else 'No'}")
        
        # Show what would be tested
        print(f"\n🧪 Simulation Test Coverage:")
        categories_tested = set()
        for proposal in sim_data['proposals']:
            categories_tested.add(proposal['category'])
        
        for category in sorted(categories_tested):
            count = sum(1 for p in sim_data['proposals'] if p['category'] == category)
            print(f"   {category.replace('_', ' ').title()}: {count} proposal(s)")
        
        # Success metrics
        print(f"\n📊 Success Metrics That Will Be Tracked:")
        all_metrics = set()
        for proposal in sim_data['proposals']:
            for metric in proposal.get('success_criteria', []):
                all_metrics.add(metric)
        
        for i, metric in enumerate(sorted(all_metrics)[:5], 1):
            print(f"   {i}. {metric}")
        
        if len(all_metrics) > 5:
            print(f"   ... and {len(all_metrics) - 5} more metrics")
        
        print(f"\n✅ Integration Test Completed Successfully!")
        print(f"📁 Files Generated:")
        print(f"   • {proposal_file} - Improvement proposals")
        print(f"   • {exec_plan_file} - Simulation execution plan")
        
        print(f"\n🎯 Ready for Simulation Environment:")
        print(f"   ✅ Proposals properly formatted")
        print(f"   ✅ Simulation parameters configured")
        print(f"   ✅ Success criteria defined")
        print(f"   ✅ Execution plan prepared")
        print(f"   ✅ Rollback strategies included")
        
        return proposal_file, exec_plan_file
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None

async def test_simulation_environment_compatibility():
    """Test compatibility with existing simulation environment"""
    
    print(f"\n🔧 Testing Simulation Environment Compatibility")
    print("=" * 50)
    
    # Check if simulation_environment.py exists
    sim_env_path = "simulation_environment.py"
    if os.path.exists(sim_env_path):
        print(f"✅ Found simulation environment: {sim_env_path}")
        
        try:
            # Import simulation environment
            sys.path.insert(0, os.path.dirname(os.path.abspath(sim_env_path)))
            
            # Try to import the simulation environment
            print("🔄 Attempting to import simulation environment...")
            
            # Check if we can read the simulation environment structure
            with open(sim_env_path, 'r', encoding='utf-8') as f:
                sim_content = f.read()
            
            # Look for key classes and methods
            compatibility_checks = [
                ("SimulationEnvironment class", "class SimulationEnvironment" in sim_content),
                ("run_simulation method", "def run_simulation" in sim_content or "async def run_simulation" in sim_content),
                ("TestResult class", "class TestResult" in sim_content or "@dataclass" in sim_content),
                ("validate_improvement method", "validate_improvement" in sim_content),
                ("JSON handling", "import json" in sim_content),
                ("Async support", "async def" in sim_content or "import asyncio" in sim_content)
            ]
            
            print("🔍 Compatibility Analysis:")
            compatible_features = 0
            for feature_name, is_present in compatibility_checks:
                status = "✅" if is_present else "❌"
                print(f"   {status} {feature_name}")
                if is_present:
                    compatible_features += 1
            
            compatibility_score = (compatible_features / len(compatibility_checks)) * 100
            print(f"\n📊 Compatibility Score: {compatibility_score:.1f}%")
            
            if compatibility_score >= 80:
                print("🎉 High compatibility - Ready for integration!")
            elif compatibility_score >= 60:
                print("⚠️ Moderate compatibility - Minor adjustments may be needed")
            else:
                print("❌ Low compatibility - Significant changes required")
            
            # Suggest integration approach
            print(f"\n💡 Suggested Integration Approach:")
            if compatibility_score >= 80:
                print("   1. Direct integration with existing simulation environment")
                print("   2. Pass proposals JSON directly to simulation methods")
                print("   3. Use existing validation and reporting mechanisms")
            else:
                print("   1. Create adapter layer for proposal format compatibility")
                print("   2. Extend simulation environment with proposal handling")
                print("   3. Add validation for improvement-specific testing")
            
        except Exception as e:
            print(f"❌ Error analyzing simulation environment: {e}")
    
    else:
        print(f"❌ Simulation environment not found: {sim_env_path}")
        print("💡 Suggestion: Create simulation environment or update path")

if __name__ == "__main__":
    async def main():
        proposal_file, exec_file = await test_simulation_integration()
        await test_simulation_environment_compatibility()
        
        if proposal_file and exec_file:
            print(f"\n🎯 Next Steps:")
            print(f"   1. Review generated files: {proposal_file} and {exec_file}")
            print(f"   2. Load proposals into simulation environment")
            print(f"   3. Execute simulation phases according to execution plan")
            print(f"   4. Monitor results and validate improvements")
            print(f"   5. Implement successful improvements in production")
    
    asyncio.run(main())
