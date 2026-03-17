/**
 * Auto-Dial Engine Service - Phase 3 Enhanced
 * Core auto-dialling engine for Omnivox AI with predictive capabilities
 * Automatically initiates calls when agents are available
 * Enhanced with predictive dialing algorithms and real-time analytics
 */

import { PrismaClient } from '@prisma/client';
import * as twilioService from './twilioService';
import { 
  predictiveDialingEngine, 
  PredictiveMetrics, 
  DialingDecision 
} from './predictiveDialingEngine';
import { autoDialSentimentMonitor } from './autoDialSentimentMonitor';

const prisma = new PrismaClient();

// Auto-dial state management with predictive enhancements
const autoDialStates = new Map<string, AutoDialState>();

interface AutoDialState {
  agentId: string;
  campaignId: string;
  isActive: boolean;
  isPaused: boolean;
  lastDialAttempt?: Date;
  currentContactId?: string;
  dialCount: number;
  sessionStartTime: Date;
  // Predictive dialing enhancements
  predictiveMode: boolean;
  lastPredictiveDecision?: DialingDecision;
  dialRatio: number;
  pacingTimer?: NodeJS.Timeout;
}

interface AutoDialRequest {
  agentId: string;
  campaignId: string;
  enablePredictive?: boolean;
}

interface AutoDialResult {
  success: boolean;
  callId?: string;
  contactId?: string;
  error?: string;
  queueEmpty?: boolean;
  predictiveDecision?: DialingDecision;
}

export class AutoDialEngine {
  
