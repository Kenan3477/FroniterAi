'use client';

import { useState, useEffect } from 'react';
import { 
  UserIcon,
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
  const [loading, setLoading] = useState(true);

  const fetchQueueData = async () => {
    try {
      const response = await fetch('/api/agent/queue');
      const result = await response.json();
      
      if (result.success) {
        setQueueData(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch queue data:', error);
    } finally {
      setLoading(false);
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
      case 'available': return 'text-slate-600 bg-green-100';
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
              <div className="text-2xl font-bold text-slate-600">{queueData.summary.available}</div>
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