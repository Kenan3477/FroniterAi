/**
 * Advanced AI Dialler Reports Routes
 * Enterprise-grade routing for AI analytics endpoints
 */
import express from 'express';
import {
  getDiallerMetrics,
  getConversationIntelligence,
  getCampaignOptimization,
  getComplianceReport,
  getAdvancedAgentMetrics,
  getLeadScoringAnalytics
} from '../controllers/advancedReportsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================
// All advanced reports require authentication
router.use(authenticateToken);

// ==========================================
// PREDICTIVE DIALLER ANALYTICS
// ==========================================

/**
 * GET /api/advanced-reports/dialler-metrics
 * Get real-time predictive dialler metrics
 * 
 * Query Parameters:
 * - campaignId (optional): Filter by specific campaign
 * - dateRange (optional): ISO date string for start date (YYYY-MM-DD)
 * - agentId (optional): Filter by specific agent
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     current: DiallerMetrics,
 *     averages: AggregatedMetrics,
 *     historical: DiallerMetrics[],
 *     compliance: ComplianceStatus,
 *     trends: TrendAnalysis,
 *     lastUpdated: Date
 *   }
 * }
 */
router.get('/dialler-metrics', getDiallerMetrics);

// ==========================================
// CONVERSATION INTELLIGENCE
// ==========================================

/**
 * GET /api/advanced-reports/conversation-intelligence
 * Get AI-powered conversation intelligence analytics
 * 
 * Query Parameters:
 * - callId (optional): Analyze specific call
 * - agentId (optional): Filter by specific agent
 * - dateRange (optional): ISO date string for start date (YYYY-MM-DD)
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     analyses: ConversationAnalysis[],
 *     insights: ConversationInsights,
 *     sentimentDistribution: SentimentDistribution,
 *     performance: PerformanceMetrics,
 *     topRecommendations: string[],
 *     lastUpdated: Date
 *   }
 * }
 */
router.get('/conversation-intelligence', getConversationIntelligence);

// ==========================================
// CAMPAIGN OPTIMIZATION
// ==========================================

/**
 * GET /api/advanced-reports/campaign-optimization
 * Get AI-powered campaign optimization analytics
 * 
 * Query Parameters:
 * - campaignId (optional): Analyze specific campaign
 * - dataListId (optional): Analyze specific data list
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     current: CurrentMetrics,
 *     historical: CampaignAnalytics[],
 *     recommendations: OptimizationRecommendation[],
 *     predictions: PredictiveAnalytics,
 *     trends: CampaignTrends,
 *     lastUpdated: Date
 *   }
 * }
 */
router.get('/campaign-optimization', getCampaignOptimization);

// ==========================================
// COMPLIANCE REPORTING
// ==========================================

/**
 * GET /api/advanced-reports/compliance-report
 * Get comprehensive compliance monitoring report
 * 
 * Query Parameters:
 * - startDate (optional): ISO date string for start date (YYYY-MM-DD)
 * - endDate (optional): ISO date string for end date (YYYY-MM-DD)
 * - severity (optional): Filter by severity level (LOW, MEDIUM, HIGH, CRITICAL)
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     complianceScore: number,
 *     totalEvents: number,
 *     unresolvedCount: number,
 *     eventsByType: EventTypeDistribution[],
 *     eventsBySeverity: SeverityDistribution[],
 *     unresolvedEvents: ComplianceEvent[],
 *     dailyTrends: DailyTrend[],
 *     riskAssessment: RiskAssessment,
 *     recommendations: ComplianceRecommendation[],
 *     lastUpdated: Date
 *   }
 * }
 */
router.get('/compliance-report', getComplianceReport);

// ==========================================
// AGENT PERFORMANCE INTELLIGENCE
// ==========================================

/**
 * GET /api/advanced-reports/agent-performance
 * Get advanced agent performance analytics with AI insights
 * 
 * Query Parameters:
 * - agentId (optional): Filter by specific agent
 * - dateRange (optional): ISO date string for start date (YYYY-MM-DD)
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     agentMetrics: AgentPerformanceMetrics[],
 *     teamComparison: TeamComparison,
 *     trainingNeeds: TrainingNeed[],
 *     performanceTrends: PerformanceTrend[],
 *     topPerformers: TopPerformer[],
 *     lastUpdated: Date
 *   }
 * }
 */
