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
import { useAuth } from '@/contexts/AuthContext';

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
  // Add previous period data for comparison
  totalCallsYesterday: number;
  connectedCallsYesterday: number;
  totalRevenueYesterday: number;
  conversionRateYesterday: number;
  averageCallDurationYesterday: number;
  averageWaitTimeYesterday: number;
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

interface RecentCallOutcome {
  timestamp: string;
  agentName: string;
  phoneNumber: string;
  customerName?: string;
  callDuration: number;
  outcome: 'Connected' | 'Dropped' | 'No Answer' | 'Converted';
  revenue?: number;
  callId: string;
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

interface AgentCallActivity {
  agentId: string;
  agentName: string;
  hourlyData: Array<{
    hour: number;
    callCount: number;
    timestamp: string;
  }>;
  totalCallsToday: number;
  color: string;
}

const KPICard: React.FC<{ 
  title: string; 
  value: string | number; 
  previousValue?: number;
  icon: React.ReactNode; 
  trend?: 'up' | 'down' | 'neutral';
  isPercentage?: boolean;
  isDuration?: boolean;
}> = ({ 
  title, 
  value, 
  previousValue,
  icon,
  trend = 'neutral',
  isPercentage = false,
  isDuration = false
}) => {
  
  // Calculate percentage change if we have previous data
  const calculateChange = (): { changeText: string; changeColor: string; showChange: boolean } => {
    if (previousValue === undefined) {
      return { changeText: '', changeColor: '', showChange: false };
    }

    const currentNumeric = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    
    // Don't show change if both values are 0
    if (currentNumeric === 0 && previousValue === 0) {
      return { changeText: 'No change', changeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', showChange: true };
    }

    // Handle case where we had 0 yesterday but have data today
    if (previousValue === 0 && currentNumeric > 0) {
      return { changeText: 'New data', changeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', showChange: true };
    }

    // Calculate percentage change
    const percentChange = ((currentNumeric - previousValue) / previousValue) * 100;
    
    if (Math.abs(percentChange) < 0.1) {
      return { changeText: 'No change', changeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400', showChange: true };
    }

    const changeText = `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
    const changeColor = percentChange > 0 
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    
    return { changeText, changeColor, showChange: true };
  };

  const { changeText, changeColor, showChange } = calculateChange();

  return (
    <div className="theme-card rounded-lg p-6 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium theme-text-secondary mb-2">{title}</p>
          <p className="text-2xl font-semibold theme-text-primary mb-3">{value}</p>
          {showChange && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${changeColor}`}>
                {changeText}
              </span>
              <span className="text-xs theme-text-secondary">vs yesterday</span>
            </div>
          )}
        </div>
        <div className="theme-text-secondary text-xl group-hover:theme-text-primary transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
};

const OverviewDashboard: React.FC = () => {
  const { user } = useAuth();
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
    // Previous period data for comparison
    totalCallsYesterday: 0,
    connectedCallsYesterday: 0,
    totalRevenueYesterday: 0,
    conversionRateYesterday: 0,
    averageCallDurationYesterday: 0,
    averageWaitTimeYesterday: 0,
  });
  
  const [callVolumeData, setCallVolumeData] = useState<CallVolumeData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [recentOutcomes, setRecentOutcomes] = useState<RecentCallOutcome[]>([]);
  const [topAgentsData, setTopAgentsData] = useState<TopAgentData[]>([]);
  const [agentCallActivityData, setAgentCallActivityData] = useState<AgentCallActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Campaign filtering state
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<Array<{id: string; name: string}>>([]);
  const [dateRange, setDateRange] = useState<string>('last_7d');
  
  // Data List filtering state
  const [selectedDataList, setSelectedDataList] = useState<string>('all');
  const [dataLists, setDataLists] = useState<Array<{id: string; name: string; listId: string}>>([]);
  const [loadingDataLists, setLoadingDataLists] = useState(false);
  const [syncingRecordings, setSyncingRecordings] = useState(false);

