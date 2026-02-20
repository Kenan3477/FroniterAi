import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token (same as profile route)
function getAuthToken(request: NextRequest): string | null {
  // Check for auth cookie first (most reliable)
  const authToken = request.cookies.get('auth-token')?.value;
  
  if (authToken) {
    console.log('✅ Using cookie token for authentication');
    return authToken;
  }
  
  // Try authorization header as fallback
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('✅ Using header token for authentication');
    return authHeader.substring(7);
  }
  
  console.log('❌ No authentication token found');
  return null;
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
    const userId = searchParams.get('userId'); // Add user filter support

    console.log('📊 Generating report:', { reportType, startDate, endDate, campaignId, agentId, userId });
    
    // Get authentication token (same pattern as profile route)
    const authToken = getAuthToken(request);
    if (!authToken) {
      console.log('❌ No auth token found for reports request');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔑 Auth token found for reports, length:', authToken.length);

    // Handle login/logout reports differently
    if (reportType === 'login_logout') {
      // Fetch audit logs for login/logout events (more reliable than user-sessions)
      const auditParams = new URLSearchParams();
      if (startDate) auditParams.append('startDate', startDate);
      if (endDate) auditParams.append('endDate', endDate);
      if (userId) auditParams.append('performedBy', userId); // Add performedBy parameter for audit logs
      auditParams.append('action', 'login,logout'); // Only get login/logout actions
      auditParams.append('limit', '1000'); // Increase limit for more comprehensive data

      console.log('🔍 Fetching audit logs with params:', auditParams.toString());

      // Use frontend proxy route instead of direct Railway backend call
      const frontendUrl = request.url.split('/api/')[0]; // Get base URL
      const auditResponse = await fetch(
        `${frontendUrl}/api/admin/audit-logs?${auditParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📋 Audit logs response status:', auditResponse.status);

      if (!auditResponse.ok) {
        const errorText = await auditResponse.text();
        console.log('❌ Failed to fetch audit logs:', auditResponse.status, errorText);
        throw new Error(`Failed to fetch audit logs: ${auditResponse.status} - ${errorText}`);
      }

      const auditData = await auditResponse.json();
      console.log('✅ Fetched audit logs:', auditData.data?.length || 0, 'logs');

      // Process audit logs into login/logout entries
      const auditLogs = auditData.data || [];

      // Create login/logout entries from audit logs only (more reliable)
      const loginLogoutData = auditLogs.map((log: any) => ({
        id: `audit-${log.id}`,
        userId: log.performedBy,
        userName: log.performedByUser?.name || log.performedByUser?.email || log.performedBy || 'Unknown',
        userEmail: log.performedByUser?.email || '',
        action: log.action,
        timestamp: log.createdAt,
        ipAddress: log.ipAddress || 'Unknown',
        userAgent: log.userAgent || 'Unknown',
        details: log.details || {},
        sessionId: log.details?.sessionId || null,
        source: 'audit_log'
      })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const reportData = {
        type: 'login_logout',
        title: 'User Login/Logout Report',
        generated_at: new Date().toISOString(),
        date_range: {
          start: startDate,
          end: endDate
        },
        filters: {
          userId: userId || 'all',
          userName: loginLogoutData.length > 0 ? loginLogoutData[0].userName : 'All Users'
        },
        summary: {
          total_entries: loginLogoutData.length,
          unique_users: [...new Set(loginLogoutData.map(entry => entry.userId))].length,
          login_count: loginLogoutData.filter(entry => entry.action === 'login').length,
          logout_count: loginLogoutData.filter(entry => entry.action === 'logout').length,
          data_source: 'audit_logs_only'
        },
        data: loginLogoutData
      };

      return NextResponse.json({
        success: true,
        report: reportData
      });
    }

    // Handle other report types (calls, campaigns, etc.)
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (campaignId) params.append('campaignId', campaignId);
    if (agentId) params.append('agentId', agentId);
    
    let endpoint = '';
    switch (reportType) {
      case 'calls':
        endpoint = '/api/admin/calls';
        break;
      case 'campaigns':
        endpoint = '/api/admin/campaigns';
        break;
      case 'agents':
        endpoint = '/api/admin/users';
        params.append('role', 'agent');
        break;
      default:
        endpoint = '/api/dashboard/stats'; // Use frontend dashboard route
        break;
    }

    // Use frontend proxy route instead of direct Railway backend call
    const frontendUrl = request.url.split('/api/')[0]; // Get base URL
    const response = await fetch(
      `${frontendUrl}${endpoint}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log('❌ Backend request failed:', response.status);
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Report data fetched successfully');

    // Format the response based on report type
    let reportData;
    switch (reportType) {
      case 'calls':
        reportData = {
          type: 'calls',
          title: 'Call History Report',
          generated_at: new Date().toISOString(),
          date_range: { start: startDate, end: endDate },
          summary: {
            total_calls: data.data?.length || 0,
            successful_calls: data.data?.filter((call: any) => call.status === 'completed')?.length || 0,
            failed_calls: data.data?.filter((call: any) => call.status === 'failed')?.length || 0,
            average_duration: data.data?.length > 0 
              ? Math.round(data.data.reduce((acc: number, call: any) => acc + (call.duration || 0), 0) / data.data.length)
              : 0
          },
          data: data.data || []
        };
        break;

      case 'campaigns':
        reportData = {
          type: 'campaigns',
          title: 'Campaign Performance Report',
          generated_at: new Date().toISOString(),
          date_range: { start: startDate, end: endDate },
          summary: {
            total_campaigns: data.data?.length || 0,
            active_campaigns: data.data?.filter((campaign: any) => campaign.status === 'active')?.length || 0,
            paused_campaigns: data.data?.filter((campaign: any) => campaign.status === 'paused')?.length || 0,
            total_calls: data.data?.reduce((acc: number, campaign: any) => acc + (campaign.calls?.length || 0), 0) || 0
          },
          data: data.data || []
        };
        break;

      case 'agents':
        reportData = {
          type: 'agents',
          title: 'Agent Performance Report',
          generated_at: new Date().toISOString(),
          date_range: { start: startDate, end: endDate },
          summary: {
            total_agents: data.data?.length || 0,
            active_agents: data.data?.filter((agent: any) => agent.status === 'active')?.length || 0,
            online_agents: data.data?.filter((agent: any) => agent.presence === 'available')?.length || 0,
            total_calls: data.data?.reduce((acc: number, agent: any) => acc + (agent.calls?.length || 0), 0) || 0
          },
          data: data.data || []
        };
        break;

      default:
        reportData = {
          type: 'summary',
          title: 'Dashboard Summary Report',
          generated_at: new Date().toISOString(),
          date_range: { start: startDate, end: endDate },
          summary: data,
          data: []
        };
        break;
    }

    return NextResponse.json({
      success: true,
      report: reportData
    });

  } catch (error) {
    console.error('❌ Report generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate report' 
      },
      { status: 500 }
    );
  }
}

