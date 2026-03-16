import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private isConnecting = false;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.isConnecting) {
      return this.socket!;
    }

    this.isConnecting = true;

    // Use environment variable or default to localhost for development
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
    
    this.socket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', this.socket!.id);
      this.isConnecting = false;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Socket.IO connection error:', error);
      this.isConnecting = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  get instance(): Socket | null {
    return this.socket;
  }

  get connected(): boolean {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const socketManager = new SocketManager();

// Export the socket instance for use in components
export const socket = socketManager.connect();

// Export manager for advanced control if needed
export { socketManager };

export default socket;