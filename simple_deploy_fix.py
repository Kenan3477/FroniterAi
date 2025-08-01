#!/usr/bin/env python3
"""
Simple Railway Deploy Fix
"""

from datetime import datetime
import os

# Add timestamp to force Railway to see a change
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

print(f"🚀 FORCING RAILWAY DEPLOYMENT - {timestamp}")

# Read current app.py
with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add deployment timestamp
deployment_line = f"# RAILWAY_DEPLOY: {timestamp}"

# Insert after the docstring
lines = content.split('\n')
for i, line in enumerate(lines):
    if line.strip() == '"""' and i > 2:
        lines.insert(i + 1, deployment_line)
        break

# Write back
with open('app.py', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("✅ Added deployment timestamp to app.py")
print("🔄 Now commit and push to Railway!")
print("📋 Run: git add . && git commit -m 'Force Railway deploy' && git push")
