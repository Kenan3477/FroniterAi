/**
 * Campaign Selector Component
 * Allows users to switch between their assigned campaigns for proper data isolation
 */

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Target } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CampaignSelector() {
  const { currentCampaign, availableCampaigns, setCurrentCampaign } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleCampaignSelect = (campaign: any) => {
    setCurrentCampaign(campaign);
    setIsOpen(false);
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
      <div className="flex items-center text-sm text-gray-700 bg-kennex-50 px-3 py-2 rounded-md border border-kennex-200">
        <Target className="h-4 w-4 mr-2 text-kennex-600" />
        <span className="font-medium">{currentCampaign?.name || availableCampaigns[0]?.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full min-w-[200px] text-sm text-gray-700 bg-white border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-kennex-500 focus:border-kennex-500"
      >
        <div className="flex items-center">
          <Target className="h-4 w-4 mr-2 text-kennex-600" />
          <span className="font-medium truncate">
            {currentCampaign?.name || 'Select Campaign'}
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
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                    currentCampaign?.campaignId === campaign.campaignId 
                      ? 'bg-kennex-50 text-kennex-700 font-medium' 
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
                    {currentCampaign?.campaignId === campaign.campaignId && (
                      <div className="w-2 h-2 bg-kennex-500 rounded-full" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}