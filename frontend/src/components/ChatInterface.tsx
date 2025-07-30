import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { trackEvent } from '../store/analyticsSlice';
import { 
  PaperAirplaneIcon, 
  TrashIcon, 
  ClipboardDocumentIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  MicrophoneIcon,
  StopIcon,
  ChevronDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: number;
  suggestions?: string[];
  toolCalls?: any[];
}

interface ConversationSettings {
  autoSuggestions: boolean;
  soundEnabled: boolean;
  voiceInput: boolean;
  responseStyle: 'concise' | 'detailed' | 'creative';
  streamingEnabled: boolean;
}

interface ChatInterfaceProps {
  messages: Message[];
  isStreaming: boolean;
  isConnected: boolean;
  onSendMessage: (message: string) => void;
  onClearChat: () => void;
  settings: ConversationSettings;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isStreaming,
  isConnected,
  onSendMessage,
  onClearChat,
  settings,
}) => {
  const dispatch = useDispatch();
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Predefined suggestions
  const quickSuggestions = [
    "Show me the latest business metrics",
    "How can I improve customer retention?",
    "Generate a marketing strategy report",
    "What are the current project statuses?",
    "Help me analyze the sales data",
    "Create a performance dashboard",
  ];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Voice recognition setup
  useEffect(() => {
    if ('webkitSpeechRecognition' in window && settings.voiceInput) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [settings.voiceInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !isConnected || isStreaming) return;

    onSendMessage(inputValue.trim());
    setInputValue('');
    setShowSuggestions(false);

    dispatch(trackEvent({
      event: 'chat_message_sent',
      properties: { 
        messageLength: inputValue.length,
        hasVoiceInput: isListening 
      }
    }));
  };

  const handleVoiceInput = () => {
    if (!settings.voiceInput || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    dispatch(trackEvent({
      event: 'message_copied',
      properties: { messageLength: text.length }
    }));
  };

  const speakMessage = (text: string) => {
    if (!settings.soundEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);

    dispatch(trackEvent({
      event: 'message_spoken',
      properties: { messageLength: text.length }
    }));
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900 dark:text-white">
            Frontier Assistant
          </span>
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
        </div>
        
        <div className="flex items-center space-x-2">
          {settings.soundEnabled && (
            <button
              onClick={() => window.speechSynthesis.cancel()}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Stop speaking"
            >
              <SpeakerXMarkIcon className="h-4 w-4" />
            </button>
          )}
          
          <button
            onClick={onClearChat}
            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            title="Clear chat"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Welcome to Frontier!</p>
            <p className="text-sm">Ask me anything about your business, analytics, or how I can help you.</p>
            
            {settings.autoSuggestions && (
              <div className="mt-6">
                <p className="text-xs text-gray-400 mb-3">Try these suggestions:</p>
                <div className="space-y-2">
                  {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.role === 'system'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs">
                  <div className="font-medium">Tools used:</div>
                  {message.toolCalls.map((tool, index) => (
                    <div key={index} className="mt-1">
                      • {tool.name}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs opacity-70">
                  {formatTimestamp(message.timestamp)}
                </span>
                
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                    title="Copy message"
                  >
                    <ClipboardDocumentIcon className="h-3 w-3" />
                  </button>
                  
                  {settings.soundEnabled && message.role === 'assistant' && (
                    <button
                      onClick={() => speakMessage(message.content)}
                      className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                      title="Speak message"
                    >
                      <SpeakerWaveIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-xs opacity-70">Suggestions:</div>
                  {message.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left px-2 py-1 text-xs bg-black bg-opacity-10 rounded hover:bg-black hover:bg-opacity-20 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        {/* Quick suggestions toggle */}
        {settings.autoSuggestions && quickSuggestions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowSuggestions(!showSuggestions)}
              className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <span>Quick suggestions</span>
              <ChevronDownIcon className={`h-3 w-3 transition-transform ${
                showSuggestions ? 'rotate-180' : ''
              }`} />
            </button>
            
            {showSuggestions && (
              <div className="mt-2 grid grid-cols-1 gap-1">
                {quickSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-left px-2 py-1 text-xs bg-gray-50 dark:bg-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end space-x-2">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                isConnected 
                  ? "Ask me anything about your business..." 
                  : "Connecting to Frontier..."
              }
              disabled={!isConnected || isStreaming}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              rows={1}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {settings.voiceInput && 'webkitSpeechRecognition' in window && (
              <button
                type="button"
                onClick={handleVoiceInput}
                disabled={!isConnected || isStreaming}
                className={`p-2 rounded-md transition-colors ${
                  isListening
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={isListening ? 'Stop recording' : 'Start voice input'}
              >
                {isListening ? (
                  <StopIcon className="h-4 w-4" />
                ) : (
                  <MicrophoneIcon className="h-4 w-4" />
                )}
              </button>
            )}
            
            <button
              type="submit"
              disabled={!inputValue.trim() || !isConnected || isStreaming}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </form>
        
        <div className="mt-2 text-xs text-gray-400 text-center">
          {isConnected ? (
            <>Press Enter to send, Shift+Enter for new line</>
          ) : (
            <>Connecting to Frontier services...</>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
