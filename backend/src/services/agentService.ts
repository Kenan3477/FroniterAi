/**
 * Omnivox AI Agent Service
 * Production-ready agent management with database persistence
 * Replaces mock agent data in routes
 */

import { PrismaClient, Agent } from '@prisma/client';
import { z } from 'zod';
import { autoDialEngine } from './autoDialEngine';

const prisma = new PrismaClient();

// Agent status type definition
export type AgentStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'ACW' | 'AWAY' | 'BREAK';

// Input validation schemas
const CreateAgentSchema = z.object({
  agentId: z.string().min(1).max(255),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  email: z.string().email().max(255),
  status: z.enum(['OFFLINE', 'AVAILABLE', 'ON_CALL', 'ACW', 'AWAY', 'BREAK']).default('OFFLINE'),
  extension: z.string().max(20).optional(),
  skills: z.array(z.string()).optional(),
  maxConcurrentCalls: z.number().int().min(1).max(10).default(1)
});

const UpdateAgentStatusSchema = z.object({
  status: z.enum(['OFFLINE', 'AVAILABLE', 'ON_CALL', 'ACW', 'AWAY', 'BREAK']),
  currentCall: z.object({
    contactId: z.string(),
    campaignId: z.string(),
    startTime: z.date()
  }).optional()
});

export type CreateAgentRequest = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentStatusRequest = z.infer<typeof UpdateAgentStatusSchema>;

// Extended agent interface for frontend compatibility
export interface AgentWithStats {
  id: string;
  agentId: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  status: AgentStatus;
  lastStatusChange: Date;
  extension?: string;
  skills: string[];
  currentCall?: {
    contactId: string;
    campaignId: string;
    startTime: Date;
  };
  assignedCampaigns: string[];
  sessionStartTime?: Date;
  callsToday: number;
  isLoggedIn: boolean;
  maxConcurrentCalls: number;
}

export class AgentService {
  
  /**
   * Create or update agent record
   */
  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    const validatedData = CreateAgentSchema.parse(data);
    
    // Check if agent already exists
    const existingAgent = await prisma.agent.findUnique({
      where: { agentId: validatedData.agentId }
    });

