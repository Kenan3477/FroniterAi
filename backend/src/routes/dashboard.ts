import express, { Request, Response } from 'express';
import { addDays, startOfDay } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { authenticate, requireRole } from '../middleware/auth';
import { overviewDashboardService } from '../services/overviewDashboardService';
import { prisma } from '../lib/prisma';
import {
  getDashboardStatsTimezone,
  getUtcRangeForZonedCalendarDay,
  formatZonedDateKey,
} from '../utils/dashboardDayBounds';
import { isStatsConnectedCall, isStatsSaleOrConversion } from '../utils/dashboardCallMetrics';

const router = express.Router();
/**
 * Dashboard Stats Endpoint
 * GET /api/dashboard/stats
 * Returns comprehensive dashboard statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching dashboard stats for user:', req.user?.userId);
    
    // Get campaign filter if provided
    const campaignId = req.query.campaignId as string | undefined;
    
    // Get overview KPIs (respect campaign filter when provided)
    const metrics = await overviewDashboardService.getOverviewKPIs(
      'today',
      undefined,
      undefined,
      campaignId && campaignId !== 'all' ? campaignId : undefined
    );
    
    const tz = getDashboardStatsTimezone();
    const now = new Date();
    const { startUtc, endUtc } = getUtcRangeForZonedCalendarDay(now, tz);
    const campaignWhere =
      campaignId && campaignId !== 'all' ? { campaignId } : {};

    // Get recent activities (calls, interactions) for the configured calendar day
    const recentActivities = await prisma.callRecord.findMany({
      where: {
        ...campaignWhere,
        startTime: { gte: startUtc, lte: endUtc },
      },
      take: 10,
      orderBy: { startTime: 'desc' },
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
        },
        disposition: {
          select: {
            name: true,
            category: true
          }
        }
      }
    });

    // Format recent activities
    const formattedActivities = recentActivities.map(call => ({
      id: call.id,
      type: 'call' as const,
      timestamp: call.startTime,
      description: `${call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : 'Unknown'} called ${call.contact ? `${call.contact.firstName} ${call.contact.lastName}` : call.phoneNumber}`,
      outcome: call.disposition?.name || call.outcome || 'Unknown',
      duration: call.duration || 0,
      agent: call.agent ? `${call.agent.firstName} ${call.agent.lastName}` : undefined,
      contact: call.contact ? {
        name: `${call.contact.firstName} ${call.contact.lastName}`,
        phone: call.contact.phone
      } : undefined
    }));

    // KPI counts use DASHBOARD_STATS_TIMEZONE calendar day (not server UTC midnight)
    const callsToday = await prisma.callRecord.count({
      where: {
        ...campaignWhere,
        startTime: { gte: startUtc, lte: endUtc },
      },
    });

    const connectedCalls = await prisma.callRecord.count({
      where: {
        ...campaignWhere,
        startTime: { gte: startUtc, lte: endUtc },
        endTime: { not: null },
        OR: [
          { duration: { gt: 0 } },
          { dispositionId: { not: null } },
          {
            outcome: {
              in: [
                'completed',
                'CONNECTED',
                'connected',
                'answered',
                'in-progress',
                'sale',
                'SALE',
                'interested',
                'INTERESTED',
              ],
            },
          },
        ],
      },
    });

    const salesToday = await prisma.callRecord.count({
      where: {
        ...campaignWhere,
        startTime: { gte: startUtc, lte: endUtc },
        OR: [
          { outcome: { in: ['sale', 'SALE', 'Sale', 'SALE_MADE'] } },
          { outcome: { contains: 'sale', mode: 'insensitive' } },
          { disposition: { name: { contains: 'sale', mode: 'insensitive' } } },
        ],
      },
    });

    const callsInProgress = await prisma.callRecord.count({
      where: {
        ...(campaignId ? { campaignId } : {}),
        endTime: null,
        startTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    const activeAgents = await prisma.agent.count({
      where: {
        status: { equals: 'AVAILABLE', mode: 'insensitive' },
      },
    });

    // Calculate stats
    const connectionRate = callsToday > 0 ? (connectedCalls / callsToday) * 100 : 0;
    const conversionFromSales =
      connectedCalls > 0 ? Math.min(100, (salesToday / connectedCalls) * 100) : 0;

    const dashboardStats = {
      totalCallsToday: callsToday,
      connectedCallsToday: connectedCalls,
      totalRevenue: metrics.revenueConversions || 0,
      conversionRate: conversionFromSales > 0 ? conversionFromSales : connectionRate,
      averageCallDuration: metrics.averageCallDuration || 0,
      agentsOnline: activeAgents,
      callsInProgress,
      averageWaitTime: 0,
      activeAgents: activeAgents,
      recentActivities: formattedActivities,
      performance: {
        callVolume: callsToday,
        connectionRate: Math.round(connectionRate),
        avgDuration: metrics.averageCallDuration || 0,
        conversions: salesToday,
      },
    };

    res.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

/**
 * Dashboard Metrics Endpoint
 * GET /api/dashboard/metrics
 * Returns the main KPIs for the executive dashboard
 */
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching dashboard metrics for user:', req.user?.userId);
    
    const metrics = await overviewDashboardService.getOverviewKPIs('today');
    
    // Transform to match frontend interface
    const dashboardMetrics = {
      totalCallsToday: metrics.totalCalls || 0,
      connectedCallsToday: Math.round((metrics.totalCalls || 0) * (metrics.connectionRate || 0) / 100),
      totalRevenue: metrics.revenueConversions || 0,
      conversionRate: metrics.connectionRate || 0,
      averageCallDuration: metrics.averageCallDuration || 0,
      agentsOnline: metrics.activeAgents || 0,
      callsInProgress: Math.floor((metrics.totalCalls || 0) * 0.1), // Estimate 10% in progress
      averageWaitTime: metrics.averageWaitTime || 0,
      activeAgents: metrics.activeAgents || 0
    };

    res.json(dashboardMetrics);
  } catch (error) {
    console.error('❌ Dashboard metrics error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard metrics'
    });
  }
});