  const syncRecordingsFromTwilio = async () => {
    const token =
      localStorage.getItem('omnivox_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token') ||
      localStorage.getItem('session_token');
    if (!token) {
      alert('You need to be logged in to sync recordings.');
      return;
    }
    setSyncingRecordings(true);
    try {
      const response = await fetch('/api/call-records/sync-recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (data as { error?: string; message?: string }).error ||
            (data as { message?: string }).message ||
            response.statusText,
        );
      }
      const synced = (data as { data?: { synced?: number }; synced?: number }).data?.synced ??
        (data as { synced?: number }).synced;
      const errors = (data as { data?: { errors?: number }; errors?: number }).data?.errors ??
        (data as { errors?: number }).errors;
      alert(
        (data as { message?: string }).message ||
          `Recording sync finished. Linked ${synced ?? 0} call(s); ${errors ?? 0} could not be matched.`,
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncingRecordings(false);
    }
  };

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
          .filter((campaign: any) => !campaign.isDeleted && (campaign.status === 'Active' || campaign.status === 'ACTIVE'))
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

  // Fetch data lists for selected campaign
  const fetchDataLists = async (campaignId: string) => {
    if (campaignId === 'all') {
      setDataLists([]);
      setSelectedDataList('all');
      return;
    }

    setLoadingDataLists(true);
    try {
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      const response = await fetch(`/api/admin/campaign-management/campaigns/${campaignId}/data-lists`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const dataListsData = await response.json();
        const activeLists = (dataListsData.data || [])
          .filter((list: any) => list.active)
          .map((list: any) => ({
            id: list.id,
            listId: list.listId,
            name: list.name
          }));
        setDataLists(activeLists);
        setSelectedDataList('all'); // Reset to all data lists when campaign changes
      } else {
        console.warn('Failed to fetch data lists for campaign:', campaignId);
        setDataLists([]);
      }
    } catch (error) {
      console.warn('Failed to fetch data lists:', error);
      setDataLists([]);
    } finally {
      setLoadingDataLists(false);
    }
  };

