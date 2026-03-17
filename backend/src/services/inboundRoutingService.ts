// Inbound Call Routing Service
import { callEvents, agentEvents, queueEvents } from '../utils/eventHelpers';
import { EventPriority } from '../types/events';
import { redisClient } from '../config/redis';

// Agent availability status
export enum AgentStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  ON_BREAK = 'on_break',
  IN_MEETING = 'in_meeting',
  OFFLINE = 'offline',
  AWAY = 'away',
}

// Call priority levels
export enum CallPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
  EMERGENCY = 5,
}

// Routing strategies
export enum RoutingStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_BUSY = 'least_busy',
  SKILL_BASED = 'skill_based',
  PRIORITY_BASED = 'priority_based',
  LONGEST_IDLE = 'longest_idle',
}

// Agent skills
interface AgentSkill {
  skillId: string;
  skillName: string;
  proficiencyLevel: number; // 1-10
  certified: boolean;
}

// Agent availability data
interface AgentAvailability {
  agentId: string;
  agentName: string;
  status: AgentStatus;
  skills: AgentSkill[];
  maxConcurrentCalls: number;
  currentCalls: number;
  lastStatusChange: Date;
  availableSince?: Date;
  totalCallsToday: number;
  averageCallDuration: number;
  currentWorkload: number; // 0-100%
  priority: number; // Agent priority for routing
  metadata: Record<string, any>;
}

// Inbound call data
interface InboundCall {
  callId: string;
  sipCallId: string;
  fromNumber: string;
  toNumber: string;
  callerName?: string;
  priority: CallPriority;
  requiredSkills: string[];
  campaignId?: string;
  queueId?: string;
  routingAttempts: number;
  queueStartTime: Date;
  estimatedWaitTime: number;
  metadata: Record<string, any>;
}

// Routing rule configuration
interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: {
    callerNumber?: string[];
    callerRegex?: string;
    timeOfDay?: { start: string; end: string };
    dayOfWeek?: number[]; // 0-6 (Sunday-Saturday)
    requiredSkills?: string[];
    campaignId?: string;
  };
  action: {
    strategy: RoutingStrategy;
    targetAgents?: string[];
    targetSkills?: string[];
    maxWaitTime: number;
    fallbackQueue?: string;
    playMessage?: string;
  };
  isActive: boolean;
  metadata: Record<string, any>;
}

// Default routing rules
const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  {
    id: 'vip_customer_rule',
    name: 'VIP Customer Priority',
    priority: 1,
    conditions: {
      callerRegex: '^\\+1555', // Example VIP prefix
      requiredSkills: ['vip_support'],
    },
    action: {
      strategy: RoutingStrategy.SKILL_BASED,
      targetSkills: ['vip_support', 'senior_support'],
      maxWaitTime: 30, // 30 seconds max wait
      playMessage: 'Welcome VIP customer, connecting you to our premium support team.',
    },
    isActive: true,
    metadata: { description: 'Route VIP customers to senior agents' },
  },
  {
    id: 'business_hours_rule',
    name: 'Business Hours - Skill Based',
    priority: 2,
    conditions: {
      timeOfDay: { start: '09:00', end: '17:00' },
      dayOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
    },
    action: {
      strategy: RoutingStrategy.SKILL_BASED,
      maxWaitTime: 120, // 2 minutes max wait
      playMessage: 'Thank you for calling. Please hold while we connect you to the next available agent.',
    },
    isActive: true,
    metadata: { description: 'Standard business hours routing' },
  },
  {
    id: 'after_hours_rule',
    name: 'After Hours - Round Robin',
    priority: 3,
    conditions: {
      timeOfDay: { start: '17:01', end: '08:59' },
    },
    action: {
      strategy: RoutingStrategy.ROUND_ROBIN,
      maxWaitTime: 300, // 5 minutes max wait
      playMessage: 'You are calling outside business hours. Your call is important to us.',
    },
    isActive: true,
    metadata: { description: 'After hours routing to available agents' },
  },
  {
    id: 'fallback_rule',
    name: 'Default Fallback',
    priority: 999,
    conditions: {},
    action: {
      strategy: RoutingStrategy.LONGEST_IDLE,
      maxWaitTime: 600, // 10 minutes max wait
      playMessage: 'All agents are currently busy. Your call will be answered in the order it was received.',
    },
    isActive: true,
    metadata: { description: 'Fallback rule for all other calls' },
  },
];

