'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { CallRecordsView } from '@/components/reports/CallRecordsView';
import { PauseReasonsReport } from '@/components/reports/PauseReasonsReport';
import { 
  ArrowLeftIcon,
  CalendarIcon,
  FunnelIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';

interface ReportFilter {
  dateRange: {
    from: string;
    to: string;
  };
  campaign?: string;
  agent?: string;
  outcome?: string;
  user?: string;
}

interface KPIMetric {
  label: string;
  value: string | number;
  change?: number;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
}

function ReportViewPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>({
    metrics: [],
    chartData: [],
    tableData: []
  });
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string, email: string}[]>([]);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
      to: new Date().toISOString().split('T')[0] // today
    }
  });

  const reportType = searchParams?.get('type') || '';
  const category = searchParams?.get('category') || '';
  const subcategory = searchParams?.get('subcategory') || '';

  // Debug URL parameters
  console.log('🔍 Report View Debug - URL Parameters:');
  console.log('  - reportType:', JSON.stringify(reportType));
  console.log('  - category:', JSON.stringify(category));
  console.log('  - subcategory:', JSON.stringify(subcategory));
  console.log('  - searchParams available:', !!searchParams);
  console.log('  - Current URL search:', typeof window !== 'undefined' ? window.location.search : 'server-side');

  const reportTitles: { [key: string]: string } = {
    'combined_outcome_horizontal': 'Combined Outcome Report (Horizontal)',
    'hour_breakdown': 'Hour Breakdown Report',
    'penetration': 'Penetration Analysis',
    'summary_combined': 'Summary Combined Report',
    'activity_breakdown': 'Agent Activity Breakdown',
    'login_logout': 'Login/Logout Report',
    'pause_reasons': 'Pause Reasons Analysis'
  };

  // ✅ REMOVED: Mock data generator replaced with real backend integration
  // All KPI data now comes from loadReportData() function which calls Railway backend

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken') || '';
      if (!token) return;
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.data?.users) {
          setAvailableUsers(userData.data.users.map((user: any) => ({
            id: user.id || user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email,
            email: user.email
          })));
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Session cleanup function for login/logout reports
  const cleanupSessions = async () => {
    setCleaningUp(true);
    try {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken') || '';
      if (!token) {
        alert('Please log in again to perform this action.');
        return;
      }

      console.log('🧹 Starting session cleanup...');
      
      const response = await fetch('/api/admin/cleanup-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Cleanup failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Session cleanup result:', result);

      if (result.success) {
        alert(`Session cleanup completed!\n\n${result.data.totalSessionsClosed} sessions closed for ${result.data.usersAffected} users.`);
        // Reload the report data to show updated session information
        loadReportData();
      } else {
        throw new Error(result.message || 'Cleanup failed');
      }

    } catch (error) {
      console.error('❌ Session cleanup error:', error);
      alert(`Session cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCleaningUp(false);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      // ✅ IMPLEMENTED: Real API call to Railway backend via proxy route
      console.log('📊 Loading real report data for type:', reportType);
      
      // Debug authentication token
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken') || '';
      console.log('🔑 Auth token available:', !!token);
      console.log('🔑 Token length:', token.length);
      if (!token) {
        console.error('❌ No authentication token found in localStorage');
        throw new Error('No authentication token available. Please log in again.');
      }
      
      // Build query parameters
      const params = new URLSearchParams();
      if (reportType) params.append('type', reportType);
      if (filters?.dateRange?.from) params.append('dateFrom', filters.dateRange.from);
      if (filters?.dateRange?.to) params.append('dateTo', filters.dateRange.to);
      if (filters?.campaign) params.append('campaignId', filters.campaign);
      if (filters?.agent) params.append('agentId', filters.agent);
      
      console.log('� Date Range Debug:');
      console.log('  - filters.dateRange.from:', filters.dateRange.from);
      console.log('  - filters.dateRange.to:', filters.dateRange.to);
      console.log('  - dateFrom param:', params.get('dateFrom'));
      console.log('  - dateTo param:', params.get('dateTo'));
      
      // Different endpoint for login/logout reports
      let apiUrl;
      
      console.log('🔍 URL Parameters Debug:');
      console.log('  - category:', category);
      console.log('  - subcategory:', subcategory);
      console.log('  - reportType:', reportType);
      
      if ((category === 'authentication' && subcategory === 'loginlogout') || 
          (category === 'users' && subcategory === 'login_logout') ||
          reportType === 'login_logout') {
        // Use user-sessions endpoint for login/logout reports
        apiUrl = `/api/admin/user-sessions?${params.toString()}`;
        console.log('🔐 ✅ ROUTING TO USER-SESSIONS ENDPOINT for login/logout reports');
        console.log('🔐 Matched condition: login/logout report detected');
      } else {
        // Use reports endpoint for other report types
        apiUrl = `/api/admin/reports/generate?${params.toString()}`;
        console.log('📊 Using reports endpoint for general reports');
      }
      
      console.log('📋 Request URL:', apiUrl);
      console.log('📋 Request headers:', { 'Authorization': `Bearer ${token.substring(0, 20)}...` });
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📋 Response status:', response.status);
      console.log('📋 Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`Failed to generate report: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Real report data loaded:', result);
      console.log('🔍 Response structure debug:');
      console.log('  - result.success:', result.success);
      console.log('  - result.data exists:', !!result.data);
      console.log('  - result.data keys:', result.data ? Object.keys(result.data) : 'none');
      console.log('  - result.summary exists:', !!result.summary);
      console.log('  - result.data.summary exists:', !!(result.data?.summary));
      if (result.data?.summary) {
        console.log('  - summary keys:', Object.keys(result.data.summary));
      } else if (result.summary) {
        console.log('  - summary keys:', Object.keys(result.summary));
      }
      
      if (result.success && result.data) {
        // Handle login/logout reports differently
        if (category === 'users' && subcategory === 'login_logout') {
          // Process user-sessions data
          const sessions = result.data.sessions || [];
          
          // Transform sessions into report format
          const transformedData = {
            metrics: [
              { label: 'Total Sessions', value: sessions.length, type: 'number' },
              { label: 'Active Sessions', value: sessions.filter((s: any) => s.status === 'active').length, type: 'number' },
              { label: 'Closed Sessions', value: sessions.filter((s: any) => s.status === 'closed').length, type: 'number' },
              { label: 'Latest Session', value: sessions[0]?.loginTime ? new Date(sessions[0].loginTime).toLocaleDateString() : 'None', type: 'text' }
            ],
            chartData: sessions.map((session: any, index: number) => ({
              name: `Session ${index + 1}`,
              value: session.status === 'active' ? 1 : 0,
              user: `${session.user?.firstName || ''} ${session.user?.lastName || ''}`.trim() || session.user?.username,
              loginTime: session.loginTime,
              logoutTime: session.logoutTime
            })),
            tableData: sessions.map((session: any) => ({
              user: `${session.user?.firstName || ''} ${session.user?.lastName || ''}`.trim() || session.user?.username || 'Unknown',
              email: session.user?.email || 'N/A',
              role: session.user?.role || 'N/A',
              loginTime: session.loginTime ? new Date(session.loginTime).toLocaleString() : 'N/A',
              logoutTime: session.logoutTime 
                ? new Date(session.logoutTime).toLocaleString() 
                : (session.lastActivity ? `Active (Last: ${new Date(session.lastActivity).toLocaleString()})` : 'Active'),
              status: session.status || 'Unknown',
              ipAddress: session.ipAddress || 'N/A'
            }))
          };
          
          setReportData(transformedData);
          console.log(`📊 Login/logout report generated with ${sessions.length} sessions`);
        } else {
          // Handle other report types
          setReportData({
            metrics: result.data.metrics || [],
            chartData: result.data.chartData || [],
            tableData: result.data.tableData || []
          });
          
          const summary = result.data.summary || result.summary;
          if (reportType === 'login_logout') {
            const sessionCount = summary?.totalSessions || summary?.totalAuditEvents || 0;
            console.log(`📊 Login/logout report generated with ${sessionCount} sessions/events`);
          } else {
            const callCount = summary?.totalCalls || 0;
            console.log(`📊 Report generated with ${callCount} real call records`);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
      
    } catch (error) {
      console.error('❌ Error loading report data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Full error details:', errorMessage);
      
      // Set error state to show user-friendly message with proper fallbacks
      setReportData({
        metrics: [],
        chartData: [],
        tableData: [],
        error: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ REMOVED: Mock chart data generator replaced with real backend integration
  // All chart data now comes from loadReportData() function which calls Railway backend

  // ✅ REMOVED: Mock table data generator replaced with real backend integration
  // All table data now comes from loadReportData() function which calls Railway backend

  const formatValue = (value: string | number, format?: string) => {
    switch (format) {
      case 'percentage':
        return `${value}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'duration':
        return value;
      case 'number':
      default:
        return typeof value === 'number' ? value.toLocaleString() : value;
    }
  };

  const exportReport = async () => {
    try {
      console.log('📄 Exporting report...', reportType);
      
      // Build export parameters
      const params = new URLSearchParams();
      if (reportType) params.append('type', reportType);
      if (filters?.dateRange?.from) params.append('startDate', filters.dateRange.from);
      if (filters?.dateRange?.to) params.append('endDate', filters.dateRange.to);
      if (filters?.campaign) params.append('campaignId', filters.campaign);
      if (filters?.agent) params.append('agentId', filters.agent);
      if (filters?.user) params.append('userId', filters.user);
      params.append('format', 'csv'); // Default to CSV export

      const response = await fetch(`/api/admin/reports/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('omnivox_token') || localStorage.getItem('authToken') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export report: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Report exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert(`Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    console.log('🔄 useEffect triggered - reportType:', JSON.stringify(reportType));
    console.log('🔄 useEffect - filters:', filters);
    
    if (reportType) {
      console.log('✅ Report type exists, calling loadReportData()');
      loadReportData();
      
      // Load users for login_logout reports
      if (reportType === 'login_logout') {
        loadAvailableUsers();
      }
    } else {
      console.log('❌ No report type found, skipping loadReportData()');
    }
  }, [reportType, filters]);

  if (!reportType) {
    console.log('🚫 No report specified - showing error message');
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No report specified</h3>
          <p className="text-gray-600 mt-2">URL Parameters Debug:</p>
          <p className="text-gray-500 text-sm">Type: {reportType || 'empty'}</p>
          <p className="text-gray-500 text-sm">Category: {category || 'empty'}</p>
          <p className="text-gray-500 text-sm">Subcategory: {subcategory || 'empty'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-slate-600 hover:text-slate-800"
          >
            ← Back to Reports
          </button>
        </div>
      </MainLayout>
    );
  }

  console.log('✅ Report page rendering with type:', reportType);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {reportTitles[reportType] || 'Report View'}
              </h1>
              <p className="text-gray-600">
                {category && subcategory ? `${category} > ${subcategory}` : 'Report Analysis'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {/* Session Cleanup Button - Only for login/logout reports */}
            {reportType === 'login_logout' && (
              <button
                onClick={cleanupSessions}
                disabled={cleaningUp}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cleaningUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cleaning...
                  </>
                ) : (
                  <>
                    🧹 Clean Sessions
                  </>
                )}
              </button>
            )}
            <button
              onClick={exportReport}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Filters - Only show for non-call-records views */}
        {!(category === 'voice' && subcategory === 'call') && (
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
                <input
                  type="date"
                  value={filters.dateRange.from}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, from: e.target.value }
                  }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={filters.dateRange.to}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, to: e.target.value }
                  }))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                />
              </div>
              
              {/* User Filter - Show for login_logout reports */}
              {reportType === 'login_logout' && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">User:</span>
                  <select
                    value={filters.user || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      user: e.target.value || undefined
                    }))}
                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white min-w-[200px]"
                  >
                    <option value="">All Users</option>
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.email}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <button className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
                <FunnelIcon className="h-4 w-4 mr-1" />
                More Filters
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {category === 'voice' && subcategory === 'call' ? (
          <CallRecordsView />
        ) : reportType === 'pause_reasons' ? (
          <PauseReasonsReport 
            startDate={filters.dateRange.from} 
            endDate={filters.dateRange.to}
          />
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            <p className="mt-2 text-gray-600">Loading report data...</p>
          </div>
        ) : reportData.error ? (
          <div className="text-center py-12">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.694-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Report</h3>
            <p className="text-gray-600">{reportData.error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.metrics && reportData.metrics.map((metric: KPIMetric, index: number) => (
                <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatValue(metric.value, metric.format)}
                      </p>
                    </div>
                    {metric.change && (
                      <div className={`text-sm font-medium ${
                        metric.change > 0 ? 'text-slate-600' : 'text-red-600'
                      }`}>
                        {metric.change > 0 ? '+' : ''}{metric.change}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chart/Table Data */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Data</h3>
                {reportData.tableData && reportData.tableData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(reportData.tableData[0]).map((key) => (
                            <th
                              key={key}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.tableData.map((row: any, index: number) => (
                          <tr key={index}>
                            {Object.values(row).map((value: any, cellIndex) => (
                              <td
                                key={cellIndex}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                              >
                                {value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : reportData.error ? (
                  <div className="text-center py-8">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                      <h4 className="text-lg font-medium text-red-800 mb-2">Error Loading Report</h4>
                      <p className="text-red-600">{reportData.error}</p>
                      <button
                        onClick={loadReportData}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No detailed data available for this report type.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function ReportViewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ReportViewPageContent />
    </Suspense>
  );
}