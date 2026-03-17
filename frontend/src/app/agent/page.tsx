'use client';

import React, { useState, useEffect } from 'react';
import AgentLogin from '@/components/agent/AgentLogin';
import AgentDashboard from '@/components/agent/AgentDashboard';
import DispositionModal from '@/components/agent/DispositionModal';

const AgentPage = () => {
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);

  const handleLogin = (agent: any) => {
    setCurrentAgent(agent);
  };

  const handleLogout = () => {
    setCurrentAgent(null);
    setCurrentCall(null);
    setShowDispositionModal(false);
  };

  const handleCallEnd = (callData: any) => {
    setCurrentCall(callData);
    setShowDispositionModal(true);
  };

  const handleDispositionComplete = (dispositionResult: any) => {
    console.log('Call disposition completed:', dispositionResult);
    setCurrentCall(null);
    setShowDispositionModal(false);
    // Refresh agent dashboard or trigger any necessary updates
  };

  if (!currentAgent) {
    return <AgentLogin onLogin={handleLogin} />;
  }

  return (
    <>
      <AgentDashboard 
        agent={currentAgent}
        onLogout={handleLogout}
        onCallEnd={handleCallEnd}
      />
      
      {showDispositionModal && currentCall && (
        <DispositionModal
          isOpen={showDispositionModal}
          callId={currentCall.callId}
          campaignId={currentCall.campaignId}
          contactName={`${currentCall.firstName} ${currentCall.lastName}`}
          onClose={() => setShowDispositionModal(false)}
          onComplete={handleDispositionComplete}
        />
      )}
    </>
  );
};

export default AgentPage;