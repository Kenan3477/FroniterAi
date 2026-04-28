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
  const [formData, setFormData] = React.useState<Partial<InboundNumber>>({
    name: number?.name || '',
    description: number?.description || '',
    type: number?.type || 'voice',
    status: number?.status ?? true,
    routeTo: number?.routeTo || 'Flow',
    recordCalls: number?.recordCalls ?? true,
    autoRejectAnonymous: number?.autoRejectAnonymous ?? false,
    createContactOnAnonymous: number?.createContactOnAnonymous ?? false,
    businessHours: number?.businessHours || '24 Hours',
    outOfHoursAction: number?.outOfHoursAction || 'Hangup',
    voicemailAudioFile: number?.voicemailAudioFile || '',
    ...number
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as InboundNumber);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white rounded-lg shadow-xl p-8 m-4 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {number ? 'Configure Inbound Number' : 'Add Inbound Number'}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Number Display (Read-only) */}
          {number && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-900">
                {number.number}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="e.g., Main Support Line"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="Brief description of this inbound number"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.type || 'voice'}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="voice">Voice</option>
              <option value="sms">SMS</option>
              <option value="both">Voice & SMS</option>
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <button
              type="button"
              onClick={() => handleChange('status', !formData.status)}
              className={`${
                formData.status ? 'bg-green-600' : 'bg-gray-300'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500`}
            >
              <span
                className={`${
                  formData.status ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {/* Route To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Route To <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.routeTo || 'Flow'}
              onChange={(e) => handleChange('routeTo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="Flow">Flow</option>
              <option value="Queue">Queue</option>
              <option value="RingGroup">Ring Group</option>
              <option value="Extension">Extension</option>
              <option value="IVR">IVR</option>
              <option value="Voicemail">Voicemail</option>
            </select>
          </div>

          {/* Flow Assignment (if Route To is Flow) */}
          {formData.routeTo === 'Flow' && flows.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Flow
              </label>
              <select
                value={formData.assignedFlowId || ''}
                onChange={(e) => handleChange('assignedFlowId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">-- Select Flow --</option>
                {flows.map((flow) => (
                  <option key={flow.id} value={flow.id}>
                    {flow.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Business Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Hours
            </label>
            <select
              value={formData.businessHours || '24 Hours'}
              onChange={(e) => handleChange('businessHours', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="24 Hours">24 Hours</option>
              <option value="Business Hours">Business Hours (9am-5pm)</option>
              <option value="Custom">Custom Schedule</option>
            </select>
          </div>

          {/* Out of Hours Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Out of Hours Action
            </label>
            <select
              value={formData.outOfHoursAction || 'Hangup'}
              onChange={(e) => handleChange('outOfHoursAction', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="Hangup">Hangup</option>
              <option value="Voicemail">Voicemail</option>
              <option value="Transfer">Transfer</option>
              <option value="Announcement">Announcement</option>
            </select>
          </div>

          {/* Voicemail Audio (if Out of Hours Action is Voicemail) */}
          {formData.outOfHoursAction === 'Voicemail' && audioFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voicemail Greeting
              </label>
              <select
                value={formData.voicemailAudioFile || ''}
                onChange={(e) => handleChange('voicemailAudioFile', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="">-- Select Audio File --</option>
                {audioFiles.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.name} ({file.duration ? `${Math.round(file.duration)}s` : 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Record Calls */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Record Calls
            </label>
            <button
              type="button"
              onClick={() => handleChange('recordCalls', !formData.recordCalls)}
              className={`${
                formData.recordCalls ? 'bg-green-600' : 'bg-gray-300'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500`}
            >
              <span
                className={`${
                  formData.recordCalls ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {/* Auto Reject Anonymous */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Auto Reject Anonymous Calls
            </label>
            <button
              type="button"
              onClick={() => handleChange('autoRejectAnonymous', !formData.autoRejectAnonymous)}
              className={`${
                formData.autoRejectAnonymous ? 'bg-green-600' : 'bg-gray-300'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500`}
            >
              <span
                className={`${
                  formData.autoRejectAnonymous ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {/* Create Contact on Anonymous */}
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Create Contact for Anonymous Calls
            </label>
            <button
              type="button"
              onClick={() => handleChange('createContactOnAnonymous', !formData.createContactOnAnonymous)}
              className={`${
                formData.createContactOnAnonymous ? 'bg-green-600' : 'bg-gray-300'
              } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-500`}
            >
              <span
                className={`${
                  formData.createContactOnAnonymous ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              {number ? 'Save Changes' : 'Create Number'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


// Enhanced Audio Files Manager
export const AudioFilesManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioMetadata, setAudioMetadata] = useState({
    name: '',
    type: 'greeting' as AudioFile['type'],
    description: '',
    tags: ''
  });
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch audio files from backend
  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const fetchAudioFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voice/audio-files', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAudioFiles(data.audioFiles || []);
      } else {
        console.error('Failed to fetch audio files');
        // Fallback to config
        setAudioFiles(config.audioFiles || []);
      }
    } catch (error) {
      console.error('Error fetching audio files:', error);
      setAudioFiles(config.audioFiles || []);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type - accept all supported audio formats
      const validTypes = [
        'audio/mpeg',       // MP3
        'audio/mp3',        // MP3 (alternative)
        'audio/wav',        // WAV
        'audio/wave',       // WAV (alternative)
        'audio/x-wav',      // WAV (alternative)
        'audio/mp4',        // M4A
        'audio/x-m4a',      // M4A (alternative)
        'audio/aac',        // AAC
        'audio/ogg',        // OGG
        'audio/webm',       // WebM
        'audio/flac',       // FLAC
        'audio/x-flac'      // FLAC (alternative)
      ];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid audio file (MP3, WAV, M4A, AAC, OGG, FLAC)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setAudioMetadata(prev => ({
        ...prev,
        name: file.name.replace(/\.[^/.]+$/, '') // Remove extension
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    if (!audioMetadata.name.trim()) {
      alert('Please enter a file name');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('audio', selectedFile);
      formData.append('name', audioMetadata.name);
      formData.append('type', audioMetadata.type);
      formData.append('description', audioMetadata.description);
      formData.append('tags', audioMetadata.tags);

      const response = await fetch('/api/voice/audio-files/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Audio file uploaded:', data);
        
        // Refresh the list
        await fetchAudioFiles();
        
        // Reset form
        setSelectedFile(null);
        setAudioMetadata({
          name: '',
          type: 'greeting',
          description: '',
          tags: ''
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        alert('Audio file uploaded successfully!');
      } else {
        const error = await response.json();
        alert(`Upload failed: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this audio file?')) {
      return;
    }

    try {
      const response = await fetch(`/api/voice/audio-files/${fileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        await fetchAudioFiles();
        alert('Audio file deleted successfully');
      } else {
        alert('Failed to delete audio file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const handlePlayPause = (file: AudioFile) => {
    if (playingAudioId === file.id) {
      // Pause
      audioRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      // Play - use the streaming endpoint from backend
      if (audioRef.current) {
        audioRef.current.src = `/api/voice/audio-files/${file.id}/stream`;
        audioRef.current.play();
        setPlayingAudioId(file.id);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <audio
        ref={audioRef}
        onEnded={() => setPlayingAudioId(null)}
        onError={() => setPlayingAudioId(null)}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Audio Files Manager</h3>
          <p className="text-sm text-gray-500">
            Upload and manage audio files for IVR prompts, hold music, voicemail greetings, and announcements
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
          <CloudArrowUpIcon className="h-5 w-5 mr-2 text-slate-600" />
          Upload New Audio File
        </h4>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Audio File (MP3, WAV, M4A, AAC, OGG, FLAC, max 10MB)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/x-m4a,audio/aac,audio/ogg,audio/webm,audio/flac,audio/x-flac"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-slate-50 file:text-slate-700
                hover:file:bg-slate-100
                cursor-pointer"
              disabled={uploading}
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          {/* Metadata Form */}
          {selectedFile && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={audioMetadata.name}
                    onChange={(e) => setAudioMetadata(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="e.g., Welcome Greeting"
                    disabled={uploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    File Type *
                  </label>
                  <select
                    value={audioMetadata.type}
                    onChange={(e) => setAudioMetadata(prev => ({ ...prev, type: e.target.value as AudioFile['type'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    disabled={uploading}
                  >
                    <option value="greeting">Greeting</option>
                    <option value="hold_music">Hold Music</option>
                    <option value="announcement">Announcement</option>
                    <option value="ivr_prompt">IVR Prompt</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={audioMetadata.description}
                  onChange={(e) => setAudioMetadata(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  rows={2}
                  placeholder="Brief description of this audio file..."
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={audioMetadata.tags}
                  onChange={(e) => setAudioMetadata(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="e.g., english, professional, female-voice"
                  disabled={uploading}
                />
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading || !audioMetadata.name.trim()}
                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
                  </>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload Audio File
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Audio Files List */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-md font-medium text-gray-900 flex items-center">
            <DocumentIcon className="h-5 w-5 mr-2 text-slate-600" />
            Uploaded Audio Files ({audioFiles.length})
          </h4>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading audio files...</p>
          </div>
        ) : audioFiles.length === 0 ? (
          <div className="p-12 text-center">
            <MicrophoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No audio files uploaded yet</p>
            <p className="text-sm text-gray-400 mt-2">Upload your first audio file to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {audioFiles.map((file) => (
              <div key={file.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <button
                      onClick={() => handlePlayPause(file)}
                      className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center mr-4"
                    >
                      {playingAudioId === file.id ? (
                        <PauseIcon className="h-5 w-5 text-slate-600" />
                      ) : (
                        <PlayIcon className="h-5 w-5 text-slate-600 ml-0.5" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h5 className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </h5>
                        <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                          {file.type}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-xs text-gray-500 space-x-4">
                        <span>{file.filename}</span>
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDuration(file.duration)}</span>
                        <span>{file.format.toUpperCase()}</span>
                      </div>
                      {file.description && (
                        <p className="mt-1 text-xs text-gray-600">{file.description}</p>
                      )}
                      {file.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {file.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        const url = `/audio/${file.filename}`;
                        navigator.clipboard.writeText(url);
                        alert('URL copied to clipboard!');
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded"
                      title="Copy URL"
                    >
                      <DocumentIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-red-400 hover:text-red-600 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="text-sm font-medium text-blue-900 mb-2">📘 Audio File Guidelines</h5>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Format:</strong> MP3 (recommended) or WAV</li>
          <li>• <strong>Quality:</strong> 192kbps or higher, mono channel</li>
          <li>• <strong>Sample Rate:</strong> 16kHz or higher</li>
          <li>• <strong>Duration:</strong> Keep prompts concise (30-60 seconds)</li>
          <li>• <strong>Naming:</strong> Use clear, descriptive names</li>
          <li>• <strong>Loudness:</strong> Normalize to -1.0dB peak to prevent clipping</li>
        </ul>
      </div>
    </div>
  );
};
