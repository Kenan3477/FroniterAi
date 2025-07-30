"""
Compliance Specialized Training Models

Specialized training implementations for compliance and risk management
including transfer learning, compliance-specific architectures, and 
specialized fine-tuning procedures.
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer, AutoModel, AutoConfig,
    Trainer, TrainingArguments,
    PreTrainedModel, PreTrainedTokenizer
)
from peft import LoraConfig, TaskType, get_peft_model
import json
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from pathlib import Path
import logging
from datetime import datetime

# Import base training components
import sys
sys.path.append(str(Path(__file__).parent.parent.parent.parent))
from models.frontier_trainer import TrainingConfig, BusinessTrainer

logger = logging.getLogger(__name__)

@dataclass
class ComplianceTrainingConfig(TrainingConfig):
    """Extended training configuration for compliance specialization"""
    
    # Compliance-specific parameters
    regulation_types: List[str] = field(default_factory=lambda: ["sox", "gdpr", "basel_iii"])
    jurisdictions: List[str] = field(default_factory=lambda: ["us_federal", "eu", "uk"])
    compliance_tasks: List[str] = field(default_factory=lambda: [
        "compliance_analysis", "risk_assessment", "policy_generation", "regulatory_change_detection"
    ])
    
    # Transfer learning configuration
    base_model_path: Optional[str] = None
    freeze_base_layers: bool = True
    freeze_layers_count: int = 6
    
    # Compliance-specific architecture
    use_compliance_head: bool = True
    compliance_hidden_size: int = 768
    num_compliance_classes: int = 10
    
    # Multi-task learning
    use_multi_task: bool = True
    task_loss_weights: Dict[str, float] = field(default_factory=lambda: {
        "compliance_analysis": 1.0,
        "risk_assessment": 1.2,
        "policy_generation": 0.8,
        "regulatory_change_detection": 1.1
    })
    
    # Specialized training parameters
    compliance_learning_rate: float = 2e-5
    regulation_learning_rate: float = 1e-5
    jurisdiction_adaptation_rate: float = 5e-6
    
    # Data augmentation
    use_synthetic_data: bool = True
    augmentation_ratio: float = 0.3
    cross_regulation_training: bool = True

class ComplianceDataset(Dataset):
    """Dataset for compliance and risk management training"""
    
    def __init__(
        self,
        data_files: List[str],
        tokenizer: PreTrainedTokenizer,
        max_length: int = 512,
        task_types: Optional[List[str]] = None
    ):
        self.tokenizer = tokenizer
        self.max_length = max_length
        self.task_types = task_types or ["compliance_analysis", "risk_assessment"]
        
        # Load and process data
        self.examples = self._load_and_process_data(data_files)
        
        # Create task mapping
        self.task_to_id = {task: idx for idx, task in enumerate(self.task_types)}
        self.id_to_task = {idx: task for task, idx in self.task_to_id.items()}
    
    def _load_and_process_data(self, data_files: List[str]) -> List[Dict[str, Any]]:
        """Load and process compliance training data"""
        examples = []
        
        for file_path in data_files:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            for item in data:
                if isinstance(item, dict) and 'input' in item and 'output' in item:
                    example = {
                        'input_text': item['input'],
                        'target_text': item['output'],
                        'task_type': item.get('metadata', {}).get('task_type', 'compliance_analysis'),
                        'regulation_type': item.get('metadata', {}).get('regulation_type', 'unknown'),
                        'jurisdiction': item.get('metadata', {}).get('jurisdiction', 'unknown'),
                        'risk_level': item.get('metadata', {}).get('risk_level', 'medium'),
                        'compliance_area': item.get('metadata', {}).get('compliance_area', 'general')
                    }
                    examples.append(example)
        
        logger.info(f"Loaded {len(examples)} compliance training examples")
        return examples
    
    def __len__(self) -> int:
        return len(self.examples)
    
    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        example = self.examples[idx]
        
        # Tokenize input and target
        input_encoding = self.tokenizer(
            example['input_text'],
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        target_encoding = self.tokenizer(
            example['target_text'],
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        # Create task ID
        task_id = self.task_to_id.get(example['task_type'], 0)
        
        return {
            'input_ids': input_encoding['input_ids'].squeeze(),
            'attention_mask': input_encoding['attention_mask'].squeeze(),
            'labels': target_encoding['input_ids'].squeeze(),
            'task_id': torch.tensor(task_id, dtype=torch.long),
            'regulation_type': example['regulation_type'],
            'jurisdiction': example['jurisdiction'],
            'risk_level': example['risk_level']
        }

class ComplianceSpecializedModel(PreTrainedModel):
    """Specialized model for compliance and risk management tasks"""
    
    def __init__(self, config, base_model):
        super().__init__(config)
        
        self.base_model = base_model
        self.config = config
        
        # Compliance-specific layers
        if hasattr(config, 'use_compliance_head') and config.use_compliance_head:
            self.compliance_head = nn.Sequential(
                nn.Linear(config.hidden_size, config.compliance_hidden_size),
                nn.ReLU(),
                nn.Dropout(0.1),
                nn.Linear(config.compliance_hidden_size, config.num_compliance_classes)
            )
        
        # Multi-task heads
        if hasattr(config, 'use_multi_task') and config.use_multi_task:
            self.task_heads = nn.ModuleDict({
                'compliance_analysis': nn.Linear(config.hidden_size, config.vocab_size),
                'risk_assessment': nn.Linear(config.hidden_size, config.vocab_size),
                'policy_generation': nn.Linear(config.hidden_size, config.vocab_size),
                'regulatory_change_detection': nn.Linear(config.hidden_size, 2)  # Binary classification
            })
        
        # Regulation-specific adapters
        self.regulation_adapters = nn.ModuleDict({
            'sox': nn.Linear(config.hidden_size, config.hidden_size),
            'gdpr': nn.Linear(config.hidden_size, config.hidden_size),
            'basel_iii': nn.Linear(config.hidden_size, config.hidden_size),
            'hipaa': nn.Linear(config.hidden_size, config.hidden_size)
        })
        
        # Jurisdiction-specific adapters
        self.jurisdiction_adapters = nn.ModuleDict({
            'us_federal': nn.Linear(config.hidden_size, config.hidden_size),
            'eu': nn.Linear(config.hidden_size, config.hidden_size),
            'uk': nn.Linear(config.hidden_size, config.hidden_size),
            'singapore': nn.Linear(config.hidden_size, config.hidden_size)
        })
    
    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        labels: Optional[torch.Tensor] = None,
        task_id: Optional[torch.Tensor] = None,
        regulation_type: Optional[str] = None,
        jurisdiction: Optional[str] = None,
        **kwargs
    ) -> Dict[str, torch.Tensor]:
        
        # Base model forward pass
        outputs = self.base_model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            **kwargs
        )
        
        last_hidden_state = outputs.last_hidden_state
        
        # Apply regulation-specific adaptation
        if regulation_type and regulation_type in self.regulation_adapters:
            regulation_adapter = self.regulation_adapters[regulation_type]
            last_hidden_state = last_hidden_state + regulation_adapter(last_hidden_state)
        
        # Apply jurisdiction-specific adaptation
        if jurisdiction and jurisdiction in self.jurisdiction_adapters:
            jurisdiction_adapter = self.jurisdiction_adapters[jurisdiction]
            last_hidden_state = last_hidden_state + jurisdiction_adapter(last_hidden_state)
        
        # Multi-task prediction
        task_outputs = {}
        if hasattr(self, 'task_heads') and task_id is not None:
            # Determine task type from task_id
            task_types = ['compliance_analysis', 'risk_assessment', 'policy_generation', 'regulatory_change_detection']
            
            for i, task_type in enumerate(task_types):
                if task_type in self.task_heads:
                    task_head = self.task_heads[task_type]
                    task_logits = task_head(last_hidden_state)
                    task_outputs[f'{task_type}_logits'] = task_logits
        
        # Compliance classification
        compliance_logits = None
        if hasattr(self, 'compliance_head'):
            # Use CLS token representation
            cls_representation = last_hidden_state[:, 0, :]
            compliance_logits = self.compliance_head(cls_representation)
        
        # Calculate losses
        total_loss = 0
        losses = {}
        
        if labels is not None:
            # Language modeling loss
            lm_loss_fn = nn.CrossEntropyLoss(ignore_index=-100)
            
            # Calculate task-specific losses
            for task_type, logits in task_outputs.items():
                if task_type.endswith('_logits'):
                    task_name = task_type.replace('_logits', '')
                    if task_name == 'regulatory_change_detection':
                        # Binary classification loss
                        binary_labels = (labels != -100).long()
                        task_loss = nn.CrossEntropyLoss()(logits.view(-1, 2), binary_labels.view(-1))
                    else:
                        # Language modeling loss
                        task_loss = lm_loss_fn(logits.view(-1, logits.size(-1)), labels.view(-1))
                    
                    losses[f'{task_name}_loss'] = task_loss
                    
                    # Weight the loss based on configuration
                    task_weight = getattr(self.config, 'task_loss_weights', {}).get(task_name, 1.0)
                    total_loss += task_weight * task_loss
        
        return {
            'loss': total_loss,
            'logits': task_outputs.get('compliance_analysis_logits', outputs.logits if hasattr(outputs, 'logits') else None),
            'compliance_logits': compliance_logits,
            'task_outputs': task_outputs,
            'losses': losses,
            'hidden_states': last_hidden_state
        }

class ComplianceTrainer(BusinessTrainer):
    """Specialized trainer for compliance models"""
    
    def __init__(self, config: ComplianceTrainingConfig):
        # Initialize base trainer
        super().__init__(config)
        self.compliance_config = config
        
        # Override model setup for compliance specialization
        self.model = None
        self.tokenizer = None
    
    def setup_compliance_model(self):
        """Setup compliance-specialized model"""
        logger.info("Setting up compliance-specialized model...")
        
        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(self.compliance_config.model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Load base model configuration
        base_config = AutoConfig.from_pretrained(self.compliance_config.model_name)
        
        # Extend config for compliance specialization
        base_config.use_compliance_head = self.compliance_config.use_compliance_head
        base_config.compliance_hidden_size = self.compliance_config.compliance_hidden_size
        base_config.num_compliance_classes = self.compliance_config.num_compliance_classes
        base_config.use_multi_task = self.compliance_config.use_multi_task
        base_config.task_loss_weights = self.compliance_config.task_loss_weights
        
        # Load base model
        if self.compliance_config.base_model_path:
            # Transfer learning from existing model
            logger.info(f"Loading base model from: {self.compliance_config.base_model_path}")
            base_model = AutoModel.from_pretrained(self.compliance_config.base_model_path)
        else:
            # Load from pre-trained model
            base_model = AutoModel.from_pretrained(self.compliance_config.model_name)
        
        # Freeze base layers if specified
        if self.compliance_config.freeze_base_layers:
            self._freeze_base_layers(base_model)
        
        # Create compliance-specialized model
        self.model = ComplianceSpecializedModel(base_config, base_model)
        
        # Apply LoRA if specified
        if self.compliance_config.use_lora:
            self._apply_compliance_lora()
        
        logger.info("Compliance-specialized model setup completed")
    
    def _freeze_base_layers(self, base_model):
        """Freeze specified number of base layers"""
        layers_to_freeze = self.compliance_config.freeze_layers_count
        
        if hasattr(base_model, 'encoder') and hasattr(base_model.encoder, 'layer'):
            # BERT-like model
            layers = base_model.encoder.layer
        elif hasattr(base_model, 'transformer') and hasattr(base_model.transformer, 'h'):
            # GPT-like model
            layers = base_model.transformer.h
        else:
            logger.warning("Could not identify model layers for freezing")
            return
        
        for i, layer in enumerate(layers[:layers_to_freeze]):
            for param in layer.parameters():
                param.requires_grad = False
        
        logger.info(f"Frozen {layers_to_freeze} base layers")
    
    def _apply_compliance_lora(self):
        """Apply LoRA to compliance model"""
        # Define target modules for compliance specialization
        target_modules = [
            "base_model.encoder.layer.*.attention.self.query",
            "base_model.encoder.layer.*.attention.self.key", 
            "base_model.encoder.layer.*.attention.self.value",
            "base_model.encoder.layer.*.output.dense",
            "compliance_head.*",
            "task_heads.*"
        ]
        
        lora_config = LoraConfig(
            task_type=TaskType.FEATURE_EXTRACTION,
            r=self.compliance_config.lora_r,
            lora_alpha=self.compliance_config.lora_alpha,
            lora_dropout=self.compliance_config.lora_dropout,
            target_modules=target_modules,
            bias="none"
        )
        
        self.model = get_peft_model(self.model, lora_config)
        
        logger.info("Applied LoRA to compliance model")
    
    def load_compliance_data(self, data_files: List[str]):
        """Load compliance training data"""
        logger.info(f"Loading compliance data from {len(data_files)} files")
        
        # Create dataset
        train_dataset = ComplianceDataset(
            data_files=data_files,
            tokenizer=self.tokenizer,
            max_length=self.compliance_config.max_length,
            task_types=self.compliance_config.compliance_tasks
        )
        
        # Split into train/validation
        train_size = int(0.9 * len(train_dataset))
        val_size = len(train_dataset) - train_size
        
        self.train_dataset, self.val_dataset = torch.utils.data.random_split(
            train_dataset, [train_size, val_size]
        )
        
        logger.info(f"Loaded {len(self.train_dataset)} training and {len(self.val_dataset)} validation examples")
    
    def train_compliance_specialization(self) -> Dict[str, Any]:
        """Train compliance specialization"""
        logger.info("Starting compliance specialization training...")
        
        # Setup model
        self.setup_compliance_model()
        
        # Create training arguments
        training_args = TrainingArguments(
            output_dir=self.compliance_config.output_dir,
            num_train_epochs=self.compliance_config.num_epochs,
            per_device_train_batch_size=self.compliance_config.batch_size,
            per_device_eval_batch_size=self.compliance_config.batch_size,
            learning_rate=self.compliance_config.compliance_learning_rate,
            weight_decay=self.compliance_config.weight_decay,
            warmup_ratio=self.compliance_config.warmup_ratio,
            logging_steps=self.compliance_config.logging_steps,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            save_total_limit=3,
            load_best_model_at_end=True,
            metric_for_best_model="eval_loss",
            greater_is_better=False,
            fp16=self.compliance_config.fp16,
            dataloader_num_workers=self.compliance_config.dataloader_num_workers,
            gradient_accumulation_steps=self.compliance_config.gradient_accumulation_steps,
            max_grad_norm=self.compliance_config.max_grad_norm,
            report_to=["wandb"] if self.compliance_config.use_wandb else []
        )
        
        # Create trainer
        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=self.train_dataset,
            eval_dataset=self.val_dataset,
            tokenizer=self.tokenizer,
            compute_metrics=self._compute_compliance_metrics
        )
        
        # Train model
        training_result = trainer.train()
        
        # Save specialized model
        trainer.save_model()
        
        logger.info("Compliance specialization training completed")
        return training_result
    
    def _compute_compliance_metrics(self, eval_pred) -> Dict[str, float]:
        """Compute compliance-specific metrics"""
        predictions, labels = eval_pred
        
        # Basic perplexity calculation
        losses = []
        for pred, label in zip(predictions, labels):
            if isinstance(pred, (list, tuple)) and len(pred) > 0:
                # Multi-task output
                loss = pred[0] if hasattr(pred[0], 'item') else 0
            else:
                loss = pred if hasattr(pred, 'item') else 0
            losses.append(loss)
        
        avg_loss = np.mean(losses)
        perplexity = np.exp(avg_loss) if avg_loss < 100 else float('inf')
        
        return {
            "perplexity": perplexity,
            "avg_loss": avg_loss
        }

class RegulatoryChangeDetectionModel:
    """Specialized model for detecting regulatory changes"""
    
    def __init__(self, base_model_path: str):
        self.tokenizer = AutoTokenizer.from_pretrained(base_model_path)
        self.model = AutoModel.from_pretrained(base_model_path)
        
        # Add classification head for change detection
        self.change_classifier = nn.Sequential(
            nn.Linear(self.model.config.hidden_size, 256),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(256, 2)  # Change/No Change
        )
        
        # Add impact assessment head
        self.impact_classifier = nn.Sequential(
            nn.Linear(self.model.config.hidden_size, 128),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(128, 4)  # Low/Medium/High/Critical
        )
    
    def train_change_detection(self, training_data: List[Dict[str, Any]]):
        """Train regulatory change detection"""
        logger.info("Training regulatory change detection model...")
        
        # Prepare training data
        X_texts = []
        y_changes = []
        y_impacts = []
        
        for item in training_data:
            X_texts.append(item['text'])
            y_changes.append(1 if item['has_change'] else 0)
            y_impacts.append(item['impact_level'])  # 0=Low, 1=Medium, 2=High, 3=Critical
        
        # Tokenize texts
        encodings = self.tokenizer(
            X_texts,
            truncation=True,
            padding=True,
            max_length=512,
            return_tensors='pt'
        )
        
        # Training loop
        optimizer = torch.optim.AdamW(
            list(self.model.parameters()) + 
            list(self.change_classifier.parameters()) + 
            list(self.impact_classifier.parameters()),
            lr=2e-5
        )
        
        self.model.train()
        self.change_classifier.train()
        self.impact_classifier.train()
        
        for epoch in range(3):  # Quick training
            optimizer.zero_grad()
            
            # Forward pass
            outputs = self.model(**encodings)
            cls_embeddings = outputs.last_hidden_state[:, 0, :]  # CLS token
            
            # Classification heads
            change_logits = self.change_classifier(cls_embeddings)
            impact_logits = self.impact_classifier(cls_embeddings)
            
            # Losses
            change_loss = nn.CrossEntropyLoss()(change_logits, torch.tensor(y_changes))
            impact_loss = nn.CrossEntropyLoss()(impact_logits, torch.tensor(y_impacts))
            
            total_loss = change_loss + impact_loss
            
            # Backward pass
            total_loss.backward()
            optimizer.step()
            
            logger.info(f"Epoch {epoch+1}, Loss: {total_loss.item():.4f}")
        
        logger.info("Regulatory change detection training completed")
    
    def predict_changes(self, text: str) -> Dict[str, Any]:
        """Predict regulatory changes in text"""
        self.model.eval()
        self.change_classifier.eval()
        self.impact_classifier.eval()
        
        with torch.no_grad():
            # Tokenize
            encoding = self.tokenizer(
                text,
                truncation=True,
                padding=True,
                max_length=512,
                return_tensors='pt'
            )
            
            # Forward pass
            outputs = self.model(**encoding)
            cls_embedding = outputs.last_hidden_state[:, 0, :]
            
            # Predictions
            change_logits = self.change_classifier(cls_embedding)
            impact_logits = self.impact_classifier(cls_embedding)
            
            change_probs = torch.softmax(change_logits, dim=1)
            impact_probs = torch.softmax(impact_logits, dim=1)
            
            return {
                'has_change': bool(torch.argmax(change_probs, dim=1).item()),
                'change_confidence': float(torch.max(change_probs, dim=1).values.item()),
                'impact_level': ['Low', 'Medium', 'High', 'Critical'][torch.argmax(impact_probs, dim=1).item()],
                'impact_confidence': float(torch.max(impact_probs, dim=1).values.item())
            }

def create_compliance_trainer(
    base_model_path: str,
    data_files: List[str],
    output_dir: str,
    config_overrides: Optional[Dict[str, Any]] = None
) -> ComplianceTrainer:
    """Factory function to create compliance trainer"""
    
    # Create compliance training configuration
    config = ComplianceTrainingConfig(
        model_name=base_model_path,
        output_dir=output_dir,
        train_data_path="",  # Will be set via data_files
        val_data_path="",
        num_epochs=3,
        batch_size=16,
        learning_rate=2e-5,
        use_lora=True,
        lora_r=16,
        lora_alpha=32,
        use_compliance_head=True,
        use_multi_task=True,
        freeze_base_layers=True,
        freeze_layers_count=6
    )
    
    # Apply config overrides
    if config_overrides:
        for key, value in config_overrides.items():
            if hasattr(config, key):
                setattr(config, key, value)
    
    # Create trainer
    trainer = ComplianceTrainer(config)
    
    # Load compliance data
    trainer.load_compliance_data(data_files)
    
    return trainer

def main():
    """Example usage of compliance specialized training"""
    
    # Example data files (would be generated by data preparation scripts)
    data_files = [
        "./compliance_training_data/sox_training_data.json",
        "./compliance_training_data/gdpr_training_data.json",
        "./compliance_training_data/risk_scenarios_training_data.json"
    ]
    
    # Create compliance trainer
    trainer = create_compliance_trainer(
        base_model_path="microsoft/DialoGPT-large",
        data_files=data_files,
        output_dir="./compliance_specialized_model",
        config_overrides={
            "num_epochs": 5,
            "batch_size": 8,
            "use_wandb": False
        }
    )
    
    # Train compliance specialization
    result = trainer.train_compliance_specialization()
    
    print(f"Compliance training completed: {result}")

if __name__ == "__main__":
    main()
