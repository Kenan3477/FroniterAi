"""
Code Quality Analysis System

Comprehensive code quality framework that:
- Identifies suboptimal code patterns in real-time
- Suggests architectural improvements based on scalability needs
- Implements security vulnerability detection
- Performs automated refactoring of identified issues
- Provides explanations of improvements for educational purposes
"""

import asyncio
import json
import logging
import threading
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import ast
import re
import hashlib
from pathlib import Path

from .pattern_detector import PatternDetector, CodePattern, PatternSeverity
from .architecture_analyzer import ArchitectureAnalyzer, ArchitecturalIssue, ScalabilityRecommendation
from .security_scanner import SecurityScanner, SecurityVulnerability, SecuritySeverity
from .refactoring_engine import RefactoringEngine, RefactoringAction, RefactoringResult
from .educational_explainer import EducationalExplainer, Explanation, LearningLevel

class AnalysisType(Enum):
    """Types of code analysis"""
    PATTERN_DETECTION = "pattern_detection"
    ARCHITECTURE_REVIEW = "architecture_review"
    SECURITY_SCAN = "security_scan"
    REFACTORING_ANALYSIS = "refactoring_analysis"
    EDUCATIONAL_REVIEW = "educational_review"

class QualityMetric(Enum):
    """Code quality metrics"""
    MAINTAINABILITY = "maintainability"
    READABILITY = "readability"
    PERFORMANCE = "performance"
    SECURITY = "security"
    SCALABILITY = "scalability"
    TESTABILITY = "testability"
    RELIABILITY = "reliability"

@dataclass
class QualityIssue:
    """Represents a code quality issue"""
    issue_id: str
    issue_type: str
    severity: str
    description: str
    file_path: str
    line_number: int
    column_number: int
    code_snippet: str
    suggestion: str
    explanation: str
    tags: List[str]
    metrics_impact: Dict[str, float]
    confidence: float
    auto_fixable: bool
    fix_complexity: str
    educational_value: str

@dataclass
class QualityAnalysisResult:
    """Result of comprehensive quality analysis"""
    analysis_id: str
    timestamp: datetime
    file_path: str
    analysis_types: List[AnalysisType]
    issues_found: List[QualityIssue]
    overall_score: float
    metric_scores: Dict[str, float]
    recommendations: List[str]
    refactoring_opportunities: List[Dict[str, Any]]
    security_vulnerabilities: List[Dict[str, Any]]
    architectural_suggestions: List[Dict[str, Any]]
    educational_insights: List[Dict[str, Any]]
    execution_time: float

