/**
 * Real KPI Service - Database-driven metrics calculation
 * Replaces mock simpleKpiService with actual database queries
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CallKPIData {
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
  outcome: string;
  notes?: string;
}

export interface KPISummary {
  totalCalls: number;
  contactedCalls: number;
  positiveCalls: number;
  neutralCalls: number;
  negativeCalls: number;
  averageCallDuration: number;
  conversionRate: number;
  contactRate: number;
  dispositionBreakdown: { [key: string]: number };
  categoryBreakdown: { [key: string]: number };
  hourlyBreakdown: { [key: string]: { calls: number; conversions: number } };
  dailyBreakdown: { [key: string]: { calls: number; conversions: number } };
  campaignBreakdown: { [key: string]: { calls: number; conversions: number } };
  agentBreakdown: { [key: string]: { calls: number; conversions: number } };
}

export interface HourlyData {
  hour: string;
  totalCalls: number;
  conversions: number;
  conversionRate: number;
  averageDuration: number;
}

export interface OutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

export interface AgentPerformance {
  agentId: string;
  name: string;
  totalCalls: number;
  conversions: number;
  conversionRate: number;
  averageCallDuration: number;
  totalTalkTime: number;
  rank: number;
}

/**
 * Real KPI Service using database queries
 */
export class RealKPIService {
  
