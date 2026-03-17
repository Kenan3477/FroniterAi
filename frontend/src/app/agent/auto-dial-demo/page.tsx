/**
 * Auto-Dial Agent Interface Demo
 * Phase 2: Frontend Integration for Auto-Dial Engine
 */
'use client';

import React from 'react';
import StatusControlledAgentInterface from '@/components/agent/StatusControlledAgentInterface';

export default function AutoDialDemoPage() {
  // Demo configuration for auto-dial testing
  const agentId = 'AUTO_AGENT_001';
  const campaignId = 'AUTODIAL_CAMP_001'; 
  const agentName = 'Demo Agent - Auto Dialler';
  const campaignName = 'Auto-Dial Test Campaign';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-indigo-600 text-white py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">
                🎯 Auto-Dial Demo - Phase 2 Frontend Integration
              </span>
            </div>
            <span className="text-xs bg-indigo-500 px-2 py-1 rounded-full">
              Campaign: AUTODIAL mode
            </span>
          </div>
        </div>
      </div>

      {/* Agent Interface */}
      <div className="py-8">
        <StatusControlledAgentInterface
          agentId={agentId}
          campaignId={campaignId}
          agentName={agentName}
          campaignName={campaignName}
        />
      </div>

      {/* Demo Instructions */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            🧪 Auto-Dial Demo Instructions
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Set Status to Available:</strong> Auto-dial will automatically start for AUTODIAL campaigns</p>
            <p><strong>2. Auto-Dial Controls:</strong> Use pause/resume/stop buttons to control auto-dialling manually</p>
            <p><strong>3. Status Changes:</strong> Away/Break automatically pauses auto-dial, Available resumes it</p>
            <p><strong>4. Real-time Updates:</strong> Status indicators update live from the backend auto-dial engine</p>
            <p><strong>5. Campaign Detection:</strong> Auto-dial controls only appear for AUTODIAL campaign types</p>
          </div>
          <div className="mt-4 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Demo Data:</strong> This demo uses test API responses. 
              Backend auto-dial engine (Phase 1) is fully implemented with REST API at <code>/api/auto-dial/*</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}