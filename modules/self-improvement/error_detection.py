"""
Runtime Error Detection System

Monitors execution and detects various types of errors in real-time:
- Syntax errors in generated code
- Runtime exceptions and failures
- Performance degradation detection
- Logic errors and inconsistencies
- Pattern recognition for recurring issues
"""

import asyncio
import json
import re
import ast
import traceback
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta
import hashlib
import threading

class ErrorType(Enum):
    """Types of errors that can be detected"""
    SYNTAX_ERROR = "syntax_error"
    RUNTIME_ERROR = "runtime_error"
    LOGIC_ERROR = "logic_error"
    PERFORMANCE_ERROR = "performance_error"
    TIMEOUT_ERROR = "timeout_error"
    MEMORY_ERROR = "memory_error"
    API_ERROR = "api_error"
    VALIDATION_ERROR = "validation_error"

class ErrorSeverity(Enum):
    """Severity levels for detected errors"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class DetectedError:
    """Represents a detected error"""
    error_id: str
    error_type: ErrorType
    severity: ErrorSeverity
    message: str
    context: Dict[str, Any]
    timestamp: datetime
    stack_trace: Optional[str] = None
    suggested_fix: Optional[str] = None
    pattern_match: Optional[str] = None

class RuntimeErrorDetector:
    """
    Advanced error detection system that monitors execution and identifies:
    - Code syntax and compilation errors
    - Runtime exceptions and failures
    - Performance issues and bottlenecks
    - Logic errors and unexpected behaviors
    - Recurring error patterns
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.error_history = []
        self.error_patterns = {}
        self.performance_baselines = {}
        self.monitoring_active = False
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Initialize detection rules
        self.syntax_validators = self._initialize_syntax_validators()
        self.runtime_monitors = self._initialize_runtime_monitors()
        self.performance_thresholds = self._initialize_performance_thresholds()
        self.pattern_detectors = self._initialize_pattern_detectors()
    
    async def analyze_execution(self, context: Dict[str, Any], execution_result: Any) -> Dict[str, Any]:
        """
        Analyze an execution for errors and issues
        
        Args:
            context: Execution context (module, function, parameters, etc.)
            execution_result: Result of the execution (or exception if failed)
            
        Returns:
            Analysis results with detected errors and recommendations
        """
        
        analysis_result = {
            "timestamp": datetime.now().isoformat(),
            "context": context,
            "errors": [],
            "warnings": [],
            "performance_issues": [],
            "patterns_detected": [],
            "recommendations": []
        }
        
        try:
            # Check for syntax errors in generated code
            if "generated_code" in context:
                syntax_errors = await self._detect_syntax_errors(
                    context["generated_code"], context
                )
                analysis_result["errors"].extend(syntax_errors)
            
            # Check for runtime errors
            runtime_errors = await self._detect_runtime_errors(execution_result, context)
            analysis_result["errors"].extend(runtime_errors)
            
            # Check for performance issues
            performance_issues = await self._detect_performance_issues(context)
            analysis_result["performance_issues"].extend(performance_issues)
            
            # Check for logic errors
            logic_errors = await self._detect_logic_errors(execution_result, context)
            analysis_result["errors"].extend(logic_errors)
            
            # Detect error patterns
            patterns = await self._detect_error_patterns(analysis_result["errors"], context)
            analysis_result["patterns_detected"].extend(patterns)
            
            # Generate recommendations
            recommendations = await self._generate_error_recommendations(
                analysis_result["errors"], analysis_result["performance_issues"]
            )
            analysis_result["recommendations"].extend(recommendations)
            
            # Store errors in history for pattern analysis
            await self._store_errors_in_history(analysis_result["errors"], context)
            
            return analysis_result
            
        except Exception as e:
            analysis_result["analysis_error"] = str(e)
            analysis_result["errors"].append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.RUNTIME_ERROR,
                severity=ErrorSeverity.HIGH,
                message=f"Error in error detection: {str(e)}",
                context=context,
                timestamp=datetime.now(),
                stack_trace=traceback.format_exc()
            ))
            
            return analysis_result
    
    async def _detect_syntax_errors(self, code: str, context: Dict) -> List[DetectedError]:
        """Detect syntax errors in generated code"""
        
        errors = []
        
        # Determine code language
        language = context.get("language", "python")
        
        if language.lower() == "python":
            errors.extend(await self._validate_python_syntax(code, context))
        elif language.lower() in ["javascript", "js"]:
            errors.extend(await self._validate_javascript_syntax(code, context))
        elif language.lower() in ["html", "xml"]:
            errors.extend(await self._validate_html_syntax(code, context))
        elif language.lower() == "css":
            errors.extend(await self._validate_css_syntax(code, context))
        else:
            # Generic syntax validation
            errors.extend(await self._validate_generic_syntax(code, context))
        
        return errors
    
    async def _validate_python_syntax(self, code: str, context: Dict) -> List[DetectedError]:
        """Validate Python code syntax"""
        
        errors = []
        
        try:
            # Try to parse the code with AST
            ast.parse(code)
            
        except SyntaxError as e:
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.SYNTAX_ERROR,
                severity=ErrorSeverity.HIGH,
                message=f"Python syntax error: {str(e)}",
                context={**context, "line_number": e.lineno, "offset": e.offset},
                timestamp=datetime.now(),
                suggested_fix=self._suggest_python_syntax_fix(e, code)
            ))
            
        except Exception as e:
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.VALIDATION_ERROR,
                severity=ErrorSeverity.MEDIUM,
                message=f"Code validation error: {str(e)}",
                context=context,
                timestamp=datetime.now()
            ))
        
        # Additional Python-specific checks
        errors.extend(await self._check_python_best_practices(code, context))
        
        return errors
    
    async def _validate_javascript_syntax(self, code: str, context: Dict) -> List[DetectedError]:
        """Validate JavaScript code syntax"""
        
        errors = []
        
        # Basic JavaScript syntax checks
        common_errors = [
            (r'\w+\s*\(\s*\)\s*{[^}]*$', "Unclosed function block"),
            (r'\[\s*[^}]*$', "Unclosed array literal"),
            (r'{\s*[^}]*$', "Unclosed object literal"),
            (r'if\s*\([^)]*$', "Unclosed if condition"),
            (r'for\s*\([^)]*$', "Unclosed for loop"),
        ]
        
        for pattern, error_msg in common_errors:
            if re.search(pattern, code, re.MULTILINE):
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.SYNTAX_ERROR,
                    severity=ErrorSeverity.HIGH,
                    message=f"JavaScript syntax error: {error_msg}",
                    context=context,
                    timestamp=datetime.now(),
                    suggested_fix=f"Check for {error_msg.lower()}"
                ))
        
        return errors
    
    async def _validate_html_syntax(self, code: str, context: Dict) -> List[DetectedError]:
        """Validate HTML/XML syntax"""
        
        errors = []
        
        # Check for common HTML issues
        html_checks = [
            (r'<(\w+)[^>]*>(?!.*</\1>)', "Unclosed HTML tag"),
            (r'<(\w+)\s+[^>]*[^/]>', "Tag not properly closed"),
            (r'<\s+\w+', "Invalid tag syntax"),
            (r'&\w+(?!;)', "Unescaped HTML entity"),
        ]
        
        for pattern, error_msg in html_checks:
            matches = re.finditer(pattern, code, re.IGNORECASE)
            for match in matches:
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.SYNTAX_ERROR,
                    severity=ErrorSeverity.MEDIUM,
                    message=f"HTML syntax issue: {error_msg}",
                    context={**context, "match_position": match.start()},
                    timestamp=datetime.now(),
                    suggested_fix=f"Fix {error_msg.lower()}"
                ))
        
        return errors
    
    async def _validate_css_syntax(self, code: str, context: Dict) -> List[DetectedError]:
        """Validate CSS syntax"""
        
        errors = []
        
        # Check for common CSS issues
        css_checks = [
            (r'[^{}]*{[^}]*$', "Unclosed CSS rule"),
            (r':\s*[^;]*$', "Missing semicolon"),
            (r'@\w+[^{]*$', "Incomplete at-rule"),
            (r'[^:]*:[^;{}]*{', "Invalid property syntax"),
        ]
        
        for pattern, error_msg in css_checks:
            if re.search(pattern, code, re.MULTILINE):
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.SYNTAX_ERROR,
                    severity=ErrorSeverity.MEDIUM,
                    message=f"CSS syntax error: {error_msg}",
                    context=context,
                    timestamp=datetime.now(),
                    suggested_fix=f"Check CSS for {error_msg.lower()}"
                ))
        
        return errors
    
    async def _validate_generic_syntax(self, code: str, context: Dict) -> List[DetectedError]:
        """Generic syntax validation for unknown languages"""
        
        errors = []
        
        # Basic bracket/parentheses matching
        brackets = {'(': ')', '[': ']', '{': '}'}
        stack = []
        
        for i, char in enumerate(code):
            if char in brackets:
                stack.append((char, i))
            elif char in brackets.values():
                if not stack:
                    errors.append(DetectedError(
                        error_id=self._generate_error_id(),
                        error_type=ErrorType.SYNTAX_ERROR,
                        severity=ErrorSeverity.HIGH,
                        message=f"Unmatched closing bracket '{char}' at position {i}",
                        context={**context, "position": i},
                        timestamp=datetime.now(),
                        suggested_fix="Check bracket matching"
                    ))
                else:
                    open_char, open_pos = stack.pop()
                    if brackets[open_char] != char:
                        errors.append(DetectedError(
                            error_id=self._generate_error_id(),
                            error_type=ErrorType.SYNTAX_ERROR,
                            severity=ErrorSeverity.HIGH,
                            message=f"Mismatched brackets: '{open_char}' at {open_pos} and '{char}' at {i}",
                            context={**context, "open_position": open_pos, "close_position": i},
                            timestamp=datetime.now(),
                            suggested_fix="Fix bracket matching"
                        ))
        
        # Check for unclosed brackets
        for open_char, open_pos in stack:
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.SYNTAX_ERROR,
                severity=ErrorSeverity.HIGH,
                message=f"Unclosed bracket '{open_char}' at position {open_pos}",
                context={**context, "position": open_pos},
                timestamp=datetime.now(),
                suggested_fix="Close the bracket"
            ))
        
        return errors
    
    async def _check_python_best_practices(self, code: str, context: Dict) -> List[DetectedError]:
        """Check Python code for best practices"""
        
        errors = []
        
        # Check for common issues
        best_practice_checks = [
            (r'import \*', "Avoid wildcard imports", ErrorSeverity.LOW),
            (r'except:', "Use specific exception types", ErrorSeverity.MEDIUM),
            (r'==\s*(True|False)', "Use 'is' for boolean comparisons", ErrorSeverity.LOW),
            (r'len\([^)]+\)\s*==\s*0', "Use 'not' for empty collections", ErrorSeverity.LOW),
        ]
        
        for pattern, message, severity in best_practice_checks:
            if re.search(pattern, code):
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.VALIDATION_ERROR,
                    severity=severity,
                    message=f"Python best practice: {message}",
                    context=context,
                    timestamp=datetime.now(),
                    suggested_fix=message
                ))
        
        return errors
    
    async def _detect_runtime_errors(self, execution_result: Any, context: Dict) -> List[DetectedError]:
        """Detect runtime errors from execution results"""
        
        errors = []
        
        # Check if execution_result is an exception
        if isinstance(execution_result, Exception):
            error_type = self._classify_exception(execution_result)
            severity = self._determine_error_severity(execution_result, context)
            
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=error_type,
                severity=severity,
                message=str(execution_result),
                context=context,
                timestamp=datetime.now(),
                stack_trace=getattr(execution_result, '__traceback__', None),
                suggested_fix=self._suggest_runtime_fix(execution_result)
            ))
        
        # Check for None result when expecting output
        elif execution_result is None and context.get("expects_output", True):
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.LOGIC_ERROR,
                severity=ErrorSeverity.MEDIUM,
                message="Function returned None when output was expected",
                context=context,
                timestamp=datetime.now(),
                suggested_fix="Check function logic and return statements"
            ))
        
        # Check for empty results when expecting data
        elif (isinstance(execution_result, (list, dict, str)) and 
              len(execution_result) == 0 and 
              context.get("expects_data", True)):
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.LOGIC_ERROR,
                severity=ErrorSeverity.LOW,
                message="Function returned empty result when data was expected",
                context=context,
                timestamp=datetime.now(),
                suggested_fix="Verify data processing logic"
            ))
        
        return errors
    
    async def _detect_performance_issues(self, context: Dict) -> List[Dict[str, Any]]:
        """Detect performance issues from execution context"""
        
        issues = []
        
        # Check execution time
        execution_time = context.get("execution_time", 0)
        time_threshold = self.performance_thresholds.get("execution_time", 5.0)  # 5 seconds
        
        if execution_time > time_threshold:
            issues.append({
                "type": "slow_execution",
                "severity": "medium" if execution_time < time_threshold * 2 else "high",
                "message": f"Execution took {execution_time:.2f}s (threshold: {time_threshold}s)",
                "metric_value": execution_time,
                "threshold": time_threshold
            })
        
        # Check memory usage
        memory_usage = context.get("memory_usage", 0)
        memory_threshold = self.performance_thresholds.get("memory_usage", 100 * 1024 * 1024)  # 100MB
        
        if memory_usage > memory_threshold:
            issues.append({
                "type": "high_memory_usage",
                "severity": "medium" if memory_usage < memory_threshold * 2 else "high",
                "message": f"Memory usage: {memory_usage / 1024 / 1024:.1f}MB (threshold: {memory_threshold / 1024 / 1024:.1f}MB)",
                "metric_value": memory_usage,
                "threshold": memory_threshold
            })
        
        # Check for timeout issues
        if context.get("timed_out", False):
            issues.append({
                "type": "timeout",
                "severity": "high",
                "message": "Execution timed out",
                "metric_value": context.get("timeout_duration", 0),
                "threshold": context.get("timeout_limit", 30)
            })
        
        return issues
    
    async def _detect_logic_errors(self, execution_result: Any, context: Dict) -> List[DetectedError]:
        """Detect logic errors in execution results"""
        
        errors = []
        
        # Check for type mismatches
        expected_type = context.get("expected_return_type")
        if expected_type and execution_result is not None:
            if not isinstance(execution_result, expected_type):
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.LOGIC_ERROR,
                    severity=ErrorSeverity.MEDIUM,
                    message=f"Type mismatch: expected {expected_type.__name__}, got {type(execution_result).__name__}",
                    context=context,
                    timestamp=datetime.now(),
                    suggested_fix="Check function return type"
                ))
        
        # Check for unexpected data structures
        if isinstance(execution_result, dict):
            errors.extend(await self._validate_dict_structure(execution_result, context))
        elif isinstance(execution_result, list):
            errors.extend(await self._validate_list_structure(execution_result, context))
        
        return errors
    
    async def _validate_dict_structure(self, result_dict: Dict, context: Dict) -> List[DetectedError]:
        """Validate dictionary structure for common issues"""
        
        errors = []
        
        # Check for required keys
        required_keys = context.get("required_keys", [])
        for key in required_keys:
            if key not in result_dict:
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.LOGIC_ERROR,
                    severity=ErrorSeverity.MEDIUM,
                    message=f"Missing required key: '{key}'",
                    context=context,
                    timestamp=datetime.now(),
                    suggested_fix=f"Ensure '{key}' is included in the result"
                ))
        
        # Check for None values in important fields
        important_fields = context.get("important_fields", [])
        for field in important_fields:
            if field in result_dict and result_dict[field] is None:
                errors.append(DetectedError(
                    error_id=self._generate_error_id(),
                    error_type=ErrorType.LOGIC_ERROR,
                    severity=ErrorSeverity.LOW,
                    message=f"Important field '{field}' is None",
                    context=context,
                    timestamp=datetime.now(),
                    suggested_fix=f"Provide a valid value for '{field}'"
                ))
        
        return errors
    
    async def _validate_list_structure(self, result_list: List, context: Dict) -> List[DetectedError]:
        """Validate list structure for common issues"""
        
        errors = []
        
        # Check minimum length
        min_length = context.get("min_list_length", 0)
        if len(result_list) < min_length:
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.LOGIC_ERROR,
                severity=ErrorSeverity.MEDIUM,
                message=f"List too short: {len(result_list)} items (minimum: {min_length})",
                context=context,
                timestamp=datetime.now(),
                suggested_fix=f"Ensure list has at least {min_length} items"
            ))
        
        # Check for None items
        none_count = result_list.count(None)
        if none_count > 0:
            errors.append(DetectedError(
                error_id=self._generate_error_id(),
                error_type=ErrorType.LOGIC_ERROR,
                severity=ErrorSeverity.LOW,
                message=f"List contains {none_count} None values",
                context=context,
                timestamp=datetime.now(),
                suggested_fix="Remove or replace None values"
            ))
        
        return errors
    
    async def _detect_error_patterns(self, errors: List[DetectedError], context: Dict) -> List[Dict[str, Any]]:
        """Detect patterns in current errors and historical data"""
        
        patterns = []
        
        # Group errors by type
        error_types = {}
        for error in errors:
            error_type = error.error_type.value
            if error_type not in error_types:
                error_types[error_type] = []
            error_types[error_type].append(error)
        
        # Check for recurring error types
        for error_type, error_list in error_types.items():
            if len(error_list) > 1:
                patterns.append({
                    "type": "recurring_error_type",
                    "error_type": error_type,
                    "count": len(error_list),
                    "description": f"Multiple {error_type} errors in single execution",
                    "severity": "medium"
                })
        
        # Check historical patterns
        historical_patterns = await self._analyze_historical_patterns(errors, context)
        patterns.extend(historical_patterns)
        
        return patterns
    
    async def _analyze_historical_patterns(self, current_errors: List[DetectedError], context: Dict) -> List[Dict[str, Any]]:
        """Analyze historical error patterns"""
        
        patterns = []
        
        # Get recent errors from history
        recent_cutoff = datetime.now() - timedelta(hours=24)
        recent_errors = [
            error for error in self.error_history 
            if error.timestamp > recent_cutoff
        ]
        
        # Check for recurring error messages
        current_messages = [error.message for error in current_errors]
        message_counts = {}
        
        for error in recent_errors:
            if error.message in current_messages:
                message_counts[error.message] = message_counts.get(error.message, 0) + 1
        
        for message, count in message_counts.items():
            if count >= 3:  # Threshold for pattern detection
                patterns.append({
                    "type": "recurring_error_message",
                    "message": message,
                    "frequency": count,
                    "description": f"Error message seen {count} times in last 24 hours",
                    "severity": "high" if count >= 5 else "medium"
                })
        
        # Check for function-specific patterns
        current_function = context.get("function")
        if current_function:
            function_errors = [
                error for error in recent_errors 
                if error.context.get("function") == current_function
            ]
            
            if len(function_errors) >= 3:
                patterns.append({
                    "type": "function_error_pattern",
                    "function": current_function,
                    "frequency": len(function_errors),
                    "description": f"Function '{current_function}' has recurring issues",
                    "severity": "high"
                })
        
        return patterns
    
    async def _generate_error_recommendations(self, errors: List[DetectedError], performance_issues: List[Dict]) -> List[Dict[str, Any]]:
        """Generate recommendations based on detected errors"""
        
        recommendations = []
        
        # Group errors by type for targeted recommendations
        error_groups = {}
        for error in errors:
            error_type = error.error_type.value
            if error_type not in error_groups:
                error_groups[error_type] = []
            error_groups[error_type].append(error)
        
        # Generate type-specific recommendations
        for error_type, error_list in error_groups.items():
            if error_type == "syntax_error":
                recommendations.append({
                    "type": "improvement",
                    "category": "code_generation",
                    "description": "Enhance syntax validation in code generation",
                    "priority": "high",
                    "affected_errors": len(error_list)
                })
            
            elif error_type == "runtime_error":
                recommendations.append({
                    "type": "improvement",
                    "category": "error_handling",
                    "description": "Improve runtime error handling and validation",
                    "priority": "high",
                    "affected_errors": len(error_list)
                })
            
            elif error_type == "logic_error":
                recommendations.append({
                    "type": "improvement",
                    "category": "logic_validation",
                    "description": "Enhance logic validation and testing",
                    "priority": "medium",
                    "affected_errors": len(error_list)
                })
        
        # Generate performance recommendations
        for issue in performance_issues:
            if issue["type"] == "slow_execution":
                recommendations.append({
                    "type": "optimization",
                    "category": "performance",
                    "description": "Optimize execution speed and algorithm efficiency",
                    "priority": "medium",
                    "metric": issue["metric_value"]
                })
            
            elif issue["type"] == "high_memory_usage":
                recommendations.append({
                    "type": "optimization",
                    "category": "memory",
                    "description": "Optimize memory usage and data structures",
                    "priority": "medium",
                    "metric": issue["metric_value"]
                })
        
        return recommendations
    
    async def analyze_error_patterns(self, error: DetectedError, context: Dict) -> Dict[str, Any]:
        """Analyze patterns for a specific error"""
        
        patterns = {
            "temporal_patterns": await self._analyze_temporal_patterns(error),
            "contextual_patterns": await self._analyze_contextual_patterns(error, context),
            "message_patterns": await self._analyze_message_patterns(error),
            "severity_patterns": await self._analyze_severity_patterns(error)
        }
        
        return patterns
    
    async def _analyze_temporal_patterns(self, error: DetectedError) -> Dict[str, Any]:
        """Analyze temporal patterns for an error"""
        
        # Find similar errors in different time periods
        similar_errors = [
            e for e in self.error_history 
            if e.error_type == error.error_type and e.message == error.message
        ]
        
        if len(similar_errors) < 2:
            return {"frequency": "rare", "pattern": "none"}
        
        # Analyze timing
        time_diffs = []
        for i in range(1, len(similar_errors)):
            diff = (similar_errors[i].timestamp - similar_errors[i-1].timestamp).total_seconds()
            time_diffs.append(diff)
        
        avg_interval = sum(time_diffs) / len(time_diffs) if time_diffs else 0
        
        return {
            "frequency": "recurring",
            "total_occurrences": len(similar_errors),
            "average_interval_seconds": avg_interval,
            "pattern": "periodic" if avg_interval < 3600 else "sporadic"  # 1 hour threshold
        }
    
    async def _analyze_contextual_patterns(self, error: DetectedError, context: Dict) -> Dict[str, Any]:
        """Analyze contextual patterns for an error"""
        
        # Find errors in similar contexts
        context_key = context.get("module", "unknown")
        similar_context_errors = [
            e for e in self.error_history 
            if e.context.get("module") == context_key and e.error_type == error.error_type
        ]
        
        return {
            "context_specific_frequency": len(similar_context_errors),
            "context": context_key,
            "pattern": "context_specific" if len(similar_context_errors) > 2 else "isolated"
        }
    
    async def _analyze_message_patterns(self, error: DetectedError) -> Dict[str, Any]:
        """Analyze message patterns for an error"""
        
        # Look for similar error messages
        similar_messages = [
            e for e in self.error_history 
            if self._calculate_message_similarity(e.message, error.message) > 0.8
        ]
        
        return {
            "similar_message_count": len(similar_messages),
            "pattern": "message_pattern" if len(similar_messages) > 2 else "unique_message"
        }
    
    async def _analyze_severity_patterns(self, error: DetectedError) -> Dict[str, Any]:
        """Analyze severity patterns for an error"""
        
        # Check if error severity is escalating
        similar_errors = [
            e for e in self.error_history 
            if e.error_type == error.error_type
        ]
        
        if len(similar_errors) < 3:
            return {"pattern": "insufficient_data"}
        
        # Sort by timestamp
        similar_errors.sort(key=lambda x: x.timestamp)
        
        # Check for severity escalation
        severity_levels = {"low": 1, "medium": 2, "high": 3, "critical": 4}
        recent_severities = [
            severity_levels.get(e.severity.value, 1) 
            for e in similar_errors[-5:]  # Last 5 occurrences
        ]
        
        is_escalating = all(
            recent_severities[i] <= recent_severities[i+1] 
            for i in range(len(recent_severities)-1)
        )
        
        return {
            "pattern": "escalating" if is_escalating else "stable",
            "recent_severities": recent_severities,
            "trend": "increasing" if recent_severities[-1] > recent_severities[0] else "stable"
        }
    
    def _calculate_message_similarity(self, msg1: str, msg2: str) -> float:
        """Calculate similarity between two error messages"""
        
        # Simple word-based similarity
        words1 = set(msg1.lower().split())
        words2 = set(msg2.lower().split())
        
        if not words1 and not words2:
            return 1.0
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    async def start_monitoring(self):
        """Start the error monitoring system"""
        
        self.monitoring_active = True
        
        # Start background monitoring tasks
        asyncio.create_task(self._monitor_system_health())
        asyncio.create_task(self._cleanup_old_errors())
    
    async def _monitor_system_health(self):
        """Monitor overall system health"""
        
        while self.monitoring_active:
            try:
                # Calculate error rates
                recent_cutoff = datetime.now() - timedelta(hours=1)
                recent_errors = [
                    e for e in self.error_history 
                    if e.timestamp > recent_cutoff
                ]
                
                # Update performance baselines
                if recent_errors:
                    await self._update_performance_baselines(recent_errors)
                
                # Sleep for monitoring interval
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                print(f"Error in system health monitoring: {e}")
                await asyncio.sleep(60)  # Shorter sleep on error
    
    async def _cleanup_old_errors(self):
        """Clean up old errors from history"""
        
        while self.monitoring_active:
            try:
                # Keep only last 30 days of errors
                cutoff_date = datetime.now() - timedelta(days=30)
                
                with self._lock:
                    self.error_history = [
                        error for error in self.error_history 
                        if error.timestamp > cutoff_date
                    ]
                
                # Sleep for cleanup interval
                await asyncio.sleep(86400)  # 24 hours
                
            except Exception as e:
                print(f"Error in cleanup: {e}")
                await asyncio.sleep(3600)  # 1 hour on error
    
    async def get_detection_rate(self) -> Dict[str, Any]:
        """Get error detection statistics"""
        
        total_executions = len(self.error_history)
        
        if total_executions == 0:
            return {"detection_rate": 0.0, "total_executions": 0}
        
        # Calculate detection rates by type
        type_counts = {}
        for error in self.error_history:
            error_type = error.error_type.value
            type_counts[error_type] = type_counts.get(error_type, 0) + 1
        
        return {
            "total_executions": total_executions,
            "total_errors": len(self.error_history),
            "detection_rate": len(self.error_history) / total_executions,
            "error_types": type_counts,
            "monitoring_active": self.monitoring_active
        }
    
    async def export_patterns(self) -> Dict[str, Any]:
        """Export detected error patterns"""
        
        return {
            "error_patterns": self.error_patterns,
            "performance_baselines": self.performance_baselines,
            "total_errors_analyzed": len(self.error_history),
            "export_timestamp": datetime.now().isoformat()
        }
    
    async def import_patterns(self, patterns: Dict[str, Any]) -> Dict[str, Any]:
        """Import error patterns from external source"""
        
        try:
            if "error_patterns" in patterns:
                self.error_patterns.update(patterns["error_patterns"])
            
            if "performance_baselines" in patterns:
                self.performance_baselines.update(patterns["performance_baselines"])
            
            return {"success": True, "patterns_imported": len(patterns)}
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # Helper methods
    def _initialize_syntax_validators(self) -> Dict[str, Any]:
        """Initialize syntax validation rules"""
        
        return {
            "python": {
                "ast_parser": True,
                "best_practices": True,
                "style_checks": False
            },
            "javascript": {
                "basic_syntax": True,
                "bracket_matching": True,
                "semicolon_checks": False
            },
            "html": {
                "tag_matching": True,
                "entity_validation": True,
                "attribute_validation": False
            },
            "css": {
                "rule_validation": True,
                "property_validation": False,
                "selector_validation": False
            }
        }
    
    def _initialize_runtime_monitors(self) -> Dict[str, Any]:
        """Initialize runtime monitoring configuration"""
        
        return {
            "exception_tracking": True,
            "timeout_detection": True,
            "memory_monitoring": True,
            "performance_tracking": True
        }
    
    def _initialize_performance_thresholds(self) -> Dict[str, float]:
        """Initialize performance thresholds"""
        
        return {
            "execution_time": 5.0,  # seconds
            "memory_usage": 100 * 1024 * 1024,  # 100MB
            "response_time": 1.0,  # seconds
            "error_rate": 0.1  # 10%
        }
    
    def _initialize_pattern_detectors(self) -> Dict[str, Any]:
        """Initialize pattern detection configuration"""
        
        return {
            "temporal_analysis": True,
            "contextual_analysis": True,
            "message_similarity": True,
            "severity_tracking": True
        }
    
    def _generate_error_id(self) -> str:
        """Generate unique error ID"""
        
        timestamp = datetime.now().isoformat()
        return hashlib.md5(timestamp.encode()).hexdigest()[:12]
    
    def _classify_exception(self, exception: Exception) -> ErrorType:
        """Classify exception type"""
        
        exception_mapping = {
            SyntaxError: ErrorType.SYNTAX_ERROR,
            TypeError: ErrorType.LOGIC_ERROR,
            ValueError: ErrorType.LOGIC_ERROR,
            AttributeError: ErrorType.LOGIC_ERROR,
            KeyError: ErrorType.LOGIC_ERROR,
            IndexError: ErrorType.LOGIC_ERROR,
            TimeoutError: ErrorType.TIMEOUT_ERROR,
            MemoryError: ErrorType.MEMORY_ERROR,
            ConnectionError: ErrorType.API_ERROR,
            PermissionError: ErrorType.API_ERROR,
        }
        
        return exception_mapping.get(type(exception), ErrorType.RUNTIME_ERROR)
    
    def _determine_error_severity(self, exception: Exception, context: Dict) -> ErrorSeverity:
        """Determine error severity based on exception and context"""
        
        # Critical errors
        if isinstance(exception, (MemoryError, SystemError)):
            return ErrorSeverity.CRITICAL
        
        # High severity errors
        if isinstance(exception, (SyntaxError, TimeoutError)):
            return ErrorSeverity.HIGH
        
        # Medium severity errors
        if isinstance(exception, (TypeError, ValueError, AttributeError)):
            return ErrorSeverity.MEDIUM
        
        # Default to low severity
        return ErrorSeverity.LOW
    
    def _suggest_python_syntax_fix(self, syntax_error: SyntaxError, code: str) -> str:
        """Suggest fix for Python syntax error"""
        
        error_msg = str(syntax_error)
        
        if "invalid syntax" in error_msg.lower():
            return "Check for missing colons, parentheses, or indentation issues"
        elif "unexpected indent" in error_msg.lower():
            return "Check indentation consistency"
        elif "unmatched" in error_msg.lower():
            return "Check for unmatched parentheses, brackets, or quotes"
        else:
            return "Review code syntax and structure"
    
    def _suggest_runtime_fix(self, exception: Exception) -> str:
        """Suggest fix for runtime error"""
        
        if isinstance(exception, TypeError):
            return "Check variable types and function arguments"
        elif isinstance(exception, ValueError):
            return "Validate input values and ranges"
        elif isinstance(exception, KeyError):
            return "Check dictionary keys and data structure"
        elif isinstance(exception, AttributeError):
            return "Verify object attributes and method names"
        elif isinstance(exception, IndexError):
            return "Check list/array bounds and indices"
        else:
            return "Review error context and add appropriate error handling"
    
    async def _store_errors_in_history(self, errors: List[DetectedError], context: Dict):
        """Store errors in history for pattern analysis"""
        
        with self._lock:
            self.error_history.extend(errors)
            
            # Limit history size
            max_history = self.config.get("max_error_history", 10000)
            if len(self.error_history) > max_history:
                self.error_history = self.error_history[-max_history:]
    
    async def _update_performance_baselines(self, recent_errors: List[DetectedError]):
        """Update performance baselines based on recent errors"""
        
        # Calculate error rates by type
        type_counts = {}
        for error in recent_errors:
            error_type = error.error_type.value
            type_counts[error_type] = type_counts.get(error_type, 0) + 1
        
        # Update baselines
        total_errors = len(recent_errors)
        for error_type, count in type_counts.items():
            self.performance_baselines[f"{error_type}_rate"] = count / total_errors