class InboundCallRoutingService {
  private availableAgents: Map<string, AgentAvailability> = new Map();
  private callQueue: Map<string, InboundCall> = new Map();
  private routingRules: RoutingRule[] = [];
  private routingStats = {
    totalCallsRouted: 0,
    averageWaitTime: 0,
    abandonedCalls: 0,
    successfulRoutes: 0,
  };

  constructor() {
    this.loadDefaultRoutingRules();
    this.startQueueProcessor();
  }

  /**
   * Load default routing rules
   */
  private loadDefaultRoutingRules(): void {
    this.routingRules = DEFAULT_ROUTING_RULES.sort((a, b) => a.priority - b.priority);
    console.log(`📋 Loaded ${DEFAULT_ROUTING_RULES.length} default routing rules`);
  }

  /**
   * Update agent availability status
   */
  async updateAgentAvailability(agentId: string, data: Partial<AgentAvailability>): Promise<void> {
    try {
      const existing = this.availableAgents.get(agentId);
      const updated: AgentAvailability = {
        agentId,
        agentName: data.agentName || existing?.agentName || agentId,
        status: data.status || existing?.status || AgentStatus.OFFLINE,
        skills: data.skills || existing?.skills || [],
        maxConcurrentCalls: data.maxConcurrentCalls || existing?.maxConcurrentCalls || 1,
        currentCalls: data.currentCalls || existing?.currentCalls || 0,
        lastStatusChange: new Date(),
        availableSince: data.status === AgentStatus.AVAILABLE && existing?.status !== AgentStatus.AVAILABLE 
          ? new Date() 
          : existing?.availableSince,
        totalCallsToday: data.totalCallsToday || existing?.totalCallsToday || 0,
        averageCallDuration: data.averageCallDuration || existing?.averageCallDuration || 0,
        currentWorkload: data.currentCalls ? Math.round((data.currentCalls / (data.maxConcurrentCalls || 1)) * 100) : 0,
        priority: data.priority || existing?.priority || 1,
        metadata: { ...existing?.metadata, ...data.metadata },
      };

      this.availableAgents.set(agentId, updated);

      // Persist to Redis
      await this.persistAgentAvailability(updated);

      // Emit agent status event
      await agentEvents.statusChanged({
        agentId,
        agentName: updated.agentName,
        status: updated.status,
        previousStatus: existing?.status,
        metadata: {
          currentCalls: updated.currentCalls,
          workload: updated.currentWorkload,
          skills: updated.skills.map(s => s.skillName),
        },
      });

      console.log(`👤 Agent ${agentId} status updated: ${updated.status}`);

      // Try to process queued calls if agent became available
      if (updated.status === AgentStatus.AVAILABLE && updated.currentCalls < updated.maxConcurrentCalls) {
        this.processCallQueue();
      }

    } catch (error) {
      console.error('Error updating agent availability:', error);
      throw error;
    }
  }

