// Real-time Event Manager Service
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { redisClient } from '../config/redis';
import { 
  Event, 
  EventSubscription, 
  EventRoom, 
  EventPriority, 
  EventStatus, 
  EventLog 
} from '../types/events';
import { 
  validateEvent, 
  validateEventSubscription 
} from '../schemas/eventSchemas';

export class EventManager extends EventEmitter {
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventQueue: Map<string, EventLog> = new Map();
  private roomSubscribers: Map<EventRoom, Set<string>> = new Map();
  private retryDelays = [1000, 3000, 10000, 30000]; // Exponential backoff delays

  constructor() {
    super();
    this.setMaxListeners(1000); // Increase listener limit
    this.startEventProcessor();
  }

  /**
   * Subscribe to events with filtering
   */
  public subscribe(subscription: Omit<EventSubscription, 'id' | 'createdAt'>): string {
    const id = uuidv4();
    const fullSubscription: EventSubscription = {
      ...subscription,
      id,
      createdAt: new Date(),
    };

    // Validate subscription
    validateEventSubscription(fullSubscription);

    this.subscriptions.set(id, fullSubscription);

    // Add to room subscribers
    if (fullSubscription.rooms) {
      fullSubscription.rooms.forEach(room => {
        if (!this.roomSubscribers.has(room as EventRoom)) {
          this.roomSubscribers.set(room as EventRoom, new Set());
        }
        this.roomSubscribers.get(room as EventRoom)?.add(id);
      });
    }

    console.log(`📡 New subscription created: ${id} for events: ${subscription.eventTypes.join(', ')}`);
    return id;
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Remove from room subscribers
    if (subscription.rooms) {
      subscription.rooms.forEach(room => {
        const subscribers = this.roomSubscribers.get(room as EventRoom);
        if (subscribers) {
          subscribers.delete(subscriptionId);
          if (subscribers.size === 0) {
            this.roomSubscribers.delete(room as EventRoom);
          }
        }
      });
    }

    this.subscriptions.delete(subscriptionId);
    console.log(`🚫 Subscription removed: ${subscriptionId}`);
    return true;
  }

  /**
   * Emit an event with validation and queuing
   */
  public async emitEvent<T extends Event>(
    event: Omit<T, 'id' | 'timestamp'>, 
    room?: EventRoom,
    priority: EventPriority = EventPriority.MEDIUM
  ): Promise<string> {
    const fullEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    } as T;

