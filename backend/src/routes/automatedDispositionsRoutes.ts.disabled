// Enhanced Disposition API Routes with Automation
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { automatedDispositionService } from '../services/automatedDispositionService';
import { dispositionValidationService } from '../services/dispositionValidationService';
import { authenticate } from '../middleware/auth';
import { eventManager } from '../services/eventManager';
import { EventPriority } from '../types/events';

const router = Router();
const prisma = new PrismaClient();

/**
 * @route POST /api/automated-dispositions/analyze-call
 * @desc Analyze call and get disposition suggestions
 * @access Private
 */
router.post('/analyze-call/:callId', 
  authenticate,
  async (req, res) => {
    try {
      const { callId } = req.params;
      const callAnalysis = req.body;

      if (!callAnalysis.duration || typeof callAnalysis.duration !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Invalid call analysis data: duration is required',
        });
      }

      const suggestion = await automatedDispositionService.analyzeCallForDisposition(callId, {
        duration: callAnalysis.duration,
        connected: callAnalysis.connected || false,
        answeredByHuman: callAnalysis.answeredByHuman || false,
        voicemailDetected: callAnalysis.voicemailDetected || false,
        busySignalDetected: callAnalysis.busySignalDetected || false,
        sentimentScore: callAnalysis.sentimentScore,
        keywordMatches: callAnalysis.keywordMatches || [],
        hangupReason: callAnalysis.hangupReason || 'system',
      });

      res.json({
        success: true,
        data: {
          callId,
          suggestion,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error analyzing call for disposition:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze call for disposition',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/automated-dispositions/validate-realtime
 * @desc Validate disposition field in real-time
 * @access Private
 */
router.post('/validate-realtime',
  authenticate,
  async (req, res) => {
    try {
      const { callId, dispositionId, field, value } = req.body;

      if (!callId || !dispositionId || !field) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: callId, dispositionId, field',
        });
      }

      const validation = await dispositionValidationService.validateFieldRealTime(
        callId,
        dispositionId,
        field,
        value
      );

      res.json({
        success: true,
        data: {
          field,
          validation,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error in real-time validation:', error);
      res.status(500).json({
        success: false,
        error: 'Real-time validation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/automated-dispositions/campaign-config/:campaignId
 * @desc Get campaign disposition configuration
 * @access Private
 */
router.get('/campaign-config/:campaignId',
  authenticate,
  async (req, res) => {
    try {
      const { campaignId } = req.params;

      const config = automatedDispositionService.getCampaignDispositionConfig(campaignId);
      
      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Campaign configuration not found',
        });
      }

      res.json({
        success: true,
        data: {
          config,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error getting campaign config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get campaign configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route PUT /api/automated-dispositions/campaign-config/:campaignId
 * @desc Update campaign disposition configuration
 * @access Private (Admin only)
 */
router.put('/campaign-config/:campaignId',
  authenticate,
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const configUpdate = req.body;

      // Check if user has admin permissions
      if (!req.user?.role || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to update campaign configuration',
        });
      }

      await automatedDispositionService.updateCampaignDispositionConfig(campaignId, configUpdate);

      res.json({
        success: true,
        data: {
          message: 'Campaign configuration updated successfully',
          campaignId,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error updating campaign config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update campaign configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/automated-dispositions/validation-rules/:dispositionId
 * @desc Get validation rules for a disposition
 * @access Private
 */
router.get('/validation-rules/:dispositionId',
  authenticate,
  async (req, res) => {
    try {
      const { dispositionId } = req.params;

      const rules = dispositionValidationService.getValidationRules(dispositionId);

      res.json({
        success: true,
        data: {
          dispositionId,
          rules,
          count: rules.length,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error getting validation rules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get validation rules',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route GET /api/automated-dispositions/call-suggestions/:callId
 * @desc Get suggested dispositions for a call
 * @access Private
 */
router.get('/call-suggestions/:callId',
  authenticate,
  async (req, res) => {
    try {
      const { callId } = req.params;

      // Get call details for context
      const call = await prisma.callRecord.findUnique({
        where: { id: callId },
        include: {
          campaign: true,
          record: true,
          legs: true,
        },
      });

      if (!call) {
        return res.status(404).json({
          success: false,
          error: 'Call not found',
        });
      }

      // Generate suggestions based on call state
      const suggestions = await generateDispositionSuggestions(call);

      res.json({
        success: true,
        data: {
          callId,
          suggestions,
          callStatus: call.status,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error getting call suggestions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get disposition suggestions',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * @route POST /api/automated-dispositions/process-call-event
 * @desc Process call events for disposition automation
 * @access Private
 */
router.post('/process-call-event',
  authenticate,
  async (req, res) => {
    try {
      const { callId, eventType, eventData } = req.body;

      if (!callId || !eventType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: callId, eventType',
        });
      }

      await automatedDispositionService.processCallEvent(callId, eventType, eventData || {});

      res.json({
        success: true,
        data: {
          message: 'Call event processed successfully',
          callId,
          eventType,
          timestamp: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error('Error processing call event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process call event',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Helper function to generate disposition suggestions
 */
async function generateDispositionSuggestions(call: any) {
  const suggestions = [];

  // Based on call status
  switch (call.status) {
    case 'ANSWERED':
      suggestions.push({
        dispositionId: 'contact_made',
        confidence: 90,
        reason: 'Call was answered',
      });
      break;
    case 'NO_ANSWER':
      suggestions.push({
        dispositionId: 'no_answer',
        confidence: 95,
        reason: 'No answer detected',
      });
      break;
    case 'BUSY':
      suggestions.push({
        dispositionId: 'busy_signal',
        confidence: 98,
        reason: 'Busy signal detected',
      });
      break;
  }

  // Based on duration
  if (call.duration) {
    if (call.duration < 10) {
      suggestions.push({
        dispositionId: 'no_answer',
        confidence: 85,
        reason: 'Very short call duration',
      });
    } else if (call.duration > 300) {
      suggestions.push({
        dispositionId: 'qualified_lead',
        confidence: 70,
        reason: 'Long conversation indicates engagement',
      });
    }
  }

  return suggestions;
}

export default router;