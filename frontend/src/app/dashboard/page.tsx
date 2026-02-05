'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import DashboardCard from '@/components/ui/DashboardCard';
import RecentActivity from '@/components/ui/RecentActivity';
import { kpiApi, DashboardStats } from '@/services/kpiApi';
import { agentSocket } from '@/services/agentSocket';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [inboundCalls, setInboundCalls] = useState<any[]>([]);
  
  // Get authenticated user
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardStats();
    }
  }, [isAuthenticated]);

  // CRITICAL: Set up WebSocket connection for inbound call notifications
  useEffect(() => {
    if (!user) return;
    
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
      setInboundCalls(prev => {
        const exists = prev.find(call => call.id === data.call?.id);
        if (exists) return prev;
        
        return [...prev, {
          ...data.call,
          callerInfo: data.callerInfo,
          displayName,
          timestamp: new Date()
        }];
      });
    };

    const handleInboundCallAnswered = (data: any) => {
      console.log('📞 Inbound call answered:', data);
      setInboundCalls(prev => prev.filter(call => call.id !== data.callId));
    };

    const handleInboundCallEnded = (data: any) => {
      console.log('📞 Inbound call ended:', data);
      setInboundCalls(prev => prev.filter(call => call.id !== data.callId));
    };

    // Register event listeners
    agentSocket.on('inbound-call-ringing', handleInboundCallRinging);
    agentSocket.on('inbound-call-answered', handleInboundCallAnswered);
    agentSocket.on('inbound-call-ended', handleInboundCallEnded);

    // Request notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('🔔 Notification permission:', permission);
      });
    }

    // Cleanup
    return () => {
      agentSocket.off('inbound-call-ringing', handleInboundCallRinging);
      agentSocket.off('inbound-call-answered', handleInboundCallAnswered);
      agentSocket.off('inbound-call-ended', handleInboundCallEnded);
      agentSocket.disconnect();
    };
  }, [user]);

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

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const stats = await kpiApi.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Authentication is handled by useAuth() hook above
  if (!isAuthenticated) {
    return null;
  }

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
        {/* Inbound Call Notifications */}
        {inboundCalls.length > 0 && (
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
            Hello, {user?.firstName} {user?.lastName}! Let's get started with your AI-powered dialer.
          </p>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <DashboardCard
            title="Today's Calls"
            value={loading ? "..." : (dashboardStats?.today?.todayCalls?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">📞</span>}
            color="bg-slate-500"
            trend={formatTrend(dashboardStats?.trends?.callsTrend || null)}
          />
          <DashboardCard
            title="Successful Calls"
            value={loading ? "..." : (dashboardStats?.today?.successfulCalls?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">✓</span>}
            color="bg-green-500"
            trend={formatTrend(dashboardStats?.trends?.successTrend || null)}
          />
          <DashboardCard
            title="Active Contacts"
            value={loading ? "..." : (dashboardStats?.today?.activeContacts?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">👤</span>}
            color="bg-blue-500"
            trend={formatTrend(dashboardStats?.trends?.contactsTrend || null)}
          />
          <DashboardCard
            title="Conversion Rate"
            value={loading ? "..." : `${dashboardStats?.today?.conversionRate?.toFixed(1) || "0"}%`}
            icon={<span className="text-white font-bold text-lg">📊</span>}
            color="bg-purple-500"
            trend={formatTrend(dashboardStats?.trends?.conversionTrend || null)}
          />
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <RecentActivity activities={[]} />
            </div>
          </div>

          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-slate-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors">
                  Start New Campaign
                </button>
                <button className="w-full bg-white text-slate-600 border border-slate-600 px-4 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors">
                  Import Contacts
                </button>
                <button className="w-full bg-white text-gray-600 border border-gray-300 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Chart Section */}
        <div className="mt-8">
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <div className="text-4xl mb-2">📈</div>
                  <p className="text-gray-600">Charts and analytics will be displayed here</p>
                  <p className="text-sm text-gray-500">Coming soon in the next update</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}