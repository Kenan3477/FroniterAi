/**
 * Twilio SIP Dialer - Complete Integrated Solution
 * Omnivox AI acts as SIP client, handling audio through user's microphone/headset
 * Twilio provides SIP infrastructure
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { 
  PhoneIcon, 
  PhoneArrowUpRightIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { twilioSipClient, TwilioCall } from '../../services/webrtc/TwilioSipClient';
import { DialPadModal } from './DialPadModal';
import { DispositionCard, DispositionData } from './DispositionCard';
import { startCall, answerCall, updateCallDuration, endCall as endCallAction, clearCall } from '@/store/slices/activeCallSlice';

interface TwilioDialerProps {
  agentId: string;
  callerIdNumber: string;
  onCallStart?: (call: TwilioCall, customerInfo: any) => void;
  onCallEnd?: (call: TwilioCall) => void;
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
}

export const TwilioDialer: React.FC<TwilioDialerProps> = ({
  agentId,
  callerIdNumber,
  onCallStart,
  onCallEnd
}) => {
  const dispatch = useDispatch();
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Call state
  const [activeCall, setActiveCall] = useState<TwilioCall | null>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [dialedNumber, setDialedNumber] = useState('');

  // Customer state
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [isDialPadOpen, setIsDialPadOpen] = useState(false);
  const [isDispositionCardOpen, setIsDispositionCardOpen] = useState(false);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (activeCall?.status === 'answered') {
      interval = setInterval(() => {
        if (activeCall.answerTime) {
          const duration = Math.floor((new Date().getTime() - activeCall.answerTime.getTime()) / 1000);
          setCallDuration(duration);
          
          // Update Redux
          dispatch(updateCallDuration(duration));
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall, dispatch]);

  // Set up Twilio SIP client event handlers
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    const handleCallOutgoing = (call: TwilioCall) => {
      setActiveCall(call);
      setIsDialing(true);
      
      // Dispatch to Redux for global state
      dispatch(startCall({
        phoneNumber: dialedNumber,
        customerInfo: customerInfo
      }));
      
      // Notify parent component with customer info
      if (onCallStart && customerInfo) {
        onCallStart(call, customerInfo);
      }
    };

    const handleCallAnswered = (call: TwilioCall) => {
      setActiveCall(call);
      setIsDialing(false);
      
      // Dispatch answer event
      dispatch(answerCall());
    };

    const handleCallEnded = (call: TwilioCall) => {
      setActiveCall(null);
      setIsDialing(false);
      
      // Dispatch end call event
      dispatch(endCallAction());
      
      // Show disposition card
      setIsDispositionCardOpen(true);
      
      onCallEnd?.(call);
    };

    const handleCallFailed = ({ call, cause }: { call: TwilioCall; cause: string }) => {
      setActiveCall(null);
      setIsDialing(false);
      setCallDuration(0);
      alert(`Call failed: ${cause}`);
    };

    // Attach event listeners
    twilioSipClient.on('connected', handleConnected);
    twilioSipClient.on('disconnected', handleDisconnected);
    twilioSipClient.on('callOutgoing', handleCallOutgoing);
    twilioSipClient.on('callAnswered', handleCallAnswered);
    twilioSipClient.on('callEnded', handleCallEnded);
    twilioSipClient.on('callFailed', handleCallFailed);

    // Cleanup
    return () => {
      twilioSipClient.off('connected', handleConnected);
      twilioSipClient.off('disconnected', handleDisconnected);
      twilioSipClient.off('callOutgoing', handleCallOutgoing);
      twilioSipClient.off('callAnswered', handleCallAnswered);
      twilioSipClient.off('callEnded', handleCallEnded);
      twilioSipClient.off('callFailed', handleCallFailed);
    };
  }, [onCallStart, onCallEnd, customerInfo]);

  // Connect to Twilio SIP
  const connectToTwilio = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);

    // Validate required environment variables - Production safety check
    if (!process.env.NEXT_PUBLIC_TWILIO_SIP_DOMAIN) {
      throw new Error('NEXT_PUBLIC_TWILIO_SIP_DOMAIN environment variable is required for production');
    }
    if (!process.env.NEXT_PUBLIC_TWILIO_SIP_USERNAME) {
      throw new Error('NEXT_PUBLIC_TWILIO_SIP_USERNAME environment variable is required for production');
    }
    if (!process.env.NEXT_PUBLIC_TWILIO_SIP_PASSWORD) {
      throw new Error('NEXT_PUBLIC_TWILIO_SIP_PASSWORD environment variable is required for production');
    }

    const config = {
      sipDomain: process.env.NEXT_PUBLIC_TWILIO_SIP_DOMAIN,
      username: process.env.NEXT_PUBLIC_TWILIO_SIP_USERNAME,
      password: process.env.NEXT_PUBLIC_TWILIO_SIP_PASSWORD,
      transport: 'UDP' as const,
      codec: 'PCMU' as const,
      callerIdNumber: callerIdNumber
    };

    const connected = await twilioSipClient.connect(config);
    
    if (!connected) {
      setConnectionError('Failed to connect to Twilio SIP');
      setIsConnecting(false);
    }
  }, [callerIdNumber]);

  // Disconnect from Twilio
  const disconnectFromTwilio = useCallback(() => {
    twilioSipClient.disconnect();
  }, []);

  // Handle dial from modal
  const handleDial = useCallback(async (phoneNumber: string, custInfo: CustomerInfo | null) => {
    setDialedNumber(phoneNumber);
    setCustomerInfo(custInfo);
    setIsDialPadOpen(false);

    // Make the call
    const callId = await twilioSipClient.makeCall({
      phoneNumber: phoneNumber.trim(),
      callerIdNumber: callerIdNumber,
      agentId: agentId,
      contactId: custInfo?.contactId || custInfo?.id,
      campaignId: 'MANUAL-DIAL', // Default for manual dialing
      recordCall: true
    });

    if (!callId) {
      alert('Failed to place call');
    }
  }, [callerIdNumber]);

  // End call
  const endCall = useCallback(() => {
    if (activeCall) {
      twilioSipClient.endCall(activeCall.id);
    }
  }, [activeCall]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (activeCall) {
      const newMutedState = !isMuted;
      // TODO: Implement mute in TwilioSipClient
      setIsMuted(newMutedState);
    }
  }, [activeCall, isMuted]);

  // Send DTMF
  const sendDTMF = useCallback((digit: string) => {
    if (activeCall && activeCall.status === 'answered') {
      twilioSipClient.sendDTMF(activeCall.id, digit);
    }
  }, [activeCall]);

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle disposition save
  const handleSaveDisposition = async (disposition: DispositionData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app'}/api/calls/save-call-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: dialedNumber,
          customerInfo: customerInfo,
          disposition: disposition,
          callDuration: callDuration,
          agentId: agentId,
          campaignId: 'manual-dial'
        })
      });

      if (response.ok) {
        setIsDispositionCardOpen(false);
        
        // Clear Redux state
        dispatch(clearCall());
        
        // Reset local state
        setDialedNumber('');
        setCustomerInfo(null);
        setCallDuration(0);
      } else {
        console.error('❌ Failed to save call data');
        alert('Failed to save call data');
      }
    } catch (error) {
      console.error('❌ Error saving call data:', error);
      alert('Error saving call data');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Omnivox AI SIP Dialer</h3>
          <p className="text-sm text-gray-600">Your AI-powered calling platform</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-sm font-medium ${isConnected ? 'text-slate-600' : 'text-red-600'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Connection Controls */}
      <div className="mb-6 space-y-3">
        <div className="flex space-x-3">
          {!isConnected ? (
            <button
              onClick={connectToTwilio}
              disabled={isConnecting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <PhoneIcon className="w-4 h-4" />
              <span>{isConnecting ? 'Connecting...' : 'Connect to Twilio'}</span>
            </button>
          ) : (
            <button
              onClick={disconnectFromTwilio}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center space-x-2"
            >
              <XCircleIcon className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          )}
        </div>
        
        {connectionError && (
          <p className="text-sm text-red-600">{connectionError}</p>
        )}
      </div>

      {/* Dial Pad Button */}
      {isConnected && !activeCall && (
        <div className="mb-6">
          <button
            onClick={() => setIsDialPadOpen(true)}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 flex items-center justify-center space-x-3 text-lg font-medium shadow-lg"
          >
            <PhoneIcon className="w-6 h-6" />
            <span>Open Dial Pad</span>
          </button>
        </div>
      )}

      {/* Active Call Controls */}
      {activeCall && (
        <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">
                {activeCall.status === 'answered' ? 'Connected to' : 'Calling'}
              </p>
              <p className="text-xl font-semibold text-gray-900">
                {customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : dialedNumber}
              </p>
              <p className="text-sm text-gray-600">{dialedNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-blue-600">
                {formatDuration(callDuration)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {activeCall.status === 'answered' ? 'In Progress' : 'Ringing...'}
              </p>
            </div>
          </div>

          {/* Call Control Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={toggleMute}
              className={`py-3 rounded-md font-medium flex items-center justify-center space-x-2 ${
                isMuted 
                  ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              {isMuted ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              onClick={endCall}
              className="py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium flex items-center justify-center space-x-2"
            >
              <StopIcon className="w-5 h-5" />
              <span>End Call</span>
            </button>
          </div>

          {/* DTMF Keypad (optional) */}
          {activeCall.status === 'answered' && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <p className="text-xs text-gray-600 mb-2">DTMF Keypad</p>
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => sendDTMF(digit)}
                    className="py-2 bg-white hover:bg-gray-100 rounded text-sm font-semibold"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Customer Info Display (if available) */}
      {customerInfo && activeCall && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Customer Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <p className="font-medium">{customerInfo.firstName} {customerInfo.lastName}</p>
            </div>
            {customerInfo.email && (
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium">{customerInfo.email}</p>
              </div>
            )}
            {customerInfo.address && (
              <div className="col-span-2">
                <span className="text-gray-600">Address:</span>
                <p className="font-medium">{customerInfo.address}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <DialPadModal
        isOpen={isDialPadOpen}
        onClose={() => setIsDialPadOpen(false)}
        onDial={handleDial}
        callerIdNumber={callerIdNumber}
      />

      <DispositionCard
        isOpen={isDispositionCardOpen}
        onClose={() => setIsDispositionCardOpen(false)}
        onSave={handleSaveDisposition}
        customerInfo={{
          name: customerInfo ? `${customerInfo.firstName} ${customerInfo.lastName}` : undefined,
          phoneNumber: dialedNumber
        }}
        callDuration={callDuration}
      />
    </div>
  );
};
