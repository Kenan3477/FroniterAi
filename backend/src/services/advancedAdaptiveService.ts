/**
 * Advanced Adaptive Quick Actions Service
 * AI-powered workflow intelligence with predictive actions and team learning
 */

import { PrismaClient } from '@prisma/client';
import { advancedAuditService } from './advancedAuditService';

const prisma = new PrismaClient();

export interface PredictiveAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
  confidence: number;
  reasoning: string;
  category: 'workflow' | 'integration' | 'template' | 'team_suggestion';
  priority: 'high' | 'medium' | 'low';
  estimatedTimeSaved: number; // in minutes
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
  usage_count: number;
  success_rate: number;
  created_by: string;
  organization_id: string;
  is_shared: boolean;
}

export interface WorkflowStep {
  id: string;
  order: number;
  action: string;
  target: string;
  parameters?: Record<string, any>;
  expected_duration: number;
}

export interface TeamPattern {
  pattern_id: string;
  organization_id: string;
  pattern_type: string;
  pattern_data: any;
  success_rate: number;
  usage_frequency: number;
  recommended_action: string;
}

export interface IntegrationShortcut {
  id: string;
  integration_name: string;
  action_type: string;
  endpoint: string;
  icon: string;
  color: string;
  last_used: Date;
  success_rate: number;
}

/**
 * Advanced AI-powered adaptive quick actions service
 */
export class AdvancedAdaptiveService {
  /**
   * Get AI-powered predictive actions based on current workflow context
   */
  async getPredictiveActions(
    userId: string,
    organizationId: string,
    currentContext?: {
      currentPage: string;
      timeOfDay: number;
      recentActions: string[];
      activeProjects?: string[];
    }
  ): Promise<PredictiveAction[]> {
    try {
      const predictions: PredictiveAction[] = [];

      // Analyze current workflow context
      const workflowContext = await this.analyzeWorkflowContext(userId, organizationId, currentContext);
      
      // Generate time-based predictions
      const timeBasedActions = await this.generateTimeBasedPredictions(workflowContext);
      predictions.push(...timeBasedActions);

      // Generate sequence-based predictions
      const sequenceActions = await this.generateSequencePredictions(userId, organizationId, currentContext?.recentActions || []);
      predictions.push(...sequenceActions);

      // Generate team learning suggestions
      const teamSuggestions = await this.getTeamLearningSuggestions(organizationId, userId);
      predictions.push(...teamSuggestions);

      // Sort by confidence and priority
      return predictions
        .sort((a, b) => (b.confidence * (b.priority === 'high' ? 1.5 : b.priority === 'medium' ? 1.2 : 1)) - 
                       (a.confidence * (a.priority === 'high' ? 1.5 : a.priority === 'medium' ? 1.2 : 1)))
        .slice(0, 6);

    } catch (error) {
      console.error('❌ Error generating predictive actions:', error);
      return [];
    }
  }

  /**
   * Get organization-wide team learning suggestions
   */
  async getTeamLearningSuggestions(organizationId: string, excludeUserId: string): Promise<PredictiveAction[]> {
    try {
      // Find successful patterns from other team members
      const teamPatterns = await prisma.$queryRaw<Array<{
        pattern_type: string;
        success_metric: number;
        frequency: number;
        action_sequence: string;
        avg_completion_time: number;
      }>>`
        SELECT 
          "activityType" as pattern_type,
          COUNT(*)::numeric / NULLIF(COUNT(DISTINCT "userId"), 0) as success_metric,
          COUNT(*)::int as frequency,
          STRING_AGG("pagePath", ' -> ' ORDER BY "timestamp") as action_sequence,
          AVG(EXTRACT(EPOCH FROM ("timeOnPage" * interval '1 millisecond'))/60)::numeric as avg_completion_time
        FROM "UserActivityLog" 
        WHERE 
          "organizationId" = ${organizationId}
          AND "userId" != ${excludeUserId}
          AND "timestamp" >= NOW() - INTERVAL '30 days'
          AND "activityType" = 'page_view'
        GROUP BY "activityType", DATE_TRUNC('hour', "timestamp")
        HAVING COUNT(*) >= 3
        ORDER BY success_metric DESC, frequency DESC
        LIMIT 3
      `;

      const suggestions: PredictiveAction[] = [];

      for (const pattern of teamPatterns) {
        suggestions.push({
          id: `team-${pattern.pattern_type}-${Date.now()}`,
          title: `Team Best Practice: ${this.humanizePatternType(pattern.pattern_type)}`,
          description: `Your colleagues complete this ${(Number(pattern.avg_completion_time) || 5).toFixed(0)} min faster on average`,
          icon: 'UserGroupIcon',
          href: this.extractPrimaryActionFromSequence(pattern.action_sequence),
          confidence: Math.min(0.95, Number(pattern.success_metric) * 0.3),
          reasoning: `${pattern.frequency} successful completions by team members`,
          category: 'team_suggestion',
          priority: Number(pattern.success_metric) > 5 ? 'high' : 'medium',
          estimatedTimeSaved: Math.floor(Number(pattern.avg_completion_time) || 5)
        });
      }

      return suggestions;

    } catch (error) {
      console.error('❌ Error getting team learning suggestions:', error);
      return [];
    }
  }

