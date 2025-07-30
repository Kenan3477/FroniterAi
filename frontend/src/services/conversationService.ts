// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Performance optimized by Autonomous Evolution System
// Analyzed by Evolution System at 2025-07-28 20:47:31.784910
// Analyzed by Evolution System at 2025-07-28 20:29:58.590302
// Analyzed by Evolution System at 2025-07-28 20:18:26.258503
// Analyzed by Evolution System at 2025-07-28 20:10:54.481999
// Performance optimized by Autonomous Evolution System
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
}

export interface ConversationContext {
  userId: string;
  conversationId: string;
  history: ConversationMessage[];
  activeFeatures: string[];
  userIntent?: string;
  lastToolUsed?: string;
}

export interface StreamingResponse {
  content: string;
  finished: boolean;
  toolCalls?: any[];
  suggestions?: string[];
}

class ConversationService {
  private socket: Socket | null = null;
  private baseURL: string;
  private context: ConversationContext | null = null;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  }

  // Initialize WebSocket connection
  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseURL, {
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on('connect', () => {
//         console.log('Connected to conversation service');
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
//         console.log('Disconnected from conversation service');
      });
    });
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Start a new conversation
  async startConversation(userId: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/conversation/start`, {
        userId,
      });

      const conversationId = response.data.data.conversationId;
      
      this.context = {
        userId,
        conversationId,
        history: [],
        activeFeatures: [],
      };

      return conversationId;
    } catch (error) {
      console.error('Failed to start conversation:', error);
      throw error;
    }
  }

  // Send message and get streaming response
  sendMessage(
    message: string,
    onChunk: (chunk: StreamingResponse) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): void {
    if (!this.socket || !this.context) {
      onError(new Error('Not connected to conversation service'));
      return;
    }

    // Update context with user message
    this.context.history.push({
      role: 'user',
      content: message,
    });

    // Send message to server
    this.socket.emit('chat_message', {
      conversationId: this.context.conversationId,
      message,
      context: this.context,
    });

    // Listen for streaming response
    const handleStreamChunk = (data: StreamingResponse) => {
      onChunk(data);
    };

    const handleStreamComplete = (data: { finalMessage: ConversationMessage; context: ConversationContext }) => {
      // Update context
      this.context = data.context;
      
      // Clean up listeners
      this.socket?.off('stream_chunk', handleStreamChunk);
      this.socket?.off('stream_complete', handleStreamComplete);
      this.socket?.off('stream_error', handleStreamError);
      
      onComplete();
    };

    const handleStreamError = (error: { message: string }) => {
      // Clean up listeners
      this.socket?.off('stream_chunk', handleStreamChunk);
      this.socket?.off('stream_complete', handleStreamComplete);
      this.socket?.off('stream_error', handleStreamError);
      
      onError(new Error(error.message));
    };

    // Set up listeners
    this.socket.on('stream_chunk', handleStreamChunk);
    this.socket.on('stream_complete', handleStreamComplete);
    this.socket.on('stream_error', handleStreamError);
  }

  // Get conversation history
  async getConversationHistory(conversationId: string): Promise<ConversationMessage[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/conversation/${conversationId}/history`);
      return response.data.data.messages;
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      throw error;
    }
  }

  // Get tool suggestions based on current context
  async getToolSuggestions(context: ConversationContext): Promise<any[]> {
    try {
      const response = await axios.post(`${this.baseURL}/api/v1/conversation/suggestions`, {
        context,
      });
      return response.data.data.suggestions;
    } catch (error) {
      console.error('Failed to get tool suggestions:', error);
      throw error;
    }
  }

  // Call a specific tool
  async callTool(
    toolName: string,
    parameters: any,
    onProgress?: (progress: any) => void
  ): Promise<any> {
    try {
      if (!this.context) {
        throw new Error('No active conversation context');
      }

      // For tools that support streaming/progress updates
      if (onProgress && this.socket) {
        return new Promise((resolve, reject) => {
          this.socket!.emit('tool_call', {
            conversationId: this.context!.conversationId,
            toolName,
            parameters,
          });

          const handleProgress = (data: any) => {
            onProgress(data);
          };

          const handleComplete = (data: any) => {
            this.socket?.off('tool_progress', handleProgress);
            this.socket?.off('tool_complete', handleComplete);
            this.socket?.off('tool_error', handleError);
            resolve(data.result);
          };

          const handleError = (error: { message: string }) => {
            this.socket?.off('tool_progress', handleProgress);
            this.socket?.off('tool_complete', handleComplete);
            this.socket?.off('tool_error', handleError);
            reject(new Error(error.message));
          };

          this.socket!.on('tool_progress', handleProgress);
          this.socket!.on('tool_complete', handleComplete);
          this.socket!.on('tool_error', handleError);
        });
      } else {
        // Direct API call for non-streaming tools
        const response = await axios.post(`${this.baseURL}/api/v1/tools/${toolName}`, {
          conversationId: this.context.conversationId,
          parameters,
        });
        return response.data.data;
      }
    } catch (error) {
      console.error(`Failed to call tool ${toolName}:`, error);
      throw error;
    }
  }

  // Update context
  updateContext(updates: Partial<ConversationContext>): void {
    if (this.context) {
      this.context = { ...this.context, ...updates };
    }
  }

  // Get current context
  getContext(): ConversationContext | null {
    return this.context;
  }

  // Submit feedback for conversation quality
  async submitFeedback(
    conversationId: string,
    rating: number,
    feedback?: string
  ): Promise<void> {
    try {
      await axios.post(`${this.baseURL}/api/v1/conversation/${conversationId}/feedback`, {
        rating,
        feedback,
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  // Get conversation analytics
  async getAnalytics(timeframe: string = '7d'): Promise<any> {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/conversation/analytics`, {
        params: { timeframe },
      });
      return response.data.data;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw error;
    }
  }

  // Export conversation
  async exportConversation(conversationId: string, format: 'json' | 'txt' | 'md'): Promise<Blob> {
    try {
      const response = await axios.get(
        `${this.baseURL}/api/v1/conversation/${conversationId}/export`,
        {
          params: { format },
          responseType: 'blob',
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to export conversation:', error);
      throw error;
    }
  }

  // Search conversation history
  async searchConversations(query: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/api/v1/conversation/search`, {
        params: { query, limit },
      });
      return response.data.data.conversations;
    } catch (error) {
      console.error('Failed to search conversations:', error);
      throw error;
    }
  }
}

export const conversationService = new ConversationService();