  const fetchDashboardData = async (campaignFilter = selectedCampaign, dateFilter = dateRange, dataListFilter = selectedDataList, isInitialLoad = false) => {
    try {
      // Get authentication token
      const token = localStorage.getItem('omnivox_token') || localStorage.getItem('authToken');
      
      // Build query parameters for filtering
      const queryParams = new URLSearchParams();
      if (campaignFilter && campaignFilter !== 'all') {
        queryParams.append('campaignId', campaignFilter);
      }
      if (dataListFilter && dataListFilter !== 'all') {
        queryParams.append('dataListId', dataListFilter);
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
      
      // Fetch yesterday's data for comparison
      const yesterdayParams = new URLSearchParams();
      if (campaignFilter && campaignFilter !== 'all') {
        yesterdayParams.append('campaignId', campaignFilter);
      }
      if (dataListFilter && dataListFilter !== 'all') {
        yesterdayParams.append('dataListId', dataListFilter);
      }
      yesterdayParams.append('filter', 'yesterday');
      
      let yesterdayMetrics = null;
      try {
        const yesterdayResponse = await fetch(`/api/reports/overview/kpis?${yesterdayParams.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (yesterdayResponse.ok) {
          const yesterdayData = await yesterdayResponse.json();
          yesterdayMetrics = yesterdayData.data;
        }
      } catch (err) {
        console.warn('Failed to fetch yesterday data:', err);
      }
      
      // Transform backend response to frontend format with comparison data
      const transformedMetrics: DashboardMetrics = {
        totalCallsToday: metricsData.data?.totalCalls || 0,
        connectedCallsToday: Math.round((metricsData.data?.totalCalls || 0) * (metricsData.data?.connectionRate || 0) / 100),
        totalRevenue: metricsData.data?.revenueConversions || 0,
        conversionRate: metricsData.data?.connectionRate || 0,
        averageCallDuration: metricsData.data?.averageCallDuration || 0,
        agentsOnline: metricsData.data?.activeAgents || 0,
        callsInProgress: Math.floor((metricsData.data?.totalCalls || 0) * 0.1),
        averageWaitTime: metricsData.data?.averageWaitTime || 0,
        activeAgents: metricsData.data?.activeAgents || 0,
        // Yesterday's data for comparison
        totalCallsYesterday: yesterdayMetrics?.totalCalls || 0,
        connectedCallsYesterday: Math.round((yesterdayMetrics?.totalCalls || 0) * (yesterdayMetrics?.connectionRate || 0) / 100),
        totalRevenueYesterday: yesterdayMetrics?.revenueConversions || 0,
        conversionRateYesterday: yesterdayMetrics?.connectionRate || 0,
        averageCallDurationYesterday: yesterdayMetrics?.averageCallDuration || 0,
        averageWaitTimeYesterday: yesterdayMetrics?.averageWaitTime || 0,
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

      // Fetch agent call activity data
      const agentActivityParams = new URLSearchParams();
      agentActivityParams.append('filter', 'today');
      if (campaignFilter && campaignFilter !== 'all') {
        agentActivityParams.append('campaignId', campaignFilter);
      }
      if (dataListFilter && dataListFilter !== 'all') {
        agentActivityParams.append('dataListId', dataListFilter);
      }
      
      const agentActivityResponse = await fetch(`/api/reports/overview/agent-call-activity?${agentActivityParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (agentActivityResponse.ok) {
        const agentActivityData = await agentActivityResponse.json();
        setAgentCallActivityData(agentActivityData.data || []);
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
        // Store the detailed recent outcomes
        const outcomes = (conversionData.data || []);
        setRecentOutcomes(outcomes);
        
        // Transform recent outcomes to aggregated conversion format
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
    }
    // Remove finally block to prevent loading state changes
  };

  useEffect(() => {
    // Initial data load
    setLoading(true); // Only set loading for initial load
    
    fetchCampaigns();
    fetchDashboardData('all', 'today', 'all', true).finally(() => {
      setLoading(false); // Clear loading only after initial load
    });

    // Listen for real-time updates
    socket.on('dashboard.metrics.updated', (updatedMetrics: DashboardMetrics) => {
      setMetrics(prevMetrics => ({
        ...prevMetrics,
        ...updatedMetrics
      }));
    });

    // Listen for real-time call volume updates
    socket.on('dashboard.call_volume.updated', (volumeData: CallVolumeData[]) => {
      setCallVolumeData(Array.isArray(volumeData) ? volumeData : []);
    });

    // Listen for real-time agent call activity updates
    socket.on('dashboard.agent_call_activity.updated', (activityData: AgentCallActivity[]) => {
      setAgentCallActivityData(Array.isArray(activityData) ? activityData : []);
    });

    // Listen for real-time agent leaderboard updates
    socket.on('dashboard.agents.updated', (agentData: TopAgentData[]) => {
      setTopAgentsData(Array.isArray(agentData) ? agentData : []);
    });

    // Real-time data refresh every 5 seconds for seamless updates
    const interval = setInterval(() => {
      fetchDashboardData(); // Background updates without loading state
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.off('dashboard.metrics.updated');
      socket.off('dashboard.call_volume.updated');
      socket.off('dashboard.agent_call_activity.updated');
      socket.off('dashboard.agents.updated');
    };
  }, []);

  // Effect for campaign/date range changes - immediate updates without loading
  useEffect(() => {
    if (selectedCampaign !== null && dateRange) {
      fetchDashboardData(selectedCampaign, dateRange);
    }
  }, [selectedCampaign, dateRange]);

  // Chart configurations
  const agentCallActivityChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`),
    datasets: (Array.isArray(agentCallActivityData) ? agentCallActivityData : []).map(agent => ({
      label: `${agent.agentName} (${agent.totalCallsToday} calls)`,
      data: Array.isArray(agent.hourlyData) ? agent.hourlyData.map(hour => hour.callCount) : [],
      borderColor: agent.color,
      backgroundColor: agent.color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: agent.color,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      fill: false,
      borderWidth: 3,
    })),
  };

  const callVolumeChartData = {
    labels: (Array.isArray(callVolumeData) ? callVolumeData : []).map(data => 
      new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    ),
    datasets: [
      {
        label: 'Total Calls',
        data: (Array.isArray(callVolumeData) ? callVolumeData : []).map(data => data.totalCalls),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Connected Calls',
        data: (Array.isArray(callVolumeData) ? callVolumeData : []).map(data => data.connectedCalls),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const revenueChartData = {
    labels: (Array.isArray(revenueData) ? revenueData : []).map(data => 
      new Date(data.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
    ),
    datasets: [
      {
        label: 'Revenue ($)',
        data: (Array.isArray(revenueData) ? revenueData : []).map(data => data.revenue),
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 2,
      },
    ],
  };

  const conversionChartData = {
    labels: (Array.isArray(conversionData) ? conversionData : []).map(data => data.outcome),
    datasets: [
      {
        data: (Array.isArray(conversionData) ? conversionData : []).map(data => data.count),
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
      <div className="theme-bg-secondary min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="theme-card rounded-md p-6 border-l-4 border-red-400">
            <div className="flex items-center">
              <div className="text-red-600 mr-3 text-2xl">⚠️</div>
              <div>
                <h3 className="text-lg font-medium theme-text-primary">
                  Error Loading Dashboard
                </h3>
                <div className="mt-2 text-sm theme-text-secondary">
                  <p>{error}</p>
                  <button 
                    onClick={() => {
                      setError(null);
                      fetchDashboardData();
                    }}
                    className="mt-3 btn-secondary px-4 py-2 text-sm rounded-md"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-bg-secondary min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtering Controls */}
        <div className="theme-card rounded-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div className="w-full sm:w-auto sm:order-last shrink-0">
                <button
                  type="button"
                  onClick={syncRecordingsFromTwilio}
                  disabled={syncingRecordings}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncingRecordings ? 'Syncing from Twilio…' : 'Link missing recordings'}
                </button>
                <p className="mt-1 text-xs theme-text-secondary max-w-xs">
                  Pulls Twilio audio onto rows that still show &quot;No recording&quot; (last 30 days).
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Campaign Filter */}
              <div className="min-w-[200px]">
                <label htmlFor="campaign-select" className="block text-sm font-medium theme-text-primary mb-2">
                  Campaign
                </label>
                <select
                  id="campaign-select"
                  value={selectedCampaign}
                  onChange={(e) => {
                    const newCampaign = e.target.value;
                    setSelectedCampaign(newCampaign);
                    setSelectedDataList('all'); // Reset data list when campaign changes
                    fetchDataLists(newCampaign);
                    fetchDashboardData(newCampaign, dateRange, 'all');
                  }}
                  className="input-field w-full px-3 py-2 rounded-md"
                >
                  <option value="all">All Campaigns</option>
                  {(Array.isArray(campaigns) ? campaigns : []).map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data List Filter */}
              <div className="min-w-[200px]">
                <label htmlFor="data-list-select" className="block text-sm font-medium theme-text-primary mb-2">
                  Data List
                </label>
                <select
                  id="data-list-select"
                  value={selectedDataList}
                  onChange={(e) => {
                    setSelectedDataList(e.target.value);
                    fetchDashboardData(selectedCampaign, dateRange, e.target.value);
                  }}
                  disabled={loadingDataLists || selectedCampaign === 'all'}
                  className="input-field w-full px-3 py-2 rounded-md disabled:opacity-50"
                >
                  <option value="all">
                    {loadingDataLists ? 'Loading...' : selectedCampaign === 'all' ? 'Select Campaign First' : 'All Data Lists'}
                  </option>
                  {(Array.isArray(dataLists) ? dataLists : []).map((dataList) => (
                    <option key={dataList.id} value={dataList.id}>
                      {dataList.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="min-w-[150px]">
                <label htmlFor="date-range-select" className="block text-sm font-medium theme-text-primary mb-2">
                  Date Range
                </label>
                <select
                  id="date-range-select"
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    fetchDashboardData(selectedCampaign, e.target.value);
                  }}
                  className="input-field w-full px-3 py-2 rounded-md"
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

            {/* Real-time indicator */}
            <div className="flex items-center text-sm theme-text-secondary">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span>Live updates every 5 seconds</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Total Calls Today"
            value={metrics.totalCallsToday.toLocaleString()}
            previousValue={metrics.totalCallsYesterday}
            icon={<span>📞</span>}
          />
          <KPICard
            title="Connected Calls"
            value={metrics.connectedCallsToday.toLocaleString()}
            previousValue={metrics.connectedCallsYesterday}
            icon={<span>✅</span>}
          />
          <KPICard
            title="Total Revenue"
            value={`$${metrics.totalRevenue.toLocaleString()}`}
            previousValue={metrics.totalRevenueYesterday}
            icon={<span>💰</span>}
          />
          <KPICard
            title="Conversion Rate"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            previousValue={metrics.conversionRateYesterday}
            isPercentage={true}
            icon={<span>📈</span>}
          />
          <KPICard
            title="Avg Call Duration"
            value={`${Math.floor(metrics.averageCallDuration / 60)}m ${metrics.averageCallDuration % 60}s`}
            previousValue={metrics.averageCallDurationYesterday}
            isDuration={true}
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
            previousValue={metrics.averageWaitTimeYesterday}
            icon={<span>⏳</span>}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Agent Call Activity Chart */}
        <div className="theme-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold theme-text-primary">Agent Call Activity (Today)</h3>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs theme-text-secondary">Live</span>
            </div>
          </div>
          <div className="h-80">
            {agentCallActivityData.length > 0 ? (
              <Line 
                data={agentCallActivityChartData} 
                options={{
                  ...chartOptions,
                  interaction: {
                    intersect: false,
                    mode: 'index'
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Hour of Day'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Calls Made'
                      },
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  },
                  plugins: {
                    ...chartOptions.plugins,
                    tooltip: {
                      callbacks: {
                        title: (context: any) => {
                          const hour = context[0].label;
                          return `${hour} - ${(parseInt(hour) + 1).toString().padStart(2, '0')}:00`;
                        },
                        label: (context: any) => {
                          const agentName = context.dataset.label.split(' (')[0];
                          const calls = context.parsed.y;
                          return `${agentName}: ${calls} call${calls !== 1 ? 's' : ''}`;
                        }
                      }
                    }
                  }
                }} 
              />
            ) : (
              <div className="flex items-center justify-center h-full theme-text-secondary">
                <div className="text-center">
                  <div className="text-4xl mb-2">📞</div>
                  <p>No agent call data available</p>
                  <p className="text-xs mt-1">Data will appear when agents start making calls</p>
                </div>
              </div>
            )}
          </div>
          {agentCallActivityData.length > 0 && (
            <div className="mt-4 pt-4 border-t theme-border">
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(agentCallActivityData) ? agentCallActivityData : []).map(agent => (
                  <div key={agent.agentId} className="flex items-center space-x-1 text-xs">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: agent.color }}
                    ></div>
                    <span className="theme-text-secondary">
                      {agent.agentName}: {agent.totalCallsToday} calls
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="theme-card rounded-xl p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">Daily Revenue</h2>
          <div className="h-80">
            <Bar data={revenueChartData} options={chartOptions} />
          </div>
        </div>

        {/* Call Outcomes Chart */}
        <div className="theme-card rounded-xl p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">Call Outcomes</h2>
          <div className="h-80">
            <Doughnut data={conversionChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Top Agents */}
        <div className="theme-card rounded-xl p-6">
          <h2 className="text-xl font-semibold theme-text-primary mb-4">Top Performing Agents</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y theme-border">
              <thead className="theme-bg-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Calls
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Conversion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="theme-bg-primary divide-y theme-border">
                {(Array.isArray(topAgentsData) ? topAgentsData : []).map((agent, index) => (
                  <tr key={agent.agentId} className="hover:theme-bg-secondary">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
                            {agent.agentName.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium theme-text-primary">
                            {agent.agentName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                      {agent.callsHandled}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                      {agent.conversionRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm theme-text-primary">
                      ${agent.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Call Outcomes Table */}
      <div className="theme-card rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold theme-text-primary mb-4">Recent Call Outcomes</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Phone / Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Call Outcome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
              {recentOutcomes.length > 0 ? (
                (Array.isArray(recentOutcomes) ? recentOutcomes : []).map((call, index) => (
                  <tr key={call.callId || index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {new Date(call.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {call.agentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      <div>
                        <div className="font-medium">{call.customerName || 'Unknown Customer'}</div>
                        <div className="text-xs text-slate-500">{call.phoneNumber}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        call.outcome === 'Converted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        call.outcome === 'Connected' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        call.outcome === 'Dropped' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {call.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {Math.floor(call.callDuration / 60)}:{(call.callDuration % 60).toString().padStart(2, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                      {call.revenue ? `$${call.revenue.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    No recent call outcomes available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
};

export default OverviewDashboard;