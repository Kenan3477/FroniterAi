"""
Domain Transfer Learning System

Advanced transfer learning capabilities for moving knowledge between related
business domains and industries.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import DataLoader
import numpy as np
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.manifold import TSNE
import pandas as pd

from .base_trainer import IndustryType, TrainingConfig, SpecializedModelTrainer

class TransferStrategy(Enum):
    """Different transfer learning strategies"""
    FEATURE_EXTRACTION = "feature_extraction"
    FINE_TUNING = "fine_tuning"
    PROGRESSIVE_UNFREEZING = "progressive_unfreezing"
    ADAPTER_LAYERS = "adapter_layers"
    KNOWLEDGE_DISTILLATION = "knowledge_distillation"
    DOMAIN_ADAPTATION = "domain_adaptation"

class DomainSimilarity(Enum):
    """Domain similarity levels"""
    VERY_HIGH = "very_high"    # 0.8+
    HIGH = "high"              # 0.6-0.8
    MEDIUM = "medium"          # 0.4-0.6
    LOW = "low"               # 0.2-0.4
    VERY_LOW = "very_low"     # <0.2

@dataclass
class TransferLearningConfig:
    """Configuration for transfer learning"""
    source_domain: IndustryType
    target_domain: IndustryType
    source_model_path: str
    target_model_path: str
    transfer_strategy: TransferStrategy
    
    # Layer selection for transfer
    layers_to_transfer: List[int] = None
    layers_to_freeze: List[int] = None
    
    # Adapter configuration
    adapter_dim: int = 64
    adapter_layers: List[int] = None
    
    # Progressive unfreezing
    unfreeze_schedule: List[Tuple[int, List[int]]] = None
    
    # Domain adaptation
    domain_discriminator_hidden: int = 256
    domain_adaptation_weight: float = 0.1
    
    # Training configuration
    max_epochs: int = 10
    learning_rate: float = 1e-4
    batch_size: int = 16
    early_stopping_patience: int = 3
    
    def __post_init__(self):
        if self.layers_to_transfer is None:
            self.layers_to_transfer = [-1, -2, -3, -4]  # Last 4 layers
        if self.adapter_layers is None:
            self.adapter_layers = [-1, -2, -3]  # Last 3 layers

class DomainSimilarityAnalyzer:
    """
    Analyzes similarity between different business domains for optimal transfer learning
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.domain_profiles = {}
        self.similarity_matrix = None
        
    def analyze_domain_similarity(
        self,
        domain1: IndustryType,
        domain2: IndustryType,
        model1_path: str,
        model2_path: str
    ) -> Tuple[float, Dict[str, Any]]:
        """
        Analyze similarity between two domains
        
        Returns:
            similarity_score: Float between 0-1
            analysis_details: Detailed analysis breakdown
        """
        
        # Load domain profiles
        profile1 = self._load_domain_profile(domain1, model1_path)
        profile2 = self._load_domain_profile(domain2, model2_path)
        
        # Calculate different similarity metrics
        vocabulary_similarity = self._calculate_vocabulary_similarity(profile1, profile2)
        embedding_similarity = self._calculate_embedding_similarity(profile1, profile2)
        task_similarity = self._calculate_task_similarity(profile1, profile2)
        
        # Weighted combination
        weights = {'vocabulary': 0.3, 'embedding': 0.5, 'task': 0.2}
        overall_similarity = (
            weights['vocabulary'] * vocabulary_similarity +
            weights['embedding'] * embedding_similarity +
            weights['task'] * task_similarity
        )
        
        analysis_details = {
            'vocabulary_similarity': vocabulary_similarity,
            'embedding_similarity': embedding_similarity,
            'task_similarity': task_similarity,
            'overall_similarity': overall_similarity,
            'similarity_level': self._get_similarity_level(overall_similarity),
            'recommended_strategy': self._recommend_transfer_strategy(overall_similarity),
            'transfer_confidence': self._calculate_transfer_confidence(overall_similarity)
        }
        
        return overall_similarity, analysis_details
    
    def _load_domain_profile(self, domain: IndustryType, model_path: str) -> Dict[str, Any]:
        """Load or create domain profile"""
        if domain in self.domain_profiles:
            return self.domain_profiles[domain]
        
        profile = {
            'domain': domain,
            'model_path': model_path,
            'vocabulary': self._extract_domain_vocabulary(model_path),
            'embeddings': self._extract_representative_embeddings(model_path),
            'task_characteristics': self._analyze_task_characteristics(domain)
        }
        
        self.domain_profiles[domain] = profile
        return profile
    
    def _extract_domain_vocabulary(self, model_path: str) -> Dict[str, float]:
        """Extract domain-specific vocabulary and frequencies"""
        # In practice, this would analyze the model's tokenizer and vocabulary
        # For now, return predefined domain vocabularies
        
        domain_vocabs = {
            IndustryType.FINANCIAL_SERVICES: {
                'financial_terms': ['revenue', 'profit', 'loss', 'assets', 'liabilities', 'equity', 
                                  'cash_flow', 'roi', 'npv', 'irr', 'ebitda', 'valuation',
                                  'risk', 'portfolio', 'investment', 'trading', 'derivatives'],
                'regulatory_terms': ['compliance', 'regulation', 'audit', 'governance', 'sox',
                                   'basel', 'mifid', 'dodd_frank', 'ccar', 'stress_test'],
                'market_terms': ['market', 'volatility', 'liquidity', 'spread', 'yield',
                               'bond', 'equity', 'commodity', 'currency', 'forex']
            },
            IndustryType.HEALTHCARE: {
                'clinical_terms': ['patient', 'diagnosis', 'treatment', 'therapy', 'clinical',
                                 'medical', 'healthcare', 'physician', 'nurse', 'hospital'],
                'regulatory_terms': ['hipaa', 'fda', 'clinical_trial', 'compliance', 'privacy',
                                   'informed_consent', 'adverse_event', 'quality_assurance'],
                'operational_terms': ['workflow', 'efficiency', 'outcomes', 'quality', 'safety',
                                    'cost_effectiveness', 'population_health', 'preventive_care']
            },
            IndustryType.MANUFACTURING: {
                'production_terms': ['production', 'manufacturing', 'assembly', 'quality_control',
                                   'supply_chain', 'inventory', 'procurement', 'logistics'],
                'operational_terms': ['efficiency', 'productivity', 'lean', 'six_sigma', 'kaizen',
                                    'automation', 'robotics', 'iot', 'predictive_maintenance'],
                'quality_terms': ['quality', 'defect', 'inspection', 'testing', 'certification',
                                'iso', 'standard', 'specification', 'tolerance', 'variance']
            },
            IndustryType.TECHNOLOGY: {
                'development_terms': ['development', 'software', 'programming', 'coding', 'testing',
                                    'deployment', 'agile', 'scrum', 'devops', 'continuous_integration'],
                'technical_terms': ['architecture', 'scalability', 'performance', 'security',
                                  'infrastructure', 'cloud', 'microservices', 'api', 'database'],
                'business_terms': ['product', 'feature', 'user_experience', 'customer', 'market',
                                 'innovation', 'competitive_advantage', 'monetization', 'growth']
            }
        }
        
        # Flatten vocabulary with frequency weights
        flattened_vocab = {}
        for category, terms in domain_vocabs.get(IndustryType.FINANCIAL_SERVICES, {}).items():
            for term in terms:
                flattened_vocab[term] = np.random.uniform(0.1, 1.0)  # Simulate frequency
        
        return flattened_vocab
    
    def _extract_representative_embeddings(self, model_path: str) -> np.ndarray:
        """Extract representative embeddings from model"""
        # In practice, this would load the actual model and extract embeddings
        # For now, return simulated embeddings
        return np.random.normal(0, 1, (100, 768))  # 100 representative embeddings
    
    def _analyze_task_characteristics(self, domain: IndustryType) -> Dict[str, Any]:
        """Analyze task characteristics for a domain"""
        task_profiles = {
            IndustryType.FINANCIAL_SERVICES: {
                'primary_tasks': ['risk_assessment', 'valuation', 'compliance_checking', 'market_analysis'],
                'data_types': ['numerical', 'time_series', 'categorical', 'text'],
                'complexity_level': 'high',
                'regulation_heavy': True,
                'numerical_focus': True
            },
            IndustryType.HEALTHCARE: {
                'primary_tasks': ['diagnosis_support', 'treatment_planning', 'outcome_prediction', 'compliance'],
                'data_types': ['clinical_notes', 'numerical', 'categorical', 'time_series'],
                'complexity_level': 'very_high',
                'regulation_heavy': True,
                'numerical_focus': False
            },
            IndustryType.MANUFACTURING: {
                'primary_tasks': ['quality_control', 'process_optimization', 'predictive_maintenance', 'supply_chain'],
                'data_types': ['sensor_data', 'numerical', 'time_series', 'categorical'],
                'complexity_level': 'medium',
                'regulation_heavy': False,
                'numerical_focus': True
            },
            IndustryType.TECHNOLOGY: {
                'primary_tasks': ['product_development', 'performance_optimization', 'user_analysis', 'market_research'],
                'data_types': ['text', 'numerical', 'categorical', 'user_behavior'],
                'complexity_level': 'medium',
                'regulation_heavy': False,
                'numerical_focus': False
            }
        }
        
        return task_profiles.get(domain, {})
    
    def _calculate_vocabulary_similarity(self, profile1: Dict, profile2: Dict) -> float:
        """Calculate vocabulary similarity between domains"""
        vocab1 = set(profile1['vocabulary'].keys())
        vocab2 = set(profile2['vocabulary'].keys())
        
        intersection = len(vocab1.intersection(vocab2))
        union = len(vocab1.union(vocab2))
        
        return intersection / union if union > 0 else 0.0
    
    def _calculate_embedding_similarity(self, profile1: Dict, profile2: Dict) -> float:
        """Calculate embedding similarity between domains"""
        emb1 = profile1['embeddings']
        emb2 = profile2['embeddings']
        
        # Calculate mean embeddings
        mean_emb1 = np.mean(emb1, axis=0)
        mean_emb2 = np.mean(emb2, axis=0)
        
        # Calculate cosine similarity
        similarity = cosine_similarity([mean_emb1], [mean_emb2])[0][0]
        return max(0, similarity)  # Ensure non-negative
    
    def _calculate_task_similarity(self, profile1: Dict, profile2: Dict) -> float:
        """Calculate task similarity between domains"""
        tasks1 = profile1['task_characteristics']
        tasks2 = profile2['task_characteristics']
        
        # Compare different aspects
        similarities = []
        
        # Data types similarity
        data_types1 = set(tasks1.get('data_types', []))
        data_types2 = set(tasks2.get('data_types', []))
        data_similarity = len(data_types1.intersection(data_types2)) / len(data_types1.union(data_types2))
        similarities.append(data_similarity)
        
        # Complexity similarity
        complexity_map = {'low': 1, 'medium': 2, 'high': 3, 'very_high': 4}
        comp1 = complexity_map.get(tasks1.get('complexity_level', 'medium'), 2)
        comp2 = complexity_map.get(tasks2.get('complexity_level', 'medium'), 2)
        complexity_similarity = 1 - abs(comp1 - comp2) / 3
        similarities.append(complexity_similarity)
        
        # Regulation similarity
        reg1 = tasks1.get('regulation_heavy', False)
        reg2 = tasks2.get('regulation_heavy', False)
        regulation_similarity = 1.0 if reg1 == reg2 else 0.5
        similarities.append(regulation_similarity)
        
        return np.mean(similarities)
    
    def _get_similarity_level(self, similarity_score: float) -> DomainSimilarity:
        """Convert similarity score to level"""
        if similarity_score >= 0.8:
            return DomainSimilarity.VERY_HIGH
        elif similarity_score >= 0.6:
            return DomainSimilarity.HIGH
        elif similarity_score >= 0.4:
            return DomainSimilarity.MEDIUM
        elif similarity_score >= 0.2:
            return DomainSimilarity.LOW
        else:
            return DomainSimilarity.VERY_LOW
    
    def _recommend_transfer_strategy(self, similarity_score: float) -> TransferStrategy:
        """Recommend transfer strategy based on similarity"""
        if similarity_score >= 0.7:
            return TransferStrategy.FINE_TUNING
        elif similarity_score >= 0.5:
            return TransferStrategy.PROGRESSIVE_UNFREEZING
        elif similarity_score >= 0.3:
            return TransferStrategy.ADAPTER_LAYERS
        else:
            return TransferStrategy.FEATURE_EXTRACTION
    
    def _calculate_transfer_confidence(self, similarity_score: float) -> float:
        """Calculate confidence in transfer learning success"""
        # Sigmoid-like function to map similarity to confidence
        return 1 / (1 + np.exp(-10 * (similarity_score - 0.5)))
    
    def create_similarity_matrix(self, domains: List[IndustryType], model_paths: Dict[IndustryType, str]):
        """Create similarity matrix for all domain pairs"""
        n_domains = len(domains)
        similarity_matrix = np.zeros((n_domains, n_domains))
        
        for i, domain1 in enumerate(domains):
            for j, domain2 in enumerate(domains):
                if i == j:
                    similarity_matrix[i][j] = 1.0
                elif i < j:  # Calculate only upper triangle
                    similarity, _ = self.analyze_domain_similarity(
                        domain1, domain2, 
                        model_paths[domain1], model_paths[domain2]
                    )
                    similarity_matrix[i][j] = similarity
                    similarity_matrix[j][i] = similarity
        
        self.similarity_matrix = similarity_matrix
        
        # Create visualization
        self._visualize_similarity_matrix(domains, similarity_matrix)
        
        return similarity_matrix
    
    def _visualize_similarity_matrix(self, domains: List[IndustryType], similarity_matrix: np.ndarray):
        """Visualize domain similarity matrix"""
        plt.figure(figsize=(10, 8))
        
        domain_names = [domain.value.replace('_', ' ').title() for domain in domains]
        
        sns.heatmap(
            similarity_matrix,
            annot=True,
            cmap='RdYlBu_r',
            xticklabels=domain_names,
            yticklabels=domain_names,
            square=True,
            fmt='.3f'
        )
        
        plt.title('Domain Similarity Matrix')
        plt.tight_layout()
        plt.savefig('domain_similarity_matrix.png', dpi=300, bbox_inches='tight')
        plt.close()

