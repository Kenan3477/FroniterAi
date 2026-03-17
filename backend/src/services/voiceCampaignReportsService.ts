/**
 * Voice Campaign Reports Service
 * Production-ready campaign analytics with real data from call records
 */

import { prisma } from '../database/index';

export interface VoiceCampaignFilters {
  campaignId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  agentIds?: string[];
  leadListIds?: string[];
}

export interface VoiceCampaignKPIs {
  totalCalls: number;
  connectedCalls: number;
  answerRate: number; // Connected / Total
  conversionRate: number; // Conversions / Connected
  averageCallDuration: number; // In seconds
  revenuePerCampaign: number;
  costPerConversion: number;
}

export interface CallsByHourData {
  hour: number;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

export interface CallsByAgentData {
  agentId: string;
  agentName: string;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

export interface ConversionFunnelData {
  totalCalls: number;
  connectedCalls: number;
  qualifiedLeads: number;
  conversions: number;
}

export interface CallOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

/**
 * Get comprehensive voice campaign analytics
 */
export async function getVoiceCampaignAnalytics(filters: VoiceCampaignFilters = {}) {
  try {
    const { campaignId, dateFrom, dateTo, agentIds, leadListIds } = filters;

    // Build where clause for filtering
    const whereClause: any = {};
    
    if (campaignId) {
      whereClause.campaignId = campaignId;
    }
    
    if (dateFrom || dateTo) {
      whereClause.startTime = {};
      if (dateFrom) whereClause.startTime.gte = dateFrom;
      if (dateTo) whereClause.startTime.lte = dateTo;
    }
    
    if (agentIds && agentIds.length > 0) {
      whereClause.agentId = { in: agentIds };
    }

    // If lead lists specified, filter by contact's listId
    if (leadListIds && leadListIds.length > 0) {
      whereClause.contact = {
        listId: { in: leadListIds }
      };
    }

    // Get KPIs
    const kpis = await getVoiceCampaignKPIs(whereClause);
    
    // Get charts data
    const callsByHour = await getCallsByHour(whereClause);
    const callsByAgent = await getCallsByAgent(whereClause);
    const conversionFunnel = await getConversionFunnel(whereClause);
    const callOutcomes = await getCallOutcomes(whereClause);

    return {
      success: true,
      data: {
        kpis,
        charts: {
          callsByHour,
          callsByAgent,
          conversionFunnel,
          callOutcomes
        }
      }
    };

  } catch (error) {
    console.error('Error getting voice campaign analytics:', error);
    return {
      success: false,
      error: 'Failed to retrieve campaign analytics'
    };
  }
}

/**
 * Calculate KPIs for voice campaigns
 */
async function getVoiceCampaignKPIs(whereClause: any): Promise<VoiceCampaignKPIs> {
  // Total calls
  const totalCalls = await prisma.callRecord.count({ where: whereClause });

  // Connected calls (calls with outcome indicating connection)
  const connectedCalls = await prisma.callRecord.count({
    where: {
      ...whereClause,
      outcome: { in: ['answered', 'connected', 'completed', 'transfer'] }
    }
  });

  // Conversions (calls with successful outcome or associated sales)
  const conversions = await prisma.callRecord.count({
    where: {
      ...whereClause,
      OR: [
        { outcome: { in: ['converted', 'sale', 'success', 'qualified'] } },
        { 
          contact: {
            sales: {
              some: {
                createdAt: whereClause.startTime ? {
                  gte: whereClause.startTime.gte,
                  lte: whereClause.startTime.lte
                } : undefined
              }
            }
          }
        }
      ]
    }
  });

  // Average call duration (only for completed calls)
  const durationStats = await prisma.callRecord.aggregate({
    where: {
      ...whereClause,
      duration: { not: null },
      endTime: { not: null }
    },
    _avg: {
      duration: true
    }
  });

  // Revenue calculation from sales associated with filtered call records
  const revenueStats = await prisma.sale.aggregate({
    where: {
      contact: {
        callRecords: {
          some: whereClause
        }
      },
      createdAt: whereClause.startTime ? {
        gte: whereClause.startTime?.gte,
        lte: whereClause.startTime?.lte
      } : undefined
    },
    _sum: {
      amount: true
    }
  });

  // Calculate rates
  const answerRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
  const conversionRate = connectedCalls > 0 ? (conversions / connectedCalls) * 100 : 0;
  const averageCallDuration = durationStats._avg.duration || 0;
  const revenuePerCampaign = revenueStats._sum.amount || 0;
  const costPerConversion = conversions > 0 && revenuePerCampaign > 0 ? 
    revenuePerCampaign / conversions : 0;

  return {
    totalCalls,
    connectedCalls,
    answerRate: parseFloat(answerRate.toFixed(2)),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    averageCallDuration: Math.round(averageCallDuration),
    revenuePerCampaign: parseFloat(revenuePerCampaign.toFixed(2)),
    costPerConversion: parseFloat(costPerConversion.toFixed(2))
  };
}

/**
 * Get calls by hour breakdown
 */
async function getCallsByHour(whereClause: any): Promise<CallsByHourData[]> {
  const callsByHour = await prisma.$queryRaw<any[]>`
    SELECT 
      EXTRACT(HOUR FROM start_time) as hour,
      COUNT(*) as total_calls,
      COUNT(CASE WHEN outcome IN ('answered', 'connected', 'completed', 'transfer') THEN 1 END) as connected_calls,
      COUNT(CASE WHEN outcome IN ('converted', 'sale', 'success', 'qualified') THEN 1 END) as conversions
    FROM call_records 
    WHERE ${Object.keys(whereClause).length > 0 ? 'TRUE' : 'TRUE'}
    ${whereClause.campaignId ? `AND campaign_id = '${whereClause.campaignId}'` : ''}
    ${whereClause.startTime?.gte ? `AND start_time >= '${whereClause.startTime.gte.toISOString()}'` : ''}
    ${whereClause.startTime?.lte ? `AND start_time <= '${whereClause.startTime.lte.toISOString()}'` : ''}
    GROUP BY EXTRACT(HOUR FROM start_time)
    ORDER BY hour
  `;

  // Fill in missing hours with 0 values
  const result: CallsByHourData[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const hourData = callsByHour.find(d => parseInt(d.hour) === hour);
    result.push({
      hour,
      totalCalls: hourData ? parseInt(hourData.total_calls) : 0,
      connectedCalls: hourData ? parseInt(hourData.connected_calls) : 0,
      conversions: hourData ? parseInt(hourData.conversions) : 0
    });
  }

  return result;
}

/**
 * Get calls by agent breakdown
 */
async function getCallsByAgent(whereClause: any): Promise<CallsByAgentData[]> {
  const callsByAgent = await prisma.callRecord.groupBy({
    by: ['agentId'],
    where: {
      ...whereClause,
      agentId: { not: null }
    },
    _count: {
      id: true
    }
  });

  const agentData: CallsByAgentData[] = [];
  
  for (const agentCalls of callsByAgent) {
    if (!agentCalls.agentId) continue;

    // Get agent info
    const agent = await prisma.agent.findUnique({
      where: { agentId: agentCalls.agentId },
      select: { firstName: true, lastName: true }
    });

    // Get connected calls for this agent
    const connectedCalls = await prisma.callRecord.count({
      where: {
        ...whereClause,
        agentId: agentCalls.agentId,
        outcome: { in: ['answered', 'connected', 'completed', 'transfer'] }
      }
    });

    // Get conversions for this agent
    const conversions = await prisma.callRecord.count({
      where: {
        ...whereClause,
        agentId: agentCalls.agentId,
        outcome: { in: ['converted', 'sale', 'success', 'qualified'] }
      }
    });

    agentData.push({
      agentId: agentCalls.agentId,
      agentName: agent ? `${agent.firstName} ${agent.lastName}` : agentCalls.agentId,
      totalCalls: agentCalls._count.id,
      connectedCalls,
      conversions
    });
  }

  return agentData.sort((a, b) => b.totalCalls - a.totalCalls);
}

/**
 * Get conversion funnel data
 */
async function getConversionFunnel(whereClause: any): Promise<ConversionFunnelData> {
  const totalCalls = await prisma.callRecord.count({ where: whereClause });

  const connectedCalls = await prisma.callRecord.count({
    where: {
      ...whereClause,
      outcome: { in: ['answered', 'connected', 'completed', 'transfer'] }
    }
  });

  // Qualified leads - calls that had meaningful interaction
  const qualifiedLeads = await prisma.callRecord.count({
    where: {
      ...whereClause,
      outcome: { in: ['answered', 'connected', 'completed', 'transfer', 'interested', 'callback', 'qualified'] },
      duration: { gte: 30 } // At least 30 seconds
    }
  });

  const conversions = await prisma.callRecord.count({
    where: {
      ...whereClause,
      outcome: { in: ['converted', 'sale', 'success', 'qualified'] }
    }
  });

  return {
    totalCalls,
    connectedCalls,
    qualifiedLeads,
    conversions
  };
}

/**
 * Get call outcome distribution
 */
async function getCallOutcomes(whereClause: any): Promise<CallOutcomeData[]> {
  const outcomes = await prisma.callRecord.groupBy({
    by: ['outcome'],
    where: whereClause,
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    }
  });

