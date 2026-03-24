/**
 * Voice Campaign Reports Component
 * Comprehensive analytics dashboard for voice campaign performance
 */
'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  PhoneIcon, 
  ArrowTrendingUpIcon as TrendingUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UsersIcon,
  CalendarDaysIcon,
  FunnelIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Doughnut, Funnel } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface VoiceCampaignKPIs {
  totalCalls: number;
  connectedCalls: number;
  answerRate: number;
  conversionRate: number;
  averageCallDuration: number;
  revenuePerCampaign: number;
  costPerConversion: number;
}

interface CallsByHourData {
  hour: number;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

interface CallsByAgentData {
  agentId: string;
  agentName: string;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

interface ConversionFunnelData {
  totalCalls: number;
  connectedCalls: number;
  qualifiedLeads: number;
  conversions: number;
}

interface CallOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
}

interface FilterData {
  campaigns: Array<{ campaignId: string; name: string }>;
  agents: Array<{ agentId: string; name: string; callCount: number }>;
  leadLists: Array<{ listId: string; name: string }>;
}

interface VoiceCampaignFilters {
  campaignId?: string;
  dateFrom?: string;
  dateTo?: string;
  agentIds?: string[];
  leadListIds?: string[];
}

export default function VoiceCampaignReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<VoiceCampaignKPIs>({
    totalCalls: 0,
    connectedCalls: 0,
    answerRate: 0,
    conversionRate: 0,
    averageCallDuration: 0,
    revenuePerCampaign: 0,
    costPerConversion: 0
  });
  
  const [charts, setCharts] = useState<{
    callsByHour: CallsByHourData[];
    callsByAgent: CallsByAgentData[];
    conversionFunnel: ConversionFunnelData;
    callOutcomes: CallOutcomeData[];
  }>({
    callsByHour: [],
    callsByAgent: [],
    conversionFunnel: { totalCalls: 0, connectedCalls: 0, qualifiedLeads: 0, conversions: 0 },
    callOutcomes: []
  });

  const [filterData, setFilterData] = useState<FilterData>({
    campaigns: [],
    agents: [],
    leadLists: []
  });

  const [filters, setFilters] = useState<VoiceCampaignFilters>({});

