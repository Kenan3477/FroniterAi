/**
 * KPI Tracking Service
 * Handles all call disposition data storage and aggregation for reports
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CallKPI {
  campaignId: string;
  agentId: string;
  contactId: string;
  callId: string;
  disposition: string;
  dispositionCategory: 'positive' | 'neutral' | 'negative';
  callDuration: number;
  callDate: Date;
  hourOfDay: number;
  dayOfWeek: number;
  listId?: string;
  outcome: string;
  notes?: string;
}

export interface KPISummary {
  totalCalls: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
  contactRate: number;
  dispositionBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  hourlyBreakdown: Record<string, number>;
  dailyBreakdown: Record<string, number>;
  campaignBreakdown: Record<string, number>;
  agentBreakdown: Record<string, number>;
}

/**
 * Record call KPI data when disposition is selected
 */
export async function recordCallKPI(kpiData: CallKPI): Promise<boolean> {
  try {
    console.log(`📊 Recording KPI data for call ${kpiData.callId}`);

    // Create KPI record in database
    await prisma.callKPI.create({
      data: {
        campaignId: kpiData.campaignId,
        agentId: kpiData.agentId,
        contactId: kpiData.contactId,
        callId: kpiData.callId,
        disposition: kpiData.disposition,
        dispositionCategory: kpiData.dispositionCategory,
        callDuration: kpiData.callDuration,
        callDate: kpiData.callDate,
        hourOfDay: kpiData.hourOfDay,
        dayOfWeek: kpiData.dayOfWeek,
        listId: kpiData.listId,
        outcome: kpiData.outcome,
        notes: kpiData.notes
      }
    });

    console.log(`✅ KPI data recorded for disposition: ${kpiData.disposition}`);
    return true;

  } catch (error) {
    console.error('❌ Error recording KPI data:', error);
    return false;
  }
}

/**
 * Get KPI summary for date range and filters
 */
