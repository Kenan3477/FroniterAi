#!/usr/bin/env python3
"""
Simple Configuration Management for FrontierAI
Basic configuration without circular dependencies
"""

import os
import json
from typing import Any, Dict
from pathlib import Path

class SimpleConfig:
    def __init__(self):
        self.config = {
            'database': {
                'url': os.getenv('DATABASE_URL', 'sqlite:///frontier.db'),
                'pool_size': int(os.getenv('DB_POOL_SIZE', '10'))
            },
            'api': {
                'github_token': os.getenv('GITHUB_TOKEN'),
                'rate_limit': int(os.getenv('API_RATE_LIMIT', '100'))
            },
            'monitoring': {
                'enabled': os.getenv('MONITORING_ENABLED', 'true').lower() == 'true',
                'interval': int(os.getenv('MONITORING_INTERVAL', '60'))
            },
            'evolution': {
                'auto_evolve': os.getenv('AUTO_EVOLVE', 'true').lower() == 'true',
                'evolution_interval': int(os.getenv('EVOLUTION_INTERVAL', '3600'))
            }
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value using dot notation"""
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value

# Global config instance
_config = SimpleConfig()

def get_config():
    """Get the global configuration manager"""
    return _config
