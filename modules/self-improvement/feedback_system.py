"""
Feedback Collection System

Collects and processes feedback from various sources:
- Execution results and performance metrics
- User feedback and ratings
- System monitoring and health checks
- External validation and testing results
- Automated quality assessments
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime, timedelta
import hashlib
import threading
from pathlib import Path

class FeedbackType(Enum):
    """Types of feedback that can be collected"""
    EXECUTION_RESULT = "execution_result"
    USER_RATING = "user_rating"
    PERFORMANCE_METRIC = "performance_metric"
    QUALITY_ASSESSMENT = "quality_assessment"
    ERROR_REPORT = "error_report"
    SYSTEM_HEALTH = "system_health"
    EXTERNAL_VALIDATION = "external_validation"

class FeedbackSource(Enum):
    """Sources of feedback"""
    USER = "user"
    SYSTEM = "system"
    AUTOMATED_TEST = "automated_test"
    EXTERNAL_API = "external_api"
    MONITORING = "monitoring"
    SELF_ASSESSMENT = "self_assessment"

@dataclass
class FeedbackEntry:
    """Represents a single feedback entry"""
    feedback_id: str
    feedback_type: FeedbackType
    source: FeedbackSource
    timestamp: datetime
    context: Dict[str, Any]
    data: Dict[str, Any]
    rating: Optional[float] = None
    confidence: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class FeedbackCollector:
    """
    Comprehensive feedback collection system that gathers:
    - Real-time execution feedback and performance metrics
    - User ratings and qualitative assessments
    - Automated quality and correctness evaluations
    - System health and operational metrics
    - External validation results from APIs and services
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.feedback_history = []
        self.feedback_processors = {}
        self.collection_active = False
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Initialize feedback processors
        self._initialize_feedback_processors()
        
        # Validation rules
        self.validation_rules = self._initialize_validation_rules()
        
        # Quality metrics
        self.quality_metrics = {}
        
        # Setup logging
        self.logger = self._setup_logging()
    
    async def collect_execution_feedback(self, context: Dict[str, Any], execution_result: Any) -> Optional[FeedbackEntry]:
        """
        Collect feedback from code/content execution
        
        Args:
            context: Execution context (module, function, parameters, etc.)
            execution_result: Result of the execution
            
        Returns:
            FeedbackEntry if feedback was successfully collected
        """
        
        try:
            feedback_data = {
                "execution_context": context,
                "result_type": type(execution_result).__name__ if execution_result is not None else "None",
                "success": execution_result is not None and not isinstance(execution_result, Exception),
                "execution_time": context.get("execution_time", 0),
                "memory_usage": context.get("memory_usage", 0)
            }
            
            # Assess execution quality
            quality_score = await self._assess_execution_quality(execution_result, context)
            feedback_data["quality_score"] = quality_score
            
            # Check for specific result patterns
            if execution_result is not None:
                feedback_data.update(await self._analyze_execution_result(execution_result, context))
            
            feedback_entry = FeedbackEntry(
                feedback_id=self._generate_feedback_id(),
                feedback_type=FeedbackType.EXECUTION_RESULT,
                source=FeedbackSource.SYSTEM,
                timestamp=datetime.now(),
                context=context,
                data=feedback_data,
                rating=quality_score,
                confidence=0.8,  # High confidence for system-generated feedback
                metadata={"auto_generated": True}
            )
            
            await self._store_feedback(feedback_entry)
            return feedback_entry
            
        except Exception as e:
            self.logger.error(f"Error collecting execution feedback: {str(e)}")
            return None
    
    async def collect_user_feedback(self, user_feedback: Dict[str, Any]) -> Optional[FeedbackEntry]:
        """
        Collect feedback from users
        
        Args:
            user_feedback: User feedback data including ratings, comments, etc.
            
        Returns:
            FeedbackEntry if feedback was successfully collected
        """
        
        try:
            # Validate user feedback
            validation_result = await self._validate_user_feedback(user_feedback)
            if not validation_result["valid"]:
                self.logger.warning(f"Invalid user feedback: {validation_result['reason']}")
                return None
            
            feedback_entry = FeedbackEntry(
                feedback_id=self._generate_feedback_id(),
                feedback_type=FeedbackType.USER_RATING,
                source=FeedbackSource.USER,
                timestamp=datetime.now(),
                context=user_feedback.get("context", {}),
                data=user_feedback,
                rating=user_feedback.get("rating"),
                confidence=0.9,  # High confidence for direct user feedback
                metadata={"validated": True}
            )
            
            await self._store_feedback(feedback_entry)
            return feedback_entry
            
        except Exception as e:
            self.logger.error(f"Error collecting user feedback: {str(e)}")
            return None
    
    async def collect_performance_feedback(self, metrics: Dict[str, Any], context: Dict[str, Any]) -> Optional[FeedbackEntry]:
        """
        Collect performance-related feedback
        
        Args:
            metrics: Performance metrics (response time, throughput, etc.)
            context: Context for the performance measurement
            
        Returns:
            FeedbackEntry if feedback was successfully collected
        """
        
        try:
            # Calculate performance score
            performance_score = await self._calculate_performance_score(metrics)
            
            feedback_data = {
                "metrics": metrics,
                "performance_score": performance_score,
                "baseline_comparison": await self._compare_to_baseline(metrics),
                "trends": await self._analyze_performance_trends(metrics, context)
            }
            
            feedback_entry = FeedbackEntry(
                feedback_id=self._generate_feedback_id(),
                feedback_type=FeedbackType.PERFORMANCE_METRIC,
                source=FeedbackSource.MONITORING,
                timestamp=datetime.now(),
                context=context,
                data=feedback_data,
                rating=performance_score,
                confidence=0.85,
                metadata={"metric_count": len(metrics)}
            )
            
            await self._store_feedback(feedback_entry)
            return feedback_entry
            
        except Exception as e:
            self.logger.error(f"Error collecting performance feedback: {str(e)}")
            return None
    
    async def collect_quality_assessment(self, assessment_data: Dict[str, Any], context: Dict[str, Any]) -> Optional[FeedbackEntry]:
        """
        Collect quality assessment feedback
        
        Args:
            assessment_data: Quality assessment results
            context: Context for the assessment
            
        Returns:
            FeedbackEntry if feedback was successfully collected
        """
        
        try:
            # Process quality assessment
            quality_metrics = await self._process_quality_assessment(assessment_data)
            
            feedback_data = {
                "assessment": assessment_data,
                "quality_metrics": quality_metrics,
                "overall_quality": quality_metrics.get("overall_score", 0.5),
                "dimensions": quality_metrics.get("dimensions", {})
            }
            
            feedback_entry = FeedbackEntry(
                feedback_id=self._generate_feedback_id(),
                feedback_type=FeedbackType.QUALITY_ASSESSMENT,
                source=FeedbackSource.AUTOMATED_TEST,
                timestamp=datetime.now(),
                context=context,
                data=feedback_data,
                rating=quality_metrics.get("overall_score", 0.5),
                confidence=0.7,
                metadata={"assessment_type": assessment_data.get("type", "general")}
            )
            
            await self._store_feedback(feedback_entry)
            return feedback_entry
            
        except Exception as e:
            self.logger.error(f"Error collecting quality assessment: {str(e)}")
            return None
    
    async def collect_external_validation(self, validation_result: Dict[str, Any], context: Dict[str, Any]) -> Optional[FeedbackEntry]:
        """
        Collect feedback from external validation services
        
        Args:
            validation_result: Results from external validation
            context: Context for the validation
            
        Returns:
            FeedbackEntry if feedback was successfully collected
        """
        
        try:
            feedback_data = {
                "validation_result": validation_result,
                "external_score": validation_result.get("score", 0.5),
                "validation_type": validation_result.get("type", "unknown"),
                "external_service": validation_result.get("service", "unknown")
            }
            
            feedback_entry = FeedbackEntry(
                feedback_id=self._generate_feedback_id(),
                feedback_type=FeedbackType.EXTERNAL_VALIDATION,
                source=FeedbackSource.EXTERNAL_API,
                timestamp=datetime.now(),
                context=context,
                data=feedback_data,
                rating=validation_result.get("score", 0.5),
                confidence=validation_result.get("confidence", 0.6),
                metadata={"external_service": validation_result.get("service")}
            )
            
            await self._store_feedback(feedback_entry)
            return feedback_entry
            
        except Exception as e:
            self.logger.error(f"Error collecting external validation: {str(e)}")
            return None
    
    async def validate_feedback(self, feedback_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Validate feedback data before processing
        
        Args:
            feedback_data: Raw feedback data to validate
            
        Returns:
            Validated feedback data or None if invalid
        """
        
        try:
            # Check required fields
            required_fields = ["type", "source", "data"]
            for field in required_fields:
                if field not in feedback_data:
                    return None
            
            # Validate feedback type
            feedback_type = feedback_data.get("type")
            if feedback_type not in [ft.value for ft in FeedbackType]:
                return None
            
            # Validate source
            source = feedback_data.get("source")
            if source not in [fs.value for fs in FeedbackSource]:
                return None
            
            # Apply type-specific validation
            validation_result = await self._apply_type_specific_validation(feedback_data)
            
            if validation_result["valid"]:
                return {
                    "id": self._generate_feedback_id(),
                    "timestamp": datetime.now().isoformat(),
                    "validated": True,
                    **feedback_data
                }
            else:
                return None
                
        except Exception as e:
            self.logger.error(f"Error validating feedback: {str(e)}")
            return None
    
    async def process_feedback_batch(self, feedback_batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process a batch of feedback entries
        
        Args:
            feedback_batch: List of feedback entries to process
            
        Returns:
            Processing results with statistics and insights
        """
        
        results = {
            "total_feedback": len(feedback_batch),
            "processed_successfully": 0,
            "validation_failures": 0,
            "processing_errors": 0,
            "insights": {},
            "recommendations": []
        }
        
        processed_feedback = []
        
        for feedback_data in feedback_batch:
            try:
                # Validate feedback
                validated_feedback = await self.validate_feedback(feedback_data)
                
                if validated_feedback:
                    # Create feedback entry
                    feedback_entry = FeedbackEntry(
                        feedback_id=validated_feedback["id"],
                        feedback_type=FeedbackType(validated_feedback["type"]),
                        source=FeedbackSource(validated_feedback["source"]),
                        timestamp=datetime.fromisoformat(validated_feedback["timestamp"]),
                        context=validated_feedback.get("context", {}),
                        data=validated_feedback["data"],
                        rating=validated_feedback.get("rating"),
                        confidence=validated_feedback.get("confidence"),
                        metadata=validated_feedback.get("metadata", {})
                    )
                    
                    await self._store_feedback(feedback_entry)
                    processed_feedback.append(feedback_entry)
                    results["processed_successfully"] += 1
                else:
                    results["validation_failures"] += 1
                    
            except Exception as e:
                self.logger.error(f"Error processing feedback item: {str(e)}")
                results["processing_errors"] += 1
        
        # Generate insights from batch
        if processed_feedback:
            batch_insights = await self._generate_batch_insights(processed_feedback)
            results["insights"] = batch_insights
            
            # Generate recommendations
            batch_recommendations = await self._generate_batch_recommendations(processed_feedback)
            results["recommendations"] = batch_recommendations
        
        return results
    
    async def get_feedback_summary(self, time_range: Optional[Tuple[datetime, datetime]] = None) -> Dict[str, Any]:
        """
        Get summary of collected feedback
        
        Args:
            time_range: Optional time range to filter feedback
            
        Returns:
            Summary statistics and insights
        """
        
        # Filter feedback by time range if provided
        if time_range:
            start_time, end_time = time_range
            relevant_feedback = [
                fb for fb in self.feedback_history
                if start_time <= fb.timestamp <= end_time
            ]
        else:
            relevant_feedback = self.feedback_history
        
        if not relevant_feedback:
            return {"total_feedback": 0, "summary": "no_feedback"}
        
        summary = {
            "total_feedback": len(relevant_feedback),
            "time_range": {
                "start": min(fb.timestamp for fb in relevant_feedback).isoformat(),
                "end": max(fb.timestamp for fb in relevant_feedback).isoformat()
            },
            "feedback_types": self._analyze_feedback_types(relevant_feedback),
            "feedback_sources": self._analyze_feedback_sources(relevant_feedback),
            "rating_statistics": self._analyze_ratings(relevant_feedback),
            "trends": await self._analyze_feedback_trends(relevant_feedback),
            "quality_insights": await self._analyze_quality_patterns(relevant_feedback),
            "recommendations": await self._generate_summary_recommendations(relevant_feedback)
        }
        
        return summary
    
    async def start_collection(self):
        """Start the feedback collection system"""
        
        self.collection_active = True
        
        # Start background collection tasks
        asyncio.create_task(self._monitor_system_feedback())
        asyncio.create_task(self._cleanup_old_feedback())
        asyncio.create_task(self._process_feedback_queue())
        
        self.logger.info("Feedback collection system started")
    
    async def stop_collection(self):
        """Stop the feedback collection system"""
        
        self.collection_active = False
        self.logger.info("Feedback collection system stopped")
    
    # Private methods for feedback processing
    async def _assess_execution_quality(self, execution_result: Any, context: Dict) -> float:
        """Assess the quality of an execution result"""
        
        if isinstance(execution_result, Exception):
            return 0.0
        
        if execution_result is None and context.get("expects_output", True):
            return 0.2
        
        # Basic quality assessment
        quality_score = 0.5  # Base score
        
        # Increase score for successful execution
        if execution_result is not None:
            quality_score += 0.3
        
        # Check result completeness
        if isinstance(execution_result, (dict, list)) and len(execution_result) > 0:
            quality_score += 0.2
        
        # Check execution efficiency
        execution_time = context.get("execution_time", 0)
        if execution_time < 1.0:  # Fast execution
            quality_score += 0.1
        
        return min(quality_score, 1.0)
    
    async def _analyze_execution_result(self, execution_result: Any, context: Dict) -> Dict[str, Any]:
        """Analyze execution result for patterns and insights"""
        
        analysis = {
            "result_type": type(execution_result).__name__,
            "result_size": self._calculate_result_size(execution_result),
            "structure_analysis": await self._analyze_result_structure(execution_result),
            "content_quality": await self._assess_content_quality(execution_result, context)
        }
        
        return analysis
    
    def _calculate_result_size(self, result: Any) -> int:
        """Calculate the size of a result"""
        
        if isinstance(result, (str, bytes)):
            return len(result)
        elif isinstance(result, (list, tuple)):
            return len(result)
        elif isinstance(result, dict):
            return len(result)
        else:
            return 1  # Single object
    
    async def _analyze_result_structure(self, result: Any) -> Dict[str, Any]:
        """Analyze the structure of a result"""
        
        structure = {
            "type": type(result).__name__,
            "complexity": "simple"
        }
        
        if isinstance(result, dict):
            structure.update({
                "key_count": len(result),
                "nested_levels": self._count_nested_levels(result),
                "complexity": "complex" if len(result) > 10 else "moderate"
            })
        elif isinstance(result, list):
            structure.update({
                "item_count": len(result),
                "item_types": list(set(type(item).__name__ for item in result[:10])),
                "complexity": "complex" if len(result) > 100 else "moderate"
            })
        
        return structure
    
    def _count_nested_levels(self, obj: Any, current_level: int = 0) -> int:
        """Count nested levels in a data structure"""
        
        if current_level > 10:  # Prevent infinite recursion
            return current_level
        
        max_level = current_level
        
        if isinstance(obj, dict):
            for value in obj.values():
                level = self._count_nested_levels(value, current_level + 1)
                max_level = max(max_level, level)
        elif isinstance(obj, list):
            for item in obj[:5]:  # Check first 5 items to avoid performance issues
                level = self._count_nested_levels(item, current_level + 1)
                max_level = max(max_level, level)
        
        return max_level
    
    async def _assess_content_quality(self, result: Any, context: Dict) -> Dict[str, Any]:
        """Assess the quality of content in a result"""
        
        quality = {
            "completeness": 0.5,
            "relevance": 0.5,
            "accuracy": 0.5,
            "usefulness": 0.5
        }
        
        # Check completeness
        if isinstance(result, (dict, list)) and len(result) > 0:
            quality["completeness"] = 0.8
        elif isinstance(result, str) and len(result) > 10:
            quality["completeness"] = 0.7
        
        # Check relevance based on context
        if context.get("domain") and isinstance(result, str):
            domain_keywords = context.get("domain_keywords", [])
            if any(keyword.lower() in result.lower() for keyword in domain_keywords):
                quality["relevance"] = 0.8
        
        return quality
    
    async def _validate_user_feedback(self, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """Validate user feedback data"""
        
        validation = {"valid": True, "reason": None}
        
        # Check required fields
        required_fields = ["rating", "context"]
        for field in required_fields:
            if field not in feedback:
                validation = {"valid": False, "reason": f"Missing required field: {field}"}
                return validation
        
        # Validate rating range
        rating = feedback.get("rating")
        if not isinstance(rating, (int, float)) or not (0 <= rating <= 5):
            validation = {"valid": False, "reason": "Rating must be between 0 and 5"}
            return validation
        
        # Validate context
        context = feedback.get("context", {})
        if not isinstance(context, dict):
            validation = {"valid": False, "reason": "Context must be a dictionary"}
            return validation
        
        return validation
    
    async def _calculate_performance_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate performance score from metrics"""
        
        score = 0.5  # Base score
        
        # Response time component
        response_time = metrics.get("response_time", 1.0)
        if response_time < 0.5:
            score += 0.2
        elif response_time < 1.0:
            score += 0.1
        elif response_time > 3.0:
            score -= 0.2
        
        # Throughput component
        throughput = metrics.get("throughput", 1.0)
        if throughput > 10.0:
            score += 0.2
        elif throughput > 5.0:
            score += 0.1
        
        # Error rate component
        error_rate = metrics.get("error_rate", 0.0)
        if error_rate == 0.0:
            score += 0.2
        elif error_rate < 0.05:
            score += 0.1
        elif error_rate > 0.1:
            score -= 0.3
        
        # Memory usage component
        memory_usage = metrics.get("memory_usage_percent", 50.0)
        if memory_usage < 30.0:
            score += 0.1
        elif memory_usage > 80.0:
            score -= 0.2
        
        return max(min(score, 1.0), 0.0)
    
    async def _compare_to_baseline(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Compare metrics to baseline performance"""
        
        # This would typically compare to stored baseline metrics
        # For now, we'll use default baselines
        baselines = {
            "response_time": 1.0,
            "throughput": 5.0,
            "error_rate": 0.05,
            "memory_usage_percent": 50.0
        }
        
        comparison = {}
        for metric, value in metrics.items():
            if metric in baselines:
                baseline = baselines[metric]
                if metric == "error_rate":
                    # Lower is better for error rate
                    improvement = (baseline - value) / baseline if baseline > 0 else 0
                else:
                    # Higher is better for most other metrics
                    improvement = (value - baseline) / baseline if baseline > 0 else 0
                
                comparison[metric] = {
                    "current": value,
                    "baseline": baseline,
                    "improvement": improvement,
                    "status": "improved" if improvement > 0.1 else "degraded" if improvement < -0.1 else "stable"
                }
        
        return comparison
    
    async def _analyze_performance_trends(self, metrics: Dict[str, Any], context: Dict) -> Dict[str, Any]:
        """Analyze performance trends"""
        
        # This would typically analyze historical data
        # For now, we'll provide a basic trend analysis
        trends = {
            "trend_direction": "stable",
            "confidence": 0.5,
            "indicators": []
        }
        
        # Check for obvious performance indicators
        response_time = metrics.get("response_time", 1.0)
        if response_time > 2.0:
            trends["indicators"].append("high_response_time")
            trends["trend_direction"] = "degrading"
        
        error_rate = metrics.get("error_rate", 0.0)
        if error_rate > 0.1:
            trends["indicators"].append("high_error_rate")
            trends["trend_direction"] = "degrading"
        
        return trends
    
    async def _process_quality_assessment(self, assessment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process quality assessment data"""
        
        metrics = {
            "overall_score": 0.5,
            "dimensions": {},
            "strengths": [],
            "weaknesses": []
        }
        
        # Process different quality dimensions
        dimensions = ["accuracy", "completeness", "relevance", "clarity", "usefulness"]
        
        total_score = 0
        scored_dimensions = 0
        
        for dimension in dimensions:
            if dimension in assessment_data:
                score = assessment_data[dimension]
                metrics["dimensions"][dimension] = score
                total_score += score
                scored_dimensions += 1
                
                if score > 0.8:
                    metrics["strengths"].append(dimension)
                elif score < 0.4:
                    metrics["weaknesses"].append(dimension)
        
        if scored_dimensions > 0:
            metrics["overall_score"] = total_score / scored_dimensions
        
        return metrics
    
    async def _apply_type_specific_validation(self, feedback_data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply validation rules specific to feedback type"""
        
        feedback_type = feedback_data.get("type")
        validation = {"valid": True, "reason": None}
        
        if feedback_type == "user_rating":
            if "rating" not in feedback_data.get("data", {}):
                validation = {"valid": False, "reason": "User rating feedback must include rating"}
        
        elif feedback_type == "performance_metric":
            data = feedback_data.get("data", {})
            if not any(key in data for key in ["response_time", "throughput", "error_rate"]):
                validation = {"valid": False, "reason": "Performance feedback must include performance metrics"}
        
        elif feedback_type == "execution_result":
            if "execution_context" not in feedback_data.get("data", {}):
                validation = {"valid": False, "reason": "Execution feedback must include execution context"}
        
        return validation
    
    async def _store_feedback(self, feedback_entry: FeedbackEntry):
        """Store feedback entry in history"""
        
        with self._lock:
            self.feedback_history.append(feedback_entry)
            
            # Limit history size
            max_history = self.config.get("max_feedback_history", 50000)
            if len(self.feedback_history) > max_history:
                self.feedback_history = self.feedback_history[-max_history:]
    
    async def _generate_batch_insights(self, feedback_batch: List[FeedbackEntry]) -> Dict[str, Any]:
        """Generate insights from a batch of feedback"""
        
        insights = {
            "batch_size": len(feedback_batch),
            "average_rating": 0.0,
            "dominant_feedback_type": None,
            "quality_trends": {},
            "common_issues": []
        }
        
        # Calculate average rating
        ratings = [fb.rating for fb in feedback_batch if fb.rating is not None]
        if ratings:
            insights["average_rating"] = sum(ratings) / len(ratings)
        
        # Find dominant feedback type
        type_counts = {}
        for fb in feedback_batch:
            fb_type = fb.feedback_type.value
            type_counts[fb_type] = type_counts.get(fb_type, 0) + 1
        
        if type_counts:
            insights["dominant_feedback_type"] = max(type_counts, key=type_counts.get)
        
        # Analyze quality trends
        for fb in feedback_batch:
            if fb.feedback_type == FeedbackType.QUALITY_ASSESSMENT:
                quality_data = fb.data.get("quality_metrics", {})
                for dimension, score in quality_data.get("dimensions", {}).items():
                    if dimension not in insights["quality_trends"]:
                        insights["quality_trends"][dimension] = []
                    insights["quality_trends"][dimension].append(score)
        
        return insights
    
    async def _generate_batch_recommendations(self, feedback_batch: List[FeedbackEntry]) -> List[Dict[str, Any]]:
        """Generate recommendations from a batch of feedback"""
        
        recommendations = []
        
        # Analyze ratings
        low_ratings = [fb for fb in feedback_batch if fb.rating is not None and fb.rating < 0.5]
        if len(low_ratings) > len(feedback_batch) * 0.3:  # More than 30% low ratings
            recommendations.append({
                "type": "quality_improvement",
                "priority": "high",
                "description": "High percentage of low ratings detected",
                "affected_feedback": len(low_ratings)
            })
        
        # Analyze feedback types
        type_counts = {}
        for fb in feedback_batch:
            fb_type = fb.feedback_type.value
            type_counts[fb_type] = type_counts.get(fb_type, 0) + 1
        
        # Check for high error rates
        error_feedback = type_counts.get("error_report", 0)
        if error_feedback > len(feedback_batch) * 0.2:  # More than 20% error reports
            recommendations.append({
                "type": "error_reduction",
                "priority": "high",
                "description": "High error rate detected in feedback",
                "error_count": error_feedback
            })
        
        return recommendations
    
    def _analyze_feedback_types(self, feedback_list: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze distribution of feedback types"""
        
        type_counts = {}
        for feedback in feedback_list:
            fb_type = feedback.feedback_type.value
            type_counts[fb_type] = type_counts.get(fb_type, 0) + 1
        
        total = len(feedback_list)
        type_percentages = {
            fb_type: (count / total) * 100 
            for fb_type, count in type_counts.items()
        }
        
        return {
            "counts": type_counts,
            "percentages": type_percentages,
            "most_common": max(type_counts, key=type_counts.get) if type_counts else None
        }
    
    def _analyze_feedback_sources(self, feedback_list: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze distribution of feedback sources"""
        
        source_counts = {}
        for feedback in feedback_list:
            source = feedback.source.value
            source_counts[source] = source_counts.get(source, 0) + 1
        
        total = len(feedback_list)
        source_percentages = {
            source: (count / total) * 100 
            for source, count in source_counts.items()
        }
        
        return {
            "counts": source_counts,
            "percentages": source_percentages,
            "most_common": max(source_counts, key=source_counts.get) if source_counts else None
        }
    
    def _analyze_ratings(self, feedback_list: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze rating statistics"""
        
        ratings = [fb.rating for fb in feedback_list if fb.rating is not None]
        
        if not ratings:
            return {"no_ratings": True}
        
        return {
            "count": len(ratings),
            "average": sum(ratings) / len(ratings),
            "minimum": min(ratings),
            "maximum": max(ratings),
            "low_ratings": len([r for r in ratings if r < 0.4]),
            "high_ratings": len([r for r in ratings if r > 0.8])
        }
    
    async def _analyze_feedback_trends(self, feedback_list: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze trends in feedback data"""
        
        if len(feedback_list) < 2:
            return {"insufficient_data": True}
        
        # Sort by timestamp
        sorted_feedback = sorted(feedback_list, key=lambda x: x.timestamp)
        
        # Analyze rating trends
        ratings_over_time = []
        for fb in sorted_feedback:
            if fb.rating is not None:
                ratings_over_time.append({
                    "timestamp": fb.timestamp.isoformat(),
                    "rating": fb.rating
                })
        
        # Calculate trend direction
        if len(ratings_over_time) >= 2:
            recent_ratings = [r["rating"] for r in ratings_over_time[-10:]]  # Last 10 ratings
            early_ratings = [r["rating"] for r in ratings_over_time[:10]]    # First 10 ratings
            
            recent_avg = sum(recent_ratings) / len(recent_ratings)
            early_avg = sum(early_ratings) / len(early_ratings)
            
            trend = "improving" if recent_avg > early_avg + 0.1 else "declining" if recent_avg < early_avg - 0.1 else "stable"
        else:
            trend = "insufficient_data"
        
        return {
            "trend_direction": trend,
            "ratings_over_time": ratings_over_time,
            "feedback_frequency": len(feedback_list) / max((sorted_feedback[-1].timestamp - sorted_feedback[0].timestamp).total_seconds() / 3600, 1)  # Per hour
        }
    
    async def _analyze_quality_patterns(self, feedback_list: List[FeedbackEntry]) -> Dict[str, Any]:
        """Analyze quality patterns in feedback"""
        
        quality_feedback = [
            fb for fb in feedback_list 
            if fb.feedback_type in [FeedbackType.QUALITY_ASSESSMENT, FeedbackType.EXECUTION_RESULT]
        ]
        
        if not quality_feedback:
            return {"no_quality_data": True}
        
        patterns = {
            "quality_dimensions": {},
            "common_strengths": [],
            "common_weaknesses": [],
            "quality_correlation": {}
        }
        
        # Analyze quality dimensions
        dimension_scores = {}
        for fb in quality_feedback:
            quality_data = fb.data.get("quality_metrics", {})
            for dimension, score in quality_data.get("dimensions", {}).items():
                if dimension not in dimension_scores:
                    dimension_scores[dimension] = []
                dimension_scores[dimension].append(score)
        
        # Calculate dimension averages
        for dimension, scores in dimension_scores.items():
            avg_score = sum(scores) / len(scores)
            patterns["quality_dimensions"][dimension] = {
                "average_score": avg_score,
                "sample_count": len(scores),
                "trend": "strength" if avg_score > 0.7 else "weakness" if avg_score < 0.4 else "neutral"
            }
            
            if avg_score > 0.7:
                patterns["common_strengths"].append(dimension)
            elif avg_score < 0.4:
                patterns["common_weaknesses"].append(dimension)
        
        return patterns
    
    async def _generate_summary_recommendations(self, feedback_list: List[FeedbackEntry]) -> List[Dict[str, Any]]:
        """Generate recommendations from feedback summary"""
        
        recommendations = []
        
        # Analyze overall ratings
        ratings = [fb.rating for fb in feedback_list if fb.rating is not None]
        if ratings:
            avg_rating = sum(ratings) / len(ratings)
            if avg_rating < 0.5:
                recommendations.append({
                    "type": "overall_improvement",
                    "priority": "critical",
                    "description": f"Average rating is low ({avg_rating:.2f})",
                    "suggested_actions": ["Review quality processes", "Increase testing", "Collect more user feedback"]
                })
        
        # Analyze feedback frequency
        if feedback_list:
            time_span = (max(fb.timestamp for fb in feedback_list) - min(fb.timestamp for fb in feedback_list)).total_seconds()
            feedback_rate = len(feedback_list) / max(time_span / 3600, 1)  # Per hour
            
            if feedback_rate < 0.1:  # Less than 1 feedback per 10 hours
                recommendations.append({
                    "type": "feedback_collection",
                    "priority": "medium",
                    "description": "Low feedback collection rate",
                    "suggested_actions": ["Implement more feedback collection points", "Encourage user feedback", "Add automated assessments"]
                })
        
        # Analyze error patterns
        error_feedback = [fb for fb in feedback_list if fb.feedback_type == FeedbackType.ERROR_REPORT]
        if len(error_feedback) > len(feedback_list) * 0.3:
            recommendations.append({
                "type": "error_reduction",
                "priority": "high",
                "description": "High proportion of error feedback",
                "suggested_actions": ["Improve error handling", "Add validation", "Enhance testing coverage"]
            })
        
        return recommendations
    
    # Background monitoring tasks
    async def _monitor_system_feedback(self):
        """Monitor system-level feedback continuously"""
        
        while self.collection_active:
            try:
                # Collect system health metrics
                system_metrics = await self._collect_system_health_metrics()
                
                if system_metrics:
                    await self.collect_performance_feedback(system_metrics, {"source": "system_monitor"})
                
                # Sleep for monitoring interval
                await asyncio.sleep(300)  # 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in system feedback monitoring: {e}")
                await asyncio.sleep(60)  # Shorter sleep on error
    
    async def _collect_system_health_metrics(self) -> Optional[Dict[str, Any]]:
        """Collect system health metrics"""
        
        # This would typically interface with system monitoring tools
        # For now, we'll return basic synthetic metrics
        import psutil
        
        try:
            return {
                "cpu_usage": psutil.cpu_percent(),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
                "response_time": 0.5,  # Synthetic
                "error_rate": 0.01,    # Synthetic
                "timestamp": datetime.now().isoformat()
            }
        except Exception:
            return None
    
    async def _cleanup_old_feedback(self):
        """Clean up old feedback entries"""
        
        while self.collection_active:
            try:
                # Keep only last 90 days of feedback
                cutoff_date = datetime.now() - timedelta(days=90)
                
                with self._lock:
                    self.feedback_history = [
                        fb for fb in self.feedback_history 
                        if fb.timestamp > cutoff_date
                    ]
                
                # Sleep for cleanup interval
                await asyncio.sleep(86400)  # 24 hours
                
            except Exception as e:
                self.logger.error(f"Error in feedback cleanup: {e}")
                await asyncio.sleep(3600)  # 1 hour on error
    
    async def _process_feedback_queue(self):
        """Process queued feedback entries"""
        
        while self.collection_active:
            try:
                # Process any queued analysis or aggregation tasks
                await self._update_quality_metrics()
                
                # Sleep for processing interval
                await asyncio.sleep(600)  # 10 minutes
                
            except Exception as e:
                self.logger.error(f"Error in feedback queue processing: {e}")
                await asyncio.sleep(300)  # 5 minutes on error
    
    async def _update_quality_metrics(self):
        """Update quality metrics based on collected feedback"""
        
        recent_cutoff = datetime.now() - timedelta(hours=24)
        recent_feedback = [
            fb for fb in self.feedback_history 
            if fb.timestamp > recent_cutoff
        ]
        
        if recent_feedback:
            # Update quality metrics
            self.quality_metrics = {
                "last_updated": datetime.now().isoformat(),
                "feedback_count": len(recent_feedback),
                "average_rating": sum(fb.rating for fb in recent_feedback if fb.rating) / len([fb for fb in recent_feedback if fb.rating]) if any(fb.rating for fb in recent_feedback) else 0,
                "quality_trends": await self._analyze_quality_patterns(recent_feedback)
            }
    
    # Helper methods
    def _initialize_feedback_processors(self) -> Dict[str, Callable]:
        """Initialize feedback processors for different types"""
        
        return {
            "execution_result": self.collect_execution_feedback,
            "user_rating": self.collect_user_feedback,
            "performance_metric": self.collect_performance_feedback,
            "quality_assessment": self.collect_quality_assessment,
            "external_validation": self.collect_external_validation
        }
    
    def _initialize_validation_rules(self) -> Dict[str, Any]:
        """Initialize validation rules for feedback"""
        
        return {
            "rating_range": (0, 5),
            "required_context_fields": ["module", "function"],
            "max_feedback_age_days": 30,
            "min_confidence": 0.1
        }
    
    def _setup_logging(self) -> logging.Logger:
        """Set up logging for the feedback collector"""
        
        logger = logging.getLogger("FeedbackCollector")
        logger.setLevel(logging.INFO)
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _generate_feedback_id(self) -> str:
        """Generate unique feedback ID"""
        
        timestamp = datetime.now().isoformat()
        return hashlib.md5(timestamp.encode()).hexdigest()[:16]


class ExecutionMonitor:
    """
    Specialized monitor for tracking execution performance and collecting feedback
    """
    
    def __init__(self, feedback_collector: FeedbackCollector):
        self.feedback_collector = feedback_collector
        self.active_executions = {}
        self.execution_history = []
    
    async def start_execution_monitoring(self, execution_id: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Start monitoring an execution"""
        
        monitoring_data = {
            "execution_id": execution_id,
            "start_time": datetime.now(),
            "context": context,
            "metrics": {
                "start_memory": self._get_memory_usage(),
                "start_time": datetime.now()
            }
        }
        
        self.active_executions[execution_id] = monitoring_data
        return monitoring_data
    
    async def end_execution_monitoring(self, execution_id: str, execution_result: Any) -> Optional[FeedbackEntry]:
        """End monitoring an execution and collect feedback"""
        
        if execution_id not in self.active_executions:
            return None
        
        monitoring_data = self.active_executions[execution_id]
        end_time = datetime.now()
        
        # Calculate metrics
        execution_time = (end_time - monitoring_data["start_time"]).total_seconds()
        memory_usage = self._get_memory_usage() - monitoring_data["metrics"]["start_memory"]
        
        # Update context with execution metrics
        context = monitoring_data["context"]
        context.update({
            "execution_time": execution_time,
            "memory_usage": memory_usage,
            "execution_id": execution_id
        })
        
        # Collect feedback
        feedback = await self.feedback_collector.collect_execution_feedback(context, execution_result)
        
        # Clean up
        del self.active_executions[execution_id]
        
        # Store in history
        execution_record = {
            **monitoring_data,
            "end_time": end_time,
            "execution_time": execution_time,
            "memory_usage": memory_usage,
            "result_type": type(execution_result).__name__,
            "success": execution_result is not None and not isinstance(execution_result, Exception)
        }
        
        self.execution_history.append(execution_record)
        
        return feedback
    
    def _get_memory_usage(self) -> int:
        """Get current memory usage"""
        
        try:
            import psutil
            import os
            process = psutil.Process(os.getpid())
            return process.memory_info().rss
        except Exception:
            return 0
    
    def get_execution_statistics(self) -> Dict[str, Any]:
        """Get execution statistics"""
        
        if not self.execution_history:
            return {"total_executions": 0}
        
        successful_executions = [e for e in self.execution_history if e["success"]]
        
        stats = {
            "total_executions": len(self.execution_history),
            "successful_executions": len(successful_executions),
            "success_rate": len(successful_executions) / len(self.execution_history),
            "average_execution_time": sum(e["execution_time"] for e in self.execution_history) / len(self.execution_history),
            "active_monitoring": len(self.active_executions)
        }
        
        return stats
