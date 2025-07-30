"""
Model Storage Management System

Handles efficient storage, retrieval, and organization of model artifacts
including weights, checkpoints, configurations, and metadata.
"""

import asyncio
import json
import logging
import shutil
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, BinaryIO
from dataclasses import dataclass
import hashlib
import gzip
import pickle

import boto3
import torch
import numpy as np
from azure.storage.blob import BlobServiceClient
from google.cloud import storage as gcs
import redis
import sqlite3

class StorageBackend(Enum):
    """Storage backend types"""
    LOCAL = "local"
    S3 = "s3"
    AZURE_BLOB = "azure_blob"
    GCS = "gcs"
    REDIS = "redis"

class ArtifactType(Enum):
    """Types of model artifacts"""
    MODEL_WEIGHTS = "model_weights"
    CHECKPOINT = "checkpoint"
    CONFIG = "config"
    METADATA = "metadata"
    TOKENIZER = "tokenizer"
    PREPROCESSOR = "preprocessor"
    OPTIMIZER_STATE = "optimizer_state"
    CUSTOM = "custom"

class CompressionType(Enum):
    """Compression types for artifacts"""
    NONE = "none"
    GZIP = "gzip"
    BROTLI = "brotli"
    LZMA = "lzma"

@dataclass
class StorageConfig:
    """Storage configuration"""
    backend: StorageBackend
    connection_params: Dict[str, Any]
    default_compression: CompressionType = CompressionType.GZIP
    enable_caching: bool = True
    cache_ttl_seconds: int = 3600
    max_cache_size_mb: int = 1024
    encryption_enabled: bool = True
    replication_enabled: bool = False
    replication_backends: List[StorageBackend] = None

@dataclass
class ArtifactMetadata:
    """Metadata for stored artifacts"""
    artifact_id: str
    model_id: str
    version: str
    artifact_type: ArtifactType
    file_path: str
    size_bytes: int
    checksum: str
    compression: CompressionType
    created_at: datetime
    expires_at: Optional[datetime]
    tags: Dict[str, str]
    custom_metadata: Dict[str, Any]

