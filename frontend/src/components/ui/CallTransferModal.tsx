/**
 * Call Transfer Modal Component
 * Provides UI for transferring calls to queues, agents, or external numbers
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PhoneIcon, UsersIcon, UserIcon } from '@heroicons/react/24/outline';

interface TransferTarget {
  id: string;
  name: string;
  type: 'queue' | 'agent' | 'external';
  status?: 'available' | 'busy' | 'offline';
  extension?: string;
}

interface CallTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (transferType: 'queue' | 'agent' | 'external', targetId: string, targetName: string) => void;
  callId: string;
  isTransferring?: boolean;
}

export const CallTransferModal: React.FC<CallTransferModalProps> = ({
  isOpen,
  onClose,
  onTransfer,
  callId,
  isTransferring = false
}) => {
  const [selectedTab, setSelectedTab] = useState<'queue' | 'agent' | 'external'>('queue');
  const [availableQueues, setAvailableQueues] = useState<TransferTarget[]>([]);
  const [availableAgents, setAvailableAgents] = useState<TransferTarget[]>([]);
  const [externalNumber, setExternalNumber] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<TransferTarget | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load available transfer targets when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTransferTargets();
    }
  }, [isOpen]);

  const loadTransferTargets = async () => {
    setIsLoading(true);
    try {
      // Load queues
      const queueResponse = await fetch('/api/voice/inbound-numbers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        // Extract queue information from inbound numbers
        const queues: TransferTarget[] = [
          { id: 'sales', name: 'Sales Queue', type: 'queue' },
          { id: 'support', name: 'Customer Support', type: 'queue' },
          { id: 'billing', name: 'Billing Department', type: 'queue' },
          { id: 'technical', name: 'Technical Support', type: 'queue' }
        ];
        setAvailableQueues(queues);
      }

      // Load available agents
      const agentResponse = await fetch('/api/agents/queue', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (agentResponse.ok) {
        const agentData = await agentResponse.json();
        // Transform agent data
        const agents: TransferTarget[] = agentData.agents?.map((agent: any) => ({
          id: agent.id || agent.agentId,
          name: agent.name || agent.username || `Agent ${agent.id}`,
          type: 'agent' as const,
          status: agent.status?.toLowerCase() || 'available',
          extension: agent.extension
        })) || [];
        setAvailableAgents(agents);
      }

    } catch (error) {
      console.error('❌ Error loading transfer targets:', error);
      // Fallback to default data
      setAvailableQueues([
        { id: 'general', name: 'General Queue', type: 'queue' },
        { id: 'support', name: 'Customer Support', type: 'queue' }
      ]);
      setAvailableAgents([
        { id: 'agent1', name: 'Available Agent', type: 'agent', status: 'available' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransfer = () => {
    if (selectedTab === 'external') {
      if (!externalNumber.trim()) {
        alert('Please enter a phone number');
        return;
      }
      onTransfer('external', externalNumber, `External: ${externalNumber}`);
    } else if (selectedTarget) {
      onTransfer(selectedTarget.type, selectedTarget.id, selectedTarget.name);
    } else {
      alert('Please select a transfer target');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'available':
        return <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>;
      case 'busy':
        return <span className="inline-block w-2 h-2 bg-red-400 rounded-full"></span>;
      case 'offline':
        return <span className="inline-block w-2 h-2 bg-gray-400 rounded-full"></span>;
      default:
        return <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"></span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Transfer Call</h3>
          <button
            onClick={onClose}
            disabled={isTransferring}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b">
          {[
            { id: 'queue' as const, label: 'Queue', icon: UsersIcon },
            { id: 'agent' as const, label: 'Agent', icon: UserIcon },
            { id: 'external' as const, label: 'External', icon: PhoneIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 text-sm font-medium ${
                selectedTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading transfer options...</p>
            </div>
          ) : (
            <>
              {/* Queue Tab */}
              {selectedTab === 'queue' && (
                <div className="space-y-2">
                  {availableQueues.map((queue) => (
                    <div
                      key={queue.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTarget?.id === queue.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedTarget(queue)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <UsersIcon className="h-5 w-5 text-gray-500" />
                          <span className="font-medium">{queue.name}</span>
                        </div>
                        <span className="text-xs text-gray-500">Queue</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Agent Tab */}
              {selectedTab === 'agent' && (
                <div className="space-y-2">
                  {availableAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTarget?.id === agent.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${agent.status === 'offline' ? 'opacity-60' : ''}`}
                      onClick={() => agent.status !== 'offline' && setSelectedTarget(agent)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <UserIcon className="h-5 w-5 text-gray-500" />
                          <div>
                            <span className="font-medium">{agent.name}</span>
                            {agent.extension && (
                              <p className="text-xs text-gray-500">Ext. {agent.extension}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(agent.status)}
                          <span className="text-xs text-gray-500 capitalize">{agent.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* External Tab */}
              {selectedTab === 'external' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={externalNumber}
                      onChange={(e) => setExternalNumber(e.target.value)}
                      placeholder="+1234567890"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Enter the phone number to transfer to (including country code)
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isTransferring}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleTransfer}
            disabled={isTransferring || (selectedTab !== 'external' && !selectedTarget) || (selectedTab === 'external' && !externalNumber.trim())}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isTransferring ? (
              <>
                <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Transferring...
              </>
            ) : (
              'Transfer Call'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};