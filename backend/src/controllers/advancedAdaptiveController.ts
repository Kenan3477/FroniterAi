/**
 * Advanced Adaptive Quick Actions Controller
 * AI-powered predictive actions and workflow intelligence
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { advancedAdaptiveService } from '../services/advancedAdaptiveService';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';

// Validation schemas
const WorkflowContextSchema = z.object({
  currentPage: z.string().optional(),
  timeOfDay: z.number().optional(),
  recentActions: z.array(z.string()).optional(),
  activeProjects: z.array(z.string()).optional(),
  organizationId: z.string().uuid()
});

const CreateWorkflowTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  steps: z.array(z.object({
    action: z.string(),
    target: z.string(),
    parameters: z.record(z.any()).optional(),
    expected_duration: z.number()
  })),
  is_shared: z.boolean().optional().default(false),
  organizationId: z.string().uuid()
});

const VoiceCommandSchema = z.object({
  command: z.string().min(1),
  context: z.string().optional(),
  organizationId: z.string().uuid()
});

/**
 * Get AI-powered predictive actions
 * GET /api/admin/quick-actions/predictive?context=...
 */
export const getPredictiveActions = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required for predictive actions.'
        });
      }

      // Parse context from query parameters
      const context = {
        currentPage: req.query.currentPage as string,
        timeOfDay: req.query.timeOfDay ? parseInt(req.query.timeOfDay as string) : new Date().getHours(),
        recentActions: req.query.recentActions ? (req.query.recentActions as string).split(',') : [],
        activeProjects: req.query.activeProjects ? (req.query.activeProjects as string).split(',') : []
      };

      const predictiveActions = await advancedAdaptiveService.getPredictiveActions(
        user.id,
        user.organizationId,
        context
      );

      res.json({
        success: true,
        data: {
          predictiveActions,
          context,
          metadata: {
            userId: user.id,
            generatedAt: new Date().toISOString(),
            aiEnabled: true,
            totalPredictions: predictiveActions.length
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting predictive actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get predictive actions'
      });
    }
  }
];

/**
 * Get team learning suggestions
 * GET /api/admin/quick-actions/team-learning
 */
export const getTeamLearningSuggestions = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const suggestions = await advancedAdaptiveService.getTeamLearningSuggestions(
        user.organizationId,
        user.id
      );

      res.json({
        success: true,
        data: {
          suggestions,
          metadata: {
            organizationId: user.organizationId,
            excludedUserId: user.id,
            generatedAt: new Date().toISOString(),
            teamLearningEnabled: true
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting team learning suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get team learning suggestions'
      });
    }
  }
];

/**
 * Get integration shortcuts
 * GET /api/admin/quick-actions/integrations
 */
export const getIntegrationShortcuts = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const shortcuts = await advancedAdaptiveService.getIntegrationShortcuts(
        user.organizationId,
        user.id
      );

      res.json({
        success: true,
        data: {
          shortcuts,
          metadata: {
            userId: user.id,
            organizationId: user.organizationId,
            generatedAt: new Date().toISOString(),
            integrationsEnabled: true
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting integration shortcuts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get integration shortcuts'
      });
    }
  }
];

/**
 * Get workflow templates
 * GET /api/admin/quick-actions/templates
 */
export const getWorkflowTemplates = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      const templates = await advancedAdaptiveService.getWorkflowTemplates(
        user.id,
        user.organizationId
      );

      res.json({
        success: true,
        data: {
          templates,
          metadata: {
            userId: user.id,
            organizationId: user.organizationId,
            generatedAt: new Date().toISOString(),
            templatesEnabled: true
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting workflow templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get workflow templates'
      });
    }
  }
];

/**
 * Process voice command
 * POST /api/admin/quick-actions/voice-command
 */
export const processVoiceCommand = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const validatedData = VoiceCommandSchema.parse(req.body);
      const user = (req as any).user;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      // Process voice command with simple NLP
      const processedCommand = await processVoiceCommandNLP(
        validatedData.command,
        validatedData.context,
        user.organizationId
      );

      res.json({
        success: true,
        data: {
          command: validatedData.command,
          processedCommand,
          metadata: {
            userId: user.id,
            processedAt: new Date().toISOString(),
            voiceEnabled: true
          }
        }
      });

    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process voice command'
      });
    }
  }
];

/**
 * Get mobile-optimized quick actions
 * GET /api/admin/quick-actions/mobile
 */
export const getMobileOptimizedActions = [
  authenticateToken,
  requirePermission('admin.read'),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Admin privileges required.'
        });
      }

      // Get mobile-specific action layout
      const mobileActions = await getMobileActionLayout(user.id, user.organizationId);

      res.json({
        success: true,
        data: {
          mobileActions,
          metadata: {
            userId: user.id,
            deviceOptimized: 'mobile',
            generatedAt: new Date().toISOString(),
            touchOptimized: true
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting mobile actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get mobile actions'
      });
    }
  }
];

