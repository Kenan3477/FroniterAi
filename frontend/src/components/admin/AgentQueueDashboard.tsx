'use client';

import { useState, useEffect } from 'react';
import { 
  UserIcon,
  PhoneIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface AgentStatus {
  id: string;
  name: string;
  status: 'offline' | 'available' | 'busy';
  sipRegistered: boolean;
  lastUpdate: string;
}

interface AgentQueueData {
  agents: AgentStatus[];
  summary: {
    total: number;
    available: number;
    busy: number;
    offline: number;
  };
}

interface AgentQueueDashboardProps {
  onStatusChange?: (status: string) => void;
}

export default function AgentQueueDashboard({ onStatusChange }: AgentQueueDashboardProps) {
  const [queueData, setQueueData] = useState<AgentQueueData | null>(null);
  const [currentStatus, setCurrentStatus] = useState<'offline' | 'available' | 'busy'>('offline');
  const [sipConnected, setSipConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const agentId = 'agent-1'; // In production, get from auth context

  const fetchQueueData = async () => {
    try {
      const response = await fetch('/api/agent/queue');
      const result = await response.json();
      
      if (result.success) {
        setQueueData(result.data);
        const currentAgent = result.data.agents.find((agent: AgentStatus) => agent.id === agentId);
        if (currentAgent) {
          setCurrentStatus(currentAgent.status);
          setSipConnected(currentAgent.sipRegistered);
        }
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAgentStatus = async (newStatus: 'offline' | 'available' | 'busy') => {
    try {
      const response = await fetch('/api/agent/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          status: newStatus,
          sipRegistered: sipConnected
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setCurrentStatus(newStatus);
        onStatusChange?.(newStatus);
        fetchQueueData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const updateSipStatus = async (registered: boolean) => {
    try {
      const response = await fetch('/api/agent/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          status: currentStatus,
          sipRegistered: registered
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSipConnected(registered);
        fetchQueueData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to update SIP status:', error);
    }
  };

  useEffect(() => {
    fetchQueueData();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchQueueData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-red-600 bg-red-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return CheckCircleIcon;
      case 'busy': return ClockIcon;
      case 'offline': return ExclamationTriangleIcon;
      default: return UserIcon;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Your Status Control */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Agent Status</h3>
        
        {/* SIP Connection Status */}
        <div className="mb-4 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <PhoneIcon className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">SIP Dialer</div>
                <div className={`text-sm ${sipConnected ? 'text-green-600' : 'text-red-600'}`}>
                  {sipConnected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <a
                href="/sip-dialer"
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Open Dialer
              </a>
              {sipConnected ? (
                <button
                  onClick={() => updateSipStatus(false)}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => updateSipStatus(true)}
                  className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Connect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Buttons */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-3">Set your availability status:</div>
          
          <div className="grid grid-cols-3 gap-2">
            {[
              { status: 'available' as const, label: 'Available', description: 'Ready to take calls' },
              { status: 'busy' as const, label: 'Busy', description: 'On a call or occupied' },
              { status: 'offline' as const, label: 'Offline', description: 'Not available' }
            ].map(({ status, label, description }) => {
              const StatusIcon = getStatusIcon(status);
              const isActive = currentStatus === status;
              
              return (
                <button
                  key={status}
                  onClick={() => updateAgentStatus(status)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isActive 
                      ? 'border-kennex-500 bg-kennex-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <StatusIcon className={`w-6 h-6 ${isActive ? 'text-kennex-600' : 'text-gray-500'}`} />
                    <div className={`font-medium ${isActive ? 'text-kennex-900' : 'text-gray-900'}`}>
                      {label}
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                      {description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Status Display */}
        <div className="mt-4 p-3 rounded-lg bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              currentStatus === 'available' ? 'bg-green-500' :
              currentStatus === 'busy' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></div>
            <span className="text-sm text-gray-700">
              Currently: <strong className="capitalize">{currentStatus}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Queue Overview */}
      {queueData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Queue Overview</h3>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{queueData.summary.total}</div>
              <div className="text-sm text-gray-500">Total Agents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{queueData.summary.available}</div>
              <div className="text-sm text-gray-500">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{queueData.summary.busy}</div>
              <div className="text-sm text-gray-500">Busy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{queueData.summary.offline}</div>
              <div className="text-sm text-gray-500">Offline</div>
            </div>
          </div>

          <div className="space-y-2">
            {queueData.agents.map((agent) => {
              const StatusIcon = getStatusIcon(agent.status);
              
              return (
                <div key={agent.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <StatusIcon className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium text-gray-900">{agent.name}</div>
                      <div className="text-sm text-gray-500">ID: {agent.id}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(agent.status)}`}>
                      {agent.status}
                    </span>
                    {agent.sipRegistered && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full text-blue-600 bg-blue-100">
                        SIP Connected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}