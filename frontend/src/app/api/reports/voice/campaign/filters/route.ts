/**
 * Voice Campaign Filters API
 * Returns available filter options for campaign reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Voice campaign filters API called');
    
    // Get the auth token
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      console.log('❌ No token provided for voice campaign filters');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('📊 Loading voice campaign filter options');

    // For now, return mock filter data
    // TODO: Implement actual backend call when backend endpoint is ready
    const mockFilterData = {
      success: true,
      data: {
        campaigns: [
          {
            id: 'dac-campaign-production',
            name: 'DAC',
            status: 'Active'
          }
        ],
        agents: [
          {
            id: '509',
            name: 'Ken Admin',
            status: 'Active'
          },
          {
            id: '510',
            name: 'Agent Demo', 
            status: 'Active'
          }
        ],
        leadLists: [
          {
            id: 'list-1',
            name: 'Primary Lead List',
            recordCount: 2500
          },
          {
            id: 'list-2',
            name: 'Follow-up List',
            recordCount: 850
          }
        ],
        dateRangePresets: [
          { id: 'today', name: 'Today', value: 'today' },
          { id: 'yesterday', name: 'Yesterday', value: 'yesterday' },
          { id: 'last7days', name: 'Last 7 Days', value: 'last7days' },
          { id: 'last30days', name: 'Last 30 Days', value: 'last30days' },
          { id: 'thismonth', name: 'This Month', value: 'thismonth' },
          { id: 'lastmonth', name: 'Last Month', value: 'lastmonth' }
        ]
      }
    };

    console.log('✅ Voice campaign filter data loaded successfully');
    return NextResponse.json(mockFilterData);

  } catch (error) {
    console.error('❌ Voice campaign filters API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load filter options' },
      { status: 500 }
    );
  }
}