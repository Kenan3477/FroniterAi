
"use client";
/**
 * Twilio SIP Test Page
 * Manual testing interface for Twilio integration
 */

import React, { useState } from 'react';
import { TwilioDialer } from '../../components/dialer/TwilioDialer';
import { TwilioCall } from '../../services/webrtc/TwilioSipClient';

export default function TwilioTestPage() {
  const [callHistory, setCallHistory] = useState<TwilioCall[]>([]);
  const [agentId] = useState('test-agent-001');
  
  // Replace with your verified Twilio Caller ID
  const [callerIdNumber] = useState('+1234567890'); // ⚠️ MUST be verified in Twilio

  const handleCallStart = (call: TwilioCall) => {
    console.log('📞 Call started:', call);
  };

  const handleCallEnd = (call: TwilioCall) => {
    console.log('📴 Call ended:', call);
    setCallHistory(prev => [call, ...prev]);
  };

  const formatCallDuration = (call: TwilioCall): string => {
    if (!call.duration) return 'No answer';
    const mins = Math.floor(call.duration / 60);
    const secs = call.duration % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Twilio SIP Integration Test</h1>
          <p className="text-gray-600 mt-2">
            Test manual outbound calling through Twilio SIP Domain
          </p>
        </div>

        {/* Important Notes */}
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Important Notes</h2>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li><strong>Phone numbers MUST be in E.164 format</strong> (e.g., +447700900123)</li>
            <li><strong>Caller ID must be verified</strong> in your Twilio account</li>
            <li><strong>No SIP registration</strong> - authentication is per INVITE</li>
            <li><strong>UDP transport only</strong> - no TLS or TCP</li>
            <li><strong>PCMU codec only</strong> - G.711u</li>
            <li><strong>Data lists should match E.164 format</strong> when uploaded</li>
          </ul>
        </div>

        {/* Configuration Display */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">📋 Current Configuration</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-blue-800">SIP Domain:</strong>
              <p className="font-mono text-blue-700">kennex-dev.sip.twilio.com</p>
            </div>
            <div>
              <strong className="text-blue-800">Username:</strong>
              <p className="font-mono text-blue-700">Kennex</p>
            </div>
            <div>
              <strong className="text-blue-800">Transport:</strong>
              <p className="text-blue-700">UDP</p>
            </div>
            <div>
              <strong className="text-blue-800">Codec:</strong>
              <p className="text-blue-700">PCMU (G.711u)</p>
            </div>
            <div>
              <strong className="text-blue-800">Agent ID:</strong>
              <p className="font-mono text-blue-700">{agentId}</p>
            </div>
            <div>
              <strong className="text-blue-800">Caller ID:</strong>
              <p className="font-mono text-blue-700">{callerIdNumber}</p>
            </div>
          </div>
        </div>

        {/* Twilio Dialer Component */}
        <div className="mb-8">
          <TwilioDialer
            agentId={agentId}
            callerIdNumber={callerIdNumber}
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
          />
        </div>

        {/* Call History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Call History</h3>
          
          {callHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No calls made yet</p>
          ) : (
            <div className="space-y-3">
              {callHistory.map((call, index) => (
                <div key={call.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      call.status === 'answered' ? 'bg-green-500' : 
                      call.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{call.remoteNumber}</p>
                      <p className="text-sm text-gray-500">
                        {call.startTime.toLocaleTimeString()} • Duration: {formatCallDuration(call)}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      call.status === 'answered' ? 'bg-green-100 text-green-800' : 
                      call.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {call.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CLI Commands */}
        <div className="mt-8 bg-gray-900 text-white rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">📟 CLI Testing</h3>
          <p className="text-gray-300 mb-4">You can also trigger calls from browser console:</p>
          <div className="bg-gray-800 p-3 rounded font-mono text-sm space-y-2">
            <p className="text-green-400">// Connect to Twilio</p>
            <p>twilioSipClient.connect(config)</p>
            <p className="text-green-400 mt-3">// Make a call</p>
            <p>{`twilioSipClient.makeCall({phoneNumber: '+447700900123'})`}</p>
            <p className="text-green-400 mt-3">// End active calls</p>
            <p>{`twilioSipClient.getActiveCalls().forEach(call => twilioSipClient.endCall(call.id))`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}