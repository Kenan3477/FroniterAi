/**
 * Additional Enhanced Voice Channel Managers
 * Ring Groups, Internal Numbers, Voice Nodes, and Conference Managers
 */

import React, { useState } from 'react';
import {
  UsersIcon,
  PhoneIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

// Interface definitions
export interface RingGroup {
  id: string;
  name: string; // Ring Group Name
  description: string; // Ring Group Description
  displayName: string; // Display Name
  businessHours: string; // Business Hours
  outOfHoursAction: string; // If Out Of Hours
  dayClosedAction: string; // If Day Closed
  ringGroupType: string; // Ring Group Type
  extensions: string[]; // Array of extension names
  queues: string; // Queues
  ringTime: number; // Ring Time (sec)
  dropAction: string; // Drop Action
  enabled: boolean;
  createdAt: string;
  // Additional voice properties
  strategy: string; // Ring strategy
  timeout: number; // Timeout in seconds
  voicemail: boolean; // Voicemail enabled
  voicemailGreeting: string; // Voicemail greeting message
  fallbackAction: string; // Fallback action
  fallbackDestination: string; // Fallback destination
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
  createdAt: string;
}

export interface VoiceNode {
  id: string;
  name: string;
  type: 'announcement' | 'menu' | 'queue' | 'transfer' | 'condition' | 'voicemail';
  configuration: any;
  position: { x: number; y: number };
  connections: VoiceNodeConnection[];
  enabled: boolean;
  createdAt: string;
}

export interface VoiceNodeConnection {
  id: string;
  fromNode: string;
  toNode: string;
  condition?: string;
  label: string;
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
  createdAt: string;
}

// Enhanced Ring Groups Manager
export const RingGroupsManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  const [ringGroups, setRingGroups] = useState<RingGroup[]>(config.ringGroups || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RingGroup | null>(null);

  const availableExtensions = config.extensions || [];
  const strategyOptions = [
    { value: 'ring_all', label: 'Ring All', description: 'All extensions ring simultaneously' },
    { value: 'round_robin', label: 'Round Robin', description: 'Ring extensions in rotation' },
    { value: 'longest_idle', label: 'Longest Idle', description: 'Ring extension idle the longest' },
    { value: 'random', label: 'Random', description: 'Ring a random available extension' },
    { value: 'sequential', label: 'Sequential', description: 'Ring extensions in order' }
  ];

  const handleSave = (group: RingGroup) => {
    let updatedGroups;
    if (editingGroup) {
      updatedGroups = ringGroups.map(g => g.id === group.id ? group : g);
    } else {
      updatedGroups = [...ringGroups, { ...group, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    }
    
    setRingGroups(updatedGroups);
    onUpdate({ ...config, ringGroups: updatedGroups });
    setShowAddForm(false);
    setEditingGroup(null);
  };

  const handleDelete = (id: string) => {
    const updatedGroups = ringGroups.filter(g => g.id !== id);
    setRingGroups(updatedGroups);
    onUpdate({ ...config, ringGroups: updatedGroups });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Ring Groups</h3>
          <p className="text-sm text-gray-500">Configure groups of extensions that ring together with different strategies</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Create Ring Group
        </button>
      </div>

      {ringGroups.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Ring Groups</h3>
          <p className="text-gray-500">Create ring groups to route calls to multiple extensions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ringGroups.map(group => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-lg font-medium text-gray-900">{group.name}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      group.enabled ? 'bg-green-100 text-slate-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {group.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">{group.description}</p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => {
                      setEditingGroup(group);
                      setShowAddForm(true);
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">Strategy</div>
                  <div className="text-sm text-gray-600">
                    {strategyOptions.find(s => s.value === group.strategy)?.label}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-700">Extensions ({group.extensions.length})</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {group.extensions.slice(0, 6).map(ext => (
                      <span key={ext} className="inline-flex px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded">
                        {ext}
                      </span>
                    ))}
                    {group.extensions.length > 6 && (
                      <span className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        +{group.extensions.length - 6} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Timeout:</span>
                    <span className="ml-1 text-gray-900">{group.timeout}s</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Voicemail:</span>
                    <span className="ml-1">
                      {group.voicemail ? (
                        <CheckCircleIcon className="h-4 w-4 inline text-slate-600" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 inline text-red-600" />
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <RingGroupForm
          group={editingGroup}
          availableExtensions={availableExtensions}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingGroup(null);
          }}
        />
      )}
    </div>
  );
};

// Enhanced Internal Numbers Manager
export const InternalNumbersManager: React.FC<{
  config: any;
  onUpdate: (config: any) => void;
}> = ({ config, onUpdate }) => {
  const [internalNumbers, setInternalNumbers] = useState<InternalNumber[]>(config.internalNumbers || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');

  const numberTypes = [
    { id: 'all', label: 'All Numbers' },
    { id: 'service', label: 'Service Numbers', color: 'blue' },
    { id: 'department', label: 'Departments', color: 'green' },
    { id: 'emergency', label: 'Emergency', color: 'red' },
    { id: 'external', label: 'External', color: 'purple' }
  ];

  const filteredNumbers = selectedType === 'all' 
    ? internalNumbers 
    : internalNumbers.filter(num => num.type === selectedType);

  const handleSave = (number: InternalNumber) => {
    const updatedNumbers = [...internalNumbers, { ...number, id: Date.now().toString(), createdAt: new Date().toISOString() }];
    setInternalNumbers(updatedNumbers);
    onUpdate({ ...config, internalNumbers: updatedNumbers });
    setShowAddForm(false);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Internal Numbers</h3>
          <p className="text-sm text-gray-500">Manage internal directory and speed dial numbers</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700"
        >
          <PlusIcon className="h-4 w-4 inline mr-2" />
          Add Internal Number
        </button>
      </div>

      {/* Type Filter */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {numberTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedType === type.id
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {filteredNumbers.length === 0 ? (
        <div className="text-center py-12">
          <PhoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Internal Numbers</h3>
          <p className="text-gray-500">Add internal numbers for quick access to services and departments</p>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNumbers.map(number => {
                const typeInfo = numberTypes.find(t => t.id === number.type);
                return (
                  <tr key={number.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {number.number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {number.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${typeInfo?.color || 'gray'}-100 text-${typeInfo?.color || 'gray'}-800`}>
                        {typeInfo?.label || number.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {number.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {number.accessLevel}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        number.enabled ? 'bg-green-100 text-slate-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {number.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-slate-600 hover:text-slate-900 mr-3">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && (
        <InternalNumberForm
          onSave={handleSave}
          onCancel={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
};

// Ring Group Form Component
const RingGroupForm: React.FC<{
  group?: RingGroup | null;
  availableExtensions: any[];
  onSave: (group: RingGroup) => void;
  onCancel: () => void;
}> = ({ group, availableExtensions, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<RingGroup>>({
    name: group?.name || '',
    description: group?.description || '',
    extensions: group?.extensions || [],
    strategy: group?.strategy || 'ring_all',
    timeout: group?.timeout || 30,
    voicemail: group?.voicemail || true,
    voicemailGreeting: group?.voicemailGreeting || '',
    fallbackAction: group?.fallbackAction || 'voicemail',
    fallbackDestination: group?.fallbackDestination || '',
    enabled: group?.enabled !== false
  });

  const handleExtensionToggle = (extensionNumber: string) => {
    const currentExtensions = formData.extensions || [];
    if (currentExtensions.includes(extensionNumber)) {
      setFormData({
        ...formData,
        extensions: currentExtensions.filter(ext => ext !== extensionNumber)
      });
    } else {
      setFormData({
        ...formData,
        extensions: [...currentExtensions, extensionNumber]
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: group?.id || '',
      ...formData,
      createdAt: group?.createdAt || new Date().toISOString()
    } as RingGroup);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {group ? 'Edit Ring Group' : 'Create Ring Group'}
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
              <label className="block text-sm font-medium text-gray-700">Strategy</label>
              <select
                value={formData.strategy}
                onChange={(e) => setFormData({...formData, strategy: e.target.value as any})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="ring_all">Ring All</option>
                <option value="round_robin">Round Robin</option>
                <option value="longest_idle">Longest Idle</option>
                <option value="random">Random</option>
                <option value="sequential">Sequential</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Extensions</label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
              {availableExtensions.map(ext => (
                <label key={ext.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={(formData.extensions || []).includes(ext.number)}
                    onChange={() => handleExtensionToggle(ext.number)}
                    className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">{ext.number} - {ext.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Timeout (seconds)</label>
              <input
                type="number"
                min="10"
                max="120"
                value={formData.timeout}
                onChange={(e) => setFormData({...formData, timeout: parseInt(e.target.value)})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fallback Action</label>
              <select
                value={formData.fallbackAction}
                onChange={(e) => setFormData({...formData, fallbackAction: e.target.value as any})}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="voicemail">Voicemail</option>
                <option value="transfer">Transfer</option>
                <option value="hangup">Hang Up</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.voicemail}
                onChange={(e) => setFormData({...formData, voicemail: e.target.checked})}
                className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-900">Enable Voicemail</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-900">Enabled</span>
            </label>
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
              {group ? 'Update' : 'Create'} Ring Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Internal Number Form Component
const InternalNumberForm: React.FC<{
  onSave: (number: InternalNumber) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<InternalNumber>>({
    number: '',
    description: '',
    type: 'service',
    destination: '',
    accessLevel: 'all',
    allowedExtensions: [],
    enabled: true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as InternalNumber);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Internal Number</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Number</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({...formData, number: e.target.value})}
              placeholder="e.g., *100, 911, 0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="e.g., IT Support, Emergency"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="service">Service</option>
              <option value="department">Department</option>
              <option value="emergency">Emergency</option>
              <option value="external">External</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Destination</label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
              placeholder="Extension number or external number"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Access Level</label>
            <select
              value={formData.accessLevel}
              onChange={(e) => setFormData({...formData, accessLevel: e.target.value as any})}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="all">All Users</option>
              <option value="internal">Internal Only</option>
              <option value="managers">Managers Only</option>
              <option value="specific">Specific Extensions</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
              className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-900">Enabled</label>
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
              Add Number
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};