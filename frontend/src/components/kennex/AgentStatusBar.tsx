'use client';

import React, { useState, useEffect } from 'react';

interface AgentStatus {
  status: 'available' | 'away' | 'paused';
  statusSince: string;
}

const AgentStatusBar = () => {
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({
    status: 'away',
    statusSince: new Date().toISOString()
  });
  const [timeInStatus, setTimeInStatus] = useState('00:00:00');

  useEffect(() => {
    const updateTime = () => {
      const statusTime = new Date(agentStatus.statusSince);
      const now = new Date();
      const diff = Math.floor((now.getTime() - statusTime.getTime()) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      setTimeInStatus(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    const interval = setInterval(updateTime, 1000);
    updateTime();
    
    return () => clearInterval(interval);
  }, [agentStatus.statusSince]);

  const updateStatus = async (newStatus: 'available' | 'away' | 'paused') => {
    try {
      const response = await fetch('/api/kennex/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const result = await response.json();
        setAgentStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
    }
  };

  const getStatusText = () => {
    switch (agentStatus.status) {
      case 'available':
        return 'Available';
      case 'away':
        return 'Paused – Away';
      case 'paused':
        return 'Paused';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="bg-orange-500 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="font-medium">
          You are {getStatusText()} {timeInStatus}
        </span>
      </div>
      {agentStatus.status !== 'available' && (
        <button
          onClick={() => updateStatus('available')}
          className="bg-green-600 hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
        >
          Go Available
        </button>
      )}
    </div>
  );
};

export default AgentStatusBar;