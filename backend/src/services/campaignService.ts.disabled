import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export interface CampaignCreateData {
  name: string;
  description?: string;
  diallingMode?: string;
  outboundCli: string;
  maxCallsPerAgent?: number;
  maxAttemptsPerRecord?: number;
  abandonRateThreshold?: number;
  pacingMultiplier?: number;
  acwRequired?: boolean;
  acwTimeoutSeconds?: number;
  diallingStart?: string;
  diallingEnd?: string;
  timezone?: string;
  createdByUserId: string;
}

export interface CampaignRecordCreateData {
  campaignListId: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  address?: string;
  city?: string;
  postcode?: string;
  priority?: number;
  metadata?: string; // JSON string
  customFields?: string; // JSON string
}

export class CampaignService extends EventEmitter {
  /**
   * Create a new campaign
   */
  async createCampaign(campaignData: CampaignCreateData) {
    const campaign = await prisma.campaign.create({
      data: {
        ...campaignData,
        diallingMode: campaignData.diallingMode || 'POWER',
        maxCallsPerAgent: campaignData.maxCallsPerAgent || 1,
        maxAttemptsPerRecord: campaignData.maxAttemptsPerRecord || 3,
        abandonRateThreshold: campaignData.abandonRateThreshold || 0.05,
        pacingMultiplier: campaignData.pacingMultiplier || 1.0,
        acwRequired: campaignData.acwRequired || true,
        acwTimeoutSeconds: campaignData.acwTimeoutSeconds || 30,
        timezone: campaignData.timezone || 'Europe/London',
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    this.emit('campaignCreated', { campaign });
    return campaign;
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        campaignAgents: {
          where: { isActive: true },
          include: {
            agent: {
              select: { id: true, firstName: true, lastName: true, email: true, currentStatus: true },
            },
          },
        },
        _count: {
          select: {
            campaignLists: true,
            calls: true,
          },
        },
      },
    });

    return campaign;
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(campaignId: string, isActive: boolean) {
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { isActive, updatedAt: new Date() },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    this.emit('campaignStatusUpdated', { campaign, isActive });
    return campaign;
  }

  /**
   * Get all campaigns
   */
  async getCampaigns(limit = 50) {
    const campaigns = await prisma.campaign.findMany({
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
        _count: {
          select: {
            campaignLists: true,
            calls: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return campaigns;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string) {
    // First check if campaign exists and is not active
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.isActive) {
      throw new Error('Cannot delete active campaign. Please deactivate it first.');
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { isActive: false },
    });

    this.emit('campaignDeleted', { campaignId });
    return { success: true, message: 'Campaign deactivated successfully' };
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            calls: true,
            campaignLists: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get basic call statistics
    const callStats = await prisma.callRecord.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: {
        status: true,
      },
    });

    const totalCalls = callStats.reduce((sum, stat) => sum + stat._count.status, 0);
    const answeredCalls = callStats.find(s => s.status === 'ANSWERED')?._count.status || 0;
    const failedCalls = callStats.find(s => s.status === 'FAILED')?._count.status || 0;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        isActive: campaign.isActive,
        diallingMode: campaign.diallingMode,
      },
      stats: {
        totalCalls,
        answeredCalls,
        failedCalls,
        successRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
        listsCount: campaign._count.campaignLists,
      },
      callBreakdown: callStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count.status;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // Alias methods for route compatibility
  async listCampaigns(options: any = {}) {
    const limit = options.limit || 50;
    const campaigns = await this.getCampaigns(limit);
    return campaigns.filter(c => {
      if (options.isActive !== undefined && c.isActive !== options.isActive) return false;
      if (options.createdById && c.createdByUserId !== options.createdById) return false;
      return true;
    });
  }

  async updateCampaign(campaignId: string, updates: any) {
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...updates,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });
    return campaign;
  }

  async addCampaignRecords(campaignId: string, records: any[], listId?: string) {
    // Simplified implementation
    throw new Error('addCampaignRecords not implemented yet');
  }

  async getCampaignRecords(campaignId: string, options: any = {}) {
    // Simplified implementation
    throw new Error('getCampaignRecords not implemented yet');
  }

  async getNextRecordsToDial(campaignId: string, agentId?: string, limit = 10) {
    // Get available campaign records that haven't exceeded max attempts
    const records = await prisma.campaignRecord.findMany({
      where: {
        campaignList: {
          campaign: {
            id: campaignId
          }
        },
        attemptCount: {
          lt: prisma.campaignRecord.findFirst({
            where: {
              campaignList: {
                campaign: {
                  id: campaignId
                }
              }
            }
          }).then(r => r?.maxAttempts || 3) as any
        },
        // Only get records that haven't been called recently or are ready for retry
        OR: [
          { lastAttemptAt: null },
          { 
            lastAttemptAt: {
              lt: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
            }
          }
        ]
      },
      include: {
        campaignList: true
      },
      orderBy: [
        { priority: 'asc' },
        { lastAttemptAt: 'asc' }
      ],
      take: limit
    });

    return records;
  }

  async updateCampaignRecord(recordId: string, updates: any) {
    // Simplified implementation
    throw new Error('updateCampaignRecord not implemented yet');
  }

  async assignAgentsToCampaign(campaignId: string, agentIds: string[], priority = 1) {
    // Simplified implementation
    throw new Error('assignAgentsToCampaign not implemented yet');
  }

  async getCampaignAgents(campaignId: string) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        campaignAgents: {
          where: { isActive: true },
          include: {
            agent: {
              select: { id: true, firstName: true, lastName: true, email: true, currentStatus: true },
            },
          },
        },
      },
    });
    return campaign?.campaignAgents || [];
  }

  async removeAgentsFromCampaign(campaignId: string, agentIds: string[]) {
    // Simplified implementation
    throw new Error('removeAgentsFromCampaign not implemented yet');
  }

  async importRecordsFromCSV(campaignId: string, csvData: any, mapping?: any) {
    // Simplified implementation  
    throw new Error('importRecordsFromCSV not implemented yet');
  }
}

export const campaignService = new CampaignService();