/**
 * Simple NLP processor for voice commands
 */
async function processVoiceCommandNLP(
  command: string, 
  context?: string, 
  organizationId?: string
): Promise<any> {
  const lowerCommand = command.toLowerCase();
  
  // Intent mapping
  const intents = [
    {
      keywords: ['take me', 'go to', 'navigate', 'open', 'show me'],
      destinations: [
        { words: ['most used', 'frequent', 'common'], action: 'navigate_to_most_used' },
        { words: ['campaigns', 'campaign'], action: 'navigate_to_campaigns' },
        { words: ['users', 'user management'], action: 'navigate_to_users' },
        { words: ['reports', 'analytics'], action: 'navigate_to_reports' },
        { words: ['recordings', 'calls'], action: 'navigate_to_recordings' }
      ]
    },
    {
      keywords: ['create', 'add', 'new'],
      destinations: [
        { words: ['campaign'], action: 'create_campaign' },
        { words: ['user'], action: 'create_user' },
        { words: ['flow'], action: 'create_flow' }
      ]
    },
    {
      keywords: ['help', 'what can you do', 'commands'],
      destinations: [
        { words: [], action: 'show_help' }
      ]
    }
  ];

  // Find matching intent
  for (const intent of intents) {
    const hasIntentKeyword = intent.keywords.some(keyword => lowerCommand.includes(keyword));
    
    if (hasIntentKeyword) {
      for (const dest of intent.destinations) {
        if (dest.words.length === 0 || dest.words.some(word => lowerCommand.includes(word))) {
          return {
            action: dest.action,
            confidence: 0.85,
            recognized: true,
            actionData: await getActionData(dest.action, organizationId)
          };
        }
      }
    }
  }

  return {
    action: 'unknown',
    confidence: 0.1,
    recognized: false,
    suggestion: 'Try saying "take me to campaigns" or "create new user"'
  };
}

/**
 * Get action data for voice commands
 */
async function getActionData(action: string, organizationId?: string): Promise<any> {
  const actionMap: Record<string, any> = {
    'navigate_to_most_used': {
      href: '/admin', // Will be determined by most used
      title: 'Most Used Section',
      type: 'navigation'
    },
    'navigate_to_campaigns': {
      href: '/admin?section=Campaigns',
      title: 'Campaigns',
      type: 'navigation'
    },
    'navigate_to_users': {
      href: '/admin?section=User Management',
      title: 'User Management',
      type: 'navigation'
    },
    'navigate_to_reports': {
      href: '/admin?section=Reports & Analytics',
      title: 'Reports & Analytics',
      type: 'navigation'
    },
    'navigate_to_recordings': {
      href: '/call-recordings',
      title: 'Call Recordings',
      type: 'navigation'
    },
    'create_campaign': {
      href: '/admin?section=Campaigns&action=create',
      title: 'Create New Campaign',
      type: 'action'
    },
    'create_user': {
      href: '/admin?section=User Management&action=create',
      title: 'Create New User',
      type: 'action'
    },
    'create_flow': {
      href: '/admin?section=Flows&action=create',
      title: 'Create New Flow',
      type: 'action'
    },
    'show_help': {
      href: '#',
      title: 'Voice Commands Help',
      type: 'help',
      commands: [
        'Take me to campaigns',
        'Go to my most used section',
        'Create new user',
        'Show me reports',
        'Open call recordings'
      ]
    }
  };

  return actionMap[action] || { href: '/admin', title: 'Admin Dashboard', type: 'fallback' };
}

/**
 * Get mobile-optimized action layout
 */
async function getMobileActionLayout(userId: string, organizationId: string): Promise<any> {
  return {
    quickGrid: [
      {
        id: 'mobile-campaigns',
        title: 'Campaigns',
        icon: 'MegaphoneIcon',
        color: 'bg-green-500',
        href: '/admin?section=Campaigns',
        size: 'large'
      },
      {
        id: 'mobile-users',
        title: 'Users',
        icon: 'UsersIcon',
        color: 'bg-blue-500',
        href: '/admin?section=User Management',
        size: 'medium'
      },
      {
        id: 'mobile-reports',
        title: 'Reports',
        icon: 'ChartBarIcon',
        color: 'bg-purple-500',
        href: '/admin?section=Reports & Analytics',
        size: 'medium'
      },
      {
        id: 'mobile-recordings',
        title: 'Recordings',
        icon: 'MicrophoneIcon',
        color: 'bg-red-500',
        href: '/call-recordings',
        size: 'large'
      }
    ],
    swipeActions: [
      {
        direction: 'right',
        action: 'quick_create',
        title: 'Quick Create',
        options: ['Campaign', 'User', 'Flow']
      },
      {
        direction: 'left', 
        action: 'recent_items',
        title: 'Recent Items',
        maxItems: 5
      }
    ],
    voiceEnabled: true,
    gestureEnabled: true
  };
}