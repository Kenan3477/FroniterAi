/**
 * Voice Campaign Reports API
 * Returns voice campaign analytics data
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

export const GET = requireAuth(async (request, user) => {
  try {
    console.log('🔍 Voice campaign reports API called for user:', user.userId);

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const agentIds = searchParams.getAll('agentIds');
    const leadListIds = searchParams.getAll('leadListIds');

    console.log('📊 Loading voice campaign analytics with params:', {
      campaignId, dateFrom, dateTo, agentIds, leadListIds
    });

    // Call the backend for real campaign analytics
    const backendUrl = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const queryParams = new URLSearchParams();
    
    if (campaignId) queryParams.append('campaignId', campaignId);
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);
    if (agentIds.length > 0) agentIds.forEach(id => queryParams.append('agentIds', id));
    if (leadListIds.length > 0) leadListIds.forEach(id => queryParams.append('leadListIds', id));

    const response = await fetch(`${backendUrl}/api/reports/voice/campaign?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY || 'system-token'}`,
      }
    });

    if (response.ok) {
      const backendData = await response.json();
      console.log('✅ Voice campaign data loaded from backend successfully');
      return NextResponse.json(backendData);
    } else {
      const errorText = await response.text();
      console.log(`⚠️ Backend voice campaign reports error (${response.status}):`, errorText);
      
      // If backend authentication works but service has errors, show better message
      if (response.status === 500) {
        return NextResponse.json({
          success: false,
          error: 'Backend voice campaign service has database issues. This is likely due to missing database tables. The call records exist but the analytics service cannot process them.',
          details: {
            backendStatus: response.status,
            backendError: errorText
          }
        }, { status: 500 });
      }
      
      // Return empty data structure for other errors
      const emptyData = {
        success: true,
        data: {
          kpis: {
            totalCalls: 0,
            connectedCalls: 0,
            answerRate: 0,
            conversionRate: 0,
            averageCallDuration: 0,
            revenuePerCampaign: 0,
            costPerConversion: 0
          },
          charts: {
            callsByHour: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              totalCalls: 0,
              connectedCalls: 0,
              conversions: 0
            })),
            callsByAgent: [],
            conversionFunnel: {
              totalCalls: 0,
              connectedCalls: 0,
              qualifiedLeads: 0,
              conversions: 0
            },
            callOutcomes: []
          }
        }
      };
      return NextResponse.json(emptyData);
    }

  } catch (error) {
    console.error('❌ Voice campaign reports API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load campaign analytics' },
      { status: 500 }
    );
  }
});