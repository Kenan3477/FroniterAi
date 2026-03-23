/**
 * Voice Campaign Reports API
 * Returns voice campaign analytics data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Voice campaign reports API called');
    
    // Get the auth token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      console.log('❌ No token provided for voice campaign reports');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const agentIds = searchParams.getAll('agentIds');
    const leadListIds = searchParams.getAll('leadListIds');

    console.log('📊 Loading voice campaign analytics with params:', {
      campaignId, dateFrom, dateTo, agentIds, leadListIds
    });

    // For now, return mock data to prevent errors
    // TODO: Implement actual backend call when backend endpoint is ready
    const mockData = {
      success: true,
      data: {
        kpis: {
          totalCalls: 1547,
          connectedCalls: 1102,
          answerRate: 71.2,
          conversionRate: 8.4,
          averageCallDuration: 285, // seconds
          revenuePerCampaign: 12450,
          costPerConversion: 45.50
        },
        charts: {
          callsByHour: Array.from({ length: 24 }, (_, i) => ({
            hour: i,
            totalCalls: Math.floor(Math.random() * 50) + 10,
            connectedCalls: Math.floor(Math.random() * 35) + 5,
            conversions: Math.floor(Math.random() * 8) + 1
          })),
          callsByAgent: [
            {
              agentId: '509',
              agentName: 'Ken Admin',
              totalCalls: 245,
              connectedCalls: 178,
              conversions: 22
            },
            {
              agentId: '510', 
              agentName: 'Agent Demo',
              totalCalls: 189,
              connectedCalls: 134,
              conversions: 18
            }
          ],
          conversionFunnel: {
            totalCalls: 1547,
            connectedCalls: 1102,
            qualifiedLeads: 456,
            conversions: 129
          },
          callOutcomes: [
            { outcome: 'Sale', count: 129, percentage: 8.3 },
            { outcome: 'Interested', count: 327, percentage: 21.1 },
            { outcome: 'Not Interested', count: 445, percentage: 28.8 },
            { outcome: 'Callback', count: 201, percentage: 13.0 },
            { outcome: 'No Answer', count: 445, percentage: 28.8 }
          ]
        }
      }
    };

    console.log('✅ Voice campaign data loaded successfully');
    return NextResponse.json(mockData);

  } catch (error) {
    console.error('❌ Voice campaign reports API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load campaign analytics' },
      { status: 500 }
    );
  }
}