import { NextRequest, NextResponse } from 'next/server';
import { kpiApi } from '@/services/kpiApi';

/**
 * POST /api/reports/voice/data
 * Get voice/call data reports with various breakdowns using real database-driven KPI service
 */
export async function POST(request: NextRequest) {
  try {
    const { reportType, filters } = await request.json();

    console.log(`📊 Generating ${reportType} report with filters:`, filters);

    // Parse date filters with defaults
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    let reportData;

    switch (reportType) {
      case 'combined_outcome_horizontal':
      case 'outcome_combined_vertical':
      case 'penetration':
        // Get outcome distribution data
        reportData = await kpiApi.getOutcomeDistribution(
          startDate,
          endDate,
          filters.campaignId,
          filters.agentId
        );
        break;
        
      case 'hour_breakdown':
        // Get hourly performance data
        reportData = await kpiApi.getHourlyPerformance(
          startDate,
          endDate,
          filters.campaignId,
          filters.agentId
        );
        break;
        
      case 'source_summary':
      case 'summary_combined':
        // Get KPI summary data
        reportData = await kpiApi.getKPISummary(
          startDate,
          endDate,
          filters.campaignId,
          filters.agentId
        );
        break;

      case 'agent_performance':
        // Get agent performance rankings
        reportData = await kpiApi.getAgentPerformance(
          startDate,
          endDate,
          filters.campaignId
        );
        break;

      case 'campaign_metrics':
        // Get campaign-specific metrics
        if (!filters.campaignId) {
          return NextResponse.json(
            { error: 'Campaign ID is required for campaign metrics report' },
            { status: 400 }
          );
        }
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) || 7;
        reportData = await kpiApi.getCampaignMetrics(filters.campaignId, days);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown report type: ${reportType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      reportType,
      data: reportData,
      filters: {
        startDate,
        endDate,
        campaignId: filters.campaignId,
        agentId: filters.agentId,
        listId: filters.listId
      }
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        reportType: request.body ? 'unknown' : 'invalid_request'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports/voice/data
 * Get available report types and metadata
 */
export async function GET() {
  const reportTypes = [
    {
      id: 'combined_outcome_horizontal',
      name: 'Combined Outcome Horizontal',
      description: 'Disposition outcomes across campaigns and agents',
      category: 'data'
    },
    {
      id: 'content', 
      name: 'Content',
      description: 'Call content and script analysis',
      category: 'data'
    },
    {
      id: 'hour_breakdown',
      name: 'Hour Breakdown', 
      description: 'Performance by hour of day',
      category: 'data'
    },
    {
      id: 'inbound_outcome_horizontal',
      name: 'Inbound Outcome Horizontal',
      description: 'Inbound call outcomes breakdown', 
      category: 'data'
    },
    {
      id: 'outbound_outcome_horizontal', 
      name: 'Outbound Outcome Horizontal',
      description: 'Outbound call outcomes breakdown',
      category: 'data'
    },
    {
      id: 'outcome_combined_vertical',
      name: 'Outcome Combined Vertical',
      description: 'All outcomes in vertical format',
      category: 'data'
    },
    {
      id: 'penetration',
      name: 'Penetration', 
      description: 'Market penetration analysis',
      category: 'data'
    },
    {
      id: 'source_summary',
      name: 'Source Summary',
      description: 'Performance by data source/list',
      category: 'data'
    },
    {
      id: 'summary_combined',
      name: 'Summary Combined',
      description: 'Overall KPI summary',
      category: 'data'
    },
    {
      id: 'agent_performance',
      name: 'Agent Performance',
      description: 'Agent performance rankings and metrics',
      category: 'data'
    },
    {
      id: 'campaign_metrics',
      name: 'Campaign Metrics',
      description: 'Campaign-specific performance metrics',
      category: 'data'
    },
    {
      id: 'tariffs',
      name: 'Tariffs',
      description: 'Call cost and tariff analysis', 
      category: 'data'
    }
  ];

  return NextResponse.json({
    success: true,
    reportTypes,
    categories: {
      data: 'Data Reports',
      voice: 'Voice Reports', 
      users: 'User Reports'
    }
  });
}