// Real-time Event System Context and Hooks for Frontend
'use client';

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

// Event types from backend
export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string; // ISO string from backend
  organizationId?: string;
  userId?: string;
}

export interface CallEvent extends BaseEvent {
  type: 'call.initiated' | 'call.connected' | 'call.ended' | 'call.failed' | 'call.transferred' | 'call.hold' | 'call.unhold' | 'call.muted' | 'call.unmuted';
  callId: string;
  agentId?: string;
  contactId?: string;
  campaignId?: string;
  sipCallId?: string;
  direction: 'inbound' | 'outbound';
  phoneNumber?: string;
  duration?: number;
  status?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AgentEvent extends BaseEvent {
  type: 'agent.login' | 'agent.logout' | 'agent.available' | 'agent.unavailable' | 'agent.busy' | 'agent.break' | 'agent.campaign.joined' | 'agent.campaign.left' | 'agent.status.changed';
  agentId: string;
  agentName?: string;
  status?: string;
  campaignId?: string;
  campaignName?: string;
  previousStatus?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface CampaignEvent extends BaseEvent {
  type: 'campaign.created' | 'campaign.started' | 'campaign.paused' | 'campaign.stopped' | 'campaign.completed' | 'campaign.updated' | 'campaign.dial.speed.changed' | 'campaign.dial.method.changed';
  campaignId: string;
  campaignName?: string;
  status?: string;
  dialMethod?: string;
  dialSpeed?: number;
  agentCount?: number;
  priority?: number;
  previousState?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DialQueueEvent extends BaseEvent {
  type: 'queue.contact.added' | 'queue.contact.removed' | 'queue.contact.dialing' | 'queue.contact.completed' | 'queue.stats.updated' | 'queue.overflow' | 'queue.underflow';
  campaignId: string;
  contactId?: string;
  queueSize?: number;
  position?: number;
  estimatedWaitTime?: number;
  stats?: {
    totalContacts: number;
    dialedContacts: number;
    pendingContacts: number;
    completedContacts: number;
  };
  metadata?: Record<string, any>;
}

export interface SystemEvent extends BaseEvent {
  type: 'system.alert' | 'system.error' | 'system.warning' | 'system.maintenance' | 'system.performance' | 'system.integration.status';
  level: 'info' | 'warning' | 'error' | 'critical';
  component?: string;
  message: string;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface KPIEvent extends BaseEvent {
  type: 'kpi.updated' | 'kpi.threshold.exceeded' | 'kpi.goal.reached';
  metric: string;
  value: number;
  previousValue?: number;
  threshold?: number;
  goal?: number;
  campaignId?: string;
  agentId?: string;
  timeframe?: string;
  metadata?: Record<string, any>;
}

export type Event = CallEvent | AgentEvent | CampaignEvent | DialQueueEvent | SystemEvent | KPIEvent;

// Connection status enum
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  AUTHENTICATED = 'authenticated',
  ERROR = 'error'
}

// Socket session interface
export interface SocketSession {
  userId?: string;
  agentId?: string;
  organizationId?: string;
  roles?: string[];
  subscriptionId?: string;
}

// Context interface
interface EventSystemContextType {
  socket: Socket | null;
  connectionStatus: ConnectionStatus;
  session: SocketSession | null;
  events: Event[];
  connect: (token: string) => void;
  disconnect: () => void;
  subscribeToEvents: (eventTypes: string[], filters?: Record<string, any>) => void;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
  clearEvents: () => void;
  emitEvent: (eventName: string, data: any) => void;
}

// Create context
const EventSystemContext = createContext<EventSystemContextType | null>(null);

// Provider props
interface EventSystemProviderProps {
  children: ReactNode;
  serverUrl?: string;
  maxEvents?: number;
}

// Provider component
export const EventSystemProvider: React.FC<EventSystemProviderProps> = ({ 
  children, 
  serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app',
  maxEvents = 100 
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [session, setSession] = useState<SocketSession | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to server
  const connect = (token: string) => {
    if (socket?.connected) {
      return;
    }

    setConnectionStatus(ConnectionStatus.CONNECTING);

    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ Socket connected to event system');
      setConnectionStatus(ConnectionStatus.CONNECTED);
      reconnectAttempts.current = 0;

      // Authenticate immediately after connection
      newSocket.emit('authenticate', token);
    });

    newSocket.on('authenticated', (data: { success: boolean; session: SocketSession }) => {
      if (data.success) {
        console.log('✅ Socket authenticated:', data.session);
        setConnectionStatus(ConnectionStatus.AUTHENTICATED);
        setSession(data.session);
      }
    });

    newSocket.on('authentication_error', (error: { message: string }) => {
      console.error('❌ Socket authentication failed:', error.message);
      setConnectionStatus(ConnectionStatus.ERROR);
    });

    newSocket.on('subscribed', (data: { subscriptionId: string; eventTypes: string[] }) => {
      console.log('📡 Subscribed to events:', data.eventTypes);
      setSession(prev => ({ ...prev!, subscriptionId: data.subscriptionId }));
    });

    newSocket.on('subscription_error', (error: { message: string }) => {
      console.error('❌ Event subscription failed:', error.message);
    });

    // Event handler
    newSocket.on('event', (event: Event) => {
      console.log('📡 Received event:', event.type, event);
      setEvents(prev => {
        const newEvents = [event, ...prev];
        return newEvents.slice(0, maxEvents); // Keep only recent events
      });
    });

    // Campaign room handlers
    newSocket.on('joined_campaign', (data: { campaignId: string }) => {
      console.log('👥 Joined campaign room:', data.campaignId);
    });

    newSocket.on('left_campaign', (data: { campaignId: string }) => {
      console.log('👋 Left campaign room:', data.campaignId);
    });

    // Health check
    newSocket.on('pong', (data: { timestamp: string }) => {
      console.log('💓 Heartbeat response:', data.timestamp);
    });

    // Maintenance handler
    newSocket.on('maintenance', (data: { message: string }) => {
      console.warn('🔧 Server maintenance:', data.message);
      setConnectionStatus(ConnectionStatus.ERROR);
    });

    // Error handlers
    newSocket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message);
      setConnectionStatus(ConnectionStatus.ERROR);
      reconnectAttempts.current++;
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('🔌 Socket disconnected:', reason);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      setSession(null);
    });

