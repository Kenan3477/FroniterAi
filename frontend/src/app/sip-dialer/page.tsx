'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { TwilioDialer } from '@/components/dialer/TwilioDialerIntegrated';

const SipDialerPage = () => {
  const [agentId, setAgentId] = useState('');

  useEffect(() => {
    // Get agent ID from session/auth
    // For now, use a default
    setAgentId('demo-agent');
  }, []);

  return (
    <MainLayout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Kennex SIP Dialer</h1>
          <p className="text-gray-600 mt-1">
            Make outbound calls using Kennex's integrated SIP dialer
          </p>
        </div>

        {agentId && (
          <TwilioDialer
            agentId={agentId}
            callerIdNumber={process.env.NEXT_PUBLIC_TWILIO_CALLER_ID || '+447700900000'}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default SipDialerPage;