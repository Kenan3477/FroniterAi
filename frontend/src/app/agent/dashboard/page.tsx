'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, PhoneCall, PhoneOff, LogOut, Mic, MicOff, AlertCircle } from 'lucide-react';
import ContactPreview from '@/components/agent/ContactPreview';
import DispositionForm from '@/components/agent/DispositionForm';
import { agentSocket } from '@/services/agentSocket';

// Agent status types
type AgentStatus = 'OFFLINE' | 'AVAILABLE' | 'ON_CALL' | 'ACW' | 'AWAY' | 'BREAK';

interface AgentData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  extension?: string;
  currentStatus: AgentStatus;
  currentCampaign?: {
    id: string;
    name: string;
    totalRecords?: number;
    completedRecords?: number;
    pendingRecords?: number;
  };
  sessionId: string;
  loginTime: string;
}

interface CallData {
  id: string;
  phoneNumber: string;
  contactName?: string;
  campaignId: string;
  status: string;
  startTime: string;
  record?: any;
}

interface ContactRecord {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
  status: string;
  priority: number;
  attempts: number;
  customData?: any;
  lastCallResult?: string;
  callHistory?: any[];
}

const statusColors: Record<AgentStatus, string> = {
  OFFLINE: 'bg-gray-500',
  AVAILABLE: 'bg-green-500',
  ON_CALL: 'bg-blue-500',
  ACW: 'bg-orange-500',
  AWAY: 'bg-yellow-500',
  BREAK: 'bg-purple-500',
};

const statusLabels: Record<AgentStatus, string> = {
  OFFLINE: 'Offline',
  AVAILABLE: 'Available',
  ON_CALL: 'On Call',
  ACW: 'After Call Work',
  AWAY: 'Away',
  BREAK: 'On Break',
};

