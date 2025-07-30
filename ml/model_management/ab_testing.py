"""
A/B Testing Framework for Model Deployments

Provides comprehensive A/B testing capabilities for model deployments including
traffic splitting, statistical analysis, and automated decision making.
"""

import asyncio
import json
import logging
import random
import statistics
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, asdict
import uuid

import numpy as np
import scipy.stats as stats
from sqlalchemy import create_engine, Column, String, DateTime, Float, Integer, Boolean, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from .registry import ModelRegistry, ModelMetadata

Base = declarative_base()

class TestStatus(Enum):
    """A/B test status"""
    PLANNING = "planning"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TrafficSplitStrategy(Enum):
    """Traffic splitting strategies"""
    RANDOM = "random"
    USER_HASH = "user_hash"
    GEOGRAPHICAL = "geographical"
    FEATURE_FLAG = "feature_flag"
    GRADUAL_ROLLOUT = "gradual_rollout"

class DecisionCriteria(Enum):
    """Decision criteria for test completion"""
    STATISTICAL_SIGNIFICANCE = "statistical_significance"
    MINIMUM_DURATION = "minimum_duration"
    MAXIMUM_DURATION = "maximum_duration"
    PERFORMANCE_THRESHOLD = "performance_threshold"
    MANUAL_DECISION = "manual_decision"

@dataclass
class ABTestConfig:
    """Configuration for A/B tests"""
    # Test identification
    test_id: str
    test_name: str
    description: str
    
    # Model variants
    control_model: Tuple[str, str]  # (model_id, version)
    treatment_models: List[Tuple[str, str]]  # List of (model_id, version)
    
    # Traffic configuration
    traffic_split_strategy: TrafficSplitStrategy
    traffic_allocation: Dict[str, float]  # variant_name -> allocation percentage
    
    # Test duration and criteria
    minimum_duration_hours: int = 24
    maximum_duration_hours: int = 168  # 1 week
    minimum_sample_size: int = 1000
    confidence_level: float = 0.95
    minimum_effect_size: float = 0.05
    
    # Success metrics
    primary_metric: str
    secondary_metrics: List[str]
    business_metrics: List[str]
    
    # Safety and monitoring
    performance_thresholds: Dict[str, float]
    error_rate_threshold: float = 0.05
    latency_threshold_ms: float = 500
    
    # Rollback configuration
    auto_rollback_enabled: bool = True
    rollback_conditions: List[Dict[str, Any]]
    
    # Decision criteria
    decision_criteria: List[DecisionCriteria]
    auto_decision_enabled: bool = False
    
    # Additional settings
    exclude_weekends: bool = False
    exclude_peak_hours: List[int] = None
    geographical_restrictions: List[str] = None
    user_segments: List[str] = None

@dataclass
class TestResult:
    """A/B test result data"""
    variant_name: str
    metric_name: str
    value: float
    count: int
    timestamp: datetime
    confidence_interval: Optional[Tuple[float, float]] = None

@dataclass
class TestAnalysis:
    """Statistical analysis of A/B test"""
    test_id: str
    analysis_timestamp: datetime
    
    # Statistical significance
    is_significant: bool
    p_value: float
    confidence_level: float
    
    # Effect sizes
    relative_improvement: Dict[str, float]  # variant -> improvement %
    absolute_difference: Dict[str, float]   # variant -> absolute diff
    
    # Power analysis
    statistical_power: float
    required_sample_size: int
    current_sample_size: int
    
    # Recommendations
    recommendation: str
    confidence_score: float
    decision_factors: List[str]

class ABTestORM(Base):
    """SQLAlchemy model for A/B tests"""
    __tablename__ = 'ab_tests'
    
    test_id = Column(String(100), primary_key=True)
    test_name = Column(String(200), nullable=False)
    description = Column(Text)
    status = Column(String(20), nullable=False)
    created_at = Column(DateTime, nullable=False)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_by = Column(String(100), nullable=False)
    
    # Configuration
    control_model_id = Column(String(100), nullable=False)
    control_model_version = Column(String(50), nullable=False)
    treatment_models = Column(JSON)
    traffic_split_strategy = Column(String(50))
    traffic_allocation = Column(JSON)
    
    # Test parameters
    minimum_duration_hours = Column(Integer)
    maximum_duration_hours = Column(Integer)
    minimum_sample_size = Column(Integer)
    confidence_level = Column(Float)
    
    # Metrics and thresholds
    primary_metric = Column(String(100))
    secondary_metrics = Column(JSON)
    performance_thresholds = Column(JSON)
    
    # Results
    final_results = Column(JSON)
    final_analysis = Column(JSON)
    winner_variant = Column(String(100))
    
    # Safety
    auto_rollback_enabled = Column(Boolean, default=True)
    rollback_conditions = Column(JSON)

