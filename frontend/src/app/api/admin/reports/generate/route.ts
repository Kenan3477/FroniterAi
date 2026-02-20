import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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
    const userId = searchParams.get('userId'); // Add user filter support

    console.log('📊 Generating report:', { reportType, startDate, endDate, campaignId, agentId, userId });
    
    const authToken = getAuthToken(request);
    if (!authToken) {
      console.log('❌ No auth token found for reports request');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle login/logout reports differently
    if (reportType === 'login_logout') {
      // Fetch user session data for login/logout reports
      const sessionParams = new URLSearchParams();
      if (startDate) sessionParams.append('dateFrom', startDate);
      if (endDate) sessionParams.append('dateTo', endDate);
      if (userId) sessionParams.append('userId', userId); // Add userId parameter
      sessionParams.append('limit', '500'); // Get more session data

      const sessionsResponse = await fetch(
        `${BACKEND_URL}/api/admin/user-sessions?${sessionParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!sessionsResponse.ok) {
        console.log('❌ Failed to fetch user sessions:', sessionsResponse.status);
        throw new Error(`Failed to fetch user sessions: ${sessionsResponse.status}`);
      }

      const sessionsData = await sessionsResponse.json();
      console.log('✅ Fetched user sessions:', sessionsData.data?.length || 0, 'sessions');

      // Also fetch user audit logs for additional context
      const auditParams = new URLSearchParams();
      if (startDate) auditParams.append('startDate', startDate);
      if (endDate) auditParams.append('endDate', endDate);
      if (userId) auditParams.append('performedBy', userId); // Add performedBy parameter for audit logs
      auditParams.append('action', 'login,logout'); // Only get login/logout actions
      auditParams.append('limit', '500');

      const auditResponse = await fetch(
        `${BACKEND_URL}/api/admin/audit-logs?${auditParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let auditData = { data: [] };
      if (auditResponse.ok) {
        auditData = await auditResponse.json();
        console.log('✅ Fetched audit logs:', auditData.data?.length || 0, 'logs');
      } else {
        console.log('⚠️ Failed to fetch audit logs:', auditResponse.status);
      }

      // Process and combine the data
      const sessions = sessionsData.data || [];
      const auditLogs = auditData.data || [];

      // Create login/logout entries from sessions
      const loginLogoutData = sessions.map((session: any) => ({
        id: `session-${session.id}`,
        userId: session.userId,
        userName: session.user?.name || session.user?.email || 'Unknown',
        userEmail: session.user?.email || '',
        action: 'login',
        timestamp: session.createdAt,
        ipAddress: session.ipAddress || 'Unknown',
        userAgent: session.userAgent || 'Unknown',
        duration: session.expiresAt ? 
          Math.round((new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime()) / (1000 * 60)) + ' minutes' : 
          'Active',
        source: 'session'
      }));

      // Add audit log entries
      const auditEntries = auditLogs.map((log: any) => ({
        id: `audit-${log.id}`,
        userId: log.performedBy,
        userName: log.performedByUser?.name || log.performedByUser?.email || 'Unknown',
        userEmail: log.performedByUser?.email || '',
        action: log.action,
        timestamp: log.createdAt,
        ipAddress: log.ipAddress || 'Unknown',
        userAgent: log.userAgent || 'Unknown',
        duration: '-',
        source: 'audit'
      }));

      // Combine and sort by timestamp
      const combinedData = [...loginLogoutData, ...auditEntries]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
          userName: combinedData.length > 0 ? combinedData[0].userName : 'All Users'
        },
        summary: {
          total_entries: combinedData.length,
          unique_users: [...new Set(combinedData.map(entry => entry.userId))].length,
          login_count: combinedData.filter(entry => entry.action === 'login').length,
          logout_count: combinedData.filter(entry => entry.action === 'logout').length
        },
        data: combinedData
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
        endpoint = '/api/admin/dashboard/stats';
        break;
    }

    const response = await fetch(
      `${BACKEND_URL}${endpoint}?${params.toString()}`,
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

    const response = await fetch(
      `${BACKEND_URL}${endpoint}?${params.toString()}`,
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