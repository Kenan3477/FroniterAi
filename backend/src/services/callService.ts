import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { flowExecutionEngine, FlowExecutionContext } from './flowExecutionEngine';

const prisma = new PrismaClient();

export interface CallCreateData {
  campaignId: string;
  recordId?: string;
  callDirection?: string;
  status?: string;
  sipCallId?: string;
  sipSessionId?: string;
  phoneNumber?: string; // Needed for related operations
}

export interface CallLegCreateData {
  callId: string;
  agentId?: string;
  legType: string; // AGENT, CUSTOMER
  phoneNumber: string; // Required field
  status?: string;
  sipLegId?: string;
  sipEndpoint?: string;
}

export type CallDirection = 'INBOUND' | 'OUTBOUND';
export type CallStatus = 'INITIATED' | 'RINGING' | 'ANSWERED' | 'ENDED' | 'FAILED' | 'ABANDONED' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER';
export type CallLegType = 'AGENT' | 'CUSTOMER';
export type CallLegStatus = 'INITIATED' | 'RINGING' | 'ANSWERED' | 'ENDED' | 'FAILED' | 'BUSY' | 'NO_ANSWER';

export class CallService extends EventEmitter {
  /**
   * Create a new call
   */
  async createCall(callData: CallCreateData) {
    const call = await prisma.call.create({
      data: {
        campaignId: callData.campaignId,
        recordId: callData.recordId || null,
        callDirection: callData.callDirection || 'OUTBOUND',
        status: callData.status || 'INITIATED',
        sipCallId: callData.sipCallId,
        sipSessionId: callData.sipSessionId,
      },
      include: {
        campaign: {
          select: { id: true, name: true, diallingMode: true },
        },
        record: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
      },
    });

    this.emit('callCreated', { call });
    
    // Trigger flow execution for inbound calls
    if (call.callDirection === 'INBOUND' && callData.phoneNumber) {
      this.executeFlowsForInboundCall(call.id, callData.phoneNumber)
        .catch((error: any) => {
          console.error('Flow execution failed for inbound call:', error);
        });
    }
    
    return call;
  }

  /**
   * Get call by ID
   */
  async getCall(callId: string) {
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        campaign: {
          select: { id: true, name: true, diallingMode: true },
        },
        record: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        legs: {
          include: {
            agent: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
          orderBy: { startTime: 'asc' },
        },
        dispositions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return call;
  }

  /**
   * Update call status
   */
  async updateCallStatus(callId: string, status: CallStatus, metadata?: any) {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'ANSWERED') {
      updateData.answerTime = new Date();
    } else if (status === 'ENDED' || status === 'FAILED' || status === 'ABANDONED') {
      updateData.endTime = new Date();
    }

    const call = await prisma.call.update({
      where: { id: callId },
      data: updateData,
      include: {
        campaign: true,
        record: true,
      },
    });

    // Calculate duration for ended calls
    if (status === 'ENDED' && call.answerTime) {
      await this.calculateCallDuration(callId);
    }

    // Update record attempt count
    if (call.recordId && (status === 'ENDED' || status === 'FAILED' || status === 'NO_ANSWER' || status === 'BUSY')) {
      await prisma.campaignRecord.update({
        where: { id: call.recordId },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          lastOutcome: status,
        },
      });
    }

