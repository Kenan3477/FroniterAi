#!/usr/bin/env python3
"""
🔍 Self-Analysis Module for FrontierAI Repository
Comprehensive analysis of repository structure, codebase, and capabilities
"""

import os
import sys
import ast
import json
import sqlite3
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from datetime import datetime
import re
import asyncio
import logging
from enum import Enum

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class CodeMetrics:
    """Code quality and complexity metrics"""
    lines_of_code: int = 0
    cyclomatic_complexity: int = 0
    function_count: int = 0
    class_count: int = 0
    documentation_ratio: float = 0.0
    test_coverage: float = 0.0
    duplicate_code_ratio: float = 0.0
    technical_debt_score: float = 0.0

@dataclass
class FileAnalysis:
    """Analysis results for a single file"""
    file_path: str
    file_type: str
    size_bytes: int
    last_modified: datetime
    metrics: CodeMetrics
    issues: List[str]
    suggestions: List[str]
    dependencies: List[str]
    security_issues: List[str]

@dataclass
class RepositoryAnalysis:
    """Complete repository analysis results"""
    repository_path: str
    analysis_timestamp: datetime
    total_files: int
    total_size_bytes: int
    file_analyses: List[FileAnalysis]
    overall_metrics: CodeMetrics
    architecture_analysis: Dict[str, Any]
    capability_gaps: List[str]
    technical_debt: List[str]
    optimization_opportunities: List[str]
    security_analysis: Dict[str, Any]
    best_practices_compliance: Dict[str, Any]

class ImprovementCategory(Enum):
    """Categories of improvements"""
    SECURITY = "security"
    PERFORMANCE = "performance" 
    ARCHITECTURE = "architecture"
    CODE_QUALITY = "code_quality"
    DOCUMENTATION = "documentation"
    TESTING = "testing"
    MAINTAINABILITY = "maintainability"
    SCALABILITY = "scalability"