  useEffect(() => {
    loadFilterData();
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [filters]);

  const loadFilterData = async () => {
    try {
      const response = await fetch('/api/reports/voice/campaign/filters');
      const result = await response.json();
      
      if (result.success) {
        setFilterData(result.data);
      } else {
        setError('Failed to load filter data');
      }
    } catch (err) {
      console.error('Error loading filter data:', err);
      setError('Failed to load filter data');
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.campaignId) queryParams.append('campaignId', filters.campaignId);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      
      if (filters.agentIds && filters.agentIds.length > 0) {
        filters.agentIds.forEach(id => queryParams.append('agentIds', id));
      }
      
      if (filters.leadListIds && filters.leadListIds.length > 0) {
        filters.leadListIds.forEach(id => queryParams.append('leadListIds', id));
      }

      const url = `/api/reports/voice/campaign-simple${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);
      const result = await response.json();
      
      if (result.success) {
        setKpis(result.data.kpis);
        setCharts(result.data.charts);
      } else {
        setError(result.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof VoiceCampaignFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Chart configurations with theme support
  const getChartTheme = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#ffffff' : '#1f2937',
      gridColor: isDark ? '#374151' : '#e5e7eb',
      backgroundColor: isDark ? '#1f2937' : '#ffffff'
    };
  };

  const theme = getChartTheme();

  // Calls by Hour Chart
  const callsByHourChart = {
    labels: charts.callsByHour.map(d => `${d.hour}:00`),
    datasets: [
      {
        label: 'Total Calls',
        data: charts.callsByHour.map(d => d.totalCalls),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Connected Calls',
        data: charts.callsByHour.map(d => d.connectedCalls),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4
      },
      {
        label: 'Conversions',
        data: charts.callsByHour.map(d => d.conversions),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      }
    ]
  };

  // Calls by Agent Chart
  const callsByAgentChart = {
    labels: charts.callsByAgent.slice(0, 10).map(d => d.agentName),
    datasets: [
      {
        label: 'Total Calls',
        data: charts.callsByAgent.slice(0, 10).map(d => d.totalCalls),
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Connected',
        data: charts.callsByAgent.slice(0, 10).map(d => d.connectedCalls),
        backgroundColor: '#10b981'
      },
      {
        label: 'Conversions',
        data: charts.callsByAgent.slice(0, 10).map(d => d.conversions),
        backgroundColor: '#f59e0b'
      }
    ]
  };

  // Call Outcomes Chart
  const callOutcomesChart = {
    labels: charts.callOutcomes.map(d => d.outcome),
    datasets: [
      {
        data: charts.callOutcomes.map(d => d.count),
        backgroundColor: [
          '#10b981', // Connected - green
          '#ef4444', // No answer - red
          '#f59e0b', // Dropped - orange
          '#8b5cf6', // Failed - purple
          '#06b6d4', // Converted - cyan
          '#84cc16', // Other outcomes - lime
          '#f97316', // Additional outcomes - orange
          '#ec4899'  // Additional outcomes - pink
        ]
      }
    ]
  };

  const chartOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: theme.textColor
        }
      }
    },
    scales: {
      x: {
        ticks: { color: theme.textColor },
        grid: { color: theme.gridColor }
      },
      y: {
        ticks: { color: theme.textColor },
        grid: { color: theme.gridColor }
      }
    }
  };

  if (loading && !kpis.totalCalls && !error) {
    console.log('🔄 VoiceCampaignReports showing skeleton loading state');
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Skeleton Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-6 w-16 bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-8 w-20 bg-gray-300 rounded animate-pulse"></div>
                </div>
                <div className="w-8 h-8 bg-gray-300 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 bg-gray-300 rounded animate-pulse"></div>
                <div className="h-6 w-32 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600"></div>
            <span className="text-sm font-medium">Loading voice campaign analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ VoiceCampaignReports showing error state:', error);
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-medium mb-2">Error Loading Reports</div>
          <div className="text-red-500 text-sm mb-4">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              loadAnalytics();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  console.log('✅ VoiceCampaignReports rendering main content with KPIs:', kpis);

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Filters */}
        <div className="theme-card rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
            <FunnelIcon className="w-5 h-5" />
            Filters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Campaign Filter */}
            <div>
              <label className="block text-sm font-medium theme-text-primary mb-2">
                Campaign
              </label>
              <select
                value={filters.campaignId || ''}
                onChange={(e) => handleFilterChange('campaignId', e.target.value || undefined)}
                className="input-field w-full"
              >
                <option value="">All Campaigns</option>
                {filterData.campaigns.map(campaign => (
                  <option key={campaign.campaignId} value={campaign.campaignId}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium theme-text-primary mb-2">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                className="input-field w-full"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium theme-text-primary mb-2">
                Date To
              </label>
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                className="input-field w-full"
              />
            </div>

            {/* Agent Filter */}
            <div>
              <label className="block text-sm font-medium theme-text-primary mb-2">
                Agents
              </label>
              <select
                multiple
                value={filters.agentIds || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('agentIds', values.length > 0 ? values : undefined);
                }}
                className="input-field w-full h-10"
              >
                {filterData.agents.map(agent => (
                  <option key={agent.agentId} value={agent.agentId}>
                    {agent.name} ({agent.callCount} calls)
                  </option>
                ))}
              </select>
            </div>

            {/* Lead Lists Filter */}
            <div>
              <label className="block text-sm font-medium theme-text-primary mb-2">
                Lead Lists
              </label>
              <select
                multiple
                value={filters.leadListIds || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange('leadListIds', values.length > 0 ? values : undefined);
                }}
                className="input-field w-full h-10"
              >
                {filterData.leadLists.map(list => (
                  <option key={list.listId} value={list.listId}>
                    {list.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={clearFilters}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="theme-card rounded-lg p-4 mb-8 border-l-4 border-red-500">
            <p className="theme-text-primary font-medium">Error</p>
            <p className="theme-text-secondary text-sm">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6 mb-8">
          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Total Calls</p>
                <p className="text-2xl font-bold theme-text-primary">{kpis.totalCalls.toLocaleString()}</p>
              </div>
              <PhoneIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Connected Calls</p>
                <p className="text-2xl font-bold theme-text-primary">{kpis.connectedCalls.toLocaleString()}</p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Answer Rate</p>
                <p className="text-2xl font-bold theme-text-primary">{kpis.answerRate}%</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-cyan-500" />
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Conversion Rate</p>
                <p className="text-2xl font-bold theme-text-primary">{kpis.conversionRate}%</p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Avg Call Duration</p>
                <p className="text-2xl font-bold theme-text-primary">{Math.floor(kpis.averageCallDuration / 60)}:{(kpis.averageCallDuration % 60).toString().padStart(2, '0')}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Revenue</p>
                <p className="text-2xl font-bold theme-text-primary">${kpis.revenuePerCampaign.toLocaleString()}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="theme-card rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium theme-text-secondary">Cost per Conversion</p>
                <p className="text-2xl font-bold theme-text-primary">${kpis.costPerConversion.toFixed(2)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Calls by Hour */}
          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5" />
              Calls by Hour
            </h3>
            <div className="h-64">
              <Line data={callsByHourChart} options={chartOptions} />
            </div>
          </div>

          {/* Calls by Agent */}
          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Calls by Agent (Top 10)
            </h3>
            <div className="h-64">
              <Bar data={callsByAgentChart} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              Conversion Funnel
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Total Calls', value: charts.conversionFunnel.totalCalls, color: 'bg-blue-500' },
                { label: 'Connected Calls', value: charts.conversionFunnel.connectedCalls, color: 'bg-green-500' },
                { label: 'Qualified Leads', value: charts.conversionFunnel.qualifiedLeads, color: 'bg-yellow-500' },
                { label: 'Conversions', value: charts.conversionFunnel.conversions, color: 'bg-orange-500' }
              ].map((stage, index) => (
                <div key={stage.label} className="relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium theme-text-primary">{stage.label}</span>
                    <span className="text-sm theme-text-secondary">{stage.value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${stage.color}`}
                      style={{ 
                        width: charts.conversionFunnel.totalCalls > 0 
                          ? `${(stage.value / charts.conversionFunnel.totalCalls) * 100}%` 
                          : '0%' 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Call Outcomes */}
          <div className="theme-card rounded-lg p-6">
            <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center gap-2">
              <ChartPieIcon className="w-5 h-5" />
              Call Outcome Distribution
            </h3>
            <div className="h-64">
              {charts.callOutcomes.length > 0 ? (
                <Doughnut data={callOutcomesChart} options={{
                  ...chartOptions,
                  plugins: {
                    ...chartOptions.plugins,
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        color: theme.textColor,
                        padding: 15,
                        usePointStyle: true
                      }
                    }
                  }
                }} />
              ) : (
                <div className="flex items-center justify-center h-full theme-text-secondary">
                  No call outcome data available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}