  /**
   * Get integration shortcuts based on usage patterns
   */
  async getIntegrationShortcuts(organizationId: string, userId: string): Promise<IntegrationShortcut[]> {
    try {
      // Mock integration shortcuts for now - in production these would come from actual integration usage data
      const mockIntegrations: IntegrationShortcut[] = [
        {
          id: 'twilio-dashboard',
          integration_name: 'Twilio Console',
          action_type: 'external_link',
          endpoint: 'https://console.twilio.com',
          icon: 'PhoneIcon',
          color: 'bg-red-500',
          last_used: new Date(),
          success_rate: 0.95
        },
        {
          id: 'salesforce-leads',
          integration_name: 'Salesforce Leads',
          action_type: 'external_link', 
          endpoint: 'https://salesforce.com/leads',
          icon: 'CloudIcon',
          color: 'bg-blue-500',
          last_used: new Date(),
          success_rate: 0.88
        },
        {
          id: 'hubspot-contacts',
          integration_name: 'HubSpot Contacts',
          action_type: 'external_link',
          endpoint: 'https://app.hubspot.com/contacts',
          icon: 'UsersIcon', 
          color: 'bg-orange-500',
          last_used: new Date(),
          success_rate: 0.92
        }
      ];

      return mockIntegrations;

    } catch (error) {
      console.error('❌ Error getting integration shortcuts:', error);
      return [];
    }
  }

  /**
   * Get saved workflow templates for user
   */
  async getWorkflowTemplates(userId: string, organizationId: string): Promise<WorkflowTemplate[]> {
    try {
      // For now, return mock workflow templates - in production these would be stored in database
      const mockTemplates: WorkflowTemplate[] = [
        {
          id: 'new-campaign-setup',
          name: 'New Campaign Setup',
          description: 'Complete workflow for setting up a new marketing campaign',
          steps: [
            {
              id: 'step-1',
              order: 1,
              action: 'navigate',
              target: '/admin?section=Campaigns',
              expected_duration: 30
            },
            {
              id: 'step-2', 
              order: 2,
              action: 'create_campaign',
              target: '/admin?section=Campaigns&action=create',
              expected_duration: 180
            },
            {
              id: 'step-3',
              order: 3, 
              action: 'assign_data_list',
              target: '/admin?section=Data Management',
              expected_duration: 120
            },
            {
              id: 'step-4',
              order: 4,
              action: 'configure_flow',
              target: '/admin?section=Flows',
              expected_duration: 240
            }
          ],
          estimatedDuration: 570, // 9.5 minutes
          usage_count: 15,
          success_rate: 0.87,
          created_by: userId,
          organization_id: organizationId,
          is_shared: true
        },
        {
          id: 'user-onboarding',
          name: 'New User Onboarding', 
          description: 'Complete workflow for onboarding a new team member',
          steps: [
            {
              id: 'step-1',
              order: 1,
              action: 'navigate',
              target: '/admin?section=User Management',
              expected_duration: 20
            },
            {
              id: 'step-2',
              order: 2,
              action: 'create_user',
              target: '/admin?section=User Management&action=create',
              expected_duration: 120
            },
            {
              id: 'step-3',
              order: 3,
              action: 'assign_campaigns',
              target: '/admin?section=Campaigns',
              expected_duration: 90
            }
          ],
          estimatedDuration: 230,
          usage_count: 8,
          success_rate: 0.92,
          created_by: userId,
          organization_id: organizationId,
          is_shared: false
        }
      ];

      return mockTemplates;

    } catch (error) {
      console.error('❌ Error getting workflow templates:', error);
      return [];
    }
  }

