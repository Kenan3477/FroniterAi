/**
 * Real-Time Dial Rate Controller
 * Manages dynamic dial rate adjustments and routing optimization
 */

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { authenticate, requireRole } from '../middleware/auth';

export interface DialRateConfig {
  campaignId: string;
  dialRate: number;           // Calls per second per agent
  predictiveRatio: number;    // Predictive dialing ratio
  minWaitTime: number;        // Minimum wait between calls (ms)
  maxWaitTime: number;        // Maximum wait between calls (ms)
  answerRateTarget: number;   // Target answer rate (0-1)
  dropRateLimit: number;      // Maximum acceptable drop rate
  routingStrategy: 'ROUND_ROBIN' | 'SKILL_BASED' | 'LEAST_BUSY' | 'PRIORITY';
  priorityRouting: boolean;
  agentIdleTimeout: number;   // Agent idle timeout (ms)
  callbackDelay: number;      // Delay for callback attempts (ms)
  retryStrategy: 'LINEAR' | 'EXPONENTIAL' | 'FIBONACCI';
}

export interface DialRateMetrics {
  campaignId: string;
  currentAnswerRate: number;
  currentDropRate: number;
  avgWaitTime: number;
  activeAgents: number;
  callsInProgress: number;
  callsCompleted: number;
  efficiency: number;
  lastUpdated: Date;
}

export interface DialRateAdjustment {
  campaignId: string;
  adjustmentType: 'INCREASE' | 'DECREASE' | 'MAINTAIN';
  reason: string;
  oldRate: number;
  newRate: number;
  confidence: number;
  appliedAt: Date;
}

