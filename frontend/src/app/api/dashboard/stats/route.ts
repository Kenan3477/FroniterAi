import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

// Use Railway database URL - external proxy for Vercel deployment
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway"
    }
  }
});

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get real-time dashboard statistics
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, year
    const agentId = searchParams.get('agentId');

    // Prefer backend API (same source of truth as production) when we have a real JWT
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const backendBase = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      ''
    ).replace(/\/$/, '');

    if (token && !token.startsWith('temp_local_token_') && backendBase) {
      const query = new URL(request.url).search;
      try {
        const br = await fetch(`${backendBase}/api/dashboard/stats${query}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        if (br.ok) {
          const payload = await br.json();
          if (payload?.success && payload?.data) {
            return NextResponse.json(payload);
          }
        }
      } catch (e) {
        console.error('Dashboard stats proxy to backend failed:', e);
      }
    }

    // Check if we're using local bypass authentication
    
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
    
    // Get comprehensive counts for debugging
    let simpleCallCount, totalCallCount, contactCount, campaignCount, userCount, todaysSuccessfulCalls, todaysSales, meaningfulInteractions, answeredCalls;
    
    try {
      // Total calls attempted today
      simpleCallCount = await prisma.callRecord.count({
        where: {
          createdAt: {
            gte: todayTest,
            lt: tomorrowTest
          }
        }
      });
      console.log(`🔢 Total calls attempted today: ${simpleCallCount}`);
    } catch (error) {
      console.error('❌ Error counting today\'s calls:', error);
      simpleCallCount = 0;
    }
    
    try {
      // Answered calls (actually connected and ended)
      answeredCalls = await prisma.callRecord.count({
        where: {
          createdAt: {
            gte: todayTest,
            lt: tomorrowTest
          },
          endTime: { not: null }, // Call was answered and ended
          duration: { gt: 0 } // Had some duration
        }
      });
      console.log(`📞 Calls answered today: ${answeredCalls}`);
    } catch (error) {
      console.error('❌ Error counting answered calls:', error);
      answeredCalls = 0;
    }
    
    try {
      // SIMPLIFIED SUCCESSFUL CALL CLASSIFICATION
      // Matches the interaction history endpoint logic for consistency
      todaysSuccessfulCalls = await prisma.callRecord.count({
        where: {
          createdAt: {
            gte: todayTest,
            lt: tomorrowTest
          },
          endTime: { not: null }, // ✅ Must be ended
          outcome: {
            in: ['sale', 'interested', 'callback', 'appointment', 'contact_made', 
                 'SALE', 'INTERESTED', 'CALLBACK', 'APPOINTMENT', 'CONTACT_MADE']
          }
        }
      });
      console.log(`✅ Today's successful calls: ${todaysSuccessfulCalls}`);
    } catch (error) {
      console.error('❌ Error counting today\'s successful calls:', error);
      todaysSuccessfulCalls = 0;
    }
    
    // Get conversion rate metrics: sales divided by meaningful interactions (calls over 15s)
    
    try {
      // Count actual sales today
      todaysSales = await prisma.callRecord.count({
        where: {
          createdAt: {
            gte: todayTest,
            lt: tomorrowTest
          },
          endTime: { not: null },
          outcome: {
            in: ['sale', 'SALE']
          }
        }
      });
      console.log(`💰 Today's sales: ${todaysSales}`);
    } catch (error) {
      console.error('❌ Error counting today\'s sales:', error);
      todaysSales = 0;
    }
    
    try {
      // Count meaningful interactions (calls over 15 seconds)
      meaningfulInteractions = await prisma.callRecord.count({
        where: {
          createdAt: {
            gte: todayTest,
            lt: tomorrowTest
          },
          duration: {
            gt: 15
          }
        }
      });
      console.log(`🗣️ Today's meaningful interactions (>15s): ${meaningfulInteractions}`);
    } catch (error) {
      console.error('❌ Error counting meaningful interactions:', error);
      meaningfulInteractions = 0;
    }
    
    try {
      totalCallCount = await prisma.callRecord.count();
      console.log(`🔢 Total call count (all time): ${totalCallCount}`);
    } catch (error) {
      console.error('❌ Error counting total calls:', error);
      totalCallCount = 0;
    }
    
    try {
      // Check if campaignId is provided in query parameters for campaign-specific contact count
      const { searchParams } = new URL(request.url);
      const requestedCampaignId = searchParams.get('campaignId');
      
      if (requestedCampaignId) {
        // Campaign-specific contact count - get contacts assigned to this campaign through data lists
        console.log(`🎯 Getting contact count for campaign: ${requestedCampaignId}`);
        
        // Find data lists assigned to this campaign
        const assignedDataLists = await prisma.dataList.findMany({
          where: { 
            campaignId: requestedCampaignId,
            active: true 
          },
          include: {
            _count: {
              select: {
                contacts: true
              }
            }
          }
        });

        // Sum up contacts from all assigned data lists
        contactCount = assignedDataLists.reduce((total, dataList) => {
          return total + dataList._count.contacts;
        }, 0);

        console.log(`📞 Campaign-specific contact count for ${requestedCampaignId}: ${contactCount} (from ${assignedDataLists.length} data lists)`);
        
        // Log individual data list contributions for debugging
        assignedDataLists.forEach(dataList => {
          console.log(`  - ${dataList.name}: ${dataList._count.contacts} contacts`);
        });
      } else {
        // Global contact count (all campaigns)
        contactCount = await prisma.contact.count();
        console.log(`📞 Global contact count: ${contactCount}`);
      }
    } catch (error) {
      console.error('❌ Error counting contacts:', error);
      contactCount = 0;
    }
    
    try {
      campaignCount = await prisma.campaign.count({ where: { status: 'Active' } });
      console.log(`📋 Active campaign count: ${campaignCount}`);
    } catch (error) {
      console.error('❌ Error counting campaigns:', error);
      campaignCount = 0;
    }
    
    try {
      userCount = await prisma.user.count();
      console.log(`👥 Total user count: ${userCount}`);
    } catch (error) {
      console.error('❌ Error counting users:', error);
      userCount = 0;
    }

    // Always use direct queries to avoid complex aggregation failures
    console.log('✅ Using direct Prisma queries for dashboard stats');
    
    // Calculate accurate rates
    const connectionRate = simpleCallCount > 0 ? Math.round((answeredCalls / simpleCallCount) * 100 * 100) / 100 : 0;
    const answerRate = connectionRate; // Same as connection rate
    const conversionRate = answeredCalls > 0 ? Math.round((todaysSuccessfulCalls / answeredCalls) * 100 * 100) / 100 : 0;
    
    const directStats = {
      period,
      today: {
        todayCalls: simpleCallCount,
        callsAttempted: simpleCallCount, // Total calls attempted today
        callsConnected: answeredCalls, // ✅ FIXED: Actual answered calls, not assumed 100%
        callsAnswered: answeredCalls, // ✅ FIXED: Actual answered calls
        successfulCalls: todaysSuccessfulCalls, // ✅ Use actual successful calls today
        totalTalkTime: 0,
        averageCallDuration: 0,
        activeContacts: contactCount,
        conversionRate: conversionRate, // ✅ FIXED: (successful / answered) * 100
        answeredCallRate: answerRate, // ✅ FIXED: (answered / attempted) * 100
        connectionRate: connectionRate, // ✅ FIXED: (answered / attempted) * 100
        activeCampaigns: campaignCount,
        activeAgents: userCount,
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
        debug: {
          simpleCallCount,
          totalCallCount,
          todaysSuccessfulCalls,
          todaysSales,
          meaningfulInteractions,
          answeredCalls, // ✅ NEW: Show answered calls in debug
          contactCount,
          campaignCount,
          userCount,
          queryDate: todayTest.toISOString(),
          connectionRateFormula: `${answeredCalls} answered / ${simpleCallCount} attempted * 100 = ${connectionRate}%`,
          conversionFormula: `${todaysSuccessfulCalls} successful / ${answeredCalls} answered * 100 = ${conversionRate}%`,
        },
      },
    };
    
    console.log('📊 Direct stats result:', directStats);
    
    return NextResponse.json({
      success: true,
      data: directStats,
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