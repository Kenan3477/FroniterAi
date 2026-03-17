/**
 * Omnivox AI KPI Service
 * Production-ready KPI calculation based on real database data
 * Replaces sample/mock KPI statistics
 */

import { prisma } from '../database/index';

export interface DashboardStats {
  today: {
    todayCalls: number;
    successfulCalls: number;
    totalTalkTime: number;
    conversionRate: number;
  };
  week: {
    weekCalls: number;
    weekSuccessful: number;
    weekTalkTime: number;
    weekConversion: number;
  };
  trends: {
    callsTrend: number | null;
    successTrend: number | null;
    timeTrend: number | null;
    conversionTrend: number | null;
  };
  recentActivity: any[];
  campaignProgress: {
    activeCampaigns: number;
    totalContacts: number;
    contactedToday: number;
  };
}

export interface AgentKPIs {
  agentId: string;
  agentName: string;
  totalCalls: number;
  successfulCalls: number;
  totalTalkTime: number;
  avgCallDuration: number;
  conversionRate: number;
  lastCallTime: Date | null;
}

export interface CampaignKPIs {
  campaignId: string;
  campaignName: string;
  totalCalls: number;
  successfulCalls: number;
  totalContacts: number;
  contactedContacts: number;
  conversionRate: number;
  avgCallDuration: number;
  isActive: boolean;
}

/**
 * Get dashboard statistics for today and week
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const lastWeekStart = new Date();
    lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    lastWeekStart.setHours(0, 0, 0, 0);

    // Today's statistics
    const [
      todayCallsCount,
      todaySuccessfulCount,
      todayTalkTime,
      todaySales
    ] = await Promise.all([
      prisma.callRecord.count({
        where: { startTime: { gte: today } }
      }),
      prisma.callRecord.count({
        where: { 
          startTime: { gte: today },
          outcome: { in: ['SALE', 'SUCCESS', 'INTERESTED'] }
        }
      }),
      prisma.callRecord.aggregate({
        where: { 
          startTime: { gte: today },
          duration: { gt: 0 }
        },
        _sum: { duration: true }
      }),
      prisma.sale.count({
        where: { createdAt: { gte: today } }
      })
    ]);

    // This week's statistics
    const [
      weekCallsCount,
      weekSuccessfulCount,
      weekTalkTime,
      weekSales
    ] = await Promise.all([
      prisma.callRecord.count({
        where: { startTime: { gte: weekStart } }
      }),
      prisma.callRecord.count({
        where: { 
          startTime: { gte: weekStart },
          outcome: { in: ['SALE', 'SUCCESS', 'INTERESTED'] }
        }
      }),
      prisma.callRecord.aggregate({
        where: { 
          startTime: { gte: weekStart },
          duration: { gt: 0 }
        },
        _sum: { duration: true }
      }),
      prisma.sale.count({
        where: { createdAt: { gte: weekStart } }
      })
    ]);

    // Previous week for trend calculation
    const [
      lastWeekCallsCount,
      lastWeekSuccessfulCount,
      lastWeekTalkTime
    ] = await Promise.all([
      prisma.callRecord.count({
        where: { 
          startTime: { gte: lastWeekStart, lt: weekStart }
        }
      }),
      prisma.callRecord.count({
        where: { 
          startTime: { gte: lastWeekStart, lt: weekStart },
          outcome: { in: ['SALE', 'SUCCESS', 'INTERESTED'] }
        }
      }),
      prisma.callRecord.aggregate({
        where: { 
          startTime: { gte: lastWeekStart, lt: weekStart },
          duration: { gt: 0 }
        },
        _sum: { duration: true }
      })
    ]);

    // Recent activity
    const recentActivity = await prisma.callRecord.findMany({
      where: { startTime: { gte: today } },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        contact: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });

    // Campaign progress
    const [activeCampaigns, totalContacts, contactedToday] = await Promise.all([
      prisma.campaign.count({
        where: { status: 'Active' }
      }),
      prisma.contact.count(),
      prisma.callRecord.groupBy({
        by: ['contactId'],
        where: { startTime: { gte: today } }
      }).then(results => results.length)
    ]);

    // Calculate trends
    const callsTrend = lastWeekCallsCount > 0 
      ? ((weekCallsCount - lastWeekCallsCount) / lastWeekCallsCount) * 100 
      : null;
    
    const successTrend = lastWeekSuccessfulCount > 0 
      ? ((weekSuccessfulCount - lastWeekSuccessfulCount) / lastWeekSuccessfulCount) * 100 
      : null;
    
    const timeTrend = (lastWeekTalkTime._sum.duration || 0) > 0 
      ? (((weekTalkTime._sum.duration || 0) - (lastWeekTalkTime._sum.duration || 0)) / (lastWeekTalkTime._sum.duration || 1)) * 100 
      : null;

    const todayConversionRate = todayCallsCount > 0 ? (todaySales / todayCallsCount) * 100 : 0;
    const weekConversionRate = weekCallsCount > 0 ? (weekSales / weekCallsCount) * 100 : 0;

    return {
      today: {
        todayCalls: todayCallsCount,
        successfulCalls: todaySuccessfulCount,
        totalTalkTime: todayTalkTime._sum.duration || 0,
        conversionRate: todayConversionRate
      },
      week: {
        weekCalls: weekCallsCount,
        weekSuccessful: weekSuccessfulCount,
        weekTalkTime: weekTalkTime._sum.duration || 0,
        weekConversion: weekConversionRate
      },
      trends: {
        callsTrend: callsTrend ? Math.round(callsTrend * 100) / 100 : null,
        successTrend: successTrend ? Math.round(successTrend * 100) / 100 : null,
        timeTrend: timeTrend ? Math.round(timeTrend * 100) / 100 : null,
        conversionTrend: null // Could be calculated if needed
      },
      recentActivity: recentActivity.map(call => ({
        type: 'call',
        time: call.startTime,
        description: `${call.agent?.firstName || 'Unknown'} called ${call.contact?.firstName || 'Unknown'} ${call.contact?.lastName || ''}`,
        outcome: call.outcome,
        duration: call.duration
      })),
      campaignProgress: {
        activeCampaigns,
        totalContacts,
        contactedToday
      }
    };
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    throw error;
  }
}

/**
 * Get agent KPIs and performance metrics
 */
