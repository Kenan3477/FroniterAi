'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
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
}

interface KPIMetric {
  label: string;
  value: string | number;
  change?: number;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
}

export default function ReportViewPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
      to: new Date().toISOString().split('T')[0] // today
    }
  });

  const reportType = searchParams?.get('type') || '';
  const category = searchParams?.get('category') || '';
  const subcategory = searchParams?.get('subcategory') || '';

  const reportTitles: { [key: string]: string } = {
    'combined_outcome_horizontal': 'Combined Outcome Report (Horizontal)',
    'hour_breakdown': 'Hour Breakdown Report',
    'penetration': 'Penetration Analysis',
    'summary_combined': 'Summary Combined Report',
    'activity_breakdown': 'Agent Activity Breakdown',
    'login_logout': 'Login/Logout Report',
    'pause_reasons': 'Pause Reasons Analysis'
  };

  const generateMockKPIs = (): KPIMetric[] => {
    if (reportType?.includes('outcome') || reportType === 'summary_combined') {
      return [
        { label: 'Total Calls', value: 1247, change: 12, format: 'number' },
        { label: 'Positive Outcomes', value: 187, change: 8, format: 'number' },
        { label: 'Conversion Rate', value: 15.0, change: -2.1, format: 'percentage' },
        { label: 'Average Call Duration', value: '3:42', change: 5.2, format: 'duration' },
        { label: 'Contact Rate', value: 68.5, change: 3.2, format: 'percentage' },
        { label: 'Revenue Generated', value: 24750, change: 18.7, format: 'currency' }
      ];
    } else if (reportType?.includes('activity') || reportType?.includes('login')) {
      return [
        { label: 'Active Agents', value: 12, change: 2, format: 'number' },
        { label: 'Total Login Time', value: '48:32:15', format: 'duration' },
        { label: 'Average Session', value: '4:02:41', change: -8.3, format: 'duration' },
        { label: 'Productive Time %', value: 87.2, change: 4.1, format: 'percentage' },
        { label: 'Break Time %', value: 12.8, change: -4.1, format: 'percentage' }
      ];
    } else {
      return [
        { label: 'Data Points', value: 2847, format: 'number' },
        { label: 'Coverage', value: 94.2, format: 'percentage' },
        { label: 'Accuracy', value: 98.7, format: 'percentage' },
        { label: 'Processing Time', value: '0:12', format: 'duration' }
      ];
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock data based on report type
      const mockData = {
        metrics: generateMockKPIs(),
        chartData: generateMockChartData(),
        tableData: generateMockTableData()
      };
      
      setReportData(mockData);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockChartData = () => {
    if (reportType === 'hour_breakdown') {
      return Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        calls: Math.floor(Math.random() * 100) + 20,
        conversions: Math.floor(Math.random() * 20) + 2
      }));
    }
    return [];
  };

  const generateMockTableData = () => {
    if (reportType?.includes('outcome')) {
      return [
        { disposition: 'Sale', count: 45, percentage: 15.2 },
        { disposition: 'Interested', count: 78, percentage: 26.4 },
        { disposition: 'Callback Scheduled', count: 64, percentage: 21.6 },
        { disposition: 'Not Interested', count: 89, percentage: 30.1 },
        { disposition: 'Wrong Number', count: 20, percentage: 6.7 }
      ];
    } else if (reportType?.includes('activity')) {
      return [
        { agent: 'John Smith', loginTime: '08:30', logoutTime: '17:15', totalTime: '8:45', calls: 47 },
        { agent: 'Sarah Wilson', loginTime: '09:00', logoutTime: '17:30', totalTime: '8:30', calls: 52 },
        { agent: 'Mike Johnson', loginTime: '08:45', logoutTime: '17:00', totalTime: '8:15', calls: 38 }
      ];
    }
    return [];
  };

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

  const exportReport = () => {
    // Mock export functionality
    console.log('Exporting report...');
  };

  useEffect(() => {
    if (reportType) {
      loadReportData();
    }
  }, [reportType, filters]);

  if (!reportType) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">No report specified</h3>
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

        {/* Filters */}
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
            <button className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">
              <FunnelIcon className="h-4 w-4 mr-1" />
              More Filters
            </button>
          </div>
        </div>

        {loading ? (
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
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No detailed data available for this report type.</p>
                  </div>
                )}
              </div>
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