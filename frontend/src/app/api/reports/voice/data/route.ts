import { NextRequest, NextResponse } from 'next/server';
import { 
  getKPISummary, 
  getHourlyBreakdown, 
  getOutcomeDistribution, 
  getAgentPerformance 
} from '@/services/simpleKpiService';

/**
 * POST /api/reports/voice/data
 * Get voice/call data reports with various breakdowns
 */
export async function POST(request: NextRequest) {
  try {
    const { reportType, filters } = await request.json();

    console.log(`📊 Generating ${reportType} report with filters:`, filters);

    // Parse date filters
    const startDate = filters.startDate ? new Date(filters.startDate) : undefined;
    const endDate = filters.endDate ? new Date(filters.endDate) : undefined;

    const filterParams = {
      startDate,
      endDate,
      campaignId: filters.campaignId,
      agentId: filters.agentId,
      listId: filters.listId
    };

    let reportData;

    switch (reportType) {
      case 'combined_outcome_horizontal':
        reportData = await getOutcomeDistribution(
          filters.campaignId, 
          filters.agentId, 
          startDate, 
          endDate
        );
        break;
        
      case 'hour_breakdown':
        reportData = await getHourlyBreakdown(
          filters.campaignId, 
          filters.agentId, 
          startDate
        );
        break;
        
      case 'outcome_combined_vertical':
        reportData = await getOutcomeDistribution(
          filters.campaignId, 
          filters.agentId, 
          startDate, 
          endDate
        );
        break;
        
      case 'penetration':
        reportData = await getOutcomeDistribution(
          filters.campaignId, 
          filters.agentId, 
          startDate, 
          endDate
        );
        break;
        
      case 'source_summary':
        reportData = await getKPISummary(
          filters.campaignId, 
          filters.agentId, 
          startDate, 
          endDate
        );
        break;
        
      case 'summary_combined':
        reportData = await getKPISummary(
          filters.campaignId, 
          filters.agentId, 
          startDate, 
          endDate
        );
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
      filters: filterParams
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Combined Outcome Horizontal Report
 * Shows disposition outcomes across campaigns/agents horizontally
 */
async function getCombinedOutcomeHorizontal(filters: any) {
  const kpiSummary = await getKPISummary(filters);
  
  return {
    title: 'Combined Outcome Horizontal',
    summary: {
      totalCalls: kpiSummary.totalCalls,
      successRate: kpiSummary.conversionRate,
      contactRate: kpiSummary.contactRate,
      averageDuration: kpiSummary.averageCallDuration
    },
    dispositions: Object.entries(kpiSummary.dispositionBreakdown).map(([disposition, count]) => ({
      disposition,
      count: count as number,
      percentage: kpiSummary.totalCalls > 0 ? Math.round(((count as number) / kpiSummary.totalCalls) * 100) : 0
    })).sort((a, b) => b.count - a.count),
    campaigns: Object.entries(kpiSummary.campaignBreakdown).map(([campaign, data]) => ({
      campaign,
      count: data.calls,
      percentage: kpiSummary.totalCalls > 0 ? Math.round((data.calls / kpiSummary.totalCalls) * 100) : 0
    })),
    agents: Object.entries(kpiSummary.agentBreakdown).map(([agent, data]) => ({
      agent,
      count: data.calls,
      percentage: kpiSummary.totalCalls > 0 ? Math.round((data.calls / kpiSummary.totalCalls) * 100) : 0
    }))
  };
}

/**
 * Source Summary Report
 * Shows performance by data list/source
 */
async function getSourceSummary(filters: any) {
  const kpiSummary = await getKPISummary(filters);
  
  return {
    title: 'Source Summary',
    summary: {
      totalCalls: kpiSummary.totalCalls,
      totalDuration: kpiSummary.totalCalls * kpiSummary.averageCallDuration,
      averageDuration: kpiSummary.averageCallDuration
    },
    categories: {
      positive: kpiSummary.categoryBreakdown.positive || 0,
      neutral: kpiSummary.categoryBreakdown.neutral || 0,
      negative: kpiSummary.categoryBreakdown.negative || 0
    },
    topDispositions: Object.entries(kpiSummary.dispositionBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([disposition, count]) => ({
        disposition,
        count,
        percentage: kpiSummary.totalCalls > 0 ? Math.round((count / kpiSummary.totalCalls) * 100) : 0
      }))
  };
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