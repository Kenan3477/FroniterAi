import React, { useState } from 'react';

interface RestApiDialerProps {
  onCallInitiated?: (result: any) => void;
}

export const RestApiDialer: React.FC<RestApiDialerProps> = ({ onCallInitiated }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentNumber, setAgentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastCallResult, setLastCallResult] = useState<any>(null);

  const handleNumberClick = (digit: string) => {
    if (phoneNumber.length < 15) { // Reasonable limit for international numbers
      setPhoneNumber(prev => prev + digit);
    }
  };

  const handleClear = () => {
    setPhoneNumber('');
    setAgentNumber('');
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

    if (!agentNumber) {
      alert('Please enter your phone number to receive the call');
      return;
    }

    setIsLoading(true);
    setLastCallResult(null);

    try {
      const response = await fetch('/api/calls/rest-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
          agentNumber: agentNumber.startsWith('+') ? agentNumber : `+${agentNumber}`
        })
      });

      const result = await response.json();
      setLastCallResult(result);
      
      if (result.success) {
        console.log('✅ REST API call initiated:', result);
        onCallInitiated?.(result);
      } else {
        console.error('❌ REST API call failed:', result);
      }
    } catch (error) {
      console.error('❌ Error making REST API call:', error);
      setLastCallResult({ 
        success: false, 
        error: 'Network error. Check console for details.' 
      });
    } finally {
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
          <h3 className="text-lg font-semibold text-gray-900">REST API Dialer</h3>
          <span className="text-xs text-gray-500 bg-blue-100 px-2 py-1 rounded">Server-side</span>
        </div>
        <p className="text-sm text-gray-600">Alternative calling method using Twilio REST API</p>
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

        {/* Agent Phone Number */}
        <div className="mb-4">
          <label htmlFor="agent-phone" className="block text-sm font-medium text-gray-700 mb-2">
            Your Phone Number (Agent)
          </label>
          <input
            id="agent-phone"
            type="tel"
            value={agentNumber}
            onChange={(e) => setAgentNumber(e.target.value)}
            placeholder="+447700123456"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            Your phone will ring first, then customer will be connected
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

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleCall}
            disabled={!phoneNumber || !agentNumber || isLoading}
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
            <span className="font-medium">How it works:</span> Twilio calls your phone first, then connects the customer when you answer. 
            Both calls will be connected in a conference for two-way conversation.
          </p>
        </div>
      </div>
    </div>
  );
};