  /**
   * Get KPI summary for a date range with optional filters
   */
  async getKPISummary(
    startDate: Date,
    endDate: Date,
    campaignId?: string,
    agentId?: string
  ): Promise<KPISummary> {
    try {
      // Build where clause based on filters
      const whereClause: any = {
        callDate: {
          gte: startDate,
          lte: endDate
        }
      };

      if (campaignId) {
        whereClause.campaignId = campaignId;
      }

      if (agentId) {
        whereClause.agentId = agentId;
      }

      // Get all KPI records for the period
      const kpiRecords = await prisma.callKPI.findMany({
        where: whereClause,
        include: {
          agent: true,
          campaign: true,
          contact: true
        }
      });

      // Calculate basic metrics
      const totalCalls = kpiRecords.length;
      const contactedCalls = kpiRecords.filter(r => r.outcome !== 'no-answer' && r.outcome !== 'busy').length;
      const positiveCalls = kpiRecords.filter(r => r.dispositionCategory === 'positive').length;
      const neutralCalls = kpiRecords.filter(r => r.dispositionCategory === 'neutral').length;
      const negativeCalls = kpiRecords.filter(r => r.dispositionCategory === 'negative').length;

      const totalDuration = kpiRecords.reduce((sum, r) => sum + r.callDuration, 0);
      const averageCallDuration = totalCalls > 0 ? totalDuration / totalCalls : 0;

      const conversionRate = totalCalls > 0 ? (positiveCalls / totalCalls) * 100 : 0;
      const contactRate = totalCalls > 0 ? (contactedCalls / totalCalls) * 100 : 0;

      // Disposition breakdown
      const dispositionBreakdown: { [key: string]: number } = {};
      kpiRecords.forEach(record => {
        dispositionBreakdown[record.disposition] = (dispositionBreakdown[record.disposition] || 0) + 1;
      });

      // Category breakdown
      const categoryBreakdown = {
        positive: positiveCalls,
        neutral: neutralCalls,
        negative: negativeCalls
      };

      // Hourly breakdown
      const hourlyBreakdown: { [key: string]: { calls: number; conversions: number } } = {};
      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0');
        const hourRecords = kpiRecords.filter(r => r.hourOfDay === hour);
        hourlyBreakdown[hourStr] = {
          calls: hourRecords.length,
          conversions: hourRecords.filter(r => r.dispositionCategory === 'positive').length
        };
      }

      // Daily breakdown
      const dailyBreakdown: { [key: string]: { calls: number; conversions: number } } = {};
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      days.forEach((day, index) => {
        const dayRecords = kpiRecords.filter(r => r.dayOfWeek === index);
        dailyBreakdown[day] = {
          calls: dayRecords.length,
          conversions: dayRecords.filter(r => r.dispositionCategory === 'positive').length
        };
      });

      // Campaign breakdown
      const campaignBreakdown: { [key: string]: { calls: number; conversions: number } } = {};
      kpiRecords.forEach(record => {
        if (!campaignBreakdown[record.campaignId]) {
          campaignBreakdown[record.campaignId] = { calls: 0, conversions: 0 };
        }
        campaignBreakdown[record.campaignId].calls++;
        if (record.dispositionCategory === 'positive') {
          campaignBreakdown[record.campaignId].conversions++;
        }
      });

      // Agent breakdown
      const agentBreakdown: { [key: string]: { calls: number; conversions: number } } = {};
      kpiRecords.forEach(record => {
        if (!agentBreakdown[record.agentId]) {
          agentBreakdown[record.agentId] = { calls: 0, conversions: 0 };
        }
        agentBreakdown[record.agentId].calls++;
        if (record.dispositionCategory === 'positive') {
          agentBreakdown[record.agentId].conversions++;
        }
      });

      return {
        totalCalls,
        contactedCalls,
        positiveCalls,
        neutralCalls,
        negativeCalls,
        averageCallDuration,
        conversionRate,
        contactRate,
        dispositionBreakdown,
        categoryBreakdown,
        hourlyBreakdown,
        dailyBreakdown,
        campaignBreakdown,
        agentBreakdown
      };

    } catch (error) {
      console.error('❌ Error calculating KPI summary:', error);
      throw new Error(`Failed to calculate KPI summary: ${error}`);
    }
  }

  /**
   * Get hourly performance data
   */
  async getHourlyData(
    startDate: Date,
    endDate: Date,
    campaignId?: string,
    agentId?: string
  ): Promise<HourlyData[]> {
    try {
      const whereClause: any = {
        callDate: {
          gte: startDate,
          lte: endDate
        }
      };

      if (campaignId) whereClause.campaignId = campaignId;
      if (agentId) whereClause.agentId = agentId;

      const kpiRecords = await prisma.callKPI.findMany({
        where: whereClause
      });

      const hourlyData: HourlyData[] = [];

      for (let hour = 0; hour < 24; hour++) {
        const hourStr = hour.toString().padStart(2, '0') + ':00';
        const hourRecords = kpiRecords.filter(r => r.hourOfDay === hour);
        
        const totalCalls = hourRecords.length;
        const conversions = hourRecords.filter(r => r.dispositionCategory === 'positive').length;
        const totalDuration = hourRecords.reduce((sum, r) => sum + r.callDuration, 0);
        
        hourlyData.push({
          hour: hourStr,
          totalCalls,
          conversions,
          conversionRate: totalCalls > 0 ? (conversions / totalCalls) * 100 : 0,
          averageDuration: totalCalls > 0 ? totalDuration / totalCalls : 0
        });
      }

      return hourlyData;

    } catch (error) {
      console.error('❌ Error getting hourly data:', error);
      throw new Error(`Failed to get hourly data: ${error}`);
    }
  }

  /**
   * Get outcome distribution data
   */
  async getOutcomeData(
    startDate: Date,
    endDate: Date,
    campaignId?: string,
    agentId?: string
  ): Promise<OutcomeData[]> {
    try {
      const whereClause: any = {
        callDate: {
          gte: startDate,
          lte: endDate
        }
      };

      if (campaignId) whereClause.campaignId = campaignId;
      if (agentId) whereClause.agentId = agentId;

      const kpiRecords = await prisma.callKPI.findMany({
        where: whereClause,
        select: {
          outcome: true
        }
      });

      const outcomeCount: { [key: string]: number } = {};
      kpiRecords.forEach(record => {
        outcomeCount[record.outcome] = (outcomeCount[record.outcome] || 0) + 1;
      });

      const totalCalls = kpiRecords.length;

      return Object.entries(outcomeCount).map(([outcome, count]) => ({
        outcome,
        count,
        percentage: totalCalls > 0 ? (count / totalCalls) * 100 : 0
      })).sort((a, b) => b.count - a.count);

    } catch (error) {
      console.error('❌ Error getting outcome data:', error);
      throw new Error(`Failed to get outcome data: ${error}`);
    }
  }

  /**
   * Get agent performance rankings
   */
  async getAgentPerformance(
    startDate: Date,
    endDate: Date,
    campaignId?: string
  ): Promise<AgentPerformance[]> {
    try {
      const whereClause: any = {
        callDate: {
          gte: startDate,
          lte: endDate
        }
      };

      if (campaignId) whereClause.campaignId = campaignId;

      const kpiRecords = await prisma.callKPI.findMany({
        where: whereClause,
        include: {
          agent: true
        }
      });

      const agentStats: { [agentId: string]: any } = {};

      kpiRecords.forEach(record => {
        if (!agentStats[record.agentId]) {
          agentStats[record.agentId] = {
            agentId: record.agentId,
            name: `${record.agent.firstName} ${record.agent.lastName}`.trim() || 'Unknown Agent',
            totalCalls: 0,
            conversions: 0,
            totalTalkTime: 0
          };
        }

        agentStats[record.agentId].totalCalls++;
        agentStats[record.agentId].totalTalkTime += record.callDuration;

        if (record.dispositionCategory === 'positive') {
          agentStats[record.agentId].conversions++;
        }
      });

      const agentPerformance: AgentPerformance[] = Object.values(agentStats).map((stats: any) => ({
        ...stats,
        conversionRate: stats.totalCalls > 0 ? (stats.conversions / stats.totalCalls) * 100 : 0,
        averageCallDuration: stats.totalCalls > 0 ? stats.totalTalkTime / stats.totalCalls : 0,
        rank: 0 // Will be set below
      }));

      // Sort by conversion rate and assign ranks
      agentPerformance.sort((a, b) => b.conversionRate - a.conversionRate);
      agentPerformance.forEach((agent, index) => {
        agent.rank = index + 1;
      });

      return agentPerformance;

    } catch (error) {
      console.error('❌ Error getting agent performance:', error);
      throw new Error(`Failed to get agent performance: ${error}`);
    }
  }

  /**
   * Record a call KPI entry
   */
  async recordCallKPI(kpiData: Omit<CallKPIData, 'hourOfDay' | 'dayOfWeek' | 'callDate'>): Promise<void> {
    try {
      const callDate = new Date();
      const hourOfDay = callDate.getHours();
      const dayOfWeek = callDate.getDay();

      await prisma.callKPI.create({
        data: {
          ...kpiData,
          callDate,
          hourOfDay,
          dayOfWeek
        }
      });

      console.log('✅ Call KPI recorded:', kpiData.callId);

    } catch (error) {
      console.error('❌ Error recording call KPI:', error);
      throw new Error(`Failed to record call KPI: ${error}`);
    }
  }

  /**
   * Get campaign metrics for dashboard
   */
  async getCampaignMetrics(campaignId: string, days: number = 7): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const summary = await this.getKPISummary(startDate, new Date(), campaignId);
      const hourlyData = await this.getHourlyData(startDate, new Date(), campaignId);
      const outcomeData = await this.getOutcomeData(startDate, new Date(), campaignId);

      return {
        summary,
        hourlyTrend: hourlyData,
        outcomeBreakdown: outcomeData,
        dateRange: { start: startDate, end: new Date() }
      };

    } catch (error) {
      console.error('❌ Error getting campaign metrics:', error);
      throw new Error(`Failed to get campaign metrics: ${error}`);
    }
  }
}

export const realKPIService = new RealKPIService();