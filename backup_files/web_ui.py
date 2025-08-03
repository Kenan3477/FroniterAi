#!/usr/bin/env python3
"""
Web Interface for Advanced Conversational UI
Simple Flask web application demonstrating the ChatGPT-like interface
"""

from flask import Flask, render_template, request, jsonify, session
import asyncio
import json
import os
from datetime import datetime
from advanced_ui import AdvancedConversationalUI

app = Flask(__name__)
app.secret_key = os.urandom(24)

# Initialize the conversational UI
ui_system = AdvancedConversationalUI()

@app.route('/')
def index():
    """Main chat interface"""
    return render_template('chat.html')

@app.route('/start_conversation', methods=['POST'])
def start_conversation():
    """Start a new conversation session"""
    try:
        user_id = request.json.get('user_id', 'web_user')
        conversation_id = ui_system.start_conversation(user_id)
        session['conversation_id'] = conversation_id
        
        return jsonify({
            'success': True,
            'conversation_id': conversation_id,
            'message': 'Conversation started successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/send_message', methods=['POST'])
def send_message():
    """Send a message and get response"""
    try:
        data = request.json
        message = data.get('message', '')
        conversation_id = session.get('conversation_id')
        
        if not conversation_id:
            return jsonify({
                'success': False,
                'error': 'No active conversation. Please start a new conversation.'
            }), 400
        
        if not message.strip():
            return jsonify({
                'success': False,
                'error': 'Message cannot be empty'
            }), 400
        
        # Process message asynchronously
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(
            ui_system.process_message(conversation_id, message)
        )
        loop.close()
        
        return jsonify({
            'success': True,
            'response': response,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/conversation_history')
def conversation_history():
    """Get conversation history"""
    try:
        conversation_id = session.get('conversation_id')
        if not conversation_id:
            return jsonify({
                'success': False,
                'error': 'No active conversation'
            }), 400
        
        history = ui_system.get_conversation_history(conversation_id, limit=50)
        
        return jsonify({
            'success': True,
            'history': history
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/export_conversation')
def export_conversation():
    """Export conversation data"""
    try:
        conversation_id = session.get('conversation_id')
        format_type = request.args.get('format', 'json')
        
        if not conversation_id:
            return jsonify({
                'success': False,
                'error': 'No active conversation'
            }), 400
        
        export_data = ui_system.export_conversation(conversation_id, format_type)
        
        return jsonify({
            'success': True,
            'data': export_data,
            'format': format_type
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    
    # Create the chat template
    chat_template = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🤖 FrontierAI Advanced Assistant</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        .chat-container {
            height: calc(100vh - 200px);
            overflow-y: auto;
        }
        .message {
            animation: fadeInUp 0.3s ease-out;
        }
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .typing-indicator {
            display: none;
        }
        .typing-indicator.show {
            display: flex;
        }
        .typing-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #6b7280;
            animation: typing 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(1) { animation-delay: -0.32s; }
        .typing-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes typing {
            0%, 80%, 100% { 
                transform: scale(0);
            } 40% { 
                transform: scale(1);
            }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="max-w-4xl mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span class="text-white text-xl">🤖</span>
                    </div>
                    <div>
                        <h1 class="text-xl font-bold text-gray-900">FrontierAI Assistant</h1>
                        <p class="text-sm text-gray-500">Advanced AI for code analysis, market intelligence & evolution tracking</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button id="exportBtn" class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                        📊 Export
                    </button>
                    <button id="newChatBtn" class="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                        🆕 New Chat
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Chat Interface -->
    <main class="max-w-4xl mx-auto px-4 py-6">
        <!-- Chat Messages Container -->
        <div id="chatContainer" class="chat-container bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div id="messagesContainer">
                <!-- Messages will be added here -->
            </div>
            
            <!-- Typing Indicator -->
            <div id="typingIndicator" class="typing-indicator items-center space-x-2 p-4">
                <div class="flex space-x-1">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <span class="text-sm text-gray-500 ml-2">Assistant is typing...</span>
            </div>
        </div>

        <!-- Input Area -->
        <div class="bg-white rounded-xl shadow-sm border p-4">
            <div class="flex space-x-4">
                <div class="flex-1">
                    <textarea 
                        id="messageInput" 
                        placeholder="Type your message here... (Try asking about code analysis, market insights, or evolution tracking)"
                        class="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                    ></textarea>
                </div>
                <div class="flex flex-col justify-end">
                    <button 
                        id="sendBtn" 
                        class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Send
                    </button>
                </div>
            </div>
            <div class="mt-2 text-sm text-gray-500">
                💡 <strong>Try asking:</strong> "Analyze my code quality" • "Show market opportunities in AI" • "Create evolution visualization" • "Explain how the system works"
            </div>
        </div>
    </main>

    <script>
        class ChatInterface {
            constructor() {
                this.conversationId = null;
                this.isTyping = false;
                this.initializeElements();
                this.setupEventListeners();
                this.startConversation();
            }

            initializeElements() {
                this.messagesContainer = document.getElementById('messagesContainer');
                this.messageInput = document.getElementById('messageInput');
                this.sendBtn = document.getElementById('sendBtn');
                this.exportBtn = document.getElementById('exportBtn');
                this.newChatBtn = document.getElementById('newChatBtn');
                this.typingIndicator = document.getElementById('typingIndicator');
                this.chatContainer = document.getElementById('chatContainer');
            }

            setupEventListeners() {
                this.sendBtn.addEventListener('click', () => this.sendMessage());
                this.messageInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        this.sendMessage();
                    }
                });
                this.exportBtn.addEventListener('click', () => this.exportConversation());
                this.newChatBtn.addEventListener('click', () => this.startNewConversation());
            }

            async startConversation() {
                try {
                    const response = await fetch('/start_conversation', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user_id: 'web_user_' + Date.now()
                        })
                    });

                    const data = await response.json();
                    if (data.success) {
                        this.conversationId = data.conversation_id;
                        this.loadConversationHistory();
                    } else {
                        this.showError('Failed to start conversation: ' + data.error);
                    }
                } catch (error) {
                    this.showError('Error starting conversation: ' + error.message);
                }
            }

            async loadConversationHistory() {
                try {
                    const response = await fetch('/conversation_history');
                    const data = await response.json();
                    
                    if (data.success) {
                        this.messagesContainer.innerHTML = '';
                        data.history.forEach(msg => {
                            if (msg.role !== 'system') {
                                this.addMessage(msg.content, msg.role, false);
                            }
                        });
                        this.scrollToBottom();
                    }
                } catch (error) {
                    console.error('Error loading history:', error);
                }
            }

            async sendMessage() {
                const message = this.messageInput.value.trim();
                if (!message || this.isTyping) return;

                this.addMessage(message, 'user');
                this.messageInput.value = '';
                this.showTyping(true);
                this.setInputEnabled(false);

                try {
                    const response = await fetch('/send_message', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: message
                        })
                    });

                    const data = await response.json();
                    this.showTyping(false);
                    this.setInputEnabled(true);

                    if (data.success) {
                        this.addMessage(data.response, 'assistant');
                    } else {
                        this.showError('Error: ' + data.error);
                    }
                } catch (error) {
                    this.showTyping(false);
                    this.setInputEnabled(true);
                    this.showError('Network error: ' + error.message);
                }
            }

            addMessage(content, role, animate = true) {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message mb-4 ${animate ? '' : 'opacity-100'}`;

                const isUser = role === 'user';
                const alignClass = isUser ? 'justify-end' : 'justify-start';
                const bgClass = isUser ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900';
                const avatarEmoji = isUser ? '👤' : '🤖';

                messageDiv.innerHTML = `
                    <div class="flex ${alignClass}">
                        <div class="flex items-start space-x-3 max-w-3xl">
                            ${!isUser ? `<div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">${avatarEmoji}</div>` : ''}
                            <div class="${bgClass} rounded-xl px-4 py-3 ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}">
                                <div class="prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}">
                                    ${isUser ? this.escapeHtml(content) : marked.parse(content)}
                                </div>
                            </div>
                            ${isUser ? `<div class="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">${avatarEmoji}</div>` : ''}
                        </div>
                    </div>
                `;

                this.messagesContainer.appendChild(messageDiv);
                this.scrollToBottom();
            }

            showTyping(show) {
                this.isTyping = show;
                this.typingIndicator.classList.toggle('show', show);
                if (show) {
                    this.scrollToBottom();
                }
            }

            setInputEnabled(enabled) {
                this.messageInput.disabled = !enabled;
                this.sendBtn.disabled = !enabled;
            }

            scrollToBottom() {
                setTimeout(() => {
                    this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
                }, 100);
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            showError(message) {
                this.addMessage(`❌ ${message}`, 'assistant');
            }

            async exportConversation() {
                try {
                    const response = await fetch('/export_conversation?format=json');
                    const data = await response.json();
                    
                    if (data.success) {
                        const blob = new Blob([data.data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `conversation_${new Date().toISOString().slice(0, 10)}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    } else {
                        this.showError('Export failed: ' + data.error);
                    }
                } catch (error) {
                    this.showError('Export error: ' + error.message);
                }
            }

            startNewConversation() {
                if (confirm('Start a new conversation? This will clear the current chat.')) {
                    this.messagesContainer.innerHTML = '';
                    this.startConversation();
                }
            }
        }

        // Initialize the chat interface when page loads
        document.addEventListener('DOMContentLoaded', () => {
            new ChatInterface();
        });
    </script>
</body>
</html>'''
    
    # Write the template file
    with open('templates/chat.html', 'w', encoding='utf-8') as f:
        f.write(chat_template)
    
    print("🌐 Starting web interface for Advanced Conversational UI...")
    print("📱 Open http://localhost:5000 in your browser to chat with the AI assistant")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
