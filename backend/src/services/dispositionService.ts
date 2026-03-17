// Disposition Collection Service
import { callEvents, systemEvents } from '../utils/eventHelpers';
import { EventPriority } from '../types/events';
import { redisClient } from '../config/redis';

// Disposition types
export enum DispositionType {
  // Contact dispositions
  CONTACT = 'contact',
  NO_CONTACT = 'no_contact',
  CALLBACK = 'callback',
  NOT_INTERESTED = 'not_interested',
  
  // Call outcome dispositions
  SALE = 'sale',
  LEAD = 'lead',
  APPOINTMENT = 'appointment',
  
  // Technical dispositions
  BUSY = 'busy',
  NO_ANSWER = 'no_answer',
  ANSWERING_MACHINE = 'answering_machine',
  DISCONNECTED = 'disconnected',
  WRONG_NUMBER = 'wrong_number',
  
  // Quality dispositions
  DO_NOT_CALL = 'do_not_call',
  DUPLICATE = 'duplicate',
  INVALID = 'invalid',
}

// Disposition categories for reporting
export enum DispositionCategory {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  CALLBACK_REQUIRED = 'callback_required',
  TECHNICAL_ISSUE = 'technical_issue',
  QUALITY_ISSUE = 'quality_issue',
}

// Disposition outcome for analytics
export enum DispositionOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  PENDING = 'pending',
  FOLLOW_UP = 'follow_up',
}

// Disposition configuration
export interface DispositionConfig {
  id: string;
  label: string;
  type: DispositionType;
  category: DispositionCategory;
  outcome: DispositionOutcome;
  description: string;
  requiresNotes: boolean;
  requiresCallback: boolean;
  allowedNextSteps: string[];
  color: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  campaignSpecific: boolean;
  metadata: Record<string, any>;
}

// Call disposition data
export interface CallDisposition {
  id: string;
  callId: string;
  sipCallId?: string;
  agentId: string;
  contactId?: string;
  campaignId?: string;
  phoneNumber: string;
  
  // Disposition details
  dispositionId: string;
  dispositionType: DispositionType;
  dispositionCategory: DispositionCategory;
  dispositionOutcome: DispositionOutcome;
  dispositionLabel: string;
  
  // Additional information
  notes?: string;
  followUpDate?: Date;
  followUpNotes?: string;
  callBackNumber?: string;
  leadScore?: number;
  saleAmount?: number;
  
  // Quality assurance
  qaRequired: boolean;
  qaScore?: number;
  qaNotes?: string;
  qaAgentId?: string;
  qaDate?: Date;
  
