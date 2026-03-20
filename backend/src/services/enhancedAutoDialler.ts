/**
 * Enhanced Auto-Dialler Engine
 * Real-time dialling with configurable rate and intelligent routing
 */

import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';
import { RealTimeDialRateController, DialRateConfig } from '../controllers/dialRateController';

export interface DiallerState {
  campaignId: string;
  isRunning: boolean;
  activeAgents: string[];
  callsInProgress: Map<string, any>;
  lastDialTime: Date;
  currentRate: number;
  queuePosition: number;
  totalQueued: number;
}

export interface DialRequest {
  contactId: string;
  listId: string;
  priority: number;
  attemptCount: number;
  lastAttempt?: Date;
  agentId?: string;
}

export class EnhancedAutoDialler {
  private prisma: PrismaClient;
  private io: Server;
  private dialRateController: RealTimeDialRateController;
  private activeDiallers: Map<string, DiallerState> = new Map();
  private diallingIntervals: Map<string, NodeJS.Timer> = new Map();
  private queueCache: Map<string, DialRequest[]> = new Map();

  constructor(prisma: PrismaClient, io: Server) {
    this.prisma = prisma;
    this.io = io;
    this.dialRateController = new RealTimeDialRateController(prisma, io);
  }

  /**
   * Start auto-dialling for campaign
   */
  async startDialling(campaignId: string): Promise<boolean> {
    try {
      console.log(`🎯 Starting auto-dialler for campaign ${campaignId}`);

      // Get campaign configuration
      const config = await this.dialRateController.getDialRateConfig(campaignId);
      if (!config) {
        throw new Error('Campaign configuration not found');
      }

      // Get active agents for campaign
      const activeAgents = await this.getActiveAgents(campaignId);
      if (activeAgents.length === 0) {
        throw new Error('No active agents available for campaign');
      }

      // Initialize dialler state
      const state: DiallerState = {
        campaignId,
        isRunning: true,
        activeAgents,
        callsInProgress: new Map(),
        lastDialTime: new Date(),
        currentRate: config.dialRate,
        queuePosition: 0,
        totalQueued: 0
      };

      this.activeDiallers.set(campaignId, state);

      // Build initial dial queue
      await this.buildDialQueue(campaignId, config);

      // Start dialling process
      await this.startDiallingProcess(campaignId, config);

      // Start monitoring
      this.dialRateController.startMonitoring(campaignId);

      // Notify clients
      this.io.to(`campaign:${campaignId}`).emit('autoDialler:started', {
        campaignId,
        activeAgents: activeAgents.length,
        dialRate: config.dialRate,
        timestamp: new Date()
      });

      console.log(`✅ Auto-dialler started for campaign ${campaignId} with ${activeAgents.length} agents`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to start auto-dialler for ${campaignId}:`, error);
      return false;
    }
  }

  /**
   * Stop auto-dialling for campaign
   */
  async stopDialling(campaignId: string): Promise<boolean> {
    try {
      console.log(`⏹️ Stopping auto-dialler for campaign ${campaignId}`);

      const state = this.activeDiallers.get(campaignId);
      if (state) {
        state.isRunning = false;
      }

      // Clear dialling interval
      const interval = this.diallingIntervals.get(campaignId);
      if (interval) {
        clearInterval(interval as any);
        this.diallingIntervals.delete(campaignId);
      }

      // Stop monitoring
      this.dialRateController.stopMonitoring(campaignId);

      // Clean up
      this.activeDiallers.delete(campaignId);
      this.queueCache.delete(campaignId);

      // Notify clients
      this.io.to(`campaign:${campaignId}`).emit('autoDialler:stopped', {
        campaignId,
        timestamp: new Date()
      });

      console.log(`✅ Auto-dialler stopped for campaign ${campaignId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to stop auto-dialler for ${campaignId}:`, error);
      return false;
    }
  }

  /**
   * Build dial queue based on campaign configuration
   */
  private async buildDialQueue(campaignId: string, config: DialRateConfig): Promise<void> {
    try {
      console.log(`📋 Building dial queue for campaign ${campaignId}`);

      // Get contacts for dialling
      const contacts = await this.prisma.contact.findMany({
        where: {
          list: {
            campaignId
          },
          status: { in: ['new', 'callback'] },
          locked: false,
          OR: [
            { nextAttempt: null },
            { nextAttempt: { lte: new Date() } }
          ],
          attemptCount: { lt: 3 } // Max attempts
        },
        include: {
          list: true
        },
        orderBy: [
          { nextAttempt: 'asc' },
          { createdAt: 'asc' }
        ],
        take: 1000 // Initial queue size
      });

      // Build dial requests with priority
      const dialRequests: DialRequest[] = contacts.map(contact => ({
        contactId: contact.contactId,
        listId: contact.listId,
        priority: this.calculateContactPriority(contact, config),
        attemptCount: contact.attemptCount,
        lastAttempt: contact.lastAttempt
      }));

      // Sort by priority and routing strategy
      dialRequests.sort((a, b) => {
        if (config.priorityRouting) {
          if (a.priority !== b.priority) return b.priority - a.priority;
        }
        
        // Secondary sort by attempt count (fewer attempts first)
        return a.attemptCount - b.attemptCount;
      });

      this.queueCache.set(campaignId, dialRequests);

      // Update state
      const state = this.activeDiallers.get(campaignId);
      if (state) {
        state.totalQueued = dialRequests.length;
        state.queuePosition = 0;
      }

      console.log(`📊 Built queue with ${dialRequests.length} contacts for campaign ${campaignId}`);

    } catch (error) {
      console.error(`❌ Error building dial queue for ${campaignId}:`, error);
      throw error;
    }
  }

  /**
   * Start the dialling process with rate control
   */
  private async startDiallingProcess(campaignId: string, config: DialRateConfig): Promise<void> {
    const state = this.activeDiallers.get(campaignId);
    if (!state) return;

    // Calculate interval based on dial rate and active agents
    const intervalMs = this.calculateDialInterval(config, state.activeAgents.length);

    console.log(`⚡ Starting dialling process: ${config.dialRate} calls/sec, interval ${intervalMs}ms`);

    const interval = setInterval(async () => {
      try {
        if (!state.isRunning) {
          clearInterval(interval as any);
          return;
        }

        // Refresh config for real-time updates
        const currentConfig = await this.dialRateController.getDialRateConfig(campaignId);
        if (currentConfig) {
          await this.processDiallingCycle(campaignId, currentConfig, state);
        }

      } catch (error) {
        console.error(`❌ Error in dialling cycle for ${campaignId}:`, error);
      }
    }, intervalMs);

    this.diallingIntervals.set(campaignId, interval);
  }

  /**
   * Process a single dialling cycle
   */
  private async processDiallingCycle(campaignId: string, config: DialRateConfig, state: DiallerState): Promise<void> {
    const queue = this.queueCache.get(campaignId) || [];
    const availableAgents = await this.getAvailableAgents(campaignId, state.activeAgents);

    // Calculate how many calls to make this cycle
    const callsToMake = Math.min(
      Math.floor(config.dialRate * config.predictiveRatio),
      availableAgents.length,
      queue.length - state.queuePosition
    );

    if (callsToMake <= 0) {
      // No calls to make - check if we need to rebuild queue
      if (state.queuePosition >= queue.length) {
        await this.buildDialQueue(campaignId, config);
      }
      return;
    }

    console.log(`📞 Making ${callsToMake} calls for campaign ${campaignId}`);

    // Make calls
    for (let i = 0; i < callsToMake; i++) {
      const request = queue[state.queuePosition + i];
      if (!request) break;

      const agentId = await this.selectAgent(availableAgents, config.routingStrategy);
      if (agentId) {
        await this.initiateCall(campaignId, request, agentId, config);
        availableAgents.splice(availableAgents.indexOf(agentId), 1); // Remove from available
      }
    }

    // Update queue position
    state.queuePosition += callsToMake;
    state.lastDialTime = new Date();

    // Emit progress update
    this.io.to(`campaign:${campaignId}`).emit('autoDialler:progress', {
      campaignId,
      queuePosition: state.queuePosition,
      totalQueued: state.totalQueued,
      callsInProgress: state.callsInProgress.size,
      activeAgents: state.activeAgents.length,
      timestamp: new Date()
    });
  }

  /**
   * Initiate a call
   */
  private async initiateCall(
    campaignId: string, 
    request: DialRequest, 
    agentId: string, 
    config: DialRateConfig
  ): Promise<void> {
    try {
      // Get contact information first
      const contact = await this.prisma.contact.findUnique({
        where: { contactId: request.contactId },
        select: { phone: true, firstName: true, lastName: true }
      });

      if (!contact?.phone) {
        throw new Error(`Contact ${request.contactId} has no phone number`);
      }

      // Create call record
      const callRecord = await this.prisma.callRecord.create({
        data: {
          callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          campaignId,
          contactId: request.contactId,
          agentId,
          phoneNumber: contact.phone,
          outcome: 'DIALLING',
          startTime: new Date(),
          callType: 'outbound'
        }
      });

      // Update contact attempt count
      await this.prisma.contact.update({
        where: { contactId: request.contactId },
        data: {
          attemptCount: { increment: 1 },
          lastAttempt: new Date(),
          lastAgentId: agentId
        }
      });

      // Add to calls in progress
      const state = this.activeDiallers.get(campaignId);
      if (state) {
        state.callsInProgress.set(callRecord.callId, {
          callId: callRecord.callId,
          contactId: request.contactId,
          agentId,
          startTime: new Date()
        });
      }

      // Emit call initiated event
      this.io.to(`agent:${agentId}`).emit('call:initiated', {
        callId: callRecord.callId,
        contactId: request.contactId,
        campaignId,
        timestamp: new Date()
      });

      console.log(`📞 Initiated call ${callRecord.callId} for contact ${request.contactId} to agent ${agentId}`);

    } catch (error) {
      console.error(`❌ Error initiating call for contact ${request.contactId}:`, error);
    }
  }

  /**
   * Calculate contact priority based on various factors
   */
  private calculateContactPriority(contact: any, config: DialRateConfig): number {
    let priority = 100; // Base priority

    // Increase priority for callbacks
    if (contact.status === 'callback') {
      priority += 50;
    }

    // Decrease priority based on attempt count
    priority -= contact.attemptCount * 20;

    // Time-based priority
    if (contact.lastAttempt) {
      const hoursSinceLastAttempt = (Date.now() - contact.lastAttempt.getTime()) / (1000 * 60 * 60);
      priority += Math.min(hoursSinceLastAttempt * 5, 30);
    }

    return Math.max(priority, 0);
  }

  /**
   * Calculate dial interval based on rate and agents
   */
  private calculateDialInterval(config: DialRateConfig, agentCount: number): number {
    const callsPerSecond = config.dialRate * agentCount;
    const intervalMs = Math.max(config.minWaitTime, Math.min(1000 / callsPerSecond, config.maxWaitTime));
    return Math.round(intervalMs);
  }

  /**
   * Get active agents for campaign
   */
  private async getActiveAgents(campaignId: string): Promise<string[]> {
    const assignments = await this.prisma.agentCampaignAssignment.findMany({
      where: {
        campaignId,
        agent: {
          status: { in: ['Available', 'On Call'] },
          isLoggedIn: true
        }
      },
      include: { agent: true }
    });

    return assignments.map(a => a.agentId);
  }

  /**
   * Get available agents (not currently on a call)
   */
  private async getAvailableAgents(campaignId: string, activeAgents: string[]): Promise<string[]> {
    const busyAgents = await this.prisma.callRecord.findMany({
      where: {
        campaignId,
        outcome: { in: ['DIALLING', 'CONNECTED', 'IN_PROGRESS'] },
        agentId: { in: activeAgents }
      },
      select: { agentId: true }
    });

    const busyAgentIds = new Set(busyAgents.map(c => c.agentId));
    return activeAgents.filter(agentId => !busyAgentIds.has(agentId));
  }

  /**
   * Select agent based on routing strategy
   */
  private async selectAgent(availableAgents: string[], strategy: string): Promise<string | null> {
    if (availableAgents.length === 0) return null;

    switch (strategy) {
      case 'ROUND_ROBIN':
        return availableAgents[0]; // Simple round-robin

      case 'LEAST_BUSY':
        // Select agent with fewest active calls
        const callCounts = await Promise.all(
          availableAgents.map(async agentId => ({
            agentId,
            count: await this.prisma.callRecord.count({
              where: { 
                agentId, 
                outcome: { in: ['CONNECTED', 'IN_PROGRESS'] } 
              }
            })
          }))
        );
        
        callCounts.sort((a, b) => a.count - b.count);
        return callCounts[0].agentId;

      case 'SKILL_BASED':
        // For now, return first available (would integrate with skill mapping)
        return availableAgents[0];

      case 'PRIORITY':
        // Return highest priority agent (would integrate with priority mapping)
        return availableAgents[0];

      default:
        return availableAgents[0];
    }
  }

  /**
   * Handle call completion
   */
  async handleCallComplete(callId: string, outcome: string): Promise<void> {
    try {
      // Find the campaign for this call
      const callRecord = await this.prisma.callRecord.findUnique({
        where: { callId },
        select: { campaignId: true }
      });

      if (!callRecord) return;

      const state = this.activeDiallers.get(callRecord.campaignId);
      if (state) {
        state.callsInProgress.delete(callId);
      }

      console.log(`✅ Call ${callId} completed with outcome: ${outcome}`);

    } catch (error) {
      console.error(`❌ Error handling call completion for ${callId}:`, error);
    }
  }

  /**
   * Get dialler status
   */
  getDiallerStatus(campaignId: string): DiallerState | null {
    return this.activeDiallers.get(campaignId) || null;
  }

  /**
   * Emergency stop all diallers
   */
  async emergencyStopAll(): Promise<void> {
    console.log('🚨 Emergency stop all auto-diallers');

    for (const campaignId of this.activeDiallers.keys()) {
      await this.stopDialling(campaignId);
    }
  }

  /**
   * Cleanup
   */
  shutdown(): void {
    for (const campaignId of this.activeDiallers.keys()) {
      this.stopDialling(campaignId);
    }
    this.dialRateController.shutdown();
    console.log('📞 Enhanced auto-dialler shutdown complete');
  }
}

export default EnhancedAutoDialler;