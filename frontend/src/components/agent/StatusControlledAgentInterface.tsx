/**
 * Enhanced Agent Interface Component
 * Agent status directly controls queue participation - no manual "Start Dialling" button
 * Available = auto join queue, Away/Pause = remove from queue
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Phone,
  User,
  Users,
  CheckCircle,
  Pause,
  Coffee,
  LogOut
} from 'lucide-react';

interface AgentInterfaceProps {
  agentId: string;
  campaignId: string;
  agentName?: string;
  campaignName?: string;
}

interface QueueStatus {
  campaignId: string;
  availableAgents: number;
  isDiallingActive: boolean;
  queueDepth?: number;
}

interface CallData {
  callId: string;
  contact: {
    contactId: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    company?: string;
    listName: string;
  };
}

interface AutoDialStatus {
  isActive: boolean;
  isPaused: boolean;
  sessionStartTime?: string;
  nextDialTime?: string;
  callsCompleted: number;
  status: 'idle' | 'active' | 'paused' | 'error';
  message?: string;
}

interface CampaignInfo {
  id: string;
  name: string;
  dialMethod: 'AUTODIAL' | 'MANUAL_DIAL' | 'MANUAL_PREVIEW' | 'SKIP';
  status: string;
}

type AgentStatus = 'Available' | 'OnCall' | 'Away' | 'Break' | 'Offline';

export default function EnhancedAgentInterface({ 
  agentId, 
  campaignId, 
  agentName = 'Agent',
  campaignName = 'Campaign'
}: AgentInterfaceProps) {
  const [status, setStatus] = useState<AgentStatus>('Away');
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState<NodeJS.Timeout | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  // Auto-dial state management
  const [autoDialStatus, setAutoDialStatus] = useState<AutoDialStatus>({
    isActive: false,
    isPaused: false,
    callsCompleted: 0,
    status: 'idle'
  });
  const [campaignInfo, setCampaignInfo] = useState<CampaignInfo | null>(null);
  const [autoDialPolling, setAutoDialPolling] = useState<NodeJS.Timeout | null>(null);

  // Call timer effect
  useEffect(() => {
    if (currentCall && !callTimer) {
      const timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
      setCallTimer(timer);
    } else if (!currentCall && callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
      setCallDuration(0);
    }

    return () => {
      if (callTimer) {
        clearInterval(callTimer);
      }
    };
  }, [currentCall, callTimer]);

  // Initialize component - fetch campaign info and auto-dial status
  useEffect(() => {
    fetchCampaignInfo();
    fetchAutoDialStatus();
  }, [agentId, campaignId]);

  // Auto-dial status polling for real-time updates  
  useEffect(() => {
    if (campaignInfo?.dialMethod === 'AUTODIAL' && status === 'Available') {
      // Start polling for auto-dial status updates
      const interval = setInterval(() => {
        fetchAutoDialStatus();
      }, 5000); // Poll every 5 seconds

      setAutoDialPolling(interval);

      return () => {
        clearInterval(interval);
        setAutoDialPolling(null);
      };
    } else if (autoDialPolling) {
      // Stop polling if not auto-dial campaign or not available
      clearInterval(autoDialPolling);
      setAutoDialPolling(null);
    }
    
    return undefined;
  }, [campaignInfo, status, autoDialPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoDialPolling) {
        clearInterval(autoDialPolling);
      }
    };
  }, []);

  // Format duration helper
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update agent status - automatically handles queue participation
  const updateStatus = async (newStatus: AgentStatus) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`🔄 Updating agent ${agentId} status to ${newStatus}`);
      
      const response = await fetch('/api/agents/status-simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          status: newStatus,
          campaignId
        })
      });

      const data = await response.json();

      if (data.success) {
        setStatus(newStatus);
        setQueueStatus(data.queueStatus);
        console.log(`✅ Status updated: ${data.message}`);
        
        // Clear call if going offline/away
        if (newStatus === 'Offline' || newStatus === 'Away' || newStatus === 'Break') {
          setCurrentCall(null);
        }
        
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      setError(error.message || 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  // Request next call (only when Available)
  const requestNextCall = async () => {
    if (status !== 'Available') {
      setError('Agent must be Available to request calls');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`📞 Requesting next call from campaign ${campaignId}`);
      
      // This would use the existing dialer API
      const response = await fetch('/api/dialer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_call',
          agentId,
          campaignId
        })
      });

      const data = await response.json();

      if (data.success && data.contact) {
        setCurrentCall({
          callId: `call_${Date.now()}_${agentId}`,
          contact: {
            contactId: data.contact.contactId,
            firstName: data.contact.firstName,
            lastName: data.contact.lastName,
            phone: data.contact.phone,
            email: data.contact.email,
            company: data.contact.company,
            listName: data.contact.listName || 'Unknown'
          }
        });
        setStatus('OnCall');
        
        console.log(`✅ Call assigned:`, data.contact);
        
      } else {
        console.log(`ℹ️ ${data.message || 'No calls available'}`);
        setError(data.message || 'No calls available');
      }
    } catch (error: any) {
      console.error('Error requesting next call:', error);
      setError(error.message || 'Failed to get next call');
    } finally {
      setIsLoading(false);
    }
  };

  // End current call
  const endCall = async () => {
    if (!currentCall) return;

    try {
      console.log(`📞 Ending call ${currentCall.callId}`);
      
      // Reset call state
      setCurrentCall(null);
      setStatus('Available'); // Back to available for next call
      setCallDuration(0);
      
      console.log('✅ Call ended - agent back to Available');
      
    } catch (error: any) {
      console.error('Error ending call:', error);
      setError(error.message || 'Failed to end call');
    }
  };

  // Auto-dial API functions
  const fetchAutoDialStatus = async () => {
    try {
      const response = await fetch(`/api/auto-dial/status/${agentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAutoDialStatus(data.session || {
            isActive: false,
            isPaused: false,
            callsCompleted: 0,
            status: 'idle'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching auto-dial status:', error);
    }
  };

  const pauseAutoDial = async () => {
    if (!autoDialStatus.isActive) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auto-dial/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      const data = await response.json();
      if (data.success) {
        console.log('⏸️ Auto-dial paused');
        await fetchAutoDialStatus();
      } else {
        throw new Error(data.message || 'Failed to pause auto-dial');
      }
    } catch (error: any) {
      console.error('Error pausing auto-dial:', error);
      setError(error.message || 'Failed to pause auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  const resumeAutoDial = async () => {
    if (!autoDialStatus.isPaused) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auto-dial/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      const data = await response.json();
      if (data.success) {
        console.log('▶️ Auto-dial resumed');
        await fetchAutoDialStatus();
      } else {
        throw new Error(data.message || 'Failed to resume auto-dial');
      }
    } catch (error: any) {
      console.error('Error resuming auto-dial:', error);
      setError(error.message || 'Failed to resume auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  const stopAutoDial = async () => {
    if (!autoDialStatus.isActive) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/auto-dial/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });

      const data = await response.json();
      if (data.success) {
        console.log('⏹️ Auto-dial stopped');
        await fetchAutoDialStatus();
      } else {
        throw new Error(data.message || 'Failed to stop auto-dial');
      }
    } catch (error: any) {
      console.error('Error stopping auto-dial:', error);
      setError(error.message || 'Failed to stop auto-dial');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch campaign information
  const fetchCampaignInfo = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        setCampaignInfo({
          id: data.id || campaignId,
          name: data.name || campaignName,
          dialMethod: data.dialMethod || 'MANUAL_DIAL',
          status: data.status || 'Active'
        });
      }
    } catch (error) {
      console.error('Error fetching campaign info:', error);
      // Set fallback campaign info
      setCampaignInfo({
        id: campaignId,
        name: campaignName,
        dialMethod: 'MANUAL_DIAL',
        status: 'Active'
      });
    }
  };

  // Get status color
  const getStatusColor = (status: AgentStatus): string => {
    switch (status) {
      case 'Available': return 'bg-green-500';
      case 'OnCall': return 'bg-blue-500';
      case 'Away': return 'bg-yellow-500';
      case 'Break': return 'bg-orange-500';
      case 'Offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'Available': return <CheckCircle className="w-4 h-4" />;
      case 'OnCall': return <Phone className="w-4 h-4" />;
      case 'Away': return <Pause className="w-4 h-4" />;
      case 'Break': return <Coffee className="w-4 h-4" />;
      case 'Offline': return <LogOut className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  // Render status controls
  const renderStatusControls = () => {
    const statuses: { status: AgentStatus; label: string; color: string }[] = [
      { status: 'Available', label: 'Available', color: 'bg-green-600 hover:bg-slate-700' },
      { status: 'Away', label: 'Away', color: 'bg-yellow-600 hover:bg-yellow-700' },
      { status: 'Break', label: 'On Break', color: 'bg-orange-600 hover:bg-orange-700' },
      { status: 'Offline', label: 'Offline', color: 'bg-gray-600 hover:bg-gray-700' },
    ];

    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Your status controls queue participation automatically:
        </p>
        
        <div className="grid grid-cols-2 gap-2">
          {statuses.map(({ status: btnStatus, label, color }) => (
            <Button
              key={btnStatus}
              onClick={() => updateStatus(btnStatus)}
              disabled={isLoading || (currentCall !== null && btnStatus === 'Offline')}
              className={`${status === btnStatus ? color : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} 
                         transition-colors flex items-center space-x-2`}
              variant={status === btnStatus ? 'default' : 'outline'}
            >
              {getStatusIcon(btnStatus)}
              <span>{label}</span>
            </Button>
          ))}
        </div>

        {status === 'Available' && queueStatus && (
          <div className="mt-3 p-3 bg-green-50 border border-slate-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-slate-800 font-medium text-sm">
                In dial queue • {queueStatus.availableAgents} agents available
              </span>
            </div>
            {queueStatus.isDiallingActive ? (
              <p className="text-slate-700 text-sm mt-1">
                🎯 Dialling is active - calls will be distributed automatically
              </p>
            ) : (
              <p className="text-yellow-700 text-sm mt-1">
                ⏸️ Dialling paused - no agents available
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render auto-dial controls for AUTODIAL campaigns
  const renderAutoDialControls = () => {
    if (!campaignInfo || campaignInfo.dialMethod !== 'AUTODIAL') {
      return null;
    }

    return (
      <Card className="border-indigo-200">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Phone className="w-5 h-5 mr-2 text-indigo-600" />
            Auto-Dial Controls
          </h3>
          
          {/* Auto-dial status indicator */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Status</span>
              <Badge 
                variant={
                  autoDialStatus.status === 'active' ? 'default' : 
                  autoDialStatus.status === 'paused' ? 'secondary' : 
                  autoDialStatus.status === 'error' ? 'destructive' : 'outline'
                }
              >
                {autoDialStatus.status === 'active' && autoDialStatus.isPaused ? '⏸️ Paused' :
                 autoDialStatus.status === 'active' ? '🎯 Active' :
                 autoDialStatus.status === 'error' ? '❌ Error' : '⭕ Idle'}
              </Badge>
            </div>
            
            {autoDialStatus.isActive && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Calls Completed</span>
                  <span className="text-sm font-medium">{autoDialStatus.callsCompleted}</span>
                </div>
                
                {autoDialStatus.sessionStartTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Session Duration</span>
                    <span className="text-sm font-medium">
                      {Math.floor((Date.now() - new Date(autoDialStatus.sessionStartTime).getTime()) / 60000)} min
                    </span>
                  </div>
                )}
                
                {autoDialStatus.nextDialTime && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Next Dial</span>
                    <span className="text-sm font-medium">
                      {new Date(autoDialStatus.nextDialTime) > new Date() ? 
                        `${Math.ceil((new Date(autoDialStatus.nextDialTime).getTime() - Date.now()) / 1000)}s` :
                        'Now'
                      }
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {autoDialStatus.message && (
              <p className="text-sm text-gray-600 mt-2">{autoDialStatus.message}</p>
            )}
          </div>

          {/* Auto-dial control buttons */}
          <div className="space-y-2">
            {status === 'Available' && !autoDialStatus.isActive && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 mb-2">
                  ✨ Auto-dial available for this campaign
                </p>
                <p className="text-xs text-blue-600">
                  Auto-dial will start automatically when you become Available
                </p>
              </div>
            )}
            
            {autoDialStatus.isActive && (
              <div className="grid grid-cols-2 gap-2">
                {autoDialStatus.isPaused ? (
                  <Button 
                    onClick={resumeAutoDial}
                    disabled={isLoading || status !== 'Available'}
                    className="w-full"
                    variant="default"
                  >
                    ▶️ Resume
                  </Button>
                ) : (
                  <Button 
                    onClick={pauseAutoDial}
                    disabled={isLoading}
                    className="w-full"
                    variant="secondary"
                  >
                    ⏸️ Pause
                  </Button>
                )}
                
                <Button 
                  onClick={stopAutoDial}
                  disabled={isLoading}
                  className="w-full"
                  variant="destructive"
                >
                  ⏹️ Stop
                </Button>
              </div>
            )}
          </div>
          
          {/* Campaign info */}
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-500">
              <strong>Campaign:</strong> {campaignInfo.name}<br/>
              <strong>Method:</strong> {campaignInfo.dialMethod}<br/>
              <strong>Status:</strong> {campaignInfo.status}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  // Render active call interface
  const renderActiveCall = () => {
    if (!currentCall) return null;

    return (
      <Card className="border-blue-200 bg-blue-50">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Active Call
              </h3>
              <p className="text-sm text-blue-700">
                Duration: {formatDuration(callDuration)}
              </p>
            </div>
            <Badge className="bg-blue-600">
              OnCall
            </Badge>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">
                  {currentCall.contact.firstName} {currentCall.contact.lastName}
                </h4>
                <p className="text-sm text-gray-600">
                  📞 {currentCall.contact.phone}
                </p>
                {currentCall.contact.company && (
                  <p className="text-sm text-gray-600">
                    🏢 {currentCall.contact.company}
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  📋 {currentCall.contact.listName}
                </p>
              </div>
            </div>
          </div>

          {/* Call Controls */}
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => setIsMuted(!isMuted)}
              variant={isMuted ? "destructive" : "outline"}
              className="w-full"
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              disabled
            >
              Transfer
            </Button>
            
            <Button 
              onClick={endCall}
              variant="destructive"
              className="w-full"
            >
              <PhoneOff className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  // Render queue statistics
  const renderQueueStats = () => {
    return (
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Queue Status
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Campaign</span>
              <span className="text-sm font-medium">{campaignName}</span>
            </div>
            
            {queueStatus && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Agents</span>
                  <Badge variant="outline">{queueStatus.availableAgents}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Dialling Status</span>
                  <Badge variant={queueStatus.isDiallingActive ? "default" : "secondary"}>
                    {queueStatus.isDiallingActive ? 'Active' : 'Stopped'}
                  </Badge>
                </div>

                {queueStatus.queueDepth !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Contacts in Queue</span>
                    <Badge variant="outline">{queueStatus.queueDepth}</Badge>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Queue Control Explanation */}
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-gray-500">
              <strong>Automatic Queue Control:</strong><br/>
              • Available = Join queue, start dialling<br/>
              • Away/Break = Leave queue<br/>
              • No available agents = Stop all dialling
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Omnivox AI Agent Interface
          </h1>
          <p className="text-gray-600">
            Agent: {agentName} • Campaign: {campaignName}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></div>
          <Badge variant="outline" className="text-sm flex items-center space-x-1">
            {getStatusIcon(status)}
            <span>{status}</span>
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <Button 
            onClick={() => setError(null)}
            variant="ghost"
            className="mt-2 text-red-600 h-auto p-0"
          >
            Dismiss
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Status & Controls */}
        <div className="space-y-6">
          <Card>
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Phone className="w-5 h-5 mr-2 text-blue-600" />
                Agent Status Controls
              </h2>
              {renderStatusControls()}
              
              {/* Manual Call Request - Only when Available */}
              {status === 'Available' && (
                <div className="mt-4 pt-3 border-t">
                  <Button 
                    onClick={requestNextCall}
                    disabled={isLoading}
                    className="w-full"
                    variant="outline"
                  >
                    <PhoneCall className="w-4 h-4 mr-2" />
                    {isLoading ? 'Requesting...' : 'Request Next Call'}
                  </Button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Manual call request (calls are distributed automatically)
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Auto-dial Controls - Only for AUTODIAL campaigns */}
          {renderAutoDialControls()}

          {renderQueueStats()}
        </div>

        {/* Right Column - Active Call or Ready State */}
        <div className="space-y-6">
          {currentCall ? renderActiveCall() : (
            <Card>
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {status === 'Available' ? 'Ready for Calls' : `Agent ${status}`}
                </h3>
                <p className="text-gray-600">
                  {status === 'Available' 
                    ? 'You are in the dial queue. Calls will be distributed automatically.' 
                    : status === 'OnCall' 
                    ? 'Currently on a call'
                    : 'Set status to Available to join the dial queue and start receiving calls'
                  }
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* System Integration Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Automatic Queue Management</h4>
            <p className="text-sm text-blue-700 mt-1">
              Your availability status directly controls queue participation. 
              Available = automatically join dial queue. Away/Break/Offline = automatically leave queue.
              When no agents are available, all dialling stops automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}