import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/dashboard/stats - Get real-time dashboard statistics
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, year
    const agentId = searchParams.get('agentId');

    // Define date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(today);
    monthStart.setMonth(monthStart.getMonth() - 1);

    let dateFilter: any = { gte: today };
    let previousDateFilter: any = { gte: yesterday, lt: today };

    // Adjust filters based on period
    switch (period) {
      case 'week':
        dateFilter = { gte: weekStart };
        const previousWeekStart = new Date(weekStart);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);
        previousDateFilter = { gte: previousWeekStart, lt: weekStart };
        break;
      case 'month':
        dateFilter = { gte: monthStart };
        const previousMonthStart = new Date(monthStart);
        previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
        previousDateFilter = { gte: previousMonthStart, lt: monthStart };
        break;
    }

    // Build where conditions for agent filtering
    let userFilter: any = {};
    if (user.role === 'AGENT') {
      userFilter = { agentId: user.userId?.toString() };
    } else if (agentId && (user.role === 'ADMIN' || user.role === 'SUPERVISOR')) {
      userFilter = { agentId: agentId };
    }

    // 1. Contact Statistics
    const contactStats = await prisma.contact.aggregate({
      where: {
        createdAt: dateFilter,
        ...((user.role === 'AGENT' || agentId) && {
          // Filter contacts by assigned campaigns for agents
        }),
      },
      _count: { id: true },
    });

    const previousContactStats = await prisma.contact.aggregate({
      where: {
        createdAt: previousDateFilter,
      },
      _count: { id: true },
    });

    // 2. Call Record Statistics (using raw SQL due to schema complexity)
    const callStatsQuery = `
      SELECT 
        COUNT(*) as totalCalls,
        COUNT(CASE WHEN outcome = 'answered' THEN 1 END) as answeredCalls,
        COUNT(CASE WHEN outcome = 'connected' THEN 1 END) as connectedCalls,
        COUNT(CASE WHEN outcome = 'completed' THEN 1 END) as completedCalls,
        AVG(duration) as avgDuration,
        SUM(duration) as totalDuration,
        COUNT(CASE WHEN duration > 0 THEN 1 END) as callsWithDuration
      FROM call_records 
      WHERE startTime >= ? 
      ${userFilter.agentId ? 'AND agentId = ?' : ''}
    `;

    const callStatsParams: string[] = [dateFilter.gte.toISOString()];
    if (userFilter.agentId) {
      callStatsParams.push(userFilter.agentId);
    }

    const callStats = await prisma.$queryRawUnsafe(callStatsQuery, ...callStatsParams) as any[];
    const currentCallStats = callStats[0] || {
      totalCalls: 0,
      answeredCalls: 0,
      connectedCalls: 0,
      completedCalls: 0,
      avgDuration: 0,
      totalDuration: 0,
      callsWithDuration: 0,
    };

    // Previous period call stats for trends
    const previousCallStatsQuery = callStatsQuery.replace('startTime >= ?', 'startTime >= ? AND startTime < ?');
    const previousCallStatsParams = [previousDateFilter.gte.toISOString(), previousDateFilter.lt?.toISOString() || dateFilter.gte.toISOString()];
    if (userFilter.agentId) {
      previousCallStatsParams.push(userFilter.agentId);
    }

    const previousCallStatsResult = await prisma.$queryRawUnsafe(previousCallStatsQuery, ...previousCallStatsParams) as any[];
    const previousCallStats = previousCallStatsResult[0] || {
      totalCalls: 0,
      answeredCalls: 0,
      connectedCalls: 0,
      completedCalls: 0,
    };

    // 3. Campaign Statistics
    const campaignStats = await prisma.campaign.count({
      where: {
        status: 'active',
        ...(user.role === 'AGENT' && {
          // Add agent campaign filtering when available
        }),
      },
    });

    // 4. Active User Statistics
    const activeUsers = await prisma.user.count({
      where: {
        isActive: true,
        status: { in: ['available', 'busy', 'on_call'] },
        ...(user.role !== 'ADMIN' && user.role !== 'SUPERVISOR' && {
          id: user.userId,
        }),
      },
    });

    // 5. Disposition Analysis
    const dispositionQuery = `
      SELECT 
        d.category,
        COUNT(*) as count,
        AVG(cr.duration) as avgDuration
      FROM call_records cr
      LEFT JOIN dispositions d ON cr.dispositionId = d.id
      WHERE cr.startTime >= ?
      ${userFilter.agentId ? 'AND cr.agentId = ?' : ''}
      GROUP BY d.category
      ORDER BY count DESC
      LIMIT 10
    `;

    const dispositionParams: string[] = [dateFilter.gte.toISOString()];
    if (userFilter.agentId) {
      dispositionParams.push(userFilter.agentId);
    }

    const dispositions = await prisma.$queryRawUnsafe(dispositionQuery, ...dispositionParams) as any[];

    // Calculate metrics
    const totalCalls = Number(currentCallStats.totalCalls) || 0;
    const answeredCalls = Number(currentCallStats.answeredCalls) || 0;
    const connectedCalls = Number(currentCallStats.connectedCalls) || 0;
    const completedCalls = Number(currentCallStats.completedCalls) || 0;
    const avgDuration = Number(currentCallStats.avgDuration) || 0;
    const totalDuration = Number(currentCallStats.totalDuration) || 0;

    // Calculate rates
    const answerRate = totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;
    const connectionRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
    const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    // Calculate trends
    const previousTotal = Number(previousCallStats.totalCalls) || 0;
    const previousAnswered = Number(previousCallStats.answeredCalls) || 0;
    const previousCompleted = Number(previousCallStats.completedCalls) || 0;

    const callsTrend = previousTotal > 0 ? ((totalCalls - previousTotal) / previousTotal) * 100 : null;
    const answerTrend = previousAnswered > 0 ? ((answeredCalls - previousAnswered) / previousAnswered) * 100 : null;
    const completionTrend = previousCompleted > 0 ? ((completedCalls - previousCompleted) / previousCompleted) * 100 : null;
    const contactsTrend = previousContactStats._count.id > 0 ? 
      ((contactStats._count.id - previousContactStats._count.id) / previousContactStats._count.id) * 100 : null;

    // Format response
    const dashboardStats = {
      period,
      today: {
        todayCalls: totalCalls,
        callsAttempted: totalCalls,
        callsConnected: connectedCalls,
        callsAnswered: answeredCalls,
        successfulCalls: completedCalls,
        totalTalkTime: Math.round(totalDuration / 60), // Convert to minutes
        averageCallDuration: Math.round(avgDuration || 0),
        activeContacts: contactStats._count.id,
        conversionRate: Math.round(completionRate * 100) / 100,
        answeredCallRate: Math.round(answerRate * 100) / 100,
        connectionRate: Math.round(connectionRate * 100) / 100,
        activeCampaigns: campaignStats,
        activeAgents: activeUsers,
      },
      trends: {
        callsTrend: callsTrend ? Math.round(callsTrend * 100) / 100 : null,
        answerTrend: answerTrend ? Math.round(answerTrend * 100) / 100 : null,
        conversionTrend: completionTrend ? Math.round(completionTrend * 100) / 100 : null,
        contactsTrend: contactsTrend ? Math.round(contactsTrend * 100) / 100 : null,
      },
      dispositions: dispositions.map((d: any) => ({
        category: d.category || 'No Disposition',
        count: Number(d.count),
        percentage: totalCalls > 0 ? Math.round((Number(d.count) / totalCalls) * 100) : 0,
        avgDuration: Math.round(Number(d.avgDuration) || 0),
      })),
      metadata: {
        dateRange: {
          start: dateFilter.gte.toISOString(),
          end: now.toISOString(),
        },
        userId: user.userId,
        userRole: user.role,
        agentFilter: userFilter.agentId || null,
      },
    };

    return NextResponse.json({
      success: true,
      data: dashboardStats,
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});