  // Metadata
  callDuration: number;
  callStartTime: Date;
  callEndTime: Date;
  dispositionTime: Date;
  metadata: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Default disposition configurations
const DEFAULT_DISPOSITIONS: DispositionConfig[] = [
  // Positive outcomes
  {
    id: 'sale_closed',
    label: 'Sale - Closed',
    type: DispositionType.SALE,
    category: DispositionCategory.POSITIVE,
    outcome: DispositionOutcome.SUCCESS,
    description: 'Sale successfully completed',
    requiresNotes: true,
    requiresCallback: false,
    allowedNextSteps: ['follow_up', 'delivery'],
    color: '#10B981',
    icon: 'checkCircle',
    isActive: true,
    sortOrder: 1,
    campaignSpecific: false,
    metadata: { requiresSaleAmount: true }
  },
  {
    id: 'appointment_set',
    label: 'Appointment Set',
    type: DispositionType.APPOINTMENT,
    category: DispositionCategory.POSITIVE,
    outcome: DispositionOutcome.FOLLOW_UP,
    description: 'Appointment scheduled with prospect',
    requiresNotes: true,
    requiresCallback: true,
    allowedNextSteps: ['appointment', 'confirmation'],
    color: '#3B82F6',
    icon: 'calendar',
    isActive: true,
    sortOrder: 2,
    campaignSpecific: false,
    metadata: { requiresAppointmentDate: true }
  },
  {
    id: 'qualified_lead',
    label: 'Qualified Lead',
    type: DispositionType.LEAD,
    category: DispositionCategory.POSITIVE,
    outcome: DispositionOutcome.FOLLOW_UP,
    description: 'Qualified lead identified for follow-up',
    requiresNotes: true,
    requiresCallback: false,
    allowedNextSteps: ['follow_up', 'nurture'],
    color: '#8B5CF6',
    icon: 'star',
    isActive: true,
    sortOrder: 3,
    campaignSpecific: false,
    metadata: { requiresLeadScore: true }
  },

  // Callback required
  {
    id: 'callback_requested',
    label: 'Callback Requested',
    type: DispositionType.CALLBACK,
    category: DispositionCategory.CALLBACK_REQUIRED,
    outcome: DispositionOutcome.PENDING,
    description: 'Contact requested callback at specific time',
    requiresNotes: true,
    requiresCallback: true,
    allowedNextSteps: ['callback', 'follow_up'],
    color: '#F59E0B',
    icon: 'clock',
    isActive: true,
    sortOrder: 10,
    campaignSpecific: false,
    metadata: {}
  },
  {
    id: 'call_back_later',
    label: 'Call Back Later',
    type: DispositionType.CALLBACK,
    category: DispositionCategory.CALLBACK_REQUIRED,
    outcome: DispositionOutcome.PENDING,
    description: 'Contact not available, call back later',
    requiresNotes: false,
    requiresCallback: true,
    allowedNextSteps: ['callback'],
    color: '#F59E0B',
    icon: 'clock',
    isActive: true,
    sortOrder: 11,
    campaignSpecific: false,
    metadata: {}
  },

  // Negative outcomes
  {
    id: 'not_interested',
    label: 'Not Interested',
    type: DispositionType.NOT_INTERESTED,
    category: DispositionCategory.NEGATIVE,
    outcome: DispositionOutcome.FAILURE,
    description: 'Contact expressed no interest',
    requiresNotes: false,
    requiresCallback: false,
    allowedNextSteps: ['remove', 'nurture'],
    color: '#EF4444',
    icon: 'xCircle',
    isActive: true,
    sortOrder: 20,
    campaignSpecific: false,
    metadata: {}
  },
  {
    id: 'do_not_call',
    label: 'Do Not Call',
    type: DispositionType.DO_NOT_CALL,
    category: DispositionCategory.QUALITY_ISSUE,
    outcome: DispositionOutcome.FAILURE,
    description: 'Contact requested to be removed from calling list',
    requiresNotes: true,
    requiresCallback: false,
    allowedNextSteps: ['remove'],
    color: '#DC2626',
    icon: 'ban',
    isActive: true,
    sortOrder: 21,
    campaignSpecific: false,
    metadata: { autoRemove: true }
  },

  // Technical issues
  {
    id: 'no_answer',
    label: 'No Answer',
    type: DispositionType.NO_ANSWER,
    category: DispositionCategory.TECHNICAL_ISSUE,
    outcome: DispositionOutcome.PENDING,
    description: 'No one answered the call',
    requiresNotes: false,
    requiresCallback: false,
    allowedNextSteps: ['retry', 'callback'],
    color: '#6B7280',
    icon: 'phoneOff',
    isActive: true,
    sortOrder: 30,
    campaignSpecific: false,
    metadata: {}
  },
  {
    id: 'busy_signal',
    label: 'Busy Signal',
    type: DispositionType.BUSY,
    category: DispositionCategory.TECHNICAL_ISSUE,
    outcome: DispositionOutcome.PENDING,
    description: 'Phone line was busy',
    requiresNotes: false,
    requiresCallback: false,
    allowedNextSteps: ['retry'],
    color: '#6B7280',
    icon: 'phone',
    isActive: true,
    sortOrder: 31,
    campaignSpecific: false,
    metadata: {}
  },
  {
    id: 'answering_machine',
    label: 'Answering Machine',
    type: DispositionType.ANSWERING_MACHINE,
    category: DispositionCategory.TECHNICAL_ISSUE,
    outcome: DispositionOutcome.PENDING,
    description: 'Call reached voicemail/answering machine',
    requiresNotes: false,
    requiresCallback: false,
    allowedNextSteps: ['retry', 'callback'],
    color: '#6B7280',
    icon: 'voicemail',
    isActive: true,
    sortOrder: 32,
    campaignSpecific: false,
    metadata: {}
  },
  {
    id: 'wrong_number',
    label: 'Wrong Number',
    type: DispositionType.WRONG_NUMBER,
    category: DispositionCategory.QUALITY_ISSUE,
    outcome: DispositionOutcome.FAILURE,
    description: 'Incorrect phone number',
    requiresNotes: false,
    requiresCallback: false,
    allowedNextSteps: ['update_number', 'remove'],
    color: '#F97316',
    icon: 'alert',
    isActive: true,
    sortOrder: 33,
    campaignSpecific: false,
    metadata: {}
  },
  {
    id: 'disconnected',
    label: 'Disconnected Number',
    type: DispositionType.DISCONNECTED,
    category: DispositionCategory.QUALITY_ISSUE,
    outcome: DispositionOutcome.FAILURE,
    description: 'Phone number is disconnected',
    requiresNotes: false,
    requiresCallback: false,
    allowedNextSteps: ['remove'],
    color: '#F97316',
    icon: 'phoneOff',
    isActive: true,
    sortOrder: 34,
    campaignSpecific: false,
    metadata: {}
  },
];

class DispositionCollectionService {
  private dispositionConfigs: Map<string, DispositionConfig> = new Map();

