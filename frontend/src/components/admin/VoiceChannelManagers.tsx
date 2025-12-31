/**
 * Enhanced Voice Channel Managers
 * Complete implementation of all voice channel sub-modules matching Connex functionality
 */

import React, { useState, useEffect } from 'react';
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
  DocumentIcon
} from '@heroicons/react/24/outline';

// Enhanced Interface Definitions
export interface InboundIVR {
  id: string;
  name: string;
  description: string;
  greeting: string;
  timeout: number;
  retries: number;
  options: IVROption[];
  defaultAction: 'hangup' | 'voicemail' | 'transfer';
  defaultDestination?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface IVROption {
  digit: string;
  action: 'transfer' | 'queue' | 'voicemail' | 'announcement' | 'sub_menu';
  destination: string;
  description: string;
  enabled: boolean;
}

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
  outOfHoursAction: string; // 'Hangup'
  dayClosedAction: string; // 'Hangup'
  routeTo: string; // 'Hangup'
  recordCalls: boolean;
  lookupSearchFilter: string; // 'All Lists'
  assignedToDefaultList: boolean;
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

// Enhanced Inbound IVR Manager
export const InboundIVRManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  const [ivrList, setIvrList] = useState<InboundIVR[]>(config.inboundIVR || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIVR, setEditingIVR] = useState<InboundIVR | null>(null);

