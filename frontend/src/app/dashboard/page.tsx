'use client';

// Dashboard with enhanced authentication and interaction history fixes - v27.02.2026-FORCE-DEPLOY
// Force deployment: Authentication fixes ready for production

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { MainLayout } from '@/components/layout';
import DashboardCard from '@/components/ui/DashboardCard';
import RecentActivity from '@/components/ui/RecentActivity';
import LiveCallsModule from '@/components/dashboard/LiveCallsModule';
import AdaptiveDashboardQuickActions from '@/components/dashboard/AdaptiveDashboardQuickActions';
import { UniversalNavigationTrackingWrapper } from '@/components/dashboard/UniversalNavigationTrackingWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeAppRole } from '@/lib/authRole';
import { agentSocket } from '@/services/agentSocket';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// API Response interface matching the actual backend response
interface DashboardApiResponse {
  totalCallsToday: number;
  connectedCallsToday: number;
  totalRevenue: number;
  conversionRate: number;
  averageCallDuration: number;
  agentsOnline: number;
  activeAgents: number;
  callsInProgress: number;
  averageWaitTime: number;
  recentActivities: Array<{
    id: string;
    type: 'call';
    timestamp: string | Date;
    description: string;
    displayContact?: string;
    displaySummary?: string;
    outcome: string;
    duration: number;
    callType?: string;
    agent?: string;
    contact?: {
      name: string;
      phone: string;
    };
  }>;
  performance: {
    callVolume: number;
    connectionRate: number;
    avgDuration: number;
    conversions: number;
  };
  /** Sales (strict) for today */
  salesToday?: number;
  /** % of today's calls that reached a connected state */
  connectionRateToday?: number;
  /** % of connected calls that closed as sale */
  saleCloseRateToday?: number | null;
}

interface PerformanceDay {
  date: string;
  label?: string;
  totalCalls: number;
  connectedCalls: number;
  conversions: number;
}

type PerformancePreset = '1D' | '1W' | '1M' | '1Y';

interface AgentOption {
  agentId: string;
  firstName: string;
  lastName: string;
  email?: string;
}

