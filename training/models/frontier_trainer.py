"""
Frontier-1 Model Training Pipeline

Complete training pipeline for the Frontier-1 business operations model
including fine-tuning, distributed training, and model optimization.
"""

import os
import json
import math
import time
import logging
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path
from dataclasses import dataclass, asdict
from datetime import datetime
import numpy as np
import random

# PyTorch and training libraries
import torch
import torch.nn as nn
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler, Dataset
from torch.cuda.amp import GradScaler, autocast
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR, OneCycleLR

# Transformers and HuggingFace
from transformers import (
    AutoTokenizer, AutoModelForCausalLM, AutoConfig,
    TrainingArguments, Trainer, TrainerCallback,
    get_linear_schedule_with_warmup, get_cosine_schedule_with_warmup
)
from transformers.trainer_utils import PREFIX_CHECKPOINT_DIR
from peft import LoraConfig, get_peft_model, TaskType, PeftModel

# Data processing
import pandas as pd
from datasets import Dataset as HFDataset, load_dataset

# Monitoring and visualization
import wandb
from tensorboardX import SummaryWriter

# Custom imports
from ..evaluation.business_metrics import BusinessEvaluationSuite
from ..data_preprocessing.business_document_processor import BusinessDocumentPreprocessor

logger = logging.getLogger(__name__)

@dataclass
class TrainingConfig:
    """Training configuration parameters"""
    
    # Model configuration
    model_name: str = "microsoft/DialoGPT-large"
    model_max_length: int = 1024
    use_lora: bool = True
    lora_rank: int = 16
    lora_alpha: int = 32
    lora_dropout: float = 0.05
    
    # Training parameters
    learning_rate: float = 5e-5
    weight_decay: float = 0.01
    num_epochs: int = 10
    batch_size: int = 8
    gradient_accumulation_steps: int = 4
    max_grad_norm: float = 1.0
    warmup_ratio: float = 0.1
    
    # Optimization
    optimizer_type: str = "adamw"
    scheduler_type: str = "cosine"
    use_mixed_precision: bool = True
    dataloader_num_workers: int = 4
    
    # Distributed training
    use_distributed: bool = False
    local_rank: int = -1
    world_size: int = 1
    
    # Checkpointing
    save_steps: int = 500
    eval_steps: int = 250
    logging_steps: int = 50
    max_checkpoints: int = 5
    
    # Data
    train_file: str = ""
    eval_file: str = ""
    max_train_samples: Optional[int] = None
    max_eval_samples: Optional[int] = None
    
    # Output
    output_dir: str = "./checkpoints"
    run_name: str = f"frontier-1-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
    
    # Monitoring
    use_wandb: bool = True
    wandb_project: str = "frontier-1-training"
    use_tensorboard: bool = True
    
    # Model specialization
    business_domain: str = "general"  # financial, regulatory, strategic
    task_type: str = "causal_lm"  # causal_lm, seq2seq, classification

@dataclass
class TrainingState:
    """Training state tracking"""
    epoch: int = 0
    global_step: int = 0
    best_eval_loss: float = float('inf')
    best_eval_metric: float = 0.0
    train_loss: float = 0.0
    eval_loss: float = 0.0
    learning_rate: float = 0.0
    is_training: bool = False
    
class BusinessDataset(Dataset):
    """Custom dataset for business documents"""
    
    def __init__(
        self, 
        data: List[Dict[str, Any]], 
        tokenizer, 
        max_length: int = 1024,
        document_types: Optional[List[str]] = None
    ):
        self.data = data
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.document_types = document_types or []
        
        # Filter by document types if specified
        if self.document_types:
            self.data = [
                item for item in self.data 
                if item.get('document_type') in self.document_types
            ]
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        text = item['text']
        
        # Add special tokens for business context
        if 'document_type' in item:
            text = f"[{item['document_type'].upper()}] {text}"
        
        # Tokenize
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': encoding['input_ids'].flatten().clone()
        }