export default function AgentDashboard() {
  const router = useRouter();
  const [agentData, setAgentData] = useState<AgentData | null>(null);
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [currentRecord, setCurrentRecord] = useState<ContactRecord | null>(null);
  const [status, setStatus] = useState<AgentStatus>('OFFLINE');
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isDialling, setIsDialling] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callsCompleted, setCallsCompleted] = useState(0);
  const [totalTalkTime, setTotalTalkTime] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date>(new Date());

  // Utility function to format duration
  const formatDuration = (startTime: Date) => {
    const now = new Date();
    const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Load agent data from session storage and initialize WebSocket
  useEffect(() => {
    const storedAgentData = sessionStorage.getItem('agentData');
    if (!storedAgentData) {
      router.push('/agent/login');
      return;
    }

    try {
      const agent = JSON.parse(storedAgentData);
      setAgentData(agent);
      setStatus(agent.currentStatus);
      setSessionStartTime(new Date(agent.loginTime));
      
      // Initialize WebSocket connection
      agentSocket.connect(agent.id);
      
      // Setup WebSocket event listeners
      setupSocketEventListeners();
      
    } catch (error) {
      console.error('Error loading agent data:', error);
      router.push('/agent/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const setupSocketEventListeners = () => {
    // Connection events
    agentSocket.on('connected', () => {
      setSocketConnected(true);
      setError(null);
    });

    agentSocket.on('disconnected', () => {
      setSocketConnected(false);
    });

    // Call events
    agentSocket.on('call_offered', (callData: any) => {
      setCurrentCall(callData);
      setCurrentRecord(callData.record);
      setStatus('ON_CALL');
    });

    agentSocket.on('call_connected', (callData: any) => {
      setCurrentCall(callData);
      setIsDialling(false);
    });

    agentSocket.on('call_ended', () => {
      setShowDisposition(true);
    });

    // Record events
    agentSocket.on('record_assigned', (record: any) => {
      setCurrentRecord(record);
    });

    agentSocket.on('no_records_available', () => {
      setError('No records available. Please try again later.');
      setIsDialling(false);
    });

    // Status events
    agentSocket.on('status_updated', (statusData: any) => {
      setStatus(statusData.status);
      if (agentData) {
        setAgentData(prev => ({ ...prev!, currentStatus: statusData.status }));
      }
    });

    // Error events
    agentSocket.on('error', (errorData: any) => {
      setError(errorData.message);
      setIsDialling(false);
    });

    // Disposition submitted
    agentSocket.on('disposition_submitted', () => {
      setCurrentCall(null);
      setCurrentRecord(null);
      setCallsCompleted(prev => prev + 1);
      setShowDisposition(false);
      setStatus('AVAILABLE');
    });
  };

  const updateAgentStatus = async (newStatus: AgentStatus) => {
    if (!agentData || isUpdatingStatus) return;

    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`/api/dialler/agents/${agentData.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatus(newStatus);
        setAgentData(prev => ({ ...prev!, currentStatus: newStatus }));
        
        // Update session storage
        const updatedAgentData = { ...agentData, currentStatus: newStatus };
        sessionStorage.setItem('agentData', JSON.stringify(updatedAgentData));
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const requestNextCall = async () => {
    if (!agentData?.currentCampaign) {
      setError('No campaign assigned. Please contact your supervisor.');
      return;
    }

    try {
      setIsDialling(true);
      setError(null);
      await updateAgentStatus('AVAILABLE');
      
      // Request next record via WebSocket
      agentSocket.requestNextRecord(agentData.currentCampaign.id);
      
    } catch (error) {
      console.error('Error requesting next call:', error);
      setError('Failed to request next call.');
      setIsDialling(false);
    }
  };

  const initiateCall = async (record?: ContactRecord) => {
    const targetRecord = record || currentRecord;
    if (!targetRecord || !agentData?.currentCampaign) return;

    try {
      setIsDialling(true);
      await updateAgentStatus('ON_CALL');
      
      // Send call event via WebSocket
      agentSocket.sendCallEvent('DIAL', {
        phoneNumber: targetRecord.phoneNumber,
        campaignId: agentData.currentCampaign.id,
        recordId: targetRecord.id,
      });
      
    } catch (error) {
      console.error('Error initiating call:', error);
      setError('Failed to initiate call.');
      setIsDialling(false);
    }
  };

  const endCall = async () => {
    if (!currentCall) return;

    try {
      // Send hangup event via WebSocket
      agentSocket.sendCallEvent('HANGUP', {
        callId: currentCall.id
      });

      // Show disposition form
      setShowDisposition(true);
      
    } catch (error) {
      console.error('Error ending call:', error);
      setError('Failed to end call.');
    }
  };

  const handleDispositionSubmit = (dispositionData: any) => {
    if (!currentCall || !agentData) return;

    // Submit disposition via WebSocket
    agentSocket.submitDisposition({
      callId: currentCall.id,
      ...dispositionData,
    });
  };

  const skipRecord = () => {
    setCurrentRecord(null);
    if (agentData?.currentCampaign) {
      agentSocket.requestNextRecord(agentData.currentCampaign.id);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('agentData');
    agentSocket.disconnect();
    router.push('/agent/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading agent dashboard...</div>
      </div>
    );
  }

  if (!agentData) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 mb-6 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Kennex Agent Portal</h1>
            </div>
            <Badge className={`${statusColors[status]} text-white`}>
              {statusLabels[status]}
            </Badge>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {agentData.firstName} {agentData.lastName}
            </span>
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Agent Status Panel */}
        <Card className="lg:col-span-1">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Agent Status</h2>
              <Badge 
                variant={status === 'AVAILABLE' ? 'default' : 
                         status === 'ON_CALL' ? 'secondary' : 
                         status === 'ACW' ? 'outline' : 'destructive'}
              >
                {statusLabels[status]}
              </Badge>
            </div>
            
            {agentData && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Agent</div>
                  <p className="font-medium">{agentData.firstName} {agentData.lastName}</p>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Campaign</div>
                  <p className="font-medium">
                    {agentData.currentCampaign?.name || 'Not assigned'}
                  </p>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Session Duration</div>
                  <p className="font-mono">{formatDuration(sessionStartTime)}</p>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Calls Completed</div>
                  <p className="text-2xl font-bold text-slate-600">{callsCompleted}</p>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600">Total Talk Time</div>
                  <p className="font-mono">{Math.floor(totalTalkTime / 60)}:{(totalTalkTime % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>
            )}

            {/* Status Controls */}
            <div className="mt-6 space-y-2">
              <Button 
                onClick={() => updateAgentStatus('AVAILABLE')}
                className="w-full"
                variant={status === 'AVAILABLE' ? 'default' : 'outline'}
                disabled={isUpdatingStatus || !!currentCall}
              >
                Available
              </Button>
              
              <Button 
                onClick={() => updateAgentStatus('BREAK')}
                className="w-full"
                variant={status === 'BREAK' ? 'default' : 'outline'}
                disabled={isUpdatingStatus || !!currentCall}
              >
                On Break
              </Button>
              
              <Button 
                onClick={() => updateAgentStatus('OFFLINE')}
                className="w-full"
                variant={status === 'OFFLINE' ? 'destructive' : 'outline'}
                disabled={isUpdatingStatus || !!currentCall}
              >
                Go Offline
              </Button>
            </div>

            {/* Connection Status */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {socketConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Call Controls Panel */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Call Control</h2>
              {currentCall && (
                <Badge variant="default">
                  Call Duration: {formatDuration(new Date(currentCall.startTime))}
                </Badge>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <div className="text-red-700">{error}</div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="ml-auto"
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            {currentCall ? (
              /* Active Call Interface */
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Connected to</p>
                      <p className="text-lg font-semibold">{currentCall.phoneNumber}</p>
                      {currentCall.contactName && (
                        <p className="text-sm text-gray-500">{currentCall.contactName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Status</p>
                      <Badge variant="default">{currentCall.status}</Badge>
                    </div>
                  </div>
                </div>

                {/* Call Control Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button 
                    onClick={endCall}
                    variant="destructive"
                    className="w-full"
                    disabled={isDialling}
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Hang Up
                  </Button>
                  
                  <Button 
                    variant={isMuted ? 'destructive' : 'outline'}
                    className="w-full"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
                    {isMuted ? 'Unmute' : 'Mute'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Transfer
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Conference
                  </Button>
                </div>
              </div>
            ) : (
              /* No Active Call Interface */
              <div className="text-center py-8">
                {status === 'AVAILABLE' ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-slate-800 font-medium">Ready to receive calls</p>
                      <p className="text-sm text-slate-600 mt-1">
                        You will automatically receive the next available call
                      </p>
                    </div>
                    
                    {agentData?.currentCampaign && (
                      <Button 
                        onClick={requestNextCall}
                        className="w-full md:w-auto px-8"
                        disabled={isDialling}
                      >
                        <PhoneCall className="h-4 w-4 mr-2" />
                        {isDialling ? 'Requesting...' : 'Request Next Call'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-600">
                      Set your status to "Available" to start taking calls
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Contact Preview */}
        {currentRecord && (
          <Card className="lg:col-span-1">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
              <ContactPreview record={currentRecord} />
              
              {!currentCall && (
                <div className="mt-4 space-y-2">
                  <Button 
                    onClick={() => initiateCall(currentRecord)}
                    className="w-full"
                    disabled={isDialling || status !== 'AVAILABLE'}
                  >
                    <PhoneCall className="h-4 w-4 mr-2" />
                    {isDialling ? 'Dialling...' : 'Call Now'}
                  </Button>
                  
                  <Button 
                    onClick={skipRecord}
                    variant="outline"
                    className="w-full"
                    disabled={isDialling}
                  >
                    Skip Record
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Campaign Stats */}
        {agentData?.currentCampaign && (
          <Card className="lg:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">Campaign Progress</h2>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {agentData.currentCampaign.totalRecords || 0}
                  </p>
                  <p className="text-sm text-gray-600">Total Records</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-600">
                    {agentData.currentCampaign.completedRecords || 0}
                  </p>
                  <p className="text-sm text-gray-600">Completed</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {agentData.currentCampaign.pendingRecords || 0}
                  </p>
                  <p className="text-sm text-gray-600">Pending</p>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {callsCompleted}
                  </p>
                  <p className="text-sm text-gray-600">Your Calls</p>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-sm text-gray-600">Campaign Progress</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${agentData.currentCampaign.totalRecords && agentData.currentCampaign.completedRecords
                        ? (agentData.currentCampaign.completedRecords / agentData.currentCampaign.totalRecords) * 100 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Disposition Modal */}
      {showDisposition && currentCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full m-4">
            <DispositionForm
              callData={currentCall}
              agentId={agentData?.id || ''}
              isOpen={showDisposition}
              onSubmit={(dispositionData) => {
                handleDispositionSubmit(dispositionData);
                setShowDisposition(false);
                setCurrentCall(null);
                updateAgentStatus('AVAILABLE');
              }}
              onCancel={() => {
                setShowDisposition(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}