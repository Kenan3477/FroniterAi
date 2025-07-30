"""
Hyperparameter Optimization for Business Operations Model

Advanced hyperparameter tuning with Bayesian optimization, multi-objective optimization,
and distributed hyperparameter search for efficient model training.
"""

import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
import logging
from pathlib import Path
import yaml
import time
from datetime import datetime

# Optimization libraries
import optuna
from optuna.integration import PyTorchLightningPruningCallback
from optuna.visualization import plot_optimization_history, plot_param_importances

# Machine learning
import torch
import torch.nn as nn
from transformers import TrainingArguments
from sklearn.model_selection import ParameterGrid
from sklearn.metrics import make_scorer

# Custom imports
from ..models.frontier_trainer import BusinessTrainer, TrainingConfig
from ..evaluation.business_metrics import BusinessEvaluationSuite

logger = logging.getLogger(__name__)

@dataclass
class HyperparameterSpace:
    """Definition of hyperparameter search space"""
    
    # Learning rate parameters
    learning_rate_min: float = 1e-6
    learning_rate_max: float = 1e-3
    learning_rate_log: bool = True
    
    # Batch size parameters
    batch_size_choices: List[int] = field(default_factory=lambda: [8, 16, 32, 64])
    
    # Training parameters
    num_epochs_min: int = 1
    num_epochs_max: int = 10
    warmup_ratio_min: float = 0.0
    warmup_ratio_max: float = 0.2
    
    # Regularization parameters
    weight_decay_min: float = 0.0
    weight_decay_max: float = 0.1
    dropout_min: float = 0.0
    dropout_max: float = 0.3
    
    # LoRA parameters
    lora_r_choices: List[int] = field(default_factory=lambda: [4, 8, 16, 32])
    lora_alpha_choices: List[int] = field(default_factory=lambda: [8, 16, 32, 64])
    lora_dropout_min: float = 0.0
    lora_dropout_max: float = 0.2
    
    # Optimizer parameters
    optimizer_choices: List[str] = field(default_factory=lambda: ['adamw', 'adafactor'])
    scheduler_choices: List[str] = field(default_factory=lambda: ['linear', 'cosine', 'polynomial'])
    
    # Gradient parameters
    max_grad_norm_choices: List[float] = field(default_factory=lambda: [0.5, 1.0, 2.0])
    gradient_accumulation_steps_choices: List[int] = field(default_factory=lambda: [1, 2, 4, 8])
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'learning_rate': {
                'min': self.learning_rate_min,
                'max': self.learning_rate_max,
                'log': self.learning_rate_log
            },
            'batch_size': {'choices': self.batch_size_choices},
            'num_epochs': {'min': self.num_epochs_min, 'max': self.num_epochs_max},
            'warmup_ratio': {'min': self.warmup_ratio_min, 'max': self.warmup_ratio_max},
            'weight_decay': {'min': self.weight_decay_min, 'max': self.weight_decay_max},
            'dropout': {'min': self.dropout_min, 'max': self.dropout_max},
            'lora_r': {'choices': self.lora_r_choices},
            'lora_alpha': {'choices': self.lora_alpha_choices},
            'lora_dropout': {'min': self.lora_dropout_min, 'max': self.lora_dropout_max},
            'optimizer': {'choices': self.optimizer_choices},
            'scheduler': {'choices': self.scheduler_choices},
            'max_grad_norm': {'choices': self.max_grad_norm_choices},
            'gradient_accumulation_steps': {'choices': self.gradient_accumulation_steps_choices}
        }

@dataclass
class OptimizationResult:
    """Container for optimization results"""
    best_params: Dict[str, Any]
    best_score: float
    optimization_history: List[Dict[str, Any]]
    study_summary: Dict[str, Any]
    timestamp: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'best_params': self.best_params,
            'best_score': self.best_score,
            'optimization_history': self.optimization_history,
            'study_summary': self.study_summary,
            'timestamp': self.timestamp
        }