function DashboardContent() {
  const [dashboardStats, setDashboardStats] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [performanceSeries, setPerformanceSeries] = useState<PerformanceDay[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [perfMeta, setPerfMeta] = useState<{
    preset: string | null;
    bucket: string;
    timezone: string;
    campaignId: string | null;
    agentId: string | null;
    callRecordsMatched?: number;
    callRecordsPlacedInChart?: number;
    rangeStartUtc?: string;
  } | null>(null);
  const [perfPreset, setPerfPreset] = useState<PerformancePreset>('1W');
  /** Default all campaigns so totals include DAC, Manual Dialing, inbound-calls, etc. */
  const [perfCampaignFilter, setPerfCampaignFilter] = useState<string>('all');
  const [perfAgentFilter, setPerfAgentFilter] = useState<string>('');
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [inboundCalls, setInboundCalls] = useState<any[]>([]);
  
  // Get authenticated user and current campaign - dashboard now requires authentication
  const { user, currentCampaign, availableCampaigns, isAuthenticated, loading: authLoading } = useAuth();

  // Client-side hydration guard (reserved for future SSR-safe widgets)

  const loadDashboardStats = useCallback(async () => {
    setLoading(true);
    try {
      // Get the JWT token from localStorage for proper authentication
      let token =
        localStorage.getItem('omnivox_token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('auth_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('📊 Loading dashboard stats with auth token:', !!token);
      console.log('🔑 Using Bearer token authentication for dashboard stats');

      const url = '/api/dashboard/stats';

      const response = await fetch(url, {
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
  }, []);

  const loadPerformanceSeries = useCallback(async () => {
    const token =
      localStorage.getItem('omnivox_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token');
    if (!token) return;

    setPerformanceLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('preset', perfPreset);
      const campaignForQuery =
        perfCampaignFilter === 'all' || perfCampaignFilter === ''
          ? 'all'
          : perfCampaignFilter === '__header__'
            ? currentCampaign?.campaignId
            : perfCampaignFilter;
      if (campaignForQuery && campaignForQuery !== 'all') {
        q.set('campaignId', campaignForQuery);
      }
      if (perfAgentFilter.trim()) {
        q.set('agentId', perfAgentFilter.trim());
      }

      const res = await fetch(`/api/dashboard/performance-series?${q.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setPerformanceSeries(json.data);
          setPerfMeta(json.meta || null);
        }
      }
    } catch (e) {
      console.error('Failed to load performance series:', e);
    } finally {
      setPerformanceLoading(false);
    }
  }, [perfPreset, perfCampaignFilter, perfAgentFilter, currentCampaign?.campaignId]);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardStats();
      loadPerformanceSeries();
    }
  }, [isAuthenticated, user, loadDashboardStats, loadPerformanceSeries]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const id = window.setInterval(() => {
      loadDashboardStats();
      loadPerformanceSeries();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated, user, loadDashboardStats, loadPerformanceSeries]);

  useEffect(() => {
    if (!user || !isAuthenticated) return;
    const r = normalizeAppRole(user.role);
    if (!r || !['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'MANAGER'].includes(r)) return;

    const token =
      localStorage.getItem('omnivox_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token');
    if (!token) return;

    (async () => {
      try {
        const res = await fetch('/api/agents/list', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAgentOptions(json.data);
        }
      } catch (e) {
        console.warn('Could not load agent list for performance filters:', e);
      }
    })();
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (!user || !isAuthenticated) return;

    const token =
      localStorage.getItem('omnivox_token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('auth_token');

    const socketAgentId = user.voiceClientIdentity || user.id.toString();
    agentSocket.connect(socketAgentId);
    agentSocket.authenticateAgent(socketAgentId, token || undefined);

    const handleInboundCallRinging = (data: any) => {
      const callerNumber =
        data.call?.callerNumber ||
        data.call?.from ||
        data.from ||
        data.caller ||
        data.caller_id_number ||
        'Unknown Number';
      const callerName = data.call?.callerName || data.callerInfo?.name || null;
      const displayName = callerName ? `${callerName} (${callerNumber})` : callerNumber;

      setInboundCalls((prev) => [
        {
          // Backend answer endpoint keys on inbound_calls.callId (UUID), not Twilio CallSid
          id: data.call?.id || data.call?.callId || `call-${Date.now()}`,
          displayName,
          callerNumber,
          number: callerNumber,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 4),
      ]);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Incoming call', {
          body: `From ${displayName}`,
          icon: '/favicon.ico',
          tag: 'inbound-call',
        });
      }
    };

    agentSocket.on('inbound-call-ringing', handleInboundCallRinging);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      agentSocket.off('inbound-call-ringing', handleInboundCallRinging);
      agentSocket.disconnect();
    };
  }, [user, isAuthenticated]);

  // Show loading while authentication is being checked
  if (authLoading) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 theme-text-secondary">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Not authenticated after check — show message inside layout (avoid blank flash / flicker)
  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <div className="max-w-lg mx-auto mt-16 theme-card rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold theme-text-primary mb-2">Session expired</h2>
          <p className="theme-text-secondary mb-6">
            Please sign in again to continue. If this keeps happening, check that your session cookies are allowed for this site.
          </p>
          <a href="/login" className="btn-primary inline-block px-6 py-2 rounded-lg">
            Go to login
          </a>
        </div>
      </MainLayout>
    );
  }

  // Handle answering an inbound call
  const handleAnswerCall = async (call: any) => {
    try {
      console.log('📞 Answering inbound call:', call.id);
      
      const token =
        localStorage.getItem('omnivox_token') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('auth_token');

      const response = await fetch('/api/calls/inbound-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          callId: call.id,
          agentId: user?.id?.toString(),
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
  const normalizedRole = normalizeAppRole(user?.role);
  const canFilterPerformanceByAgent =
    normalizedRole &&
    ['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'MANAGER'].includes(normalizedRole);

  const perfTotals = useMemo(
    () =>
      performanceSeries.reduce(
        (acc, d) => ({
          totalCalls: acc.totalCalls + d.totalCalls,
          connectedCalls: acc.connectedCalls + d.connectedCalls,
          conversions: acc.conversions + d.conversions,
        }),
        { totalCalls: 0, connectedCalls: 0, conversions: 0 }
      ),
    [performanceSeries]
  );
  const perfConnectionRatePct =
    perfTotals.totalCalls > 0 ? Math.round((perfTotals.connectedCalls / perfTotals.totalCalls) * 100) : 0;
  const perfConversionOnCallsPct =
    perfTotals.totalCalls > 0 ? Math.round((perfTotals.conversions / perfTotals.totalCalls) * 100) : 0;
  const perfConversionOnConnectedPct =
    perfTotals.connectedCalls > 0 ? Math.round((perfTotals.conversions / perfTotals.connectedCalls) * 100) : 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const activityOutcomeToStatus = (
    outcome: string | undefined,
    durationSec: number,
  ): 'success' | 'pending' | 'failed' => {
    const o = (outcome || '').toLowerCase();
    const d = durationSec || 0;
    const failed = new Set([
      'no-answer',
      'no_answer',
      'busy',
      'failed',
      'canceled',
      'cancelled',
      'abandoned',
    ]);
    if (failed.has(o)) return 'failed';
    const positive = new Set([
      'completed',
      'connected',
      'answered',
      'in-progress',
      'in_progress',
      'sale',
      'interested',
      'callback',
      'appointment',
      'contact_made',
    ]);
    if (positive.has(o) || o.includes('sale')) return 'success';
    if (d > 0) return 'success';
    return 'pending';
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
                  <h3 className="text-lg font-bold theme-text-primary">Welcome to Omnivox-AI Preview!</h3>
                  <p className="theme-text-secondary">You're viewing demo data. Sign up to access real call center features and your own dashboard.</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => window.location.href = '/login'}
                  className="btn-primary px-4 py-2 rounded-lg font-medium"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => window.location.href = '/signup'}
                  className="btn-secondary px-4 py-2 rounded-lg font-medium"
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
                    <p className="text-sm">Received: {call.timestamp ? new Date(call.timestamp).toLocaleTimeString() : '—'}</p>
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
          <h1 className="text-3xl font-bold theme-text-primary flex items-center space-x-2">
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
          <p className="mt-2 text-lg theme-text-secondary">
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
            <div className="theme-card rounded-lg p-4">
              <p className="text-sm theme-text-primary text-center font-medium">
                📊 <strong>Live Dashboard Preview</strong> - These metrics represent real-time data from your system
              </p>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-12">
          <DashboardCard
            title="Today's Calls"
            value={loading ? "..." : (dashboardStats?.totalCallsToday?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">📞</span>}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <DashboardCard
            title="Connected Calls"
            subtitle="Answered / meaningful talk time"
            value={loading ? "..." : (dashboardStats?.connectedCallsToday?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">✓</span>}
            color="bg-gradient-to-br from-green-500 to-green-600"
          />
          <DashboardCard
            title="Agents Online"
            value={loading ? "..." : (dashboardStats?.agentsOnline?.toString() || "0")}
            icon={<span className="text-white font-bold text-lg">👤</span>}
            color="bg-gradient-to-br from-purple-500 to-purple-600"
          />
          <DashboardCard
            title="Sales Today"
            subtitle="Disposition / outcome = sale"
            value={loading ? "..." : String(dashboardStats?.salesToday ?? dashboardStats?.performance?.conversions ?? 0)}
            icon={<span className="text-white font-bold text-lg">💰</span>}
            color="bg-gradient-to-br from-amber-500 to-orange-600"
          />
          <DashboardCard
            title="Connection Rate"
            subtitle={
              loading
                ? undefined
                : dashboardStats?.saleCloseRateToday != null &&
                    dashboardStats.saleCloseRateToday > 0
                  ? `${(dashboardStats.saleCloseRateToday as number).toFixed(1)}% of connected calls → sale`
                  : 'Share of today’s calls that connected'
            }
            value={
              loading
                ? '...'
                : `${(dashboardStats?.connectionRateToday ?? dashboardStats?.conversionRate ?? 0).toFixed(1)}%`
            }
            icon={<span className="text-white font-bold text-lg">📊</span>}
            color="bg-gradient-to-br from-cyan-500 to-blue-600"
          />
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Role-based Activity Module */}
          {normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN' ? (
            // Show Live Calls Module for Admins and Super Admins
            <LiveCallsModule />
          ) : (
            // Show Recent Activity for Agents and other roles
            <div className="theme-card shadow-sm rounded-lg">
              <div className="p-6">
                <h3 className="text-lg font-semibold theme-text-primary mb-4">
                  Recent Activity
                  {showPreviewBanner && <span className="text-sm theme-text-secondary ml-2">(Demo Data)</span>}
                </h3>
                <RecentActivity 
                  activities={dashboardStats?.recentActivities?.map((activity: any) => ({
                    id: activity.id,
                    type: 'call' as const,
                    contact:
                      activity.displayContact ||
                      activity.contact?.name ||
                      activity.agent ||
                      'Call',
                    description:
                      activity.displaySummary ||
                      (activity.outcome
                        ? `${activity.outcome} · ${formatDuration(activity.duration || 0)}`
                        : activity.description || 'Call'),
                    time: activity.timestamp ? formatTimeAgo(new Date(activity.timestamp)) : 'Unknown',
                    status: activityOutcomeToStatus(activity.outcome, activity.duration || 0),
                  })) || []} 
                />
              </div>
            </div>
          )}

          {/* Adaptive Quick Actions - Personalized based on user navigation patterns */}
          <AdaptiveDashboardQuickActions />
        </div>

        {/* Performance Chart Section */}
        <div className="mt-8">
          <div className="theme-card shadow-sm rounded-lg">
            <div className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold theme-text-primary">
                    Performance Overview
                    {showPreviewBanner && <span className="text-sm theme-text-secondary ml-2">(Demo Data)</span>}
                  </h3>
                  <p className="text-sm theme-text-secondary mt-1">
                    Calls, connected calls, and sales (conversions) over the selected window.
                    {perfMeta?.timezone ? ` Time zone: ${perfMeta.timezone}.` : ''}
                    {perfMeta &&
                    typeof perfMeta.callRecordsMatched === 'number' &&
                    typeof perfMeta.callRecordsPlacedInChart === 'number' ? (
                      <span className="block mt-1 text-xs opacity-80">
                        Loaded {perfMeta.callRecordsMatched} call record
                        {perfMeta.callRecordsMatched === 1 ? '' : 's'} in range; charted{' '}
                        {perfMeta.callRecordsPlacedInChart}.
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(['1D', '1W', '1M', '1Y'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPerfPreset(p)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                        perfPreset === p
                          ? 'bg-blue-600 text-white shadow'
                          : 'theme-bg-secondary theme-text-primary border theme-border hover:opacity-90'
                      }`}
                    >
                      {p === '1D' ? '1D' : p === '1W' ? '1W' : p === '1M' ? '1M' : '1Y'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="flex flex-col gap-1 min-w-[180px]">
                  <label htmlFor="perf-campaign" className="text-xs font-medium theme-text-secondary">
                    Campaign
                  </label>
                  <select
                    id="perf-campaign"
                    value={perfCampaignFilter}
                    onChange={(e) => setPerfCampaignFilter(e.target.value)}
                    className="rounded-md border theme-border theme-bg-primary theme-text-primary px-3 py-2 text-sm"
                  >
                    <option value="all">All campaigns (recommended)</option>
                    <option value="__header__">
                      Header campaign only ({currentCampaign?.name || currentCampaign?.campaignId || 'none'})
                    </option>
                    {availableCampaigns.map((c) => (
                      <option key={c.campaignId} value={c.campaignId}>
                        {c.name || c.displayName || c.campaignId}
                      </option>
                    ))}
                  </select>
                </div>
                {canFilterPerformanceByAgent && (
                  <div className="flex flex-col gap-1 min-w-[200px] flex-1 sm:max-w-xs">
                    <label htmlFor="perf-agent" className="text-xs font-medium theme-text-secondary">
                      Agent
                    </label>
                    <select
                      id="perf-agent"
                      value={perfAgentFilter}
                      onChange={(e) => setPerfAgentFilter(e.target.value)}
                      className="rounded-md border theme-border theme-bg-primary theme-text-primary px-3 py-2 text-sm"
                    >
                      <option value="">All agents</option>
                      {agentOptions.map((a) => (
                        <option key={a.agentId} value={a.agentId}>
                          {[a.firstName, a.lastName].filter(Boolean).join(' ').trim() || a.email || a.agentId}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => loadPerformanceSeries()}
                  disabled={performanceLoading}
                  className="rounded-md border theme-border theme-bg-secondary px-4 py-2 text-sm font-medium theme-text-primary hover:opacity-90 disabled:opacity-50"
                >
                  {performanceLoading ? 'Refreshing…' : 'Refresh chart'}
                </button>
              </div>

              {!performanceLoading && performanceSeries.length > 0 && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="rounded-lg border theme-border bg-blue-50/40 dark:bg-blue-950/30 px-3 py-2">
                    <p className="text-xs theme-text-secondary">Total calls</p>
                    <p className="text-lg font-semibold theme-text-primary">{perfTotals.totalCalls}</p>
                  </div>
                  <div className="rounded-lg border theme-border bg-emerald-50/40 dark:bg-emerald-950/30 px-3 py-2">
                    <p className="text-xs theme-text-secondary">Connected</p>
                    <p className="text-lg font-semibold theme-text-primary">{perfTotals.connectedCalls}</p>
                  </div>
                  <div className="rounded-lg border theme-border bg-orange-50/40 dark:bg-orange-950/30 px-3 py-2">
                    <p className="text-xs theme-text-secondary">Sales (conversions)</p>
                    <p className="text-lg font-semibold theme-text-primary">{perfTotals.conversions}</p>
                  </div>
                  <div className="rounded-lg border theme-border theme-bg-secondary px-3 py-2">
                    <p className="text-xs theme-text-secondary">Connect rate</p>
                    <p className="text-lg font-semibold theme-text-primary">{perfConnectionRatePct}%</p>
                  </div>
                  <div className="rounded-lg border theme-border theme-bg-secondary px-3 py-2">
                    <p className="text-xs theme-text-secondary">Sale / connected</p>
                    <p className="text-lg font-semibold theme-text-primary">
                      {perfTotals.connectedCalls > 0 ? `${perfConversionOnConnectedPct}%` : '—'}
                    </p>
                  </div>
                  <div className="rounded-lg border theme-border theme-bg-secondary px-3 py-2">
                    <p className="text-xs theme-text-secondary">Sale / all calls</p>
                    <p className="text-lg font-semibold theme-text-primary">
                      {perfTotals.totalCalls > 0 ? `${perfConversionOnCallsPct}%` : '—'}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative h-72 theme-bg-secondary rounded-lg border theme-border p-4">
                {performanceLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  </div>
                )}
                {performanceSeries.length === 0 && !performanceLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <p className="theme-text-secondary">
                      No call data for this selection yet.
                    </p>
                    <p className="text-sm theme-text-secondary mt-2">
                      Try a longer period (1M / 1Y), set campaign to &quot;All campaigns&quot;, or clear the agent filter.
                    </p>
                  </div>
                ) : performanceSeries.length > 0 ? (
                  <Line
                    data={{
                      labels: performanceSeries.map((d) =>
                        d.label != null && d.label !== '' ? d.label : d.date.slice(5)
                      ),
                      datasets: [
                        {
                          label: 'Total calls',
                          data: performanceSeries.map((d) => d.totalCalls),
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          tension: 0.25,
                          fill: true,
                        },
                        {
                          label: 'Connected calls',
                          data: performanceSeries.map((d) => d.connectedCalls),
                          borderColor: 'rgb(34, 197, 94)',
                          backgroundColor: 'rgba(34, 197, 94, 0.08)',
                          tension: 0.25,
                          fill: true,
                        },
                        {
                          label: 'Conversions (sales)',
                          data: performanceSeries.map((d) => d.conversions),
                          borderColor: 'rgb(249, 115, 22)',
                          backgroundColor: 'rgba(249, 115, 22, 0.08)',
                          tension: 0.25,
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                          mode: 'index',
                          intersect: false,
                        },
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { precision: 0 } },
                        x: {
                          ticks: {
                            maxRotation: perfPreset === '1D' ? 45 : 0,
                            autoSkip: true,
                            maxTicksLimit: perfPreset === '1Y' ? 14 : perfPreset === '1M' ? 16 : 12,
                          },
                        },
                      },
                    }}
                  />
                ) : null}
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
      <UniversalNavigationTrackingWrapper />
      <DashboardContent />
    </Suspense>
  );
}