import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  PowerIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  PhoneIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

interface InboundQueue {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  assignedAgents: number[];
  ringStrategy: string;
  callTimeout: number;
  priority: number;
}

interface Agent {
  id: number;
  username: string;
  role: string;
  extension?: string;
}

const InboundQueuesManager: React.FC = () => {
  const [queues, setQueues] = useState<InboundQueue[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [audioFilesLoading, setAudioFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingQueue, setEditingQueue] = useState<InboundQueue | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    isActive: true,
    assignedAgents: [] as number[],
    ringStrategy: 'round_robin',
    callTimeout: 30,
    priority: 1,
    queueEmptyAction: 'hangup' as 'hangup' | 'voicemail' | 'transfer' | 'play_audio',
    queueEmptyDestination: '',
    queueEmptyAudioFile: '',
    outOfHoursAction: 'voicemail' as 'voicemail' | 'hangup' | 'transfer' | 'play_audio',
    outOfHoursDestination: '',
    outOfHoursAudioFile: '',
    maxQueueTime: 300,
    maxQueueSize: 20,
  });

  useEffect(() => {
    fetchQueues();
    fetchAgents();
    fetchAudioFiles();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
      if (!target.closest('.agent-dropdown-container')) {
        setShowAgentDropdown(false);
      }
    };

    if (activeDropdown || showAgentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown, showAgentDropdown]);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/voice/inbound-queues', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setQueues(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
      setError('Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setAgentsLoading(true);
      const response = await fetch('/api/admin/agents', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAgents(data.data);
        } else {
          console.warn('Unexpected agent data format:', data);
          setAgents([]);
        }
      } else {
        console.error('Failed to fetch agents:', response.status);
        setAgents([]);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  const fetchAudioFiles = async () => {
    try {
      setAudioFilesLoading(true);
      const response = await fetch('/api/admin/audio-files', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAudioFiles(data.data || []);
        }
      } else {
        // If API doesn't exist yet, provide some default options
        setAudioFiles([
          'welcome.wav',
          'hold_music.mp3',
          'closing_message.wav',
          'queue_full.wav',
          'transfer_message.wav'
        ]);
      }
    } catch (error) {
      console.error('Error fetching audio files:', error);
      // Fallback to default audio files
      setAudioFiles([
        'welcome.wav',
        'hold_music.mp3',
        'closing_message.wav',
        'queue_full.wav',
        'transfer_message.wav'
      ]);
    } finally {
      setAudioFilesLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      isActive: true,
      assignedAgents: [],
      ringStrategy: 'round_robin',
      callTimeout: 30,
      priority: 1,
      queueEmptyAction: 'hangup',
      queueEmptyDestination: '',
      queueEmptyAudioFile: '',
      outOfHoursAction: 'voicemail',
      outOfHoursDestination: '',
      outOfHoursAudioFile: '',
      maxQueueTime: 300,
      maxQueueSize: 20,
    });
    setShowAdvanced(false);
  };

  const handleCreateQueue = async () => {
    try {
      setLoading(true);
      const url = editingQueue 
        ? `/api/voice/inbound-queues/${editingQueue.id}`
        : '/api/voice/inbound-queues';
      
      const response = await fetch(url, {
        method: editingQueue ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setShowCreateForm(false);
          setEditingQueue(null);
          resetForm();
          fetchQueues();
        }
      }
    } catch (error) {
      console.error('Error saving queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const editQueue = (queue: InboundQueue) => {
    setEditingQueue(queue);
    setFormData({
      name: queue.name,
      displayName: queue.displayName,
      description: queue.description || '',
      isActive: queue.isActive,
      assignedAgents: Array.isArray(queue.assignedAgents) 
        ? queue.assignedAgents.map(id => typeof id === 'string' ? parseInt(id, 10) : id)
        : [],
      ringStrategy: queue.ringStrategy,
      callTimeout: queue.callTimeout,
      priority: queue.priority,
      queueEmptyAction: 'hangup',
      queueEmptyDestination: '',
      queueEmptyAudioFile: '',
      outOfHoursAction: 'voicemail',
      outOfHoursDestination: '',
      outOfHoursAudioFile: '',
      maxQueueTime: 300,
      maxQueueSize: 20,
    });
    setShowCreateForm(true);
    setActiveDropdown(null);
  };

  const duplicateQueue = (queue: InboundQueue) => {
    setEditingQueue(null);
    setFormData({
      name: `${queue.name}_copy`,
      displayName: `${queue.displayName} (Copy)`,
      description: queue.description || '',
      isActive: false,
      assignedAgents: queue.assignedAgents.map(Number),
      ringStrategy: queue.ringStrategy,
      callTimeout: queue.callTimeout,
      priority: queue.priority,
      queueEmptyAction: 'hangup',
      queueEmptyDestination: '',
      queueEmptyAudioFile: '',
      outOfHoursAction: 'voicemail',
      outOfHoursDestination: '',
      outOfHoursAudioFile: '',
      maxQueueTime: 300,
      maxQueueSize: 20,
    });
    setShowCreateForm(true);
    setActiveDropdown(null);
  };

  const deleteQueue = async (queueId: string) => {
    if (!confirm('Are you sure you want to delete this queue? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/voice/inbound-queues/${queueId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error('Error deleting queue:', error);
    }
    setActiveDropdown(null);
  };

  const toggleQueueStatus = async (queueId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/voice/inbound-queues/${queueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error('Error toggling queue status:', error);
    }
  };

  const toggleAgentSelection = (agentId: number) => {
    setFormData(prev => ({
      ...prev,
      assignedAgents: prev.assignedAgents.includes(agentId)
        ? prev.assignedAgents.filter(id => id !== agentId)
        : [...prev.assignedAgents, agentId]
    }));
  };

  if (showCreateForm) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {editingQueue ? 'Edit Queue' : 'Create New Queue'}
          </h3>
          <button
            onClick={() => {
              setShowCreateForm(false);
              setEditingQueue(null);
              resetForm();
            }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 border-b pb-2">Basic Settings</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Queue Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                    placeholder="e.g., customer_service"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                    placeholder="e.g., Customer Service"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  rows={3}
                  placeholder="Brief description of this queue"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="isActive"
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                  className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Queue is active
                </label>
              </div>
            </div>

            {/* Agent Assignment */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 border-b pb-2">Agent Assignment</h4>
              
              {agentsLoading ? (
                <div className="text-sm text-gray-500">Loading agents...</div>
              ) : (
                <div className="relative agent-dropdown-container">
                  <button
                    type="button"
                    onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                    className="relative w-full cursor-pointer rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:text-sm"
                  >
                    <span className="block truncate">
                      {formData.assignedAgents.length === 0
                        ? 'Select agents...'
                        : `${formData.assignedAgents.length} agent(s) selected`}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </button>

                  {showAgentDropdown && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {agents.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No agents available</div>
                      ) : (
                        agents.map((agent) => (
                          <div
                            key={agent.id}
                            className={`relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-slate-50 ${
                              formData.assignedAgents.includes(agent.id) ? 'bg-slate-100' : ''
                            }`}
                            onClick={() => toggleAgentSelection(agent.id)}
                          >
                            <span className="block truncate">
                              {agent.username} ({agent.role})
                              {agent.extension && ` - Ext: ${agent.extension}`}
                            </span>
                            {formData.assignedAgents.includes(agent.id) && (
                              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-600">
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Selected: {formData.assignedAgents.length} agent(s)
                  </div>
                </div>
              )}
            </div>

            {/* Queue Configuration */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 border-b pb-2">Queue Configuration</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ring Strategy</label>
                  <select
                    value={formData.ringStrategy}
                    onChange={(e) => setFormData({...formData, ringStrategy: e.target.value})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  >
                    <option value="round_robin">Round Robin</option>
                    <option value="longest_idle">Longest Idle</option>
                    <option value="random">Random</option>
                    <option value="sequential">Sequential</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Call Timeout (seconds)</label>
                  <input
                    type="number"
                    value={formData.callTimeout}
                    onChange={(e) => setFormData({...formData, callTimeout: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                    min="10"
                    max="300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  >
                    <option value="1">1 - Lowest</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 - Highest</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-md font-medium text-gray-900 border-b pb-2 w-full"
              >
                <span>Advanced Settings</span>
                <span className="ml-2">{showAdvanced ? '▼' : '▶'}</span>
              </button>

              {showAdvanced && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-md">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Queue Time (seconds)</label>
                      <input
                        type="number"
                        value={formData.maxQueueTime}
                        onChange={(e) => setFormData({...formData, maxQueueTime: parseInt(e.target.value)})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                        min="60"
                        max="3600"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Queue Size</label>
                      <input
                        type="number"
                        value={formData.maxQueueSize}
                        onChange={(e) => setFormData({...formData, maxQueueSize: parseInt(e.target.value)})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">If Queue Empty</label>
                      <select
                        value={formData.queueEmptyAction}
                        onChange={(e) => setFormData({...formData, queueEmptyAction: e.target.value as any})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                      >
                        <option value="hangup">Hang Up</option>
                        <option value="voicemail">Go to Voicemail</option>
                        <option value="transfer">Transfer to Extension</option>
                        <option value="play_audio">Play Audio File</option>
                      </select>
                      {formData.queueEmptyAction === 'transfer' && (
                        <input
                          type="text"
                          value={formData.queueEmptyDestination}
                          onChange={(e) => setFormData({...formData, queueEmptyDestination: e.target.value})}
                          className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                          placeholder="Extension number"
                        />
                      )}
                      {formData.queueEmptyAction === 'play_audio' && (
                        <div className="mt-2">
                          <select
                            value={formData.queueEmptyAudioFile}
                            onChange={(e) => setFormData({...formData, queueEmptyAudioFile: e.target.value})}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                          >
                            <option value="">Select audio file...</option>
                            {audioFilesLoading ? (
                              <option disabled>Loading audio files...</option>
                            ) : (
                              audioFiles.map((file) => (
                                <option key={file} value={file}>
                                  {file}
                                </option>
                              ))
                            )}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Select an audio file from the system to play when queue is empty
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Out of Hours Action</label>
                      <select
                        value={formData.outOfHoursAction}
                        onChange={(e) => setFormData({...formData, outOfHoursAction: e.target.value as any})}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                      >
                        <option value="voicemail">Go to Voicemail</option>
                        <option value="hangup">Hang Up</option>
                        <option value="transfer">Transfer to Extension</option>
                        <option value="play_audio">Play Audio File</option>
                      </select>
                      {formData.outOfHoursAction === 'transfer' && (
                        <input
                          type="text"
                          value={formData.outOfHoursDestination}
                          onChange={(e) => setFormData({...formData, outOfHoursDestination: e.target.value})}
                          className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                          placeholder="Extension number"
                        />
                      )}
                      {formData.outOfHoursAction === 'play_audio' && (
                        <div className="mt-2">
                          <select
                            value={formData.outOfHoursAudioFile}
                            onChange={(e) => setFormData({...formData, outOfHoursAudioFile: e.target.value})}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                          >
                            <option value="">Select audio file...</option>
                            {audioFilesLoading ? (
                              <option disabled>Loading audio files...</option>
                            ) : (
                              audioFiles.map((file) => (
                                <option key={file} value={file}>
                                  {file}
                                </option>
                              ))
                            )}
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Select an audio file from the system to play during out of hours
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingQueue(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateQueue}
                disabled={!formData.name || !formData.displayName || loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 disabled:bg-gray-300"
              >
                {loading ? 'Saving...' : (editingQueue ? 'Update Queue' : 'Create Queue')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-sm text-gray-500">Loading queues...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading queues</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Inbound Queues</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage call routing queues and agent assignments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingQueue(null);
            resetForm();
            setShowCreateForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Queue
        </button>
      </div>

      {queues.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inbound Queues</h3>
          <p className="text-gray-500 mb-4">Create your first queue to start routing calls to agents</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-visible sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {queues.map((queue) => (
              <li key={queue.id} className="px-6 py-4 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{queue.displayName}</h4>
                        <button
                          onClick={() => toggleQueueStatus(queue.id, queue.isActive)}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            queue.isActive 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          } transition-colors`}
                        >
                          <PowerIcon className="h-3 w-3 mr-1" />
                          {queue.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-sm text-gray-500">{queue.description || queue.name}</p>
                      <div className="mt-1 flex items-center space-x-4 text-xs text-gray-400">
                        <span className="flex items-center">
                          <UsersIcon className="h-3 w-3 mr-1" />
                          {queue.assignedAgents.length} agents
                        </span>
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          Priority {queue.priority}
                        </span>
                        <span className="flex items-center">
                          <PhoneIcon className="h-3 w-3 mr-1" />
                          {queue.ringStrategy.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === queue.id ? null : queue.id)}
                      className="inline-flex items-center p-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4" />
                    </button>
                    
                    {activeDropdown === queue.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 border border-gray-200 z-[100]">
                        <div className="py-2">
                          <button
                            onClick={() => editQueue(queue)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                          >
                            <PencilIcon className="h-4 w-4 mr-3" />
                            <span>Edit Queue</span>
                          </button>
                          <button
                            onClick={() => duplicateQueue(queue)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4 mr-3" />
                            <span>Duplicate Queue</span>
                          </button>
                          <button
                            onClick={() => toggleQueueStatus(queue.id, queue.isActive)}
                            className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
                          >
                            <PowerIcon className="h-4 w-4 mr-3" />
                            <span>{queue.isActive ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={() => deleteQueue(queue.id)}
                            className="flex items-center px-4 py-3 text-sm text-red-700 hover:bg-red-50 w-full text-left transition-colors"
                          >
                            <TrashIcon className="h-4 w-4 mr-3" />
                            <span>Delete Queue</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InboundQueuesManager;
