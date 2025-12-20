// SIP Call Control Component
import React, { useState, useEffect } from 'react';
import { Phone, PhoneCall, PhoneOff, Pause, Play, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface CallState {
  callId: string;
  sipCallId?: string;
  agentId?: string;
  contactId?: string;
  campaignId?: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  isOnHold: boolean;
  isMuted: boolean;
  isRecording: boolean;
  conferenceId?: string;
  transferTargetNumber?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface CallControlProps {
  agentId: string;
  className?: string;
}

interface ActiveCall extends CallState {
  elapsedTime: number;
}

const CallControl: React.FC<CallControlProps> = ({ agentId, className = '' }) => {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Poll for active calls
  useEffect(() => {
    const fetchActiveCalls = async () => {
      try {
        const response = await fetch(`/api/calls/agent/${agentId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          const callsWithElapsed = data.data.map((call: CallState) => ({
            ...call,
            elapsedTime: call.status === 'in-progress' 
              ? Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000)
              : call.duration || 0
          }));
          setActiveCalls(callsWithElapsed);
        }
      } catch (error) {
        console.error('Error fetching active calls:', error);
      }
    };

    fetchActiveCalls();
    const interval = setInterval(fetchActiveCalls, 1000); // Update every second

    return () => clearInterval(interval);
  }, [agentId]);

  // Update elapsed time for in-progress calls
  useEffect(() => {
    const updateElapsedTime = () => {
      setActiveCalls(calls => 
        calls.map(call => ({
          ...call,
          elapsedTime: call.status === 'in-progress' 
            ? Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000)
            : call.elapsedTime
        }))
      );
    };

    const interval = setInterval(updateElapsedTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const initiateCall = async () => {
    if (!phoneNumber.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          phoneNumber: phoneNumber.trim(),
          metadata: { source: 'manual_dial' }
        }),
      });

      if (response.ok) {
        setPhoneNumber('');
        setIsDialerOpen(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error initiating call:', error);
      alert('Error initiating call');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCallAction = async (callId: string, action: string, targetNumber?: string) => {
    try {
      const body: any = { action };
      if (targetNumber) body.targetNumber = targetNumber;

      const response = await fetch(`/api/calls/${callId}/action`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || `Failed to ${action} call`);
      }
    } catch (error) {
      console.error(`Error ${action} call:`, error);
      alert(`Error ${action} call`);
    }
  };

  const endCall = async (callId: string) => {
    try {
      const response = await fetch(`/api/calls/${callId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: 'agent_hangup' }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to end call');
      }
    } catch (error) {
      console.error('Error ending call:', error);
      alert('Error ending call');
    }
  };

  const sendDTMF = async (callId: string, digits: string) => {
    try {
      const response = await fetch(`/api/calls/${callId}/dtmf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ digits }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to send DTMF');
      }
    } catch (error) {
      console.error('Error sending DTMF:', error);
      alert('Error sending DTMF');
    }
  };

  const transferCall = async (callId: string) => {
    const targetNumber = prompt('Enter phone number to transfer to:');
    if (targetNumber) {
      await handleCallAction(callId, 'transfer', targetNumber);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated':
      case 'ringing':
        return 'text-yellow-600';
      case 'in-progress':
        return 'text-slate-600';
      case 'completed':
        return 'text-gray-600';
      case 'failed':
      case 'busy':
      case 'no-answer':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Phone className="w-5 h-5 mr-2" />
          Call Controls
        </h3>
        <button
          onClick={() => setIsDialerOpen(!isDialerOpen)}
          className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 bg-green-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
        >
          <PhoneCall className="w-4 h-4 mr-1" />
          New Call
        </button>
      </div>

      {/* Manual Dialer */}
      {isDialerOpen && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex space-x-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter phone number"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={initiateCall}
              disabled={isLoading || !phoneNumber.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Dialing...' : 'Call'}
            </button>
          </div>
        </div>
      )}

      {/* Active Calls */}
      <div className="space-y-3">
        {activeCalls.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Phone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No active calls</p>
          </div>
        ) : (
          activeCalls.map((call) => (
            <div key={call.callId} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium text-gray-900">{call.phoneNumber}</div>
                  <div className="text-sm text-gray-500">
                    <span className={`font-medium ${getStatusColor(call.status)}`}>
                      {call.status.replace('-', ' ').toUpperCase()}
                    </span>
                    {call.direction === 'inbound' && (
                      <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                        Inbound
                      </span>
                    )}
                    {call.direction === 'outbound' && (
                      <span className="ml-2 bg-green-100 text-slate-800 px-2 py-1 rounded-full text-xs">
                        Outbound
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-mono text-gray-900">
                    {formatDuration(call.elapsedTime)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(call.startTime).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Call Controls */}
              {call.status === 'in-progress' && (
                <div className="flex items-center space-x-2">
                  {/* Hold/Unhold */}
                  <button
                    onClick={() => handleCallAction(call.callId, call.isOnHold ? 'unhold' : 'hold')}
                    className={`p-2 rounded-md ${
                      call.isOnHold 
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={call.isOnHold ? 'Unhold' : 'Hold'}
                  >
                    {call.isOnHold ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>

                  {/* Mute/Unmute */}
                  <button
                    onClick={() => handleCallAction(call.callId, call.isMuted ? 'unmute' : 'mute')}
                    className={`p-2 rounded-md ${
                      call.isMuted 
                        ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    title={call.isMuted ? 'Unmute' : 'Mute'}
                  >
                    {call.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* DTMF Keypad */}
                  <button
                    onClick={() => {
                      const digits = prompt('Enter DTMF digits (0-9, *, #):');
                      if (digits) sendDTMF(call.callId, digits);
                    }}
                    className="p-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md"
                    title="Send DTMF"
                  >
                    <span className="text-sm font-mono">#</span>
                  </button>

                  {/* Transfer */}
                  <button
                    onClick={() => transferCall(call.callId)}
                    className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md"
                    title="Transfer Call"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  {/* End Call */}
                  <button
                    onClick={() => endCall(call.callId)}
                    className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-md ml-auto"
                    title="End Call"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Call Status Indicators */}
              {call.status !== 'in-progress' && (
                <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                  {call.duration && (
                    <span>Duration: {formatDuration(call.duration)}</span>
                  )}
                  {call.isRecording && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      Recorded
                    </span>
                  )}
                  {call.transferTargetNumber && (
                    <span>Transferred to: {call.transferTargetNumber}</span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CallControl;