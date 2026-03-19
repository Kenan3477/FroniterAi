/**
 * Adaptive Quick Actions Service
 * Analyzes admin user behavior patterns to provide personalized shortcuts
 */

import { PrismaClient } from '@prisma/client';
import { advancedAuditService } from './advancedAuditService';

const prisma = new PrismaClient();

export interface QuickAction {
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

export interface UserNavigationPattern {
  pagePath: string;
  visits: number;
  avgTimeOnPage: number;
  lastVisited: Date;
  section: string;
  category: string;
}

/**
 * Service for generating adaptive quick actions based on user behavior
 */
export class AdaptiveQuickActionsService {
  /**
   * Get personalized quick actions for an admin user
   */
  async getPersonalizedQuickActions(
    userId: string, 
    organizationId: string, 
    timeRange: '7d' | '30d' = '30d'
  ): Promise<QuickAction[]> {
    try {
      // Get user's navigation patterns
      const patterns = await this.analyzeUserNavigationPatterns(userId, organizationId, timeRange);
      
      // Generate adaptive quick actions based on patterns
      const adaptiveActions = await this.generateAdaptiveActions(patterns);
      
      // If user doesn't have enough data, provide default admin quick actions
      if (adaptiveActions.length < 3) {
        return this.getDefaultAdminQuickActions(adaptiveActions);
      }
      
      return adaptiveActions.slice(0, 4); // Return top 4 actions
    } catch (error) {
      console.error('❌ Error getting personalized quick actions:', error);
      return this.getDefaultAdminQuickActions();
    }
  }

  /**
   * Analyze user navigation patterns from activity logs
   */
  private async analyzeUserNavigationPatterns(
    userId: string, 
    organizationId: string, 
    timeRange: '7d' | '30d'
  ): Promise<UserNavigationPattern[]> {
    const timeFilter = new Date();
    timeFilter.setDate(timeFilter.getDate() - (timeRange === '7d' ? 7 : 30));

    // Get page visit frequency and time spent
    const pageVisits = await prisma.$queryRaw<Array<{
      pagePath: string;
      visits: number;
      avgTimeOnPage: number;
      lastVisited: Date;
    }>>`
      SELECT 
        "pagePath",
        COUNT(*)::int as visits,
        COALESCE(AVG(EXTRACT(EPOCH FROM ("timeOnPage" * interval '1 millisecond'))), 0)::numeric as "avgTimeOnPage",
        MAX("timestamp") as "lastVisited"
      FROM "UserActivityLog"
      WHERE 
        "userId" = ${userId}
        AND "organizationId" = ${organizationId}
        AND "timestamp" >= ${timeFilter}
        AND "activityType" IN ('page_view', 'tab_switch')
        AND "pagePath" LIKE '/admin%'
      GROUP BY "pagePath"
      HAVING COUNT(*) >= 2
      ORDER BY visits DESC, "avgTimeOnPage" DESC
      LIMIT 10
    `;

    // Map page paths to admin sections
    return pageVisits.map(visit => ({
      ...visit,
      visits: Number(visit.visits),
      avgTimeOnPage: Number(visit.avgTimeOnPage) || 0,
      section: this.mapPagePathToSection(visit.pagePath),
      category: this.categorizePagePath(visit.pagePath)
    }));
  }

  /**
   * Generate adaptive quick actions based on navigation patterns
   */
  private async generateAdaptiveActions(patterns: UserNavigationPattern[]): Promise<QuickAction[]> {
    const actionMappings: Record<string, Partial<QuickAction>> = {
      'User Management': {
        title: 'Manage Users',
        description: 'Access user management',
        icon: 'UsersIcon',
        href: '/admin?section=User Management',
        section: 'User Management',
        category: 'navigation',
        color: 'bg-blue-500'
      },
      'Campaigns': {
        title: 'Campaign Center',
        description: 'Manage campaigns',
        icon: 'MegaphoneIcon',
        href: '/admin?section=Campaigns',
        section: 'Campaigns',
        category: 'navigation',
        color: 'bg-green-500'
      },
      'Reports & Analytics': {
        title: 'View Reports',
        description: 'Access analytics dashboard',
        icon: 'ChartBarIcon',
        href: '/admin?section=Reports & Analytics',
        section: 'Reports & Analytics',
        category: 'report',
        color: 'bg-purple-500'
      },
      'Business Settings': {
        title: 'Business Config',
        description: 'Organization settings',
        icon: 'BuildingOfficeIcon',
        href: '/admin?section=Business Settings',
        section: 'Business Settings',
        category: 'navigation',
        color: 'bg-orange-500'
      },
      'Flows': {
        title: 'Workflow Builder',
        description: 'Manage automation flows',
        icon: 'ArrowPathIcon',
        href: '/admin?section=Flows',
        section: 'Flows',
        category: 'action',
        color: 'bg-indigo-500'
      },
      'Data Management': {
        title: 'Data Lists',
        description: 'Manage data sources',
        icon: 'CircleStackIcon',
        href: '/admin?section=Data Management',
        section: 'Data Management',
        category: 'navigation',
        color: 'bg-teal-500'
      },
      'Call Recordings': {
        title: 'Call Recordings',
        description: 'Review call recordings',
        icon: 'MicrophoneIcon',
        href: '/call-recordings',
        section: 'Call Recordings',
        category: 'report',
        color: 'bg-red-500'
      },
      'Work - My Interaction': {
        title: 'My Interactions',
        description: 'View interaction history',
        icon: 'PhoneIcon',
        href: '/work?tab=my-interaction',
        section: 'Work - My Interaction',
        category: 'action',
        color: 'bg-blue-600'
      },
      'API': {
        title: 'API Management',
        description: 'Configure API settings',
        icon: 'KeyIcon',
        href: '/admin?section=API',
        section: 'API',
        category: 'navigation',
        color: 'bg-gray-500'
      }
    };

    const quickActions: QuickAction[] = [];

    // Generate actions based on most frequent patterns
    for (const pattern of patterns) {
      const mapping = actionMappings[pattern.section];
      if (mapping && quickActions.length < 4) {
        quickActions.push({
          id: `adaptive-${pattern.section.toLowerCase().replace(/\s+/g, '-')}`,
          frequency: pattern.visits,
          ...mapping
        } as QuickAction);
      }
    }

    return quickActions;
  }

