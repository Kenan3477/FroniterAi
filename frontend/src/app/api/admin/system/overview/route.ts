import { NextRequest, NextResponse } from 'next/server';

// Real system overview from backend - no more mock data!
export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
    
    console.log('📊 Fetching system overview from backend...');
    
    // Connect to real backend endpoint
    const backendResponse = await fetch(`${backendUrl}/api/admin/system/overview`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      console.error('❌ Backend system overview failed:', backendResponse.status);
      // Fallback to basic structure if backend is unavailable
      return NextResponse.json({
        success: true,
        data: {
          users: { total: 0, active: 0, loginRate: '0%' },
          campaigns: { total: 0, active: 0, activeRate: '0%' },
          agents: { total: 0, available: 0, availabilityRate: '0%' },
          system: { uptime: { percentage: '0%', days: 0, status: 'unavailable' } },
          activity: { totalCalls: 0, callsToday: 0, recentLogins: 0, recentCampaigns: 0, recentAgents: 0 },
          timestamp: new Date().toISOString(),
          source: 'fallback'
        }
      });
    }

    const backendData = await backendResponse.json();
    
    console.log('✅ System overview fetched from backend successfully');
    
    // Return real data from backend
    return NextResponse.json({
      success: true,
      data: {
        ...backendData.data,
        source: 'backend'
      }
    });
  } catch (error) {
    console.error('Error fetching system overview:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch system overview'
      },
      { status: 500 }
    );
  }
}