// Comprehensive SIP Call Control Service
import twilio from 'twilio';
import { callEvents, systemEvents } from '../utils/eventHelpers';
import { EventPriority } from '../types/events';
import { generateAccessToken, endCall as twilioEndCall, getCallDetails, sendDTMF } from './twilioService';
import { redisClient } from '../config/redis';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Call status enum
export enum CallStatus {
  INITIATED = 'initiated',
  RINGING = 'ringing',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  BUSY = 'busy',
  NO_ANSWER = 'no-answer',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Call direction enum
export enum CallDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound',
}

// Call control actions enum
export enum CallAction {
  ANSWER = 'answer',
  HANGUP = 'hangup',
  HOLD = 'hold',
  UNHOLD = 'unhold',
  MUTE = 'mute',
  UNMUTE = 'unmute',
  TRANSFER = 'transfer',
  CONFERENCE = 'conference',
  RECORD = 'record',
  STOP_RECORD = 'stop_record',
}

// Call state interface
export interface CallState {
  callId: string;
  sipCallId?: string;
  agentId?: string;
  contactId?: string;
  campaignId?: string;
  phoneNumber: string;
  direction: CallDirection;
  status: CallStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  isOnHold: boolean;
  isMuted: boolean;
  isRecording: boolean;
  conferenceId?: string;
  transferTargetNumber?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

class SIPCallControlService {
  private activeCalls: Map<string, CallState> = new Map();
  private callIdToSipId: Map<string, string> = new Map();