export async function getKPISummary(filters: {
  startDate?: Date;
  endDate?: Date;
  campaignId?: string;
  agentId?: string;
  listId?: string;
}): Promise<KPISummary> {
  try {
    const whereClause: any = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.callDate = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }
    
    if (filters.campaignId) whereClause.campaignId = filters.campaignId;
    if (filters.agentId) whereClause.agentId = filters.agentId;
    if (filters.listId) whereClause.listId = filters.listId;

    // Get all KPI records for the filter criteria
    const kpiRecords = await prisma.callKPI.findMany({
      where: whereClause,
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        campaign: {
          select: {
            name: true
          }
        }
      }
    });

    // Calculate summary metrics
    const totalCalls = kpiRecords.length;
    const totalDuration = kpiRecords.reduce((sum: number, record: any) => sum + record.callDuration, 0);
    const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    
    const positiveCalls = kpiRecords.filter((r: any) => r.dispositionCategory === 'positive').length;
    const contactedCalls = kpiRecords.filter((r: any) => 
      r.dispositionCategory === 'positive' || 
      ['answered', 'interested', 'callback'].includes(r.outcome.toLowerCase())
    ).length;
    
    const successRate = totalCalls > 0 ? Math.round((positiveCalls / totalCalls) * 100) : 0;
    const contactRate = totalCalls > 0 ? Math.round((contactedCalls / totalCalls) * 100) : 0;

    // Disposition breakdown
    const dispositionBreakdown = kpiRecords.reduce((acc: any, record: any) => {
      acc[record.disposition] = (acc[record.disposition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Category breakdown
    const categoryBreakdown = kpiRecords.reduce((acc: any, record: any) => {
      acc[record.dispositionCategory] = (acc[record.dispositionCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Hourly breakdown
    const hourlyBreakdown = kpiRecords.reduce((acc: any, record: any) => {
      const hour = `${record.hourOfDay.toString().padStart(2, '0')}:00`;
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Daily breakdown  
    const dailyBreakdown = kpiRecords.reduce((acc: any, record: any) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[record.dayOfWeek];
      acc[dayName] = (acc[dayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Campaign breakdown
    const campaignBreakdown = kpiRecords.reduce((acc: any, record: any) => {
      const campaignName = record.campaign?.name || 'Unknown';
      acc[campaignName] = (acc[campaignName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Agent breakdown
    const agentBreakdown = kpiRecords.reduce((acc: any, record: any) => {
      const agentName = record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'Unknown';
      acc[agentName] = (acc[agentName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls,
      totalDuration,
      averageDuration,
      successRate,
      contactRate,
      dispositionBreakdown,
      categoryBreakdown,
      hourlyBreakdown,
      dailyBreakdown,
      campaignBreakdown,
      agentBreakdown
    };

  } catch (error) {
    console.error('❌ Error getting KPI summary:', error);
    return {
      totalCalls: 0,
      totalDuration: 0,
      averageDuration: 0,
      successRate: 0,
      contactRate: 0,
      dispositionBreakdown: {},
      categoryBreakdown: {},
      hourlyBreakdown: {},
      dailyBreakdown: {},
      campaignBreakdown: {},
      agentBreakdown: {}
    };
  }
}

/**
 * Get hourly performance breakdown
 */
export async function getHourlyBreakdown(filters: {
  startDate?: Date;
  endDate?: Date;
  campaignId?: string;
}) {
  try {
    const whereClause: any = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.callDate = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }
    
    if (filters.campaignId) whereClause.campaignId = filters.campaignId;

    const hourlyData = await prisma.callKPI.groupBy({
      by: ['hourOfDay'],
      where: whereClause,
      _count: {
        callId: true
      },
      _avg: {
        callDuration: true
      },
      orderBy: {
        hourOfDay: 'asc'
      }
    });

    return hourlyData.map((hour: any) => ({
      hour: `${hour.hourOfDay.toString().padStart(2, '0')}:00`,
      totalCalls: hour._count.callId,
      avgDuration: Math.round(hour._avg.callDuration || 0)
    }));

  } catch (error) {
    console.error('❌ Error getting hourly breakdown:', error);
    return [];
  }
}

/**
 * Get outcome penetration analysis
 */
export async function getOutcomePenetration(filters: {
  startDate?: Date;
  endDate?: Date;
  campaignId?: string;
}) {
  try {
    const whereClause: any = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.callDate = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }
    
    if (filters.campaignId) whereClause.campaignId = filters.campaignId;

    const outcomeData = await prisma.callKPI.groupBy({
      by: ['disposition', 'dispositionCategory'],
      where: whereClause,
      _count: {
        callId: true
      },
      orderBy: {
        _count: {
          callId: 'desc'
        }
      }
    });

    const total = outcomeData.reduce((sum: number, item: any) => sum + item._count.callId, 0);

    return outcomeData.map((item: any) => ({
      disposition: item.disposition,
      category: item.dispositionCategory,
      count: item._count.callId,
      percentage: total > 0 ? Math.round((item._count.callId / total) * 100) : 0
    }));

  } catch (error) {
    console.error('❌ Error getting outcome penetration:', error);
    return [];
  }
}

/**
 * Get agent performance summary
 */
export async function getAgentPerformance(filters: {
  startDate?: Date;
  endDate?: Date;
  campaignId?: string;
}) {
  try {
    const whereClause: any = {};
    
    if (filters.startDate && filters.endDate) {
      whereClause.callDate = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }
    
    if (filters.campaignId) whereClause.campaignId = filters.campaignId;

    const agentData = await prisma.callKPI.groupBy({
      by: ['agentId'],
      where: whereClause,
      _count: {
        callId: true
      },
      _sum: {
        callDuration: true
      },
      _avg: {
        callDuration: true
      }
    });

    const agentPerformance = await Promise.all(
      agentData.map(async (agent: any) => {
        const agentInfo = await prisma.agent.findUnique({
          where: { agentId: agent.agentId },
          select: { firstName: true, lastName: true }
        });

        const positiveCalls = await prisma.callKPI.count({
          where: {
            ...whereClause,
            agentId: agent.agentId,
            dispositionCategory: 'positive'
          }
        });

        const successRate = agent._count.callId > 0 
          ? Math.round((positiveCalls / agent._count.callId) * 100) 
          : 0;

        return {
          agentId: agent.agentId,
          agentName: agentInfo ? `${agentInfo.firstName} ${agentInfo.lastName}` : 'Unknown',
          totalCalls: agent._count.callId,
          totalDuration: agent._sum.callDuration || 0,
          avgDuration: Math.round(agent._avg.callDuration || 0),
          successfulCalls: positiveCalls,
          successRate
        };
      })
    );

    return agentPerformance.sort((a, b) => b.totalCalls - a.totalCalls);

  } catch (error) {
    console.error('❌ Error getting agent performance:', error);
    return [];
  }
}