class AdapterLayer(nn.Module):
    """
    Adapter layer for efficient domain transfer
    """
    
    def __init__(self, hidden_size: int, adapter_size: int = 64):
        super().__init__()
        self.hidden_size = hidden_size
        self.adapter_size = adapter_size
        
        self.down_project = nn.Linear(hidden_size, adapter_size)
        self.up_project = nn.Linear(adapter_size, hidden_size)
        self.activation = nn.ReLU()
        self.dropout = nn.Dropout(0.1)
        
    def forward(self, x):
        # Residual connection with adapter
        adapter_output = self.up_project(
            self.dropout(self.activation(self.down_project(x)))
        )
        return x + adapter_output

class DomainDiscriminator(nn.Module):
    """
    Domain discriminator for domain adaptation
    """
    
    def __init__(self, hidden_size: int, num_domains: int):
        super().__init__()
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_size // 2, hidden_size // 4),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_size // 4, num_domains)
        )
    
    def forward(self, x):
        return self.classifier(x)

class DomainTransferTrainer(SpecializedModelTrainer):
    """
    Specialized trainer for domain transfer learning
    """
    
    def __init__(self, config: TransferLearningConfig):
        # Convert to TrainingConfig
        training_config = TrainingConfig(
            model_name=f"transfer_{config.source_domain.value}_to_{config.target_domain.value}",
            base_model_path=config.source_model_path,
            industry=config.target_domain,
            model_size=None,  # Will be inferred
            training_phase=None,  # Will be set based on strategy
            batch_size=config.batch_size,
            learning_rate=config.learning_rate,
            num_epochs=config.max_epochs,
            train_data_path="",  # Will be set later
            validation_data_path=""
        )
        
        super().__init__(training_config)
        self.transfer_config = config
        self.adapters = {}
        self.domain_discriminator = None
        
    def setup_transfer_learning(self):
        """Setup model for transfer learning based on strategy"""
        strategy = self.transfer_config.transfer_strategy
        
        if strategy == TransferStrategy.FEATURE_EXTRACTION:
            self._setup_feature_extraction()
        elif strategy == TransferStrategy.FINE_TUNING:
            self._setup_fine_tuning()
        elif strategy == TransferStrategy.PROGRESSIVE_UNFREEZING:
            self._setup_progressive_unfreezing()
        elif strategy == TransferStrategy.ADAPTER_LAYERS:
            self._setup_adapter_layers()
        elif strategy == TransferStrategy.DOMAIN_ADAPTATION:
            self._setup_domain_adaptation()
    
    def _setup_feature_extraction(self):
        """Setup for feature extraction (freeze most layers)"""
        # Freeze all layers except the last few
        for name, param in self.model.named_parameters():
            if not any(str(layer) in name for layer in self.transfer_config.layers_to_transfer):
                param.requires_grad = False
        
        self.logger.info("Set up feature extraction: froze base layers")
    
    def _setup_fine_tuning(self):
        """Setup for fine-tuning (all layers trainable with lower LR)"""
        # All parameters trainable, but we'll use different learning rates
        for param in self.model.parameters():
            param.requires_grad = True
        
        self.logger.info("Set up fine-tuning: all layers trainable")
    
    def _setup_progressive_unfreezing(self):
        """Setup for progressive unfreezing"""
        # Start with all layers frozen
        for param in self.model.parameters():
            param.requires_grad = False
        
        # Only unfreeze the last layer initially
        for name, param in self.model.named_parameters():
            if str(-1) in name:  # Last layer
                param.requires_grad = True
        
        self.logger.info("Set up progressive unfreezing: starting with last layer only")
    
    def _setup_adapter_layers(self):
        """Setup adapter layers"""
        # Freeze original model
        for param in self.model.parameters():
            param.requires_grad = False
        
        # Add adapter layers
        hidden_size = self.model.config.hidden_size
        
        for layer_idx in self.transfer_config.adapter_layers:
            adapter = AdapterLayer(hidden_size, self.transfer_config.adapter_dim)
            self.adapters[f"adapter_{layer_idx}"] = adapter
            
            # Insert adapter into model
            # Note: This is simplified - actual implementation would need
            # to modify the model architecture
        
        self.logger.info(f"Set up adapter layers: {len(self.adapters)} adapters added")
    
    def _setup_domain_adaptation(self):
        """Setup domain adaptation with adversarial training"""
        # All parameters trainable
        for param in self.model.parameters():
            param.requires_grad = True
        
        # Add domain discriminator
        hidden_size = self.model.config.hidden_size
        num_domains = 2  # Source and target
        
        self.domain_discriminator = DomainDiscriminator(hidden_size, num_domains)
        
        self.logger.info("Set up domain adaptation with discriminator")
    
    def progressive_unfreeze_step(self, epoch: int):
        """Perform progressive unfreezing based on schedule"""
        if not self.transfer_config.unfreeze_schedule:
            return
        
        for unfreeze_epoch, layers_to_unfreeze in self.transfer_config.unfreeze_schedule:
            if epoch == unfreeze_epoch:
                for name, param in self.model.named_parameters():
                    if any(str(layer) in name for layer in layers_to_unfreeze):
                        param.requires_grad = True
                        
                self.logger.info(f"Epoch {epoch}: Unfroze layers {layers_to_unfreeze}")
    
    def compute_domain_adaptation_loss(self, features, domain_labels):
        """Compute domain adaptation loss"""
        if self.domain_discriminator is None:
            return torch.tensor(0.0)
        
        # Domain classification loss
        domain_predictions = self.domain_discriminator(features)
        domain_loss = F.cross_entropy(domain_predictions, domain_labels)
        
        # Gradient reversal (simplified - would use GradientReversalLayer in practice)
        return -self.transfer_config.domain_adaptation_weight * domain_loss
    
    def evaluate_transfer_effectiveness(self, target_test_loader: DataLoader) -> Dict[str, float]:
        """Evaluate effectiveness of transfer learning"""
        self.model.eval()
        
        total_loss = 0
        correct_predictions = 0
        total_predictions = 0
        
        with torch.no_grad():
            for batch in target_test_loader:
                outputs = self.model(**batch)
                loss = outputs.loss
                total_loss += loss.item()
                
                # Calculate accuracy (simplified)
                predictions = torch.argmax(outputs.logits, dim=-1)
                labels = batch.get('labels', batch.get('input_ids'))
                
                if labels is not None:
                    correct_predictions += (predictions == labels).sum().item()
                    total_predictions += labels.numel()
        
        avg_loss = total_loss / len(target_test_loader)
        accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
        
        return {
            'transfer_loss': avg_loss,
            'transfer_accuracy': accuracy,
            'transfer_perplexity': np.exp(avg_loss)
        }

