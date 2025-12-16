'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon,
  UserGroupIcon,
  ClockIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

interface AnalyticsData {
  summary: {
    totalCalls: number;
    answeredCalls: number;
    answerRate: number;
    callsByOutcome: Array<{ outcome: string; count: number }>;
  };
  dispositionStats: Array<{
    dispositionName: string;
    count: number;
    totalDuration: number;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    totalCalls: number;
    answeredCalls: number;
    totalTalkTime: number;
    averageCallDuration: number;
    answerRate: number;
  }>;
  campaignPerformance: Array<{
    campaignId: string;
    campaignName: string;
    totalCalls: number;
    answeredCalls: number;
    totalDuration: number;
    answerRate: number;
  }>;
  agentStatusCounts: Array<{ status: string; count: number }>;
  queueStats: Array<{ status: string; count: number }>;
}

const AnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0], // Today
    endDate: new Date().toISOString().split('T')[0]
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      const response = await fetch(`/api/analytics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color = 'bg-white' }: any) => (
    <div className={`${color} rounded-lg p-6 shadow-sm border border-gray-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-sm text-gray-500 mt-1">{trend}</p>
          )}
        </div>
        <div className="p-3 bg-kennex-100 rounded-lg">
          <Icon className="h-6 w-6 text-kennex-600" />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Call Center Analytics</h2>
          <p className="text-sm text-gray-500">Real-time performance metrics and insights</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Calls"
          value={analytics.summary.totalCalls.toLocaleString()}
          icon={PhoneIcon}
          trend={`${analytics.summary.callsByOutcome.length} outcomes`}
        />
        <StatCard
          title="Answered Calls"
          value={analytics.summary.answeredCalls.toLocaleString()}
          icon={CheckCircleIcon}
          trend={`${analytics.summary.answerRate.toFixed(1)}% answer rate`}
          color="bg-green-50"
        />
        <StatCard
          title="Active Agents"
          value={analytics.agentStatusCounts.find(s => s.status === 'Available')?.count || 0}
          icon={UserGroupIcon}
          trend={`${analytics.agentStatusCounts.reduce((sum, s) => sum + s.count, 0)} total agents`}
        />
        <StatCard
          title="Queue Length"
          value={analytics.queueStats.find(s => s.status === 'queued')?.count || 0}
          icon={ClockIcon}
          trend="contacts waiting"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Outcomes */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Call Outcomes</h3>
          <div className="space-y-3">
            {analytics.summary.callsByOutcome.map((outcome, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{outcome.outcome}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-kennex-600 h-2 rounded-full"
                      style={{
                        width: `${(outcome.count / analytics.summary.totalCalls) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {outcome.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Status */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h3>
          <div className="space-y-3">
            {analytics.agentStatusCounts.map((status, index) => {
              const statusColors: any = {
                'Available': 'bg-green-500',
                'OnCall': 'bg-blue-500',
                'AfterCall': 'bg-yellow-500',
                'Break': 'bg-orange-500',
                'Offline': 'bg-gray-500'
              };
              
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status.status] || 'bg-gray-400'}`}></div>
                    <span className="text-sm text-gray-600">{status.status}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{status.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Agent Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Answer %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Talk Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.agentPerformance.slice(0, 5).map((agent, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.agentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agent.totalCalls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {agent.answerRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(agent.totalTalkTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Campaign Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Answer %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.campaignPerformance.map((campaign, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {campaign.campaignName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.totalCalls}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {campaign.answerRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(campaign.totalDuration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;