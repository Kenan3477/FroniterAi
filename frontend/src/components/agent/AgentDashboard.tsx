'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneIcon,
  PhoneXMarkIcon,
  ClockIcon,
  UserIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import DispositionModal from './DispositionModal';
import CallDispositionModal from './CallDispositionModal';
import { TwilioDialer } from '@/components/dialer/TwilioDialer';
import { InboundCallManager } from './InboundCallNotification';
import { agentSocket } from '@/services/agentSocket';

// Types
interface Agent {
  id: string;
  agentId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  extension?: string;
  sipUsername?: string;
  sipPassword?: string;
  isLoggedIn: boolean;
  currentCall?: string;
  campaignAssignments?: any[];
}

interface WorkItem {
  id: string;
  workItemId: string;
  campaignId: string;
  contactId: string;
  callId?: string;
  status: string;
  contactData: any;
  scriptData?: any;
  startTime: string;
  campaign?: any;
  contact?: any;
}

interface Campaign {
  campaignId: string;
  name: string;
  dialMethod: string;
  status: string;
}

interface CallState {
  callId?: string;
  status: 'idle' | 'dialing' | 'ringing' | 'connected' | 'hold' | 'ended';
  contactNumber?: string;
  duration: number;
  startTime?: Date;
}

interface AgentDashboardProps {
  agent?: Agent;
  onLogout?: () => void;
  onCallEnd?: (callData: any) => void;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ 
  agent: initialAgent, 
  onLogout,
  onCallEnd 
}) => {
  // State Management
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(initialAgent || null);
  const [agentStatus, setAgentStatus] = useState<string>(initialAgent?.status || 'Offline');
  const [assignedCampaigns, setAssignedCampaigns] = useState<Campaign[]>([]);
  const [currentWorkItem, setCurrentWorkItem] = useState<WorkItem | null>(null);
  const [callState, setCallState] = useState<CallState>({
    status: 'idle',
    duration: 0
  });
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [showCallDispositionModal, setShowCallDispositionModal] = useState(false);
  const [isPollingForCalls, setIsPollingForCalls] = useState(false);
  const [sipConfig, setSipConfig] = useState<{
    server: string;
    domain: string;
    username: string;
    password: string;
  } | null>(null);
  const [inboundCalls, setInboundCalls] = useState<any[]>([]);
  const [activeInboundCall, setActiveInboundCall] = useState<any | null>(null);

  // Initialize agent data
  useEffect(() => {
    if (initialAgent) {
      setCurrentAgent(initialAgent);
      setAgentStatus(initialAgent.status);
      loadAgentData(initialAgent.agentId);
      loadSipConfiguration(initialAgent);
    }
  }, [initialAgent]);

  // Load SIP configuration for the agent
  const loadSipConfiguration = async (agent: Agent) => {
    try {
      // Try to get SIP config from agent data or system settings
      if (agent.sipUsername && agent.sipPassword) {
        setSipConfig({
          server: process.env.NEXT_PUBLIC_DUALTONE_SIP_SERVER || 'wss://sip.dualtone.com',
          domain: process.env.NEXT_PUBLIC_DUALTONE_DOMAIN || 'yourcompany.dualtone.com',
          username: agent.sipUsername,
          password: agent.sipPassword
        });
      } else {
        console.warn('⚠️ Agent SIP credentials not configured');
      }
    } catch (error) {
      console.error('Failed to load SIP configuration:', error);
    }
  };

  // Poll for calls when agent is available
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (agentStatus === 'Available' && !currentWorkItem) {
      setIsPollingForCalls(true);
      interval = setInterval(pollForCalls, 3000); // Poll every 3 seconds
    } else {
      setIsPollingForCalls(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [agentStatus, currentWorkItem]);

  // Set up inbound call socket event handling
  useEffect(() => {
    if (!currentAgent) return;

    // Connect to agent socket
    agentSocket.connect(currentAgent.agentId);
    agentSocket.authenticateAgent(currentAgent.agentId);

    // Handle inbound call events
    const handleInboundCallRinging = (data: any) => {
      console.log('New inbound call:', data);
      setInboundCalls(prev => {
        // Check if call already exists
        const exists = prev.find(call => call.id === data.call.id);
        if (exists) return prev;
        
        // Add new inbound call
        return [...prev, {
          ...data.call,
          callerInfo: data.callerInfo
        }];
      });
    };

    const handleInboundCallAnswered = (data: any) => {
      console.log('Inbound call answered:', data);
      if (data.agentId === currentAgent.agentId) {
        setActiveInboundCall(data.callId);
      }
      
      // Remove from notifications if answered by this or other agent
      setInboundCalls(prev => prev.filter(call => call.id !== data.callId));
    };

    const handleInboundCallEnded = (data: any) => {
      console.log('Inbound call ended:', data);
      setInboundCalls(prev => prev.filter(call => call.id !== data.callId));
      
      if (activeInboundCall === data.callId) {
        setActiveInboundCall(null);
      }
    };

    // Set up event listeners
    agentSocket.on('inbound-call-ringing', handleInboundCallRinging);
    agentSocket.on('inbound-call-answered', handleInboundCallAnswered);
    agentSocket.on('inbound-call-ended', handleInboundCallEnded);

    // Cleanup function
    return () => {
      agentSocket.off('inbound-call-ringing', handleInboundCallRinging);
      agentSocket.off('inbound-call-answered', handleInboundCallAnswered);
      agentSocket.off('inbound-call-ended', handleInboundCallEnded);
    };
  }, [currentAgent, activeInboundCall]);

  const loadAgentData = async (agentId: string) => {
    try {
      const response = await fetch(`/api/agents/status?agentId=${agentId}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentAgent(data.agent);
        
        // Extract campaigns from assignments
        const campaigns = data.agent.campaignAssignments?.map((assignment: any) => ({
          campaignId: assignment.campaign.campaignId,
          name: assignment.campaign.name,
          dialMethod: assignment.campaign.dialMethod,
          status: assignment.campaign.status
        })) || [];
        
        setAssignedCampaigns(campaigns);
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
    }
  };

  const pollForCalls = async () => {
    if (!currentAgent) return;

    try {
      // Check for active work items first
      const workItemsResponse = await fetch(`/api/work-items?agentId=${currentAgent.agentId}&status=active`);
      if (workItemsResponse.ok) {
        const workItemsData = await workItemsResponse.json();
        if (workItemsData.workItems && workItemsData.workItems.length > 0) {
          const workItem = workItemsData.workItems[0];
          setCurrentWorkItem(workItem);
          
          const contactData = JSON.parse(workItem.contactData || '{}');
          setCallState({
            status: 'connected',
            callId: workItem.callId,
            contactNumber: contactData.phone,
            duration: 0,
            startTime: new Date()
          });
          return;
        }
      }

      // Check for new calls to place
      const dialerResponse = await fetch('/api/dialer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_for_calls',
          agentId: currentAgent.agentId
        })
      });

      if (dialerResponse.ok) {
        const dialerData = await dialerResponse.json();
        if (dialerData.hasCallsWaiting && dialerData.nextContact) {
          // Trigger call placement
          await placeCall();
        }
      }
    } catch (error) {
      console.error('Error polling for calls:', error);
    }
  };

  const placeCall = async () => {
    if (!currentAgent || assignedCampaigns.length === 0) {
      console.log('Cannot place call - missing requirements');
      return;
    }

    try {
      const activeCampaign = assignedCampaigns.find(c => c.status === 'Active');
      if (!activeCampaign) {
        console.log('No active campaign found');
        return;
      }

      // Get next contact from backend
      const response = await fetch('/api/dialer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_call',
          agentId: currentAgent.agentId,
          campaignId: activeCampaign.campaignId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.contact) {
          // Set work item for disposition - actual calling is handled by TwilioDialer component
          setCurrentWorkItem(data.workItem);
          console.log(`📞 Contact assigned for calling: ${data.contact.phone}`);
        }
      }
    } catch (error) {
      console.error('Error getting next contact:', error);
    }
  };

  // Agent Login/Status Management
  const handleStatusChange = async (newStatus: string) => {
    if (!currentAgent) return;

    try {
      const response = await fetch('/api/agents/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: currentAgent.agentId,
          status: newStatus
        })
      });

      if (response.ok) {
        setAgentStatus(newStatus);
        setCurrentAgent({ ...currentAgent, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating agent status:', error);
    }
  };

  const toggleAvailability = () => {
    if (agentStatus === 'Available') {
      handleStatusChange('AfterCall');
    } else if (agentStatus === 'Offline' || agentStatus === 'AfterCall') {
      handleStatusChange('Available');
    }
  };

  // Inbound call management
  const handleAnswerInboundCall = async (callId: string) => {
    try {
      const response = await fetch('/api/calls/inbound-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callId,
          agentId: currentAgent?.agentId
        })
      });

      if (response.ok) {
        console.log('Inbound call answered successfully');
        // Socket events will handle state updates
      } else {
        console.error('Failed to answer inbound call');
      }
    } catch (error) {
      console.error('Error answering inbound call:', error);
    }
  };

  const handleDeclineInboundCall = async (callId: string) => {
    try {
      // Remove from local state
      setInboundCalls(prev => prev.filter(call => call.id !== callId));
      
      // Optionally notify backend that agent declined
      // This could route to queue or other available agents
      console.log('Inbound call declined by agent');
    } catch (error) {
      console.error('Error declining inbound call:', error);
    }
  };

  const handleTransferInboundCall = async (callId: string, transferType: 'queue' | 'agent', targetId: string) => {
    try {
      const response = await fetch('/api/calls/inbound-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callId,
          transferType: transferType,
          targetId: targetId,
          agentId: currentAgent?.agentId
        })
      });

      if (response.ok) {
        console.log('Inbound call transferred successfully');
        // Remove from notifications
        setInboundCalls(prev => prev.filter(call => call.id !== callId));
      } else {
        console.error('Failed to transfer inbound call');
      }
    } catch (error) {
      console.error('Error transferring inbound call:', error);
    }
  };

  const handleEndCall = () => {
    if (currentWorkItem && callState.callId) {
      // Calculate final call duration
      const endTime = new Date();
      const startTime = callState.startTime || endTime;
      const finalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Update call state to show final duration
      setCallState(prev => ({
        ...prev,
        status: 'ended',
        duration: finalDuration
      }));
      
      // Show the new call disposition modal
      setShowCallDispositionModal(true);
    }
  };

  const handleCallDispositionSelect = async (disposition: string, notes?: string) => {
    if (!currentWorkItem || !callState.callId) return;

    try {
      const contactData = JSON.parse(currentWorkItem.contactData || '{}');
      
      // Submit the call outcome
      const response = await fetch('/api/agents/call-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: callState.callId,
          contactId: currentWorkItem.contactId,
          agentId: currentAgent?.agentId,
          campaignId: currentWorkItem.campaignId,
          outcome: disposition,
          notes,
          duration: callState.duration
        })
      });

      if (response.ok) {
        console.log('✅ Call disposition recorded:', disposition);
      }
      
    } catch (error) {
      console.error('❌ Error recording call disposition:', error);
    }

    // Close modal and reset state
    setShowCallDispositionModal(false);
    setCurrentWorkItem(null);
    setCallState({
      status: 'idle',
      duration: 0
    });
    
    // Update agent status back to Available
    handleStatusChange('Available');
    
    if (onCallEnd) {
      onCallEnd({ disposition, notes });
    }
  };

  const handleDispositionComplete = async (dispositionResult: any) => {
    setShowDispositionModal(false);
    setCurrentWorkItem(null);
    setCallState({
      status: 'idle',
      duration: 0
    });
    
    // Update agent status back to Available
    handleStatusChange('AfterCall');
    
    if (onCallEnd) {
      onCallEnd(dispositionResult);
    }
  };

  // Call Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (callState.status === 'connected' && callState.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const duration = Math.floor((now.getTime() - callState.startTime!.getTime()) / 1000);
        setCallState(prev => ({ ...prev, duration }));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState.status, callState.startTime]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render availability status indicator
  const getStatusIndicator = () => {
    const statusConfig = {
      'Available': { color: 'bg-green-500', text: 'Available' },
      'OnCall': { color: 'bg-blue-500', text: 'On Call' },
      'AfterCall': { color: 'bg-yellow-500', text: 'After Call' },
      'Break': { color: 'bg-orange-500', text: 'On Break' },
      'Lunch': { color: 'bg-red-500', text: 'At Lunch' },
      'Meeting': { color: 'bg-purple-500', text: 'In Meeting' },
      'Training': { color: 'bg-indigo-500', text: 'Training' },
      'Offline': { color: 'bg-gray-500', text: 'Offline' }
    };

    const config = statusConfig[agentStatus as keyof typeof statusConfig] || statusConfig.Offline;

    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
        <span className="text-sm font-medium text-gray-700">{config.text}</span>
      </div>
    );
  };

  // Get current contact data
  const getContactData = () => {
    if (currentWorkItem) {
      try {
        return JSON.parse(currentWorkItem.contactData || '{}');
      } catch {
        return {};
      }
    }
    return {};
  };

  const contactData = getContactData();

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <UserIcon className="h-8 w-8 text-slate-600" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentAgent ? `${currentAgent.firstName} ${currentAgent.lastName}` : 'Agent Dashboard'}
                </h1>
                <p className="text-sm text-gray-500">
                  {currentAgent?.extension && `Ext. ${currentAgent.extension}`}
                  {isPollingForCalls && (
                    <span className="ml-2 text-blue-600">• Listening for calls</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {getStatusIndicator()}
            <button
              onClick={toggleAvailability}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                agentStatus === 'Available'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-slate-700'
              }`}
            >
              {agentStatus === 'Available' ? 'Go Unavailable' : 'Go Available'}
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Panel - Agent Controls */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Status Controls */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Status Controls</h2>
            
            <div className="space-y-2">
              {['Available', 'Break', 'Lunch', 'Meeting', 'Training'].map(status => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    agentStatus === status
                      ? 'bg-slate-100 text-slate-800 border border-slate-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign Information */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-md font-medium text-gray-900 mb-3">Assigned Campaigns</h3>
            {assignedCampaigns.length === 0 ? (
              <p className="text-sm text-gray-500">No campaigns assigned</p>
            ) : (
              <div className="space-y-2">
                {assignedCampaigns.map(campaign => (
                  <div key={campaign.campaignId} className="p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                    <div className="text-xs text-gray-500">{campaign.dialMethod}</div>
                    <div className={`text-xs inline-block px-2 py-1 rounded-full mt-1 ${
                      campaign.status === 'Active' 
                        ? 'bg-green-100 text-slate-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {campaign.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Call Statistics */}
          <div className="p-4 flex-1">
            <h3 className="text-md font-medium text-gray-900 mb-3">Today's Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Calls Handled</span>
                <span className="text-sm font-medium text-gray-900">0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Talk Time</span>
                <span className="text-sm font-medium text-gray-900">00:00:00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available Time</span>
                <span className="text-sm font-medium text-gray-900">00:00:00</span>
              </div>
            </div>
          </div>
        </div>

        {/* WebRTC Call Manager */}
        {sipConfig && (
          <div className="border-t border-gray-200 bg-white">
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Twilio Dialer</h3>
              <TwilioDialer 
                agentId={currentAgent?.agentId || 'agent-1'}
                callerIdNumber="+1234567890"
              />
            </div>
          </div>
        )}

        {/* SIP Configuration Warning */}
        {!sipConfig && currentAgent && (
          <div className="border-t border-gray-200 bg-yellow-50">
            <div className="p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-yellow-600 font-bold">!</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    SIP Configuration Required
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Your agent account needs SIP credentials configured to make calls through Dualtone.
                    Please contact your administrator to set up your SIP username and password.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {currentWorkItem ? (
            // Active Call Interface
            <div className="flex-1 bg-white">
              {/* Call Header */}
              <div className="bg-slate-600 text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Active Call</h2>
                    <p className="text-omnivox-200">Campaign: {currentWorkItem.campaign?.name || 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-mono">{formatDuration(callState.duration)}</div>
                    <div className="text-omnivox-200 text-sm capitalize">{callState.status}</div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-6 border-b border-gray-200">
                {/* Contact Information */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Name</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {contactData.title ? `${contactData.title} ` : ''}{`${contactData.firstName || ''} ${contactData.lastName || ''}`.trim() || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <div className="mt-1 text-sm text-gray-900">{contactData.phone || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <div className="mt-1 text-sm text-gray-900">{contactData.email || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {[contactData.address, contactData.address2, contactData.address3].filter(Boolean).join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Town/County</label>
                    <div className="mt-1 text-sm text-gray-900">
                      {[contactData.city, contactData.state].filter(Boolean).join(', ') || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Postcode</label>
                    <div className="mt-1 text-sm text-gray-900">{contactData.zipCode || 'N/A'}</div>
                  </div>
                  {contactData.ageRange && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Age Range</label>
                      <div className="mt-1 text-sm text-gray-900">{contactData.ageRange}</div>
                    </div>
                  )}
                  {contactData.residentialStatus && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Status</label>
                      <div className="mt-1 text-sm text-gray-900">{contactData.residentialStatus}</div>
                    </div>
                  )}
                  {contactData.deliveryDate && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Delivery Date</label>
                      <div className="mt-1 text-sm text-gray-900">{new Date(contactData.deliveryDate).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Call Controls */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-center space-x-4">
                  <button className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200" title="Mute">
                    <MicrophoneIcon className="h-6 w-6" />
                  </button>
                  <button className="p-3 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200" title="Speaker">
                    <SpeakerWaveIcon className="h-6 w-6" />
                  </button>
                  <button className="p-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600" title="Hold">
                    <PauseIcon className="h-6 w-6" />
                  </button>
                  <button 
                    className="p-4 bg-red-600 text-white rounded-full hover:bg-red-700"
                    onClick={handleEndCall}
                    title="End Call"
                  >
                    <PhoneXMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Script/Notes Area */}
              <div className="flex-1 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Call Script</h3>
                <div className="bg-gray-50 rounded-lg p-4 h-64 overflow-y-auto">
                  <div className="text-sm text-gray-700 space-y-2">
                    <p><strong>Introduction:</strong></p>
                    <p>"Hello, may I speak with {contactData.title} {contactData.firstName}? This is [Your Name] from [Company Name]."</p>
                    
                    <p className="mt-4"><strong>Delivery Verification:</strong></p>
                    <p>"I'm calling regarding a delivery to {contactData.city} on {contactData.deliveryDate ? new Date(contactData.deliveryDate).toLocaleDateString() : '[delivery date]'}."</p>
                    
                    <p className="mt-4"><strong>Address Confirmation:</strong></p>
                    <p>"Can you confirm this is the correct address: {[contactData.address, contactData.address2, contactData.city, contactData.zipCode].filter(Boolean).join(', ')}?"</p>
                    
                    {contactData.residentialStatus === 'Homeowner' && (
                      <>
                        <p className="mt-4"><strong>Homeowner Offer:</strong></p>
                        <p>"As a homeowner in the {contactData.ageRange} age range, you may be interested in..."</p>
                      </>
                    )}
                    
                    <p className="mt-4"><strong>Call Notes:</strong></p>
                    <textarea 
                      className="w-full mt-2 p-2 border border-gray-300 rounded text-sm"
                      rows={4}
                      placeholder="Add call notes here..."
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Idle State
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <PhoneIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-medium text-gray-900 mb-2">
                  {agentStatus === 'Available' ? 'Ready for Calls' : 'Agent Dashboard'}
                </h2>
                <p className="text-gray-600 mb-6">
                  {agentStatus === 'Available' 
                    ? 'Waiting for incoming calls...'
                    : 'Set your status to Available to receive calls'
                  }
                </p>
                
                {agentStatus !== 'Available' && (
                  <button
                    onClick={() => handleStatusChange('Available')}
                    className="px-6 py-3 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors"
                  >
                    Go Available
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disposition Modal */}
      {showDispositionModal && currentWorkItem && (
        <DispositionModal
          isOpen={showDispositionModal}
          callId={callState.callId || ''}
          campaignId={currentWorkItem.campaignId}
          contactName={`${contactData.firstName || ''} ${contactData.lastName || ''}`.trim()}
          onClose={() => setShowDispositionModal(false)}
          onComplete={handleDispositionComplete}
        />
      )}

      {/* New Call Disposition Modal */}
      {showCallDispositionModal && currentWorkItem && (
        <CallDispositionModal
          isOpen={showCallDispositionModal}
          contactName={`${contactData.title || ''} ${contactData.firstName || ''} ${contactData.lastName || ''}`.trim()}
          contactPhone={contactData.phone || ''}
          callDuration={formatDuration(callState.duration)}
          onDispositionSelect={handleCallDispositionSelect}
          onClose={() => setShowCallDispositionModal(false)}
        />
      )}

      {/* Inbound Call Notifications */}
      {currentAgent && (
        <InboundCallManager
          agentId={currentAgent.agentId}
          inboundCalls={inboundCalls}
          onAnswer={handleAnswerInboundCall}
          onDecline={handleDeclineInboundCall}
          onTransfer={handleTransferInboundCall}
        />
      )}
    </div>
  );
};

export default AgentDashboard;