class TransferLearningPipeline:
    """
    Complete pipeline for domain transfer learning
    """
    
    def __init__(self, similarity_analyzer: DomainSimilarityAnalyzer):
        self.similarity_analyzer = similarity_analyzer
        self.logger = logging.getLogger(__name__)
        self.transfer_history = []
    
    def create_transfer_plan(
        self,
        source_domain: IndustryType,
        target_domain: IndustryType,
        source_model_path: str,
        target_data_path: str
    ) -> TransferLearningConfig:
        """Create optimal transfer learning plan"""
        
        # Analyze domain similarity
        similarity_score, analysis = self.similarity_analyzer.analyze_domain_similarity(
            source_domain, target_domain, source_model_path, ""
        )
        
        # Create transfer configuration based on analysis
        config = TransferLearningConfig(
            source_domain=source_domain,
            target_domain=target_domain,
            source_model_path=source_model_path,
            target_model_path=f"./models/{target_domain.value}_transfer_model",
            transfer_strategy=analysis['recommended_strategy']
        )
        
        # Adjust configuration based on similarity
        if similarity_score >= 0.7:
            # High similarity - aggressive fine-tuning
            config.learning_rate = 2e-5
            config.max_epochs = 5
        elif similarity_score >= 0.4:
            # Medium similarity - conservative approach
            config.learning_rate = 1e-5
            config.max_epochs = 8
            config.transfer_strategy = TransferStrategy.PROGRESSIVE_UNFREEZING
        else:
            # Low similarity - feature extraction
            config.learning_rate = 5e-5
            config.max_epochs = 10
            config.transfer_strategy = TransferStrategy.ADAPTER_LAYERS
        
        self.logger.info(f"Created transfer plan: {source_domain.value} -> {target_domain.value}")
        self.logger.info(f"Similarity: {similarity_score:.3f}, Strategy: {config.transfer_strategy.value}")
        
        return config
    
    def execute_transfer(self, config: TransferLearningConfig, train_data_path: str, val_data_path: str) -> Dict[str, Any]:
        """Execute transfer learning process"""
        
        # Create trainer
        trainer = DomainTransferTrainer(config)
        
        # Setup transfer learning
        trainer.setup_transfer_learning()
        
        # Update data paths
        trainer.config.train_data_path = train_data_path
        trainer.config.validation_data_path = val_data_path
        
        # Execute training
        training_results = trainer.train()
        
        # Evaluate transfer effectiveness
        # (This would use actual test data in practice)
        transfer_metrics = {
            'source_domain': config.source_domain.value,
            'target_domain': config.target_domain.value,
            'transfer_strategy': config.transfer_strategy.value,
            'final_loss': training_results.get('final_loss', 0),
            'training_completed': True
        }
        
        # Record transfer
        self.transfer_history.append({
            'timestamp': datetime.now().isoformat(),
            'config': config,
            'results': transfer_metrics
        })
        
        self.logger.info(f"Transfer learning completed: {config.source_domain.value} -> {config.target_domain.value}")
        
        return transfer_metrics
    
    def recommend_transfer_path(
        self,
        target_domain: IndustryType,
        available_models: Dict[IndustryType, str]
    ) -> List[Tuple[IndustryType, float]]:
        """Recommend best source domains for transfer learning"""
        
        recommendations = []
        
        for source_domain, model_path in available_models.items():
            if source_domain == target_domain:
                continue
            
            similarity_score, _ = self.similarity_analyzer.analyze_domain_similarity(
                source_domain, target_domain, model_path, ""
            )
            
            recommendations.append((source_domain, similarity_score))
        
        # Sort by similarity score (descending)
        recommendations.sort(key=lambda x: x[1], reverse=True)
        
        return recommendations
    
    def create_transfer_visualization(self, domains: List[IndustryType], model_paths: Dict[IndustryType, str]):
        """Create visualization of transfer learning recommendations"""
        
        # Create similarity matrix
        similarity_matrix = self.similarity_analyzer.create_similarity_matrix(domains, model_paths)
        
        # Create transfer recommendation heatmap
        plt.figure(figsize=(12, 10))
        
        # Create recommendation matrix (asymmetric)
        n_domains = len(domains)
        recommendation_matrix = np.zeros((n_domains, n_domains))
        
        for i, target_domain in enumerate(domains):
            recommendations = self.recommend_transfer_path(target_domain, model_paths)
            for j, (source_domain, score) in enumerate(recommendations):
                source_idx = domains.index(source_domain)
                recommendation_matrix[i][source_idx] = score
        
        domain_names = [domain.value.replace('_', ' ').title() for domain in domains]
        
        sns.heatmap(
            recommendation_matrix,
            annot=True,
            cmap='RdYlGn',
            xticklabels=[f"From {name}" for name in domain_names],
            yticklabels=[f"To {name}" for name in domain_names],
            fmt='.3f'
        )
        
        plt.title('Transfer Learning Recommendations\n(Rows: Target Domain, Columns: Source Domain)')
        plt.tight_layout()
        plt.savefig('transfer_recommendations.png', dpi=300, bbox_inches='tight')
        plt.close()
        
        return recommendation_matrix
