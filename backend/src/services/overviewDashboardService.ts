/**
 * Overview Dashboard Service - Specific metrics for executive dashboard
 * Provides the 8 required KPI cards and chart data
 */

import { realKPIService } from './realKpiService';
import { eventManager } from './eventManager';

import { prisma } from '../lib/prisma';
export interface TimeframeFilter {
  startDate: Date;
  endDate: Date;
}

export interface OverviewKPIs {
  totalCalls: number;
  connectionRate: number;
  averageCallDuration: number;
  callsPerAgent: number;
  dropRate: number;
  revenueConversions: number;
  averageWaitTime: number;
  activeAgents: number;
}

export interface CallVolumeData {
  timestamp: string;
  totalCalls: number;
  connectedCalls: number;
  period: 'hourly' | 'daily';
}

export interface ConnectionRateData {
  timestamp: string;
  connectionRate: number;
  period: 'hourly' | 'daily';
}

export interface AgentLeaderboard {
  agentId: string;
  agentName: string;
  callsHandled: number;
  connectionRate: number;
  conversions: number;
  averageCallDuration: number;
  rank: number;
}

export interface AgentCallActivity {
  agentId: string;
  agentName: string;
  hourlyData: Array<{
    hour: number;
    callCount: number;
    timestamp: string;
  }>;
  totalCallsToday: number;
  color: string;
}

export interface RecentCallOutcome {
  timestamp: Date;
  agentName: string;
  phoneNumber: string;
  customerName?: string;
  callDuration: number;
  outcome: 'Connected' | 'Dropped' | 'No Answer' | 'Converted';
  revenue?: number;
  callId: string;
}

/**
 * Overview Dashboard Service for executive KPI dashboard
 */
export class OverviewDashboardService {

  /**
   * Emit dashboard metrics update event
   */
  private async emitDashboardUpdate(kpis: OverviewKPIs, timeframe: string) {
    try {
      // TODO: Fix event type definitions
      // await eventManager.emitEvent({
      //   type: 'dashboard.metrics.updated' as const,
      //   metric: 'dashboard_overview',
      //   value: 1,
      //   timeframe,
      //   metadata: { kpis, updatedAt: new Date() }
      // }, 'admin');
      console.log('📊 Dashboard metrics updated:', { timeframe, totalCalls: kpis.totalCalls });
    } catch (error) {
      console.error('Failed to emit dashboard update event:', error);
    }
  }

