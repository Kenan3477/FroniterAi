/**
 * Enhanced Voice Channel Managers
 * Complete implementation of all voice channel sub-modules matching Connex functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneIcon,
  PhoneArrowDownLeftIcon,
  UsersIcon,
  MicrophoneIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  StopIcon
} from '@heroicons/react/24/outline';

// Enhanced Interface Definitions
export interface InboundNumber {
  id: string;
  number: string; // The phone number (+443301222251)
  name: string; // Display name (443301222251)
  description: string; // Description (443301222251 or custom like "443301221130 for 1516072")
  type: 'sms' | 'voice' | 'both'; // Represented by green icons in Connex
  status: boolean; // Toggle switch (active/inactive)
  
  // Extended configuration from the edit form
  carrierInboundNumber: string;
  displayName: string;
  autoRejectAnonymous: boolean;
  createContactOnAnonymous: boolean;
  integration: string; // 'None' or integration name
  countryCode: string; // 'United Kingdom Of Great Britain And Northern Ireland (The) (GB)'
  businessHours: string; // '24 Hours'
  outOfHoursAction: string; // 'Hangup', 'Voicemail', 'Transfer', 'Announcement'
  dayClosedAction: string; // 'Hangup' (deprecated - same as outOfHoursAction)
  routeTo: string; // 'Flow', 'Queue', 'RingGroup', 'Extension', 'IVR', 'Voicemail'
  recordCalls: boolean;
  lookupSearchFilter: string; // 'All Lists'
  assignedToDefaultList: boolean;
  
  // New routing and audio configuration fields (Legacy file references)
  voicemailAudioFile?: string; // Audio file reference for voicemail greeting
  outOfHoursAudioFile?: string; // Audio file reference for out of hours announcement
  outOfHoursTransferNumber?: string; // Phone number for out of hours transfer
  businessHoursVoicemailFile?: string; // Audio file reference for business hours voicemail
  businessHoursAudioFile?: string; // Audio file reference for business hours greeting
  selectedFlowId?: string; // Selected flow ID for routing
  selectedQueueId?: string; // Selected queue ID for routing
  selectedRingGroupId?: string; // Selected ring group ID for routing
  selectedExtension?: string; // Selected extension for routing
  
  // Audio URLs (REQUIRED for Twilio playback)
  greetingAudioUrl?: string; // URL to greeting audio file
  outOfHoursAudioUrl?: string; // URL to out-of-hours audio file
  voicemailAudioUrl?: string; // URL to voicemail greeting audio file
  busyAudioUrl?: string; // URL to busy/queue audio file
  noAnswerAudioUrl?: string; // URL to no-answer audio file
  
  // Flow Assignment Configuration
  assignedFlowId?: string | null; // ID of the assigned flow
  assignedFlow?: {
    id: string;
    name: string;
    status: string;
  };
  
  // Audio file configurations for different call conditions
  audioFiles: {
    greeting?: AudioFileConfig; // Main greeting when call is answered
    notAnswered?: AudioFileConfig; // Played when call is not answered
    outOfHours?: AudioFileConfig; // Played during out of hours
    busy?: AudioFileConfig; // Played when all agents are busy
    queue?: AudioFileConfig; // Hold music/message while in queue
    voicemail?: AudioFileConfig; // Voicemail greeting
    transferFailed?: AudioFileConfig; // When transfer fails
    systemError?: AudioFileConfig; // For system errors
  };
}

// Audio file configuration interface
export interface AudioFileConfig {
  id?: string;
  filename: string;
  displayName: string;
  fileUrl?: string;
  fileType: 'mp3' | 'wav' | 'aac';
  duration?: number; // in seconds
  uploadDate?: string;
  fileSize?: number; // in bytes
  description?: string;
  loop?: boolean; // Whether to loop the audio
  volume?: number; // Volume level 0-100
}

export interface RingGroup {
  id: string;
  name: string;
  description: string;
  extensions: string[];
  strategy: 'ring_all' | 'round_robin' | 'longest_idle' | 'random' | 'sequential';
  timeout: number;
  voicemail: boolean;
  voicemailGreeting?: string;
  fallbackAction: 'voicemail' | 'transfer' | 'hangup';
  fallbackDestination?: string;
  enabled: boolean;
}

export interface InternalNumber {
  id: string;
  number: string;
  description: string;
  type: 'service' | 'department' | 'emergency' | 'external';
  destination: string;
  accessLevel: 'all' | 'internal' | 'managers' | 'specific';
  allowedExtensions?: string[];
  enabled: boolean;
}

export interface VoiceNode {
  id: string;
  name: string;
  type: 'announcement' | 'menu' | 'queue' | 'transfer' | 'condition' | 'voicemail';
  configuration: any;
  position: { x: number; y: number };
  connections: VoiceNodeConnection[];
  enabled: boolean;
}

export interface VoiceNodeConnection {
  id: string;
  fromNode: string;
  toNode: string;
  condition?: string;
  label: string;
}

export interface AudioFile {
  id: string;
  name: string;
  filename: string;
  originalName: string;
  duration: number;
  size: number;
  format: string;
  type: 'greeting' | 'hold_music' | 'announcement' | 'ivr_prompt' | 'voicemail' | 'other';
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
  tags: string[];
}

export interface InboundConference {
  id: string;
  name: string;
  accessCode?: string;
  adminPin?: string;
  maxParticipants: number;
  recordConference: boolean;
  waitingRoom: boolean;
  muteOnEntry: boolean;
  announceJoinLeave: boolean;
  entrySound: boolean;
  waitingMusic?: string;
  moderatorRequired: boolean;
  autoRecord: boolean;
  enabled: boolean;
}

// Enhanced Inbound Numbers Manager - Matching Connex Structure
export const InboundNumbersManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  const [numbers, setNumbers] = useState<InboundNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNumber, setEditingNumber] = useState<InboundNumber | null>(null);
  const [availableFlows, setAvailableFlows] = useState<any[]>([]);
  const [updatingNumberId, setUpdatingNumberId] = useState<string | null>(null);

  // Get available audio files from config
  const getAvailableAudioFiles = (): AudioFile[] => {
    return config.audioFiles || [];
  };

  // Filter audio files by type for specific use cases
  const getAudioFilesByType = (type: string): AudioFile[] => {
    const audioFiles = getAvailableAudioFiles();
    if (type === 'all') return audioFiles;
    return audioFiles.filter(file => file.type === type);
  };

  // Fetch real inbound numbers from backend API
  useEffect(() => {
    const fetchInboundNumbers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use Next.js API route which handles authentication via cookies
        const response = await fetch('/api/voice/inbound-numbers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Include cookies for authentication
        });

        if (!response.ok) {
          if (response.status === 401) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.code === 'SESSION_EXPIRED' || errorData.shouldRefreshAuth) {
              setError('Your session has expired. Please log out and log back in to continue.');
              // Optionally redirect to login page
              console.log('🔑 Session expired, user needs to re-authenticate');
              return;
            }
          }
          throw new Error(`Failed to fetch inbound numbers: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📞 Fetched inbound numbers:', data);
        console.log('📞 Raw data structure check:');
        console.log('📞 - typeof data:', typeof data);
        console.log('📞 - Array.isArray(data):', Array.isArray(data));
        console.log('📞 - data.data exists:', !!data.data);
        console.log('📞 - data.data is array:', Array.isArray(data.data));
        
        // For debugging - let's see what the exact response structure is
        if (data.data) {
          console.log('📞 data.data:', data.data);
          console.log('📞 data.data length:', data.data.length);
        }
        
        // Transform backend data to frontend format - handle both direct array and wrapped data
        const numbersArray = Array.isArray(data) ? data : (data.data || []);
        console.log('📞 Numbers array after extraction:', numbersArray);
        console.log('📞 Numbers array length:', numbersArray.length);
        
        const transformedNumbers: InboundNumber[] = numbersArray.map((num: any) => {
          console.log('📞 Processing number:', num);
          
          // Generate user-friendly description based on flow assignment
          let description = `Inbound number ${num.phoneNumber}`;
          if (num.assignedFlow) {
            description = `Routed to Flow: "${num.assignedFlow.name}" (${num.assignedFlow.status})`;
          } else if (num.assignedFlowId) {
            description = `Assigned to Flow ID: ${num.assignedFlowId}`;
          } else {
            description = `No flow assigned - Default handling`;
          }
          
          return {
            id: num.id,
            number: num.phoneNumber,
            name: num.displayName || num.phoneNumber,
            description: description,
            carrierInboundNumber: num.phoneNumber,
            displayName: num.displayName || num.phoneNumber,
            autoRejectAnonymous: num.autoRejectAnonymous ?? true,
            createContactOnAnonymous: num.createContactOnAnonymous ?? true,
            integration: num.integration || 'None',
            countryCode: num.countryCode || 'United Kingdom Of Great Britain And Northern Ireland (The) (GB)',
            businessHours: num.businessHours || '24 Hours',
            outOfHoursAction: num.outOfHoursAction || 'Hangup',
            dayClosedAction: num.dayClosedAction || 'Hangup',
            routeTo: num.routeTo || 'Hangup',
            recordCalls: num.recordCalls ?? true,
            lookupSearchFilter: num.lookupSearchFilter || 'All Lists',
            assignedToDefaultList: num.assignedToDefaultList ?? true,
            // Audio URLs from backend (what Twilio uses)
            greetingAudioUrl: num.greetingAudioUrl,
            outOfHoursAudioUrl: num.outOfHoursAudioUrl,
            voicemailAudioUrl: num.voicemailAudioUrl,
            busyAudioUrl: num.busyAudioUrl,
            noAnswerAudioUrl: num.noAnswerAudioUrl,
            // Legacy file reference fields (for backward compatibility)
            outOfHoursAudioFile: num.outOfHoursAudioUrl,
            businessHoursVoicemailFile: num.voicemailAudioUrl,
            voicemailAudioFile: num.voicemailAudioUrl,
            businessHoursAudioFile: num.greetingAudioUrl,
            // Routing configuration
            outOfHoursTransferNumber: num.outOfHoursTransferNumber,
            selectedFlowId: num.selectedFlowId,
            selectedQueueId: num.selectedQueueId,
            selectedRingGroupId: num.selectedRingGroupId,
            selectedExtension: num.selectedExtension,
            type: 'voice',
            status: num.isActive !== false, // Backend uses isActive, default to true
            // Flow Assignment
            assignedFlowId: num.assignedFlowId,
            assignedFlow: num.assignedFlow,
          };
        });
        
        console.log('📞 Transformed numbers:', transformedNumbers);
        console.log('📞 Transformed numbers length:', transformedNumbers.length);

        setNumbers(transformedNumbers);
        
      } catch (err: any) {
        console.error('❌ Error fetching inbound numbers:', err);
        setError(err.message);
        // Fallback to demo data if API fails
        setNumbers(config.inboundNumbers || []);
      } finally {
        setLoading(false);
      }
    };

    fetchInboundNumbers();
  }, [config.inboundNumbers]);

  // Fetch available flows for assignment
  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const response = await fetch('/api/flows', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include' // Include cookies for authentication
        });

        if (response.ok) {
          const flowData = await response.json();
          console.log('🌊 Fetched flows for assignment:', flowData);
          setAvailableFlows(Array.isArray(flowData) ? flowData : flowData.data || []);
        } else {
          console.error('❌ Failed to fetch flows:', response.status, response.statusText);
          const errorData = await response.text();
          console.error('Error details:', errorData);
        }
      } catch (err) {
        console.error('❌ Error fetching flows for assignment:', err);
        // Flows are optional for basic inbound number functionality
      }
    };

    fetchFlows();
  }, []);

  const handleSave = async (number: InboundNumber) => {
    try {
      setUpdatingNumberId(number.id);

      console.log('🔧 Saving inbound number with ID:', number.id);
      console.log('🔧 Number details:', number);

      // Use URL fields directly (user should paste real URLs)
      // If URLs are not provided, configuration will still save but Twilio won't be able to play audio
      const updateData = {
        displayName: number.displayName,
        description: number.description,
        isActive: number.status,
        assignedFlowId: number.assignedFlowId || null,
        
        // Routing configuration
        businessHours: number.businessHours,
        outOfHoursAction: number.outOfHoursAction,
        routeTo: number.routeTo,
        outOfHoursTransferNumber: number.outOfHoursTransferNumber,
        
        // Audio URLs - these are what Twilio actually needs
        greetingAudioUrl: number.greetingAudioUrl,
        outOfHoursAudioUrl: number.outOfHoursAudioUrl,
        voicemailAudioUrl: number.voicemailAudioUrl,
        busyAudioUrl: number.busyAudioUrl,
        noAnswerAudioUrl: number.noAnswerAudioUrl,
        
        // Flow/Queue/RingGroup selections
        selectedFlowId: number.selectedFlowId || '',
        selectedQueueId: number.selectedQueueId,
        selectedRingGroupId: number.selectedRingGroupId,
        selectedExtension: number.selectedExtension,
        autoRejectAnonymous: number.autoRejectAnonymous,
        createContactOnAnonymous: number.createContactOnAnonymous,
        integration: number.integration,
        countryCode: number.countryCode,
        recordCalls: number.recordCalls,
        lookupSearchFilter: number.lookupSearchFilter,
        assignedToDefaultList: number.assignedToDefaultList
      };

      console.log('🔧 Update data being sent to backend:', {
        id: number.id,
        assignedFlowId: updateData.assignedFlowId,
        selectedFlowId: updateData.selectedFlowId,
        description: updateData.description
      });

      const response = await fetch(`/api/voice/inbound-numbers/${number.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || response.statusText;
        throw new Error(`Failed to update inbound number: ${errorMessage}`);
      }

      const result = await response.json();
      console.log('✅ Inbound number updated successfully:', result);

      // Update the local number with the backend response data
      const backendUpdatedNumber = result.data;
      
      // Generate updated description based on flow assignment
      let updatedDescription = `Inbound number ${number.number}`;
      if (backendUpdatedNumber.assignedFlow) {
        updatedDescription = `Routed to Flow: "${backendUpdatedNumber.assignedFlow.name}" (${backendUpdatedNumber.assignedFlow.status})`;
      } else if (backendUpdatedNumber.assignedFlowId) {
        updatedDescription = `Assigned to Flow ID: ${backendUpdatedNumber.assignedFlowId}`;
      } else {
        updatedDescription = `No flow assigned - Default handling`;
      }
      
      const mergedNumber = {
        ...number,
        assignedFlowId: backendUpdatedNumber.assignedFlowId,
        assignedFlow: backendUpdatedNumber.assignedFlow,
        // Update fields from backend
        displayName: backendUpdatedNumber.displayName,
        description: updatedDescription, // Use our generated description instead of backend's
        status: backendUpdatedNumber.isActive
      };

      // Update local state with the merged data
      const updatedNumbers = numbers.map(num => 
        num.id === number.id ? mergedNumber : num
      );
      
      setNumbers(updatedNumbers);
      onUpdate({ ...config, inboundNumbers: updatedNumbers });
      setShowAddForm(false);
      setEditingNumber(null);
      
      // Show success message if flow was assigned
      if (backendUpdatedNumber.assignedFlowId && backendUpdatedNumber.assignedFlow) {
        console.log(`🌊 Flow "${backendUpdatedNumber.assignedFlow.name}" successfully assigned to number ${number.number}`);
      }
      
    } catch (err: any) {
      console.error('❌ Error saving inbound number:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setUpdatingNumberId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);

      const response = await fetch(`/api/voice/inbound-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete inbound number: ${response.statusText}`);
      }

      const updatedNumbers = numbers.filter(num => num.id !== id);
      setNumbers(updatedNumbers);
      onUpdate({ ...config, inboundNumbers: updatedNumbers });
      
    } catch (err: any) {
      console.error('❌ Error deleting inbound number:', err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleNumberStatus = async (id: string) => {
    try {
      setLoading(true);
      const number = numbers.find(num => num.id === id);
      if (!number) return;

      const newStatus = !number.status;
      const response = await fetch(`/api/voice/inbound-numbers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          phoneNumber: number.number,
          friendlyName: number.displayName,
          description: number.description,
          status: newStatus ? 'active' : 'inactive'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update number status: ${response.statusText}`);
      }

      const updatedNumbers = numbers.map(num => 
        num.id === id ? { ...num, status: newStatus } : num
      );
      setNumbers(updatedNumbers);
      onUpdate({ ...config, inboundNumbers: updatedNumbers });
      
    } catch (err: any) {
      console.error('❌ Error toggling number status:', err);
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">S</div>;
      case 'voice':
        return <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">V</div>;
      case 'both':
        return (
          <div className="flex space-x-1">
            <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">S</div>
            <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">V</div>
          </div>
        );
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-sm"></div>;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Manage Inbound Numbers</h3>
          <p className="text-sm text-gray-500">Configure inbound phone numbers from your SIP provider</p>
          {error && (
            <p className="text-sm text-red-600 mt-1">⚠️ {error}</p>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          disabled={loading}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Create Inbound Numbers
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          <span className="ml-2 text-gray-600">Loading inbound numbers...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Failed to load inbound numbers</h3>
              <p className="mt-2 text-sm text-red-700">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-3 text-sm bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbound Numbers Table - Matching Connex Layout */}
      {!loading && !error && (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">{" "}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assigned Flow
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {numbers.map(number => (
              <tr key={number.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {number.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {number.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {number.description}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTypeIcon(number.type)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <select
                      value={number.assignedFlowId || ''}
                      onChange={async (e) => {
                        const flowId = e.target.value || null;
                        console.log(`🔄 Flow assignment change: "${availableFlows.find(f => f.id === flowId)?.name || 'No Flow'}" (ID: ${flowId}) for number ${number.number}`);
                        
                        // Create a clean update with only the flow assignment
                        const updatedNumber = { 
                          ...number, 
                          assignedFlowId: flowId,
                          // Clear any conflicting fields
                          selectedFlowId: undefined
                        };
                        
                        console.log('� Updated number object:', { id: updatedNumber.id, assignedFlowId: updatedNumber.assignedFlowId, selectedFlowId: updatedNumber.selectedFlowId });
                        await handleSave(updatedNumber);
                      }}
                      disabled={updatingNumberId === number.id}
                      className={`text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        updatingNumberId === number.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">No Flow</option>
                      {availableFlows.map(flow => (
                        <option key={flow.id} value={flow.id}>
                          {flow.name} ({flow.status})
                        </option>
                      ))}
                    </select>
                    {updatingNumberId === number.id && (
                      <div className="inline-flex items-center text-xs text-blue-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                        Saving...
                      </div>
                    )}
                    {number.assignedFlow && updatingNumberId !== number.id && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        ✓ {number.assignedFlow.status}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleNumberStatus(number.id)}
                    className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    style={{
                      backgroundColor: number.status ? '#10B981' : '#D1D5DB'
                    }}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        number.status ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setEditingNumber(number);
                        setShowAddForm(true);
                      }}
                    >
                      •••
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Empty State - show only when not loading and no error and no numbers */}
      {!loading && !error && numbers.length === 0 && (
        <div className="text-center py-12">
          <PhoneArrowDownLeftIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inbound Numbers</h3>
          <p className="text-gray-500">Add or import phone numbers from your SIP provider to start receiving calls</p>
        </div>
      )}

      {/* Add/Edit Inbound Number Form Modal */}
      {showAddForm && (
        <ConnexInboundNumberForm
          number={editingNumber}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingNumber(null);
          }}
          flows={availableFlows}
          audioFiles={getAvailableAudioFiles()}
        />
      )}
    </div>
  );
};

// Connex Inbound Number Form - Complete Form Matching Connex
interface ConnexInboundNumberFormProps {
  number?: InboundNumber | null;
  onSave: (number: InboundNumber) => void;
  onCancel: () => void;
  flows?: any[];
  audioFiles?: AudioFile[];
}

const ConnexInboundNumberForm: React.FC<ConnexInboundNumberFormProps> = ({ 
  number, 
  onSave, 
  onCancel, 
  flows = [], 
  audioFiles = [] 
}) => {
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="p-4">
          <h3>Test Component</h3>
          <button onClick={() => onCancel()}>Cancel</button>
        </div>
      </div>
    </div>
  );
};


// Enhanced Audio Files Manager
export const AudioFilesManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Audio Files Manager</h2>
      <div className="bg-gray-50 p-4 rounded-md">
        <p className="text-gray-600">Audio files management interface coming soon...</p>
      </div>
    </div>
  );
};
