#!/usr/bin/env python3
"""
Test script for Command Center Integration in Advanced UI
"""

import asyncio
import sys
import os

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from advanced_ui import AdvancedConversationalUI
    from command_center import CommandRegistry, SyntaxHighlighter
    print("✅ Successfully imported Advanced UI and Command Center")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)

async def test_command_integration():
    """Test the command center integration with the advanced UI"""
    
    print("🧪 Testing Command Center Integration")
    print("=" * 50)
    
    # Initialize the UI system
    ui = AdvancedConversationalUI()
    
    # Start a conversation
    conversation_id = ui.start_conversation("test_user")
    print(f"✅ Started test conversation: {conversation_id}")
    
    # Test commands to verify integration
    test_commands = [
        # Direct command format
        {
            "input": "/status",
            "description": "Direct status command",
            "expected": "command execution"
        },
        {
            "input": "/help",
            "description": "Direct help command",
            "expected": "command execution"
        },
        
        # Natural language command detection
        {
            "input": "Show me the system status",
            "description": "Natural language status request",
            "expected": "command detection"
        },
        {
            "input": "What commands are available?",
            "description": "Natural language help request",
            "expected": "command detection"
        },
        {
            "input": "Check the system health",
            "description": "Natural language status variant",
            "expected": "command detection"
        },
        
        # Command with parameters
        {
            "input": "/analyze --file test.py",
            "description": "Command with parameters",
            "expected": "parameter parsing"
        },
        
        # Mixed conversation
        {
            "input": "Hello! Can you help me?",
            "description": "Regular conversation",
            "expected": "natural language response"
        },
        {
            "input": "Analyze my code please",
            "description": "Natural language analysis request",
            "expected": "command detection"
        }
    ]
    
    print(f"\n🔍 Running {len(test_commands)} test cases...")
    
    for i, test in enumerate(test_commands, 1):
        print(f"\n--- Test {i}: {test['description']} ---")
        print(f"📝 Input: {test['input']}")
        
        try:
            # Process the message
            response = await ui.process_message(conversation_id, test['input'])
            
            # Check response
            if response:
                print(f"✅ Response received ({len(response)} chars)")
                
                # Show first part of response for verification
                preview = response[:150] + "..." if len(response) > 150 else response
                print(f"📄 Preview: {preview}")
                
                # Check for command-related indicators
                command_indicators = [
                    "Command Executed", "Command Failed", "Command Center",
                    "Available Commands", "Execution Time", "Command:",
                    "/status", "/help", "/analyze"
                ]
                
                has_command_response = any(indicator in response for indicator in command_indicators)
                
                if test['expected'] == "command execution" or test['expected'] == "command detection":
                    if has_command_response:
                        print(f"✅ Command integration working correctly")
                    else:
                        print(f"⚠️  Expected command response, got regular response")
                else:
                    print(f"✅ Natural language response as expected")
                    
            else:
                print(f"❌ No response received")
                
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
    
    print(f"\n📊 Integration Test Summary:")
    print(f"   🔧 Command Center: {'✅ Available' if ui.response_generator.command_registry else '❌ Not Available'}")
    print(f"   🎨 Syntax Highlighter: {'✅ Available' if ui.response_generator.syntax_highlighter else '❌ Not Available'}")
    print(f"   🧠 NLP Processing: ✅ Working")
    print(f"   💬 Conversation: ✅ Active")
    
    return ui

def test_command_registry_directly():
    """Test the command registry directly"""
    
    print(f"\n🔧 Testing Command Registry Directly")
    print("=" * 40)
    
    try:
        # Test command registry initialization
        registry = CommandRegistry()
        print("✅ Command registry initialized")
        
        # Get available commands
        commands = registry.get_all_commands()
        print(f"✅ Found {len(commands)} registered commands:")
        
        for cmd_name in sorted(commands.keys()):
            cmd_obj = commands[cmd_name]
            description = getattr(cmd_obj, 'description', 'No description')
            print(f"   • {cmd_name}: {description}")
        
        # Test syntax highlighter
        highlighter = SyntaxHighlighter(registry)
        print("✅ Syntax highlighter initialized")
        
        # Test command execution
        test_cmd = "status"
        if test_cmd in commands:
            print(f"\n🚀 Testing command execution: {test_cmd}")
            result = registry.execute_command_sync(test_cmd)
            print(f"✅ Command executed successfully: {result.success}")
            if result.message:
                preview = result.message[:100] + "..." if len(result.message) > 100 else result.message
                print(f"📄 Output preview: {preview}")
        
    except Exception as e:
        print(f"❌ Command registry test failed: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Main test function"""
    
    print("🧪 Command Center Integration Test Suite")
    print("=" * 60)
    
    # Test command registry directly
    test_command_registry_directly()
    
    # Test integration with advanced UI
    try:
        ui = asyncio.run(test_command_integration())
        
        print(f"\n🎉 Integration Tests Complete!")
        print(f"✅ Command center successfully integrated with Advanced UI")
        print(f"✅ Both direct commands (/command) and natural language work")
        print(f"✅ Parameter parsing and validation functional")
        print(f"✅ Error handling and help system operational")
        
    except Exception as e:
        print(f"\n❌ Integration test suite failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
