"""
Benchmark Suite for Specialized Business Models

Comprehensive benchmarking system for evaluating specialized models across
different business domains and use cases.
"""

import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_squared_error, mean_absolute_error, roc_auc_score,
    confusion_matrix, classification_report
)
import time
import memory_profiler
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import asyncio

from .base_trainer import IndustryType, ModelSize

class BenchmarkType(Enum):
    """Types of benchmarks"""
    ACCURACY = "accuracy"
    PERFORMANCE = "performance"
    ROBUSTNESS = "robustness"
    COMPLIANCE = "compliance"
    DOMAIN_KNOWLEDGE = "domain_knowledge"
    REASONING = "reasoning"
    SAFETY = "safety"

class MetricType(Enum):
    """Types of evaluation metrics"""
    CLASSIFICATION = "classification"
    REGRESSION = "regression"
    GENERATION = "generation"
    REASONING = "reasoning"
    COMPLIANCE = "compliance"

@dataclass
class BenchmarkTask:
    """Represents a single benchmark task"""
    task_id: str
    name: str
    description: str
    industry: IndustryType
    benchmark_type: BenchmarkType
    metric_type: MetricType
    
    # Data
    input_data: List[Dict[str, Any]]
    expected_outputs: List[Any]
    evaluation_criteria: Dict[str, Any]
    
    # Configuration
    max_tokens: int = 512
    temperature: float = 0.0
    timeout_seconds: int = 30
    
    # Metadata
    difficulty_level: str = "medium"  # easy, medium, hard, expert
    tags: List[str] = None
    source: str = "internal"
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []

@dataclass
class BenchmarkResult:
    """Results from running a benchmark"""
    task_id: str
    model_name: str
    industry: str
    benchmark_type: str
    
    # Performance metrics
    accuracy: Optional[float] = None
    precision: Optional[float] = None
    recall: Optional[float] = None
    f1_score: Optional[float] = None
    
    # Regression metrics
    mse: Optional[float] = None
    mae: Optional[float] = None
    rmse: Optional[float] = None
    
    # Generation metrics
    bleu_score: Optional[float] = None
    rouge_score: Optional[float] = None
    perplexity: Optional[float] = None
    
    # Performance metrics
    avg_latency_ms: Optional[float] = None
    throughput_qps: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    
    # Custom metrics
    custom_metrics: Dict[str, float] = None
    
    # Additional info
    total_examples: int = 0
    failed_examples: int = 0
    execution_time: float = 0.0
    timestamp: str = ""
    
    def __post_init__(self):
        if self.custom_metrics is None:
            self.custom_metrics = {}
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

class FinancialServicesBenchmarks:
    """
    Specialized benchmarks for financial services models
    """
    
    @staticmethod
    def create_financial_analysis_benchmark() -> BenchmarkTask:
        """Create financial statement analysis benchmark"""
        input_data = [
            {
                "company": "TechCorp Inc.",
                "financial_data": {
                    "revenue": 1000000,
                    "net_income": 150000,
                    "total_assets": 2000000,
                    "total_liabilities": 800000,
                    "cash": 300000
                },
                "question": "What is the return on assets (ROA) and what does it indicate about the company's performance?"
            },
            {
                "company": "ManufacturingCo",
                "financial_data": {
                    "revenue": 5000000,
                    "cost_of_goods_sold": 3000000,
                    "operating_expenses": 1500000,
                    "current_assets": 1200000,
                    "current_liabilities": 800000
                },
                "question": "Calculate the current ratio and gross profit margin. What do these metrics suggest about liquidity and profitability?"
            }
        ]
        
        expected_outputs = [
            {
                "roa": 0.075,
                "interpretation": "The 7.5% ROA indicates efficient asset utilization and good management performance."
            },
            {
                "current_ratio": 1.5,
                "gross_profit_margin": 0.4,
                "interpretation": "Current ratio of 1.5 shows adequate liquidity, 40% gross margin indicates good pricing power."
            }
        ]
        
        return BenchmarkTask(
            task_id="financial_analysis_001",
            name="Financial Statement Analysis",
            description="Evaluate ability to analyze financial statements and calculate key ratios",
            industry=IndustryType.FINANCIAL_SERVICES,
            benchmark_type=BenchmarkType.DOMAIN_KNOWLEDGE,
            metric_type=MetricType.REASONING,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "accuracy_weight": 0.6,
                "explanation_quality": 0.4,
                "calculation_precision": 0.8
            }
        )
    
    @staticmethod
    def create_risk_assessment_benchmark() -> BenchmarkTask:
        """Create risk assessment benchmark"""
        input_data = [
            {
                "scenario": "Credit Risk Assessment",
                "customer_profile": {
                    "credit_score": 720,
                    "annual_income": 75000,
                    "debt_to_income": 0.35,
                    "employment_history": "5 years stable",
                    "loan_amount": 250000,
                    "loan_purpose": "home purchase"
                },
                "question": "Assess the credit risk and recommend approval/rejection with reasoning."
            }
        ]
        
        expected_outputs = [
            {
                "risk_level": "low_to_medium",
                "recommendation": "approve",
                "conditions": ["income verification", "property appraisal"],
                "reasoning": "Good credit score and stable income, DTI within acceptable range"
            }
        ]
        
        return BenchmarkTask(
            task_id="risk_assessment_001",
            name="Credit Risk Assessment",
            description="Evaluate credit risk assessment capabilities",
            industry=IndustryType.FINANCIAL_SERVICES,
            benchmark_type=BenchmarkType.REASONING,
            metric_type=MetricType.CLASSIFICATION,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "decision_accuracy": 0.5,
                "risk_factors_identified": 0.3,
                "reasoning_quality": 0.2
            }
        )
    
    @staticmethod
    def create_compliance_benchmark() -> BenchmarkTask:
        """Create regulatory compliance benchmark"""
        input_data = [
            {
                "regulation": "Basel III Capital Requirements",
                "bank_data": {
                    "tier1_capital": 50000000,
                    "total_capital": 75000000,
                    "risk_weighted_assets": 600000000
                },
                "question": "Calculate capital ratios and assess compliance with Basel III requirements."
            }
        ]
        
        expected_outputs = [
            {
                "tier1_ratio": 0.083,
                "total_capital_ratio": 0.125,
                "compliance_status": "compliant",
                "buffer_analysis": "Tier 1 ratio exceeds minimum 6% requirement"
            }
        ]
        
        return BenchmarkTask(
            task_id="compliance_001",
            name="Basel III Compliance Check",
            description="Evaluate regulatory compliance assessment capabilities",
            industry=IndustryType.FINANCIAL_SERVICES,
            benchmark_type=BenchmarkType.COMPLIANCE,
            metric_type=MetricType.COMPLIANCE,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "calculation_accuracy": 0.7,
                "compliance_determination": 0.3
            }
        )

