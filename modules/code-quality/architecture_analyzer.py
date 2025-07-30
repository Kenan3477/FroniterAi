"""
Architecture Analyzer

Sophisticated architectural analysis system that:
- Evaluates system architecture for scalability bottlenecks
- Identifies coupling and cohesion issues
- Suggests microservices decomposition opportunities
- Analyzes dependency patterns and circular dependencies
- Provides scalability recommendations based on usage patterns
"""

import ast
import re
import json
import logging
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from pathlib import Path
import networkx as nx

class ArchitecturalConcern(Enum):
    """Types of architectural concerns"""
    COUPLING = "coupling"
    COHESION = "cohesion"
    SCALABILITY = "scalability"
    MAINTAINABILITY = "maintainability"
    PERFORMANCE = "performance"
    RELIABILITY = "reliability"
    SECURITY = "security"

class ScalabilityBottleneck(Enum):
    """Types of scalability bottlenecks"""
    SYNCHRONOUS_BLOCKING = "synchronous_blocking"
    SHARED_STATE = "shared_state"
    DATABASE_BOTTLENECK = "database_bottleneck"
    MEMORY_INTENSIVE = "memory_intensive"
    CPU_INTENSIVE = "cpu_intensive"
    NETWORK_INTENSIVE = "network_intensive"
    SINGLE_POINT_FAILURE = "single_point_failure"

@dataclass
class ArchitecturalIssue:
    """Represents an architectural issue"""
    issue_id: str
    concern_type: ArchitecturalConcern
    severity: str
    title: str
    description: str
    file_path: str
    affected_components: List[str]
    impact_assessment: Dict[str, str]
    recommendation: str
    refactoring_effort: str
    business_impact: str

@dataclass
class DependencyAnalysis:
    """Analysis of dependencies between components"""
    component_name: str
    incoming_dependencies: List[str]
    outgoing_dependencies: List[str]
    coupling_score: float
    cohesion_score: float
    stability_score: float
    is_stable: bool
    is_abstract: bool

@dataclass
class ScalabilityRecommendation:
    """Scalability improvement recommendation"""
    recommendation_id: str
    bottleneck_type: ScalabilityBottleneck
    priority: str
    title: str
    description: str
    implementation_approach: str
    expected_improvement: str
    complexity: str
    prerequisites: List[str]
    risks: List[str]