class ImpactLevel(Enum):
    """Impact levels for improvements"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class ComplexityLevel(Enum):
    """Implementation complexity levels"""
    TRIVIAL = "trivial"
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    MAJOR = "major"

class StrategicAlignment(Enum):
    """Strategic alignment levels"""
    CORE = "core"
    IMPORTANT = "important"
    BENEFICIAL = "beneficial"
    OPTIONAL = "optional"

@dataclass
class ImprovementItem:
    """Individual improvement recommendation"""
    id: str
    title: str
    description: str
    category: ImprovementCategory
    impact_level: ImpactLevel
    complexity_level: ComplexityLevel
    strategic_alignment: StrategicAlignment
    affected_files: List[str]
    estimated_effort_hours: int
    prerequisites: List[str]
    benefits: List[str]
    risks: List[str]
    implementation_steps: List[str]
    validation_criteria: List[str]
    priority_score: float = 0.0
    
@dataclass
class ImprovementProposal:
    """Detailed improvement proposal for simulation"""
    improvement_id: str
    title: str
    description: str
    category: ImprovementCategory
    priority_score: float
    implementation_plan: Dict[str, Any]
    testing_strategy: Dict[str, Any]
    rollback_plan: Dict[str, Any]
    success_metrics: List[str]
    simulation_parameters: Dict[str, Any]
    estimated_timeline: str
    resource_requirements: Dict[str, Any]

@dataclass
class PrioritizationCriteria:
    """Criteria for improvement prioritization"""
    impact_weight: float = 0.4
    complexity_weight: float = 0.3  # Lower complexity = higher score
    strategic_weight: float = 0.2
    risk_weight: float = 0.1  # Lower risk = higher score
    effort_threshold_hours: int = 40  # Maximum effort for high priority items

class GitHubRepositoryAnalyzer:
    """Analyzes GitHub repository structure and codebase"""
    
    def __init__(self, repository_path: str = None):
        self.repository_path = repository_path or os.getcwd()
        self.analysis_db_path = os.path.join(self.repository_path, '.analysis_cache.db')
        self.supported_extensions = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'react',
            '.tsx': 'react-typescript',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.txt': 'text',
            '.sh': 'shell',
            '.bat': 'batch',
            '.dockerfile': 'docker',
            '.sql': 'sql'
        }
        self.best_practices = self._load_best_practices()
        self.industry_standards = self._load_industry_standards()
        
    def _load_best_practices(self) -> Dict[str, Any]:
        """Load coding best practices and standards"""
        return {
            'python': {
                'max_function_length': 50,
                'max_class_length': 500,
                'max_cyclomatic_complexity': 10,
                'min_documentation_ratio': 0.15,
                'naming_conventions': {
                    'functions': 'snake_case',
                    'classes': 'PascalCase',
                    'constants': 'UPPER_CASE',
                    'variables': 'snake_case'
                },
                'imports': {
                    'max_per_line': 1,
                    'order': ['standard', 'third_party', 'local'],
                    'avoid_star_imports': True
                }
            },
            'javascript': {
                'max_function_length': 30,
                'max_file_length': 400,
                'naming_conventions': {
                    'functions': 'camelCase',
                    'classes': 'PascalCase',
                    'constants': 'UPPER_CASE',
                    'variables': 'camelCase'
                },
                'avoid_patterns': ['eval', 'with', 'var']
            },
            'general': {
                'max_file_size_mb': 1,
                'min_test_coverage': 0.8,
                'max_duplicate_code': 0.05,
                'documentation_required': True,
                'license_required': True,
                'readme_required': True
            }
        }
    
    def _load_industry_standards(self) -> Dict[str, Any]:
        """Load industry standards for comparison"""
        return {
            'repository_structure': {
                'required_files': [
                    'README.md',
                    'LICENSE',
                    'requirements.txt',
                    '.gitignore'
                ],
                'recommended_directories': [
                    'src/',
                    'tests/',
                    'docs/',
                    'examples/',
                    'scripts/'
                ],
                'configuration_files': [
                    'pyproject.toml',
                    'setup.py',
                    'package.json',
                    'Dockerfile',
                    'docker-compose.yml'
                ]
            },
            'security': {
                'secret_patterns': [
                    r'api[_-]?key[\'"\s]*[:=][\'"\s]*[a-zA-Z0-9]+',
                    r'password[\'"\s]*[:=][\'"\s]*[a-zA-Z0-9]+',
                    r'secret[\'"\s]*[:=][\'"\s]*[a-zA-Z0-9]+',
                    r'token[\'"\s]*[:=][\'"\s]*[a-zA-Z0-9]+',
                    r'auth[\'"\s]*[:=][\'"\s]*[a-zA-Z0-9]+'
                ],
                'vulnerable_dependencies': [
                    'requests<2.20.0',
                    'urllib3<1.24.2',
                    'pyyaml<5.1'
                ]
            },
            'performance': {
                'python': {
                    'avoid_patterns': [
                        r'import \*',
                        r'eval\(',
                        r'exec\(',
                        r'\.append\(' + r'.*' + r'for.*in.*\)'
                    ]
                }
            }
        }
    
    async def analyze_repository(self) -> RepositoryAnalysis:
        """Perform comprehensive repository analysis"""
        logger.info(f"🔍 Starting repository analysis: {self.repository_path}")
        
        start_time = datetime.now()
        
        # Initialize database
        self._init_analysis_db()
        
        # Scan repository structure
        file_list = self._scan_repository()
        logger.info(f"📁 Found {len(file_list)} files to analyze")
        
        # Analyze individual files
        file_analyses = []
        total_size = 0
        
        for file_path in file_list:
            try:
                analysis = await self._analyze_file(file_path)
                if analysis:
                    file_analyses.append(analysis)
                    total_size += analysis.size_bytes
            except Exception as e:
                logger.warning(f"⚠️ Error analyzing {file_path}: {e}")
        
        # Calculate overall metrics
        overall_metrics = self._calculate_overall_metrics(file_analyses)
        
        # Perform architecture analysis
        architecture_analysis = self._analyze_architecture(file_analyses)
        
        # Identify capability gaps
        capability_gaps = self._identify_capability_gaps(file_analyses)
        
        # Assess technical debt
        technical_debt = self._assess_technical_debt(file_analyses)
        
        # Find optimization opportunities
        optimization_opportunities = self._find_optimization_opportunities(file_analyses)
        
        # Security analysis
        security_analysis = self._perform_security_analysis(file_analyses)
        
        # Best practices compliance
        best_practices_compliance = self._assess_best_practices_compliance(file_analyses)
        
        # Create comprehensive analysis
        analysis = RepositoryAnalysis(
            repository_path=self.repository_path,
            analysis_timestamp=start_time,
            total_files=len(file_analyses),
            total_size_bytes=total_size,
            file_analyses=file_analyses,
            overall_metrics=overall_metrics,
            architecture_analysis=architecture_analysis,
            capability_gaps=capability_gaps,
            technical_debt=technical_debt,
            optimization_opportunities=optimization_opportunities,
            security_analysis=security_analysis,
            best_practices_compliance=best_practices_compliance
        )
        
        # Save analysis to database
        self._save_analysis(analysis)
        
        end_time = datetime.now()
        analysis_duration = (end_time - start_time).total_seconds()
        
        logger.info(f"✅ Repository analysis completed in {analysis_duration:.2f} seconds")
        return analysis
    
    def _scan_repository(self) -> List[str]:
        """Scan repository and return list of files to analyze"""
        file_list = []
        
        # Patterns to ignore
        ignore_patterns = [
            '.git/', '__pycache__/', '.pytest_cache/', 'node_modules/',
            '.vscode/', '.idea/', '*.pyc', '*.pyo', '*.egg-info/',
            '.analysis_cache.db', '*.log', '*.tmp'
        ]
        
        for root, dirs, files in os.walk(self.repository_path):
            # Filter out ignored directories
            dirs[:] = [d for d in dirs if not any(pattern.rstrip('/') in d for pattern in ignore_patterns)]
            
            for file in files:
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, self.repository_path)
                
                # Skip ignored files
                if any(pattern in relative_path for pattern in ignore_patterns):
                    continue
                
                # Check if file extension is supported
                file_ext = Path(file_path).suffix.lower()
                if file_ext in self.supported_extensions or file in ['Dockerfile', 'Procfile']:
                    file_list.append(file_path)
        
        return file_list
    
    async def _analyze_file(self, file_path: str) -> Optional[FileAnalysis]:
        """Analyze a single file"""
        try:
            file_stats = os.stat(file_path)
            file_ext = Path(file_path).suffix.lower()
            file_type = self.supported_extensions.get(file_ext, 'unknown')
            
            if file_type == 'unknown' and Path(file_path).name in ['Dockerfile', 'Procfile']:
                file_type = Path(file_path).name.lower()
            
            # Read file content
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except UnicodeDecodeError:
                # Try with different encoding
                try:
                    with open(file_path, 'r', encoding='latin-1') as f:
                        content = f.read()
                except:
                    logger.warning(f"⚠️ Could not read file: {file_path}")
                    return None
            
            # Calculate metrics
            metrics = self._calculate_file_metrics(content, file_type)
            
            # Identify issues
            issues = self._identify_file_issues(content, file_type, file_path)
            
            # Generate suggestions
            suggestions = self._generate_file_suggestions(content, file_type, metrics, issues)
            
            # Extract dependencies
            dependencies = self._extract_dependencies(content, file_type)
            
            # Check for security issues
            security_issues = self._check_security_issues(content, file_type)
            
            return FileAnalysis(
                file_path=os.path.relpath(file_path, self.repository_path),
                file_type=file_type,
                size_bytes=file_stats.st_size,
                last_modified=datetime.fromtimestamp(file_stats.st_mtime),
                metrics=metrics,
                issues=issues,
                suggestions=suggestions,
                dependencies=dependencies,
                security_issues=security_issues
            )
            
        except Exception as e:
            logger.error(f"❌ Error analyzing file {file_path}: {e}")
            return None
    
    def _calculate_file_metrics(self, content: str, file_type: str) -> CodeMetrics:
        """Calculate metrics for a file"""
        lines = content.split('\n')
        lines_of_code = len([line for line in lines if line.strip() and not line.strip().startswith('#')])
        
        metrics = CodeMetrics(lines_of_code=lines_of_code)
        
        if file_type == 'python':
            metrics = self._calculate_python_metrics(content)
        elif file_type in ['javascript', 'typescript']:
            metrics = self._calculate_js_metrics(content)
        
        return metrics
    
    def _calculate_python_metrics(self, content: str) -> CodeMetrics:
        """Calculate Python-specific metrics"""
        try:
            tree = ast.parse(content)
            
            function_count = len([node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)])
            class_count = len([node for node in ast.walk(tree) if isinstance(node, ast.ClassDef)])
            
            lines = content.split('\n')
            lines_of_code = len([line for line in lines if line.strip() and not line.strip().startswith('#')])
            
            # Calculate documentation ratio
            docstring_lines = 0
            comment_lines = len([line for line in lines if line.strip().startswith('#')])
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Module)):
                    if ast.get_docstring(node):
                        docstring_lines += len(ast.get_docstring(node).split('\n'))
            
            total_doc_lines = docstring_lines + comment_lines
            documentation_ratio = total_doc_lines / max(lines_of_code, 1)
            
            # Calculate cyclomatic complexity (simplified)
            complexity = self._calculate_cyclomatic_complexity(tree)
            
            return CodeMetrics(
                lines_of_code=lines_of_code,
                cyclomatic_complexity=complexity,
                function_count=function_count,
                class_count=class_count,
                documentation_ratio=documentation_ratio
            )
            
        except SyntaxError:
            # Return basic metrics if syntax error
            lines = content.split('\n')
            return CodeMetrics(
                lines_of_code=len([line for line in lines if line.strip()])
            )
    
    def _calculate_cyclomatic_complexity(self, tree: ast.AST) -> int:
        """Calculate cyclomatic complexity for Python code"""
        complexity = 1  # Base complexity
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.While, ast.For, ast.AsyncFor)):
                complexity += 1
            elif isinstance(node, ast.ExceptHandler):
                complexity += 1
            elif isinstance(node, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
                complexity += 1
            elif isinstance(node, ast.BoolOp):
                complexity += len(node.values) - 1
        
        return complexity
    
    def _calculate_js_metrics(self, content: str) -> CodeMetrics:
        """Calculate JavaScript/TypeScript metrics"""
        lines = content.split('\n')
        lines_of_code = len([line for line in lines 
                           if line.strip() and 
                           not line.strip().startswith('//') and 
                           not line.strip().startswith('/*')])
        
        # Count functions and classes (basic regex)
        function_count = len(re.findall(r'function\s+\w+|=>\s*{|\w+\s*:\s*function', content))
        class_count = len(re.findall(r'class\s+\w+', content))
        
        # Calculate documentation ratio
        comment_lines = len(re.findall(r'//.*|/\*[\s\S]*?\*/', content))
        documentation_ratio = comment_lines / max(lines_of_code, 1)
        
        return CodeMetrics(
            lines_of_code=lines_of_code,
            function_count=function_count,
            class_count=class_count,
            documentation_ratio=documentation_ratio
        )
    
    def _identify_file_issues(self, content: str, file_type: str, file_path: str) -> List[str]:
        """Identify issues in a file"""
        issues = []
        
        if file_type == 'python':
            issues.extend(self._identify_python_issues(content))
        elif file_type in ['javascript', 'typescript']:
            issues.extend(self._identify_js_issues(content))
        
        # General issues
        lines = content.split('\n')
        
        # Check file size
        if len(content) > 1024 * 1024:  # 1MB
            issues.append(f"Large file size: {len(content) / 1024 / 1024:.1f}MB")
        
        # Check line length
        long_lines = [i + 1 for i, line in enumerate(lines) if len(line) > 120]
        if long_lines:
            issues.append(f"Long lines (>120 chars): lines {', '.join(map(str, long_lines[:5]))}")
        
        # Check for trailing whitespace
        trailing_whitespace_lines = [i + 1 for i, line in enumerate(lines) if line.endswith(' ') or line.endswith('\t')]
        if trailing_whitespace_lines:
            issues.append(f"Trailing whitespace: {len(trailing_whitespace_lines)} lines")
        
        return issues
    
    def _identify_python_issues(self, content: str) -> List[str]:
        """Identify Python-specific issues"""
        issues = []
        
        try:
            tree = ast.parse(content)
            
            # Check for star imports
            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom) and any(alias.name == '*' for alias in node.names):
                    issues.append(f"Star import found: from {node.module} import *")
            
            # Check function lengths
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    func_lines = node.end_lineno - node.lineno + 1 if hasattr(node, 'end_lineno') else 0
                    if func_lines > 50:
                        issues.append(f"Long function '{node.name}': {func_lines} lines")
            
            # Check for missing docstrings
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    if not ast.get_docstring(node):
                        issues.append(f"Missing docstring: {node.__class__.__name__.lower()} '{node.name}'")
        
        except SyntaxError as e:
            issues.append(f"Syntax error: {e.msg} at line {e.lineno}")
        
        return issues
    
    def _identify_js_issues(self, content: str) -> List[str]:
        """Identify JavaScript/TypeScript issues"""
        issues = []
        
        # Check for var usage
        if re.search(r'\bvar\s+', content):
            issues.append("Uses 'var' instead of 'let' or 'const'")
        
        # Check for eval usage
        if 'eval(' in content:
            issues.append("Uses dangerous 'eval()' function")
        
        # Check for == instead of ===
        if re.search(r'[^=!]==[^=]', content):
            issues.append("Uses '==' instead of '==='")
        
        return issues
    
    def _generate_file_suggestions(self, content: str, file_type: str, metrics: CodeMetrics, issues: List[str]) -> List[str]:
        """Generate improvement suggestions for a file"""
        suggestions = []
        
        # Documentation suggestions
        if metrics.documentation_ratio < 0.1:
            suggestions.append("Add more documentation (comments/docstrings)")
        
        # Complexity suggestions
        if metrics.cyclomatic_complexity > 10:
            suggestions.append("Reduce cyclomatic complexity by breaking down functions")
        
        # File-type specific suggestions
        if file_type == 'python':
            if metrics.function_count > 20:
                suggestions.append("Consider splitting into multiple modules")
            
            if 'Missing docstring' in ' '.join(issues):
                suggestions.append("Add docstrings to all public functions and classes")
        
        # Size suggestions
        if metrics.lines_of_code > 500:
            suggestions.append("Consider refactoring - file is getting large")
        
        return suggestions
    
    def _extract_dependencies(self, content: str, file_type: str) -> List[str]:
        """Extract dependencies from file content"""
        dependencies = []
        
        if file_type == 'python':
            # Extract imports
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            dependencies.append(alias.name.split('.')[0])
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            dependencies.append(node.module.split('.')[0])
            except:
                # Fallback to regex
                import_matches = re.findall(r'^\s*(?:from\s+(\S+)\s+)?import\s+', content, re.MULTILINE)
                dependencies.extend([match for match in import_matches if match])
        
        elif file_type in ['javascript', 'typescript']:
            # Extract require/import statements
            import_matches = re.findall(r'(?:require\([\'"]([^\'"]+)[\'"]\)|import.*from\s+[\'"]([^\'"]+)[\'"])', content)
            for match in import_matches:
                dep = match[0] or match[1]
                if dep and not dep.startswith('.'):
                    dependencies.append(dep.split('/')[0])
        
        return list(set(dependencies))
    
    def _check_security_issues(self, content: str, file_type: str) -> List[str]:
        """Check for security issues in file content"""
        security_issues = []
        
        # Check for hardcoded secrets
        for pattern in self.industry_standards['security']['secret_patterns']:
            if re.search(pattern, content, re.IGNORECASE):
                security_issues.append(f"Potential hardcoded secret found")
        
        # Check for SQL injection vulnerabilities
        if file_type == 'python':
            sql_injection_patterns = [
                r'execute\(["\'].*%.*["\']',
                r'query\(["\'].*%.*["\']',
                r'\.format\(.*\).*execute'
            ]
            for pattern in sql_injection_patterns:
                if re.search(pattern, content):
                    security_issues.append("Potential SQL injection vulnerability")
        
        # Check for XSS vulnerabilities in web files
        if file_type in ['html', 'javascript', 'typescript']:
            if re.search(r'innerHTML\s*=.*\+', content):
                security_issues.append("Potential XSS vulnerability with innerHTML")
        
        return security_issues
    
    def _calculate_overall_metrics(self, file_analyses: List[FileAnalysis]) -> CodeMetrics:
        """Calculate overall repository metrics"""
        if not file_analyses:
            return CodeMetrics()
        
        total_loc = sum(fa.metrics.lines_of_code for fa in file_analyses)
        total_functions = sum(fa.metrics.function_count for fa in file_analyses)
        total_classes = sum(fa.metrics.class_count for fa in file_analyses)
        
        # Average complexity
        complexities = [fa.metrics.cyclomatic_complexity for fa in file_analyses 
                       if fa.metrics.cyclomatic_complexity > 0]
        avg_complexity = sum(complexities) / len(complexities) if complexities else 0
        
        # Average documentation ratio
        doc_ratios = [fa.metrics.documentation_ratio for fa in file_analyses]
        avg_doc_ratio = sum(doc_ratios) / len(doc_ratios) if doc_ratios else 0
        
        # Calculate technical debt score
        total_issues = sum(len(fa.issues) for fa in file_analyses)
        technical_debt_score = min(100, (total_issues / max(len(file_analyses), 1)) * 10)
        
        return CodeMetrics(
            lines_of_code=total_loc,
            cyclomatic_complexity=int(avg_complexity),
            function_count=total_functions,
            class_count=total_classes,
            documentation_ratio=avg_doc_ratio,
            technical_debt_score=technical_debt_score
        )
    
    def _analyze_architecture(self, file_analyses: List[FileAnalysis]) -> Dict[str, Any]:
        """Analyze repository architecture"""
        analysis = {
            'file_types': {},
            'directory_structure': {},
            'module_dependencies': {},
            'architecture_patterns': [],
            'complexity_distribution': {}
        }
        
        # File type distribution
        for fa in file_analyses:
            file_type = fa.file_type
            if file_type not in analysis['file_types']:
                analysis['file_types'][file_type] = {'count': 0, 'total_loc': 0}
            analysis['file_types'][file_type]['count'] += 1
            analysis['file_types'][file_type]['total_loc'] += fa.metrics.lines_of_code
        
        # Directory structure analysis
        directories = set()
        for fa in file_analyses:
            dir_path = os.path.dirname(fa.file_path)
            directories.add(dir_path)
        
        analysis['directory_structure'] = {
            'total_directories': len(directories),
            'max_depth': max(len(d.split('/')) for d in directories) if directories else 0,
            'directories': list(directories)
        }
        
        # Detect architecture patterns
        patterns = []
        if any('models' in fa.file_path.lower() for fa in file_analyses):
            patterns.append('MVC/MVT Pattern')
        if any('api' in fa.file_path.lower() for fa in file_analyses):
            patterns.append('API Architecture')
        if any('test' in fa.file_path.lower() for fa in file_analyses):
            patterns.append('Test-Driven Development')
        if any('component' in fa.file_path.lower() for fa in file_analyses):
            patterns.append('Component-Based Architecture')
        
        analysis['architecture_patterns'] = patterns
        
        # Complexity distribution
        complexities = [fa.metrics.cyclomatic_complexity for fa in file_analyses 
                       if fa.metrics.cyclomatic_complexity > 0]
        if complexities:
            analysis['complexity_distribution'] = {
                'min': min(complexities),
                'max': max(complexities),
                'average': sum(complexities) / len(complexities),
                'high_complexity_files': len([c for c in complexities if c > 15])
            }
        
        return analysis
    
    def _identify_capability_gaps(self, file_analyses: List[FileAnalysis]) -> List[str]:
        """Identify missing capabilities and features"""
        gaps = []
        
        # Check for essential files
        file_paths = [fa.file_path.lower() for fa in file_analyses]
        
        required_files = self.industry_standards['repository_structure']['required_files']
        for required_file in required_files:
            if not any(required_file.lower() in path for path in file_paths):
                gaps.append(f"Missing essential file: {required_file}")
        
        # Check for testing framework
        has_tests = any('test' in path for path in file_paths)
        if not has_tests:
            gaps.append("No testing framework detected")
        
        # Check for documentation
        has_docs = any('doc' in path or 'readme' in path for path in file_paths)
        if not has_docs:
            gaps.append("Limited documentation structure")
        
        # Check for CI/CD
        has_cicd = any('.github' in path or '.gitlab' in path or 'jenkins' in path for path in file_paths)
        if not has_cicd:
            gaps.append("No CI/CD pipeline detected")
        
        # Check for containerization
        has_docker = any('docker' in path for path in file_paths)
        if not has_docker:
            gaps.append("No containerization (Docker) setup")
        
        # Check for configuration management
        has_config = any('config' in path or '.env' in path for path in file_paths)
        if not has_config:
            gaps.append("Limited configuration management")
        
        # Check for logging
        python_files = [fa for fa in file_analyses if fa.file_type == 'python']
        has_logging = any('logging' in ' '.join(fa.dependencies) for fa in python_files)
        if python_files and not has_logging:
            gaps.append("No centralized logging system")
        
        # Check for error handling
        has_error_handling = any('exception' in fa.file_path.lower() or 'error' in fa.file_path.lower() 
                                for fa in file_analyses)
        if not has_error_handling:
            gaps.append("Limited error handling framework")
        
        return gaps
    
    def _assess_technical_debt(self, file_analyses: List[FileAnalysis]) -> List[str]:
        """Assess technical debt in the repository"""
        debt_items = []
        
        # Code quality debt
        high_complexity_files = [fa for fa in file_analyses if fa.metrics.cyclomatic_complexity > 15]
        if high_complexity_files:
            debt_items.append(f"High complexity in {len(high_complexity_files)} files - refactoring needed")
        
        # Documentation debt
        poorly_documented = [fa for fa in file_analyses if fa.metrics.documentation_ratio < 0.1]
        if poorly_documented:
            debt_items.append(f"Poor documentation in {len(poorly_documented)} files")
        
        # Test debt
        test_files = [fa for fa in file_analyses if 'test' in fa.file_path.lower()]
        code_files = [fa for fa in file_analyses if fa.file_type in ['python', 'javascript', 'typescript']
                     and 'test' not in fa.file_path.lower()]
        
        if code_files:
            test_ratio = len(test_files) / len(code_files)
            if test_ratio < 0.3:
                debt_items.append(f"Low test coverage ratio: {test_ratio:.2f}")
        
        # Security debt
        files_with_security_issues = [fa for fa in file_analyses if fa.security_issues]
        if files_with_security_issues:
            debt_items.append(f"Security issues in {len(files_with_security_issues)} files")
        
        # Large file debt
        large_files = [fa for fa in file_analyses if fa.metrics.lines_of_code > 500]
        if large_files:
            debt_items.append(f"Large files needing refactoring: {len(large_files)} files")
        
        # Duplicate code debt (simplified detection)
        file_hashes = {}
        for fa in file_analyses:
            if fa.size_bytes > 100:  # Only check files larger than 100 bytes
                # Simple hash-based duplicate detection
                content_hash = hashlib.md5(str(fa.metrics.lines_of_code).encode()).hexdigest()
                if content_hash in file_hashes:
                    file_hashes[content_hash].append(fa.file_path)
                else:
                    file_hashes[content_hash] = [fa.file_path]
        
        potential_duplicates = {k: v for k, v in file_hashes.items() if len(v) > 1}
        if potential_duplicates:
            debt_items.append(f"Potential duplicate code patterns detected")
        
        return debt_items
    
    def _find_optimization_opportunities(self, file_analyses: List[FileAnalysis]) -> List[str]:
        """Find optimization opportunities"""
        opportunities = []
        
        # Performance optimizations
        python_files = [fa for fa in file_analyses if fa.file_type == 'python']
        
        # Check for inefficient patterns
        for fa in python_files:
            if any('performance' in issue.lower() for issue in fa.issues):
                opportunities.append(f"Performance optimization needed in {fa.file_path}")
        
        # Architecture optimizations
        if len(file_analyses) > 100:
            opportunities.append("Consider modularizing large codebase")
        
        # Check for outdated dependencies
        unique_deps = set()
        for fa in file_analyses:
            unique_deps.update(fa.dependencies)
        
        if 'requests' in unique_deps:
            opportunities.append("Consider upgrading to async HTTP client (aiohttp)")
        
        # Database optimization
        has_database = any('sqlite' in ' '.join(fa.dependencies) or 'mysql' in ' '.join(fa.dependencies) 
                          for fa in file_analyses)
        if has_database:
            opportunities.append("Consider database query optimization and indexing")
        
        # Caching opportunities
        has_caching = any('cache' in fa.file_path.lower() for fa in file_analyses)
        if not has_caching and len(file_analyses) > 50:
            opportunities.append("Implement caching for better performance")
        
        # Build optimization
        js_files = [fa for fa in file_analyses if fa.file_type in ['javascript', 'typescript']]
        if js_files and not any('webpack' in fa.file_path.lower() or 'vite' in fa.file_path.lower() 
                               for fa in file_analyses):
            opportunities.append("Consider build optimization with bundling tools")
        
        # Memory optimization
        large_files = [fa for fa in file_analyses if fa.size_bytes > 1024 * 1024]  # 1MB+
        if large_files:
            opportunities.append(f"Memory optimization for {len(large_files)} large files")
        
        return opportunities
    
    def _perform_security_analysis(self, file_analyses: List[FileAnalysis]) -> Dict[str, Any]:
        """Perform comprehensive security analysis"""
        security_report = {
            'total_issues': 0,
            'high_risk_files': [],
            'vulnerability_types': {},
            'security_score': 0,
            'recommendations': []
        }
        
        total_issues = 0
        vulnerability_types = {}
        
        for fa in file_analyses:
            if fa.security_issues:
                total_issues += len(fa.security_issues)
                security_report['high_risk_files'].append({
                    'file': fa.file_path,
                    'issues': fa.security_issues
                })
                
                for issue in fa.security_issues:
                    issue_type = issue.split(':')[0] if ':' in issue else issue
                    vulnerability_types[issue_type] = vulnerability_types.get(issue_type, 0) + 1
        
        security_report['total_issues'] = total_issues
        security_report['vulnerability_types'] = vulnerability_types
        
        # Calculate security score (0-100, higher is better)
        total_files = len(file_analyses)
        if total_files > 0:
            security_score = max(0, 100 - (total_issues / total_files * 20))
            security_report['security_score'] = round(security_score, 2)
        
        # Generate recommendations
        recommendations = []
        if total_issues > 0:
            recommendations.append("Implement security code review process")
            recommendations.append("Use static analysis security testing (SAST) tools")
            recommendations.append("Add security linting to CI/CD pipeline")
        
        if 'Potential hardcoded secret' in vulnerability_types:
            recommendations.append("Use environment variables or secret management systems")
        
        if 'SQL injection' in vulnerability_types:
            recommendations.append("Use parameterized queries and ORM frameworks")
        
        security_report['recommendations'] = recommendations
        
        return security_report
    
    def _assess_best_practices_compliance(self, file_analyses: List[FileAnalysis]) -> Dict[str, Any]:
        """Assess compliance with coding best practices"""
        compliance_report = {
            'overall_score': 0,
            'category_scores': {},
            'compliant_files': 0,
            'non_compliant_files': 0,
            'recommendations': []
        }
        
        # Categories to assess
        categories = {
            'documentation': 0,
            'code_structure': 0,
            'naming_conventions': 0,
            'security': 0,
            'testing': 0
        }
        
        total_files = len(file_analyses)
        if total_files == 0:
            return compliance_report
        
        # Documentation compliance
        well_documented = sum(1 for fa in file_analyses if fa.metrics.documentation_ratio >= 0.15)
        categories['documentation'] = (well_documented / total_files) * 100
        
        # Code structure compliance
        well_structured = sum(1 for fa in file_analyses 
                            if fa.metrics.cyclomatic_complexity <= 10 and fa.metrics.lines_of_code <= 500)
        categories['code_structure'] = (well_structured / total_files) * 100
        
        # Security compliance
        secure_files = sum(1 for fa in file_analyses if not fa.security_issues)
        categories['security'] = (secure_files / total_files) * 100
        
        # Testing (presence of test files)
        test_files = sum(1 for fa in file_analyses if 'test' in fa.file_path.lower())
        code_files = sum(1 for fa in file_analyses if fa.file_type in ['python', 'javascript', 'typescript'])
        if code_files > 0:
            categories['testing'] = min(100, (test_files / code_files) * 200)  # Up to 100% if 1:2 ratio
        
        # Naming conventions (simplified)
        properly_named = sum(1 for fa in file_analyses 
                           if not any('naming' in issue.lower() for issue in fa.issues))
        categories['naming_conventions'] = (properly_named / total_files) * 100
        
        # Calculate overall score
        overall_score = sum(categories.values()) / len(categories)
        
        compliance_report['overall_score'] = round(overall_score, 2)
        compliance_report['category_scores'] = {k: round(v, 2) for k, v in categories.items()}
        compliance_report['compliant_files'] = sum(1 for fa in file_analyses if len(fa.issues) <= 2)
        compliance_report['non_compliant_files'] = total_files - compliance_report['compliant_files']
        
        # Generate recommendations
        recommendations = []
        if categories['documentation'] < 80:
            recommendations.append("Improve code documentation and comments")
        if categories['code_structure'] < 70:
            recommendations.append("Refactor complex functions and large files")
        if categories['security'] < 90:
            recommendations.append("Address security vulnerabilities")
        if categories['testing'] < 60:
            recommendations.append("Increase test coverage")
        
        compliance_report['recommendations'] = recommendations
        
        return compliance_report
    
    def _init_analysis_db(self):
        """Initialize analysis database"""
        try:
            with sqlite3.connect(self.analysis_db_path) as conn:
                conn.execute('''
                    CREATE TABLE IF NOT EXISTS analyses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        timestamp TEXT,
                        repository_path TEXT,
                        analysis_data TEXT
                    )
                ''')
                conn.commit()
        except Exception as e:
            logger.warning(f"⚠️ Could not initialize analysis database: {e}")
    
    def _save_analysis(self, analysis: RepositoryAnalysis):
        """Save analysis results to database"""
        try:
            with sqlite3.connect(self.analysis_db_path) as conn:
                conn.execute('''
                    INSERT INTO analyses (timestamp, repository_path, analysis_data)
                    VALUES (?, ?, ?)
                ''', (
                    analysis.analysis_timestamp.isoformat(),
                    analysis.repository_path,
                    json.dumps(asdict(analysis), default=str)
                ))
                conn.commit()
        except Exception as e:
            logger.warning(f"⚠️ Could not save analysis to database: {e}")
    
    def get_analysis_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get historical analysis data"""
        try:
            with sqlite3.connect(self.analysis_db_path) as conn:
                cursor = conn.execute('''
                    SELECT timestamp, analysis_data 
                    FROM analyses 
                    ORDER BY timestamp DESC 
                    LIMIT ?
                ''', (limit,))
                
                results = []
                for row in cursor.fetchall():
                    try:
                        analysis_data = json.loads(row[1])
                        results.append({
                            'timestamp': row[0],
                            'summary': {
                                'total_files': analysis_data.get('total_files', 0),
                                'total_size_bytes': analysis_data.get('total_size_bytes', 0),
                                'capability_gaps': len(analysis_data.get('capability_gaps', [])),
                                'technical_debt_items': len(analysis_data.get('technical_debt', [])),
                                'security_score': analysis_data.get('security_analysis', {}).get('security_score', 0)
                            }
                        })
                    except json.JSONDecodeError:
                        continue
                
                return results
                
        except Exception as e:
            logger.warning(f"⚠️ Could not retrieve analysis history: {e}")
            return []
    
    def generate_analysis_report(self, analysis: RepositoryAnalysis, format: str = 'markdown') -> str:
        """Generate a comprehensive analysis report"""
        if format.lower() == 'markdown':
            return self._generate_markdown_report(analysis)
        elif format.lower() == 'html':
            return self._generate_html_report(analysis)
        elif format.lower() == 'json':
            return json.dumps(asdict(analysis), indent=2, default=str)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _generate_markdown_report(self, analysis: RepositoryAnalysis) -> str:
        """Generate Markdown analysis report"""
        report = f"""# 🔍 FrontierAI Repository Analysis Report

*Generated: {analysis.analysis_timestamp.isoformat()}*  
*Repository: {analysis.repository_path}*

## 📊 Executive Summary

- **Total Files Analyzed**: {analysis.total_files:,}
- **Total Code Size**: {analysis.total_size_bytes / 1024 / 1024:.2f} MB
- **Lines of Code**: {analysis.overall_metrics.lines_of_code:,}
- **Technical Debt Score**: {analysis.overall_metrics.technical_debt_score:.1f}/100

### 🎯 Key Metrics
- **Functions**: {analysis.overall_metrics.function_count:,}
- **Classes**: {analysis.overall_metrics.class_count:,}
- **Documentation Ratio**: {analysis.overall_metrics.documentation_ratio:.2%}
- **Average Complexity**: {analysis.overall_metrics.cyclomatic_complexity}

## 🏗️ Architecture Analysis

### File Type Distribution
"""
        
        # Add file type distribution
        for file_type, stats in analysis.architecture_analysis.get('file_types', {}).items():
            report += f"- **{file_type.title()}**: {stats['count']} files, {stats['total_loc']:,} LOC\n"
        
        report += f"""
### Directory Structure
- **Total Directories**: {analysis.architecture_analysis.get('directory_structure', {}).get('total_directories', 0)}
- **Maximum Depth**: {analysis.architecture_analysis.get('directory_structure', {}).get('max_depth', 0)}

### Detected Patterns
"""
        
        patterns = analysis.architecture_analysis.get('architecture_patterns', [])
        if patterns:
            for pattern in patterns:
                report += f"- ✅ {pattern}\n"
        else:
            report += "- ⚠️ No clear architecture patterns detected\n"
        
        report += f"""
## ⚠️ Capability Gaps ({len(analysis.capability_gaps)})

"""
        
        if analysis.capability_gaps:
            for gap in analysis.capability_gaps:
                report += f"- ❌ {gap}\n"
        else:
            report += "- ✅ No significant capability gaps detected\n"
        
        report += f"""
## 🔧 Technical Debt ({len(analysis.technical_debt)})

"""
        
        if analysis.technical_debt:
            for debt in analysis.technical_debt:
                report += f"- 🔧 {debt}\n"
        else:
            report += "- ✅ Minimal technical debt detected\n"
        
        report += f"""
## 🚀 Optimization Opportunities ({len(analysis.optimization_opportunities)})

"""
        
        if analysis.optimization_opportunities:
            for opportunity in analysis.optimization_opportunities:
                report += f"- 💡 {opportunity}\n"
        else:
            report += "- ✅ No immediate optimization opportunities identified\n"
        
        # Security Analysis
        security = analysis.security_analysis
        report += f"""
## 🔒 Security Analysis

- **Security Score**: {security.get('security_score', 0):.1f}/100
- **Total Security Issues**: {security.get('total_issues', 0)}
- **High-Risk Files**: {len(security.get('high_risk_files', []))}

### Security Recommendations
"""
        
        for rec in security.get('recommendations', []):
            report += f"- 🔒 {rec}\n"
        
        # Best Practices Compliance
        compliance = analysis.best_practices_compliance
        report += f"""
## ✅ Best Practices Compliance

- **Overall Score**: {compliance.get('overall_score', 0):.1f}/100

### Category Scores
"""
        
        for category, score in compliance.get('category_scores', {}).items():
            status = "✅" if score >= 80 else "⚠️" if score >= 60 else "❌"
            report += f"- {status} **{category.title().replace('_', ' ')}**: {score:.1f}%\n"
        
        report += """
### Compliance Recommendations
"""
        
        for rec in compliance.get('recommendations', []):
            report += f"- 📋 {rec}\n"
        
        report += f"""
## 🔍 Detailed File Analysis

### Top Issues by File
"""
        
        # Sort files by number of issues
        sorted_files = sorted(analysis.file_analyses, key=lambda fa: len(fa.issues), reverse=True)
        
        for fa in sorted_files[:10]:  # Top 10 files with most issues
            if fa.issues:
                report += f"\n#### {fa.file_path}\n"
                report += f"- **Type**: {fa.file_type}\n"
                report += f"- **Size**: {fa.size_bytes:,} bytes\n"
                report += f"- **LOC**: {fa.metrics.lines_of_code:,}\n"
                report += f"- **Issues**: {len(fa.issues)}\n\n"
                
                for issue in fa.issues[:3]:  # Top 3 issues
                    report += f"  - ⚠️ {issue}\n"
                
                if len(fa.issues) > 3:
                    report += f"  - ... and {len(fa.issues) - 3} more issues\n"
        
        report += f"""
## 📈 Recommendations Summary

### High Priority
1. **Address Security Issues**: {security.get('total_issues', 0)} security issues need immediate attention
2. **Reduce Technical Debt**: Focus on {len(analysis.technical_debt)} identified debt items
3. **Fill Capability Gaps**: Implement {len(analysis.capability_gaps)} missing capabilities

### Medium Priority
1. **Improve Documentation**: Current ratio is {analysis.overall_metrics.documentation_ratio:.2%}
2. **Optimize Performance**: {len(analysis.optimization_opportunities)} opportunities identified
3. **Enhance Testing**: Improve test coverage and structure

### Low Priority
1. **Code Refactoring**: Address complexity in large functions/files
2. **Architecture Improvements**: Consider modularization opportunities
3. **Dependency Updates**: Review and update outdated dependencies

---

*This analysis was generated by the FrontierAI Self-Analysis Module*  
*For more detailed information, review individual file analyses and metrics*
"""
        
        return report
    
    def _generate_html_report(self, analysis: RepositoryAnalysis) -> str:
        """Generate HTML analysis report"""
        # Convert markdown to HTML (simplified)
        markdown_content = self._generate_markdown_report(analysis)
        
        html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FrontierAI Repository Analysis Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .markdown-content {{
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            line-height: 1.6;
        }}
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-8">
            <div class="markdown-content">
{markdown_content}
            </div>
        </div>
    </div>