class BayesianHyperparameterOptimizer:
    """Bayesian optimization for hyperparameter tuning"""
    
    def __init__(
        self,
        model_name: str,
        search_space: HyperparameterSpace,
        train_data_path: str,
        val_data_path: str,
        output_dir: str,
        n_trials: int = 50,
        timeout: Optional[int] = None,
        n_jobs: int = 1
    ):
        self.model_name = model_name
        self.search_space = search_space
        self.train_data_path = train_data_path
        self.val_data_path = val_data_path
        self.output_dir = Path(output_dir)
        self.n_trials = n_trials
        self.timeout = timeout
        self.n_jobs = n_jobs
        
        # Initialize evaluation suite
        self.evaluator = BusinessEvaluationSuite()
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize study
        self.study = None
        self._setup_study()
    
    def _setup_study(self):
        """Setup Optuna study for optimization"""
        study_name = f"{self.model_name}_hyperopt_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create study with pruning
        pruner = optuna.pruners.MedianPruner(
            n_startup_trials=5,
            n_warmup_steps=10,
            interval_steps=5
        )
        
        self.study = optuna.create_study(
            study_name=study_name,
            direction='maximize',
            pruner=pruner,
            sampler=optuna.samplers.TPESampler(seed=42)
        )
        
        logger.info(f"Created optimization study: {study_name}")
    
    def optimize(self) -> OptimizationResult:
        """Run hyperparameter optimization"""
        logger.info(f"Starting hyperparameter optimization with {self.n_trials} trials")
        
        # Run optimization
        self.study.optimize(
            self._objective,
            n_trials=self.n_trials,
            timeout=self.timeout,
            n_jobs=self.n_jobs,
            callbacks=[self._pruning_callback]
        )
        
        # Get results
        best_params = self.study.best_params
        best_score = self.study.best_value
        
        # Generate optimization history
        optimization_history = []
        for trial in self.study.trials:
            optimization_history.append({
                'trial_number': trial.number,
                'value': trial.value,
                'params': trial.params,
                'state': trial.state.name,
                'datetime_start': trial.datetime_start.isoformat() if trial.datetime_start else None,
                'datetime_complete': trial.datetime_complete.isoformat() if trial.datetime_complete else None
            })
        
        # Generate study summary
        study_summary = {
            'n_trials': len(self.study.trials),
            'best_trial': self.study.best_trial.number,
            'best_value': best_score,
            'study_name': self.study.study_name
        }
        
        # Create result object
        result = OptimizationResult(
            best_params=best_params,
            best_score=best_score,
            optimization_history=optimization_history,
            study_summary=study_summary,
            timestamp=datetime.now().isoformat()
        )
        
        # Save results
        self._save_results(result)
        
        # Generate visualizations
        self._generate_visualizations()
        
        logger.info(f"Optimization completed. Best score: {best_score:.4f}")
        logger.info(f"Best parameters: {best_params}")
        
        return result
    
    def _objective(self, trial: optuna.Trial) -> float:
        """Objective function for optimization"""
        try:
            # Sample hyperparameters
            params = self._sample_hyperparameters(trial)
            
            # Create training configuration
            config = self._create_training_config(params)
            
            # Train model with sampled parameters
            score = self._train_and_evaluate(config, trial)
            
            return score
        
        except Exception as e:
            logger.error(f"Error in trial {trial.number}: {e}")
            raise optuna.TrialPruned()
    
    def _sample_hyperparameters(self, trial: optuna.Trial) -> Dict[str, Any]:
        """Sample hyperparameters from search space"""
        params = {}
        
        # Learning rate
        if self.search_space.learning_rate_log:
            params['learning_rate'] = trial.suggest_float(
                'learning_rate',
                self.search_space.learning_rate_min,
                self.search_space.learning_rate_max,
                log=True
            )
        else:
            params['learning_rate'] = trial.suggest_float(
                'learning_rate',
                self.search_space.learning_rate_min,
                self.search_space.learning_rate_max
            )
        
        # Batch size
        params['batch_size'] = trial.suggest_categorical(
            'batch_size', self.search_space.batch_size_choices
        )
        
        # Number of epochs
        params['num_epochs'] = trial.suggest_int(
            'num_epochs',
            self.search_space.num_epochs_min,
            self.search_space.num_epochs_max
        )
        
        # Warmup ratio
        params['warmup_ratio'] = trial.suggest_float(
            'warmup_ratio',
            self.search_space.warmup_ratio_min,
            self.search_space.warmup_ratio_max
        )
        
        # Weight decay
        params['weight_decay'] = trial.suggest_float(
            'weight_decay',
            self.search_space.weight_decay_min,
            self.search_space.weight_decay_max
        )
        
        # Dropout
        params['dropout'] = trial.suggest_float(
            'dropout',
            self.search_space.dropout_min,
            self.search_space.dropout_max
        )
        
        # LoRA parameters
        params['lora_r'] = trial.suggest_categorical(
            'lora_r', self.search_space.lora_r_choices
        )
        
        params['lora_alpha'] = trial.suggest_categorical(
            'lora_alpha', self.search_space.lora_alpha_choices
        )
        
        params['lora_dropout'] = trial.suggest_float(
            'lora_dropout',
            self.search_space.lora_dropout_min,
            self.search_space.lora_dropout_max
        )
        
        # Optimizer
        params['optimizer'] = trial.suggest_categorical(
            'optimizer', self.search_space.optimizer_choices
        )
        
        # Scheduler
        params['scheduler'] = trial.suggest_categorical(
            'scheduler', self.search_space.scheduler_choices
        )
        
        # Gradient norm
        params['max_grad_norm'] = trial.suggest_categorical(
            'max_grad_norm', self.search_space.max_grad_norm_choices
        )
        
        # Gradient accumulation
        params['gradient_accumulation_steps'] = trial.suggest_categorical(
            'gradient_accumulation_steps',
            self.search_space.gradient_accumulation_steps_choices
        )
        
        return params
    
    def _create_training_config(self, params: Dict[str, Any]) -> TrainingConfig:
        """Create training configuration from parameters"""
        return TrainingConfig(
            model_name=self.model_name,
            output_dir=str(self.output_dir / f"trial_{params.get('trial_id', 'temp')}"),
            learning_rate=params['learning_rate'],
            batch_size=params['batch_size'],
            num_epochs=params['num_epochs'],
            warmup_ratio=params['warmup_ratio'],
            weight_decay=params['weight_decay'],
            dropout_rate=params['dropout'],
            lora_r=params['lora_r'],
            lora_alpha=params['lora_alpha'],
            lora_dropout=params['lora_dropout'],
            optimizer_name=params['optimizer'],
            scheduler_type=params['scheduler'],
            max_grad_norm=params['max_grad_norm'],
            gradient_accumulation_steps=params['gradient_accumulation_steps'],
            save_strategy="no",  # Don't save during optimization
            evaluation_strategy="epoch",
            logging_steps=50,
            dataloader_num_workers=2
        )
    
    def _train_and_evaluate(self, config: TrainingConfig, trial: optuna.Trial) -> float:
        """Train model and return evaluation score"""
        # Create trainer
        trainer = BusinessTrainer(config=config)
        
        # Load data
        trainer.load_data(self.train_data_path, self.val_data_path)
        
        # Setup model
        trainer.setup_model()
        
        # Create pruning callback
        pruning_callback = PyTorchLightningPruningCallback(trial, monitor="eval_loss")
        
        # Train model
        trainer.train(callbacks=[pruning_callback])
        
        # Evaluate model
        eval_results = trainer.evaluate()
        
        # Get evaluation metrics specific to business tasks
        predictions = trainer.predict()
        references = trainer.get_references()
        
        business_metrics = self.evaluator.evaluate_predictions(predictions, references)
        
        # Combine training metrics with business metrics
        combined_score = (
            eval_results.get('eval_loss', 1.0) * 0.3 +  # Lower is better
            business_metrics.get('overall_score', 0.0) * 0.7  # Higher is better
        )
        
        # Report intermediate value for pruning
        trial.report(combined_score, trainer.state.epoch)
        
        # Cleanup
        trainer.cleanup()
        
        return combined_score
    
    def _pruning_callback(self, study: optuna.Study, trial: optuna.Trial):
        """Callback for pruning unpromising trials"""
        if trial.should_prune():
            logger.info(f"Pruning trial {trial.number}")
            raise optuna.TrialPruned()
    
    def _save_results(self, result: OptimizationResult):
        """Save optimization results"""
        # Save main results
        results_file = self.output_dir / "optimization_results.json"
        with open(results_file, 'w') as f:
            json.dump(result.to_dict(), f, indent=2)
        
        # Save best parameters separately
        best_params_file = self.output_dir / "best_hyperparameters.yaml"
        with open(best_params_file, 'w') as f:
            yaml.dump(result.best_params, f, default_flow_style=False)
        
        # Save study
        study_file = self.output_dir / "optuna_study.pkl"
        optuna.save_study(self.study, str(study_file))
        
        logger.info(f"Results saved to {self.output_dir}")
    
    def _generate_visualizations(self):
        """Generate optimization visualizations"""
        try:
            # Optimization history
            fig_history = plot_optimization_history(self.study)
            fig_history.write_html(str(self.output_dir / "optimization_history.html"))
            
            # Parameter importances
            fig_importance = plot_param_importances(self.study)
            fig_importance.write_html(str(self.output_dir / "parameter_importances.html"))
            
            logger.info("Visualizations saved")
        
        except Exception as e:
            logger.warning(f"Error generating visualizations: {e}")

