/**
 * Adaptive Quick Actions Component
 * Displays personalized shortcuts based on admin user behavior patterns
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  MegaphoneIcon,
  ChartBarIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  CircleStackIcon,
  KeyIcon,
  MicrophoneIcon,
  PhoneIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  section: string;
  frequency: number;
  category: 'navigation' | 'action' | 'report';
  color: string;
}

interface AdaptiveQuickActionsProps {
  className?: string;
  onNavigate?: (href: string) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  HomeIcon,
  UsersIcon,
  MegaphoneIcon,
  ChartBarIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
  CircleStackIcon,
  KeyIcon,
  MicrophoneIcon,
  PhoneIcon,
  EyeIcon,
  SparklesIcon,
  ClockIcon,
  FireIcon
};

export default function AdaptiveQuickActions({ 
  className = '', 
  onNavigate 
}: AdaptiveQuickActionsProps) {
  const { user, getAuthHeaders } = useAuth();
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPersonalized, setIsPersonalized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track navigation when actions are clicked
  const trackNavigation = useCallback(async (pagePath: string, timeOnPage?: number) => {
    try {
      if (!user?.organizationId) return;
      
      await fetch('/api/admin/quick-actions/track-navigation', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          pagePath,
          timeOnPage,
          organizationId: user.organizationId
        })
      });
    } catch (error) {
      console.warn('Failed to track navigation:', error);
    }
  }, [user?.organizationId, getAuthHeaders]);

  // Load personalized quick actions
  const loadQuickActions = useCallback(async () => {
    try {
      setError(null);
      
      // Only load for Admin/Super Admin users
      if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        setQuickActions([]);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/quick-actions/personalized?timeRange=30d', {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setQuickActions(data.data.quickActions || []);
        setIsPersonalized(data.data.metadata?.isPersonalized || false);
      } else {
        throw new Error(data.error || 'Failed to load quick actions');
      }

    } catch (error) {
      console.error('Error loading adaptive quick actions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load quick actions');
      
      // Fallback to default actions on error
      setQuickActions([]);
      setIsPersonalized(false);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  // Load quick actions on mount and when user changes
  useEffect(() => {
    loadQuickActions();
  }, [loadQuickActions]);

  // Handle action click
  const handleActionClick = async (action: QuickAction) => {
    // Track navigation for learning
    await trackNavigation(action.href);
    
    // Navigate to the action
    if (onNavigate) {
      onNavigate(action.href);
    } else {
      window.location.href = action.href;
    }
  };

  // Don't render for non-admin users
  if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    return null;
  }

  return (
    <div className={`theme-card rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
          <h3 className="text-lg font-semibold theme-text-primary">
            {isPersonalized ? 'Your Quick Actions' : 'Quick Actions'}
          </h3>
        </div>
        
        {isPersonalized && (
          <div className="flex items-center text-sm theme-text-secondary">
            <FireIcon className="h-4 w-4 text-orange-500 mr-1" />
            <span>Personalized</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center p-3 bg-gray-100 rounded-lg">
                  <div className="w-10 h-10 bg-gray-300 rounded-lg mr-3"></div>
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-gray-300 rounded mb-1"></div>
                    <div className="w-32 h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : quickActions.length > 0 ? (
          quickActions.map((action) => {
            const IconComponent = iconMap[action.icon] || HomeIcon;
            const colorClass = action.color || 'bg-gray-500';
            
            return (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="w-full flex items-center p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${colorClass} text-white mr-3 group-hover:scale-105 transition-transform duration-200`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                
                <div className="flex-1 text-left">
                  <div className="flex items-center">
                    <h4 className="font-medium theme-text-primary group-hover:text-blue-700">
                      {action.title}
                    </h4>
                    {action.frequency > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                        {action.frequency} visits
                      </span>
                    )}
                  </div>
                  <p className="text-sm theme-text-secondary group-hover:text-blue-600">
                    {action.description}
                  </p>
                </div>
                
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-8">
            <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h4 className="text-lg font-medium theme-text-primary mb-2">
              Building Your Quick Actions
            </h4>
            <p className="text-sm theme-text-secondary">
              Your personalized shortcuts will appear here as you use the system.
              {isPersonalized ? ' Keep exploring to discover more relevant actions!' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Analytics hint for personalized actions */}
      {isPersonalized && quickActions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm theme-text-secondary">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>Based on your last 30 days</span>
            </div>
            <button 
              onClick={() => window.location.href = '/admin?section=Reports & Analytics'}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              View Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  );
}