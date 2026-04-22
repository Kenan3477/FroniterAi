import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { overviewDashboardService } from '../services/overviewDashboardService';
import { prisma } from '../lib/prisma';
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
    
    // Get overview KPIs
    const metrics = await overviewDashboardService.getOverviewKPIs('today');
    
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

    // Get performance overview
    const callsToday = await prisma.callRecord.count({
      where: {
        ...(campaignId ? { campaignId } : {}),
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const connectedCalls = await prisma.callRecord.count({
      where: {
        ...(campaignId ? { campaignId } : {}),
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        },
        outcome: {
          in: ['CONNECTED', 'completed', 'answered']
        }
      }
    });

    const activeAgents = await prisma.agent.count({
      where: {
        status: 'AVAILABLE'
      }
    });

    // Calculate stats
    const connectionRate = callsToday > 0 ? (connectedCalls / callsToday) * 100 : 0;

    const dashboardStats = {
      totalCallsToday: callsToday,
      connectedCallsToday: connectedCalls,
      totalRevenue: metrics.revenueConversions || 0,
      conversionRate: connectionRate,
      averageCallDuration: metrics.averageCallDuration || 0,
      agentsOnline: activeAgents,
      callsInProgress: 0, // TODO: Implement real-time call tracking
      averageWaitTime: 0,
      activeAgents: activeAgents,
      recentActivities: formattedActivities,
      performance: {
        callVolume: callsToday,
        connectionRate: Math.round(connectionRate),
        avgDuration: metrics.averageCallDuration || 0,
        conversions: connectedCalls
      }
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

export default router;