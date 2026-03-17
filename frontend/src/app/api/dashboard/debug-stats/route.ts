import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/dashboard/debug-stats - Debug dashboard stats WITHOUT authentication
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today';

    console.log('🐛 DEBUG: Dashboard stats (no auth) - period:', period);

    // Mock user for debugging
    const mockUser = {
      userId: 509,
      email: 'ken@simpleemails.co.uk',
      role: 'ADMIN'
    };

    // Get today's date for testing
    const todayTest = new Date();
    todayTest.setHours(0, 0, 0, 0);
    const tomorrowTest = new Date(todayTest);
    tomorrowTest.setDate(tomorrowTest.getDate() + 1);
    
    console.log('📅 Querying calls between', todayTest.toISOString(), 'and', tomorrowTest.toISOString());
    
    // Simple direct count for debugging
    const simpleCallCount = await prisma.callRecord.count({
      where: {
        startTime: {
          gte: todayTest,
          lt: tomorrowTest
        }
      }
    });
    
    console.log('🔢 Simple call count today:', simpleCallCount);
    
    // Get contact count
    const contactCount = await prisma.contact.count();
    console.log('📞 Total contacts:', contactCount);
    
    // Get campaign count
    const campaignCount = await prisma.campaign.count();
    console.log('📋 Total campaigns:', campaignCount);

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
        activeContacts: contactCount,
        conversionRate: 0,
        answeredCallRate: 100,
        connectionRate: 100,
        activeCampaigns: campaignCount,
        activeAgents: 1,
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
        userId: mockUser.userId,
        userRole: mockUser.role,
        agentFilter: null,
        debug: true,
      },
    };
    
    console.log('📊 Debug stats result:', directStats);
    
    return NextResponse.json({
      success: true,
      data: directStats,
    });

  } catch (error) {
    console.error('❌ Debug dashboard stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch debug dashboard statistics',
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}