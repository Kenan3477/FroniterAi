/**
 * Omnivox AI Queue Service  
 * Production-ready queue management with database persistence
 * Replaces mock queue data in dialQueue routes
 */

import { PrismaClient, DialQueueEntry } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Input validation schemas
const CreateQueueEntrySchema = z.object({
  campaignId: z.string().min(1),
  listId: z.string().min(1),
  contactId: z.string().min(1),
  priority: z.number().int().min(1).max(10).default(5)
});

const UpdateQueueEntrySchema = z.object({
  status: z.enum(['queued', 'dialing', 'connected', 'completed', 'failed', 'abandoned']).optional(),
  assignedAgentId: z.string().optional(),
  dialedAt: z.date().optional(),
  completedAt: z.date().optional(),
  outcome: z.string().optional(),
  notes: z.string().optional()
});

export type CreateQueueEntryRequest = z.infer<typeof CreateQueueEntrySchema>;
export type UpdateQueueEntryRequest = z.infer<typeof UpdateQueueEntrySchema>;

export interface QueueMetrics {
  totalQueued: number;
  totalDialing: number;
  totalCompleted: number;
  averageWaitTime: number;
  longestWaitTime: number;
}

export interface CampaignQueueStats {
  campaignId: string;
  totalQueued: number;
  dialedToday: number;
  completedToday: number;
  activeAgents: number;
  averageDialTime: number;
  conversionRate: number;
}

export class QueueService {

  /**
   * Generate dial queue entries for a campaign from available contacts
   */
  async generateQueueForCampaign(campaignId: string, maxRecords: number = 20): Promise<any[]> {
    try {
      // Clear existing queue entries for this campaign
      await prisma.dialQueueEntry.deleteMany({
        where: {
          campaignId,
          status: 'queued'
        }
      });

      // Get dialable contacts for the campaign
      const dialableContacts = await prisma.contact.findMany({
        where: {
          locked: false,
          status: {
            notIn: ['MaxAttempts', 'DoNotCall', 'Invalid']
          },
          attemptCount: {
            lt: prisma.contact.fields.maxAttempts
          },
          OR: [
            { nextAttempt: null },
            { nextAttempt: { lte: new Date() } }
          ]
        },
        orderBy: [
          { status: 'asc' }, // NotAttempted first
          { attemptCount: 'asc' }
        ],
        take: maxRecords
      });

      console.log(`📞 Found ${dialableContacts.length} dialable contacts for campaign ${campaignId}`);

      // Create queue entries
      const queueEntries = await Promise.all(
        dialableContacts.map(async (contact, index) => {
          return await prisma.dialQueueEntry.create({
            data: {
              queueId: `queue_${campaignId}_${Date.now()}_${index}`,
              campaignId,
              listId: contact.listId,
              contactId: contact.contactId,
              status: 'queued',
              priority: contact.status === 'new' ? 1 : 2,
              queuedAt: new Date()
            }
          });
        })
      );

      console.log(`✅ Generated ${queueEntries.length} queue entries for campaign ${campaignId}`);

      return queueEntries;
    } catch (error) {
      console.error('Error generating queue for campaign:', error);
      throw error;
    }
  }

  /**
   * Get queue statistics for a campaign
   */
  async getCampaignQueueStats(campaignId: string): Promise<CampaignQueueStats> {
    try {
      // Get queue counts
      const totalQueued = await prisma.dialQueueEntry.count({
        where: { campaignId, status: 'queued' }
      });

      const totalDialing = await prisma.dialQueueEntry.count({
        where: { campaignId, status: 'dialing' }
      });

      // Get today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dialedToday = await prisma.dialQueueEntry.count({
        where: {
          campaignId,
          dialedAt: { gte: today }
        }
      });

      const completedToday = await prisma.dialQueueEntry.count({
        where: {
          campaignId,
          completedAt: { gte: today },
          status: 'completed'
        }
      });

      // Get active agents count
      const activeAgents = await prisma.agent.count({
        where: {
          status: { in: ['AVAILABLE', 'ON_CALL'] },
          campaignAssignments: {
            some: {
              campaignId,
              isActive: true
            }
          }
        }
      });