/**
 * Call Volume Data Endpoint  
 * GET /api/dashboard/call-volume?period=hourly
 */
router.get('/call-volume', authenticate, async (req: Request, res: Response) => {
  try {
    const { period = 'hourly' } = req.query;
    console.log('📞 Fetching call volume data, period:', period);
    
    const filter = period === 'daily' ? 'last_7d' : 'last_24h';
    const data = await overviewDashboardService.getCallVolumeData(filter);
    
    // Transform data to match frontend expectations
    const formattedData = data.map((item: any) => ({
      timestamp: item.timestamp || new Date().toISOString(),
      totalCalls: item.totalCalls || 0,
      connectedCalls: item.connectedCalls || 0,
      period: period as string
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('❌ Call volume data error:', error);
    res.status(500).json({
      error: 'Failed to fetch call volume data'
    });
  }
});

/**
 * Revenue Data Endpoint
 * GET /api/dashboard/revenue?period=daily
 */
router.get('/revenue', authenticate, async (req: Request, res: Response) => {
  try {
    const { period = 'daily' } = req.query;
    console.log('💰 Fetching revenue data, period:', period);
    
    const filter = period === 'daily' ? 'last_7d' : 'last_30d';
    const kpis = await overviewDashboardService.getOverviewKPIs(filter);
    
    // Generate sample revenue data points
    const days = period === 'daily' ? 7 : 30;
    const revenueData = [];
    const baseRevenue = (kpis.revenueConversions || 1000) / days;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      revenueData.push({
        timestamp: date.toISOString(),
        revenue: Math.round(baseRevenue * (0.8 + Math.random() * 0.4)),
        period: period as string
      });
    }

    res.json(revenueData);
  } catch (error) {
    console.error('❌ Revenue data error:', error);
    res.status(500).json({
      error: 'Failed to fetch revenue data'
    });
  }
});

/**
 * Conversion Data Endpoint
 * GET /api/dashboard/conversions
 */
router.get('/conversions', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('🎯 Fetching conversion data');
    
    const outcomes = await overviewDashboardService.getRecentCallOutcomes(100);
    
    // Transform to match frontend expectations
    const conversionData = outcomes.map((outcome: any) => ({
      outcome: outcome.outcome || outcome.disposition || 'Unknown',
      count: outcome.count || 0,
      revenue: outcome.revenue || undefined
    }));

    res.json(conversionData);
  } catch (error) {
    console.error('❌ Conversion data error:', error);
    res.status(500).json({
      error: 'Failed to fetch conversion data'
    });
  }
});

/**
 * Top Agents Endpoint
 * GET /api/dashboard/top-agents
 */
