#!/usr/bin/env python3
"""
Advanced UI Quick Start Guide
Simple script to get started with the conversational interface
"""

import asyncio
from advanced_ui import AdvancedConversationalUI

def quick_start_demo():
    """Quick demonstration of the conversational UI"""
    print("🚀 FrontierAI Advanced Conversational UI - Quick Start")
    print("=" * 60)
    
    # Initialize the UI
    ui = AdvancedConversationalUI()
    
    # Start a conversation
    conversation_id = ui.start_conversation("quickstart_user")
    print(f"✅ Conversation started: {conversation_id}")
    
    async def chat_session():
        print("\n💬 Interactive Chat Session (type 'quit' to exit)")
        print("🤖 Try asking about: code analysis, market trends, evolution tracking")
        print("-" * 60)
        
        while True:
            user_input = input("\n👤 You: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("🤖 Assistant: Thank you for using FrontierAI! Goodbye! 👋")
                break
            
            if not user_input:
                continue
            
            print("🤖 Assistant: ", end="", flush=True)
            response = await ui.process_message(conversation_id, user_input)
            print(response)
    
    # Run the chat session
    try:
        asyncio.run(chat_session())
    except KeyboardInterrupt:
        print("\n\n🤖 Assistant: Chat session ended. Have a great day! 👋")
    
    # Show conversation summary
    history = ui.get_conversation_history(conversation_id, limit=5)
    print(f"\n📊 Session Summary: {len(history)} messages exchanged")

def programming_example():
    """Example of using the UI programmatically"""
    print("\n🔧 Programming Example")
    print("=" * 40)
    
    ui = AdvancedConversationalUI()
    conversation_id = ui.start_conversation("api_user")
    
    async def example_conversation():
        # Example conversation flow
        messages = [
            "What can you help me with?",
            "I want to analyze my Python code for quality issues",
            "Show me the system status",
            "How do I export conversation data?"
        ]
        
        for message in messages:
            print(f"\n📤 Sending: {message}")
            response = await ui.process_message(conversation_id, message)
            print(f"📥 Response: {response[:100]}{'...' if len(response) > 100 else ''}")
        
        # Export conversation
        export_data = ui.export_conversation(conversation_id, 'json')
        print(f"\n💾 Exported conversation ({len(export_data)} characters)")
    
    asyncio.run(example_conversation())

def web_interface_launcher():
    """Instructions for launching the web interface"""
    print("\n🌐 Web Interface")
    print("=" * 40)
    print("To use the web-based chat interface:")
    print("1. Run: python web_ui.py")
    print("2. Open: http://localhost:5000")
    print("3. Start chatting with the AI assistant!")
    print("\nFeatures:")
    print("• 📱 Responsive design for mobile and desktop")
    print("• 💾 Conversation export functionality")
    print("• 🎨 Rich markdown formatting")
    print("• ⚡ Real-time typing indicators")

def integration_guide():
    """Guide for integrating the UI into existing applications"""
    print("\n🔌 Integration Guide")
    print("=" * 40)
    
    code_example = '''
# Basic Integration Example
from advanced_ui import AdvancedConversationalUI
import asyncio

# Initialize the UI system
ui = AdvancedConversationalUI()

# Start a conversation
conversation_id = ui.start_conversation("your_user_id")

# Process messages
async def handle_user_message(message):
    response = await ui.process_message(conversation_id, message)
    return response

# Get conversation history
history = ui.get_conversation_history(conversation_id)

# Export conversation data
export_data = ui.export_conversation(conversation_id, 'json')
'''
    
    print("📝 Code Example:")
    print(code_example)
    
    print("🎯 Key Classes:")
    print("• AdvancedConversationalUI - Main interface")
    print("• NaturalLanguageProcessor - Intent recognition")
    print("• ContextManager - Conversation memory")
    print("• ResponseGenerator - Intelligent responses")

def main():
    """Main quick start function"""
    print("Welcome to FrontierAI Advanced Conversational UI!")
    print("\nChoose an option:")
    print("1. 💬 Interactive Chat Demo")
    print("2. 🔧 Programming Example")
    print("3. 🌐 Web Interface Instructions")
    print("4. 🔌 Integration Guide")
    print("5. 🚀 All Demos")
    
    try:
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == '1':
            quick_start_demo()
        elif choice == '2':
            programming_example()
        elif choice == '3':
            web_interface_launcher()
        elif choice == '4':
            integration_guide()
        elif choice == '5':
            quick_start_demo()
            programming_example()
            web_interface_launcher()
            integration_guide()
        else:
            print("❌ Invalid choice. Running interactive demo...")
            quick_start_demo()
            
    except KeyboardInterrupt:
        print("\n\n👋 Thanks for trying FrontierAI Advanced UI!")

if __name__ == "__main__":
    main()
