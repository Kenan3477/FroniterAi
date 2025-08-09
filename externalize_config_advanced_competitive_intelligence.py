#!/usr/bin/env python3
"""
⚙️ CONFIGURATION EXTERNALIZATION
===============================
Externalizes hardcoded values from advanced_competitive_intelligence
Generated: 2025-08-09T14:20:47.214648
"""

import os
import json
import yaml
from typing import Dict, Any, Optional
from pathlib import Path

class ConfigurationManager:
    """Manages externalized configuration for advanced_competitive_intelligence"""
    
    def __init__(self, config_file: str = "advanced_competitive_intelligence_config.json"):
        self.config_file = Path(config_file)
        self._config = None
        self._load_config()
    
    def _load_config(self):
        """Load configuration from file or create default"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    if self.config_file.suffix == '.yaml':
                        self._config = yaml.safe_load(f)
                    else:
                        self._config = json.load(f)
            except Exception as e:
                print(f"⚠️  Error loading config: {e}")
                self._config = self._get_default_config()
        else:
            self._config = self._get_default_config()
            self._save_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Default configuration values"""
        return {
            "api": {
                "base_url": os.getenv("API_BASE_URL", "https://api.example.com"),
                "timeout": int(os.getenv("API_TIMEOUT", "30")),
                "retry_attempts": int(os.getenv("API_RETRIES", "3"))
            },
            "database": {
                "host": os.getenv("DB_HOST", "localhost"),
                "port": int(os.getenv("DB_PORT", "5432")),
                "name": os.getenv("DB_NAME", "frontier_ai"),
                "connection_pool_size": int(os.getenv("DB_POOL_SIZE", "10"))
            },
            "security": {
                "secret_key": os.getenv("SECRET_KEY", "change-me-in-production"),
                "encryption_algorithm": os.getenv("ENCRYPTION_ALG", "AES256"),
                "session_timeout": int(os.getenv("SESSION_TIMEOUT", "3600"))
            },
            "performance": {
                "cache_ttl": int(os.getenv("CACHE_TTL", "300")),
                "max_workers": int(os.getenv("MAX_WORKERS", "4")),
                "batch_size": int(os.getenv("BATCH_SIZE", "100"))
            },
            "features": {
                "enable_analytics": os.getenv("ENABLE_ANALYTICS", "true").lower() == "true",
                "enable_debug": os.getenv("ENABLE_DEBUG", "false").lower() == "true",
                "maintenance_mode": os.getenv("MAINTENANCE_MODE", "false").lower() == "true"
            }
        }
    
    def _save_config(self):
        """Save current configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                if self.config_file.suffix == '.yaml':
                    yaml.safe_dump(self._config, f, default_flow_style=False)
                else:
                    json.dump(self._config, f, indent=2)
        except Exception as e:
            print(f"⚠️  Error saving config: {e}")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value with dot notation"""
        keys = key.split('.')
        value = self._config
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    def set(self, key: str, value: Any):
        """Set configuration value with dot notation"""
        keys = key.split('.')
        config = self._config
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
        self._save_config()
    
    def get_api_config(self) -> Dict[str, Any]:
        """Get API-specific configuration"""
        return self.get("api", {})
    
    def get_database_config(self) -> Dict[str, Any]:
        """Get database-specific configuration"""
        return self.get("database", {})
    
    def get_security_config(self) -> Dict[str, Any]:
        """Get security-specific configuration"""
        return self.get("security", {})
    
    def is_feature_enabled(self, feature: str) -> bool:
        """Check if a feature is enabled"""
        return self.get(f"features.{feature}", False)

# Global configuration instance
config = ConfigurationManager()

# Convenience functions
def get_config(key: str, default: Any = None) -> Any:
    """Get configuration value"""
    return config.get(key, default)

def set_config(key: str, value: Any):
    """Set configuration value"""
    config.set(key, value)

# Example usage:
# api_url = get_config("api.base_url")
# db_host = get_config("database.host")
# is_debug = config.is_feature_enabled("debug")

if __name__ == "__main__":
    print("⚙️ Configuration manager ready")
    print(f"📁 Config file: {config.config_file}")
    print("✅ All hardcoded values can now be externalized")