class CodeQualityAnalyzer:
    """
    Main code quality analysis system that orchestrates all quality checks:
    
    1. Real-time pattern detection for suboptimal code
    2. Architectural analysis for scalability improvements
    3. Security vulnerability scanning
    4. Automated refactoring suggestions and implementations
    5. Educational explanations for learning and improvement
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.analysis_history = []
        self.quality_baselines = {}
        self.active_monitors = {}
        
        # Analysis configuration
        self.real_time_monitoring = self.config.get("real_time_monitoring", True)
        self.auto_refactoring_enabled = self.config.get("auto_refactoring_enabled", False)
        self.educational_mode = self.config.get("educational_mode", True)
        self.security_scan_depth = self.config.get("security_scan_depth", "deep")
        
        # Quality thresholds
        self.quality_thresholds = {
            QualityMetric.MAINTAINABILITY: self.config.get("maintainability_threshold", 7.0),
            QualityMetric.READABILITY: self.config.get("readability_threshold", 8.0),
            QualityMetric.PERFORMANCE: self.config.get("performance_threshold", 7.5),
            QualityMetric.SECURITY: self.config.get("security_threshold", 9.0),
            QualityMetric.SCALABILITY: self.config.get("scalability_threshold", 7.0),
            QualityMetric.TESTABILITY: self.config.get("testability_threshold", 8.0),
            QualityMetric.RELIABILITY: self.config.get("reliability_threshold", 8.5)
        }
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Initialize analysis components
        self.pattern_detector = PatternDetector(self.config.get("pattern_config", {}))
        self.architecture_analyzer = ArchitectureAnalyzer(self.config.get("architecture_config", {}))
        self.security_scanner = SecurityScanner(self.config.get("security_config", {}))
        self.refactoring_engine = RefactoringEngine(self.config.get("refactoring_config", {}))
        self.educational_explainer = EducationalExplainer(self.config.get("educational_config", {}))
        
        # Setup logging
        self.logger = self._setup_logging()
    
    async def initialize(self):
        """Initialize the code quality analyzer"""
        
        self.logger.info("Initializing Code Quality Analyzer...")
        
        # Initialize all analysis components
        await self.pattern_detector.initialize()
        await self.architecture_analyzer.initialize()
        await self.security_scanner.initialize()
        await self.refactoring_engine.initialize()
        await self.educational_explainer.initialize()
        
        # Load quality baselines and historical data
        await self._load_quality_baselines()
        
        # Start real-time monitoring if enabled
        if self.real_time_monitoring:
            asyncio.create_task(self._start_real_time_monitoring())
        
        self.logger.info("Code Quality Analyzer initialized successfully")
    
    async def analyze_code(self, file_path: str, code_content: str = None, 
                          analysis_types: List[AnalysisType] = None) -> QualityAnalysisResult:
        """
        Perform comprehensive code quality analysis
        
        Args:
            file_path: Path to the code file to analyze
            code_content: Optional code content (if not reading from file)
            analysis_types: Specific analysis types to run (default: all)
            
        Returns:
            QualityAnalysisResult with comprehensive analysis results
        """
        
        analysis_id = self._generate_analysis_id(file_path)
        start_time = datetime.now()
        
        try:
            self.logger.info(f"Starting code quality analysis for {file_path}")
            
            # Read code content if not provided
            if code_content is None:
                code_content = await self._read_file_content(file_path)
            
            # Determine analysis types
            if analysis_types is None:
                analysis_types = list(AnalysisType)
            
            # Initialize analysis result
            analysis_result = QualityAnalysisResult(
                analysis_id=analysis_id,
                timestamp=start_time,
                file_path=file_path,
                analysis_types=analysis_types,
                issues_found=[],
                overall_score=0.0,
                metric_scores={},
                recommendations=[],
                refactoring_opportunities=[],
                security_vulnerabilities=[],
                architectural_suggestions=[],
                educational_insights=[],
                execution_time=0.0
            )
            
            # Run analysis components in parallel
            analysis_tasks = []
            
            if AnalysisType.PATTERN_DETECTION in analysis_types:
                analysis_tasks.append(self._run_pattern_analysis(file_path, code_content))
            
            if AnalysisType.ARCHITECTURE_REVIEW in analysis_types:
                analysis_tasks.append(self._run_architecture_analysis(file_path, code_content))
            
            if AnalysisType.SECURITY_SCAN in analysis_types:
                analysis_tasks.append(self._run_security_analysis(file_path, code_content))
            
            if AnalysisType.REFACTORING_ANALYSIS in analysis_types:
                analysis_tasks.append(self._run_refactoring_analysis(file_path, code_content))
            
            if AnalysisType.EDUCATIONAL_REVIEW in analysis_types:
                analysis_tasks.append(self._run_educational_analysis(file_path, code_content))
            
            # Execute all analysis tasks
            analysis_results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
            # Process results from each analysis component
            await self._process_analysis_results(analysis_result, analysis_results, analysis_types)
            
            # Calculate overall quality metrics
            await self._calculate_quality_metrics(analysis_result)
            
            # Generate comprehensive recommendations
            await self._generate_recommendations(analysis_result)
            
            # Calculate execution time
            analysis_result.execution_time = (datetime.now() - start_time).total_seconds()
            
            # Store analysis results
            await self._store_analysis_results(analysis_result)
            
            self.logger.info(f"Code quality analysis completed for {file_path} in {analysis_result.execution_time:.2f}s")
            
            return analysis_result
            
        except Exception as e:
            self.logger.error(f"Error during code quality analysis for {file_path}: {str(e)}")
            
            # Return error result
            return QualityAnalysisResult(
                analysis_id=analysis_id,
                timestamp=start_time,
                file_path=file_path,
                analysis_types=analysis_types or [],
                issues_found=[],
                overall_score=0.0,
                metric_scores={},
                recommendations=[f"Analysis failed: {str(e)}"],
                refactoring_opportunities=[],
                security_vulnerabilities=[],
                architectural_suggestions=[],
                educational_insights=[],
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def analyze_project(self, project_path: str, file_patterns: List[str] = None) -> Dict[str, QualityAnalysisResult]:
        """
        Analyze an entire project for code quality
        
        Args:
            project_path: Path to the project directory
            file_patterns: File patterns to include (e.g., ['*.py', '*.js'])
            
        Returns:
            Dictionary mapping file paths to analysis results
        """
        
        try:
            # Find all relevant files
            files_to_analyze = await self._find_project_files(project_path, file_patterns)
            
            self.logger.info(f"Analyzing {len(files_to_analyze)} files in project {project_path}")
            
            # Analyze files in parallel (with limit to avoid overwhelming system)
            semaphore = asyncio.Semaphore(self.config.get("max_concurrent_analyses", 5))
            
            async def analyze_single_file(file_path: str) -> Tuple[str, QualityAnalysisResult]:
                async with semaphore:
                    result = await self.analyze_code(file_path)
                    return file_path, result
            
            # Execute analyses
            analysis_tasks = [analyze_single_file(file_path) for file_path in files_to_analyze]
            analysis_results = await asyncio.gather(*analysis_tasks, return_exceptions=True)
            
            # Compile results
            project_results = {}
            for result in analysis_results:
                if isinstance(result, Exception):
                    self.logger.error(f"Error analyzing file: {str(result)}")
                else:
                    file_path, analysis_result = result
                    project_results[file_path] = analysis_result
            
            # Generate project-level insights
            await self._generate_project_insights(project_results, project_path)
            
            return project_results
            
        except Exception as e:
            self.logger.error(f"Error analyzing project {project_path}: {str(e)}")
            return {}
    
    async def auto_fix_issues(self, analysis_result: QualityAnalysisResult, 
                             fix_types: List[str] = None) -> Dict[str, RefactoringResult]:
        """
        Automatically fix issues identified in analysis
        
        Args:
            analysis_result: Results from code quality analysis
            fix_types: Types of fixes to apply (default: all auto-fixable)
            
        Returns:
            Dictionary mapping issue IDs to refactoring results
        """
        
        if not self.auto_refactoring_enabled:
            self.logger.warning("Auto-refactoring is disabled")
            return {}
        
        try:
            # Filter auto-fixable issues
            auto_fixable_issues = [
                issue for issue in analysis_result.issues_found
                if issue.auto_fixable
            ]
            
            if fix_types:
                auto_fixable_issues = [
                    issue for issue in auto_fixable_issues
                    if issue.issue_type in fix_types
                ]
            
            self.logger.info(f"Auto-fixing {len(auto_fixable_issues)} issues")
            
            # Group issues by complexity for ordered fixing
            simple_fixes = [issue for issue in auto_fixable_issues if issue.fix_complexity == "simple"]
            moderate_fixes = [issue for issue in auto_fixable_issues if issue.fix_complexity == "moderate"]
            complex_fixes = [issue for issue in auto_fixable_issues if issue.fix_complexity == "complex"]
            
            fix_results = {}
            
            # Apply fixes in order of complexity
            for issues_group in [simple_fixes, moderate_fixes, complex_fixes]:
                for issue in issues_group:
                    fix_result = await self.refactoring_engine.apply_fix(
                        analysis_result.file_path, issue
                    )
                    fix_results[issue.issue_id] = fix_result
                    
                    if not fix_result.success:
                        self.logger.warning(f"Failed to fix issue {issue.issue_id}: {fix_result.error_message}")
            
            return fix_results
            
        except Exception as e:
            self.logger.error(f"Error during auto-fixing: {str(e)}")
            return {}
    
    async def get_educational_insights(self, analysis_result: QualityAnalysisResult, 
                                     learning_level: LearningLevel = LearningLevel.INTERMEDIATE) -> List[Explanation]:
        """
        Get educational explanations for identified issues
        
        Args:
            analysis_result: Results from code quality analysis
            learning_level: Target learning level for explanations
            
        Returns:
            List of educational explanations
        """
        
        try:
            explanations = []
            
            for issue in analysis_result.issues_found:
                if issue.educational_value in ["high", "medium"]:
                    explanation = await self.educational_explainer.explain_issue(
                        issue, learning_level
                    )
                    explanations.append(explanation)
            
            # Add general best practices explanations
            general_explanations = await self.educational_explainer.generate_best_practices(
                analysis_result, learning_level
            )
            explanations.extend(general_explanations)
            
            return explanations
            
        except Exception as e:
            self.logger.error(f"Error generating educational insights: {str(e)}")
            return []
    
    async def monitor_code_changes(self, file_path: str, change_callback: callable = None):
        """
        Monitor a file for changes and trigger real-time analysis
        
        Args:
            file_path: Path to monitor
            change_callback: Optional callback for change notifications
        """
        
        if not self.real_time_monitoring:
            return
        
        try:
            monitor_id = hashlib.md5(file_path.encode()).hexdigest()
            
            with self._lock:
                self.active_monitors[monitor_id] = {
                    "file_path": file_path,
                    "callback": change_callback,
                    "last_modified": None,
                    "last_analysis": None
                }
            
            self.logger.info(f"Started monitoring {file_path}")
            
        except Exception as e:
            self.logger.error(f"Error setting up file monitoring: {str(e)}")
    
    async def get_quality_trends(self, file_path: str = None, 
                               days: int = 30) -> Dict[str, Any]:
        """
        Get quality trends over time
        
        Args:
            file_path: Specific file to analyze (None for all files)
            days: Number of days to analyze
            
        Returns:
            Quality trends data
        """
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days)
            
            # Filter historical data
            relevant_analyses = [
                analysis for analysis in self.analysis_history
                if analysis.get("timestamp", datetime.min) > cutoff_date
            ]
            
            if file_path:
                relevant_analyses = [
                    analysis for analysis in relevant_analyses
                    if analysis.get("file_path") == file_path
                ]
            
            # Calculate trends
            trends = await self._calculate_quality_trends(relevant_analyses)
            
            return trends
            
        except Exception as e:
            self.logger.error(f"Error calculating quality trends: {str(e)}")
            return {}
    
    # Analysis component runners
    async def _run_pattern_analysis(self, file_path: str, code_content: str) -> List[CodePattern]:
        """Run pattern detection analysis"""
        
        try:
            patterns = await self.pattern_detector.detect_patterns(file_path, code_content)
            return patterns
        except Exception as e:
            self.logger.error(f"Pattern analysis error: {str(e)}")
            return []
    
    async def _run_architecture_analysis(self, file_path: str, code_content: str) -> Dict[str, Any]:
        """Run architectural analysis"""
        
        try:
            analysis = await self.architecture_analyzer.analyze_architecture(file_path, code_content)
            return analysis
        except Exception as e:
            self.logger.error(f"Architecture analysis error: {str(e)}")
            return {}
    
    async def _run_security_analysis(self, file_path: str, code_content: str) -> List[SecurityVulnerability]:
        """Run security vulnerability analysis"""
        
        try:
            vulnerabilities = await self.security_scanner.scan_code(file_path, code_content)
            return vulnerabilities
        except Exception as e:
            self.logger.error(f"Security analysis error: {str(e)}")
            return []
    
    async def _run_refactoring_analysis(self, file_path: str, code_content: str) -> List[RefactoringAction]:
        """Run refactoring opportunity analysis"""
        
        try:
            opportunities = await self.refactoring_engine.identify_opportunities(file_path, code_content)
            return opportunities
        except Exception as e:
            self.logger.error(f"Refactoring analysis error: {str(e)}")
            return []
    
    async def _run_educational_analysis(self, file_path: str, code_content: str) -> List[Dict[str, Any]]:
        """Run educational value analysis"""
        
        try:
            insights = await self.educational_explainer.analyze_educational_value(file_path, code_content)
            return insights
        except Exception as e:
            self.logger.error(f"Educational analysis error: {str(e)}")
            return []
    
    async def _process_analysis_results(self, analysis_result: QualityAnalysisResult, 
                                      component_results: List[Any], analysis_types: List[AnalysisType]):
        """Process results from all analysis components"""
        
        for i, result in enumerate(component_results):
            if isinstance(result, Exception):
                self.logger.error(f"Analysis component {i} failed: {str(result)}")
                continue
            
            analysis_type = analysis_types[i]
            
            if analysis_type == AnalysisType.PATTERN_DETECTION:
                await self._process_pattern_results(analysis_result, result)
            
            elif analysis_type == AnalysisType.ARCHITECTURE_REVIEW:
                await self._process_architecture_results(analysis_result, result)
            
            elif analysis_type == AnalysisType.SECURITY_SCAN:
                await self._process_security_results(analysis_result, result)
            
            elif analysis_type == AnalysisType.REFACTORING_ANALYSIS:
                await self._process_refactoring_results(analysis_result, result)
            
            elif analysis_type == AnalysisType.EDUCATIONAL_REVIEW:
                await self._process_educational_results(analysis_result, result)
    
    async def _process_pattern_results(self, analysis_result: QualityAnalysisResult, patterns: List[CodePattern]):
        """Process pattern detection results"""
        
        for pattern in patterns:
            issue = QualityIssue(
                issue_id=f"pattern_{pattern.pattern_id}",
                issue_type="code_pattern",
                severity=pattern.severity.value,
                description=pattern.description,
                file_path=analysis_result.file_path,
                line_number=pattern.line_number,
                column_number=pattern.column_number,
                code_snippet=pattern.code_snippet,
                suggestion=pattern.suggestion,
                explanation=pattern.explanation,
                tags=pattern.tags,
                metrics_impact=pattern.metrics_impact,
                confidence=pattern.confidence,
                auto_fixable=pattern.auto_fixable,
                fix_complexity=pattern.fix_complexity,
                educational_value=pattern.educational_value
            )
            analysis_result.issues_found.append(issue)
    
    async def _process_architecture_results(self, analysis_result: QualityAnalysisResult, 
                                          architecture_data: Dict[str, Any]):
        """Process architectural analysis results"""
        
        issues = architecture_data.get("issues", [])
        recommendations = architecture_data.get("recommendations", [])
        
        for issue in issues:
            quality_issue = QualityIssue(
                issue_id=f"arch_{issue.get('id', 'unknown')}",
                issue_type="architectural",
                severity=issue.get("severity", "medium"),
                description=issue.get("description", ""),
                file_path=analysis_result.file_path,
                line_number=issue.get("line_number", 0),
                column_number=issue.get("column_number", 0),
                code_snippet=issue.get("code_snippet", ""),
                suggestion=issue.get("suggestion", ""),
                explanation=issue.get("explanation", ""),
                tags=issue.get("tags", []),
                metrics_impact=issue.get("metrics_impact", {}),
                confidence=issue.get("confidence", 0.5),
                auto_fixable=issue.get("auto_fixable", False),
                fix_complexity=issue.get("fix_complexity", "complex"),
                educational_value=issue.get("educational_value", "medium")
            )
            analysis_result.issues_found.append(quality_issue)
        
        analysis_result.architectural_suggestions.extend(recommendations)
    
    async def _process_security_results(self, analysis_result: QualityAnalysisResult, 
                                       vulnerabilities: List[SecurityVulnerability]):
        """Process security scan results"""
        
        for vuln in vulnerabilities:
            issue = QualityIssue(
                issue_id=f"security_{vuln.vulnerability_id}",
                issue_type="security",
                severity=vuln.severity.value,
                description=vuln.description,
                file_path=analysis_result.file_path,
                line_number=vuln.line_number,
                column_number=vuln.column_number,
                code_snippet=vuln.code_snippet,
                suggestion=vuln.fix_suggestion,
                explanation=vuln.explanation,
                tags=vuln.tags,
                metrics_impact={"security": -0.5},
                confidence=vuln.confidence,
                auto_fixable=vuln.auto_fixable,
                fix_complexity=vuln.fix_complexity,
                educational_value="high"
            )
            analysis_result.issues_found.append(issue)
            
            analysis_result.security_vulnerabilities.append({
                "id": vuln.vulnerability_id,
                "type": vuln.vulnerability_type,
                "severity": vuln.severity.value,
                "description": vuln.description,
                "cwe_id": vuln.cwe_id,
                "fix_suggestion": vuln.fix_suggestion
            })
    
    async def _process_refactoring_results(self, analysis_result: QualityAnalysisResult, 
                                         opportunities: List[RefactoringAction]):
        """Process refactoring analysis results"""
        
        for opportunity in opportunities:
            analysis_result.refactoring_opportunities.append({
                "id": opportunity.action_id,
                "type": opportunity.refactoring_type,
                "description": opportunity.description,
                "complexity": opportunity.complexity,
                "impact": opportunity.impact_assessment,
                "auto_applicable": opportunity.auto_applicable
            })
    
    async def _process_educational_results(self, analysis_result: QualityAnalysisResult, 
                                         insights: List[Dict[str, Any]]):
        """Process educational analysis results"""
        
        analysis_result.educational_insights.extend(insights)
    
    async def _calculate_quality_metrics(self, analysis_result: QualityAnalysisResult):
        """Calculate overall quality metrics"""
        
        # Initialize metrics
        metrics = {metric.value: 10.0 for metric in QualityMetric}
        
        # Apply penalties based on issues found
        for issue in analysis_result.issues_found:
            severity_penalty = {
                "critical": 2.0,
                "high": 1.5,
                "medium": 1.0,
                "low": 0.5,
                "info": 0.1
            }.get(issue.severity, 1.0)
            
            # Apply penalty to relevant metrics
            for metric, impact in issue.metrics_impact.items():
                if metric in metrics:
                    metrics[metric] += impact * severity_penalty
        
        # Ensure metrics stay within bounds
        for metric in metrics:
            metrics[metric] = max(0.0, min(10.0, metrics[metric]))
        
        analysis_result.metric_scores = metrics
        
        # Calculate overall score (weighted average)
        weights = {
            QualityMetric.MAINTAINABILITY.value: 0.20,
            QualityMetric.READABILITY.value: 0.15,
            QualityMetric.PERFORMANCE.value: 0.15,
            QualityMetric.SECURITY.value: 0.20,
            QualityMetric.SCALABILITY.value: 0.15,
            QualityMetric.TESTABILITY.value: 0.10,
            QualityMetric.RELIABILITY.value: 0.05
        }
        
        overall_score = sum(
            metrics[metric] * weight
            for metric, weight in weights.items()
        )
        
        analysis_result.overall_score = overall_score
    
    async def _generate_recommendations(self, analysis_result: QualityAnalysisResult):
        """Generate comprehensive recommendations"""
        
        recommendations = []
        
        # Recommendations based on metric scores
        for metric, score in analysis_result.metric_scores.items():
            threshold = self.quality_thresholds.get(QualityMetric(metric), 7.0)
            
            if score < threshold:
                recommendations.append(
                    f"Improve {metric} (current: {score:.1f}, target: {threshold:.1f})"
                )
        
        # Recommendations based on issue types
        issue_types = {}
        for issue in analysis_result.issues_found:
            if issue.issue_type not in issue_types:
                issue_types[issue.issue_type] = 0
            issue_types[issue.issue_type] += 1
        
        for issue_type, count in issue_types.items():
            if count > 5:  # Many issues of same type
                recommendations.append(
                    f"Address {count} {issue_type} issues systematically"
                )
        
        # Prioritize recommendations
        high_severity_issues = [
            issue for issue in analysis_result.issues_found
            if issue.severity in ["critical", "high"]
        ]
        
        if high_severity_issues:
            recommendations.insert(0, 
                f"Priority: Fix {len(high_severity_issues)} high-severity issues first"
            )
        
        analysis_result.recommendations = recommendations
    
    # Real-time monitoring
    async def _start_real_time_monitoring(self):
        """Start real-time file monitoring"""
        
        while True:
            try:
                await self._check_monitored_files()
                await asyncio.sleep(self.config.get("monitoring_interval", 10))
                
            except Exception as e:
                self.logger.error(f"Error in real-time monitoring: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _check_monitored_files(self):
        """Check monitored files for changes"""
        
        with self._lock:
            monitors = list(self.active_monitors.items())
        
        for monitor_id, monitor_info in monitors:
            try:
                file_path = monitor_info["file_path"]
                
                # Check if file has been modified
                if await self._file_has_changed(file_path, monitor_info):
                    # Trigger analysis
                    analysis_result = await self.analyze_code(file_path)
                    
                    # Update monitor info
                    with self._lock:
                        if monitor_id in self.active_monitors:
                            self.active_monitors[monitor_id]["last_analysis"] = analysis_result
                    
                    # Call callback if provided
                    if monitor_info["callback"]:
                        await monitor_info["callback"](file_path, analysis_result)
                        
            except Exception as e:
                self.logger.error(f"Error checking monitored file {monitor_info.get('file_path')}: {e}")
    
    async def _file_has_changed(self, file_path: str, monitor_info: Dict[str, Any]) -> bool:
        """Check if a file has changed since last check"""
        
        try:
            file_stat = Path(file_path).stat()
            current_modified = file_stat.st_mtime
            
            last_modified = monitor_info.get("last_modified")
            
            if last_modified is None or current_modified > last_modified:
                monitor_info["last_modified"] = current_modified
                return True
            
            return False
            
        except Exception:
            return False
    
    # Helper methods
    async def _read_file_content(self, file_path: str) -> str:
        """Read content from a file"""
        
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except Exception as e:
            self.logger.error(f"Error reading file {file_path}: {str(e)}")
            return ""
    
    async def _find_project_files(self, project_path: str, file_patterns: List[str] = None) -> List[str]:
        """Find all relevant files in a project"""
        
        if file_patterns is None:
            file_patterns = ["*.py", "*.js", "*.ts", "*.java", "*.cpp", "*.c", "*.cs"]
        
        files = []
        project_path_obj = Path(project_path)
        
        for pattern in file_patterns:
            files.extend(project_path_obj.rglob(pattern))
        
        return [str(file) for file in files if file.is_file()]
    
    async def _store_analysis_results(self, analysis_result: QualityAnalysisResult):
        """Store analysis results for historical tracking"""
        
        with self._lock:
            # Store in history
            history_record = {
                "analysis_id": analysis_result.analysis_id,
                "timestamp": analysis_result.timestamp,
                "file_path": analysis_result.file_path,
                "overall_score": analysis_result.overall_score,
                "metric_scores": analysis_result.metric_scores,
                "issues_count": len(analysis_result.issues_found),
                "security_issues": len(analysis_result.security_vulnerabilities),
                "execution_time": analysis_result.execution_time
            }
            
            self.analysis_history.append(history_record)
            
            # Limit history size
            max_history = self.config.get("max_history_size", 10000)
            if len(self.analysis_history) > max_history:
                self.analysis_history = self.analysis_history[-max_history:]
    
    async def _generate_project_insights(self, project_results: Dict[str, QualityAnalysisResult], 
                                       project_path: str):
        """Generate project-level insights"""
        
        if not project_results:
            return
        
        # Calculate project-wide metrics
        total_issues = sum(len(result.issues_found) for result in project_results.values())
        avg_score = sum(result.overall_score for result in project_results.values()) / len(project_results)
        
        # Identify files with most issues
        files_by_issues = sorted(
            project_results.items(),
            key=lambda x: len(x[1].issues_found),
            reverse=True
        )
        
        self.logger.info(f"Project Analysis Summary for {project_path}:")
        self.logger.info(f"  Total files analyzed: {len(project_results)}")
        self.logger.info(f"  Total issues found: {total_issues}")
        self.logger.info(f"  Average quality score: {avg_score:.2f}")
        self.logger.info(f"  File with most issues: {files_by_issues[0][0]} ({len(files_by_issues[0][1].issues_found)} issues)")
    
    async def _calculate_quality_trends(self, analyses: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate quality trends from historical data"""
        
        if not analyses:
            return {}
        
        # Group by time periods
        daily_scores = {}
        for analysis in analyses:
            date = analysis["timestamp"].date()
            if date not in daily_scores:
                daily_scores[date] = []
            daily_scores[date].append(analysis["overall_score"])
        
        # Calculate daily averages
        trend_data = {}
        for date, scores in daily_scores.items():
            trend_data[date.isoformat()] = {
                "average_score": sum(scores) / len(scores),
                "file_count": len(scores),
                "min_score": min(scores),
                "max_score": max(scores)
            }
        
        return {
            "trend_data": trend_data,
            "total_analyses": len(analyses),
            "date_range": {
                "start": min(analyses, key=lambda x: x["timestamp"])["timestamp"].isoformat(),
                "end": max(analyses, key=lambda x: x["timestamp"])["timestamp"].isoformat()
            }
        }
    
    async def _load_quality_baselines(self):
        """Load quality baselines from storage"""
        
        # This would load from persistent storage
        # For now, initialize with defaults
        self.quality_baselines = {}
    
    def _generate_analysis_id(self, file_path: str) -> str:
        """Generate unique analysis ID"""
        
        timestamp = datetime.now().isoformat()
        content = f"{file_path}_{timestamp}"
        return hashlib.md5(content.encode()).hexdigest()[:16]
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the code quality analyzer"""
        
        logger = logging.getLogger("CodeQualityAnalyzer")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger


# Main interface for external usage
async def analyze_code_quality(file_path: str, config: Dict[str, Any] = None) -> QualityAnalysisResult:
    """
    Convenience function for analyzing code quality
    
    Args:
        file_path: Path to code file to analyze
        config: Optional configuration
        
    Returns:
        QualityAnalysisResult with comprehensive analysis
    """
    
    analyzer = CodeQualityAnalyzer(config)
    await analyzer.initialize()
    return await analyzer.analyze_code(file_path)


async def analyze_project_quality(project_path: str, config: Dict[str, Any] = None) -> Dict[str, QualityAnalysisResult]:
    """
    Convenience function for analyzing project quality
    
    Args:
        project_path: Path to project directory
        config: Optional configuration
        
    Returns:
        Dictionary mapping file paths to analysis results
    """
    
    analyzer = CodeQualityAnalyzer(config)
    await analyzer.initialize()
    return await analyzer.analyze_project(project_path)
