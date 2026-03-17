/**
 * Real Reports Components - Dashboard Analytics Component
 * Replaces "NOT IMPLEMENTED" dashboard functionality
 */

import React, { useState, useEffect } from 'react';
import { Line, Bar, Pie } from 'react-chartjs-2';
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PhoneIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { realReportsApi, DashboardWidget } from '../../services/realReportsApi';

interface DashboardAnalyticsProps {
  className?: string;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({ className = '' }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await realReportsApi.getDashboardAnalytics();
      setWidgets(data);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const renderKPIWidget = (widget: DashboardWidget) => {
    const { data } = widget;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
            <p className="text-sm text-gray-500">Key Performance Indicators</p>
          </div>
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
        </div>
        
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-2xl font-bold text-gray-900">{data.totalCalls}</span>
            </div>
            <p className="text-sm text-gray-500">Total Calls</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
              <span className="text-2xl font-bold text-green-600">{data.conversions}</span>
            </div>
            <p className="text-sm text-gray-500">Conversions</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center">
              <span className="text-xl font-semibold text-blue-600">
                {data.conversionRate ? `${(data.conversionRate * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <p className="text-sm text-gray-500">Conversion Rate</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center">
              <span className="text-xl font-semibold text-purple-600">
                {data.contactRate ? `${(data.contactRate * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <p className="text-sm text-gray-500">Contact Rate</p>
          </div>
        </div>
      </div>
    );
  };

  const renderChartWidget = (widget: DashboardWidget) => {
    const { data } = widget;
    
    const chartConfig = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: false,
        },
      },
      scales: data.chartType === 'pie' ? {} : {
        y: {
          beginAtZero: true,
        },
      },
    };

    const chartData = {
      labels: data.series ? data.series[0]?.data.map((d: any) => d.x) : data.series?.map((s: any) => s.name) || [],
      datasets: data.chartType === 'pie' 
        ? [{
            data: data.series?.map((s: any) => s.value) || [],
            backgroundColor: [
              '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
              '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
            ],
          }]
        : data.series?.map((series: any, index: number) => ({
            label: series.name,
            data: series.data.map((d: any) => d.y),
            borderColor: index === 0 ? '#3B82F6' : '#10B981',
            backgroundColor: index === 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            tension: 0.1
          })) || []
    };

    const ChartComponent = data.chartType === 'pie' ? Pie : data.chartType === 'bar' ? Bar : Line;

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
          <span className="text-sm text-gray-500">Auto-refresh: {widget.refreshRate}m</span>
        </div>
        
        <div className="h-64">
          <ChartComponent data={chartData} options={chartConfig} />
        </div>
      </div>
    );
  };

  const renderTableWidget = (widget: DashboardWidget) => {
    const { data } = widget;
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{widget.title}</h3>
          <UsersIcon className="h-6 w-6 text-blue-600" />
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {data.headers?.map((header: string) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.rows?.map((row: any[], index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWidget = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'kpi':
        return renderKPIWidget(widget);
      case 'chart':
        return renderChartWidget(widget);
      case 'table':
        return renderTableWidget(widget);
      default:
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-gray-500">Unknown widget type: {widget.type}</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Refresh Data
        </button>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {widgets.map(widget => (
          <div
            key={widget.id}
            className={`${widget.size === 'large' ? 'lg:col-span-2' : ''}`}
          >
            {renderWidget(widget)}
          </div>
        ))}
      </div>

      {widgets.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-500">
              Dashboard widgets will appear here when call data is available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};