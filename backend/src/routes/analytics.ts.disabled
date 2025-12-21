import { Router } from 'express';
import { prisma } from '../database';

const router = Router();

const CURRENT_USER_ID = "user1"; // Mock current user ID (string format)
const CURRENT_AGENT_ID = "agent1"; // Mock current agent ID (string format)

// Get agent status
router.get('/agent/status', async (req, res) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: CURRENT_AGENT_ID },
      select: {
        currentStatus: true,
        lastLoginAt: true
      }
    });

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch agent status' }
    });
  }
});

// Update agent status
router.post('/agent/status', async (req, res) => {
  try {
    const { status } = req.body;

    const agent = await prisma.agent.update({
      where: { id: CURRENT_AGENT_ID },
      data: {
        currentStatus: status,
        lastLoginAt: new Date()
      }
    });

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update agent status' }
    });
  }
});

// Get dashboard summary
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    // Default to today if no date range provided
    const startDate = from ? new Date(from as string) : new Date();
    const endDate = to ? new Date(to as string) : new Date();
    
    if (!from && !to) {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get calls for the period (using Call model instead of interaction)
    const calls = await prisma.call.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        legs: true
      }
    });

    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(endDate.getTime() - periodLength);

    const prevCalls = await prisma.call.findMany({
      where: {
        startTime: {
          gte: prevStartDate,
          lte: prevEndDate
        }
      }
    });

    // Calculate metrics using calls instead of interactions
    const interactionsToday = calls.length;
    const interactionsChangePct = prevCalls.length > 0 
      ? ((interactionsToday - prevCalls.length) / prevCalls.length) * 100 
      : 0;

    const interactionOutcomes = {
      positive: calls.filter((call: any) => call.status === 'ANSWERED').length,
      neutral: calls.filter((call: any) => call.status === 'NO_ANSWER').length,
      negative: calls.filter((call: any) => call.status === 'FAILED').length
    };

    const interactionsTimeSeconds = calls.reduce((sum: number, call: any) => {
      const duration = call.answerTime && call.endTime 
        ? (new Date(call.endTime).getTime() - new Date(call.answerTime).getTime()) / 1000
        : 0;
      return sum + duration;
    }, 0);
    const dmcs = 0; // DMCs not tracked in Call model

    // Mock sales data since Sale model doesn't exist
    const sales: any[] = []; // Placeholder for sales data

    const conversions = sales.length;
    const conversionRate = dmcs > 0 ? (conversions / dmcs) * 100 : 0;

    res.json({
      success: true,
      data: {
        interactionsToday,
        interactionsChangePct,
        interactionOutcomes,
        interactionsTimeSeconds,
        dmcs,
        conversions,
        conversionRate
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch dashboard summary' }
    });
  }
});

// Get sales data
router.get('/dashboard/sales', async (req, res) => {
  try {
    const { month } = req.query;
    
    // Default to current month
    const now = new Date();
    const targetDate = month ? new Date(month as string + '-01') : now;
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);

    // Mock sales data
    const sales: any[] = [];

    const totalSalesCount = sales.length;

    // Group by day
    const dailyBreakdown = [];
    for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = sales.filter((s: any) => 
        s.createdAt >= dayStart && s.createdAt <= dayEnd
      );

      dailyBreakdown.push({
        date: dayStart.toISOString().split('T')[0],
        salesCount: daySales.length
      });
    }

    res.json({
      success: true,
      data: {
        totalSalesCount,
        dailyBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch sales data' }
    });
  }
});

// Get interactions duration data
router.get('/dashboard/interactions-duration', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 5;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Mock interaction data using calls
    const calls = await prisma.call.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Group by date and channel (mock data)
    const groupedData: { [date: string]: { [channel: string]: { totalDuration: number; count: number } } } = {};
    
    calls.forEach((call: any) => {
      const date = call.startTime.toISOString().split('T')[0];
      const channel = 'voice'; // Calls are voice interactions
      
      if (!groupedData[date]) {
        groupedData[date] = {};
      }
      if (!groupedData[date][channel]) {
        groupedData[date][channel] = {
          totalDuration: 0,
          count: 0
        };
      }
      
      groupedData[date][channel].totalDuration += call.duration || 0;
      groupedData[date][channel].count += 1;
    });

    // Format response
    const result: Array<{
      date: string;
      channel: string;
      avgDurationSeconds: number;
      totalDurationSeconds: number;
    }> = [];
    
    Object.entries(groupedData).forEach(([date, channels]) => {
      Object.entries(channels).forEach(([channel, data]) => {
        result.push({
          date,
          channel,
          avgDurationSeconds: data.count > 0 ? data.totalDuration / data.count : 0,
          totalDurationSeconds: data.totalDuration
        });
      });
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch interactions duration' }
    });
  }
});

// Get tasks
router.get('/tasks', async (req, res) => {
  try {
    const {
      status = 'open',
      page = '1',
      pageSize = '25',
      search = '',
      sort = 'dueAt',
      direction = 'asc'
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    const where: any = {
      assignedUserId: CURRENT_USER_ID
    };

    if (status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { notes: { contains: search as string, mode: 'insensitive' } },
        { contact: { firstName: { contains: search as string, mode: 'insensitive' } } },
        { contact: { lastName: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    // Mock task data since Task model doesn't exist
    const tasks: any[] = [];
    const totalCount = 0;

    const items = tasks.map((task: any) => ({
      id: task.id,
      user: task.assignedUser ? `${task.assignedUser.firstName} ${task.assignedUser.lastName}` : 'Unknown',
      contactName: task.contact ? `${task.contact.firstName} ${task.contact.lastName}` : 'Unknown',
      campaign: task.campaign?.name || 'Unknown',
      type: task.type,
      notes: task.notes,
      dueAt: task.dueAt,
      status: task.status,
      createdAt: task.createdAt
    }));

    res.json({
      success: true,
      data: {
        items,
        totalCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch tasks' }
    });
  }
});

export default router;