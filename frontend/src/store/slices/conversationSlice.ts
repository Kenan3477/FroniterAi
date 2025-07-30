// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Analyzed by Evolution System at 2025-07-28 21:04:05.237601
// Analyzed by Evolution System at 2025-07-28 20:48:31.943063
// Analyzed by Evolution System at 2025-07-28 20:35:59.729970
// Analyzed by Evolution System at 2025-07-28 20:29:28.490010
// Analyzed by Evolution System at 2025-07-28 20:06:51.786667
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type: 'text' | 'tool_call' | 'system';
  metadata?: {
    toolName?: string;
    toolResult?: any;
    confidence?: number;
    suggestions?: string[];
    relatedFeatures?: string[];
  };
}

export interface ConversationContext {
  currentTopic?: string;
  activeFeatures: string[];
  userIntent?: string;
  lastToolUsed?: string;
  conversationHistory: string[];
}

export interface ToolSuggestion {
  id: string;
  name: string;
  description: string;
  confidence: number;
  category: string;
}

interface ConversationState {
  messages: Message[];
  isTyping: boolean;
  context: ConversationContext;
  suggestions: ToolSuggestion[];
  streamingMessage: string;
  conversationId: string | null;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

const initialState: ConversationState = {
  messages: [],
  isTyping: false,
  context: {
    activeFeatures: [],
    conversationHistory: [],
  },
  suggestions: [],
  streamingMessage: '',
  conversationId: null,
  error: null,
  connectionStatus: 'disconnected',
};

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Omit<Message, 'id' | 'timestamp'>>) => {
      const message: Message = {
        id: Date.now().toString(),
        timestamp: new Date(),
        ...action.payload,
      };
      state.messages.push(message);
      
      // Update conversation history
      state.context.conversationHistory.push(message.content);
      if (state.context.conversationHistory.length > 50) {
        state.context.conversationHistory = state.context.conversationHistory.slice(-50);
      }
    },
    
    updateStreamingMessage: (state, action: PayloadAction<string>) => {
      state.streamingMessage = action.payload;
    },
    
    finishStreamingMessage: (state) => {
      if (state.streamingMessage) {
        const message: Message = {
          id: Date.now().toString(),
          content: state.streamingMessage,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'text',
        };
        state.messages.push(message);
        state.streamingMessage = '';
      }
      state.isTyping = false;
    },
    
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    
    updateContext: (state, action: PayloadAction<Partial<ConversationContext>>) => {
      state.context = { ...state.context, ...action.payload };
    },
    
    setSuggestions: (state, action: PayloadAction<ToolSuggestion[]>) => {
      state.suggestions = action.payload;
    },
    
    clearSuggestions: (state) => {
      state.suggestions = [];
    },
    
    setConversationId: (state, action: PayloadAction<string>) => {
      state.conversationId = action.payload;
    },
    
    clearConversation: (state) => {
      state.messages = [];
      state.context = {
        activeFeatures: [],
        conversationHistory: [],
      };
      state.suggestions = [];
      state.streamingMessage = '';
      state.error = null;
    },
    
    setConnectionStatus: (state, action: PayloadAction<ConversationState['connectionStatus']>) => {
      state.connectionStatus = action.payload;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isTyping = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    activateFeature: (state, action: PayloadAction<string>) => {
      if (!state.context.activeFeatures.includes(action.payload)) {
        state.context.activeFeatures.push(action.payload);
      }
    },
    
    deactivateFeature: (state, action: PayloadAction<string>) => {
      state.context.activeFeatures = state.context.activeFeatures.filter(
        feature => feature !== action.payload
      );
    },
    
    updateMessageMetadata: (state, action: PayloadAction<{ messageId: string; metadata: any }>) => {
      const message = state.messages.find(m => m.id === action.payload.messageId);
      if (message) {
        message.metadata = { ...message.metadata, ...action.payload.metadata };
      }
    },
  },
});

export const {
  addMessage,
  updateStreamingMessage,
  finishStreamingMessage,
  setTyping,
  updateContext,
  setSuggestions,
  clearSuggestions,
  setConversationId,
  clearConversation,
  setConnectionStatus,
  setError,
  clearError,
  activateFeature,
  deactivateFeature,
  updateMessageMetadata,
} = conversationSlice.actions;

export default conversationSlice.reducer;