class GridSearchOptimizer:
    """Grid search optimizer for exhaustive hyperparameter search"""
    
    def __init__(
        self,
        model_name: str,
        param_grid: Dict[str, List[Any]],
        train_data_path: str,
        val_data_path: str,
        output_dir: str,
        cv_folds: int = 3
    ):
        self.model_name = model_name
        self.param_grid = param_grid
        self.train_data_path = train_data_path
        self.val_data_path = val_data_path
        self.output_dir = Path(output_dir)
        self.cv_folds = cv_folds
        
        # Initialize evaluation suite
        self.evaluator = BusinessEvaluationSuite()
        
        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def optimize(self) -> OptimizationResult:
        """Run grid search optimization"""
        logger.info("Starting grid search optimization")
        
        # Generate parameter combinations
        param_combinations = list(ParameterGrid(self.param_grid))
        logger.info(f"Total parameter combinations: {len(param_combinations)}")
        
        results = []
        best_score = -float('inf')
        best_params = None
        
        for i, params in enumerate(param_combinations):
            logger.info(f"Testing combination {i+1}/{len(param_combinations)}: {params}")
            
            try:
                # Create training configuration
                config = self._create_training_config(params)
                
                # Train and evaluate
                score = self._train_and_evaluate(config)
                
                results.append({
                    'params': params,
                    'score': score,
                    'combination_id': i
                })
                
                if score > best_score:
                    best_score = score
                    best_params = params
                
                logger.info(f"Score: {score:.4f}")
            
            except Exception as e:
                logger.error(f"Error in combination {i}: {e}")
                results.append({
                    'params': params,
                    'score': 0.0,
                    'combination_id': i,
                    'error': str(e)
                })
        
        # Create result object
        result = OptimizationResult(
            best_params=best_params,
            best_score=best_score,
            optimization_history=results,
            study_summary={
                'total_combinations': len(param_combinations),
                'successful_combinations': len([r for r in results if 'error' not in r])
            },
            timestamp=datetime.now().isoformat()
        )
        
        # Save results
        self._save_results(result)
        
        logger.info(f"Grid search completed. Best score: {best_score:.4f}")
        logger.info(f"Best parameters: {best_params}")
        
        return result
    
    def _create_training_config(self, params: Dict[str, Any]) -> TrainingConfig:
        """Create training configuration from parameters"""
        return TrainingConfig(
            model_name=self.model_name,
            output_dir=str(self.output_dir / f"grid_search_temp"),
            **params,
            save_strategy="no",
            evaluation_strategy="epoch",
            logging_steps=50,
            dataloader_num_workers=2
        )
    
    def _train_and_evaluate(self, config: TrainingConfig) -> float:
        """Train model and return evaluation score"""
        # Create trainer
        trainer = BusinessTrainer(config=config)
        
        # Load data
        trainer.load_data(self.train_data_path, self.val_data_path)
        
        # Setup model
        trainer.setup_model()
        
        # Train model
        trainer.train()
        
        # Evaluate model
        eval_results = trainer.evaluate()
        
        # Get business-specific evaluation
        predictions = trainer.predict()
        references = trainer.get_references()
        
        business_metrics = self.evaluator.evaluate_predictions(predictions, references)
        
        # Combine metrics
        combined_score = business_metrics.get('overall_score', 0.0)
        
        # Cleanup
        trainer.cleanup()
        
        return combined_score
    
    def _save_results(self, result: OptimizationResult):
        """Save grid search results"""
        results_file = self.output_dir / "grid_search_results.json"
        with open(results_file, 'w') as f:
            json.dump(result.to_dict(), f, indent=2)
        
        logger.info(f"Grid search results saved to {results_file}")

