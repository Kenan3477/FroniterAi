// Enhanced Automated Disposition Collection Service
import { PrismaClient } from '@prisma/client';
import { eventManager } from './eventManager';
import { EventPriority } from '../types/events';
import { dispositionService } from './dispositionService';

const prisma = new PrismaClient();

// Enhanced disposition automation types
interface CallAnalysis {
  duration: number;
  connected: boolean;
  answeredByHuman: boolean;
  voicemailDetected: boolean;
  busySignalDetected: boolean;
  sentimentScore?: number;
  keywordMatches: string[];
  hangupReason: 'agent' | 'contact' | 'system' | 'timeout';
}

interface DispositionRule {
  id: string;
  campaignId: string;
  name: string;
  conditions: {
    minDuration?: number;
    maxDuration?: number;
    answeredByHuman?: boolean;
    voicemailDetected?: boolean;
    busySignalDetected?: boolean;
    keywordMatches?: string[];
    sentimentRange?: { min: number; max: number };
    hangupReason?: string[];
  };
  autoDisposition: {
    dispositionId: string;
    confidence: number; // 0-100
    requiresConfirmation: boolean;
  };
  isActive: boolean;
  priority: number;
}

interface CampaignDispositionConfig {
  campaignId: string;
  autoDispositionEnabled: boolean;
  requireDispositionBeforeNextCall: boolean;
  mandatoryFields: {
    [dispositionId: string]: {
      notes: boolean;
      leadScore: boolean;
      saleAmount: boolean;
      followUpDate: boolean;
      customFields: string[];
    };
  };
  dispositionRules: DispositionRule[];
  realTimeValidation: boolean;
  supervisorNotifications: {
    onHighValueSale: boolean;
    onDoNotCall: boolean;
    onQualifiedLead: boolean;
    thresholds: Record<string, number>;
  };
}

class AutomatedDispositionService {
  private campaignConfigs: Map<string, CampaignDispositionConfig> = new Map();

  constructor() {
    this.loadCampaignConfigurations();
  }

  /**
   * Load campaign-specific disposition configurations
   */
  async loadCampaignConfigurations(): Promise<void> {
    try {
      // Load from database or configuration
      const campaigns = await prisma.campaign.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      });

      for (const campaign of campaigns) {
        const config: CampaignDispositionConfig = {
          campaignId: campaign.id,
          autoDispositionEnabled: true,
          requireDispositionBeforeNextCall: true,
          mandatoryFields: {
            'sale_closed': {
              notes: true,
              leadScore: false,
              saleAmount: true,
              followUpDate: false,
              customFields: ['sale_type', 'product_category'],
            },
            'qualified_lead': {
              notes: true,
              leadScore: true,
              saleAmount: false,
              followUpDate: true,
              customFields: ['interest_level'],
            },
            'callback_requested': {
              notes: false,
              leadScore: false,
              saleAmount: false,
              followUpDate: true,
              customFields: ['preferred_callback_time'],
            },
          },
          dispositionRules: this.getDefaultDispositionRules(campaign.id),
          realTimeValidation: true,
          supervisorNotifications: {
            onHighValueSale: true,
            onDoNotCall: true,
            onQualifiedLead: true,
            thresholds: {
              highValueSale: 1000,
              qualifiedLeadScore: 8,
            },
          },
        };

        this.campaignConfigs.set(campaign.id, config);
      }

