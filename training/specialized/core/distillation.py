"""
Model Distillation for Deployment Efficiency

Advanced model distillation system for creating smaller, faster models
while maintaining performance for production deployment.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import numpy as np
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Callable, Union
from dataclasses import dataclass, asdict
from enum import Enum
import time
from transformers import (
    AutoModel, AutoTokenizer, AutoConfig,
    TrainingArguments, Trainer,
    get_linear_schedule_with_warmup
)
from accelerate import Accelerator
import wandb
import mlflow
from sklearn.metrics import accuracy_score, f1_score

from .base_trainer import IndustryType, ModelSize, TrainingConfig

class DistillationType(Enum):
    """Types of distillation approaches"""
    KNOWLEDGE_DISTILLATION = "knowledge_distillation"
    ATTENTION_DISTILLATION = "attention_distillation"
    FEATURE_DISTILLATION = "feature_distillation"
    PROGRESSIVE_DISTILLATION = "progressive_distillation"
    LAYER_WISE_DISTILLATION = "layer_wise_distillation"
    TASK_SPECIFIC_DISTILLATION = "task_specific_distillation"

class CompressionTechnique(Enum):
    """Model compression techniques"""
    PRUNING = "pruning"
    QUANTIZATION = "quantization"
    MATRIX_FACTORIZATION = "matrix_factorization"
    KNOWLEDGE_DISTILLATION = "knowledge_distillation"
    NEURAL_ARCHITECTURE_SEARCH = "neural_architecture_search"

@dataclass
class DistillationConfig:
    """Configuration for model distillation"""
    
    # Teacher-Student setup
    teacher_model_path: str
    student_model_config: Dict[str, Any]
    compression_ratio: float = 0.5  # Target size reduction
    
    # Training parameters
    num_epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 5e-5
    warmup_steps: int = 1000
    
    # Distillation parameters
    distillation_type: DistillationType = DistillationType.KNOWLEDGE_DISTILLATION
    temperature: float = 4.0
    alpha: float = 0.7  # Weight for distillation loss
    beta: float = 0.3   # Weight for student loss
    
    # Loss configuration
    soft_target_loss_weight: float = 0.7
    hard_target_loss_weight: float = 0.3
    attention_loss_weight: float = 0.5
    feature_loss_weight: float = 0.5
    
    # Output configuration
    output_dir: str = "distilled_models"
    save_strategy: str = "epoch"
    evaluation_strategy: str = "epoch"
    logging_steps: int = 100
    
    # Compression techniques
    use_pruning: bool = False
    pruning_ratio: float = 0.2
    use_quantization: bool = False
    quantization_bits: int = 8
    
    # Industry specific
    industry: Optional[IndustryType] = None
    specialized_objectives: List[str] = None
    
    def __post_init__(self):
        if self.specialized_objectives is None:
            self.specialized_objectives = []

@dataclass
class DistillationResult:
    """Results from model distillation"""
    
    # Model info
    teacher_model_size: int
    student_model_size: int
    compression_ratio: float
    
    # Performance metrics
    teacher_accuracy: float
    student_accuracy: float
    performance_retention: float
    
    # Efficiency metrics
    inference_speedup: float
    memory_reduction: float
    model_size_mb: float
    
    # Training metrics
    training_time_hours: float
    final_distillation_loss: float
    convergence_epoch: int
    
    # Deployment metrics
    latency_ms: float
    throughput_qps: float
    energy_efficiency: Optional[float] = None
    
    # Quality assessment
    task_specific_scores: Dict[str, float] = None
    robustness_score: float = 0.0
    
    # Metadata
    distillation_config: str = ""
    timestamp: str = ""
    
    def __post_init__(self):
        if self.task_specific_scores is None:
            self.task_specific_scores = {}
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

class AttentionDistillationLoss(nn.Module):
    """Loss function for attention distillation"""
    
    def __init__(self, temperature: float = 4.0):
        super().__init__()
        self.temperature = temperature
        self.mse_loss = nn.MSELoss()
    
    def forward(
        self,
        student_attentions: List[torch.Tensor],
        teacher_attentions: List[torch.Tensor]
    ) -> torch.Tensor:
        """
        Compute attention distillation loss
        
        Args:
            student_attentions: List of attention matrices from student
            teacher_attentions: List of attention matrices from teacher
            
        Returns:
            Attention distillation loss
        """
        
        total_loss = 0.0
        num_layers = min(len(student_attentions), len(teacher_attentions))
        
        for i in range(num_layers):
            student_attn = student_attentions[i]
            teacher_attn = teacher_attentions[i]
            
            # Ensure same dimensions
            if student_attn.shape != teacher_attn.shape:
                # Interpolate or average to match dimensions
                teacher_attn = self._align_attention_dims(teacher_attn, student_attn.shape)
            
            # Normalize attention weights
            student_attn = F.softmax(student_attn / self.temperature, dim=-1)
            teacher_attn = F.softmax(teacher_attn / self.temperature, dim=-1)
            
            # Compute MSE loss
            layer_loss = self.mse_loss(student_attn, teacher_attn)
            total_loss += layer_loss
        
        return total_loss / num_layers if num_layers > 0 else torch.tensor(0.0)
    
    def _align_attention_dims(
        self,
        teacher_attn: torch.Tensor,
        target_shape: torch.Size
    ) -> torch.Tensor:
        """Align teacher attention dimensions to student"""
        
        # Simple averaging strategy for dimension mismatch
        if len(teacher_attn.shape) == 4 and len(target_shape) == 4:
            # [batch, heads, seq, seq]
            if teacher_attn.shape[1] > target_shape[1]:  # More heads
                # Average over excess heads
                heads_per_group = teacher_attn.shape[1] // target_shape[1]
                teacher_attn = teacher_attn.view(
                    teacher_attn.shape[0], target_shape[1], heads_per_group,
                    teacher_attn.shape[2], teacher_attn.shape[3]
                ).mean(dim=2)
        
        return teacher_attn

class FeatureDistillationLoss(nn.Module):
    """Loss function for feature distillation"""
    
    def __init__(self, projection_dim: Optional[int] = None):
        super().__init__()
        self.projection_dim = projection_dim
        self.mse_loss = nn.MSELoss()
        self.projections = {}
    
    def forward(
        self,
        student_features: List[torch.Tensor],
        teacher_features: List[torch.Tensor]
    ) -> torch.Tensor:
        """
        Compute feature distillation loss
        
        Args:
            student_features: List of feature maps from student
            teacher_features: List of feature maps from teacher
            
        Returns:
            Feature distillation loss
        """
        
        total_loss = 0.0
        num_layers = min(len(student_features), len(teacher_features))
        
        for i in range(num_layers):
            student_feat = student_features[i]
            teacher_feat = teacher_features[i]
            
            # Project to same dimension if needed
            if student_feat.shape[-1] != teacher_feat.shape[-1]:
                teacher_feat = self._project_features(
                    teacher_feat, student_feat.shape[-1], layer_idx=i
                )
            
            # Normalize features
            student_feat = F.normalize(student_feat, p=2, dim=-1)
            teacher_feat = F.normalize(teacher_feat, p=2, dim=-1)
            
            # Compute MSE loss
            layer_loss = self.mse_loss(student_feat, teacher_feat)
            total_loss += layer_loss
        
        return total_loss / num_layers if num_layers > 0 else torch.tensor(0.0)
    
    def _project_features(
        self,
        features: torch.Tensor,
        target_dim: int,
        layer_idx: int
    ) -> torch.Tensor:
        """Project features to target dimension"""
        
        if layer_idx not in self.projections:
            input_dim = features.shape[-1]
            self.projections[layer_idx] = nn.Linear(input_dim, target_dim)
            
            # Move to same device as features
            self.projections[layer_idx] = self.projections[layer_idx].to(features.device)
        
        return self.projections[layer_idx](features)

class ProgressiveDistillationTrainer:
    """
    Progressive distillation trainer that gradually reduces model size
    """
    
    def __init__(self, config: DistillationConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.accelerator = Accelerator()
        
        # Initialize tracking
        if self.accelerator.is_main_process:
            wandb.init(project="model-distillation", config=asdict(config))
            mlflow.start_run()
    
    def progressive_distill(
        self,
        teacher_model: nn.Module,
        train_dataloader: DataLoader,
        eval_dataloader: DataLoader,
        stages: List[float] = [0.8, 0.6, 0.4]
    ) -> List[Tuple[nn.Module, DistillationResult]]:
        """
        Perform progressive distillation with multiple compression stages
        
        Args:
            teacher_model: Teacher model to distill from
            train_dataloader: Training data
            eval_dataloader: Evaluation data
            stages: List of compression ratios for each stage
            
        Returns:
            List of (student_model, distillation_result) tuples
        """
        
        results = []
        current_teacher = teacher_model
        
        for stage_idx, compression_ratio in enumerate(stages):
            self.logger.info(f"Progressive distillation stage {stage_idx + 1}: {compression_ratio}")
            
            # Create student model for this stage
            student_model = self._create_student_model(current_teacher, compression_ratio)
            
            # Distill current teacher to student
            distillation_result = self.distill_model(
                current_teacher,
                student_model,
                train_dataloader,
                eval_dataloader
            )
            
            results.append((student_model, distillation_result))
            
            # Use current student as teacher for next stage
            current_teacher = student_model
            
            self.logger.info(f"Stage {stage_idx + 1} completed. "
                           f"Compression: {distillation_result.compression_ratio:.2f}, "
                           f"Performance retention: {distillation_result.performance_retention:.3f}")
        
        return results
    
    def distill_model(
        self,
        teacher_model: nn.Module,
        student_model: nn.Module,
        train_dataloader: DataLoader,
        eval_dataloader: DataLoader
    ) -> DistillationResult:
        """
        Perform model distillation
        
        Args:
            teacher_model: Teacher model
            student_model: Student model to train
            train_dataloader: Training data
            eval_dataloader: Evaluation data
            
        Returns:
            Distillation results
        """
        
        start_time = time.time()
        
        # Setup models
        teacher_model.eval()
        student_model.train()
        
        # Setup optimizer and scheduler
        optimizer = optim.AdamW(student_model.parameters(), lr=self.config.learning_rate)
        
        total_steps = len(train_dataloader) * self.config.num_epochs
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=self.config.warmup_steps,
            num_training_steps=total_steps
        )
        
        # Setup loss functions
        distillation_loss_fn = self._get_distillation_loss_function()
        
        # Prepare with accelerator
        student_model, optimizer, train_dataloader, eval_dataloader = self.accelerator.prepare(
            student_model, optimizer, train_dataloader, eval_dataloader
        )
        
        # Training loop
        best_performance = 0.0
        convergence_epoch = self.config.num_epochs
        
        for epoch in range(self.config.num_epochs):
            epoch_loss = self._train_epoch(
                teacher_model, student_model, train_dataloader,
                optimizer, scheduler, distillation_loss_fn
            )
            
            # Evaluation
            eval_metrics = self._evaluate_model(student_model, eval_dataloader)
            
            # Check for convergence
            if eval_metrics['accuracy'] > best_performance:
                best_performance = eval_metrics['accuracy']
                convergence_epoch = epoch
            
            # Logging
            if self.accelerator.is_main_process:
                self._log_metrics(epoch, epoch_loss, eval_metrics)
            
            self.logger.info(f"Epoch {epoch + 1}/{self.config.num_epochs}, "
                           f"Loss: {epoch_loss:.4f}, "
                           f"Accuracy: {eval_metrics['accuracy']:.4f}")
        
        # Final evaluation
        teacher_performance = self._evaluate_teacher(teacher_model, eval_dataloader)
        student_performance = self._evaluate_model(student_model, eval_dataloader)
        
        # Calculate efficiency metrics
        efficiency_metrics = self._calculate_efficiency_metrics(
            teacher_model, student_model, eval_dataloader
        )
        
        # Create result
        training_time = (time.time() - start_time) / 3600  # Convert to hours
        
        result = DistillationResult(
            teacher_model_size=self._count_parameters(teacher_model),
            student_model_size=self._count_parameters(student_model),
            compression_ratio=self._count_parameters(student_model) / self._count_parameters(teacher_model),
            teacher_accuracy=teacher_performance['accuracy'],
            student_accuracy=student_performance['accuracy'],
            performance_retention=student_performance['accuracy'] / teacher_performance['accuracy'],
            inference_speedup=efficiency_metrics['speedup'],
            memory_reduction=efficiency_metrics['memory_reduction'],
            model_size_mb=efficiency_metrics['model_size_mb'],
            training_time_hours=training_time,
            final_distillation_loss=epoch_loss,
            convergence_epoch=convergence_epoch,
            latency_ms=efficiency_metrics['latency_ms'],
            throughput_qps=efficiency_metrics['throughput_qps'],
            distillation_config=json.dumps(asdict(self.config), indent=2)
        )
        
        # Save model
        self._save_distilled_model(student_model, result)
        
        return result
    
    def _train_epoch(
        self,
        teacher_model: nn.Module,
        student_model: nn.Module,
        dataloader: DataLoader,
        optimizer: optim.Optimizer,
        scheduler: optim.lr_scheduler._LRScheduler,
        distillation_loss_fn: Callable
    ) -> float:
        """Train one epoch"""
        
        total_loss = 0.0
        num_batches = 0
        
        for batch in dataloader:
            optimizer.zero_grad()
            
            # Forward pass through teacher
            with torch.no_grad():
                teacher_outputs = teacher_model(**batch)
            
            # Forward pass through student
            student_outputs = student_model(**batch)
            
            # Compute distillation loss
            loss = distillation_loss_fn(student_outputs, teacher_outputs, batch)
            
            # Backward pass
            self.accelerator.backward(loss)
            optimizer.step()
            scheduler.step()
            
            total_loss += loss.item()
            num_batches += 1
        
        return total_loss / num_batches
    
    def _get_distillation_loss_function(self) -> Callable:
        """Get appropriate distillation loss function"""
        
        if self.config.distillation_type == DistillationType.KNOWLEDGE_DISTILLATION:
            return self._knowledge_distillation_loss
        elif self.config.distillation_type == DistillationType.ATTENTION_DISTILLATION:
            attention_loss = AttentionDistillationLoss(self.config.temperature)
            return lambda s_out, t_out, batch: self._attention_distillation_loss(s_out, t_out, batch, attention_loss)
        elif self.config.distillation_type == DistillationType.FEATURE_DISTILLATION:
            feature_loss = FeatureDistillationLoss()
            return lambda s_out, t_out, batch: self._feature_distillation_loss(s_out, t_out, batch, feature_loss)
        else:
            return self._knowledge_distillation_loss
    
    def _knowledge_distillation_loss(
        self,
        student_outputs: Dict[str, torch.Tensor],
        teacher_outputs: Dict[str, torch.Tensor],
        batch: Dict[str, torch.Tensor]
    ) -> torch.Tensor:
        """Compute knowledge distillation loss"""
        
        # Soft target loss (distillation)
        student_logits = student_outputs['logits']
        teacher_logits = teacher_outputs['logits']
        
        soft_targets = F.softmax(teacher_logits / self.config.temperature, dim=-1)
        soft_predictions = F.log_softmax(student_logits / self.config.temperature, dim=-1)
        
        soft_loss = F.kl_div(
            soft_predictions, soft_targets, reduction='batchmean'
        ) * (self.config.temperature ** 2)
        
        # Hard target loss (ground truth)
        if 'labels' in batch:
            hard_loss = F.cross_entropy(student_logits, batch['labels'])
        else:
            hard_loss = torch.tensor(0.0, device=student_logits.device)
        
        # Combined loss
        total_loss = (
            self.config.soft_target_loss_weight * soft_loss +
            self.config.hard_target_loss_weight * hard_loss
        )
        
        return total_loss
    
    def _attention_distillation_loss(
        self,
        student_outputs: Dict[str, torch.Tensor],
        teacher_outputs: Dict[str, torch.Tensor],
        batch: Dict[str, torch.Tensor],
        attention_loss_fn: AttentionDistillationLoss
    ) -> torch.Tensor:
        """Compute attention-based distillation loss"""
        
        # Knowledge distillation loss
        kd_loss = self._knowledge_distillation_loss(student_outputs, teacher_outputs, batch)
        
        # Attention distillation loss
        if 'attentions' in student_outputs and 'attentions' in teacher_outputs:
            attention_loss = attention_loss_fn(
                student_outputs['attentions'],
                teacher_outputs['attentions']
            )
            
            total_loss = (
                (1 - self.config.attention_loss_weight) * kd_loss +
                self.config.attention_loss_weight * attention_loss
            )
        else:
            total_loss = kd_loss
        
        return total_loss
    
    def _feature_distillation_loss(
        self,
        student_outputs: Dict[str, torch.Tensor],
        teacher_outputs: Dict[str, torch.Tensor],
        batch: Dict[str, torch.Tensor],
        feature_loss_fn: FeatureDistillationLoss
    ) -> torch.Tensor:
        """Compute feature-based distillation loss"""
        
        # Knowledge distillation loss
        kd_loss = self._knowledge_distillation_loss(student_outputs, teacher_outputs, batch)
        
        # Feature distillation loss
        if 'hidden_states' in student_outputs and 'hidden_states' in teacher_outputs:
            feature_loss = feature_loss_fn(
                student_outputs['hidden_states'],
                teacher_outputs['hidden_states']
            )
            
            total_loss = (
                (1 - self.config.feature_loss_weight) * kd_loss +
                self.config.feature_loss_weight * feature_loss
            )
        else:
            total_loss = kd_loss
        
        return total_loss
    
    def _evaluate_model(
        self,
        model: nn.Module,
        dataloader: DataLoader
    ) -> Dict[str, float]:
        """Evaluate model performance"""
        
        model.eval()
        
        all_predictions = []
        all_labels = []
        total_loss = 0.0
        num_batches = 0
        
        with torch.no_grad():
            for batch in dataloader:
                outputs = model(**batch)
                
                if 'logits' in outputs:
                    predictions = torch.argmax(outputs['logits'], dim=-1)
                    all_predictions.extend(predictions.cpu().numpy())
                
                if 'labels' in batch:
                    all_labels.extend(batch['labels'].cpu().numpy())
                
                if 'loss' in outputs:
                    total_loss += outputs['loss'].item()
                    num_batches += 1
        
        model.train()
        
        metrics = {}
        
        if all_predictions and all_labels:
            metrics['accuracy'] = accuracy_score(all_labels, all_predictions)
            metrics['f1'] = f1_score(all_labels, all_predictions, average='weighted')
        
        if num_batches > 0:
            metrics['loss'] = total_loss / num_batches
        
        return metrics
    
    def _evaluate_teacher(
        self,
        teacher_model: nn.Module,
        dataloader: DataLoader
    ) -> Dict[str, float]:
        """Evaluate teacher model performance"""
        return self._evaluate_model(teacher_model, dataloader)
    
    def _calculate_efficiency_metrics(
        self,
        teacher_model: nn.Module,
        student_model: nn.Module,
        dataloader: DataLoader
    ) -> Dict[str, float]:
        """Calculate efficiency metrics"""
        
        # Measure inference speed
        teacher_time = self._measure_inference_time(teacher_model, dataloader)
        student_time = self._measure_inference_time(student_model, dataloader)
        
        speedup = teacher_time / student_time if student_time > 0 else 1.0
        
        # Calculate model sizes
        teacher_size = self._calculate_model_size_mb(teacher_model)
        student_size = self._calculate_model_size_mb(student_model)
        
        memory_reduction = (teacher_size - student_size) / teacher_size
        
        # Estimate throughput
        batch_size = next(iter(dataloader))[list(next(iter(dataloader)).keys())[0]].shape[0]
        throughput = batch_size / student_time if student_time > 0 else 0.0
        
        return {
            'speedup': speedup,
            'memory_reduction': memory_reduction,
            'model_size_mb': student_size,
            'latency_ms': student_time * 1000,
            'throughput_qps': throughput
        }
    
    def _measure_inference_time(
        self,
        model: nn.Module,
        dataloader: DataLoader,
        num_batches: int = 10
    ) -> float:
        """Measure average inference time"""
        
        model.eval()
        
        times = []
        
        with torch.no_grad():
            for i, batch in enumerate(dataloader):
                if i >= num_batches:
                    break
                
                start_time = time.time()
                _ = model(**batch)
                end_time = time.time()
                
                times.append(end_time - start_time)
        
        model.train()
        
        return np.mean(times) if times else 0.0
    
    def _calculate_model_size_mb(self, model: nn.Module) -> float:
        """Calculate model size in MB"""
        
        param_size = 0
        for param in model.parameters():
            param_size += param.nelement() * param.element_size()
        
        buffer_size = 0
        for buffer in model.buffers():
            buffer_size += buffer.nelement() * buffer.element_size()
        
        size_mb = (param_size + buffer_size) / (1024 ** 2)
        return size_mb
    
    def _count_parameters(self, model: nn.Module) -> int:
        """Count number of parameters in model"""
        return sum(p.numel() for p in model.parameters())
    
    def _create_student_model(
        self,
        teacher_model: nn.Module,
        compression_ratio: float
    ) -> nn.Module:
        """Create student model based on teacher and compression ratio"""
        
        # This is a simplified version - in practice, you'd use more sophisticated
        # architecture search or predefined smaller architectures
        
        if hasattr(teacher_model, 'config'):
            teacher_config = teacher_model.config
            
            # Scale down dimensions
            student_config = teacher_config.__class__(
                hidden_size=int(teacher_config.hidden_size * compression_ratio),
                num_hidden_layers=max(1, int(teacher_config.num_hidden_layers * compression_ratio)),
                num_attention_heads=max(1, int(teacher_config.num_attention_heads * compression_ratio)),
                intermediate_size=int(teacher_config.intermediate_size * compression_ratio),
                vocab_size=teacher_config.vocab_size
            )
            
            # Create student model
            student_model = teacher_model.__class__(student_config)
        else:
            # Fallback for models without config
            student_model = self._create_generic_student_model(teacher_model, compression_ratio)
        
        return student_model
    
    def _create_generic_student_model(
        self,
        teacher_model: nn.Module,
        compression_ratio: float
    ) -> nn.Module:
        """Create generic student model"""
        
        # Simplified generic student creation
        # In practice, this would be more sophisticated
        
        class SimpleStudentModel(nn.Module):
            def __init__(self, input_size: int, hidden_size: int, output_size: int):
                super().__init__()
                self.layers = nn.Sequential(
                    nn.Linear(input_size, hidden_size),
                    nn.ReLU(),
                    nn.Linear(hidden_size, hidden_size // 2),
                    nn.ReLU(),
                    nn.Linear(hidden_size // 2, output_size)
                )
            
            def forward(self, **inputs):
                # Simplified forward pass
                x = inputs[list(inputs.keys())[0]]
                if len(x.shape) > 2:
                    x = x.view(x.shape[0], -1)
                
                logits = self.layers(x)
                return {'logits': logits}
        
        # Estimate dimensions
        sample_input = torch.randn(1, 100)  # Simplified
        with torch.no_grad():
            teacher_output = teacher_model(sample_input)
        
        if isinstance(teacher_output, dict) and 'logits' in teacher_output:
            output_size = teacher_output['logits'].shape[-1]
        else:
            output_size = 10  # Default
        
        hidden_size = int(256 * compression_ratio)
        
        return SimpleStudentModel(100, hidden_size, output_size)
    
    def _log_metrics(
        self,
        epoch: int,
        loss: float,
        eval_metrics: Dict[str, float]
    ):
        """Log training metrics"""
        
        metrics = {
            'epoch': epoch,
            'train_loss': loss,
            **{f'eval_{k}': v for k, v in eval_metrics.items()}
        }
        
        # Log to wandb
        wandb.log(metrics)
        
        # Log to mlflow
        for key, value in metrics.items():
            mlflow.log_metric(key, value, step=epoch)
    
    def _save_distilled_model(
        self,
        model: nn.Module,
        result: DistillationResult
    ):
        """Save distilled model and results"""
        
        output_dir = Path(self.config.output_dir)
        output_dir.mkdir(exist_ok=True)
        
        # Save model
        model_path = output_dir / f"distilled_model_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pt"
        torch.save(model.state_dict(), model_path)
        
        # Save results
        results_path = output_dir / f"distillation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_path, 'w') as f:
            json.dump(asdict(result), f, indent=2, default=str)
        
        self.logger.info(f"Distilled model saved to {model_path}")
        self.logger.info(f"Results saved to {results_path}")

class TaskSpecificDistillation:
    """
    Task-specific distillation for domain applications
    """
    
    def __init__(self, industry: IndustryType):
        self.industry = industry
        self.logger = logging.getLogger(__name__)
    
    def create_task_specific_config(
        self,
        base_config: DistillationConfig,
        task_requirements: Dict[str, Any]
    ) -> DistillationConfig:
        """Create task-specific distillation configuration"""
        
        config = base_config
        
        # Industry-specific adjustments
        if self.industry == IndustryType.FINANCIAL_SERVICES:
            config = self._adjust_for_financial_services(config, task_requirements)
        elif self.industry == IndustryType.HEALTHCARE:
            config = self._adjust_for_healthcare(config, task_requirements)
        elif self.industry == IndustryType.MANUFACTURING:
            config = self._adjust_for_manufacturing(config, task_requirements)
        elif self.industry == IndustryType.TECHNOLOGY:
            config = self._adjust_for_technology(config, task_requirements)
        
        return config
    
    def _adjust_for_financial_services(
        self,
        config: DistillationConfig,
        requirements: Dict[str, Any]
    ) -> DistillationConfig:
        """Adjust configuration for financial services"""
        
        # Prioritize accuracy and compliance
        config.soft_target_loss_weight = 0.8
        config.hard_target_loss_weight = 0.2
        
        # Conservative compression for critical applications
        if requirements.get('critical_application', False):
            config.compression_ratio = max(config.compression_ratio, 0.7)
        
        # Add compliance objectives
        config.specialized_objectives.extend([
            'maintain_regulatory_compliance',
            'preserve_risk_assessment_accuracy',
            'retain_fraud_detection_capability'
        ])
        
        return config
    
    def _adjust_for_healthcare(
        self,
        config: DistillationConfig,
        requirements: Dict[str, Any]
    ) -> DistillationConfig:
        """Adjust configuration for healthcare"""
        
        # Prioritize safety and accuracy
        config.soft_target_loss_weight = 0.9
        config.hard_target_loss_weight = 0.1
        
        # Very conservative compression for clinical applications
        if requirements.get('clinical_decision_support', False):
            config.compression_ratio = max(config.compression_ratio, 0.8)
        
        # Add healthcare-specific objectives
        config.specialized_objectives.extend([
            'maintain_diagnostic_accuracy',
            'preserve_patient_safety_features',
            'retain_medical_knowledge'
        ])
        
        return config
    
    def _adjust_for_manufacturing(
        self,
        config: DistillationConfig,
        requirements: Dict[str, Any]
    ) -> DistillationConfig:
        """Adjust configuration for manufacturing"""
        
        # Balance accuracy and efficiency
        config.soft_target_loss_weight = 0.7
        config.hard_target_loss_weight = 0.3
        
        # More aggressive compression for edge deployment
        if requirements.get('edge_deployment', False):
            config.compression_ratio = min(config.compression_ratio, 0.3)
            config.use_quantization = True
        
        # Add manufacturing objectives
        config.specialized_objectives.extend([
            'maintain_quality_control_accuracy',
            'preserve_process_optimization_capability',
            'retain_predictive_maintenance_features'
        ])
        
        return config
    
    def _adjust_for_technology(
        self,
        config: DistillationConfig,
        requirements: Dict[str, Any]
    ) -> DistillationConfig:
        """Adjust configuration for technology sector"""
        
        # Balanced approach
        config.soft_target_loss_weight = 0.7
        config.hard_target_loss_weight = 0.3
        
        # Flexible compression based on deployment target
        if requirements.get('mobile_deployment', False):
            config.compression_ratio = min(config.compression_ratio, 0.4)
            config.use_quantization = True
        
        # Add technology objectives
        config.specialized_objectives.extend([
            'maintain_code_analysis_capability',
            'preserve_system_design_knowledge',
            'retain_performance_optimization_insights'
        ])
        
        return config

class DistillationPipeline:
    """
    Complete distillation pipeline for business deployment
    """
    
    def __init__(self, base_config: DistillationConfig):
        self.base_config = base_config
        self.logger = logging.getLogger(__name__)
        self.results_history = []
    
    def run_comprehensive_distillation(
        self,
        teacher_model: nn.Module,
        train_dataloader: DataLoader,
        eval_dataloader: DataLoader,
        deployment_targets: List[Dict[str, Any]]
    ) -> Dict[str, DistillationResult]:
        """
        Run comprehensive distillation for multiple deployment targets
        
        Args:
            teacher_model: Teacher model to distill
            train_dataloader: Training data
            eval_dataloader: Evaluation data
            deployment_targets: List of deployment target specifications
            
        Returns:
            Dictionary mapping target name to distillation results
        """
        
        results = {}
        
        for target in deployment_targets:
            target_name = target['name']
            target_config = self._create_target_config(target)
            
            self.logger.info(f"Starting distillation for target: {target_name}")
            
            # Create trainer
            trainer = ProgressiveDistillationTrainer(target_config)
            
            # Create student model
            student_model = trainer._create_student_model(
                teacher_model, target_config.compression_ratio
            )
            
            # Run distillation
            result = trainer.distill_model(
                teacher_model, student_model, train_dataloader, eval_dataloader
            )
            
            # Store result
            results[target_name] = result
            self.results_history.append(result)
            
            self.logger.info(f"Distillation completed for {target_name}: "
                           f"Compression {result.compression_ratio:.2f}, "
                           f"Performance retention {result.performance_retention:.3f}")
        
        # Generate comparison report
        self._generate_comparison_report(results)
        
        return results
    
    def _create_target_config(self, target_spec: Dict[str, Any]) -> DistillationConfig:
        """Create configuration for specific deployment target"""
        
        config = DistillationConfig(**asdict(self.base_config))
        
        # Apply target-specific adjustments
        if 'compression_ratio' in target_spec:
            config.compression_ratio = target_spec['compression_ratio']
        
        if 'latency_requirement_ms' in target_spec:
            # Adjust compression based on latency requirements
            if target_spec['latency_requirement_ms'] < 100:
                config.compression_ratio = min(config.compression_ratio, 0.3)
                config.use_quantization = True
        
        if 'accuracy_threshold' in target_spec:
            # Adjust loss weights based on accuracy requirements
            threshold = target_spec['accuracy_threshold']
            if threshold > 0.95:
                config.soft_target_loss_weight = 0.9
        
        if 'mobile_deployment' in target_spec and target_spec['mobile_deployment']:
            config.compression_ratio = min(config.compression_ratio, 0.4)
            config.use_quantization = True
            config.quantization_bits = 8
        
        if 'edge_deployment' in target_spec and target_spec['edge_deployment']:
            config.compression_ratio = min(config.compression_ratio, 0.2)
            config.use_quantization = True
            config.use_pruning = True
        
        return config
    
    def _generate_comparison_report(self, results: Dict[str, DistillationResult]):
        """Generate comparison report for different distillation targets"""
        
        import pandas as pd
        import matplotlib.pyplot as plt
        
        # Create comparison dataframe
        comparison_data = []
        
        for target_name, result in results.items():
            comparison_data.append({
                'Target': target_name,
                'Compression Ratio': result.compression_ratio,
                'Performance Retention': result.performance_retention,
                'Speedup': result.inference_speedup,
                'Memory Reduction': result.memory_reduction,
                'Model Size (MB)': result.model_size_mb,
                'Latency (ms)': result.latency_ms
            })
        
        df = pd.DataFrame(comparison_data)
        
        # Save comparison table
        output_path = Path(self.base_config.output_dir) / f"distillation_comparison_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        df.to_csv(output_path, index=False)
        
        # Generate visualizations
        self._create_comparison_plots(df)
        
        self.logger.info(f"Comparison report saved to {output_path}")
    
    def _create_comparison_plots(self, df: pd.DataFrame):
        """Create comparison plots"""
        
        fig, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # Performance retention vs compression
        axes[0, 0].scatter(df['Compression Ratio'], df['Performance Retention'])
        axes[0, 0].set_xlabel('Compression Ratio')
        axes[0, 0].set_ylabel('Performance Retention')
        axes[0, 0].set_title('Performance vs Compression Trade-off')
        
        # Speedup vs compression
        axes[0, 1].scatter(df['Compression Ratio'], df['Speedup'])
        axes[0, 1].set_xlabel('Compression Ratio')
        axes[0, 1].set_ylabel('Inference Speedup')
        axes[0, 1].set_title('Speedup vs Compression')
        
        # Model size comparison
        axes[1, 0].bar(df['Target'], df['Model Size (MB)'])
        axes[1, 0].set_xlabel('Deployment Target')
        axes[1, 0].set_ylabel('Model Size (MB)')
        axes[1, 0].set_title('Model Size by Target')
        axes[1, 0].tick_params(axis='x', rotation=45)
        
        # Latency comparison
        axes[1, 1].bar(df['Target'], df['Latency (ms)'])
        axes[1, 1].set_xlabel('Deployment Target')
        axes[1, 1].set_ylabel('Latency (ms)')
        axes[1, 1].set_title('Latency by Target')
        axes[1, 1].tick_params(axis='x', rotation=45)
        
        plt.tight_layout()
        
        # Save plot
        plot_path = Path(self.base_config.output_dir) / f"distillation_comparison_plots_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        plt.savefig(plot_path, dpi=300, bbox_inches='tight')
        plt.close()
    
    def optimize_for_deployment(
        self,
        model: nn.Module,
        target_specs: Dict[str, Any]
    ) -> nn.Module:
        """
        Optimize model for specific deployment requirements
        
        Args:
            model: Model to optimize
            target_specs: Deployment specifications
            
        Returns:
            Optimized model
        """
        
        optimized_model = model
        
        # Apply quantization if required
        if target_specs.get('use_quantization', False):
            optimized_model = self._apply_quantization(
                optimized_model,
                bits=target_specs.get('quantization_bits', 8)
            )
        
        # Apply pruning if required
        if target_specs.get('use_pruning', False):
            optimized_model = self._apply_pruning(
                optimized_model,
                ratio=target_specs.get('pruning_ratio', 0.2)
            )
        
        return optimized_model
    
    def _apply_quantization(self, model: nn.Module, bits: int = 8) -> nn.Module:
        """Apply quantization to model"""
        
        # Simplified quantization - in practice, use torch.quantization
        if bits == 8:
            # INT8 quantization
            model.qconfig = torch.quantization.get_default_qconfig('fbgemm')
            torch.quantization.prepare(model, inplace=True)
            # Calibration would happen here with representative data
            torch.quantization.convert(model, inplace=True)
        
        return model
    
    def _apply_pruning(self, model: nn.Module, ratio: float = 0.2) -> nn.Module:
        """Apply pruning to model"""
        
        # Simplified pruning - in practice, use torch.nn.utils.prune
        import torch.nn.utils.prune as prune
        
        for name, module in model.named_modules():
            if isinstance(module, (nn.Linear, nn.Conv2d)):
                prune.l1_unstructured(module, name='weight', amount=ratio)
                prune.remove(module, 'weight')
        
        return model
