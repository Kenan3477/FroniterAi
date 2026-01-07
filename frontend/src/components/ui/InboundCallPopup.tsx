'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { agentSocket } from '@/services/agentSocket';
import { useAuth } from '@/contexts/AuthContext';
import { startCall, answerCall, endCall, clearCall } from '@/store/slices/activeCallSlice';
import { useRouter } from 'next/navigation';

interface InboundCall {
  id: string;
  callSid: string;
  callerNumber: string;
  callerName?: string;
  displayName: string;
  timestamp: Date;
  callerInfo?: any;
}

export default function InboundCallPopup() {
  const [inboundCalls, setInboundCalls] = useState<InboundCall[]>([]);
  const { user } = useAuth();
  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    console.log('🔌 Setting up WebSocket for global inbound call popup...');
    
    // Connect to agent socket
    agentSocket.connect(user.id.toString());
    agentSocket.authenticateAgent(user.id.toString());

    // Handle inbound call notifications
    const handleInboundCallRinging = (data: any) => {
      console.log('🔔 GLOBAL POPUP: Inbound call received:', data);
      
      const callerNumber = data.call?.callerNumber || data.call?.from || 'Unknown Number';
      const callerName = data.call?.callerName || data.callerInfo?.name || null;
      const displayName = callerName ? `${callerName} (${callerNumber})` : callerNumber;
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('Incoming Call', {
          body: `Call from ${displayName}`,
          icon: '/favicon.ico',
          tag: 'inbound-call'
        });
      }
      
      // Add to popup state
      setInboundCalls(prev => {
        const exists = prev.find(call => call.id === data.call?.id);
        if (exists) return prev;
        
        return [...prev, {
          ...data.call,
          callerInfo: data.callerInfo,
          displayName,
          timestamp: new Date()
        }];
      });
    };

    const handleInboundCallAnswered = (data: any) => {
      console.log('📞 Global popup: Call answered:', data);
      setInboundCalls(prev => prev.filter(call => call.id !== data.callId));
    };

    const handleInboundCallEnded = (data: any) => {
      console.log('📞 Global popup: Call ended:', data);
      setInboundCalls(prev => prev.filter(call => call.id !== data.callId));
    };

    // Register event listeners
    agentSocket.on('inbound-call-ringing', handleInboundCallRinging);
    agentSocket.on('inbound-call-answered', handleInboundCallAnswered);
    agentSocket.on('inbound-call-ended', handleInboundCallEnded);

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }

    // Cleanup
    return () => {
      agentSocket.off('inbound-call-ringing', handleInboundCallRinging);
      agentSocket.off('inbound-call-answered', handleInboundCallAnswered);
      agentSocket.off('inbound-call-ended', handleInboundCallEnded);
    };
  }, [user]);

  // Handle answering a call
  const handleAnswerCall = async (call: InboundCall) => {
    try {
      console.log('📞 Answering call from global popup:', call.id);
      
      const response = await fetch('/api/calls/inbound-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          callId: call.id,
          agentId: user?.id?.toString()
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call answered successfully from popup');
        
        // Remove from popup notifications
        setInboundCalls(prev => prev.filter(c => c.id !== call.id));
        
        // Set up customer info from caller data
        const customerInfo = {
          id: call.callerInfo?.contactId || `temp-${Date.now()}`,
          contactId: call.callerInfo?.contactId,
          firstName: call.callerInfo?.name ? call.callerInfo.name.split(' ')[0] : '',
          lastName: call.callerInfo?.name ? call.callerInfo.name.split(' ').slice(1).join(' ') : '',
          phone: call.callerNumber,
          email: call.callerInfo?.email,
          address: call.callerInfo?.address,
          notes: call.callerInfo?.notes || ''
        };
        
        // Dispatch Redux actions to set active call state
        dispatch(startCall({
          phoneNumber: call.callerNumber,
          customerInfo
        }));
        
        // Mark call as answered
        dispatch(answerCall());
        
        // Navigate to work page to show the active call interface
        router.push('/work');
        
        console.log('🎯 Navigated to work page with active call state');
        console.log('📞 Direct call connection will be handled by Twilio automatically');
        
      } else {
        console.error('❌ Failed to answer call:', result.error);
        alert('Failed to answer call. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error answering call:', error);
      alert('Error answering call. Please try again.');
    }
  };

  // Handle declining a call
  const handleDeclineCall = (call: InboundCall) => {
    console.log('📞 Declining call from global popup:', call.id);
    setInboundCalls(prev => prev.filter(c => c.id !== call.id));
    // TODO: Notify backend that call was declined
  };

  // Handle transferring a call
  const handleTransferCall = async (call: InboundCall, transferType: 'queue' | 'agent') => {
    console.log('📞 Transferring call from global popup:', call.id, transferType);
    
    try {
      const agentId = localStorage.getItem('agentId') || 'current-agent';
      const targetId = transferType === 'queue' ? 'general' : 'available-agent';
      
      const response = await fetch('/api/calls/inbound-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          callId: call.id,
          transferType,
          targetId,
          agentId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call transferred successfully from popup');
        // Remove call from popup since it's been transferred
        setInboundCalls(prev => prev.filter(c => c.id !== call.id));
      } else {
        console.error('❌ Transfer failed:', result.error);
        alert(`❌ Transfer failed: ${result.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.error('❌ Error transferring call:', error);
      alert('❌ Error transferring call. Please try again.');
    }
  };

  // Don't render if no calls
  if (inboundCalls.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      {inboundCalls.map((call) => (
        <div 
          key={call.id} 
          className="bg-red-100 border-2 border-red-400 rounded-lg p-4 mb-2 shadow-lg animate-pulse max-w-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3 animate-bounce">📞</span>
              <div>
                <p className="font-bold text-red-800 text-lg">🚨 Incoming Call</p>
                <p className="font-semibold text-red-700">
                  From: {call.displayName}
                </p>
                <p className="text-sm text-red-600">
                  {call.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-3">
            <button 
              onClick={() => handleAnswerCall(call)}
              className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 font-bold flex items-center space-x-1"
            >
              <span>📞</span>
              <span>Answer</span>
            </button>
            
            <button 
              onClick={() => handleDeclineCall(call)}
              className="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 font-bold"
            >
              Decline
            </button>
            
            <div className="relative">
              <button 
                onClick={() => handleTransferCall(call, 'queue')}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 font-bold"
              >
                Transfer
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}