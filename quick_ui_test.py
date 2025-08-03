#!/usr/bin/env python3
"""
Quick test for the advanced UI with command center
"""

import sys
import os
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from advanced_ui import AdvancedConversationalUI
    
    print("🧪 Testing Advanced UI with Command Center")
    print("=" * 50)
    
    # Create UI instance
    ui = AdvancedConversationalUI()
    print(f"✅ UI created")
    
    # Check command center availability
    command_available = hasattr(ui.response_generator, 'command_registry') and ui.response_generator.command_registry is not None
    print(f"🔧 Command Center: {'✅ Available' if command_available else '❌ Not Available'}")
    
    if command_available:
        commands = ui.response_generator.command_registry.get_all_commands()
        print(f"📋 Available commands: {list(commands.keys())}")
    
    # Start a conversation
    conversation_id = ui.start_conversation("test_user")
    print(f"✅ Started conversation: {conversation_id}")
    
    # Test a command
    async def test_command():
        response = await ui.process_message(conversation_id, "/status")
        print(f"📄 Command response (first 150 chars): {response[:150]}...")
        
        # Check if it's a real command response or error message
        if "Command Executed Successfully" in response or "Available Commands" in response:
            print("✅ Command executed successfully!")
        elif "Command Center Unavailable" in response:
            print("❌ Command center still not available in UI")
        else:
            print("❓ Unexpected response type")
    
    # Run the test
    asyncio.run(test_command())
    
    print("🎯 Test complete!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