export async function getAgentKPIs(agentId?: string): Promise<AgentKPIs[]> {
  try {
    const where = agentId ? { agentId } : {};

    const agents = await prisma.agent.findMany({
      where,
      include: {
        callRecords: {
          where: {
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        sales: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        }
      }
    });

    return agents.map(agent => {
      const totalCalls = agent.callRecords.length;
      const successfulCalls = agent.callRecords.filter(call => 
        ['SALE', 'SUCCESS', 'INTERESTED'].includes(call.outcome || '')
      ).length;
      const totalTalkTime = agent.callRecords.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgCallDuration = totalCalls > 0 ? totalTalkTime / totalCalls : 0;
      const conversionRate = totalCalls > 0 ? (agent.sales.length / totalCalls) * 100 : 0;
      const lastCall = agent.callRecords.length > 0 
        ? agent.callRecords.reduce((latest, call) => 
            !latest || call.startTime > latest.startTime ? call : latest
          )
        : null;

      return {
        agentId: agent.agentId,
        agentName: `${agent.firstName} ${agent.lastName}`,
        totalCalls,
        successfulCalls,
        totalTalkTime,
        avgCallDuration: Math.round(avgCallDuration),
        conversionRate: Math.round(conversionRate * 100) / 100,
        lastCallTime: lastCall?.startTime || null
      };
    });
  } catch (error) {
    console.error('Error calculating agent KPIs:', error);
    throw error;
  }
}

/**
 * Get campaign KPIs and performance metrics
 */
export async function getCampaignKPIs(campaignId?: string): Promise<CampaignKPIs[]> {
  try {
    const where = campaignId ? { campaignId } : {};

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        callRecords: {
          where: {
            startTime: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          }
        },
        _count: {
          select: {
            callRecords: true
          }
        }
      }
    });

    // Get total contacts for each campaign (this is a simplified calculation)
    const campaignKPIs = await Promise.all(campaigns.map(async (campaign) => {
      const totalCalls = campaign.callRecords.length;
      const successfulCalls = campaign.callRecords.filter(call => 
        ['SALE', 'SUCCESS', 'INTERESTED'].includes(call.outcome || '')
      ).length;
      const totalTalkTime = campaign.callRecords.reduce((sum, call) => sum + (call.duration || 0), 0);
      const avgCallDuration = totalCalls > 0 ? totalTalkTime / totalCalls : 0;
      const conversionRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

      // Get unique contacts called for this campaign
      const contactedContacts = await prisma.callRecord.groupBy({
        by: ['contactId'],
        where: {
          campaignId: campaign.campaignId,
          startTime: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }).then(results => results.length);

      return {
        campaignId: campaign.campaignId,
        campaignName: campaign.name,
        totalCalls,
        successfulCalls,
        totalContacts: 0, // This would need to be calculated based on campaign contact lists
        contactedContacts,
        conversionRate: Math.round(conversionRate * 100) / 100,
        avgCallDuration: Math.round(avgCallDuration),
        isActive: campaign.status === 'Active'
      };
    }));

    return campaignKPIs;
  } catch (error) {
    console.error('Error calculating campaign KPIs:', error);
    throw error;
  }
}

export default {
  getDashboardStats,
  getAgentKPIs,
  getCampaignKPIs
};