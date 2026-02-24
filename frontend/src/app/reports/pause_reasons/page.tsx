'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChartBarIcon, ClockIcon, UserIcon, CalendarIcon } from '@heroicons/react/24/outline';

interface PauseEvent {
  id: string;
  agentId: string;
  agent: {
    firstName: string;
    lastName: string;
    username: string;
  };
  eventType: string;
  pauseReason: string;
  pauseCategory: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  agentComment: string | null;
  createdAt: string;
}

interface PauseStats {
  totalEvents: number;
  totalDuration: number;
  averageDuration: number;
  byCategory: Record<string, number>;
  byReason: Record<string, number>;
  byAgent: Record<string, { count: number; duration: number; agent: any }>;
}

type DateFilter = 'today' | 'week' | 'month' | 'custom';
type GroupBy = 'agent' | 'reason' | 'category' | 'hour';

export default function PauseReasonsAnalysis() {
  const { user } = useAuth();
  const [pauseEvents, setPauseEvents] = useState<PauseEvent[]>([]);
  const [stats, setStats] = useState<PauseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [groupBy, setGroupBy] = useState<GroupBy>('agent');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Available filter options
  const [agents, setAgents] = useState<any[]>([]);
  const categories = ['personal', 'scheduled', 'work', 'technical', 'other'];
  const reasons = [
    'Toilet Break', 'Lunch Time', 'Break Time', 'Home Time', 'Training', 
    'Meeting', 'Technical Issue', 'System Issue', 'Personal Call'
  ];

  useEffect(() => {
    loadPauseEvents();
    loadAgents();
  }, [dateFilter, selectedAgent, selectedCategory, startDate, endDate]);

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('omnivox_token') || localStorage.getItem('authToken')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const loadPauseEvents = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      // Date filtering
      const now = new Date();
      let startDateTime: Date;
      let endDateTime = now;

      switch (dateFilter) {
        case 'today':
          startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDateTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDateTime = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'custom':
          if (startDate && endDate) {
            startDateTime = new Date(startDate);
            endDateTime = new Date(endDate);
          } else {
            startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          }
          break;
        default:
          startDateTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      params.append('startDate', startDateTime.toISOString());
      params.append('endDate', endDateTime.toISOString());
      
      if (selectedAgent) params.append('agentId', selectedAgent);
      if (selectedCategory) params.append('category', selectedCategory);

      const [eventsResponse, statsResponse] = await Promise.all([
        fetch(`/api/pause-events?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('omnivox_token') || localStorage.getItem('authToken')}`
          }
        }),
        fetch(`/api/pause-events/stats?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('omnivox_token') || localStorage.getItem('authToken')}`
          }
        })
      ]);

      if (!eventsResponse.ok) {
        throw new Error(`Failed to load pause events: ${eventsResponse.status}`);
      }

      if (!statsResponse.ok) {
        throw new Error(`Failed to load pause statistics: ${statsResponse.status}`);
      }

      const eventsData = await eventsResponse.json();
      const statsData = await statsResponse.json();

      setPauseEvents(eventsData.data || []);
      setStats(statsData.data || null);

    } catch (error) {
      console.error('Error loading pause data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load pause data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getDateRangeText = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'Last 7 Days';
      case 'month': return 'This Month';
      case 'custom': return startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Range';
      default: return 'Today';
    }
  };

  const renderStatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">Total Breaks</h3>
            <p className="text-2xl font-semibold text-gray-900">{stats?.totalEvents || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <ClockIcon className="h-6 w-6 text-green-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">Total Time</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatDuration(stats?.totalDuration || 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <CalendarIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">Avg Duration</h3>
            <p className="text-2xl font-semibold text-gray-900">{formatDuration(stats?.averageDuration || 0)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className="p-3 bg-purple-100 rounded-lg">
            <UserIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">Active Agents</h3>
            <p className="text-2xl font-semibold text-gray-900">{stats ? Object.keys(stats.byAgent).length : 0}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBreakdownChart = () => {
    if (!stats) return null;

    let data: Array<{ label: string; count: number; duration: number }> = [];

    switch (groupBy) {
      case 'agent':
        data = Object.entries(stats.byAgent).map(([agentId, data]) => ({
          label: `${data.agent?.firstName} ${data.agent?.lastName}`,
          count: data.count,
          duration: data.duration
        }));
        break;
      case 'reason':
        data = Object.entries(stats.byReason).map(([reason, count]) => ({
          label: reason,
          count: count,
          duration: 0 // Would need to calculate from raw data
        }));
        break;
      case 'category':
        data = Object.entries(stats.byCategory).map(([category, count]) => ({
          label: category,
          count: count,
          duration: 0 // Would need to calculate from raw data
        }));
        break;
    }

    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Breakdown by {groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}</h3>
        <div className="space-y-4">
          {data.slice(0, 10).map((item, index) => {
            const maxCount = Math.max(...data.map(d => d.count));
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-700 truncate">
                  {item.label}
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{item.count}</span>
                    </div>
                  </div>
                </div>
                <div className="w-20 text-sm text-gray-500 text-right">
                  {formatDuration(item.duration)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Report</h3>
            <p className="text-sm text-red-700 mt-2">{error}</p>
            <button
              onClick={loadPauseEvents}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pause Reasons Analysis</h1>
        <p className="text-gray-600">Monitor agent break patterns and productivity metrics</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {dateFilter === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="agent">Agent</option>
              <option value="reason">Reason</option>
              <option value="category">Category</option>
              <option value="hour">Hour</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing data for: <span className="font-medium">{getDateRangeText()}</span>
          </p>
          <button
            onClick={loadPauseEvents}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {renderStatsCards()}

      {/* Breakdown Chart */}
      {renderBreakdownChart()}

      {/* Detailed Events Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Pause Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comment</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pauseEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No pause events found for the selected criteria
                  </td>
                </tr>
              ) : (
                pauseEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {event.agent?.firstName} {event.agent?.lastName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {event.pauseReason}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        event.pauseCategory === 'personal' ? 'bg-blue-100 text-blue-800' :
                        event.pauseCategory === 'scheduled' ? 'bg-green-100 text-green-800' :
                        event.pauseCategory === 'work' ? 'bg-purple-100 text-purple-800' :
                        event.pauseCategory === 'technical' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.pauseCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDateTime(event.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {event.endTime ? formatDuration(event.duration) : 'Active'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {event.agentComment || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}