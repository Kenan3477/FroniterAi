import React, { useState, useEffect, useRef } from 'react';
import { Device } from '@twilio/voice-sdk';

interface RestApiDialerProps {
  onCallInitiated?: (result: any) => void;
}

export const RestApiDialer: React.FC<RestApiDialerProps> = ({ onCallInitiated }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<any>(null);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [isDeviceReady, setIsDeviceReady] = useState(false);
  const deviceRef = useRef<Device | null>(null);

  // Initialize Twilio Device for browser audio
  useEffect(() => {
    const initializeDevice = async () => {
      try {
        // Get access token from backend
        const tokenResponse = await fetch('/api/calls/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'agent-' + Date.now() })
        });
        
        if (!tokenResponse.ok) {
          throw new Error('Failed to get access token');
        }

        const { data } = await tokenResponse.json();
        
        // Initialize Twilio Device
        const twilioDevice = new Device(data.token, {
          logLevel: 'debug',
        });

        // Set up event listeners
        twilioDevice.on('ready', () => {
          console.log('✅ Twilio Device ready for calls');
          setIsDeviceReady(true);
        });

        twilioDevice.on('error', (error) => {
          console.error('❌ Twilio Device error:', error);
          setIsDeviceReady(false);
        });

        twilioDevice.on('incoming', (call) => {
          console.log('📞 Incoming call received');
          setCurrentCall(call);
        });

        await twilioDevice.register();
        setDevice(twilioDevice);
        deviceRef.current = twilioDevice;
        
      } catch (error) {
        console.error('❌ Failed to initialize Twilio Device:', error);
        setLastCallResult({ 
          success: false, 
          error: 'Failed to initialize voice connection' 
        });
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
    setCurrentCall(null);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleCall = async () => {
    if (!phoneNumber) {
      alert('Please enter a customer phone number');
      return;
    }

    if (!device || !isDeviceReady) {
      alert('Voice connection not ready. Please wait...');
      return;
    }

    setIsLoading(true);
    setLastCallResult(null);

    try {
      // Make call using Twilio Device (WebRTC)
      const call = await device.connect({
        params: {
          To: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        }
      });

      setCurrentCall(call);
      
      const result = {
        success: true,
        callSid: call.parameters.CallSid,
        status: 'ringing',
        method: 'WebRTC'
      };

      setLastCallResult(result);
      onCallInitiated?.(result);
      
      console.log('✅ Call initiated via WebRTC:', result);
      
      // Set up call event listeners
      call.on('accept', () => {
        console.log('📞 Call accepted');
        setLastCallResult((prev: any) => ({ ...prev, status: 'connected' }));
      });
      
      call.on('disconnect', () => {
        console.log('📞 Call ended');
        setCurrentCall(null);
        setIsLoading(false);
      });
      
    } catch (error: any) {
      console.error('❌ Error making WebRTC call:', error);
      setLastCallResult({ 
        success: false, 
        error: error.message || 'Failed to make call'
      });
      setIsLoading(false);
    }
  };

  const handleHangup = () => {
    if (currentCall) {
      currentCall.disconnect();
      setCurrentCall(null);
      setIsLoading(false);
    }
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

        {/* Device Status */}
        {!isDeviceReady && (
          <div className="mb-4 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              🔄 Connecting to voice server...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {!currentCall ? (
            <>
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
                    Calling...
                  </span>
                ) : (
                  '📞 Call'
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
            </>
          ) : (
            <button
              onClick={handleHangup}
              className="flex-1 bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              🔴 Hang Up
            </button>
          )}
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
            <span className="font-medium">How it works:</span> Your browser connects to our voice server, then calls the customer. 
            You'll hear the call through your browser when they answer.
          </p>
        </div>
      </div>
    </div>
  );
};