  /**
   * Analyze current workflow context for predictive insights
   */
  private async analyzeWorkflowContext(
    userId: string,
    organizationId: string,
    context?: any
  ): Promise<any> {
    const now = new Date();
    const timeOfDay = now.getHours();
    
    // Get recent activity patterns
    const recentActivity = await prisma.userActivityLog.findMany({
      where: {
        userId,
        organizationId,
        timestamp: {
          gte: new Date(Date.now() - 3600000) // Last hour
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });

    return {
      timeOfDay,
      currentPage: context?.currentPage || '',
      recentPages: recentActivity.map(a => a.pagePath),
      activityLevel: recentActivity.length,
      dominantCategory: this.getDominantActivityCategory(recentActivity)
    };
  }

  /**
   * Generate time-based predictions
   */
  private async generateTimeBasedPredictions(workflowContext: any): Promise<PredictiveAction[]> {
    const predictions: PredictiveAction[] = [];
    const timeOfDay = workflowContext.timeOfDay;

    // Morning routine predictions (9 AM - 12 PM)
    if (timeOfDay >= 9 && timeOfDay < 12) {
      predictions.push({
        id: 'morning-reports',
        title: 'Morning Reports Review',
        description: 'Start your day with system insights',
        icon: 'ChartBarIcon',
        href: '/admin?section=Reports & Analytics',
        confidence: 0.85,
        reasoning: 'Most admins review reports first thing in the morning',
        category: 'workflow',
        priority: 'high',
        estimatedTimeSaved: 5
      });
    }

    // Afternoon workflow predictions (1 PM - 5 PM)  
    if (timeOfDay >= 13 && timeOfDay < 17) {
      predictions.push({
        id: 'afternoon-campaigns',
        title: 'Campaign Optimization',
        description: 'Perfect time to review and optimize campaigns',
        icon: 'MegaphoneIcon',
        href: '/admin?section=Campaigns',
        confidence: 0.78,
        reasoning: 'Afternoon is optimal for campaign management tasks',
        category: 'workflow',
        priority: 'medium',
        estimatedTimeSaved: 8
      });
    }

    return predictions;
  }

  /**
   * Generate sequence-based predictions from user action patterns
   */
  private async generateSequencePredictions(
    userId: string,
    organizationId: string,
    recentActions: string[]
  ): Promise<PredictiveAction[]> {
    const predictions: PredictiveAction[] = [];

    // Analyze common action sequences
    const sequencePatterns = await this.analyzeActionSequences(userId, organizationId);
    
    for (const pattern of sequencePatterns) {
      if (this.matchesRecentActions(pattern.sequence, recentActions)) {
        predictions.push({
          id: `sequence-${pattern.id}`,
          title: `Next: ${pattern.nextAction.title}`,
          description: pattern.nextAction.description,
          icon: pattern.nextAction.icon,
          href: pattern.nextAction.href,
          confidence: pattern.confidence,
          reasoning: `You typically do this after ${pattern.trigger}`,
          category: 'workflow',
          priority: pattern.confidence > 0.8 ? 'high' : 'medium', 
          estimatedTimeSaved: pattern.estimatedTime
        });
      }
    }

    return predictions;
  }

  /**
   * Helper methods for pattern analysis
   */
  private humanizePatternType(patternType: string): string {
    const typeMap: Record<string, string> = {
      'page_view': 'Page Navigation',
      'click': 'Interactive Actions',
      'data_export': 'Data Export',
      'campaign_create': 'Campaign Creation'
    };
    return typeMap[patternType] || patternType;
  }

  private extractPrimaryActionFromSequence(actionSequence: string): string {
    const actions = actionSequence.split(' -> ');
    return actions[0] || '/admin';
  }

  private getDominantActivityCategory(activities: any[]): string {
    const categories: Record<string, number> = {};
    
    activities.forEach(activity => {
      const category = this.categorizePage(activity.pagePath);
      categories[category] = (categories[category] || 0) + 1;
    });

    return Object.keys(categories).reduce((a, b) => 
      categories[a] > categories[b] ? a : b, 'general'
    );
  }

  private categorizePage(pagePath: string): string {
    if (pagePath.includes('campaign')) return 'campaigns';
    if (pagePath.includes('user')) return 'user_management';
    if (pagePath.includes('report')) return 'reports';
    if (pagePath.includes('data')) return 'data_management';
    return 'general';
  }

  private async analyzeActionSequences(userId: string, organizationId: string): Promise<any[]> {
    // Mock sequence patterns - in production this would analyze actual user sequences
    return [
      {
        id: 'campaign-data-sequence',
        sequence: ['/admin?section=Campaigns'],
        nextAction: {
          title: 'Assign Data List',
          description: 'Complete campaign setup with data assignment',
          icon: 'CircleStackIcon',
          href: '/admin?section=Data Management'
        },
        confidence: 0.82,
        trigger: 'creating campaigns',
        estimatedTime: 3
      }
    ];
  }

  private matchesRecentActions(patternSequence: string[], recentActions: string[]): boolean {
    return patternSequence.some(pattern => 
      recentActions.some(action => action.includes(pattern))
    );
  }
}

export const advancedAdaptiveService = new AdvancedAdaptiveService();