    if (existingAgent) {
      // Update existing agent with new data
      return await prisma.agent.update({
        where: { agentId: validatedData.agentId },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          email: validatedData.email,
          status: validatedData.status,
          extension: validatedData.extension,
          skills: validatedData.skills ? JSON.stringify(validatedData.skills) : null,
          maxConcurrentCalls: validatedData.maxConcurrentCalls,
          updatedAt: new Date()
        }
      });
    }

    // Create new agent
    return await prisma.agent.create({
      data: {
        agentId: validatedData.agentId,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        status: validatedData.status,
        extension: validatedData.extension,
        skills: validatedData.skills ? JSON.stringify(validatedData.skills) : null,
        maxConcurrentCalls: validatedData.maxConcurrentCalls,
        lastStatusChange: new Date()
      }
    });
  }

  /**
   * Get all agents with campaign assignments and metrics
   */
  async getAllAgentsWithStats(): Promise<AgentWithStats[]> {
    const agents = await prisma.agent.findMany({
      include: {
        campaignAssignments: {
          where: { isActive: true },
          include: {
            campaign: {
              select: {
                campaignId: true,
                name: true
              }
            }
          }
        }
      }
    });

    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        // Get today's call count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const callsToday = await prisma.callRecord.count({
          where: {
            agentId: agent.agentId,
            startTime: {
              gte: today
            }
          }
        });

        // Parse skills from JSON
        const skills = agent.skills ? JSON.parse(agent.skills) : [];
        
        // Get assigned campaigns
        const assignedCampaigns = agent.campaignAssignments.map(
          assignment => assignment.campaign.campaignId
        );

        // Parse current call if exists
        let currentCall;
        if (agent.currentCall) {
          try {
            currentCall = JSON.parse(agent.currentCall);
          } catch (e) {
            currentCall = null;
          }
        }

        return {
          id: agent.id,
          agentId: agent.agentId,
          name: `${agent.firstName} ${agent.lastName}`,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
          status: agent.status as AgentStatus,
          lastStatusChange: agent.lastStatusChange,
          extension: agent.extension || undefined,
          skills,
          currentCall,
          assignedCampaigns,
          sessionStartTime: agent.isLoggedIn ? agent.lastStatusChange : undefined,
          callsToday,
          isLoggedIn: agent.isLoggedIn,
          maxConcurrentCalls: agent.maxConcurrentCalls
        } as AgentWithStats;
      })
    );

    return agentsWithStats;
  }

  /**
   * Get agent by ID with stats
   */
  async getAgentById(agentId: string): Promise<AgentWithStats | null> {
    const agent = await prisma.agent.findUnique({
      where: { agentId },
      include: {
        campaignAssignments: {
          where: { isActive: true },
          include: {
            campaign: {
              select: {
                campaignId: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!agent) {
      return null;
    }

    // Get today's call count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const callsToday = await prisma.callRecord.count({
      where: {
        agentId: agent.agentId,
        startTime: {
          gte: today
        }
      }
    });

    const skills = agent.skills ? JSON.parse(agent.skills) : [];
    const assignedCampaigns = agent.campaignAssignments.map(
      assignment => assignment.campaign.campaignId
    );

    let currentCall;
    if (agent.currentCall) {
      try {
        currentCall = JSON.parse(agent.currentCall);
      } catch (e) {
        currentCall = null;
      }
    }

    return {
      id: agent.id,
      agentId: agent.agentId,
      name: `${agent.firstName} ${agent.lastName}`,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      status: agent.status as AgentStatus,
      lastStatusChange: agent.lastStatusChange,
      extension: agent.extension || undefined,
      skills,
      currentCall,
      assignedCampaigns,
      sessionStartTime: agent.isLoggedIn ? agent.lastStatusChange : undefined,
      callsToday,
      isLoggedIn: agent.isLoggedIn,
      maxConcurrentCalls: agent.maxConcurrentCalls
    };
  }

  /**
   * Update agent status with auto-dialer integration
   */
  async updateAgentStatus(agentId: string, statusUpdate: UpdateAgentStatusRequest): Promise<AgentWithStats> {
    const validatedData = UpdateAgentStatusSchema.parse(statusUpdate);
    
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    const oldStatus = agent.status;
    const newStatus = validatedData.status;

    // Prepare update data
    const updateData: any = {
      status: newStatus,
      lastStatusChange: new Date(),
      updatedAt: new Date()
    };

    // Handle login/logout logic
    if (newStatus === 'AVAILABLE' && oldStatus === 'OFFLINE') {
      updateData.isLoggedIn = true;
    } else if (newStatus === 'OFFLINE') {
      updateData.isLoggedIn = false;
      updateData.currentCall = null;
    }

    // Handle current call data
    if (validatedData.currentCall) {
      updateData.currentCall = JSON.stringify(validatedData.currentCall);
    } else if (newStatus === 'OFFLINE' || newStatus === 'AVAILABLE') {
      updateData.currentCall = null;
    }

    // Update in database
    const updatedAgent = await prisma.agent.update({
      where: { agentId },
      data: updateData,
      include: {
        campaignAssignments: {
          where: { isActive: true },
          include: {
            campaign: {
              select: {
                campaignId: true,
                name: true
              }
            }
          }
        }
      }
    });

    // Log status change
    console.log(`📊 Agent ${agentId} status changed: ${oldStatus} -> ${newStatus}`);

    // Handle auto-dial based on status change
    if (newStatus === 'AVAILABLE' && oldStatus !== 'AVAILABLE') {
      // Agent became available - check if they have campaign assignments to start auto-dial
      const campaignAssignments = await prisma.agentCampaignAssignment.findMany({
        where: {
          agentId,
          isActive: true
        },
        include: {
          campaign: {
            select: {
              campaignId: true,
              dialMethod: true,
              status: true
            }
          }
        }
      });

      // Start auto-dial for campaigns that support it
      for (const assignment of campaignAssignments) {
        const campaign = assignment.campaign;
        if (campaign.dialMethod === 'AUTODIAL' && campaign.status === 'Active') {
          console.log(`🎯 Starting auto-dial for agent ${agentId} in campaign ${campaign.campaignId}`);
          await autoDialEngine.handleAgentStatusChange(agentId, newStatus, campaign.campaignId);
          break; // Only start auto-dial for one campaign at a time
        }
      }
    } else if (newStatus === 'AWAY' || newStatus === 'BREAK') {
      // Agent became unavailable - pause auto-dial
      console.log(`⏸️ Agent ${agentId} unavailable, handling auto-dial status`);
      await autoDialEngine.handleAgentStatusChange(agentId, newStatus);
    } else if (newStatus === 'OFFLINE') {
      // Agent went offline - stop auto-dial
      console.log(`⏹️ Agent ${agentId} offline, stopping auto-dial`);
      await autoDialEngine.handleAgentStatusChange(agentId, newStatus);
    }

    // Legacy auto-dialer trigger (keep for backward compatibility)
    if (newStatus === 'AVAILABLE' && oldStatus !== 'AVAILABLE') {
      setImmediate(() => this.triggerAutoDialer(agentId));
    }

    return this.formatAgentWithStats(updatedAgent);
  }

  /**
   * Assign agent to campaign
   */
  async assignToCampaign(agentId: string, campaignId: string): Promise<void> {
    // Verify agent exists
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if already assigned
    const existingAssignment = await prisma.agentCampaignAssignment.findUnique({
      where: {
        agentId_campaignId: {
          agentId,
          campaignId
        }
      }
    });

    if (existingAssignment) {
      if (existingAssignment.isActive) {
        throw new Error('Agent already assigned to this campaign');
      }
      
      // Reactivate existing assignment
      await prisma.agentCampaignAssignment.update({
        where: {
          agentId_campaignId: {
            agentId,
            campaignId
          }
        },
        data: {
          isActive: true,
          assignedAt: new Date()
        }
      });
    } else {
      // Create new assignment
      await prisma.agentCampaignAssignment.create({
        data: {
          agentId,
          campaignId,
          isActive: true
        }
      });
    }

    console.log(`✅ Agent ${agentId} assigned to campaign ${campaignId}`);
  }

  /**
   * Remove agent from campaign
   */
  async removeFromCampaign(agentId: string, campaignId: string): Promise<void> {
    const assignment = await prisma.agentCampaignAssignment.findUnique({
      where: {
        agentId_campaignId: {
          agentId,
          campaignId
        }
      }
    });

    if (!assignment || !assignment.isActive) {
      throw new Error('Agent not assigned to this campaign');
    }

    await prisma.agentCampaignAssignment.update({
      where: {
        agentId_campaignId: {
          agentId,
          campaignId
        }
      },
      data: {
        isActive: false
      }
    });

    console.log(`✅ Agent ${agentId} removed from campaign ${campaignId}`);
  }

  /**
   * Get agents by campaign
   */
  async getAgentsByCampaign(campaignId: string): Promise<AgentWithStats[]> {
    const assignments = await prisma.agentCampaignAssignment.findMany({
      where: {
        campaignId,
        isActive: true
      },
      include: {
        agent: {
          include: {
            campaignAssignments: {
              where: { isActive: true },
              include: {
                campaign: {
                  select: {
                    campaignId: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const agents = await Promise.all(
      assignments.map(assignment => this.formatAgentWithStats(assignment.agent))
    );

    return agents;
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics() {
    const agents = await prisma.agent.findMany();
    
    const waiting = agents.filter(a => a.status === 'AVAILABLE').length;
    const active = agents.filter(a => a.status === 'ON_CALL').length;
    const paused = agents.filter(a => ['AWAY', 'BREAK'].includes(a.status)).length;
    const total = agents.length;

    // Calculate real queue metrics
    const averageWaitTime = await this.calculateAverageWaitTime();
    const callsInQueue = await this.getCallsInQueue();
    const longestWaitTime = await this.getLongestWaitTime();

    return {
      waiting,
      active,
      paused,
      total,
      metrics: {
        averageWaitTime,
        callsInQueue,
        longestWaitTime
      }
    };
  }

  /**
   * End agent call
   */
  async endCall(agentId: string, outcome: string, notes?: string, duration?: number): Promise<AgentWithStats> {
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.status !== 'ON_CALL') {
      throw new Error('Agent is not on a call');
    }

    // Update agent to ACW (After Call Work)
    const updatedAgent = await prisma.agent.update({
      where: { agentId },
      data: {
        status: 'ACW',
        currentCall: null,
        lastStatusChange: new Date()
      },
      include: {
        campaignAssignments: {
          where: { isActive: true },
          include: {
            campaign: {
              select: {
                campaignId: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`📞 Call ended: Agent ${agentId}, Outcome: ${outcome}`);

    // Schedule auto-return to available after ACW period
    setTimeout(async () => {
      try {
        await prisma.agent.update({
          where: { agentId },
          data: {
            status: 'AVAILABLE',
            lastStatusChange: new Date()
          }
        });
        
        // Trigger auto-dialer
        this.triggerAutoDialer(agentId);
      } catch (error) {
        console.error(`Error returning agent ${agentId} to available:`, error);
      }
    }, 5000); // 5 second ACW period

    return this.formatAgentWithStats(updatedAgent);
  }

  /**
   * Private helper methods
   */
  private async formatAgentWithStats(agent: any): Promise<AgentWithStats> {
    // Get today's call count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const callsToday = await prisma.callRecord.count({
      where: {
        agentId: agent.agentId,
        startTime: {
          gte: today
        }
      }
    });

    const skills = agent.skills ? JSON.parse(agent.skills) : [];
    const assignedCampaigns = agent.campaignAssignments?.map(
      (assignment: any) => assignment.campaign.campaignId
    ) || [];

    let currentCall;
    if (agent.currentCall) {
      try {
        currentCall = JSON.parse(agent.currentCall);
      } catch (e) {
        currentCall = null;
      }
    }

    return {
      id: agent.id,
      agentId: agent.agentId,
      name: `${agent.firstName} ${agent.lastName}`,
      firstName: agent.firstName,
      lastName: agent.lastName,
      email: agent.email,
      status: agent.status as AgentStatus,
      lastStatusChange: agent.lastStatusChange,
      extension: agent.extension || undefined,
      skills,
      currentCall,
      assignedCampaigns,
      sessionStartTime: agent.isLoggedIn ? agent.lastStatusChange : undefined,
      callsToday,
      isLoggedIn: agent.isLoggedIn,
      maxConcurrentCalls: agent.maxConcurrentCalls
    };
  }

  private async triggerAutoDialer(agentId: string): Promise<void> {
    try {
      const agent = await this.getAgentById(agentId);
      if (!agent || agent.status !== 'AVAILABLE') {
        return;
      }

      console.log(`🎯 Triggering auto-dialer for agent ${agentId}`);

      // For each assigned campaign, check if there are queued contacts
      for (const campaignId of agent.assignedCampaigns) {
        try {
          // Check dial queue for available contacts
          const queueEntry = await prisma.dialQueueEntry.findFirst({
            where: {
              campaignId,
              status: 'queued',
              assignedAgentId: null
            },
            orderBy: [
              { priority: 'desc' },
              { queuedAt: 'asc' }
            ]
          });

          if (queueEntry) {
            console.log(`📞 Auto-dial initiated: Agent ${agentId} dialing contact ${queueEntry.contactId}`);
            
            // Update agent status to ON_CALL
            await this.updateAgentStatus(agentId, {
              status: 'ON_CALL',
              currentCall: {
                contactId: queueEntry.contactId,
                campaignId,
                startTime: new Date()
              }
            });

            // Update queue entry
            await prisma.dialQueueEntry.update({
              where: { id: queueEntry.id },
              data: {
                assignedAgentId: agentId,
                dialedAt: new Date(),
                status: 'dialing'
              }
            });

            break; // Only dial one contact at a time per agent
          }
        } catch (error) {
          console.error(`Error checking dial queue for campaign ${campaignId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error in triggerAutoDialer for agent ${agentId}:`, error);
    }
  }

  private async calculateAverageWaitTime(): Promise<number> {
    const result = await prisma.dialQueueEntry.aggregate({
      where: {
        status: 'queued'
      },
      _avg: {
        // Calculate time since queued
      }
    });
    
    // This would need a proper calculation based on queue times
    return 45; // Placeholder until proper calculation is implemented
  }

  private async getCallsInQueue(): Promise<number> {
    return await prisma.dialQueueEntry.count({
      where: {
        status: 'queued'
      }
    });
  }

  private async getLongestWaitTime(): Promise<number> {
    const oldestEntry = await prisma.dialQueueEntry.findFirst({
      where: {
        status: 'queued'
      },
      orderBy: {
        queuedAt: 'asc'
      }
    });

    if (!oldestEntry) {
      return 0;
    }

    const waitTime = Math.floor((Date.now() - oldestEntry.queuedAt.getTime()) / 1000);
    return waitTime;
  }
}

export const agentService = new AgentService();