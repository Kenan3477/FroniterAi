// WebSocket Event Broadcasting Service
import { Server, Socket } from 'socket.io';
import { eventManager } from './eventManager';
import { EventRoom, Event } from '../types/events';
import jwt from 'jsonwebtoken';
import config from '../config';

interface SocketSession {
  userId?: string;
  agentId?: string;
  organizationId?: string;
  roles?: string[];
  subscriptionId?: string;
}

export class WebSocketService {
  private io: Server;
  private connectedSockets: Map<string, SocketSession> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
    this.setupSocketHandlers();
  }

  private setupEventHandlers(): void {
    // Listen for broadcast events from event manager
    eventManager.on('broadcast', ({ event, room, subscribers }) => {
      this.broadcastEvent(event, room, subscribers);
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (token: string) => {
        try {
          const decoded = jwt.verify(token, config.jwt.secret) as any;
          const session: SocketSession = {
            userId: decoded.id,
            agentId: decoded.agentId,
            organizationId: decoded.organizationId,
            roles: decoded.roles || [],
          };

          this.connectedSockets.set(socket.id, session);

          // Join user-specific rooms
          if (session.userId) {
            socket.join(`user:${session.userId}`);
          }
          if (session.agentId) {
            socket.join(`agent:${session.agentId}`);
          }
          if (session.organizationId) {
            socket.join(`organization:${session.organizationId}`);
          }
          if (session.roles?.includes('admin')) {
            socket.join('admin');
          }

          socket.emit('authenticated', { success: true, session });
          console.log(`✅ Socket authenticated: ${socket.id} - User: ${session.userId}`);

        } catch (error) {
          socket.emit('authentication_error', { message: 'Invalid token' });
          console.error('❌ Socket authentication failed:', error);
        }
      });

      // Handle event subscription
      socket.on('subscribe_events', (data: { eventTypes: string[], filters?: Record<string, any> }) => {
        const session = this.connectedSockets.get(socket.id);
        if (!session) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          // Create subscription with session context
          const subscriptionId = eventManager.subscribe({
            userId: session.userId,
            agentId: session.agentId,
            organizationId: session.organizationId,
            eventTypes: data.eventTypes,
            filters: data.filters,
            rooms: this.getUserRooms(session),
          });

          // Store subscription ID in session
          session.subscriptionId = subscriptionId;
          this.connectedSockets.set(socket.id, session);

          socket.emit('subscribed', { subscriptionId, eventTypes: data.eventTypes });
          console.log(`📡 Socket subscribed: ${socket.id} - Events: ${data.eventTypes.join(', ')}`);

        } catch (error) {
          socket.emit('subscription_error', { message: 'Failed to subscribe to events' });
          console.error('❌ Event subscription failed:', error);
        }
      });

      // Handle campaign room joining
      socket.on('join_campaign', (campaignId: string) => {
        const session = this.connectedSockets.get(socket.id);
        if (!session) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        socket.join(`campaign:${campaignId}`);
        socket.emit('joined_campaign', { campaignId });
        console.log(`👥 Socket joined campaign: ${socket.id} - Campaign: ${campaignId}`);
      });

      // Handle campaign room leaving
      socket.on('leave_campaign', (campaignId: string) => {
        socket.leave(`campaign:${campaignId}`);
        socket.emit('left_campaign', { campaignId });
        console.log(`👋 Socket left campaign: ${socket.id} - Campaign: ${campaignId}`);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Handle disconnection
      socket.on('disconnect', (reason: string) => {
        const session = this.connectedSockets.get(socket.id);
        
        // Cleanup subscription
        if (session?.subscriptionId) {
          eventManager.unsubscribe(session.subscriptionId);
        }

        this.connectedSockets.delete(socket.id);
        console.log(`🔌 Socket disconnected: ${socket.id} - Reason: ${reason}`);
      });

      // Handle errors
      socket.on('error', (error: any) => {
        console.error(`❌ Socket error: ${socket.id}`, error);
      });
    });
  }

  /**
   * Broadcast event to specific room or subscribers
   */
  private broadcastEvent(event: Event, room?: EventRoom, subscribers?: string[]): void {
    try {
      const eventData = {
        ...event,
        timestamp: event.timestamp.toISOString(),
      };

      if (room) {
        // Broadcast to specific room
        this.io.to(room).emit('event', eventData);
        console.log(`📢 Broadcasting to room: ${room} - Event: ${event.type}`);
      } else if (subscribers && subscribers.length > 0) {
        // Broadcast to specific subscribers
        subscribers.forEach(subscriptionId => {
          // Find socket by subscription ID
          for (const [socketId, session] of this.connectedSockets.entries()) {
            if (session.subscriptionId === subscriptionId) {
              this.io.to(socketId).emit('event', eventData);
            }
          }
        });
        console.log(`📢 Broadcasting to ${subscribers.length} subscribers - Event: ${event.type}`);
      } else {
        // Broadcast globally
        this.io.emit('event', eventData);
        console.log(`📢 Broadcasting globally - Event: ${event.type}`);
      }
    } catch (error) {
      console.error('❌ Failed to broadcast event:', error);
    }
  }

  /**
   * Get rooms a user should be subscribed to based on their session
   */
  private getUserRooms(session: SocketSession): string[] {
    const rooms: string[] = [];

    if (session.userId) {
      rooms.push(`user:${session.userId}`);
    }
    if (session.agentId) {
      rooms.push(`agent:${session.agentId}`);
    }
    if (session.organizationId) {
      rooms.push(`organization:${session.organizationId}`);
    }
    if (session.roles?.includes('admin')) {
      rooms.push('admin');
    }

    return rooms;
  }

  /**
   * Send direct message to specific user
   */
  public sendToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Send direct message to specific agent
   */
  public sendToAgent(agentId: string, event: string, data: any): void {
    this.io.to(`agent:${agentId}`).emit(event, data);
  }

  /**
   * Send message to campaign participants
   */
  public sendToCampaign(campaignId: string, event: string, data: any): void {
    this.io.to(`campaign:${campaignId}`).emit(event, data);
  }

  /**
   * Send message to organization members
   */
  public sendToOrganization(organizationId: string, event: string, data: any): void {
    this.io.to(`organization:${organizationId}`).emit(event, data);
  }

  /**
   * Send admin message
   */
  public sendToAdmins(event: string, data: any): void {
    this.io.to('admin').emit(event, data);
  }

  /**
   * Get connected socket statistics
   */
  public getStats(): object {
    const roomStats = new Map<string, number>();
    
    // Count sockets per room
    for (const [socketId] of this.connectedSockets.entries()) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.rooms.forEach(room => {
          if (room !== socketId) { // Exclude the socket's own room
            roomStats.set(room, (roomStats.get(room) || 0) + 1);
          }
        });
      }
    }

    return {
      totalConnections: this.connectedSockets.size,
      authenticatedConnections: Array.from(this.connectedSockets.values()).filter(s => s.userId).length,
      agentConnections: Array.from(this.connectedSockets.values()).filter(s => s.agentId).length,
      adminConnections: Array.from(this.connectedSockets.values()).filter(s => s.roles?.includes('admin')).length,
      roomStats: Object.fromEntries(roomStats),
    };
  }

  /**
   * Emit a system-wide notification
   */
  public async emitSystemNotification(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    await eventManager.emitEvent({
      type: 'system.alert',
      level,
      message,
      component: 'websocket',
    } as any, 'global');
  }

  /**
   * Force disconnect all sockets (for maintenance)
   */
  public disconnectAll(): void {
    this.io.emit('maintenance', { message: 'Server maintenance in progress' });
    this.io.disconnectSockets(true);
    this.connectedSockets.clear();
  }
}

export default WebSocketService;