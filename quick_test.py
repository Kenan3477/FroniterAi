#!/usr/bin/env python3
"""
Quick test with GitHub token
"""

import os
import sys
from pathlib import Path
import time

# Set GitHub token from environment variable
github_token = os.environ.get('GITHUB_TOKEN')
if not github_token:
    print("⚠️  Please set GITHUB_TOKEN environment variable")
    print("💡 Example: set GITHUB_TOKEN=your_actual_token_here")
    sys.exit(1)

os.environ['GITHUB_TOKEN'] = github_token

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
