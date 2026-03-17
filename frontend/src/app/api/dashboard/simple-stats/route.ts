import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching dashboard simple stats directly from database...');
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`📅 Querying for calls between ${today.toISOString()} and ${tomorrow.toISOString()}`);

    // Get call statistics directly from database
    const [
      totalCallsToday,
      totalCallsAllTime,
      totalContacts,
      activeCampaigns,
      totalAgents,
      callsWithDuration
    ] = await Promise.all([
      // Today's calls
      prisma.callRecord.count({
        where: {
          startTime: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      
      // All time calls
      prisma.callRecord.count(),
      
      // Total contacts
      prisma.contact.count(),
      
      // Active campaigns
      prisma.campaign.count({
        where: {
          status: { in: ['Active', 'active'] }
        }
      }),
      
      // Total agents/users
      prisma.user.count(),
      
      // Calls with duration (successful calls)
      prisma.callRecord.count({
        where: {
          startTime: {
            gte: today,
            lt: tomorrow
          },
          duration: {
            gt: 0
          }
        }
      })
    ]);

    // Calculate average call duration for today
    const durationStats = await prisma.callRecord.aggregate({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow
        },
        duration: {
          gt: 0
        }
      },
      _avg: {
        duration: true
      }
    });

    const avgDuration = Math.round(durationStats._avg.duration || 0);
    const answerRate = totalCallsToday > 0 ? Math.round((callsWithDuration / totalCallsToday) * 100) : 0;

    const stats = {
      totalCalls: totalCallsAllTime,
      callsToday: totalCallsToday,
      totalContacts: totalContacts,
      activeCampaigns: activeCampaigns,
      totalAgents: totalAgents,
      answeredCallsToday: callsWithDuration,
      answerRate: answerRate,
      avgCallDuration: avgDuration,
      trends: {
        calls: 0, // Would need historical data to calculate
        answered: 0,
        duration: 0
      },
      source: 'database'
    };

    console.log('✅ Dashboard simple stats calculated:', stats);
    
    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard simple stats error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard statistics',
        data: {
          totalCalls: 0,
          callsToday: 0,
          totalContacts: 0,
          activeCampaigns: 0,
          totalAgents: 0,
          answeredCallsToday: 0,
          answerRate: 0,
          avgCallDuration: 0,
          trends: {
            calls: 0,
            answered: 0,
            duration: 0
          },
          source: 'error'
        }
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}