/**
 * Omnivox AI Campaign Service
 * Production-ready campaign management replacing sample campaign data
 */

import { prisma } from '../database/index';

export interface CreateCampaignRequest {
  campaignId: string;
  name: string;
  dialMethod?: string;
  speed?: number;
  status?: string;
  description?: string;
  maxLines?: number;
  dialRatio?: number;
  recordCalls?: boolean;
  allowTransfers?: boolean;
  campaignScript?: string;
  hoursOfOperation?: string;
  abandonRateThreshold?: number;
  pacingMultiplier?: number;
  maxCallsPerAgent?: number;
  createdById?: number;
}

export interface UpdateCampaignRequest {
  name?: string;
  dialMethod?: string;
  speed?: number;
  status?: string;
  description?: string;
  maxLines?: number;
  dialRatio?: number;
  recordCalls?: boolean;
  allowTransfers?: boolean;
  campaignScript?: string;
  hoursOfOperation?: string;
  abandonRateThreshold?: number;
  pacingMultiplier?: number;
  maxCallsPerAgent?: number;
}

export interface CampaignSearchFilters {
  status?: string;
  dialMethod?: string;
  createdById?: number;
  nameSearch?: string;
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: CreateCampaignRequest) {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        campaignId: data.campaignId,
        name: data.name,
        dialMethod: data.dialMethod || 'Progressive',
        speed: data.speed || 2.0,
        status: data.status || 'Inactive',
        description: data.description,
        maxLines: data.maxLines,
        dialRatio: data.dialRatio,
        recordCalls: data.recordCalls || false,
        allowTransfers: data.allowTransfers || false,
        campaignScript: data.campaignScript,
        hoursOfOperation: data.hoursOfOperation,
        abandonRateThreshold: data.abandonRateThreshold || 0.05,
        pacingMultiplier: data.pacingMultiplier || 1.0,
        maxCallsPerAgent: data.maxCallsPerAgent || 1,
        createdById: data.createdById,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        agentAssignments: {
          include: {
            agent: {
              select: {
                agentId: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log(`📋 Campaign created: ${campaign.name} (${campaign.campaignId})`);

    return {
      success: true,
      data: campaign,
      message: 'Campaign created successfully'
    };
  } catch (error) {
    console.error('Error creating campaign:', error);
    return {
      success: false,
      error: 'Failed to create campaign',
      details: error
    };
  }
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(campaignId: string, data: UpdateCampaignRequest) {
  try {
    const campaign = await prisma.campaign.update({
      where: { campaignId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        agentAssignments: {
          include: {
            agent: {
              select: {
                agentId: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    console.log(`📋 Campaign updated: ${campaign.name} (${campaign.campaignId})`);

    return {
      success: true,
      data: campaign,
      message: 'Campaign updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    
    if (error?.code === 'P2025') {
      return {
        success: false,
        error: 'Campaign not found'
      };
    }
    
    return {
      success: false,
      error: 'Failed to update campaign',
      details: error
    };
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaignById(campaignId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        agentAssignments: {
          include: {
            agent: {
              select: {
                agentId: true,
                firstName: true,
                lastName: true,
                status: true
              }
            }
          }
        },
        callRecords: {
          where: {
            startTime: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
            }
          },
          select: {
            id: true,
            outcome: true,
            duration: true
          }
        },
        _count: {
          select: {
            callRecords: true,
            agentAssignments: true
          }
        }
      }
    });

    if (!campaign) {
      return {
        success: false,
        error: 'Campaign not found'
      };
    }

    return {
      success: true,
      data: campaign
    };
  } catch (error) {
    console.error('Error getting campaign:', error);
    return {
      success: false,
      error: 'Failed to get campaign',
      details: error
    };
  }
}

/**
 * Search campaigns with filters
 */
export async function searchCampaigns(filters: CampaignSearchFilters = {}) {
  try {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.dialMethod) where.dialMethod = filters.dialMethod;
    if (filters.createdById) where.createdById = filters.createdById;
    if (filters.nameSearch) {
      where.name = {
        contains: filters.nameSearch,
        mode: 'insensitive'
      };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            callRecords: true,
            agentAssignments: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return {
      success: true,
      data: campaigns,
      count: campaigns.length
    };
  } catch (error) {
    console.error('Error searching campaigns:', error);
    return {
      success: false,
      error: 'Failed to search campaigns',
      details: error
    };
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId?: string, dateFrom?: Date, dateTo?: Date) {
  try {
    const where: any = {};
    
    if (campaignId) where.campaignId = campaignId;
    if (dateFrom || dateTo) {
      where.startTime = {};
      if (dateFrom) where.startTime.gte = dateFrom;
      if (dateTo) where.startTime.lte = dateTo;
    }

    const [
      totalCalls,
      completedCalls,
      totalDuration,
      avgDuration,
      outcomes
    ] = await Promise.all([
      prisma.callRecord.count({ where }),
      prisma.callRecord.count({ where: { ...where, endTime: { not: null } } }),
      prisma.callRecord.aggregate({
        where: { ...where, endTime: { not: null } },
        _sum: { duration: true }
      }),
      prisma.callRecord.aggregate({
        where: { ...where, endTime: { not: null } },
        _avg: { duration: true }
      }),
      prisma.callRecord.groupBy({
        by: ['outcome'],
        where: { ...where, outcome: { not: null } },
        _count: true
      })
    ]);

    return {
      success: true,
      data: {
        totalCalls,
        completedCalls,
        inProgressCalls: totalCalls - completedCalls,
        totalDuration: totalDuration._sum.duration || 0,
        avgDuration: Math.round(avgDuration._avg.duration || 0),
        outcomes: outcomes.reduce((acc, item) => {
          acc[item.outcome || 'UNKNOWN'] = item._count;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  } catch (error) {
    console.error('Error getting campaign stats:', error);
    return {
      success: false,
      error: 'Failed to get campaign statistics',
      details: error
    };
  }
}

/**
 * Assign agent to campaign
 */
export async function assignAgentToCampaign(campaignId: string, agentId: string) {
  try {
    const assignment = await prisma.agentCampaignAssignment.create({
      data: {
        campaignId,
        agentId,
        assignedAt: new Date(),
        isActive: true // Fixed: Use correct field name
      },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      }
    });

    return {
      success: true,
      data: assignment,
      message: 'Agent assigned to campaign successfully'
    };
  } catch (error) {
    console.error('Error assigning agent to campaign:', error);
    return {
      success: false,
      error: 'Failed to assign agent to campaign',
      details: error
    };
  }
}

/**
 * Remove agent from campaign
 */
export async function removeAgentFromCampaign(campaignId: string, agentId: string) {
  try {
    await prisma.agentCampaignAssignment.delete({
      where: {
        agentId_campaignId: {
          agentId,
          campaignId
        }
      }
    });

    return {
      success: true,
      message: 'Agent removed from campaign successfully'
    };
  } catch (error) {
    console.error('Error removing agent from campaign:', error);
    return {
      success: false,
      error: 'Failed to remove agent from campaign',
      details: error
    };
  }
}

export default {
  createCampaign,
  updateCampaign,
  getCampaignById,
  searchCampaigns,
  getCampaignStats,
  assignAgentToCampaign,
  removeAgentFromCampaign
};