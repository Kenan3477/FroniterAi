import { io, Socket } from 'socket.io-client';

export interface AgentSocketEvents {
  // Agent authentication
  'authenticate-agent': (data: { agentId: string; token?: string }) => void;
  'authenticated': (data: { agent: any }) => void;
  'auth-error': (data: { message: string }) => void;

  // Status updates
  'update-status': (data: { status: string; campaignId?: string }) => void;
  'status-updated': (data: { agent: any }) => void;
  'agent-status-updated': (data: { agentId: string; status: string; campaignId?: string; timestamp: Date }) => void;

  // Campaign management
  'join-campaign': (data: { campaignId: string }) => void;
  'leave-campaign': (data: { campaignId: string }) => void;
  'joined-campaign': (data: { campaignId: string }) => void;
  'left-campaign': (data: { campaignId: string }) => void;

  // Outbound call events
  'call-event': (data: { 
    type: 'DIAL' | 'ANSWER' | 'HANGUP' | 'TRANSFER' | 'HOLD' | 'UNHOLD';
    callId?: string;
    phoneNumber?: string;
    campaignId?: string;
    metadata?: any;
  }) => void;
  'call-started': (data: { call: any; agentId: string; leg: any }) => void;
  'call-answered': (data: { callId: string; agentId: string; timestamp: Date }) => void;
  'call-ended': (data: { callId: string; agentId: string; reason: string; timestamp: Date }) => void;

  // Inbound call events
  'inbound-call-ringing': (data: { 
    call: any; 
    callerInfo?: any; 
    routingOptions: any;
    priority: 'high' | 'medium' | 'low';
    isCallback: boolean;
  }) => void;
  'inbound-call-answered': (data: { callId: string; agentId: string }) => void;
  'inbound-call-transferred': (data: { callId: string; transferType: string; targetId: string }) => void;
  'inbound-call-ended': (data: { callId: string; endReason: string; duration?: number }) => void;

  // Dispositions
  'submit-disposition': (data: {
    callId: string;
    categoryId: string;
    subcategoryId?: string;
    notes?: string;
    isCallback?: boolean;
    callbackDateTime?: string;
  }) => void;
  'disposition-submitted': (data: { disposition: any }) => void;
  'disposition-added': (data: { callId: string; agentId: string; disposition: any; timestamp: Date }) => void;

  // Record management
  'request-next-record': (data: { campaignId: string }) => void;
  'next-record': (data: { record: any }) => void;
  'no-records': (data: { message: string }) => void;

  // General
  'heartbeat': () => void;
  'heartbeat-ack': (data: { timestamp: Date }) => void;
  'error': (data: { message: string }) => void;
}

