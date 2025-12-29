/**
 * Campaign Selector Component
 * Allows users to switch between their assigned campaigns for proper data isolation
 */

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CampaignSelector() {
  const { 
    currentCampaign, 
    availableCampaigns, 
    joinCampaignQueue, 
    leaveCampaignQueue,
    setCurrentCampaign,
    isInQueue,
    queueStatus
  } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCampaignSelect = async (campaign: any) => {
    setIsJoining(true);
    setIsOpen(false);
    
    try {
      // For now, just set the current campaign without complex queue logic
      // TODO: Implement proper queue joining when needed
      setCurrentCampaign(campaign);
      console.log(`✅ Selected campaign: ${campaign.name}`);
      
      // If queue joining is needed in the future, uncomment this:
      // const result = await joinCampaignQueue(campaign);
      // if (result.success) {
      //   console.log(`✅ Successfully joined ${campaign.name} outbound queue`);
      // } else {
      //   console.error(`❌ Failed to join campaign: ${result.message}`);
      // }
    } catch (error) {
      console.error('Error selecting campaign:', error);
    } finally {
      setIsJoining(false);
    }
  };

  if (availableCampaigns.length === 0) {
    return (
      <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md">
        <Target className="h-4 w-4 mr-2" />
        No campaigns assigned
      </div>
    );
  }

  if (availableCampaigns.length === 1) {
    return (
      <div className="flex items-center text-sm text-gray-700 bg-slate-50 px-3 py-2 rounded-md border border-slate-200">
        <Target className="h-4 w-4 mr-2 text-slate-600" />
        <span className="font-medium">{currentCampaign?.name || availableCampaigns[0]?.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isJoining}
        className="flex items-center justify-between w-full min-w-[200px] text-sm text-gray-700 bg-white border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 disabled:opacity-50"
      >
        <div className="flex items-center">
          <Target className="h-4 w-4 mr-2 text-slate-600" />
          <span className="font-medium truncate">
            {isJoining ? 'Joining Queue...' : 
             currentCampaign ? `${currentCampaign.name}${isInQueue ? ' (In Queue)' : ''}` : 
             'Select Campaign'}
          </span>
        </div>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                Available Campaigns
              </div>
              {availableCampaigns.map((campaign) => (
                <button
                  key={campaign.campaignId}
                  onClick={() => handleCampaignSelect(campaign)}
                  disabled={isJoining}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 ${
                    currentCampaign?.campaignId === campaign.campaignId 
                      ? 'bg-slate-50 text-slate-700 font-medium' 
                      : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {campaign.dialMethod} • {campaign.status}
                      </div>
                    </div>
                    {currentCampaign?.campaignId === campaign.campaignId && isInQueue && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-green-100 text-slate-700 px-2 py-1 rounded">In Queue</span>
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                    )}
                    {currentCampaign?.campaignId === campaign.campaignId && !isInQueue && (
                      <div className="w-2 h-2 bg-slate-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
              
              {currentCampaign && isInQueue && (
                <>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={async () => {
                      setIsJoining(true);
                      await leaveCampaignQueue();
                      setIsJoining(false);
                      setIsOpen(false);
                    }}
                    disabled={isJoining}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50 disabled:opacity-50"
                  >
                    Leave Current Queue
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}