  /**
   * Start auto-dialling for an agent in a campaign with optional predictive mode
   */
  async startAutoDialer(
    agentId: string, 
    campaignId: string, 
    enablePredictive: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🚀 Starting auto-dialer for agent ${agentId} in campaign ${campaignId} (Predictive: ${enablePredictive})`);
      
      // Verify agent is available
      const agent = await prisma.agent.findUnique({
        where: { agentId },
        include: {
          campaignAssignments: {
            where: { campaignId, isActive: true }
          }
        }
      });

      if (!agent) {
        return { success: false, message: 'Agent not found' };
      }

      if (agent.status !== 'AVAILABLE') {
        return { success: false, message: 'Agent must be Available to start auto-dialling' };
      }

      if (agent.campaignAssignments.length === 0) {
        return { success: false, message: 'Agent not assigned to this campaign' };
      }

      // Verify campaign exists and supports auto-dial
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId }
      });

      if (!campaign) {
        return { success: false, message: 'Campaign not found' };
      }

      if (campaign.status !== 'Active') {
        return { success: false, message: 'Campaign must be active for auto-dialling' };
      }

      // Initialize auto-dial state with predictive capabilities
      const autoDialState: AutoDialState = {
        agentId,
        campaignId,
        isActive: true,
        isPaused: false,
        dialCount: 0,
        sessionStartTime: new Date(),
        predictiveMode: enablePredictive,
        dialRatio: 1.0 // Start with conservative 1:1 ratio
      };

      autoDialStates.set(agentId, autoDialState);

      if (enablePredictive) {
        // Start predictive pacing timer
        this.startPredictivePacing(agentId);
        console.log(`🔮 Predictive mode enabled for agent ${agentId}`);
      } else {
        // Trigger first auto-dial attempt immediately
        setImmediate(() => this.attemptNextDial(agentId));
      }

      return { 
        success: true, 
        message: `Auto-dialler started for agent ${agentId} in campaign ${campaign.name} (${enablePredictive ? 'Predictive' : 'Standard'} mode)` 
      };

    } catch (error) {
      console.error('Error starting auto-dialer:', error);
      return { success: false, message: 'Failed to start auto-dialler' };
    }
  }

  /**
   * Stop auto-dialling for an agent
   */
  async stopAutoDialer(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const autoDialState = autoDialStates.get(agentId);
      
      if (!autoDialState) {
        return { success: true, message: 'Auto-dialler was not active' };
      }

      // Clear predictive pacing timer if active
      if (autoDialState.pacingTimer) {
        clearInterval(autoDialState.pacingTimer);
      }

      // Update state
      autoDialState.isActive = false;
      autoDialStates.delete(agentId);

      console.log(`⏹️ Auto-dialler stopped for agent ${agentId}`);
      
      return { success: true, message: 'Auto-dialler stopped successfully' };

    } catch (error) {
      console.error('Error stopping auto-dialer:', error);
      return { success: false, message: 'Failed to stop auto-dialler' };
    }
  }

  /**
   * Pause auto-dialling for an agent
   */
  async pauseAutoDialer(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const autoDialState = autoDialStates.get(agentId);
      
      if (!autoDialState || !autoDialState.isActive) {
        return { success: false, message: 'Auto-dialler is not active' };
      }

      autoDialState.isPaused = true;
      
      // Pause predictive timer
      if (autoDialState.pacingTimer) {
        clearInterval(autoDialState.pacingTimer);
        autoDialState.pacingTimer = undefined;
      }
      
      console.log(`⏸️ Auto-dialler paused for agent ${agentId}`);
      
      return { success: true, message: 'Auto-dialler paused successfully' };

    } catch (error) {
      console.error('Error pausing auto-dialer:', error);
      return { success: false, message: 'Failed to pause auto-dialler' };
    }
  }

  /**
   * Resume auto-dialling for an agent
   */
  async resumeAutoDialer(agentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const autoDialState = autoDialStates.get(agentId);
      
      if (!autoDialState || !autoDialState.isActive) {
        return { success: false, message: 'Auto-dialler is not active' };
      }

      if (!autoDialState.isPaused) {
        return { success: true, message: 'Auto-dialler was not paused' };
      }

      autoDialState.isPaused = false;
      
      console.log(`▶️ Auto-dialler resumed for agent ${agentId}`);
      
      if (autoDialState.predictiveMode) {
        // Restart predictive pacing
        this.startPredictivePacing(agentId);
      } else {
        // Trigger next dial attempt
        setImmediate(() => this.attemptNextDial(agentId));
      }
      
      return { success: true, message: 'Auto-dialler resumed successfully' };

    } catch (error) {
      console.error('Error resuming auto-dialer:', error);
      return { success: false, message: 'Failed to resume auto-dialler' };
    }
  }

  /**
   * Get auto-dial status for an agent with predictive metrics
   */
  async getAutoDialStatus(agentId: string): Promise<{
    isActive: boolean;
    isPaused: boolean;
    campaignId?: string;
    dialCount: number;
    queueDepth: number;
    lastDialAttempt?: Date;
    predictiveMode: boolean;
    dialRatio?: number;
    lastPredictiveDecision?: DialingDecision;
  }> {
    const autoDialState = autoDialStates.get(agentId);
    
    if (!autoDialState) {
      return {
        isActive: false,
        isPaused: false,
        dialCount: 0,
        queueDepth: 0,
        predictiveMode: false
      };
    }

    // Get current queue depth for the campaign
    const queueDepth = await prisma.dialQueueEntry.count({
      where: {
        campaignId: autoDialState.campaignId,
        status: 'queued',
        assignedAgentId: null
      }
    });

    return {
      isActive: autoDialState.isActive,
      isPaused: autoDialState.isPaused,
      campaignId: autoDialState.campaignId,
      dialCount: autoDialState.dialCount,
      queueDepth,
      lastDialAttempt: autoDialState.lastDialAttempt,
      predictiveMode: autoDialState.predictiveMode,
      dialRatio: autoDialState.dialRatio,
      lastPredictiveDecision: autoDialState.lastPredictiveDecision
    };
  }

  /**
   * Start predictive pacing for an agent
   */
  private startPredictivePacing(agentId: string): void {
    const autoDialState = autoDialStates.get(agentId);
    if (!autoDialState || !autoDialState.predictiveMode) return;

    // Clear existing timer
    if (autoDialState.pacingTimer) {
      clearInterval(autoDialState.pacingTimer);
    }

    // Start predictive pacing timer (every 30 seconds)
    autoDialState.pacingTimer = setInterval(async () => {
      await this.executePredictiveDialing(agentId);
    }, 30000); // 30 second intervals for predictive decisions

    // Execute first predictive dialing decision immediately
    setImmediate(() => this.executePredictiveDialing(agentId));
  }

  /**
   * Execute predictive dialing decision
   */
  private async executePredictiveDialing(agentId: string): Promise<void> {
    try {
      const autoDialState = autoDialStates.get(agentId);
      if (!autoDialState || !autoDialState.isActive || autoDialState.isPaused) {
        return;
      }

      // Get current campaign metrics
      const metrics = await this.getCurrentCampaignMetrics(autoDialState.campaignId);
      
      // Get predictive decision
      const decision = predictiveDialingEngine.calculateDialingDecision(
        autoDialState.campaignId,
        metrics
      );

      // Store decision for status reporting
      autoDialState.lastPredictiveDecision = decision;
      autoDialState.dialRatio = decision.dialRatio;

      console.log(`🔮 Predictive decision for agent ${agentId}: ${decision.reasoning}`);

      if (decision.shouldDial && decision.callsToPlace > 0) {
        // Execute multiple dials based on predictive decision
        for (let i = 0; i < decision.callsToPlace; i++) {
          setTimeout(() => {
            this.attemptNextDial(agentId);
          }, i * 2000); // Stagger calls by 2 seconds
        }
      }

    } catch (error) {
      console.error(`Error in predictive dialing for agent ${agentId}:`, error);
    }
  }

  /**
   * Get current campaign metrics for predictive analysis
   */
  private async getCurrentCampaignMetrics(campaignId: string): Promise<PredictiveMetrics> {
    try {
      // Get active agents for this campaign
      const activeAgents = await prisma.agent.count({
        where: {
          status: 'AVAILABLE',
          campaignAssignments: {
            some: {
              campaignId,
              isActive: true
            }
          }
        }
      });

      // Get current active calls
      const activeCalls = await prisma.callRecord.count({
        where: {
          campaignId,
          endTime: null // Active calls haven't ended yet
        }
      });

      // Get queue depth
      const queueDepth = await prisma.dialQueueEntry.count({
        where: {
          campaignId,
          status: 'queued',
          assignedAgentId: null
        }
      });

      // Calculate recent performance metrics (last 24 hours)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentCalls = await prisma.callRecord.findMany({
        where: {
          campaignId,
          createdAt: { gte: yesterday }
        },
        select: {
          endTime: true,
          duration: true,
          outcome: true,
          dispositionId: true
        }
      });

      const totalCalls = recentCalls.length;
      const answeredCalls = recentCalls.filter(call => 
        call.endTime !== null && call.duration && call.duration > 0
      ).length;
      
      const abandonedCalls = recentCalls.filter(call =>
        call.outcome === 'abandoned' || call.outcome === 'no-answer'
      ).length;

      const avgDuration = answeredCalls > 0 
        ? recentCalls
            .filter(call => call.duration && call.duration > 0)
            .reduce((sum, call) => sum + (call.duration || 0), 0) / answeredCalls
        : 180; // Default 3 minutes

      return {
        answerRate: totalCalls > 0 ? answeredCalls / totalCalls : 0.3, // Default 30%
        averageCallDuration: avgDuration,
        agentUtilization: activeAgents > 0 ? activeCalls / activeAgents : 0,
        abandonmentRate: answeredCalls > 0 ? abandonedCalls / answeredCalls : 0,
        availableAgents: activeAgents,
        activeCalls,
        queueDepth
      };

    } catch (error) {
      console.error('Error getting campaign metrics:', error);
      // Return safe defaults
      return {
        answerRate: 0.3,
        averageCallDuration: 180,
        agentUtilization: 0,
        abandonmentRate: 0,
        availableAgents: 1,
        activeCalls: 0,
        queueDepth: 0
      };
    }
  }

  /**
   * Core method: Attempt to dial the next contact for an agent (enhanced with predictive capabilities)
   */
  private async attemptNextDial(agentId: string): Promise<AutoDialResult> {
    try {
      const autoDialState = autoDialStates.get(agentId);
      
      if (!autoDialState || !autoDialState.isActive || autoDialState.isPaused) {
        return { success: false, error: 'Auto-dialler not active or paused' };
      }

      // Check agent is still available
      const agent = await prisma.agent.findUnique({
        where: { agentId }
      });

      if (!agent || agent.status !== 'AVAILABLE') {
        console.log(`🛑 Agent ${agentId} no longer available, stopping auto-dialler`);
        await this.stopAutoDialer(agentId);
        return { success: false, error: 'Agent no longer available' };
      }

      // Get next contact from queue
      const nextContact = await this.getNextContactForAutoDial(autoDialState.campaignId);
      
      if (!nextContact) {
        console.log(`📭 No contacts available in queue for campaign ${autoDialState.campaignId}`);
        return { success: false, queueEmpty: true };
      }

      // Assign contact to agent
      await prisma.dialQueueEntry.update({
        where: { id: nextContact.id },
        data: {
          assignedAgentId: agentId,
          status: 'dialing',
          dialedAt: new Date()
        }
      });

      // Update auto-dial state
      autoDialState.lastDialAttempt = new Date();
      autoDialState.currentContactId = nextContact.contactId;
      autoDialState.dialCount++;

      // Get campaign details for CLI
      const campaign = await prisma.campaign.findUnique({
        where: { id: autoDialState.campaignId }
      });

      // For now, use a default CLI number - this should be configurable per campaign
      const cliNumber = process.env.DEFAULT_CLI_NUMBER || '+442046343130';

      // Initiate the actual call
      const callResult = await this.initiateAutoDialCall(
        nextContact.contact.phone,
        cliNumber,
        agentId,
        nextContact.contactId,
        autoDialState.campaignId
      );

      if (callResult.success) {
        console.log(`📞 Auto-dial call initiated: ${nextContact.contact.phone} for agent ${agentId} (Mode: ${autoDialState.predictiveMode ? 'Predictive' : 'Standard'})`);
        
        // Update agent status to on call (they will receive the connected call)
        await prisma.agent.update({
          where: { agentId },
          data: { status: 'OnCall' }
        });

        return {
          success: true,
          callId: callResult.callId,
          contactId: nextContact.contactId,
          predictiveDecision: autoDialState.lastPredictiveDecision
        };
      } else {
        // Call failed - release contact back to queue
        await prisma.dialQueueEntry.update({
          where: { id: nextContact.id },
          data: {
            assignedAgentId: null,
            status: 'queued',
            dialedAt: null
          }
        });

        return { success: false, error: callResult.error };
      }

    } catch (error) {
      console.error(`Error in attemptNextDial for agent ${agentId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get next contact from campaign queue for auto-dial
   */
  private async getNextContactForAutoDial(campaignId: string) {
    return await prisma.dialQueueEntry.findFirst({
      where: {
        campaignId,
        status: 'queued',
        assignedAgentId: null
      },
      include: {
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' }, // Lower number = higher priority
        { queuedAt: 'asc' }  // Oldest first
      ]
    });
  }

  /**
   * Initiate auto-dial call using Twilio client directly with AMD support
   */
  private async initiateAutoDialCall(
    customerPhone: string,
    cliNumber: string,
    agentId: string,
    contactId: string,
    campaignId: string
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      // Import Twilio for direct AMD-enabled calls
      const twilio = require('twilio');
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      if (!twilioClient) {
        return {
          success: false,
          error: 'Twilio client not configured'
        };
      }

      // Create call with AMD enabled for auto-dial
      const call = await twilioClient.calls.create({
        to: customerPhone,
        from: cliNumber,
        url: `${process.env.BACKEND_URL}/api/calls/twiml-customer-to-agent?agentId=${agentId}&contactId=${contactId}&campaignId=${campaignId}`,
        // Enable AMD for intelligent call handling
        machineDetection: 'Enable',
        machineDetectionTimeout: 8000, // 8 seconds for AMD analysis
        machineDetectionSpeechThreshold: 2400, // 2.4 seconds of speech
        machineDetectionSpeechEndThreshold: 1200, // 1.2 seconds of silence after speech
        machineDetectionSilenceTimeout: 5000, // 5 seconds of silence timeout
        asyncAmd: 'true',
        asyncAmdStatusCallback: `${process.env.BACKEND_URL}/api/auto-dial/amd-webhook`,
        // Additional call parameters
        timeout: 30, // Ring timeout in seconds
        record: false, // Recording will be handled by agent interface if needed
        statusCallback: `${process.env.BACKEND_URL}/api/auto-dial/call-status-webhook`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed']
      });

      if (call && call.sid) {
        // Log call attempt with AMD enabled
        console.log(`📞 Auto-dial call initiated with AMD: SID ${call.sid}`);
        
        return {
          success: true,
          callId: call.sid
        };
      } else {
        return {
          success: false,
          error: 'Failed to initiate call via Twilio'
        };
      }

    } catch (error) {
      console.error('Error initiating auto-dial call with AMD:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Call initiation failed'
      };
    }
  }

  /**
   * Handle agent status change events (called from AgentService)
   */
  async handleAgentStatusChange(agentId: string, newStatus: string, campaignId?: string): Promise<void> {
    const autoDialState = autoDialStates.get(agentId);

    if (newStatus === 'AVAILABLE' && campaignId) {
      if (!autoDialState) {
        // Start auto-dialler if agent becomes available with campaign
        await this.startAutoDialer(agentId, campaignId);
      } else if (autoDialState.isPaused) {
        // Resume if was paused
        await this.resumeAutoDialer(agentId);
      }
    } else if (newStatus === 'AWAY' || newStatus === 'BUSY' || newStatus === 'BREAK') {
      if (autoDialState && autoDialState.isActive) {
        // Pause auto-dialler when agent becomes unavailable
        await this.pauseAutoDialer(agentId);
      }
    } else if (newStatus === 'OFFLINE') {
      if (autoDialState && autoDialState.isActive) {
        // Stop auto-dialler when agent goes offline
        await this.stopAutoDialer(agentId);
      }
    }
  }

  /**
   * Handle call completion - trigger next dial if agent becomes available
   */
  async handleCallCompletion(agentId: string): Promise<void> {
    const autoDialState = autoDialStates.get(agentId);
    
    if (autoDialState && autoDialState.isActive && !autoDialState.isPaused) {
      // Check if agent is still available
      const agent = await prisma.agent.findUnique({
        where: { agentId }
      });

      if (agent && agent.status === 'AVAILABLE') {
        if (autoDialState.predictiveMode) {
          // In predictive mode, let the pacing algorithm handle next dial
          console.log(`🔮 Call completed for agent ${agentId} - predictive algorithm will determine next action`);
        } else {
          // In standard mode, wait 2 seconds then trigger next dial
          setTimeout(() => {
            this.attemptNextDial(agentId);
          }, 2000);
        }
      }
    }
  }

  /**
   * Get all active auto-dial sessions (for monitoring)
   */
  getActiveAutoDialSessions(): AutoDialState[] {
    return Array.from(autoDialStates.values()).filter(state => state.isActive);
  }

  /**
   * Get predictive performance statistics for a campaign
   */
  async getPredictiveStats(campaignId: string) {
    return predictiveDialingEngine.getPerformanceStats(campaignId);
  }

  /**
   * Update predictive dialing configuration
   */
  updatePredictiveConfig(config: Partial<typeof predictiveDialingEngine>) {
    // This could be enhanced to update the predictive engine configuration
    console.log('Predictive configuration update requested:', config);
  }

  /**
   * Handle AMD (Answering Machine Detection) webhook
   */
  async handleAMDWebhook(amdData: {
    CallSid: string;
    MachineDetectionResult: 'human' | 'machine' | 'unknown' | 'fax';
    MachineDetectionDuration: number;
    agentId?: string;
    contactId?: string;
    campaignId?: string;
  }): Promise<void> {
    const { CallSid, MachineDetectionResult, MachineDetectionDuration, agentId, contactId, campaignId } = amdData;
    
    console.log(`🤖 AMD Result for ${CallSid}: ${MachineDetectionResult} (${MachineDetectionDuration}s)`);
    
    try {
      // Update call record with AMD result
      await prisma.callRecord.updateMany({
        where: { callId: CallSid },
        data: {
          outcome: MachineDetectionResult,
          notes: `AMD: ${MachineDetectionResult} detected in ${MachineDetectionDuration}s`
        }
      });

      // Handle different AMD outcomes
      switch (MachineDetectionResult) {
        case 'human':
          await this.handleHumanAnswered(CallSid, agentId, contactId, campaignId);
          break;
        
        case 'machine':
          await this.handleAnsweringMachine(CallSid, agentId, contactId, campaignId);
          break;
          
        case 'fax':
          await this.handleFaxDetected(CallSid, agentId, contactId, campaignId);
          break;
          
        case 'unknown':
        default:
          await this.handleUnknownAMD(CallSid, agentId, contactId, campaignId);
          break;
      }

    } catch (error) {
      console.error(`❌ Error processing AMD webhook for ${CallSid}:`, error);
      
      // If agent is assigned, release them back to available
      if (agentId) {
        await this.releaseAgentFromFailedCall(agentId);
      }
    }
  }

  /**
   * Handle human answered - route to agent and start sentiment monitoring
   */
  private async handleHumanAnswered(
    callId: string, 
    agentId?: string, 
    contactId?: string, 
    campaignId?: string
  ): Promise<void> {
    console.log(`👤 Human answered call ${callId}, routing to agent ${agentId}`);
    
    try {
      // Agent should already be assigned and status set to OnCall
      // The existing TwiML will handle connecting the customer to the agent
      
      // Update dial queue entry status
      if (contactId && agentId) {
        await prisma.dialQueueEntry.updateMany({
          where: {
            contactId,
            assignedAgentId: agentId,
            status: 'dialing'
          },
          data: {
            status: 'connected'
          }
        });
      }

      // Start real-time sentiment monitoring for this call
      if (agentId && campaignId) {
        await autoDialSentimentMonitor.startCallMonitoring(callId, agentId, campaignId);
        console.log(`🎯 Started sentiment monitoring for call ${callId} with agent ${agentId}`);
      }
      
      // Log successful human connection
      console.log(`✅ Human call ${callId} successfully routed to agent ${agentId} with sentiment monitoring active`);
      
    } catch (error) {
      console.error(`Error handling human answered for ${callId}:`, error);
    }
  }

  /**
   * Handle answering machine detected
   */
  private async handleAnsweringMachine(
    callId: string, 
    agentId?: string, 
    contactId?: string, 
    campaignId?: string
  ): Promise<void> {
    console.log(`🤖 Answering machine detected for call ${callId}`);
    
    try {
      // Hang up the call - no point in connecting agent to answering machine
      const twilio = require('twilio');
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      if (twilioClient) {
        await twilioClient.calls(callId).update({ status: 'completed' });
        console.log(`📞 Call ${callId} ended - answering machine`);
      }

      // Update contact for potential retry later
      if (contactId) {
        await prisma.dialQueueEntry.updateMany({
          where: {
            contactId,
            assignedAgentId: agentId,
            status: 'dialing'
          },
          data: {
            status: 'answering_machine',
            assignedAgentId: null
            // Note: scheduledRetryAt would need to be added to schema if retry scheduling is needed
          }
        });
      }

      // Release agent back to available
      if (agentId) {
        await this.releaseAgentFromCall(agentId);
        
        // Trigger next auto-dial for this agent if still active
        const autoDialState = autoDialStates.get(agentId);
        if (autoDialState && autoDialState.isActive && !autoDialState.isPaused) {
          setTimeout(() => {
            this.attemptNextDial(agentId);
          }, 1000); // Quick retry for answering machine
        }
      }

    } catch (error) {
      console.error(`Error handling answering machine for ${callId}:`, error);
    }
  }

  /**
   * Handle fax machine detected
   */
  private async handleFaxDetected(
    callId: string, 
    agentId?: string, 
    contactId?: string, 
    campaignId?: string
  ): Promise<void> {
    console.log(`📠 Fax machine detected for call ${callId}`);
    
    try {
      // Hang up the call
      const twilio = require('twilio');
      const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      
      if (twilioClient) {
        await twilioClient.calls(callId).update({ status: 'completed' });
        console.log(`📞 Call ${callId} ended - fax machine`);
      }

      // Mark contact as fax number - do not retry
      if (contactId) {
        await prisma.dialQueueEntry.updateMany({
          where: {
            contactId,
            assignedAgentId: agentId,
            status: 'dialing'
          },
          data: {
            status: 'fax_detected',
            assignedAgentId: null
          }
        });

        // Add note to contact
        await prisma.contact.update({
          where: { contactId },
          data: {
            notes: 'Fax machine detected - removed from calling queue'
          }
        });
      }

      // Release agent
      if (agentId) {
        await this.releaseAgentFromCall(agentId);
        
        // Trigger next auto-dial
        const autoDialState = autoDialStates.get(agentId);
        if (autoDialState && autoDialState.isActive && !autoDialState.isPaused) {
          setTimeout(() => {
            this.attemptNextDial(agentId);
          }, 500);
        }
      }

    } catch (error) {
      console.error(`Error handling fax detected for ${callId}:`, error);
    }
  }

  /**
   * Handle unknown AMD result
   */
  private async handleUnknownAMD(
    callId: string, 
    agentId?: string, 
    contactId?: string, 
    campaignId?: string
  ): Promise<void> {
    console.log(`❓ Unknown AMD result for call ${callId} - routing to agent as precaution`);
    
    // Treat unknown as human to avoid missing potential customers
    await this.handleHumanAnswered(callId, agentId, contactId, campaignId);
  }

  /**
   * Release agent from call and set back to Available
   */
  private async releaseAgentFromCall(agentId: string): Promise<void> {
    try {
      await prisma.agent.update({
        where: { agentId },
        data: { status: 'AVAILABLE' }
      });
      
      console.log(`👤 Agent ${agentId} released back to Available status`);
      
    } catch (error) {
      console.error(`Error releasing agent ${agentId}:`, error);
    }
  }

  /**
   * Release agent from failed call
   */
  private async releaseAgentFromFailedCall(agentId: string): Promise<void> {
    await this.releaseAgentFromCall(agentId);
    
    // Also clean up any dial queue entries
    await prisma.dialQueueEntry.updateMany({
      where: {
        assignedAgentId: agentId,
        status: 'dialing'
      },
      data: {
        assignedAgentId: null,
        status: 'queued'
      }
    });
  }

  /**
   * Handle call status webhooks (initiated, ringing, answered, completed)
   */
  async handleCallStatusWebhook(statusData: {
    CallSid: string;
    CallStatus: string;
    Duration?: number;
    agentId?: string;
    contactId?: string;
    campaignId?: string;
  }): Promise<void> {
    const { CallSid, CallStatus, Duration, agentId, contactId, campaignId } = statusData;
    
    console.log(`📞 Call status update: ${CallSid} -> ${CallStatus}`);
    
    try {
      // Update call record
      const updateData: any = {
        outcome: CallStatus
      };
      
      if (CallStatus === 'completed' && Duration) {
        updateData.duration = Duration; // Duration is already a number
        updateData.endTime = new Date();
      }
      
      await prisma.callRecord.updateMany({
        where: { callId: CallSid },
        data: updateData
      });

      // Handle call completion
      if (CallStatus === 'completed' && agentId) {
        // End sentiment monitoring and get final report
        const finalSentimentReport = await autoDialSentimentMonitor.endCallMonitoring(CallSid);
        if (finalSentimentReport) {
          console.log(`📊 Final sentiment report for call ${CallSid}:`, {
            sentiment: finalSentimentReport.overallSentiment,
            satisfaction: finalSentimentReport.customerSatisfactionScore.toFixed(2),
            alerts: finalSentimentReport.alertCount
          });
        }

        await this.handleCallCompletion(agentId);
      }

    } catch (error) {
      console.error(`Error handling call status webhook for ${CallSid}:`, error);
    }
  }
}

export const autoDialEngine = new AutoDialEngine();