  constructor() {
    this.loadDefaultDispositions();
  }

  /**
   * Load default disposition configurations
   */
  private loadDefaultDispositions(): void {
    DEFAULT_DISPOSITIONS.forEach(config => {
      this.dispositionConfigs.set(config.id, config);
    });
    console.log(`📋 Loaded ${DEFAULT_DISPOSITIONS.length} default disposition configurations`);
  }

  /**
   * Get all available disposition configurations
   */
  getDispositionConfigs(campaignId?: string): DispositionConfig[] {
    let configs = Array.from(this.dispositionConfigs.values())
      .filter(config => config.isActive);

    // Filter by campaign if specified
    if (campaignId) {
      // TODO: Implement campaign-specific disposition filtering
      // For now, return all general dispositions
    }

    return configs.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get disposition configuration by ID
   */
  getDispositionConfig(dispositionId: string): DispositionConfig | undefined {
    return this.dispositionConfigs.get(dispositionId);
  }

  /**
   * Create call disposition
   */
  async createDisposition(params: {
    callId: string;
    sipCallId?: string;
    agentId: string;
    contactId?: string;
    campaignId?: string;
    phoneNumber: string;
    dispositionId: string;
    notes?: string;
    followUpDate?: Date;
    followUpNotes?: string;
    callBackNumber?: string;
    leadScore?: number;
    saleAmount?: number;
    callDuration: number;
    callStartTime: Date;
    callEndTime: Date;
    metadata?: Record<string, any>;
  }): Promise<CallDisposition> {
    const {
      callId,
      sipCallId,
      agentId,
      contactId,
      campaignId,
      phoneNumber,
      dispositionId,
      notes,
      followUpDate,
      followUpNotes,
      callBackNumber,
      leadScore,
      saleAmount,
      callDuration,
      callStartTime,
      callEndTime,
      metadata = {},
    } = params;

    const dispositionConfig = this.getDispositionConfig(dispositionId);
    if (!dispositionConfig) {
      throw new Error(`Invalid disposition ID: ${dispositionId}`);
    }

    // Validate required fields
    if (dispositionConfig.requiresNotes && !notes) {
      throw new Error('Notes are required for this disposition');
    }

    if (dispositionConfig.requiresCallback && !followUpDate) {
      throw new Error('Follow-up date is required for this disposition');
    }

    if (dispositionConfig.metadata.requiresSaleAmount && !saleAmount) {
      throw new Error('Sale amount is required for this disposition');
    }

    if (dispositionConfig.metadata.requiresLeadScore && !leadScore) {
      throw new Error('Lead score is required for this disposition');
    }

    const disposition: CallDisposition = {
      id: this.generateDispositionId(),
      callId,
      sipCallId,
      agentId,
      contactId,
      campaignId,
      phoneNumber,
      
      dispositionId,
      dispositionType: dispositionConfig.type,
      dispositionCategory: dispositionConfig.category,
      dispositionOutcome: dispositionConfig.outcome,
      dispositionLabel: dispositionConfig.label,
      
      notes,
      followUpDate,
      followUpNotes,
      callBackNumber,
      leadScore,
      saleAmount,
      
      qaRequired: this.shouldRequireQA(dispositionConfig, { leadScore, saleAmount }),
      
      callDuration,
      callStartTime,
      callEndTime,
      dispositionTime: new Date(),
      metadata,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      // Store disposition in Redis
      await this.persistDisposition(disposition);

      // Emit disposition event
      await callEvents.ended({
        callId,
        agentId,
        contactId,
        campaignId,
        sipCallId,
        direction: (metadata.direction as 'inbound' | 'outbound') || 'outbound',
        phoneNumber,
        duration: callDuration,
        metadata: {
          ...metadata,
          disposition: {
            id: disposition.id,
            type: dispositionConfig.type,
            category: dispositionConfig.category,
            outcome: dispositionConfig.outcome,
            label: dispositionConfig.label,
            notes,
            saleAmount,
            leadScore,
          },
        },
      });

      console.log(`📋 Disposition created: ${callId} -> ${dispositionConfig.label}`);

      // Handle post-disposition actions
      await this.handlePostDispositionActions(disposition, dispositionConfig);

      return disposition;

    } catch (error) {
      console.error('Error creating disposition:', error);
      
      // Emit error event
      await systemEvents.error({
        level: 'error',
        message: 'Failed to create call disposition',
        component: 'DispositionService',
        metadata: { callId, dispositionId, error: error instanceof Error ? error.message : 'Unknown error' },
      });

      throw error;
    }
  }

  /**
   * Update disposition with QA information
   */
  async updateDispositionQA(dispositionId: string, params: {
    qaScore: number;
    qaNotes?: string;
    qaAgentId: string;
  }): Promise<CallDisposition> {
    const { qaScore, qaNotes, qaAgentId } = params;

    const disposition = await this.getDisposition(dispositionId);
    if (!disposition) {
      throw new Error(`Disposition not found: ${dispositionId}`);
    }

    disposition.qaScore = qaScore;
    disposition.qaNotes = qaNotes;
    disposition.qaAgentId = qaAgentId;
    disposition.qaDate = new Date();
    disposition.updatedAt = new Date();

    await this.persistDisposition(disposition);

    console.log(`📊 QA updated for disposition: ${dispositionId} (Score: ${qaScore})`);

    return disposition;
  }

  /**
   * Get disposition by ID
   */
  async getDisposition(dispositionId: string): Promise<CallDisposition | null> {
    try {
      const key = `disposition:${dispositionId}`;
      const data = await redisClient.get(key);
      
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      return {
        ...parsed,
        followUpDate: parsed.followUpDate ? new Date(parsed.followUpDate) : undefined,
        callStartTime: new Date(parsed.callStartTime),
        callEndTime: new Date(parsed.callEndTime),
        dispositionTime: new Date(parsed.dispositionTime),
        qaDate: parsed.qaDate ? new Date(parsed.qaDate) : undefined,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    } catch (error) {
      console.error('Error getting disposition:', error);
      return null;
    }
  }

  /**
   * Get dispositions for agent
   */
  async getDispositionsForAgent(agentId: string): Promise<CallDisposition[]> {
    try {
      const dispositionIds = await redisClient.sMembers(`agent:${agentId}:dispositions`);
      const dispositions: CallDisposition[] = [];

      for (const id of dispositionIds) {
        const disposition = await this.getDisposition(id);
        if (disposition) {
          dispositions.push(disposition);
        }
      }

      return dispositions.sort((a, b) => b.dispositionTime.getTime() - a.dispositionTime.getTime());
    } catch (error) {
      console.error('Error getting agent dispositions:', error);
      return [];
    }
  }

  /**
   * Get dispositions for campaign
   */
  async getDispositionsForCampaign(campaignId: string): Promise<CallDisposition[]> {
    try {
      const dispositionIds = await redisClient.sMembers(`campaign:${campaignId}:dispositions`);
      const dispositions: CallDisposition[] = [];

      for (const id of dispositionIds) {
        const disposition = await this.getDisposition(id);
        if (disposition) {
          dispositions.push(disposition);
        }
      }

      return dispositions.sort((a, b) => b.dispositionTime.getTime() - a.dispositionTime.getTime());
    } catch (error) {
      console.error('Error getting campaign dispositions:', error);
      return [];
    }
  }

  /**
   * Get disposition statistics
   */
  async getDispositionStats(params: {
    agentId?: string;
    campaignId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<object> {
    const { agentId, campaignId, startDate, endDate } = params;

    let dispositions: CallDisposition[] = [];

    if (agentId) {
      dispositions = await this.getDispositionsForAgent(agentId);
    } else if (campaignId) {
      dispositions = await this.getDispositionsForCampaign(campaignId);
    } else {
      // Get all dispositions (limited implementation)
      dispositions = [];
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      dispositions = dispositions.filter(d => {
        if (startDate && d.dispositionTime < startDate) return false;
        if (endDate && d.dispositionTime > endDate) return false;
        return true;
      });
    }

    // Calculate statistics
    const stats = {
      totalDispositions: dispositions.length,
      byCategory: {} as Record<string, number>,
      byOutcome: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      totalSales: 0,
      totalSaleAmount: 0,
      averageCallDuration: 0,
      qaRequired: 0,
      qaCompleted: 0,
      averageQAScore: 0,
    };

    let totalDuration = 0;
    let qaScoreSum = 0;
    let qaScoreCount = 0;

    dispositions.forEach(d => {
      // Category stats
      stats.byCategory[d.dispositionCategory] = (stats.byCategory[d.dispositionCategory] || 0) + 1;
      
      // Outcome stats
      stats.byOutcome[d.dispositionOutcome] = (stats.byOutcome[d.dispositionOutcome] || 0) + 1;
      
      // Type stats
      stats.byType[d.dispositionType] = (stats.byType[d.dispositionType] || 0) + 1;
      
      // Sales stats
      if (d.saleAmount) {
        stats.totalSales++;
        stats.totalSaleAmount += d.saleAmount;
      }
      
      // Duration stats
      totalDuration += d.callDuration;
      
      // QA stats
      if (d.qaRequired) {
        stats.qaRequired++;
        if (d.qaScore !== undefined) {
          stats.qaCompleted++;
          qaScoreSum += d.qaScore;
          qaScoreCount++;
        }
      }
    });

    stats.averageCallDuration = dispositions.length > 0 ? Math.round(totalDuration / dispositions.length) : 0;
    stats.averageQAScore = qaScoreCount > 0 ? Math.round((qaScoreSum / qaScoreCount) * 100) / 100 : 0;

    return stats;
  }

  // Helper methods

  private generateDispositionId(): string {
    return `disp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldRequireQA(config: DispositionConfig, data: { leadScore?: number; saleAmount?: number }): boolean {
    // Require QA for sales and high-value outcomes
    if (config.category === DispositionCategory.POSITIVE) return true;
    
    // Require QA for high lead scores
    if (data.leadScore && data.leadScore >= 8) return true;
    
    // Require QA for large sales
    if (data.saleAmount && data.saleAmount >= 1000) return true;
    
    // Random QA sampling (10% of calls)
    return Math.random() < 0.1;
  }

  private async persistDisposition(disposition: CallDisposition): Promise<void> {
    try {
      const key = `disposition:${disposition.id}`;
      const data = JSON.stringify({
        ...disposition,
        followUpDate: disposition.followUpDate?.toISOString(),
        callStartTime: disposition.callStartTime.toISOString(),
        callEndTime: disposition.callEndTime.toISOString(),
        dispositionTime: disposition.dispositionTime.toISOString(),
        qaDate: disposition.qaDate?.toISOString(),
        createdAt: disposition.createdAt.toISOString(),
        updatedAt: disposition.updatedAt.toISOString(),
      });
      
      await redisClient.setEx(key, 30 * 24 * 60 * 60, data); // 30 days TTL
      
      // Index by agent
      if (disposition.agentId) {
        await redisClient.sAdd(`agent:${disposition.agentId}:dispositions`, disposition.id);
      }
      
      // Index by campaign
      if (disposition.campaignId) {
        await redisClient.sAdd(`campaign:${disposition.campaignId}:dispositions`, disposition.id);
      }
      
      // Index by date
      const dateKey = disposition.dispositionTime.toISOString().split('T')[0];
      await redisClient.sAdd(`dispositions:date:${dateKey}`, disposition.id);
      
    } catch (error) {
      console.warn('⚠️ Failed to persist disposition to Redis:', error);
    }
  }

  private async handlePostDispositionActions(disposition: CallDisposition, config: DispositionConfig): Promise<void> {
    try {
      // Auto-remove for DNC
      if (config.metadata.autoRemove) {
        console.log(`🚫 Auto-removing contact ${disposition.phoneNumber} due to DNC disposition`);
        // TODO: Implement contact removal logic
      }

      // Schedule callbacks
      if (disposition.followUpDate && disposition.contactId) {
        console.log(`⏰ Scheduling callback for ${disposition.phoneNumber} on ${disposition.followUpDate}`);
        // TODO: Implement callback scheduling logic
      }

      // Update lead scoring
      if (disposition.leadScore && disposition.contactId) {
        console.log(`📊 Updating lead score for contact ${disposition.contactId}: ${disposition.leadScore}`);
        // TODO: Implement lead scoring update logic
      }

    } catch (error) {
      console.warn('⚠️ Error handling post-disposition actions:', error);
    }
  }
}

// Create and export singleton instance
export const dispositionService = new DispositionCollectionService();
export default dispositionService;