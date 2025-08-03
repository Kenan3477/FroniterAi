#!/usr/bin/env python3
"""
Test script for Self-Analysis Module with Improvement Prioritization
Demonstrates comprehensive repository analysis and improvement prioritization capabilities
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from self_analysis import GitHubRepositoryAnalyzer, PrioritizationCriteria, ImprovementCategory

async def test_self_analysis():
    """Test the self-analysis module capabilities with prioritization"""
    
    print("🔍 Self-Analysis Module Test with Improvement Prioritization")
    print("=" * 65)
    
    # Initialize analyzer
    analyzer = GitHubRepositoryAnalyzer()
    
    print(f"📁 Analyzing repository: {analyzer.repository_path}")
    print(f"🔧 Supported file types: {len(analyzer.supported_extensions)}")
    
    try:
        # Perform comprehensive analysis
        print("\n🚀 Starting comprehensive repository analysis...")
        analysis = await analyzer.analyze_repository()
        
        # Display key results
        print(f"\n📊 Analysis Results Summary:")
        print(f"   Repository Path: {analysis.repository_path}")
        print(f"   Analysis Time: {analysis.analysis_timestamp}")
        print(f"   Total Files: {analysis.total_files:,}")
        print(f"   Total Size: {analysis.total_size_bytes / 1024 / 1024:.2f} MB")
        
        # Overall Metrics
        metrics = analysis.overall_metrics
        print(f"\n📈 Code Metrics:")
        print(f"   Lines of Code: {metrics.lines_of_code:,}")
        print(f"   Functions: {metrics.function_count:,}")
        print(f"   Classes: {metrics.class_count:,}")
        print(f"   Documentation Ratio: {metrics.documentation_ratio:.2%}")
        print(f"   Avg Complexity: {metrics.cyclomatic_complexity}")
        print(f"   Technical Debt Score: {metrics.technical_debt_score:.1f}/100")
        
        # Architecture Analysis
        arch = analysis.architecture_analysis
        print(f"\n🏗️ Architecture Analysis:")
        print(f"   File Types: {len(arch.get('file_types', {}))}")
        print(f"   Directories: {arch.get('directory_structure', {}).get('total_directories', 0)}")
        print(f"   Max Depth: {arch.get('directory_structure', {}).get('max_depth', 0)}")
        print(f"   Patterns Detected: {len(arch.get('architecture_patterns', []))}")
        
        if arch.get('architecture_patterns'):
            print("   Detected Patterns:")
            for pattern in arch['architecture_patterns']:
                print(f"     ✅ {pattern}")
        
        # Generate improvement items
        print(f"\n💡 Generating Improvement Items...")
        improvements = analyzer.generate_improvement_items(analysis)
        print(f"   Generated {len(improvements)} improvement items")
        
        # Display improvement categories
        category_counts = {}
        for improvement in improvements:
            cat = improvement.category.value
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        print(f"\n📋 Improvement Categories:")
        for category, count in sorted(category_counts.items()):
            print(f"   {category.replace('_', ' ').title()}: {count} items")
        
        # Test different prioritization criteria
        print(f"\n🎯 Testing Prioritization Strategies:")
        
        # Default prioritization
        print("\n   1. Default Prioritization (Impact-focused):")
        default_criteria = PrioritizationCriteria()
        prioritized_default = analyzer.prioritize_improvements(improvements, default_criteria)
        
        for i, item in enumerate(prioritized_default[:3], 1):
            print(f"      {i}. [{item.id}] {item.title[:50]}...")
            print(f"         Priority: {item.priority_score:.1f} | Impact: {item.impact_level.value}")
        
        # Complexity-focused prioritization (prefer simple fixes)
        print("\n   2. Complexity-focused Prioritization (Quick wins):")
        quick_win_criteria = PrioritizationCriteria(
            impact_weight=0.3,
            complexity_weight=0.5,  # Higher weight for low complexity
            strategic_weight=0.1,
            risk_weight=0.1
        )
        prioritized_quick = analyzer.prioritize_improvements(improvements, quick_win_criteria)
        
        for i, item in enumerate(prioritized_quick[:3], 1):
            print(f"      {i}. [{item.id}] {item.title[:50]}...")
            print(f"         Priority: {item.priority_score:.1f} | Complexity: {item.complexity_level.value}")
        
        # Strategic-focused prioritization
        print("\n   3. Strategic-focused Prioritization (Long-term):")
        strategic_criteria = PrioritizationCriteria(
            impact_weight=0.2,
            complexity_weight=0.2,
            strategic_weight=0.5,  # Higher weight for strategic alignment
            risk_weight=0.1
        )
        prioritized_strategic = analyzer.prioritize_improvements(improvements, strategic_criteria)
        
        for i, item in enumerate(prioritized_strategic[:3], 1):
            print(f"      {i}. [{item.id}] {item.title[:50]}...")
            print(f"         Priority: {item.priority_score:.1f} | Strategic: {item.strategic_alignment.value}")
        
        # Generate detailed proposals
        print(f"\n📋 Generating Detailed Improvement Proposals...")
        proposals = analyzer.generate_improvement_proposals(prioritized_default, top_n=3)
        print(f"   Generated {len(proposals)} detailed proposals")
        
        # Display proposal details
        print(f"\n📄 Proposal Details:")
        for i, proposal in enumerate(proposals, 1):
            print(f"\n   {i}. {proposal.title}")
            print(f"      Category: {proposal.category.value.replace('_', ' ').title()}")
            print(f"      Priority Score: {proposal.priority_score:.1f}")
            print(f"      Timeline: {proposal.estimated_timeline}")
            
            # Implementation phases
            phases = proposal.implementation_plan.get('phases', [])
            total_days = sum(phase.get('duration_days', 0) for phase in phases)
            print(f"      Implementation: {len(phases)} phases, {total_days} days total")
            
            # Resource requirements
            budget = proposal.resource_requirements.get('budget_estimate', {})
            total_cost = budget.get('total_cost', 0)
            print(f"      Budget Estimate: ${total_cost:,.0f}")
            
            # Testing strategy
            testing = proposal.testing_strategy
            test_types = [key for key, value in testing.items() if isinstance(value, dict) and value.get('required', False)]
            print(f"      Testing Required: {', '.join(test_types)}")
            
            # Simulation parameters
            sim_params = proposal.simulation_parameters
            print(f"      Simulation: {'Enabled' if sim_params.get('test_environment', {}).get('isolated', False) else 'Basic'}")
        
        # Export proposals for simulation
        print(f"\n💾 Exporting Proposals for Simulation...")
        proposal_file = analyzer.export_proposals_for_simulation(proposals)
        print(f"   Exported to: {proposal_file}")
        
        # Load and display simulation export structure
        with open(proposal_file, 'r', encoding='utf-8') as f:
            sim_data = json.load(f)
        
        print(f"\n🔍 Simulation Export Structure:")
        print(f"   Format Version: {sim_data['metadata']['format_version']}")
        print(f"   Total Proposals: {sim_data['metadata']['total_proposals']}")
        print(f"   Generated: {sim_data['metadata']['generated_at']}")
        
        # Test proposal validation
        print(f"\n✅ Proposal Validation:")
        valid_proposals = 0
        for proposal_data in sim_data['proposals']:
            required_fields = ['id', 'title', 'simulation_config', 'success_criteria', 'implementation_phases']
            has_all_fields = all(field in proposal_data for field in required_fields)
            if has_all_fields:
                valid_proposals += 1
            print(f"   Proposal {proposal_data['id']}: {'✅ Valid' if has_all_fields else '❌ Invalid'}")
        
        print(f"   Valid proposals: {valid_proposals}/{len(sim_data['proposals'])}")
        
        # Generate analysis reports
        print(f"\n📄 Generating Analysis Reports...")
        
        # Markdown report
        markdown_report = analyzer.generate_analysis_report(analysis, 'markdown')
        markdown_filename = f"analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(markdown_filename, 'w', encoding='utf-8') as f:
            f.write(markdown_report)
        print(f"   📋 Markdown report: {markdown_filename}")
        
        # HTML report
        html_report = analyzer.generate_analysis_report(analysis, 'html')
        html_filename = f"analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        with open(html_filename, 'w', encoding='utf-8') as f:
            f.write(html_report)
        print(f"   🌐 HTML report: {html_filename}")
        
        # JSON report
        json_report = analyzer.generate_analysis_report(analysis, 'json')
        json_filename = f"analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(json_filename, 'w', encoding='utf-8') as f:
            f.write(json_report)
        print(f"   📊 JSON report: {json_filename}")
        
        # Performance summary
        print(f"\n⚡ Performance Summary:")
        print(f"   Analysis Duration: Completed")
        print(f"   Files Processed: {analysis.total_files:,}")
        print(f"   Improvements Generated: {len(improvements)}")
        print(f"   Proposals Created: {len(proposals)}")
        print(f"   Data Generated: ~{len(json_report) / 1024:.1f} KB")
        print(f"   Reports Created: 4 files (3 analysis + 1 proposals)")
        
        print(f"\n🎉 Enhanced Self-Analysis Test Completed Successfully!")
        print(f"   ✅ Repository structure analyzed")
        print(f"   ✅ Code quality assessed")
        print(f"   ✅ Security vulnerabilities identified")
        print(f"   ✅ Technical debt quantified")
        print(f"   ✅ Improvement items generated")
        print(f"   ✅ Prioritization strategies tested")
        print(f"   ✅ Detailed proposals created")
        print(f"   ✅ Simulation export prepared")
        print(f"   ✅ Comprehensive reports generated")
        
    except Exception as e:
        print(f"❌ Self-analysis test failed: {e}")
        import traceback
        traceback.print_exc()

async def test_specific_capabilities():
    """Test specific analysis and prioritization capabilities"""
    
    print(f"\n🧪 Testing Specific Analysis & Prioritization Capabilities")
    print("=" * 65)
    
    analyzer = GitHubRepositoryAnalyzer()
    
    # Test best practices loading
    print("📋 Best Practices Configuration:")
    practices = analyzer.best_practices
    for lang, rules in practices.items():
        if isinstance(rules, dict):
            print(f"   {lang}: {len(rules)} rule categories")
    
    # Test industry standards
    print("\n🏭 Industry Standards Configuration:")
    standards = analyzer.industry_standards
    for category, items in standards.items():
        if isinstance(items, dict):
            print(f"   {category}: {len(items)} subcategories")
    
    # Test file type support
    print(f"\n📁 File Type Support:")
    print(f"   Supported extensions: {len(analyzer.supported_extensions)}")
    for ext, file_type in list(analyzer.supported_extensions.items())[:10]:
        print(f"   {ext} → {file_type}")
    if len(analyzer.supported_extensions) > 10:
        print(f"   ... and {len(analyzer.supported_extensions) - 10} more")
    
    # Test prioritization criteria configurations
    print(f"\n🎯 Prioritization Criteria Testing:")
    
    test_criteria = [
        ("Default (Balanced)", PrioritizationCriteria()),
        ("Impact-focused", PrioritizationCriteria(impact_weight=0.6, complexity_weight=0.2, strategic_weight=0.1, risk_weight=0.1)),
        ("Quick-wins", PrioritizationCriteria(impact_weight=0.2, complexity_weight=0.6, strategic_weight=0.1, risk_weight=0.1)),
        ("Strategic", PrioritizationCriteria(impact_weight=0.2, complexity_weight=0.2, strategic_weight=0.5, risk_weight=0.1)),
        ("Risk-averse", PrioritizationCriteria(impact_weight=0.3, complexity_weight=0.3, strategic_weight=0.2, risk_weight=0.2))
    ]
    
    for name, criteria in test_criteria:
        print(f"   {name}:")
        print(f"     Impact: {criteria.impact_weight:.1%}")
        print(f"     Complexity: {criteria.complexity_weight:.1%}")
        print(f"     Strategic: {criteria.strategic_weight:.1%}")
        print(f"     Risk: {criteria.risk_weight:.1%}")
        print(f"     Effort Threshold: {criteria.effort_threshold_hours}h")
    
    # Test improvement categories
    print(f"\n📊 Improvement Categories:")
    for category in ImprovementCategory:
        print(f"   {category.value.replace('_', ' ').title()}")
    
    print(f"\n✅ Capability tests completed!")

async def test_prioritization_algorithms():
    """Test prioritization algorithms with sample data"""
    
    print(f"\n🔬 Testing Prioritization Algorithms")
    print("=" * 50)
    
    analyzer = GitHubRepositoryAnalyzer()
    
    # Create sample improvement items for testing
    from self_analysis import ImprovementItem, ImpactLevel, ComplexityLevel, StrategicAlignment
    
    sample_improvements = [
        ImprovementItem(
            id="TEST-001",
            title="Fix Critical Security Vulnerability",
            description="Remove hardcoded credentials from configuration files",
            category=ImprovementCategory.SECURITY,
            impact_level=ImpactLevel.CRITICAL,
            complexity_level=ComplexityLevel.SIMPLE,
            strategic_alignment=StrategicAlignment.CORE,
            affected_files=["config.py"],
            estimated_effort_hours=4,
            prerequisites=[],
            benefits=["Improved security"],
            risks=["Service disruption during fix"],
            implementation_steps=["Identify hardcoded values", "Replace with environment variables"],
            validation_criteria=["Security scan passes"]
        ),
        ImprovementItem(
            id="TEST-002",
            title="Implement Comprehensive Testing Framework",
            description="Add unit tests, integration tests, and CI/CD pipeline",
            category=ImprovementCategory.TESTING,
            impact_level=ImpactLevel.HIGH,
            complexity_level=ComplexityLevel.COMPLEX,
            strategic_alignment=StrategicAlignment.CORE,
            affected_files=[],
            estimated_effort_hours=40,
            prerequisites=["Testing framework selection"],
            benefits=["Better code quality", "Faster development"],
            risks=["Initial development slowdown"],
            implementation_steps=["Setup testing framework", "Write tests", "Configure CI/CD"],
            validation_criteria=["80% test coverage", "All tests passing"]
        ),
        ImprovementItem(
            id="TEST-003",
            title="Optimize Database Queries",
            description="Add indexes and optimize slow queries for better performance",
            category=ImprovementCategory.PERFORMANCE,
            impact_level=ImpactLevel.MEDIUM,
            complexity_level=ComplexityLevel.MODERATE,
            strategic_alignment=StrategicAlignment.BENEFICIAL,
            affected_files=["database.py", "queries.sql"],
            estimated_effort_hours=16,
            prerequisites=["Performance profiling"],
            benefits=["Faster response times"],
            risks=["Database schema changes"],
            implementation_steps=["Profile queries", "Add indexes", "Test performance"],
            validation_criteria=["50% performance improvement"]
        ),
        ImprovementItem(
            id="TEST-004",
            title="Update Documentation",
            description="Add missing docstrings and update README files",
            category=ImprovementCategory.DOCUMENTATION,
            impact_level=ImpactLevel.LOW,
            complexity_level=ComplexityLevel.SIMPLE,
            strategic_alignment=StrategicAlignment.IMPORTANT,
            affected_files=["*.py", "README.md"],
            estimated_effort_hours=12,
            prerequisites=[],
            benefits=["Better maintainability"],
            risks=["Time investment"],
            implementation_steps=["Audit documentation", "Add missing docs", "Update README"],
            validation_criteria=["Documentation coverage > 80%"]
        )
    ]
    
    print(f"📝 Sample Improvements Created: {len(sample_improvements)}")
    for improvement in sample_improvements:
        print(f"   {improvement.id}: {improvement.title}")
    
    # Test different prioritization strategies
    strategies = [
        ("Balanced", PrioritizationCriteria()),
        ("Security-First", PrioritizationCriteria(impact_weight=0.7, complexity_weight=0.2, strategic_weight=0.05, risk_weight=0.05)),
        ("Quick-Wins", PrioritizationCriteria(impact_weight=0.3, complexity_weight=0.5, strategic_weight=0.1, risk_weight=0.1)),
        ("Strategic", PrioritizationCriteria(impact_weight=0.2, complexity_weight=0.2, strategic_weight=0.6, risk_weight=0.0))
    ]
    
    print(f"\n🎯 Testing Prioritization Strategies:")
    
    for strategy_name, criteria in strategies:
        print(f"\n   {strategy_name} Strategy:")
        prioritized = analyzer.prioritize_improvements(sample_improvements, criteria)
        
        for i, item in enumerate(prioritized, 1):
            print(f"      {i}. [{item.id}] {item.title[:40]}...")
            print(f"         Score: {item.priority_score:.1f} | Impact: {item.impact_level.value} | Complexity: {item.complexity_level.value}")
    
    # Test proposal generation
    print(f"\n📋 Testing Proposal Generation:")
    default_prioritized = analyzer.prioritize_improvements(sample_improvements)
    proposals = analyzer.generate_improvement_proposals(default_prioritized, top_n=2)
    
    print(f"   Generated {len(proposals)} proposals")
    for i, proposal in enumerate(proposals, 1):
        print(f"   {i}. {proposal.title}")
        print(f"      Timeline: {proposal.estimated_timeline}")
        print(f"      Phases: {len(proposal.implementation_plan.get('phases', []))}")
        print(f"      Testing Strategy: {len(proposal.testing_strategy)} components")
        print(f"      Budget: ${proposal.resource_requirements.get('budget_estimate', {}).get('total_cost', 0):,.0f}")
    
    print(f"\n✅ Prioritization algorithm tests completed!")

if __name__ == "__main__":
    async def main():
        await test_self_analysis()
        await test_specific_capabilities()
        await test_prioritization_algorithms()
    
    asyncio.run(main())
