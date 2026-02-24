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
  XMarkIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status?: string;
}

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

interface TranscriptData {
  callId: string;
  status: 'completed' | 'processing' | 'not_started' | 'failed';
  message?: string;
  estimatedCompletion?: string;
  call?: {
    id: string;
    phoneNumber: string;
    startTime: string;
    duration?: number;
    outcome?: string;
    agent?: {
      firstName: string;
      lastName: string;
    };
    contact?: {
      firstName: string;
      lastName: string;
    };
    campaign?: {
      name: string;
    };
  };
  transcript?: {
    text: string;
    segments?: TranscriptSegment[];
    confidence?: number;
    language?: string;
    wordCount?: number;
    processingProvider?: string;
  };
  analysis?: {
    summary?: string;
    sentimentScore?: number;
    complianceFlags?: ComplianceFlag[];
    keyObjections?: string[];
    callOutcome?: string;
  };
  analytics?: {
    agentTalkRatio?: number;
    customerTalkRatio?: number;
    longestMonologue?: number;
    silenceDuration?: number;
    interruptions?: number;
    scriptAdherence?: number;
  };
  metadata?: {
    processingTime?: number;
    processingCost?: number;
    processingDate?: string;
    retentionExpires?: string;
    dataRegion?: string;
  };
}

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: 'agent' | 'customer';
  confidence?: number;
}