class ModelStorageManager:
    """
    Manages storage and retrieval of model artifacts across multiple backends
    with caching, compression, and encryption support.
    """
    
    def __init__(self, config: StorageConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self._backends = {}
        self._cache = None
        self._metadata_db = None
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._lock = threading.Lock()
        
        self._initialize_backends()
        self._initialize_cache()
        self._initialize_metadata_db()
    
    def _initialize_backends(self):
        """Initialize storage backends"""
        backend_configs = [self.config.backend]
        if self.config.replication_enabled and self.config.replication_backends:
            backend_configs.extend(self.config.replication_backends)
        
        for backend in backend_configs:
            self._backends[backend] = self._create_backend(backend)
    
    def _create_backend(self, backend_type: StorageBackend):
        """Create storage backend instance"""
        params = self.config.connection_params
        
        if backend_type == StorageBackend.LOCAL:
            return LocalStorageBackend(params.get("base_path", "./model_storage"))
        
        elif backend_type == StorageBackend.S3:
            return S3StorageBackend(
                bucket_name=params["bucket_name"],
                aws_access_key_id=params.get("aws_access_key_id"),
                aws_secret_access_key=params.get("aws_secret_access_key"),
                region_name=params.get("region_name", "us-east-1")
            )
        
        elif backend_type == StorageBackend.AZURE_BLOB:
            return AzureBlobStorageBackend(
                connection_string=params["connection_string"],
                container_name=params["container_name"]
            )
        
        elif backend_type == StorageBackend.GCS:
            return GCSStorageBackend(
                bucket_name=params["bucket_name"],
                credentials_path=params.get("credentials_path")
            )
        
        elif backend_type == StorageBackend.REDIS:
            return RedisStorageBackend(
                host=params.get("host", "localhost"),
                port=params.get("port", 6379),
                password=params.get("password"),
                db=params.get("db", 0)
            )
        
        else:
            raise ValueError(f"Unsupported backend: {backend_type}")
    
    def _initialize_cache(self):
        """Initialize local cache"""
        if self.config.enable_caching:
            cache_params = self.config.connection_params.get("cache", {})
            self._cache = RedisCache(
                host=cache_params.get("host", "localhost"),
                port=cache_params.get("port", 6379),
                db=cache_params.get("db", 1),
                ttl_seconds=self.config.cache_ttl_seconds,
                max_size_mb=self.config.max_cache_size_mb
            )
    
    def _initialize_metadata_db(self):
        """Initialize metadata database"""
        db_path = self.config.connection_params.get("metadata_db", "artifacts_metadata.db")
        self._metadata_db = ArtifactMetadataDB(db_path)
    
    async def store_artifact(
        self,
        artifact_id: str,
        model_id: str,
        version: str,
        artifact_type: ArtifactType,
        data: Union[bytes, str, Path, torch.nn.Module, Dict],
        compression: Optional[CompressionType] = None,
        tags: Optional[Dict[str, str]] = None,
        custom_metadata: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> ArtifactMetadata:
        """
        Store model artifact
        
        Args:
            artifact_id: Unique artifact identifier
            model_id: Model identifier
            version: Model version
            artifact_type: Type of artifact
            data: Artifact data (various formats supported)
            compression: Compression type (optional)
            tags: Optional tags
            custom_metadata: Optional custom metadata
            expires_at: Optional expiration date
        
        Returns:
            ArtifactMetadata: Metadata for stored artifact
        """
        compression = compression or self.config.default_compression
        tags = tags or {}
        custom_metadata = custom_metadata or {}
        
        # Serialize and compress data
        serialized_data = await self._serialize_data(data, artifact_type)
        compressed_data = await self._compress_data(serialized_data, compression)
        
        # Calculate checksum
        checksum = hashlib.sha256(compressed_data).hexdigest()
        
        # Generate file path
        file_path = self._generate_file_path(model_id, version, artifact_id, artifact_type)
        
        # Store in primary backend
        primary_backend = self._backends[self.config.backend]
        await primary_backend.store(file_path, compressed_data)
        
        # Store in replication backends if enabled
        if self.config.replication_enabled:
            replication_tasks = []
            for backend_type in self.config.replication_backends or []:
                backend = self._backends[backend_type]
                replication_tasks.append(backend.store(file_path, compressed_data))
            
            if replication_tasks:
                await asyncio.gather(*replication_tasks, return_exceptions=True)
        
        # Create metadata
        metadata = ArtifactMetadata(
            artifact_id=artifact_id,
            model_id=model_id,
            version=version,
            artifact_type=artifact_type,
            file_path=file_path,
            size_bytes=len(compressed_data),
            checksum=checksum,
            compression=compression,
            created_at=datetime.utcnow(),
            expires_at=expires_at,
            tags=tags,
            custom_metadata=custom_metadata
        )
        
        # Store metadata
        await self._metadata_db.store_metadata(metadata)
        
        # Cache if enabled
        if self._cache:
            cache_key = f"artifact:{artifact_id}"
            await self._cache.set(cache_key, compressed_data)
        
        self.logger.info(f"Stored artifact {artifact_id} for {model_id}:{version}")
        return metadata
    
    async def retrieve_artifact(
        self,
        artifact_id: str,
        deserialize: bool = True
    ) -> Union[bytes, Any]:
        """
        Retrieve model artifact
        
        Args:
            artifact_id: Artifact identifier
            deserialize: Whether to deserialize the data
        
        Returns:
            Retrieved artifact data
        """
        # Get metadata
        metadata = await self._metadata_db.get_metadata(artifact_id)
        if not metadata:
            raise ValueError(f"Artifact {artifact_id} not found")
        
        # Check expiration
        if metadata.expires_at and datetime.utcnow() > metadata.expires_at:
            await self.delete_artifact(artifact_id)
            raise ValueError(f"Artifact {artifact_id} has expired")
        
        # Try cache first
        if self._cache:
            cache_key = f"artifact:{artifact_id}"
            cached_data = await self._cache.get(cache_key)
            if cached_data:
                self.logger.debug(f"Retrieved {artifact_id} from cache")
                if deserialize:
                    return await self._deserialize_data(
                        await self._decompress_data(cached_data, metadata.compression),
                        metadata.artifact_type
                    )
                return cached_data
        
        # Retrieve from storage
        data = await self._retrieve_from_backends(metadata.file_path)
        
        # Verify checksum
        if hashlib.sha256(data).hexdigest() != metadata.checksum:
            raise ValueError(f"Checksum mismatch for artifact {artifact_id}")
        
        # Cache the data
        if self._cache:
            cache_key = f"artifact:{artifact_id}"
            await self._cache.set(cache_key, data)
        
        if deserialize:
            decompressed_data = await self._decompress_data(data, metadata.compression)
            return await self._deserialize_data(decompressed_data, metadata.artifact_type)
        
        return data
    
    async def list_artifacts(
        self,
        model_id: Optional[str] = None,
        version: Optional[str] = None,
        artifact_type: Optional[ArtifactType] = None,
        tags: Optional[Dict[str, str]] = None,
        limit: int = 100
    ) -> List[ArtifactMetadata]:
        """List artifacts with optional filtering"""
        return await self._metadata_db.list_artifacts(
            model_id=model_id,
            version=version,
            artifact_type=artifact_type,
            tags=tags,
            limit=limit
        )
    
    async def delete_artifact(self, artifact_id: str) -> bool:
        """Delete artifact from all backends"""
        metadata = await self._metadata_db.get_metadata(artifact_id)
        if not metadata:
            return False
        
        # Delete from all backends
        deletion_tasks = []
        for backend in self._backends.values():
            deletion_tasks.append(backend.delete(metadata.file_path))
        
        results = await asyncio.gather(*deletion_tasks, return_exceptions=True)
        
        # Remove from cache
        if self._cache:
            cache_key = f"artifact:{artifact_id}"
            await self._cache.delete(cache_key)
        
        # Remove metadata
        await self._metadata_db.delete_metadata(artifact_id)
        
        self.logger.info(f"Deleted artifact {artifact_id}")
        return True
    
    async def get_artifact_metadata(self, artifact_id: str) -> Optional[ArtifactMetadata]:
        """Get artifact metadata"""
        return await self._metadata_db.get_metadata(artifact_id)
    
    async def update_artifact_metadata(
        self,
        artifact_id: str,
        tags: Optional[Dict[str, str]] = None,
        custom_metadata: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> bool:
        """Update artifact metadata"""
        return await self._metadata_db.update_metadata(
            artifact_id=artifact_id,
            tags=tags,
            custom_metadata=custom_metadata,
            expires_at=expires_at
        )
    
    async def cleanup_expired_artifacts(self) -> int:
        """Clean up expired artifacts"""
        expired_artifacts = await self._metadata_db.get_expired_artifacts()
        
        cleanup_tasks = []
        for artifact in expired_artifacts:
            cleanup_tasks.append(self.delete_artifact(artifact.artifact_id))
        
        results = await asyncio.gather(*cleanup_tasks, return_exceptions=True)
        cleaned_count = sum(1 for result in results if result is True)
        
        self.logger.info(f"Cleaned up {cleaned_count} expired artifacts")
        return cleaned_count
    
    async def _serialize_data(self, data: Any, artifact_type: ArtifactType) -> bytes:
        """Serialize data based on artifact type"""
        if isinstance(data, bytes):
            return data
        
        elif isinstance(data, str):
            return data.encode('utf-8')
        
        elif isinstance(data, Path):
            with open(data, 'rb') as f:
                return f.read()
        
        elif isinstance(data, torch.nn.Module):
            buffer = BytesIO()
            torch.save(data.state_dict(), buffer)
            return buffer.getvalue()
        
        elif isinstance(data, dict) or isinstance(data, list):
            return json.dumps(data).encode('utf-8')
        
        else:
            # Use pickle as fallback
            return pickle.dumps(data)
    
    async def _deserialize_data(self, data: bytes, artifact_type: ArtifactType) -> Any:
        """Deserialize data based on artifact type"""
        if artifact_type == ArtifactType.MODEL_WEIGHTS:
            buffer = BytesIO(data)
            return torch.load(buffer, map_location='cpu')
        
        elif artifact_type in [ArtifactType.CONFIG, ArtifactType.METADATA]:
            try:
                return json.loads(data.decode('utf-8'))
            except:
                return pickle.loads(data)
        
        elif artifact_type == ArtifactType.TOKENIZER:
            return pickle.loads(data)
        
        else:
            # Try JSON first, then pickle
            try:
                return json.loads(data.decode('utf-8'))
            except:
                return pickle.loads(data)
    
    async def _compress_data(self, data: bytes, compression: CompressionType) -> bytes:
        """Compress data"""
        if compression == CompressionType.NONE:
            return data
        elif compression == CompressionType.GZIP:
            return gzip.compress(data)
        else:
            # Add other compression types as needed
            return data
    
    async def _decompress_data(self, data: bytes, compression: CompressionType) -> bytes:
        """Decompress data"""
        if compression == CompressionType.NONE:
            return data
        elif compression == CompressionType.GZIP:
            return gzip.decompress(data)
        else:
            return data
    
    async def _retrieve_from_backends(self, file_path: str) -> bytes:
        """Retrieve data from available backends"""
        # Try primary backend first
        try:
            primary_backend = self._backends[self.config.backend]
            return await primary_backend.retrieve(file_path)
        except Exception as e:
            self.logger.warning(f"Primary backend failed: {e}")
        
        # Try replication backends
        if self.config.replication_enabled:
            for backend_type in self.config.replication_backends or []:
                try:
                    backend = self._backends[backend_type]
                    return await backend.retrieve(file_path)
                except Exception as e:
                    self.logger.warning(f"Replication backend {backend_type} failed: {e}")
        
        raise ValueError(f"Could not retrieve {file_path} from any backend")
    
    def _generate_file_path(
        self,
        model_id: str,
        version: str,
        artifact_id: str,
        artifact_type: ArtifactType
    ) -> str:
        """Generate file path for artifact"""
        # Create hierarchical path: model_id/version/artifact_type/artifact_id
        return f"{model_id}/{version}/{artifact_type.value}/{artifact_id}"


# Storage Backend Implementations

class LocalStorageBackend:
    """Local filesystem storage backend"""
    
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    async def store(self, file_path: str, data: bytes):
        """Store data to local filesystem"""
        full_path = self.base_path / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, 'wb') as f:
            f.write(data)
    
    async def retrieve(self, file_path: str) -> bytes:
        """Retrieve data from local filesystem"""
        full_path = self.base_path / file_path
        
        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(full_path, 'rb') as f:
            return f.read()
    
    async def delete(self, file_path: str) -> bool:
        """Delete file from local filesystem"""
        full_path = self.base_path / file_path
        
        if full_path.exists():
            full_path.unlink()
            return True
        return False


class S3StorageBackend:
    """AWS S3 storage backend"""
    
    def __init__(
        self,
        bucket_name: str,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        region_name: str = "us-east-1"
    ):
        self.bucket_name = bucket_name
        self.client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=region_name
        )
    
    async def store(self, file_path: str, data: bytes):
        """Store data to S3"""
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=file_path,
            Body=data
        )
    
    async def retrieve(self, file_path: str) -> bytes:
        """Retrieve data from S3"""
        response = self.client.get_object(
            Bucket=self.bucket_name,
            Key=file_path
        )
        return response['Body'].read()
    
    async def delete(self, file_path: str) -> bool:
        """Delete file from S3"""
        try:
            self.client.delete_object(
                Bucket=self.bucket_name,
                Key=file_path
            )
            return True
        except:
            return False