  /**
   * Calculate timeframe based on filter type
   */
  private getTimeframe(filter: 'today' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom', customStart?: Date, customEnd?: Date): TimeframeFilter {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'last_24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        startDate = customStart || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = customEnd || now;
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * Get all overview KPIs for the dashboard
   */
  async getOverviewKPIs(filter: 'today' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom', customStart?: Date, customEnd?: Date, campaignId?: string): Promise<OverviewKPIs> {
    try {
      const { startDate, endDate } = this.getTimeframe(filter, customStart, customEnd);

      // Build campaign filter
      const campaignFilter = campaignId && campaignId !== 'all' ? { campaignId } : {};

      // Get all call records in the timeframe with optional campaign filter
      const callRecords = await prisma.callRecord.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: endDate
          },
          ...campaignFilter
        },
        include: {
          agent: {
            select: {
              agentId: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      // Get sales/conversion data with campaign filter
      const salesData = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          ...(campaignId && campaignId !== 'all' ? { campaignId } : {})
        }
      });

      // Calculate metrics
      const totalCalls = callRecords.length;
      const connectedCalls = callRecords.filter(call => 
        call.outcome && !['no_answer', 'busy', 'failed'].includes(call.outcome.toLowerCase())
      ).length;
      
      const completedCalls = callRecords.filter(call => call.endTime && call.duration).length;
      const totalDuration = callRecords
        .filter(call => call.duration)
        .reduce((sum, call) => sum + (call.duration || 0), 0);

      const droppedCalls = callRecords.filter(call => 
        call.outcome && ['dropped', 'hang_up', 'disconnected'].includes(call.outcome.toLowerCase())
      ).length;

      // Get active agents (agents who made calls in this period)
      const activeAgentIds = new Set(callRecords.map(call => call.agentId).filter(Boolean));
      const activeAgents = activeAgentIds.size;

      // Calculate wait times from interaction data
      const interactions = await prisma.interaction.findMany({
        where: {
          startedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalWaitTime = interactions
        .filter(interaction => interaction.endedAt && interaction.durationSeconds)
        .reduce((sum, interaction) => sum + (interaction.durationSeconds || 0), 0);

      const result: OverviewKPIs = {
        totalCalls,
        connectionRate: totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0,
        averageCallDuration: completedCalls > 0 ? totalDuration / completedCalls : 0,
        callsPerAgent: activeAgents > 0 ? totalCalls / activeAgents : 0,
        dropRate: totalCalls > 0 ? (droppedCalls / totalCalls) * 100 : 0,
        revenueConversions: salesData.reduce((sum, sale) => sum + sale.amount, 0),
        averageWaitTime: interactions.length > 0 ? totalWaitTime / interactions.length : 0,
        activeAgents
      };

      // Emit real-time update event
      this.emitDashboardUpdate(result, filter);

      return result;

    } catch (error) {
      console.error('❌ Error calculating overview KPIs:', error);
      throw new Error(`Failed to calculate overview KPIs: ${error}`);
    }
  }

  /**
   * Get call volume over time data for charts
   */
  async getCallVolumeData(filter: 'today' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom', customStart?: Date, customEnd?: Date, campaignId?: string): Promise<CallVolumeData[]> {
    try {
      const { startDate, endDate } = this.getTimeframe(filter, customStart, customEnd);
      
      // Determine aggregation level based on timeframe
      const hoursDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const period: 'hourly' | 'daily' = hoursDiff <= 48 ? 'hourly' : 'daily';

      let volumeData: CallVolumeData[];

      if (period === 'hourly') {
        // Hourly aggregation
        const hourlyData = await prisma.$queryRaw<Array<{
          hour: number;
          total_calls: number;
          connected_calls: number;
        }>>`
          SELECT 
            EXTRACT(HOUR FROM "startTime") as hour,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE "outcome" NOT IN ('no_answer', 'busy', 'failed')) as connected_calls
          FROM call_records
          WHERE "startTime" >= ${startDate} AND "startTime" <= ${endDate}
          GROUP BY EXTRACT(HOUR FROM "startTime")
          ORDER BY hour
        `;

        volumeData = hourlyData.map(row => ({
          timestamp: `${row.hour}:00`,
          totalCalls: Number(row.total_calls),
          connectedCalls: Number(row.connected_calls),
          period: 'hourly' as const
        }));
      } else {
        // Daily aggregation
        const dailyData = await prisma.$queryRaw<Array<{
          date: Date;
          total_calls: number;
          connected_calls: number;
        }>>`
          SELECT 
            DATE("startTime") as date,
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE "outcome" NOT IN ('no_answer', 'busy', 'failed')) as connected_calls
          FROM call_records
          WHERE "startTime" >= ${startDate} AND "startTime" <= ${endDate}
          GROUP BY DATE("startTime")
          ORDER BY date
        `;

        volumeData = dailyData.map(row => ({
          timestamp: row.date.toISOString().split('T')[0],
          totalCalls: Number(row.total_calls),
          connectedCalls: Number(row.connected_calls),
          period: 'daily' as const
        }));
      }

      return volumeData;

    } catch (error) {
      console.error('❌ Error getting call volume data:', error);
      throw new Error(`Failed to get call volume data: ${error}`);
    }
  }

  /**
   * Get real-time agent call activity data for live tracking chart
   */
  async getAgentCallActivityData(filter: 'today' | 'last_24h' = 'today', campaignId?: string): Promise<AgentCallActivity[]> {
    try {
      const { startDate, endDate } = this.getTimeframe(filter);
      
      // Build campaign filter
      const campaignFilter = campaignId && campaignId !== 'all' ? { campaignId } : {};

      // Get all call records for today with agent information
      const callRecords = await prisma.callRecord.findMany({
        where: {
          startTime: {
            gte: startDate,
            lte: endDate
          },
          agentId: { not: null },
          ...campaignFilter
        },
        include: {
          agent: {
            select: {
              agentId: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          startTime: 'asc'
        }
      });

      // Group by agent
      const agentCallMap = new Map<string, {
        agentId: string;
        agentName: string;
        callsByHour: Map<number, number>;
        totalCalls: number;
      }>();

      // Process call records
      for (const call of callRecords) {
        if (!call.agentId || !call.agent) continue;

        const agentKey = call.agentId;
        const hour = new Date(call.startTime).getHours();
        const agentName = `${call.agent.firstName} ${call.agent.lastName}`;

        if (!agentCallMap.has(agentKey)) {
          agentCallMap.set(agentKey, {
            agentId: call.agentId,
            agentName,
            callsByHour: new Map(),
            totalCalls: 0
          });
        }

        const agent = agentCallMap.get(agentKey)!;
        agent.totalCalls++;
        
        const hourCount = agent.callsByHour.get(hour) || 0;
        agent.callsByHour.set(hour, hourCount + 1);
      }

      // Generate colors for agents
      const colors = [
        'rgb(59, 130, 246)',   // blue
        'rgb(16, 185, 129)',   // green
        'rgb(245, 101, 101)',  // red
        'rgb(245, 158, 11)',   // amber
        'rgb(139, 92, 246)',   // violet
        'rgb(236, 72, 153)',   // pink
        'rgb(20, 184, 166)',   // teal
        'rgb(251, 146, 60)',   // orange
        'rgb(34, 197, 94)',    // emerald
        'rgb(168, 85, 247)'    // purple
      ];

      // Convert to output format
      const agentActivities: AgentCallActivity[] = [];
      let colorIndex = 0;

      for (const [agentId, agentData] of agentCallMap.entries()) {
        // Create hourly data array (0-23 hours)
        const hourlyData = [];
        for (let hour = 0; hour < 24; hour++) {
          const callCount = agentData.callsByHour.get(hour) || 0;
          const timestamp = `${hour.toString().padStart(2, '0')}:00`;
          
          hourlyData.push({
            hour,
            callCount,
            timestamp
          });
        }

        agentActivities.push({
          agentId,
          agentName: agentData.agentName,
          hourlyData,
          totalCallsToday: agentData.totalCalls,
          color: colors[colorIndex % colors.length]
        });
        
        colorIndex++;
      }

      // Sort by total calls today (descending)
      agentActivities.sort((a, b) => b.totalCallsToday - a.totalCallsToday);

      // Limit to top 10 agents for performance
      return agentActivities.slice(0, 10);

    } catch (error) {
      console.error('❌ Error getting agent call activity data:', error);
      throw new Error(`Failed to get agent call activity data: ${error}`);
    }
  }

  /**
   * Get connection rate trend over time
   */
  async getConnectionRateData(filter: 'today' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom', customStart?: Date, customEnd?: Date, campaignId?: string): Promise<ConnectionRateData[]> {
    try {
      const volumeData = await this.getCallVolumeData(filter, customStart, customEnd);
      
      return volumeData.map(data => ({
        timestamp: data.timestamp,
        connectionRate: data.totalCalls > 0 ? (data.connectedCalls / data.totalCalls) * 100 : 0,
        period: data.period
      }));

    } catch (error) {
      console.error('❌ Error getting connection rate data:', error);
      throw new Error(`Failed to get connection rate data: ${error}`);
    }
  }

  /**
   * Get agent performance leaderboard
   */
  async getAgentLeaderboard(filter: 'today' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom', customStart?: Date, customEnd?: Date, campaignId?: string): Promise<AgentLeaderboard[]> {
    try {
      const { startDate, endDate } = this.getTimeframe(filter, customStart, customEnd);

      const agentStats = await prisma.$queryRaw<Array<{
        agent_id: string;
        agent_name: string;
        calls_handled: number;
        connected_calls: number;
        conversions: number;
        total_duration: number;
        avg_duration: number;
      }>>`
        SELECT 
          cr."agentId" as agent_id,
          CONCAT(a."firstName", ' ', a."lastName") as agent_name,
          COUNT(cr.id) as calls_handled,
          COUNT(*) FILTER (WHERE cr."outcome" NOT IN ('no_answer', 'busy', 'failed')) as connected_calls,
          COUNT(s.id) as conversions,
          SUM(COALESCE(cr."duration", 0)) as total_duration,
          AVG(COALESCE(cr."duration", 0)) as avg_duration
        FROM call_records cr
        LEFT JOIN agents a ON cr."agentId" = a."agentId"
        LEFT JOIN interactions i ON i."agentId" = cr."agentId" AND DATE(i."startedAt") = DATE(cr."startTime")
        LEFT JOIN sales s ON s."interactionId" = i.id
        WHERE cr."startTime" >= ${startDate} AND cr."startTime" <= ${endDate}
          AND cr."agentId" IS NOT NULL
        GROUP BY cr."agentId", a."firstName", a."lastName"
        ORDER BY calls_handled DESC, connected_calls DESC
      `;

      return agentStats.map((stats, index) => ({
        agentId: stats.agent_id,
        agentName: stats.agent_name || 'Unknown Agent',
        callsHandled: Number(stats.calls_handled),
        connectionRate: Number(stats.calls_handled) > 0 ? (Number(stats.connected_calls) / Number(stats.calls_handled)) * 100 : 0,
        conversions: Number(stats.conversions),
        averageCallDuration: Number(stats.avg_duration) || 0,
        rank: index + 1
      }));

    } catch (error) {
      console.error('❌ Error getting agent leaderboard:', error);
      throw new Error(`Failed to get agent leaderboard: ${error}`);
    }
  }

  /**
   * Get recent call outcomes (live feed)
   */
  async getRecentCallOutcomes(limit: number = 20): Promise<RecentCallOutcome[]> {
    try {
      const recentCalls = await prisma.callRecord.findMany({
        where: {
          endTime: {
            not: null
          }
        },
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
              fullName: true
            }
          }
        },
        orderBy: {
          endTime: 'desc'
        },
        take: limit
      });

      // Get sales data for conversion tracking
      const callIds = recentCalls.map(call => call.id);
      const salesByCall = await prisma.sale.groupBy({
        by: ['interactionId'],
        where: {
          interaction: {
            agentId: {
              in: recentCalls.map(call => call.agentId).filter(Boolean) as string[]
            }
          }
        },
        _sum: {
          amount: true
        }
      });

      const salesMap = new Map(salesByCall.map(sale => [sale.interactionId, sale._sum.amount || 0]));

      return recentCalls.map(call => {
        let outcome: RecentCallOutcome['outcome'] = 'No Answer';
        
        if (call.outcome) {
          const outcomeStr = call.outcome.toLowerCase();
          if (['connected', 'completed', 'answered'].some(s => outcomeStr.includes(s))) {
            // Check if it's a conversion
            const revenue = salesMap.get(call.id);
            outcome = revenue && revenue > 0 ? 'Converted' : 'Connected';
          } else if (['dropped', 'hang_up', 'disconnected'].some(s => outcomeStr.includes(s))) {
            outcome = 'Dropped';
          }
        }

        // Get customer name from contact information
        const customerName = call.contact?.fullName || 
                           (call.contact?.firstName && call.contact?.lastName 
                             ? `${call.contact.firstName} ${call.contact.lastName}` 
                             : undefined);

        return {
          timestamp: call.endTime || call.startTime,
          agentName: call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : 'Unknown',
          phoneNumber: call.phoneNumber,
          customerName,
          callDuration: call.duration || 0,
          outcome,
          revenue: salesMap.get(call.id) || undefined,
          callId: call.id
        };
      });

    } catch (error) {
      console.error('❌ Error getting recent call outcomes:', error);
      throw new Error(`Failed to get recent call outcomes: ${error}`);
    }
  }
}

export const overviewDashboardService = new OverviewDashboardService();