</body>
</html>"""
        
        return html_template
    
    def generate_improvement_items(self, analysis: RepositoryAnalysis) -> List[ImprovementItem]:
        """Generate structured improvement items from analysis results"""
        improvements = []
        
        # Security improvements
        security_issues = analysis.security_analysis.get('total_issues', 0)
        if security_issues > 0:
            for i, issue in enumerate(analysis.security_analysis.get('recommendations', [])[:3]):
                improvements.append(ImprovementItem(
                    id=f"SEC-{i+1:03d}",
                    title=f"Security Issue: {issue[:50]}...",
                    description=issue,
                    category=ImprovementCategory.SECURITY,
                    impact_level=ImpactLevel.CRITICAL if 'secret' in issue.lower() or 'password' in issue.lower() else ImpactLevel.HIGH,
                    complexity_level=ComplexityLevel.SIMPLE if 'remove' in issue.lower() else ComplexityLevel.MODERATE,
                    strategic_alignment=StrategicAlignment.CORE,
                    affected_files=analysis.security_analysis.get('high_risk_files', [])[:5],
                    estimated_effort_hours=2 if 'remove' in issue.lower() else 8,
                    prerequisites=[],
                    benefits=["Improved security posture", "Reduced vulnerability risk"],
                    risks=["Service disruption if not properly tested"],
                    implementation_steps=[
                        "Identify affected code sections",
                        "Implement security fix",
                        "Test thoroughly",
                        "Deploy with monitoring"
                    ],
                    validation_criteria=["Security scan passes", "No new vulnerabilities introduced"]
                ))
        
        # Technical debt improvements
        for i, debt_item in enumerate(analysis.technical_debt[:5]):
            complexity = ComplexityLevel.MODERATE
            effort = 16
            
            if 'large file' in debt_item.lower():
                complexity = ComplexityLevel.COMPLEX
                effort = 24
            elif 'documentation' in debt_item.lower():
                complexity = ComplexityLevel.SIMPLE
                effort = 8
            
            improvements.append(ImprovementItem(
                id=f"DEBT-{i+1:03d}",
                title=f"Technical Debt: {debt_item[:50]}...",
                description=debt_item,
                category=ImprovementCategory.MAINTAINABILITY,
                impact_level=ImpactLevel.MEDIUM,
                complexity_level=complexity,
                strategic_alignment=StrategicAlignment.IMPORTANT,
                affected_files=[],
                estimated_effort_hours=effort,
                prerequisites=[],
                benefits=["Improved code maintainability", "Reduced future development cost"],
                risks=["Potential regression if refactoring is extensive"],
                implementation_steps=[
                    "Analyze current implementation",
                    "Design improvement approach",
                    "Implement incrementally",
                    "Validate with existing tests"
                ],
                validation_criteria=["All tests pass", "Code quality metrics improved"]
            ))
        
        # Capability gap improvements
        for i, gap in enumerate(analysis.capability_gaps[:5]):
            impact = ImpactLevel.HIGH if any(critical in gap.lower() for critical in ['test', 'ci/cd', 'security', 'logging']) else ImpactLevel.MEDIUM
            complexity = ComplexityLevel.MODERATE
            effort = 20
            
            if 'ci/cd' in gap.lower():
                complexity = ComplexityLevel.COMPLEX
                effort = 32
            elif 'documentation' in gap.lower():
                complexity = ComplexityLevel.SIMPLE
                effort = 12
                
            improvements.append(ImprovementItem(
                id=f"CAP-{i+1:03d}",
                title=f"Capability Gap: {gap[:50]}...",
                description=gap,
                category=ImprovementCategory.ARCHITECTURE,
                impact_level=impact,
                complexity_level=complexity,
                strategic_alignment=StrategicAlignment.CORE if impact == ImpactLevel.HIGH else StrategicAlignment.IMPORTANT,
                affected_files=[],
                estimated_effort_hours=effort,
                prerequisites=[],
                benefits=["Enhanced system capabilities", "Improved development workflow"],
                risks=["Integration complexity", "Learning curve for team"],
                implementation_steps=[
                    "Research best practices",
                    "Design implementation plan",
                    "Implement in phases",
                    "Train team on new capabilities"
                ],
                validation_criteria=["Capability is functional", "Team can effectively use new capability"]
            ))
        
        # Performance optimization improvements
        for i, opt in enumerate(analysis.optimization_opportunities[:3]):
            improvements.append(ImprovementItem(
                id=f"PERF-{i+1:03d}",
                title=f"Performance Optimization: {opt[:50]}...",
                description=opt,
                category=ImprovementCategory.PERFORMANCE,
                impact_level=ImpactLevel.MEDIUM,
                complexity_level=ComplexityLevel.MODERATE,
                strategic_alignment=StrategicAlignment.BENEFICIAL,
                affected_files=[],
                estimated_effort_hours=16,
                prerequisites=[],
                benefits=["Improved system performance", "Better user experience"],
                risks=["Optimization might introduce bugs"],
                implementation_steps=[
                    "Benchmark current performance",
                    "Implement optimization",
                    "Validate performance improvement",
                    "Monitor for regressions"
                ],
                validation_criteria=["Performance metrics improved", "No functionality regression"]
            ))
        
        # Code quality improvements
        if analysis.overall_metrics.documentation_ratio < 0.15:
            improvements.append(ImprovementItem(
                id="QUAL-001",
                title="Improve Documentation Coverage",
                description=f"Current documentation ratio is {analysis.overall_metrics.documentation_ratio:.2%}, below recommended 15%",
                category=ImprovementCategory.DOCUMENTATION,
                impact_level=ImpactLevel.MEDIUM,
                complexity_level=ComplexityLevel.SIMPLE,
                strategic_alignment=StrategicAlignment.IMPORTANT,
                affected_files=[],
                estimated_effort_hours=20,
                prerequisites=[],
                benefits=["Better code maintainability", "Easier onboarding for new developers"],
                risks=["Time investment with no immediate functional benefit"],
                implementation_steps=[
                    "Identify undocumented functions and classes",
                    "Establish documentation standards",
                    "Add comprehensive docstrings",
                    "Set up documentation generation"
                ],
                validation_criteria=["Documentation ratio > 15%", "All public APIs documented"]
            ))
        
        if analysis.overall_metrics.technical_debt_score > 70:
            improvements.append(ImprovementItem(
                id="QUAL-002",
                title="Reduce Overall Technical Debt",
                description=f"Technical debt score is {analysis.overall_metrics.technical_debt_score:.1f}/100, indicating high debt",
                category=ImprovementCategory.CODE_QUALITY,
                impact_level=ImpactLevel.HIGH,
                complexity_level=ComplexityLevel.COMPLEX,
                strategic_alignment=StrategicAlignment.CORE,
                affected_files=[],
                estimated_effort_hours=40,
                prerequisites=[],
                benefits=["Improved code quality", "Reduced maintenance cost", "Faster development"],
                risks=["Large refactoring effort", "Potential for introducing bugs"],
                implementation_steps=[
                    "Prioritize highest-impact debt items",
                    "Refactor incrementally",
                    "Improve test coverage",
                    "Establish quality gates"
                ],
                validation_criteria=["Technical debt score < 50", "Code quality metrics improved"]
            ))
        
        return improvements
    
    def prioritize_improvements(self, improvements: List[ImprovementItem], 
                              criteria: PrioritizationCriteria = None) -> List[ImprovementItem]:
        """Prioritize improvements based on impact, complexity, and strategic alignment"""
        if criteria is None:
            criteria = PrioritizationCriteria()
        
        def calculate_priority_score(item: ImprovementItem) -> float:
            # Impact score (higher is better)
            impact_scores = {
                ImpactLevel.CRITICAL: 100,
                ImpactLevel.HIGH: 80,
                ImpactLevel.MEDIUM: 60,
                ImpactLevel.LOW: 40
            }
            
            # Complexity score (lower complexity = higher score)
            complexity_scores = {
                ComplexityLevel.TRIVIAL: 100,
                ComplexityLevel.SIMPLE: 80,
                ComplexityLevel.MODERATE: 60,
                ComplexityLevel.COMPLEX: 40,
                ComplexityLevel.MAJOR: 20
            }
            
            # Strategic alignment score
            strategic_scores = {
                StrategicAlignment.CORE: 100,
                StrategicAlignment.IMPORTANT: 80,
                StrategicAlignment.BENEFICIAL: 60,
                StrategicAlignment.OPTIONAL: 40
            }
            
            # Risk score (lower risk = higher score)
            risk_score = 80  # Default medium risk
            if any('critical' in risk.lower() or 'high' in risk.lower() for risk in item.risks):
                risk_score = 40
            elif any('low' in risk.lower() or 'minimal' in risk.lower() for risk in item.risks):
                risk_score = 90
            
            # Calculate weighted score
            impact_score = impact_scores[item.impact_level] * criteria.impact_weight
            complexity_score = complexity_scores[item.complexity_level] * criteria.complexity_weight
            strategic_score = strategic_scores[item.strategic_alignment] * criteria.strategic_weight
            risk_component = risk_score * criteria.risk_weight
            
            # Effort penalty for very high effort items
            effort_penalty = 0
            if item.estimated_effort_hours > criteria.effort_threshold_hours:
                effort_penalty = (item.estimated_effort_hours - criteria.effort_threshold_hours) * 0.5
            
            total_score = impact_score + complexity_score + strategic_score + risk_component - effort_penalty
            
            return max(0, total_score)  # Ensure non-negative score
        
        # Calculate priority scores
        for item in improvements:
            item.priority_score = calculate_priority_score(item)
        
        # Sort by priority score (descending)
        prioritized = sorted(improvements, key=lambda x: x.priority_score, reverse=True)
        
        return prioritized
    
    def generate_improvement_proposals(self, improvements: List[ImprovementItem], 
                                     top_n: int = 5) -> List[ImprovementProposal]:
        """Generate detailed improvement proposals for simulation"""
        proposals = []
        
        # Take top N prioritized improvements
        top_improvements = improvements[:top_n]
        
        for item in top_improvements:
            # Create detailed implementation plan
            implementation_plan = {
                "phases": self._create_implementation_phases(item),
                "dependencies": item.prerequisites,
                "resource_allocation": {
                    "developer_hours": item.estimated_effort_hours,
                    "testing_hours": max(4, item.estimated_effort_hours // 4),
                    "review_hours": max(2, item.estimated_effort_hours // 8)
                },
                "risk_mitigation": self._create_risk_mitigation_plan(item),
                "quality_gates": self._create_quality_gates(item)
            }
            
            # Create testing strategy
            testing_strategy = {
                "unit_tests": {
                    "required": True,
                    "coverage_target": 80,
                    "new_tests_needed": self._estimate_new_tests(item)
                },
                "integration_tests": {
                    "required": item.category in [ImprovementCategory.ARCHITECTURE, ImprovementCategory.SECURITY],
                    "scenarios": self._create_test_scenarios(item)
                },
                "performance_tests": {
                    "required": item.category == ImprovementCategory.PERFORMANCE,
                    "benchmarks": self._create_performance_benchmarks(item)
                },
                "security_tests": {
                    "required": item.category == ImprovementCategory.SECURITY,
                    "vulnerability_scans": True,
                    "penetration_tests": item.impact_level == ImpactLevel.CRITICAL
                }
            }
            
            # Create rollback plan
            rollback_plan = {
                "triggers": [
                    "Performance degradation > 20%",
                    "Critical functionality broken",
                    "Security vulnerability introduced",
                    "System instability detected"
                ],
                "steps": [
                    "Stop deployment process",
                    "Revert to previous version",
                    "Validate system stability",
                    "Analyze failure cause",
                    "Plan remediation"
                ],
                "backup_requirements": self._create_backup_requirements(item),
                "recovery_time_objective": "30 minutes"
            }
            
            # Create simulation parameters
            simulation_parameters = {
                "test_environment": {
                    "isolated": True,
                    "data_requirements": self._determine_test_data_needs(item),
                    "external_dependencies": self._identify_external_deps(item)
                },
                "load_simulation": {
                    "enabled": item.category == ImprovementCategory.PERFORMANCE,
                    "user_load_multiplier": 2.0,
                    "duration_minutes": 30
                },
                "failure_injection": {
                    "enabled": True,
                    "scenarios": self._create_failure_scenarios(item)
                },
                "monitoring": {
                    "metrics": self._define_monitoring_metrics(item),
                    "alerts": self._define_alert_conditions(item),
                    "dashboard": True
                }
            }
            
            # Estimate timeline
            timeline = self._estimate_timeline(item)
            
            # Define resource requirements
            resource_requirements = {
                "human_resources": {
                    "senior_developer": item.complexity_level in [ComplexityLevel.COMPLEX, ComplexityLevel.MAJOR],
                    "security_expert": item.category == ImprovementCategory.SECURITY,
                    "devops_engineer": item.category == ImprovementCategory.ARCHITECTURE,
                    "qa_engineer": True
                },
                "infrastructure": {
                    "test_environment": True,
                    "additional_storage": item.category == ImprovementCategory.PERFORMANCE,
                    "monitoring_tools": True
                },
                "tools": self._identify_required_tools(item),
                "budget_estimate": self._estimate_budget(item)
            }
            
            proposal = ImprovementProposal(
                improvement_id=item.id,
                title=item.title,
                description=item.description,
                category=item.category,
                priority_score=item.priority_score,
                implementation_plan=implementation_plan,
                testing_strategy=testing_strategy,
                rollback_plan=rollback_plan,
                success_metrics=item.validation_criteria,
                simulation_parameters=simulation_parameters,
                estimated_timeline=timeline,
                resource_requirements=resource_requirements
            )
            
            proposals.append(proposal)
        
        return proposals
    
    def _create_implementation_phases(self, item: ImprovementItem) -> List[Dict[str, Any]]:
        """Create implementation phases for an improvement item"""
        phases = []
        
        # Planning phase
        phases.append({
            "name": "Planning & Analysis",
            "duration_days": 2 if item.complexity_level in [ComplexityLevel.SIMPLE, ComplexityLevel.TRIVIAL] else 5,
            "activities": [
                "Detailed requirement analysis",
                "Architecture design review",
                "Risk assessment",
                "Resource planning"
            ],
            "deliverables": ["Implementation plan", "Risk assessment", "Test plan"],
            "dependencies": []
        })
        
        # Implementation phase
        impl_duration = {
            ComplexityLevel.TRIVIAL: 2,
            ComplexityLevel.SIMPLE: 5,
            ComplexityLevel.MODERATE: 10,
            ComplexityLevel.COMPLEX: 20,
            ComplexityLevel.MAJOR: 30
        }
        
        phases.append({
            "name": "Implementation",
            "duration_days": impl_duration[item.complexity_level],
            "activities": item.implementation_steps,
            "deliverables": ["Code changes", "Unit tests", "Documentation updates"],
            "dependencies": ["Planning & Analysis"]
        })
        
        # Testing phase
        phases.append({
            "name": "Testing & Validation",
            "duration_days": max(3, impl_duration[item.complexity_level] // 3),
            "activities": [
                "Unit testing",
                "Integration testing",
                "Performance validation",
                "Security testing"
            ],
            "deliverables": ["Test results", "Performance report", "Security assessment"],
            "dependencies": ["Implementation"]
        })
        
        # Deployment phase
        phases.append({
            "name": "Deployment & Monitoring",
            "duration_days": 3,
            "activities": [
                "Staged deployment",
                "Production validation",
                "Monitoring setup",
                "Documentation finalization"
            ],
            "deliverables": ["Deployed solution", "Monitoring dashboard", "Final documentation"],
            "dependencies": ["Testing & Validation"]
        })
        
        return phases
    
    def _create_risk_mitigation_plan(self, item: ImprovementItem) -> Dict[str, Any]:
        """Create risk mitigation plan for an improvement"""
        return {
            "identified_risks": item.risks,
            "mitigation_strategies": [
                {
                    "risk": "Implementation complexity",
                    "strategy": "Break down into smaller, manageable chunks",
                    "monitoring": "Track progress against milestones"
                },
                {
                    "risk": "Performance impact",
                    "strategy": "Implement performance monitoring and benchmarking",
                    "monitoring": "Continuous performance metrics tracking"
                },
                {
                    "risk": "Security vulnerabilities",
                    "strategy": "Security review and automated vulnerability scanning",
                    "monitoring": "Regular security scans and code reviews"
                }
            ],
            "contingency_plans": [
                "Rollback to previous version if critical issues arise",
                "Implement feature flags for gradual rollout",
                "Maintain detailed logs for troubleshooting"
            ]
        }
    
    def _create_quality_gates(self, item: ImprovementItem) -> List[Dict[str, Any]]:
        """Create quality gates for implementation phases"""
        return [
            {
                "phase": "Code Review",
                "criteria": [
                    "All code reviewed by senior developer",
                    "No critical code quality issues",
                    "Documentation updated"
                ],
                "automated_checks": True
            },
            {
                "phase": "Testing",
                "criteria": [
                    "All tests passing",
                    "Code coverage >= 80%",
                    "Performance benchmarks met"
                ],
                "automated_checks": True
            },
            {
                "phase": "Security",
                "criteria": [
                    "Security scan passes",
                    "No new vulnerabilities introduced",
                    "Security review completed"
                ],
                "automated_checks": True
            },
            {
                "phase": "Deployment",
                "criteria": [
                    "Staging environment validation successful",
                    "Rollback plan tested",
                    "Monitoring alerts configured"
                ],
                "automated_checks": False
            }
        ]
    
    def _estimate_new_tests(self, item: ImprovementItem) -> int:
        """Estimate number of new tests needed"""
        base_tests = {
            ComplexityLevel.TRIVIAL: 2,
            ComplexityLevel.SIMPLE: 5,
            ComplexityLevel.MODERATE: 10,
            ComplexityLevel.COMPLEX: 20,
            ComplexityLevel.MAJOR: 35
        }
        
        multiplier = 1.5 if item.category == ImprovementCategory.SECURITY else 1.0
        return int(base_tests[item.complexity_level] * multiplier)
    
    def _create_test_scenarios(self, item: ImprovementItem) -> List[str]:
        """Create integration test scenarios"""
        base_scenarios = [
            "Normal operation flow",
            "Error handling scenarios",
            "Edge case validation"
        ]
        
        if item.category == ImprovementCategory.SECURITY:
            base_scenarios.extend([
                "Authentication validation",
                "Authorization checks",
                "Input sanitization verification"
            ])
        elif item.category == ImprovementCategory.PERFORMANCE:
            base_scenarios.extend([
                "Load testing scenarios",
                "Stress testing scenarios",
                "Resource utilization validation"
            ])
        
        return base_scenarios
    
    def _create_performance_benchmarks(self, item: ImprovementItem) -> Dict[str, Any]:
        """Create performance benchmarks"""
        return {
            "response_time": {
                "target": "< 200ms for 95th percentile",
                "measurement": "API response time"
            },
            "throughput": {
                "target": "1000 requests/second",
                "measurement": "Request processing rate"
            },
            "resource_utilization": {
                "cpu": "< 70% under normal load",
                "memory": "< 80% of available memory",
                "disk_io": "< 500 IOPS"
            }
        }
    
    def _create_backup_requirements(self, item: ImprovementItem) -> Dict[str, Any]:
        """Create backup requirements for rollback"""
        return {
            "code_backup": {
                "required": True,
                "method": "Git branch/tag",
                "retention": "30 days"
            },
            "database_backup": {
                "required": item.category in [ImprovementCategory.ARCHITECTURE, ImprovementCategory.SECURITY],
                "method": "Full database snapshot",
                "validation": "Backup restore test"
            },
            "configuration_backup": {
                "required": True,
                "method": "Configuration file versioning",
                "retention": "90 days"
            }
        }
    
    def _determine_test_data_needs(self, item: ImprovementItem) -> Dict[str, Any]:
        """Determine test data requirements"""
        return {
            "synthetic_data": {
                "required": True,
                "volume": "1000 records minimum",
                "variety": "Cover all data types and edge cases"
            },
            "production_data": {
                "required": item.category in [ImprovementCategory.PERFORMANCE, ImprovementCategory.SECURITY],
                "sanitized": True,
                "approval_needed": True
            },
            "edge_cases": {
                "null_values": True,
                "boundary_values": True,
                "invalid_inputs": True
            }
        }
    
    def _identify_external_deps(self, item: ImprovementItem) -> List[str]:
        """Identify external dependencies"""
        deps = ["Database", "File system", "Network connectivity"]
        
        if item.category == ImprovementCategory.SECURITY:
            deps.extend(["Authentication service", "Certificate authority"])
        elif item.category == ImprovementCategory.PERFORMANCE:
            deps.extend(["Load balancer", "Caching service", "CDN"])
        
        return deps
    
    def _create_failure_scenarios(self, item: ImprovementItem) -> List[Dict[str, Any]]:
        """Create failure injection scenarios"""
        scenarios = [
            {
                "name": "Database connection failure",
                "description": "Simulate database unavailability",
                "impact": "Test error handling and fallback mechanisms"
            },
            {
                "name": "Network latency increase",
                "description": "Simulate slow network conditions",
                "impact": "Test timeout handling and performance"
            },
            {
                "name": "Memory pressure",
                "description": "Simulate high memory usage",
                "impact": "Test resource management and cleanup"
            }
        ]
        
        if item.category == ImprovementCategory.SECURITY:
            scenarios.append({
                "name": "Authentication service failure",
                "description": "Simulate auth service downtime",
                "impact": "Test security fallback mechanisms"
            })
        
        return scenarios
    
    def _define_monitoring_metrics(self, item: ImprovementItem) -> List[str]:
        """Define monitoring metrics"""
        base_metrics = [
            "Response time",
            "Error rate",
            "CPU utilization",
            "Memory usage",
            "Disk I/O"
        ]
        
        if item.category == ImprovementCategory.SECURITY:
            base_metrics.extend([
                "Failed authentication attempts",
                "Security scan results",
                "Access violation attempts"
            ])
        elif item.category == ImprovementCategory.PERFORMANCE:
            base_metrics.extend([
                "Throughput",
                "Queue depth",
                "Cache hit rate"
            ])
        
        return base_metrics
    
    def _define_alert_conditions(self, item: ImprovementItem) -> List[Dict[str, Any]]:
        """Define alert conditions"""
        return [
            {
                "metric": "Error rate",
                "condition": "> 5%",
                "severity": "warning"
            },
            {
                "metric": "Response time",
                "condition": "> 1000ms",
                "severity": "critical"
            },
            {
                "metric": "CPU utilization",
                "condition": "> 80%",
                "severity": "warning"
            },
            {
                "metric": "Memory usage",
                "condition": "> 90%",
                "severity": "critical"
            }
        ]
    
    def _estimate_timeline(self, item: ImprovementItem) -> str:
        """Estimate implementation timeline"""
        total_days = {
            ComplexityLevel.TRIVIAL: 5,
            ComplexityLevel.SIMPLE: 10,
            ComplexityLevel.MODERATE: 20,
            ComplexityLevel.COMPLEX: 35,
            ComplexityLevel.MAJOR: 50
        }
        
        days = total_days[item.complexity_level]
        weeks = (days + 4) // 5  # Round up to nearest week
        
        return f"{weeks} weeks ({days} working days)"
    
    def _identify_required_tools(self, item: ImprovementItem) -> List[str]:
        """Identify required tools"""
        base_tools = ["IDE/Editor", "Version control", "Testing framework"]
        
        if item.category == ImprovementCategory.SECURITY:
            base_tools.extend(["Security scanner", "Vulnerability database", "Penetration testing tools"])
        elif item.category == ImprovementCategory.PERFORMANCE:
            base_tools.extend(["Profiler", "Load testing tools", "Performance monitoring"])
        elif item.category == ImprovementCategory.ARCHITECTURE:
            base_tools.extend(["Architecture visualization", "Dependency analysis", "Design tools"])
        
        return base_tools
    
    def _estimate_budget(self, item: ImprovementItem) -> Dict[str, Any]:
        """Estimate budget requirements"""
        hourly_rate = 100  # Average developer hourly rate
        
        total_hours = item.estimated_effort_hours
        testing_hours = max(4, total_hours // 4)
        review_hours = max(2, total_hours // 8)
        
        total_cost = (total_hours + testing_hours + review_hours) * hourly_rate
        
        return {
            "development_cost": total_hours * hourly_rate,
            "testing_cost": testing_hours * hourly_rate,
            "review_cost": review_hours * hourly_rate,
            "total_cost": total_cost,
            "currency": "USD",
            "additional_costs": {
                "tools": 500 if item.complexity_level in [ComplexityLevel.COMPLEX, ComplexityLevel.MAJOR] else 0,
                "infrastructure": 200 if item.category == ImprovementCategory.ARCHITECTURE else 0,
                "training": 1000 if item.complexity_level == ComplexityLevel.MAJOR else 0
            }
        }
    
    def export_proposals_for_simulation(self, proposals: List[ImprovementProposal], 
                                      output_file: str = None) -> str:
        """Export improvement proposals in format suitable for simulation environment"""
        if output_file is None:
            output_file = f"improvement_proposals_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # Convert proposals to simulation-friendly format
        simulation_data = {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "total_proposals": len(proposals),
                "format_version": "1.0"
            },
            "proposals": []
        }
        
        for proposal in proposals:
            simulation_proposal = {
                "id": proposal.improvement_id,
                "title": proposal.title,
                "description": proposal.description,
                "category": proposal.category.value,
                "priority_score": proposal.priority_score,
                "estimated_timeline": proposal.estimated_timeline,
                "simulation_config": proposal.simulation_parameters,
                "success_criteria": proposal.success_metrics,
                "implementation_phases": proposal.implementation_plan.get("phases", []),
                "testing_requirements": proposal.testing_strategy,
                "rollback_strategy": proposal.rollback_plan,
                "resource_requirements": proposal.resource_requirements
            }
            simulation_data["proposals"].append(simulation_proposal)
        
        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(simulation_data, f, indent=2, default=str)
        
        return output_file

# Example usage and testing
async def main():
    """Main function for testing the analyzer with prioritization"""
    analyzer = GitHubRepositoryAnalyzer()
    
    print("🔍 FrontierAI Repository Self-Analysis with Improvement Prioritization")
    print("=" * 70)
    
    try:
        # Perform analysis
        print("📊 Performing comprehensive repository analysis...")
        analysis = await analyzer.analyze_repository()
        
        # Generate improvement items
        print("💡 Generating improvement items...")
        improvements = analyzer.generate_improvement_items(analysis)
        print(f"   Generated {len(improvements)} improvement items")
        
        # Prioritize improvements
        print("🎯 Prioritizing improvements...")
        prioritized_improvements = analyzer.prioritize_improvements(improvements)
        
        # Generate improvement proposals
        print("📋 Generating detailed improvement proposals...")
        proposals = analyzer.generate_improvement_proposals(prioritized_improvements, top_n=5)
        
        # Export proposals for simulation
        proposal_file = analyzer.export_proposals_for_simulation(proposals)
        print(f"💾 Proposals exported to: {proposal_file}")
        
        # Generate analysis report
        report = analyzer.generate_analysis_report(analysis, 'markdown')
        
        # Save report
        report_filename = f"repository_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(report_filename, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"📋 Analysis report saved to: {report_filename}")
        
        # Display summary
        print(f"\n📊 Analysis Summary:")
        print(f"   • Total Files: {analysis.total_files:,}")
        print(f"   • Lines of Code: {analysis.overall_metrics.lines_of_code:,}")
        print(f"   • Capability Gaps: {len(analysis.capability_gaps)}")
        print(f"   • Technical Debt Items: {len(analysis.technical_debt)}")
        print(f"   • Optimization Opportunities: {len(analysis.optimization_opportunities)}")
        print(f"   • Security Score: {analysis.security_analysis.get('security_score', 0):.1f}/100")
        print(f"   • Best Practices Score: {analysis.best_practices_compliance.get('overall_score', 0):.1f}/100")
        
        # Display top priority improvements
        print(f"\n🎯 Top Priority Improvements:")
        for i, improvement in enumerate(prioritized_improvements[:5], 1):
            print(f"   {i}. [{improvement.id}] {improvement.title[:60]}...")
            print(f"      Priority Score: {improvement.priority_score:.1f}")
            print(f"      Category: {improvement.category.value.replace('_', ' ').title()}")
            print(f"      Impact: {improvement.impact_level.value.title()}")
            print(f"      Complexity: {improvement.complexity_level.value.title()}")
            print(f"      Effort: {improvement.estimated_effort_hours} hours")
            print()
        
        # Display proposal summary
        print(f"📋 Generated Proposals for Simulation:")
        for i, proposal in enumerate(proposals, 1):
            print(f"   {i}. {proposal.title[:60]}...")
            print(f"      Timeline: {proposal.estimated_timeline}")
            print(f"      Budget: ${proposal.resource_requirements.get('budget_estimate', {}).get('total_cost', 0):,.0f}")
            phases = len(proposal.implementation_plan.get('phases', []))
            print(f"      Implementation Phases: {phases}")
            print()
        
        print(f"\n✅ Repository analysis with prioritization completed successfully!")
        print(f"📁 Files generated:")
        print(f"   • {report_filename} - Comprehensive analysis report")
        print(f"   • {proposal_file} - Improvement proposals for simulation")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        logger.exception("Analysis error")

if __name__ == "__main__":
    asyncio.run(main())
