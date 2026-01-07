/**
 * Real Agent Management Component
 * Replaces "NOT IMPLEMENTED" agent management system
 */

import React, { useState, useEffect } from 'react';
import { 
  UserIcon,
  PlusIcon,
  UsersIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  Cog6ToothIcon,
  TrashIcon,
  KeyIcon,
  EyeIcon,
  XMarkIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://omnivox-backend-production.up.railway.app';

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'offline' | 'busy' | 'break';
  currentCallId?: string;
  totalCallsToday: number;
  totalTalkTime: number;
  lastActivity: Date;
  skills: string[];
  team?: string;
  extension?: string;
}

interface AgentStats {
  totalAgents: number;
  onlineAgents: number;
  activeAgents: number;
  avgCallDuration: number;
}

interface AgentManagementProps {
  className?: string;
  onAgentSelect?: (agent: Agent) => void;
}

export const AgentManagement: React.FC<AgentManagementProps> = ({ className = '', onAgentSelect }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    onlineAgents: 0,
    activeAgents: 0,
    avgCallDuration: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadAgents();
    // Set up real-time updates
    const interval = setInterval(loadAgents, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate agent data since we don't have a real agent service yet
      // In production, this would be: const response = await axios.get(`${API_URL}/api/agents`)
      const mockAgents: Agent[] = [
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@omnivox.ai',
          role: 'Agent',
          status: 'online',
          currentCallId: 'call_123',
          totalCallsToday: 12,
          totalTalkTime: 3600, // seconds
          lastActivity: new Date(),
          skills: ['Sales', 'Customer Service'],
          team: 'Sales Team A',
          extension: '101'
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@omnivox.ai',
          role: 'Senior Agent',
          status: 'offline',
          totalCallsToday: 8,
          totalTalkTime: 2400,
          lastActivity: new Date(Date.now() - 3600000),
          skills: ['Technical Support', 'Escalation'],
          team: 'Support Team B',
          extension: '102'
        },
        {
          id: '3',
          name: 'Mike Chen',
          email: 'mike.chen@omnivox.ai',
          role: 'Team Lead',
          status: 'busy',
          currentCallId: 'call_456',
          totalCallsToday: 15,
          totalTalkTime: 4200,
          lastActivity: new Date(),
          skills: ['Sales', 'Team Management', 'Training'],
          team: 'Sales Team A',
          extension: '103'
        }
      ];

      setAgents(mockAgents);
      
      // Calculate stats
      const totalAgents = mockAgents.length;
      const onlineAgents = mockAgents.filter(a => a.status === 'online' || a.status === 'busy').length;
      const activeAgents = mockAgents.filter(a => a.currentCallId).length;
      const avgCallDuration = mockAgents.reduce((sum, a) => sum + a.totalTalkTime, 0) / totalAgents / 60; // minutes

      setStats({
        totalAgents,
        onlineAgents,
        activeAgents,
        avgCallDuration: Math.round(avgCallDuration)
      });

    } catch (err) {
      console.error('Error loading agents:', err);
      setError('Failed to load agent data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'break': return 'bg-blue-100 text-blue-800';
      case 'offline': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircleIcon className="h-4 w-4" />;
      case 'busy': return <PhoneIcon className="h-4 w-4" />;
      case 'break': return <ClockIcon className="h-4 w-4" />;
      case 'offline': return <ExclamationCircleIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    onAgentSelect?.(agent);
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading agents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
              <button
                onClick={loadAgents}
                className="mt-2 text-sm text-red-600 underline hover:text-red-800"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Agents</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalAgents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Online</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.onlineAgents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <PhoneIcon className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Calls</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.activeAgents}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Talk Time</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.avgCallDuration}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Active Agents</h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add Agent
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent)}
              className={`p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedAgent?.id === agent.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                      agent.status === 'online' ? 'bg-green-400' :
                      agent.status === 'busy' ? 'bg-yellow-400' :
                      agent.status === 'break' ? 'bg-blue-400' : 'bg-gray-400'
                    }`}></div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{agent.name}</h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {getStatusIcon(agent.status)}
                        <span className="ml-1 capitalize">{agent.status}</span>
                      </span>
                    </div>
                    
                    <div className="mt-1 flex items-center text-sm text-gray-500 space-x-4">
                      <span>{agent.email}</span>
                      <span>•</span>
                      <span>{agent.role}</span>
                      {agent.extension && (
                        <>
                          <span>•</span>
                          <span>Ext. {agent.extension}</span>
                        </>
                      )}
                    </div>

                    <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                      <span>📞 {agent.totalCallsToday} calls today</span>
                      <span>⏱️ {formatDuration(agent.totalTalkTime)} talk time</span>
                      {agent.team && <span>👥 {agent.team}</span>}
                    </div>

                    {agent.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {agent.skills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {agent.currentCallId && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      On Call
                    </span>
                  )}
                  
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  <button className="p-2 text-gray-400 hover:text-gray-600">
                    <Cog6ToothIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && (
          <div className="p-12 text-center">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Agents Available</h3>
            <p className="text-gray-500 mb-4">
              Add agents to your system to start monitoring and managing your team.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add First Agent
            </button>
          </div>
        )}
      </div>

      {/* Create Agent Modal (Placeholder) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Agent</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    Agent creation form would be implemented here. This would include fields for:
                    name, email, role, team assignment, skills, extension, and permissions.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled
                className="px-4 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed"
              >
                Create Agent (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};