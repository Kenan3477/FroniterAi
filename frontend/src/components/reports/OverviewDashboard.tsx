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

const KPICard: React.FC<{ title: string; value: string | number; change?: string; icon: React.ReactNode; color: string }> = ({ 
  title, 
  value, 
  change, 
  icon, 
  color 
}) => (
  <div className={`bg-gradient-to-br ${color} backdrop-blur-sm bg-opacity-90 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 border border-white/20`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-white/80 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white mb-2">{value}</p>
        {change && (
          <p className="text-sm text-white/90 font-medium">
            <span className={change.startsWith('+') ? 'text-green-200' : 'text-red-200'}>
              {change}
            </span>
            {' '}vs yesterday
          </p>
        )}
      </div>
      <div className="text-white/80 text-3xl ml-4">
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch metrics
      const metricsResponse = await fetch('/api/dashboard/metrics', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!metricsResponse.ok) {
        throw new Error(`HTTP error! status: ${metricsResponse.status}`);
      }
      
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Fetch call volume data
      const callVolumeResponse = await fetch('/api/dashboard/call-volume?period=hourly', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (callVolumeResponse.ok) {
        const callVolumeData = await callVolumeResponse.json();
        setCallVolumeData(callVolumeData);
      }

      // Fetch revenue data
      const revenueResponse = await fetch('/api/dashboard/revenue?period=daily', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (revenueResponse.ok) {
        const revenueData = await revenueResponse.json();
        setRevenueData(revenueData);
      }

      // Fetch conversion data
      const conversionResponse = await fetch('/api/dashboard/conversions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (conversionResponse.ok) {
        const conversionData = await conversionResponse.json();
        setConversionData(conversionData);
      }

      // Fetch top agents data
      const topAgentsResponse = await fetch('/api/dashboard/top-agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (topAgentsResponse.ok) {
        const topAgentsData = await topAgentsResponse.json();
        setTopAgentsData(topAgentsData);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for real-time updates
    socket.on('dashboard.metrics.updated', (updatedMetrics: DashboardMetrics) => {
      setMetrics(updatedMetrics);
    });

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);

    return () => {
      clearInterval(interval);
      socket.off('dashboard.metrics.updated');
    };
  }, []);

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
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
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
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Executive Dashboard</h1>
        <p className="text-gray-600">Real-time insights into your call center performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Calls Today"
          value={metrics.totalCallsToday.toLocaleString()}
          change="+12%"
          color="from-blue-500 to-blue-600"
          icon={<span>📞</span>}
        />
        <KPICard
          title="Connected Calls"
          value={metrics.connectedCallsToday.toLocaleString()}
          change="+8%"
          color="from-green-500 to-green-600"
          icon={<span>✅</span>}
        />
        <KPICard
          title="Total Revenue"
          value={`$${metrics.totalRevenue.toLocaleString()}`}
          change="+15%"
          color="from-purple-500 to-purple-600"
          icon={<span>💰</span>}
        />
        <KPICard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          change="+2.1%"
          color="from-indigo-500 to-indigo-600"
          icon={<span>📈</span>}
        />
        <KPICard
          title="Avg Call Duration"
          value={`${Math.floor(metrics.averageCallDuration / 60)}m ${metrics.averageCallDuration % 60}s`}
          change="-30s"
          color="from-orange-500 to-orange-600"
          icon={<span>⏱️</span>}
        />
        <KPICard
          title="Agents Online"
          value={metrics.agentsOnline.toString()}
          color="from-cyan-500 to-cyan-600"
          icon={<span>👥</span>}
        />
        <KPICard
          title="Calls in Progress"
          value={metrics.callsInProgress.toString()}
          color="from-yellow-500 to-yellow-600"
          icon={<span>🔄</span>}
        />
        <KPICard
          title="Avg Wait Time"
          value={`${metrics.averageWaitTime}s`}
          change="-5s"
          color="from-red-500 to-red-600"
          icon={<span>⏳</span>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Call Volume Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Call Volume (Hourly)</h2>
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
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Call Outcomes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conversionData.map((outcome, index) => (
                <tr key={index} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {outcome.count}
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

export default OverviewDashboard;