import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';

interface RestApiDialerProps {
  onCallInitiated?: (result: any) => void;
}

export const RestApiDialer: React.FC<RestApiDialerProps> = ({ onCallInitiated }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<any>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const deviceRef = useRef<Device | null>(null);

  // Debug logging for device ready state
  useEffect(() => {
    console.log('🔍 Device ready state changed:', isDeviceReady);
  }, [isDeviceReady]);

  // Initialize Twilio Device for browser audio (to receive calls from REST API)
  useEffect(() => {
    const initializeDevice = async () => {
      try {
        console.log('🔄 Initializing WebRTC device for incoming calls...');
        
        // Get access token from backend
        const tokenResponse = await fetch('/api/calls/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'agent-browser' })
        });
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to get access token');
        }

        const { data } = await tokenResponse.json();
        
        // Initialize Twilio Device for incoming calls
        const twilioDevice = new Device(data.token, {
          logLevel: 'debug',
        });

        // Set up event listeners
        twilioDevice.on('ready', () => {
          console.log('✅ WebRTC Device ready for incoming calls');
          console.log('🔄 Setting device ready state to true');
          setIsDeviceReady(true);
        });

        twilioDevice.on('registered', () => {
          console.log('✅ WebRTC Device registered and ready for calls');
          console.log('🔄 Setting device ready state to true (via registered event)');
          setIsDeviceReady(true);
        });

        twilioDevice.on('error', (error) => {
          console.error('❌ WebRTC Device error:', error);
          setIsDeviceReady(false);
        });

        twilioDevice.on('incoming', (call) => {
          console.log('📞 Incoming call from REST API - auto accepting');
          call.accept(); // Auto-accept incoming calls from REST API
        });

        console.log('🔧 About to register Twilio device...');
        await twilioDevice.register();
        setDevice(twilioDevice);
        deviceRef.current = twilioDevice;
        
      } catch (error) {
        console.error('❌ Failed to initialize WebRTC Device:', error);
      }
    };

    initializeDevice();

    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
    };
  }, []);

  const handleNumberClick = (digit: string) => {
    if (phoneNumber.length < 15) { // Reasonable limit for international numbers
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleClear = () => {
    setPhoneNumber('');
    setLastCallResult(null);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleCall = async () => {
    if (!phoneNumber) {
      alert('Please enter a customer phone number');
      return;
    }

    setIsLoading(true);
    setLastCallResult(null);

    try {
      console.log('📞 Making REST API call to:', phoneNumber);
      
      // Make REST API call through backend - SIMPLE DIRECT CALLING
      const response = await fetch('/api/calls/call-rest-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          to: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastCallResult({
          success: true,
          callSid: result.callSid,
          status: result.status,
          method: 'REST API',
          message: result.message
        });
        onCallInitiated?.(result);
        console.log('✅ REST API call initiated:', result);
      } else {
        throw new Error(result.error || 'Failed to make call');
      }
      
    } catch (error: any) {
      console.error('❌ Error making REST API call:', error);
      setLastCallResult({ 
        success: false, 
        error: error.message || 'Failed to make call'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHangup = () => {
    // For REST API calls, we can't directly hang up from frontend
    // This would need to be implemented through the backend
    console.log('📞 Hangup requested - REST API calls managed by backend');
    setLastCallResult({
      success: true,
      message: 'Call hangup requested. Contact your administrator to end active calls.'
    });
  };

  const dialPadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Phone Dialer</h3>
          <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">Twilio REST API</span>
        </div>
        <p className="text-sm text-gray-600">Make outbound calls to customers</p>
      </div>

      <div className="p-4">
        {/* Phone Number Display */}
        <div className="mb-4">
          <label htmlFor="customer-phone" className="block text-sm font-medium text-gray-700 mb-2">
            Customer Phone Number
          </label>
          <div className="relative">
            <input
              id="customer-phone"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+447929717470"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
            />
            {phoneNumber && (
              <button
                onClick={handleBackspace}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ⌫
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Customer number to call
          </p>
        </div>

        {/* Dial Pad */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {dialPadNumbers.flat().map((number) => (
            <button
              key={number}
              onClick={() => handleNumberClick(number)}
              className="h-12 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors font-semibold text-lg"
              disabled={isLoading}
            >
              {number}
            </button>
          ))}
        </div>

        {/* WebRTC Status */}
        {!isDeviceReady && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              🔄 Initializing browser audio for calls...
            </p>
          </div>
        )}
        
        {isDeviceReady && (
          <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-md">
            <p className="text-xs text-green-800">
              ✅ Browser audio ready - you can speak to customers
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCall}
            disabled={!phoneNumber || isLoading || !isDeviceReady}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Making Call...
              </span>
            ) : (
              '📞 Call Customer'
            )}
          </button>
          
          <button
            onClick={handleClear}
            disabled={isLoading}
            className="px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors font-medium"
            title="Clear all fields"
          >
            Clear
          </button>
        </div>

        {/* Call Result */}
        {lastCallResult && (
          <div className={`p-3 rounded-md text-sm ${
            lastCallResult.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {lastCallResult.success ? (
              <div>
                <p className="font-medium">✅ Call initiated successfully!</p>
                <p className="text-xs mt-1">Call SID: {lastCallResult.callSid}</p>
                <p className="text-xs">Status: {lastCallResult.status}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium">❌ Call failed</p>
                <p className="text-xs mt-1">{lastCallResult.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs text-blue-800">
            <span className="font-medium">How it works:</span> REST API calls the customer, then connects them to your browser. 
            You'll hear the customer through your browser speakers and speak through your microphone.
          </p>
        </div>
      </div>
    </div>
  );
};