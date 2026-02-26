/**
 * Backend-Powered Dialer Component
 * All Twilio calls go through backend API
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { 
  PhoneIcon, 
  PhoneArrowUpRightIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from '@heroicons/react/24/outline';
import { DialPadModal } from './DialPadModal';
import { DispositionCard, DispositionData } from './DispositionCard';
import { startCall, answerCall, updateCallDuration, endCall as endCallAction, clearCall } from '@/store/slices/activeCallSlice';
import * as dialerApi from '@/services/dialerApi';

interface BackendDialerProps {
  agentId: string;
  callerIdNumber: string;
  onCallStart?: (callData: any, customerInfo: any) => void;
  onCallEnd?: (callData: any) => void;
}

interface CustomerInfo {
  id?: string;
  contactId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  phoneNumber?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  campaignId?: string;
}

export const BackendDialer: React.FC<BackendDialerProps> = ({
  agentId,
  callerIdNumber,
  onCallStart,
  onCallEnd
}) => {
  const dispatch = useDispatch();
  
  // Call state
  const [activeCallSid, setActiveCallSid] = useState<string | null>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [dialedNumber, setDialedNumber] = useState('');
  const [callStatus, setCallStatus] = useState<string>('idle');

  // Customer state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);
  const [isDispositionCardOpen, setIsDispositionCardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (callStatus === 'answered' && callStartTime) {
      interval = setInterval(() => {
        const duration = Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000);
        setCallDuration(duration);
        
        // Update Redux
        dispatch(updateCallDuration(duration));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus, callStartTime, dispatch]);

  // Handle dial from modal
  const handleDial = useCallback(async (phoneNumber: string, custInfo: CustomerInfo | null) => {
    setError(null);
    setDialedNumber(phoneNumber);
    setCustomerInfo(custInfo);
    setIsDialPadOpen(false);
    setIsDialing(true);

    try {
      // Call backend API to initiate call
      const callData = await dialerApi.initiateCall({
        to: phoneNumber.trim(),
        from: callerIdNumber,
        agentId,
        customerInfo: custInfo,
      });
      
      setActiveCallSid(callData.callSid || null);
      setCallStatus('initiated');
      setCallStartTime(new Date());
      
      // Dispatch to Redux for global state
      dispatch(startCall({
        phoneNumber: phoneNumber,
        customerInfo: custInfo || undefined
      }));

      // Simulate call progression (in production, you'd use webhooks/polling)
      setTimeout(() => {
        setCallStatus('ringing');
      }, 1000);

      setTimeout(() => {
        setCallStatus('answered');
        setIsDialing(false);
        dispatch(answerCall());
      }, 3000);
      
      // Notify parent component
      if (onCallStart && custInfo) {
        onCallStart(callData, custInfo);
      }
    } catch (err: any) {
      console.error('❌ Failed to initiate call:', err);
      setError(err.message || 'Failed to place call');
      setIsDialing(false);
      alert(`Failed to place call: ${err.message}`);
    }
  }, [agentId, callerIdNumber, dispatch, onCallStart]);

  // End call
  const endCall = useCallback(async () => {
    if (!activeCallSid) return;

    try {
      // Call backend API to end call
      const result = await dialerApi.endCall({
        callSid: activeCallSid,
        duration: callDuration,
        status: callStatus,
        customerInfo: {
          ...customerInfo,
          agentId,
        }
      });
      
      setCallStatus('completed');
      
      // Dispatch end call event
      dispatch(endCallAction());
      
      // Reset state
      setActiveCallSid(null);
      setIsDialing(false);
      
      // Show disposition card
      setIsDispositionCardOpen(true);
      
      onCallEnd?.(result);
    } catch (err: any) {
      console.error('❌ Failed to end call:', err);
      setError(err.message || 'Failed to end call');
      alert(`Failed to end call: ${err.message}`);
    }
  }, [activeCallSid, callDuration, callStatus, customerInfo, agentId, dispatch, onCallEnd]);

  // Send DTMF
  const sendDTMF = useCallback(async (digit: string) => {
    if (activeCallSid && callStatus === 'answered') {
      try {
        await dialerApi.sendDTMF({
          callSid: activeCallSid,
          digits: digit,
        });
      } catch (err: any) {
        console.error('Failed to send DTMF:', err);
      }
    }
  }, [activeCallSid, callStatus]);

  // Handle disposition card close
  const handleDispositionClose = useCallback(() => {
    setIsDispositionCardOpen(false);
    // Clear state after modal closes
    setTimeout(() => {
      setCustomerInfo(null);
      setCallStatus('idle');
    }, 100);
  }, []);

  // Handle disposition submission
  const handleDispositionSubmit = useCallback(async (disposition: DispositionData) => {
    // Save disposition data to backend
    try {
      console.log('📋 Submitting call disposition:', disposition);
      
      // Save call outcome and disposition to backend
      const dispositionResponse = await fetch('/api/agents/call-outcome', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          callId: activeCallSid, // Use callSid as callId for now
          contactId: customerInfo?.contactId || customerInfo?.id,
          agentId: agentId,
          campaignId: customerInfo?.campaignId || 'default',
          outcome: disposition.outcome,
          notes: disposition.notes,
          duration: callDuration,
          phoneNumber: customerInfo?.phoneNumber || customerInfo?.phone || dialedNumber,
          followUpRequired: disposition.followUpRequired,
          followUpDate: disposition.followUpDate
        })
      });

      if (dispositionResponse.ok) {
        console.log('✅ Call disposition saved successfully');
        
        // Also save customer info if provided
        if (customerInfo) {
          await fetch('/api/calls/save-call-data', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
              callSid: activeCallSid, // Add required recording evidence
              phoneNumber: customerInfo.phoneNumber || customerInfo.phone || dialedNumber,
              customerInfo: {
                ...customerInfo,
                notes: disposition.notes
              },
              disposition: disposition.outcome,
              callDuration: callDuration,
              agentId: String(agentId), // Convert to string for database compatibility
              campaignId: customerInfo.campaignId || 'default'
            })
          });
        }
      } else {
        const error = await dispositionResponse.json();
        console.error('❌ Failed to save disposition:', error);
        alert(`Failed to save disposition: ${error.message}`);
      }
      
      // Update customer info with notes if provided
      if (disposition.notes && customerInfo) {
        setCustomerInfo({
          ...customerInfo,
          notes: disposition.notes
        });
      }
      
      // Clear Redux state
      dispatch(clearCall());
      
      // Reset UI state
      setIsDispositionCardOpen(false);
      setCallDuration(0);
      setCallStartTime(null);
      setDialedNumber('');
      // Don't clear customerInfo immediately - let the modal close first
      setTimeout(() => {
        setCustomerInfo(null);
        setCallStatus('idle');
      }, 100);
    } catch (err: any) {
      console.error('❌ Failed to save disposition:', err);
      alert(`Failed to save disposition: ${err.message}`);
    }
  }, [customerInfo, dispatch]);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status color
  const getStatusColor = () => {
    switch (callStatus) {
      case 'initiated':
      case 'ringing':
        return 'text-yellow-600';
      case 'answered':
        return 'text-slate-600';
      case 'completed':
        return 'text-gray-600';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="w-full">
      {/* Header with Collapse Toggle */}
      <div className="bg-gray-50 border border-gray-200 rounded-t-lg px-4 py-3 border-b-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Backend Dialer</h3>
            <p className="text-xs text-gray-600">
              {isCollapsed ? 'Click to expand controls' : 'Backend-powered calling'}
            </p>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
            title={isCollapsed ? "Expand dialer" : "Collapse dialer"}
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Dialer Controls */}
      {!isCollapsed && (
        <div className="bg-white rounded-b-lg border border-gray-200 p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Call Status */}
        {activeCallSid ? (
          <div className="space-y-4">
            {/* Active Call Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`animate-pulse ${callStatus === 'answered' ? 'bg-green-500' : 'bg-yellow-500'} h-3 w-3 rounded-full`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{dialedNumber}</p>
                  <p className={`text-xs ${getStatusColor()}`}>
                    {callStatus === 'initiated' && 'Initiating...'}
                    {callStatus === 'ringing' && 'Ringing...'}
                    {callStatus === 'answered' && `Connected - ${formatDuration(callDuration)}`}
                  </p>
                </div>
              </div>

              {/* End Call Button */}
              <button
                onClick={endCall}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <StopIcon className="h-5 w-5" />
                <span>End Call</span>
              </button>
            </div>

            {/* Call Controls */}
            <div className="flex space-x-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 border rounded-lg transition-colors ${
                  isMuted
                    ? 'bg-red-50 border-red-300 text-red-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {isMuted ? (
                  <>
                    <SpeakerXMarkIcon className="h-5 w-5" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <SpeakerWaveIcon className="h-5 w-5" />
                    <span>Mute</span>
                  </>
                )}
              </button>
            </div>

            {/* DTMF Keypad */}
            {callStatus === 'answered' && (
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => sendDTMF(digit)}
                    className="py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Idle State - Show Dial Button */
          <div className="text-center">
            <button
              onClick={() => setIsDialPadOpen(true)}
              disabled={isDialing}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PhoneIcon className="h-5 w-5" />
              <span>{isDialing ? 'Dialing...' : 'Make Call'}</span>
            </button>
          </div>
        )}
      </div>
      )}

      {/* Dial Pad Modal */}
      <DialPadModal
        isOpen={isDialPadOpen}
        onClose={() => setIsDialPadOpen(false)}
        onDial={handleDial}
        callerIdNumber={callerIdNumber}
      />

      {/* Disposition Card */}
      {isDispositionCardOpen && customerInfo && (
        <DispositionCard
          isOpen={isDispositionCardOpen}
          onClose={handleDispositionClose}
          onSave={handleDispositionSubmit}
          customerInfo={{
            name: `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim() || 'Unknown',
            phoneNumber: customerInfo.phone || customerInfo.phoneNumber || dialedNumber,
          }}
          callDuration={callDuration}
        />
      )}
    </div>
  );
};

// Export as TwilioDialer for backwards compatibility
export const TwilioDialer = BackendDialer;
