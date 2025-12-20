/**
 * Twilio SIP Dialer - Manual Outbound Calling
 * Integrates with Kennex for PSTN calls via Twilio SIP
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PhoneIcon, 
  PhoneArrowUpRightIcon,
  StopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { twilioSipClient, TwilioCall } from '../../services/webrtc/TwilioSipClient';

interface TwilioDialerProps {
  agentId: string;
  callerIdNumber: string; // Must be verified Twilio number
  onCallStart?: (call: TwilioCall) => void;
  onCallEnd?: (call: TwilioCall) => void;
}

export const TwilioDialer: React.FC<TwilioDialerProps> = ({
  agentId,
  callerIdNumber,
  onCallStart,
  onCallEnd
}) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Call state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [activeCall, setActiveCall] = useState<TwilioCall | null>(null);
  const [isDialing, setIsDialing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // UI state
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isDialPadOpen, setDialPadOpen] = useState(false);

  // Add separate state for dialed number
  const [dialedNumber, setDialedNumber] = useState('');

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (activeCall?.status === 'answered') {
      interval = setInterval(() => {
        if (activeCall.answerTime) {
          const duration = Math.floor((new Date().getTime() - activeCall.answerTime.getTime()) / 1000);
          setCallDuration(duration);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeCall]);

  // Set up Twilio SIP client event handlers
  useEffect(() => {
    const handleConnected = () => {
      console.log('✅ Twilio SIP connected');
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      console.log('❌ Twilio SIP disconnected');
      setIsConnected(false);
      setIsConnecting(false);
    };

    // Refactor to pass phone number explicitly
    const handleCallOutgoing = (call: TwilioCall) => {
      console.log('📞 Outgoing call:', call);
      setActiveCall(call);
      setIsDialing(true);
      onCallStart?.(call);
    };

    const handleCallAnswered = (call: TwilioCall) => {
      console.log('✅ Call answered:', call);
      setActiveCall(call);
      setIsDialing(false);
    };

    const handleCallEnded = (call: TwilioCall) => {
      console.log('📴 Call ended:', call);
      setActiveCall(null);
      setIsDialing(false);
      setCallDuration(0);
      setDispositionCardVisible(true);

      const fieldsToSave = {
        phoneNumber: dialedNumber,
        callDuration,
        // Add other fields as needed
      };
      autoSaveFields(fieldsToSave);

      onCallEnd?.(call);
    };

    const handleCallFailed = ({ call, cause }: { call: TwilioCall; cause: string }) => {
      console.log('❌ Call failed:', call, cause);
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
  }, [onCallStart, onCallEnd]);

  // Connect to Twilio SIP
  const connectToTwilio = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);

    const config = {
      sipDomain: process.env.NEXT_PUBLIC_TWILIO_SIP_DOMAIN || 'kennex-dev.sip.twilio.com',
      username: process.env.NEXT_PUBLIC_TWILIO_SIP_USERNAME || 'Kennex',
      password: process.env.NEXT_PUBLIC_TWILIO_SIP_PASSWORD || 'Albert3477!',
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

  // Make a call
  const makeCall = useCallback(async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    // Validate E.164 format
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber.trim())) {
      alert('Phone number must be in E.164 format (e.g., +447700900123)');
      return;
    }

    setIsDialing(true);
    
    const callId = await twilioSipClient.makeCall({
      phoneNumber: phoneNumber.trim(),
      callerIdNumber: callerIdNumber,
      recordCall: true
    });

    if (!callId) {
      setIsDialing(false);
      alert('Failed to place call');
    }
  }, [phoneNumber, callerIdNumber]);

  // End call
  const endCall = useCallback(() => {
    if (activeCall) {
      twilioSipClient.endCall(activeCall.id);
    }
  }, [activeCall]);

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

  // Add manual dial pad UI
  const DialPadModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [dialedNumber, setDialedNumber] = useState('');

    // Add customer info retrieval
    const fetchCustomerInfo = async (phoneNumber: string) => {
      try {
        const response = await fetch(`/api/customer-info?phoneNumber=${phoneNumber}`);
        if (response.ok) {
          const customer = await response.json();
          return customer;
        }
      } catch (error) {
        console.error('Failed to fetch customer info:', error);
      }
      return null;
    };

    // Add work item card creation
    const createWorkItemCard = (customerInfo: any) => {
      // Logic to create a card in the Work Items tab
      console.log('Creating work item card for:', customerInfo);
      // Example: Dispatch to Redux store or update UI state
    };

    // Update handleDial to fetch customer info
    const handleDial = async () => {
      if (dialedNumber) {
        const customerInfo = await fetchCustomerInfo(dialedNumber);
        if (customerInfo) {
          console.log('Customer info retrieved:', customerInfo);
          createWorkItemCard(customerInfo);
        } else {
          console.log('No customer info found. Creating blank work item card.');
          createWorkItemCard({ phoneNumber: dialedNumber });
        }

        const callOptions = {
          phoneNumber: dialedNumber,
          callerId: callerIdNumber,
        };
        twilioSipClient.makeCall(callOptions);
        onClose();
      }
    };

    return (
      <div className={`modal ${isOpen ? 'open' : ''}`}>
        <div className="modal-content">
          <h3>Manual Dial Pad</h3>
          <input
            type="text"
            value={dialedNumber}
            onChange={(e) => setDialedNumber(e.target.value)}
            placeholder="Enter phone number"
          />
          <button onClick={handleDial}>Dial</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  };

  // Add auto-save functionality
  const autoSaveFields = async (fields: any) => {
    try {
      const response = await fetch('/api/save-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (response.ok) {
        console.log('Fields auto-saved successfully');
      } else {
        console.error('Failed to auto-save fields');
      }
    } catch (error) {
      console.error('Error during auto-save:', error);
    }
  };

  // Add disposition card
  const DispositionCard: React.FC<{ onSave: (disposition: string) => void }> = ({ onSave }) => {
    const [disposition, setDisposition] = useState('');

    const handleSave = () => {
      onSave(disposition);
    };

    return (
      <div className="disposition-card">
        <h3>Disposition</h3>
        <textarea
          value={disposition}
          onChange={(e) => setDisposition(e.target.value)}
          placeholder="Enter disposition notes"
        />
        <button onClick={handleSave}>Save</button>
      </div>
    );
  };

  const [isDispositionCardVisible, setDispositionCardVisible] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Twilio SIP Dialer</h3>
          <p className="text-sm text-gray-600">Make PSTN calls via Twilio SIP</p>
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

      {/* Phone Number Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number (E.164 format)
        </label>
        <div className="flex space-x-3">
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+447700900123"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected || activeCall !== null}
          />
          <button
            onClick={makeCall}
            disabled={!isConnected || isDialing || activeCall !== null}
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <PhoneArrowUpRightIcon className="w-4 h-4" />
            <span>{isDialing ? 'Dialing...' : 'Call'}</span>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Must start with + followed by country code and number
        </p>
      </div>

      {/* Active Call Controls */}
      {activeCall && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-medium text-blue-900">
                {activeCall.status === 'answered' ? 'Connected to' : 'Calling'}: {activeCall.remoteNumber}
              </p>
              {activeCall.status === 'answered' && (
                <p className="text-sm text-blue-700">Duration: {formatDuration(callDuration)}</p>
              )}
            </div>
            <button
              onClick={endCall}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
            >
              <StopIcon className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </div>

          {/* DTMF Keypad */}
          {activeCall.status === 'answered' && (
            <div className="grid grid-cols-3 gap-2 max-w-xs">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => sendDTMF(digit)}
                  className="p-3 bg-white border border-gray-300 rounded-md hover:bg-gray-50 font-mono text-lg"
                >
                  {digit}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Configuration Info */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Twilio Configuration</h4>
        <dl className="text-xs space-y-1">
          <div className="flex justify-between">
            <dt className="text-gray-600">SIP Domain:</dt>
            <dd className="text-gray-900 font-mono">kennex-dev.sip.twilio.com</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Username:</dt>
            <dd className="text-gray-900 font-mono">Kennex</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Transport:</dt>
            <dd className="text-gray-900">UDP</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Codec:</dt>
            <dd className="text-gray-900">PCMU (G.711u)</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Caller ID:</dt>
            <dd className="text-gray-900 font-mono">{callerIdNumber}</dd>
          </div>
        </dl>
      </div>

      {/* Manual Dial Pad Button */}
      <div className="mt-4">
        <button
          onClick={() => setDialPadOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
        >
          <PhoneIcon className="w-4 h-4" />
          <span>Open Dial Pad</span>
        </button>
      </div>

      {/* Manual Dial Pad Modal */}
      <DialPadModal isOpen={isDialPadOpen} onClose={() => setDialPadOpen(false)} />

      {/* Disposition Card */}
      {isDispositionCardVisible && (
        <DispositionCard
          onSave={(disposition) => {
            console.log('Disposition saved:', disposition);
            setDispositionCardVisible(false);
          }}
        />
      )}
    </div>
  );
};