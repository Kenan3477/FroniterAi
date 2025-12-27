'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import DashboardCard from '@/components/ui/DashboardCard';
import RecentActivity from '@/components/ui/RecentActivity';
import { kpiApi, DashboardStats } from '@/services/kpiApi';

export default function Dashboard() {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // TODO: Replace with actual authentication system
  const user = { firstName: 'User', lastName: 'Profile' };
  const isAuthenticated = true;

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardStats();
    }
  }, [isAuthenticated]);

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

  // TODO: Replace with actual Redux selectors once authentication is implemented
  // const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  // const router = useRouter();
  // useEffect(() => {
  //   if (!isAuthenticated) {
  //     router.push('/login');
  //   }
  // }, [isAuthenticated, router]);

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