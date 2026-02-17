'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  PhoneIcon,
  PlayIcon,
  PauseIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ClockIcon,
  UserIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Bars3Icon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface CallRecord {
  id: string;
  callId: string;
  campaignId: string;
  contactId: string;
  agentId?: string;
  phoneNumber: string;
  dialedNumber?: string;
  callType: 'inbound' | 'outbound' | 'manual';
  startTime: string;
  endTime?: string;
  duration?: number;
  outcome?: string;
  dispositionId?: string;
  notes?: string;
  recording?: string;
  transferTo?: string;
  
  // Related data
  agent?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  contact?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  campaign?: {
    name: string;
  };
  disposition?: {
    name: string;
    category: string;
  };
  recordingFile?: {
    id: string;
    fileName: string;
    filePath: string;
    fileSize?: number;
    duration?: number;
    format: string;
  };
}

interface CallRecordsFilters {
  dateFrom?: string;
  dateTo?: string;
  agentId?: string;
  campaignId?: string;
  outcome?: string;
  callType?: string;
  phoneNumber?: string;
  hasRecording?: boolean;
}

export const CallRecordsView: React.FC = () => {
  const { user } = useAuth();
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CallRecordsFilters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0]
  });
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'startTime' | 'duration' | 'outcome'>('startTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Outcome color mapping
  const outcomeColors: { [key: string]: string } = {
    'CONNECTED': 'bg-green-100 text-green-800',
    'NO_ANSWER': 'bg-yellow-100 text-yellow-800',
    'BUSY': 'bg-orange-100 text-orange-800',
    'FAILED': 'bg-red-100 text-red-800',
    'VOICEMAIL': 'bg-blue-100 text-blue-800',
    'TRANSFERRED': 'bg-purple-100 text-purple-800',
    'ABANDONED': 'bg-gray-100 text-gray-800',
  };

  const fetchCallRecords = async () => {
    try {
      console.log('📞 CallRecordsView - Starting fetchCallRecords...');
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      
      // Add filters to query
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.agentId) queryParams.append('agentId', filters.agentId);
      if (filters.campaignId) queryParams.append('campaignId', filters.campaignId);
      if (filters.outcome) queryParams.append('outcome', filters.outcome);
      if (filters.callType) queryParams.append('callType', filters.callType);
      if (filters.phoneNumber) queryParams.append('phoneNumber', filters.phoneNumber);
      if (filters.hasRecording) queryParams.append('hasRecording', 'true');
      if (searchTerm) queryParams.append('search', searchTerm);
      
      // Add pagination
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', pageSize.toString());
      
      // Add sorting
      queryParams.append('sortBy', sortBy);
      queryParams.append('sortOrder', sortOrder);

      console.log(`📞 CallRecordsView - Making API call to: /api/call-records?${queryParams}`);

      const response = await fetch(`/api/call-records?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log(`📞 CallRecordsView - API response status: ${response.status}`);

      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚨 AUTHENTICATION FAILURE - Force redirecting to reset auth');
          
          // Force complete logout and redirect - no demo data fallback
          localStorage.clear();
          sessionStorage.clear();
          
          // Show user message
          alert('Your session has expired. Please log in again to view call records.');
          
          // Force redirect to logout page to clear all cookies, then to login
          window.location.href = '/force-logout.html';
          return;
        }
        
        throw new Error(`Failed to fetch call records: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📞 CallRecordsView - API response data:`, data);
      
      if (data.success) {
        console.log(`📞 CallRecordsView - Setting ${data.records?.length || 0} call records`);
        setCallRecords(data.records || data.data || []);
        setTotalRecords(data.pagination?.total || data.total || 0);
        
        // Check if this is demo data from backend fallback
        if (data.message && data.message.includes('Demo data')) {
          console.warn('📝 Using demo data - Backend recording system not yet deployed');
        }
      } else {
        throw new Error(data.error || 'Failed to fetch call records');
      }
    } catch (err: any) {
      console.error('Error fetching call records:', err);
      setError(err.message || 'Failed to fetch call records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('📞 CallRecordsView - Component mounted, calling fetchCallRecords...');
    fetchCallRecords();
  }, [filters, searchTerm, sortBy, sortOrder, currentPage]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateTime: string): string => {
    return new Date(dateTime).toLocaleString();
  };

  const playTestRecording = async () => {
    try {
      console.log('🎵 Playing test recording...');
      const testStreamUrl = `/api/recordings/demo-1/stream`;
      
      if (audio) {
        audio.pause();
        setIsPlaying(null);
      }
      
      const audioElement = new Audio(testStreamUrl);
      
      audioElement.onloadstart = () => {
        console.log('🎵 Test audio loading...');
      };
      
      audioElement.oncanplay = () => {
        console.log('🎵 Test audio ready');
      };
      
      audioElement.onended = () => {
        console.log('🎵 Test audio ended');
        setIsPlaying(null);
        setAudio(null);
      };
      
      audioElement.onerror = (error) => {
        console.error('❌ Test audio error:', error);
        alert('❌ Failed to play test recording');
        setIsPlaying(null);
        setAudio(null);
      };

      setIsPlaying('test-recording');
      await audioElement.play();
      setAudio(audioElement);
      console.log('✅ Test recording playing');
      
    } catch (error) {
      console.error('❌ Test recording error:', error);
      alert(`❌ Test recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsPlaying(null);
    }
  };

  const playRecording = async (recordId: string, filePath?: string) => {
    try {
      if (audio) {
        audio.pause();
        setIsPlaying(null);
      }

      if (isPlaying === recordId) {
        setIsPlaying(null);
        return;
      }

      console.log('🎵 Starting recording playback for ID:', recordId);

      // Use the recording streaming endpoint for playback
      const streamUrl = `/api/recordings/${recordId}/stream`;
      
      // First, check if the recording is available
      console.log('🔍 Checking recording availability...');
      const checkResponse = await fetch(streamUrl, { method: 'HEAD' });
      
      if (!checkResponse.ok) {
        console.error('❌ Recording not available:', checkResponse.status, checkResponse.statusText);
        
        // Offer to play demo recording instead
        const useDemo = confirm(`❌ Recording not available (${checkResponse.status}). This may be because:
• The backend is unavailable
• The recording file doesn't exist  
• The recording hasn't been synced from Twilio yet

Would you like to play a demo recording instead to test audio functionality?`);
        
        if (useDemo) {
          return await playTestRecording();
        }
        return;
      }
      
      // Create audio element for playback
      const audioElement = new Audio(streamUrl);
      
      audioElement.onloadstart = () => {
        console.log('🎵 Audio loading started...');
      };
      
      audioElement.oncanplay = () => {
        console.log('🎵 Audio ready to play');
      };
      
      audioElement.onended = () => {
        console.log('🎵 Audio playback ended');
        setIsPlaying(null);
        setAudio(null);
      };
      
      audioElement.onerror = (error) => {
        console.error('❌ Error playing recording:', error);
        console.error('❌ Audio error details:', audioElement.error);
        
        let errorMessage = 'Unknown audio error';
        if (audioElement.error) {
          switch (audioElement.error.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Audio playback was aborted';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error occurred during audio loading';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio file is corrupted or in unsupported format';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported or file not found';
              break;
          }
        }
        
        alert(`❌ Cannot play recording: ${errorMessage}\n\nThis may be because:\n• The recording file doesn't exist\n• The backend service is unavailable\n• The audio format is not supported`);
        setIsPlaying(null);
        setAudio(null);
      };

      setIsPlaying(recordId);
      console.log('🎵 Starting audio playback...');
      
      try {
        await audioElement.play();
        setAudio(audioElement);
        console.log('✅ Audio playing successfully');
      } catch (playError) {
        console.error('❌ Play error:', playError);
        alert(`❌ Failed to start audio playback: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
        setIsPlaying(null);
      }
      
    } catch (error) {
      console.error('❌ Error in playRecording:', error);
      alert(`❌ Recording playback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsPlaying(null);
    }
  };

  const cleanupDemoRecords = async () => {
    if (!confirm('Are you sure you want to delete all demo records? This cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/debug/cleanup-demo-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Cleanup completed! Deleted: ${data.stats?.totalDeleted || 'unknown'} demo records.`);
        // Refresh the records
        fetchCallRecords();
      } else {
        alert(`❌ Cleanup failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Cleanup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const syncTwilioRecordings = async () => {
    if (!confirm('Sync all recordings from Twilio? This may take a few moments.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch('/api/debug/sync-twilio-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Twilio sync completed! Synced: ${data.stats?.synced || 'unknown'} recordings.`);
        // Refresh the records
        fetchCallRecords();
      } else {
        alert(`❌ Sync failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Call ID',
      'Agent',
      'Contact',
      'Phone Number',
      'Call Type',
      'Start Time',
      'Duration',
      'Outcome',
      'Campaign',
      'Notes'
    ];

    const csvData = callRecords.map(record => [
      record.callId,
      record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'N/A',
      record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'N/A',
      record.phoneNumber,
      record.callType,
      formatDateTime(record.startTime),
      formatDuration(record.duration),
      record.outcome || 'N/A',
      record.campaign?.name || 'N/A',
      record.notes || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `call-records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Call Records</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => fetchCallRecords()}
                className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Call Records</h1>
            <p className="text-gray-600">Comprehensive call history with recordings and analytics</p>
          </div>
          
          {/* Additional Sidebar Toggle for Reports Page */}
          <button
            onClick={() => {
              // Find the sidebar toggle function from the parent
              const headerToggle = document.querySelector('[title="Toggle sidebar for full-screen view"]') as HTMLButtonElement;
              if (headerToggle) {
                headerToggle.click();
              }
            }}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            title="Toggle sidebar for full-screen viewing"
          >
            <Bars3Icon className="h-4 w-4 mr-2" />
            Toggle Sidebar
          </button>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={playTestRecording}
            className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            disabled={isPlaying === 'test-recording'}
          >
            <PlayIcon className="h-4 w-4 mr-2" />
            {isPlaying === 'test-recording' ? 'Playing Test...' : '🎵 Test Audio'}
          </button>
          
          <button
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          
          {/* Demo Cleanup Button - ADMIN only */}
          {user?.role === 'ADMIN' && (
            <>
              <button
                onClick={cleanupDemoRecords}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
                disabled={loading}
              >
                🧹 Clean Demo Records
              </button>
              
              <button
                onClick={syncTwilioRecordings}
                className="inline-flex items-center px-4 py-2 border border-green-300 rounded-md shadow-sm text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                disabled={loading}
              >
                📥 Sync Twilio
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow">
        {/* Filter Header */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setFiltersCollapsed(!filtersCollapsed)}
        >
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            <span className="text-sm text-gray-500">
              ({Object.values(filters).filter(v => v !== undefined && v !== '').length} active)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFilters({
                  dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  dateTo: new Date().toISOString().split('T')[0]
                });
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
            {filtersCollapsed ? (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
        
        {/* Filter Content */}
        <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
          filtersCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
        }`}>
          <div className="px-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700">From Date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">To Date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Call Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Call Type</label>
            <select
              value={filters.callType || ''}
              onChange={(e) => setFilters({ ...filters, callType: e.target.value || undefined })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
              <option value="manual">Manual Dial</option>
            </select>
          </div>

          {/* Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Outcome</label>
            <select
              value={filters.outcome || ''}
              onChange={(e) => setFilters({ ...filters, outcome: e.target.value || undefined })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Outcomes</option>
              <option value="CONNECTED">Connected</option>
              <option value="NO_ANSWER">No Answer</option>
              <option value="BUSY">Busy</option>
              <option value="VOICEMAIL">Voicemail</option>
              <option value="FAILED">Failed</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="ABANDONED">Abandoned</option>
            </select>
          </div>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone number, agent name, or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-white px-6 py-4 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} call records
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">Sort by:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value="startTime">Date/Time</option>
                <option value="duration">Duration</option>
                <option value="outcome">Outcome</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <ArrowsUpDownIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Call Records Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Call Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Agent/Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Outcome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recording
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {callRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.phoneNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDateTime(record.startTime)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {record.callType.toUpperCase()} • {record.callId}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">
                      Agent: {record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'N/A'}
                    </div>
                    <div className="text-gray-500">
                      Contact: {record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {record.campaign?.name || 'Manual Dial'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                    {formatDuration(record.duration)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    outcomeColors[record.outcome || 'UNKNOWN'] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.outcome || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {record.recordingFile ? (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => playRecording(record.recordingFile!.id)}
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        {isPlaying === record.recordingFile.id ? (
                          <PauseIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <PlayIcon className="h-4 w-4 mr-1" />
                        )}
                        <span className="text-sm">
                          {isPlaying === record.recordingFile.id ? 'Playing' : 'Play'}
                        </span>
                      </button>
                      <a
                        href={`/api/recordings/${record.recordingFile.id}/download`}
                        download
                        className="flex items-center text-gray-600 hover:text-gray-800"
                        title="Download recording"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                      </a>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No recording</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => setSelectedRecord(record)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Call Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Call Record Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Call ID</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRecord.callId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedRecord.phoneNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Call Type</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">{selectedRecord.callType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDuration(selectedRecord.duration)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Outcome</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    outcomeColors[selectedRecord.outcome || 'UNKNOWN'] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedRecord.outcome || 'Unknown'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedRecord.agent ? `${selectedRecord.agent.firstName} ${selectedRecord.agent.lastName}` : 'N/A'}
                  </p>
                </div>
              </div>
              
              {selectedRecord.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedRecord.notes}</p>
                </div>
              )}
              
              {selectedRecord.recordingFile && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Recording</label>
                  <div className="mt-2 flex items-center space-x-3">
                    <button
                      onClick={() => playRecording(selectedRecord.recordingFile!.id)}
                      className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isPlaying === selectedRecord.recordingFile.id ? (
                        <PauseIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <PlayIcon className="h-4 w-4 mr-1" />
                      )}
                      {isPlaying === selectedRecord.recordingFile.id ? 'Pause' : 'Play Recording'}
                    </button>
                    <a
                      href={`/api/recordings/${selectedRecord.recordingFile.id}/download`}
                      download
                      className="flex items-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                      Download
                    </a>
                    <span className="text-sm text-gray-600">
                      {selectedRecord.recordingFile.format.toUpperCase()} • {formatDuration(selectedRecord.recordingFile.duration)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};