class TestMetricsORM(Base):
    """SQLAlchemy model for test metrics"""
    __tablename__ = 'test_metrics'
    
    id = Column(String(100), primary_key=True)
    test_id = Column(String(100), nullable=False)
    variant_name = Column(String(100), nullable=False)
    metric_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    count = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    confidence_interval_lower = Column(Float)
    confidence_interval_upper = Column(Float)

class ABTestingFramework:
    """
    Comprehensive A/B testing framework for model deployments
    """
    
    def __init__(
        self,
        database_url: str = "sqlite:///ab_tests.db",
        model_registry: Optional[ModelRegistry] = None
    ):
        self.logger = logging.getLogger(__name__)
        self.model_registry = model_registry
        
        # Initialize database
        self.engine = create_engine(database_url)
        Base.metadata.create_all(self.engine)
        Session = sessionmaker(bind=self.engine)
        self.session = Session()
        
        # Active tests tracking
        self._active_tests: Dict[str, ABTestConfig] = {}
        self._test_traffic_handlers: Dict[str, Callable] = {}
    
    async def create_test(
        self,
        config: ABTestConfig,
        created_by: str
    ) -> ABTestConfig:
        """
        Create a new A/B test
        
        Args:
            config: Test configuration
            created_by: User who created the test
        
        Returns:
            ABTestConfig: Created test configuration
        """
        # Validate configuration
        self._validate_test_config(config)
        
        # Check for conflicting tests
        await self._check_conflicting_tests(config)
        
        # Validate model variants exist
        await self._validate_model_variants(config)
        
        # Store test configuration
        test_orm = ABTestORM(
            test_id=config.test_id,
            test_name=config.test_name,
            description=config.description,
            status=TestStatus.PLANNING.value,
            created_at=datetime.utcnow(),
            created_by=created_by,
            control_model_id=config.control_model[0],
            control_model_version=config.control_model[1],
            treatment_models=[{"model_id": m[0], "version": m[1]} for m in config.treatment_models],
            traffic_split_strategy=config.traffic_split_strategy.value,
            traffic_allocation=config.traffic_allocation,
            minimum_duration_hours=config.minimum_duration_hours,
            maximum_duration_hours=config.maximum_duration_hours,
            minimum_sample_size=config.minimum_sample_size,
            confidence_level=config.confidence_level,
            primary_metric=config.primary_metric,
            secondary_metrics=config.secondary_metrics,
            performance_thresholds=config.performance_thresholds,
            auto_rollback_enabled=config.auto_rollback_enabled,
            rollback_conditions=config.rollback_conditions
        )
        
        self.session.add(test_orm)
        self.session.commit()
        
        self.logger.info(f"Created A/B test {config.test_id}")
        return config
    
    async def start_test(self, test_id: str) -> bool:
        """Start an A/B test"""
        test_orm = self.session.query(ABTestORM).filter_by(test_id=test_id).first()
        if not test_orm:
            raise ValueError(f"Test {test_id} not found")
        
        if test_orm.status != TestStatus.PLANNING.value:
            raise ValueError(f"Test {test_id} is not in planning state")
        
        # Load test configuration
        config = await self._load_test_config(test_id)
        
        # Setup traffic routing
        await self._setup_traffic_routing(config)
        
        # Update status
        test_orm.status = TestStatus.RUNNING.value
        test_orm.started_at = datetime.utcnow()
        self.session.commit()
        
        # Add to active tests
        self._active_tests[test_id] = config
        
        # Start monitoring
        asyncio.create_task(self._monitor_test(test_id))
        
        self.logger.info(f"Started A/B test {test_id}")
        return True
    
    async def stop_test(
        self,
        test_id: str,
        reason: str = "Manual stop",
        force: bool = False
    ) -> bool:
        """Stop an A/B test"""
        test_orm = self.session.query(ABTestORM).filter_by(test_id=test_id).first()
        if not test_orm:
            return False
        
        if test_orm.status != TestStatus.RUNNING.value and not force:
            return False
        
        # Perform final analysis
        final_analysis = await self.analyze_test_results(test_id)
        
        # Update database
        test_orm.status = TestStatus.COMPLETED.value
        test_orm.completed_at = datetime.utcnow()
        test_orm.final_analysis = asdict(final_analysis) if final_analysis else None
        test_orm.winner_variant = final_analysis.recommendation if final_analysis else None
        self.session.commit()
        
        # Remove from active tests
        if test_id in self._active_tests:
            del self._active_tests[test_id]
        
        # Cleanup traffic routing
        await self._cleanup_traffic_routing(test_id)
        
        self.logger.info(f"Stopped A/B test {test_id}: {reason}")
        return True
    
    async def route_traffic(
        self,
        test_id: str,
        request_context: Dict[str, Any]
    ) -> str:
        """
        Route traffic to appropriate model variant
        
        Args:
            test_id: Test identifier
            request_context: Request context (user_id, features, etc.)
        
        Returns:
            str: Selected variant name
        """
        config = self._active_tests.get(test_id)
        if not config:
            # Return control variant if test not active
            return "control"
        
        # Apply traffic splitting strategy
        if config.traffic_split_strategy == TrafficSplitStrategy.RANDOM:
            return self._random_split(config.traffic_allocation)
        
        elif config.traffic_split_strategy == TrafficSplitStrategy.USER_HASH:
            return self._user_hash_split(
                request_context.get("user_id", ""),
                config.traffic_allocation
            )
        
        elif config.traffic_split_strategy == TrafficSplitStrategy.GEOGRAPHICAL:
            return self._geographical_split(
                request_context.get("location", ""),
                config.traffic_allocation
            )
        
        elif config.traffic_split_strategy == TrafficSplitStrategy.GRADUAL_ROLLOUT:
            return self._gradual_rollout_split(
                test_id,
                config.traffic_allocation,
                request_context
            )
        
        else:
            return "control"
    
    async def record_metric(
        self,
        test_id: str,
        variant_name: str,
        metric_name: str,
        value: float,
        count: int = 1,
        timestamp: Optional[datetime] = None
    ):
        """Record a metric value for a test variant"""
        timestamp = timestamp or datetime.utcnow()
        
        # Store metric
        metric_orm = TestMetricsORM(
            id=str(uuid.uuid4()),
            test_id=test_id,
            variant_name=variant_name,
            metric_name=metric_name,
            value=value,
            count=count,
            timestamp=timestamp
        )
        
        self.session.add(metric_orm)
        self.session.commit()
        
        # Check for safety violations
        await self._check_safety_violations(test_id, variant_name, metric_name, value)
    
    async def get_test_metrics(
        self,
        test_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, List[TestResult]]:
        """Get metrics for a test"""
        query = self.session.query(TestMetricsORM).filter_by(test_id=test_id)
        
        if start_time:
            query = query.filter(TestMetricsORM.timestamp >= start_time)
        if end_time:
            query = query.filter(TestMetricsORM.timestamp <= end_time)
        
        metrics = query.all()
        
        # Group by variant
        results = {}
        for metric in metrics:
            if metric.variant_name not in results:
                results[metric.variant_name] = []
            
            result = TestResult(
                variant_name=metric.variant_name,
                metric_name=metric.metric_name,
                value=metric.value,
                count=metric.count,
                timestamp=metric.timestamp,
                confidence_interval=(
                    metric.confidence_interval_lower,
                    metric.confidence_interval_upper
                ) if metric.confidence_interval_lower is not None else None
            )
            results[metric.variant_name].append(result)
        
        return results
    
    async def analyze_test_results(self, test_id: str) -> Optional[TestAnalysis]:
        """Perform statistical analysis of test results"""
        config = await self._load_test_config(test_id)
        if not config:
            return None
        
        # Get metrics for analysis
        metrics = await self.get_test_metrics(test_id)
        
        if not metrics:
            return None
        
        # Perform statistical analysis
        primary_metric = config.primary_metric
        
        # Get control and treatment values
        control_values = [
            m.value for m in metrics.get("control", [])
            if m.metric_name == primary_metric
        ]
        
        treatment_results = {}
        for variant_name, variant_metrics in metrics.items():
            if variant_name != "control":
                treatment_values = [
                    m.value for m in variant_metrics
                    if m.metric_name == primary_metric
                ]
                if treatment_values and control_values:
                    treatment_results[variant_name] = treatment_values
        
        if not control_values or not treatment_results:
            return None
        
        # Perform statistical tests
        analysis_results = {}
        best_variant = "control"
        best_improvement = 0
        
        for variant_name, treatment_values in treatment_results.items():
            # Perform t-test
            t_stat, p_value = stats.ttest_ind(control_values, treatment_values)
            
            # Calculate effect size
            control_mean = np.mean(control_values)
            treatment_mean = np.mean(treatment_values)
            relative_improvement = ((treatment_mean - control_mean) / control_mean) * 100
            
            # Check if this is the best variant
            if abs(relative_improvement) > abs(best_improvement):
                best_improvement = relative_improvement
                best_variant = variant_name
            
            analysis_results[variant_name] = {
                'p_value': p_value,
                'relative_improvement': relative_improvement,
                'absolute_difference': treatment_mean - control_mean,
                'is_significant': p_value < (1 - config.confidence_level)
            }
        
        # Calculate statistical power
        effect_size = abs(best_improvement / 100)
        power = self._calculate_statistical_power(
            len(control_values),
            effect_size,
            config.confidence_level
        )
        
        # Generate recommendation
        is_significant = any(
            result['is_significant'] for result in analysis_results.values()
        )
        
        if is_significant and abs(best_improvement) >= config.minimum_effect_size * 100:
            recommendation = best_variant
            confidence_score = 0.9
        else:
            recommendation = "control"
            confidence_score = 0.6
        
        # Create analysis object
        analysis = TestAnalysis(
            test_id=test_id,
            analysis_timestamp=datetime.utcnow(),
            is_significant=is_significant,
            p_value=min(result['p_value'] for result in analysis_results.values()),
            confidence_level=config.confidence_level,
            relative_improvement={
                variant: result['relative_improvement']
                for variant, result in analysis_results.items()
            },
            absolute_difference={
                variant: result['absolute_difference']
                for variant, result in analysis_results.items()
            },
            statistical_power=power,
            required_sample_size=self._calculate_required_sample_size(
                config.minimum_effect_size,
                config.confidence_level,
                0.8  # Desired power
            ),
            current_sample_size=len(control_values),
            recommendation=recommendation,
            confidence_score=confidence_score,
            decision_factors=[
                f"Statistical significance: {is_significant}",
                f"Best improvement: {best_improvement:.2f}%",
                f"Statistical power: {power:.2f}"
            ]
        )
        
        return analysis
    
    async def list_tests(
        self,
        status: Optional[TestStatus] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List A/B tests with optional filtering"""
        query = self.session.query(ABTestORM)
        
        if status:
            query = query.filter_by(status=status.value)
        
        query = query.order_by(ABTestORM.created_at.desc()).limit(limit)
        
        tests = []
        for test_orm in query.all():
            test_dict = {
                'test_id': test_orm.test_id,
                'test_name': test_orm.test_name,
                'status': test_orm.status,
                'created_at': test_orm.created_at.isoformat(),
                'started_at': test_orm.started_at.isoformat() if test_orm.started_at else None,
                'completed_at': test_orm.completed_at.isoformat() if test_orm.completed_at else None,
                'control_model': f"{test_orm.control_model_id}:{test_orm.control_model_version}",
                'treatment_models': test_orm.treatment_models,
                'primary_metric': test_orm.primary_metric
            }
            tests.append(test_dict)
        
        return tests
    
    def _validate_test_config(self, config: ABTestConfig):
        """Validate test configuration"""
        # Check traffic allocation sums to 100%
        total_allocation = sum(config.traffic_allocation.values())
        if abs(total_allocation - 1.0) > 0.01:
            raise ValueError(f"Traffic allocation must sum to 100%, got {total_allocation * 100}%")
        
        # Check minimum sample size
        if config.minimum_sample_size < 100:
            raise ValueError("Minimum sample size must be at least 100")
        
        # Check confidence level
        if not 0.8 <= config.confidence_level <= 0.99:
            raise ValueError("Confidence level must be between 0.8 and 0.99")
    
    async def _check_conflicting_tests(self, config: ABTestConfig):
        """Check for conflicting tests"""
        # Check if any models are already being tested
        active_tests = self.session.query(ABTestORM).filter_by(
            status=TestStatus.RUNNING.value
        ).all()
        
        test_models = {config.control_model} | set(config.treatment_models)
        
        for test in active_tests:
            existing_models = {(test.control_model_id, test.control_model_version)}
            for treatment in test.treatment_models or []:
                existing_models.add((treatment['model_id'], treatment['version']))
            
            if test_models & existing_models:
                raise ValueError(f"Models already being tested in {test.test_id}")
    
    async def _validate_model_variants(self, config: ABTestConfig):
        """Validate that model variants exist"""
        if not self.model_registry:
            return
        
        all_models = [config.control_model] + config.treatment_models
        
        for model_id, version in all_models:
            model = await self.model_registry.get_model(model_id, version)
            if not model:
                raise ValueError(f"Model {model_id}:{version} not found in registry")
    
    async def _load_test_config(self, test_id: str) -> Optional[ABTestConfig]:
        """Load test configuration from database"""
        test_orm = self.session.query(ABTestORM).filter_by(test_id=test_id).first()
        if not test_orm:
            return None
        
        # Reconstruct config (simplified)
        config = ABTestConfig(
            test_id=test_orm.test_id,
            test_name=test_orm.test_name,
            description=test_orm.description,
            control_model=(test_orm.control_model_id, test_orm.control_model_version),
            treatment_models=[
                (m['model_id'], m['version']) for m in test_orm.treatment_models or []
            ],
            traffic_split_strategy=TrafficSplitStrategy(test_orm.traffic_split_strategy),
            traffic_allocation=test_orm.traffic_allocation or {},
            minimum_duration_hours=test_orm.minimum_duration_hours or 24,
            maximum_duration_hours=test_orm.maximum_duration_hours or 168,
            minimum_sample_size=test_orm.minimum_sample_size or 1000,
            confidence_level=test_orm.confidence_level or 0.95,
            primary_metric=test_orm.primary_metric,
            secondary_metrics=test_orm.secondary_metrics or [],
            performance_thresholds=test_orm.performance_thresholds or {}
        )
        
        return config
    
    def _random_split(self, traffic_allocation: Dict[str, float]) -> str:
        """Random traffic splitting"""
        rand_value = random.random()
        cumulative = 0
        
        for variant, allocation in traffic_allocation.items():
            cumulative += allocation
            if rand_value <= cumulative:
                return variant
        
        return list(traffic_allocation.keys())[0]  # Fallback
    
    def _user_hash_split(self, user_id: str, traffic_allocation: Dict[str, float]) -> str:
        """Consistent user-based traffic splitting"""
        import hashlib
        
        # Create consistent hash for user
        user_hash = int(hashlib.md5(user_id.encode()).hexdigest()[:8], 16)
        hash_value = (user_hash % 10000) / 10000.0
        
        cumulative = 0
        for variant, allocation in traffic_allocation.items():
            cumulative += allocation
            if hash_value <= cumulative:
                return variant
        
        return list(traffic_allocation.keys())[0]  # Fallback
    
    def _geographical_split(self, location: str, traffic_allocation: Dict[str, float]) -> str:
        """Geography-based traffic splitting"""
        # Simplified implementation
        # In production, this would use actual geographical data
        return self._random_split(traffic_allocation)
    
    def _gradual_rollout_split(
        self,
        test_id: str,
        traffic_allocation: Dict[str, float],
        request_context: Dict[str, Any]
    ) -> str:
        """Gradual rollout traffic splitting"""
        # Get test progress (simplified)
        test_orm = self.session.query(ABTestORM).filter_by(test_id=test_id).first()
        if not test_orm or not test_orm.started_at:
            return "control"
        
        # Calculate rollout percentage based on time elapsed
        elapsed_hours = (datetime.utcnow() - test_orm.started_at).total_seconds() / 3600
        max_hours = test_orm.maximum_duration_hours or 168
        rollout_percentage = min(elapsed_hours / max_hours, 1.0)
        
        # Adjust traffic allocation based on rollout percentage
        adjusted_allocation = {}
        for variant, allocation in traffic_allocation.items():
            if variant == "control":
                adjusted_allocation[variant] = 1.0 - (rollout_percentage * (1.0 - allocation))
            else:
                adjusted_allocation[variant] = rollout_percentage * allocation
        
        return self._random_split(adjusted_allocation)
    
    async def _setup_traffic_routing(self, config: ABTestConfig):
        """Setup traffic routing for test"""
        # This would integrate with load balancer/routing infrastructure
        self.logger.info(f"Setup traffic routing for test {config.test_id}")
    
    async def _cleanup_traffic_routing(self, test_id: str):
        """Cleanup traffic routing for test"""
        # This would cleanup load balancer/routing configuration
        self.logger.info(f"Cleanup traffic routing for test {test_id}")
    
    async def _monitor_test(self, test_id: str):
        """Monitor test for safety violations and completion criteria"""
        while test_id in self._active_tests:
            try:
                # Check for completion criteria
                should_complete = await self._check_completion_criteria(test_id)
                if should_complete:
                    await self.stop_test(test_id, "Completion criteria met")
                    break
                
                # Wait before next check
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error monitoring test {test_id}: {e}")
                await asyncio.sleep(60)  # Shorter wait on error
    
    async def _check_completion_criteria(self, test_id: str) -> bool:
        """Check if test should be completed"""
        config = self._active_tests.get(test_id)
        if not config:
            return True
        
        test_orm = self.session.query(ABTestORM).filter_by(test_id=test_id).first()
        if not test_orm or not test_orm.started_at:
            return False
        
        # Check minimum duration
        elapsed_hours = (datetime.utcnow() - test_orm.started_at).total_seconds() / 3600
        if elapsed_hours < config.minimum_duration_hours:
            return False
        
        # Check maximum duration
        if elapsed_hours >= config.maximum_duration_hours:
            return True
        
        # Check sample size
        metrics = await self.get_test_metrics(test_id)
        total_samples = sum(
            len([m for m in variant_metrics if m.metric_name == config.primary_metric])
            for variant_metrics in metrics.values()
        )
        
        if total_samples < config.minimum_sample_size:
            return False
        
        # Check for statistical significance (if auto-decision enabled)
        if config.auto_decision_enabled:
            analysis = await self.analyze_test_results(test_id)
            if analysis and analysis.is_significant:
                return True
        
        return False
    
    async def _check_safety_violations(
        self,
        test_id: str,
        variant_name: str,
        metric_name: str,
        value: float
    ):
        """Check for safety violations that might trigger rollback"""
        config = self._active_tests.get(test_id)
        if not config or not config.auto_rollback_enabled:
            return
        
        # Check performance thresholds
        threshold = config.performance_thresholds.get(metric_name)
        if threshold and value < threshold:
            self.logger.warning(
                f"Safety violation in test {test_id}: {metric_name}={value} < {threshold}"
            )
            # In production, this would trigger rollback
    
    def _calculate_statistical_power(
        self,
        sample_size: int,
        effect_size: float,
        confidence_level: float
    ) -> float:
        """Calculate statistical power"""
        # Simplified power calculation
        # In production, use proper power analysis libraries
        if sample_size < 100:
            return 0.3
        elif sample_size < 1000:
            return 0.5 + (effect_size * 2)
        else:
            return min(0.8 + (effect_size * 3), 0.95)
    
    def _calculate_required_sample_size(
        self,
        effect_size: float,
        confidence_level: float,
        desired_power: float
    ) -> int:
        """Calculate required sample size"""
        # Simplified calculation
        # In production, use proper sample size calculation
        base_size = 1000
        adjustment = 1 / (effect_size + 0.01)
        return int(base_size * adjustment)
    
    def __del__(self):
        """Cleanup database session"""
        if hasattr(self, 'session'):
            self.session.close()