class HealthcareBenchmarks:
    """
    Specialized benchmarks for healthcare models
    """
    
    @staticmethod
    def create_clinical_decision_support_benchmark() -> BenchmarkTask:
        """Create clinical decision support benchmark"""
        input_data = [
            {
                "patient_case": {
                    "age": 65,
                    "gender": "male",
                    "symptoms": ["chest_pain", "shortness_of_breath", "fatigue"],
                    "vital_signs": {"bp": "150/95", "hr": 95, "temp": 98.6},
                    "medical_history": ["hypertension", "diabetes"],
                    "medications": ["metformin", "lisinopril"]
                },
                "question": "What are the differential diagnoses and recommended next steps?"
            }
        ]
        
        expected_outputs = [
            {
                "differential_diagnoses": [
                    "acute_coronary_syndrome",
                    "heart_failure",
                    "pulmonary_embolism"
                ],
                "recommended_tests": ["ecg", "troponin", "chest_xray", "d_dimer"],
                "urgency_level": "high",
                "reasoning": "Chest pain with risk factors requires immediate cardiac workup"
            }
        ]
        
        return BenchmarkTask(
            task_id="clinical_decision_001",
            name="Clinical Decision Support",
            description="Evaluate clinical reasoning and decision support capabilities",
            industry=IndustryType.HEALTHCARE,
            benchmark_type=BenchmarkType.REASONING,
            metric_type=MetricType.CLASSIFICATION,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "diagnosis_accuracy": 0.4,
                "test_appropriateness": 0.3,
                "urgency_assessment": 0.3
            }
        )
    
    @staticmethod
    def create_hipaa_compliance_benchmark() -> BenchmarkTask:
        """Create HIPAA compliance benchmark"""
        input_data = [
            {
                "scenario": "Patient Data Sharing Request",
                "request_details": {
                    "requestor": "insurance_company",
                    "purpose": "claims_processing",
                    "data_requested": ["diagnosis", "treatment_history", "billing_info"],
                    "patient_authorization": True,
                    "minimum_necessary": False
                },
                "question": "Is this data sharing request HIPAA compliant? What requirements must be met?"
            }
        ]
        
        expected_outputs = [
            {
                "compliance_status": "requires_modification",
                "issues": ["minimum_necessary_not_met"],
                "requirements": [
                    "limit_data_to_minimum_necessary",
                    "verify_authorization_scope",
                    "document_disclosure"
                ],
                "recommendation": "Approve with data limitation to claims-relevant information only"
            }
        ]
        
        return BenchmarkTask(
            task_id="hipaa_compliance_001",
            name="HIPAA Compliance Assessment",
            description="Evaluate HIPAA compliance assessment capabilities",
            industry=IndustryType.HEALTHCARE,
            benchmark_type=BenchmarkType.COMPLIANCE,
            metric_type=MetricType.COMPLIANCE,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "compliance_determination": 0.5,
                "issue_identification": 0.3,
                "requirement_specification": 0.2
            }
        )