router.get('/top-agents', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('👥 Fetching top agents data');
    
    const agents = await overviewDashboardService.getAgentLeaderboard('last_7d');
    
    // Transform to match frontend expectations
    const topAgentsData = agents.map((agent: any) => ({
      agentId: agent.agentId || agent.userId || `agent-${Math.random()}`,
      agentName: agent.agentName || agent.userName || agent.name || 'Unknown Agent',
      callsHandled: agent.callsHandled || agent.totalCalls || 0,
      conversionRate: agent.conversionRate || agent.successRate || 0,
      revenue: agent.revenue || agent.totalRevenue || 0
    }));

    res.json(topAgentsData);
  } catch (error) {
    console.error('❌ Top agents data error:', error);
    res.status(500).json({
      error: 'Failed to fetch top agents data'
    });
  }
});

/**
 * GET /api/dashboard/active-calls
 * Open call_record rows (no endTime) for admin monitoring — backed by DB, not live-analysis stubs.
 */
router.get(
  '/active-calls',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'),
  async (req: Request, res: Response) => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const rows = await prisma.callRecord.findMany({
        where: {
          endTime: null,
          startTime: { gte: since },
        },
        orderBy: { startTime: 'desc' },
        take: 50,
        include: {
          agent: { select: { agentId: true, firstName: true, lastName: true } },
          campaign: { select: { campaignId: true, name: true } },
        },
      });

      const activeCalls = rows.map((r) => ({
        callId: r.callId,
        agentId: r.agentId || '',
        agentName: r.agent
          ? `${r.agent.firstName || ''} ${r.agent.lastName || ''}`.trim() || 'Agent'
          : 'Unassigned',
        phoneNumber: r.phoneNumber,
        campaignId: r.campaignId,
        campaignName: r.campaign?.name || r.campaignId,
        callDuration: Math.floor((Date.now() - new Date(r.startTime).getTime()) / 1000),
        callStatus: r.outcome || 'active',
        isAnsweringMachine: false,
        confidence: 0,
        sentimentScore: 0,
        intentClassification: '—',
      }));

      res.json({
        success: true,
        data: {
          activeCalls,
          count: activeCalls.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Dashboard active-calls error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch active calls' });
    }
  }
);

/**
 * GET /api/dashboard/performance-series?days=7&campaignId=
 * Daily buckets for charts: total calls, connected-ish, conversions (positive dispositions).
 */
router.get('/performance-series', authenticate, async (req: Request, res: Response) => {
  try {
    const rawDays = parseInt(String(req.query.days || '7'), 10);
    const days = Number.isFinite(rawDays) ? Math.min(30, Math.max(1, rawDays)) : 7;
    const campaignId = req.query.campaignId as string | undefined;
    const tz = getDashboardStatsTimezone();
    const now = new Date();

    const zonedNow = utcToZonedTime(now, tz);
    const bucketKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStartZoned = startOfDay(addDays(startOfDay(zonedNow), -i));
      const dayStartUtc = zonedTimeToUtc(dayStartZoned, tz);
      bucketKeys.push(formatZonedDateKey(dayStartUtc, tz));
    }

    const oldestDayStartZoned = startOfDay(addDays(startOfDay(zonedNow), -(days - 1)));
    const rangeStartUtc = zonedTimeToUtc(oldestDayStartZoned, tz);

    const buckets: Record<string, { date: string; totalCalls: number; connectedCalls: number; conversions: number }> =
      {};
    for (const key of bucketKeys) {
      buckets[key] = { date: key, totalCalls: 0, connectedCalls: 0, conversions: 0 };
    }

    const records = await prisma.callRecord.findMany({
      where: {
        startTime: { gte: rangeStartUtc },
        ...(campaignId && campaignId !== 'all' ? { campaignId } : {}),
      },
      select: {
        startTime: true,
        endTime: true,
        duration: true,
        outcome: true,
        dispositionId: true,
        disposition: { select: { name: true } },
      },
    });

    for (const r of records) {
      const key = formatZonedDateKey(new Date(r.startTime), tz);
      if (!buckets[key]) continue;
      buckets[key].totalCalls += 1;
      if (isStatsConnectedCall({
        endTime: r.endTime,
        outcome: r.outcome,
        duration: r.duration,
        dispositionId: r.dispositionId,
      })) {
        buckets[key].connectedCalls += 1;
      }
      if (isStatsSaleOrConversion({ outcome: r.outcome, dispositionName: r.disposition?.name })) {
        buckets[key].conversions += 1;
      }
    }

    const series = bucketKeys.map((k) => buckets[k]);
    res.json({ success: true, data: series });
  } catch (error) {
    console.error('❌ Dashboard performance-series error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance series' });
  }
});

export default router;