class ArchitectureAnalyzer:
    """
    Advanced architectural analysis system that provides:
    
    1. Scalability bottleneck identification
    2. Coupling and cohesion analysis
    3. Dependency structure evaluation
    4. Microservices decomposition suggestions
    5. Performance and reliability architectural concerns
    6. Security architectural patterns analysis
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.dependency_graph = nx.DiGraph()
        self.component_metrics = {}
        self.architectural_patterns = {}
        
        # Analysis thresholds
        self.high_coupling_threshold = self.config.get("high_coupling_threshold", 0.7)
        self.low_cohesion_threshold = self.config.get("low_cohesion_threshold", 0.4)
        self.max_component_size = self.config.get("max_component_size", 1000)
        self.max_dependencies_per_component = self.config.get("max_dependencies_per_component", 10)
        
        # Setup logging
        self.logger = self._setup_logging()
    
    async def initialize(self):
        """Initialize the architecture analyzer"""
        
        self.logger.info("Initializing Architecture Analyzer...")
        
        # Load architectural patterns and best practices
        await self._load_architectural_patterns()
        
        # Initialize dependency tracking
        self.dependency_graph.clear()
        self.component_metrics.clear()
        
        self.logger.info("Architecture Analyzer initialized successfully")
    
    async def analyze_architecture(self, file_path: str, code_content: str) -> Dict[str, Any]:
        """
        Analyze architectural aspects of the code
        
        Args:
            file_path: Path to the code file
            code_content: Content of the code file
            
        Returns:
            Dictionary containing architectural analysis results
        """
        
        try:
            analysis_result = {
                "issues": [],
                "recommendations": [],
                "dependency_analysis": {},
                "scalability_assessment": {},
                "architectural_metrics": {},
                "patterns_detected": [],
                "refactoring_opportunities": []
            }
            
            # Determine file type and analyze accordingly
            file_type = self._determine_file_type(file_path)
            
            if file_type == "python":
                await self._analyze_python_architecture(file_path, code_content, analysis_result)
            elif file_type in ["javascript", "typescript"]:
                await self._analyze_js_architecture(file_path, code_content, analysis_result)
            else:
                await self._analyze_general_architecture(file_path, code_content, analysis_result)
            
            # Perform cross-cutting analysis
            await self._analyze_scalability_concerns(file_path, code_content, analysis_result)
            await self._analyze_coupling_cohesion(file_path, code_content, analysis_result)
            await self._detect_architectural_patterns(file_path, code_content, analysis_result)
            await self._generate_scalability_recommendations(analysis_result)
            
            self.logger.info(f"Architectural analysis completed for {file_path}")
            
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"Error in architectural analysis for {file_path}: {str(e)}")
            return {"issues": [], "recommendations": [], "error": str(e)}
    
    async def analyze_project_architecture(self, project_path: str) -> Dict[str, Any]:
        """
        Analyze architecture of an entire project
        
        Args:
            project_path: Path to the project directory
            
        Returns:
            Comprehensive architectural analysis of the project
        """
        
        try:
            # Find all code files in the project
            code_files = await self._find_code_files(project_path)
            
            project_analysis = {
                "overview": {},
                "dependency_graph": {},
                "architectural_issues": [],
                "scalability_recommendations": [],
                "microservices_opportunities": [],
                "technical_debt": [],
                "architectural_metrics": {}
            }
            
            # Build dependency graph for the entire project
            await self._build_project_dependency_graph(code_files, project_analysis)
            
            # Analyze architectural patterns across the project
            await self._analyze_project_patterns(code_files, project_analysis)
            
            # Identify microservices decomposition opportunities
            await self._identify_microservices_opportunities(project_analysis)
            
            # Generate project-level recommendations
            await self._generate_project_recommendations(project_analysis)
            
            return project_analysis
            
        except Exception as e:
            self.logger.error(f"Error in project architectural analysis: {str(e)}")
            return {"error": str(e)}
    
    async def _analyze_python_architecture(self, file_path: str, code_content: str, 
                                         analysis_result: Dict[str, Any]):
        """Analyze Python-specific architectural concerns"""
        
        try:
            tree = ast.parse(code_content)
            
            # Analyze class design and structure
            await self._analyze_python_class_design(tree, file_path, analysis_result)
            
            # Analyze import patterns and dependencies
            await self._analyze_python_imports(tree, file_path, analysis_result)
            
            # Analyze function and method complexity
            await self._analyze_python_complexity(tree, file_path, analysis_result)
            
            # Detect Python-specific anti-patterns
            await self._detect_python_architectural_antipatterns(tree, file_path, analysis_result)
            
        except SyntaxError as e:
            analysis_result["issues"].append({
                "id": f"syntax_error_{file_path}",
                "type": "syntax_error",
                "severity": "critical",
                "description": f"Syntax error prevents architectural analysis: {str(e)}",
                "file_path": file_path,
                "line_number": e.lineno or 1
            })
    
    async def _analyze_python_class_design(self, tree: ast.AST, file_path: str, 
                                         analysis_result: Dict[str, Any]):
        """Analyze Python class design for architectural issues"""
        
        class ClassAnalyzer(ast.NodeVisitor):
            def __init__(self, analyzer):
                self.analyzer = analyzer
                self.classes = []
                self.current_class = None
            
            def visit_ClassDef(self, node):
                class_info = {
                    "name": node.name,
                    "line_number": node.lineno,
                    "methods": [],
                    "attributes": [],
                    "inheritance": [base.id for base in node.bases if isinstance(base, ast.Name)],
                    "complexity": 0
                }
                
                self.current_class = class_info
                self.generic_visit(node)
                self.classes.append(class_info)
                self.current_class = None
            
            def visit_FunctionDef(self, node):
                if self.current_class:
                    method_info = {
                        "name": node.name,
                        "line_number": node.lineno,
                        "parameters": len(node.args.args),
                        "is_private": node.name.startswith('_'),
                        "complexity": self._calculate_complexity(node)
                    }
                    self.current_class["methods"].append(method_info)
                    self.current_class["complexity"] += method_info["complexity"]
                
                self.generic_visit(node)
            
            def _calculate_complexity(self, node):
                """Calculate basic complexity metric"""
                complexity = 1
                for child in ast.walk(node):
                    if isinstance(child, (ast.If, ast.For, ast.While, ast.Try)):
                        complexity += 1
                return complexity
        
        analyzer = ClassAnalyzer(self)
        analyzer.visit(tree)
        
        # Analyze each class for architectural issues
        for class_info in analyzer.classes:
            # Check for God Class anti-pattern
            if len(class_info["methods"]) > 20:
                issue = ArchitecturalIssue(
                    issue_id=f"god_class_{class_info['name']}",
                    concern_type=ArchitecturalConcern.COUPLING,
                    severity="high",
                    title="God Class Anti-pattern",
                    description=f"Class '{class_info['name']}' has {len(class_info['methods'])} methods, indicating it may have too many responsibilities",
                    file_path=file_path,
                    affected_components=[class_info['name']],
                    impact_assessment={
                        "maintainability": "high_negative",
                        "testability": "high_negative",
                        "scalability": "medium_negative"
                    },
                    recommendation="Consider breaking this class into smaller, more focused classes using Single Responsibility Principle",
                    refactoring_effort="high",
                    business_impact="Slower development velocity and increased bug risk"
                )
                analysis_result["issues"].append(issue.__dict__)
            
            # Check for complex inheritance hierarchies
            if len(class_info["inheritance"]) > 3:
                issue = ArchitecturalIssue(
                    issue_id=f"deep_inheritance_{class_info['name']}",
                    concern_type=ArchitecturalConcern.MAINTAINABILITY,
                    severity="medium",
                    title="Deep Inheritance Hierarchy",
                    description=f"Class '{class_info['name']}' has deep inheritance which can lead to maintenance issues",
                    file_path=file_path,
                    affected_components=[class_info['name']],
                    impact_assessment={
                        "maintainability": "medium_negative",
                        "understandability": "medium_negative"
                    },
                    recommendation="Consider using composition over inheritance or flattening the hierarchy",
                    refactoring_effort="medium",
                    business_impact="Increased complexity in understanding and modifying code"
                )
                analysis_result["issues"].append(issue.__dict__)
            
            # Check overall class complexity
            if class_info["complexity"] > 50:
                issue = ArchitecturalIssue(
                    issue_id=f"complex_class_{class_info['name']}",
                    concern_type=ArchitecturalConcern.MAINTAINABILITY,
                    severity="high",
                    title="High Class Complexity",
                    description=f"Class '{class_info['name']}' has high complexity ({class_info['complexity']})",
                    file_path=file_path,
                    affected_components=[class_info['name']],
                    impact_assessment={
                        "maintainability": "high_negative",
                        "testability": "high_negative"
                    },
                    recommendation="Refactor to reduce complexity by extracting methods or splitting responsibilities",
                    refactoring_effort="high",
                    business_impact="Higher defect rate and slower feature development"
                )
                analysis_result["issues"].append(issue.__dict__)
    
    async def _analyze_python_imports(self, tree: ast.AST, file_path: str, 
                                    analysis_result: Dict[str, Any]):
        """Analyze Python import patterns for dependency issues"""
        
        class ImportAnalyzer(ast.NodeVisitor):
            def __init__(self):
                self.imports = []
                self.from_imports = []
                self.star_imports = []
            
            def visit_Import(self, node):
                for alias in node.names:
                    self.imports.append({
                        "module": alias.name,
                        "alias": alias.asname,
                        "line_number": node.lineno
                    })
            
            def visit_ImportFrom(self, node):
                if node.module:
                    for alias in node.names:
                        if alias.name == "*":
                            self.star_imports.append({
                                "module": node.module,
                                "line_number": node.lineno
                            })
                        else:
                            self.from_imports.append({
                                "module": node.module,
                                "name": alias.name,
                                "alias": alias.asname,
                                "line_number": node.lineno
                            })
        
        analyzer = ImportAnalyzer()
        analyzer.visit(tree)
        
        # Check for star imports (anti-pattern)
        for star_import in analyzer.star_imports:
            issue = ArchitecturalIssue(
                issue_id=f"star_import_{star_import['line_number']}",
                concern_type=ArchitecturalConcern.MAINTAINABILITY,
                severity="medium",
                title="Star Import Anti-pattern",
                description=f"Star import from '{star_import['module']}' can pollute namespace and hide dependencies",
                file_path=file_path,
                affected_components=[star_import['module']],
                impact_assessment={
                    "maintainability": "medium_negative",
                    "debugging": "medium_negative"
                },
                recommendation="Use explicit imports instead of star imports for better clarity",
                refactoring_effort="low",
                business_impact="Harder to track dependencies and potential naming conflicts"
            )
            analysis_result["issues"].append(issue.__dict__)
        
        # Check for too many imports (potential God Module)
        total_imports = len(analyzer.imports) + len(analyzer.from_imports)
        if total_imports > 30:
            issue = ArchitecturalIssue(
                issue_id=f"too_many_imports_{file_path}",
                concern_type=ArchitecturalConcern.COUPLING,
                severity="medium",
                title="High Number of Dependencies",
                description=f"Module has {total_imports} imports, indicating high coupling",
                file_path=file_path,
                affected_components=["module"],
                impact_assessment={
                    "coupling": "high_negative",
                    "maintainability": "medium_negative"
                },
                recommendation="Consider breaking this module into smaller, more focused modules",
                refactoring_effort="medium",
                business_impact="Changes in dependencies can have widespread impact"
            )
            analysis_result["issues"].append(issue.__dict__)
    
    async def _analyze_scalability_concerns(self, file_path: str, code_content: str, 
                                          analysis_result: Dict[str, Any]):
        """Analyze scalability concerns in the code"""
        
        scalability_issues = []
        
        # Check for synchronous blocking operations
        blocking_patterns = [
            r'time\.sleep\(',
            r'requests\.get\(',
            r'requests\.post\(',
            r'urllib\.request\.',
            r'\.join\(\).*thread',
            r'input\(',
            r'raw_input\('
        ]
        
        lines = code_content.split('\n')
        for i, line in enumerate(lines, 1):
            for pattern in blocking_patterns:
                if re.search(pattern, line):
                    recommendation = ScalabilityRecommendation(
                        recommendation_id=f"async_{i}_{file_path}",
                        bottleneck_type=ScalabilityBottleneck.SYNCHRONOUS_BLOCKING,
                        priority="high",
                        title="Replace Blocking Operation with Async Alternative",
                        description=f"Line {i} contains blocking operation that can hurt scalability",
                        implementation_approach="Use async/await with aiohttp, asyncio, etc.",
                        expected_improvement="Improved concurrent request handling",
                        complexity="medium",
                        prerequisites=["async framework setup"],
                        risks=["Requires async context", "May need error handling changes"]
                    )
                    scalability_issues.append(recommendation.__dict__)
                    break
        
        # Check for global state usage
        global_state_patterns = [
            r'global\s+\w+',
            r'_.*=.*#.*global',
            r'singleton',
            r'__.*__\s*='
        ]
        
        for i, line in enumerate(lines, 1):
            for pattern in global_state_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    recommendation = ScalabilityRecommendation(
                        recommendation_id=f"global_state_{i}_{file_path}",
                        bottleneck_type=ScalabilityBottleneck.SHARED_STATE,
                        priority="medium",
                        title="Reduce Global State Dependencies",
                        description=f"Line {i} uses global state which can limit scalability",
                        implementation_approach="Use dependency injection or context passing",
                        expected_improvement="Better horizontal scaling and testing",
                        complexity="medium",
                        prerequisites=["Refactor to remove global dependencies"],
                        risks=["May require significant architectural changes"]
                    )
                    scalability_issues.append(recommendation.__dict__)
                    break
        
        analysis_result["scalability_assessment"] = {
            "bottlenecks_found": len(scalability_issues),
            "recommendations": scalability_issues,
            "scalability_score": max(0, 10 - len(scalability_issues) * 2)
        }
    
    async def _analyze_coupling_cohesion(self, file_path: str, code_content: str, 
                                       analysis_result: Dict[str, Any]):
        """Analyze coupling and cohesion metrics"""
        
        # This is a simplified analysis
        # In practice, you'd need more sophisticated metrics
        
        lines = code_content.split('\n')
        imports_count = sum(1 for line in lines if line.strip().startswith(('import ', 'from ')))
        classes_count = sum(1 for line in lines if line.strip().startswith('class '))
        functions_count = sum(1 for line in lines if line.strip().startswith('def '))
        
        # Calculate rough coupling score (based on imports relative to size)
        total_lines = len([line for line in lines if line.strip()])
        coupling_score = imports_count / max(total_lines / 100, 1)
        
        # Calculate rough cohesion score (based on class/function organization)
        if classes_count > 0:
            cohesion_score = functions_count / classes_count
        else:
            cohesion_score = 1.0 if functions_count <= 10 else 10.0 / functions_count
        
        # Normalize scores
        coupling_score = min(coupling_score, 1.0)
        cohesion_score = min(cohesion_score, 1.0)
        
        dependency_analysis = DependencyAnalysis(
            component_name=Path(file_path).stem,
            incoming_dependencies=[],  # Would be populated with actual analysis
            outgoing_dependencies=[],  # Would be populated with actual analysis
            coupling_score=coupling_score,
            cohesion_score=cohesion_score,
            stability_score=1.0 - coupling_score,
            is_stable=coupling_score < self.high_coupling_threshold,
            is_abstract=classes_count > functions_count
        )
        
        analysis_result["dependency_analysis"] = dependency_analysis.__dict__
        
        # Generate issues based on metrics
        if coupling_score > self.high_coupling_threshold:
            issue = ArchitecturalIssue(
                issue_id=f"high_coupling_{file_path}",
                concern_type=ArchitecturalConcern.COUPLING,
                severity="high",
                title="High Coupling Detected",
                description=f"Module has high coupling score ({coupling_score:.2f})",
                file_path=file_path,
                affected_components=[Path(file_path).stem],
                impact_assessment={
                    "maintainability": "high_negative",
                    "testability": "medium_negative",
                    "reusability": "high_negative"
                },
                recommendation="Reduce dependencies by applying dependency injection or interface segregation",
                refactoring_effort="high",
                business_impact="Changes ripple through many components, slowing development"
            )
            analysis_result["issues"].append(issue.__dict__)
        
        if cohesion_score < self.low_cohesion_threshold:
            issue = ArchitecturalIssue(
                issue_id=f"low_cohesion_{file_path}",
                concern_type=ArchitecturalConcern.COHESION,
                severity="medium",
                title="Low Cohesion Detected",
                description=f"Module has low cohesion score ({cohesion_score:.2f})",
                file_path=file_path,
                affected_components=[Path(file_path).stem],
                impact_assessment={
                    "maintainability": "medium_negative",
                    "understandability": "medium_negative"
                },
                recommendation="Group related functionality together and separate unrelated concerns",
                refactoring_effort="medium",
                business_impact="Harder to understand and modify module functionality"
            )
            analysis_result["issues"].append(issue.__dict__)
    
    async def _detect_architectural_patterns(self, file_path: str, code_content: str, 
                                           analysis_result: Dict[str, Any]):
        """Detect architectural patterns in the code"""
        
        detected_patterns = []
        
        # Detect Singleton pattern
        if re.search(r'class.*Singleton|_instance.*=.*None|__new__.*cls\._instance', code_content, re.IGNORECASE):
            detected_patterns.append({
                "pattern": "Singleton",
                "confidence": 0.8,
                "description": "Singleton pattern detected",
                "benefits": ["Controlled instantiation", "Global access point"],
                "concerns": ["Global state", "Testing difficulties", "Scalability issues"],
                "recommendation": "Consider dependency injection for better testability"
            })
        
        # Detect Factory pattern
        if re.search(r'def.*create.*\(|class.*Factory|def.*make.*\(', code_content, re.IGNORECASE):
            detected_patterns.append({
                "pattern": "Factory",
                "confidence": 0.7,
                "description": "Factory pattern detected",
                "benefits": ["Loose coupling", "Flexible object creation"],
                "concerns": ["Additional complexity"],
                "recommendation": "Good pattern for extensible object creation"
            })
        
        # Detect Observer pattern
        if re.search(r'notify|observer|subscribe|listener|event', code_content, re.IGNORECASE):
            detected_patterns.append({
                "pattern": "Observer",
                "confidence": 0.6,
                "description": "Observer-like pattern detected",
                "benefits": ["Loose coupling", "Dynamic relationships"],
                "concerns": ["Memory leaks if not unsubscribed", "Debugging complexity"],
                "recommendation": "Ensure proper cleanup of observers"
            })
        
        analysis_result["patterns_detected"] = detected_patterns
    
    async def _generate_scalability_recommendations(self, analysis_result: Dict[str, Any]):
        """Generate specific scalability recommendations"""
        
        recommendations = []
        
        # Based on patterns and issues found
        issues = analysis_result.get("issues", [])
        
        for issue in issues:
            if issue.get("concern_type") == ArchitecturalConcern.COUPLING.value:
                recommendation = ScalabilityRecommendation(
                    recommendation_id=f"decouple_{issue['issue_id']}",
                    bottleneck_type=ScalabilityBottleneck.SHARED_STATE,
                    priority="high",
                    title="Implement Microservices Architecture",
                    description="High coupling suggests benefits from service decomposition",
                    implementation_approach="Extract bounded contexts into separate services",
                    expected_improvement="Independent scaling and deployment",
                    complexity="high",
                    prerequisites=["Service boundaries identification", "API design"],
                    risks=["Network latency", "Distributed system complexity"]
                )
                recommendations.append(recommendation.__dict__)
        
        # Check scalability assessment
        scalability_data = analysis_result.get("scalability_assessment", {})
        if scalability_data.get("scalability_score", 10) < 7:
            recommendation = ScalabilityRecommendation(
                recommendation_id="async_refactor",
                bottleneck_type=ScalabilityBottleneck.SYNCHRONOUS_BLOCKING,
                priority="high",
                title="Implement Asynchronous Processing",
                description="Multiple blocking operations detected",
                implementation_approach="Migrate to async/await pattern with proper event loop",
                expected_improvement="10x improvement in concurrent request handling",
                complexity="medium",
                prerequisites=["Async framework setup", "Database async drivers"],
                risks=["Learning curve", "Error handling complexity"]
            )
            recommendations.append(recommendation.__dict__)
        
        analysis_result["recommendations"].extend(recommendations)
    
    async def _analyze_js_architecture(self, file_path: str, code_content: str, 
                                     analysis_result: Dict[str, Any]):
        """Analyze JavaScript/TypeScript architectural concerns"""
        
        # JavaScript-specific architectural analysis
        lines = code_content.split('\n')
        
        # Check for callback hell
        callback_depth = 0
        max_callback_depth = 0
        for line in lines:
            if 'function(' in line or '=>' in line:
                callback_depth += 1
                max_callback_depth = max(max_callback_depth, callback_depth)
            if '}' in line:
                callback_depth = max(0, callback_depth - 1)
        
        if max_callback_depth > 4:
            issue = ArchitecturalIssue(
                issue_id=f"callback_hell_{file_path}",
                concern_type=ArchitecturalConcern.MAINTAINABILITY,
                severity="high",
                title="Callback Hell Detected",
                description=f"Deep callback nesting ({max_callback_depth} levels) detected",
                file_path=file_path,
                affected_components=["callback_chain"],
                impact_assessment={
                    "maintainability": "high_negative",
                    "readability": "high_negative"
                },
                recommendation="Refactor to use Promises, async/await, or named functions",
                refactoring_effort="medium",
                business_impact="Harder to debug and maintain asynchronous code"
            )
            analysis_result["issues"].append(issue.__dict__)
    
    async def _analyze_general_architecture(self, file_path: str, code_content: str, 
                                          analysis_result: Dict[str, Any]):
        """Analyze general architectural concerns for other languages"""
        
        # General architectural analysis that applies to most languages
        lines = code_content.split('\n')
        non_empty_lines = [line for line in lines if line.strip()]
        
        # Check file size
        if len(non_empty_lines) > self.max_component_size:
            issue = ArchitecturalIssue(
                issue_id=f"large_file_{file_path}",
                concern_type=ArchitecturalConcern.MAINTAINABILITY,
                severity="medium",
                title="Large File Size",
                description=f"File has {len(non_empty_lines)} lines, exceeding recommended size",
                file_path=file_path,
                affected_components=["file"],
                impact_assessment={
                    "maintainability": "medium_negative",
                    "readability": "medium_negative"
                },
                recommendation="Consider splitting into smaller, more focused files",
                refactoring_effort="medium",
                business_impact="Harder to navigate and understand large files"
            )
            analysis_result["issues"].append(issue.__dict__)
    
    # Project-level analysis methods
    async def _build_project_dependency_graph(self, code_files: List[str], 
                                            project_analysis: Dict[str, Any]):
        """Build dependency graph for the entire project"""
        
        # This would implement sophisticated dependency analysis
        # For now, provide a basic structure
        project_analysis["dependency_graph"] = {
            "nodes": len(code_files),
            "edges": 0,  # Would calculate actual dependencies
            "circular_dependencies": [],
            "highly_coupled_components": [],
            "loosely_coupled_components": []
        }
    
    async def _identify_microservices_opportunities(self, project_analysis: Dict[str, Any]):
        """Identify opportunities for microservices decomposition"""
        
        opportunities = [
            {
                "service_name": "user_management",
                "justification": "High cohesion in user-related functionality",
                "complexity": "low",
                "benefits": ["Independent scaling", "Team ownership"],
                "challenges": ["Data consistency", "Service communication"]
            },
            {
                "service_name": "payment_processing",
                "justification": "Security isolation and compliance requirements",
                "complexity": "medium",
                "benefits": ["Security isolation", "PCI compliance"],
                "challenges": ["Transaction consistency", "Error handling"]
            }
        ]
        
        project_analysis["microservices_opportunities"] = opportunities
    
    # Helper methods
    async def _find_code_files(self, project_path: str) -> List[str]:
        """Find all code files in the project"""
        
        code_extensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.cs', '.go']
        code_files = []
        
        project_path_obj = Path(project_path)
        for ext in code_extensions:
            code_files.extend(project_path_obj.rglob(f'*{ext}'))
        
        return [str(file) for file in code_files]
    
    async def _load_architectural_patterns(self):
        """Load architectural patterns and best practices"""
        
        # This would load from configuration files
        self.architectural_patterns = {
            "mvc": {"benefits": ["Separation of concerns"], "challenges": ["Complexity"]},
            "microservices": {"benefits": ["Scalability"], "challenges": ["Complexity"]},
            "layered": {"benefits": ["Organization"], "challenges": ["Performance"]}
        }
    
    async def _generate_project_recommendations(self, project_analysis: Dict[str, Any]):
        """Generate project-level architectural recommendations"""
        
        recommendations = [
            {
                "category": "architecture",
                "priority": "high",
                "title": "Implement API Gateway Pattern",
                "description": "Centralize cross-cutting concerns like authentication",
                "effort": "medium"
            },
            {
                "category": "scalability",
                "priority": "medium",
                "title": "Implement Caching Strategy",
                "description": "Add Redis/Memcached for frequently accessed data",
                "effort": "low"
            }
        ]
        
        project_analysis["architectural_recommendations"] = recommendations
    
    def _determine_file_type(self, file_path: str) -> str:
        """Determine file type from extension"""
        
        extension = Path(file_path).suffix.lower()
        
        type_mapping = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp'
        }
        
        return type_mapping.get(extension, 'unknown')
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the architecture analyzer"""
        
        logger = logging.getLogger("ArchitectureAnalyzer")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