class ManufacturingBenchmarks:
    """
    Specialized benchmarks for manufacturing models
    """
    
    @staticmethod
    def create_quality_control_benchmark() -> BenchmarkTask:
        """Create quality control benchmark"""
        input_data = [
            {
                "product": "Electronic Component",
                "specifications": {
                    "tolerance": "±0.1mm",
                    "resistance": "1000Ω ±5%",
                    "temperature_range": "-40°C to 85°C"
                },
                "test_results": {
                    "dimension": "10.05mm",
                    "resistance": "1020Ω",
                    "temp_test": "passed",
                    "visual_inspection": "minor_scratches"
                },
                "question": "Assess quality and determine pass/fail status with reasoning."
            }
        ]
        
        expected_outputs = [
            {
                "overall_status": "pass_with_notes",
                "dimension_status": "pass",
                "resistance_status": "pass",
                "visual_status": "acceptable",
                "notes": "Minor scratches noted but within cosmetic tolerances",
                "recommendation": "approve_for_shipment"
            }
        ]
        
        return BenchmarkTask(
            task_id="quality_control_001",
            name="Quality Control Assessment",
            description="Evaluate quality control decision-making capabilities",
            industry=IndustryType.MANUFACTURING,
            benchmark_type=BenchmarkType.DOMAIN_KNOWLEDGE,
            metric_type=MetricType.CLASSIFICATION,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "pass_fail_accuracy": 0.6,
                "reasoning_quality": 0.4
            }
        )
    
    @staticmethod
    def create_process_optimization_benchmark() -> BenchmarkTask:
        """Create process optimization benchmark"""
        input_data = [
            {
                "process": "Assembly Line Optimization",
                "current_state": {
                    "cycle_time": 120,  # seconds
                    "throughput": 720,  # units/day
                    "defect_rate": 0.02,
                    "utilization": 0.85,
                    "bottleneck": "station_3"
                },
                "constraints": {
                    "max_investment": 50000,
                    "space_limitation": True,
                    "workforce_size": 8
                },
                "question": "Propose optimization strategies to improve throughput while maintaining quality."
            }
        ]
        
        expected_outputs = [
            {
                "recommendations": [
                    "parallel_processing_station_3",
                    "preventive_maintenance_schedule",
                    "operator_training_program"
                ],
                "expected_improvements": {
                    "throughput_increase": 0.15,
                    "defect_rate_reduction": 0.25,
                    "cycle_time_reduction": 0.10
                },
                "implementation_cost": 45000,
                "roi_months": 8
            }
        ]
        
        return BenchmarkTask(
            task_id="process_optimization_001",
            name="Process Optimization",
            description="Evaluate process optimization and improvement capabilities",
            industry=IndustryType.MANUFACTURING,
            benchmark_type=BenchmarkType.REASONING,
            metric_type=MetricType.REASONING,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "strategy_relevance": 0.4,
                "feasibility_assessment": 0.3,
                "quantitative_analysis": 0.3
            }
        )

class TechnologyBenchmarks:
    """
    Specialized benchmarks for technology business models
    """
    
    @staticmethod
    def create_software_architecture_benchmark() -> BenchmarkTask:
        """Create software architecture benchmark"""
        input_data = [
            {
                "project": "E-commerce Platform",
                "requirements": {
                    "expected_users": 100000,
                    "peak_traffic": "10x normal",
                    "availability": "99.9%",
                    "security": "PCI_DSS_compliant",
                    "integration_needs": ["payment_gateways", "inventory_systems"]
                },
                "constraints": {
                    "budget": "moderate",
                    "timeline": "6_months",
                    "team_size": 12
                },
                "question": "Design a scalable architecture and justify design decisions."
            }
        ]
        
        expected_outputs = [
            {
                "architecture_pattern": "microservices",
                "key_components": [
                    "api_gateway", "user_service", "product_service", 
                    "payment_service", "inventory_service"
                ],
                "technology_stack": {
                    "backend": "node_js",
                    "database": "postgresql_redis",
                    "messaging": "rabbitmq",
                    "deployment": "kubernetes"
                },
                "scalability_strategy": "horizontal_scaling_with_load_balancing",
                "security_measures": ["oauth2", "encryption", "rate_limiting"]
            }
        ]
        
        return BenchmarkTask(
            task_id="software_architecture_001",
            name="Software Architecture Design",
            description="Evaluate software architecture design capabilities",
            industry=IndustryType.TECHNOLOGY,
            benchmark_type=BenchmarkType.REASONING,
            metric_type=MetricType.REASONING,
            input_data=input_data,
            expected_outputs=expected_outputs,
            evaluation_criteria={
                "architecture_appropriateness": 0.4,
                "scalability_consideration": 0.3,
                "security_assessment": 0.3
            }
        )