class BusinessTrainer(Trainer):
    """Custom trainer for business model training"""
    
    def __init__(self, config: TrainingConfig, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.training_config = config
        self.business_evaluator = BusinessEvaluationSuite()
        
    def compute_loss(self, model, inputs, return_outputs=False):
        """Custom loss computation"""
        labels = inputs.get("labels")
        outputs = model(**inputs)
        
        # Standard language modeling loss
        logits = outputs.get("logits")
        loss_fct = nn.CrossEntropyLoss(ignore_index=-100)
        
        # Shift labels for causal LM
        shift_logits = logits[..., :-1, :].contiguous()
        shift_labels = labels[..., 1:].contiguous()
        
        loss = loss_fct(
            shift_logits.view(-1, shift_logits.size(-1)), 
            shift_labels.view(-1)
        )
        
        return (loss, outputs) if return_outputs else loss
    
    def evaluate(self, eval_dataset=None, ignore_keys=None, metric_key_prefix="eval"):
        """Custom evaluation with business metrics"""
        # Standard evaluation
        eval_results = super().evaluate(eval_dataset, ignore_keys, metric_key_prefix)
        
        # Add business-specific metrics
        if eval_dataset is not None:
            business_metrics = self._compute_business_metrics(eval_dataset)
            eval_results.update({
                f"{metric_key_prefix}_{k}": v 
                for k, v in business_metrics.items()
            })
        
        return eval_results
    
    def _compute_business_metrics(self, eval_dataset) -> Dict[str, float]:
        """Compute business-specific evaluation metrics"""
        # Sample evaluation examples
        sample_size = min(100, len(eval_dataset))
        eval_samples = [eval_dataset[i] for i in range(sample_size)]
        
        # Generate predictions
        predictions = []
        references = []
        
        self.model.eval()
        with torch.no_grad():
            for sample in eval_samples:
                input_ids = sample['input_ids'].unsqueeze(0).to(self.model.device)
                attention_mask = sample['attention_mask'].unsqueeze(0).to(self.model.device)
                
                # Generate response
                outputs = self.model.generate(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    max_length=input_ids.size(1) + 50,
                    num_return_sequences=1,
                    temperature=0.7,
                    do_sample=True,
                    pad_token_id=self.tokenizer.pad_token_id
                )
                
                # Decode prediction
                pred_text = self.tokenizer.decode(
                    outputs[0][input_ids.size(1):], 
                    skip_special_tokens=True
                )
                ref_text = self.tokenizer.decode(
                    sample['labels'], 
                    skip_special_tokens=True
                )
                
                predictions.append(pred_text)
                references.append(ref_text)
        
        # Compute business metrics
        return self.business_evaluator.evaluate_predictions(predictions, references)

class DistributedTrainingManager:
    """Manager for distributed training setup"""
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        
    def setup_distributed(self):
        """Setup distributed training"""
        if not self.config.use_distributed:
            return
        
        # Initialize distributed training
        if 'RANK' in os.environ and 'WORLD_SIZE' in os.environ:
            self.config.local_rank = int(os.environ['LOCAL_RANK'])
            self.config.world_size = int(os.environ['WORLD_SIZE'])
            
            dist.init_process_group(backend="nccl")
            torch.cuda.set_device(self.config.local_rank)
        
        logger.info(f"Distributed training setup: rank {self.config.local_rank}, world_size {self.config.world_size}")
    
    def cleanup_distributed(self):
        """Cleanup distributed training"""
        if self.config.use_distributed and dist.is_initialized():
            dist.destroy_process_group()

class TrainingPipeline:
    """Main training pipeline for Frontier-1 model"""
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.training_state = TrainingState()
        self.distributed_manager = DistributedTrainingManager(config)
        
        # Setup logging
        self._setup_logging()
        
        # Setup monitoring
        self._setup_monitoring()
        
        # Initialize model and tokenizer
        self.tokenizer = None
        self.model = None
        self.trainer = None
        
    def _setup_logging(self):
        """Setup logging configuration"""
        log_level = logging.INFO
        if self.config.local_rank not in [-1, 0]:
            log_level = logging.WARNING
        
        logging.basicConfig(
            format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
            datefmt='%m/%d/%Y %H:%M:%S',
            level=log_level
        )
    
    def _setup_monitoring(self):
        """Setup experiment monitoring"""
        if self.config.use_wandb and self.config.local_rank in [-1, 0]:
            wandb.init(
                project=self.config.wandb_project,
                name=self.config.run_name,
                config=asdict(self.config)
            )
        
        if self.config.use_tensorboard and self.config.local_rank in [-1, 0]:
            self.tensorboard_writer = SummaryWriter(
                log_dir=os.path.join(self.config.output_dir, "tensorboard")
            )
    
    def load_model_and_tokenizer(self):
        """Load model and tokenizer"""
        logger.info(f"Loading model: {self.config.model_name}")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.config.model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load model configuration
        model_config = AutoConfig.from_pretrained(self.config.model_name)
        
        # Load model
        self.model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            config=model_config,
            torch_dtype=torch.float16 if self.config.use_mixed_precision else torch.float32
        )
        
        # Resize token embeddings if needed
        self.model.resize_token_embeddings(len(self.tokenizer))
        
        # Apply LoRA if configured
        if self.config.use_lora:
            self._apply_lora()
        
        logger.info(f"Model loaded with {sum(p.numel() for p in self.model.parameters())} parameters")
    
    def _apply_lora(self):
        """Apply LoRA (Low-Rank Adaptation) to model"""
        logger.info("Applying LoRA configuration")
        
        lora_config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=self.config.lora_rank,
            lora_alpha=self.config.lora_alpha,
            lora_dropout=self.config.lora_dropout,
            target_modules=["q_proj", "k_proj", "v_proj", "o_proj"]
        )
        
        self.model = get_peft_model(self.model, lora_config)
        self.model.print_trainable_parameters()
    
    def prepare_datasets(self) -> Tuple[BusinessDataset, BusinessDataset]:
        """Prepare training and evaluation datasets"""
        logger.info("Preparing datasets")
        
        # Load training data
        with open(self.config.train_file, 'r', encoding='utf-8') as f:
            train_data = json.load(f)['train']
        
        # Load evaluation data
        with open(self.config.eval_file, 'r', encoding='utf-8') as f:
            eval_data = json.load(f)['test']
        
        # Limit samples if specified
        if self.config.max_train_samples:
            train_data = train_data[:self.config.max_train_samples]
        if self.config.max_eval_samples:
            eval_data = eval_data[:self.config.max_eval_samples]
        
        # Filter by business domain if specified
        domain_types = self._get_domain_document_types()
        
        # Create datasets
        train_dataset = BusinessDataset(
            data=train_data,
            tokenizer=self.tokenizer,
            max_length=self.config.model_max_length,
            document_types=domain_types
        )
        
        eval_dataset = BusinessDataset(
            data=eval_data,
            tokenizer=self.tokenizer,
            max_length=self.config.model_max_length,
            document_types=domain_types
        )
        
        logger.info(f"Train dataset: {len(train_dataset)} samples")
        logger.info(f"Eval dataset: {len(eval_dataset)} samples")
        
        return train_dataset, eval_dataset
    
    def _get_domain_document_types(self) -> Optional[List[str]]:
        """Get document types for specific business domain"""
        domain_mapping = {
            "financial": ["financial_statement", "annual_report", "quarterly_report"],
            "regulatory": ["regulatory_filing", "compliance_document", "audit_report"],
            "strategic": ["business_plan", "strategic_plan", "market_research"],
            "general": None  # Include all types
        }
        
        return domain_mapping.get(self.config.business_domain)
    
    def setup_trainer(self, train_dataset: BusinessDataset, eval_dataset: BusinessDataset):
        """Setup HuggingFace trainer"""
        logger.info("Setting up trainer")
        
        # Training arguments
        training_args = TrainingArguments(
            output_dir=self.config.output_dir,
            num_train_epochs=self.config.num_epochs,
            per_device_train_batch_size=self.config.batch_size,
            per_device_eval_batch_size=self.config.batch_size,
            gradient_accumulation_steps=self.config.gradient_accumulation_steps,
            learning_rate=self.config.learning_rate,
            weight_decay=self.config.weight_decay,
            max_grad_norm=self.config.max_grad_norm,
            warmup_ratio=self.config.warmup_ratio,
            lr_scheduler_type=self.config.scheduler_type,
            fp16=self.config.use_mixed_precision,
            dataloader_num_workers=self.config.dataloader_num_workers,
            save_steps=self.config.save_steps,
            eval_steps=self.config.eval_steps,
            logging_steps=self.config.logging_steps,
            evaluation_strategy="steps",
            save_strategy="steps",
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            save_total_limit=self.config.max_checkpoints,
            report_to=["wandb", "tensorboard"] if self.config.use_wandb else ["tensorboard"],
            run_name=self.config.run_name,
            local_rank=self.config.local_rank,
            ddp_find_unused_parameters=False if self.config.use_distributed else None,
            remove_unused_columns=False
        )
        
        # Create trainer
        self.trainer = BusinessTrainer(
            config=self.config,
            model=self.model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            tokenizer=self.tokenizer,
            callbacks=[TrainingMonitorCallback(self)]
        )
    
    def train(self):
        """Execute training pipeline"""
        logger.info("Starting training pipeline")
        
        try:
            # Setup distributed training
            self.distributed_manager.setup_distributed()
            
            # Load model and tokenizer
            self.load_model_and_tokenizer()
            
            # Prepare datasets
            train_dataset, eval_dataset = self.prepare_datasets()
            
            # Setup trainer
            self.setup_trainer(train_dataset, eval_dataset)
            
            # Start training
            self.training_state.is_training = True
            train_result = self.trainer.train()
            
            # Save final model
            self._save_final_model()
            
            # Log training summary
            self._log_training_summary(train_result)
            
        except Exception as e:
            logger.error(f"Training failed: {e}")
            raise
        
        finally:
            # Cleanup
            self.training_state.is_training = False
            self.distributed_manager.cleanup_distributed()
            
            if hasattr(self, 'tensorboard_writer'):
                self.tensorboard_writer.close()
            
            if self.config.use_wandb:
                wandb.finish()
    
    def _save_final_model(self):
        """Save final trained model"""
        if self.config.local_rank in [-1, 0]:
            final_model_path = os.path.join(self.config.output_dir, "final_model")
            
            if self.config.use_lora:
                # Save LoRA adapters
                self.model.save_pretrained(final_model_path)
            else:
                # Save full model
                self.trainer.save_model(final_model_path)
            
            # Save tokenizer
            self.tokenizer.save_pretrained(final_model_path)
            
            # Save training config
            config_path = os.path.join(final_model_path, "training_config.json")
            with open(config_path, 'w') as f:
                json.dump(asdict(self.config), f, indent=2)
            
            logger.info(f"Final model saved to {final_model_path}")
    
    def _log_training_summary(self, train_result):
        """Log training summary"""
        if self.config.local_rank in [-1, 0]:
            summary = {
                "training_time": train_result.metrics.get("train_runtime", 0),
                "samples_per_second": train_result.metrics.get("train_samples_per_second", 0),
                "final_train_loss": train_result.metrics.get("train_loss", 0),
                "best_eval_loss": self.training_state.best_eval_loss,
                "total_steps": train_result.global_step
            }
            
            logger.info("Training Summary:")
            for key, value in summary.items():
                logger.info(f"  {key}: {value}")
            
            # Save summary
            summary_path = os.path.join(self.config.output_dir, "training_summary.json")
            with open(summary_path, 'w') as f:
                json.dump(summary, f, indent=2)