  /**
   * Initiate an outbound call
   */
  async initiateCall(params: {
    agentId: string;
    phoneNumber: string;
    campaignId?: string;
    contactId?: string;
    callerId?: string;
    metadata?: Record<string, any>;
  }): Promise<CallState> {
    const { agentId, phoneNumber, campaignId, contactId, callerId, metadata = {} } = params;
    
    try {
      const callId = this.generateCallId();
      const callState: CallState = {
        callId,
        agentId,
        contactId,
        campaignId,
        phoneNumber,
        direction: CallDirection.OUTBOUND,
        status: CallStatus.INITIATED,
        startTime: new Date(),
        isOnHold: false,
        isMuted: false,
        isRecording: false,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create Twilio call
      const twilioCall = await twilioClient.calls.create({
        to: phoneNumber,
        from: callerId || TWILIO_PHONE_NUMBER || '+1234567890', // fallback number
        url: `${process.env.BACKEND_URL}/api/calls/twiml/outbound?callId=${callId}`,
        statusCallback: `${process.env.BACKEND_URL}/api/calls/webhook/status?callId=${callId}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST',
        record: true,
        recordingChannels: 'dual',
        recordingStatusCallback: `${process.env.BACKEND_URL}/api/calls/webhook/recording?callId=${callId}`,
      });

      callState.sipCallId = twilioCall.sid;
      this.activeCalls.set(callId, callState);
      this.callIdToSipId.set(callId, twilioCall.sid);

      // Store call state in Redis for persistence
      await this.persistCallState(callState);

      // Emit call initiated event
      await callEvents.initiated({
        callId,
        agentId,
        contactId,
        campaignId,
        sipCallId: twilioCall.sid,
        direction: CallDirection.OUTBOUND,
        phoneNumber,
        status: CallStatus.INITIATED,
        metadata,
      });

      console.log(`📞 Call initiated: ${callId} -> ${phoneNumber} (SIP: ${twilioCall.sid})`);
      return callState;

    } catch (error) {
      console.error('❌ Error initiating call:', error);
      
      // Emit call failed event
      await callEvents.failed({
        callId: 'unknown',
        agentId,
        contactId,
        campaignId,
        direction: CallDirection.OUTBOUND,
        phoneNumber,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Handle incoming call
   */
  async handleInboundCall(params: {
    sipCallId: string;
    fromNumber: string;
    toNumber: string;
    callerId?: string;
    metadata?: Record<string, any>;
  }): Promise<CallState> {
    const { sipCallId, fromNumber, toNumber, callerId, metadata = {} } = params;
    
    try {
      const callId = this.generateCallId();
      const callState: CallState = {
        callId,
        sipCallId,
        phoneNumber: fromNumber,
        direction: CallDirection.INBOUND,
        status: CallStatus.RINGING,
        startTime: new Date(),
        isOnHold: false,
        isMuted: false,
        isRecording: false,
        metadata: {
          ...metadata,
          toNumber,
          callerId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.activeCalls.set(callId, callState);
      this.callIdToSipId.set(callId, sipCallId);

      // Store call state in Redis
      await this.persistCallState(callState);

      // Emit inbound call event
      await callEvents.initiated({
        callId,
        sipCallId,
        direction: CallDirection.INBOUND,
        phoneNumber: fromNumber,
        status: CallStatus.RINGING,
        metadata: callState.metadata,
      });

      console.log(`📞 Inbound call received: ${callId} from ${fromNumber} (SIP: ${sipCallId})`);
      return callState;

    } catch (error) {
      console.error('❌ Error handling inbound call:', error);
      throw error;
    }
  }

  /**
   * Answer a call
   */
  async answerCall(callId: string, agentId: string): Promise<CallState> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      throw new Error(`Call not found: ${callId}`);
    }

    try {
      callState.agentId = agentId;
      callState.status = CallStatus.IN_PROGRESS;
      callState.updatedAt = new Date();

      // If this is an inbound call, connect to agent
      if (callState.direction === CallDirection.INBOUND && callState.sipCallId) {
        await twilioClient.calls(callState.sipCallId).update({
          twiml: `
            <Response>
              <Say>Connecting to agent</Say>
              <Dial>
                <Client>${agentId}</Client>
              </Dial>
            </Response>
          `
        });
      }

      await this.persistCallState(callState);

      // Emit call connected event
      await callEvents.connected({
        callId,
        agentId,
        contactId: callState.contactId,
        campaignId: callState.campaignId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
        status: CallStatus.IN_PROGRESS,
      });

      console.log(`✅ Call answered: ${callId} by agent ${agentId}`);
      return callState;

    } catch (error) {
      console.error('❌ Error answering call:', error);
      throw error;
    }
  }

  /**
   * End a call
   */
  async endCall(callId: string, reason?: string): Promise<CallState> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      throw new Error(`Call not found: ${callId}`);
    }

    try {
      // End the Twilio call if it exists
      if (callState.sipCallId) {
        await twilioEndCall(callState.sipCallId);
      }

      callState.status = CallStatus.COMPLETED;
      callState.endTime = new Date();
      callState.duration = Math.floor((callState.endTime.getTime() - callState.startTime.getTime()) / 1000);
      callState.updatedAt = new Date();

      await this.persistCallState(callState);

      // Remove from active calls
      this.activeCalls.delete(callId);
      if (callState.sipCallId) {
        this.callIdToSipId.delete(callId);
      }

      // Emit call ended event
      await callEvents.ended({
        callId,
        agentId: callState.agentId,
        contactId: callState.contactId,
        campaignId: callState.campaignId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
        duration: callState.duration,
        reason,
      });

      console.log(`🔚 Call ended: ${callId} (duration: ${callState.duration}s)`);
      return callState;

    } catch (error) {
      console.error('❌ Error ending call:', error);
      throw error;
    }
  }

  /**
   * Put call on hold
   */
  async holdCall(callId: string): Promise<CallState> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      throw new Error(`Call not found: ${callId}`);
    }

    try {
      if (callState.sipCallId) {
        await twilioClient.calls(callState.sipCallId).update({
          twiml: `
            <Response>
              <Play loop="0">http://com.twilio.sounds.music.s3.amazonaws.com/BusySignal.wav</Play>
            </Response>
          `
        });
      }

      callState.isOnHold = true;
      callState.updatedAt = new Date();
      await this.persistCallState(callState);

      // Emit hold event
      await callEvents.hold({
        callId,
        agentId: callState.agentId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
      });

      console.log(`⏸️ Call held: ${callId}`);
      return callState;

    } catch (error) {
      console.error('❌ Error holding call:', error);
      throw error;
    }
  }

  /**
   * Take call off hold
   */
  async unholdCall(callId: string): Promise<CallState> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      throw new Error(`Call not found: ${callId}`);
    }

    try {
      if (callState.sipCallId && callState.agentId) {
        await twilioClient.calls(callState.sipCallId).update({
          twiml: `
            <Response>
              <Dial>
                <Client>${callState.agentId}</Client>
              </Dial>
            </Response>
          `
        });
      }

      callState.isOnHold = false;
      callState.updatedAt = new Date();
      await this.persistCallState(callState);

      // Emit unhold event
      await callEvents.unhold({
        callId,
        agentId: callState.agentId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
      });

      console.log(`▶️ Call unheld: ${callId}`);
      return callState;

    } catch (error) {
      console.error('❌ Error unholding call:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute call (agent side)
   */
  async muteCall(callId: string, muted: boolean): Promise<CallState> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      throw new Error(`Call not found: ${callId}`);
    }

    callState.isMuted = muted;
    callState.updatedAt = new Date();
    await this.persistCallState(callState);

    // Emit mute/unmute event
    if (muted) {
      await callEvents.muted({
        callId,
        agentId: callState.agentId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
      });
    } else {
      await callEvents.unmuted({
        callId,
        agentId: callState.agentId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
      });
    }

    console.log(`🔇 Call ${muted ? 'muted' : 'unmuted'}: ${callId}`);
    return callState;
  }

  /**
   * Transfer call to another number
   */
  async transferCall(callId: string, targetNumber: string): Promise<CallState> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      throw new Error(`Call not found: ${callId}`);
    }

    try {
      if (callState.sipCallId) {
        await twilioClient.calls(callState.sipCallId).update({
          twiml: `
            <Response>
              <Say>Transferring call</Say>
              <Dial>
                <Number>${targetNumber}</Number>
              </Dial>
            </Response>
          `
        });
      }

      callState.transferTargetNumber = targetNumber;
      callState.updatedAt = new Date();
      await this.persistCallState(callState);

      // Emit transfer event
      await callEvents.transferred({
        callId,
        agentId: callState.agentId,
        sipCallId: callState.sipCallId,
        direction: callState.direction,
        phoneNumber: callState.phoneNumber,
        metadata: { transferTarget: targetNumber },
      });

      console.log(`🔄 Call transferred: ${callId} -> ${targetNumber}`);
      return callState;

    } catch (error) {
      console.error('❌ Error transferring call:', error);
      throw error;
    }
  }

  /**
   * Send DTMF tones
   */
  async sendDTMFTones(callId: string, digits: string): Promise<void> {
    const callState = this.activeCalls.get(callId);
    if (!callState || !callState.sipCallId) {
      throw new Error(`Active call not found: ${callId}`);
    }

    try {
      await sendDTMF(callState.sipCallId, digits);
      console.log(`📟 DTMF sent: ${callId} -> ${digits}`);
    } catch (error) {
      console.error('❌ Error sending DTMF:', error);
      throw error;
    }
  }

  /**
   * Get call state
   */
  getCallState(callId: string): CallState | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Get all active calls for an agent
   */
  getActiveCallsForAgent(agentId: string): CallState[] {
    return Array.from(this.activeCalls.values()).filter(call => call.agentId === agentId);
  }

  /**
   * Get all active calls for a campaign
   */
  getActiveCallsForCampaign(campaignId: string): CallState[] {
    return Array.from(this.activeCalls.values()).filter(call => call.campaignId === campaignId);
  }

  /**
   * Update call status from Twilio webhook
   */
  async updateCallStatus(callId: string, status: string, metadata?: Record<string, any>): Promise<void> {
    const callState = this.activeCalls.get(callId);
    if (!callState) {
      console.warn(`⚠️ Received status update for unknown call: ${callId}`);
      return;
    }

    const previousStatus = callState.status;
    callState.status = this.mapTwilioStatus(status);
    callState.updatedAt = new Date();

    if (metadata) {
      callState.metadata = { ...callState.metadata, ...metadata };
    }

    await this.persistCallState(callState);

    // Emit status change event if status actually changed
    if (previousStatus !== callState.status) {
      console.log(`📱 Call status updated: ${callId} ${previousStatus} -> ${callState.status}`);
      
      // Emit appropriate event based on new status
      switch (callState.status) {
        case CallStatus.IN_PROGRESS:
          await callEvents.connected({
            callId,
            agentId: callState.agentId,
            contactId: callState.contactId,
            campaignId: callState.campaignId,
            sipCallId: callState.sipCallId,
            direction: callState.direction,
            phoneNumber: callState.phoneNumber,
            status: callState.status,
          });
          break;
        
        case CallStatus.COMPLETED:
        case CallStatus.FAILED:
        case CallStatus.BUSY:
        case CallStatus.NO_ANSWER:
          await this.endCall(callId, `Status: ${callState.status}`);
          break;
      }
    }
  }

  /**
   * Generate access token for agent
   */
  async generateAgentAccessToken(agentId: string): Promise<string> {
    try {
      return generateAccessToken(agentId);
    } catch (error) {
      console.error('❌ Error generating access token:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  getCallStatistics(): object {
    const activeCalls = Array.from(this.activeCalls.values());
    
    return {
      totalActiveCalls: activeCalls.length,
      callsByDirection: {
        inbound: activeCalls.filter(c => c.direction === CallDirection.INBOUND).length,
        outbound: activeCalls.filter(c => c.direction === CallDirection.OUTBOUND).length,
      },
      callsByStatus: activeCalls.reduce((acc, call) => {
        acc[call.status] = (acc[call.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      callsOnHold: activeCalls.filter(c => c.isOnHold).length,
      callsRecording: activeCalls.filter(c => c.isRecording).length,
    };
  }

  // Helper methods
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private mapTwilioStatus(twilioStatus: string): CallStatus {
    switch (twilioStatus.toLowerCase()) {
      case 'queued':
      case 'initiated':
        return CallStatus.INITIATED;
      case 'ringing':
        return CallStatus.RINGING;
      case 'in-progress':
        return CallStatus.IN_PROGRESS;
      case 'completed':
        return CallStatus.COMPLETED;
      case 'busy':
        return CallStatus.BUSY;
      case 'no-answer':
        return CallStatus.NO_ANSWER;
      case 'failed':
        return CallStatus.FAILED;
      case 'cancelled':
        return CallStatus.CANCELLED;
      default:
        return CallStatus.FAILED;
    }
  }

  private async persistCallState(callState: CallState): Promise<void> {
    try {
      const key = `call:${callState.callId}`;
      const data = JSON.stringify({
        ...callState,
        startTime: callState.startTime.toISOString(),
        endTime: callState.endTime?.toISOString(),
        createdAt: callState.createdAt.toISOString(),
        updatedAt: callState.updatedAt.toISOString(),
      });
      
      await redisClient.setEx(key, 24 * 60 * 60, data); // 24 hours TTL
      
      // Index by agent
      if (callState.agentId) {
        await redisClient.sAdd(`agent:${callState.agentId}:calls`, callState.callId);
      }
      
      // Index by campaign
      if (callState.campaignId) {
        await redisClient.sAdd(`campaign:${callState.campaignId}:calls`, callState.callId);
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to persist call state to Redis:', error);
    }
  }
}

// Create and export singleton instance
export const sipCallControlService = new SIPCallControlService();
export default sipCallControlService;