    newSocket.on('error', (error: Error) => {
      console.error('❌ Socket error:', error);
      setConnectionStatus(ConnectionStatus.ERROR);
    });

    // Start heartbeat
    const heartbeat = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(heartbeat);
    };
  };

  // Disconnect from server
  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      setSession(null);
    }
  };

  // Subscribe to specific event types
  const subscribeToEvents = (eventTypes: string[], filters?: Record<string, any>) => {
    if (socket && connectionStatus === ConnectionStatus.AUTHENTICATED) {
      socket.emit('subscribe_events', { eventTypes, filters });
    }
  };

  // Join campaign room
  const joinCampaign = (campaignId: string) => {
    if (socket && connectionStatus === ConnectionStatus.AUTHENTICATED) {
      socket.emit('join_campaign', campaignId);
    }
  };

  // Leave campaign room
  const leaveCampaign = (campaignId: string) => {
    if (socket && connectionStatus === ConnectionStatus.AUTHENTICATED) {
      socket.emit('leave_campaign', campaignId);
    }
  };

  // Clear event history
  const clearEvents = () => {
    setEvents([]);
  };

  // Emit custom event
  const emitEvent = (eventName: string, data: any) => {
    if (socket && connectionStatus === ConnectionStatus.AUTHENTICATED) {
      socket.emit(eventName, data);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const value: EventSystemContextType = {
    socket,
    connectionStatus,
    session,
    events,
    connect,
    disconnect,
    subscribeToEvents,
    joinCampaign,
    leaveCampaign,
    clearEvents,
    emitEvent,
  };

  return (
    <EventSystemContext.Provider value={value}>
      {children}
    </EventSystemContext.Provider>
  );
};

// Custom hook to use event system
export const useEventSystem = (): EventSystemContextType => {
  const context = useContext(EventSystemContext);
  if (!context) {
    throw new Error('useEventSystem must be used within an EventSystemProvider');
  }
  return context;
};

// Custom hook for specific event types
export const useEvents = (eventTypes: string[], filters?: Record<string, any>) => {
  const { events, subscribeToEvents, connectionStatus } = useEventSystem();
  
  useEffect(() => {
    if (connectionStatus === ConnectionStatus.AUTHENTICATED) {
      subscribeToEvents(eventTypes, filters);
    }
  }, [connectionStatus, eventTypes.join(','), JSON.stringify(filters)]);

  return events.filter(event => eventTypes.includes(event.type));
};

// Custom hook for campaign events
export const useCampaignEvents = (campaignId?: string) => {
  const { joinCampaign, leaveCampaign, connectionStatus } = useEventSystem();
  const eventTypes = [
    'campaign.started', 'campaign.paused', 'campaign.stopped', 'campaign.updated',
    'campaign.dial.speed.changed', 'campaign.dial.method.changed',
    'agent.campaign.joined', 'agent.campaign.left',
    'call.initiated', 'call.connected', 'call.ended',
    'queue.stats.updated'
  ];

  const campaignEvents = useEvents(eventTypes, campaignId ? { campaignId } : undefined);

  useEffect(() => {
    if (campaignId && connectionStatus === ConnectionStatus.AUTHENTICATED) {
      joinCampaign(campaignId);
      return () => leaveCampaign(campaignId);
    }
  }, [campaignId, connectionStatus]);

  return campaignEvents;
};

// Custom hook for agent events
export const useAgentEvents = (agentId?: string) => {
  const eventTypes = [
    'agent.login', 'agent.logout', 'agent.available', 'agent.unavailable',
    'agent.busy', 'agent.break', 'agent.status.changed',
    'call.initiated', 'call.connected', 'call.ended'
  ];

  return useEvents(eventTypes, agentId ? { agentId } : undefined);
};

// Custom hook for system notifications
export const useSystemNotifications = () => {
  const eventTypes = ['system.alert', 'system.error', 'system.warning', 'system.maintenance'];
  return useEvents(eventTypes);
};

// Custom hook for KPI updates
export const useKPIEvents = (campaignId?: string) => {
  const eventTypes = ['kpi.updated', 'kpi.threshold.exceeded', 'kpi.goal.reached'];
  return useEvents(eventTypes, campaignId ? { campaignId } : undefined);
};