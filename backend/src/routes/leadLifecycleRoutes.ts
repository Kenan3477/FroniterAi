// Lead Lifecycle Management API Routes
// Comprehensive lead progression tracking and analytics

import express from 'express';
import leadLifecycleService, { 
  LeadLifecycleStage, 
  LeadLifecycleEntry,
  LifecycleAnalytics,
  CampaignLifecycleAnalysis,
  StageCategory 
} from '../services/leadLifecycleService';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// ============================================================================
// LIFECYCLE MANAGEMENT ENDPOINTS
// ============================================================================

// Create new lead lifecycle entry
router.post('/create', async (req, res) => {
  try {
    const { contactId, campaignId, agentId, initialStage, estimatedValue } = req.body;

    if (!contactId || !campaignId) {
      return res.status(400).json({
        success: false,
        error: 'Contact ID and Campaign ID are required'
      });
    }

    const lifecycle = await leadLifecycleService.createLeadLifecycle({
      contactId,
      campaignId,
      agentId: agentId || req.user?.userId,
      initialStage,
      estimatedValue
    });

    res.json({
      success: true,
      data: {
        lifecycle,
        message: 'Lead lifecycle created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating lead lifecycle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lead lifecycle',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Transition lead to new stage
router.post('/transition', async (req, res) => {
  try {
    const { lifecycleId, newStage, reason, metadata } = req.body;

    if (!lifecycleId || !newStage || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Lifecycle ID, new stage, and reason are required'
      });
    }

    // Validate stage
    if (!Object.values(LeadLifecycleStage).includes(newStage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lifecycle stage',
        validStages: Object.values(LeadLifecycleStage)
      });
    }

    const updatedLifecycle = await leadLifecycleService.transitionStage(
      lifecycleId,
      newStage,
      reason,
      req.user?.userId,
      metadata
    );

    res.json({
      success: true,
      data: {
        lifecycle: updatedLifecycle,
        message: `Lead transitioned to ${newStage} successfully`,
        transition: {
          previousStage: updatedLifecycle.previousStage,
          newStage: updatedLifecycle.currentStage,
          reason,
          timestamp: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Error transitioning lead stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transition lead stage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update engagement metrics
router.put('/engagement/:lifecycleId', async (req, res) => {
  try {
    const { lifecycleId } = req.params;
    const { 
      responseRate, 
      meetingAcceptanceRate, 
      lastContactAt, 
      estimatedValue,
      actualValue 
    } = req.body;

    const updatedLifecycle = await leadLifecycleService.updateEngagementMetrics(
      lifecycleId,
      {
        responseRate,
        meetingAcceptanceRate,
        lastContactAt: lastContactAt ? new Date(lastContactAt) : undefined,
        estimatedValue,
        actualValue
      }
    );

    res.json({
      success: true,
      data: {
        lifecycle: updatedLifecycle,
        message: 'Engagement metrics updated successfully',
        metrics: {
          leadScore: updatedLifecycle.leadScore,
          leadScoreCategory: updatedLifecycle.leadScoreCategory,
          engagementScore: updatedLifecycle.engagementScore,
          conversionProbability: updatedLifecycle.conversionProbability
        }
      }
    });
  } catch (error) {
    console.error('Error updating engagement metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update engagement metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get lead lifecycle by ID
router.get('/lifecycle/:lifecycleId', async (req, res) => {
  try {
    const { lifecycleId } = req.params;
    
    // This would query the database in production
    const lifecycle = await leadLifecycleService.getLifecycleById(lifecycleId);
    
    if (!lifecycle) {
      return res.status(404).json({
        success: false,
        error: 'Lead lifecycle not found'
      });
    }

    res.json({
      success: true,
      data: {
        lifecycle,
        summary: {
          stage: lifecycle.currentStage,
          stageCategory: lifecycle.stageCategory,
          daysInStage: lifecycle.daysInCurrentStage,
          totalDays: lifecycle.totalDaysInLifecycle,
          leadScore: lifecycle.leadScore,
          conversionProbability: lifecycle.conversionProbability,
          nextActions: lifecycle.recommendedActions
        }
      }
    });
  } catch (error) {
    console.error('Error fetching lead lifecycle:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lead lifecycle',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get lifecycle history
router.get('/history/:lifecycleId', async (req, res) => {
  try {
    const { lifecycleId } = req.params;
    
    const lifecycle = await leadLifecycleService.getLifecycleById(lifecycleId);
    
    if (!lifecycle) {
      return res.status(404).json({
        success: false,
        error: 'Lead lifecycle not found'
      });
    }

    const history = lifecycle.stageHistory.map(entry => ({
      ...entry,
      stageCategory: entry.toStage ? leadLifecycleService.getStageCategory(entry.toStage) : null,
      isTerminal: entry.toStage ? leadLifecycleService.isTerminalStage(entry.toStage) : false
    }));

    res.json({
      success: true,
      data: {
        history,
        summary: {
          totalTransitions: lifecycle.stageTransitionCount,
          avgStageDuration: lifecycle.totalDaysInLifecycle / Math.max(1, lifecycle.stageTransitionCount),
          currentStage: lifecycle.currentStage,
          timeInLifecycle: lifecycle.totalDaysInLifecycle
        }
      }
    });
  } catch (error) {
    console.error('Error fetching lifecycle history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lifecycle history',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ANALYTICS ENDPOINTS
// ============================================================================

// Get campaign lifecycle analytics
router.get('/analytics/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { dateRange } = req.query;

    const analytics = await leadLifecycleService.getCampaignLifecycleAnalytics(campaignId);

    res.json({
      success: true,
      data: {
        analytics,
        summary: {
          performance: `${analytics.conversionRate.toFixed(1)}% conversion rate`,
          pipeline: `£${analytics.totalPipelineValue.toLocaleString()} pipeline value`,
          velocity: `${analytics.leadVelocity.toFixed(1)} leads progressing per day`,
          health: analytics.stagnationRate < 20 ? 'Healthy' : 
                 analytics.stagnationRate < 40 ? 'Needs Attention' : 'Critical'
        },
        recommendations: [
          analytics.conversionRate < 20 ? 'Focus on improving qualification criteria' : null,
          analytics.stagnationRate > 30 ? 'Implement automated follow-up sequences' : null,
          analytics.avgLeadScore < 60 ? 'Enhance lead scoring accuracy' : null
        ].filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Error fetching campaign analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get detailed campaign lifecycle analysis
router.get('/analysis/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;

    const analysis = await leadLifecycleService.getCampaignLifecycleAnalysis(campaignId);

    res.json({
      success: true,
      data: {
        analysis,
        insights: {
          financialHealth: analysis.roi > 200 ? 'Excellent' :
                          analysis.roi > 100 ? 'Good' :
                          analysis.roi > 0 ? 'Profitable' : 'Needs Improvement',
          efficiencyRating: analysis.avgTimeToConversion < 30 ? 'Fast' :
                           analysis.avgTimeToConversion < 60 ? 'Average' : 'Slow',
          valuePerLead: `£${analysis.avgDealSize.toFixed(0)}`,
          costEfficiency: `£${analysis.costPerLead.toFixed(0)} per lead, £${analysis.costPerConversion.toFixed(0)} per conversion`
        },
        topOpportunities: analysis.optimizationOpportunities.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('Error fetching campaign analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get stage performance analytics
router.get('/analytics/stages/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const analytics = await leadLifecycleService.getCampaignLifecycleAnalytics(campaignId);
    
    // Enhanced stage performance with recommendations
    const stagePerformance = analytics.stageDistribution.map(stage => {
      const optimalDuration = leadLifecycleService.getOptimalStageDuration(stage.stage);
      const isStagnant = stage.avgDaysInStage > optimalDuration * 1.5;
      const isLowConversion = stage.conversionRate < 50;
      
      return {
        ...stage,
        optimalDuration,
        isStagnant,
        isLowConversion,
        performance: stage.conversionRate > 70 ? 'Excellent' :
                    stage.conversionRate > 50 ? 'Good' :
                    stage.conversionRate > 30 ? 'Average' : 'Needs Improvement',
        recommendations: [
          isStagnant ? 'Implement automated follow-ups to reduce stage duration' : null,
          isLowConversion ? 'Review stage criteria and improve qualification process' : null,
          stage.count === 0 ? 'No leads in this stage - consider marketing strategies' : null
        ].filter(Boolean)
      };
    });

    res.json({
      success: true,
      data: {
        stagePerformance,
        conversionFunnel: analytics.conversionFunnel,
        summary: {
          bestPerformingStage: stagePerformance.reduce((best, current) => 
            current.conversionRate > best.conversionRate ? current : best
          ),
          bottleneckStage: stagePerformance.reduce((bottleneck, current) => 
            current.avgDaysInStage > bottleneck.avgDaysInStage ? current : bottleneck
          )
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stage analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stage analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get agent performance analytics
router.get('/analytics/agents/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const analytics = await leadLifecycleService.getCampaignLifecycleAnalytics(campaignId);
    
    // Enhanced agent performance with rankings and recommendations
    const agentPerformance = analytics.agentPerformance.map((agent, index) => {
      const avgConversion = analytics.agentPerformance.reduce((sum, a) => sum + a.conversionRate, 0) 
                           / analytics.agentPerformance.length;
      const avgScore = analytics.agentPerformance.reduce((sum, a) => sum + a.avgLeadScore, 0) 
                      / analytics.agentPerformance.length;
      
      return {
        ...agent,
        ranking: index + 1,
        performanceRating: agent.conversionRate > avgConversion * 1.2 ? 'Excellent' :
                          agent.conversionRate > avgConversion ? 'Above Average' :
                          agent.conversionRate > avgConversion * 0.8 ? 'Average' : 'Needs Improvement',
        strengthAreas: [
          agent.conversionRate > avgConversion ? 'High conversion rate' : null,
          agent.avgTimeToConversion < 45 ? 'Fast conversion speed' : null,
          agent.avgLeadScore > avgScore ? 'High lead quality management' : null
        ].filter(Boolean),
        improvementAreas: [
          agent.conversionRate < avgConversion * 0.8 ? 'Focus on conversion techniques' : null,
          agent.avgTimeToConversion > 90 ? 'Improve follow-up cadence' : null,
          agent.avgLeadScore < avgScore * 0.8 ? 'Enhance lead qualification' : null
        ].filter(Boolean)
      };
    });

    res.json({
      success: true,
      data: {
        agentPerformance,
        teamMetrics: {
          totalAgents: agentPerformance.length,
          avgConversionRate: analytics.agentPerformance.reduce((sum, a) => sum + a.conversionRate, 0) / analytics.agentPerformance.length,
          topPerformer: agentPerformance[0],
          teamTotalValue: analytics.agentPerformance.reduce((sum, a) => sum + a.totalValue, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching agent analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// LIFECYCLE QUERIES
// ============================================================================

// Get leads by stage
router.get('/leads/stage/:stage', async (req, res) => {
  try {
    const { stage } = req.params;
    const { campaignId, agentId, scoreRange, limit = 50 } = req.query;

    if (!Object.values(LeadLifecycleStage).includes(stage as LeadLifecycleStage)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid lifecycle stage',
        validStages: Object.values(LeadLifecycleStage)
      });
    }

    // Mock query - would be actual database query in production
    const leads = await leadLifecycleService.getLeadsByStage(stage as LeadLifecycleStage, {
      campaignId: campaignId as string,
      agentId: agentId as string,
      scoreRange: scoreRange as string,
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: {
        leads,
        stage,
        total: leads.length,
        summary: {
          avgScore: leads.length > 0 ? leads.reduce((sum: number, l: LeadLifecycleEntry) => sum + l.leadScore, 0) / leads.length : 0,
          avgDaysInStage: leads.length > 0 ? leads.reduce((sum: number, l: LeadLifecycleEntry) => sum + l.daysInCurrentStage, 0) / leads.length : 0,
          totalValue: leads.reduce((sum: number, l: LeadLifecycleEntry) => sum + l.estimatedValue, 0)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching leads by stage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leads by stage',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get stagnant leads (leads stuck in stages too long)
router.get('/leads/stagnant/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { daysThreshold = 30, limit = 50 } = req.query;

    const stagnantLeads = await leadLifecycleService.getStagnantLeads(campaignId, {
      daysThreshold: parseInt(daysThreshold as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: {
        stagnantLeads,
        total: stagnantLeads.length,
        actionPlan: {
          immediateActions: [
            'Contact leads stuck in stages > 30 days',
            'Review qualification criteria',
            'Implement automated follow-up sequences'
          ],
          recommendations: stagnantLeads.map((lead: LeadLifecycleEntry) => ({
            leadId: lead.id,
            stage: lead.currentStage,
            daysStagnant: lead.daysInCurrentStage,
            suggestedActions: lead.recommendedActions,
            urgency: lead.daysInCurrentStage > 60 ? 'High' : 
                    lead.daysInCurrentStage > 30 ? 'Medium' : 'Low'
          }))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching stagnant leads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stagnant leads',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get high-value prospects
router.get('/prospects/high-value/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { valueThreshold = 1000, scoreThreshold = 70, limit = 25 } = req.query;

    const highValueProspects = await leadLifecycleService.getHighValueProspects(campaignId, {
      valueThreshold: parseFloat(valueThreshold as string),
      scoreThreshold: parseInt(scoreThreshold as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: {
        prospects: highValueProspects,
        total: highValueProspects.length,
        totalValue: highValueProspects.reduce((sum: number, p: LeadLifecycleEntry) => sum + p.estimatedValue, 0),
        actionPlan: {
          priority: 'High - Focus on immediate contact',
          recommendations: [
            'Prioritize personal attention from senior agents',
            'Accelerate follow-up cadence',
            'Prepare customized value propositions',
            'Schedule executive-level meetings'
          ],
          expectedOutcomes: {
            conversionRate: '40-60%',
            avgTimeToClose: '15-30 days',
            totalExpectedRevenue: highValueProspects.reduce((sum: number, p: LeadLifecycleEntry) => sum + (p.estimatedValue * p.conversionProbability / 100), 0)
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching high-value prospects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch high-value prospects',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Get available lifecycle stages
router.get('/stages', (req, res) => {
  try {
    const stages = Object.values(LeadLifecycleStage).map(stage => ({
      value: stage,
      label: stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
      category: leadLifecycleService.getStageCategory(stage),
      isTerminal: leadLifecycleService.isTerminalStage(stage),
      optimalDuration: leadLifecycleService.getOptimalStageDuration(stage),
      recommendedActions: leadLifecycleService.getRecommendedActions(stage)
    }));

    res.json({
      success: true,
      data: {
        stages,
        categories: Object.values(StageCategory),
        transitionRules: leadLifecycleService.getStageTransitions()
      }
    });
  } catch (error) {
    console.error('Error fetching lifecycle stages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch lifecycle stages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;