export class RealTimeDialRateController {
  private prisma: PrismaClient;
  private io: Server;
  private activeMonitoring: Map<string, NodeJS.Timer> = new Map();
  private currentMetrics: Map<string, DialRateMetrics> = new Map();
  private adjustmentHistory: Map<string, DialRateAdjustment[]> = new Map();

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma;
    this.io = io;
  }

  /**
   * Get current dial rate configuration for campaign
   */
  async getDialRateConfig(campaignId: string): Promise<DialRateConfig | null> {
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { campaignId },
        select: {
          campaignId: true,
          dialRate: true,
          predictiveRatio: true,
          minWaitTime: true,
          maxWaitTime: true,
          answerRateTarget: true,
          dropRateLimit: true,
          routingStrategy: true,
          priorityRouting: true,
          agentIdleTimeout: true,
          callbackDelay: true,
          retryStrategy: true
        }
      });

      if (!campaign) return null;

      return {
        campaignId: campaign.campaignId,
        dialRate: campaign.dialRate || 1.0,
        predictiveRatio: campaign.predictiveRatio || 1.2,
        minWaitTime: campaign.minWaitTime || 500,
        maxWaitTime: campaign.maxWaitTime || 5000,
        answerRateTarget: campaign.answerRateTarget || 0.8,
        dropRateLimit: campaign.dropRateLimit || 0.03,
        routingStrategy: (campaign.routingStrategy as any) || 'ROUND_ROBIN',
        priorityRouting: campaign.priorityRouting || false,
        agentIdleTimeout: campaign.agentIdleTimeout || 30000,
        callbackDelay: campaign.callbackDelay || 300000,
        retryStrategy: (campaign.retryStrategy as any) || 'LINEAR'
      };
    } catch (error) {
      console.error('Error getting dial rate config:', error);
      return null;
    }
  }

  /**
   * Update dial rate configuration
   */
  async updateDialRateConfig(campaignId: string, config: Partial<DialRateConfig>): Promise<boolean> {
    try {
      await this.prisma.campaign.update({
        where: { campaignId },
        data: {
          dialRate: config.dialRate,
          predictiveRatio: config.predictiveRatio,
          minWaitTime: config.minWaitTime,
          maxWaitTime: config.maxWaitTime,
          answerRateTarget: config.answerRateTarget,
          dropRateLimit: config.dropRateLimit,
          routingStrategy: config.routingStrategy,
          priorityRouting: config.priorityRouting,
          agentIdleTimeout: config.agentIdleTimeout,
          callbackDelay: config.callbackDelay,
          retryStrategy: config.retryStrategy
        }
      });

      // Broadcast update to connected clients
      this.io.to(`campaign:${campaignId}`).emit('dialRate:configUpdated', {
        campaignId,
        config,
        timestamp: new Date()
      });

      console.log(`📞 Dial rate config updated for campaign ${campaignId}`);
      return true;

    } catch (error) {
      console.error('Error updating dial rate config:', error);
      return false;
    }
  }

  /**
   * Calculate current metrics for campaign
   */
  async calculateCurrentMetrics(campaignId: string): Promise<DialRateMetrics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get call records for today
      const callRecords = await this.prisma.callRecord.findMany({
        where: {
          campaignId,
          startTime: { gte: today }
        },
        select: {
          outcome: true,
          duration: true,
          startTime: true,
          endTime: true
        }
      });

      // Get active agents
      const activeAgents = await this.prisma.agentCampaignAssignment.count({
        where: {
          campaignId,
          agent: {
            status: { in: ['Available', 'On Call'] }
          }
        }
      });

      const totalCalls = callRecords.length;
      const answeredCalls = callRecords.filter(r => r.outcome === 'CONNECTED' || r.outcome === 'ANSWERED').length;
      const droppedCalls = callRecords.filter(r => r.outcome === 'DROPPED' || r.outcome === 'ABANDONED' || r.outcome === 'NO_ANSWER').length;
      const inProgressCalls = callRecords.filter(r => r.outcome === 'IN_PROGRESS' || !r.endTime).length;

      const currentAnswerRate = totalCalls > 0 ? answeredCalls / totalCalls : 0;
      const currentDropRate = totalCalls > 0 ? droppedCalls / totalCalls : 0;
      
      // Calculate average wait time
      const validDurations = callRecords
        .filter(r => r.duration && r.duration > 0)
        .map(r => r.duration!);
      const avgWaitTime = validDurations.length > 0 
        ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
        : 0;

      // Calculate efficiency (answered calls / active agents)
      const efficiency = activeAgents > 0 ? answeredCalls / activeAgents : 0;

      const metrics: DialRateMetrics = {
        campaignId,
        currentAnswerRate,
        currentDropRate,
        avgWaitTime,
        activeAgents,
        callsInProgress: inProgressCalls,
        callsCompleted: answeredCalls,
        efficiency,
        lastUpdated: new Date()
      };

      this.currentMetrics.set(campaignId, metrics);
      return metrics;

    } catch (error) {
      console.error('Error calculating metrics:', error);
      
      // Return default metrics
      return {
        campaignId,
        currentAnswerRate: 0,
        currentDropRate: 0,
        avgWaitTime: 0,
        activeAgents: 0,
        callsInProgress: 0,
        callsCompleted: 0,
        efficiency: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Automatically adjust dial rate based on performance
   */
  async autoAdjustDialRate(campaignId: string): Promise<DialRateAdjustment | null> {
    try {
      const config = await this.getDialRateConfig(campaignId);
      const metrics = await this.calculateCurrentMetrics(campaignId);

      if (!config) return null;

      let adjustmentType: 'INCREASE' | 'DECREASE' | 'MAINTAIN' = 'MAINTAIN';
      let newRate = config.dialRate;
      let reason = 'No adjustment needed';
      let confidence = 0.5;

      // Adjustment logic
      if (metrics.currentDropRate > config.dropRateLimit) {
        // Drop rate too high - decrease dial rate
        adjustmentType = 'DECREASE';
        newRate = Math.max(0.5, config.dialRate * 0.9);
        reason = `Drop rate (${(metrics.currentDropRate * 100).toFixed(1)}%) exceeds limit (${(config.dropRateLimit * 100).toFixed(1)}%)`;
        confidence = 0.85;
      } else if (metrics.currentAnswerRate > config.answerRateTarget && metrics.currentDropRate < config.dropRateLimit * 0.5) {
        // Answer rate good and drop rate low - increase dial rate
        adjustmentType = 'INCREASE';
        newRate = Math.min(5.0, config.dialRate * 1.1);
        reason = `Answer rate (${(metrics.currentAnswerRate * 100).toFixed(1)}%) above target, low drop rate`;
        confidence = 0.75;
      } else if (metrics.currentAnswerRate < config.answerRateTarget * 0.8) {
        // Answer rate too low - decrease dial rate
        adjustmentType = 'DECREASE';
        newRate = Math.max(0.5, config.dialRate * 0.95);
        reason = `Answer rate (${(metrics.currentAnswerRate * 100).toFixed(1)}%) below target (${(config.answerRateTarget * 100).toFixed(1)}%)`;
        confidence = 0.7;
      }

      const adjustment: DialRateAdjustment = {
        campaignId,
        adjustmentType,
        reason,
        oldRate: config.dialRate,
        newRate,
        confidence,
        appliedAt: new Date()
      };

      // Apply adjustment if significant change
      if (Math.abs(newRate - config.dialRate) > 0.05) {
        await this.updateDialRateConfig(campaignId, { dialRate: newRate });

        // Log adjustment
        const history = this.adjustmentHistory.get(campaignId) || [];
        history.push(adjustment);
        this.adjustmentHistory.set(campaignId, history.slice(-20)); // Keep last 20

        // Broadcast adjustment
        this.io.to(`campaign:${campaignId}`).emit('dialRate:autoAdjusted', adjustment);

        console.log(`🎯 Auto-adjusted dial rate for ${campaignId}: ${config.dialRate.toFixed(2)} → ${newRate.toFixed(2)} (${reason})`);
      }

      return adjustment;

    } catch (error) {
      console.error('Error in auto-adjustment:', error);
      return null;
    }
  }

  /**
   * Start real-time monitoring for campaign
   */
  startMonitoring(campaignId: string): void {
    // Stop existing monitoring
    this.stopMonitoring(campaignId);

    console.log(`📊 Starting real-time monitoring for campaign ${campaignId}`);

    // Monitor every 30 seconds
    const interval = setInterval(async () => {
      try {
        const metrics = await this.calculateCurrentMetrics(campaignId);
        
        // Broadcast metrics update
        this.io.to(`campaign:${campaignId}`).emit('dialRate:metricsUpdated', metrics);

        // Auto-adjust if enabled (every 2 minutes)
        if (Date.now() % 120000 < 30000) {
          await this.autoAdjustDialRate(campaignId);
        }

      } catch (error) {
        console.error(`Error monitoring campaign ${campaignId}:`, error);
      }
    }, 30000);

    this.activeMonitoring.set(campaignId, interval);
  }

  /**
   * Stop monitoring for campaign
   */
  stopMonitoring(campaignId: string): void {
    const interval = this.activeMonitoring.get(campaignId);
    if (interval) {
      clearInterval(interval as any);
      this.activeMonitoring.delete(campaignId);
      console.log(`⏹️ Stopped monitoring for campaign ${campaignId}`);
    }
  }

  /**
   * Get adjustment history
   */
  getAdjustmentHistory(campaignId: string): DialRateAdjustment[] {
    return this.adjustmentHistory.get(campaignId) || [];
  }

  /**
   * Manual emergency adjustment
   */
  async emergencyAdjustment(campaignId: string, newRate: number, reason: string): Promise<boolean> {
    try {
      const config = await this.getDialRateConfig(campaignId);
      if (!config) return false;

      await this.updateDialRateConfig(campaignId, { dialRate: newRate });

      const adjustment: DialRateAdjustment = {
        campaignId,
        adjustmentType: newRate > config.dialRate ? 'INCREASE' : 'DECREASE',
        reason: `MANUAL: ${reason}`,
        oldRate: config.dialRate,
        newRate,
        confidence: 1.0,
        appliedAt: new Date()
      };

      // Log adjustment
      const history = this.adjustmentHistory.get(campaignId) || [];
      history.push(adjustment);
      this.adjustmentHistory.set(campaignId, history.slice(-20));

      // Broadcast emergency adjustment
      this.io.to(`campaign:${campaignId}`).emit('dialRate:emergencyAdjustment', adjustment);

      console.log(`🚨 Emergency dial rate adjustment for ${campaignId}: ${config.dialRate.toFixed(2)} → ${newRate.toFixed(2)} (${reason})`);
      return true;

    } catch (error) {
      console.error('Error in emergency adjustment:', error);
      return false;
    }
  }

  /**
   * Cleanup monitoring
   */
  shutdown(): void {
    for (const [campaignId] of this.activeMonitoring) {
      this.stopMonitoring(campaignId);
    }
    console.log('📞 Dial rate controller shutdown complete');
  }
}

export function createDialRateRoutes(prisma: PrismaClient, io: Server): Router {
  const router = Router();
  const controller = new RealTimeDialRateController(prisma, io);

  // Apply authentication
  router.use(authenticate);

  /**
   * GET /api/campaigns/:campaignId/dial-rate/config
   * Get current dial rate configuration
   */
  router.get('/:campaignId/dial-rate/config', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const config = await controller.getDialRateConfig(campaignId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      console.error('Error getting dial rate config:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * PUT /api/campaigns/:campaignId/dial-rate/config
   * Update dial rate configuration
   */
  router.put('/:campaignId/dial-rate/config', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const config = req.body;

      // Validate config values
      if (config.dialRate && (config.dialRate < 0.1 || config.dialRate > 10)) {
        return res.status(400).json({
          success: false,
          error: 'Dial rate must be between 0.1 and 10.0'
        });
      }

      if (config.dropRateLimit && (config.dropRateLimit < 0 || config.dropRateLimit > 1)) {
        return res.status(400).json({
          success: false,
          error: 'Drop rate limit must be between 0 and 1'
        });
      }

      const success = await controller.updateDialRateConfig(campaignId, config);

      if (success) {
        res.json({
          success: true,
          message: 'Dial rate configuration updated successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to update configuration'
        });
      }

    } catch (error) {
      console.error('Error updating dial rate config:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/campaigns/:campaignId/dial-rate/metrics
   * Get current performance metrics
   */
  router.get('/:campaignId/dial-rate/metrics', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const metrics = await controller.calculateCurrentMetrics(campaignId);

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Error getting dial rate metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/:campaignId/dial-rate/start-monitoring
   * Start real-time monitoring
   */
  router.post('/:campaignId/dial-rate/start-monitoring', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      controller.startMonitoring(campaignId);

      res.json({
        success: true,
        message: 'Real-time monitoring started'
      });

    } catch (error) {
      console.error('Error starting monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/:campaignId/dial-rate/stop-monitoring
   * Stop real-time monitoring
   */
  router.post('/:campaignId/dial-rate/stop-monitoring', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      controller.stopMonitoring(campaignId);

      res.json({
        success: true,
        message: 'Real-time monitoring stopped'
      });

    } catch (error) {
      console.error('Error stopping monitoring:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/campaigns/:campaignId/dial-rate/emergency-adjust
   * Emergency dial rate adjustment
   */
  router.post('/:campaignId/dial-rate/emergency-adjust', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { dialRate, reason } = req.body;

      if (!dialRate || !reason) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: dialRate, reason'
        });
      }

      if (dialRate < 0.1 || dialRate > 10) {
        return res.status(400).json({
          success: false,
          error: 'Dial rate must be between 0.1 and 10.0'
        });
      }

      const success = await controller.emergencyAdjustment(campaignId, dialRate, reason);

      if (success) {
        res.json({
          success: true,
          message: 'Emergency adjustment applied successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Failed to apply emergency adjustment'
        });
      }

    } catch (error) {
      console.error('Error in emergency adjustment:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/campaigns/:campaignId/dial-rate/history
   * Get adjustment history
   */
  router.get('/:campaignId/dial-rate/history', requireRole('SUPERVISOR', 'ADMIN'), async (req, res) => {
    try {
      const { campaignId } = req.params;
      const history = controller.getAdjustmentHistory(campaignId);

      res.json({
        success: true,
        data: history
      });

    } catch (error) {
      console.error('Error getting adjustment history:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}

export default createDialRateRoutes;