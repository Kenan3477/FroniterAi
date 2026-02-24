import React, { useState, useEffect } from 'react';
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

interface PauseReasonsReportProps {
  startDate?: string;
  endDate?: string;
}

export const PauseReasonsReport: React.FC<PauseReasonsReportProps> = ({ 
  startDate, 
  endDate 
}) => {
  const [pauseEvents, setPauseEvents] = useState<PauseEvent[]>([]);
  const [stats, setStats] = useState<PauseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPauseData();
  }, [startDate, endDate]);

  const loadPauseData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) {
        // Ensure endDate includes the full day by setting time to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        params.append('endDate', endDateTime.toISOString());
      }
      
      // Use cookie-based authentication instead of Authorization headers
      const [eventsResponse, statsResponse] = await Promise.all([
        fetch(`/api/pause-events?${params.toString()}`, {
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/pause-events/stats?${params.toString()}`, {
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!eventsResponse.ok || !statsResponse.ok) {
        console.error('API responses not OK:', {
          events: eventsResponse.status,
          stats: statsResponse.status
        });
        throw new Error(`Failed to load pause data: Events ${eventsResponse.status}, Stats ${statsResponse.status}`);
      }

      const eventsData = await eventsResponse.json();
      const statsData = await statsResponse.json();

      const events = eventsData.data || eventsData || [];
      setPauseEvents(Array.isArray(events) ? events : []);
      setStats(statsData.data || statsData.stats || statsData || null);

      console.log('📊 Inline pause report loaded:', {
        eventsCount: Array.isArray(events) ? events.length : 'Not an array',
        statsData: statsData,
        events: events
      });

    } catch (error) {
      console.error('Error loading pause data:', error);
      setError('Failed to load pause data');
      setPauseEvents([]);
      setStats(null);
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

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-gray-200 rounded-lg h-24"></div>
            ))}
          </div>
          <div className="bg-gray-200 rounded-lg h-64"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg mb-2">⚠️ Error Loading Pause Data</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadPauseData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Pause Reasons Analysis</h2>
        <p className="text-sm text-gray-600">Agent break patterns and productivity metrics</p>
      </div>

      {/* Stats Cards */}
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
              <p className="text-2xl font-semibold text-gray-900">{stats && stats.byAgent ? Object.keys(stats.byAgent).length : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Pause Events</h3>
        </div>
        <div className="overflow-hidden">
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
              {!Array.isArray(pauseEvents) || pauseEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No pause events found for the selected criteria
                  </td>
                </tr>
              ) : (
                Array.isArray(pauseEvents) && pauseEvents.map((event) => (
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
                        event.pauseCategory === 'technical' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.pauseCategory || 'Other'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDateTime(event.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDuration(event.duration)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
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
};