      // Calculate average dial time (placeholder for now)
      const averageDialTime = await this.calculateAverageDialTime(campaignId);

      // Calculate conversion rate
      const conversionRate = dialedToday > 0 ? (completedToday / dialedToday) * 100 : 0;

      return {
        campaignId,
        totalQueued,
        dialedToday,
        completedToday,
        activeAgents,
        averageDialTime,
        conversionRate
      };
    } catch (error) {
      console.error('Error getting campaign queue stats:', error);
      throw error;
    }
  }

  /**
   * Get next available contact for agent to dial
   */
  async getNextContactForAgent(agentId: string, campaignId?: string): Promise<any | null> {
    try {
      // Build where clause
      const whereClause: any = {
        status: 'queued',
        assignedAgentId: null
      };

      if (campaignId) {
        whereClause.campaignId = campaignId;
      } else {
        // Get agent's assigned campaigns
        const agent = await prisma.agent.findUnique({
          where: { agentId },
          include: {
            campaignAssignments: {
              where: { isActive: true },
              select: { campaignId: true }
            }
          }
        });

        if (!agent) {
          throw new Error('Agent not found');
        }

        const assignedCampaigns = agent.campaignAssignments.map(a => a.campaignId);
        if (assignedCampaigns.length > 0) {
          whereClause.campaignId = { in: assignedCampaigns };
        }
      }

      // Find next entry
      const nextEntry = await prisma.dialQueueEntry.findFirst({
        where: whereClause,
        orderBy: [
          { priority: 'desc' },
          { queuedAt: 'asc' }
        ],
        include: {
          contact: {
            select: {
              contactId: true,
              firstName: true,
              lastName: true,
              fullName: true,
              phone: true,
              mobile: true,
              workPhone: true,
              homePhone: true,
              email: true,
              company: true,
              jobTitle: true,
              department: true,
              industry: true,
              address: true,
              address2: true,
              city: true,
              state: true,
              zipCode: true,
              country: true,
              website: true,
              linkedIn: true,
              notes: true,
              tags: true,
              leadSource: true,
              leadScore: true,
              deliveryDate: true,
              ageRange: true,
              residentialStatus: true,
              custom1: true,
              custom2: true,
              custom3: true,
              custom4: true,
              custom5: true,
              attemptCount: true,
              maxAttempts: true,
              lastAttempt: true,
              nextAttempt: true,
              lastOutcome: true,
              status: true
            }
          }
        }
      });

      if (nextEntry) {
        // Assign to agent and mark as dialing
        await prisma.dialQueueEntry.update({
          where: { id: nextEntry.id },
          data: {
            assignedAgentId: agentId,
            status: 'dialing',
            dialedAt: new Date()
          }
        });

        console.log(`📞 Assigned contact ${nextEntry.contactId} to agent ${agentId}`);
      }

      return nextEntry;
    } catch (error) {
      console.error('Error getting next contact for agent:', error);
      throw error;
    }
  }

  /**
   * Update queue entry status
   */
  async updateQueueEntry(queueId: string, updates: UpdateQueueEntryRequest): Promise<any> {
    try {
      const validatedUpdates = UpdateQueueEntrySchema.parse(updates);

      const updatedEntry = await prisma.dialQueueEntry.update({
        where: { queueId },
        data: {
          ...validatedUpdates,
          ...(updates.status === 'completed' && !updates.completedAt ? { completedAt: new Date() } : {})
        }
      });

      console.log(`✅ Updated queue entry ${queueId}: ${updates.status}`);

      return updatedEntry;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new Error('Queue entry not found');
      }
      console.error('Error updating queue entry:', error);
      throw error;
    }
  }

  /**
   * Get overall queue metrics
   */
  async getQueueMetrics(): Promise<QueueMetrics> {
    try {
      const totalQueued = await prisma.dialQueueEntry.count({
        where: { status: 'queued' }
      });

      const totalDialing = await prisma.dialQueueEntry.count({
        where: { status: 'dialing' }
      });

      const totalCompleted = await prisma.dialQueueEntry.count({
        where: { status: 'completed' }
      });

      // Calculate average wait time
      const averageWaitTime = await this.calculateAverageWaitTime();

      // Calculate longest wait time
      const longestWaitTime = await this.calculateLongestWaitTime();

      return {
        totalQueued,
        totalDialing,
        totalCompleted,
        averageWaitTime,
        longestWaitTime
      };
    } catch (error) {
      console.error('Error getting queue metrics:', error);
      throw error;
    }
  }

  /**
   * Remove completed entries from queue
   */
  async cleanupCompletedEntries(olderThanHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

      const result = await prisma.dialQueueEntry.deleteMany({
        where: {
          status: { in: ['completed', 'failed', 'abandoned'] },
          completedAt: { lt: cutoffTime }
        }
      });

      console.log(`🧹 Cleaned up ${result.count} completed queue entries`);

      return result.count;
    } catch (error) {
      console.error('Error cleaning up queue entries:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async calculateAverageWaitTime(): Promise<number> {
    try {
      const queuedEntries = await prisma.dialQueueEntry.findMany({
        where: { status: 'queued' },
        select: { queuedAt: true }
      });

      if (queuedEntries.length === 0) {
        return 0;
      }

      const now = new Date();
      const totalWaitTime = queuedEntries.reduce((total, entry) => {
        return total + (now.getTime() - entry.queuedAt.getTime());
      }, 0);

      return Math.floor(totalWaitTime / queuedEntries.length / 1000); // Return in seconds
    } catch (error) {
      console.error('Error calculating average wait time:', error);
      return 0;
    }
  }

  private async calculateLongestWaitTime(): Promise<number> {
    try {
      const oldestEntry = await prisma.dialQueueEntry.findFirst({
        where: { status: 'queued' },
        orderBy: { queuedAt: 'asc' },
        select: { queuedAt: true }
      });

      if (!oldestEntry) {
        return 0;
      }

      const waitTime = Math.floor((Date.now() - oldestEntry.queuedAt.getTime()) / 1000);
      return waitTime;
    } catch (error) {
      console.error('Error calculating longest wait time:', error);
      return 0;
    }
  }

  private async calculateAverageDialTime(campaignId: string): Promise<number> {
    try {
      // Calculate average time from dialedAt to completedAt
      const completedEntries = await prisma.dialQueueEntry.findMany({
        where: {
          campaignId,
          status: 'completed',
          dialedAt: { not: null },
          completedAt: { not: null }
        },
        select: {
          dialedAt: true,
          completedAt: true
        },
        take: 100 // Sample recent entries
      });

      if (completedEntries.length === 0) {
        return 45; // Default placeholder
      }

      const totalDialTime = completedEntries.reduce((total, entry) => {
        if (entry.dialedAt && entry.completedAt) {
          return total + (entry.completedAt.getTime() - entry.dialedAt.getTime());
        }
        return total;
      }, 0);

      return Math.floor(totalDialTime / completedEntries.length / 1000); // Return in seconds
    } catch (error) {
      console.error('Error calculating average dial time:', error);
      return 45; // Default fallback
    }
  }

  /**
   * Update queue entry status
   */
  async updateQueueStatus(queueId: string, status: string, agentId?: string): Promise<DialQueueEntry> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (agentId) {
      updateData.assignedAgentId = agentId;
    }

    if (status === 'dialing') {
      updateData.dialedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    return await prisma.dialQueueEntry.update({
      where: { id: queueId },
      data: updateData,
      include: {
        contact: true,
        list: true
      }
    });
  }

  /**
   * Update queue entry outcome and notes
   */
  async updateQueueOutcome(queueId: string, outcome?: string, notes?: string): Promise<DialQueueEntry> {
    const updateData: any = {
      updatedAt: new Date()
    };

    if (outcome) {
      updateData.outcome = outcome;
    }

    if (notes) {
      updateData.notes = notes;
    }

    return await prisma.dialQueueEntry.update({
      where: { id: queueId },
      data: updateData,
      include: {
        contact: true,
        list: true
      }
    });
  }
}

export const queueService = new QueueService();