    this.emit('callStatusUpdated', { call, status, metadata });
    return call;
  }

  /**
   * Create call leg
   */
  async createCallLeg(legData: CallLegCreateData) {
    const leg = await prisma.callLeg.create({
      data: {
        callId: legData.callId,
        agentId: legData.agentId,
        legType: legData.legType,
        phoneNumber: legData.phoneNumber,
        status: legData.status || 'INITIATED',
        sipLegId: legData.sipLegId,
        sipEndpoint: legData.sipEndpoint,
      },
      include: {
        call: {
          select: { id: true, campaignId: true, callDirection: true },
        },
        agent: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    this.emit('callLegCreated', { leg });
    return leg;
  }

  /**
   * Update call leg status
   */
  async updateCallLegStatus(legId: string, status: CallLegStatus, metadata?: any) {
    const updateData: any = {
      status,
    };

    if (status === 'ANSWERED') {
      updateData.answerTime = new Date();
    } else if (status === 'ENDED' || status === 'FAILED' || status === 'BUSY' || status === 'NO_ANSWER') {
      updateData.endTime = new Date();
    }

    const leg = await prisma.callLeg.update({
      where: { id: legId },
      data: updateData,
      include: {
        call: true,
        agent: true,
      },
    });

    this.emit('callLegStatusUpdated', { leg, status, metadata });
    return leg;
  }

  /**
   * Get calls for a campaign
   */
  async getCallsByCampaign(campaignId: string, limit = 100) {
    const calls = await prisma.call.findMany({
      where: { campaignId },
      include: {
        campaign: {
          select: { id: true, name: true, diallingMode: true },
        },
        record: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        legs: true,
      },
      orderBy: { startTime: 'desc' },
      take: limit,
    });

    return calls;
  }

  /**
   * Get active calls
   */
  async getActiveCalls(campaignId?: string, agentId?: string) {
    const where: any = {
      status: {
        in: ['INITIATED', 'RINGING', 'ANSWERED'],
      },
    };

    if (campaignId) {
      where.campaignId = campaignId;
    }

    const calls = await prisma.call.findMany({
      where,
      include: {
        campaign: {
          select: { id: true, name: true, isActive: true },
        },
        record: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true },
        },
        legs: agentId ? {
          where: { agentId },
        } : true,
      },
      orderBy: { startTime: 'desc' },
    });

    return calls.filter(call => call.campaign.isActive);
  }

  /**
   * Get call statistics
   */
  async getCallStats(campaignId: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = { campaignId };
    
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = dateFrom;
      if (dateTo) where.startTime.lte = dateTo;
    }

    const stats = await prisma.call.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true,
      },
    });

    const totalCalls = stats.reduce((sum, stat) => sum + stat._count.status, 0);
    const answeredCalls = stats.find(s => s.status === 'ANSWERED')?._count.status || 0;
    const failedCalls = stats.find(s => s.status === 'FAILED')?._count.status || 0;

    return {
      totalCalls,
      answeredCalls,
      failedCalls,
      successRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
      breakdown: stats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.status;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Alias methods for route compatibility
  async getCalls(options: any = {}) {
    const { campaignId, limit, agentId } = options;
    if (campaignId) {
      return this.getCallsByCampaign(campaignId, limit);
    }
    return this.getActiveCalls(campaignId, agentId);
  }

  private mapDispositionToRecordStatus(categoryId: string): string {
    // Map disposition categories to record statuses
    // This should ideally be configured based on your disposition categories
    const categoryMappings: Record<string, string> = {
      'sale': 'COMPLETED',
      'interested': 'CALLBACK_SCHEDULED', 
      'not_interested': 'DNC',
      'callback': 'CALLBACK_SCHEDULED',
      'no_answer': 'NEW', // Keep trying
      'busy': 'NEW', // Keep trying
      'wrong_number': 'INVALID_NUMBER',
      'dnc': 'DNC',
      'voicemail': 'NEW', // Keep trying unless max attempts reached
    };

    return categoryMappings[categoryId.toLowerCase()] || 'NEW';
  }

  async addDisposition(dispositionData: any) {
    try {
      const disposition = await prisma.disposition.create({
        data: {
          callId: dispositionData.callId,
          recordId: dispositionData.recordId || null,
          agentId: dispositionData.agentId,
          categoryId: dispositionData.categoryId,
          notes: dispositionData.notes || null,
          scheduledCallback: dispositionData.scheduledCallback ? new Date(dispositionData.scheduledCallback) : null,
          followUpDate: dispositionData.followUpDate ? new Date(dispositionData.followUpDate) : null,
          acwDuration: dispositionData.acwDuration || null,
        },
        include: {
          call: true,
          category: true,
          agent: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Update call status to ENDED if not already ended
      await this.updateCallStatus(dispositionData.callId, 'ENDED');

      // Update campaign record status if provided
      if (dispositionData.recordId) {
        const status = this.mapDispositionToRecordStatus(dispositionData.categoryId);
        await prisma.campaignRecord.update({
          where: { id: dispositionData.recordId },
          data: {
            status,
            lastOutcome: status,
            lastAttemptAt: new Date(),
            nextAttemptAt: dispositionData.scheduledCallback ? new Date(dispositionData.scheduledCallback) : null,
          },
        });
      }

      this.emit('dispositionAdded', { disposition });
      return disposition;
    } catch (error) {
      console.error('Error adding disposition:', error);
      throw error;
    }
  }

  async getAgentActiveCalls(agentId: string) {
    return this.getActiveCalls(undefined, agentId);
  }

  async getCampaignCallStats(campaignId: string, dateFrom?: Date, dateTo?: Date) {
    return this.getCallStats(campaignId, dateFrom, dateTo);
  }

  /**
   * Start call recording
   */
  async startRecording(callId: string, recordingOptions?: any) {
    try {
      // Update call with recording metadata
      const call = await prisma.call.update({
        where: { id: callId },
        data: {
          recordingId: recordingOptions?.recordingId || `rec_${Date.now()}`,
          recordingUrl: recordingOptions?.recordingUrl || null,
        },
      });

      this.emit('recordingStarted', { callId, recordingId: call.recordingId });
      return { success: true, recordingId: call.recordingId };
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  /**
   * Stop call recording
   */
  async stopRecording(callId: string, recordingMetadata?: any) {
    try {
      const updateData: any = {};
      
      if (recordingMetadata?.recordingUrl) {
        updateData.recordingUrl = recordingMetadata.recordingUrl;
      }
      
      if (recordingMetadata?.duration) {
        updateData.recordingDuration = recordingMetadata.duration;
      }

      const call = await prisma.call.update({
        where: { id: callId },
        data: updateData,
      });

      this.emit('recordingStopped', { callId, recordingMetadata });
      return { success: true, recordingUrl: call.recordingUrl };
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw error;
    }
  }

  /**
   * Calculate call duration and update call record
   */
  private async calculateCallDuration(callId: string) {
    const call = await prisma.call.findUnique({
      where: { id: callId },
    });

    if (call && call.answerTime && call.endTime) {
      const duration = Math.floor((call.endTime.getTime() - call.answerTime.getTime()) / 1000);
      const talkTime = call.answerTime && call.endTime 
        ? Math.floor((call.endTime.getTime() - call.answerTime.getTime()) / 1000)
        : 0;

      await prisma.call.update({
        where: { id: callId },
        data: { 
          duration,
          talkTime,
        },
      });
      
      return { duration, talkTime };
    }

    return { duration: 0, talkTime: 0 };
  }

  async transferCall(callId: string, fromAgentId: string, toAgentId: string, transferType = 'COLD') {
    // Simplified implementation
    throw new Error('transferCall not implemented yet');
  }

  async startConference(conferenceData: any, participants: any[], options?: any) {
    // Simplified implementation
    throw new Error('startConference not implemented yet');
  }

  async scheduleCallback(callId: string, agentId: string, callbackDateTime: Date, notes?: string) {
    // Simplified implementation
    throw new Error('scheduleCallback not implemented yet');
  }

  /**
   * Execute flows for inbound calls
   */
  async executeFlowsForInboundCall(callId: string, phoneNumber: string): Promise<void> {
    try {
      console.log(`🔍 Looking for flows to execute for inbound call ${callId} from ${phoneNumber}`);
      
      // Get all active inbound flows
      const activeFlows = await flowExecutionEngine.getActiveInboundFlows();
      
      if (activeFlows.length === 0) {
        console.log('ℹ️ No active inbound flows found');
        return;
      }

      console.log(`📋 Found ${activeFlows.length} active inbound flows:`, activeFlows.map(f => f.name));

      // Execute flows in priority order
      for (const flow of activeFlows) {
        try {
          const context: FlowExecutionContext = {
            callId,
            phoneNumber,
            caller: {
              phoneNumber,
              name: `Caller ${phoneNumber}`
            },
            variables: {
              callId,
              incomingNumber: phoneNumber,
              callTime: new Date(),
              callDirection: 'INBOUND'
            },
            currentTime: new Date()
          };

          console.log(`🚀 Executing flow "${flow.name}" for call ${callId}`);
          const result = await flowExecutionEngine.executeFlow(flow.id, context);

          if (result.success) {
            console.log(`✅ Flow "${flow.name}" executed successfully for call ${callId}`);
            this.emit('flowExecutionSuccess', { 
              callId, 
              flowId: flow.id, 
              flowName: flow.name, 
              result 
            });
          } else {
            console.log(`❌ Flow "${flow.name}" execution failed for call ${callId}:`, result.error);
            this.emit('flowExecutionError', { 
              callId, 
              flowId: flow.id, 
              flowName: flow.name, 
              error: result.error 
            });
          }

          // For now, execute only the first flow that succeeds
          if (result.success) {
            break;
          }

        } catch (error) {
          console.error(`❌ Error executing flow "${flow.name}" for call ${callId}:`, error);
          this.emit('flowExecutionError', { 
            callId, 
            flowId: flow.id, 
            flowName: flow.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

    } catch (error) {
      console.error(`❌ Error in executeFlowsForInboundCall for ${callId}:`, error);
      throw error;
    }
  }

  async getCallsReadyToDial(options: any = {}) {
    // Simplified implementation
    throw new Error('getCallsReadyToDial not implemented yet');
  }

  /**
   * Get customer info by phone number
   */
  async getCustomerInfo(phoneNumber: string) {
    const customer = await prisma.customer.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        phoneNumber: true,
      },
    });

    return customer;
  }
}

export const callService = new CallService();