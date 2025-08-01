#!/usr/bin/env python3
"""
Quick test with GitHub token
"""

import os
import sys
from pathlib import Path
import time

# Set GitHub token
os.environ['GITHUB_TOKEN'] = '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'

# Add current directory to path
sys.path.append(str(Path.cwd()))

from production_evolution_manager import ProductionEvolutionManager

print(f'🔑 GitHub token set: {len(os.environ.get("GITHUB_TOKEN", ""))} chars')

# Create and start manager
workspace_path = Path.cwd()
manager = ProductionEvolutionManager(workspace_path)
manager.start_autonomous_evolution()

# Wait for it to fetch data
print('⏳ Waiting for GitHub data to be fetched...')
time.sleep(10)

# Check status
status = manager.get_heartbeat_status()
print(f'✅ Final Status: {status}')
