"""
Financial Services Specialized Training Examples

Comprehensive examples for financial services model training,
including risk assessment, fraud detection, and regulatory compliance.
"""

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import pandas as pd
import numpy as np
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

from ..core.base_trainer import SpecializedModelTrainer, TrainingConfig, IndustryType
from ..core.transfer_learning import DomainTransferTrainer
from ..core.continuous_training import ContinuousTrainingPipeline
from ..core.benchmarks import BenchmarkSuite
from ..core.distillation import DistillationPipeline, DistillationConfig
from ..core.domain_optimization import DomainOptimizer, OptimizationConfig

class FinancialDataset(Dataset):
    """Custom dataset for financial services training"""
    
    def __init__(self, data_path: str, task_type: str = "risk_assessment"):
        self.task_type = task_type
        self.data = self._load_financial_data(data_path)
        self.tokenizer = None  # Would be initialized with actual tokenizer
    
    def _load_financial_data(self, data_path: str) -> List[Dict[str, Any]]:
        """Load financial training data"""
        
        if self.task_type == "risk_assessment":
            return self._create_risk_assessment_data()
        elif self.task_type == "fraud_detection":
            return self._create_fraud_detection_data()
        elif self.task_type == "compliance":
            return self._create_compliance_data()
        else:
            return []
    
    def _create_risk_assessment_data(self) -> List[Dict[str, Any]]:
        """Create synthetic risk assessment training data"""
        
        data = []
        
        # Example 1: Credit Risk Assessment
        data.append({
            "input_text": "Customer profile: Credit Score 720, Annual Income $75,000, "
                         "Debt-to-Income Ratio 0.35, Employment: 5 years stable, "
                         "Loan Amount: $250,000 for home purchase. Assess credit risk.",
            "target": {
                "risk_level": "low_to_medium",
                "recommendation": "approve",
                "conditions": ["income_verification", "property_appraisal"],
                "reasoning": "Good credit score and stable income, DTI within acceptable range"
            },
            "labels": 1  # Approve
        })
        
        # Example 2: High Risk Assessment
        data.append({
            "input_text": "Customer profile: Credit Score 580, Annual Income $45,000, "
                         "Debt-to-Income Ratio 0.55, Employment: 1 year, multiple job changes, "
                         "Loan Amount: $300,000 for investment property. Assess credit risk.",
            "target": {
                "risk_level": "high",
                "recommendation": "reject",
                "conditions": [],
                "reasoning": "Low credit score, high DTI ratio, unstable employment history"
            },
            "labels": 0  # Reject
        })
        
        # Example 3: Market Risk Assessment
        data.append({
            "input_text": "Portfolio Analysis: 60% equities, 30% bonds, 10% alternatives. "
                         "Current market conditions: High volatility, rising interest rates. "
                         "Client risk tolerance: Moderate. Assess portfolio risk.",
            "target": {
                "risk_level": "medium_to_high",
                "recommendation": "rebalance",
                "conditions": ["reduce_equity_exposure", "increase_fixed_income"],
                "reasoning": "High equity exposure during volatile market conditions"
            },
            "labels": 2  # Rebalance
        })
        
        return data
    
    def _create_fraud_detection_data(self) -> List[Dict[str, Any]]:
        """Create synthetic fraud detection training data"""
        
        data = []
        
        # Example 1: Suspicious Transaction Pattern
        data.append({
            "input_text": "Transaction Analysis: Amount $9,500, Location: Different country, "
                         "Time: 3 AM local time, Frequency: 5th large transaction this week, "
                         "Account: Normally small transactions. Analyze for fraud.",
            "target": {
                "fraud_probability": 0.85,
                "risk_factors": ["unusual_location", "unusual_time", "amount_pattern"],
                "recommendation": "flag_for_review",
                "confidence": 0.90
            },
            "labels": 1  # Fraudulent
        })
        
        # Example 2: Normal Transaction
        data.append({
            "input_text": "Transaction Analysis: Amount $125, Location: Regular merchant, "
                         "Time: 2 PM, Frequency: Normal pattern, "
                         "Account: Consistent with spending history. Analyze for fraud.",
            "target": {
                "fraud_probability": 0.05,
                "risk_factors": [],
                "recommendation": "approve",
                "confidence": 0.95
            },
            "labels": 0  # Legitimate
        })
        
        return data
    
    def _create_compliance_data(self) -> List[Dict[str, Any]]:
        """Create synthetic compliance training data"""
        
        data = []
        
        # Example 1: AML Compliance Check
        data.append({
            "input_text": "Customer Due Diligence: Large cash deposit $15,000, "
                         "Customer occupation: Cash-intensive business, "
                         "Transaction history: Sporadic large deposits, "
                         "Documentation: Incomplete business records. Check AML compliance.",
            "target": {
                "compliance_status": "requires_investigation",
                "risk_level": "high",
                "required_actions": ["enhanced_due_diligence", "sar_filing_consideration"],
                "regulatory_requirements": ["BSA", "USA_PATRIOT_Act"]
            },
            "labels": 1  # Requires investigation
        })
        
        return data
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        # In a real implementation, you would tokenize the input text
        # For this example, we'll return the raw data
        return {
            "input_text": item["input_text"],
            "target": item["target"],
            "labels": torch.tensor(item["labels"], dtype=torch.long)
        }

