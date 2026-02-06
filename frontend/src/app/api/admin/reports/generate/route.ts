import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
import { cookies } from 'next/headers';


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Try authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies as fallback
  const cookieStore = cookies();
  const tokenFromCookie = cookieStore.get('auth-token')?.value;
  return tokenFromCookie || null;
}

// GET - Generate reports with real data from backend
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const campaignId = searchParams.get('campaignId');
    const agentId = searchParams.get('agentId');

    console.log('📊 Generating report:', { reportType, startDate, endDate, campaignId, agentId });
    
    const authToken = getAuthToken(request);
    if (!authToken) {
      console.log('❌ No auth token found for reports request');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query parameters for backend
    const queryParams = new URLSearchParams();
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (campaignId) queryParams.append('campaignId', campaignId);
    if (agentId) queryParams.append('agentId', agentId);

    // Fetch call records for the report period
    const callRecordsResponse = await fetch(
      `${BACKEND_URL}/api/call-records?${queryParams.toString()}&limit=1000`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    let callRecords = [];
    if (callRecordsResponse.ok) {
      const callData = await callRecordsResponse.json();
      callRecords = callData.data?.callRecords || [];
    }

    // Fetch agent data
    const agentsResponse = await fetch(`${BACKEND_URL}/api/admin/agents`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    let agents = [];
    if (agentsResponse.ok) {
      const agentData = await agentsResponse.json();
      agents = agentData.data?.agents || [];
    }

    // Fetch campaigns
    const campaignsResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    let campaigns = [];
    if (campaignsResponse.ok) {
      const campaignData = await campaignsResponse.json();
      campaigns = campaignData.data?.campaigns || [];
    }

    // Calculate real metrics based on report type
    const reportData = generateReportData(reportType, callRecords, agents, campaigns);

    console.log('✅ Report generated successfully with real data');

    return NextResponse.json({
      success: true,
      data: {
        reportType,
        generatedAt: new Date().toISOString(),
        parameters: { startDate, endDate, campaignId, agentId },
        metrics: reportData.metrics,
        chartData: reportData.chartData,
        tableData: reportData.tableData,
        summary: {
          totalCalls: callRecords.length,
          totalAgents: agents.length,
          totalCampaigns: campaigns.length,
          dataQuality: 'LIVE_DATA'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating report:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate report', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Generate real report data based on actual call records
function generateReportData(reportType: string, callRecords: any[], agents: any[], campaigns: any[]) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayCalls = callRecords.filter(call => new Date(call.createdAt) >= startOfDay);

  // Calculate real metrics based on actual data
  const totalCalls = callRecords.length;
  const completedCalls = callRecords.filter(call => call.status === 'completed').length;
  const totalDuration = callRecords.reduce((sum, call) => sum + (call.duration || 0), 0);
  const avgCallDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  // Calculate success rate from dispositions
  const successfulCalls = callRecords.filter(call => 
    call.disposition && ['sale', 'appointment', 'interested', 'callback'].includes(call.disposition.toLowerCase())
  ).length;
  const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100) : 0;

  // Base metrics applicable to all report types
  const baseMetrics = [
    { label: 'Total Calls', value: totalCalls, format: 'number' },
    { label: 'Completed Calls', value: completedCalls, format: 'number' },
    { label: 'Success Rate', value: successRate, format: 'percentage' },
    { label: 'Avg Call Duration', value: formatDuration(avgCallDuration), format: 'duration' }
  ];

  // Generate specific metrics based on report type
  let metrics = baseMetrics;
  
  if (reportType === 'outcome' || reportType === 'summary_combined') {
    metrics = [
      ...baseMetrics,
      { label: 'Contact Rate', value: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0, format: 'percentage' },
      { label: 'Today\'s Calls', value: todayCalls.length, format: 'number' }
    ];
  } else if (reportType === 'activity' || reportType === 'login_logout') {
    const onlineAgents = agents.filter(agent => agent.status === 'Online').length;
    metrics = [
      { label: 'Active Agents', value: onlineAgents, format: 'number' },
      { label: 'Total Agents', value: agents.length, format: 'number' },
      { label: 'Utilization Rate', value: agents.length > 0 ? (onlineAgents / agents.length) * 100 : 0, format: 'percentage' },
      { label: 'Total Talk Time', value: formatDuration(totalDuration), format: 'duration' }
    ];
  }

  // Generate chart data (hourly call distribution)
  const chartData = generateHourlyCallData(callRecords);

  // Generate table data based on report type
  const tableData = generateTableData(reportType, callRecords, agents, campaigns);

  return { metrics, chartData, tableData };
}

// Generate hourly call distribution for charts
function generateHourlyCallData(callRecords: any[]) {
  const hourlyData = new Array(24).fill(0);
  
  callRecords.forEach(call => {
    const hour = new Date(call.createdAt).getHours();
    hourlyData[hour]++;
  });

  return hourlyData.map((count, hour) => ({
    time: `${hour.toString().padStart(2, '0')}:00`,
    calls: count
  }));
}

// Generate table data based on report type
function generateTableData(reportType: string, callRecords: any[], agents: any[], campaigns: any[]) {
  if (reportType === 'agent_performance' || reportType === 'activity_breakdown') {
    // Agent performance table
    return agents.map(agent => {
      const agentCalls = callRecords.filter(call => call.agentId === agent.id);
      const totalDuration = agentCalls.reduce((sum, call) => sum + (call.duration || 0), 0);
      
      return {
        agent: `${agent.firstName} ${agent.lastName}`.trim() || agent.username,
        calls: agentCalls.length,
        duration: formatDuration(totalDuration),
        avgDuration: agentCalls.length > 0 ? formatDuration(Math.round(totalDuration / agentCalls.length)) : '0:00',
        status: agent.status || 'Offline'
      };
    });
  } else if (reportType === 'outcome') {
    // Disposition breakdown table
    const dispositionCounts: { [key: string]: number } = {};
    callRecords.forEach(call => {
      const disposition = call.disposition || 'No Disposition';
      dispositionCounts[disposition] = (dispositionCounts[disposition] || 0) + 1;
    });

    return Object.entries(dispositionCounts).map(([disposition, count]) => ({
      disposition,
      count,
      percentage: callRecords.length > 0 ? ((count / callRecords.length) * 100).toFixed(1) : '0.0'
    }));
  } else {
    // Recent calls table
    return callRecords.slice(0, 50).map(call => ({
      id: call.id,
      phone: call.phoneNumber || 'Unknown',
      agent: call.agentName || 'System',
      duration: formatDuration(call.duration || 0),
      disposition: call.disposition || 'No Disposition',
      createdAt: new Date(call.createdAt).toLocaleString()
    }));
  }
}

// Helper function to format duration in seconds to MM:SS
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}