// POST - Generate custom reports with filters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reportType,
      dateRange,
      filters = {},
      includeCharts = false,
      exportFormat = 'json'
    } = body;

    console.log('📊 Custom report request:', { reportType, dateRange, filters, includeCharts, exportFormat });
    
    const authToken = getAuthToken(request);
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query parameters
    const params = new URLSearchParams();
    if (dateRange?.start) params.append('startDate', dateRange.start);
    if (dateRange?.end) params.append('endDate', dateRange.end);
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.userId) params.append('userId', filters.userId);

    let endpoint = '';
    switch (reportType) {
      case 'detailed_calls':
        endpoint = '/api/admin/calls/detailed';
        break;
      case 'campaign_analytics':
        endpoint = '/api/admin/campaigns/analytics';
        break;
      case 'agent_performance':
        endpoint = '/api/admin/users/performance';
        break;
      case 'system_usage':
        endpoint = '/api/admin/system/usage';
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }

    // Use frontend proxy route instead of direct Railway backend call
    const frontendUrl = request.url.split('/api/')[0]; // Get base URL
    const response = await fetch(
      `${frontendUrl}${endpoint}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();

    const reportData = {
      id: `report_${Date.now()}`,
      type: reportType,
      title: `Custom ${reportType.replace(/_/g, ' ')} Report`,
      generated_at: new Date().toISOString(),
      generated_by: 'System', // Could be enhanced with user info
      date_range: dateRange,
      filters,
      export_format: exportFormat,
      include_charts: includeCharts,
      data: data.data || data,
      metadata: {
        total_records: Array.isArray(data.data) ? data.data.length : 0,
        query_time_ms: Date.now() - parseInt(params.get('_start_time') || '0'),
        backend_version: data.version || '1.0.0'
      }
    };

    return NextResponse.json({
      success: true,
      report: reportData
    });

  } catch (error) {
    console.error('❌ Custom report generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate custom report' 
      },
      { status: 500 }
    );
  }
}