class FinancialServicesTrainingExample:
    """Complete example for financial services model training"""
    
    def __init__(self, output_dir: str = "financial_models"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
    def run_complete_training_pipeline(self):
        """Run complete training pipeline for financial services"""
        
        print("Starting Financial Services Training Pipeline")
        print("=" * 50)
        
        # 1. Risk Assessment Model Training
        print("\n1. Training Risk Assessment Model...")
        risk_model = self.train_risk_assessment_model()
        
        # 2. Fraud Detection Model Training
        print("\n2. Training Fraud Detection Model...")
        fraud_model = self.train_fraud_detection_model()
        
        # 3. Compliance Model Training
        print("\n3. Training Compliance Model...")
        compliance_model = self.train_compliance_model()
        
        # 4. Transfer Learning Example
        print("\n4. Demonstrating Transfer Learning...")
        self.demonstrate_transfer_learning(risk_model)
        
        # 5. Continuous Training Setup
        print("\n5. Setting up Continuous Training...")
        self.setup_continuous_training()
        
        # 6. Model Benchmarking
        print("\n6. Running Benchmarks...")
        self.run_benchmarks(risk_model)
        
        # 7. Model Distillation
        print("\n7. Performing Model Distillation...")
        self.perform_model_distillation(risk_model)
        
        # 8. Domain Optimization
        print("\n8. Applying Domain Optimization...")
        self.apply_domain_optimization(risk_model)
        
        print("\nFinancial Services Training Pipeline Complete!")
    
    def train_risk_assessment_model(self) -> nn.Module:
        """Train a risk assessment model"""
        
        # Create training configuration
        config = TrainingConfig(
            model_name="financial-risk-bert",
            industry=IndustryType.FINANCIAL_SERVICES,
            num_epochs=5,
            batch_size=16,
            learning_rate=2e-5,
            output_dir=str(self.output_dir / "risk_assessment")
        )
        
        # Create trainer
        trainer = SpecializedModelTrainer(config)
        
        # Load risk assessment data
        train_dataset = FinancialDataset("train_data.json", "risk_assessment")
        eval_dataset = FinancialDataset("eval_data.json", "risk_assessment")
        
        train_dataloader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
        eval_dataloader = DataLoader(eval_dataset, batch_size=config.batch_size)
        
        # Create a simple model for demonstration
        class RiskAssessmentModel(nn.Module):
            def __init__(self, vocab_size=10000, hidden_size=256, num_classes=3):
                super().__init__()
                self.embedding = nn.Embedding(vocab_size, hidden_size)
                self.lstm = nn.LSTM(hidden_size, hidden_size, batch_first=True)
                self.classifier = nn.Linear(hidden_size, num_classes)
                self.dropout = nn.Dropout(0.1)
            
            def forward(self, input_ids, **kwargs):
                x = self.embedding(input_ids)
                lstm_out, _ = self.lstm(x)
                pooled = lstm_out.mean(dim=1)  # Simple pooling
                x = self.dropout(pooled)
                logits = self.classifier(x)
                return {"logits": logits}
        
        model = RiskAssessmentModel()
        
        # Train model (simplified training loop)
        print("Training risk assessment model...")
        model.train()
        optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate)
        
        for epoch in range(config.num_epochs):
            total_loss = 0
            for batch in train_dataloader:
                optimizer.zero_grad()
                
                # Simulate input_ids from text (in practice, use tokenizer)
                input_ids = torch.randint(0, 10000, (config.batch_size, 128))
                outputs = model(input_ids)
                
                loss = nn.CrossEntropyLoss()(outputs["logits"], batch["labels"])
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            print(f"Epoch {epoch + 1}/{config.num_epochs}, Loss: {total_loss / len(train_dataloader):.4f}")
        
        # Save model
        model_path = self.output_dir / "risk_assessment" / "model.pt"
        model_path.parent.mkdir(exist_ok=True)
        torch.save(model.state_dict(), model_path)
        
        print(f"Risk assessment model saved to {model_path}")
        return model
    
    def train_fraud_detection_model(self) -> nn.Module:
        """Train a fraud detection model"""
        
        config = TrainingConfig(
            model_name="financial-fraud-bert",
            industry=IndustryType.FINANCIAL_SERVICES,
            num_epochs=5,
            batch_size=16,
            learning_rate=2e-5,
            output_dir=str(self.output_dir / "fraud_detection")
        )
        
        # Create datasets
        train_dataset = FinancialDataset("train_data.json", "fraud_detection")
        eval_dataset = FinancialDataset("eval_data.json", "fraud_detection")
        
        train_dataloader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
        eval_dataloader = DataLoader(eval_dataset, batch_size=config.batch_size)
        
        # Create fraud detection model
        class FraudDetectionModel(nn.Module):
            def __init__(self, vocab_size=10000, hidden_size=256):
                super().__init__()
                self.embedding = nn.Embedding(vocab_size, hidden_size)
                self.transformer = nn.TransformerEncoder(
                    nn.TransformerEncoderLayer(
                        d_model=hidden_size,
                        nhead=8,
                        dim_feedforward=1024,
                        dropout=0.1
                    ),
                    num_layers=6
                )
                self.classifier = nn.Linear(hidden_size, 2)  # Binary classification
                self.dropout = nn.Dropout(0.1)
            
            def forward(self, input_ids, **kwargs):
                x = self.embedding(input_ids)
                x = self.transformer(x.transpose(0, 1)).transpose(0, 1)
                pooled = x.mean(dim=1)
                x = self.dropout(pooled)
                logits = self.classifier(x)
                return {"logits": logits}
        
        model = FraudDetectionModel()
        
        # Training loop
        print("Training fraud detection model...")
        model.train()
        optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate)
        
        for epoch in range(config.num_epochs):
            total_loss = 0
            for batch in train_dataloader:
                optimizer.zero_grad()
                
                input_ids = torch.randint(0, 10000, (config.batch_size, 128))
                outputs = model(input_ids)
                
                loss = nn.CrossEntropyLoss()(outputs["logits"], batch["labels"])
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            print(f"Epoch {epoch + 1}/{config.num_epochs}, Loss: {total_loss / len(train_dataloader):.4f}")
        
        # Save model
        model_path = self.output_dir / "fraud_detection" / "model.pt"
        model_path.parent.mkdir(exist_ok=True)
        torch.save(model.state_dict(), model_path)
        
        print(f"Fraud detection model saved to {model_path}")
        return model
    
    def train_compliance_model(self) -> nn.Module:
        """Train a compliance model"""
        
        config = TrainingConfig(
            model_name="financial-compliance-bert",
            industry=IndustryType.FINANCIAL_SERVICES,
            num_epochs=5,
            batch_size=16,
            learning_rate=2e-5,
            output_dir=str(self.output_dir / "compliance")
        )
        
        # Create datasets
        train_dataset = FinancialDataset("train_data.json", "compliance")
        eval_dataset = FinancialDataset("eval_data.json", "compliance")
        
        train_dataloader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True)
        eval_dataloader = DataLoader(eval_dataset, batch_size=config.batch_size)
        
        # Create compliance model
        class ComplianceModel(nn.Module):
            def __init__(self, vocab_size=10000, hidden_size=256):
                super().__init__()
                self.embedding = nn.Embedding(vocab_size, hidden_size)
                self.lstm = nn.LSTM(hidden_size, hidden_size, batch_first=True, bidirectional=True)
                self.attention = nn.MultiheadAttention(hidden_size * 2, num_heads=8)
                self.classifier = nn.Linear(hidden_size * 2, 2)  # Compliant/Non-compliant
                self.dropout = nn.Dropout(0.1)
            
            def forward(self, input_ids, **kwargs):
                x = self.embedding(input_ids)
                lstm_out, _ = self.lstm(x)
                
                # Apply attention
                attn_out, _ = self.attention(
                    lstm_out.transpose(0, 1),
                    lstm_out.transpose(0, 1),
                    lstm_out.transpose(0, 1)
                )
                attn_out = attn_out.transpose(0, 1)
                
                pooled = attn_out.mean(dim=1)
                x = self.dropout(pooled)
                logits = self.classifier(x)
                return {"logits": logits}
        
        model = ComplianceModel()
        
        # Training loop
        print("Training compliance model...")
        model.train()
        optimizer = torch.optim.AdamW(model.parameters(), lr=config.learning_rate)
        
        for epoch in range(config.num_epochs):
            total_loss = 0
            for batch in train_dataloader:
                optimizer.zero_grad()
                
                input_ids = torch.randint(0, 10000, (config.batch_size, 128))
                outputs = model(input_ids)
                
                loss = nn.CrossEntropyLoss()(outputs["logits"], batch["labels"])
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item()
            
            print(f"Epoch {epoch + 1}/{config.num_epochs}, Loss: {total_loss / len(train_dataloader):.4f}")
        
        # Save model
        model_path = self.output_dir / "compliance" / "model.pt"
        model_path.parent.mkdir(exist_ok=True)
        torch.save(model.state_dict(), model_path)
        
        print(f"Compliance model saved to {model_path}")
        return model
    
    def demonstrate_transfer_learning(self, source_model: nn.Module):
        """Demonstrate transfer learning between financial tasks"""
        
        print("Demonstrating transfer learning from risk assessment to credit scoring...")
        
        # Create transfer learning trainer
        transfer_trainer = DomainTransferTrainer()
        
        # Simulate transfer learning
        # In practice, this would use the actual transfer learning implementation
        target_model = self._create_credit_scoring_model()
        
        print("Transfer learning completed. Credit scoring model ready.")
        
        # Save transferred model
        model_path = self.output_dir / "transfer_learning" / "credit_scoring_model.pt"
        model_path.parent.mkdir(exist_ok=True)
        torch.save(target_model.state_dict(), model_path)
        
        return target_model
    
    def _create_credit_scoring_model(self) -> nn.Module:
        """Create a credit scoring model for transfer learning"""
        
        class CreditScoringModel(nn.Module):
            def __init__(self, vocab_size=10000, hidden_size=256):
                super().__init__()
                self.embedding = nn.Embedding(vocab_size, hidden_size)
                self.lstm = nn.LSTM(hidden_size, hidden_size, batch_first=True)
                self.regressor = nn.Linear(hidden_size, 1)  # Credit score output
                self.dropout = nn.Dropout(0.1)
            
            def forward(self, input_ids, **kwargs):
                x = self.embedding(input_ids)
                lstm_out, _ = self.lstm(x)
                pooled = lstm_out.mean(dim=1)
                x = self.dropout(pooled)
                score = self.regressor(x)
                return {"score": score}
        
        return CreditScoringModel()
    
    def setup_continuous_training(self):
        """Setup continuous training for regulatory updates"""
        
        print("Setting up continuous training pipeline...")
        
        # Create continuous training pipeline
        pipeline = ContinuousTrainingPipeline()
        
        # Add financial regulatory sources
        regulatory_sources = [
            {
                "name": "SEC_RSS",
                "url": "https://www.sec.gov/news/pressreleases.rss",
                "type": "rss"
            },
            {
                "name": "FINRA_Updates",
                "url": "https://www.finra.org/rules-guidance/rulebooks/finra-rules",
                "type": "web"
            },
            {
                "name": "Basel_Committee",
                "url": "https://www.bis.org/list/bcbs/index.htm",
                "type": "web"
            }
        ]
        
        # Configure monitoring
        for source in regulatory_sources:
            print(f"Configured monitoring for {source['name']}")
        
        print("Continuous training pipeline configured for regulatory updates.")
        
        # Save configuration
        config_path = self.output_dir / "continuous_training" / "config.json"
        config_path.parent.mkdir(exist_ok=True)
        
        with open(config_path, 'w') as f:
            json.dump({
                "regulatory_sources": regulatory_sources,
                "monitoring_frequency": "daily",
                "training_trigger_threshold": 10,
                "automatic_deployment": False
            }, f, indent=2)
    
    def run_benchmarks(self, model: nn.Module):
        """Run financial services benchmarks"""
        
        print("Running financial services benchmarks...")
        
        # Create benchmark suite
        benchmark_suite = BenchmarkSuite()
        
        # Run financial services specific benchmarks
        results = benchmark_suite.run_comprehensive_benchmark(
            model=model,
            model_name="financial_risk_model",
            industries=[IndustryType.FINANCIAL_SERVICES]
        )
        
        print(f"Benchmark results:")
        print(f"- Overall accuracy: {results['overall_summary'].get('overall_accuracy', 'N/A')}")
        print(f"- Benchmarks completed: {results['overall_summary'].get('total_benchmarks', 0)}")
        
        # Save benchmark results
        results_path = self.output_dir / "benchmarks" / "financial_benchmarks.json"
        results_path.parent.mkdir(exist_ok=True)
        
        with open(results_path, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"Benchmark results saved to {results_path}")
    
    def perform_model_distillation(self, teacher_model: nn.Module):
        """Perform model distillation for deployment"""
        
        print("Performing model distillation for efficient deployment...")
        
        # Create distillation configuration
        distillation_config = DistillationConfig(
            teacher_model_path="teacher_model.pt",
            student_model_config={
                "hidden_size": 128,  # Smaller than teacher
                "num_layers": 3
            },
            compression_ratio=0.5,
            num_epochs=3,
            temperature=4.0,
            alpha=0.7,
            output_dir=str(self.output_dir / "distillation")
        )
        
        # Create distillation pipeline
        distillation_pipeline = DistillationPipeline(distillation_config)
        
        # Define deployment targets
        deployment_targets = [
            {
                "name": "mobile_trading_app",
                "compression_ratio": 0.3,
                "latency_requirement_ms": 50,
                "mobile_deployment": True
            },
            {
                "name": "edge_fraud_detection",
                "compression_ratio": 0.4,
                "latency_requirement_ms": 100,
                "edge_deployment": True
            },
            {
                "name": "cloud_risk_assessment",
                "compression_ratio": 0.6,
                "accuracy_threshold": 0.95
            }
        ]
        
        print(f"Distillation configured for {len(deployment_targets)} deployment targets")
        
        # Save distillation configuration
        config_path = self.output_dir / "distillation" / "config.json"
        config_path.parent.mkdir(exist_ok=True)
        
        with open(config_path, 'w') as f:
            json.dump({
                "distillation_config": distillation_config.__dict__,
                "deployment_targets": deployment_targets
            }, f, indent=2, default=str)
        
        print("Model distillation configuration saved.")
    
    def apply_domain_optimization(self, model: nn.Module):
        """Apply financial services domain optimization"""
        
        print("Applying financial services domain optimization...")
        
        # Create optimization configuration
        from ..core.domain_optimization import OptimizationType, OptimizationTechnique
        
        optimization_config = OptimizationConfig(
            industry=IndustryType.FINANCIAL_SERVICES,
            optimization_type=OptimizationType.ACCURACY_OPTIMIZATION,
            target_metrics=["accuracy", "latency", "compliance"],
            techniques=[
                OptimizationTechnique.MIXED_PRECISION,
                OptimizationTechnique.GRADIENT_CHECKPOINTING,
                OptimizationTechnique.ADAPTIVE_LEARNING_RATE
            ],
            target_accuracy=0.95,
            max_latency_ms=100.0,
            output_dir=str(self.output_dir / "optimization")
        )
        
        # Create domain optimizer
        optimizer = DomainOptimizer(optimization_config)
        
        print("Domain optimization configured with accuracy and compliance focus.")
        
        # Save optimization configuration
        config_path = self.output_dir / "optimization" / "config.json"
        config_path.parent.mkdir(exist_ok=True)
        
        with open(config_path, 'w') as f:
            json.dump({
                "optimization_config": optimization_config.__dict__,
                "target_metrics": optimization_config.target_metrics,
                "techniques_applied": [t.value for t in optimization_config.techniques]
            }, f, indent=2, default=str)
        
        print("Domain optimization configuration saved.")

def main():
    """Main function to run financial services training example"""
    
    # Create and run financial services training example
    example = FinancialServicesTrainingExample()
    example.run_complete_training_pipeline()

if __name__ == "__main__":
    main()
