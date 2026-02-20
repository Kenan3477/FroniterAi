'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { CallRecordsView } from '@/components/reports/CallRecordsView';
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
  const [reportData, setReportData] = useState<any>(null);
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string, email: string}[]>([]);
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
      if (filters?.dateRange?.from) params.append('startDate', filters.dateRange.from);
      if (filters?.dateRange?.to) params.append('endDate', filters.dateRange.to);
      if (filters?.campaign) params.append('campaignId', filters.campaign);
      if (filters?.agent) params.append('agentId', filters.agent);
      
      console.log('� Date Range Debug:');
      console.log('  - filters.dateRange.from:', filters.dateRange.from);
      console.log('  - filters.dateRange.to:', filters.dateRange.to);
      console.log('  - startDate param:', params.get('startDate'));
      console.log('  - endDate param:', params.get('endDate'));
      
      console.log('�📋 Request URL:', `/api/admin/reports/generate?${params.toString()}`);
      console.log('📋 Request headers:', { 'Authorization': `Bearer ${token.substring(0, 20)}...` });
      
      const response = await fetch(`/api/admin/reports/generate?${params.toString()}`, {
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
        setReportData({
          metrics: result.data.metrics,
          chartData: result.data.chartData,
          tableData: result.data.tableData
        });
        
        // Handle different report types with different summary structures
        if (reportType === 'login_logout') {
          const summary = result.data.summary || result.summary;
          const sessionCount = summary?.totalSessions || summary?.totalAuditEvents || 0;
          console.log(`📊 Login/logout report generated with ${sessionCount} sessions/events`);
        } else {
          const summary = result.data.summary || result.summary;
          const callCount = summary?.totalCalls || 0;
          console.log(`📊 Report generated with ${callCount} real call records`);
        }
      } else {
        throw new Error(result.error || 'Failed to generate report');
      }
      
    } catch (error) {
      console.error('❌ Error loading report data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Full error details:', errorMessage);
      
      // Set error state to show user-friendly message
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
        ) : loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            <p className="mt-2 text-gray-600">Loading report data...</p>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportData.metrics.map((metric: KPIMetric, index: number) => (
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
                {reportData.tableData.length > 0 ? (
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
        ) : reportData?.error ? (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Report</h3>
              <p className="text-red-600 mb-4">{reportData.error}</p>
              <button
                onClick={loadReportData}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No data available</p>
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