  /**
   * Map page paths to admin sections
   */
  private mapPagePathToSection(pagePath: string): string {
    const pathMappings: Record<string, string> = {
      '/admin': 'Admin Dashboard',
      '/admin?section=User Management': 'User Management',
      '/admin?section=Campaigns': 'Campaigns', 
      '/admin?section=Reports & Analytics': 'Reports & Analytics',
      '/admin?section=Business Settings': 'Business Settings',
      '/admin?section=Flows': 'Flows',
      '/admin?section=Data Management': 'Data Management',
      '/admin?section=API': 'API',
      '/call-recordings': 'Call Recordings',
      '/work': 'Work Dashboard',
      '/reports': 'Reports & Analytics'
    };

    // Check for work sub-tabs
    if (pagePath.includes('/work?tab=my-interaction')) {
      return 'Work - My Interaction';
    }

    // Find best match or return cleaned path
    const match = Object.keys(pathMappings).find(key => pagePath.includes(key));
    return match ? pathMappings[match] : this.extractSectionFromPath(pagePath);
  }

  /**
   * Categorize page paths
   */
  private categorizePagePath(pagePath: string): string {
    if (pagePath.includes('reports') || pagePath.includes('analytics') || pagePath.includes('recordings')) {
      return 'report';
    }
    if (pagePath.includes('flows') || pagePath.includes('my-interaction') || pagePath.includes('campaigns')) {
      return 'action';
    }
    return 'navigation';
  }

  /**
   * Extract section name from page path
   */
  private extractSectionFromPath(pagePath: string): string {
    // Extract from query params
    const sectionMatch = pagePath.match(/section=([^&]+)/);
    if (sectionMatch) {
      return decodeURIComponent(sectionMatch[1].replace(/\+/g, ' '));
    }

    // Extract from path
    const pathParts = pagePath.split('/').filter(part => part);
    return pathParts.length > 0 ? 
      pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
      'Unknown';
  }

  /**
   * Get default quick actions for admins without sufficient data
   */
  private getDefaultAdminQuickActions(existingActions: QuickAction[] = []): QuickAction[] {
    const defaultActions: QuickAction[] = [
      {
        id: 'default-user-management',
        title: 'Manage Users',
        description: 'Add and manage user accounts',
        icon: 'UsersIcon',
        href: '/admin?section=User Management',
        section: 'User Management',
        frequency: 0,
        category: 'navigation',
        color: 'bg-blue-500'
      },
      {
        id: 'default-campaigns',
        title: 'Campaigns',
        description: 'Create and manage campaigns',
        icon: 'MegaphoneIcon',
        href: '/admin?section=Campaigns',
        section: 'Campaigns',
        frequency: 0,
        category: 'action',
        color: 'bg-green-500'
      },
      {
        id: 'default-reports',
        title: 'Analytics',
        description: 'View system reports',
        icon: 'ChartBarIcon',
        href: '/admin?section=Reports & Analytics',
        section: 'Reports & Analytics',
        frequency: 0,
        category: 'report',
        color: 'bg-purple-500'
      },
      {
        id: 'default-settings',
        title: 'Settings',
        description: 'System configuration',
        icon: 'CogIcon',
        href: '/admin?section=Business Settings',
        section: 'Business Settings',
        frequency: 0,
        category: 'navigation',
        color: 'bg-gray-500'
      }
    ];

    // Merge existing actions with defaults, avoiding duplicates
    const existingSections = new Set(existingActions.map(action => action.section));
    const uniqueDefaults = defaultActions.filter(action => !existingSections.has(action.section));
    
    return [...existingActions, ...uniqueDefaults].slice(0, 4);
  }

  /**
   * Track admin navigation for quick actions learning
   */
  async trackAdminNavigation(
    userId: string, 
    organizationId: string, 
    pagePath: string, 
    timeOnPage?: number
  ): Promise<void> {
    try {
      // Only track admin section navigation
      if (!pagePath.includes('/admin') && !pagePath.includes('/work') && !pagePath.includes('/reports') && !pagePath.includes('/call-recordings')) {
        return;
      }

      // Use existing audit service for consistency
      await advancedAuditService.trackUserActivity({
        userId,
        organizationId,
        sessionId: 'adaptive-tracking',
        activityType: 'page_view',
        pagePath,
        timeOnPage,
        pageTitle: this.mapPagePathToSection(pagePath),
        metadata: {
          source: 'adaptive_quick_actions',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error tracking admin navigation:', error);
    }
  }
}

export const adaptiveQuickActionsService = new AdaptiveQuickActionsService();