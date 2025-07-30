"""
Model Evaluation and Validation System

Automated evaluation of new model versions with comprehensive metrics,
benchmarking, and validation against quality gates.
"""

import asyncio
import json
import logging
import time
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable, Tuple, Union
from dataclasses import dataclass, asdict
import concurrent.futures

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, mean_absolute_error, r2_score,
    roc_auc_score, confusion_matrix, classification_report
)
import matplotlib.pyplot as plt
import seaborn as sns

from .storage_manager import ModelStorageManager
from .registry import ModelRegistry, ModelMetadata

class EvaluationStatus(Enum):
    """Evaluation status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class QualityGateStatus(Enum):
    """Quality gate status"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"

class MetricType(Enum):
    """Types of evaluation metrics"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    RANKING = "ranking"
    BUSINESS = "business"
    PERFORMANCE = "performance"
    CUSTOM = "custom"

@dataclass
class EvaluationMetrics:
    """Container for evaluation metrics"""
    # Core metrics
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    auc_roc: Optional[float] = None
    
    # Regression metrics
    mse: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    r2_score: Optional[float] = None
    
    # Performance metrics
    inference_time_ms: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    throughput_qps: Optional[float] = None
    
    # Business metrics
    business_impact_score: Optional[float] = None
    cost_efficiency: Optional[float] = None
    
    # Custom metrics
    custom_metrics: Dict[str, float] = None
    
    def __post_init__(self):
        if self.custom_metrics is None:
            self.custom_metrics = {}

@dataclass
class QualityGate:
    """Quality gate definition"""
    name: str
    metric_name: str
    threshold: float
    comparison: str  # ">=", "<=", ">", "<", "=="
    severity: str    # "critical", "major", "minor"
    description: str

@dataclass
class BenchmarkResult:
    """Benchmark result data"""
    benchmark_name: str
    dataset_name: str
    metrics: EvaluationMetrics
    execution_time_seconds: float
    timestamp: datetime
    metadata: Dict[str, Any]

@dataclass
class EvaluationConfig:
    """Configuration for model evaluation"""
    # Basic settings
    evaluation_id: str
    model_id: str
    version: str
    
    # Datasets and benchmarks
    test_datasets: List[str]
    benchmark_suites: List[str]
    
    # Quality gates
    quality_gates: List[QualityGate]
    
    # Evaluation settings
    metrics_to_compute: List[str]
    cross_validation_folds: int = 5
    bootstrap_samples: int = 1000
    confidence_level: float = 0.95
    
    # Performance evaluation
    performance_tests_enabled: bool = True
    batch_sizes: List[int] = None
    concurrent_requests: List[int] = None
    
    # Comparison settings
    baseline_models: List[Tuple[str, str]] = None  # (model_id, version) pairs
    
    # Output settings
    generate_report: bool = True
    save_predictions: bool = False
    generate_visualizations: bool = True
    
    def __post_init__(self):
        if self.batch_sizes is None:
            self.batch_sizes = [1, 8, 32, 128]
        if self.concurrent_requests is None:
            self.concurrent_requests = [1, 5, 10, 50]
        if self.baseline_models is None:
            self.baseline_models = []

class ModelEvaluator:
    """
    Comprehensive model evaluation and validation system
    """
    
    def __init__(
        self,
        storage_manager: ModelStorageManager,
        model_registry: Optional[ModelRegistry] = None,
        data_path: str = "./evaluation_data",
        output_path: str = "./evaluation_results"
    ):
        self.storage_manager = storage_manager
        self.model_registry = model_registry
        self.data_path = Path(data_path)
        self.output_path = Path(output_path)
        self.logger = logging.getLogger(__name__)
        
        # Create directories
        self.data_path.mkdir(parents=True, exist_ok=True)
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Custom evaluation functions
        self._custom_evaluators: Dict[str, Callable] = {}
        self._benchmark_datasets: Dict[str, Any] = {}
        
        # Load default benchmarks
        self._load_default_benchmarks()
    
    async def evaluate_model(
        self,
        config: EvaluationConfig,
        model: Optional[nn.Module] = None
    ) -> Dict[str, Any]:
        """
        Evaluate a model comprehensively
        
        Args:
            config: Evaluation configuration
            model: Model instance (optional, will load if not provided)
        
        Returns:
            Dict containing evaluation results
        """
        self.logger.info(f"Starting evaluation {config.evaluation_id}")
        
        # Load model if not provided
        if model is None:
            model = await self._load_model(config.model_id, config.version)
        
        # Initialize results container
        results = {
            "evaluation_id": config.evaluation_id,
            "model_id": config.model_id,
            "version": config.version,
            "timestamp": datetime.utcnow().isoformat(),
            "status": EvaluationStatus.RUNNING.value,
            "metrics": {},
            "benchmarks": {},
            "quality_gates": {},
            "comparisons": {},
            "performance": {},
            "summary": {}
        }
        
        try:
            # Run dataset evaluations
            for dataset_name in config.test_datasets:
                self.logger.info(f"Evaluating on dataset: {dataset_name}")
                dataset_results = await self._evaluate_on_dataset(
                    model, dataset_name, config
                )
                results["metrics"][dataset_name] = asdict(dataset_results)
            
            # Run benchmarks
            for benchmark_name in config.benchmark_suites:
                self.logger.info(f"Running benchmark: {benchmark_name}")
                benchmark_results = await self._run_benchmark(
                    model, benchmark_name, config
                )
                results["benchmarks"][benchmark_name] = [
                    asdict(result) for result in benchmark_results
                ]
            
            # Evaluate quality gates
            quality_gate_results = await self._evaluate_quality_gates(
                results, config.quality_gates
            )
            results["quality_gates"] = quality_gate_results
            
            # Performance evaluation
            if config.performance_tests_enabled:
                performance_results = await self._evaluate_performance(
                    model, config
                )
                results["performance"] = performance_results
            
            # Compare with baseline models
            if config.baseline_models:
                comparison_results = await self._compare_with_baselines(
                    model, config
                )
                results["comparisons"] = comparison_results
            
            # Generate summary
            summary = await self._generate_summary(results, config)
            results["summary"] = summary
            
            # Generate report and visualizations
            if config.generate_report:
                await self._generate_evaluation_report(results, config)
            
            results["status"] = EvaluationStatus.COMPLETED.value
            self.logger.info(f"Evaluation {config.evaluation_id} completed successfully")
            
        except Exception as e:
            self.logger.error(f"Evaluation failed: {e}")
            results["status"] = EvaluationStatus.FAILED.value
            results["error"] = str(e)
        
        # Save results
        await self._save_evaluation_results(results, config)
        
        return results
    
    async def _evaluate_on_dataset(
        self,
        model: nn.Module,
        dataset_name: str,
        config: EvaluationConfig
    ) -> EvaluationMetrics:
        """Evaluate model on a specific dataset"""
        # Load dataset
        dataset = await self._load_dataset(dataset_name)
        
        # Get predictions
        predictions, actuals, inference_times = await self._get_model_predictions(
            model, dataset
        )
        
        # Compute metrics
        metrics = EvaluationMetrics()
        
        # Classification metrics
        if self._is_classification_task(predictions, actuals):
            metrics.accuracy = accuracy_score(actuals, predictions)
            metrics.precision = precision_score(actuals, predictions, average='weighted')
            metrics.recall = recall_score(actuals, predictions, average='weighted')
            metrics.f1_score = f1_score(actuals, predictions, average='weighted')
            
            # AUC-ROC for binary classification
            if len(np.unique(actuals)) == 2:
                # Get prediction probabilities if available
                try:
                    proba = await self._get_prediction_probabilities(model, dataset)
                    metrics.auc_roc = roc_auc_score(actuals, proba[:, 1])
                except:
                    pass
        
        # Regression metrics
        elif self._is_regression_task(predictions, actuals):
            metrics.mse = mean_squared_error(actuals, predictions)
            metrics.mae = mean_absolute_error(actuals, predictions)
            metrics.rmse = np.sqrt(metrics.mse)
            metrics.r2_score = r2_score(actuals, predictions)
        
        # Performance metrics
        metrics.inference_time_ms = np.mean(inference_times) * 1000
        metrics.memory_usage_mb = self._get_model_memory_usage(model)
        
        # Custom metrics
        for metric_name in config.metrics_to_compute:
            if metric_name in self._custom_evaluators:
                custom_value = self._custom_evaluators[metric_name](
                    model, predictions, actuals, dataset
                )
                metrics.custom_metrics[metric_name] = custom_value
        
        return metrics
    
    async def _run_benchmark(
        self,
        model: nn.Module,
        benchmark_name: str,
        config: EvaluationConfig
    ) -> List[BenchmarkResult]:
        """Run a benchmark suite"""
        benchmark_suite = self._benchmark_datasets.get(benchmark_name)
        if not benchmark_suite:
            raise ValueError(f"Benchmark {benchmark_name} not found")
        
        results = []
        
        for dataset_info in benchmark_suite:
            start_time = time.time()
            
            # Evaluate on benchmark dataset
            metrics = await self._evaluate_on_dataset(
                model, dataset_info["name"], config
            )
            
            execution_time = time.time() - start_time
            
            result = BenchmarkResult(
                benchmark_name=benchmark_name,
                dataset_name=dataset_info["name"],
                metrics=metrics,
                execution_time_seconds=execution_time,
                timestamp=datetime.utcnow(),
                metadata=dataset_info.get("metadata", {})
            )
            
            results.append(result)
        
        return results
    
    async def _evaluate_quality_gates(
        self,
        results: Dict[str, Any],
        quality_gates: List[QualityGate]
    ) -> Dict[str, Any]:
        """Evaluate quality gates against results"""
        gate_results = {}
        
        for gate in quality_gates:
            gate_result = {
                "name": gate.name,
                "status": QualityGateStatus.FAILED.value,
                "description": gate.description,
                "threshold": gate.threshold,
                "actual_value": None,
                "severity": gate.severity
            }
            
            # Extract metric value from results
            metric_value = self._extract_metric_value(results, gate.metric_name)
            
            if metric_value is not None:
                gate_result["actual_value"] = metric_value
                
                # Evaluate condition
                passed = self._evaluate_condition(
                    metric_value, gate.threshold, gate.comparison
                )
                
                if passed:
                    gate_result["status"] = QualityGateStatus.PASSED.value
                elif gate.severity == "minor":
                    gate_result["status"] = QualityGateStatus.WARNING.value
            
            gate_results[gate.name] = gate_result
        
        return gate_results
    
    async def _evaluate_performance(
        self,
        model: nn.Module,
        config: EvaluationConfig
    ) -> Dict[str, Any]:
        """Evaluate model performance characteristics"""
        performance_results = {
            "batch_performance": {},
            "concurrency_performance": {},
            "memory_profile": {},
            "scaling_characteristics": {}
        }
        
        # Load a representative dataset for performance testing
        if config.test_datasets:
            test_dataset = await self._load_dataset(config.test_datasets[0])
        else:
            # Create synthetic data if no test dataset available
            test_dataset = self._create_synthetic_dataset(model)
        
        # Batch size performance
        for batch_size in config.batch_sizes:
            batch_perf = await self._measure_batch_performance(
                model, test_dataset, batch_size
            )
            performance_results["batch_performance"][str(batch_size)] = batch_perf
        
        # Concurrency performance
        for num_concurrent in config.concurrent_requests:
            concurrent_perf = await self._measure_concurrent_performance(
                model, test_dataset, num_concurrent
            )
            performance_results["concurrency_performance"][str(num_concurrent)] = concurrent_perf
        
        # Memory profiling
        memory_profile = await self._profile_memory_usage(model, test_dataset)
        performance_results["memory_profile"] = memory_profile
        
        # Scaling characteristics
        scaling_metrics = await self._analyze_scaling_characteristics(
            performance_results["batch_performance"]
        )
        performance_results["scaling_characteristics"] = scaling_metrics
        
        return performance_results
    
    async def _compare_with_baselines(
        self,
        model: nn.Module,
        config: EvaluationConfig
    ) -> Dict[str, Any]:
        """Compare current model with baseline models"""
        comparisons = {}
        
        for baseline_model_id, baseline_version in config.baseline_models:
            try:
                # Load baseline model
                baseline_model = await self._load_model(baseline_model_id, baseline_version)
                
                # Compare on each test dataset
                dataset_comparisons = {}
                for dataset_name in config.test_datasets:
                    comparison = await self._compare_models_on_dataset(
                        model, baseline_model, dataset_name, config
                    )
                    dataset_comparisons[dataset_name] = comparison
                
                comparisons[f"{baseline_model_id}:{baseline_version}"] = dataset_comparisons
                
            except Exception as e:
                self.logger.error(f"Failed to compare with {baseline_model_id}:{baseline_version}: {e}")
                comparisons[f"{baseline_model_id}:{baseline_version}"] = {"error": str(e)}
        
        return comparisons
    
    async def _compare_models_on_dataset(
        self,
        model1: nn.Module,
        model2: nn.Module,
        dataset_name: str,
        config: EvaluationConfig
    ) -> Dict[str, Any]:
        """Compare two models on a dataset"""
        # Evaluate both models
        metrics1 = await self._evaluate_on_dataset(model1, dataset_name, config)
        metrics2 = await self._evaluate_on_dataset(model2, dataset_name, config)
        
        # Calculate improvements
        improvements = {}
        
        for attr in ['accuracy', 'precision', 'recall', 'f1_score', 'auc_roc', 'r2_score']:
            val1 = getattr(metrics1, attr)
            val2 = getattr(metrics2, attr)
            
            if val1 is not None and val2 is not None:
                improvement = ((val1 - val2) / val2) * 100 if val2 != 0 else 0
                improvements[attr] = {
                    "current": val1,
                    "baseline": val2,
                    "improvement_pct": improvement
                }
        
        # Performance comparison
        if metrics1.inference_time_ms and metrics2.inference_time_ms:
            speedup = metrics2.inference_time_ms / metrics1.inference_time_ms
            improvements["inference_speedup"] = speedup
        
        return {
            "current_metrics": asdict(metrics1),
            "baseline_metrics": asdict(metrics2),
            "improvements": improvements
        }
    
    async def _generate_summary(
        self,
        results: Dict[str, Any],
        config: EvaluationConfig
    ) -> Dict[str, Any]:
        """Generate evaluation summary"""
        summary = {
            "overall_status": "passed",
            "quality_gates_passed": 0,
            "quality_gates_total": len(config.quality_gates),
            "key_metrics": {},
            "recommendations": [],
            "concerns": []
        }
        
        # Analyze quality gates
        critical_failures = 0
        for gate_name, gate_result in results.get("quality_gates", {}).items():
            if gate_result["status"] == QualityGateStatus.PASSED.value:
                summary["quality_gates_passed"] += 1
            elif gate_result["severity"] == "critical":
                critical_failures += 1
                summary["concerns"].append(f"Critical quality gate failed: {gate_name}")
        
        if critical_failures > 0:
            summary["overall_status"] = "failed"
        elif summary["quality_gates_passed"] < summary["quality_gates_total"]:
            summary["overall_status"] = "warning"
        
        # Extract key metrics
        if config.test_datasets:
            primary_dataset = config.test_datasets[0]
            dataset_metrics = results.get("metrics", {}).get(primary_dataset, {})
            
            for metric in ["accuracy", "f1_score", "r2_score", "inference_time_ms"]:
                if metric in dataset_metrics:
                    summary["key_metrics"][metric] = dataset_metrics[metric]
        
        # Generate recommendations
        if summary["overall_status"] == "passed":
            summary["recommendations"].append("Model is ready for deployment")
        else:
            summary["recommendations"].append("Address quality gate failures before deployment")
        
        return summary
    
    async def _generate_evaluation_report(
        self,
        results: Dict[str, Any],
        config: EvaluationConfig
    ) -> str:
        """Generate comprehensive evaluation report"""
        report_path = self.output_path / f"evaluation_report_{config.evaluation_id}.html"
        
        # Generate HTML report (simplified)
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Model Evaluation Report - {config.model_id}:{config.version}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 40px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; }}
                .section {{ margin: 20px 0; }}
                .metric {{ margin: 10px 0; }}
                .passed {{ color: green; }}
                .failed {{ color: red; }}
                .warning {{ color: orange; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Model Evaluation Report</h1>
                <p><strong>Model:</strong> {config.model_id}:{config.version}</p>
                <p><strong>Evaluation ID:</strong> {config.evaluation_id}</p>
                <p><strong>Timestamp:</strong> {results['timestamp']}</p>
                <p><strong>Status:</strong> <span class="{results['summary']['overall_status']}">{results['summary']['overall_status']}</span></p>
            </div>
            
            <div class="section">
                <h2>Summary</h2>
                <p>Quality Gates: {results['summary']['quality_gates_passed']}/{results['summary']['quality_gates_total']} passed</p>
            </div>
            
            <div class="section">
                <h2>Metrics</h2>
                {self._format_metrics_html(results.get('metrics', {}))}
            </div>
            
            <div class="section">
                <h2>Quality Gates</h2>
                {self._format_quality_gates_html(results.get('quality_gates', {}))}
            </div>
            
            <div class="section">
                <h2>Performance</h2>
                {self._format_performance_html(results.get('performance', {}))}
            </div>
        </body>
        </html>
        """
        
        with open(report_path, 'w') as f:
            f.write(html_content)
        
        self.logger.info(f"Evaluation report saved to {report_path}")
        return str(report_path)
    
    def register_custom_evaluator(self, name: str, evaluator_func: Callable):
        """Register a custom evaluation function"""
        self._custom_evaluators[name] = evaluator_func
    
    def register_benchmark_dataset(self, name: str, dataset_info: Dict[str, Any]):
        """Register a benchmark dataset"""
        if name not in self._benchmark_datasets:
            self._benchmark_datasets[name] = []
        self._benchmark_datasets[name].append(dataset_info)
    
    async def _load_model(self, model_id: str, version: str) -> nn.Module:
        """Load model from storage"""
        # This would integrate with the model storage system
        # For now, return a placeholder
        self.logger.info(f"Loading model {model_id}:{version}")
        return nn.Linear(10, 1)  # Placeholder
    
    async def _load_dataset(self, dataset_name: str) -> Any:
        """Load dataset for evaluation"""
        # This would load actual datasets
        # For now, return synthetic data
        return {
            "X": np.random.randn(1000, 10),
            "y": np.random.randint(0, 2, 1000)
        }
    
    async def _get_model_predictions(
        self,
        model: nn.Module,
        dataset: Any
    ) -> Tuple[np.ndarray, np.ndarray, List[float]]:
        """Get model predictions and measure inference times"""
        model.eval()
        predictions = []
        inference_times = []
        
        X, y = dataset["X"], dataset["y"]
        
        with torch.no_grad():
            for i in range(len(X)):
                start_time = time.time()
                pred = model(torch.FloatTensor(X[i:i+1]))
                inference_time = time.time() - start_time
                
                predictions.append(pred.numpy().flatten()[0])
                inference_times.append(inference_time)
        
        return np.array(predictions), y, inference_times
    
    def _is_classification_task(self, predictions: np.ndarray, actuals: np.ndarray) -> bool:
        """Determine if this is a classification task"""
        # Simple heuristic: if all predictions are integers in a small range
        return (len(np.unique(actuals)) < 100 and 
                np.all(actuals == actuals.astype(int)))
    
    def _is_regression_task(self, predictions: np.ndarray, actuals: np.ndarray) -> bool:
        """Determine if this is a regression task"""
        return not self._is_classification_task(predictions, actuals)
    
    def _get_model_memory_usage(self, model: nn.Module) -> float:
        """Get model memory usage in MB"""
        param_size = sum(p.numel() * p.element_size() for p in model.parameters())
        buffer_size = sum(b.numel() * b.element_size() for b in model.buffers())
        return (param_size + buffer_size) / (1024 * 1024)
    
    def _extract_metric_value(self, results: Dict[str, Any], metric_name: str) -> Optional[float]:
        """Extract metric value from results"""
        # Look in various places for the metric
        for dataset_name, metrics in results.get("metrics", {}).items():
            if metric_name in metrics:
                return metrics[metric_name]
        
        # Check custom metrics
        for dataset_name, metrics in results.get("metrics", {}).items():
            custom_metrics = metrics.get("custom_metrics", {})
            if metric_name in custom_metrics:
                return custom_metrics[metric_name]
        
        return None
    
    def _evaluate_condition(
        self,
        value: float,
        threshold: float,
        comparison: str
    ) -> bool:
        """Evaluate a condition"""
        if comparison == ">=":
            return value >= threshold
        elif comparison == "<=":
            return value <= threshold
        elif comparison == ">":
            return value > threshold
        elif comparison == "<":
            return value < threshold
        elif comparison == "==":
            return abs(value - threshold) < 1e-6
        else:
            return False
    
    async def _measure_batch_performance(
        self,
        model: nn.Module,
        dataset: Any,
        batch_size: int
    ) -> Dict[str, float]:
        """Measure performance with specific batch size"""
        model.eval()
        X = dataset["X"][:min(len(dataset["X"]), 1000)]  # Limit for testing
        
        # Warm up
        with torch.no_grad():
            for _ in range(5):
                model(torch.FloatTensor(X[:batch_size]))
        
        # Measure
        times = []
        with torch.no_grad():
            for i in range(0, len(X), batch_size):
                batch = X[i:i+batch_size]
                if len(batch) < batch_size:
                    continue
                
                start_time = time.time()
                model(torch.FloatTensor(batch))
                end_time = time.time()
                
                times.append(end_time - start_time)
        
        return {
            "batch_size": batch_size,
            "avg_batch_time_ms": np.mean(times) * 1000,
            "throughput_samples_per_second": batch_size / np.mean(times),
            "std_batch_time_ms": np.std(times) * 1000
        }
    
    async def _measure_concurrent_performance(
        self,
        model: nn.Module,
        dataset: Any,
        num_concurrent: int
    ) -> Dict[str, float]:
        """Measure performance with concurrent requests"""
        X = dataset["X"][:100]  # Small sample for concurrent testing
        
        async def single_inference():
            model.eval()
            with torch.no_grad():
                start_time = time.time()
                model(torch.FloatTensor(X[:1]))
                return time.time() - start_time
        
        # Run concurrent inferences
        start_time = time.time()
        tasks = [single_inference() for _ in range(num_concurrent)]
        inference_times = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        return {
            "concurrent_requests": num_concurrent,
            "total_time_seconds": total_time,
            "avg_response_time_ms": np.mean(inference_times) * 1000,
            "requests_per_second": num_concurrent / total_time
        }
    
    def _load_default_benchmarks(self):
        """Load default benchmark suites"""
        # This would load actual benchmark datasets
        self._benchmark_datasets = {
            "financial_benchmark": [
                {"name": "market_prediction", "metadata": {"type": "time_series"}},
                {"name": "credit_scoring", "metadata": {"type": "classification"}}
            ],
            "performance_benchmark": [
                {"name": "latency_test", "metadata": {"type": "performance"}},
                {"name": "throughput_test", "metadata": {"type": "performance"}}
            ]
        }
    
    def _format_metrics_html(self, metrics: Dict[str, Any]) -> str:
        """Format metrics for HTML report"""
        html = ""
        for dataset_name, dataset_metrics in metrics.items():
            html += f"<h3>{dataset_name}</h3>"
            for metric_name, value in dataset_metrics.items():
                if isinstance(value, (int, float)):
                    html += f"<div class='metric'><strong>{metric_name}:</strong> {value:.4f}</div>"
        return html
    
    def _format_quality_gates_html(self, quality_gates: Dict[str, Any]) -> str:
        """Format quality gates for HTML report"""
        html = ""
        for gate_name, gate_result in quality_gates.items():
            status_class = gate_result["status"]
            html += f"""
            <div class='metric'>
                <strong>{gate_name}:</strong> 
                <span class='{status_class}'>{gate_result['status']}</span>
                (Threshold: {gate_result['threshold']}, Actual: {gate_result.get('actual_value', 'N/A')})
            </div>
            """
        return html
    
    def _format_performance_html(self, performance: Dict[str, Any]) -> str:
        """Format performance metrics for HTML report"""
        html = ""
        for perf_type, perf_data in performance.items():
            html += f"<h3>{perf_type.replace('_', ' ').title()}</h3>"
            if isinstance(perf_data, dict):
                for key, value in perf_data.items():
                    if isinstance(value, dict):
                        html += f"<div class='metric'><strong>{key}:</strong></div>"
                        for subkey, subvalue in value.items():
                            html += f"<div style='margin-left: 20px;'>{subkey}: {subvalue}</div>"
                    else:
                        html += f"<div class='metric'><strong>{key}:</strong> {value}</div>"
        return html
    
    async def _save_evaluation_results(
        self,
        results: Dict[str, Any],
        config: EvaluationConfig
    ):
        """Save evaluation results"""
        results_path = self.output_path / f"evaluation_{config.evaluation_id}.json"
        
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        self.logger.info(f"Evaluation results saved to {results_path}")
    
    def _create_synthetic_dataset(self, model: nn.Module) -> Dict[str, Any]:
        """Create synthetic dataset for testing"""
        # Simple synthetic data generation
        return {
            "X": np.random.randn(100, 10),
            "y": np.random.randint(0, 2, 100)
        }
