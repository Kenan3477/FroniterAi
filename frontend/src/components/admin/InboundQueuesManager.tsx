/**
 * Inbound Queues Manager Component
 * Complete implementation for managing call routing queues
 */

import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  ClockIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

// Interface definitions
interface InboundQueue {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  assignedAgents: string[]; // Array of agent IDs/extensions
  businessHoursEnabled: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: string;
  timezone?: string;
  maxQueueSize?: number;
  overflowAction: string;
  overflowDestination?: string;
  outOfHoursAction: string;
  outOfHoursDestination?: string;
  ringStrategy: string;
  callTimeout: number;
  maxWaitTime: number;
  priority: number;
  skillTags: string[];
  inboundNumbersCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface QueueFormData {
  name: string;
  displayName: string;
  description: string;
  isActive: boolean;
  assignedAgents: string[];
  businessHoursEnabled: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
  businessDays: string;
  timezone: string;
  maxQueueSize: number;
  overflowAction: string;
  overflowDestination: string;
  outOfHoursAction: string;
  outOfHoursDestination: string;
  ringStrategy: string;
  callTimeout: number;
  maxWaitTime: number;
  priority: number;
  skillTags: string[];
}

const InboundQueuesManager: React.FC = () => {
  const [queues, setQueues] = useState<InboundQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingQueue, setEditingQueue] = useState<InboundQueue | null>(null);
  const [formData, setFormData] = useState<QueueFormData>({
    name: '',
    displayName: '',
    description: '',
    isActive: true,
    assignedAgents: [],
    businessHoursEnabled: true,
    businessHoursStart: '09:00',
    businessHoursEnd: '17:00',
    businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
    timezone: 'Europe/London',
    maxQueueSize: 50,
    overflowAction: 'voicemail',
    overflowDestination: '',
    outOfHoursAction: 'voicemail',
    outOfHoursDestination: '',
    ringStrategy: 'round_robin',
    callTimeout: 30,
    maxWaitTime: 300,
    priority: 1,
    skillTags: []
  });