class HyperparameterManager:
    """Manager for hyperparameter optimization workflows"""
    
    def __init__(self, base_output_dir: str):
        self.base_output_dir = Path(base_output_dir)
        self.base_output_dir.mkdir(parents=True, exist_ok=True)
    
    def create_search_space(
        self,
        quick_search: bool = False,
        custom_ranges: Optional[Dict[str, Any]] = None
    ) -> HyperparameterSpace:
        """Create hyperparameter search space"""
        
        if quick_search:
            # Smaller search space for quick optimization
            search_space = HyperparameterSpace(
                learning_rate_min=1e-5,
                learning_rate_max=1e-3,
                batch_size_choices=[16, 32],
                num_epochs_min=2,
                num_epochs_max=5,
                lora_r_choices=[8, 16],
                lora_alpha_choices=[16, 32]
            )
        else:
            # Full search space
            search_space = HyperparameterSpace()
        
        # Apply custom ranges if provided
        if custom_ranges:
            for key, value in custom_ranges.items():
                if hasattr(search_space, key):
                    setattr(search_space, key, value)
        
        return search_space
    
    def run_bayesian_optimization(
        self,
        model_name: str,
        train_data_path: str,
        val_data_path: str,
        search_space: Optional[HyperparameterSpace] = None,
        n_trials: int = 50,
        timeout: Optional[int] = None
    ) -> OptimizationResult:
        """Run Bayesian optimization"""
        
        if search_space is None:
            search_space = self.create_search_space()
        
        output_dir = self.base_output_dir / f"bayesian_opt_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        optimizer = BayesianHyperparameterOptimizer(
            model_name=model_name,
            search_space=search_space,
            train_data_path=train_data_path,
            val_data_path=val_data_path,
            output_dir=str(output_dir),
            n_trials=n_trials,
            timeout=timeout
        )
        
        return optimizer.optimize()
    
    def run_grid_search(
        self,
        model_name: str,
        train_data_path: str,
        val_data_path: str,
        param_grid: Dict[str, List[Any]]
    ) -> OptimizationResult:
        """Run grid search optimization"""
        
        output_dir = self.base_output_dir / f"grid_search_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        optimizer = GridSearchOptimizer(
            model_name=model_name,
            param_grid=param_grid,
            train_data_path=train_data_path,
            val_data_path=val_data_path,
            output_dir=str(output_dir)
        )
        
        return optimizer.optimize()
    
    def compare_optimization_methods(
        self,
        model_name: str,
        train_data_path: str,
        val_data_path: str,
        quick_comparison: bool = True
    ) -> Dict[str, OptimizationResult]:
        """Compare different optimization methods"""
        
        results = {}
        
        # Bayesian optimization
        logger.info("Running Bayesian optimization...")
        search_space = self.create_search_space(quick_search=quick_comparison)
        n_trials = 20 if quick_comparison else 50
        
        bayesian_result = self.run_bayesian_optimization(
            model_name=model_name,
            train_data_path=train_data_path,
            val_data_path=val_data_path,
            search_space=search_space,
            n_trials=n_trials
        )
        results['bayesian'] = bayesian_result
        
        # Grid search with reduced space
        logger.info("Running grid search...")
        if quick_comparison:
            param_grid = {
                'learning_rate': [1e-5, 5e-5, 1e-4],
                'batch_size': [16, 32],
                'num_epochs': [2, 3],
                'lora_r': [8, 16]
            }
        else:
            param_grid = {
                'learning_rate': [1e-5, 5e-5, 1e-4, 5e-4],
                'batch_size': [16, 32, 64],
                'num_epochs': [2, 3, 5],
                'lora_r': [8, 16, 32]
            }
        
        grid_result = self.run_grid_search(
            model_name=model_name,
            train_data_path=train_data_path,
            val_data_path=val_data_path,
            param_grid=param_grid
        )
        results['grid_search'] = grid_result
        
        # Save comparison results
        comparison_file = self.base_output_dir / "optimization_comparison.json"
        comparison_data = {
            method: result.to_dict() for method, result in results.items()
        }
        
        with open(comparison_file, 'w') as f:
            json.dump(comparison_data, f, indent=2)
        
        logger.info(f"Optimization comparison saved to {comparison_file}")
        
        return results

def main():
    """Example usage of hyperparameter optimization"""
    
    # Initialize manager
    manager = HyperparameterManager("./hyperopt_results")
    
    # Run Bayesian optimization
    result = manager.run_bayesian_optimization(
        model_name="microsoft/DialoGPT-large",
        train_data_path="./data/train.json",
        val_data_path="./data/val.json",
        n_trials=30,
        timeout=3600  # 1 hour
    )
    
    print(f"Best score: {result.best_score:.4f}")
    print(f"Best parameters: {result.best_params}")

if __name__ == "__main__":
    main()
