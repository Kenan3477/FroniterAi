// Disposition Collection API Routes
import express from 'express';
import { dispositionService } from '../services/dispositionService';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { prisma } from '../database/index';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/dispositions/configs
 * Get available disposition configurations
 */
router.get('/configs',
  validateRequest([
    query('campaignId').optional().isString(),
  ]),
  async (req, res) => {
    try {
      const { campaignId } = req.query;
      
      const configs = dispositionService.getDispositionConfigs(campaignId as string);

      res.json({
        success: true,
        data: configs,
        message: 'Disposition configurations retrieved successfully'
      });
    } catch (error) {
      console.error('Error getting disposition configs:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/configs/:dispositionId
 * Get specific disposition configuration
 */
router.get('/configs/:dispositionId',
  validateRequest([
    param('dispositionId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { dispositionId } = req.params;
      
      const config = dispositionService.getDispositionConfig(dispositionId);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'Disposition configuration not found'
        });
      }

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      console.error('Error getting disposition config:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/dispositions
 * Create a call disposition
 */
router.post('/',
  validateRequest([
    body('callId').isString().notEmpty(),
    body('sipCallId').optional().isString(),
    body('agentId').optional().isString(), // Made optional - will use authenticated user
    body('contactId').optional().isString(),
    body('campaignId').optional().isString(),
    body('phoneNumber').optional().isString(), // Made optional
    body('dispositionId').isString().notEmpty(),
    body('notes').optional().isString(),
    body('followUpDate').optional().isISO8601(),
    body('followUpNotes').optional().isString(),
    body('callBackNumber').optional().isString(),
    body('leadScore').optional().isInt({ min: 1, max: 10 }),
    body('saleAmount').optional().isFloat({ min: 0 }),
    body('callDuration').optional().isInt({ min: 0 }), // Made optional
    body('callStartTime').optional().isISO8601(),
    body('callEndTime').optional().isISO8601(),
    body('metadata').optional().isObject(),
  ]),
  async (req, res) => {
    try {
      const {
        callId,
        sipCallId,
        agentId,
        contactId,
        campaignId,
        phoneNumber,
        dispositionId,
        notes,
        followUpDate,
        followUpNotes,
        callBackNumber,
        leadScore,
        saleAmount,
        callDuration,
        callStartTime,
        callEndTime,
        metadata,
      } = req.body;

      console.log('💾 Disposition save request:', {
        callId,
        agentId,
        dispositionId,
        phoneNumber,
        authenticated_user: (req.user as any)?.userId
      });

      // Check if call record exists, create if missing
      let existingCallRecord = null;
      try {
        existingCallRecord = await prisma.callRecord.findFirst({
          where: {
            OR: [
              { callId: callId },
              { recording: callId }, // Check if callId is actually a Twilio SID
              { callId: { contains: callId } }
            ]
          }
        });

        if (!existingCallRecord) {
          console.log('⚠️ Call record not found for disposition, creating minimal record...');
          
          // Ensure required dependencies exist
          await prisma.campaign.upsert({
            where: { campaignId: 'disposition-calls' },
            update: {},
            create: {
              campaignId: 'disposition-calls',
              name: 'Disposition Calls',
              dialMethod: 'Manual',
              status: 'Active',
              isActive: true,
              description: 'Call records created during disposition',
              recordCalls: true
            }
          });

          await prisma.dataList.upsert({
            where: { listId: 'disposition-contacts' },
            update: {},
            create: {
              listId: 'disposition-contacts',
              name: 'Disposition Contacts',
              campaignId: 'disposition-calls',
              active: true,
              totalContacts: 0
            }
          });

          const dispositionContactId = `disposition-${callId}`;
          await prisma.contact.upsert({
            where: { contactId: dispositionContactId },
            update: {},
            create: {
              contactId: dispositionContactId,
              listId: 'disposition-contacts',
              firstName: 'Disposition',
              lastName: 'Contact',
              phone: phoneNumber || 'Unknown',
              status: 'contacted'
            }
          });

          // Create minimal call record for disposition
          existingCallRecord = await prisma.callRecord.create({
            data: {
              callId: callId,
              agentId: agentId || (req.user as any)?.userId || null,
              contactId: dispositionContactId,
              campaignId: 'disposition-calls',
              phoneNumber: phoneNumber || 'Unknown',
              dialedNumber: phoneNumber || 'Unknown',
              callType: 'outbound',
              startTime: callStartTime ? new Date(callStartTime) : new Date(),
              endTime: callEndTime ? new Date(callEndTime) : new Date(),
              duration: callDuration || 0,
              outcome: 'completed'
            }
          });

          console.log('✅ Created minimal call record for disposition:', existingCallRecord.callId);
        } else {
          console.log('✅ Found existing call record for disposition:', existingCallRecord.callId);
        }
      } catch (callRecordError) {
        console.error('❌ Error handling call record for disposition:', callRecordError);
        // Continue with disposition creation anyway
      }

      const disposition = await dispositionService.createDisposition({
        callId,
        sipCallId,
        agentId: agentId || (req.user as any).userId || 'unknown', // Use authenticated user if agentId not provided
        contactId: existingCallRecord?.contactId || contactId || 'unknown',
        campaignId: existingCallRecord?.campaignId || campaignId || 'disposition-calls',
        phoneNumber: phoneNumber || existingCallRecord?.phoneNumber || 'Unknown', // Default if not provided
        dispositionId,
        notes,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        followUpNotes,
        callBackNumber,
        leadScore,
        saleAmount,
        callDuration: callDuration || existingCallRecord?.duration || 0, // Default to 0 if not provided
        callStartTime: callStartTime ? new Date(callStartTime) : existingCallRecord?.startTime || new Date(), // Default to now if not provided
        callEndTime: callEndTime ? new Date(callEndTime) : existingCallRecord?.endTime || new Date(), // Default to now if not provided
        metadata,
      });

      res.status(201).json({
        success: true,
        data: disposition,
        message: 'Disposition created successfully'
      });
    } catch (error) {
      console.error('Error creating disposition:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/:dispositionId
 * Get specific disposition
 */
router.get('/:dispositionId',
  validateRequest([
    param('dispositionId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { dispositionId } = req.params;
      
      const disposition = await dispositionService.getDisposition(dispositionId);

      if (!disposition) {
        return res.status(404).json({
          success: false,
          error: 'Disposition not found'
        });
      }

      res.json({
        success: true,
        data: disposition
      });
    } catch (error) {
      console.error('Error getting disposition:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/dispositions/:dispositionId/qa
 * Update disposition with QA information
 */
router.put('/:dispositionId/qa',
  validateRequest([
    param('dispositionId').isString().notEmpty(),
    body('qaScore').isInt({ min: 1, max: 10 }),
    body('qaNotes').optional().isString(),
    body('qaAgentId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { dispositionId } = req.params;
      const { qaScore, qaNotes, qaAgentId } = req.body;

      const disposition = await dispositionService.updateDispositionQA(dispositionId, {
        qaScore,
        qaNotes,
        qaAgentId,
      });

      res.json({
        success: true,
        data: disposition,
        message: 'QA information updated successfully'
      });
    } catch (error) {
      console.error('Error updating disposition QA:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/agent/:agentId
 * Get dispositions for an agent
 */
router.get('/agent/:agentId',
  validateRequest([
    param('agentId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const { limit, offset } = req.query;
      
      let dispositions = await dispositionService.getDispositionsForAgent(agentId);

      // Apply pagination
      const limitNum = parseInt(limit as string) || 50;
      const offsetNum = parseInt(offset as string) || 0;
      const total = dispositions.length;
      
      dispositions = dispositions.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          dispositions,
          pagination: {
            total,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < total,
          },
        },
      });
    } catch (error) {
      console.error('Error getting agent dispositions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/campaign/:campaignId
 * Get dispositions for a campaign
 */
router.get('/campaign/:campaignId',
  validateRequest([
    param('campaignId').isString().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('offset').optional().isInt({ min: 0 }),
  ]),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const { limit, offset } = req.query;
      
      let dispositions = await dispositionService.getDispositionsForCampaign(campaignId);

      // Apply pagination
      const limitNum = parseInt(limit as string) || 50;
      const offsetNum = parseInt(offset as string) || 0;
      const total = dispositions.length;
      
      dispositions = dispositions.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          dispositions,
          pagination: {
            total,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < total,
          },
        },
      });
    } catch (error) {
      console.error('Error getting campaign dispositions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/stats
 * Get disposition statistics
 */
router.get('/stats',
  validateRequest([
    query('agentId').optional().isString(),
    query('campaignId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ]),
  async (req, res) => {
    try {
      const { agentId, campaignId, startDate, endDate } = req.query;
      
      const stats = await dispositionService.getDispositionStats({
        agentId: agentId as string,
        campaignId: campaignId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting disposition stats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/reports/summary
 * Get disposition summary report
 */
router.get('/reports/summary',
  validateRequest([
    query('agentId').optional().isString(),
    query('campaignId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('groupBy').optional().isIn(['agent', 'campaign', 'date', 'disposition']),
  ]),
  async (req, res) => {
    try {
      const { agentId, campaignId, startDate, endDate, groupBy } = req.query;
      
      // Get base statistics
      const stats = await dispositionService.getDispositionStats({
        agentId: agentId as string,
        campaignId: campaignId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      }) as any;

      // Enhanced summary with additional calculations
      const summary = {
        ...stats,
        conversionRate: stats.totalSales > 0 ? Math.round((stats.totalSales / stats.totalDispositions) * 100) : 0,
        averageSaleAmount: stats.totalSales > 0 ? Math.round(stats.totalSaleAmount / stats.totalSales) : 0,
        qaCompletionRate: stats.qaRequired > 0 ? Math.round((stats.qaCompleted / stats.qaRequired) * 100) : 0,
        // TODO: Add groupBy functionality for detailed breakdowns
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error getting disposition summary:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/dispositions/exports/csv
 * Export dispositions as CSV
 */
router.get('/exports/csv',
  validateRequest([
    query('agentId').optional().isString(),
    query('campaignId').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ]),
  async (req, res) => {
    try {
      const { agentId, campaignId, startDate, endDate } = req.query;
      
      let dispositions: any[] = [];
      if (agentId) {
        dispositions = await dispositionService.getDispositionsForAgent(agentId as string);
      } else if (campaignId) {
        dispositions = await dispositionService.getDispositionsForCampaign(campaignId as string);
      } else {
        // Return empty for now - implement global export if needed
        dispositions = [];
      }

      // Filter by date range
      if (startDate || endDate) {
        dispositions = dispositions.filter(d => {
          const start = startDate ? new Date(startDate as string) : null;
          const end = endDate ? new Date(endDate as string) : null;
          if (start && d.dispositionTime < start) return false;
          if (end && d.dispositionTime > end) return false;
          return true;
        });
      }

      // Generate CSV content
      const csvHeaders = [
        'Disposition ID',
        'Call ID',
        'Agent ID',
        'Phone Number',
        'Disposition Type',
        'Disposition Label',
        'Category',
        'Outcome',
        'Call Duration',
        'Sale Amount',
        'Lead Score',
        'Notes',
        'QA Required',
        'QA Score',
        'Disposition Time',
      ];

      const csvRows = dispositions.map(d => [
        d.id,
        d.callId,
        d.agentId,
        d.phoneNumber,
        d.dispositionType,
        d.dispositionLabel,
        d.dispositionCategory,
        d.dispositionOutcome,
        d.callDuration,
        d.saleAmount || '',
        d.leadScore || '',
        (d.notes || '').replace(/"/g, '""'), // Escape quotes
        d.qaRequired ? 'Yes' : 'No',
        d.qaScore || '',
        d.dispositionTime.toISOString(),
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dispositions.csv"');
      res.send(csvContent);

    } catch (error) {
      console.error('Error exporting dispositions:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;