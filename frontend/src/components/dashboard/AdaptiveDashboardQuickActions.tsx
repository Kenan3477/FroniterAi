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
  const [quickActions, setQuickActions] = useState<DashboardQuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const { user, getAuthHeaders } = useAuth();
  const router = useRouter();

  // Load adaptive quick actions on component mount
  useEffect(() => {
    if (user && user.organizationId) {
      loadAdaptiveQuickActions();
    }
  }, [user]);

  const loadAdaptiveQuickActions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard/quick-actions?timeRange=30d', {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to load quick actions: ${response.statusText}`);
      }

      const result: { success: boolean; data: QuickActionsData } = await response.json();

      if (result.success) {
        setQuickActions(result.data.quickActions);
        setIsPersonalized(result.data.metadata.isPersonalized);
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
        color: 'green'
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
      }
    ];

    // Add admin panel for admin users
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      fallbackActions.push({
        id: 'admin-panel',
        title: 'Admin Panel',
        description: 'System administration',
        icon: '⚙️',
        href: '/admin',
        section: 'Admin',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'red'
      });
    }

    return fallbackActions.slice(0, 4);
  };

  const handleActionClick = (action: DashboardQuickAction) => {
    // Track the action click for future learning (optional)
    console.log(`📊 Quick action clicked: ${action.title} -> ${action.href}`);
    
    // Navigate to the action's destination
    router.push(action.href);
  };

  const getActionButtonStyle = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      green: 'bg-green-600 hover:bg-green-700 text-white',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white',
      red: 'bg-red-600 hover:bg-red-700 text-white',
      orange: 'bg-orange-600 hover:bg-orange-700 text-white'
    };
    return colorMap[color] || 'btn-secondary';
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