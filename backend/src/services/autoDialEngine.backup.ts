/**
 * Auto-Dial Engine Service
 * Core auto-dialling engine for Omniv      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          name: true,
          outboundNumber: true,
          status: true,
          dialMethod: true,
          dataSources: {
            include: {
              dataList: true
            }
          }
        }
      });AI
 * Automatically initiates calls when agents are available
 */

import { PrismaClient } from '@prisma/client';
import * as twilioService from './twilioService';

const prisma = new PrismaClient();

// Auto-dial state management
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
}

interface AutoDialRequest {
  agentId: string;
  campaignId: string;
}

interface AutoDialResult {
  success: boolean;
  callId?: string;
  contactId?: string;
  error?: string;
  queueEmpty?: boolean;
}

export class AutoDialEngine {
  
  /**
   * Start auto-dialling for an agent in a campaign
   */
  async startAutoDialer(agentId: string, campaignId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🚀 Starting auto-dialer for agent ${agentId} in campaign ${campaignId}`);
      
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

      if (!agent || agent.status !== 'AVAILABLE') {
        return { success: false, message: 'Agent must be Available to start auto-dialling' };
      }

      if (agent.campaignAssignments.length === 0) {
        return { success: false, message: 'Agent not assigned to this campaign' };
      }

      // Verify campaign exists and supports auto-dial
      const campaign = await prisma.campaign.findUnique({
        where: { campaignId }
      });

      if (!campaign) {
        return { success: false, message: 'Campaign not found' };
      }

      if (campaign.status !== 'Active') {
        return { success: false, message: 'Campaign must be active for auto-dialling' };
      }

      // Initialize auto-dial state
      const autoDialState: AutoDialState = {
        agentId,
        campaignId,
        isActive: true,
        isPaused: false,
        dialCount: 0,
        sessionStartTime: new Date()
      };

      autoDialStates.set(agentId, autoDialState);

      // Trigger first auto-dial attempt
      setImmediate(() => this.attemptNextDial(agentId));

      return { 
        success: true, 
        message: `Auto-dialler started for agent ${agentId} in campaign ${campaign.name}` 
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
      
      // Trigger next dial attempt
      setImmediate(() => this.attemptNextDial(agentId));
      
      return { success: true, message: 'Auto-dialler resumed successfully' };

    } catch (error) {
      console.error('Error resuming auto-dialer:', error);
      return { success: false, message: 'Failed to resume auto-dialler' };
    }
  }

  /**
   * Get auto-dial status for an agent
   */
  async getAutoDialStatus(agentId: string): Promise<{
    isActive: boolean;
    isPaused: boolean;
    campaignId?: string;
    dialCount: number;
    queueDepth: number;
    lastDialAttempt?: Date;
  }> {
    const autoDialState = autoDialStates.get(agentId);
    
    if (!autoDialState) {
      return {
        isActive: false,
        isPaused: false,
        dialCount: 0,
        queueDepth: 0
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
      lastDialAttempt: autoDialState.lastDialAttempt
    };
  }

  /**
   * Core method: Attempt to dial the next contact for an agent
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

      if (!agent || agent.status !== 'Available') {
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
        where: { campaignId: autoDialState.campaignId }
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
        console.log(`📞 Auto-dial call initiated: ${nextContact.contact.phone} for agent ${agentId}`);
        
        // Update agent status to on call (they will receive the connected call)
        await prisma.agent.update({
          where: { agentId },
          data: { status: 'OnCall' }
        });

        return {
          success: true,
          callId: callResult.callId,
          contactId: nextContact.contactId
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
   * Initiate auto-dial call using existing Twilio infrastructure
   */
  private async initiateAutoDialCall(
    customerPhone: string,
    cliNumber: string,
    agentId: string,
    contactId: string,
    campaignId: string
  ): Promise<{ success: boolean; callId?: string; error?: string }> {
    try {
      // Use existing Twilio service to make the call
      const callResult = await twilioService.createRestApiCall({
        to: customerPhone,
        from: cliNumber,
        url: `${process.env.BACKEND_URL}/api/calls/twiml-customer-to-agent?agentId=${agentId}&contactId=${contactId}&campaignId=${campaignId}`
      });

      if (callResult && callResult.sid) {
        // Log call attempt
        console.log(`📞 Auto-dial call initiated: SID ${callResult.sid}`);
        
        return {
          success: true,
          callId: callResult.sid
        };
      } else {
        return {
          success: false,
          error: 'Failed to initiate call via Twilio'
        };
      }

    } catch (error) {
      console.error('Error initiating auto-dial call:', error);
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

    if (newStatus === 'Available' && campaignId) {
      if (!autoDialState) {
        // Start auto-dialler if agent becomes available with campaign
        await this.startAutoDialer(agentId, campaignId);
      } else if (autoDialState.isPaused) {
        // Resume if was paused
        await this.resumeAutoDialer(agentId);
      }
    } else if (newStatus === 'Away' || newStatus === 'Busy' || newStatus === 'Break') {
      if (autoDialState && autoDialState.isActive) {
        // Pause auto-dialler when agent becomes unavailable
        await this.pauseAutoDialer(agentId);
      }
    } else if (newStatus === 'Offline') {
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

      if (agent && agent.status === 'Available') {
        // Wait 2 seconds then trigger next dial (give agent time to update disposition)
        setTimeout(() => {
          this.attemptNextDial(agentId);
        }, 2000);
      }
    }
  }

  /**
   * Get all active auto-dial sessions (for monitoring)
   */
  getActiveAutoDialSessions(): AutoDialState[] {
    return Array.from(autoDialStates.values()).filter(state => state.isActive);
  }
}

export const autoDialEngine = new AutoDialEngine();