      console.log(`🎯 Loaded disposition configurations for ${campaigns.length} campaigns`);
    } catch (error) {
      console.error('Error loading campaign disposition configurations:', error);
    }
  }

  /**
   * Get default disposition rules for a campaign
   */
  private getDefaultDispositionRules(campaignId: string): DispositionRule[] {
    return [
      {
        id: 'auto_no_answer',
        campaignId,
        name: 'Auto No Answer',
        conditions: {
          maxDuration: 10,
          answeredByHuman: false,
          voicemailDetected: false,
          busySignalDetected: false,
        },
        autoDisposition: {
          dispositionId: 'no_answer',
          confidence: 95,
          requiresConfirmation: false,
        },
        isActive: true,
        priority: 1,
      },
      {
        id: 'auto_busy_signal',
        campaignId,
        name: 'Auto Busy Signal',
        conditions: {
          busySignalDetected: true,
        },
        autoDisposition: {
          dispositionId: 'busy_signal',
          confidence: 98,
          requiresConfirmation: false,
        },
        isActive: true,
        priority: 1,
      },
      {
        id: 'auto_voicemail',
        campaignId,
        name: 'Auto Voicemail',
        conditions: {
          voicemailDetected: true,
        },
        autoDisposition: {
          dispositionId: 'answering_machine',
          confidence: 90,
          requiresConfirmation: false,
        },
        isActive: true,
        priority: 2,
      },
      {
        id: 'auto_short_hangup',
        campaignId,
        name: 'Auto Short Hangup',
        conditions: {
          maxDuration: 30,
          answeredByHuman: true,
          hangupReason: ['contact'],
        },
        autoDisposition: {
          dispositionId: 'not_interested',
          confidence: 75,
          requiresConfirmation: true,
        },
        isActive: true,
        priority: 3,
      },
      {
        id: 'auto_qualified_lead',
        campaignId,
        name: 'Auto Qualified Lead',
        conditions: {
          minDuration: 300, // 5 minutes
          answeredByHuman: true,
          sentimentRange: { min: 60, max: 100 },
          keywordMatches: ['interested', 'yes', 'definitely', 'when', 'how much'],
        },
        autoDisposition: {
          dispositionId: 'qualified_lead',
          confidence: 70,
          requiresConfirmation: true,
        },
        isActive: true,
        priority: 4,
      },
    ];
  }

  /**
   * Analyze call and suggest disposition
   */
  async analyzeCallForDisposition(callId: string, callAnalysis: CallAnalysis): Promise<{
    suggestedDisposition?: string;
    confidence: number;
    requiresConfirmation: boolean;
    autoApplied: boolean;
    reasoning: string[];
  }> {
    try {
      // Get call details including agent from legs
      const call = await prisma.callRecord.findUnique({
        where: { id: callId },
        include: {
          campaign: true,
          record: true,
          legs: {
            where: { legType: 'AGENT' },
            include: { agent: true },
            take: 1,
          },
        },
      });

      if (!call || !call.campaign) {
        return {
          confidence: 0,
          requiresConfirmation: true,
          autoApplied: false,
          reasoning: ['Call or campaign not found'],
        };
      }

      const agentLeg = call.legs.find((leg: any) => leg.legType === 'AGENT');
      if (!agentLeg?.agent) {
        return {
          confidence: 0,
          requiresConfirmation: true,
          autoApplied: false,
          reasoning: ['No agent associated with call'],
        };
      }

      const config = this.campaignConfigs.get(call.campaign.id);
      if (!config || !config.autoDispositionEnabled) {
        return {
          confidence: 0,
          requiresConfirmation: true,
          autoApplied: false,
          reasoning: ['Auto-disposition not enabled for campaign'],
        };
      }

      // Evaluate disposition rules
      const applicableRules = config.dispositionRules
        .filter(rule => rule.isActive)
        .sort((a, b) => a.priority - b.priority);

      const reasoning: string[] = [];
      
      for (const rule of applicableRules) {
        if (this.evaluateDispositionRule(rule, callAnalysis)) {
          reasoning.push(`Matched rule: ${rule.name}`);
          
          const result = {
            suggestedDisposition: rule.autoDisposition.dispositionId,
            confidence: rule.autoDisposition.confidence,
            requiresConfirmation: rule.autoDisposition.requiresConfirmation,
            autoApplied: !rule.autoDisposition.requiresConfirmation && rule.autoDisposition.confidence > 90,
            reasoning,
          };

          // Auto-apply disposition if confidence is high and no confirmation required
          if (result.autoApplied) {
            await this.applyAutoDisposition(callId, rule.autoDisposition.dispositionId, callAnalysis, reasoning);
          }

          // Emit suggestion event
          await eventManager.emitEvent({
            type: 'disposition.suggested',
            callId,
            agentId: agentLeg.agent.id,
            campaignId: call.campaign.id,
            suggestedDisposition: rule.autoDisposition.dispositionId,
            confidence: rule.autoDisposition.confidence,
            autoApplied: result.autoApplied,
            metadata: { reasoning, callAnalysis },
          } as any, `agent:${agentLeg.agent.id}`, EventPriority.HIGH);

          return result;
        }
      }

      return {
        confidence: 0,
        requiresConfirmation: true,
        autoApplied: false,
        reasoning: ['No applicable disposition rules matched'],
      };

    } catch (error) {
      console.error('Error analyzing call for disposition:', error);
      return {
        confidence: 0,
        requiresConfirmation: true,
        autoApplied: false,
        reasoning: ['Error during analysis'],
      };
    }
  }

  /**
   * Evaluate disposition rule against call analysis
   */
  private evaluateDispositionRule(rule: DispositionRule, analysis: CallAnalysis): boolean {
    const conditions = rule.conditions;

    // Check duration conditions
    if (conditions.minDuration && analysis.duration < conditions.minDuration) {
      return false;
    }
    if (conditions.maxDuration && analysis.duration > conditions.maxDuration) {
      return false;
    }

    // Check boolean conditions
    if (conditions.answeredByHuman !== undefined && conditions.answeredByHuman !== analysis.answeredByHuman) {
      return false;
    }
    if (conditions.voicemailDetected !== undefined && conditions.voicemailDetected !== analysis.voicemailDetected) {
      return false;
    }
    if (conditions.busySignalDetected !== undefined && conditions.busySignalDetected !== analysis.busySignalDetected) {
      return false;
    }

    // Check hangup reason
    if (conditions.hangupReason && !conditions.hangupReason.includes(analysis.hangupReason)) {
      return false;
    }

    // Check sentiment score
    if (conditions.sentimentRange && analysis.sentimentScore !== undefined) {
      const { min, max } = conditions.sentimentRange;
      if (analysis.sentimentScore < min || analysis.sentimentScore > max) {
        return false;
      }
    }

    // Check keyword matches
    if (conditions.keywordMatches && conditions.keywordMatches.length > 0) {
      const hasKeywordMatch = conditions.keywordMatches.some(keyword =>
        analysis.keywordMatches.some(match => 
          match.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      if (!hasKeywordMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply auto-disposition to call
   */
  private async applyAutoDisposition(
    callId: string,
    dispositionId: string,
    callAnalysis: CallAnalysis,
    reasoning: string[]
  ): Promise<void> {
    try {
      const call = await prisma.callRecord.findUnique({
        where: { id: callId },
        include: {
          record: true,
          legs: {
            where: { legType: 'AGENT' },
            include: { agent: true },
            take: 1,
          },
        },
      });

      if (!call) {
        throw new Error('Call not found');
      }

      const agentLeg = call.legs.find((leg: any) => leg.legType === 'AGENT');
      const customerLeg = call.legs.find((leg: any) => leg.legType === 'CUSTOMER');

      // Create disposition record
      await dispositionService.createDisposition({
        callId,
        sipCallId: call.sipCallId || undefined,
        agentId: agentLeg?.agentId || 'system',
        contactId: call.record?.id || undefined,
        campaignId: call.campaignId || undefined,
        phoneNumber: customerLeg?.phoneNumber || call.record?.phoneNumber || '',
        dispositionId,
        notes: `Auto-disposition: ${reasoning.join(', ')}`,
        callDuration: callAnalysis.duration,
        callStartTime: call.startTime,
        callEndTime: call.endTime || new Date(),
        metadata: {
          autoApplied: true,
          reasoning,
          callAnalysis,
        },
      });

      console.log(`🤖 Auto-applied disposition ${dispositionId} to call ${callId}`);

      // Emit disposition completion event
      await eventManager.emitEvent({
        type: 'disposition.completed',
        callId,
        dispositionId,
        agentId: agentLeg?.agentId || 'system',
        campaignId: call.campaignId,
        autoApplied: true,
        metadata: { reasoning, callAnalysis },
      } as any, `campaign:${call.campaignId}`, EventPriority.MEDIUM);

    } catch (error) {
      console.error('Error applying auto-disposition:', error);
      throw error;
    }
  }

  /**
   * Validate disposition requirements before completion
   */
  async validateDispositionRequirements(
    callId: string,
    dispositionId: string,
    dispositionData: Record<string, any>
  ): Promise<{
    isValid: boolean;
    missingFields: string[];
    errors: string[];
  }> {
    try {
      const call = await prisma.callRecord.findUnique({
        where: { id: callId },
        include: { campaign: true },
      });

      if (!call || !call.campaign) {
        return {
          isValid: false,
          missingFields: [],
          errors: ['Call or campaign not found'],
        };
      }

      const config = this.campaignConfigs.get(call.campaign.id);
      if (!config) {
        return { isValid: true, missingFields: [], errors: [] };
      }

      const requirements = config.mandatoryFields[dispositionId];
      if (!requirements) {
        return { isValid: true, missingFields: [], errors: [] };
      }

      const missingFields: string[] = [];
      const errors: string[] = [];

      // Check required fields
      if (requirements.notes && (!dispositionData.notes || dispositionData.notes.trim() === '')) {
        missingFields.push('notes');
      }

      if (requirements.leadScore && (!dispositionData.leadScore || dispositionData.leadScore < 1 || dispositionData.leadScore > 10)) {
        missingFields.push('leadScore');
      }

      if (requirements.saleAmount && (!dispositionData.saleAmount || dispositionData.saleAmount <= 0)) {
        missingFields.push('saleAmount');
      }

      if (requirements.followUpDate && !dispositionData.followUpDate) {
        missingFields.push('followUpDate');
      }

      // Check custom fields
      for (const customField of requirements.customFields) {
        if (!dispositionData[customField]) {
          missingFields.push(customField);
        }
      }

      // Additional validation
      const dispositionConfig = dispositionService.getDispositionConfig(dispositionId);
      if (dispositionConfig) {
        if (dispositionConfig.requiresCallback && !dispositionData.followUpDate) {
          missingFields.push('followUpDate');
        }
      }

      return {
        isValid: missingFields.length === 0 && errors.length === 0,
        missingFields,
        errors,
      };

    } catch (error) {
      console.error('Error validating disposition requirements:', error);
      return {
        isValid: false,
        missingFields: [],
        errors: ['Validation error occurred'],
      };
    }
  }

  /**
   * Get campaign disposition configuration
   */
  getCampaignDispositionConfig(campaignId: string): CampaignDispositionConfig | null {
    return this.campaignConfigs.get(campaignId) || null;
  }

  /**
   * Update campaign disposition configuration
   */
  async updateCampaignDispositionConfig(campaignId: string, config: Partial<CampaignDispositionConfig>): Promise<void> {
    const existingConfig = this.campaignConfigs.get(campaignId);
    if (existingConfig) {
      const updatedConfig = { ...existingConfig, ...config };
      this.campaignConfigs.set(campaignId, updatedConfig);

      // TODO: Persist to database
      console.log(`📝 Updated disposition configuration for campaign ${campaignId}`);
    }
  }

  /**
   * Process real-time call events for disposition suggestions
   */
  async processCallEvent(callId: string, eventType: string, eventData: any): Promise<void> {
    try {
      // Handle different call events for disposition automation
      switch (eventType) {
        case 'call.connected':
          await this.handleCallConnected(callId, eventData);
          break;
        case 'call.progress':
          await this.handleCallProgress(callId, eventData);
          break;
        case 'call.ended':
          await this.handleCallEnded(callId, eventData);
          break;
        default:
          // Ignore other events
          break;
      }
    } catch (error) {
      console.error(`Error processing call event ${eventType} for call ${callId}:`, error);
    }
  }

  private async handleCallConnected(callId: string, eventData: any): Promise<void> {
    // Send initial disposition suggestions to agent UI
    await eventManager.emitEvent({
      type: 'disposition.suggestions.ready',
      callId,
      agentId: eventData.agentId,
      metadata: { event: 'call_connected' },
    } as any, `agent:${eventData.agentId}`, EventPriority.HIGH);
  }

  private async handleCallProgress(callId: string, eventData: any): Promise<void> {
    // Update disposition probabilities based on call duration and progress
    // This could include real-time sentiment analysis integration
  }

  private async handleCallEnded(callId: string, eventData: any): Promise<void> {
    // Trigger disposition analysis when call ends
    const callAnalysis: CallAnalysis = {
      duration: eventData.duration || 0,
      connected: eventData.connected || false,
      answeredByHuman: eventData.answeredByHuman || false,
      voicemailDetected: eventData.voicemailDetected || false,
      busySignalDetected: eventData.busySignalDetected || false,
      sentimentScore: eventData.sentimentScore,
      keywordMatches: eventData.keywordMatches || [],
      hangupReason: eventData.hangupReason || 'system',
    };

    await this.analyzeCallForDisposition(callId, callAnalysis);
  }
}

// Create and export singleton instance
export const automatedDispositionService = new AutomatedDispositionService();
export default automatedDispositionService;