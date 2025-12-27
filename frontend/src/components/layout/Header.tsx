'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MagnifyingGlassIcon,
  BellIcon,
  PhoneIcon,
  Bars3Icon,
  ChevronDownIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import CampaignSelector from '@/components/ui/CampaignSelector';

interface HeaderProps {
  onSidebarToggle: () => void;
}

export default function Header({ onSidebarToggle }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState('DAC (C)');
  const [userStatus, setUserStatus] = useState('Away');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { user, logout, availableCampaigns, currentCampaign } = useAuth();
  // Agent dialing is controlled by status, not manual buttons
  const activeCall = null as any;

  const handleStatusChange = async (newStatus: string) => {
    if (!currentCampaign) {
      alert('Please select a campaign first before changing status to Available');
      return;
    }

    setIsUpdatingStatus(true);
    console.log(`🔄 Updating agent status to: ${newStatus}`);
    
    try {
      // Update agent status and trigger auto-dial if Available
      const response = await fetch('/api/agents/status-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          agentId: user?.username || user?.id || 'agent-1',
          status: newStatus,
          campaignId: currentCampaign.campaignId
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setUserStatus(newStatus);
        
        if (newStatus === 'Available') {
          console.log('✅ Agent available - auto-dialing enabled');
          console.log(`📊 Campaign: ${data.campaign?.name}, Queue: ${data.queueStatus?.queueDepth} contacts`);
        } else {
          console.log(`✅ Agent status updated to: ${newStatus}`);
        }
      } else {
        console.error('Failed to update status:', data.error);
        alert(`Failed to update status: ${data.error}`);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update agent status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    console.log('🔐 Logout button clicked');
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      setIsLoggingOut(false);
    }
  };

  const inboundQueues = [
    'DAC (C)',
    'Customer Service',
    'Sales',
    'Support',
    'General Inquiry'
  ];

  const userStatuses = [
    'Available',
    'Away',
    'Busy',
    'Do Not Disturb'
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-500';
      case 'Away': return 'bg-yellow-500';
      case 'Busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Note: Dialing is controlled by agent status, not manual buttons

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu Button */}
        <button
          onClick={onSidebarToggle}
          className="p-1 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
            placeholder="Search contacts, campaigns..."
          />
        </div>
      </div>

      {/* Center Section - Campaign & Queue Selectors */}
      <div className="hidden lg:flex items-center space-x-4">
        {/* Campaign Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Campaign:</span>
          <CampaignSelector />
        </div>

        {/* Inbound Queue Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Queue:</span>
          <select 
            value={selectedQueue}
            onChange={(e) => setSelectedQueue(e.target.value)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
          >
            {inboundQueues.map((queue) => (
              <option key={queue} value={queue}>{queue}</option>
            ))}
          </select>
          <button className="p-1 text-gray-500 hover:text-gray-700">
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Agent Status Display - Dialing controlled by status */}
        <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
          <PhoneIcon className="h-5 w-5 text-gray-600" />
          <div className="text-sm">
            <span className="text-gray-600">Queue Status:</span>
            <span className={`ml-1 font-medium ${
              userStatus === 'Available' ? 'text-slate-600' : 'text-gray-500'
            }`}>
              {isUpdatingStatus ? 'Updating...' : (userStatus === 'Available' ? 'Active' : 'Inactive')}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {isUpdatingStatus ? '• Connecting...' : 
             userStatus === 'Available' ? 
               (currentCampaign ? '• Auto-dialing enabled' : '• Select campaign first') : 
               '• Set status to Available to join queue'
            }
          </div>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-md relative"
          >
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
                  <span className="text-sm text-gray-500">3 new</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <PhoneIcon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">New missed call</p>
                      <p className="text-xs text-gray-500">2 minutes ago</p>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-3 text-center text-sm text-slate-600 hover:text-omnivox-500">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
          >
            {/* User Avatar */}
            <div className="relative">
              <div className="h-10 w-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                {user?.firstName?.[0] || 'U'}
              </div>
              <div className={`absolute bottom-0 right-0 h-3 w-3 ${getStatusColor(userStatus)} border-2 border-white rounded-full`}></div>
            </div>
            
            {/* User Info */}
            <div className="hidden md:block text-left">
              <div className="text-sm font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="text-xs text-gray-500">{user?.role}</div>
            </div>
            <ChevronDownIcon className="h-4 w-4" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-2">
                {/* Status Selector */}
                <div className="px-4 py-2 border-b border-gray-100">
                  <label className="block text-xs text-gray-600 mb-2">Status</label>
                  <div className="flex items-center space-x-3">
                    <div className={`h-3 w-3 ${getStatusColor(userStatus)} rounded-full`}></div>
                    <select 
                      value={userStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={isUpdatingStatus}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 flex-1 disabled:opacity-50"
                    >
                      {userStatuses.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Mobile Campaign/Queue Selectors */}
                <div className="lg:hidden px-4 py-2 border-b border-gray-100">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Campaign</label>
                      <select 
                        value={currentCampaign?.campaignId || ''}
                        onChange={(e) => {
                          const selectedCampaign = availableCampaigns.find(c => c.campaignId === e.target.value);
                          if (selectedCampaign) {
                            // Handle campaign selection (could trigger AuthContext campaign change)
                            console.log('Mobile campaign selected:', selectedCampaign.name);
                          }
                        }}
                        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      >
                        <option value="">Select Campaign</option>
                        {availableCampaigns.map((campaign) => (
                          <option key={campaign.campaignId} value={campaign.campaignId}>
                            {campaign.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Inbound Queue</label>
                      <select 
                        value={selectedQueue}
                        onChange={(e) => setSelectedQueue(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      >
                        {inboundQueues.map((queue) => (
                          <option key={queue} value={queue}>{queue}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <span>Preferences</span>
                    <Cog6ToothIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  <button 
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                    {isLoggingOut ? (
                      <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                    ) : (
                      <ArrowRightOnRectangleIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}