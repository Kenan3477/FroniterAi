/**
 * Omnivox AI Interaction Service
 * Production-ready interaction tracking replacing simulated interaction data
 */

import { prisma } from '../database/index';

export interface CreateInteractionRequest {
  agentId: string;
  contactId: string;
  campaignId: string;
  channel?: string;
  outcome: string;
  isDmc?: boolean;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds?: number;
  result?: string;
}

export interface UpdateInteractionRequest {
  outcome?: string;
  endedAt?: Date;
  durationSeconds?: number;
  result?: string;
}

export interface InteractionSearchFilters {
  agentId?: string;
  campaignId?: string;
  contactId?: string;
  channel?: string;
  outcome?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Create a new interaction
 */
export async function createInteraction(data: CreateInteractionRequest) {
  try {
    const interaction = await prisma.interaction.create({
      data: {
        agentId: data.agentId,
        contactId: data.contactId,
        campaignId: data.campaignId,
        channel: data.channel || 'voice',
        outcome: data.outcome,
        isDmc: data.isDmc || false,
        startedAt: data.startedAt,
        endedAt: data.endedAt,
        durationSeconds: data.durationSeconds,
        result: data.result
      },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
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

    console.log(`🤝 Interaction created: ${interaction.id} - ${data.outcome}`);

    return {
      success: true,
      data: interaction,
      message: 'Interaction created successfully'
    };
  } catch (error) {
    console.error('Error creating interaction:', error);
    return {
      success: false,
      error: 'Failed to create interaction',
      details: error
    };
  }
}

/**
 * Update an existing interaction
 */
export async function updateInteraction(interactionId: string, data: UpdateInteractionRequest) {
  try {
    const interaction = await prisma.interaction.update({
      where: { id: interactionId },
      data: {
        ...data
      },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
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

    console.log(`🤝 Interaction updated: ${interaction.id} - ${data.outcome}`);

    return {
      success: true,
      data: interaction,
      message: 'Interaction updated successfully'
    };
  } catch (error: any) {
    console.error('Error updating interaction:', error);
    
    if (error?.code === 'P2025') {
      return {
        success: false,
        error: 'Interaction not found'
      };
    }
    
    return {
      success: false,
      error: 'Failed to update interaction',
      details: error
    };
  }
}

/**
 * Get interaction by ID
 */
export async function getInteractionById(interactionId: string) {
  try {
    const interaction = await prisma.interaction.findUnique({
      where: { id: interactionId },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true,
            dialMethod: true
          }
        },
        sales: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!interaction) {
      return {
        success: false,
        error: 'Interaction not found'
      };
    }

    return {
      success: true,
      data: interaction
    };
  } catch (error) {
    console.error('Error getting interaction:', error);
    return {
      success: false,
      error: 'Failed to get interaction',
      details: error
    };
  }
}

/**
 * Search interactions with filters
 */
export async function searchInteractions(filters: InteractionSearchFilters = {}) {
  try {
    const where: any = {};

    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.campaignId) where.campaignId = filters.campaignId;
    if (filters.contactId) where.contactId = filters.contactId;
    if (filters.channel) where.channel = filters.channel;
    if (filters.outcome) where.outcome = filters.outcome;
    
    if (filters.dateFrom || filters.dateTo) {
      where.startedAt = {};
      if (filters.dateFrom) where.startedAt.gte = filters.dateFrom;
      if (filters.dateTo) where.startedAt.lte = filters.dateTo;
    }

    const interactions = await prisma.interaction.findMany({
      where,
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        },
        sales: {
          select: {
            id: true,
            amount: true,
            status: true
          }
        }
      },
      orderBy: { startedAt: 'desc' }
    });

    return {
      success: true,
      data: interactions,
      count: interactions.length
    };
  } catch (error) {
    console.error('Error searching interactions:', error);
    return {
      success: false,
      error: 'Failed to search interactions',
      details: error
    };
  }
}

/**
 * Get interaction statistics
 */
export async function getInteractionStats(dateFrom?: Date, dateTo?: Date) {
  try {
    const where: any = {};
    
    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) where.startedAt.gte = dateFrom;
      if (dateTo) where.startedAt.lte = dateTo;
    }

    const [
      totalInteractions,
      completedInteractions,
      totalDuration,
      avgDuration,
      outcomeStats,
      channelStats
    ] = await Promise.all([
      prisma.interaction.count({ where }),
      prisma.interaction.count({ where: { ...where, endedAt: { not: null } } }),
      prisma.interaction.aggregate({
        where: { ...where, durationSeconds: { not: null } },
        _sum: { durationSeconds: true }
      }),
      prisma.interaction.aggregate({
        where: { ...where, durationSeconds: { not: null } },
        _avg: { durationSeconds: true }
      }),
      prisma.interaction.groupBy({
        by: ['outcome'],
        where: { ...where, outcome: { not: null } },
        _count: true
      }),
      prisma.interaction.groupBy({
        by: ['channel'],
        where,
        _count: true
      })
    ]);

    return {
      success: true,
      data: {
        totalInteractions,
        completedInteractions,
        inProgressInteractions: totalInteractions - completedInteractions,
        totalDuration: totalDuration._sum.durationSeconds || 0,
        avgDuration: Math.round(avgDuration._avg.durationSeconds || 0),
        outcomes: outcomeStats.reduce((acc, item) => {
          acc[item.outcome || 'UNKNOWN'] = item._count;
          return acc;
        }, {} as Record<string, number>),
        channels: channelStats.reduce((acc, item) => {
          acc[item.channel] = item._count;
          return acc;
        }, {} as Record<string, number>)
      }
    };
  } catch (error) {
    console.error('Error getting interaction stats:', error);
    return {
      success: false,
      error: 'Failed to get interaction statistics',
      details: error
    };
  }
}

/**
 * Get daily interaction volume for reporting
 */
export async function getDailyInteractionVolume(days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(startedAt) as date,
        COUNT(*) as totalInteractions,
        COUNT(CASE WHEN endedAt IS NOT NULL THEN 1 END) as completedInteractions,
        AVG(CASE WHEN durationSeconds > 0 THEN durationSeconds END) as avgDuration,
        SUM(CASE WHEN durationSeconds > 0 THEN durationSeconds END) as totalDuration
      FROM interactions 
      WHERE startedAt >= ${startDate}
      GROUP BY DATE(startedAt)
      ORDER BY date DESC
    `;

    return {
      success: true,
      data: dailyStats
    };
  } catch (error) {
    console.error('Error getting daily interaction volume:', error);
    return {
      success: false,
      error: 'Failed to get daily interaction volume',
      details: error
    };
  }
}

export default {
  createInteraction,
  updateInteraction,
  getInteractionById,
  searchInteractions,
  getInteractionStats,
  getDailyInteractionVolume
};