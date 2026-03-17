/**
 * System Overview Component
 * Real-time system statistics for admin dashboard
 */

import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  ServerIcon, 
  MegaphoneIcon, 
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import AgentQueueDashboard from './AgentQueueDashboard';

interface SystemOverviewData {
  users: {
    total: number;
    active: number;
    loginRate: string;
  };
  campaigns: {
    total: number;
    active: number;
    activeRate: string;
  };
  agents: {
    total: number;
    available: number;
    availabilityRate: string;
  };
  system: {
    uptime: {
      percentage: string;
      days: number;
      status: string;
    };
  };
  activity: {
    totalCalls: number;
    callsToday: number;
    recentLogins: number;
    recentCampaigns: number;
    recentAgents: number;
  };
  timestamp: string;
}

interface SystemOverviewProps {
  refreshInterval?: number;
}

export default function SystemOverview({ refreshInterval = 30000 }: SystemOverviewProps) {
  const [data, setData] = useState<SystemOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSystemOverview = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/system/overview');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || 'Failed to fetch system overview');
      }
    } catch (err) {
      console.error('Error fetching system overview:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemOverview();
    
    // Set up refresh interval
    const interval = setInterval(fetchSystemOverview, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getUptimeColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-slate-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getUptimeIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircleIcon className="h-6 w-6 text-slate-600" />;
      case 'warning':
      case 'error':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />;
      default:
        return <ServerIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
          <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
          <button 
            onClick={fetchSystemOverview}
            className="text-blue-600 hover:text-blue-800"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="text-center py-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-gray-600 mb-2">Failed to load system data</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Updated: {lastUpdated?.toLocaleTimeString()}</span>
            <button 
              onClick={fetchSystemOverview}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Total Users */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <UsersIcon className="h-6 w-6 text-blue-600 mr-2" />
              <div className="text-3xl font-bold text-blue-600">
                {data?.users?.total?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="text-sm text-gray-600">Total Users</div>
            <div className="text-xs text-gray-500 mt-1">
              {data?.users?.active || 0} active ({data?.users?.loginRate || 0}% rate)
            </div>
          </div>

          {/* System Uptime */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {data && getUptimeIcon(data?.system?.uptime?.status)}
              <div className={`text-3xl font-bold ml-2 ${data ? getUptimeColor(data?.system?.uptime?.status) : 'text-gray-600'}`}>
                {data?.system?.uptime?.percentage || '0'}%
              </div>
            </div>
            <div className="text-sm text-gray-600">System Uptime</div>
            <div className="text-xs text-gray-500 mt-1">
              {data?.system?.uptime?.days || 0} days running
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <MegaphoneIcon className="h-6 w-6 text-purple-600 mr-2" />
              <div className="text-3xl font-bold text-purple-600">
                {data?.campaigns?.active?.toLocaleString() || '0'}
              </div>
            </div>
            <div className="text-sm text-gray-600">Active Campaigns</div>
            <div className="text-xs text-gray-500 mt-1">
              {data?.campaigns?.total || 0} total ({data?.campaigns?.activeRate || 0}% active)
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        {data && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Agents Available:</span>
                <span className="ml-1 font-medium">{data?.agents?.available || 0}/{data?.agents?.total || 0}</span>
              </div>
              <div>
                <span className="text-gray-500">Calls Today:</span>
                <span className="ml-1 font-medium">{data?.activity?.callsToday?.toLocaleString() || '0'}</span>
              </div>
              <div>
                <span className="text-gray-500">Total Calls:</span>
                <span className="ml-1 font-medium">{data?.activity?.totalCalls?.toLocaleString() || '0'}</span>
              </div>
              <div>
                <span className="text-gray-500">Recent Activity:</span>
                <span className="ml-1 font-medium">{data?.activity?.recentLogins || 0} logins</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Queue Dashboard */}
      <AgentQueueDashboard />
    </div>
  );
}