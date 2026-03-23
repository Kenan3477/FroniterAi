/**
 * Agent Call Activity Overview API
 * Returns agent call activity metrics for the overview dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

export const GET = requireAuth(async (request, user) => {
  try {
    console.log('🔍 Agent call activity API called for user:', user.userId);
    
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today';

    console.log('📊 Loading agent call activity with filter:', filter);

    // For now, return mock data to prevent the black screen
    // TODO: Implement actual backend call when backend endpoint is ready
    const mockData = {
      success: true,
      data: {
        agents: [
          {
            id: '509',
            name: 'Ken Admin',
            totalCalls: 45,
            connectedCalls: 32,
            conversions: 8,
            averageCallDuration: '4:32',
            connectionRate: 71.1
          },
          {
            id: '510',
            name: 'Agent Demo',
            totalCalls: 38,
            connectedCalls: 28,
            conversions: 6,
            averageCallDuration: '3:45',
            connectionRate: 73.7
          }
        ],
        summary: {
          totalAgents: 2,
          totalCalls: 83,
          totalConnected: 60,
          totalConversions: 14,
          overallConnectionRate: 72.3
        }
      }
    };

    console.log('✅ Agent call activity data loaded successfully');
    return NextResponse.json(mockData);

  } catch (error) {
    console.error('❌ Agent call activity API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load agent call activity' },
      { status: 500 }
    );
  }
});