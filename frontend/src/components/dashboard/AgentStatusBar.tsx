'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AgentStatusData {
  status: string;
  status_since: string;
}

const AgentStatusBar = () => {
  const [statusTimer, setStatusTimer] = useState('');
  const queryClient = useQueryClient();

  // Fetch current agent status
  const { data: agentStatus, error } = useQuery({
    queryKey: ['agent-status'],
    queryFn: async (): Promise<AgentStatusData> => {
      const response = await fetch('/api/agent/status');
      if (!response.ok) {
        throw new Error('Failed to fetch agent status');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation to update agent status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch('/api/agent/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
    },
  });

  // Update timer display
  useEffect(() => {
    if (!agentStatus) return;

    const updateTimer = () => {
      const now = new Date();
      const statusSince = new Date(agentStatus.status_since);
      const diff = now.getTime() - statusSince.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setStatusTimer(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setStatusTimer(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [agentStatus]);

  const handleGoAvailable = () => {
    updateStatusMutation.mutate('available');
  };

  if (error) {
    return (
      <div className="bg-red-500 text-white px-6 py-3 flex items-center justify-between">
        <span>Error loading agent status</span>
      </div>
    );
  }

  if (!agentStatus) {
    return (
      <div className="bg-gray-500 text-white px-6 py-3 flex items-center justify-between">
        <span>Loading agent status...</span>
      </div>
    );
  }

  const getStatusDisplay = () => {
    const status = agentStatus.status.toLowerCase();
    switch (status) {
      case 'available':
        return 'You are Available';
      case 'break':
        return 'You are Paused – Away';
      case 'oncall':
        return 'You are On Call';
      default:
        return `You are ${agentStatus.status}`;
    }
  };

  const getStatusColor = () => {
    const status = agentStatus.status.toLowerCase();
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'break':
      case 'offline':
        return 'bg-orange-500';
      case 'oncall':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isAvailable = agentStatus.status.toLowerCase() === 'available';

  return (
    <div className={`${getStatusColor()} text-white px-6 py-3 flex items-center justify-between`}>
      <div className="flex items-center space-x-4">
        <span className="text-lg font-medium">{getStatusDisplay()}</span>
        {statusTimer && (
          <span className="text-sm opacity-90">
            {statusTimer}
          </span>
        )}
      </div>
      
      {!isAvailable && (
        <button
          onClick={handleGoAvailable}
          disabled={updateStatusMutation.isPending}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          {updateStatusMutation.isPending ? 'Updating...' : 'Go Available'}
        </button>
      )}
    </div>
  );
};

export default AgentStatusBar;