    try {
      // Validate event
      validateEvent(fullEvent);

      // Create event log
      const eventLog: EventLog = {
        id: uuidv4(),
        event: fullEvent,
        room,
        status: EventStatus.PENDING,
        priority,
        retryCount: 0,
      };

      // Add to processing queue
      this.eventQueue.set(eventLog.id, eventLog);

      // Process immediately for high/critical priority
      if (priority === EventPriority.HIGH || priority === EventPriority.CRITICAL) {
        await this.processEvent(eventLog);
      }

      console.log(`🎯 Event queued: ${fullEvent.type} (${eventLog.id}) - Priority: ${priority}`);
      return eventLog.id;
    } catch (error) {
      console.error('❌ Failed to emit event:', error);
      throw error;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(eventLog: EventLog): Promise<void> {
    try {
      eventLog.status = EventStatus.PROCESSING;
      eventLog.processedAt = new Date();

      const { event, room } = eventLog;
      const relevantSubscribers = this.getRelevantSubscribers(event, room);

      // Store in Redis for persistence
      await this.persistEvent(eventLog);

      // Emit to Node.js EventEmitter for local listeners
      this.emit(event.type, event);

      // Find subscribers for this event
      eventLog.subscribers = Array.from(relevantSubscribers);

      // Broadcast to WebSocket rooms (will be handled by socket service)
      this.emit('broadcast', {
        event,
        room,
        subscribers: Array.from(relevantSubscribers),
      });

      eventLog.status = EventStatus.COMPLETED;
      console.log(`✅ Event processed: ${event.type} - Subscribers: ${relevantSubscribers.size}`);

    } catch (error) {
      eventLog.status = EventStatus.FAILED;
      eventLog.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Schedule retry if not exceeded limit
      if ((eventLog.retryCount || 0) < this.retryDelays.length) {
        await this.scheduleRetry(eventLog);
      } else {
        console.error(`❌ Event failed after all retries: ${eventLog.event.type}`, error);
      }
    } finally {
      // Remove from queue if completed or permanently failed
      if (eventLog.status === EventStatus.COMPLETED || 
          (eventLog.status === EventStatus.FAILED && (eventLog.retryCount || 0) >= this.retryDelays.length)) {
        this.eventQueue.delete(eventLog.id);
      }
    }
  }

  /**
   * Find relevant subscribers for an event
   */
  private getRelevantSubscribers(event: Event, room?: EventRoom): Set<string> {
    const relevantSubscribers = new Set<string>();

    // Check room-based subscribers first
    if (room) {
      const roomSubscribers = this.roomSubscribers.get(room);
      if (roomSubscribers) {
        roomSubscribers.forEach(subscriberId => {
          const subscription = this.subscriptions.get(subscriberId);
          if (subscription && this.isEventRelevant(event, subscription)) {
            relevantSubscribers.add(subscriberId);
          }
        });
      }
    }

    // Check all subscribers for event type and filters
    this.subscriptions.forEach((subscription, subscriberId) => {
      if (this.isEventRelevant(event, subscription)) {
        // Additional room-based filtering
        if (!room || !subscription.rooms || subscription.rooms.includes(room)) {
          relevantSubscribers.add(subscriberId);
        }
      }
    });

    return relevantSubscribers;
  }

  /**
   * Check if event is relevant to subscription
   */
  private isEventRelevant(event: Event, subscription: EventSubscription): boolean {
    // Check event type
    if (!subscription.eventTypes.includes(event.type)) {
      return false;
    }

    // Check organization filter
    if (subscription.organizationId && event.organizationId !== subscription.organizationId) {
      return false;
    }

    // Check user filter
    if (subscription.userId && event.userId !== subscription.userId) {
      return false;
    }

    // Check custom filters
    if (subscription.filters) {
      for (const [key, value] of Object.entries(subscription.filters)) {
        if ((event as any)[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Schedule event retry with exponential backoff
   */
  private async scheduleRetry(eventLog: EventLog): Promise<void> {
    const retryCount = (eventLog.retryCount || 0);
    const delay = this.retryDelays[retryCount];

    eventLog.retryCount = retryCount + 1;
    eventLog.status = EventStatus.RETRYING;

    setTimeout(async () => {
      try {
        await this.processEvent(eventLog);
      } catch (error) {
        console.error(`❌ Retry failed for event: ${eventLog.event.type}`, error);
      }
    }, delay);

    console.log(`🔄 Scheduled retry ${retryCount + 1} for event: ${eventLog.event.type} in ${delay}ms`);
  }

  /**
   * Persist event to Redis for analytics and history
   */
  private async persistEvent(eventLog: EventLog): Promise<void> {
    try {
      // Make Redis operations non-blocking to prevent webhook hanging
      setImmediate(async () => {
        try {
          const key = `event:${eventLog.event.type}:${eventLog.id}`;
          const ttl = 24 * 60 * 60; // 24 hours

          await redisClient.setEx(key, ttl, JSON.stringify({
            ...eventLog,
            event: {
              ...eventLog.event,
              timestamp: eventLog.event.timestamp.toISOString(),
            },
            processedAt: eventLog.processedAt?.toISOString(),
          }));

          // Add to event type index
          const indexKey = `events:by_type:${eventLog.event.type}`;
          await redisClient.lPush(indexKey, eventLog.id);
          await redisClient.lTrim(indexKey, 0, 999); // Keep last 1000 events

          // Add to organization index if available
          if (eventLog.event.organizationId) {
            const orgIndexKey = `events:by_org:${eventLog.event.organizationId}`;
            await redisClient.lPush(orgIndexKey, eventLog.id);
            await redisClient.lTrim(orgIndexKey, 0, 999);
          }
          
          console.log('✅ Event persisted to Redis:', eventLog.id);
        } catch (redisError) {
          console.warn('⚠️ Redis persistence failed (non-blocking):', redisError);
        }
      });
      
      // Return immediately without waiting for Redis
      console.log('📝 Event persistence queued (non-blocking):', eventLog.id);
      
    } catch (error) {
      console.warn('⚠️ Event persistence error (non-blocking):', error);
      // Don't throw - continue execution
    }
  }

  /**
   * Start background event processor
   */
  private startEventProcessor(): void {
    setInterval(() => {
      const pendingEvents = Array.from(this.eventQueue.values())
        .filter(log => log.status === EventStatus.PENDING)
        .sort((a, b) => {
          // Sort by priority (critical > high > medium > low)
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });

      // Process pending events
      pendingEvents.forEach(eventLog => {
        this.processEvent(eventLog).catch(error => {
          console.error('❌ Background event processing failed:', error);
        });
      });
    }, 1000); // Process every second
  }

  /**
   * Get event statistics
   */
  public getStats(): object {
    const eventsByStatus = Array.from(this.eventQueue.values()).reduce((acc, log) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSubscriptions: this.subscriptions.size,
      totalRooms: this.roomSubscribers.size,
      queueSize: this.eventQueue.size,
      eventsByStatus,
      roomStats: Array.from(this.roomSubscribers.entries()).map(([room, subscribers]) => ({
        room,
        subscriberCount: subscribers.size,
      })),
    };
  }

  /**
   * Clean up expired subscriptions and events
   */
  public cleanup(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old events from queue
    for (const [id, eventLog] of this.eventQueue.entries()) {
      const eventAge = now - (eventLog.processedAt?.getTime() || eventLog.event.timestamp.getTime());
      if (eventAge > maxAge && (eventLog.status === EventStatus.COMPLETED || eventLog.status === EventStatus.FAILED)) {
        this.eventQueue.delete(id);
      }
    }

    console.log('🧹 Event cleanup completed');
  }
}

// Create singleton instance
export const eventManager = new EventManager();

// Schedule periodic cleanup
setInterval(() => {
  eventManager.cleanup();
}, 60 * 60 * 1000); // Every hour