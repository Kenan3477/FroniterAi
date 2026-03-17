import React, { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { socket } from '../../lib/socket';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardMetrics {
  totalCallsToday: number;
  connectedCallsToday: number;
  totalRevenue: number;
  conversionRate: number;
  averageCallDuration: number;
  agentsOnline: number;
  callsInProgress: number;
  averageWaitTime: number;
  activeAgents: number;
}

interface CallVolumeData {
  timestamp: string;
  totalCalls: number;
  connectedCalls: number;
  period: 'hourly' | 'daily';
}

interface RevenueData {
  timestamp: string;
  revenue: number;
  period: 'hourly' | 'daily';
}

interface ConversionData {
  outcome: string;
  count: number;
  revenue?: number;
}

interface TopAgentData {
  agentId: string;
  agentName: string;
  callsHandled: number;
  conversionRate: number;
  revenue: number;
}

const KPICard: React.FC<{ title: string; value: string | number; change?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral' }> = ({ 
  title, 
  value, 
  change, 
  icon,
  trend = 'neutral'
}) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-6 group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{title}</p>
        <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">{value}</p>
        {change && (
          <div className="flex items-center gap-1">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend === 'up' 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : trend === 'down'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {change}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-500">vs yesterday</span>
          </div>
        )}
      </div>
      <div className="text-slate-400 dark:text-slate-500 text-xl group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
        {icon}
      </div>
    </div>
  </div>
);

const OverviewDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCallsToday: 0,
    connectedCallsToday: 0,
    totalRevenue: 0,
    conversionRate: 0,
    averageCallDuration: 0,
    agentsOnline: 0,
    callsInProgress: 0,
    averageWaitTime: 0,
    activeAgents: 0,
  });
  
  const [callVolumeData, setCallVolumeData] = useState<CallVolumeData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [topAgentsData, setTopAgentsData] = useState<TopAgentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign filtering state
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<Array<{id: string; name: string}>>([]);
  const [dateRange, setDateRange] = useState<string>('last_7d');

  // Fetch available campaigns for filtering
  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      const response = await fetch('/api/admin/campaign-management/campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const campaignsData = await response.json();
        const activeCampaigns = (campaignsData.data || campaignsData || [])
          .filter((campaign: any) => !campaign.isDeleted && campaign.status === 'Active')
          .map((campaign: any) => ({
            id: campaign.id || campaign.campaignId,
            name: campaign.name || campaign.campaignName || 'Unnamed Campaign'
          }));
        setCampaigns(activeCampaigns);
      }
    } catch (error) {
      console.warn('Failed to fetch campaigns:', error);
    }
  };

  const fetchDashboardData = async (campaignFilter = selectedCampaign, dateFilter = dateRange) => {
    try {
      setLoading(true);
      
      // Get authentication token
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      
      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      if (campaignFilter && campaignFilter !== 'all') {
        queryParams.append('campaignId', campaignFilter);
      }
      queryParams.append('filter', dateFilter);
      
      const queryString = queryParams.toString();
      
      // Fetch KPIs with filtering
      const metricsResponse = await fetch(`/api/reports/overview/kpis?${queryString}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!metricsResponse.ok) {
        throw new Error(`HTTP error! status: ${metricsResponse.status}`);
      }
      
      const metricsData = await metricsResponse.json();
      // Transform backend response to frontend format
      const transformedMetrics = {
        totalCallsToday: metricsData.data?.totalCalls || 0,
        connectedCallsToday: Math.round((metricsData.data?.totalCalls || 0) * (metricsData.data?.connectionRate || 0) / 100),
        totalRevenue: metricsData.data?.revenueConversions || 0,
        conversionRate: metricsData.data?.connectionRate || 0,
        averageCallDuration: metricsData.data?.averageCallDuration || 0,
        agentsOnline: metricsData.data?.activeAgents || 0,
        callsInProgress: Math.floor((metricsData.data?.totalCalls || 0) * 0.1),
        averageWaitTime: metricsData.data?.averageWaitTime || 0,
        activeAgents: metricsData.data?.activeAgents || 0
      };
      setMetrics(transformedMetrics);

      // Fetch call volume data
      const callVolumeResponse = await fetch('/api/reports/overview/call-volume?filter=last_24h', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (callVolumeResponse.ok) {
        const callVolumeData = await callVolumeResponse.json();
        // Transform to expected format
        const transformedData = (callVolumeData.data || []).map((item: any) => ({
          timestamp: item.timestamp || new Date().toISOString(),
          totalCalls: item.totalCalls || 0,
          connectedCalls: item.connectedCalls || 0
        }));
        setCallVolumeData(transformedData);
      }

      // Generate synthetic revenue data
      const days = 7;
      const generatedRevenueData = [];
      const baseRevenue = transformedMetrics.totalRevenue / days;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        generatedRevenueData.push({
          timestamp: date.toISOString(),
          revenue: Math.round(baseRevenue * (0.8 + Math.random() * 0.4)),
          period: 'daily' as const
        });
      }
      
      setRevenueData(generatedRevenueData);

      // Fetch conversion data  
      const conversionResponse = await fetch('/api/reports/overview/recent-outcomes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (conversionResponse.ok) {
        const conversionData = await conversionResponse.json();
        // Transform recent outcomes to conversion format
        const outcomes = (conversionData.data || []);
        const conversionMap = new Map();
        
        outcomes.forEach((outcome: any) => {
          const key = outcome.outcome || 'Unknown';
          if (!conversionMap.has(key)) {
            conversionMap.set(key, { outcome: key, count: 0, revenue: 0 });
          }
          const existing = conversionMap.get(key);
          existing.count += 1;
          existing.revenue += outcome.revenue || 0;
        });
        
        setConversionData(Array.from(conversionMap.values()));
      }

      // Fetch top agents data
      const topAgentsResponse = await fetch('/api/reports/overview/agent-leaderboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (topAgentsResponse.ok) {
        const topAgentsData = await topAgentsResponse.json();
        // Transform to expected format
        const transformedAgents = (topAgentsData.data || []).map((agent: any) => ({
          agentId: agent.agentId || `agent-${Math.random()}`,
          agentName: agent.agentName || 'Unknown Agent',
          callsHandled: agent.callsHandled || 0,
          conversionRate: agent.connectionRate || 0,
          revenue: agent.conversions || 0
        }));
        setTopAgentsData(transformedAgents);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial data load
    fetchCampaigns();
    fetchDashboardData();

    // Listen for real-time updates
    socket.on('dashboard.metrics.updated', (updatedMetrics: DashboardMetrics) => {
      setMetrics(updatedMetrics);
    });

    // Refresh data every 30 seconds
    const interval = setInterval(() => fetchDashboardData(), 30000);

    return () => {
      clearInterval(interval);
      socket.off('dashboard.metrics.updated');
    };
  }, []);

  // Re-fetch data when filters change
  useEffect(() => {
    if (selectedCampaign !== null && dateRange) {
      fetchDashboardData(selectedCampaign, dateRange);
    }
  }, [selectedCampaign, dateRange]);

  // Chart configurations
  const callVolumeChartData = {
    labels: callVolumeData.map(data => 
      new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Total Calls',
        data: callVolumeData.map(data => data.totalCalls),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Connected Calls',
        data: callVolumeData.map(data => data.connectedCalls),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const revenueChartData = {
    labels: revenueData.map(data => 
      new Date(data.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Revenue ($)',
        data: revenueData.map(data => data.revenue),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 2,
      },
    ],
  };

  const conversionChartData = {
    labels: conversionData.map(data => data.outcome),
    datasets: [
      {
        data: conversionData.map(data => data.count),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 101, 101, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(59, 130, 246)',
          'rgb(245, 101, 101)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading dashboard
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Reports Overview</h1>
          <p className="text-slate-600 dark:text-slate-400">Advanced analytics and insights for your call center operations</p>
        </div>

        {/* Filtering Controls */}
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Campaign Filter */}
              <div className="min-w-[200px]">
                <label htmlFor="campaign-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Campaign
                </label>
                <select
                  id="campaign-select"
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="all">All Campaigns</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="min-w-[150px]">
                <label htmlFor="date-range-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Date Range
                </label>
                <select
                  id="date-range-select"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="last_7d">Last 7 Days</option>
                  <option value="last_30d">Last 30 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                </select>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardData(selectedCampaign, dateRange)}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </>
              )}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Calls Today"
            value={metrics.totalCallsToday.toLocaleString()}
            change="+12%"
            trend="up"
            icon={<span>📞</span>}
          />
          <KPICard
            title="Connected Calls"
            value={metrics.connectedCallsToday.toLocaleString()}
            change="+8%"
            trend="up"
            icon={<span>✅</span>}
          />
          <KPICard
            title="Total Revenue"
            value={`$${metrics.totalRevenue.toLocaleString()}`}
            change="+15%"
            trend="up"
            icon={<span>💰</span>}
          />
          <KPICard
            title="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            change="+2.1%"
            trend="up"
            icon={<span>📈</span>}
          />
          <KPICard
            title="Avg Call Duration"
            value={`${Math.floor(metrics.averageCallDuration / 60)}m ${metrics.averageCallDuration % 60}s`}
            change="-30s"
            trend="down"
            icon={<span>⏱️</span>}
          />
          <KPICard
            title="Agents Online"
            value={metrics.agentsOnline.toString()}
            icon={<span>👥</span>}
          />
          <KPICard
            title="Calls in Progress"
            value={metrics.callsInProgress.toString()}
            icon={<span>🔄</span>}
          />
          <KPICard
            title="Avg Wait Time"
            value={`${metrics.averageWaitTime}s`}
            change="-5s"
            trend="up"
            icon={<span>⏳</span>}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Call Volume Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Call Volume (Hourly)</h3>
          <div className="h-80">
            <Line data={callVolumeChartData} options={chartOptions} />
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Revenue</h2>
          <div className="h-80">
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Call Outcomes Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Call Outcomes</h2>
          <div className="h-80">
            <Doughnut data={conversionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Top Agents */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Performing Agents</h2>
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
                    Conversion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topAgentsData.map((agent, index) => (
                  <tr key={agent.agentId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                            {agent.agentName.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {agent.agentName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.callsHandled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {agent.conversionRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${agent.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Additional Metrics Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 mb-8">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Recent Call Outcomes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
              {conversionData.map((outcome, index) => (
                <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      outcome.outcome === 'Converted' ? 'bg-green-100 text-green-800' :
                      outcome.outcome === 'Connected' ? 'bg-blue-100 text-blue-800' :
                      outcome.outcome === 'Dropped' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {outcome.outcome}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                    {outcome.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                    {outcome.revenue ? `$${outcome.revenue.toFixed(2)}` : '-'}
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

export default OverviewDashboard;