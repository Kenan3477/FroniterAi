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
  
  // New routing and audio configuration fields
  voicemailAudioFile?: string; // Audio file for voicemail greeting
  outOfHoursAudioFile?: string; // Audio file for out of hours announcement
  outOfHoursTransferNumber?: string; // Phone number for out of hours transfer
  businessHoursVoicemailFile?: string; // Audio file for business hours voicemail
  businessHoursAudioFile?: string; // Audio file for business hours greeting
  selectedFlowId?: string; // Selected flow ID for routing
  selectedQueueId?: string; // Selected queue ID for routing
  selectedRingGroupId?: string; // Selected ring group ID for routing
  selectedExtension?: string; // Selected extension for routing
  
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
            // Audio file configurations from backend (using backend field names)
            outOfHoursAudioFile: num.outOfHoursAudioUrl,
            businessHoursVoicemailFile: num.voicemailAudioUrl,
            voicemailAudioFile: num.voicemailAudioUrl,
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

      const updateData = {
        displayName: number.displayName,
        description: number.description,
        isActive: number.status,
        assignedFlowId: number.assignedFlowId || null,
        // Add new routing and configuration fields
        businessHours: number.businessHours,
        outOfHoursAction: number.outOfHoursAction,
        routeTo: number.routeTo,
        voicemailAudioFile: number.voicemailAudioFile,
        businessHoursVoicemailFile: number.businessHoursVoicemailFile,
        outOfHoursAudioFile: number.outOfHoursAudioFile,
        outOfHoursTransferNumber: number.outOfHoursTransferNumber,
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
        throw new Error(`Failed to update inbound number: ${response.statusText}`);
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
const ConnexInboundNumberForm: React.FC<{
  number?: InboundNumber | null;
  onSave: (number: InboundNumber) => void;
  onCancel: () => void;
  flows?: any[];
  audioFiles?: AudioFile[];
}> = ({ number, onSave, onCancel, flows = [], audioFiles = [] }) => {
  const [formData, setFormData] = useState<Partial<InboundNumber>>({
    number: number?.number || '',
    carrierInboundNumber: number?.carrierInboundNumber || '',
    displayName: number?.displayName || '',
    description: number?.description || '',
    autoRejectAnonymous: number?.autoRejectAnonymous !== false,
    createContactOnAnonymous: number?.createContactOnAnonymous !== false,
    integration: number?.integration || 'None',
    countryCode: number?.countryCode || 'United Kingdom Of Great Britain And Northern Ireland (The) (GB)',
    businessHours: number?.businessHours || '24 Hours',
    outOfHoursAction: number?.outOfHoursAction || 'Hangup',
    dayClosedAction: number?.dayClosedAction || 'Hangup',
    routeTo: number?.routeTo || '',
    recordCalls: number?.recordCalls !== false,
    lookupSearchFilter: number?.lookupSearchFilter || 'All Lists',
    assignedToDefaultList: number?.assignedToDefaultList !== false,
    type: number?.type || 'both',
    status: number?.status !== false,
    // New fields for enhanced routing
    voicemailAudioFile: number?.voicemailAudioFile || '',
    outOfHoursAudioFile: number?.outOfHoursAudioFile || '',
    outOfHoursTransferNumber: number?.outOfHoursTransferNumber || '',
    businessHoursVoicemailFile: number?.businessHoursVoicemailFile || '',
    selectedFlowId: number?.selectedFlowId || '',
    selectedQueueId: number?.selectedQueueId || '',
    selectedRingGroupId: number?.selectedRingGroupId || '',
    selectedExtension: number?.selectedExtension || ''
  });

  const [isDualtoneValid, setIsDualtoneValid] = useState(false);

  // Audio file utility functions
  const getAudioFilesByType = (type: string): AudioFile[] => {
    if (type === 'all') return audioFiles;
    return audioFiles.filter((file: AudioFile) => file.type === type);
  };

  // Simulate checking if the number is valid with Dualtone SIP provider
  const validateWithDualtone = async (phoneNumber: string) => {
    if (!phoneNumber || !phoneNumber.startsWith('+44')) {
      setIsDualtoneValid(false);
      return;
    }
    
    // Simulate API call to check if number exists in Dualtone system
    // In real implementation, this would call your backend to verify with Dualtone
    const isValid = phoneNumber.match(/^\+44\d{10}$/); // Basic UK number validation
    setIsDualtoneValid(!!isValid);
  };

  useEffect(() => {
    if (formData.number) {
      validateWithDualtone(formData.number);
    }
  }, [formData.number]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isDualtoneValid) {
      alert('Invalid phone number. Number must be purchased from Dualtone and have SIP trunk configuration.');
      return;
    }

    onSave({
      id: number?.id || '',
      name: formData.displayName || formData.number || '',
      ...formData
    } as InboundNumber);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {number ? 'Edit Inbound Numbers' : 'Create Inbound Numbers'}
          </h3>
          <div className="flex space-x-2">
            <button
              type="submit"
              form="inbound-number-form"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-slate-700 flex items-center"
              disabled={!isDualtoneValid}
            >
              ✓ Save
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ✗
            </button>
          </div>
        </div>
        
        <form id="inbound-number-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Inbound Number *
              </label>
              <input
                type="text"
                value={formData.number}
                onChange={(e) => setFormData({...formData, number: e.target.value})}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 ${
                  !isDualtoneValid && formData.number ? 'border-red-300 bg-red-50' : ''
                }`}
                placeholder="+443301222251"
                required
              />
              {!isDualtoneValid && formData.number && (
                <p className="text-red-600 text-xs mt-1">
                  Number not found in Dualtone SIP system or invalid format
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Carrier Inbound Number *
              </label>
              <input
                type="text"
                value={formData.carrierInboundNumber}
                onChange={(e) => setFormData({...formData, carrierInboundNumber: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                placeholder="443301222251"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                placeholder="443301222251"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                placeholder="443301222251"
                required
              />
            </div>
          </div>

          {/* Toggle Switches Section */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Auto Reject Anonymous Inbound Calls</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, autoRejectAnonymous: !formData.autoRejectAnonymous})}
                className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200"
                style={{
                  backgroundColor: formData.autoRejectAnonymous ? '#10B981' : '#D1D5DB'
                }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    formData.autoRejectAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Create a new contact on every anonymous call received</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, createContactOnAnonymous: !formData.createContactOnAnonymous})}
                className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200"
                style={{
                  backgroundColor: formData.createContactOnAnonymous ? '#10B981' : '#D1D5DB'
                }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    formData.createContactOnAnonymous ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Dropdown Sections */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Integration</label>
              <select
                value={formData.integration}
                onChange={(e) => setFormData({...formData, integration: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="None">None</option>
                <option value="Zapier">Zapier</option>
                <option value="Webhook">Webhook</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">International Country Code *</label>
              <select
                value={formData.countryCode}
                onChange={(e) => setFormData({...formData, countryCode: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="United Kingdom Of Great Britain And Northern Ireland (The) (GB)">
                  United Kingdom Of Great Britain And Northern Ireland (The) (GB)
                </option>
                <option value="United States (US)">United States (US)</option>
                <option value="Canada (CA)">Canada (CA)</option>
              </select>
            </div>
          </div>

          {/* Business Hours Configuration */}
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Business Hours</h4>
              <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded">Operating Schedule</span>
            </div>
            <p className="text-sm text-gray-600">Define when your business is open to receive calls</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Hours</label>
              <select
                value={formData.businessHours}
                onChange={(e) => setFormData({...formData, businessHours: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="24 Hours">24 Hours</option>
                <option value="9-5 Weekdays">9-5 Weekdays</option>
                <option value="9-6 Weekdays">9-6 Weekdays</option>
                <option value="8-5 Mon-Fri">8-5 Mon-Fri</option>
                <option value="Custom">Custom</option>
              </select>
            </div>

            {formData.businessHours === 'Custom' && (
              <div className="bg-white p-4 rounded border border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Custom Business Hours</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <input type="checkbox" id={day} defaultChecked={day !== 'Saturday' && day !== 'Sunday'} className="rounded" />
                      <label htmlFor={day} className="w-20">{day}</label>
                      <input type="time" defaultValue="09:00" className="px-2 py-1 border rounded text-xs" />
                      <span>to</span>
                      <input type="time" defaultValue="17:00" className="px-2 py-1 border rounded text-xs" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Out of Hours / Day Closed Configuration */}
          <div className="space-y-4 bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Out of Hours Configuration</h4>
              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">Weekends & After Hours</span>
            </div>
            <p className="text-sm text-gray-600">Configure what happens when calls arrive outside business hours (including weekends, holidays, and closed days)</p>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  When Out of Hours (Evenings, Weekends, Holidays)
                </label>
                <select
                  value={formData.outOfHoursAction}
                  onChange={(e) => setFormData({...formData, outOfHoursAction: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="Hangup">Hangup Call</option>
                  <option value="PlayAudio">Play Audio File</option>
                  <option value="Voicemail">Take Voicemail</option>
                  <option value="Transfer">Transfer to Another Number</option>
                  <option value="Announcement">Play Announcement & Hangup</option>
                </select>
              </div>

              {/* Show audio file selection when Play Audio File is selected */}
              {formData.outOfHoursAction === 'PlayAudio' && (
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <SpeakerWaveIcon className="h-4 w-4 inline mr-1" />
                    Select Audio File to Play
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={formData.outOfHoursAudioFile || ''}
                      onChange={(e) => setFormData({...formData, outOfHoursAudioFile: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select audio file...</option>
                      <option value="default-closed">Default: "We are currently closed"</option>
                      {getAudioFilesByType('announcement').map(file => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('greeting').map(file => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('ivr_prompt').map(file => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('other').map(file => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                    </select>
                    <label className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer inline-flex items-center">
                      <CloudArrowUpIcon className="h-4 w-4" />
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({...formData, outOfHoursAudioFile: file.name});
                            console.log('Out of hours audio file selected:', file.name);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Audio file will play then call will end</p>
                </div>
              )}

              {/* Show voicemail audio file selection when Voicemail is selected */}
              {formData.outOfHoursAction === 'Voicemail' && (
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MicrophoneIcon className="h-4 w-4 inline mr-1" />
                    Voicemail Greeting Audio File
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={formData.voicemailAudioFile || ''}
                      onChange={(e) => setFormData({...formData, voicemailAudioFile: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select voicemail greeting...</option>
                      <option value="default-voicemail">Default: "Please leave a message after the tone"</option>
                      {getAudioFilesByType('voicemail').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('greeting').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('other').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                    </select>
                    <label className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer inline-flex items-center">
                      <CloudArrowUpIcon className="h-4 w-4" />
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({...formData, voicemailAudioFile: file.name});
                            console.log('Voicemail audio file selected:', file.name);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload MP3/WAV file or use default system greeting</p>
                </div>
              )}

              {/* Show announcement audio file selection when Announcement is selected */}
              {formData.outOfHoursAction === 'Announcement' && (
                <div className="bg-green-50 p-4 rounded border border-green-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <SpeakerWaveIcon className="h-4 w-4 inline mr-1" />
                    Out of Hours Announcement Audio File
                  </label>
                  <div className="flex items-center space-x-2">
                    <select
                      value={formData.outOfHoursAudioFile || ''}
                      onChange={(e) => setFormData({...formData, outOfHoursAudioFile: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select announcement...</option>
                      <option value="default-closed">Default: "We are currently closed. Please call back during business hours"</option>
                      {getAudioFilesByType('announcement').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('greeting').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('ivr_prompt').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                      {getAudioFilesByType('other').map((file: AudioFile) => (
                        <option key={file.id} value={file.id}>
                          {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                        </option>
                      ))}
                    </select>
                    <label className="px-3 py-2 text-xs bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer inline-flex items-center">
                      <CloudArrowUpIcon className="h-4 w-4" />
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormData({...formData, outOfHoursAudioFile: file.name});
                            console.log('Out of hours audio file selected:', file.name);
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Message played before hanging up</p>
                </div>
              )}

              {/* Show transfer number input when Transfer is selected */}
              {formData.outOfHoursAction === 'Transfer' && (
                <div className="bg-purple-50 p-4 rounded border border-purple-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Destination Number
                  </label>
                  <input
                    type="text"
                    value={formData.outOfHoursTransferNumber || ''}
                    onChange={(e) => setFormData({...formData, outOfHoursTransferNumber: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="Enter phone number (e.g., +442012345678)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calls will be transferred to this number when out of hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Within Hours Routing */}
          <div className="space-y-4 bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Business Hours Routing</h4>
              <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">Active During Open Hours</span>
            </div>
            <p className="text-sm text-gray-600">Configure where calls are routed when received during your business hours</p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Within Business Hours - Route To
              </label>
              <select
                value={formData.routeTo}
                onChange={(e) => setFormData({...formData, routeTo: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="">Select routing destination...</option>
                <option value="PlayAudio">Play Audio File</option>
                <option value="Flow">Flow (Follow configured call flow)</option>
                <option value="Queue">Queue (Join call queue)</option>
                <option value="RingGroup">Ring Group (Ring multiple agents)</option>
                <option value="Extension">Extension (Direct to specific agent)</option>
                <option value="IVR">IVR Menu (Interactive voice response)</option>
                <option value="Voicemail">Voicemail (Take message)</option>
              </select>
            </div>

            {/* Show audio file selection when Play Audio File is selected */}
            {formData.routeTo === 'PlayAudio' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <SpeakerWaveIcon className="h-4 w-4 inline mr-1" />
                  Select Audio File to Play
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={formData.businessHoursAudioFile || ''}
                    onChange={(e) => setFormData({...formData, businessHoursAudioFile: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select audio file...</option>
                    {getAudioFilesByType('greeting').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                    {getAudioFilesByType('announcement').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                    {getAudioFilesByType('ivr_prompt').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                    {getAudioFilesByType('other').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                  </select>
                  <label className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer inline-flex items-center">
                    <CloudArrowUpIcon className="h-4 w-4" />
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({...formData, businessHoursAudioFile: file.name});
                          console.log('Business hours audio file selected:', file.name);
                        }
                      }}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Audio file will play during business hours</p>
              </div>
            )}

            {/* Show specific configuration based on routing choice */}
            {formData.routeTo === 'Flow' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Flow</label>
                <select
                  value={formData.selectedFlowId || ''}
                  onChange={(e) => setFormData({...formData, selectedFlowId: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="">Choose a flow...</option>
                  {flows.map((flow: any) => (
                    <option key={flow.id} value={flow.id}>{flow.name}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.routeTo === 'Queue' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Queue</label>
                <select
                  value={formData.selectedQueueId || ''}
                  onChange={(e) => setFormData({...formData, selectedQueueId: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="">Choose a queue...</option>
                  <option value="sales">Sales Queue</option>
                  <option value="support">Support Queue</option>
                  <option value="general">General Queue</option>
                </select>
              </div>
            )}

            {formData.routeTo === 'RingGroup' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Ring Group</label>
                <select
                  value={formData.selectedRingGroupId || ''}
                  onChange={(e) => setFormData({...formData, selectedRingGroupId: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                >
                  <option value="">Choose a ring group...</option>
                  <option value="sales-team">Sales Team</option>
                  <option value="support-team">Support Team</option>
                  <option value="management">Management</option>
                </select>
              </div>
            )}

            {formData.routeTo === 'Extension' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Extension</label>
                <input
                  type="text"
                  value={formData.selectedExtension || ''}
                  onChange={(e) => setFormData({...formData, selectedExtension: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Enter extension number (e.g., 101)"
                />
              </div>
            )}

            {formData.routeTo === 'Voicemail' && (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MicrophoneIcon className="h-4 w-4 inline mr-1" />
                  Business Hours Voicemail Greeting
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={formData.businessHoursVoicemailFile || ''}
                    onChange={(e) => setFormData({...formData, businessHoursVoicemailFile: e.target.value})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">Select business hours voicemail greeting...</option>
                    <option value="default-business-voicemail">Default: "Please leave a message and we will return your call"</option>
                    {getAudioFilesByType('voicemail').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                    {getAudioFilesByType('greeting').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                    {getAudioFilesByType('other').map((file: AudioFile) => (
                      <option key={file.id} value={file.id}>
                        {file.name} ({file.format.toUpperCase()}, {Math.round(file.duration)}s)
                      </option>
                    ))}
                  </select>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFormData({...formData, businessHoursVoicemailFile: file.name});
                        console.log('Business hours voicemail audio file selected:', file.name);
                      }
                    }}
                    className="hidden"
                    id="business-hours-voicemail-upload"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => {
                      document.getElementById('business-hours-voicemail-upload')?.click();
                    }}
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4" style={{display: 'none'}}>
            {/* Hidden old fields for backward compatibility */}
            <div>
              <select
                value={formData.dayClosedAction}
                onChange={(e) => setFormData({...formData, dayClosedAction: e.target.value})}
                style={{display: 'none'}}
              >
                <option value="Hangup">Hangup</option>
                <option value="Voicemail">Voicemail</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>

          {/* Record Calls Section */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Record Calls</span>
              <button
                type="button"
                onClick={() => setFormData({...formData, recordCalls: !formData.recordCalls})}
                className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200"
                style={{
                  backgroundColor: formData.recordCalls ? '#10B981' : '#D1D5DB'
                }}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    formData.recordCalls ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Lookup Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Lookup Search Filter</label>
            <select
              value={formData.lookupSearchFilter}
              onChange={(e) => setFormData({...formData, lookupSearchFilter: e.target.value})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="All Lists">All Lists</option>
              <option value="Customer Lists">Customer Lists</option>
              <option value="Lead Lists">Lead Lists</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">This will search against all data lists for the contact lookup.</p>
          </div>

          {/* Default List Assignment */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned to the default list</label>
            <select
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="">Select default list...</option>
              <option value="general">General Contacts</option>
              <option value="leads">Leads</option>
            </select>
          </div>

          {/* Audio File Configuration Section */}
          <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-gray-900">Audio File Configuration</h4>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Call Scenarios</span>
            </div>
            <p className="text-sm text-gray-600">Configure audio files played during different call conditions</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Greeting Audio */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <SpeakerWaveIcon className="h-4 w-4 inline mr-1" />
                  Main Greeting
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={number?.audioFiles?.greeting?.displayName || 'Default Greeting'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Not Answered Audio */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <PhoneIcon className="h-4 w-4 inline mr-1" />
                  Call Not Answered
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={number?.audioFiles?.notAnswered?.displayName || 'Call Not Answered Message'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Out of Hours Audio */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <MicrophoneIcon className="h-4 w-4 inline mr-1" />
                  Out of Hours
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={number?.audioFiles?.outOfHours?.displayName || 'Out of Hours Message'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Busy Audio */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <UsersIcon className="h-4 w-4 inline mr-1" />
                  All Agents Busy
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={number?.audioFiles?.busy?.displayName || 'All Agents Busy'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Queue Hold Music */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <SpeakerWaveIcon className="h-4 w-4 inline mr-1" />
                  Queue Hold Music
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={number?.audioFiles?.queue?.displayName || 'Queue Hold Music'}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    className="px-3 py-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <CloudArrowUpIcon className="h-4 w-4" />
                  </button>
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={number?.audioFiles?.queue?.loop || false}
                      readOnly
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="ml-1 text-xs text-gray-500">Loop</span>
                  </div>
                </div>
              </div>

              {/* Audio File Upload Notice */}
              <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded p-3">
                <div className="flex items-start">
                  <DocumentIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">Supported Audio Formats:</p>
                    <p>MP3, WAV, AAC files up to 10MB. Recommended: 16-bit, 8kHz for telephony quality.</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Click upload buttons to replace default audio files with custom recordings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isDualtoneValid && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Invalid Phone Number
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      The phone number must be purchased from Dualtone and have valid SIP trunk configuration.
                      Please verify the number exists in your Dualtone account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
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
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>(config.audioFiles || []);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [playingFile, setPlayingFile] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  
  // Upload-related state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Recording-related state
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  // Edit/Delete-related state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingFile, setEditingFile] = useState<AudioFile | null>(null);
  const [deletingFile, setDeletingFile] = useState<AudioFile | null>(null);

  const fileTypes = [
    { id: 'all', label: 'All Files' },
    { id: 'greeting', label: 'Greetings' },
    { id: 'hold_music', label: 'Hold Music' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'ivr_prompt', label: 'IVR Prompts' },
    { id: 'voicemail', label: 'Voicemail' },
    { id: 'other', label: 'Other' }
  ];

  const filteredFiles = selectedType === 'all' 
    ? audioFiles 
    : audioFiles.filter(file => file.type === selectedType);

  // File upload handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    try {
      // TODO: Implement actual file upload to backend
      console.log('Uploading files:', selectedFiles);
      
      // Simulate upload - replace with actual API call
      const newFiles = selectedFiles.map(file => ({
        id: `temp_${Date.now()}_${Math.random()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        filename: file.name,
        originalName: file.name,
        duration: 0, // Will be calculated by backend
        size: file.size,
        format: file.name.split('.').pop() || 'unknown',
        type: 'other' as const,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Current User',
        description: '',
        tags: []
      }));

      const updatedFiles = [...audioFiles, ...newFiles];
      setAudioFiles(updatedFiles);
      onUpdate({ ...config, audioFiles: updatedFiles });
      setShowUploadModal(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingDuration(0);

      // Start timer
      const interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Stop timer when recording stops
      recorder.onstop = () => {
        clearInterval(interval);
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleSaveRecording = async () => {
    if (!recordedBlob) return;

    try {
      // TODO: Implement actual recording save to backend
      console.log('Saving recording:', recordedBlob);
      
      const newFile = {
        id: `recording_${Date.now()}_${Math.random()}`,
        name: `Recording ${new Date().toLocaleString()}`,
        filename: `recording_${Date.now()}.wav`,
        originalName: `recording_${Date.now()}.wav`,
        duration: recordingDuration,
        size: recordedBlob.size,
        format: 'wav',
        type: 'other' as const,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Current User',
        description: '',
        tags: []
      };

      const updatedFiles = [...audioFiles, newFile];
      setAudioFiles(updatedFiles);
      onUpdate({ ...config, audioFiles: updatedFiles });
      setShowRecordModal(false);
      setRecordedBlob(null);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to save recording:', error);
    }
  };

  const handleUploadClick = () => {
    setShowUploadModal(true);
  };

  const handleRecordClick = () => {
    setShowRecordModal(true);
  };

  // Edit/Delete handlers
  const handleEditClick = (file: AudioFile) => {
    setEditingFile(file);
    setShowEditModal(true);
  };

  const handleDeleteClick = (file: AudioFile) => {
    setDeletingFile(file);
    setShowDeleteModal(true);
  };

  const handleEditSave = (updatedFile: AudioFile) => {
    const updatedFiles = audioFiles.map(file => 
      file.id === updatedFile.id ? updatedFile : file
    );
    setAudioFiles(updatedFiles);
    onUpdate({ ...config, audioFiles: updatedFiles });
    setShowEditModal(false);
    setEditingFile(null);
  };

  const handleDeleteConfirm = () => {
    if (deletingFile) {
      const updatedFiles = audioFiles.filter(file => file.id !== deletingFile.id);
      setAudioFiles(updatedFiles);
      onUpdate({ ...config, audioFiles: updatedFiles });
      setShowDeleteModal(false);
      setDeletingFile(null);
    }
  };

  const handleFileUpload = (files: FileList) => {
    // Handle file upload logic
    Array.from(files).forEach(file => {
      if (file.type.startsWith('audio/')) {
        const newAudioFile: AudioFile = {
          id: Date.now().toString() + Math.random(),
          name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          filename: file.name,
          originalName: file.name,
          format: file.type.split('/')[1] || 'unknown',
          duration: 30, // Would be calculated from actual file
          size: file.size,
          type: 'other',
          description: '',
          tags: [],
          uploadedBy: 'Current User',
          uploadedAt: new Date().toISOString()
        };
        
        const updatedFiles = [...audioFiles, newAudioFile];
        setAudioFiles(updatedFiles);
        onUpdate({ ...config, audioFiles: updatedFiles });
      }
    });
    setShowUploadModal(false);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Audio Files</h3>
          <p className="text-sm text-gray-500">Manage greetings, hold music, and voice prompts</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleUploadClick}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <CloudArrowUpIcon className="h-4 w-4 inline mr-2" />
            Upload Files
          </button>
          <button 
            onClick={handleRecordClick}
            className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
          >
            Record New
          </button>
        </div>
      </div>

      {/* File Type Filter */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {fileTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedType === type.id
                    ? 'border-slate-500 text-slate-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {type.label}
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {type.id === 'all' ? audioFiles.length : audioFiles.filter(f => f.type === type.id).length}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Audio Files Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFiles.map(file => (
          <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MicrophoneIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 truncate">{file.name}</h4>
                  <p className="text-xs text-gray-500">{file.format.toUpperCase()}</p>
                </div>
              </div>
              <button
                onClick={() => setPlayingFile(playingFile === file.id ? null : file.id)}
                className="p-2 text-gray-400 hover:text-slate-600"
              >
                {playingFile === file.id ? (
                  <PauseIcon className="h-4 w-4" />
                ) : (
                  <PlayIcon className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Duration:</span>
                <span className="text-gray-900">{formatDuration(file.duration)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Size:</span>
                <span className="text-gray-900">{formatFileSize(file.size)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Type:</span>
                <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {file.type.replace('_', ' ')}
                </span>
              </div>
            </div>

            {file.description && (
              <p className="text-sm text-gray-600 mb-4">{file.description}</p>
            )}

            {file.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {file.tags.map(tag => (
                  <span key={tag} className="inline-flex px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>By {file.uploadedBy}</span>
              <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button 
                onClick={() => handleEditClick(file)}
                className="text-slate-600 hover:text-slate-900"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button 
                onClick={() => handleDeleteClick(file)}
                className="text-red-600 hover:text-red-900"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredFiles.length === 0 && (
        <div className="text-center py-12">
          <MicrophoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Audio Files</h3>
          <p className="text-gray-500">Upload or record audio files for your voice system</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Upload Audio File</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".mp3,.wav,.m4a,.aac,.ogg,.flac"
                className="hidden"
                multiple
              />
              <MicrophoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop audio files here, or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Browse files
              </button>
              <p className="text-xs text-gray-500 mt-2">
                Supports MP3, WAV, M4A, AAC, OGG, FLAC files
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded mb-2">
                    <span className="text-sm truncate">{file.name}</span>
                    <span className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Modal */}
      {showRecordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Record Audio</h3>
              <button
                onClick={() => setShowRecordModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="text-center py-8">
              <div className={`w-24 h-24 mx-auto mb-4 rounded-full border-4 flex items-center justify-center ${recording ? 'bg-red-100 border-red-300 animate-pulse' : 'bg-gray-100 border-gray-300'}`}>
                <MicrophoneIcon className={`h-12 w-12 ${recording ? 'text-red-600' : 'text-gray-500'}`} />
              </div>

              {recording && (
                <div className="text-lg font-medium text-red-600 mb-2">
                  Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                </div>
              )}

              {recordedBlob && !recording && (
                <div className="mb-4">
                  <p className="text-green-600 mb-2">Recording completed!</p>
                  <audio controls className="w-full">
                    <source src={URL.createObjectURL(recordedBlob)} type="audio/wav" />
                  </audio>
                </div>
              )}

              {!recording && !recordedBlob && (
                <p className="text-gray-600 mb-4">Click to start recording</p>
              )}
            </div>

            <div className="flex justify-center space-x-4 mb-6">
              {!recording && !recordedBlob && (
                <button
                  onClick={startRecording}
                  className="px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center space-x-2"
                >
                  <MicrophoneIcon className="h-5 w-5" />
                  <span>Start Recording</span>
                </button>
              )}

              {recording && (
                <button
                  onClick={stopRecording}
                  className="px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700 flex items-center space-x-2"
                >
                  <StopIcon className="h-5 w-5" />
                  <span>Stop Recording</span>
                </button>
              )}

              {recordedBlob && !recording && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setRecordedBlob(null);
                      setRecordingDuration(0);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Record Again
                  </button>
                  <button
                    onClick={handleSaveRecording}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Recording
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Edit Audio File</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const updatedFile = {
                ...editingFile,
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                type: formData.get('type') as any,
                tags: (formData.get('tags') as string).split(',').map(tag => tag.trim()).filter(Boolean)
              };
              handleEditSave(updatedFile);
            }}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={editingFile.name}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    id="type"
                    name="type"
                    defaultValue={editingFile.type}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {fileTypes.filter(type => type.id !== 'all').map(type => (
                      <option key={type.id} value={type.id}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={editingFile.description}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    name="tags"
                    defaultValue={editingFile.tags.join(', ')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="tag1, tag2, tag3"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Delete Audio File</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this audio file?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-900">{deletingFile.name}</p>
                <p className="text-sm text-gray-500">{deletingFile.filename}</p>
              </div>
              <p className="text-red-600 text-sm mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

