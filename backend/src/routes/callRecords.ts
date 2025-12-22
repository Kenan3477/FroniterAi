/**
 * Omnivox AI Call Records API Routes
 * Production-ready API endpoints for call management
 * Replaces placeholder call record handling
 */

import express, { Request, Response } from 'express';
import { body } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createRateLimiter, reportingRateLimiter } from '../middleware/rateLimiter';
import { 
  startCall, 
  endCall, 
  searchCallRecords, 
  getCallStats, 
  getDailyCallVolume,
  CreateCallRecordRequest,
  UpdateCallRecordRequest,
  CallSearchFilters
} from '../services/callRecordsService';

const router = express.Router();

// Apply authentication to all call record routes
router.use(authenticate);

/**
 * POST /api/call-records/start
 * Start a new call and create call record
 * Requires: AGENT, SUPERVISOR, or ADMIN role
 */
router.post('/start', [
  createRateLimiter,
  requireRole('AGENT', 'SUPERVISOR', 'ADMIN'),
  body('callId').notEmpty().isLength({ min: 1, max: 255 }).withMessage('Call ID is required and must be valid'),
  body('campaignId').notEmpty().isLength({ min: 1, max: 255 }).withMessage('Campaign ID is required'),
  body('contactId').notEmpty().isLength({ min: 1, max: 255 }).withMessage('Contact ID is required'),
  body('phoneNumber').isMobilePhone('any').withMessage('Valid phone number is required'),
  body('agentId').optional().isLength({ max: 255 }).withMessage('Agent ID must be valid'),
  validateRequest([])
], async (req: Request, res: Response) => {
  try {
    const callData: CreateCallRecordRequest = req.body;
    
    // Validate required fields
    if (!callData.callId || !callData.contactId || !callData.campaignId || !callData.phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: callId, contactId, campaignId, phoneNumber'
      });
    }

    const result = await startCall(callData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: 'Call started successfully'
    });
  } catch (error) {
    console.error('Error starting call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start call',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * PUT /api/call-records/:callId/end
 * End a call and update call record
 * Requires: AGENT, SUPERVISOR, or ADMIN role
 */
router.put('/:callId/end', [
  requireRole('AGENT', 'SUPERVISOR', 'ADMIN'),
  body('outcome').optional().isLength({ max: 100 }).withMessage('Outcome must be less than 100 characters'),
  body('duration').optional().isInt({ min: 0 }).withMessage('Duration must be a positive number'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  body('recording').optional().isURL().withMessage('Recording must be a valid URL'),
  validateRequest([])
], async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const updateData: UpdateCallRecordRequest = req.body;
    
    const result = await endCall(callId, updateData);
    
    res.json({
      success: true,
      data: result,
      message: 'Call ended successfully'
    });
  } catch (error) {
    console.error('Error ending call:', error);
    
    if (error instanceof Error && error.message === 'Call record not found') {
      return res.status(404).json({
        success: false,
        error: 'Call record not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to end call',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/call-records/search
 * Search call records with filters
 * Requires: SUPERVISOR or ADMIN role (agents can only see their own records)
 */
router.get('/search', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const filters: CallSearchFilters = {
      agentId: req.query.agentId as string,
      campaignId: req.query.campaignId as string,
      outcome: req.query.outcome as string,
      phoneNumber: req.query.phoneNumber as string,
      dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
      dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined
    };

    // Security: Agents can only see their own call records
    if (req.user?.role === 'AGENT') {
      filters.agentId = req.user.userId;
    }

    // Handle duration filter
    if (req.query.durationMin || req.query.durationMax) {
      filters.duration = {
        min: req.query.durationMin ? parseInt(req.query.durationMin as string) : undefined,
        max: req.query.durationMax ? parseInt(req.query.durationMax as string) : undefined
      };
    }

    const callRecords = await searchCallRecords(filters);
    
    res.json({
      success: true,
      data: callRecords,
      count: callRecords.length
    });
  } catch (error) {
    console.error('Error searching call records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search call records',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/call-records/stats
 * Get call statistics for reporting
 * Requires: SUPERVISOR or ADMIN role
 */
router.get('/stats', [
  reportingRateLimiter,
  requireRole('SUPERVISOR', 'ADMIN')
], async (req: Request, res: Response) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
    
    const stats = await getCallStats(dateFrom, dateTo);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting call stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call statistics',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/call-records/daily-volume
 * Get daily call volume for reporting dashboard
 * Requires: SUPERVISOR or ADMIN role
 */
router.get('/daily-volume', [
  reportingRateLimiter,
  requireRole('SUPERVISOR', 'ADMIN')
], async (req: Request, res: Response) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    
    if (days < 1 || days > 365) {
      return res.status(400).json({
        success: false,
        error: 'Days parameter must be between 1 and 365'
      });
    }
    
    const dailyVolume = await getDailyCallVolume(days);
    
    res.json({
      success: true,
      data: dailyVolume
    });
  } catch (error) {
    console.error('Error getting daily call volume:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get daily call volume',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;