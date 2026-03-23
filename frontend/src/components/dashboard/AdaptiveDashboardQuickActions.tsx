/**
 * AdaptiveDashboardQuickActions Component
 * Dynamic quick actions that adapt based on user's navigation patterns
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardQuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  section: string;
  frequency: number;
  lastUsed: Date;
  category: 'navigation' | 'action';
  color: string;
}

interface QuickActionsData {
  quickActions: DashboardQuickAction[];
  metadata: {
    userId: string;
    userRole: string;
    timeRange: string;
    generatedAt: string;
    isPersonalized: boolean;
  };
}

export default function AdaptiveDashboardQuickActions() {
  console.log('🚨 AdaptiveDashboardQuickActions component is loading...');
  
  const [quickActions, setQuickActions] = useState<DashboardQuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const { user, getAuthHeaders } = useAuth();
  const router = useRouter();

  // Load adaptive quick actions on component mount
  useEffect(() => {
    console.log('🔍 AdaptiveDashboardQuickActions: useEffect triggered');
    console.log('🔍 User object:', user);
    console.log('🔍 User organizationId:', user?.organizationId);
    
    if (user) {
      console.log('🚀 User exists, loading adaptive quick actions...');
      loadAdaptiveQuickActions();
    } else {
      console.log('❌ No user found, skipping quick actions load');
    }
  }, [user]);

  const loadAdaptiveQuickActions = async () => {
    try {
      console.log('🔍 Starting loadAdaptiveQuickActions...');
      setLoading(true);
      setError(null);

      console.log('📡 Making request to /api/dashboard/quick-actions...');
      const response = await fetch('/api/dashboard/quick-actions?timeRange=30d', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      console.log('📡 Quick Actions response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Quick Actions request failed:', response.status, errorText);
        throw new Error(`Failed to load quick actions: ${response.statusText}`);
      }

      const result: { success: boolean; data: QuickActionsData } = await response.json();

      if (result.success) {
        // Filter out dashboard-related actions since user is already on dashboard
        const filteredActions = result.data.quickActions.filter((action: DashboardQuickAction) => {
          const isDashboardAction = 
            action.href === '/dashboard' ||
            action.href === '/' ||
            action.title.toLowerCase().includes('dashboard') ||
            action.section === 'Dashboard' ||
            action.id === 'dashboard' ||
            action.id === 'dashboard-overview';
          
          if (isDashboardAction) {
            console.log(`🚫 Filtered out dashboard action: ${action.title} (${action.href})`);
          }
          
          return !isDashboardAction;
        });
        
        setQuickActions(filteredActions);
        setIsPersonalized(result.data.metadata.isPersonalized);
        console.log(`✅ Loaded ${filteredActions.length} quick actions (filtered ${result.data.quickActions.length - filteredActions.length} dashboard actions)`);
      } else {
        throw new Error('Failed to load quick actions');
      }

    } catch (err) {
      console.error('❌ Error loading adaptive quick actions:', err);
      setError('Failed to load quick actions');
      
      // Fallback to static actions
      setQuickActions(getStaticFallbackActions());
    } finally {
      setLoading(false);
    }
  };

  const getStaticFallbackActions = (): DashboardQuickAction[] => {
    const fallbackActions: DashboardQuickAction[] = [
      {
        id: 'work-queue',
        title: 'My Work Queue',
        description: 'View assigned interactions',
        icon: '📋',
        href: '/work',
        section: 'Work',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'blue'
      },
      {
        id: 'contacts',
        title: 'Manage Contacts',
        description: 'View and edit contacts',
        icon: '👥',
        href: '/contacts',
        section: 'Contacts',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'emerald'
      },
      {
        id: 'reports',
        title: 'View Reports',
        description: 'Check performance metrics',
        icon: '📊',
        href: '/reports',
        section: 'Reports',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'purple'
      },
      {
        id: 'agent-coaching',
        title: 'Agent Coaching',
        description: 'Training and development',
        icon: '🎯',
        href: '/agent-coaching',
        section: 'Coaching',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'orange'
      }
    ];

    // Add admin-specific actions for admin users
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      fallbackActions.push(
        {
          id: 'admin-panel',
          title: 'Admin Panel',
          description: 'System administration',
          icon: '⚙️',
          href: '/admin',
          section: 'Admin',
          frequency: 0,
          lastUsed: new Date(),
          category: 'navigation',
          color: 'slate'
        },
        {
          id: 'user-management',
          title: 'Manage Users',
          description: 'User accounts & permissions',
          icon: '👤',
          href: '/admin/user-management',
          section: 'Admin',
          frequency: 0,
          lastUsed: new Date(),
          category: 'navigation',
          color: 'indigo'
        }
      );
    }

    return fallbackActions.slice(0, 6); // Show up to 6 actions
  };

  const handleActionClick = (action: DashboardQuickAction) => {
    // Track the action click for future learning (optional)
    console.log(`📊 Quick action clicked: ${action.title} -> ${action.href}`);
    
    // Navigate to the action's destination
    router.push(action.href);
  };

  const getActionButtonStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25',
      emerald: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25',
      purple: 'bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/25',
      orange: 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/25',
      slate: 'bg-slate-600 hover:bg-slate-700 text-white shadow-lg shadow-slate-600/25',
      indigo: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25',
      red: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25',
      green: 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25'
    };
    return colorMap[color] || 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg';
  };

  if (!user) {
    return (
      <div className="theme-card shadow-sm rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Quick Actions</h3>
          <div className="text-center theme-text-secondary">
            <p>Please sign in to see personalized quick actions</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="theme-card shadow-sm rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 theme-bg-secondary rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-card shadow-sm rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold theme-text-primary mb-4">Quick Actions</h3>
          <div className="text-center theme-text-secondary">
            <p>⚠️ Unable to load quick actions</p>
            <button 
              onClick={loadAdaptiveQuickActions}
              className="text-blue-600 hover:text-blue-800 text-sm mt-2"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-card shadow-sm rounded-lg">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold theme-text-primary">
            Quick Actions
          </h3>
          {isPersonalized && (
            <span className="text-xs theme-text-secondary bg-blue-100 px-2 py-1 rounded">
              ✨ Personalized
            </span>
          )}
        </div>
        
        <div className="space-y-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 ${getActionButtonStyle(action.color)} hover:scale-105 hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-lg mr-3">{action.icon}</span>
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs opacity-75">{action.description}</div>
                  </div>
                </div>
                {action.frequency > 0 && (
                  <div className="text-xs opacity-75">
                    {action.frequency} visits
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {quickActions.length === 0 && (
          <div className="text-center theme-text-secondary py-4">
            <p>No quick actions available</p>
          </div>
        )}
      </div>
    </div>
  );
}