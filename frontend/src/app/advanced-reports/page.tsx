'use client';

import { useState, useEffect } from 'react';
import MainLayout from '../../../components/layout/MainLayout';
import { 
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  UserGroupIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  EyeIcon,
  ShareIcon,
  Cog6ToothIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';

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

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'sales' | 'operational' | 'quality';
  charts: Array<{
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    metrics: string[];
  }>;
  filters: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

interface CustomReport {
  id: string;
  name: string;
  dateRange: { start: Date; end: Date };
  metrics: string[];
  filters: { [key: string]: any };
  charts: Array<{
    id: string;
    type: 'line' | 'bar' | 'pie' | 'doughnut';
    title: string;
    data: any;
  }>;
  lastGenerated: Date;
}

const AdvancedReporting = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'builder' | 'templates' | 'scheduled'>('dashboard');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [customReports, setCustomReports] = useState<CustomReport[]>([]);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [reportBuilder, setReportBuilder] = useState({
    name: '',
    dateRange: { start: '', end: '' },
    metrics: [] as string[],
    filters: {} as { [key: string]: any },
    chartType: 'bar' as 'line' | 'bar' | 'pie' | 'doughnut'
  });

  const reportTemplates: ReportTemplate[] = [
    {
      id: '1',
      name: 'Daily Performance Summary',
      description: 'Overview of daily call center performance metrics',
      category: 'performance',
      charts: [
        { type: 'line', title: 'Call Volume Trend', metrics: ['total_calls', 'answered_calls'] },
        { type: 'bar', title: 'Agent Performance', metrics: ['calls_per_agent', 'conversion_rate'] },
        { type: 'pie', title: 'Call Outcomes', metrics: ['successful_calls', 'missed_calls', 'abandoned_calls'] }
      ],
      filters: ['date_range', 'agent', 'campaign'],
      schedule: { frequency: 'daily', recipients: ['manager@company.com'] }
    },
    {
      id: '2',
      name: 'Sales Performance Report',
      description: 'Comprehensive sales metrics and conversion analysis',
      category: 'sales',
      charts: [
        { type: 'line', title: 'Revenue Trend', metrics: ['daily_revenue', 'target_revenue'] },
        { type: 'bar', title: 'Conversion by Campaign', metrics: ['conversion_rate', 'lead_quality'] },
        { type: 'doughnut', title: 'Sales by Product', metrics: ['product_sales'] }
      ],
      filters: ['date_range', 'campaign', 'product', 'agent']
    },
    {
      id: '3',
      name: 'Quality Assurance Report',
      description: 'Call quality, customer satisfaction, and coaching metrics',
      category: 'quality',
      charts: [
        { type: 'line', title: 'Quality Scores Over Time', metrics: ['avg_quality_score'] },
        { type: 'bar', title: 'Agent Quality Comparison', metrics: ['agent_quality_scores'] },
        { type: 'pie', title: 'Coaching Categories', metrics: ['coaching_needed'] }
      ],
      filters: ['date_range', 'agent', 'quality_score_range']
    },
    {
      id: '4',
      name: 'Operational Efficiency',
      description: 'Resource utilization, wait times, and operational KPIs',
      category: 'operational',
      charts: [
        { type: 'line', title: 'Average Handle Time', metrics: ['avg_handle_time', 'target_handle_time'] },
        { type: 'bar', title: 'Agent Utilization', metrics: ['utilization_rate'] },
        { type: 'pie', title: 'Time Distribution', metrics: ['talk_time', 'hold_time', 'acw_time'] }
      ],
      filters: ['date_range', 'team', 'shift']
    }
  ];

  const availableMetrics = [
    { id: 'total_calls', name: 'Total Calls', category: 'volume' },
    { id: 'answered_calls', name: 'Answered Calls', category: 'volume' },
    { id: 'missed_calls', name: 'Missed Calls', category: 'volume' },
    { id: 'abandoned_calls', name: 'Abandoned Calls', category: 'volume' },
    { id: 'conversion_rate', name: 'Conversion Rate', category: 'performance' },
    { id: 'avg_handle_time', name: 'Average Handle Time', category: 'performance' },
    { id: 'quality_score', name: 'Quality Score', category: 'quality' },
    { id: 'customer_satisfaction', name: 'Customer Satisfaction', category: 'quality' },
    { id: 'revenue', name: 'Revenue', category: 'sales' },
    { id: 'cost_per_call', name: 'Cost per Call', category: 'financial' },
  ];

  const sampleChartData = {
    line: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          label: 'Total Calls',
          data: [120, 145, 132, 158, 167, 98, 76],
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Answered Calls',
          data: [115, 140, 128, 150, 160, 92, 70],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.3,
        }
      ],
    },
    bar: {
      labels: ['Sarah J.', 'Mike C.', 'Lisa R.', 'David P.', 'Emma W.'],
      datasets: [
        {
          label: 'Calls Made',
          data: [45, 52, 38, 41, 48],
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'Conversions',
          data: [12, 15, 8, 11, 14],
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
        }
      ],
    },
    pie: {
      labels: ['Successful', 'No Answer', 'Busy', 'Voicemail', 'Wrong Number'],
      datasets: [
        {
          data: [45, 25, 15, 10, 5],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(59, 130, 246, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    },
    doughnut: {
      labels: ['Insurance', 'Loans', 'Credit Cards', 'Investments'],
      datasets: [
        {
          data: [35, 28, 22, 15],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(249, 115, 22, 0.8)',
            'rgba(168, 85, 247, 0.8)',
          ],
          borderWidth: 1,
        },
      ],
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  const generateReport = () => {
    const newReport: CustomReport = {
      id: Date.now().toString(),
      name: reportBuilder.name || 'Custom Report',
      dateRange: {
        start: new Date(reportBuilder.dateRange.start),
        end: new Date(reportBuilder.dateRange.end)
      },
      metrics: reportBuilder.metrics,
      filters: reportBuilder.filters,
      charts: [
        {
          id: '1',
          type: reportBuilder.chartType,
          title: `${reportBuilder.chartType.charAt(0).toUpperCase() + reportBuilder.chartType.slice(1)} Chart`,
          data: sampleChartData[reportBuilder.chartType]
        }
      ],
      lastGenerated: new Date()
    };

    setCustomReports(prev => [...prev, newReport]);
    setIsCreatingReport(false);
    setReportBuilder({
      name: '',
      dateRange: { start: '', end: '' },
      metrics: [],
      filters: {},
      chartType: 'bar'
    });
  };

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // Simulate report export
    console.log(`Exporting report as ${format}`);
  };

  return (
    <MainLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Advanced Reporting</h1>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCreatingReport(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Report</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 mt-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
              { id: 'builder', label: 'Report Builder', icon: Cog6ToothIcon },
              { id: 'templates', label: 'Templates', icon: DocumentTextIcon },
              { id: 'scheduled', label: 'Scheduled Reports', icon: ClockIcon }
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-y-auto p-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Calls Today</p>
                      <p className="text-2xl font-bold text-gray-900">1,247</p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUpIcon className="w-3 h-3 mr-1" />
                        +8.2% from yesterday
                      </p>
                    </div>
                    <PhoneIcon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Conversion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">24.8%</p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUpIcon className="w-3 h-3 mr-1" />
                        +2.1% from last week
                      </p>
                    </div>
                    <TrendingUpIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Avg Handle Time</p>
                      <p className="text-2xl font-bold text-gray-900">6.4m</p>
                      <p className="text-sm text-red-600 flex items-center mt-1">
                        <TrendingDownIcon className="w-3 h-3 mr-1" />
                        +15s from target
                      </p>
                    </div>
                    <ClockIcon className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Revenue Today</p>
                      <p className="text-2xl font-bold text-gray-900">$28,450</p>
                      <p className="text-sm text-green-600 flex items-center mt-1">
                        <TrendingUpIcon className="w-3 h-3 mr-1" />
                        +12.5% from target
                      </p>
                    </div>
                    <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Call Volume Trend</h3>
                  <div className="h-80">
                    <Line data={sampleChartData.line} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
                  <div className="h-80">
                    <Bar data={sampleChartData.bar} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Call Outcomes</h3>
                  <div className="h-80">
                    <Pie data={sampleChartData.pie} options={chartOptions} />
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Sales by Product</h3>
                  <div className="h-80">
                    <Doughnut data={sampleChartData.doughnut} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'builder' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-6">Custom Report Builder</h2>

                  <div className="space-y-6">
                    {/* Report Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
                        <input
                          type="text"
                          value={reportBuilder.name}
                          onChange={(e) => setReportBuilder(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter report name"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                        <select
                          value={reportBuilder.chartType}
                          onChange={(e) => setReportBuilder(prev => ({ ...prev, chartType: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="bar">Bar Chart</option>
                          <option value="line">Line Chart</option>
                          <option value="pie">Pie Chart</option>
                          <option value="doughnut">Doughnut Chart</option>
                        </select>
                      </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input
                          type="date"
                          value={reportBuilder.dateRange.start}
                          onChange={(e) => setReportBuilder(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, start: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input
                          type="date"
                          value={reportBuilder.dateRange.end}
                          onChange={(e) => setReportBuilder(prev => ({ 
                            ...prev, 
                            dateRange: { ...prev.dateRange, end: e.target.value }
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Metrics Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Metrics</label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableMetrics.map((metric) => (
                          <label key={metric.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={reportBuilder.metrics.includes(metric.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setReportBuilder(prev => ({
                                    ...prev,
                                    metrics: [...prev.metrics, metric.id]
                                  }));
                                } else {
                                  setReportBuilder(prev => ({
                                    ...prev,
                                    metrics: prev.metrics.filter(m => m !== metric.id)
                                  }));
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{metric.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Preview */}
                    {reportBuilder.metrics.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Preview</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="h-64">
                            {reportBuilder.chartType === 'line' && <Line data={sampleChartData.line} options={chartOptions} />}
                            {reportBuilder.chartType === 'bar' && <Bar data={sampleChartData.bar} options={chartOptions} />}
                            {reportBuilder.chartType === 'pie' && <Pie data={sampleChartData.pie} options={chartOptions} />}
                            {reportBuilder.chartType === 'doughnut' && <Doughnut data={sampleChartData.doughnut} options={chartOptions} />}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        onClick={generateReport}
                        disabled={!reportBuilder.name || reportBuilder.metrics.length === 0}
                        className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        <CheckIcon className="w-4 h-4" />
                        <span>Generate Report</span>
                      </button>
                      
                      <button className="flex items-center space-x-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                        <DocumentTextIcon className="w-4 h-4" />
                        <span>Save as Template</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportTemplates.map((template) => (
                  <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.category === 'performance' ? 'bg-blue-100 text-blue-700' :
                        template.category === 'sales' ? 'bg-green-100 text-green-700' :
                        template.category === 'quality' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {template.category}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Charts Included</h4>
                        <ul className="mt-1 space-y-1">
                          {template.charts.map((chart, index) => (
                            <li key={index} className="text-xs text-gray-500 flex items-center">
                              <ChartBarIcon className="w-3 h-3 mr-1" />
                              {chart.title}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {template.schedule && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700">Scheduled</h4>
                          <p className="text-xs text-gray-500 capitalize">{template.schedule.frequency}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 mt-6">
                      <button className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                        <EyeIcon className="w-4 h-4" />
                        <span>Use Template</span>
                      </button>
                      <button className="px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50">
                        <ShareIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="h-full overflow-y-auto p-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">Scheduled Reports</h2>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {reportTemplates
                      .filter(template => template.schedule)
                      .map((template) => (
                        <div key={template.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <h3 className="font-medium text-gray-900">{template.name}</h3>
                            <p className="text-sm text-gray-500">
                              Sent {template.schedule!.frequency} to {template.schedule!.recipients.join(', ')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              Last sent: December 14, 2025 at 9:00 AM
                            </p>
                          </div>

                          <div className="flex items-center space-x-3">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              Active
                            </span>
                            <button className="text-gray-400 hover:text-gray-600">
                              <Cog6ToothIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create Report Modal */}
        {isCreatingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Quick Report</h3>
                <button
                  onClick={() => setIsCreatingReport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Report name"
                  value={reportBuilder.name}
                  onChange={(e) => setReportBuilder(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={reportBuilder.dateRange.start}
                    onChange={(e) => setReportBuilder(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="date"
                    value={reportBuilder.dateRange.end}
                    onChange={(e) => setReportBuilder(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={generateReport}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Generate
                  </button>
                  <button
                    onClick={() => setActiveTab('builder')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Advanced
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AdvancedReporting;