"""
Specialized Model Training and Management Core

This module provides the foundation for training domain-specific models
for business operations across different industries.
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP

import os
import json
import logging
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import numpy as np
import pandas as pd
from tqdm import tqdm
import wandb
import mlflow

from transformers import (
    AutoTokenizer, AutoModel, AutoConfig,
    TrainingArguments, Trainer,
    DataCollatorForLanguageModeling,
    PreTrainedModel, PreTrainedTokenizer
)
from datasets import Dataset as HFDataset, load_dataset
import accelerate
from accelerate import Accelerator

# Industry specialization types
class IndustryType(Enum):
    FINANCIAL_SERVICES = "financial_services"
    HEALTHCARE = "healthcare"
    MANUFACTURING = "manufacturing"
    TECHNOLOGY = "technology"
    COMPLIANCE_RISK = "compliance_risk_management"
    GENERAL_BUSINESS = "general_business"

class TrainingPhase(Enum):
    PRETRAINING = "pretraining"
    FINE_TUNING = "fine_tuning"
    SPECIALIZATION = "specialization"
    DISTILLATION = "distillation"
    CONTINUOUS = "continuous"

class ModelSize(Enum):
    NANO = "nano"        # 125M parameters
    MICRO = "micro"      # 350M parameters
    SMALL = "small"      # 1.3B parameters
    MEDIUM = "medium"    # 7B parameters
    LARGE = "large"      # 13B parameters
    XLARGE = "xlarge"    # 30B parameters

@dataclass
class DomainVocabulary:
    """Domain-specific vocabulary configuration"""
    industry: IndustryType
    vocabulary_size: int
    specialized_tokens: List[str]
    domain_embeddings: Optional[Dict[str, List[float]]] = None
    frequency_weights: Optional[Dict[str, float]] = None
    semantic_clusters: Optional[Dict[str, List[str]]] = None

@dataclass
class TrainingConfig:
    """Comprehensive training configuration"""
    # Model configuration
    model_name: str
    base_model_path: str
    industry: IndustryType
    model_size: ModelSize
    
    # Training parameters
    training_phase: TrainingPhase
    batch_size: int = 16
    learning_rate: float = 5e-5
    num_epochs: int = 3
    max_length: int = 512
    warmup_steps: int = 500
    weight_decay: float = 0.01
    
    # Data configuration
    train_data_path: str
    validation_data_path: str
    test_data_path: Optional[str] = None
    data_preprocessing_config: Optional[Dict[str, Any]] = None
    
    # Domain specialization
    domain_vocabulary: Optional[DomainVocabulary] = None
    transfer_learning_source: Optional[str] = None
    specialization_layers: List[int] = None
    
    # Infrastructure
    distributed_training: bool = False
    mixed_precision: bool = True
    gradient_checkpointing: bool = False
    num_gpus: int = 1
    
    # Monitoring and logging
    log_level: str = "INFO"
    wandb_project: Optional[str] = None
    mlflow_experiment: Optional[str] = None
    checkpoint_steps: int = 1000
    eval_steps: int = 500
    
    # Output configuration
    output_dir: str = "./outputs"
    save_steps: int = 1000
    save_total_limit: int = 3
    
    def __post_init__(self):
        if self.specialization_layers is None:
            self.specialization_layers = [-1, -2, -3]  # Last 3 layers

class SpecializedModelTrainer:
    """
    Core trainer for domain-specific models with industry specialization
    """
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.accelerator = Accelerator(mixed_precision='fp16' if config.mixed_precision else 'no')
        self.logger = self._setup_logging()
        
        # Initialize tracking
        self._setup_experiment_tracking()
        
        # Model and tokenizer
        self.tokenizer = None
        self.model = None
        self.domain_vocabulary = None
        
        # Training state
        self.global_step = 0
        self.training_history = []
        
    def _setup_logging(self) -> logging.Logger:
        """Setup logging configuration"""
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        return logging.getLogger(__name__)
    
    def _setup_experiment_tracking(self):
        """Setup experiment tracking with wandb and mlflow"""
        if self.config.wandb_project and self.accelerator.is_main_process:
            wandb.init(
                project=self.config.wandb_project,
                config=asdict(self.config),
                name=f"{self.config.model_name}_{self.config.industry.value}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
        
        if self.config.mlflow_experiment and self.accelerator.is_main_process:
            mlflow.set_experiment(self.config.mlflow_experiment)
            mlflow.start_run()
    
    def load_base_model(self):
        """Load and prepare the base model"""
        self.logger.info(f"Loading base model from {self.config.base_model_path}")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.config.base_model_path,
            trust_remote_code=True
        )
        
        # Add padding token if not present
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load model configuration
        model_config = AutoConfig.from_pretrained(
            self.config.base_model_path,
            trust_remote_code=True
        )
        
        # Load model
        self.model = AutoModel.from_pretrained(
            self.config.base_model_path,
            config=model_config,
            trust_remote_code=True,
            torch_dtype=torch.float16 if self.config.mixed_precision else torch.float32
        )
        
        # Apply domain vocabulary if specified
        if self.config.domain_vocabulary:
            self._extend_vocabulary()
    
    def _extend_vocabulary(self):
        """Extend model vocabulary with domain-specific tokens"""
        vocab_config = self.config.domain_vocabulary
        
        self.logger.info(f"Extending vocabulary with {len(vocab_config.specialized_tokens)} domain-specific tokens")
        
        # Add new tokens to tokenizer
        num_added_tokens = self.tokenizer.add_tokens(vocab_config.specialized_tokens)
        
        # Resize model embeddings
        if num_added_tokens > 0:
            self.model.resize_token_embeddings(len(self.tokenizer))
            
            # Initialize new embeddings with domain-specific weights if available
            if vocab_config.domain_embeddings:
                self._initialize_domain_embeddings(vocab_config.domain_embeddings)
    
    def _initialize_domain_embeddings(self, domain_embeddings: Dict[str, List[float]]):
        """Initialize domain-specific token embeddings"""
        with torch.no_grad():
            for token, embedding in domain_embeddings.items():
                token_id = self.tokenizer.convert_tokens_to_ids(token)
                if token_id != self.tokenizer.unk_token_id:
                    embedding_tensor = torch.tensor(embedding, dtype=self.model.embeddings.word_embeddings.weight.dtype)
                    self.model.embeddings.word_embeddings.weight[token_id] = embedding_tensor
    
    def prepare_datasets(self) -> Tuple[HFDataset, HFDataset, Optional[HFDataset]]:
        """Prepare training, validation, and test datasets"""
        self.logger.info("Preparing datasets")
        
        # Load datasets
        train_dataset = self._load_dataset(self.config.train_data_path)
        val_dataset = self._load_dataset(self.config.validation_data_path)
        test_dataset = None
        
        if self.config.test_data_path:
            test_dataset = self._load_dataset(self.config.test_data_path)
        
        # Apply preprocessing
        if self.config.data_preprocessing_config:
            train_dataset = self._preprocess_dataset(train_dataset)
            val_dataset = self._preprocess_dataset(val_dataset)
            if test_dataset:
                test_dataset = self._preprocess_dataset(test_dataset)
        
        return train_dataset, val_dataset, test_dataset
    
    def _load_dataset(self, data_path: str) -> HFDataset:
        """Load dataset from path"""
        if data_path.endswith('.json') or data_path.endswith('.jsonl'):
            return load_dataset('json', data_files=data_path, split='train')
        elif data_path.endswith('.csv'):
            return load_dataset('csv', data_files=data_path, split='train')
        elif data_path.endswith('.parquet'):
            return load_dataset('parquet', data_files=data_path, split='train')
        else:
            return load_dataset(data_path, split='train')
    
    def _preprocess_dataset(self, dataset: HFDataset) -> HFDataset:
        """Apply preprocessing to dataset"""
        def tokenize_function(examples):
            # Tokenize the texts
            tokenized = self.tokenizer(
                examples['text'],
                truncation=True,
                padding='max_length',
                max_length=self.config.max_length,
                return_tensors='pt'
            )
            return tokenized
        
        # Apply tokenization
        dataset = dataset.map(
            tokenize_function,
            batched=True,
            remove_columns=dataset.column_names
        )
        
        return dataset
    
    def setup_training(self):
        """Setup training components"""
        # Prepare model for training
        if self.config.gradient_checkpointing:
            self.model.gradient_checkpointing_enable()
        
        # Setup optimizer
        optimizer = optim.AdamW(
            self.model.parameters(),
            lr=self.config.learning_rate,
            weight_decay=self.config.weight_decay
        )
        
        # Setup learning rate scheduler
        from transformers import get_linear_schedule_with_warmup
        scheduler = get_linear_schedule_with_warmup(
            optimizer,
            num_warmup_steps=self.config.warmup_steps,
            num_training_steps=self.config.num_epochs * 1000  # Approximate
        )
        
        # Prepare with accelerator
        self.model, optimizer, scheduler = self.accelerator.prepare(
            self.model, optimizer, scheduler
        )
        
        return optimizer, scheduler
    
    def train(self):
        """Main training loop"""
        self.logger.info(f"Starting {self.config.training_phase.value} training for {self.config.industry.value}")
        
        # Load model and datasets
        self.load_base_model()
        train_dataset, val_dataset, test_dataset = self.prepare_datasets()
        
        # Setup training
        optimizer, scheduler = self.setup_training()
        
        # Create data loaders
        train_loader = DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
            collate_fn=DataCollatorForLanguageModeling(
                tokenizer=self.tokenizer,
                mlm=False
            )
        )
        
        val_loader = DataLoader(
            val_dataset,
            batch_size=self.config.batch_size,
            shuffle=False,
            collate_fn=DataCollatorForLanguageModeling(
                tokenizer=self.tokenizer,
                mlm=False
            )
        )
        
        # Prepare data loaders with accelerator
        train_loader, val_loader = self.accelerator.prepare(train_loader, val_loader)
        
        # Training loop
        self.model.train()
        total_loss = 0
        
        for epoch in range(self.config.num_epochs):
            self.logger.info(f"Starting epoch {epoch + 1}/{self.config.num_epochs}")
            
            epoch_loss = 0
            progress_bar = tqdm(
                train_loader,
                desc=f"Epoch {epoch + 1}",
                disable=not self.accelerator.is_main_process
            )
            
            for step, batch in enumerate(progress_bar):
                with self.accelerator.accumulate(self.model):
                    outputs = self.model(**batch)
                    loss = outputs.loss
                    
                    self.accelerator.backward(loss)
                    optimizer.step()
                    scheduler.step()
                    optimizer.zero_grad()
                    
                    self.global_step += 1
                    epoch_loss += loss.item()
                    total_loss += loss.item()
                    
                    # Update progress bar
                    progress_bar.set_postfix({
                        'loss': f"{loss.item():.4f}",
                        'avg_loss': f"{epoch_loss / (step + 1):.4f}"
                    })
                    
                    # Logging and checkpointing
                    if self.global_step % self.config.checkpoint_steps == 0:
                        self._save_checkpoint()
                    
                    if self.global_step % self.config.eval_steps == 0:
                        self._evaluate(val_loader)
                    
                    # Log metrics
                    if self.accelerator.is_main_process:
                        if self.config.wandb_project:
                            wandb.log({
                                'train_loss': loss.item(),
                                'learning_rate': scheduler.get_last_lr()[0],
                                'epoch': epoch,
                                'global_step': self.global_step
                            })
                        
                        if self.config.mlflow_experiment:
                            mlflow.log_metrics({
                                'train_loss': loss.item(),
                                'learning_rate': scheduler.get_last_lr()[0]
                            }, step=self.global_step)
            
            # End of epoch evaluation
            avg_epoch_loss = epoch_loss / len(train_loader)
            self.logger.info(f"Epoch {epoch + 1} completed. Average loss: {avg_epoch_loss:.4f}")
            
            self.training_history.append({
                'epoch': epoch + 1,
                'avg_loss': avg_epoch_loss,
                'timestamp': datetime.now().isoformat()
            })
        
        # Final save
        self._save_final_model()
        
        self.logger.info("Training completed successfully")
        
        return {
            'final_loss': total_loss / self.global_step,
            'training_history': self.training_history,
            'model_path': self._get_model_save_path()
        }
    
    def _evaluate(self, val_loader: DataLoader) -> Dict[str, float]:
        """Evaluate model on validation set"""
        self.model.eval()
        total_loss = 0
        num_batches = 0
        
        with torch.no_grad():
            for batch in val_loader:
                outputs = self.model(**batch)
                total_loss += outputs.loss.item()
                num_batches += 1
        
        avg_loss = total_loss / num_batches
        
        if self.accelerator.is_main_process:
            self.logger.info(f"Validation loss: {avg_loss:.4f}")
            
            if self.config.wandb_project:
                wandb.log({'val_loss': avg_loss})
            
            if self.config.mlflow_experiment:
                mlflow.log_metric('val_loss', avg_loss, step=self.global_step)
        
        self.model.train()
        return {'val_loss': avg_loss}
    
    def _save_checkpoint(self):
        """Save training checkpoint"""
        if self.accelerator.is_main_process:
            checkpoint_dir = Path(self.config.output_dir) / "checkpoints" / f"step_{self.global_step}"
            checkpoint_dir.mkdir(parents=True, exist_ok=True)
            
            # Save model and tokenizer
            self.accelerator.save_state(checkpoint_dir)
            
            # Save training state
            training_state = {
                'global_step': self.global_step,
                'training_history': self.training_history,
                'config': asdict(self.config)
            }
            
            with open(checkpoint_dir / "training_state.json", 'w') as f:
                json.dump(training_state, f, indent=2)
    
    def _save_final_model(self):
        """Save final trained model"""
        if self.accelerator.is_main_process:
            output_path = self._get_model_save_path()
            output_path.mkdir(parents=True, exist_ok=True)
            
            # Unwrap model from DDP if needed
            model_to_save = self.accelerator.unwrap_model(self.model)
            
            # Save model and tokenizer
            model_to_save.save_pretrained(output_path)
            self.tokenizer.save_pretrained(output_path)
            
            # Save configuration and metadata
            metadata = {
                'model_name': self.config.model_name,
                'industry': self.config.industry.value,
                'training_phase': self.config.training_phase.value,
                'final_loss': self.training_history[-1]['avg_loss'] if self.training_history else None,
                'training_completed': datetime.now().isoformat(),
                'config': asdict(self.config)
            }
            
            with open(output_path / "training_metadata.json", 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.logger.info(f"Final model saved to {output_path}")
    
    def _get_model_save_path(self) -> Path:
        """Get the path where the final model should be saved"""
        return Path(self.config.output_dir) / f"{self.config.model_name}_{self.config.industry.value}_final"
    
    def cleanup(self):
        """Cleanup resources"""
        if self.config.wandb_project and self.accelerator.is_main_process:
            wandb.finish()
        
        if self.config.mlflow_experiment and self.accelerator.is_main_process:
            mlflow.end_run()


class DomainVocabularyManager:
    """
    Manages domain-specific vocabulary extensions for different industries
    """
    
    def __init__(self, base_vocab_path: Optional[str] = None):
        self.base_vocab_path = base_vocab_path
        self.domain_vocabularies: Dict[IndustryType, DomainVocabulary] = {}
        self.logger = logging.getLogger(__name__)
    
    def create_domain_vocabulary(
        self,
        industry: IndustryType,
        specialized_terms: List[str],
        vocabulary_size: int = 50000,
        embedding_dim: int = 768
    ) -> DomainVocabulary:
        """Create domain-specific vocabulary"""
        
        self.logger.info(f"Creating domain vocabulary for {industry.value}")
        
        # Filter and process specialized terms
        processed_terms = self._process_specialized_terms(specialized_terms)
        
        # Calculate frequency weights
        frequency_weights = self._calculate_frequency_weights(processed_terms)
        
        # Generate semantic clusters
        semantic_clusters = self._generate_semantic_clusters(processed_terms)
        
        # Create domain embeddings if needed
        domain_embeddings = self._generate_domain_embeddings(
            processed_terms, embedding_dim
        )
        
        domain_vocab = DomainVocabulary(
            industry=industry,
            vocabulary_size=vocabulary_size,
            specialized_tokens=processed_terms,
            frequency_weights=frequency_weights,
            semantic_clusters=semantic_clusters,
            domain_embeddings=domain_embeddings
        )
        
        self.domain_vocabularies[industry] = domain_vocab
        return domain_vocab
    
    def _process_specialized_terms(self, terms: List[str]) -> List[str]:
        """Process and clean specialized terms"""
        processed = []
        
        for term in terms:
            # Clean and normalize
            cleaned = term.strip().lower()
            
            # Skip if too short or contains invalid characters
            if len(cleaned) < 2 or any(char in cleaned for char in ['<', '>', '[', ']']):
                continue
            
            # Add to processed list
            if cleaned not in processed:
                processed.append(cleaned)
        
        return processed
    
    def _calculate_frequency_weights(self, terms: List[str]) -> Dict[str, float]:
        """Calculate frequency-based weights for terms"""
        # Simple frequency weighting (in practice, this would use corpus statistics)
        weights = {}
        
        for term in terms:
            # Assign higher weights to longer, more specific terms
            weight = min(len(term.split()) * 0.1 + 0.1, 1.0)
            weights[term] = weight
        
        return weights
    
    def _generate_semantic_clusters(self, terms: List[str]) -> Dict[str, List[str]]:
        """Generate semantic clusters of related terms"""
        # Simplified clustering (in practice, would use embedding similarity)
        clusters = {}
        
        # Example clusters for different domains
        financial_clusters = {
            'financial_metrics': ['roi', 'npv', 'irr', 'ebitda', 'revenue'],
            'risk_management': ['var', 'risk', 'hedge', 'derivatives', 'volatility'],
            'compliance': ['regulation', 'audit', 'compliance', 'governance']
        }
        
        healthcare_clusters = {
            'clinical_terms': ['diagnosis', 'treatment', 'patient', 'clinical'],
            'regulatory': ['hipaa', 'fda', 'compliance', 'privacy'],
            'operations': ['workflow', 'efficiency', 'quality', 'outcomes']
        }
        
        # Assign terms to clusters based on content
        for term in terms:
            assigned = False
            for cluster_name, cluster_terms in financial_clusters.items():
                if any(keyword in term for keyword in cluster_terms):
                    if cluster_name not in clusters:
                        clusters[cluster_name] = []
                    clusters[cluster_name].append(term)
                    assigned = True
                    break
            
            if not assigned:
                if 'general' not in clusters:
                    clusters['general'] = []
                clusters['general'].append(term)
        
        return clusters
    
    def _generate_domain_embeddings(
        self,
        terms: List[str],
        embedding_dim: int
    ) -> Dict[str, List[float]]:
        """Generate initial embeddings for domain terms"""
        embeddings = {}
        
        # Generate random embeddings (in practice, would use pre-trained embeddings)
        for term in terms:
            # Create reproducible random embedding based on term
            np.random.seed(hash(term) % 2**32)
            embedding = np.random.normal(0, 0.1, embedding_dim).tolist()
            embeddings[term] = embedding
        
        return embeddings
    
    def save_domain_vocabulary(self, industry: IndustryType, save_path: str):
        """Save domain vocabulary to file"""
        if industry not in self.domain_vocabularies:
            raise ValueError(f"No vocabulary found for industry {industry.value}")
        
        vocab = self.domain_vocabularies[industry]
        
        save_data = {
            'industry': vocab.industry.value,
            'vocabulary_size': vocab.vocabulary_size,
            'specialized_tokens': vocab.specialized_tokens,
            'frequency_weights': vocab.frequency_weights,
            'semantic_clusters': vocab.semantic_clusters,
            'domain_embeddings': vocab.domain_embeddings,
            'created_at': datetime.now().isoformat()
        }
        
        with open(save_path, 'w') as f:
            json.dump(save_data, f, indent=2)
        
        self.logger.info(f"Domain vocabulary saved to {save_path}")
    
    def load_domain_vocabulary(self, load_path: str) -> DomainVocabulary:
        """Load domain vocabulary from file"""
        with open(load_path, 'r') as f:
            data = json.load(f)
        
        vocab = DomainVocabulary(
            industry=IndustryType(data['industry']),
            vocabulary_size=data['vocabulary_size'],
            specialized_tokens=data['specialized_tokens'],
            frequency_weights=data.get('frequency_weights'),
            semantic_clusters=data.get('semantic_clusters'),
            domain_embeddings=data.get('domain_embeddings')
        )
        
        self.domain_vocabularies[vocab.industry] = vocab
        return vocab
