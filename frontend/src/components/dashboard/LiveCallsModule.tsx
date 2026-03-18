'use client';

import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  SpeakerWaveIcon,
  MicrophoneIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface LiveCall {
  callId: string;
  agentId: string;
  agentName: string;
  phoneNumber: string;
  campaignId: string;
  campaignName: string;
  callDuration: number;
  callStatus: string;
  isAnsweringMachine: boolean;
  confidence: number;
  sentimentScore: number;
  intentClassification: string;
}

interface LiveCallsModuleProps {
  className?: string;
}

export default function LiveCallsModule({ className = '' }: LiveCallsModuleProps) {
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listeningCall, setListeningCall] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  useEffect(() => {
    fetchLiveCalls();
    
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchLiveCalls, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchLiveCalls = async () => {
    try {
      const token = localStorage.getItem('omnivox_token');
      if (!token) {
        setError('Authentication token not found');
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
      
      const response = await fetch(`${backendUrl}/api/live-analysis/active-calls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLiveCalls(data.data.activeCalls || []);
        setError(null);
      } else {
        console.error('Failed to fetch live calls:', response.statusText);
        setError(`Failed to fetch live calls: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Error fetching live calls:', err);
      setError('Error fetching live calls');
    } finally {
      setLoading(false);
    }
  };

  const handleListenLive = async (callId: string) => {
    try {
      const token = localStorage.getItem('omnivox_token');
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
      
      const response = await fetch(`${backendUrl}/api/live-analysis/listen-live`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ callId })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set up live listening
        setListeningCall(callId);
        
        // Connect to Twilio WebSocket for live audio (placeholder for now)
        console.log('🎧 Live listening session started:', data.data);
        
        // TODO: Implement actual WebSocket connection to Twilio media stream
        // For now, just show that listening is active
        
        alert(`Live monitoring started for call ${callId}. Audio stream will be available in production.`);
        
      } else {
        const errorData = await response.json();
        alert(`Failed to start live monitoring: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error starting live monitoring:', err);
      alert('Error starting live monitoring');
    }
  };

  const stopListening = () => {
    setListeningCall(null);
    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'ringing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={`theme-card shadow-sm rounded-lg ${className}`}>
        <div className="p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center">
            <PhoneIcon className="h-5 w-5 mr-2" />
            Live Calls
          </h3>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 theme-text-secondary">Loading live calls...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`theme-card shadow-sm rounded-lg ${className}`}>
        <div className="p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4 flex items-center">
            <PhoneIcon className="h-5 w-5 mr-2" />
            Live Calls
          </h3>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`theme-card shadow-sm rounded-lg ${className}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold theme-text-primary flex items-center">
            <PhoneIcon className="h-5 w-5 mr-2" />
            Live Calls
            {liveCalls.length > 0 && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {liveCalls.length} active
              </span>
            )}
          </h3>
          {listeningCall && (
            <button
              onClick={stopListening}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <XMarkIcon className="h-4 w-4 mr-1" />
              Stop Listening
            </button>
          )}
        </div>

        {liveCalls.length === 0 ? (
          <div className="text-center py-8">
            <PhoneIcon className="h-12 w-12 theme-text-secondary mx-auto mb-3 opacity-50" />
            <p className="theme-text-secondary text-sm">No active calls at the moment</p>
            <p className="theme-text-secondary text-xs mt-1">Live calls will appear here as they become active</p>
          </div>
        ) : (
          <div className="space-y-3">
            {liveCalls.map((call) => (
              <div
                key={call.callId}
                className={`border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  listeningCall === call.callId 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Call Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center text-sm font-medium theme-text-primary">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {call.agentName}
                    </div>
                    <div className="flex items-center text-sm theme-text-secondary">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {formatDuration(call.callDuration)}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(call.callStatus)}`}>
                    {call.callStatus}
                  </span>
                </div>

                {/* Call Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="flex items-center text-sm theme-text-secondary">
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    <span className="font-mono">{call.phoneNumber}</span>
                  </div>
                  <div className="flex items-center text-sm theme-text-secondary">
                    <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                    <span className="truncate">{call.campaignName}</span>
                  </div>
                </div>

                {/* Analysis Indicators */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs">
                    {call.isAnsweringMachine && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        Answering Machine
                      </span>
                    )}
                    <span className="theme-text-secondary">
                      Confidence: {Math.round(call.confidence * 100)}%
                    </span>
                    <span className="theme-text-secondary">
                      Sentiment: {call.sentimentScore > 0.6 ? '😊' : call.sentimentScore < 0.4 ? '😟' : '😐'}
                    </span>
                  </div>

                  {/* Listen Live Button */}
                  <button
                    onClick={() => handleListenLive(call.callId)}
                    disabled={listeningCall === call.callId}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      listeningCall === call.callId
                        ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {listeningCall === call.callId ? (
                      <>
                        <SpeakerWaveIcon className="h-4 w-4 mr-1 animate-pulse" />
                        Listening...
                      </>
                    ) : (
                      <>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Listen Live
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}