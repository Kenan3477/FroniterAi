// Call Outcome Tracking API Routes
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { callOutcomeTrackingService, CallOutcomeCategory, OutcomeImpact, OutcomeActionRequired } from '../services/callOutcomeTrackingService';
import { outcomeMappingService } from '../services/outcomeMappingService';
import { authenticate } from '../middleware/auth';
import { eventManager } from '../services/eventManager';
import { EventPriority } from '../types/events';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route POST /api/call-outcomes/record
 * @desc Record a call outcome
 * @access Private
 */
router.post('/record',
  authenticate,
  async (req, res) => {
    try {
      const {
        callId,
        category,
        impact,
        actionRequired,
        saleValue,
        leadScore,
        notes,
        tags,
        followUpDate,
        customerSatisfaction,
        outcomeConfidence
      } = req.body;

      // Validate required fields
      if (!callId || !category) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: callId, category',
        });
      }

      // Validate call exists and get details
      const call = await prisma.call.findUnique({
        where: { id: callId },
        include: {
          legs: { where: { legType: 'AGENT' } },
          campaign: true,
        },
      });

      if (!call) {
        return res.status(404).json({
          success: false,
          error: `Call ${callId} not found`,
        });
      }

      const agentLeg = call.legs[0];
      if (!agentLeg) {
        return res.status(400).json({
          success: false,
          error: 'No agent associated with this call',
        });
      }

      // Create outcome record
      const outcome = await callOutcomeTrackingService.recordCallOutcome({
        callId,
        campaignId: call.campaignId,
        agentId: agentLeg.agentId!,
        contactId: call.recordId || undefined,
        
        category: category as CallOutcomeCategory,
        impact: impact as OutcomeImpact,
        actionRequired: actionRequired as OutcomeActionRequired,
        
        saleValue,
        leadScore,
        probability: calculateProbability(category, impact),
        
        outcomeTimestamp: new Date(),
        callDuration: call.duration || 0,
        agentEffort: calculateAgentEffort(call.duration || 0),
        
        notes,
        tags: tags || [],
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        
        customerSatisfaction,
        outcomeConfidence: outcomeConfidence || 7,
        
        isVerified: false,
      });

      res.json({
        success: true,
        data: {
          outcome,
          message: 'Call outcome recorded successfully',
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error recording call outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record call outcome',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/call-outcomes/map-disposition
 * @desc Map disposition to call outcome automatically
 * @access Private
 */
router.post('/map-disposition',
  authenticate,
  async (req, res) => {
    try {
      const { callId, dispositionId, dispositionData } = req.body;

      if (!callId || !dispositionId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: callId, dispositionId',
        });
      }

      // Map disposition to outcome
      const mappingResult = await outcomeMappingService.mapDispositionToOutcome(
        callId,
        dispositionId,
        dispositionData || {}
      );

      if (!mappingResult.mapped) {
        return res.status(400).json({
          success: false,
          error: 'Disposition mapping failed',
          reason: mappingResult.reason,
        });
      }

      res.json({
        success: true,
        data: {
          mapped: true,
          outcome: mappingResult.outcome,
          reason: mappingResult.reason,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error mapping disposition to outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to map disposition to outcome',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/call-outcomes/call/:callId
 * @desc Get outcome for a specific call
 * @access Private
 */
router.get('/call/:callId',
  authenticate,
  async (req, res) => {
    try {
      const { callId } = req.params;

      const outcome = await callOutcomeTrackingService.getCallOutcome(callId);

      if (!outcome) {
        return res.status(404).json({
          success: false,
          error: `No outcome found for call ${callId}`,
        });
      }

      res.json({
        success: true,
        data: {
          outcome,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error getting call outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get call outcome',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/call-outcomes/analytics/campaign/:campaignId
 * @desc Get outcome analytics for a campaign
 * @access Private
 */
router.get('/analytics/campaign/:campaignId',
  authenticate,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { startDate, endDate, agentId } = req.query;

      // Parse dates with defaults
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate ? new Date(endDate as string) : new Date();

      // Validate campaign exists
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, name: true },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: `Campaign ${campaignId} not found`,
        });
      }

      // Generate analytics
      const analytics = await callOutcomeTrackingService.generateOutcomeAnalytics(
        campaignId,
        start,
        end,
        agentId as string | undefined
      );

      res.json({
        success: true,
        data: {
          campaign,
          analytics,
          parameters: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            agentId: agentId || null,
          },
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error generating outcome analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate outcome analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/call-outcomes/business-metrics/campaign/:campaignId
 * @desc Get business outcome metrics for a campaign
 * @access Private
 */
router.get('/business-metrics/campaign/:campaignId',
  authenticate,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { startDate, endDate } = req.query;

      // Parse dates with defaults
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Generate business outcomes
      const businessOutcome = await outcomeMappingService.generateBusinessOutcomes(
        campaignId,
        start,
        end
      );

      res.json({
        success: true,
        data: {
          businessOutcome,
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error generating business metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate business metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/call-outcomes/agent-report/:agentId
 * @desc Get agent outcome performance report
 * @access Private
 */
router.get('/agent-report/:agentId',
  authenticate,
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { startDate, endDate } = req.query;

      // Parse dates with defaults
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Validate agent exists
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: `Agent ${agentId} not found`,
        });
      }

      // Generate agent report
      const report = await callOutcomeTrackingService.generateAgentOutcomeReport(
        agentId,
        start,
        end
      );

      res.json({
        success: true,
        data: {
          report,
          period: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error generating agent report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate agent report',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/call-outcomes/impact/:impact
 * @desc Get outcomes by impact level
 * @access Private
 */
router.get('/impact/:impact',
  authenticate,
  async (req, res) => {
    try {
      const { impact } = req.params;
      const { campaignId, limit } = req.query;

      if (!Object.values(OutcomeImpact).includes(impact as OutcomeImpact)) {
        return res.status(400).json({
          success: false,
          error: `Invalid impact level: ${impact}. Valid values: ${Object.values(OutcomeImpact).join(', ')}`,
        });
      }

      if (!campaignId) {
        return res.status(400).json({
          success: false,
          error: 'campaignId is required',
        });
      }

      const outcomes = await callOutcomeTrackingService.getOutcomesByImpact(
        campaignId as string,
        impact as OutcomeImpact,
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        success: true,
        data: {
          impact,
          campaignId,
          outcomes,
          count: outcomes.length,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error getting outcomes by impact:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get outcomes by impact',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/call-outcomes/predict
 * @desc Predict call outcome for contact
 * @access Private
 */
router.post('/predict',
  authenticate,
  async (req, res) => {
    try {
      const { campaignId, contactData, historicalContext } = req.body;

      if (!campaignId || !contactData) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: campaignId, contactData',
        });
      }

      // Validate campaign exists
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, name: true },
      });

      if (!campaign) {
        return res.status(404).json({
          success: false,
          error: `Campaign ${campaignId} not found`,
        });
      }

      // Generate prediction
      const prediction = await outcomeMappingService.predictCallOutcome(
        campaignId,
        contactData,
        historicalContext
      );

      res.json({
        success: true,
        data: {
          campaign,
          prediction,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error predicting call outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to predict call outcome',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/call-outcomes/mapping-rules
 * @desc Get outcome mapping rules
 * @access Private
 */
router.get('/mapping-rules',
  authenticate,
  async (req, res) => {
    try {
      const { dispositionId } = req.query;

      let rules: any[] = [];
      if (dispositionId) {
        const rule = outcomeMappingService.getMappingRule(dispositionId as string);
        rules = rule ? [rule] : [];
      } else {
        // Return all rules (would need to implement this in service)
        rules = [];
      }

      res.json({
        success: true,
        data: {
          rules,
          count: rules.length,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error getting mapping rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get mapping rules',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route PUT /api/call-outcomes/verify/:outcomeId
 * @desc Verify a call outcome
 * @access Private
 */
router.put('/verify/:outcomeId',
  authenticate,
  async (req, res) => {
    try {
      const { outcomeId } = req.params;
      const { verified, verifierNotes } = req.body;

      // Update outcome verification
      const updatedOutcome = await callOutcomeTrackingService.updateCallOutcome(outcomeId, {
        isVerified: verified,
        verifiedBy: req.user?.userId,
        verifiedAt: verified ? new Date() : undefined,
      });

      // Emit verification event
      await eventManager.emitEvent({
        type: 'call.ended', // Using existing event type
        callId: updatedOutcome.callId,
        agentId: updatedOutcome.agentId,
        campaignId: updatedOutcome.campaignId,
        metadata: {
          outcomeVerified: verified,
          verifiedBy: req.user?.userId,
          verifierNotes,
        },
      } as any, `campaign:${updatedOutcome.campaignId}`, EventPriority.LOW);

      res.json({
        success: true,
        data: {
          outcome: updatedOutcome,
          verified,
          verifiedBy: req.user?.userId,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error verifying outcome:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify outcome',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Helper functions

function calculateProbability(category: CallOutcomeCategory, impact: OutcomeImpact): number {
  // Calculate conversion probability based on category and impact
  if (category === CallOutcomeCategory.SALE_CLOSED) return 100;
  if (category === CallOutcomeCategory.QUALIFIED_LEAD && impact === OutcomeImpact.HIGHLY_POSITIVE) return 85;
  if (category === CallOutcomeCategory.QUALIFIED_LEAD) return 70;
  if (category === CallOutcomeCategory.APPOINTMENT_SET) return 60;
  if (category === CallOutcomeCategory.INTEREST_EXPRESSED) return 45;
  if (category === CallOutcomeCategory.CALLBACK_REQUESTED) return 30;
  if (category === CallOutcomeCategory.CONTACT_MADE) return 15;
  return 5; // Default low probability
}

function calculateAgentEffort(duration: number): number {
  // Calculate agent effort based on call duration
  if (duration < 60) return 1; // Very low effort
  if (duration < 300) return 3; // Low effort 
  if (duration < 900) return 5; // Medium effort
  if (duration < 1800) return 7; // High effort
  return 9; // Very high effort
}

export default router;