class RedisCache:
    """Redis-based caching system"""
    
    def __init__(
        self,
        host: str = "localhost",
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        ttl_seconds: int = 3600,
        max_size_mb: int = 1024
    ):
        self.redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=False
        )
        self.ttl_seconds = ttl_seconds
        self.max_size_mb = max_size_mb
    
    async def set(self, key: str, value: bytes):
        """Set cache value"""
        # Check size limit
        if len(value) > (self.max_size_mb * 1024 * 1024):
            return  # Skip caching large objects
        
        self.redis.setex(key, self.ttl_seconds, value)
    
    async def get(self, key: str) -> Optional[bytes]:
        """Get cache value"""
        return self.redis.get(key)
    
    async def delete(self, key: str):
        """Delete cache value"""
        self.redis.delete(key)


class ArtifactMetadataDB:
    """SQLite-based metadata database"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._initialize_db()
    
    def _initialize_db(self):
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS artifacts (
                    artifact_id TEXT PRIMARY KEY,
                    model_id TEXT NOT NULL,
                    version TEXT NOT NULL,
                    artifact_type TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    checksum TEXT NOT NULL,
                    compression TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    expires_at TIMESTAMP,
                    tags TEXT,
                    custom_metadata TEXT
                )
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_model_version 
                ON artifacts(model_id, version)
            """)
            
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_artifact_type 
                ON artifacts(artifact_type)
            """)
    
    async def store_metadata(self, metadata: ArtifactMetadata):
        """Store artifact metadata"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO artifacts 
                (artifact_id, model_id, version, artifact_type, file_path, 
                 size_bytes, checksum, compression, created_at, expires_at, 
                 tags, custom_metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metadata.artifact_id,
                metadata.model_id,
                metadata.version,
                metadata.artifact_type.value,
                metadata.file_path,
                metadata.size_bytes,
                metadata.checksum,
                metadata.compression.value,
                metadata.created_at.isoformat(),
                metadata.expires_at.isoformat() if metadata.expires_at else None,
                json.dumps(metadata.tags),
                json.dumps(metadata.custom_metadata)
            ))
    
    async def get_metadata(self, artifact_id: str) -> Optional[ArtifactMetadata]:
        """Get artifact metadata"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "SELECT * FROM artifacts WHERE artifact_id = ?",
                (artifact_id,)
            )
            row = cursor.fetchone()
            
            if row:
                return self._row_to_metadata(row)
            return None
    
    def _row_to_metadata(self, row) -> ArtifactMetadata:
        """Convert database row to ArtifactMetadata"""
        return ArtifactMetadata(
            artifact_id=row[0],
            model_id=row[1],
            version=row[2],
            artifact_type=ArtifactType(row[3]),
            file_path=row[4],
            size_bytes=row[5],
            checksum=row[6],
            compression=CompressionType(row[7]),
            created_at=datetime.fromisoformat(row[8]),
            expires_at=datetime.fromisoformat(row[9]) if row[9] else None,
            tags=json.loads(row[10]) if row[10] else {},
            custom_metadata=json.loads(row[11]) if row[11] else {}
        )