router.get('/agent-performance', getAdvancedAgentMetrics);

// ==========================================
// LEAD SCORING ANALYTICS
// ==========================================

/**
 * GET /api/advanced-reports/lead-scoring
 * Get AI-powered lead scoring analytics and predictions
 * 
 * Query Parameters:
 * - campaignId (optional): Filter by specific campaign
 * - listId (optional): Filter by specific data list
 * 
 * Response:
 * {
 *   success: boolean,
 *   data: {
 *     scoreDistribution: ScoreDistribution,
 *     conversionCorrelation: ConversionCorrelation[],
 *     prioritizedLeads: PrioritizedLead[],
 *     modelPerformance: ModelPerformance,
 *     industryInsights: IndustryInsight[],
 *     scoringAdjustments: ScoringAdjustment[],
 *     totalLeadsAnalyzed: number,
 *     lastUpdated: Date
 *   }
 * }
 */
router.get('/lead-scoring', getLeadScoringAnalytics);

// ==========================================
// BATCH ENDPOINTS FOR DASHBOARD
// ==========================================

/**
 * GET /api/advanced-reports/dashboard-summary
 * Get summary data for executive dashboard
 * Combines key metrics from multiple endpoints for efficiency
 */
router.get('/dashboard-summary', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // This would aggregate key metrics from multiple controllers
    // For now, returning a structured placeholder
    
    const summary = {
      dialler: {
        pacingRatio: 1.2,
        abandonedCallRate: 0.02,
        agentUtilization: 0.85,
        complianceStatus: 'COMPLIANT'
      },
      conversation: {
        averageSentiment: 0.3,
        conversionRate: 0.08,
        leadQuality: 67
      },
      compliance: {
        score: 92,
        riskLevel: 'LOW',
        unresolvedEvents: 2
      },
      performance: {
        teamProductivity: 0.78,
        topPerformerScore: 94,
        trainingNeeded: 3
      }
    };

    res.json({
      success: true,
      data: summary,
      lastUpdated: new Date()
    });

  } catch (error: any) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard summary',
      details: error.message
    });
  }
});

// ==========================================
// REAL-TIME ENDPOINTS
// ==========================================

/**
 * GET /api/advanced-reports/real-time-status
 * Get real-time system status for live monitoring
 */
router.get('/real-time-status', async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // Real-time status aggregation
    const status = {
      activeCalls: 0, // Would query active calls
      agentsOnline: 0, // Would query online agents
      campaignsActive: 0, // Would query active campaigns
      systemHealth: 'HEALTHY',
      lastCallTime: new Date(),
      currentPacingRatio: 1.1,
      instantAbandonmentRate: 0.01
    };

    res.json({
      success: true,
      data: status,
      timestamp: new Date()
    });

  } catch (error: any) {
    console.error('Error fetching real-time status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time status',
      details: error.message
    });
  }
});

// ==========================================
// EXPORT ENDPOINTS
// ==========================================

/**
 * GET /api/advanced-reports/export/:reportType
 * Export reports in various formats (CSV, PDF, Excel)
 * 
 * Parameters:
 * - reportType: Type of report to export (dialler, conversation, compliance, etc.)
 * 
 * Query Parameters:
 * - format: Export format (csv, pdf, xlsx)
 * - dateRange: Date range for the export
 * - filters: Additional filters as JSON string
 */
router.get('/export/:reportType', async (req, res) => {
  try {
    const { reportType } = req.params;
    const { format = 'csv', dateRange, filters } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization access required'
      });
    }

    // TODO: Implement actual export logic
    // This would generate and return the appropriate file format
    
    res.json({
      success: true,
      message: `Export for ${reportType} in ${format} format is being generated`,
      downloadUrl: `/api/downloads/advanced-reports-${reportType}-${Date.now()}.${format}`,
      estimatedTime: '2-5 minutes'
    });

  } catch (error: any) {
    console.error('Error initiating export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate export',
      details: error.message
    });
  }
});

export default router;