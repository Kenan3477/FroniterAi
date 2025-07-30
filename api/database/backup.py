"""
Database Backup and Restoration System

Provides comprehensive backup and restore capabilities for SQLite, PostgreSQL, 
and MongoDB with automated scheduling, compression, encryption, and disaster recovery.
"""

import os
import sys
import asyncio
import logging
import shutil
import gzip
import tarfile
import hashlib
import json
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
from pathlib import Path
from abc import ABC, abstractmethod
import subprocess
from concurrent.futures import ThreadPoolExecutor

# Cryptography for backup encryption
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    import base64
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

# APScheduler for automated backups
try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    from apscheduler.triggers.interval import IntervalTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False

# Cloud storage clients
try:
    import boto3
    from botocore.exceptions import NoCredentialsError, ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False

try:
    from azure.storage.blob import BlobServiceClient
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

logger = logging.getLogger(__name__)

class BackupConfig:
    """Configuration for backup operations"""
    
    def __init__(self):
        # Backup storage paths
        self.local_backup_dir = Path(os.getenv("BACKUP_DIR", "./backups"))
        self.local_backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Retention settings
        self.retention_days = int(os.getenv("BACKUP_RETENTION_DAYS", "30"))
        self.max_local_backups = int(os.getenv("MAX_LOCAL_BACKUPS", "50"))
        
        # Compression and encryption
        self.enable_compression = os.getenv("BACKUP_COMPRESSION", "true").lower() == "true"
        self.enable_encryption = os.getenv("BACKUP_ENCRYPTION", "false").lower() == "true"
        self.encryption_password = os.getenv("BACKUP_ENCRYPTION_PASSWORD")
        
        # Cloud storage settings
        self.enable_cloud_backup = os.getenv("ENABLE_CLOUD_BACKUP", "false").lower() == "true"
        self.cloud_provider = os.getenv("CLOUD_PROVIDER", "aws")  # aws, azure, gcp
        
        # AWS S3 settings
        self.aws_s3_bucket = os.getenv("AWS_S3_BACKUP_BUCKET")
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        self.aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        self.aws_region = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        
        # Azure Blob settings
        self.azure_account_name = os.getenv("AZURE_STORAGE_ACCOUNT")
        self.azure_account_key = os.getenv("AZURE_STORAGE_KEY")
        self.azure_container = os.getenv("AZURE_BACKUP_CONTAINER")
        
        # Backup scheduling
        self.auto_backup_enabled = os.getenv("AUTO_BACKUP_ENABLED", "true").lower() == "true"
        self.backup_schedule = os.getenv("BACKUP_SCHEDULE", "0 2 * * *")  # Daily at 2 AM
        self.backup_interval_hours = int(os.getenv("BACKUP_INTERVAL_HOURS", "24"))
        
        # PostgreSQL specific
        self.pg_dump_path = os.getenv("PG_DUMP_PATH", "pg_dump")
        self.pg_restore_path = os.getenv("PG_RESTORE_PATH", "pg_restore")
        
        # MongoDB specific
        self.mongodump_path = os.getenv("MONGODUMP_PATH", "mongodump")
        self.mongorestore_path = os.getenv("MONGORESTORE_PATH", "mongorestore")

