#!/usr/bin/env python3
"""
Quick test to check command center availability
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from command_center import CommandRegistry, SyntaxHighlighter
    
    print("🧪 Testing Command Center Directly")
    print("=" * 40)
    
    # Test command registry
    registry = CommandRegistry()
    print(f"✅ Command registry created")
    print(f"📋 Commands: {list(registry.commands.keys())}")
    
    # Test a simple command
    result = registry.execute_command_sync("status")
    print(f"✅ Status command: success={result.success}")
    print(f"📄 Message: {result.message[:100]}...")
    
    # Test syntax highlighter
    highlighter = SyntaxHighlighter(registry)
    highlighted = highlighter.highlight("status --component ui")
    print(f"✅ Syntax highlighting: {len(highlighted)} chars")
    
    print("\n🎯 Command Center is working correctly!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