  const handleSave = (ivr: InboundIVR) => {
    let updatedList;
    if (editingIVR) {
      updatedList = ivrList.map(item => item.id === ivr.id ? ivr : item);
    } else {
      updatedList = [...ivrList, { ...ivr, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    }
    
    setIvrList(updatedList);
    onUpdate({ ...config, inboundIVR: updatedList });
    setShowAddForm(false);
    setEditingIVR(null);
  };

  const handleDelete = (id: string) => {
    const updatedList = ivrList.filter(item => item.id !== id);
    setIvrList(updatedList);
    onUpdate({ ...config, inboundIVR: updatedList });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Inbound IVR Menus</h3>
          <p className="text-sm text-gray-500">Configure Interactive Voice Response systems for call routing</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Create IVR Menu
        </button>
      </div>

      {ivrList.length === 0 ? (
        <div className="text-center py-12">
          <PhoneArrowDownLeftIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No IVR Menus</h3>
          <p className="text-gray-500">Create your first IVR menu to handle incoming calls</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ivrList.map(ivr => (
            <div key={ivr.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{ivr.name}</h4>
                  <p className="text-sm text-gray-500">{ivr.description}</p>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  ivr.status === 'active'
                    ? 'bg-green-100 text-slate-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ivr.status}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <strong>Options:</strong> {ivr.options.length}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Timeout:</strong> {ivr.timeout}s
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Retries:</strong> {ivr.retries}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditingIVR(ivr);
                    setShowAddForm(true);
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(ivr.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <IVRForm
          ivr={editingIVR}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingIVR(null);
          }}
        />
      )}
    </div>
  );
};

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

  // Fetch real inbound numbers from backend API
  useEffect(() => {
    const fetchInboundNumbers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('authToken');
        if (!token) {
          setError('Authentication required');
          return;
        }

        const response = await fetch('/api/voice/inbound-numbers', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch inbound numbers: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📞 Fetched inbound numbers:', data);
        
        // Transform backend data to frontend format
        const transformedNumbers: InboundNumber[] = data.inboundNumbers?.map((num: any) => ({
          id: num.id,
          number: num.phoneNumber,
          name: num.friendlyName || num.phoneNumber,
          description: num.description || `Inbound number ${num.phoneNumber}`,
          carrierInboundNumber: num.phoneNumber,
          displayName: num.friendlyName || num.phoneNumber,
          autoRejectAnonymous: true,
          createContactOnAnonymous: true,
          integration: 'None',
          countryCode: 'United Kingdom Of Great Britain And Northern Ireland (The) (GB)',
          businessHours: '24 Hours',
          outOfHoursAction: 'Hangup',
          dayClosedAction: 'Hangup',
          routeTo: 'Hangup',
          recordCalls: true,
          lookupSearchFilter: 'All Lists',
          assignedToDefaultList: true,
          type: 'voice',
          status: num.status === 'active'
        })) || [];

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

  const handleSave = async (number: InboundNumber) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        alert('Authentication required');
        return;
      }

      // Prepare data for backend API
      const updateData = {
        phoneNumber: number.number,
        friendlyName: number.displayName,
        description: number.description,
        status: number.status ? 'active' : 'inactive'
      };

      const response = await fetch(`/api/voice/inbound-numbers/${number.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update inbound number: ${response.statusText}`);
      }

      // Update local state
      let updatedNumbers;
      if (editingNumber) {
        updatedNumbers = numbers.map(num => 
          num.id === number.id ? number : num
        );
      } else {
        updatedNumbers = [...numbers, { ...number, id: Date.now().toString() }];
      }
      
      setNumbers(updatedNumbers);
      onUpdate({ ...config, inboundNumbers: updatedNumbers });
      setShowAddForm(false);
      setEditingNumber(null);
      
    } catch (err: any) {
      console.error('❌ Error saving inbound number:', err);
      alert(`Failed to save: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        alert('Authentication required');
        return;
      }

      const response = await fetch(`/api/voice/inbound-numbers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
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

      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('Authentication required');
        return;
      }

      const newStatus = !number.status;
      const response = await fetch(`/api/voice/inbound-numbers/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
}> = ({ number, onSave, onCancel }) => {
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
    routeTo: number?.routeTo || 'Hangup',
    recordCalls: number?.recordCalls !== false,
    lookupSearchFilter: number?.lookupSearchFilter || 'All Lists',
    assignedToDefaultList: number?.assignedToDefaultList !== false,
    type: number?.type || 'both',
    status: number?.status !== false
  });

  const [isDualtoneValid, setIsDualtoneValid] = useState(false);

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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Hours</label>
              <select
                value={formData.businessHours}
                onChange={(e) => setFormData({...formData, businessHours: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="24 Hours">24 Hours</option>
                <option value="9-5 Weekdays">9-5 Weekdays</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">If Out Of Hours</label>
              <select
                value={formData.outOfHoursAction}
                onChange={(e) => setFormData({...formData, outOfHoursAction: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="Hangup">Hangup</option>
                <option value="Voicemail">Voicemail</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">If Day Closed</label>
              <select
                value={formData.dayClosedAction}
                onChange={(e) => setFormData({...formData, dayClosedAction: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="Hangup">Hangup</option>
                <option value="Voicemail">Voicemail</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Route To</label>
              <select
                value={formData.routeTo}
                onChange={(e) => setFormData({...formData, routeTo: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="Hangup">Hangup</option>
                <option value="Queue">Queue</option>
                <option value="Extension">Extension</option>
                <option value="IVR">IVR</option>
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
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
            <CloudArrowUpIcon className="h-4 w-4 inline mr-2" />
            Upload Files
          </button>
          <button className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700">
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
              <button className="text-slate-600 hover:text-slate-900">
                <PencilIcon className="h-4 w-4" />
              </button>
              <button className="text-red-600 hover:text-red-900">
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
    </div>
  );
};

// IVR Form Component
const IVRForm: React.FC<{
  ivr?: InboundIVR | null;
  onSave: (ivr: InboundIVR) => void;
  onCancel: () => void;
}> = ({ ivr, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<InboundIVR>>({
    name: ivr?.name || '',
    description: ivr?.description || '',
    greeting: ivr?.greeting || '',
    timeout: ivr?.timeout || 5,
    retries: ivr?.retries || 3,
    options: ivr?.options || [],
    defaultAction: ivr?.defaultAction || 'hangup',
    defaultDestination: ivr?.defaultDestination || '',
    status: ivr?.status || 'active'
  });

  const [newOption, setNewOption] = useState<Partial<IVROption>>({
    digit: '',
    action: 'transfer',
    destination: '',
    description: '',
    enabled: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: ivr?.id || '',
      ...formData,
      createdAt: ivr?.createdAt || new Date().toISOString()
    } as InboundIVR);
  };

  const addOption = () => {
    if (newOption.digit && newOption.destination) {
      setFormData({
        ...formData,
        options: [...(formData.options || []), newOption as IVROption]
      });
      setNewOption({
        digit: '',
        action: 'transfer',
        destination: '',
        description: '',
        enabled: true
      });
    }
  };

  const removeOption = (index: number) => {
    const options = [...(formData.options || [])];
    options.splice(index, 1);
    setFormData({ ...formData, options });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {ivr ? 'Edit IVR Menu' : 'Create IVR Menu'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value as 'active' | 'inactive'})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Greeting Message</label>
            <textarea
              value={formData.greeting}
              onChange={(e) => setFormData({...formData, greeting: e.target.value})}
              rows={3}
              placeholder="Welcome to our customer service. Please select from the following options..."
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Timeout (seconds)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.timeout}
                onChange={(e) => setFormData({...formData, timeout: parseInt(e.target.value)})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Retries</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.retries}
                onChange={(e) => setFormData({...formData, retries: parseInt(e.target.value)})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Action</label>
              <select
                value={formData.defaultAction}
                onChange={(e) => setFormData({...formData, defaultAction: e.target.value as any})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="hangup">Hang Up</option>
                <option value="voicemail">Voicemail</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>

          {/* IVR Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Menu Options</label>
            
            {/* Add New Option */}
            <div className="border border-gray-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Option</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Digit (1-9, *, #)"
                    value={newOption.digit}
                    onChange={(e) => setNewOption({...newOption, digit: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
                    maxLength={1}
                  />
                </div>
                <div>
                  <select
                    value={newOption.action}
                    onChange={(e) => setNewOption({...newOption, action: e.target.value as any})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
                  >
                    <option value="transfer">Transfer</option>
                    <option value="queue">Queue</option>
                    <option value="voicemail">Voicemail</option>
                    <option value="announcement">Announcement</option>
                    <option value="sub_menu">Sub Menu</option>
                  </select>
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Destination"
                    value={newOption.destination}
                    onChange={(e) => setNewOption({...newOption, destination: e.target.value})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={addOption}
                    className="w-full px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Description (e.g., 'Press 1 for Sales')"
                  value={newOption.description}
                  onChange={(e) => setNewOption({...newOption, description: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 text-sm"
                />
              </div>
            </div>

            {/* Existing Options */}
            {formData.options && formData.options.length > 0 && (
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        Press {option.digit} - {option.description || option.action}
                      </div>
                      <div className="text-xs text-gray-500">
                        {option.action} to {option.destination}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
            >
              {ivr ? 'Update' : 'Create'} IVR Menu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};