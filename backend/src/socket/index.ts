// Socket.IO Initialization and Event System Integration
import { Server } from 'socket.io';
import WebSocketService from '../services/websocketService';
import { eventManager } from '../services/eventManager';
import { realTimeDashboard } from '../services/realTimeDashboardService';

let webSocketService: WebSocketService;

/**
 * Initialize Socket.IO with event system
 */
export const initializeSocket = (io: Server): WebSocketService => {
  console.log('🚀 Initializing Socket.IO event system...');

  // Create WebSocket service for main namespace
  webSocketService = new WebSocketService(io);
  
  // Initialize real-time dashboard service
  realTimeDashboard.initialize(webSocketService);
  
  // Set up dialler namespace for agent communications
  const diallerNamespace = io.of('/dialler');
  console.log('🎯 Setting up /dialler namespace for agent communications');
  
  // Handle dialler namespace connections directly
  diallerNamespace.on('connection', (socket) => {
    console.log(`🔌 Agent connected to dialler namespace: ${socket.id}`);
    
    // Handle authentication for agents
    socket.on('authenticate-agent', async (data: { agentId: string; token?: string }) => {
      try {
        console.log(`🔐 Authenticating agent: ${data.agentId}`);

        const { resolveTwilioVoiceIdentityForUserId } = await import('../utils/twilioVoiceClientIdentity');
        const voiceClientIdentity = await resolveTwilioVoiceIdentityForUserId(data.agentId);

        // Must match inbound/outbound Twilio <Dial><Client>identity</Client> and Voice token identity
        socket.join(`agent:${voiceClientIdentity}`);
        if (voiceClientIdentity !== data.agentId) {
          socket.join(`agent:${data.agentId}`);
        }

        // Join campaigns for this agent via User.email ↔ Agent.email (userId on assignments is User.id)
        const agentCampaigns = await (await import('../database')).prisma.$queryRaw`
          SELECT DISTINCT uca."campaignId"
          FROM agents a
          INNER JOIN users u ON LOWER(u.email) = LOWER(a.email)
          INNER JOIN user_campaign_assignments uca ON uca."userId" = u.id
          WHERE a."agentId" = ${voiceClientIdentity}
            AND uca."isActive" = true
        ` as any[];

        for (const campaign of agentCampaigns) {
          socket.join(`campaign:${campaign.campaignId}`);
          console.log(`👥 Agent ${voiceClientIdentity} joined campaign: ${campaign.campaignId}`);
        }

        socket.emit('authenticated', {
          success: true,
          agent: { agentId: voiceClientIdentity, requestedAs: data.agentId },
        });
        console.log(
          `✅ Agent authenticated in dialler namespace: room agent:${voiceClientIdentity}` +
            (voiceClientIdentity !== data.agentId ? ` (requested as ${data.agentId})` : ''),
        );
        
      } catch (error) {
        console.error('❌ Agent authentication failed:', error);
        socket.emit('auth-error', { message: 'Authentication failed' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Agent disconnected from dialler namespace: ${socket.id}`);
    });
  });
  
  // Store reference to dialler namespace for global access
  (webSocketService as any).diallerNamespace = diallerNamespace;

  // Set up global event listeners for system integration
  setupSystemEventListeners();

  console.log('✅ Socket.IO event system initialized with /dialler namespace');
  return webSocketService;
};

/**
 * Set up system-wide event listeners
 */
const setupSystemEventListeners = (): void => {
  // Monitor event manager statistics
  setInterval(() => {
    const eventStats = eventManager.getStats();
    const socketStats = webSocketService?.getStats();
    
    // Emit system performance metrics
    eventManager.emitEvent({
      type: 'system.performance',
      level: 'info',
      component: 'real-time-system',
      message: 'Real-time system performance update',
      details: {
        eventManager: eventStats,
        webSocket: socketStats,
        timestamp: new Date().toISOString(),
      },
    } as any, 'admin').catch(console.error);
  }, 30000); // Every 30 seconds

  // Listen for critical system events
  eventManager.on('system.error', (event) => {
    console.error('🚨 Critical system error detected:', event);
  });

  eventManager.on('system.alert', (event) => {
    if (event.level === 'critical' || event.level === 'error') {
      console.warn('⚠️ System alert:', event.message);
    }
  });

  console.log('📡 System event listeners configured');
};

/**
 * Get the active WebSocket service instance
 */
export const getWebSocketService = (): WebSocketService => {
  if (!webSocketService) {
    throw new Error('WebSocket service not initialized');
  }
  return webSocketService;
};

/**
 * Shutdown the real-time event system gracefully
 */
export const shutdownEventSystem = (): void => {
  console.log('⏹️ Shutting down real-time event system...');
  
  if (webSocketService) {
    webSocketService.disconnectAll();
  }
  
  // Cleanup event manager
  eventManager.cleanup();
  
  console.log('✅ Real-time event system shutdown complete');
};

// Export for use in other parts of the application
export { eventManager, webSocketService };
export default { initializeSocket, getWebSocketService, shutdownEventSystem };