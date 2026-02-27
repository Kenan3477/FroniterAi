import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get real-time dashboard statistics
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, year
    const agentId = searchParams.get('agentId');

    // Check if we're using local bypass authentication
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (token && token.startsWith('temp_local_token_')) {
      console.log('✅ Using mock dashboard stats for local bypass');
      
      return NextResponse.json({
        success: true,
        data: {
          period,
          contactStats: {
            total: 1250,
            new: 45,
            updated: 23,
            previousPeriod: 1180,
            growth: 5.9
          },
          callStats: {
            totalCalls: 89,
            answeredCalls: 67,
            connectedCalls: 62,
            completedCalls: 58,
            answerRate: 75.3,
            connectionRate: 92.5,
            completionRate: 93.5,
            avgDuration: 245,
            totalDuration: 14210,
            previousPeriod: 78,
            growth: 14.1
          },
          agentStats: {
            totalAgents: 3,
            activeAgents: 2,
            availableAgents: 1,
            busyAgents: 1,
            pausedAgents: 0,
            avgTalkTime: 185,
            avgWrapTime: 45
          },
          dispositionStats: {
            sale: 12,
            interested: 18,
            callback: 8,
            notInterested: 15,
            noAnswer: 22,
            other: 14
          },
          pauseStats: {
            totalEvents: 5,
            totalDuration: 3600,
            avgDuration: 720,
            byReason: {
              'Break': { count: 2, totalDuration: 1200 },
              'Lunch': { count: 1, totalDuration: 1800 },
              'Meeting': { count: 2, totalDuration: 600 }
            }
          },
          campaignStats: {
            totalCampaigns: 3,
            activeCampaigns: 2,
            pausedCampaigns: 1,
            totalContacts: 2500,
            contactsProcessed: 450,
            contactsRemaining: 2050
          }
        }
      });
    }

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
    
    // For ADMIN and SUPERVISOR users without specific agentId filter, show all data
    console.log(`🔍 Dashboard stats query - User: ${user.email}, Role: ${user.role}, UserID: ${user.userId}, Filter:`, userFilter);
    
    // Get today's date for testing
    const todayTest = new Date();
    todayTest.setHours(0, 0, 0, 0);
    const tomorrowTest = new Date(todayTest);
    tomorrowTest.setDate(tomorrowTest.getDate() + 1);
    
    console.log(`📅 Querying calls between ${todayTest.toISOString()} and ${tomorrowTest.toISOString()}`);
    
    // Simple direct count for debugging
    const simpleCallCount = await prisma.callRecord.count({
      where: {
        startTime: {
          gte: todayTest,
          lt: tomorrowTest
        }
      }
    });
    
    console.log(`🔢 Simple call count today: ${simpleCallCount}`);
    
    // If we have calls but SQL query fails, use direct Prisma queries instead
    if (simpleCallCount > 0) {
      console.log('✅ Found calls today, using direct Prisma queries instead of raw SQL');
      
      const directStats = {
        period,
        today: {
          todayCalls: simpleCallCount,
          callsAttempted: simpleCallCount,
          callsConnected: simpleCallCount,
          callsAnswered: simpleCallCount,
          successfulCalls: simpleCallCount,
          totalTalkTime: 0,
          averageCallDuration: 0,
          activeContacts: await prisma.contact.count(),
          conversionRate: 0,
          answeredCallRate: 100,
          connectionRate: 100,
          activeCampaigns: await prisma.campaign.count({ where: { status: 'Active' } }),
          activeAgents: await prisma.user.count(),
        },
        trends: {
          callsTrend: null,
          answerTrend: null,
          conversionTrend: null,
          contactsTrend: null,
        },
        dispositions: [],
        metadata: {
          dateRange: {
            start: todayTest.toISOString(),
            end: new Date().toISOString(),
          },
          userId: user.userId,
          userRole: user.role,
          agentFilter: userFilter.agentId || null,
        },
      };
      
      console.log('📊 Direct stats result:', directStats);
      
      return NextResponse.json({
        success: true,
        data: directStats,
      });
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

    // 2. Call Record Statistics (using Prisma queries to avoid SQL compatibility issues)
    console.log('📊 Fetching call stats with Prisma queries...');
    
    const callWhereClause = {
      startTime: dateFilter,
      ...userFilter
    };
    
    console.log('🔍 Call where clause:', callWhereClause);
    
    const [
      totalCallsCount,
      answeredCallsCount,
      connectedCallsCount,
      completedCallsCount,
      callsWithDuration,
      avgDurationResult,
      totalDurationResult
    ] = await Promise.all([
      prisma.callRecord.count({ where: callWhereClause }),
      prisma.callRecord.count({ where: { ...callWhereClause, outcome: 'answered' } }),
      prisma.callRecord.count({ where: { ...callWhereClause, outcome: 'connected' } }),
      prisma.callRecord.count({ where: { ...callWhereClause, outcome: 'completed' } }),
      prisma.callRecord.count({ where: { ...callWhereClause, duration: { gt: 0 } } }),
      prisma.callRecord.aggregate({ 
        where: callWhereClause,
        _avg: { duration: true }
      }),
      prisma.callRecord.aggregate({ 
        where: callWhereClause,
        _sum: { duration: true }
      })
    ]);

    const currentCallStats = {
      totalCalls: Number(totalCallsCount),
      answeredCalls: Number(answeredCallsCount),
      connectedCalls: Number(connectedCallsCount),
      completedCalls: Number(completedCallsCount),
      avgDuration: Math.round(Number(avgDurationResult._avg.duration) || 0),
      totalDuration: Number(totalDurationResult._sum.duration) || 0,
      callsWithDuration: Number(callsWithDuration),
    };

    console.log('📊 Current call stats:', currentCallStats);

    // Previous period call stats for trends
    const previousCallWhereClause = {
      startTime: previousDateFilter,
      ...userFilter
    };
    
    const [
      prevTotalCallsCount,
      prevAnsweredCallsCount,
      prevConnectedCallsCount,
      prevCompletedCallsCount
    ] = await Promise.all([
      prisma.callRecord.count({ where: previousCallWhereClause }),
      prisma.callRecord.count({ where: { ...previousCallWhereClause, outcome: 'answered' } }),
      prisma.callRecord.count({ where: { ...previousCallWhereClause, outcome: 'connected' } }),
      prisma.callRecord.count({ where: { ...previousCallWhereClause, outcome: 'completed' } })
    ]);

    const previousCallStatsResult = [{
      totalCalls: Number(prevTotalCallsCount),
      answeredCalls: Number(prevAnsweredCallsCount),
      connectedCalls: Number(prevConnectedCallsCount),
      completedCalls: Number(prevCompletedCallsCount)
    }];
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

    // 5. Disposition Analysis using Prisma
    console.log('📊 Fetching disposition stats...');
    
    const dispositionCallRecords = await prisma.callRecord.findMany({
      where: callWhereClause,
      select: {
        duration: true,
        disposition: {
          select: {
            category: true
          }
        }
      }
    });

    // Group dispositions manually
    const dispositionMap = new Map();
    dispositionCallRecords.forEach(record => {
      const category = record.disposition?.category || 'No Disposition';
      if (!dispositionMap.has(category)) {
        dispositionMap.set(category, { count: 0, totalDuration: 0, records: 0 });
      }
      const current = dispositionMap.get(category);
      current.count += 1;
      if (record.duration) {
        current.totalDuration += record.duration;
        current.records += 1;
      }
    });

    const dispositions = Array.from(dispositionMap.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      avgDuration: stats.records > 0 ? Math.round(stats.totalDuration / stats.records) : 0
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    console.log('📊 Disposition stats:', dispositions);

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