class BackupMetadata:
    """Metadata for backup files"""
    
    def __init__(self, backup_type: str, database_name: str, timestamp: datetime = None):
        self.backup_type = backup_type
        self.database_name = database_name
        self.timestamp = timestamp or datetime.now()
        self.file_size = 0
        self.compressed = False
        self.encrypted = False
        self.checksum = ""
        self.backup_version = "1.0"
        self.source_location = ""
        self.cloud_location = ""
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary"""
        return {
            "backup_type": self.backup_type,
            "database_name": self.database_name,
            "timestamp": self.timestamp.isoformat(),
            "file_size": self.file_size,
            "compressed": self.compressed,
            "encrypted": self.encrypted,
            "checksum": self.checksum,
            "backup_version": self.backup_version,
            "source_location": self.source_location,
            "cloud_location": self.cloud_location
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BackupMetadata':
        """Create metadata from dictionary"""
        metadata = cls(
            backup_type=data["backup_type"],
            database_name=data["database_name"],
            timestamp=datetime.fromisoformat(data["timestamp"])
        )
        metadata.file_size = data.get("file_size", 0)
        metadata.compressed = data.get("compressed", False)
        metadata.encrypted = data.get("encrypted", False)
        metadata.checksum = data.get("checksum", "")
        metadata.backup_version = data.get("backup_version", "1.0")
        metadata.source_location = data.get("source_location", "")
        metadata.cloud_location = data.get("cloud_location", "")
        return metadata

class EncryptionManager:
    """Handles backup encryption and decryption"""
    
    def __init__(self, password: str):
        if not CRYPTO_AVAILABLE:
            raise ImportError("Cryptography library not available for encryption")
        
        self.password = password.encode()
        self._key = None
    
    def _get_key(self) -> bytes:
        """Generate encryption key from password"""
        if self._key is None:
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'frontier_backup_salt',  # In production, use random salt
                iterations=100000,
            )
            self._key = base64.urlsafe_b64encode(kdf.derive(self.password))
        return self._key
    
    def encrypt_file(self, input_path: Path, output_path: Path) -> bool:
        """Encrypt a file"""
        try:
            fernet = Fernet(self._get_key())
            
            with open(input_path, 'rb') as infile:
                data = infile.read()
            
            encrypted_data = fernet.encrypt(data)
            
            with open(output_path, 'wb') as outfile:
                outfile.write(encrypted_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return False
    
    def decrypt_file(self, input_path: Path, output_path: Path) -> bool:
        """Decrypt a file"""
        try:
            fernet = Fernet(self._get_key())
            
            with open(input_path, 'rb') as infile:
                encrypted_data = infile.read()
            
            decrypted_data = fernet.decrypt(encrypted_data)
            
            with open(output_path, 'wb') as outfile:
                outfile.write(decrypted_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Decryption failed: {e}")
            return False

class CloudStorageManager:
    """Manages cloud storage for backups"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        self.s3_client = None
        self.blob_client = None
        
    async def initialize(self) -> bool:
        """Initialize cloud storage clients"""
        if not self.config.enable_cloud_backup:
            return True
        
        try:
            if self.config.cloud_provider == "aws" and AWS_AVAILABLE:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.config.aws_access_key,
                    aws_secret_access_key=self.config.aws_secret_key,
                    region_name=self.config.aws_region
                )
                # Test connection
                self.s3_client.head_bucket(Bucket=self.config.aws_s3_bucket)
                logger.info("AWS S3 backup storage initialized")
                
            elif self.config.cloud_provider == "azure" and AZURE_AVAILABLE:
                self.blob_client = BlobServiceClient(
                    account_url=f"https://{self.config.azure_account_name}.blob.core.windows.net",
                    credential=self.config.azure_account_key
                )
                # Test connection
                container_client = self.blob_client.get_container_client(self.config.azure_container)
                container_client.get_container_properties()
                logger.info("Azure Blob backup storage initialized")
                
            return True
            
        except Exception as e:
            logger.error(f"Cloud storage initialization failed: {e}")
            return False
    
    async def upload_backup(self, local_path: Path, remote_key: str) -> str:
        """Upload backup to cloud storage"""
        try:
            if self.config.cloud_provider == "aws" and self.s3_client:
                self.s3_client.upload_file(
                    str(local_path),
                    self.config.aws_s3_bucket,
                    remote_key
                )
                return f"s3://{self.config.aws_s3_bucket}/{remote_key}"
                
            elif self.config.cloud_provider == "azure" and self.blob_client:
                blob_client = self.blob_client.get_blob_client(
                    container=self.config.azure_container,
                    blob=remote_key
                )
                with open(local_path, 'rb') as data:
                    blob_client.upload_blob(data, overwrite=True)
                return f"azure://{self.config.azure_container}/{remote_key}"
            
            return ""
            
        except Exception as e:
            logger.error(f"Cloud upload failed: {e}")
            return ""
    
    async def download_backup(self, remote_key: str, local_path: Path) -> bool:
        """Download backup from cloud storage"""
        try:
            if self.config.cloud_provider == "aws" and self.s3_client:
                self.s3_client.download_file(
                    self.config.aws_s3_bucket,
                    remote_key,
                    str(local_path)
                )
                return True
                
            elif self.config.cloud_provider == "azure" and self.blob_client:
                blob_client = self.blob_client.get_blob_client(
                    container=self.config.azure_container,
                    blob=remote_key
                )
                with open(local_path, 'wb') as data:
                    blob_client.download_blob().readinto(data)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Cloud download failed: {e}")
            return False

