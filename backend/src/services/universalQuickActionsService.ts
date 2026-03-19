/**
 * Universal Navigation Tracking Service
 * Tracks navigation patterns for all authenticated users to enable adaptive quick actions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory store for navigation data (fallback until database is ready)
const navigationStore = new Map<string, NavigationPattern[]>();

export interface DashboardQuickAction {
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

export interface NavigationPattern {
  pagePath: string;
  visits: number;
  avgTimeOnPage: number;
  lastVisited: Date;
  section: string;
  category: string;
}

/**
 * Service for tracking navigation and generating adaptive quick actions for all users
 */
export class UniversalQuickActionsService {
  
  /**
   * Track user navigation for any authenticated user
   */
  async trackNavigation(userId: string, organizationId: string, pagePath: string, timeOnPage?: number) {
    try {
      // Store in-memory for now (will be replaced with database when schema is ready)
      const key = `${organizationId}:${userId}`;
      const existing = navigationStore.get(key) || [];
      
      const existingPattern = existing.find(p => p.pagePath === pagePath);
      if (existingPattern) {
        existingPattern.visits++;
        existingPattern.lastVisited = new Date();
        if (timeOnPage) {
          existingPattern.avgTimeOnPage = (existingPattern.avgTimeOnPage + timeOnPage) / 2;
        }
      } else {
        existing.push({
          pagePath,
          visits: 1,
          avgTimeOnPage: timeOnPage || 0,
          lastVisited: new Date(),
          section: this.extractSection(pagePath),
          category: this.categorizePagePath(pagePath)
        });
      }
      
      navigationStore.set(key, existing);
      
      // TODO: Also store in database when schema is ready
      // await prisma.userActivityLog.create({ ... });

    } catch (error) {
      console.error('❌ Error tracking navigation:', error);
      // Silently fail - don't disrupt user experience
    }
  }

  /**
   * Get adaptive quick actions for any user based on their navigation patterns
   */
  async getAdaptiveQuickActions(
    userId: string, 
    organizationId: string, 
    userRole: string,
    timeRange: '7d' | '30d' = '30d'
  ): Promise<DashboardQuickAction[]> {
    try {
      // Get user's navigation patterns
      const patterns = await this.analyzeNavigationPatterns(userId, organizationId, timeRange);
      
      // Generate adaptive actions based on patterns and user role
      const adaptiveActions = await this.generateAdaptiveQuickActions(patterns, userRole);
      
      // If insufficient data, provide role-based defaults
      if (adaptiveActions.length < 3) {
        return this.getRoleBasedDefaults(userRole, adaptiveActions);
      }
      
      return adaptiveActions.slice(0, 4);
    } catch (error) {
      console.error('❌ Error getting adaptive quick actions:', error);
      return this.getRoleBasedDefaults(userRole);
    }
  }

  /**
   * Analyze user navigation patterns from in-memory store
   */
  private async analyzeNavigationPatterns(
    userId: string, 
    organizationId: string, 
    timeRange: '7d' | '30d'
  ): Promise<NavigationPattern[]> {
    try {
      const key = `${organizationId}:${userId}`;
      const patterns = navigationStore.get(key) || [];
      
      const timeFilter = new Date();
      timeFilter.setDate(timeFilter.getDate() - (timeRange === '7d' ? 7 : 30));
      
      // Filter patterns by time range and sort by frequency
      return patterns
        .filter(pattern => pattern.lastVisited > timeFilter)
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);
        
    } catch (error) {
      console.error('❌ Error analyzing navigation patterns:', error);
      return [];
    }
  }

  /**
   * Generate adaptive quick actions based on navigation patterns
   */
  private async generateAdaptiveQuickActions(
    patterns: NavigationPattern[], 
    userRole: string
  ): Promise<DashboardQuickAction[]> {
    const actions: DashboardQuickAction[] = [];
    
    // Map navigation patterns to quick actions
    const actionMap = this.getActionMapping(userRole);
    
    for (const pattern of patterns.slice(0, 8)) {
      const action = actionMap[pattern.section] || actionMap[pattern.pagePath];
      
      if (action && !actions.find(a => a.id === action.id)) {
        actions.push({
          ...action,
          frequency: pattern.visits,
          lastUsed: pattern.lastVisited
        });
      }
    }

    // Sort by frequency and recency
    return actions.sort((a, b) => {
      const aScore = a.frequency * 0.7 + (Date.now() - a.lastUsed.getTime()) * 0.0000003;
      const bScore = b.frequency * 0.7 + (Date.now() - b.lastUsed.getTime()) * 0.0000003;
      return bScore - aScore;
    });
  }

  /**
   * Map page paths to actionable quick actions
   */
  private getActionMapping(userRole: string): Record<string, DashboardQuickAction> {
    const baseActions: Record<string, DashboardQuickAction> = {
      '/work': {
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
      '/contacts': {
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
      '/reports': {
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
      '/agent-coaching': {
        id: 'coaching',
        title: 'Agent Coaching',
        description: 'Training and feedback',
        icon: '🎯',
        href: '/agent-coaching',
        section: 'Coaching',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'orange'
      }
    };

    // Add role-specific actions
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      baseActions['/admin'] = {
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
      };
    }

    if (userRole === 'AGENT' || userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      baseActions['call-action'] = {
        id: 'make-call',
        title: 'Make Call',
        description: 'Start outbound calling',
        icon: '📞',
        href: '/work?action=call',
        section: 'Calling',
        frequency: 0,
        lastUsed: new Date(),
        category: 'action',
        color: 'blue'
      };
    }

    return baseActions;
  }

  /**
   * Get role-based default actions for new users
   */
  private getRoleBasedDefaults(userRole: string, existing: DashboardQuickAction[] = []): DashboardQuickAction[] {
    const existingIds = existing.map(a => a.id);
    
    const defaults: DashboardQuickAction[] = [
      {
        id: 'view-dashboard',
        title: 'Dashboard Overview',
        description: 'View system overview',
        icon: '📊',
        href: '/dashboard',
        section: 'Dashboard',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'blue'
      }
    ];

    if (userRole === 'AGENT') {
      defaults.push({
        id: 'work-queue',
        title: 'My Work Queue',
        description: 'View assigned interactions',
        icon: '📋',
        href: '/work',
        section: 'Work',
        frequency: 0,
        lastUsed: new Date(),
        category: 'navigation',
        color: 'green'
      });
    }

    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      defaults.push({
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

    // Filter out existing actions and return top 3-4
    const newDefaults = defaults.filter(d => !existingIds.includes(d.id));
    return [...existing, ...newDefaults].slice(0, 4);
  }

  /**
   * Categorize page paths
   */
  private categorizePagePath(pagePath: string): string {
    if (pagePath.includes('/admin')) return 'admin';
    if (pagePath.includes('/work')) return 'work';
    if (pagePath.includes('/contacts')) return 'contacts';
    if (pagePath.includes('/reports')) return 'reports';
    if (pagePath.includes('/agent-coaching')) return 'coaching';
    if (pagePath.includes('/dashboard')) return 'dashboard';
    return 'other';
  }

  /**
   * Extract section from page path
   */
  private extractSection(pagePath: string): string {
    const parts = pagePath.split('/').filter(Boolean);
    return parts[0] || 'dashboard';
  }
}

export const universalQuickActionsService = new UniversalQuickActionsService();