import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    const { searchParams } = new URL(request.url);
    
    console.log('📊 Fetching dashboard stats from backend...');
    
    // Forward query parameters to backend
    const agentId = searchParams.get('agentId');
    const queryString = agentId ? `?agentId=${agentId}` : '';
    
    // Connect to backend KPI dashboard endpoint instead of direct DB access
    const backendResponse = await fetch(`${backendUrl}/api/kpi/dashboard${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend dashboard stats failed:', backendResponse.status);
      // Fallback structure for frontend compatibility
      return NextResponse.json({
        success: true,
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
          source: 'fallback'
        }
      });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ Dashboard stats fetched from backend successfully');
    
    // Transform backend KPI data to match frontend expectations
    return NextResponse.json({
      success: true,
      data: {
        // Map backend KPI structure to frontend dashboard structure
        totalCalls: backendData.kpis?.totalCalls || 0,
        callsToday: backendData.kpis?.callsToday || 0,
        totalContacts: backendData.kpis?.totalContacts || 0,
        activeCampaigns: backendData.kpis?.activeCampaigns || 0,
        totalAgents: backendData.kpis?.totalAgents || 0,
        answeredCallsToday: backendData.kpis?.answeredCalls || 0,
        answerRate: backendData.kpis?.answerRate || 0,
        avgCallDuration: backendData.kpis?.avgDuration || 0,
        trends: {
          calls: backendData.trends?.calls || 0,
          answered: backendData.trends?.answered || 0,
          duration: backendData.trends?.duration || 0
        },
        source: 'backend'
      }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
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
  }
}