class BaseBackupAdapter(ABC):
    """Base class for database backup adapters"""
    
    def __init__(self, config: BackupConfig):
        self.config = config
        
    @abstractmethod
    async def create_backup(self, database_name: str, output_path: Path) -> BackupMetadata:
        """Create a database backup"""
        pass
    
    @abstractmethod
    async def restore_backup(self, backup_path: Path, database_name: str, 
                           metadata: BackupMetadata) -> bool:
        """Restore a database from backup"""
        pass
    
    def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA256 checksum of a file"""
        sha256_hash = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _compress_file(self, input_path: Path, output_path: Path) -> bool:
        """Compress a file using gzip"""
        try:
            with open(input_path, 'rb') as f_in:
                with gzip.open(output_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            return True
        except Exception as e:
            logger.error(f"Compression failed: {e}")
            return False
    
    def _decompress_file(self, input_path: Path, output_path: Path) -> bool:
        """Decompress a gzip file"""
        try:
            with gzip.open(input_path, 'rb') as f_in:
                with open(output_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            return True
        except Exception as e:
            logger.error(f"Decompression failed: {e}")
            return False

class SQLiteBackupAdapter(BaseBackupAdapter):
    """SQLite backup adapter"""
    
    async def create_backup(self, database_path: str, output_path: Path) -> BackupMetadata:
        """Create SQLite backup using file copy"""
        metadata = BackupMetadata("sqlite", "frontier_business")
        metadata.source_location = database_path
        
        try:
            db_path = Path(database_path.replace("sqlite:///", ""))
            if not db_path.exists():
                raise FileNotFoundError(f"Database file not found: {db_path}")
            
            # Copy database file
            backup_file = output_path / f"sqlite_backup_{metadata.timestamp.strftime('%Y%m%d_%H%M%S')}.db"
            shutil.copy2(db_path, backup_file)
            
            # Compress if enabled
            if self.config.enable_compression:
                compressed_file = backup_file.with_suffix('.db.gz')
                if self._compress_file(backup_file, compressed_file):
                    backup_file.unlink()
                    backup_file = compressed_file
                    metadata.compressed = True
            
            # Encrypt if enabled
            if self.config.enable_encryption and self.config.encryption_password:
                if CRYPTO_AVAILABLE:
                    encryption_manager = EncryptionManager(self.config.encryption_password)
                    encrypted_file = backup_file.with_suffix(backup_file.suffix + '.enc')
                    if encryption_manager.encrypt_file(backup_file, encrypted_file):
                        backup_file.unlink()
                        backup_file = encrypted_file
                        metadata.encrypted = True
            
            metadata.file_size = backup_file.stat().st_size
            metadata.checksum = self._calculate_checksum(backup_file)
            
            logger.info(f"SQLite backup created: {backup_file}")
            return metadata
            
        except Exception as e:
            logger.error(f"SQLite backup failed: {e}")
            raise
    
    async def restore_backup(self, backup_path: Path, database_path: str, 
                           metadata: BackupMetadata) -> bool:
        """Restore SQLite database from backup"""
        try:
            restore_file = backup_path
            
            # Decrypt if needed
            if metadata.encrypted:
                if not (CRYPTO_AVAILABLE and self.config.encryption_password):
                    raise ValueError("Cannot decrypt backup: encryption not available or password not set")
                
                encryption_manager = EncryptionManager(self.config.encryption_password)
                decrypted_file = backup_path.with_suffix('.decrypted')
                if not encryption_manager.decrypt_file(backup_path, decrypted_file):
                    raise ValueError("Failed to decrypt backup file")
                restore_file = decrypted_file
            
            # Decompress if needed
            if metadata.compressed:
                decompressed_file = restore_file.with_suffix('.decompressed')
                if not self._decompress_file(restore_file, decompressed_file):
                    raise ValueError("Failed to decompress backup file")
                if metadata.encrypted:
                    restore_file.unlink()
                restore_file = decompressed_file
            
            # Restore database file
            db_path = Path(database_path.replace("sqlite:///", ""))
            db_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Backup existing database if it exists
            if db_path.exists():
                backup_existing = db_path.with_suffix('.backup')
                shutil.move(db_path, backup_existing)
            
            shutil.copy2(restore_file, db_path)
            
            # Cleanup temporary files
            if metadata.encrypted or metadata.compressed:
                restore_file.unlink()
            
            logger.info(f"SQLite database restored from: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"SQLite restore failed: {e}")
            return False

class PostgreSQLBackupAdapter(BaseBackupAdapter):
    """PostgreSQL backup adapter using pg_dump/pg_restore"""
    
    async def create_backup(self, connection_params: Dict[str, str], output_path: Path) -> BackupMetadata:
        """Create PostgreSQL backup using pg_dump"""
        metadata = BackupMetadata("postgresql", connection_params.get("database", "frontier_business"))
        
        try:
            # Prepare pg_dump command
            timestamp = metadata.timestamp.strftime('%Y%m%d_%H%M%S')
            backup_file = output_path / f"postgresql_backup_{timestamp}.sql"
            
            cmd = [
                self.config.pg_dump_path,
                f"--host={connection_params['host']}",
                f"--port={connection_params['port']}",
                f"--username={connection_params['username']}",
                f"--dbname={connection_params['database']}",
                "--verbose",
                "--clean",
                "--create",
                "--if-exists",
                f"--file={backup_file}"
            ]
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = connection_params['password']
            
            # Execute pg_dump
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"pg_dump failed: {stderr.decode()}")
            
            # Compress if enabled
            if self.config.enable_compression:
                compressed_file = backup_file.with_suffix('.sql.gz')
                if self._compress_file(backup_file, compressed_file):
                    backup_file.unlink()
                    backup_file = compressed_file
                    metadata.compressed = True
            
            # Encrypt if enabled
            if self.config.enable_encryption and self.config.encryption_password:
                if CRYPTO_AVAILABLE:
                    encryption_manager = EncryptionManager(self.config.encryption_password)
                    encrypted_file = backup_file.with_suffix(backup_file.suffix + '.enc')
                    if encryption_manager.encrypt_file(backup_file, encrypted_file):
                        backup_file.unlink()
                        backup_file = encrypted_file
                        metadata.encrypted = True
            
            metadata.file_size = backup_file.stat().st_size
            metadata.checksum = self._calculate_checksum(backup_file)
            
            logger.info(f"PostgreSQL backup created: {backup_file}")
            return metadata
            
        except Exception as e:
            logger.error(f"PostgreSQL backup failed: {e}")
            raise
    
    async def restore_backup(self, backup_path: Path, connection_params: Dict[str, str], 
                           metadata: BackupMetadata) -> bool:
        """Restore PostgreSQL database from backup"""
        try:
            restore_file = backup_path
            
            # Decrypt if needed
            if metadata.encrypted:
                if not (CRYPTO_AVAILABLE and self.config.encryption_password):
                    raise ValueError("Cannot decrypt backup: encryption not available or password not set")
                
                encryption_manager = EncryptionManager(self.config.encryption_password)
                decrypted_file = backup_path.with_suffix('.decrypted')
                if not encryption_manager.decrypt_file(backup_path, decrypted_file):
                    raise ValueError("Failed to decrypt backup file")
                restore_file = decrypted_file
            
            # Decompress if needed
            if metadata.compressed:
                decompressed_file = restore_file.with_suffix('.decompressed')
                if not self._decompress_file(restore_file, decompressed_file):
                    raise ValueError("Failed to decompress backup file")
                if metadata.encrypted:
                    restore_file.unlink()
                restore_file = decompressed_file
            
            # Prepare pg_restore command
            cmd = [
                "psql",  # Use psql for SQL files
                f"--host={connection_params['host']}",
                f"--port={connection_params['port']}",
                f"--username={connection_params['username']}",
                f"--dbname={connection_params['database']}",
                f"--file={restore_file}"
            ]
            
            # Set password via environment variable
            env = os.environ.copy()
            env['PGPASSWORD'] = connection_params['password']
            
            # Execute restore
            process = await asyncio.create_subprocess_exec(
                *cmd,
                env=env,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                logger.warning(f"PostgreSQL restore warnings: {stderr.decode()}")
            
            # Cleanup temporary files
            if metadata.encrypted or metadata.compressed:
                restore_file.unlink()
            
            logger.info(f"PostgreSQL database restored from: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"PostgreSQL restore failed: {e}")
            return False

class MongoDBBackupAdapter(BaseBackupAdapter):
    """MongoDB backup adapter using mongodump/mongorestore"""
    
    async def create_backup(self, connection_params: Dict[str, str], output_path: Path) -> BackupMetadata:
        """Create MongoDB backup using mongodump"""
        metadata = BackupMetadata("mongodb", connection_params.get("database", "frontier_business"))
        
        try:
            # Prepare mongodump command
            timestamp = metadata.timestamp.strftime('%Y%m%d_%H%M%S')
            backup_dir = output_path / f"mongodb_backup_{timestamp}"
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            cmd = [
                self.config.mongodump_path,
                f"--host={connection_params['host']}:{connection_params['port']}",
                f"--db={connection_params['database']}",
                f"--out={backup_dir}"
            ]
            
            # Add authentication if provided
            if connection_params.get('username'):
                cmd.extend([
                    f"--username={connection_params['username']}",
                    f"--password={connection_params['password']}"
                ])
                if connection_params.get('auth_source'):
                    cmd.append(f"--authenticationDatabase={connection_params['auth_source']}")
            
            # Execute mongodump
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"mongodump failed: {stderr.decode()}")
            
            # Create tar archive
            archive_file = output_path / f"mongodb_backup_{timestamp}.tar"
            with tarfile.open(archive_file, 'w') as tar:
                tar.add(backup_dir, arcname=backup_dir.name)
            
            # Remove temporary directory
            shutil.rmtree(backup_dir)
            backup_file = archive_file
            
            # Compress if enabled
            if self.config.enable_compression:
                compressed_file = backup_file.with_suffix('.tar.gz')
                if self._compress_file(backup_file, compressed_file):
                    backup_file.unlink()
                    backup_file = compressed_file
                    metadata.compressed = True
            
            # Encrypt if enabled
            if self.config.enable_encryption and self.config.encryption_password:
                if CRYPTO_AVAILABLE:
                    encryption_manager = EncryptionManager(self.config.encryption_password)
                    encrypted_file = backup_file.with_suffix(backup_file.suffix + '.enc')
                    if encryption_manager.encrypt_file(backup_file, encrypted_file):
                        backup_file.unlink()
                        backup_file = encrypted_file
                        metadata.encrypted = True
            
            metadata.file_size = backup_file.stat().st_size
            metadata.checksum = self._calculate_checksum(backup_file)
            
            logger.info(f"MongoDB backup created: {backup_file}")
            return metadata
            
        except Exception as e:
            logger.error(f"MongoDB backup failed: {e}")
            raise
    
    async def restore_backup(self, backup_path: Path, connection_params: Dict[str, str], 
                           metadata: BackupMetadata) -> bool:
        """Restore MongoDB database from backup"""
        try:
            restore_file = backup_path
            
            # Decrypt if needed
            if metadata.encrypted:
                if not (CRYPTO_AVAILABLE and self.config.encryption_password):
                    raise ValueError("Cannot decrypt backup: encryption not available or password not set")
                
                encryption_manager = EncryptionManager(self.config.encryption_password)
                decrypted_file = backup_path.with_suffix('.decrypted')
                if not encryption_manager.decrypt_file(backup_path, decrypted_file):
                    raise ValueError("Failed to decrypt backup file")
                restore_file = decrypted_file
            
            # Decompress if needed
            if metadata.compressed:
                decompressed_file = restore_file.with_suffix('.decompressed')
                if not self._decompress_file(restore_file, decompressed_file):
                    raise ValueError("Failed to decompress backup file")
                if metadata.encrypted:
                    restore_file.unlink()
                restore_file = decompressed_file
            
            # Extract tar archive
            extract_dir = restore_file.parent / "restore_temp"
            extract_dir.mkdir(parents=True, exist_ok=True)
            
            with tarfile.open(restore_file, 'r') as tar:
                tar.extractall(extract_dir)
            
            # Find the database directory
            db_dir = None
            for item in extract_dir.iterdir():
                if item.is_dir():
                    db_subdir = item / connection_params['database']
                    if db_subdir.exists():
                        db_dir = db_subdir
                        break
            
            if not db_dir:
                raise ValueError("Database directory not found in backup archive")
            
            # Prepare mongorestore command
            cmd = [
                self.config.mongorestore_path,
                f"--host={connection_params['host']}:{connection_params['port']}",
                f"--db={connection_params['database']}",
                "--drop",  # Drop existing collections
                str(db_dir)
            ]
            
            # Add authentication if provided
            if connection_params.get('username'):
                cmd.extend([
                    f"--username={connection_params['username']}",
                    f"--password={connection_params['password']}"
                ])
                if connection_params.get('auth_source'):
                    cmd.append(f"--authenticationDatabase={connection_params['auth_source']}")
            
            # Execute mongorestore
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"mongorestore failed: {stderr.decode()}")
            
            # Cleanup temporary files
            shutil.rmtree(extract_dir)
            if metadata.encrypted or metadata.compressed:
                restore_file.unlink()
            
            logger.info(f"MongoDB database restored from: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"MongoDB restore failed: {e}")
            return False

class BackupManager:
    """Main backup and restore management system"""
    
    def __init__(self):
        self.config = BackupConfig()
        self.cloud_storage = CloudStorageManager(self.config)
        self.scheduler = None
        self.adapters = {
            "sqlite": SQLiteBackupAdapter(self.config),
            "postgresql": PostgreSQLBackupAdapter(self.config),
            "mongodb": MongoDBBackupAdapter(self.config)
        }
        
    async def initialize(self) -> bool:
        """Initialize backup manager"""
        try:
            # Initialize cloud storage if enabled
            await self.cloud_storage.initialize()
            
            # Initialize scheduler if enabled
            if self.config.auto_backup_enabled and SCHEDULER_AVAILABLE:
                self.scheduler = AsyncIOScheduler()
                
                # Add scheduled backup job
                if self.config.backup_schedule:
                    # Parse cron schedule
                    cron_parts = self.config.backup_schedule.split()
                    if len(cron_parts) == 5:
                        minute, hour, day, month, day_of_week = cron_parts
                        trigger = CronTrigger(
                            minute=minute,
                            hour=hour,
                            day=day,
                            month=month,
                            day_of_week=day_of_week
                        )
                    else:
                        # Fallback to interval trigger
                        trigger = IntervalTrigger(hours=self.config.backup_interval_hours)
                    
                    self.scheduler.add_job(
                        self._scheduled_backup,
                        trigger,
                        id='automated_backup',
                        name='Automated Database Backup'
                    )
                
                self.scheduler.start()
                logger.info("Backup scheduler initialized")
            
            # Clean up old backups
            await self._cleanup_old_backups()
            
            logger.info("Backup manager initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Backup manager initialization failed: {e}")
            return False
    
    async def create_backup(self, db_type: str, connection_params: Dict[str, str], 
                          backup_name: str = None) -> BackupMetadata:
        """Create a database backup"""
        try:
            if db_type not in self.adapters:
                raise ValueError(f"Unsupported database type: {db_type}")
            
            adapter = self.adapters[db_type]
            
            # Create backup directory for this session
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_dir = self.config.local_backup_dir / f"{db_type}_{timestamp}"
            backup_dir.mkdir(parents=True, exist_ok=True)
            
            # Create backup
            metadata = await adapter.create_backup(connection_params, backup_dir)
            
            # Save metadata
            metadata_file = backup_dir / "backup_metadata.json"
            with open(metadata_file, 'w') as f:
                json.dump(metadata.to_dict(), f, indent=2)
            
            # Upload to cloud if enabled
            if self.config.enable_cloud_backup:
                backup_files = list(backup_dir.glob("*"))
                for backup_file in backup_files:
                    if backup_file.name != "backup_metadata.json":
                        remote_key = f"backups/{db_type}/{timestamp}/{backup_file.name}"
                        cloud_location = await self.cloud_storage.upload_backup(backup_file, remote_key)
                        if cloud_location:
                            metadata.cloud_location = cloud_location
                            # Update metadata with cloud location
                            with open(metadata_file, 'w') as f:
                                json.dump(metadata.to_dict(), f, indent=2)
            
            logger.info(f"Backup completed successfully: {backup_dir}")
            return metadata
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            raise
    
    async def restore_backup(self, backup_path: Path, db_type: str, 
                           connection_params: Dict[str, str]) -> bool:
        """Restore a database from backup"""
        try:
            if db_type not in self.adapters:
                raise ValueError(f"Unsupported database type: {db_type}")
            
            adapter = self.adapters[db_type]
            
            # Load metadata
            if backup_path.is_dir():
                metadata_file = backup_path / "backup_metadata.json"
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        metadata_dict = json.load(f)
                    metadata = BackupMetadata.from_dict(metadata_dict)
                    
                    # Find the actual backup file
                    backup_files = [f for f in backup_path.glob("*") if f.name != "backup_metadata.json"]
                    if backup_files:
                        actual_backup_path = backup_files[0]
                    else:
                        raise FileNotFoundError("No backup file found in directory")
                else:
                    raise FileNotFoundError("Backup metadata not found")
            else:
                # Single file backup - create minimal metadata
                metadata = BackupMetadata(db_type, "unknown")
                actual_backup_path = backup_path
            
            # Restore database
            success = await adapter.restore_backup(actual_backup_path, connection_params, metadata)
            
            if success:
                logger.info(f"Database restored successfully from: {backup_path}")
            else:
                logger.error(f"Database restore failed from: {backup_path}")
            
            return success
            
        except Exception as e:
            logger.error(f"Backup restore failed: {e}")
            return False
    
    async def list_backups(self, db_type: str = None) -> List[Dict[str, Any]]:
        """List available backups"""
        backups = []
        
        try:
            pattern = f"{db_type}_*" if db_type else "*"
            
            for backup_dir in self.config.local_backup_dir.glob(pattern):
                if backup_dir.is_dir():
                    metadata_file = backup_dir / "backup_metadata.json"
                    if metadata_file.exists():
                        with open(metadata_file, 'r') as f:
                            metadata_dict = json.load(f)
                        
                        backup_info = metadata_dict.copy()
                        backup_info["backup_path"] = str(backup_dir)
                        backup_info["local_size_mb"] = sum(
                            f.stat().st_size for f in backup_dir.rglob("*") if f.is_file()
                        ) / (1024 * 1024)
                        
                        backups.append(backup_info)
            
            # Sort by timestamp (newest first)
            backups.sort(key=lambda x: x["timestamp"], reverse=True)
            
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
        
        return backups
    
    async def _scheduled_backup(self):
        """Perform scheduled backup of all configured databases"""
        logger.info("Starting scheduled backup")
        
        # This would need to be configured with actual database connections
        # For now, it's a placeholder for the automated backup functionality
        pass
    
    async def _cleanup_old_backups(self):
        """Clean up old backup files based on retention policy"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.config.retention_days)
            
            # Get all backup directories
            backup_dirs = []
            for backup_dir in self.config.local_backup_dir.glob("*"):
                if backup_dir.is_dir():
                    metadata_file = backup_dir / "backup_metadata.json"
                    if metadata_file.exists():
                        with open(metadata_file, 'r') as f:
                            metadata_dict = json.load(f)
                        
                        backup_date = datetime.fromisoformat(metadata_dict["timestamp"])
                        backup_dirs.append((backup_dir, backup_date))
            
            # Sort by date (oldest first)
            backup_dirs.sort(key=lambda x: x[1])
            
            # Remove old backups
            removed_count = 0
            for backup_dir, backup_date in backup_dirs:
                if backup_date < cutoff_date or len(backup_dirs) - removed_count > self.config.max_local_backups:
                    shutil.rmtree(backup_dir)
                    removed_count += 1
                    logger.info(f"Removed old backup: {backup_dir}")
            
            if removed_count > 0:
                logger.info(f"Cleaned up {removed_count} old backups")
            
        except Exception as e:
            logger.error(f"Backup cleanup failed: {e}")
    
    async def shutdown(self):
        """Shutdown backup manager"""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
        logger.info("Backup manager shutdown complete")

# Global backup manager instance
backup_manager = BackupManager()