  const totalCalls = outcomes.reduce((sum, outcome) => sum + outcome._count.id, 0);

  return outcomes.map(outcome => ({
    outcome: outcome.outcome || 'unknown',
    count: outcome._count.id,
    percentage: totalCalls > 0 ? parseFloat(((outcome._count.id / totalCalls) * 100).toFixed(1)) : 0
  }));
}

/**
 * Get available filters data
 */
export async function getVoiceCampaignFiltersData() {
  try {
    // Get campaigns with call records
    const campaigns = await prisma.campaign.findMany({
      where: {
        callRecords: {
          some: {}
        }
      },
      select: {
        campaignId: true,
        name: true,
        _count: {
          select: {
            callRecords: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get agents with call records
    const agents = await prisma.agent.findMany({
      where: {
        callRecords: {
          some: {}
        }
      },
      select: {
        agentId: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            callRecords: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' },
        { lastName: 'asc' }
      ]
    });

    // Get lead lists with call records
    const leadLists = await prisma.dataList.findMany({
      where: {
        contacts: {
          some: {
            callRecords: {
              some: {}
            }
          }
        }
      },
      select: {
        listId: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return {
      success: true,
      data: {
        campaigns,
        agents: agents.map(agent => ({
          agentId: agent.agentId,
          name: `${agent.firstName} ${agent.lastName}`,
          callCount: agent._count.callRecords
        })),
        leadLists
      }
    };

  } catch (error) {
    console.error('Error getting filter data:', error);
    return {
      success: false,
      error: 'Failed to retrieve filter data'
    };
  }
}