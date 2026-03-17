/**
 * Complete Reports System
 * Comprehensive reporting dashboard with real-time and historical analytics
 */

import React, { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  PhoneIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  EyeIcon,
  DocumentChartBarIcon,
  ChartPieIcon,
  TableCellsIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface ReportMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ComponentType<any>;
}

interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgCallDuration: number;
  avgWaitTime: number;
  abandonRate: number;
}

interface AgentPerformance {
  agentId: string;
  agentName: string;
  totalCalls: number;
  avgCallDuration: number;
  avgHandleTime: number;
  conversionRate: number;
  customerSatisfaction: number;
}

interface CampaignStats {
  campaignId: string;
  campaignName: string;
  totalContacts: number;
  contactedContacts: number;
  connectedCalls: number;
  conversionRate: number;
  revenue: number;
}

const ReportsSystem: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('today');
  const [selectedReport, setSelectedReport] = useState<string>('overview');
  const [metrics, setMetrics] = useState<ReportMetric[]>([]);
  const [callMetrics, setCallMetrics] = useState<CallMetrics | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStats[]>([]);
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon, description: 'High-level performance metrics' },
    { id: 'call_analytics', name: 'Call Analytics', icon: PhoneIcon, description: 'Detailed call statistics and trends' },
    { id: 'agent_performance', name: 'Agent Performance', icon: UserGroupIcon, description: 'Individual agent metrics and rankings' },
    { id: 'campaign_reports', name: 'Campaign Reports', icon: ArrowTrendingUpIcon, description: 'Campaign effectiveness and ROI' },
    { id: 'queue_analytics', name: 'Queue Analytics', icon: ClockIcon, description: 'Call queue wait times and handling' },
    { id: 'revenue_reports', name: 'Revenue Reports', icon: CurrencyDollarIcon, description: 'Sales performance and revenue tracking' },
    { id: 'customer_satisfaction', name: 'Customer Satisfaction', icon: ChartPieIcon, description: 'Customer feedback and satisfaction scores' },
    { id: 'disposition_analysis', name: 'Disposition Analysis', icon: DocumentChartBarIcon, description: 'Call outcomes and disposition tracking' },
    { id: 'productivity_reports', name: 'Productivity Reports', icon: PresentationChartLineIcon, description: 'Team productivity and efficiency metrics' },
    { id: 'compliance_reports', name: 'Compliance Reports', icon: TableCellsIcon, description: 'Regulatory compliance and audit reports' }
  ];

  const timePeriods = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_week', label: 'Last Week' },
    { id: 'this_month', label: 'This Month' },
    { id: 'last_month', label: 'Last Month' },
    { id: 'this_quarter', label: 'This Quarter' },
    { id: 'last_quarter', label: 'Last Quarter' },
    { id: 'this_year', label: 'This Year' },
    { id: 'custom', label: 'Custom Range' }
  ];

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod, selectedReport]);

  const loadReportData = async () => {
    setLoading(true);
    
    // Simulate API call with realistic data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock metrics data
    const mockMetrics: ReportMetric[] = [
      {
        label: 'Total Calls',
        value: '1,247',
        change: 12.5,
        trend: 'up',
        icon: PhoneIcon
      },
      {
        label: 'Answer Rate',
        value: '94.2%',
        change: 2.3,
        trend: 'up',
        icon: ArrowTrendingUpIcon
      },
      {
        label: 'Avg Call Duration',
        value: '4m 32s',
        change: -8.1,
        trend: 'down',
        icon: ClockIcon
      },
      {
        label: 'Customer Satisfaction',
        value: '4.7/5',
        change: 0.3,
        trend: 'up',
        icon: ChartBarIcon
      }
    ];

    const mockCallMetrics: CallMetrics = {
      totalCalls: 1247,
      answeredCalls: 1175,
      missedCalls: 72,
      avgCallDuration: 272, // seconds
      avgWaitTime: 23, // seconds
      abandonRate: 5.8
    };

    const mockAgentPerformance: AgentPerformance[] = [
      {
        agentId: '1',
        agentName: 'Sarah Johnson',
        totalCalls: 156,
        avgCallDuration: 298,
        avgHandleTime: 325,
        conversionRate: 23.4,
        customerSatisfaction: 4.8
      },
      {
        agentId: '2',
        agentName: 'Michael Chen',
        totalCalls: 142,
        avgCallDuration: 245,
        avgHandleTime: 280,
        conversionRate: 19.7,
        customerSatisfaction: 4.6
      },
      {
        agentId: '3',
        agentName: 'Emily Rodriguez',
        totalCalls: 168,
        avgCallDuration: 312,
        avgHandleTime: 355,
        conversionRate: 21.4,
        customerSatisfaction: 4.9
      }
    ];

    const mockCampaignStats: CampaignStats[] = [
      {
        campaignId: '1',
        campaignName: 'Summer Promotion 2024',
        totalContacts: 5000,
        contactedContacts: 3245,
        connectedCalls: 1875,
        conversionRate: 18.5,
        revenue: 125000
      },
      {
        campaignId: '2',
        campaignName: 'Customer Retention',
        totalContacts: 2500,
        contactedContacts: 2100,
        connectedCalls: 1680,
        conversionRate: 35.2,
        revenue: 89000
      }
    ];

    setMetrics(mockMetrics);
    setCallMetrics(mockCallMetrics);
    setAgentPerformance(mockAgentPerformance);
    setCampaignStats(mockCampaignStats);
    setLoading(false);
  };

  const generateChartData = () => {
    // Generate hourly data for today
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => ({
      time: `${hour.toString().padStart(2, '0')}:00`,
      calls: Math.floor(Math.random() * 100) + 20,
      answered: Math.floor(Math.random() * 90) + 15,
      avgWaitTime: Math.floor(Math.random() * 60) + 10
    }));
  };

  const chartData = generateChartData();

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const exportReport = () => {
    // Implement export functionality
    console.log('Exporting report...');
  };

  const renderOverviewReport = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Icon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {metric.label}
                      </dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">
                          {metric.value}
                        </div>
                        <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                          metric.trend === 'up' ? 'text-slate-600' : 
                          metric.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {metric.trend === 'up' ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                          ) : metric.trend === 'down' ? (
                            <ArrowTrendingDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
                          ) : null}
                          {Math.abs(metric.change)}%
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Call Volume Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Call Volume Trends</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-sm">
              Hourly
            </button>
            <button className="px-3 py-1 text-gray-600 rounded text-sm hover:bg-gray-100">
              Daily
            </button>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} name="Total Calls" />
              <Line type="monotone" dataKey="answered" stroke="#10B981" strokeWidth={2} name="Answered" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent Performance Summary */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Performing Agents</h3>
        </div>
        <div className="overflow-hidden">
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
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Satisfaction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentPerformance.slice(0, 5).map((agent) => (
                <tr key={agent.agentId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {agent.agentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.totalCalls}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.conversionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{agent.customerSatisfaction}</div>
                      <div className="ml-2">
                        <div className="flex text-yellow-400">
                          {'★'.repeat(Math.floor(agent.customerSatisfaction))}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCallAnalytics = () => (
    <div className="space-y-6">
      {/* Call Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Call Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Answered', value: callMetrics?.answeredCalls || 0, fill: '#10B981' },
                    { name: 'Missed', value: callMetrics?.missedCalls || 0, fill: '#EF4444' },
                    { name: 'Abandoned', value: Math.floor((callMetrics?.totalCalls || 0) * 0.058), fill: '#F59E0B' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label
                >
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Average Wait Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="avgWaitTime" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Call Metrics Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detailed Call Metrics</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{callMetrics?.totalCalls}</div>
              <div className="text-sm text-gray-500">Total Calls</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-600">{callMetrics?.answeredCalls}</div>
              <div className="text-sm text-gray-500">Answered Calls</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{callMetrics?.missedCalls}</div>
              <div className="text-sm text-gray-500">Missed Calls</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {formatDuration(callMetrics?.avgCallDuration || 0)}
              </div>
              <div className="text-sm text-gray-500">Avg Call Duration</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {callMetrics?.avgWaitTime}s
              </div>
              <div className="text-sm text-gray-500">Avg Wait Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{callMetrics?.abandonRate}%</div>
              <div className="text-sm text-gray-500">Abandon Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAgentPerformance = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Agent Performance Metrics</h3>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Call Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Handle Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Satisfaction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agentPerformance.map((agent) => (
                <tr key={agent.agentId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.totalCalls}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(agent.avgCallDuration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(agent.avgHandleTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      agent.conversionRate >= 20 
                        ? 'bg-green-100 text-slate-800'
                        : agent.conversionRate >= 15
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {agent.conversionRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="text-sm text-gray-900">{agent.customerSatisfaction}</div>
                      <div className="ml-2 flex text-yellow-400">
                        {'★'.repeat(Math.floor(agent.customerSatisfaction))}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCampaignReports = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
        </div>
        <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Contacts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Connected
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaignStats.map((campaign) => (
                <tr key={campaign.campaignId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{campaign.campaignName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.totalContacts.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.contactedContacts.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {campaign.connectedCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      campaign.conversionRate >= 25 
                        ? 'bg-green-100 text-slate-800'
                        : campaign.conversionRate >= 15
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {campaign.conversionRate}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${campaign.revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'overview':
        return renderOverviewReport();
      case 'call_analytics':
        return renderCallAnalytics();
      case 'agent_performance':
        return renderAgentPerformance();
      case 'campaign_reports':
        return renderCampaignReports();
      default:
        return (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <DocumentChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {reportTypes.find(r => r.id === selectedReport)?.name}
            </h3>
            <p className="text-gray-500 mb-4">
              {reportTypes.find(r => r.id === selectedReport)?.description}
            </p>
            <p className="text-sm text-gray-400">
              This report module is ready for implementation.
            </p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <span>Admin</span>
            <span>/</span>
            <span>Reports</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <ChartBarIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive performance insights and reporting</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              {timePeriods.map(period => (
                <option key={period.id} value={period.id}>
                  {period.label}
                </option>
              ))}
            </select>
            <button
              onClick={exportReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Report Categories</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {reportTypes.map(report => {
            const Icon = report.icon;
            const isSelected = selectedReport === report.id;
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'border-slate-500 bg-slate-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`h-6 w-6 mx-auto mb-2 ${
                  isSelected ? 'text-slate-600' : 'text-gray-400'
                }`} />
                <div className={`text-sm font-medium ${
                  isSelected ? 'text-slate-900' : 'text-gray-900'
                }`}>
                  {report.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {report.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Report Content */}
      {renderReportContent()}
    </div>
  );
};

export default ReportsSystem;