class BenchmarkEvaluator:
    """
    Core benchmark evaluation engine
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.evaluation_functions = {
            MetricType.CLASSIFICATION: self._evaluate_classification,
            MetricType.REGRESSION: self._evaluate_regression,
            MetricType.GENERATION: self._evaluate_generation,
            MetricType.REASONING: self._evaluate_reasoning,
            MetricType.COMPLIANCE: self._evaluate_compliance
        }
    
    def evaluate_model(
        self,
        model: torch.nn.Module,
        benchmark_tasks: List[BenchmarkTask],
        model_name: str = "unknown"
    ) -> List[BenchmarkResult]:
        """Evaluate model on benchmark tasks"""
        
        results = []
        
        for task in benchmark_tasks:
            self.logger.info(f"Evaluating task: {task.name}")
            
            start_time = time.time()
            
            try:
                # Get model predictions
                predictions = self._get_model_predictions(model, task)
                
                # Evaluate predictions
                evaluation_func = self.evaluation_functions.get(task.metric_type)
                if evaluation_func:
                    result = evaluation_func(task, predictions, model_name)
                else:
                    result = self._evaluate_generic(task, predictions, model_name)
                
                result.execution_time = time.time() - start_time
                results.append(result)
                
            except Exception as e:
                self.logger.error(f"Error evaluating task {task.task_id}: {e}")
                
                # Create error result
                error_result = BenchmarkResult(
                    task_id=task.task_id,
                    model_name=model_name,
                    industry=task.industry.value,
                    benchmark_type=task.benchmark_type.value,
                    failed_examples=len(task.input_data),
                    execution_time=time.time() - start_time
                )
                results.append(error_result)
        
        return results
    
    def _get_model_predictions(self, model: torch.nn.Module, task: BenchmarkTask) -> List[Any]:
        """Get model predictions for benchmark task"""
        model.eval()
        predictions = []
        
        with torch.no_grad():
            for example in task.input_data:
                try:
                    # Format input for model
                    input_text = self._format_input(example, task)
                    
                    # Get model prediction (simplified)
                    # In practice, this would use the actual model's inference method
                    prediction = self._simulate_model_prediction(input_text, task)
                    predictions.append(prediction)
                    
                except Exception as e:
                    self.logger.error(f"Error getting prediction: {e}")
                    predictions.append(None)
        
        return predictions
    
    def _format_input(self, example: Dict[str, Any], task: BenchmarkTask) -> str:
        """Format input example for model"""
        # Create a structured prompt based on the task type
        if task.benchmark_type == BenchmarkType.DOMAIN_KNOWLEDGE:
            return f"Given the following information: {json.dumps(example, indent=2)}\n\nPlease provide a detailed analysis."
        elif task.benchmark_type == BenchmarkType.COMPLIANCE:
            return f"Compliance Assessment:\n{json.dumps(example, indent=2)}\n\nPlease evaluate compliance and provide recommendations."
        else:
            return f"Task: {task.name}\nInput: {json.dumps(example, indent=2)}\nResponse:"
    
    def _simulate_model_prediction(self, input_text: str, task: BenchmarkTask) -> Dict[str, Any]:
        """Simulate model prediction (placeholder for actual model inference)"""
        # This would be replaced with actual model inference
        # For demonstration, return a structured response based on task type
        
        if task.industry == IndustryType.FINANCIAL_SERVICES:
            if "financial_analysis" in task.task_id:
                return {
                    "roa": 0.075,
                    "interpretation": "The ROA indicates efficient asset utilization."
                }
            elif "risk_assessment" in task.task_id:
                return {
                    "risk_level": "low_to_medium",
                    "recommendation": "approve",
                    "reasoning": "Good credit profile with stable income."
                }
        
        return {"prediction": "simulated_response", "confidence": 0.85}
    
    def _evaluate_classification(
        self,
        task: BenchmarkTask,
        predictions: List[Any],
        model_name: str
    ) -> BenchmarkResult:
        """Evaluate classification task"""
        
        correct = 0
        total = 0
        
        for pred, expected in zip(predictions, task.expected_outputs):
            if pred is None:
                continue
            
            total += 1
            
            # Extract classification decision
            pred_class = self._extract_classification_decision(pred, task)
            expected_class = self._extract_classification_decision(expected, task)
            
            if pred_class == expected_class:
                correct += 1
        
        accuracy = correct / total if total > 0 else 0
        
        return BenchmarkResult(
            task_id=task.task_id,
            model_name=model_name,
            industry=task.industry.value,
            benchmark_type=task.benchmark_type.value,
            accuracy=accuracy,
            total_examples=len(task.input_data),
            failed_examples=len(task.input_data) - total
        )
    
    def _evaluate_regression(
        self,
        task: BenchmarkTask,
        predictions: List[Any],
        model_name: str
    ) -> BenchmarkResult:
        """Evaluate regression task"""
        
        pred_values = []
        true_values = []
        
        for pred, expected in zip(predictions, task.expected_outputs):
            if pred is None:
                continue
            
            pred_val = self._extract_numeric_value(pred, task)
            true_val = self._extract_numeric_value(expected, task)
            
            if pred_val is not None and true_val is not None:
                pred_values.append(pred_val)
                true_values.append(true_val)
        
        if not pred_values:
            return BenchmarkResult(
                task_id=task.task_id,
                model_name=model_name,
                industry=task.industry.value,
                benchmark_type=task.benchmark_type.value,
                failed_examples=len(task.input_data)
            )
        
        mse = mean_squared_error(true_values, pred_values)
        mae = mean_absolute_error(true_values, pred_values)
        rmse = np.sqrt(mse)
        
        return BenchmarkResult(
            task_id=task.task_id,
            model_name=model_name,
            industry=task.industry.value,
            benchmark_type=task.benchmark_type.value,
            mse=mse,
            mae=mae,
            rmse=rmse,
            total_examples=len(pred_values),
            failed_examples=len(task.input_data) - len(pred_values)
        )
    
    def _evaluate_generation(
        self,
        task: BenchmarkTask,
        predictions: List[Any],
        model_name: str
    ) -> BenchmarkResult:
        """Evaluate text generation task"""
        
        # Simplified evaluation (would use proper BLEU/ROUGE in practice)
        total_quality = 0
        evaluated = 0
        
        for pred, expected in zip(predictions, task.expected_outputs):
            if pred is None:
                continue
            
            quality_score = self._calculate_text_quality(pred, expected)
            total_quality += quality_score
            evaluated += 1
        
        avg_quality = total_quality / evaluated if evaluated > 0 else 0
        
        return BenchmarkResult(
            task_id=task.task_id,
            model_name=model_name,
            industry=task.industry.value,
            benchmark_type=task.benchmark_type.value,
            custom_metrics={"text_quality": avg_quality},
            total_examples=evaluated,
            failed_examples=len(task.input_data) - evaluated
        )
    
    def _evaluate_reasoning(
        self,
        task: BenchmarkTask,
        predictions: List[Any],
        model_name: str
    ) -> BenchmarkResult:
        """Evaluate reasoning task"""
        
        reasoning_scores = []
        
        for pred, expected in zip(predictions, task.expected_outputs):
            if pred is None:
                continue
            
            score = self._evaluate_reasoning_quality(pred, expected, task)
            reasoning_scores.append(score)
        
        avg_reasoning = np.mean(reasoning_scores) if reasoning_scores else 0
        
        return BenchmarkResult(
            task_id=task.task_id,
            model_name=model_name,
            industry=task.industry.value,
            benchmark_type=task.benchmark_type.value,
            custom_metrics={"reasoning_quality": avg_reasoning},
            total_examples=len(reasoning_scores),
            failed_examples=len(task.input_data) - len(reasoning_scores)
        )
    
    def _evaluate_compliance(
        self,
        task: BenchmarkTask,
        predictions: List[Any],
        model_name: str
    ) -> BenchmarkResult:
        """Evaluate compliance task"""
        
        compliance_accuracy = 0
        issue_detection = 0
        total_evaluated = 0
        
        for pred, expected in zip(predictions, task.expected_outputs):
            if pred is None:
                continue
            
            total_evaluated += 1
            
            # Check compliance determination accuracy
            if self._extract_compliance_status(pred) == self._extract_compliance_status(expected):
                compliance_accuracy += 1
            
            # Check issue detection accuracy
            pred_issues = set(self._extract_issues(pred))
            expected_issues = set(self._extract_issues(expected))
            
            if pred_issues.intersection(expected_issues):
                issue_detection += 1
        
        compliance_acc = compliance_accuracy / total_evaluated if total_evaluated > 0 else 0
        issue_det = issue_detection / total_evaluated if total_evaluated > 0 else 0
        
        return BenchmarkResult(
            task_id=task.task_id,
            model_name=model_name,
            industry=task.industry.value,
            benchmark_type=task.benchmark_type.value,
            accuracy=compliance_acc,
            custom_metrics={"issue_detection": issue_det},
            total_examples=total_evaluated,
            failed_examples=len(task.input_data) - total_evaluated
        )
    
    def _evaluate_generic(
        self,
        task: BenchmarkTask,
        predictions: List[Any],
        model_name: str
    ) -> BenchmarkResult:
        """Generic evaluation for unknown task types"""
        
        return BenchmarkResult(
            task_id=task.task_id,
            model_name=model_name,
            industry=task.industry.value,
            benchmark_type=task.benchmark_type.value,
            total_examples=len(task.input_data),
            custom_metrics={"completion_rate": len([p for p in predictions if p is not None]) / len(predictions)}
        )
    
    # Helper methods for extracting values from predictions
    def _extract_classification_decision(self, data: Any, task: BenchmarkTask) -> str:
        """Extract classification decision from prediction"""
        if isinstance(data, dict):
            # Look for common classification keys
            for key in ['recommendation', 'decision', 'classification', 'status', 'class']:
                if key in data:
                    return str(data[key]).lower()
        
        return str(data).lower()
    
    def _extract_numeric_value(self, data: Any, task: BenchmarkTask) -> Optional[float]:
        """Extract numeric value from prediction"""
        if isinstance(data, (int, float)):
            return float(data)
        
        if isinstance(data, dict):
            # Look for numeric values in common keys
            for key in ['value', 'score', 'ratio', 'percentage', 'result']:
                if key in data and isinstance(data[key], (int, float)):
                    return float(data[key])
        
        # Try to extract number from string
        if isinstance(data, str):
            import re
            numbers = re.findall(r'-?\d+\.?\d*', data)
            if numbers:
                return float(numbers[0])
        
        return None
    
    def _calculate_text_quality(self, prediction: Any, expected: Any) -> float:
        """Calculate text quality score (simplified)"""
        # Simplified quality calculation
        pred_text = str(prediction).lower()
        exp_text = str(expected).lower()
        
        # Basic similarity check
        common_words = set(pred_text.split()).intersection(set(exp_text.split()))
        total_words = set(pred_text.split()).union(set(exp_text.split()))
        
        return len(common_words) / len(total_words) if total_words else 0
    
    def _evaluate_reasoning_quality(self, prediction: Any, expected: Any, task: BenchmarkTask) -> float:
        """Evaluate reasoning quality"""
        # Multi-factor reasoning evaluation
        score = 0.0
        
        # Check if key concepts are present
        criteria = task.evaluation_criteria
        
        if 'accuracy_weight' in criteria:
            # Check factual accuracy
            accuracy = self._check_factual_accuracy(prediction, expected)
            score += accuracy * criteria['accuracy_weight']
        
        if 'explanation_quality' in criteria:
            # Check explanation quality
            explanation_score = self._assess_explanation_quality(prediction)
            score += explanation_score * criteria['explanation_quality']
        
        return min(score, 1.0)
    
    def _extract_compliance_status(self, data: Any) -> str:
        """Extract compliance status from prediction"""
        if isinstance(data, dict):
            for key in ['compliance_status', 'status', 'compliance']:
                if key in data:
                    return str(data[key]).lower()
        
        return str(data).lower()
    
    def _extract_issues(self, data: Any) -> List[str]:
        """Extract identified issues from prediction"""
        if isinstance(data, dict):
            for key in ['issues', 'problems', 'violations', 'concerns']:
                if key in data and isinstance(data[key], list):
                    return [str(issue).lower() for issue in data[key]]
        
        return []
    
    def _check_factual_accuracy(self, prediction: Any, expected: Any) -> float:
        """Check factual accuracy of prediction"""
        # Simplified factual checking
        if isinstance(prediction, dict) and isinstance(expected, dict):
            matching_facts = 0
            total_facts = 0
            
            for key in expected:
                total_facts += 1
                if key in prediction:
                    if str(prediction[key]).lower() == str(expected[key]).lower():
                        matching_facts += 1
            
            return matching_facts / total_facts if total_facts > 0 else 0
        
        return 0.5  # Default score for non-structured data
    
    def _assess_explanation_quality(self, prediction: Any) -> float:
        """Assess quality of explanation"""
        # Simplified explanation quality assessment
        explanation_text = ""
        
        if isinstance(prediction, dict):
            for key in ['explanation', 'reasoning', 'justification', 'rationale']:
                if key in prediction:
                    explanation_text = str(prediction[key])
                    break
        else:
            explanation_text = str(prediction)
        
        # Basic quality indicators
        word_count = len(explanation_text.split())
        has_reasoning_words = any(word in explanation_text.lower() 
                                for word in ['because', 'due to', 'therefore', 'since', 'as'])
        
        score = 0.0
        if word_count >= 10:  # Minimum explanation length
            score += 0.3
        if word_count >= 25:  # Good explanation length
            score += 0.3
        if has_reasoning_words:  # Contains reasoning language
            score += 0.4
        
        return min(score, 1.0)

class BenchmarkSuite:
    """
    Complete benchmark suite manager
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.evaluator = BenchmarkEvaluator()
        self.benchmark_registry = self._initialize_benchmark_registry()
    
    def _initialize_benchmark_registry(self) -> Dict[IndustryType, List[BenchmarkTask]]:
        """Initialize benchmark registry with all industry benchmarks"""
        registry = {}
        
        # Financial Services
        registry[IndustryType.FINANCIAL_SERVICES] = [
            FinancialServicesBenchmarks.create_financial_analysis_benchmark(),
            FinancialServicesBenchmarks.create_risk_assessment_benchmark(),
            FinancialServicesBenchmarks.create_compliance_benchmark()
        ]
        
        # Healthcare
        registry[IndustryType.HEALTHCARE] = [
            HealthcareBenchmarks.create_clinical_decision_support_benchmark(),
            HealthcareBenchmarks.create_hipaa_compliance_benchmark()
        ]
        
        # Manufacturing
        registry[IndustryType.MANUFACTURING] = [
            ManufacturingBenchmarks.create_quality_control_benchmark(),
            ManufacturingBenchmarks.create_process_optimization_benchmark()
        ]
        
        # Technology
        registry[IndustryType.TECHNOLOGY] = [
            TechnologyBenchmarks.create_software_architecture_benchmark()
        ]
        
        return registry
    
    def run_comprehensive_benchmark(
        self,
        model: torch.nn.Module,
        model_name: str,
        industries: Optional[List[IndustryType]] = None,
        benchmark_types: Optional[List[BenchmarkType]] = None
    ) -> Dict[str, Any]:
        """Run comprehensive benchmark across industries and types"""
        
        if industries is None:
            industries = list(self.benchmark_registry.keys())
        
        all_results = []
        industry_summaries = {}
        
        for industry in industries:
            if industry not in self.benchmark_registry:
                continue
            
            industry_tasks = self.benchmark_registry[industry]
            
            # Filter by benchmark type if specified
            if benchmark_types:
                industry_tasks = [
                    task for task in industry_tasks 
                    if task.benchmark_type in benchmark_types
                ]
            
            if not industry_tasks:
                continue
            
            self.logger.info(f"Running benchmarks for {industry.value}")
            
            # Run benchmarks for this industry
            industry_results = self.evaluator.evaluate_model(
                model, industry_tasks, model_name
            )
            
            all_results.extend(industry_results)
            
            # Create industry summary
            industry_summaries[industry.value] = self._create_industry_summary(industry_results)
        
        # Create overall summary
        overall_summary = self._create_overall_summary(all_results)
        
        # Generate visualizations
        self._generate_benchmark_visualizations(all_results, model_name)
        
        return {
            'model_name': model_name,
            'timestamp': datetime.now().isoformat(),
            'overall_summary': overall_summary,
            'industry_summaries': industry_summaries,
            'detailed_results': [asdict(result) for result in all_results]
        }
    
    def _create_industry_summary(self, results: List[BenchmarkResult]) -> Dict[str, Any]:
        """Create summary for an industry's benchmark results"""
        if not results:
            return {}
        
        # Calculate aggregate metrics
        accuracies = [r.accuracy for r in results if r.accuracy is not None]
        avg_accuracy = np.mean(accuracies) if accuracies else None
        
        latencies = [r.avg_latency_ms for r in results if r.avg_latency_ms is not None]
        avg_latency = np.mean(latencies) if latencies else None
        
        total_examples = sum(r.total_examples for r in results)
        total_failed = sum(r.failed_examples for r in results)
        
        return {
            'num_benchmarks': len(results),
            'avg_accuracy': avg_accuracy,
            'avg_latency_ms': avg_latency,
            'total_examples': total_examples,
            'total_failed': total_failed,
            'success_rate': (total_examples - total_failed) / total_examples if total_examples > 0 else 0,
            'benchmark_types': list(set(r.benchmark_type for r in results))
        }
    
    def _create_overall_summary(self, results: List[BenchmarkResult]) -> Dict[str, Any]:
        """Create overall summary across all benchmarks"""
        if not results:
            return {}
        
        # Overall performance metrics
        all_accuracies = [r.accuracy for r in results if r.accuracy is not None]
        overall_accuracy = np.mean(all_accuracies) if all_accuracies else None
        
        # Performance by industry
        industry_performance = {}
        for result in results:
            industry = result.industry
            if industry not in industry_performance:
                industry_performance[industry] = []
            if result.accuracy is not None:
                industry_performance[industry].append(result.accuracy)
        
        industry_avg = {}
        for industry, accuracies in industry_performance.items():
            industry_avg[industry] = np.mean(accuracies) if accuracies else None
        
        # Performance by benchmark type
        type_performance = {}
        for result in results:
            bench_type = result.benchmark_type
            if bench_type not in type_performance:
                type_performance[bench_type] = []
            if result.accuracy is not None:
                type_performance[bench_type].append(result.accuracy)
        
        type_avg = {}
        for bench_type, accuracies in type_performance.items():
            type_avg[bench_type] = np.mean(accuracies) if accuracies else None
        
        return {
            'overall_accuracy': overall_accuracy,
            'total_benchmarks': len(results),
            'industries_tested': len(set(r.industry for r in results)),
            'benchmark_types_tested': len(set(r.benchmark_type for r in results)),
            'performance_by_industry': industry_avg,
            'performance_by_type': type_avg,
            'total_examples': sum(r.total_examples for r in results),
            'total_execution_time': sum(r.execution_time for r in results)
        }
    
    def _generate_benchmark_visualizations(self, results: List[BenchmarkResult], model_name: str):
        """Generate visualization charts for benchmark results"""
        
        # Performance by industry
        plt.figure(figsize=(12, 8))
        
        # Subplot 1: Accuracy by industry
        plt.subplot(2, 2, 1)
        industry_data = {}
        for result in results:
            if result.accuracy is not None:
                if result.industry not in industry_data:
                    industry_data[result.industry] = []
                industry_data[result.industry].append(result.accuracy)
        
        industries = list(industry_data.keys())
        avg_accuracies = [np.mean(industry_data[ind]) for ind in industries]
        
        plt.bar(industries, avg_accuracies)
        plt.title('Average Accuracy by Industry')
        plt.xticks(rotation=45)
        plt.ylabel('Accuracy')
        
        # Subplot 2: Performance by benchmark type
        plt.subplot(2, 2, 2)
        type_data = {}
        for result in results:
            if result.accuracy is not None:
                if result.benchmark_type not in type_data:
                    type_data[result.benchmark_type] = []
                type_data[result.benchmark_type].append(result.accuracy)
        
        types = list(type_data.keys())
        type_accuracies = [np.mean(type_data[t]) for t in types]
        
        plt.bar(types, type_accuracies)
        plt.title('Average Accuracy by Benchmark Type')
        plt.xticks(rotation=45)
        plt.ylabel('Accuracy')
        
        # Subplot 3: Execution time distribution
        plt.subplot(2, 2, 3)
        execution_times = [r.execution_time for r in results if r.execution_time > 0]
        plt.hist(execution_times, bins=20)
        plt.title('Execution Time Distribution')
        plt.xlabel('Time (seconds)')
        plt.ylabel('Frequency')
        
        # Subplot 4: Success rate by industry
        plt.subplot(2, 2, 4)
        success_rates = []
        for industry in industries:
            industry_results = [r for r in results if r.industry == industry]
            total_examples = sum(r.total_examples for r in industry_results)
            total_failed = sum(r.failed_examples for r in industry_results)
            success_rate = (total_examples - total_failed) / total_examples if total_examples > 0 else 0
            success_rates.append(success_rate)
        
        plt.bar(industries, success_rates)
        plt.title('Success Rate by Industry')
        plt.xticks(rotation=45)
        plt.ylabel('Success Rate')
        
        plt.tight_layout()
        plt.savefig(f'benchmark_results_{model_name}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png', 
                    dpi=300, bbox_inches='tight')
        plt.close()
    
    def compare_models(
        self,
        model_results: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Compare benchmark results across multiple models"""
        
        comparison_data = {}
        
        # Extract performance metrics for each model
        for model_name, results in model_results.items():
            overall_summary = results.get('overall_summary', {})
            comparison_data[model_name] = {
                'overall_accuracy': overall_summary.get('overall_accuracy'),
                'total_benchmarks': overall_summary.get('total_benchmarks'),
                'industries_tested': overall_summary.get('industries_tested'),
                'performance_by_industry': overall_summary.get('performance_by_industry', {}),
                'performance_by_type': overall_summary.get('performance_by_type', {})
            }
        
        # Generate comparison visualization
        self._generate_model_comparison_chart(comparison_data)
        
        # Determine best performing model
        best_model = max(
            comparison_data.keys(),
            key=lambda m: comparison_data[m].get('overall_accuracy', 0) or 0
        )
        
        return {
            'best_overall_model': best_model,
            'comparison_data': comparison_data,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def _generate_model_comparison_chart(self, comparison_data: Dict[str, Any]):
        """Generate model comparison visualization"""
        
        models = list(comparison_data.keys())
        overall_accuracies = [
            comparison_data[model].get('overall_accuracy', 0) or 0 
            for model in models
        ]
        
        plt.figure(figsize=(10, 6))
        bars = plt.bar(models, overall_accuracies)
        plt.title('Model Performance Comparison')
        plt.ylabel('Overall Accuracy')
        plt.xticks(rotation=45)
        
        # Add value labels on bars
        for bar, accuracy in zip(bars, overall_accuracies):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f'{accuracy:.3f}', ha='center', va='bottom')
        
        plt.tight_layout()
        plt.savefig(f'model_comparison_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png',
                    dpi=300, bbox_inches='tight')
        plt.close()
    
    def export_results(self, results: Dict[str, Any], output_path: str):
        """Export benchmark results to file"""
        
        # Create comprehensive report
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        # Create CSV summary
        csv_path = output_path.replace('.json', '_summary.csv')
        self._create_csv_summary(results, csv_path)
        
        self.logger.info(f"Benchmark results exported to {output_path}")
    
    def _create_csv_summary(self, results: Dict[str, Any], csv_path: str):
        """Create CSV summary of results"""
        
        rows = []
        detailed_results = results.get('detailed_results', [])
        
        for result in detailed_results:
            rows.append({
                'task_id': result.get('task_id'),
                'model_name': result.get('model_name'),
                'industry': result.get('industry'),
                'benchmark_type': result.get('benchmark_type'),
                'accuracy': result.get('accuracy'),
                'total_examples': result.get('total_examples'),
                'failed_examples': result.get('failed_examples'),
                'execution_time': result.get('execution_time')
            })
        
        df = pd.DataFrame(rows)
        df.to_csv(csv_path, index=False)
    
    def get_benchmark_tasks(self, industry: IndustryType) -> List[BenchmarkTask]:
        """Get all benchmark tasks for an industry"""
        return self.benchmark_registry.get(industry, [])
    
    def add_custom_benchmark(self, industry: IndustryType, task: BenchmarkTask):
        """Add a custom benchmark task"""
        if industry not in self.benchmark_registry:
            self.benchmark_registry[industry] = []
        
        self.benchmark_registry[industry].append(task)
        self.logger.info(f"Added custom benchmark {task.task_id} for {industry.value}")