class ErrorAnalyzer:
    """
    Specialized analyzer for deep error analysis and pattern recognition
    """
    
    def __init__(self):
        self.analysis_cache = {}
        self.pattern_models = {}
    
    async def analyze_error_cluster(self, errors: List[DetectedError]) -> Dict[str, Any]:
        """Analyze a cluster of related errors"""
        
        if not errors:
            return {"cluster_size": 0, "analysis": "no_errors"}
        
        analysis = {
            "cluster_size": len(errors),
            "error_types": self._analyze_error_types(errors),
            "severity_distribution": self._analyze_severity_distribution(errors),
            "temporal_distribution": self._analyze_temporal_distribution(errors),
            "root_cause_candidates": await self._identify_root_cause_candidates(errors),
            "correlation_analysis": await self._analyze_error_correlations(errors)
        }
        
        return analysis
    
    def _analyze_error_types(self, errors: List[DetectedError]) -> Dict[str, Any]:
        """Analyze distribution of error types"""
        
        type_counts = {}
        for error in errors:
            error_type = error.error_type.value
            type_counts[error_type] = type_counts.get(error_type, 0) + 1
        
        total = len(errors)
        type_percentages = {
            error_type: (count / total) * 100 
            for error_type, count in type_counts.items()
        }
        
        return {
            "counts": type_counts,
            "percentages": type_percentages,
            "dominant_type": max(type_counts, key=type_counts.get) if type_counts else None
        }
    
    def _analyze_severity_distribution(self, errors: List[DetectedError]) -> Dict[str, Any]:
        """Analyze distribution of error severities"""
        
        severity_counts = {}
        for error in errors:
            severity = error.severity.value
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        return {
            "counts": severity_counts,
            "critical_count": severity_counts.get("critical", 0),
            "high_count": severity_counts.get("high", 0),
            "needs_immediate_attention": severity_counts.get("critical", 0) > 0
        }
    
    def _analyze_temporal_distribution(self, errors: List[DetectedError]) -> Dict[str, Any]:
        """Analyze temporal distribution of errors"""
        
        if not errors:
            return {"timespan": 0, "pattern": "none"}
        
        timestamps = [error.timestamp for error in errors]
        timestamps.sort()
        
        timespan = (timestamps[-1] - timestamps[0]).total_seconds()
        
        # Analyze distribution pattern
        if len(timestamps) < 2:
            pattern = "single"
        elif timespan < 60:  # Less than 1 minute
            pattern = "burst"
        elif timespan < 3600:  # Less than 1 hour
            pattern = "cluster"
        else:
            pattern = "distributed"
        
        return {
            "timespan_seconds": timespan,
            "pattern": pattern,
            "start_time": timestamps[0].isoformat(),
            "end_time": timestamps[-1].isoformat()
        }
    
    async def _identify_root_cause_candidates(self, errors: List[DetectedError]) -> List[Dict[str, Any]]:
        """Identify potential root causes for error cluster"""
        
        candidates = []
        
        # Analyze common contexts
        contexts = [error.context for error in errors]
        common_modules = self._find_common_values(contexts, "module")
        common_functions = self._find_common_values(contexts, "function")
        
        if common_modules:
            candidates.append({
                "type": "module_issue",
                "description": f"Common module: {common_modules[0]}",
                "confidence": 0.8,
                "affected_errors": len([e for e in errors if e.context.get("module") == common_modules[0]])
            })
        
        if common_functions:
            candidates.append({
                "type": "function_issue",
                "description": f"Common function: {common_functions[0]}",
                "confidence": 0.9,
                "affected_errors": len([e for e in errors if e.context.get("function") == common_functions[0]])
            })
        
        # Analyze common error messages
        messages = [error.message for error in errors]
        common_patterns = self._find_message_patterns(messages)
        
        for pattern, count in common_patterns.items():
            if count > 1:
                candidates.append({
                    "type": "recurring_issue",
                    "description": f"Recurring pattern: {pattern}",
                    "confidence": min(count / len(errors), 1.0),
                    "affected_errors": count
                })
        
        return candidates
    
    async def _analyze_error_correlations(self, errors: List[DetectedError]) -> Dict[str, Any]:
        """Analyze correlations between errors"""
        
        correlations = {
            "type_correlations": {},
            "timing_correlations": {},
            "context_correlations": {}
        }
        
        # Analyze type correlations
        error_types = [error.error_type.value for error in errors]
        type_pairs = {}
        
        for i, type1 in enumerate(error_types):
            for type2 in error_types[i+1:]:
                pair = tuple(sorted([type1, type2]))
                type_pairs[pair] = type_pairs.get(pair, 0) + 1
        
        correlations["type_correlations"] = type_pairs
        
        return correlations
    
    def _find_common_values(self, contexts: List[Dict], key: str) -> List[str]:
        """Find common values for a key across contexts"""
        
        values = [ctx.get(key) for ctx in contexts if ctx.get(key)]
        
        if not values:
            return []
        
        # Count occurrences
        value_counts = {}
        for value in values:
            value_counts[value] = value_counts.get(value, 0) + 1
        
        # Return sorted by frequency
        return sorted(value_counts.keys(), key=lambda x: value_counts[x], reverse=True)
    
    def _find_message_patterns(self, messages: List[str]) -> Dict[str, int]:
        """Find patterns in error messages"""
        
        patterns = {}
        
        for message in messages:
            # Extract common words (simple pattern detection)
            words = message.lower().split()
            
            # Look for 3-word patterns
            for i in range(len(words) - 2):
                pattern = ' '.join(words[i:i+3])
                patterns[pattern] = patterns.get(pattern, 0) + 1
        
        # Filter patterns that appear multiple times
        return {pattern: count for pattern, count in patterns.items() if count > 1}