class TrainingMonitorCallback(TrainerCallback):
    """Custom callback for training monitoring"""
    
    def __init__(self, pipeline: TrainingPipeline):
        self.pipeline = pipeline
    
    def on_step_end(self, args, state, control, **kwargs):
        """Called at the end of each training step"""
        self.pipeline.training_state.global_step = state.global_step
        self.pipeline.training_state.train_loss = state.log_history[-1].get("train_loss", 0)
        
        if hasattr(self.pipeline, 'tensorboard_writer'):
            self.pipeline.tensorboard_writer.add_scalar(
                "train/learning_rate", 
                state.log_history[-1].get("learning_rate", 0), 
                state.global_step
            )
    
    def on_evaluate(self, args, state, control, **kwargs):
        """Called after evaluation"""
        if state.log_history:
            latest_eval = state.log_history[-1]
            eval_loss = latest_eval.get("eval_loss", float('inf'))
            
            if eval_loss < self.pipeline.training_state.best_eval_loss:
                self.pipeline.training_state.best_eval_loss = eval_loss
                logger.info(f"New best eval loss: {eval_loss}")

class IncrementalTrainer:
    """Trainer for incremental fine-tuning on new data"""
    
    def __init__(self, base_model_path: str, config: TrainingConfig):
        self.base_model_path = base_model_path
        self.config = config
        self.config.learning_rate = 1e-5  # Lower LR for incremental training
        self.config.num_epochs = 3  # Fewer epochs
    
    def load_base_model(self):
        """Load pre-trained base model"""
        logger.info(f"Loading base model from {self.base_model_path}")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.base_model_path)
        
        # Load model
        if self.config.use_lora:
            # Load base model first
            base_model = AutoModelForCausalLM.from_pretrained(
                self.config.model_name,
                torch_dtype=torch.float16 if self.config.use_mixed_precision else torch.float32
            )
            # Load LoRA adapters
            self.model = PeftModel.from_pretrained(base_model, self.base_model_path)
        else:
            self.model = AutoModelForCausalLM.from_pretrained(self.base_model_path)
    
    def incremental_train(self, new_data_file: str):
        """Perform incremental training on new data"""
        logger.info("Starting incremental training")
        
        # Load base model
        self.load_base_model()
        
        # Create pipeline with new data
        self.config.train_file = new_data_file
        self.config.eval_file = new_data_file  # Use same file for quick eval
        
        pipeline = TrainingPipeline(self.config)
        pipeline.model = self.model
        pipeline.tokenizer = self.tokenizer
        
        # Prepare datasets
        train_dataset, eval_dataset = pipeline.prepare_datasets()
        
        # Setup trainer
        pipeline.setup_trainer(train_dataset, eval_dataset)
        
        # Train
        pipeline.train()

def main():
    """Main training script"""
    # Configuration
    config = TrainingConfig(
        model_name="microsoft/DialoGPT-large",
        learning_rate=5e-5,
        num_epochs=5,
        batch_size=4,
        gradient_accumulation_steps=8,
        use_lora=True,
        use_mixed_precision=True,
        train_file="./data/training_dataset.json",
        eval_file="./data/training_dataset.json",
        output_dir="./checkpoints/frontier-1",
        business_domain="general",
        use_wandb=True
    )
    
    # Create training pipeline
    pipeline = TrainingPipeline(config)
    
    # Start training
    pipeline.train()

if __name__ == "__main__":
    main()
