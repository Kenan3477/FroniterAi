'use client';

// Dashboard with enhanced authentication and interaction history fixes - v27.02.2026-FORCE-DEPLOY
// Force deployment: Authentication fixes ready for production

import { useState, useEffect, Suspense } from 'react';
import { MainLayout } from '@/components/layout';
import DashboardCard from '@/components/ui/DashboardCard';
import RecentActivity from '@/components/ui/RecentActivity';
import { kpiApi, DashboardStats } from '@/services/kpiApi';
import { demoDataService, DemoStats } from '@/services/demoDataService';
import { agentSocket } from '@/services/agentSocket';
import { useAuth } from '@/contexts/AuthContext';

function DashboardContent() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inboundCalls, setInboundCalls] = useState<any[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  // Get authenticated user - dashboard now requires authentication
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Client-side hydration guard
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load dashboard stats when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardStats();
    }
  }, [isAuthenticated, user]);

  // CRITICAL: Set up WebSocket connection for inbound call notifications (authenticated users only)
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    
    console.log('🔌 Setting up WebSocket connection for inbound calls...');
    console.log('👤 User ID:', user.id, 'Username:', user.username);
    
    // Get auth token for WebSocket authentication
    const token = localStorage.getItem('omnivox_token');
    
    // Connect to agent socket using user ID (important!)
    agentSocket.connect(user.id.toString());
    agentSocket.authenticateAgent(user.id.toString(), token || undefined);
    
    // Handle inbound call notifications
    const handleInboundCallRinging = (data: any) => {
      console.log('🔔 INBOUND CALL NOTIFICATION RECEIVED:', data);
      
      // Extract caller number properly
      let callerNumber = 'Unknown';
      if (data.from) {
        callerNumber = data.from;
      } else if (data.callSid && data.caller) {
        callerNumber = data.caller;
      } else if (data.caller_id_number) {
        callerNumber = data.caller_id_number;
      }
      
      const inboundCall = {
        id: data.callSid || `call_${Date.now()}`,
        callerNumber: callerNumber,
        timestamp: new Date().toLocaleTimeString(),
        status: 'ringing'
      };
      
      console.log('📋 Adding inbound call to state:', inboundCall);
      setInboundCalls(prev => [inboundCall, ...prev.slice(0, 4)]); // Keep max 5 calls
      
      // Show system notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('📞 Incoming Call', {
          body: `Call from ${callerNumber}`,
          icon: '/favicon.ico',
          tag: inboundCall.id
        });
      }
    };
    
    // Register the inbound call listener
    agentSocket.on('inbound_call_ringing', handleInboundCallRinging);
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }
    
    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      agentSocket.off('inbound_call_ringing', handleInboundCallRinging);
      agentSocket.disconnect();
    };
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardStats();
    }
  }, [isAuthenticated, user]);

  // CRITICAL: Set up WebSocket connection for inbound call notifications (authenticated users only)
  useEffect(() => {
    if (!user || !isAuthenticated) return;
    
    console.log('🔌 Setting up WebSocket connection for inbound calls...');
    console.log('👤 User ID:', user.id, 'Username:', user.username);
    
    // Get auth token for WebSocket authentication
    const token = localStorage.getItem('omnivox_token');
    
    // Connect to agent socket using user ID (important!)
    agentSocket.connect(user.id.toString());
    agentSocket.authenticateAgent(user.id.toString(), token || undefined);
    
    // Handle inbound call notifications
    const handleInboundCallRinging = (data: any) => {
      console.log('🔔 INBOUND CALL NOTIFICATION RECEIVED:', data);
      
      // Extract caller number properly
      const callerNumber = data.call?.callerNumber || data.call?.from || 'Unknown Number';
      const callerName = data.call?.callerName || data.callerInfo?.name || null;
      const displayName = callerName ? `${callerName} (${callerNumber})` : callerNumber;
      
      console.log('📞 Caller details:', { callerNumber, callerName, displayName });
      
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('Incoming Call', {
          body: `Call from ${displayName}`,
          icon: '/favicon.ico',
          tag: 'inbound-call'
        });
      }
      
      // Add to UI state
      setInboundCalls(prev => [...prev, {
        id: data.call?.id || `call-${Date.now()}`,
        displayName,
        number: callerNumber,
        timestamp: new Date().toISOString()
      }]);
    };
    
    // Listen for inbound call events
    agentSocket.on('inbound_call_ringing', handleInboundCallRinging);
    
    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('📱 Notification permission:', permission);
      });
    }
    
    return () => {
      agentSocket.off('inbound_call_ringing', handleInboundCallRinging);
      agentSocket.disconnect();
    };
  }, [user, isAuthenticated]);
  
  const loadDashboardStats = async () => {
    setLoading(true);
    try {
      // Get the JWT token from localStorage for proper authentication
      let token = localStorage.getItem('omnivox_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('📊 Loading dashboard stats with auth token:', !!token);
      console.log('🔑 Using Bearer token authentication for dashboard stats');
      
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
        headers
      });
      
      console.log('📊 Dashboard stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Dashboard stats data received:', data);
        if (data.success) {
          setDashboardStats(data.data);
        }
      } else if (response.status === 401) {
        console.log('🔄 Token expired, attempting to refresh authentication...');
        
        // Try to refresh the session by calling the refresh endpoint
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.success && refreshData.data?.accessToken) {
              console.log('✅ Token refreshed successfully, retrying dashboard stats...');
              localStorage.setItem('omnivox_token', refreshData.data.accessToken);
              
              // Retry the dashboard stats call with new token
              const retryHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${refreshData.data.accessToken}`
              };
              
              const retryResponse = await fetch('/api/dashboard/stats', {
                credentials: 'include',
                headers: retryHeaders
              });
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                console.log('📊 Dashboard stats loaded after token refresh:', retryData);
                if (retryData.success) {
                  setDashboardStats(retryData.data);
                }
              }
            }
          } else {
            console.log('❌ Token refresh failed, user may need to log in again');
            // Optionally redirect to login or show a message
          }
        } catch (refreshError) {
          console.error('❌ Error during token refresh:', refreshError);
        }
      } else {
        console.error('❌ Dashboard stats API failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const answerCall = (callId: string) => {
    console.log('📞 Answering call:', callId);
    // Remove from inbound calls list
    setInboundCalls(prev => prev.filter(call => call.id !== callId));
    // Implement actual call answering logic here
  };

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Redirect if not authenticated (should be handled by middleware, but adding safety)
  if (!isAuthenticated || !user) {
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    return null;
  }

  // Handle answering an inbound call
  const handleAnswerCall = async (call: any) => {
    try {
      console.log('📞 Answering inbound call:', call.id);
      
      const response = await fetch('/api/calls/inbound-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          callId: call.id,
          agentId: user?.id?.toString()
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Call answered successfully');
        // Remove from notifications
        setInboundCalls(prev => prev.filter(c => c.id !== call.id));
        alert('Call answered! You are now connected.');
      } else {
        console.error('❌ Failed to answer call:', result.error);
        alert('Failed to answer call. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error answering call:', error);
      alert('Error answering call. Please try again.');
    }
  };

  // Dashboard now requires authentication
  const currentUser = user;
  const showPreviewBanner = false; // Preview mode removed - always require authentication

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTrend = (value: number | null) => {
    if (value === null) return undefined;
    return {
      value: Math.abs(value),
      direction: value >= 0 ? 'up' as const : 'down' as const
    };
  };

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto">
        {/* Preview Mode Banner */}
        {showPreviewBanner && (
          <div className="mb-6 bg-gradient-to-r from-blue-100 to-cyan-100 border-2 border-blue-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">👋</div>
                <div>
                  <h3 className="text-lg font-bold text-blue-800">Welcome to Omnivox-AI Preview!</h3>
                  <p className="text-blue-700">You're viewing demo data. Sign up to access real call center features and your own dashboard.</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => window.location.href = '/signup'}
                  className="bg-white text-blue-600 border-2 border-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 font-medium transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inbound Call Notifications (authenticated users only) */}
        {!showPreviewBanner && inboundCalls.length > 0 && (
          <div className="mb-6">
            {inboundCalls.map((call, index) => (
              <div key={call.id || index} className="bg-red-100 border-2 border-red-400 text-red-800 px-6 py-4 rounded-lg mb-3 flex items-center justify-between animate-pulse shadow-lg">
                <div className="flex items-center">
                  <span className="text-3xl mr-4 animate-bounce">📞</span>
                  <div>
                    <p className="font-bold text-lg">🚨 Incoming Call</p>
                    <p className="font-semibold text-base">From: {call.displayName || call.callerNumber || call.from || 'Unknown Number'}</p>
                    <p className="text-sm">Received: {call.timestamp?.toLocaleTimeString()}</p>
                    <p className="text-sm">Call ID: {call.id}</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => handleAnswerCall(call)}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-bold flex items-center space-x-2 transition-colors"
                  >
                    <span>📞</span>
                    <span>Answer</span>
                  </button>
                  <button 
                    onClick={() => setInboundCalls(prev => prev.filter(c => c.id !== call.id))}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-bold transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <span>Welcome to</span>
            <div className="flex items-center space-x-1">
              <span>OMNI</span>
              
              {/* Voice Wave V replacement - dashboard header size */}
              <div className="flex items-start justify-center h-8 space-x-0.5 mx-1">
                {/* Voice wave bars representing the "V" - pointing downward */}
                <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full animate-pulse" 
                     style={{ height: '60%', animationDelay: '0s', animationDuration: '1.5s' }}></div>
                <div className="w-1.5 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full animate-pulse" 
                     style={{ height: '40%', animationDelay: '0.2s', animationDuration: '1.3s' }}></div>
                <div className="w-1.5 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full animate-pulse" 
                     style={{ height: '80%', animationDelay: '0.4s', animationDuration: '1.7s' }}></div>
                <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full animate-pulse" 
                     style={{ height: '100%', animationDelay: '0.1s', animationDuration: '1.4s' }}></div>
                <div className="w-1.5 bg-gradient-to-b from-cyan-400 to-cyan-200 rounded-full animate-pulse" 
                     style={{ height: '70%', animationDelay: '0.3s', animationDuration: '1.6s' }}></div>
                <div className="w-1.5 bg-gradient-to-b from-cyan-600 to-cyan-400 rounded-full animate-pulse" 
                     style={{ height: '50%', animationDelay: '0.5s', animationDuration: '1.2s' }}></div>
                <div className="w-1.5 bg-gradient-to-b from-cyan-500 to-cyan-300 rounded-full animate-pulse" 
                     style={{ height: '35%', animationDelay: '0.6s', animationDuration: '1.8s' }}></div>
              </div>
              
              <span>OX-AI</span>
            </div>
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Hello, {currentUser?.firstName} {currentUser?.lastName}! 
            {showPreviewBanner 
              ? " Explore our AI-powered dialer in preview mode." 
              : " Let's get started with your AI-powered dialer."
            }
          </p>
        </div>
        
        {/* Stats Cards */}
        {showPreviewBanner && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 text-center font-medium">
                📊 <strong>Live Dashboard Preview</strong> - These metrics represent real-time data from your system
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-12">
          <DashboardCard
            title="Today's Calls"
            value={loading ? "..." : (dashboardStats?.today?.todayCalls?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">📞</span>}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
            trend={formatTrend(dashboardStats?.trends?.callsTrend || null)}
          />
          <DashboardCard
            title="Successful Calls"
            value={loading ? "..." : (dashboardStats?.today?.successfulCalls?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">✓</span>}
            color="bg-gradient-to-br from-green-500 to-green-600"
            trend={formatTrend(dashboardStats?.trends?.successTrend || null)}
          />
          <DashboardCard
            title="Active Contacts"
            value={loading ? "..." : (dashboardStats?.today?.activeContacts?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">👤</span>}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
            trend={formatTrend(dashboardStats?.trends?.contactsTrend || null)}
          />
          <DashboardCard
            title="Conversion Rate"
            value={loading ? "..." : `${dashboardStats?.today?.conversionRate?.toFixed(1) || "0"}%`}
            icon={<span className="text-white font-bold text-lg">📊</span>}
            color="bg-gradient-to-br from-orange-500 to-orange-600"
            trend={formatTrend(dashboardStats?.trends?.conversionTrend || null)}
          />
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
                {showPreviewBanner && <span className="text-sm text-gray-500 ml-2">(Demo Data)</span>}
              </h3>
              <RecentActivity 
                activities={[]} // Real activity data would be loaded from API 
              />
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => showPreviewBanner ? window.location.href = '/login' : null}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    showPreviewBanner 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300' 
                      : 'bg-slate-600 text-white hover:bg-slate-700'
                  }`}
                  disabled={showPreviewBanner}
                >
                  {showPreviewBanner ? '🔒 Start New Campaign (Sign In Required)' : 'Start New Campaign'}
                </button>
                <button 
                  onClick={() => showPreviewBanner ? window.location.href = '/login' : null}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    showPreviewBanner 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300' 
                      : 'bg-white text-slate-600 border border-slate-600 hover:bg-slate-50'
                  }`}
                  disabled={showPreviewBanner}
                >
                  {showPreviewBanner ? '🔒 Import Contacts (Sign In Required)' : 'Import Contacts'}
                </button>
                <button 
                  onClick={() => showPreviewBanner ? window.location.href = '/login' : null}
                  className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                    showPreviewBanner 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300' 
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={showPreviewBanner}
                >
                  {showPreviewBanner ? '🔒 View Reports (Sign In Required)' : 'View Reports'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart Section */}
        <div className="mt-8">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Performance Overview
                {showPreviewBanner && <span className="text-sm text-gray-500 ml-2">(Demo Data)</span>}
              </h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p className="text-gray-600">
                    {showPreviewBanner 
                      ? "Advanced analytics and charts available in full version" 
                      : "Charts and analytics will be displayed here"
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    {showPreviewBanner 
                      ? "Sign in to see your real performance data" 
                      : "Coming soon in the next update"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    }>
      <DashboardContent />
    </Suspense>
  );
}