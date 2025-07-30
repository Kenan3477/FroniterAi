"""
Quick Start Scripts for Frontier-1 Training Pipeline

Convenience scripts for common training workflows including setup,
quick training, evaluation, and incremental updates.
"""

import os
import sys
import json
import shutil
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
import argparse
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FrontierTrainingManager:
    """Manager for Frontier-1 training workflows"""
    
    def __init__(self, base_dir: str = "."):
        self.base_dir = Path(base_dir)
        self.training_dir = self.base_dir / "training"
        self.data_dir = self.base_dir / "data"
        self.models_dir = self.base_dir / "models"
        self.outputs_dir = self.base_dir / "outputs"
    
    def setup_environment(self):
        """Setup training environment"""
        logger.info("Setting up Frontier-1 training environment...")
        
        # Create directory structure
        directories = [
            self.data_dir / "raw",
            self.data_dir / "processed",
            self.models_dir / "checkpoints",
            self.models_dir / "final",
            self.outputs_dir / "logs",
            self.outputs_dir / "evaluation",
            self.outputs_dir / "hyperopt"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created directory: {directory}")
        
        # Install requirements
        self.install_requirements()
        
        # Download required models and data
        self.download_dependencies()
        
        logger.info("Environment setup completed!")
    
    def install_requirements(self):
        """Install Python requirements"""
        requirements_file = self.training_dir / "requirements.txt"
        
        if requirements_file.exists():
            logger.info("Installing Python requirements...")
            subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
            ], check=True)
        else:
            logger.warning(f"Requirements file not found: {requirements_file}")
    
    def download_dependencies(self):
        """Download required models and NLTK data"""
        logger.info("Downloading dependencies...")
        
        # Download NLTK data
        import nltk
        nltk.download('punkt', quiet=True)
        nltk.download('stopwords', quiet=True)
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
        
        # Download spaCy model
        try:
            subprocess.run([
                sys.executable, "-m", "spacy", "download", "en_core_web_sm"
            ], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            logger.warning("Failed to download spaCy model. Install manually with: python -m spacy download en_core_web_sm")
    
    def quick_train(
        self,
        data_dir: str,
        output_dir: Optional[str] = None,
        quick_mode: bool = True
    ) -> str:
        """Run quick training for testing and development"""
        logger.info("Starting quick training...")
        
        if output_dir is None:
            output_dir = str(self.outputs_dir / "quick_train")
        
        # Create quick training config
        config = self.create_quick_config(data_dir, output_dir, quick_mode)
        config_file = Path(output_dir) / "quick_config.yaml"
        
        # Save config
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        with open(config_file, 'w') as f:
            import yaml
            yaml.dump(config, f, default_flow_style=False)
        
        # Run training
        train_script = self.training_dir / "scripts" / "train_model.py"
        cmd = [
            sys.executable, str(train_script),
            "train",
            "--config", str(config_file),
            "--output-dir", output_dir
        ]
        
        subprocess.run(cmd, check=True)
        
        logger.info(f"Quick training completed. Output: {output_dir}")
        return output_dir
    
    def create_quick_config(
        self,
        data_dir: str,
        output_dir: str,
        quick_mode: bool = True
    ) -> Dict[str, Any]:
        """Create configuration for quick training"""
        
        config = {
            'model_name': 'microsoft/DialoGPT-small' if quick_mode else 'microsoft/DialoGPT-large',
            'data': {
                'raw_data_dir': data_dir,
                'preprocessing': {
                    'chunk_size': 256 if quick_mode else 512,
                    'overlap_size': 25 if quick_mode else 50,
                    'quality_threshold': 0.5 if quick_mode else 0.7,
                    'parallel_processing': False if quick_mode else True,
                    'num_workers': 1 if quick_mode else 4
                },
                'train_ratio': 0.8,
                'val_ratio': 0.1,
                'test_ratio': 0.1
            },
            'training_config': {
                'learning_rate': 5e-5,
                'batch_size': 4 if quick_mode else 16,
                'num_epochs': 1 if quick_mode else 3,
                'warmup_ratio': 0.1,
                'weight_decay': 0.01,
                'use_lora': True,
                'lora_r': 8,
                'lora_alpha': 16,
                'save_strategy': 'no' if quick_mode else 'epoch',
                'evaluation_strategy': 'no' if quick_mode else 'epoch',
                'logging_steps': 10 if quick_mode else 50,
                'fp16': False if quick_mode else True,
                'dataloader_num_workers': 0 if quick_mode else 2
            },
            'hyperparameter_optimization': {
                'enabled': False
            },
            'monitoring': {
                'wandb': {'enabled': False},
                'tensorboard': {'enabled': False if quick_mode else True}
            },
            'debug': {
                'dev_mode': quick_mode,
                'fast_dev_run': quick_mode
            }
        }
        
        return config
    
    def run_production_training(
        self,
        config_file: str,
        output_dir: Optional[str] = None
    ) -> str:
        """Run full production training"""
        logger.info("Starting production training...")
        
        if output_dir is None:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = str(self.outputs_dir / f"production_{timestamp}")
        
        # Run training
        train_script = self.training_dir / "scripts" / "train_model.py"
        cmd = [
            sys.executable, str(train_script),
            "train",
            "--config", config_file,
            "--output-dir", output_dir
        ]
        
        subprocess.run(cmd, check=True)
        
        logger.info(f"Production training completed. Output: {output_dir}")
        return output_dir
    
    def run_hyperparameter_optimization(
        self,
        data_dir: str,
        n_trials: int = 50,
        output_dir: Optional[str] = None
    ) -> str:
        """Run hyperparameter optimization"""
        logger.info("Starting hyperparameter optimization...")
        
        if output_dir is None:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = str(self.outputs_dir / f"hyperopt_{timestamp}")
        
        # Create hyperopt config
        config = self.create_hyperopt_config(data_dir, n_trials)
        config_file = Path(output_dir) / "hyperopt_config.yaml"
        
        # Save config
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        with open(config_file, 'w') as f:
            import yaml
            yaml.dump(config, f, default_flow_style=False)
        
        # Run optimization
        train_script = self.training_dir / "scripts" / "train_model.py"
        cmd = [
            sys.executable, str(train_script),
            "train",
            "--config", str(config_file),
            "--output-dir", output_dir
        ]
        
        subprocess.run(cmd, check=True)
        
        logger.info(f"Hyperparameter optimization completed. Output: {output_dir}")
        return output_dir
    
    def create_hyperopt_config(self, data_dir: str, n_trials: int) -> Dict[str, Any]:
        """Create configuration for hyperparameter optimization"""
        
        config = {
            'model_name': 'microsoft/DialoGPT-large',
            'data': {
                'raw_data_dir': data_dir,
                'preprocessing': {
                    'chunk_size': 512,
                    'overlap_size': 50,
                    'quality_threshold': 0.7
                }
            },
            'training_config': {
                'num_epochs': 3,  # Base value, will be optimized
                'save_strategy': 'no',
                'evaluation_strategy': 'epoch'
            },
            'hyperparameter_optimization': {
                'enabled': True,
                'method': 'bayesian',
                'n_trials': n_trials,
                'timeout': 7200
            }
        }
        
        return config
    
    def run_incremental_training(
        self,
        base_model_path: str,
        new_data_dir: str,
        output_dir: Optional[str] = None
    ) -> str:
        """Run incremental training on new data"""
        logger.info("Starting incremental training...")
        
        if output_dir is None:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = str(self.outputs_dir / f"incremental_{timestamp}")
        
        # Run incremental training
        train_script = self.training_dir / "scripts" / "train_model.py"
        cmd = [
            sys.executable, str(train_script),
            "incremental",
            "--base-model", base_model_path,
            "--new-data", new_data_dir,
            "--output-dir", output_dir
        ]
        
        subprocess.run(cmd, check=True)
        
        logger.info(f"Incremental training completed. Output: {output_dir}")
        return output_dir
    
    def evaluate_model(
        self,
        model_path: str,
        test_data_path: str,
        output_dir: Optional[str] = None
    ) -> Dict[str, Any]:
        """Evaluate existing model"""
        logger.info("Starting model evaluation...")
        
        if output_dir is None:
            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_dir = str(self.outputs_dir / f"evaluation_{timestamp}")
        
        # Run evaluation
        train_script = self.training_dir / "scripts" / "train_model.py"
        cmd = [
            sys.executable, str(train_script),
            "evaluate",
            "--model", model_path,
            "--test-data", test_data_path,
            "--output-dir", output_dir
        ]
        
        subprocess.run(cmd, check=True)
        
        # Load results
        results_file = Path(output_dir) / "evaluation_report.json"
        if results_file.exists():
            with open(results_file, 'r') as f:
                results = json.load(f)
        else:
            results = {}
        
        logger.info(f"Model evaluation completed. Output: {output_dir}")
        return results
    
    def create_sample_data(self, output_dir: str, num_samples: int = 100):
        """Create sample training data for testing"""
        logger.info(f"Creating sample data with {num_samples} samples...")
        
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Sample business documents
        samples = []
        
        for i in range(num_samples):
            # Financial reports
            if i % 4 == 0:
                sample = {
                    "text": f"Q{(i%4)+1} Financial Report: Revenue increased by {15+i%10}% to ${2.5+i*0.1:.1f}M. Net income rose to ${0.5+i*0.05:.1f}M due to improved operational efficiency.",
                    "label": "financial_report",
                    "metadata": {"quarter": f"Q{(i%4)+1}", "year": 2023}
                }
            
            # Regulatory documents
            elif i % 4 == 1:
                sample = {
                    "text": f"Compliance Report: The company maintains SOX compliance with internal controls tested quarterly. Risk assessment shows {85+i%10}% compliance rate across all departments.",
                    "label": "regulatory_document",
                    "metadata": {"compliance_type": "SOX", "assessment_date": "2023-01-01"}
                }
            
            # Strategic documents
            elif i % 4 == 2:
                sample = {
                    "text": f"Strategic Analysis: Market research indicates {20+i%15}% growth opportunity in the Asia-Pacific region. Recommend expanding operations to capture market share.",
                    "label": "strategic_document",
                    "metadata": {"analysis_type": "market_expansion", "region": "APAC"}
                }
            
            # Business correspondence
            else:
                sample = {
                    "text": f"Business Update: Meeting scheduled to discuss Q{(i%4)+1} performance metrics. Action items include reviewing operational KPIs and budget allocation for next quarter.",
                    "label": "business_correspondence",
                    "metadata": {"meeting_type": "quarterly_review", "quarter": f"Q{(i%4)+1}"}
                }
            
            samples.append(sample)
        
        # Save samples
        samples_file = output_path / "sample_data.json"
        with open(samples_file, 'w') as f:
            json.dump(samples, f, indent=2)
        
        logger.info(f"Sample data created: {samples_file}")
        return str(samples_file)
    
    def status(self) -> Dict[str, Any]:
        """Get status of training environment"""
        status = {
            "environment": {
                "base_dir": str(self.base_dir),
                "training_dir_exists": self.training_dir.exists(),
                "data_dir_exists": self.data_dir.exists(),
                "models_dir_exists": self.models_dir.exists(),
                "outputs_dir_exists": self.outputs_dir.exists()
            },
            "recent_outputs": [],
            "available_models": []
        }
        
        # Check for recent outputs
        if self.outputs_dir.exists():
            for item in self.outputs_dir.iterdir():
                if item.is_dir():
                    status["recent_outputs"].append({
                        "name": item.name,
                        "path": str(item),
                        "modified": item.stat().st_mtime
                    })
        
        # Check for available models
        if self.models_dir.exists():
            for item in self.models_dir.iterdir():
                if item.is_dir():
                    status["available_models"].append({
                        "name": item.name,
                        "path": str(item)
                    })
        
        return status

def main():
    """Command line interface for quick start scripts"""
    parser = argparse.ArgumentParser(description="Frontier-1 Training Quick Start")
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Setup command
    setup_parser = subparsers.add_parser('setup', help='Setup training environment')
    
    # Quick train command
    quick_train_parser = subparsers.add_parser('quick-train', help='Run quick training')
    quick_train_parser.add_argument('--data-dir', required=True, help='Data directory')
    quick_train_parser.add_argument('--output-dir', help='Output directory')
    quick_train_parser.add_argument('--full-mode', action='store_true', help='Use full model instead of quick mode')
    
    # Production train command
    prod_train_parser = subparsers.add_parser('prod-train', help='Run production training')
    prod_train_parser.add_argument('--config', required=True, help='Configuration file')
    prod_train_parser.add_argument('--output-dir', help='Output directory')
    
    # Hyperparameter optimization command
    hyperopt_parser = subparsers.add_parser('hyperopt', help='Run hyperparameter optimization')
    hyperopt_parser.add_argument('--data-dir', required=True, help='Data directory')
    hyperopt_parser.add_argument('--n-trials', type=int, default=50, help='Number of trials')
    hyperopt_parser.add_argument('--output-dir', help='Output directory')
    
    # Incremental training command
    incremental_parser = subparsers.add_parser('incremental', help='Run incremental training')
    incremental_parser.add_argument('--base-model', required=True, help='Base model path')
    incremental_parser.add_argument('--new-data', required=True, help='New data directory')
    incremental_parser.add_argument('--output-dir', help='Output directory')
    
    # Evaluation command
    eval_parser = subparsers.add_parser('evaluate', help='Evaluate model')
    eval_parser.add_argument('--model', required=True, help='Model path')
    eval_parser.add_argument('--test-data', required=True, help='Test data path')
    eval_parser.add_argument('--output-dir', help='Output directory')
    
    # Sample data command
    sample_parser = subparsers.add_parser('create-sample', help='Create sample data')
    sample_parser.add_argument('--output-dir', required=True, help='Output directory')
    sample_parser.add_argument('--num-samples', type=int, default=100, help='Number of samples')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Check environment status')
    
    args = parser.parse_args()
    
    # Initialize manager
    manager = FrontierTrainingManager()
    
    if args.command == 'setup':
        manager.setup_environment()
    
    elif args.command == 'quick-train':
        output_dir = manager.quick_train(
            data_dir=args.data_dir,
            output_dir=args.output_dir,
            quick_mode=not args.full_mode
        )
        print(f"Quick training completed: {output_dir}")
    
    elif args.command == 'prod-train':
        output_dir = manager.run_production_training(
            config_file=args.config,
            output_dir=args.output_dir
        )
        print(f"Production training completed: {output_dir}")
    
    elif args.command == 'hyperopt':
        output_dir = manager.run_hyperparameter_optimization(
            data_dir=args.data_dir,
            n_trials=args.n_trials,
            output_dir=args.output_dir
        )
        print(f"Hyperparameter optimization completed: {output_dir}")
    
    elif args.command == 'incremental':
        output_dir = manager.run_incremental_training(
            base_model_path=args.base_model,
            new_data_dir=args.new_data,
            output_dir=args.output_dir
        )
        print(f"Incremental training completed: {output_dir}")
    
    elif args.command == 'evaluate':
        results = manager.evaluate_model(
            model_path=args.model,
            test_data_path=args.test_data,
            output_dir=args.output_dir
        )
        print(f"Evaluation completed. Overall score: {results.get('overall_score', 'N/A')}")
    
    elif args.command == 'create-sample':
        sample_file = manager.create_sample_data(
            output_dir=args.output_dir,
            num_samples=args.num_samples
        )
        print(f"Sample data created: {sample_file}")
    
    elif args.command == 'status':
        status = manager.status()
        import json
        print(json.dumps(status, indent=2))
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