interface ComplianceFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp?: number;
  confidence: number;
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
  
  // Campaign filter data
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  
  // Transcript-related state
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedTranscriptCallId, setSelectedTranscriptCallId] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [transcriptView, setTranscriptView] = useState<'full' | 'summary' | 'analytics'>('full');

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

  const fetchAllCampaigns = async () => {
    try {
      // Use the same campaign filtering logic as AuthContext
      const response = await fetch('/api/campaigns/my-campaigns', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const data = await response.json();
      if (data.success) {
        // Apply the same organizational campaign filtering as AuthContext
        let campaigns = data.data || data.campaigns || [];
        
        // Filter out organizational/internal campaigns (case-insensitive)
        const filteredCampaigns = campaigns.filter((campaign: any) => {
          const name = campaign.displayName || campaign.name || '';
          const campaignId = campaign.campaignId || '';
          const nameLower = name.toLowerCase();
          const campaignIdLower = campaignId.toLowerCase();
          
          // Filter out deleted campaigns
          const isDeleted = nameLower.includes('[deleted]') || 
                          nameLower.includes('deleted') ||
                          campaign.status === 'ARCHIVED' ||
                          campaign.status === 'DELETED';
          
          // Filter out organizational campaigns
          const isOrganizationalCampaign = 
            // Exact campaign ID matches
            campaignIdLower === 'historical-calls' ||
            campaignIdLower === 'live-calls' ||
            campaignIdLower === 'imported-twilio' ||
            // Name-based filtering (case-insensitive)
            nameLower.includes('historical calls') ||
            nameLower.includes('historic calls') ||
            nameLower.includes('live calls') ||
            nameLower.includes('imported twilio') ||
            nameLower.includes('system') ||
            nameLower.includes('internal') ||
            // Additional organizational patterns
            nameLower.startsWith('__') ||
            nameLower.startsWith('sys_') ||
            nameLower.startsWith('org_') ||
            // Filter campaigns that are clearly organizational
            campaignIdLower.includes('system') ||
            campaignIdLower.includes('internal') ||
            campaignIdLower.includes('default') ||
            campaignIdLower.includes('template');
          
          console.log(`🔍 Campaign filter - ${campaignId}: name="${name}", isDeleted=${isDeleted}, isOrganizational=${isOrganizationalCampaign}`);
          return !isDeleted && !isOrganizationalCampaign;
        });
        
        setAllCampaigns(filteredCampaigns);
      } else {
        throw new Error(data.error || 'Failed to fetch campaigns');
      }
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
    }
  };

  useEffect(() => {
    console.log('📞 CallRecordsView - Component mounted, calling fetchCallRecords...');
    fetchCallRecords();
    fetchAllCampaigns();
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
      console.log('🎵 File path provided:', filePath);

      // Use the recording streaming endpoint for playback
      const streamUrl = `/api/recordings/${recordId}/stream`;
      
      console.log('🔍 Testing recording availability at:', streamUrl);
      
      // Create audio element for playback
      const audioElement = new Audio(streamUrl);
      
      audioElement.onloadstart = () => {
        console.log('🎵 Audio loading started...');
      };
      
      audioElement.oncanplay = () => {
        console.log('🎵 Audio ready to play');
      };
      
      audioElement.onerror = (error) => {
        console.error('❌ Audio element error:', error);
        console.error('❌ Audio error details:', audioElement.error);
        
        let errorMessage = 'Recording playback failed';
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
              errorMessage = 'Recording file not found or format not supported';
              break;
          }
        }
        
        alert(`❌ ${errorMessage}\n\nRecording ID: ${recordId}\nStream URL: ${streamUrl}\nFile Path: ${filePath}\n\nThis may be because:\n• The recording hasn't been synced from Twilio\n• The recording file has been deleted\n• The backend service is unavailable`);
        setIsPlaying(null);
        setAudio(null);
      };
      
      audioElement.onended = () => {
        console.log('🎵 Audio playback ended');
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
        alert(`❌ Failed to start audio playback\n\nError: ${playError instanceof Error ? playError.message : 'Unknown error'}\n\nRecording ID: ${recordId}`);
        setIsPlaying(null);
      }
      
    } catch (error) {
      console.error('❌ Error in playRecording function:', error);
      alert(`❌ Recording playback failed\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\n\nRecording ID: ${recordId}`);
      setIsPlaying(null);
    }
  };

  const fetchTranscript = async (callId: string) => {
    setTranscriptLoading(true);
    setTranscriptError(null);
    setSelectedTranscriptCallId(callId);
    setShowTranscriptModal(true);

    try {
      console.log(`📝 Fetching transcript for call: ${callId} (format: ${transcriptView})`);
      
      const response = await fetch(`/api/calls/${callId}/transcript?format=${transcriptView}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const transcript = await response.json();
      setTranscriptData(transcript);
      
      console.log('✅ Transcript loaded successfully:', transcript.status);

    } catch (error) {
      console.error('❌ Error fetching transcript:', error);
      setTranscriptError(error instanceof Error ? error.message : 'Failed to load transcript');
    } finally {
      setTranscriptLoading(false);
    }
  };

  // Effect to refetch transcript when view changes
  useEffect(() => {
    if (showTranscriptModal && selectedTranscriptCallId) {
      fetchTranscript(selectedTranscriptCallId);
    }
  }, [transcriptView]); // Re-fetch when view changes

  const formatSentimentScore = (score?: number): { text: string; color: string } => {
    if (score === undefined || score === null) {
      return { text: 'Unknown', color: 'text-gray-500' };
    }
    
    if (score >= 0.7) return { text: 'Positive', color: 'text-green-600' };
    if (score >= 0.3) return { text: 'Neutral', color: 'text-yellow-600' };
    return { text: 'Negative', color: 'text-red-600' };
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const closeTranscriptModal = () => {
    setShowTranscriptModal(false);
    setSelectedTranscriptCallId(null);
    setTranscriptData(null);
    setTranscriptError(null);
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

  // Removed syncTwilioRecordings and exportToCSV functions as requested

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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Call Records</h1>
          <p className="text-gray-600">Comprehensive call history with recordings and analytics</p>
        </div>
        {/* Removed Export CSV, Clean Demo Records, and Sync Twilio buttons as requested */}
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
          
          {/* Campaign Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Campaign</label>
            <select
              value={filters.campaignId || ''}
              onChange={(e) => setFilters({ ...filters, campaignId: e.target.value || undefined })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Campaigns</option>
              {allCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
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
                        onClick={() => {
                          console.log('🎵 Debug - Full record:', record);
                          console.log('🎵 Debug - Recording file:', record.recordingFile);
                          playRecording(record.recordingFile!.id, record.recordingFile?.filePath);
                        }}
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
                      <button
                        onClick={() => fetchTranscript(record.id)}
                        className="flex items-center text-purple-600 hover:text-purple-800"
                        title="View transcript"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                      </button>
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
                      onClick={() => {
                        console.log('🎵 Modal Debug - Using recording ID:', selectedRecord.recordingFile!.id);
                        playRecording(selectedRecord.recordingFile!.id, selectedRecord.recordingFile?.filePath);
                      }}
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
                    <button
                      onClick={() => {
                        setSelectedRecord(null); // Close this modal first
                        fetchTranscript(selectedRecord.id);
                      }}
                      className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-1" />
                      Transcript
                    </button>
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

      {/* Transcript Modal */}
      {showTranscriptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Call Transcript</h2>
                {selectedTranscriptCallId && (
                  <span className="text-sm text-gray-500">Call: {selectedTranscriptCallId}</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {/* View Toggle */}
                <div className="flex rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setTranscriptView('full')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      transcriptView === 'full' 
                        ? 'bg-white text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Full
                  </button>
                  <button
                    onClick={() => setTranscriptView('summary')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      transcriptView === 'summary' 
                        ? 'bg-white text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setTranscriptView('analytics')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      transcriptView === 'analytics' 
                        ? 'bg-white text-purple-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Analytics
                  </button>
                </div>
                <button
                  onClick={closeTranscriptModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {transcriptLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading transcript...</p>
                  </div>
                </div>
              ) : transcriptError ? (
                <div className="text-center py-12">
                  <div className="text-red-600 mb-4">
                    <XMarkIcon className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Transcript Error</h3>
                  <p className="text-gray-600 mb-4">{transcriptError}</p>
                  <button
                    onClick={() => selectedTranscriptCallId && fetchTranscript(selectedTranscriptCallId)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    Retry
                  </button>
                </div>
              ) : transcriptData?.status === 'not_started' || transcriptData?.status === 'processing' ? (
                <div className="text-center py-12">
                  <div className="text-yellow-600 mb-4">
                    <ClockIcon className="h-12 w-12 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {transcriptData.status === 'processing' ? 'Transcription in Progress' : 'Transcription Not Started'}
                  </h3>
                  <p className="text-gray-600 mb-2">{transcriptData.message}</p>
                  {transcriptData.estimatedCompletion && (
                    <p className="text-sm text-gray-500">Estimated completion: {transcriptData.estimatedCompletion}</p>
                  )}
                </div>
              ) : transcriptData && (
                <div>
                  {transcriptView === 'full' && (
                    <div className="space-y-6">
                      {/* Call Information */}
                      {transcriptData.call && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">Call Details</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Phone:</span> {transcriptData.call.phoneNumber}
                            </div>
                            <div>
                              <span className="text-gray-500">Duration:</span> {formatDuration(transcriptData.call.duration)}
                            </div>
                            <div>
                              <span className="text-gray-500">Agent:</span> {transcriptData.call.agent ? 
                                `${transcriptData.call.agent.firstName} ${transcriptData.call.agent.lastName}` : 'N/A'
                              }
                            </div>
                            <div>
                              <span className="text-gray-500">Outcome:</span> {transcriptData.call.outcome}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Analytics */}
                      {transcriptData.analysis && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Insights</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Sentiment:</span>
                              <span className={`ml-2 font-medium ${formatSentimentScore(transcriptData.analysis.sentimentScore).color}`}>
                                {formatSentimentScore(transcriptData.analysis.sentimentScore).text}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Call Outcome:</span>
                              <span className="ml-2 font-medium">{transcriptData.analysis.callOutcome}</span>
                            </div>
                          </div>
                          {transcriptData.analysis.summary && (
                            <div className="mt-3">
                              <span className="text-gray-500">Summary:</span>
                              <p className="mt-1 text-gray-700">{transcriptData.analysis.summary}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Full Transcript */}
                      {transcriptData.transcript && (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">Full Transcript</h3>
                          
                          {/* Transcript Metadata */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-600">
                            <div className="flex items-center justify-between">
                              <div>
                                <span>Words: {transcriptData.transcript.wordCount || 'N/A'}</span>
                                <span className="ml-4">Confidence: {transcriptData.transcript.confidence ? 
                                  `${Math.round(transcriptData.transcript.confidence * 100)}%` : 'N/A'}
                                </span>
                              </div>
                              <div>
                                Provider: {transcriptData.transcript.processingProvider || 'OpenAI'}
                              </div>
                            </div>
                          </div>

                          {/* Segmented Transcript */}
                          {transcriptData.transcript.segments && transcriptData.transcript.segments.length > 0 ? (
                            <div className="space-y-3">
                              {transcriptData.transcript.segments.map((segment, index) => (
                                <div key={segment.id || index} className="flex space-x-3">
                                  <div className="flex-shrink-0 text-xs text-gray-500 pt-1 w-12">
                                    {formatTimestamp(segment.start)}
                                  </div>
                                  <div className="flex-shrink-0 text-xs font-medium pt-1 w-16">
                                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                                      segment.speaker === 'agent' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {segment.speaker === 'agent' ? 'Agent' : 'Customer'}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-gray-900">{segment.text}</p>
                                    {segment.confidence && segment.confidence < 0.8 && (
                                      <span className="text-xs text-yellow-600">Low confidence</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                              <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                                {transcriptData.transcript.text}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Compliance Flags */}
                      {transcriptData.analysis?.complianceFlags && transcriptData.analysis.complianceFlags.length > 0 && (
                        <div className="bg-red-50 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-red-900 mb-2">Compliance Alerts</h3>
                          <div className="space-y-2">
                            {transcriptData.analysis.complianceFlags.map((flag, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  flag.severity === 'CRITICAL' ? 'bg-red-200 text-red-800' :
                                  flag.severity === 'HIGH' ? 'bg-orange-200 text-orange-800' :
                                  flag.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                                  'bg-blue-200 text-blue-800'
                                }`}>
                                  {flag.severity}
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{flag.type.replace(/_/g, ' ')}</p>
                                  <p className="text-sm text-gray-600">{flag.description}</p>
                                  {flag.timestamp && (
                                    <p className="text-xs text-gray-500">At: {formatTimestamp(flag.timestamp)}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {transcriptView === 'summary' && transcriptData.analysis && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Call Summary</h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <p className="text-gray-900 leading-relaxed">
                            {transcriptData.analysis.summary || 'No summary available'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Sentiment Analysis</h4>
                          <div className={`text-2xl font-bold ${formatSentimentScore(transcriptData.analysis.sentimentScore).color}`}>
                            {formatSentimentScore(transcriptData.analysis.sentimentScore).text}
                          </div>
                          {transcriptData.analysis.sentimentScore !== undefined && (
                            <div className="text-sm text-gray-600 mt-1">
                              Score: {Math.round(transcriptData.analysis.sentimentScore * 100)}%
                            </div>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Call Outcome</h4>
                          <div className="text-lg font-medium text-gray-900">
                            {transcriptData.analysis.callOutcome || 'Unknown'}
                          </div>
                        </div>
                      </div>

                      {transcriptData.analysis.keyObjections && transcriptData.analysis.keyObjections.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Key Objections</h4>
                          <ul className="space-y-2">
                            {transcriptData.analysis.keyObjections.map((objection, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></span>
                                <span className="text-gray-700">{objection}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {transcriptView === 'analytics' && transcriptData.analytics && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-gray-900">Call Analytics</h3>
                      
                      {/* Talk Time Analysis */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Talk Time Distribution</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {transcriptData.analytics.agentTalkRatio ? 
                                `${Math.round(transcriptData.analytics.agentTalkRatio * 100)}%` : 'N/A'
                              }
                            </div>
                            <div className="text-sm text-gray-600">Agent Talk Time</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {transcriptData.analytics.customerTalkRatio ? 
                                `${Math.round(transcriptData.analytics.customerTalkRatio * 100)}%` : 'N/A'
                              }
                            </div>
                            <div className="text-sm text-gray-600">Customer Talk Time</div>
                          </div>
                        </div>
                      </div>

                      {/* Conversation Metrics */}
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Conversation Flow</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Longest Monologue</span>
                              <span className="font-medium">
                                {transcriptData.analytics.longestMonologue ? 
                                  formatDuration(transcriptData.analytics.longestMonologue) : 'N/A'
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Silence Duration</span>
                              <span className="font-medium">
                                {transcriptData.analytics.silenceDuration ? 
                                  formatDuration(transcriptData.analytics.silenceDuration) : 'N/A'
                                }
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Interruptions</span>
                              <span className="font-medium">
                                {transcriptData.analytics.interruptions || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Metrics</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Script Adherence</span>
                              <span className="font-medium">
                                {transcriptData.analytics.scriptAdherence ? 
                                  `${Math.round(transcriptData.analytics.scriptAdherence * 100)}%` : 'N/A'
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Processing Information */}
                      {transcriptData.metadata && (
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Processing Information</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            {transcriptData.metadata.processingTime && (
                              <div>Processing Time: {transcriptData.metadata.processingTime}ms</div>
                            )}
                            {transcriptData.metadata.processingCost && (
                              <div>Processing Cost: ${transcriptData.metadata.processingCost.toFixed(4)}</div>
                            )}
                            {transcriptData.metadata.processingDate && (
                              <div>Processed: {new Date(transcriptData.metadata.processingDate).toLocaleString()}</div>
                            )}
                            {transcriptData.metadata.dataRegion && (
                              <div>Data Region: {transcriptData.metadata.dataRegion}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};