  // Load queues from API
  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use Next.js API route which handles authentication via cookies
      const response = await fetch('/api/voice/inbound-queues', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch queues: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📋 Fetched inbound queues:', data);

      if (data.success) {
        setQueues(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to fetch queues');
      }

    } catch (error) {
      console.error('❌ Error fetching inbound queues:', error);
      setError(error instanceof Error ? error.message : 'Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const url = editingQueue 
        ? `/api/voice/inbound-queues/${editingQueue.id}`
        : '/api/voice/inbound-queues';
      
      const method = editingQueue ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save queue: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchQueues(); // Refresh the list
        handleCloseForm();
      } else {
        throw new Error(data.error || 'Failed to save queue');
      }

    } catch (error) {
      console.error('❌ Error saving queue:', error);
      setError(error instanceof Error ? error.message : 'Failed to save queue');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (queueId: string) => {
    if (!confirm('Are you sure you want to delete this queue?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/voice/inbound-queues/${queueId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete queue: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        await fetchQueues(); // Refresh the list
      } else {
        throw new Error(data.error || 'Failed to delete queue');
      }

    } catch (error) {
      console.error('❌ Error deleting queue:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete queue');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (queue: InboundQueue) => {
    setEditingQueue(queue);
    setFormData({
      name: queue.name,
      displayName: queue.displayName,
      description: queue.description || '',
      isActive: queue.isActive,
      assignedAgents: queue.assignedAgents || [],
      businessHoursEnabled: queue.businessHoursEnabled,
      businessHoursStart: queue.businessHoursStart || '09:00',
      businessHoursEnd: queue.businessHoursEnd || '17:00',
      businessDays: queue.businessDays || 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: queue.timezone || 'Europe/London',
      maxQueueSize: queue.maxQueueSize || 50,
      overflowAction: queue.overflowAction,
      overflowDestination: queue.overflowDestination || '',
      outOfHoursAction: queue.outOfHoursAction,
      outOfHoursDestination: queue.outOfHoursDestination || '',
      ringStrategy: queue.ringStrategy,
      callTimeout: queue.callTimeout,
      maxWaitTime: queue.maxWaitTime,
      priority: queue.priority,
      skillTags: queue.skillTags || []
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingQueue(null);
    setFormData({
      name: '',
      displayName: '',
      description: '',
      isActive: true,
      assignedAgents: [],
      businessHoursEnabled: true,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'Europe/London',
      maxQueueSize: 50,
      overflowAction: 'voicemail',
      overflowDestination: '',
      outOfHoursAction: 'voicemail',
      outOfHoursDestination: '',
      ringStrategy: 'round_robin',
      callTimeout: 30,
      maxWaitTime: 300,
      priority: 1,
      skillTags: []
    });
  };

  const handleToggleStatus = async (queueId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/voice/inbound-queues/${queueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        await fetchQueues(); // Refresh the list
      }
    } catch (error) {
      console.error('Error toggling queue status:', error);
    }
  };

  // Helper functions
  const formatBusinessHours = (queue: InboundQueue) => {
    if (!queue.businessHoursEnabled) return '24/7';
    return `${queue.businessHoursStart} - ${queue.businessHoursEnd}`;
  };

  const formatBusinessDays = (days: string) => {
    if (!days) return '';
    const dayList = days.split(',');
    if (dayList.length === 7) return 'Daily';
    if (dayList.length === 5 && !dayList.includes('Saturday') && !dayList.includes('Sunday')) return 'Weekdays';
    return dayList.join(', ');
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'text-red-600 bg-red-100';
    if (priority >= 3) return 'text-orange-600 bg-orange-100';
    if (priority >= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getRingStrategyDisplay = (strategy: string) => {
    const strategies: { [key: string]: string } = {
      round_robin: 'Round Robin',
      longest_idle: 'Longest Idle',
      random: 'Random',
      sequential: 'Sequential'
    };
    return strategies[strategy] || strategy;
  };

  if (loading && queues.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inbound queues...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <InboundQueueForm
        formData={formData}
        setFormData={setFormData}
        onSave={handleSave}
        onCancel={handleCloseForm}
        isEditing={!!editingQueue}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Inbound Queues</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage call routing queues and agent assignments
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Queue
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Queues Table */}
      {queues.length === 0 ? (
        <div className="text-center py-12">
          <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Inbound Queues</h3>
          <p className="text-gray-500 mb-4">Create your first queue to start routing calls to agents</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-600 hover:bg-slate-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Queue
          </button>
        </div>
      ) : (
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Queue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agents
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {queues.map((queue) => (
                <tr key={queue.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {queue.displayName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {queue.description || queue.name}
                        </div>
                        {queue.inboundNumbersCount && queue.inboundNumbersCount > 0 && (
                          <div className="text-xs text-blue-600">
                            {queue.inboundNumbersCount} inbound number{queue.inboundNumbersCount > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {queue.assignedAgents.length} agent{queue.assignedAgents.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-500">
                      {getRingStrategyDisplay(queue.ringStrategy)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatBusinessHours(queue)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatBusinessDays(queue.businessDays || '')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(queue.priority)}`}>
                      Priority {queue.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(queue.id, queue.isActive)}
                      className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                      style={{
                        backgroundColor: queue.isActive ? '#10B981' : '#D1D5DB'
                      }}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                          queue.isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(queue)}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(queue.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Queue Form Component
interface QueueFormProps {
  formData: QueueFormData;
  setFormData: React.Dispatch<React.SetStateAction<QueueFormData>>;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
  loading: boolean;
  error: string | null;
}

const InboundQueueForm: React.FC<QueueFormProps> = ({
  formData,
  setFormData,
  onSave,
  onCancel,
  isEditing,
  loading,
  error
}) => {
  const handleAgentAdd = () => {
    const newAgent = prompt('Enter agent extension or ID:');
    if (newAgent && !formData.assignedAgents.includes(newAgent)) {
      setFormData(prev => ({
        ...prev,
        assignedAgents: [...prev.assignedAgents, newAgent]
      }));
    }
  };

  const handleAgentRemove = (agent: string) => {
    setFormData(prev => ({
      ...prev,
      assignedAgents: prev.assignedAgents.filter(a => a !== agent)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Queue' : 'Create New Queue'}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircleIcon className="h-6 w-6" />
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Queue Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="e.g., Customer Service"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              placeholder="Queue description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value={1}>1 - Lowest</option>
              <option value={2}>2 - Low</option>
              <option value={3}>3 - Normal</option>
              <option value={4}>4 - High</option>
              <option value={5}>5 - Highest</option>
            </select>
          </div>
        </div>

        {/* Agent Assignment */}
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">Agent Assignment</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Ring Strategy</label>
            <select
              value={formData.ringStrategy}
              onChange={(e) => setFormData(prev => ({ ...prev, ringStrategy: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
            >
              <option value="round_robin">Round Robin</option>
              <option value="longest_idle">Longest Idle</option>
              <option value="random">Random</option>
              <option value="sequential">Sequential</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Assigned Agents</label>
            <div className="mt-1 flex flex-wrap gap-2 mb-2">
              {formData.assignedAgents.map((agent) => (
                <span
                  key={agent}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {agent}
                  <button
                    onClick={() => handleAgentRemove(agent)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAgentAdd}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Agent
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Call Timeout (seconds)</label>
              <input
                type="number"
                value={formData.callTimeout}
                onChange={(e) => setFormData(prev => ({ ...prev, callTimeout: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                min={10}
                max={300}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Max Queue Size</label>
              <input
                type="number"
                value={formData.maxQueueSize}
                onChange={(e) => setFormData(prev => ({ ...prev, maxQueueSize: parseInt(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                min={1}
                max={1000}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900">Business Hours</h4>
        
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.businessHoursEnabled}
            onChange={(e) => setFormData(prev => ({ ...prev, businessHoursEnabled: e.target.checked }))}
            className="h-4 w-4 text-slate-600 focus:ring-slate-500 border-gray-300 rounded"
          />
          <label className="text-sm font-medium text-gray-700">Enable Business Hours</label>
        </div>

        {formData.businessHoursEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="time"
                value={formData.businessHoursStart}
                onChange={(e) => setFormData(prev => ({ ...prev, businessHoursStart: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="time"
                value={formData.businessHoursEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, businessHoursEnd: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Business Days</label>
              <input
                type="text"
                value={formData.businessDays}
                onChange={(e) => setFormData(prev => ({ ...prev, businessDays: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                placeholder="Monday,Tuesday,Wednesday,Thursday,Friday"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Overflow & Out of Hours Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Overflow Handling</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Overflow Action</label>
              <select
                value={formData.overflowAction}
                onChange={(e) => setFormData(prev => ({ ...prev, overflowAction: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="voicemail">Voicemail</option>
                <option value="hangup">Hangup</option>
                <option value="transfer">Transfer</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            {formData.overflowAction === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Transfer Destination</label>
                <input
                  type="text"
                  value={formData.overflowDestination}
                  onChange={(e) => setFormData(prev => ({ ...prev, overflowDestination: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  placeholder="Extension or queue name"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Out of Hours</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Out of Hours Action</label>
              <select
                value={formData.outOfHoursAction}
                onChange={(e) => setFormData(prev => ({ ...prev, outOfHoursAction: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
              >
                <option value="voicemail">Voicemail</option>
                <option value="hangup">Hangup</option>
                <option value="transfer">Transfer</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            {formData.outOfHoursAction === 'transfer' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Transfer Destination</label>
                <input
                  type="text"
                  value={formData.outOfHoursDestination}
                  onChange={(e) => setFormData(prev => ({ ...prev, outOfHoursDestination: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-slate-500 focus:ring-slate-500"
                  placeholder="Extension or queue name"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (isEditing ? 'Update Queue' : 'Create Queue')}
        </button>
      </div>
    </div>
  );
};

export default InboundQueuesManager;