export class AgentSocketService {
  private socket: Socket | null = null;
  private agentId: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupSocket();
  }

  private setupSocket() {
    // Connect to the dialler namespace
    this.socket = io('/dialler', {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('Connected to dialler socket');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      
      // Re-authenticate if we have an agent ID
      if (this.agentId) {
        this.authenticateAgent(this.agentId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from dialler socket:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection-failed');
      }
    });

    // Handle authentication responses
    this.socket.on('authenticated', (data) => {
      console.log('Agent authenticated:', data.agent);
      this.emit('authenticated', data);
    });

    this.socket.on('auth-error', (data) => {
      console.error('Authentication error:', data.message);
      this.emit('auth-error', data);
    });

    // Handle status updates
    this.socket.on('status-updated', (data) => {
      this.emit('status-updated', data);
    });

    this.socket.on('agent-status-updated', (data) => {
      this.emit('agent-status-updated', data);
    });

    // Handle call events
    this.socket.on('call-started', (data) => {
      this.emit('call-started', data);
    });

    this.socket.on('call-answered', (data) => {
      this.emit('call-answered', data);
    });

    this.socket.on('call-ended', (data) => {
      this.emit('call-ended', data);
    });

    // Handle inbound call events
    this.socket.on('inbound-call-ringing', (data) => {
      console.log('Inbound call ringing:', data);
      this.emit('inbound-call-ringing', data);
    });

    this.socket.on('inbound-call-answered', (data) => {
      console.log('Inbound call answered:', data);
      this.emit('inbound-call-answered', data);
    });

    this.socket.on('inbound-call-transferred', (data) => {
      console.log('Inbound call transferred:', data);
      this.emit('inbound-call-transferred', data);
    });

    this.socket.on('inbound-call-ended', (data) => {
      console.log('Inbound call ended:', data);
      this.emit('inbound-call-ended', data);
    });

    // Handle disposition events
    this.socket.on('disposition-submitted', (data) => {
      this.emit('disposition-submitted', data);
    });

    this.socket.on('disposition-added', (data) => {
      this.emit('disposition-added', data);
    });

    // Handle record requests
    this.socket.on('next-record', (data) => {
      this.emit('next-record', data);
    });

    this.socket.on('no-records', (data) => {
      this.emit('no-records', data);
    });

    // Handle campaign events
    this.socket.on('joined-campaign', (data) => {
      this.emit('joined-campaign', data);
    });

    this.socket.on('left-campaign', (data) => {
      this.emit('left-campaign', data);
    });

    // Handle heartbeat
    this.socket.on('heartbeat-ack', (data) => {
      // console.log('Heartbeat acknowledged:', data);
    });

    // Handle errors
    this.socket.on('error', (data) => {
      console.error('Socket error:', data.message);
      this.emit('error', data);
    });
  }

  connect(agentId: string) {
    this.agentId = agentId;
    if (this.socket) {
      this.socket.connect();
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
    }
    this.agentId = null;
  }

  authenticateAgent(agentId: string, token?: string) {
    if (this.socket?.connected) {
      this.socket.emit('authenticate-agent', { agentId, token });
    }
  }

  updateStatus(status: string, campaignId?: string) {
    if (this.socket?.connected) {
      this.socket.emit('update-status', { status, campaignId });
    }
  }

  joinCampaign(campaignId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-campaign', { campaignId });
    }
  }

  leaveCampaign(campaignId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-campaign', { campaignId });
    }
  }

  sendCallEvent(type: 'DIAL' | 'ANSWER' | 'HANGUP' | 'TRANSFER' | 'HOLD' | 'UNHOLD', data?: any) {
    if (this.socket?.connected) {
      this.socket.emit('call-event', { type, ...data });
    }
  }

  submitDisposition(dispositionData: {
    callId: string;
    categoryId: string;
    subcategoryId?: string;
    notes?: string;
    isCallback?: boolean;
    callbackDateTime?: string;
  }) {
    if (this.socket?.connected) {
      this.socket.emit('submit-disposition', dispositionData);
    }
  }

  requestNextRecord(campaignId: string) {
    if (this.socket?.connected) {
      this.socket.emit('request-next-record', { campaignId });
    }
  }

  // Inbound call management
  answerInboundCall(callId: string) {
    if (this.socket?.connected && this.agentId) {
      this.socket.emit('answer-inbound-call', { 
        callId, 
        agentId: this.agentId 
      });
    }
  }

  declineInboundCall(callId: string) {
    if (this.socket?.connected && this.agentId) {
      this.socket.emit('decline-inbound-call', { 
        callId, 
        agentId: this.agentId 
      });
    }
  }

  transferInboundCall(callId: string, transferType: 'queue' | 'agent', targetId: string) {
    if (this.socket?.connected && this.agentId) {
      this.socket.emit('transfer-inbound-call', { 
        callId, 
        transferType,
        targetId,
        agentId: this.agentId 
      });
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Event emitter functionality
  private events: { [event: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.events[event]) return;
    
    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    } else {
      delete this.events[event];
    }
  }

  private emit(event: string, data?: any) {
    if (this.events[event]) {
      this.events[event].forEach(callback => callback(data));
    }
  }

  // Getters
  get connected() {
    return this.isConnected;
  }

  get currentAgentId() {
    return this.agentId;
  }
}

// Singleton instance
export const agentSocket = new AgentSocketService();