  /**
   * Add incoming call to routing system
   */
  async routeInboundCall(params: {
    callId: string;
    sipCallId: string;
    fromNumber: string;
    toNumber: string;
    callerName?: string;
    campaignId?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; agentId?: string; queuePosition?: number; estimatedWaitTime?: number }> {
    const { callId, sipCallId, fromNumber, toNumber, callerName, campaignId, metadata = {} } = params;

    try {
      // Determine call priority and required skills
      const { priority, requiredSkills } = await this.analyzeIncomingCall(fromNumber, toNumber, campaignId, metadata);

      // Create inbound call record
      const inboundCall: InboundCall = {
        callId,
        sipCallId,
        fromNumber,
        toNumber,
        callerName,
        priority,
        requiredSkills,
        campaignId,
        routingAttempts: 0,
        queueStartTime: new Date(),
        estimatedWaitTime: 0,
        metadata,
      };

      // Find matching routing rule
      const rule = this.findMatchingRoutingRule(inboundCall);
      
      // Try immediate routing
      const availableAgent = await this.findAvailableAgent(inboundCall, rule);
      
      if (availableAgent) {
        // Route immediately
        await this.assignCallToAgent(callId, availableAgent.agentId);
        
        console.log(`📞 Call ${callId} immediately routed to agent ${availableAgent.agentId}`);
        
        return {
          success: true,
          agentId: availableAgent.agentId,
        };
      } else {
        // Add to queue
        this.callQueue.set(callId, inboundCall);
        const queuePosition = this.getQueuePosition(inboundCall);
        const estimatedWaitTime = this.calculateEstimatedWaitTime(queuePosition);

        // Update call with queue information
        inboundCall.queueId = `queue_${Date.now()}`;
        inboundCall.estimatedWaitTime = estimatedWaitTime;

        // Persist queue state
        await this.persistCallQueue();

        // Emit queue event
        await queueEvents.contactAdded({
          contactId: callId,
          campaignId: campaignId || 'inbound',
          position: queuePosition,
          estimatedWaitTime,
          metadata: {
            fromNumber,
            toNumber,
            requiredSkills,
            sipCallId,
          },
        });

        console.log(`📞 Call ${callId} queued at position ${queuePosition} (EWT: ${estimatedWaitTime}s)`);
        
        return {
          success: true,
          queuePosition,
          estimatedWaitTime,
        };
      }

    } catch (error) {
      console.error('Error routing inbound call:', error);
      
      // Emit failed routing event
      await callEvents.failed({
        callId,
        sipCallId,
        direction: 'inbound',
        phoneNumber: fromNumber,
        reason: 'Routing failed',
      });

      return { success: false };
    }
  }

  /**
   * Remove call from queue (abandoned or answered elsewhere)
   */
  async removeCallFromQueue(callId: string, reason: 'answered' | 'abandoned' | 'timeout'): Promise<void> {
    const call = this.callQueue.get(callId);
    if (!call) return;

    this.callQueue.delete(callId);
    
    if (reason === 'abandoned') {
      this.routingStats.abandonedCalls++;
    }

    // Emit queue event
    await queueEvents.contactRemoved({
      contactId: callId,
      campaignId: call.campaignId || 'inbound',
      metadata: {
        reason,
        waitTime: Math.floor((Date.now() - call.queueStartTime.getTime()) / 1000),
      },
    });

    console.log(`📞 Call ${callId} removed from queue: ${reason}`);
  }

  /**
   * Get agent availability status
   */
  getAgentAvailability(agentId: string): AgentAvailability | undefined {
    return this.availableAgents.get(agentId);
  }

  /**
   * Get all available agents
   */
  getAvailableAgents(): AgentAvailability[] {
    return Array.from(this.availableAgents.values())
      .filter(agent => agent.status === AgentStatus.AVAILABLE && agent.currentCalls < agent.maxConcurrentCalls)
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): {
    totalCalls: number;
    averageWaitTime: number;
    longestWaitTime: number;
    callsByPriority: Record<string, number>;
  } {
    const queuedCalls = Array.from(this.callQueue.values());
    const currentTime = Date.now();
    
    let totalWaitTime = 0;
    let longestWaitTime = 0;
    const callsByPriority: Record<string, number> = {};

    queuedCalls.forEach(call => {
      const waitTime = Math.floor((currentTime - call.queueStartTime.getTime()) / 1000);
      totalWaitTime += waitTime;
      longestWaitTime = Math.max(longestWaitTime, waitTime);
      
      const priorityKey = CallPriority[call.priority];
      callsByPriority[priorityKey] = (callsByPriority[priorityKey] || 0) + 1;
    });

    return {
      totalCalls: queuedCalls.length,
      averageWaitTime: queuedCalls.length > 0 ? Math.round(totalWaitTime / queuedCalls.length) : 0,
      longestWaitTime,
      callsByPriority,
    };
  }

  /**
   * Get routing statistics
   */
  getRoutingStatistics(): object {
    const availableAgents = this.getAvailableAgents();
    const queueStatus = this.getQueueStatus();

    return {
      ...this.routingStats,
      currentQueue: queueStatus,
      agentSummary: {
        totalAgents: this.availableAgents.size,
        availableAgents: availableAgents.length,
        busyAgents: Array.from(this.availableAgents.values()).filter(a => a.status === AgentStatus.BUSY).length,
        offlineAgents: Array.from(this.availableAgents.values()).filter(a => a.status === AgentStatus.OFFLINE).length,
      },
    };
  }

  // Private helper methods

  private async analyzeIncomingCall(
    fromNumber: string, 
    toNumber: string, 
    campaignId?: string, 
    metadata?: Record<string, any>
  ): Promise<{ priority: CallPriority; requiredSkills: string[] }> {
    // Basic analysis - can be enhanced with external data sources
    let priority = CallPriority.NORMAL;
    let requiredSkills: string[] = [];

    // VIP number detection
    if (fromNumber.startsWith('+1555')) {
      priority = CallPriority.HIGH;
      requiredSkills.push('vip_support');
    }

    // Emergency detection
    if (metadata?.emergency || fromNumber.includes('911')) {
      priority = CallPriority.EMERGENCY;
      requiredSkills.push('emergency_support');
    }

    // Campaign-specific skills
    if (campaignId) {
      // TODO: Fetch campaign-specific required skills
      requiredSkills.push('general_support');
    }

    return { priority, requiredSkills };
  }

  private findMatchingRoutingRule(call: InboundCall): RoutingRule {
    const now = new Date();
    const timeString = now.toTimeString().substr(0, 5); // HH:MM
    const dayOfWeek = now.getDay();

    for (const rule of this.routingRules) {
      if (!rule.isActive) continue;

      const { conditions } = rule;
      let matches = true;

      // Check caller number conditions
      if (conditions.callerNumber && !conditions.callerNumber.includes(call.fromNumber)) {
        matches = false;
      }

      // Check caller regex
      if (conditions.callerRegex && !new RegExp(conditions.callerRegex).test(call.fromNumber)) {
        matches = false;
      }

      // Check time of day
      if (conditions.timeOfDay) {
        const { start, end } = conditions.timeOfDay;
        if (start <= end) {
          // Same day range
          if (timeString < start || timeString > end) matches = false;
        } else {
          // Overnight range
          if (timeString < start && timeString > end) matches = false;
        }
      }

      // Check day of week
      if (conditions.dayOfWeek && !conditions.dayOfWeek.includes(dayOfWeek)) {
        matches = false;
      }

      // Check required skills
      if (conditions.requiredSkills) {
        const hasAllSkills = conditions.requiredSkills.every(skill => 
          call.requiredSkills.includes(skill)
        );
        if (!hasAllSkills) matches = false;
      }

      // Check campaign
      if (conditions.campaignId && conditions.campaignId !== call.campaignId) {
        matches = false;
      }

      if (matches) {
        console.log(`📋 Call ${call.callId} matched routing rule: ${rule.name}`);
        return rule;
      }
    }

    // Return fallback rule
    return this.routingRules[this.routingRules.length - 1];
  }

  private async findAvailableAgent(call: InboundCall, rule: RoutingRule): Promise<AgentAvailability | null> {
    let candidates = this.getAvailableAgents();

    // Filter by target agents if specified
    if (rule.action.targetAgents?.length) {
      candidates = candidates.filter(agent => rule.action.targetAgents!.includes(agent.agentId));
    }

    // Filter by required skills
    const allRequiredSkills = [...call.requiredSkills, ...(rule.action.targetSkills || [])];
    if (allRequiredSkills.length > 0) {
      candidates = candidates.filter(agent => 
        allRequiredSkills.every(requiredSkill =>
          agent.skills.some(agentSkill => 
            agentSkill.skillName === requiredSkill && 
            agentSkill.certified && 
            agentSkill.proficiencyLevel >= 5
          )
        )
      );
    }

    if (candidates.length === 0) {
      return null;
    }

    // Apply routing strategy
    switch (rule.action.strategy) {
      case RoutingStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(candidates);
      
      case RoutingStrategy.LEAST_BUSY:
        return this.selectLeastBusy(candidates);
      
      case RoutingStrategy.SKILL_BASED:
        return this.selectSkillBased(candidates, allRequiredSkills);
      
      case RoutingStrategy.PRIORITY_BASED:
        return this.selectPriorityBased(candidates);
      
      case RoutingStrategy.LONGEST_IDLE:
        return this.selectLongestIdle(candidates);
      
      default:
        return candidates[0];
    }
  }

  private selectRoundRobin(candidates: AgentAvailability[]): AgentAvailability {
    // Simple round-robin based on last assignment time
    return candidates.sort((a, b) => 
      (a.metadata.lastAssignmentTime || 0) - (b.metadata.lastAssignmentTime || 0)
    )[0];
  }

  private selectLeastBusy(candidates: AgentAvailability[]): AgentAvailability {
    return candidates.sort((a, b) => a.currentWorkload - b.currentWorkload)[0];
  }

  private selectSkillBased(candidates: AgentAvailability[], requiredSkills: string[]): AgentAvailability {
    // Score agents based on skill proficiency
    const scored = candidates.map(agent => {
      let skillScore = 0;
      let skillCount = 0;

      requiredSkills.forEach(skill => {
        const agentSkill = agent.skills.find(s => s.skillName === skill);
        if (agentSkill) {
          skillScore += agentSkill.proficiencyLevel;
          skillCount++;
        }
      });

      return {
        agent,
        score: skillCount > 0 ? skillScore / skillCount : 0,
      };
    });

    return scored.sort((a, b) => b.score - a.score)[0].agent;
  }

  private selectPriorityBased(candidates: AgentAvailability[]): AgentAvailability {
    return candidates.sort((a, b) => b.priority - a.priority)[0];
  }

  private selectLongestIdle(candidates: AgentAvailability[]): AgentAvailability {
    return candidates.sort((a, b) => {
      const aIdle = a.availableSince ? Date.now() - a.availableSince.getTime() : 0;
      const bIdle = b.availableSince ? Date.now() - b.availableSince.getTime() : 0;
      return bIdle - aIdle;
    })[0];
  }

  private async assignCallToAgent(callId: string, agentId: string): Promise<void> {
    const agent = this.availableAgents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    // Update agent call count
    agent.currentCalls++;
    agent.currentWorkload = Math.round((agent.currentCalls / agent.maxConcurrentCalls) * 100);
    agent.metadata.lastAssignmentTime = Date.now();

    if (agent.currentCalls >= agent.maxConcurrentCalls) {
      agent.status = AgentStatus.BUSY;
    }

    await this.persistAgentAvailability(agent);

    // Update routing stats
    this.routingStats.successfulRoutes++;
    this.routingStats.totalCallsRouted++;

    // Remove from queue if it was queued
    await this.removeCallFromQueue(callId, 'answered');

    console.log(`📞 Call ${callId} assigned to agent ${agentId}`);
  }

  private getQueuePosition(call: InboundCall): number {
    const queuedCalls = Array.from(this.callQueue.values())
      .sort((a, b) => {
        // Sort by priority first, then by queue time
        if (a.priority !== b.priority) {
          return b.priority - a.priority; // Higher priority first
        }
        return a.queueStartTime.getTime() - b.queueStartTime.getTime();
      });

    return queuedCalls.findIndex(c => c.callId === call.callId) + 1;
  }

  private calculateEstimatedWaitTime(queuePosition: number): number {
    const averageCallDuration = 180; // 3 minutes default
    const availableAgentCount = this.getAvailableAgents().length;
    
    if (availableAgentCount === 0) {
      return queuePosition * averageCallDuration;
    }

    return Math.round((queuePosition * averageCallDuration) / availableAgentCount);
  }

  private async processCallQueue(): Promise<void> {
    if (this.callQueue.size === 0) return;

    const queuedCalls = Array.from(this.callQueue.values())
      .sort((a, b) => {
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.queueStartTime.getTime() - b.queueStartTime.getTime();
      });

    for (const call of queuedCalls) {
      const rule = this.findMatchingRoutingRule(call);
      const availableAgent = await this.findAvailableAgent(call, rule);

      if (availableAgent) {
        await this.assignCallToAgent(call.callId, availableAgent.agentId);
        
        // Emit routing event
        await callEvents.connected({
          callId: call.callId,
          sipCallId: call.sipCallId,
          agentId: availableAgent.agentId,
          direction: 'inbound',
          phoneNumber: call.fromNumber,
          status: 'in-progress',
        });
        
        break; // Process one at a time to avoid race conditions
      }
    }
  }

  private startQueueProcessor(): void {
    // Process queue every 5 seconds
    setInterval(() => {
      this.processCallQueue();
    }, 5000);

    console.log('📞 Queue processor started');
  }

  private async persistAgentAvailability(agent: AgentAvailability): Promise<void> {
    try {
      const key = `agent:availability:${agent.agentId}`;
      const data = JSON.stringify({
        ...agent,
        lastStatusChange: agent.lastStatusChange.toISOString(),
        availableSince: agent.availableSince?.toISOString(),
      });
      
      await redisClient.setEx(key, 24 * 60 * 60, data); // 24 hours TTL
      
      // Index by status
      await redisClient.sAdd(`agents:status:${agent.status}`, agent.agentId);
      
    } catch (error) {
      console.warn('⚠️ Failed to persist agent availability to Redis:', error);
    }
  }

  private async persistCallQueue(): Promise<void> {
    try {
      const queueData = Array.from(this.callQueue.entries()).map(([id, call]) => ({
        id,
        sipCallId: call.sipCallId,
        fromNumber: call.fromNumber,
        toNumber: call.toNumber,
        callerName: call.callerName,
        priority: call.priority,
        requiredSkills: call.requiredSkills,
        campaignId: call.campaignId,
        queueId: call.queueId,
        routingAttempts: call.routingAttempts,
        queueStartTime: call.queueStartTime.toISOString(),
        estimatedWaitTime: call.estimatedWaitTime,
        metadata: call.metadata,
      }));
      
      await redisClient.set('call_queue', JSON.stringify(queueData), { EX: 60 * 60 }); // 1 hour TTL
      
    } catch (error) {
      console.warn('⚠️ Failed to persist call queue to Redis:', error);
    }
  }
}

// Create and export singleton instance
export const inboundRoutingService = new InboundCallRoutingService();
export default inboundRoutingService;