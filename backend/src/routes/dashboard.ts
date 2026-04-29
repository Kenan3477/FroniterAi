import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { overviewDashboardService } from '../services/overviewDashboardService';
import { prisma } from '../lib/prisma';
const router = express.Router();

const TERMINAL_TWILIO_OUTCOMES = new Set([
  'completed',
  'busy',
  'failed',
  'no-answer',
  'canceled',
  'abandoned',
]);

function isLikelyConnectedCall(outcome: string | null | undefined, duration: number | null | undefined): boolean {
  const o = (outcome || '').toLowerCase();
  if (TERMINAL_TWILIO_OUTCOMES.has(o) && o !== 'completed') return false;
  if (o === 'in-progress' || o === 'ringing' || o === 'queued') return true;
  if ((duration ?? 0) > 0) return true;
  if (['connected', 'answered', 'sale', 'interested', 'callback', 'appointment'].includes(o)) return true;
  return false;
}

function isConversionOutcome(outcome: string | null | undefined, dispositionName: string | null | undefined): boolean {
  const o = (outcome || '').toLowerCase();
  const d = (dispositionName || '').toLowerCase();
  const positives = ['sale', 'interested', 'callback', 'appointment', 'contact_made', 'converted'];
  return positives.some((p) => o.includes(p) || d.includes(p));
}
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
    
    // Get recent activities (calls, interactions)
    const recentActivities = await prisma.callRecord.findMany({
      where: campaignId ? { campaignId } : {},
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

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    // Get performance overview (use same calendar day boundary for all counts)
    const callsToday = await prisma.callRecord.count({
      where: {
        ...(campaignId ? { campaignId } : {}),
        startTime: { gte: dayStart },
      },
    });

    const connectedCalls = await prisma.callRecord.count({
      where: {
        ...(campaignId ? { campaignId } : {}),
        startTime: { gte: dayStart },
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
        ...(campaignId ? { campaignId } : {}),
        startTime: { gte: dayStart },
        OR: [
          { outcome: { in: ['sale', 'SALE', 'Sale', 'SALE_MADE'] } },
          { outcome: { contains: 'sale', mode: 'insensitive' } },
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
        status: 'AVAILABLE'
      }
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

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const records = await prisma.callRecord.findMany({
      where: {
        startTime: { gte: start },
        ...(campaignId ? { campaignId } : {}),
      },
      select: {
        startTime: true,
        endTime: true,
        duration: true,
        outcome: true,
        disposition: { select: { name: true } },
      },
    });

    const buckets: Record<string, { date: string; totalCalls: number; connectedCalls: number; conversions: number }> =
      {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = { date: key, totalCalls: 0, connectedCalls: 0, conversions: 0 };
    }

    for (const r of records) {
      const key = new Date(r.startTime).toISOString().slice(0, 10);
      if (!buckets[key]) continue;
      buckets[key].totalCalls += 1;
      if (isLikelyConnectedCall(r.outcome, r.duration)) {
        buckets[key].connectedCalls += 1;
      }
      if (isConversionOutcome(r.outcome, r.disposition?.name)) {
        buckets[key].conversions += 1;
      }
    }

    const series = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
    res.json({ success: true, data: series });
  } catch (error) {
    console.error('❌ Dashboard performance-series error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch performance series' });
  }
});

export default router;