/**
 * Enhanced Agent Dashboard with Status-Controlled Queue Participation
 * No "Start Dialling" button - agent status directly controls queue participation
 */
'use client';

import React from 'react';
import StatusControlledAgentInterface from '@/components/agent/StatusControlledAgentInterface';

export default function EnhancedAgentDashboard() {
  // In a real implementation, these would come from authentication/session
  const agentId = 'AGENT_001';
  const campaignId = 'CAMP_001';
  const agentName = 'Sarah Johnson';
  const campaignName = 'Outbound Sales Campaign';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-8">
        <StatusControlledAgentInterface
          agentId={agentId}
          campaignId={campaignId}
          agentName={agentName}
          campaignName={campaignName}
        />
      </div>
    </div>
  );
}