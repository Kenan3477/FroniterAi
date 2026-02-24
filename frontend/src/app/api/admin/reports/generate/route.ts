import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';

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

    console.log('🔑 Auth token found for reports, validating...');
    
    // Check if it's our temporary local token
    if (authToken.startsWith('temp_local_token_')) {
      console.log('✅ Using local bypass for reports authentication');
      
      // Create mock user for local testing
      const user = {
        id: 1,
        email: 'admin@omnivox.ai',
        role: 'ADMIN',
        name: 'Local Admin'
      };

      // For pause_reasons report, return mock data
      if (reportType === 'pause_reasons') {
        return NextResponse.json({
          success: true,
          data: {
            reportType: 'pause_reasons',
            generatedAt: new Date().toISOString(),
            dateRange: { startDate, endDate },
            summary: {
              totalPauseEvents: 5,
              totalPauseDuration: 1500, // 25 minutes in seconds
              avgPauseDuration: 300, // 5 minutes
              mostCommonReason: 'Break'
            },
            events: [
              {
                id: 1,
                agentId: 1,
                agentName: 'Test Agent',
                reason: 'Break',
                startTime: '2026-02-24T10:00:00Z',
                endTime: '2026-02-24T10:15:00Z',
                duration: 900
              },
              {
                id: 2,
                agentId: 1,
                agentName: 'Test Agent',
                reason: 'Lunch',
                startTime: '2026-02-24T12:00:00Z',
                endTime: '2026-02-24T12:30:00Z',
                duration: 1800
              }
            ],
            stats: {
              byReason: {
                'Break': { count: 2, totalDuration: 1200 },
                'Lunch': { count: 1, totalDuration: 1800 },
                'Meeting': { count: 2, totalDuration: 600 }
              },
              byAgent: {
                'Test Agent': { count: 5, totalDuration: 3600 }
              }
            }
          }
        });
      }

      // For other reports, return basic mock data
      return NextResponse.json({
        success: true,
        data: {
          reportType,
          message: 'Report generated successfully (local bypass)',
          generatedAt: new Date().toISOString(),
          data: []
        }
      });
    }
    
    // Validate authentication with backend (like profile route)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    
    let user; // Declare user variable outside try block
    try {
      const profileResponse = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!profileResponse.ok) {
        console.log('❌ Railway backend rejected authentication for reports');
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        );
      }

      const profileData = await profileResponse.json();
      user = profileData.data.user; // Assign to the outer scope variable
      console.log('✅ Railway backend authentication successful for reports, user:', user.email);
      
      // Check user role
      if (user.role !== 'ADMIN') {
        console.log('❌ Insufficient permissions for reports');
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

    } catch (authError) {
      console.log('❌ Authentication error:', authError);
      return NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    // Handle login/logout reports differently
    if (reportType === 'login_logout') {
      // Fetch audit logs for login/logout events (more reliable than user-sessions)
      const auditParams = new URLSearchParams();
      if (startDate) auditParams.append('startDate', startDate);
      if (endDate) auditParams.append('endDate', endDate);
      if (userId) auditParams.append('performedBy', userId); // Add performedBy parameter for audit logs
      
      // Try broader action search first, then filter
      auditParams.append('action', 'login,logout,user_login,user_logout,session_start,session_end'); 
      auditParams.append('limit', '1000'); // Increase limit for more comprehensive data

      console.log('🔍 Fetching audit logs with params:', auditParams.toString());
      console.log('🔍 Date range:', startDate, 'to', endDate);
      console.log('🔍 User filter:', userId || 'all users');

      // Use the actual validated JWT token directly (not demo-token)
      const auditResponse = await fetch(
        `${backendUrl}/api/admin/audit-logs?${auditParams.toString()}`,
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
      console.log('✅ Audit response structure:', JSON.stringify(auditData, null, 2));

      // Process audit logs into login/logout entries - handle different response structures
      let auditLogs = [];
      
      if (auditData && typeof auditData === 'object') {
        if (Array.isArray(auditData.data)) {
          auditLogs = auditData.data;
        } else if (Array.isArray(auditData)) {
          auditLogs = auditData;
        } else if (auditData.success && Array.isArray(auditData.data)) {
          auditLogs = auditData.data;
        } else {
          console.log('⚠️ Unexpected audit data structure:', auditData);
          auditLogs = [];
        }
      }
      
      console.log('📊 Processing', auditLogs.length, 'audit logs');
      
      // If no logs found with specific filters, try without date/action filters
      if (auditLogs.length === 0) {
        console.log('🔍 No filtered logs found, trying broader search...');
        const broadParams = new URLSearchParams();
        broadParams.append('limit', '100'); 
        
        const broadResponse = await fetch(
          `${backendUrl}/api/admin/audit-logs?${broadParams.toString()}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (broadResponse.ok) {
          const broadData = await broadResponse.json();
          console.log('📋 Total audit logs found:', broadData.data?.length || 0);
          
          // Use the broader data and filter for login/logout manually
          if (broadData.data && Array.isArray(broadData.data)) {
            auditLogs = broadData.data.filter((log: any) => {
              const action = log.action?.toLowerCase() || '';
              return action.includes('login') || action.includes('logout') || 
                     action.includes('session') || action.includes('auth');
            });
            console.log('📋 Found', auditLogs.length, 'login/logout related logs after filtering');
          }
        }
      }

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
        data: reportData
      });
    }

    // Handle other report types (calls, campaigns, etc.)
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (campaignId) params.append('campaignId', campaignId);
    if (agentId) params.append('agentId', agentId);
    
    // ✅ SPECIAL CASE: Handle pause_reasons report differently since it's frontend-only
    if (reportType === 'pause_reasons') {
      console.log('📊 Handling pause_reasons report with frontend endpoints');
      
      try {
        // Call our own frontend API endpoints directly
        const pauseParams = new URLSearchParams();
        if (startDate) pauseParams.append('startDate', new Date(startDate).toISOString());
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          pauseParams.append('endDate', endDateTime.toISOString());
        }
        
        // Get pause events data from our frontend endpoints
        const pauseResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/pause-events?${pauseParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!pauseResponse.ok) {
          throw new Error(`Failed to fetch pause events: ${pauseResponse.status}`);
        }
        
        const pauseData = await pauseResponse.json();
        const pauseEvents = pauseData.data || pauseData || [];
        const totalDuration = pauseEvents.reduce((acc: number, event: any) => acc + (event.duration || 0), 0);
        const avgDuration = pauseEvents.length > 0 ? Math.round(totalDuration / pauseEvents.length) : 0;
        const uniqueAgentIds = new Set(pauseEvents.map((event: any) => event.agentId || event.agentName));
        
        const reportData = {
          type: 'pause_reasons',
          title: 'Pause Reasons Analysis',
          generated_at: new Date().toISOString(),
          date_range: { start: startDate, end: endDate },
          summary: {
            total_pause_events: pauseEvents.length,
            total_pause_duration: totalDuration,
            avg_pause_duration: avgDuration,
            unique_agents: uniqueAgentIds.size
          },
          data: pauseEvents
        };
        
        return NextResponse.json({
          success: true,
          data: reportData
        });
        
      } catch (pauseError) {
        console.error('❌ Pause reasons report error:', pauseError);
        throw new Error(`Failed to generate pause reasons report: ${pauseError instanceof Error ? pauseError.message : 'Unknown error'}`);
      }
    }
    
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

    // Use Railway backend directly with demo-token (we've validated auth)  
    const response = await fetch(
      `${backendUrl}${endpoint}?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer demo-token`,
          'Content-Type': 'application/json',
          'User-ID': user.id.toString(),
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
      data: reportData
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

    // Check if it's our temporary local token
    if (authToken.startsWith('temp_local_token_')) {
      console.log('✅ Using local bypass for reports POST authentication');
      
      // For pause_reasons report, return mock data
      if (reportType === 'pause_reasons') {
        return NextResponse.json({
          success: true,
          data: {
            reportType: 'pause_reasons',
            generatedAt: new Date().toISOString(),
            dateRange: dateRange || { start: '2026-02-24', end: '2026-02-24' },
            summary: {
              totalPauseEvents: 5,
              totalPauseDuration: 3600, // 60 minutes in seconds
              avgPauseDuration: 720, // 12 minutes
              mostCommonReason: 'Break'
            },
            events: [
              {
                id: 1,
                agentId: 1,
                agentName: 'Test Agent',
                reason: 'Break',
                startTime: '2026-02-24T10:00:00Z',
                endTime: '2026-02-24T10:15:00Z',
                duration: 900
              },
              {
                id: 2,
                agentId: 1,
                agentName: 'Test Agent',
                reason: 'Lunch',
                startTime: '2026-02-24T12:00:00Z',
                endTime: '2026-02-24T12:30:00Z',
                duration: 1800
              },
              {
                id: 3,
                agentId: 1,
                agentName: 'Test Agent',
                reason: 'Meeting',
                startTime: '2026-02-24T14:00:00Z',
                endTime: '2026-02-24T14:15:00Z',
                duration: 900
              }
            ],
            stats: {
              byReason: {
                'Break': { count: 2, totalDuration: 1200 },
                'Lunch': { count: 1, totalDuration: 1800 },
                'Meeting': { count: 2, totalDuration: 600 }
              },
              byAgent: {
                'Test Agent': { count: 5, totalDuration: 3600 }
              }
            }
          }
        });
      }

      // For other reports, return basic mock data
      return NextResponse.json({
        success: true,
        data: {
          reportType,
          message: 'Report generated successfully (local bypass)',
          generatedAt: new Date().toISOString(),
          dateRange,
          filters,
          data: []
        }
      });
    }

    // Validate authentication with backend (like profile route)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
    
    let user; // Declare user variable outside try block
    try {
      const profileResponse = await fetch(`${backendUrl}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!profileResponse.ok) {
        return NextResponse.json(
          { success: false, error: 'Authentication failed' },
          { status: 401 }
        );
      }

      const profileData = await profileResponse.json();
      user = profileData.data.user; // Assign to the outer scope variable
      
      // Check user role
      if (user.role !== 'ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

    } catch (authError) {
      return NextResponse.json(
        { success: false, error: 'Authentication service unavailable' },
        { status: 503 }
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

    // Use the actual validated JWT token directly
    const response = await fetch(
      `${backendUrl}${endpoint}?${params.toString()}`,
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
      data: reportData
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