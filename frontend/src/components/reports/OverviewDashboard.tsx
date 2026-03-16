/**
 * Overview Dashboard Component - Executive KPI Dashboard
 * Provides real-time overview of call center performance
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { io, Socket } from 'socket.io-client';
import {
  ChartBarIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  SignalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface OverviewKPIs {
  totalCalls: number;
  connectionRate: number;
  averageCallDuration: number;
  callsPerAgent: number;
  dropRate: number;
  revenueConversions: number;
  averageWaitTime: number;
  activeAgents: number;
}

interface CallVolumeData {
  timestamp: string;
  totalCalls: number;
  connectedCalls: number;
  period: 'hourly' | 'daily';
}

interface ConnectionRateData {
  timestamp: string;
  connectionRate: number;
  period: 'hourly' | 'daily';
}

interface AgentLeaderboard {
  agentId: string;
  agentName: string;
  callsHandled: number;
  connectionRate: number;
  conversions: number;
  averageCallDuration: number;
  rank: number;
}

interface RecentCallOutcome {
  timestamp: string;
  agentName: string;
  callDuration: number;
  outcome: 'Connected' | 'Dropped' | 'No Answer' | 'Converted';
  revenue?: number;
  callId: string;
}

type TimeframeFilter = 'today' | 'last_24h' | 'last_7d' | 'last_30d' | 'custom';

interface OverviewDashboardProps {
  refreshInterval?: number;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  refreshInterval = 30000 // 30 seconds default
}) => {
  // State management
  const [kpis, setKpis] = useState<OverviewKPIs | null>(null);
  const [callVolumeData, setCallVolumeData] = useState<CallVolumeData[]>([]);
  const [connectionRateData, setConnectionRateData] = useState<ConnectionRateData[]>([]);
  const [agentLeaderboard, setAgentLeaderboard] = useState<AgentLeaderboard[]>([]);
  const [recentOutcomes, setRecentOutcomes] = useState<RecentCallOutcome[]>([]);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('last_7d');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  
  // WebSocket ref
  const socketRef = useRef<Socket | null>(null);

  // WebSocket connection setup
  useEffect(() => {
    // Set up WebSocket connection for real-time updates
    const setupWebSocket = async () => {
      try {
        const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
        const backendUrl = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';
        
        socketRef.current = io(backendUrl, {
          transports: ['websocket'],
          auth: {
            token: token
          }
        });

        socketRef.current.on('connect', () => {
          console.log('📡 Connected to real-time dashboard updates');
          setIsRealTimeConnected(true);
          
          // Subscribe to admin room for dashboard updates
          socketRef.current?.emit('join-room', 'admin');
        });

        socketRef.current.on('disconnect', () => {
          console.log('📡 Disconnected from real-time updates');
          setIsRealTimeConnected(false);
        });

        socketRef.current.on('dashboard.metrics.updated', (data: any) => {
          console.log('📊 Real-time dashboard update received:', data);
          if (data.data && data.data.kpis) {
            setKpis(data.data.kpis);
            setLastUpdate(new Date());
          }
        });

        socketRef.current.on('call.ended', () => {
          // Refresh recent outcomes when calls end
          fetchRecentOutcomes();
        });

      } catch (error) {
        console.error('Failed to setup WebSocket:', error);
      }
    };

    setupWebSocket();

    // Cleanup WebSocket on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        setIsRealTimeConnected(false);
      }
    };
  }, []);

  // Separate function for fetching recent outcomes
  const fetchRecentOutcomes = async () => {
    try {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';
      const response = await fetch(`${backendUrl}/api/reports/overview/recent-outcomes?limit=20`, { headers });
      if (response.ok) {
        const data = await response.json();
        setRecentOutcomes(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch recent outcomes:', error);
    }
  };
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        filter: timeframe,
        ...(timeframe === 'custom' && customDateRange.start && customDateRange.end && {
          start: customDateRange.start,
          end: customDateRange.end
        })
      });

      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';

      // Fetch all data in parallel
      const [kpisRes, volumeRes, rateRes, leaderboardRes, outcomesRes] = await Promise.all([
        fetch(`${backendUrl}/api/reports/overview/kpis?${params}`, { headers }),
        fetch(`${backendUrl}/api/reports/overview/call-volume?${params}`, { headers }),
        fetch(`${backendUrl}/api/reports/overview/connection-rate?${params}`, { headers }),
        fetch(`${backendUrl}/api/reports/overview/agent-leaderboard?${params}`, { headers }),
        fetch(`${backendUrl}/api/reports/overview/recent-outcomes?limit=20`, { headers })
      ]);

      if (!kpisRes.ok) throw new Error('Failed to fetch KPIs');
      if (!volumeRes.ok) throw new Error('Failed to fetch call volume data');
      if (!rateRes.ok) throw new Error('Failed to fetch connection rate data');
      if (!leaderboardRes.ok) throw new Error('Failed to fetch agent leaderboard');
      if (!outcomesRes.ok) throw new Error('Failed to fetch recent outcomes');

      const [kpisData, volumeData, rateData, leaderboardData, outcomesData] = await Promise.all([
        kpisRes.json(),
        volumeRes.json(),
        rateRes.json(),
        leaderboardRes.json(),
        outcomesRes.json()
      ]);

      setKpis(kpisData.data);
      setCallVolumeData(volumeData.data);
      setConnectionRateData(rateData.data);
      setAgentLeaderboard(leaderboardData.data);
      setRecentOutcomes(outcomesData.data);
      setLastUpdate(new Date());

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe, customDateRange]);

  // Initial load and refresh interval
  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(fetchDashboardData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchDashboardData, refreshInterval]);

  // Chart configurations
  const callVolumeChartData = {
    labels: callVolumeData.map(d => d.timestamp),
    datasets: [
      {
        label: 'Total Calls',
        data: callVolumeData.map(d => d.totalCalls),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Connected Calls',
        data: callVolumeData.map(d => d.connectedCalls),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }
    ]
  };

  const connectionRateChartData = {
    labels: connectionRateData.map(d => d.timestamp),
    datasets: [
      {
        label: 'Connection Rate (%)',
        data: connectionRateData.map(d => d.connectionRate),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // KPI Card Component
  const KPICard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ComponentType<any>;
    change?: number;
    prefix?: string;
    suffix?: string;
    format?: 'number' | 'percentage' | 'currency' | 'time';
  }> = ({ title, value, icon: Icon, change, prefix = '', suffix = '', format = 'number' }) => {
    const formatValue = (val: string | number) => {
      const numVal = typeof val === 'string' ? parseFloat(val) : val;
      
      switch (format) {
        case 'percentage':
          return `${numVal.toFixed(1)}%`;
        case 'currency':
          return `$${numVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        case 'time':
          return `${Math.floor(numVal / 60)}m ${Math.floor(numVal % 60)}s`;
        default:
          return numVal.toLocaleString('en-US');
      }
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-lg font-medium text-gray-900">
                {prefix}{formatValue(value)}{suffix}
              </dd>
            </dl>
          </div>
          {change !== undefined && (
            <div className={`flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium ml-1">
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <button
              onClick={fetchDashboardData}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview Dashboard</h2>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            {lastUpdate && (
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            )}
            <div className={`flex items-center space-x-1 ${isRealTimeConnected ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isRealTimeConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <span>{isRealTimeConnected ? 'Live' : 'Disconnected'}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeframeFilter)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="last_24h">Last 24 Hours</option>
            <option value="last_7d">Last 7 Days</option>
            <option value="last_30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>

          {timeframe === 'custom' && (
            <>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </>
          )}

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm flex items-center"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Total Calls"
            value={kpis.totalCalls}
            icon={PhoneIcon}
            format="number"
          />
          <KPICard
            title="Connection Rate"
            value={kpis.connectionRate}
            icon={SignalIcon}
            format="percentage"
          />
          <KPICard
            title="Average Call Duration"
            value={kpis.averageCallDuration}
            icon={ClockIcon}
            format="time"
          />
          <KPICard
            title="Calls Per Agent"
            value={kpis.callsPerAgent}
            icon={UserGroupIcon}
            format="number"
          />
          <KPICard
            title="Drop Rate"
            value={kpis.dropRate}
            icon={ArrowTrendingDownIcon}
            format="percentage"
          />
          <KPICard
            title="Revenue / Conversions"
            value={kpis.revenueConversions}
            icon={CurrencyDollarIcon}
            format="currency"
          />
          <KPICard
            title="Average Wait Time"
            value={kpis.averageWaitTime}
            icon={ClockIcon}
            format="time"
          />
          <KPICard
            title="Active Agents"
            value={kpis.activeAgents}
            icon={UserGroupIcon}
            format="number"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Over Time */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Call Volume Over Time</h3>
          <div style={{ height: '300px' }}>
            <Line data={callVolumeChartData} options={chartOptions} />
          </div>
        </div>

        {/* Connection Rate Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Connection Rate Trend</h3>
          <div style={{ height: '300px' }}>
            <Line data={connectionRateChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Agent Performance Leaderboard */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agent Performance Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calls Handled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connection Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Call Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentLeaderboard.slice(0, 10).map((agent) => (
                <tr key={agent.agentId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{agent.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.callsHandled}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.connectionRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {agent.conversions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(agent.averageCallDuration / 60)}m {Math.floor(agent.averageCallDuration % 60)}s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Call Outcomes (Live Feed) */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Call Outcomes</h3>
          <p className="text-sm text-gray-500">Live feed of recent call activity</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOutcomes.map((outcome, index) => (
                <tr key={`${outcome.callId}-${index}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(outcome.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {outcome.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {Math.floor(outcome.callDuration / 60)}m {Math.floor(outcome.callDuration % 60)}s
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      outcome.outcome === 'Converted' ? 'bg-green-100 text-green-800' :
                      outcome.outcome === 'Connected' ? 'bg-blue-100 text-blue-800' :
                      outcome.outcome === 'Dropped' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {outcome.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {outcome.revenue ? `$${outcome.revenue.toFixed(2)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};