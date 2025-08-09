"""
FrontierAI Utility Functions
Common utilities for logging, file operations, and system helpers
"""

import logging
import os
import json
import hashlib
import tempfile
import shutil
import zipfile
import subprocess
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
import re

def setup_logging(log_level: str = "INFO", log_file: Optional[str] = None) -> logging.Logger:
    """
    Set up logging configuration for FrontierAI
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Optional log file path
        
    Returns:
        Configured logger instance
    """
    # Create formatter
    formatter = logging.Formatter(
        fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Get FrontierAI logger
    logger = logging.getLogger('frontier_ai')
    logger.info(f"Logging configured - Level: {log_level}, File: {log_file or 'None'}")
    
    return logger

class FileManager:
    """
    File management utilities
    """
    
    @staticmethod
    def ensure_directory(path: str) -> bool:
        """
        Ensure directory exists, create if needed
        
        Args:
            path: Directory path to ensure
            
        Returns:
            True if directory exists or was created successfully
        """
        try:
            os.makedirs(path, exist_ok=True)
            return True
        except Exception as e:
            logging.error(f"Failed to create directory {path}: {e}")
            return False
    
    @staticmethod
    def safe_write(file_path: str, content: str, backup: bool = True) -> bool:
        """
        Safely write content to file with optional backup
        
        Args:
            file_path: Path to write file
            content: Content to write
            backup: Whether to create backup if file exists
            
        Returns:
            True if write was successful
        """
        try:
            # Ensure directory exists
            FileManager.ensure_directory(os.path.dirname(file_path))
            
            # Create backup if requested and file exists
            if backup and os.path.exists(file_path):
                backup_path = f"{file_path}.backup.{int(datetime.now().timestamp())}"
                shutil.copy2(file_path, backup_path)
                logging.info(f"Created backup: {backup_path}")
            
            # Write content atomically
            temp_path = f"{file_path}.tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            # Move temp file to final location
            shutil.move(temp_path, file_path)
            logging.info(f"Successfully wrote file: {file_path}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to write file {file_path}: {e}")
            return False
    
    @staticmethod
    def safe_read(file_path: str) -> Optional[str]:
        """
        Safely read file content
        
        Args:
            file_path: Path to read file
            
        Returns:
            File content or None if failed
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            logging.error(f"Failed to read file {file_path}: {e}")
            return None
    
    @staticmethod
    def calculate_file_hash(file_path: str, algorithm: str = "sha256") -> Optional[str]:
        """
        Calculate file hash
        
        Args:
            file_path: Path to file
            algorithm: Hash algorithm (md5, sha1, sha256, etc.)
            
        Returns:
            File hash or None if failed
        """
        try:
            hash_obj = hashlib.new(algorithm)
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_obj.update(chunk)
            return hash_obj.hexdigest()
        except Exception as e:
            logging.error(f"Failed to calculate hash for {file_path}: {e}")
            return None
    
    @staticmethod
    def get_file_info(file_path: str) -> Dict:
        """
        Get comprehensive file information
        
        Args:
            file_path: Path to file
            
        Returns:
            Dictionary with file information
        """
        try:
            stat = os.stat(file_path)
            return {
                "path": file_path,
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "is_file": os.path.isfile(file_path),
                "is_directory": os.path.isdir(file_path),
                "extension": os.path.splitext(file_path)[1],
                "basename": os.path.basename(file_path),
                "dirname": os.path.dirname(file_path)
            }
        except Exception as e:
            logging.error(f"Failed to get file info for {file_path}: {e}")
            return {"error": str(e), "path": file_path}

class DataValidator:
    """
    Data validation utilities
    """
    
    @staticmethod
    def validate_json(data: str) -> tuple[bool, Optional[Dict]]:
        """
        Validate JSON string
        
        Args:
            data: JSON string to validate
            
        Returns:
            Tuple of (is_valid, parsed_data_or_none)
        """
        try:
            parsed = json.loads(data)
            return True, parsed
        except json.JSONDecodeError as e:
            logging.error(f"JSON validation failed: {e}")
            return False, None
    
    @staticmethod
    def validate_url(url: str) -> bool:
        """
        Validate URL format
        
        Args:
            url: URL to validate
            
        Returns:
            True if URL format is valid
        """
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return url_pattern.match(url) is not None
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        Validate email format
        
        Args:
            email: Email to validate
            
        Returns:
            True if email format is valid
        """
        email_pattern = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        return email_pattern.match(email) is not None
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Sanitize filename for safe filesystem usage
        
        Args:
            filename: Original filename
            
        Returns:
            Sanitized filename
        """
        # Remove or replace invalid characters
        sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
        # Remove leading/trailing whitespace and dots
        sanitized = sanitized.strip('. ')
        # Ensure not empty
        if not sanitized:
            sanitized = "unnamed_file"
        return sanitized

class SystemUtils:
    """
    System utility functions
    """
    
    @staticmethod
    def run_command(command: str, cwd: Optional[str] = None, timeout: int = 60) -> Dict:
        """
        Run system command safely
        
        Args:
            command: Command to run
            cwd: Working directory
            timeout: Command timeout in seconds
            
        Returns:
            Dictionary with command result
        """
        try:
            result = subprocess.run(
                command,
                shell=True,
                cwd=cwd,
                timeout=timeout,
                capture_output=True,
                text=True
            )
            
            return {
                "success": result.returncode == 0,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "command": command
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": "Command timed out",
                "command": command,
                "timeout": timeout
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "command": command
            }
    
    @staticmethod
    def get_environment_info() -> Dict:
        """
        Get system environment information
        
        Returns:
            Dictionary with environment info
        """
        try:
            import platform
            import sys
            
            return {
                "platform": platform.platform(),
                "system": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor(),
                "python_version": sys.version,
                "python_executable": sys.executable,
                "working_directory": os.getcwd(),
                "environment_variables": dict(os.environ)
            }
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def create_temp_directory(prefix: str = "frontier_ai_") -> str:
        """
        Create temporary directory
        
        Args:
            prefix: Directory name prefix
            
        Returns:
            Path to created temporary directory
        """
        return tempfile.mkdtemp(prefix=prefix)
    
    @staticmethod
    def cleanup_temp_files(path: str) -> bool:
        """
        Clean up temporary files/directories
        
        Args:
            path: Path to clean up
            
        Returns:
            True if cleanup was successful
        """
        try:
            if os.path.exists(path):
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)
                logging.info(f"Cleaned up temporary path: {path}")
            return True
        except Exception as e:
            logging.error(f"Failed to cleanup {path}: {e}")
            return False

class ArchiveManager:
    """
    Archive and compression utilities
    """
    
    @staticmethod
    def create_zip_archive(source_path: str, archive_path: str, exclude_patterns: Optional[List[str]] = None) -> bool:
        """
        Create ZIP archive from source path
        
        Args:
            source_path: Path to archive
            archive_path: Output archive path
            exclude_patterns: List of patterns to exclude
            
        Returns:
            True if archive was created successfully
        """
        try:
            exclude_patterns = exclude_patterns or []
            
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                if os.path.isfile(source_path):
                    zipf.write(source_path, os.path.basename(source_path))
                else:
                    for root, dirs, files in os.walk(source_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            
                            # Check exclusion patterns
                            should_exclude = False
                            for pattern in exclude_patterns:
                                if re.search(pattern, file_path):
                                    should_exclude = True
                                    break
                            
                            if not should_exclude:
                                arcname = os.path.relpath(file_path, source_path)
                                zipf.write(file_path, arcname)
            
            logging.info(f"Created archive: {archive_path}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to create archive: {e}")
            return False
    
    @staticmethod
    def extract_zip_archive(archive_path: str, extract_path: str) -> bool:
        """
        Extract ZIP archive
        
        Args:
            archive_path: Path to archive file
            extract_path: Directory to extract to
            
        Returns:
            True if extraction was successful
        """
        try:
            with zipfile.ZipFile(archive_path, 'r') as zipf:
                zipf.extractall(extract_path)
            
            logging.info(f"Extracted archive {archive_path} to {extract_path}")
            return True
            
        except Exception as e:
            logging.error(f"Failed to extract archive: {e}")
            return False

class ConfigManager:
    """
    Configuration management utilities
    """
    
    def __init__(self, config_file: str):
        """
        Initialize config manager
        
        Args:
            config_file: Path to configuration file
        """
        self.config_file = config_file
        self.config = {}
        self.load_config()
    
    def load_config(self) -> bool:
        """
        Load configuration from file
        
        Returns:
            True if config was loaded successfully
        """
        try:
            if os.path.exists(self.config_file):
                content = FileManager.safe_read(self.config_file)
                if content:
                    is_valid, parsed = DataValidator.validate_json(content)
                    if is_valid:
                        self.config = parsed
                        logging.info(f"Loaded configuration from {self.config_file}")
                        return True
            
            # Create default config if file doesn't exist
            self.config = self._get_default_config()
            self.save_config()
            return True
            
        except Exception as e:
            logging.error(f"Failed to load config: {e}")
            self.config = self._get_default_config()
            return False
    
    def save_config(self) -> bool:
        """
        Save configuration to file
        
        Returns:
            True if config was saved successfully
        """
        try:
            content = json.dumps(self.config, indent=2)
            return FileManager.safe_write(self.config_file, content)
        except Exception as e:
            logging.error(f"Failed to save config: {e}")
            return False
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value
        
        Args:
            key: Configuration key (supports dot notation)
            default: Default value if key not found
            
        Returns:
            Configuration value or default
        """
        try:
            keys = key.split('.')
            value = self.config
            
            for k in keys:
                if isinstance(value, dict) and k in value:
                    value = value[k]
                else:
                    return default
            
            return value
        except:
            return default
    
    def set(self, key: str, value: Any) -> bool:
        """
        Set configuration value
        
        Args:
            key: Configuration key (supports dot notation)
            value: Value to set
            
        Returns:
            True if value was set successfully
        """
        try:
            keys = key.split('.')
            config = self.config
            
            # Navigate to parent key
            for k in keys[:-1]:
                if k not in config:
                    config[k] = {}
                config = config[k]
            
            # Set final value
            config[keys[-1]] = value
            return self.save_config()
            
        except Exception as e:
            logging.error(f"Failed to set config {key}={value}: {e}")
            return False
    
    def _get_default_config(self) -> Dict:
        """Get default configuration"""
        return {
            "frontier_ai": {
                "version": "1.0.0",
                "log_level": "INFO",
                "database": {
                    "path": "autonomous_evolution.db"
                },
                "evolution": {
                    "enabled": True,
                    "interval_minutes": 30,
                    "max_concurrent_evolutions": 3
                },
                "monitoring": {
                    "enabled": True,
                    "interval_seconds": 60,
                    "alert_thresholds": {
                        "cpu_usage": 80.0,
                        "memory_usage": 85.0,
                        "disk_usage": 90.0
                    }
                },
                "github": {
                    "enabled": False,
                    "token": "",
                    "default_repo": ""
                }
            }
        }

# Global utilities
def get_timestamp(format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Get formatted timestamp"""
    return datetime.now().strftime(format_str)

def ensure_list(value: Union[Any, List[Any]]) -> List[Any]:
    """Ensure value is a list"""
    if isinstance(value, list):
        return value
    return [value] if value is not None else []

def safe_get(dictionary: Dict, key: str, default: Any = None) -> Any:
    """Safely get value from dictionary"""
    return dictionary.get(key, default) if isinstance(dictionary, dict) else default

def truncate_string(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """Truncate string to maximum length"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix
