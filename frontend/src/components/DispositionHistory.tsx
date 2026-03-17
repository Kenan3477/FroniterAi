// Disposition History and Statistics Component
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, DollarSign, Star, Target, Download } from 'lucide-react';

interface DispositionStats {
  totalDispositions: number;
  byCategory: Record<string, number>;
  byOutcome: Record<string, number>;
  byType: Record<string, number>;
  totalSales: number;
  totalSaleAmount: number;
  averageCallDuration: number;
  qaRequired: number;
  qaCompleted: number;
  averageQAScore: number;
  conversionRate: number;
  averageSaleAmount: number;
  qaCompletionRate: number;
}

interface DispositionHistoryProps {
  agentId?: string;
  campaignId?: string;
  className?: string;
}

const DispositionHistory: React.FC<DispositionHistoryProps> = ({
  agentId,
  campaignId,
  className = ''
}) => {
  const [stats, setStats] = useState<DispositionStats | null>(null);
  const [dispositions, setDispositions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 7 days
    endDate: new Date().toISOString().split('T')[0], // Today
  });
  const [view, setView] = useState<'stats' | 'history'>('stats');

  useEffect(() => {
    fetchData();
  }, [agentId, campaignId, dateRange]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStats(), fetchDispositions()]);
    } catch (error) {
      console.error('Error fetching disposition data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (agentId) params.append('agentId', agentId);
      if (campaignId) params.append('campaignId', campaignId);
      if (dateRange.startDate) params.append('startDate', `${dateRange.startDate}T00:00:00.000Z`);
      if (dateRange.endDate) params.append('endDate', `${dateRange.endDate}T23:59:59.999Z`);

      const response = await fetch(`/api/dispositions/reports/summary?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching disposition stats:', error);
    }
  };

  const fetchDispositions = async () => {
    try {
      const endpoint = agentId 
        ? `/api/dispositions/agent/${agentId}?limit=50`
        : campaignId 
        ? `/api/dispositions/campaign/${campaignId}?limit=50`
        : '/api/dispositions?limit=50';

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDispositions(data.data.dispositions || data.data);
      }
    } catch (error) {
      console.error('Error fetching dispositions:', error);
    }
  };

  const exportDispositions = async () => {
    try {
      const params = new URLSearchParams();
      if (agentId) params.append('agentId', agentId);
      if (campaignId) params.append('campaignId', campaignId);
      if (dateRange.startDate) params.append('startDate', `${dateRange.startDate}T00:00:00.000Z`);
      if (dateRange.endDate) params.append('endDate', `${dateRange.endDate}T23:59:59.999Z`);

      const response = await fetch(`/api/dispositions/exports/csv?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dispositions-${dateRange.startDate}-${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exporting dispositions:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'positive': return 'bg-green-100 text-slate-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'callback_required': return 'bg-yellow-100 text-yellow-800';
      case 'technical_issue': return 'bg-gray-100 text-gray-800';
      case 'quality_issue': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'bg-green-500';
      case 'failure': return 'bg-red-500';
      case 'pending': return 'bg-yellow-500';
      case 'follow_up': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Disposition Analytics
          </h3>
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-md">
              <button
                onClick={() => setView('stats')}
                className={`px-3 py-1 text-sm rounded-md ${
                  view === 'stats' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Statistics
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-3 py-1 text-sm rounded-md ${
                  view === 'history' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                History
              </button>
            </div>

            {/* Export Button */}
            <button
              onClick={exportDispositions}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Date Range Controls */}
        <div className="mt-3 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">From:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">To:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {view === 'stats' ? (
          /* Statistics View */
          <div>
            {stats ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Calls</p>
                        <p className="text-lg font-semibold text-blue-900">{stats.totalDispositions}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Target className="h-5 w-5 text-slate-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-slate-600">Conversion Rate</p>
                        <p className="text-lg font-semibold text-slate-900">{stats.conversionRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-600">Total Sales</p>
                        <p className="text-lg font-semibold text-purple-900">{formatCurrency(stats.totalSaleAmount)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-orange-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-600">Avg. Call Duration</p>
                        <p className="text-lg font-semibold text-orange-900">{formatDuration(stats.averageCallDuration)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">By Category</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.byCategory).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                            {category.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">By Outcome</h4>
                    <div className="space-y-2">
                      {Object.entries(stats.byOutcome).map(([outcome, count]) => (
                        <div key={outcome} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${getOutcomeColor(outcome)}`}></div>
                            <span className="text-sm text-gray-700">{outcome.replace('_', ' ').toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* QA Information */}
                {stats.qaRequired > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-3">Quality Assurance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{stats.qaRequired}</p>
                        <p className="text-sm text-gray-600">QA Required</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{stats.qaCompletionRate}%</p>
                        <p className="text-sm text-gray-600">Completion Rate</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{stats.averageQAScore}/10</p>
                        <p className="text-sm text-gray-600">Average Score</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No disposition data available for selected period</p>
              </div>
            )}
          </div>
        ) : (
          /* History View */
          <div>
            {dispositions.length > 0 ? (
              <div className="space-y-3">
                {dispositions.slice(0, 20).map((disposition) => (
                  <div key={disposition.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <div className="font-medium text-gray-900">{disposition.phoneNumber}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(disposition.dispositionTime).toLocaleString()}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(disposition.dispositionCategory)}`}>
                          {disposition.dispositionLabel}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatDuration(disposition.callDuration)}
                        </div>
                        {disposition.saleAmount && (
                          <div className="text-sm text-slate-600 font-medium">
                            {formatCurrency(disposition.saleAmount)}
                          </div>
                        )}
                        {disposition.leadScore && (
                          <div className="text-sm text-purple-600">
                            Lead: {disposition.leadScore}/10
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {disposition.notes && (
                      <div className="mt-2 text-sm text-gray-600 italic">
                        "{disposition.notes}"
                      </div>
                    )}
                    
                    {disposition.followUpDate && (
                      <div className="mt-2 text-sm text-blue-600">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Callback: {new Date(disposition.followUpDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
                
                {dispositions.length > 20 && (
                  <div className="text-center py-3">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Load more dispositions...
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No disposition history available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DispositionHistory;