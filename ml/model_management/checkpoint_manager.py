"""
Model Checkpoint Management System

Handles intelligent checkpoint creation, storage, pruning, and restoration
with automatic optimization and recovery capabilities.
"""

import asyncio
import json
import logging
import pickle
import shutil
import time
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, asdict
import threading

import torch
import torch.nn as nn
from torch.optim import Optimizer
from torch.optim.lr_scheduler import _LRScheduler
import numpy as np

from .storage_manager import ModelStorageManager, ArtifactType
from .version_manager import ModelVersionManager

class CheckpointType(Enum):
    """Types of checkpoints"""
    MANUAL = "manual"
    AUTOMATIC = "automatic"
    BEST_MODEL = "best_model"
    EPOCH_END = "epoch_end"
    STEP_INTERVAL = "step_interval"
    EARLY_STOPPING = "early_stopping"
    EMERGENCY = "emergency"

class CheckpointStatus(Enum):
    """Checkpoint status"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    CORRUPTED = "corrupted"
    DELETED = "deleted"

@dataclass
class CheckpointConfig:
    """Configuration for checkpoint management"""
    # Basic settings
    save_interval_steps: int = 1000
    save_interval_epochs: int = 1
    max_checkpoints: int = 10
    
    # Automatic cleanup
    auto_cleanup_enabled: bool = True
    cleanup_interval_hours: int = 24
    keep_best_n: int = 3
    keep_last_n: int = 2
    
    # Best model tracking
    track_best_model: bool = True
    best_metric_name: str = "validation_loss"
    best_metric_mode: str = "min"  # min or max
    
    # Compression and optimization
    compress_checkpoints: bool = True
    use_torch_save_optimized: bool = True
    save_optimizer_state: bool = True
    save_scheduler_state: bool = True
    
    # Recovery settings
    auto_recovery_enabled: bool = True
    corruption_check_enabled: bool = True
    backup_corrupted_checkpoints: bool = True
    
    # Custom hooks
    pre_save_hooks: List[Callable] = None
    post_save_hooks: List[Callable] = None
    pre_load_hooks: List[Callable] = None
    post_load_hooks: List[Callable] = None

@dataclass
class CheckpointMetadata:
    """Metadata for model checkpoints"""
    checkpoint_id: str
    model_id: str
    version: str
    checkpoint_type: CheckpointType
    status: CheckpointStatus
    created_at: datetime
    created_by: str
    
    # Training state
    epoch: int
    step: int
    metrics: Dict[str, float]
    
    # Model information
    model_architecture: str
    model_parameters: int
    model_size_mb: float
    
    # Files and paths
    model_state_path: str
    optimizer_state_path: Optional[str]
    scheduler_state_path: Optional[str]
    config_path: str
    
    # Metadata
    tags: Dict[str, str]
    notes: str
    parent_checkpoint: Optional[str]
    
    # Validation
    checksum: str
    is_validated: bool = False
    validation_errors: List[str] = None

class CheckpointManager:
    """
    Manages model checkpoints with intelligent saving, loading, and cleanup strategies
    """
    
    def __init__(
        self,
        model_id: str,
        version: str,
        config: CheckpointConfig,
        storage_manager: ModelStorageManager,
        version_manager: Optional[ModelVersionManager] = None
    ):
        self.model_id = model_id
        self.version = version
        self.config = config
        self.storage_manager = storage_manager
        self.version_manager = version_manager
        self.logger = logging.getLogger(__name__)
        
        # State tracking
        self._checkpoints: Dict[str, CheckpointMetadata] = {}
        self._best_checkpoint: Optional[CheckpointMetadata] = None
        self._last_save_time = 0
        self._save_lock = threading.Lock()
        
        # Initialize hooks
        self._pre_save_hooks = config.pre_save_hooks or []
        self._post_save_hooks = config.post_save_hooks or []
        self._pre_load_hooks = config.pre_load_hooks or []
        self._post_load_hooks = config.post_load_hooks or []
        
        # Start background cleanup task
        if config.auto_cleanup_enabled:
            self._start_cleanup_task()
    
    async def save_checkpoint(
        self,
        model: nn.Module,
        optimizer: Optional[Optimizer] = None,
        scheduler: Optional[_LRScheduler] = None,
        epoch: int = 0,
        step: int = 0,
        metrics: Optional[Dict[str, float]] = None,
        checkpoint_type: CheckpointType = CheckpointType.AUTOMATIC,
        tags: Optional[Dict[str, str]] = None,
        notes: str = "",
        force_save: bool = False
    ) -> CheckpointMetadata:
        """
        Save model checkpoint with comprehensive metadata
        
        Args:
            model: PyTorch model to save
            optimizer: Optimizer state (optional)
            scheduler: Learning rate scheduler state (optional)
            epoch: Current training epoch
            step: Current training step
            metrics: Training/validation metrics
            checkpoint_type: Type of checkpoint
            tags: Optional tags
            notes: Optional notes
            force_save: Force save even if interval not reached
        
        Returns:
            CheckpointMetadata: Metadata for saved checkpoint
        """
        metrics = metrics or {}
        tags = tags or {}
        
        # Check if we should save based on interval
        if not force_save and not self._should_save(step, epoch, checkpoint_type):
            return None
        
        with self._save_lock:
            # Generate checkpoint ID
            checkpoint_id = self._generate_checkpoint_id(epoch, step, checkpoint_type)
            
            # Execute pre-save hooks
            for hook in self._pre_save_hooks:
                try:
                    hook(model, optimizer, scheduler, epoch, step, metrics)
                except Exception as e:
                    self.logger.warning(f"Pre-save hook failed: {e}")
            
            # Prepare checkpoint data
            checkpoint_data = {
                'model_state_dict': model.state_dict(),
                'epoch': epoch,
                'step': step,
                'metrics': metrics,
                'model_architecture': str(model.__class__.__name__),
                'model_config': self._extract_model_config(model)
            }
            
            # Add optimizer state if available
            if optimizer and self.config.save_optimizer_state:
                checkpoint_data['optimizer_state_dict'] = optimizer.state_dict()
                checkpoint_data['optimizer_type'] = str(optimizer.__class__.__name__)
            
            # Add scheduler state if available
            if scheduler and self.config.save_scheduler_state:
                checkpoint_data['scheduler_state_dict'] = scheduler.state_dict()
                checkpoint_data['scheduler_type'] = str(scheduler.__class__.__name__)
            
            # Calculate model info
            model_parameters = sum(p.numel() for p in model.parameters())
            
            # Save checkpoint files
            checkpoint_paths = await self._save_checkpoint_files(
                checkpoint_id, checkpoint_data
            )
            
            # Create metadata
            metadata = CheckpointMetadata(
                checkpoint_id=checkpoint_id,
                model_id=self.model_id,
                version=self.version,
                checkpoint_type=checkpoint_type,
                status=CheckpointStatus.ACTIVE,
                created_at=datetime.utcnow(),
                created_by="system",  # Could be parameterized
                epoch=epoch,
                step=step,
                metrics=metrics,
                model_architecture=str(model.__class__.__name__),
                model_parameters=model_parameters,
                model_size_mb=self._calculate_model_size(checkpoint_data),
                model_state_path=checkpoint_paths['model'],
                optimizer_state_path=checkpoint_paths.get('optimizer'),
                scheduler_state_path=checkpoint_paths.get('scheduler'),
                config_path=checkpoint_paths['config'],
                tags=tags,
                notes=notes,
                parent_checkpoint=self._get_last_checkpoint_id(),
                checksum=self._calculate_checksum(checkpoint_data)
            )
            
            # Validate checkpoint
            metadata.is_validated = await self._validate_checkpoint(metadata)
            
            # Store metadata
            self._checkpoints[checkpoint_id] = metadata
            
            # Update best checkpoint if applicable
            if self.config.track_best_model:
                self._update_best_checkpoint(metadata)
            
            # Execute post-save hooks
            for hook in self._post_save_hooks:
                try:
                    hook(metadata)
                except Exception as e:
                    self.logger.warning(f"Post-save hook failed: {e}")
            
            # Update last save time
            self._last_save_time = time.time()
            
            self.logger.info(
                f"Saved checkpoint {checkpoint_id} at epoch {epoch}, step {step}"
            )
            
            return metadata
    
    async def load_checkpoint(
        self,
        checkpoint_id: str,
        model: nn.Module,
        optimizer: Optional[Optimizer] = None,
        scheduler: Optional[_LRScheduler] = None,
        strict: bool = True
    ) -> CheckpointMetadata:
        """
        Load model checkpoint
        
        Args:
            checkpoint_id: Checkpoint identifier
            model: Model to load state into
            optimizer: Optimizer to load state into (optional)
            scheduler: Scheduler to load state into (optional)
            strict: Whether to strictly enforce state dict matching
        
        Returns:
            CheckpointMetadata: Loaded checkpoint metadata
        """
        metadata = self._checkpoints.get(checkpoint_id)
        if not metadata:
            raise ValueError(f"Checkpoint {checkpoint_id} not found")
        
        if metadata.status != CheckpointStatus.ACTIVE:
            raise ValueError(f"Checkpoint {checkpoint_id} is not active")
        
        # Execute pre-load hooks
        for hook in self._pre_load_hooks:
            try:
                hook(checkpoint_id, model, optimizer, scheduler)
            except Exception as e:
                self.logger.warning(f"Pre-load hook failed: {e}")
        
        try:
            # Load model state
            model_data = await self.storage_manager.retrieve_artifact(
                metadata.model_state_path.replace("/", "_"), deserialize=True
            )
            
            model.load_state_dict(model_data['model_state_dict'], strict=strict)
            
            # Load optimizer state if available
            if optimizer and metadata.optimizer_state_path:
                optimizer_data = await self.storage_manager.retrieve_artifact(
                    metadata.optimizer_state_path.replace("/", "_"), deserialize=True
                )
                optimizer.load_state_dict(optimizer_data['optimizer_state_dict'])
            
            # Load scheduler state if available
            if scheduler and metadata.scheduler_state_path:
                scheduler_data = await self.storage_manager.retrieve_artifact(
                    metadata.scheduler_state_path.replace("/", "_"), deserialize=True
                )
                scheduler.load_state_dict(scheduler_data['scheduler_state_dict'])
            
            # Execute post-load hooks
            for hook in self._post_load_hooks:
                try:
                    hook(metadata, model, optimizer, scheduler)
                except Exception as e:
                    self.logger.warning(f"Post-load hook failed: {e}")
            
            self.logger.info(f"Loaded checkpoint {checkpoint_id}")
            return metadata
            
        except Exception as e:
            self.logger.error(f"Failed to load checkpoint {checkpoint_id}: {e}")
            # Mark as corrupted if validation is enabled
            if self.config.corruption_check_enabled:
                await self._handle_corrupted_checkpoint(checkpoint_id, str(e))
            raise
    
    async def load_best_checkpoint(
        self,
        model: nn.Module,
        optimizer: Optional[Optimizer] = None,
        scheduler: Optional[_LRScheduler] = None
    ) -> Optional[CheckpointMetadata]:
        """Load the best checkpoint based on tracked metric"""
        if not self._best_checkpoint:
            self.logger.warning("No best checkpoint available")
            return None
        
        return await self.load_checkpoint(
            self._best_checkpoint.checkpoint_id, model, optimizer, scheduler
        )
    
    async def load_latest_checkpoint(
        self,
        model: nn.Module,
        optimizer: Optional[Optimizer] = None,
        scheduler: Optional[_LRScheduler] = None
    ) -> Optional[CheckpointMetadata]:
        """Load the most recent checkpoint"""
        if not self._checkpoints:
            self.logger.warning("No checkpoints available")
            return None
        
        # Find latest checkpoint
        latest_checkpoint = max(
            self._checkpoints.values(),
            key=lambda x: x.created_at
        )
        
        return await self.load_checkpoint(
            latest_checkpoint.checkpoint_id, model, optimizer, scheduler
        )
    
    def list_checkpoints(
        self,
        checkpoint_type: Optional[CheckpointType] = None,
        status: Optional[CheckpointStatus] = None,
        limit: int = 100
    ) -> List[CheckpointMetadata]:
        """List checkpoints with optional filtering"""
        checkpoints = list(self._checkpoints.values())
        
        if checkpoint_type:
            checkpoints = [cp for cp in checkpoints if cp.checkpoint_type == checkpoint_type]
        
        if status:
            checkpoints = [cp for cp in checkpoints if cp.status == status]
        
        # Sort by creation time (newest first)
        checkpoints.sort(key=lambda x: x.created_at, reverse=True)
        
        return checkpoints[:limit]
    
    async def delete_checkpoint(self, checkpoint_id: str, force: bool = False) -> bool:
        """Delete a checkpoint"""
        metadata = self._checkpoints.get(checkpoint_id)
        if not metadata:
            return False
        
        # Safety check for best checkpoint
        if (metadata == self._best_checkpoint and not force):
            self.logger.warning(f"Cannot delete best checkpoint {checkpoint_id} without force=True")
            return False
        
        try:
            # Delete artifact files
            await self.storage_manager.delete_artifact(
                metadata.model_state_path.replace("/", "_")
            )
            
            if metadata.optimizer_state_path:
                await self.storage_manager.delete_artifact(
                    metadata.optimizer_state_path.replace("/", "_")
                )
            
            if metadata.scheduler_state_path:
                await self.storage_manager.delete_artifact(
                    metadata.scheduler_state_path.replace("/", "_")
                )
            
            await self.storage_manager.delete_artifact(
                metadata.config_path.replace("/", "_")
            )
            
            # Remove from tracking
            del self._checkpoints[checkpoint_id]
            
            # Update best checkpoint if needed
            if metadata == self._best_checkpoint:
                self._best_checkpoint = None
                self._recompute_best_checkpoint()
            
            self.logger.info(f"Deleted checkpoint {checkpoint_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete checkpoint {checkpoint_id}: {e}")
            return False
    
    async def cleanup_checkpoints(self) -> int:
        """Clean up old checkpoints based on policy"""
        if not self.config.auto_cleanup_enabled:
            return 0
        
        checkpoints = list(self._checkpoints.values())
        checkpoints.sort(key=lambda x: x.created_at, reverse=True)
        
        # Determine which checkpoints to keep
        keep_checkpoints = set()
        
        # Keep best N checkpoints
        if self.config.track_best_model and self.config.keep_best_n > 0:
            best_checkpoints = sorted(
                [cp for cp in checkpoints if cp.checkpoint_type == CheckpointType.BEST_MODEL],
                key=lambda x: x.metrics.get(self.config.best_metric_name, float('inf')),
                reverse=(self.config.best_metric_mode == "max")
            )
            keep_checkpoints.update(cp.checkpoint_id for cp in best_checkpoints[:self.config.keep_best_n])
        
        # Keep last N checkpoints
        if self.config.keep_last_n > 0:
            keep_checkpoints.update(cp.checkpoint_id for cp in checkpoints[:self.config.keep_last_n])
        
        # Keep manual checkpoints
        manual_checkpoints = [cp for cp in checkpoints if cp.checkpoint_type == CheckpointType.MANUAL]
        keep_checkpoints.update(cp.checkpoint_id for cp in manual_checkpoints)
        
        # Delete excess checkpoints
        deleted_count = 0
        for checkpoint in checkpoints:
            if (checkpoint.checkpoint_id not in keep_checkpoints and 
                len(self._checkpoints) > self.config.max_checkpoints):
                
                if await self.delete_checkpoint(checkpoint.checkpoint_id):
                    deleted_count += 1
        
        if deleted_count > 0:
            self.logger.info(f"Cleaned up {deleted_count} checkpoints")
        
        return deleted_count
    
    def get_checkpoint_info(self, checkpoint_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed checkpoint information"""
        metadata = self._checkpoints.get(checkpoint_id)
        if not metadata:
            return None
        
        return {
            'metadata': asdict(metadata),
            'is_best': metadata == self._best_checkpoint,
            'is_latest': metadata == max(self._checkpoints.values(), key=lambda x: x.created_at),
            'age_hours': (datetime.utcnow() - metadata.created_at).total_seconds() / 3600,
            'dependencies': self._get_checkpoint_dependencies(checkpoint_id)
        }
    
    async def export_checkpoint(
        self,
        checkpoint_id: str,
        export_path: Path,
        include_optimizer: bool = False,
        include_scheduler: bool = False
    ) -> bool:
        """Export checkpoint to external location"""
        metadata = self._checkpoints.get(checkpoint_id)
        if not metadata:
            return False
        
        try:
            export_path.mkdir(parents=True, exist_ok=True)
            
            # Export model state
            model_data = await self.storage_manager.retrieve_artifact(
                metadata.model_state_path.replace("/", "_"), deserialize=False
            )
            with open(export_path / "model_state.pt", 'wb') as f:
                f.write(model_data)
            
            # Export optimizer state if requested
            if include_optimizer and metadata.optimizer_state_path:
                optimizer_data = await self.storage_manager.retrieve_artifact(
                    metadata.optimizer_state_path.replace("/", "_"), deserialize=False
                )
                with open(export_path / "optimizer_state.pt", 'wb') as f:
                    f.write(optimizer_data)
            
            # Export scheduler state if requested
            if include_scheduler and metadata.scheduler_state_path:
                scheduler_data = await self.storage_manager.retrieve_artifact(
                    metadata.scheduler_state_path.replace("/", "_"), deserialize=False
                )
                with open(export_path / "scheduler_state.pt", 'wb') as f:
                    f.write(scheduler_data)
            
            # Export metadata
            with open(export_path / "metadata.json", 'w') as f:
                json.dump(asdict(metadata), f, indent=2, default=str)
            
            self.logger.info(f"Exported checkpoint {checkpoint_id} to {export_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to export checkpoint {checkpoint_id}: {e}")
            return False
    
    def _should_save(self, step: int, epoch: int, checkpoint_type: CheckpointType) -> bool:
        """Determine if checkpoint should be saved based on configuration"""
        if checkpoint_type in [CheckpointType.MANUAL, CheckpointType.BEST_MODEL, CheckpointType.EMERGENCY]:
            return True
        
        # Check step interval
        if self.config.save_interval_steps > 0 and step % self.config.save_interval_steps == 0:
            return True
        
        # Check epoch interval
        if self.config.save_interval_epochs > 0 and epoch % self.config.save_interval_epochs == 0:
            return True
        
        return False
    
    def _generate_checkpoint_id(self, epoch: int, step: int, checkpoint_type: CheckpointType) -> str:
        """Generate unique checkpoint ID"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        return f"{self.model_id}_{self.version}_{checkpoint_type.value}_e{epoch}_s{step}_{timestamp}"
    
    async def _save_checkpoint_files(
        self,
        checkpoint_id: str,
        checkpoint_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """Save checkpoint files to storage"""
        paths = {}
        
        # Save model state
        model_artifact_id = f"{checkpoint_id}_model"
        await self.storage_manager.store_artifact(
            artifact_id=model_artifact_id,
            model_id=self.model_id,
            version=self.version,
            artifact_type=ArtifactType.MODEL_WEIGHTS,
            data=checkpoint_data,
            tags={"checkpoint_id": checkpoint_id, "type": "model_state"}
        )
        paths['model'] = model_artifact_id
        
        # Save optimizer state if available
        if 'optimizer_state_dict' in checkpoint_data:
            optimizer_artifact_id = f"{checkpoint_id}_optimizer"
            await self.storage_manager.store_artifact(
                artifact_id=optimizer_artifact_id,
                model_id=self.model_id,
                version=self.version,
                artifact_type=ArtifactType.OPTIMIZER_STATE,
                data={'optimizer_state_dict': checkpoint_data['optimizer_state_dict']},
                tags={"checkpoint_id": checkpoint_id, "type": "optimizer_state"}
            )
            paths['optimizer'] = optimizer_artifact_id
        
        # Save scheduler state if available
        if 'scheduler_state_dict' in checkpoint_data:
            scheduler_artifact_id = f"{checkpoint_id}_scheduler"
            await self.storage_manager.store_artifact(
                artifact_id=scheduler_artifact_id,
                model_id=self.model_id,
                version=self.version,
                artifact_type=ArtifactType.CUSTOM,
                data={'scheduler_state_dict': checkpoint_data['scheduler_state_dict']},
                tags={"checkpoint_id": checkpoint_id, "type": "scheduler_state"}
            )
            paths['scheduler'] = scheduler_artifact_id
        
        # Save config and metadata
        config_artifact_id = f"{checkpoint_id}_config"
        config_data = {
            'epoch': checkpoint_data['epoch'],
            'step': checkpoint_data['step'],
            'metrics': checkpoint_data['metrics'],
            'model_architecture': checkpoint_data['model_architecture'],
            'model_config': checkpoint_data.get('model_config', {})
        }
        await self.storage_manager.store_artifact(
            artifact_id=config_artifact_id,
            model_id=self.model_id,
            version=self.version,
            artifact_type=ArtifactType.CONFIG,
            data=config_data,
            tags={"checkpoint_id": checkpoint_id, "type": "config"}
        )
        paths['config'] = config_artifact_id
        
        return paths
    
    def _calculate_model_size(self, checkpoint_data: Dict[str, Any]) -> float:
        """Calculate model size in MB"""
        # Estimate based on state dict
        total_params = 0
        for key, tensor in checkpoint_data.get('model_state_dict', {}).items():
            if hasattr(tensor, 'numel'):
                total_params += tensor.numel()
        
        # Assume float32 (4 bytes per parameter)
        size_bytes = total_params * 4
        return size_bytes / (1024 * 1024)
    
    def _calculate_checksum(self, checkpoint_data: Dict[str, Any]) -> str:
        """Calculate checkpoint checksum"""
        import hashlib
        
        # Create deterministic representation
        serialized = pickle.dumps(checkpoint_data, protocol=pickle.HIGHEST_PROTOCOL)
        return hashlib.sha256(serialized).hexdigest()
    
    async def _validate_checkpoint(self, metadata: CheckpointMetadata) -> bool:
        """Validate checkpoint integrity"""
        if not self.config.corruption_check_enabled:
            return True
        
        try:
            # Try to load the checkpoint data
            model_data = await self.storage_manager.retrieve_artifact(
                metadata.model_state_path.replace("/", "_"), deserialize=True
            )
            
            # Basic validation
            if 'model_state_dict' not in model_data:
                metadata.validation_errors = ["Missing model_state_dict"]
                return False
            
            # Additional validations can be added here
            return True
            
        except Exception as e:
            metadata.validation_errors = [str(e)]
            return False
    
    def _update_best_checkpoint(self, metadata: CheckpointMetadata):
        """Update best checkpoint based on metrics"""
        if not self.config.track_best_model:
            return
        
        metric_name = self.config.best_metric_name
        if metric_name not in metadata.metrics:
            return
        
        current_metric = metadata.metrics[metric_name]
        
        if self._best_checkpoint is None:
            self._best_checkpoint = metadata
            metadata.checkpoint_type = CheckpointType.BEST_MODEL
            self.logger.info(f"New best checkpoint: {metadata.checkpoint_id} ({metric_name}={current_metric})")
            return
        
        best_metric = self._best_checkpoint.metrics.get(metric_name)
        if best_metric is None:
            return
        
        is_better = (
            (self.config.best_metric_mode == "min" and current_metric < best_metric) or
            (self.config.best_metric_mode == "max" and current_metric > best_metric)
        )
        
        if is_better:
            # Mark previous best as regular checkpoint
            self._best_checkpoint.checkpoint_type = CheckpointType.AUTOMATIC
            
            # Update best checkpoint
            self._best_checkpoint = metadata
            metadata.checkpoint_type = CheckpointType.BEST_MODEL
            self.logger.info(f"New best checkpoint: {metadata.checkpoint_id} ({metric_name}={current_metric})")
    
    def _recompute_best_checkpoint(self):
        """Recompute best checkpoint after deletion"""
        if not self.config.track_best_model:
            return
        
        metric_name = self.config.best_metric_name
        candidates = [
            cp for cp in self._checkpoints.values()
            if metric_name in cp.metrics and cp.status == CheckpointStatus.ACTIVE
        ]
        
        if not candidates:
            self._best_checkpoint = None
            return
        
        if self.config.best_metric_mode == "min":
            self._best_checkpoint = min(candidates, key=lambda x: x.metrics[metric_name])
        else:
            self._best_checkpoint = max(candidates, key=lambda x: x.metrics[metric_name])
        
        self._best_checkpoint.checkpoint_type = CheckpointType.BEST_MODEL
    
    def _get_last_checkpoint_id(self) -> Optional[str]:
        """Get ID of the last checkpoint"""
        if not self._checkpoints:
            return None
        
        latest = max(self._checkpoints.values(), key=lambda x: x.created_at)
        return latest.checkpoint_id
    
    def _extract_model_config(self, model: nn.Module) -> Dict[str, Any]:
        """Extract model configuration"""
        config = {}
        
        # Try to get common configuration attributes
        for attr in ['config', '_config', 'hparams', '_hparams']:
            if hasattr(model, attr):
                config_obj = getattr(model, attr)
                if hasattr(config_obj, '__dict__'):
                    config.update(config_obj.__dict__)
                elif isinstance(config_obj, dict):
                    config.update(config_obj)
        
        return config
    
    def _get_checkpoint_dependencies(self, checkpoint_id: str) -> List[str]:
        """Get list of checkpoints that depend on this one"""
        dependencies = []
        for cp in self._checkpoints.values():
            if cp.parent_checkpoint == checkpoint_id:
                dependencies.append(cp.checkpoint_id)
        return dependencies
    
    async def _handle_corrupted_checkpoint(self, checkpoint_id: str, error: str):
        """Handle corrupted checkpoint detection"""
        metadata = self._checkpoints.get(checkpoint_id)
        if not metadata:
            return
        
        self.logger.error(f"Corrupted checkpoint detected: {checkpoint_id} - {error}")
        
        # Mark as corrupted
        metadata.status = CheckpointStatus.CORRUPTED
        metadata.validation_errors = [error]
        
        # Backup if enabled
        if self.config.backup_corrupted_checkpoints:
            try:
                backup_path = Path(f"./corrupted_checkpoints/{checkpoint_id}")
                await self.export_checkpoint(checkpoint_id, backup_path)
                self.logger.info(f"Backed up corrupted checkpoint to {backup_path}")
            except Exception as e:
                self.logger.error(f"Failed to backup corrupted checkpoint: {e}")
    
    def _start_cleanup_task(self):
        """Start background cleanup task"""
        def cleanup_task():
            while True:
                try:
                    asyncio.run(self.cleanup_checkpoints())
                    time.sleep(self.config.cleanup_interval_hours * 3600)
                except Exception as e:
                    self.logger.error(f"Cleanup task failed: {e}")
                    time.sleep(3600)  # Retry in 1 hour
        
        cleanup_thread = threading.Thread(target=cleanup_task, daemon=True)
        cleanup_thread.start()
