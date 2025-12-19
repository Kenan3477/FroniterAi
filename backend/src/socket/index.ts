// Socket.IO Initialization and Event System Integration
import { Server } from 'socket.io';
import WebSocketService from '../services/websocketService';
import { eventManager } from '../services/eventManager';

let webSocketService: WebSocketService;

/**
 * Initialize Socket.IO with event system
 */
export const initializeSocket = (io: Server): WebSocketService => {
  console.log('🚀 Initializing Socket.IO event system...');

  // Create WebSocket service
  webSocketService = new WebSocketService(io);

  // Set up global event listeners for system integration
  setupSystemEventListeners();

  console.log('✅ Socket.IO event system initialized');
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