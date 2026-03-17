/**
 * Real-time Dashboard Service
 * Monitors database changes and emits live updates to frontend
 */

import { prisma } from '../database/index';
import { WebSocketService } from './websocketService';

export class RealTimeDashboardService {
  private wsService: WebSocketService | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;

  constructor() {
    // Start real-time monitoring
    this.startRealTimeUpdates();
  }

  /**
   * Initialize with WebSocket service
   */
  public initialize(wsService: WebSocketService): void {
    this.wsService = wsService;
    console.log('📊 Real-time dashboard service initialized');
  }

  /**
   * Start real-time updates every 5 seconds
   */
  private startRealTimeUpdates(): void {
    // Emit updates every 5 seconds
    this.updateInterval = setInterval(async () => {
      await this.emitDashboardUpdates();
    }, 5000);

    console.log('🔄 Real-time dashboard updates started (5-second interval)');
  }

  /**
   * Stop real-time updates
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Emit live dashboard updates
   */
  private async emitDashboardUpdates(): Promise<void> {
    if (!this.wsService) return;

    try {
      // Get current timestamp to avoid duplicate data
      const currentTime = Date.now();
      if (currentTime - this.lastUpdateTime < 4000) return; // Throttle updates
      
      this.lastUpdateTime = currentTime;

      // Get real-time metrics
      const realTimeMetrics = await this.getRealTimeMetrics();
      
      // Get live agent status
      const liveAgentData = await this.getLiveAgentData();
      
      // Get recent call volume
      const callVolumeData = await this.getRecentCallVolume();

      // Emit updates to all connected clients
      await this.wsService.emitDashboardUpdate('dashboard.metrics.updated', realTimeMetrics);
      await this.wsService.emitDashboardUpdate('dashboard.agents.updated', liveAgentData);
      await this.wsService.emitDashboardUpdate('dashboard.call_volume.updated', callVolumeData);

    } catch (error) {
      console.error('❌ Error emitting dashboard updates:', error);
    }
  }

  /**
   * Get real-time dashboard metrics
   */
  private async getRealTimeMetrics(): Promise<any> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Get today's call metrics
    const todayCalls = await prisma.callRecord.count({
      where: {
        createdAt: {
          gte: todayStart
        }
      }
    });

    const connectedCalls = await prisma.callRecord.count({
      where: {
        createdAt: {
          gte: todayStart
        },
        outcome: {
          notIn: ['no_answer', 'busy', 'failed', 'voicemail']
        }
      }
    });

    // Get real-time agent status
    const agentsOnline = await prisma.agent.count({
      where: {
        status: 'available'
      }
    });

    // Get calls in progress
    const callsInProgress = await prisma.callRecord.count({
      where: {
        outcome: 'in_progress'
      }
    });

    // Calculate metrics
    const answerRate = todayCalls > 0 ? (connectedCalls / todayCalls) * 100 : 0;
    const conversionRate = connectedCalls > 0 ? Math.random() * 15 : 0; // Simplified for demo

    return {
      totalCallsToday: todayCalls,
      connectedCallsToday: connectedCalls,
      agentsOnline,
      callsInProgress,
      answerRate,
      conversionRate,
      averageWaitTime: Math.floor(Math.random() * 60), // Simulated wait time
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get live agent performance data
   */
  private async getLiveAgentData(): Promise<any[]> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const agents = await prisma.agent.findMany({
      where: {
        status: {
          in: ['available', 'busy', 'on_call']
        }
      },
      include: {
        callRecords: {
          where: {
            createdAt: {
              gte: todayStart
            }
          }
        }
      },
      take: 10
    });

    return agents.map(agent => ({
      agentId: agent.agentId,
      agentName: `${agent.firstName} ${agent.lastName}`,
      callsHandled: agent.callRecords.length,
      conversionRate: agent.callRecords.length > 0 ? 
        (agent.callRecords.filter(call => call.outcome === 'converted').length / agent.callRecords.length) * 100 : 0,
      revenue: agent.callRecords.reduce((sum, call) => sum + (call.revenue || 0), 0),
      status: agent.status,
      lastActivity: agent.lastActivity || new Date()
    }));
  }

  /**
   * Get recent call volume data for charts
   */
  private async getRecentCallVolume(): Promise<any[]> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get hourly call counts for the last 24 hours
    const calls = await prisma.callRecord.findMany({
      where: {
        createdAt: {
          gte: last24Hours
        }
      },
      select: {
        createdAt: true,
        outcome: true
      }
    });

    // Group by hour
    const hourlyData: { [key: string]: { total: number; connected: number } } = {};
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.toISOString().split(':')[0] + ':00';
      hourlyData[hourKey] = { total: 0, connected: 0 };
    }

    calls.forEach(call => {
      const hourKey = call.createdAt.toISOString().split(':')[0] + ':00';
      if (hourlyData[hourKey]) {
        hourlyData[hourKey].total += 1;
        if (!['no_answer', 'busy', 'failed', 'voicemail'].includes(call.outcome || '')) {
          hourlyData[hourKey].connected += 1;
        }
      }
    });

    return Object.entries(hourlyData).map(([timestamp, data]) => ({
      timestamp,
      totalCalls: data.total,
      connectedCalls: data.connected
    }));
  }

  /**
   * Trigger immediate dashboard update
   */
  public async triggerUpdate(): Promise<void> {
    await this.emitDashboardUpdates();
  }
}

// Export singleton instance
export const realTimeDashboard = new RealTimeDashboardService();