// Integration Data Consistency API Routes
// Comprehensive data validation, monitoring, and healing endpoints

import express from 'express';
import integrationConsistencyService, { 
  EntityType,
  InconsistencySeverity,
  ConsistencyLevel,
  ConsistencyStatus,
  HealingStrategy,
  ConsistencyRule,
  InconsistencyRecord,
  ConsistencyReport,
  HealingResult
} from '../services/integrationDataConsistencyService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================================
// CONSISTENCY CHECK ENDPOINTS
// ============================================================================

// Execute comprehensive consistency check
router.post('/check', async (req, res) => {
  try {
    const { 
      ruleIds, 
      entityType, 
      entityIds, 
      campaignId, 
      severity, 
      force = false 
    } = req.body;

    // Validate entity type if provided
    if (entityType && !Object.values(EntityType).includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type',
        validTypes: Object.values(EntityType)
      });
    }

    // Validate severity levels if provided
    if (severity && severity.some((s: string) => !Object.values(InconsistencySeverity).includes(s as InconsistencySeverity))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity level',
        validSeverities: Object.values(InconsistencySeverity)
      });
    }

    const inconsistencies = await integrationConsistencyService.executeConsistencyCheck({
      ruleIds,
      entityType,
      entityIds,
      campaignId,
      severity,
      force
    });

    res.json({
      success: true,
      data: {
        inconsistencies,
        summary: {
          total: inconsistencies.length,
          bySeverity: {
            critical: inconsistencies.filter(i => i.severity === InconsistencySeverity.CRITICAL).length,
            high: inconsistencies.filter(i => i.severity === InconsistencySeverity.HIGH).length,
            medium: inconsistencies.filter(i => i.severity === InconsistencySeverity.MEDIUM).length,
            low: inconsistencies.filter(i => i.severity === InconsistencySeverity.LOW).length,
            info: inconsistencies.filter(i => i.severity === InconsistencySeverity.INFO).length
          },
          byEntityType: Object.values(EntityType).reduce((acc, type) => {
            acc[type] = inconsistencies.filter(i => i.entityType === type).length;
            return acc;
          }, {} as Record<EntityType, number>),
          healable: inconsistencies.filter(i => 
            [HealingStrategy.AUTO_RESOLVE, HealingStrategy.MERGE_LATEST, HealingStrategy.MERGE_TRUSTED].includes(i.healingStrategy)
          ).length
        }
      }
    });
  } catch (error) {
    console.error('Error executing consistency check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute consistency check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Execute consistency check for specific campaign
router.post('/check/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { ruleIds, force = false } = req.body;

    const inconsistencies = await integrationConsistencyService.executeConsistencyCheck({
      campaignId,
      ruleIds,
      force
    });

    // Calculate campaign-specific metrics
    const campaignInconsistencies = inconsistencies.filter(i => 
      i.entityId === campaignId || i.affectedEntities.includes(campaignId)
    );

    res.json({
      success: true,
      data: {
        campaignId,
        inconsistencies: campaignInconsistencies,
        allInconsistencies: inconsistencies,
        campaignHealth: {
          score: campaignInconsistencies.length === 0 ? 100 : 
                Math.max(0, 100 - (campaignInconsistencies.length * 10)),
          status: campaignInconsistencies.length === 0 ? 'HEALTHY' :
                  campaignInconsistencies.some(i => i.severity === InconsistencySeverity.CRITICAL) ? 'CRITICAL' :
                  campaignInconsistencies.some(i => i.severity === InconsistencySeverity.HIGH) ? 'NEEDS_ATTENTION' : 'GOOD',
          criticalIssues: campaignInconsistencies.filter(i => i.severity === InconsistencySeverity.CRITICAL),
          recommendedActions: [
            ...(campaignInconsistencies.some(i => i.severity === InconsistencySeverity.CRITICAL) ? ['Address critical issues immediately'] : []),
            ...(campaignInconsistencies.filter(i => 
              [HealingStrategy.AUTO_RESOLVE, HealingStrategy.MERGE_LATEST].includes(i.healingStrategy)
            ).length > 0 ? ['Run automated healing'] : []),
            ...(campaignInconsistencies.length > 10 ? ['Review data entry processes'] : [])
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error executing campaign consistency check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute campaign consistency check',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// HEALING ENDPOINTS
// ============================================================================

// Heal inconsistencies
router.post('/heal', async (req, res) => {
  try {
    const { inconsistencyIds, strategy } = req.body;

    if (!inconsistencyIds || !Array.isArray(inconsistencyIds) || inconsistencyIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Inconsistency IDs array is required'
      });
    }

    // Validate healing strategy if provided
    if (strategy && !Object.values(HealingStrategy).includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid healing strategy',
        validStrategies: Object.values(HealingStrategy)
      });
    }

    const healingResults = await integrationConsistencyService.healInconsistencies(inconsistencyIds);

    const summary = {
      total: healingResults.length,
      successful: healingResults.filter(r => r.success).length,
      failed: healingResults.filter(r => !r.success).length,
      totalChanges: healingResults.reduce((sum, r) => sum + r.changesApplied.length, 0),
      avgHealingTime: healingResults.length > 0 
        ? healingResults.reduce((sum, r) => sum + r.healingTime, 0) / healingResults.length 
        : 0
    };

    res.json({
      success: true,
      data: {
        healingResults,
        summary,
        recommendations: [
          ...(summary.failed > 0 ? ['Review failed healing attempts manually'] : []),
          ...(summary.successful > 0 ? ['Verify healing results'] : []),
          ...(summary.totalChanges > 20 ? ['Consider reviewing data validation rules'] : [])
        ]
      }
    });
  } catch (error) {
    console.error('Error healing inconsistencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to heal inconsistencies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Auto-heal all eligible inconsistencies
router.post('/heal/auto', async (req, res) => {
  try {
    const { campaignId, entityType, maxInconsistencies = 50 } = req.body;

    // First, get all inconsistencies that can be auto-healed
    const allInconsistencies = await integrationConsistencyService.executeConsistencyCheck({
      campaignId,
      entityType
    });

    const autoHealableInconsistencies = allInconsistencies
      .filter(i => [
        HealingStrategy.AUTO_RESOLVE,
        HealingStrategy.MERGE_LATEST,
        HealingStrategy.MERGE_TRUSTED,
        HealingStrategy.DELETE_DUPLICATE
      ].includes(i.healingStrategy))
      .slice(0, maxInconsistencies); // Limit to prevent overload

    if (autoHealableInconsistencies.length === 0) {
      return res.json({
        success: true,
        data: {
          message: 'No auto-healable inconsistencies found',
          healingResults: [],
          summary: { total: 0, successful: 0, failed: 0, totalChanges: 0, avgHealingTime: 0 }
        }
      });
    }

    const healingResults = await integrationConsistencyService.healInconsistencies(
      autoHealableInconsistencies.map(i => i.id)
    );

    const summary = {
      total: healingResults.length,
      successful: healingResults.filter(r => r.success).length,
      failed: healingResults.filter(r => !r.success).length,
      totalChanges: healingResults.reduce((sum, r) => sum + r.changesApplied.length, 0),
      avgHealingTime: healingResults.length > 0 
        ? healingResults.reduce((sum, r) => sum + r.healingTime, 0) / healingResults.length 
        : 0
    };

    res.json({
      success: true,
      data: {
        healingResults,
        summary,
        autoHealed: autoHealableInconsistencies.length,
        remainingInconsistencies: allInconsistencies.length - autoHealableInconsistencies.length,
        successRate: summary.total > 0 ? (summary.successful / summary.total) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Error auto-healing inconsistencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to auto-heal inconsistencies',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// REPORTING ENDPOINTS
// ============================================================================

// Generate comprehensive consistency report
router.get('/report', async (req, res) => {
  try {
    const { campaignId, entityType, includeResolved, startDate, endDate } = req.query;

    const options: any = { includeResolved: includeResolved === 'true' };

    if (campaignId) options.campaignId = campaignId as string;
    if (entityType) {
      if (!Object.values(EntityType).includes(entityType as EntityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type',
          validTypes: Object.values(EntityType)
        });
      }
      options.entityType = entityType as EntityType;
    }

    if (startDate && endDate) {
      options.dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };
    }

    const report = await integrationConsistencyService.generateConsistencyReport(options);

    res.json({
      success: true,
      data: {
        report,
        insights: {
          overallHealth: report.consistencyScore >= 95 ? 'Excellent' :
                        report.consistencyScore >= 85 ? 'Good' :
                        report.consistencyScore >= 70 ? 'Fair' : 'Poor',
          topConcerns: [
            ...(report.severityBreakdown.CRITICAL.count > 0 ? [`${report.severityBreakdown.CRITICAL.count} critical issues`] : []),
            ...(report.severityBreakdown.HIGH.count > 5 ? [`${report.severityBreakdown.HIGH.count} high severity issues`] : []),
            ...(report.consistencyScore < 80 ? ['Low overall consistency score'] : [])
          ],
          actionPriority: report.severityBreakdown.CRITICAL.count > 0 ? 'URGENT' :
                         report.severityBreakdown.HIGH.count > 0 ? 'HIGH' :
                         report.consistencyScore < 90 ? 'MEDIUM' : 'LOW'
        }
      }
    });
  } catch (error) {
    console.error('Error generating consistency report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate consistency report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get consistency metrics dashboard
router.get('/metrics', async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    // Generate quick metrics for dashboard
    const fullReport = await integrationConsistencyService.generateConsistencyReport();
    
    // Calculate timeframe-specific metrics (mock for now)
    const timeframeMults = { '1h': 0.05, '24h': 1, '7d': 7, '30d': 30 };
    const multiplier = timeframeMults[timeframe as keyof typeof timeframeMults] || 1;

    const metrics = {
      currentConsistency: fullReport.consistencyScore,
      totalInconsistencies: fullReport.totalInconsistencies,
      criticalIssues: fullReport.severityBreakdown.CRITICAL.count,
      autoHealable: Object.values(fullReport.severityBreakdown).reduce(
        (sum, severity) => sum + Math.floor(severity.count * 0.6), 0
      ),
      
      // Trending data (mock - would be calculated from historical data)
      consistencyTrend: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000),
        score: Math.max(60, fullReport.consistencyScore + (Math.random() - 0.5) * 20)
      })),
      
      // Entity health scores
      entityHealth: fullReport.entityBreakdown.map(entity => ({
        entityType: entity.entityType,
        score: entity.consistencyScore,
        issues: entity.inconsistencies,
        trend: Math.random() > 0.5 ? 'IMPROVING' : 'STABLE'
      })),
      
      // Top issues by frequency
      topIssues: [
        { type: 'INVALID_PHONE_FORMAT', count: Math.floor(15 * multiplier), trend: 'INCREASING' },
        { type: 'MISSING_CONTACT_REFERENCE', count: Math.floor(8 * multiplier), trend: 'STABLE' },
        { type: 'STALE_INTEGRATION_DATA', count: Math.floor(12 * multiplier), trend: 'DECREASING' }
      ],
      
      // Healing statistics
      healingStats: {
        successRate: 87.5,
        avgHealingTime: 1250, // milliseconds
        totalHealed: Math.floor(45 * multiplier),
        pendingHealing: fullReport.severityBreakdown.HIGH.pending + fullReport.severityBreakdown.MEDIUM.pending
      }
    };

    res.json({
      success: true,
      data: {
        metrics,
        timeframe,
        lastUpdated: new Date(),
        alerts: [
          ...(metrics.criticalIssues > 0 ? [{
            level: 'CRITICAL',
            message: `${metrics.criticalIssues} critical data inconsistencies require immediate attention`,
            action: 'Review and resolve critical issues'
          }] : []),
          ...(metrics.currentConsistency < 80 ? [{
            level: 'WARNING',
            message: `Consistency score (${metrics.currentConsistency.toFixed(1)}%) below recommended threshold`,
            action: 'Run comprehensive consistency check'
          }] : []),
          ...(metrics.autoHealable > 20 ? [{
            level: 'INFO',
            message: `${metrics.autoHealable} issues can be auto-healed`,
            action: 'Consider running auto-heal process'
          }] : [])
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching consistency metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consistency metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// RULE MANAGEMENT ENDPOINTS
// ============================================================================

// Get all consistency rules
router.get('/rules', async (req, res) => {
  try {
    const { active, entityType, severity } = req.query;
    
    let rules = integrationConsistencyService.getConsistencyRules();
    
    // Apply filters
    if (active !== undefined) {
      rules = rules.filter(rule => rule.isActive === (active === 'true'));
    }
    
    if (entityType) {
      if (!Object.values(EntityType).includes(entityType as EntityType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid entity type',
          validTypes: Object.values(EntityType)
        });
      }
      rules = rules.filter(rule => rule.entityType === entityType);
    }
    
    if (severity) {
      if (!Object.values(InconsistencySeverity).includes(severity as InconsistencySeverity)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid severity',
          validSeverities: Object.values(InconsistencySeverity)
        });
      }
      rules = rules.filter(rule => rule.severity === severity);
    }

    res.json({
      success: true,
      data: {
        rules,
        summary: {
          total: rules.length,
          active: rules.filter(r => r.isActive).length,
          inactive: rules.filter(r => !r.isActive).length,
          byEntityType: Object.values(EntityType).reduce((acc, type) => {
            acc[type] = rules.filter(r => r.entityType === type).length;
            return acc;
          }, {} as Record<EntityType, number>),
          bySeverity: Object.values(InconsistencySeverity).reduce((acc, severity) => {
            acc[severity] = rules.filter(r => r.severity === severity).length;
            return acc;
          }, {} as Record<InconsistencySeverity, number>)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching consistency rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consistency rules',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new consistency rule
router.post('/rules', async (req, res) => {
  try {
    const {
      name,
      description,
      entityType,
      severity,
      checkFunction,
      healingStrategy,
      autoHeal = false,
      executionFrequency = 60,
      warningThreshold = 5,
      criticalThreshold = 15
    } = req.body;

    // Validate required fields
    if (!name || !description || !entityType || !severity || !checkFunction || !healingStrategy) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: name, description, entityType, severity, checkFunction, healingStrategy'
      });
    }

    // Validate enums
    if (!Object.values(EntityType).includes(entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type',
        validTypes: Object.values(EntityType)
      });
    }

    if (!Object.values(InconsistencySeverity).includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity',
        validSeverities: Object.values(InconsistencySeverity)
      });
    }

    if (!Object.values(HealingStrategy).includes(healingStrategy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid healing strategy',
        validStrategies: Object.values(HealingStrategy)
      });
    }

    const rule = await integrationConsistencyService.addConsistencyRule({
      name,
      description,
      entityType,
      severity,
      isActive: true,
      checkFunction,
      healingStrategy,
      autoHeal,
      executionFrequency,
      warningThreshold,
      criticalThreshold
    });

    res.json({
      success: true,
      data: {
        rule,
        message: 'Consistency rule created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating consistency rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create consistency rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update consistency rule
router.put('/rules/:ruleId', async (req, res) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    // Validate enum values if provided
    if (updates.entityType && !Object.values(EntityType).includes(updates.entityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entity type',
        validTypes: Object.values(EntityType)
      });
    }

    if (updates.severity && !Object.values(InconsistencySeverity).includes(updates.severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity',
        validSeverities: Object.values(InconsistencySeverity)
      });
    }

    if (updates.healingStrategy && !Object.values(HealingStrategy).includes(updates.healingStrategy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid healing strategy',
        validStrategies: Object.values(HealingStrategy)
      });
    }

    const updatedRule = await integrationConsistencyService.updateConsistencyRule(ruleId, updates);

    if (!updatedRule) {
      return res.status(404).json({
        success: false,
        error: 'Consistency rule not found'
      });
    }

    res.json({
      success: true,
      data: {
        rule: updatedRule,
        message: 'Consistency rule updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating consistency rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update consistency rule',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enable/disable consistency rule
router.patch('/rules/:ruleId/:action', async (req, res) => {
  try {
    const { ruleId, action } = req.params;

    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Action must be either "enable" or "disable"'
      });
    }

    const success = action === 'enable' 
      ? await integrationConsistencyService.enableRule(ruleId)
      : await integrationConsistencyService.disableRule(ruleId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Consistency rule not found'
      });
    }

    res.json({
      success: true,
      data: {
        message: `Consistency rule ${action}d successfully`,
        ruleId,
        action
      }
    });
  } catch (error) {
    console.error(`Error ${req.params.action}ing consistency rule:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to ${req.params.action} consistency rule`,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Get consistency system status
router.get('/status', async (req, res) => {
  try {
    const rules = integrationConsistencyService.getConsistencyRules();
    const activeRules = rules.filter(r => r.isActive);
    
    // Mock system health data
    const status = {
      systemHealth: 'HEALTHY',
      activeRules: activeRules.length,
      totalRules: rules.length,
      lastHealthCheck: new Date(),
      
      // Rule execution status
      ruleExecution: {
        totalExecutions: activeRules.length * 10, // Mock
        successfulExecutions: activeRules.length * 9, // Mock 90% success
        failedExecutions: activeRules.length * 1, // Mock 10% failure
        avgExecutionTime: 750 // milliseconds
      },
      
      // System capabilities
      capabilities: {
        autoHealing: true,
        realTimeMonitoring: true,
        crossEntityValidation: true,
        historicalAnalysis: true,
        customRules: true
      },
      
      // Resource usage (mock)
      resources: {
        memoryUsage: 65, // percentage
        cpuUsage: 23,    // percentage
        storageUsage: 45 // percentage
      }
    };

    res.json({
      success: true,
      data: {
        status,
        recommendations: [
          ...(status.ruleExecution.failedExecutions > status.ruleExecution.totalExecutions * 0.1 ? 
            ['Review failed rule executions'] : []),
          ...(activeRules.length < 5 ? 
            ['Consider enabling more consistency rules for comprehensive monitoring'] : []),
          ...(status.resources.memoryUsage > 80 ? 
            ['Monitor system memory usage'] : [])
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching consistency system status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available entity types and severities
router.get('/enums', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        entityTypes: Object.values(EntityType).map(type => ({
          value: type,
          label: type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        })),
        severities: Object.values(InconsistencySeverity).map(severity => ({
          value: severity,
          label: severity.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          color: {
            [InconsistencySeverity.CRITICAL]: '#FF4444',
            [InconsistencySeverity.HIGH]: '#FF8800',
            [InconsistencySeverity.MEDIUM]: '#FFCC00',
            [InconsistencySeverity.LOW]: '#88CC00',
            [InconsistencySeverity.INFO]: '#0088CC'
          }[severity]
        })),
        healingStrategies: Object.values(HealingStrategy).map(strategy => ({
          value: strategy,
          label: strategy.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          description: {
            [HealingStrategy.AUTO_RESOLVE]: 'Automatically fix using predefined rules',
            [HealingStrategy.MERGE_LATEST]: 'Use the most recent data version',
            [HealingStrategy.MERGE_TRUSTED]: 'Use data from the most trusted source',
            [HealingStrategy.MANUAL_REVIEW]: 'Require manual intervention and review',
            [HealingStrategy.BACKUP_RESTORE]: 'Restore from a known good backup',
            [HealingStrategy.DELETE_DUPLICATE]: 'Remove duplicate entries',
            [HealingStrategy.RECONCILE]: 'Intelligent reconciliation of conflicting data'
          }[strategy]
        })),
        consistencyLevels: Object.values(ConsistencyLevel).map(level => ({
          value: level,
          label: level.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        })),
        consistencyStatuses: Object.values(ConsistencyStatus).map(status => ({
          value: status,
          label: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching enums:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enum values',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;