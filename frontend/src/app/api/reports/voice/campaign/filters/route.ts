/**
 * Voice Campaign Filters API
 * Returns available filter options for campaign reports
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

export const GET = requireAuth(async (request, user) => {
  try {
    console.log('🔍 Voice campaign filters API called for user:', user.userId);
    console.log('📊 Loading voice campaign filter options');

    // Enhanced filter data with multiple campaigns
    const filterData = {
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
            name: 'Cold Leads',
            recordCount: 3400
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

    console.log(`✅ Returning ${filterData.data.campaigns.length} campaigns for filter dropdown`);
    return NextResponse.json(filterData);

  } catch (error) {
    console.error('❌ Voice campaign filters API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load filter options' },
      { status: 500 }
    );
  }
});