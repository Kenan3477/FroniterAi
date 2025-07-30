"""
Training Execution Scripts

Complete training scripts for Frontier-1 business operations model
including both full training and incremental fine-tuning workflows.
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
import yaml
import shutil

# Add parent directories to path
sys.path.append(str(Path(__file__).parent.parent))

# Training imports
from models.frontier_trainer import TrainingConfig, BusinessTrainer, TrainingPipeline
from data_preprocessing.business_document_processor import BusinessDocumentPreprocessor
from evaluation.business_metrics import BusinessEvaluationSuite
from optimization.hyperparameter_optimizer import HyperparameterManager

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('training.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def setup_environment():
    """Setup training environment and dependencies"""
    logger.info("Setting up training environment...")
    
    # Create necessary directories
    directories = [
        "data/processed",
        "models/checkpoints",
        "models/final",
        "logs",
        "evaluation/results",
        "optimization/results"
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    # Set environment variables for optimal training
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    os.environ["WANDB_DISABLED"] = "true"  # Disable by default, enable as needed
    
    logger.info("Environment setup completed")

def preprocess_data(
    raw_data_dir: str,
    output_dir: str,
    config: Dict[str, Any]
) -> Dict[str, str]:
    """Preprocess business documents for training"""
    logger.info(f"Preprocessing data from {raw_data_dir}")
    
    # Initialize preprocessor
    preprocessor = BusinessDocumentPreprocessor(
        output_dir=output_dir,
        **config.get('preprocessing', {})
    )
    
    # Process documents
    processed_files = preprocessor.process_directory(raw_data_dir)
    
    # Split into train/val/test
    train_file, val_file, test_file = preprocessor.create_train_val_test_split(
        processed_files,
        train_ratio=config.get('train_ratio', 0.8),
        val_ratio=config.get('val_ratio', 0.1),
        test_ratio=config.get('test_ratio', 0.1)
    )
    
    logger.info(f"Data preprocessing completed")
    logger.info(f"Train: {train_file}, Val: {val_file}, Test: {test_file}")
    
    return {
        'train': train_file,
        'val': val_file,
        'test': test_file
    }

def run_hyperparameter_optimization(
    config: Dict[str, Any],
    data_files: Dict[str, str],
    output_dir: str
) -> Dict[str, Any]:
    """Run hyperparameter optimization"""
    logger.info("Starting hyperparameter optimization")
    
    hyperopt_config = config.get('hyperparameter_optimization', {})
    
    if not hyperopt_config.get('enabled', False):
        logger.info("Hyperparameter optimization disabled, using default parameters")
        return config.get('training_config', {})
    
    # Initialize hyperparameter manager
    manager = HyperparameterManager(output_dir)
    
    # Run optimization
    optimization_method = hyperopt_config.get('method', 'bayesian')
    
    if optimization_method == 'bayesian':
        result = manager.run_bayesian_optimization(
            model_name=config['model_name'],
            train_data_path=data_files['train'],
            val_data_path=data_files['val'],
            n_trials=hyperopt_config.get('n_trials', 50),
            timeout=hyperopt_config.get('timeout')
        )
    elif optimization_method == 'grid':
        param_grid = hyperopt_config.get('param_grid', {})
        result = manager.run_grid_search(
            model_name=config['model_name'],
            train_data_path=data_files['train'],
            val_data_path=data_files['val'],
            param_grid=param_grid
        )
    else:
        raise ValueError(f"Unknown optimization method: {optimization_method}")
    
    logger.info(f"Hyperparameter optimization completed")
    logger.info(f"Best parameters: {result.best_params}")
    
    return result.best_params

def create_training_config(
    base_config: Dict[str, Any],
    optimized_params: Dict[str, Any],
    data_files: Dict[str, str],
    output_dir: str
) -> TrainingConfig:
    """Create training configuration"""
    
    # Merge base config with optimized parameters
    training_params = base_config.get('training_config', {})
    training_params.update(optimized_params)
    
    # Create training configuration
    config = TrainingConfig(
        model_name=base_config['model_name'],
        output_dir=output_dir,
        train_data_path=data_files['train'],
        val_data_path=data_files['val'],
        test_data_path=data_files.get('test'),
        **training_params
    )
    
    return config

def run_full_training(
    config_file: str,
    output_dir: str,
    resume_from_checkpoint: Optional[str] = None
) -> str:
    """Run complete training pipeline"""
    logger.info("Starting full training pipeline")
    
    # Load configuration
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    
    # Setup output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Save configuration
    config_backup = output_path / "training_config.yaml"
    shutil.copy2(config_file, config_backup)
    
    # Step 1: Preprocess data
    data_files = preprocess_data(
        raw_data_dir=config['data']['raw_data_dir'],
        output_dir=str(output_path / "processed_data"),
        config=config['data']
    )
    
    # Step 2: Hyperparameter optimization (optional)
    optimized_params = run_hyperparameter_optimization(
        config=config,
        data_files=data_files,
        output_dir=str(output_path / "hyperopt")
    )
    
    # Step 3: Create training configuration
    training_config = create_training_config(
        base_config=config,
        optimized_params=optimized_params,
        data_files=data_files,
        output_dir=str(output_path / "model")
    )
    
    # Step 4: Initialize training pipeline
    pipeline = TrainingPipeline(config=training_config)
    
    # Step 5: Setup distributed training if needed
    if config.get('distributed_training', {}).get('enabled', False):
        dist_config = config['distributed_training']
        pipeline.setup_distributed_training(
            world_size=dist_config.get('world_size', 1),
            rank=dist_config.get('rank', 0),
            backend=dist_config.get('backend', 'nccl')
        )
    
    # Step 6: Run training
    logger.info("Starting model training")
    training_result = pipeline.train(resume_from_checkpoint=resume_from_checkpoint)
    
    # Step 7: Evaluate model
    logger.info("Evaluating trained model")
    evaluation_result = pipeline.evaluate()
    
    # Step 8: Generate comprehensive evaluation report
    evaluator = BusinessEvaluationSuite()
    predictions = pipeline.generate_predictions(data_files['test'])
    references = pipeline.load_references(data_files['test'])
    
    eval_report = evaluator.generate_evaluation_report(
        predictions=predictions,
        references=references,
        output_file=str(output_path / "evaluation_report.json")
    )
    
    # Step 9: Save final model
    final_model_path = output_path / "final_model"
    pipeline.save_model(str(final_model_path))
    
    # Step 10: Generate training summary
    training_summary = {
        'training_config': training_config.__dict__,
        'training_result': training_result,
        'evaluation_result': evaluation_result,
        'eval_report': eval_report.to_dict(),
        'model_path': str(final_model_path),
        'data_files': data_files,
        'timestamp': datetime.now().isoformat()
    }
    
    summary_file = output_path / "training_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(training_summary, f, indent=2)
    
    logger.info(f"Full training completed successfully")
    logger.info(f"Model saved to: {final_model_path}")
    logger.info(f"Training summary: {summary_file}")
    
    return str(final_model_path)

def run_incremental_training(
    base_model_path: str,
    new_data_dir: str,
    output_dir: str,
    config_file: Optional[str] = None
) -> str:
    """Run incremental fine-tuning on new data"""
    logger.info("Starting incremental training")
    
    # Load configuration
    if config_file:
        with open(config_file, 'r') as f:
            config = yaml.safe_load(f)
    else:
        # Use default incremental training config
        config = {
            'model_name': base_model_path,
            'data': {
                'chunk_size': 512,
                'overlap_size': 50,
                'quality_threshold': 0.7
            },
            'training_config': {
                'learning_rate': 1e-5,
                'batch_size': 16,
                'num_epochs': 3,
                'warmup_ratio': 0.1,
                'weight_decay': 0.01,
                'lora_r': 16,
                'lora_alpha': 32,
                'save_strategy': 'epoch',
                'evaluation_strategy': 'epoch'
            }
        }
    
    # Setup output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Step 1: Preprocess new data
    data_files = preprocess_data(
        raw_data_dir=new_data_dir,
        output_dir=str(output_path / "processed_data"),
        config=config['data']
    )
    
    # Step 2: Create incremental training configuration
    training_config = TrainingConfig(
        model_name=base_model_path,
        output_dir=str(output_path / "incremental_model"),
        train_data_path=data_files['train'],
        val_data_path=data_files['val'],
        incremental_training=True,
        **config['training_config']
    )
    
    # Step 3: Initialize trainer
    trainer = BusinessTrainer(config=training_config)
    
    # Step 4: Load data and setup model
    trainer.load_data(data_files['train'], data_files['val'])
    trainer.setup_model()
    
    # Step 5: Run incremental training
    logger.info("Starting incremental training")
    training_result = trainer.train()
    
    # Step 6: Evaluate incremental model
    evaluation_result = trainer.evaluate()
    
    # Step 7: Save incremental model
    incremental_model_path = output_path / "incremental_model"
    trainer.save_model(str(incremental_model_path))
    
    # Step 8: Generate comparison with base model
    # TODO: Implement model comparison logic
    
    # Step 9: Generate training summary
    incremental_summary = {
        'base_model_path': base_model_path,
        'training_config': training_config.__dict__,
        'training_result': training_result,
        'evaluation_result': evaluation_result,
        'new_data_files': data_files,
        'incremental_model_path': str(incremental_model_path),
        'timestamp': datetime.now().isoformat()
    }
    
    summary_file = output_path / "incremental_training_summary.json"
    with open(summary_file, 'w') as f:
        json.dump(incremental_summary, f, indent=2)
    
    logger.info(f"Incremental training completed successfully")
    logger.info(f"Model saved to: {incremental_model_path}")
    logger.info(f"Training summary: {summary_file}")
    
    return str(incremental_model_path)

def run_evaluation_only(
    model_path: str,
    test_data_path: str,
    output_dir: str
) -> Dict[str, Any]:
    """Run evaluation on existing model"""
    logger.info(f"Running evaluation on model: {model_path}")
    
    # Setup output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Initialize evaluation suite
    evaluator = BusinessEvaluationSuite()
    
    # Load model and generate predictions
    # TODO: Implement model loading and prediction generation
    
    # For now, assume we have predictions and references
    # This would be replaced with actual model inference
    predictions = []  # Load from model inference
    references = []   # Load from test data
    
    # Generate evaluation report
    eval_report = evaluator.generate_evaluation_report(
        predictions=predictions,
        references=references,
        output_file=str(output_path / "evaluation_report.json")
    )
    
    logger.info(f"Evaluation completed. Overall score: {eval_report.overall_score:.4f}")
    
    return eval_report.to_dict()

def main():
    """Main script entry point"""
    parser = argparse.ArgumentParser(description="Frontier-1 Business Operations Training")
    
    subparsers = parser.add_subparsers(dest='command', help='Training commands')
    
    # Full training command
    train_parser = subparsers.add_parser('train', help='Run full training pipeline')
    train_parser.add_argument('--config', required=True, help='Training configuration file')
    train_parser.add_argument('--output-dir', required=True, help='Output directory')
    train_parser.add_argument('--resume-from-checkpoint', help='Resume from checkpoint')
    
    # Incremental training command
    incremental_parser = subparsers.add_parser('incremental', help='Run incremental training')
    incremental_parser.add_argument('--base-model', required=True, help='Base model path')
    incremental_parser.add_argument('--new-data', required=True, help='New data directory')
    incremental_parser.add_argument('--output-dir', required=True, help='Output directory')
    incremental_parser.add_argument('--config', help='Training configuration file')
    
    # Evaluation command
    eval_parser = subparsers.add_parser('evaluate', help='Run evaluation only')
    eval_parser.add_argument('--model', required=True, help='Model path')
    eval_parser.add_argument('--test-data', required=True, help='Test data path')
    eval_parser.add_argument('--output-dir', required=True, help='Output directory')
    
    # Setup command
    setup_parser = subparsers.add_parser('setup', help='Setup training environment')
    
    args = parser.parse_args()
    
    if args.command == 'setup':
        setup_environment()
    
    elif args.command == 'train':
        setup_environment()
        model_path = run_full_training(
            config_file=args.config,
            output_dir=args.output_dir,
            resume_from_checkpoint=args.resume_from_checkpoint
        )
        print(f"Training completed. Model saved to: {model_path}")
    
    elif args.command == 'incremental':
        setup_environment()
        model_path = run_incremental_training(
            base_model_path=args.base_model,
            new_data_dir=args.new_data,
            output_dir=args.output_dir,
            config_file=args.config
        )
        print(f"Incremental training completed. Model saved to: {model_path}")
    
    elif args.command == 'evaluate':
        evaluation_result = run_evaluation_only(
            model_path=args.model,
            test_data_path=args.test_data,
            output_dir=args.output_dir
        )
        print(f"Evaluation completed. Overall score: {evaluation_result.get('overall_score', 0):.4f}")
    
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
