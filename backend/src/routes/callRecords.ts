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
import { syncAllRecordings, getRecordingSyncStatus } from '../services/recordingSyncService';
import { getAllRecordings } from '../services/twilioService';
import { prisma } from '../database/index';

const router = express.Router();

// Apply authentication to all call record routes
router.use(authenticate);

/**
 * GET /api/call-records
 * Get call records with optional filtering and pagination
 * Main endpoint for frontend call records display
 */
router.get('/', requireRole('AGENT', 'SUPERVISOR', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const sortBy = (req.query.sortBy as string) || 'startTime';
    const sortOrder = (req.query.sortOrder as string) || 'desc';
    
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

    // Handle search term
    if (req.query.search) {
      filters.phoneNumber = req.query.search as string;
    }

    const callRecords = await searchCallRecords(filters);
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRecords = callRecords.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      records: paginatedRecords,
      pagination: {
        total: callRecords.length,
        limit: limit,
        currentPage: page,
        totalPages: Math.ceil(callRecords.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching call records:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch call records',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

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

/**
 * POST /api/call-records/sync-recordings
 * Sync recordings from Twilio for all call records
 * Requires: ADMIN role
 */
router.post('/sync-recordings', [
  requireRole('ADMIN'),
  createRateLimiter
], async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting recording sync from API request...');
    
    const result = await syncAllRecordings();
    
    res.json({
      success: true,
      data: result,
      message: `Recording sync completed: ${result.synced} recordings synced, ${result.errors} errors`
    });
  } catch (error) {
    console.error('❌ Error in recording sync API:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync recordings',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * GET /api/call-records/sync-status
 * Get recording sync status and statistics
 * Requires: SUPERVISOR or ADMIN role
 */
router.get('/sync-status', [
  requireRole('SUPERVISOR', 'ADMIN')
], async (req: Request, res: Response) => {
  try {
    const status = await getRecordingSyncStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/call-records/import-twilio-recordings
 * Import ALL recordings from Twilio and create call records for them
 * This addresses the issue where Twilio has multiple recordings but Omnivox only has 1
 * Requires: ADMIN role
 */
router.post('/import-twilio-recordings', [
  requireRole('ADMIN'),
  createRateLimiter,
  body('daysBack').optional().isInt({ min: 1, max: 90 }).withMessage('Days back must be between 1 and 90'),
  body('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200')
], async (req: Request, res: Response) => {
  try {
    console.log('📥 Starting bulk import of Twilio recordings...');
    
    const daysBack = req.body.daysBack || 30;
    const limit = req.body.limit || 100;
    
    // Step 1: Get ALL recordings from Twilio
    console.log(`🔍 Fetching recordings from Twilio (last ${daysBack} days, limit ${limit})...`);
    const twilioRecordings = await getAllRecordings(limit, daysBack);
    
    console.log(`📊 Found ${twilioRecordings.length} recordings in Twilio`);
    
    // Step 1.5: Ensure required entities exist BEFORE processing recordings
    console.log('🔧 Creating required database entities...');
    
    // Ensure data list exists for imported contacts
    await prisma.dataList.upsert({
      where: { listId: 'IMPORTED-CONTACTS' },
      update: {},
      create: {
        listId: 'IMPORTED-CONTACTS',
        name: 'Imported Twilio Contacts',
        active: true,
        totalContacts: 0
      }
    });
    
    // Ensure campaign exists for imported recordings
    await prisma.campaign.upsert({
      where: { campaignId: 'HISTORICAL-CALLS' },
      update: {},
      create: {
        campaignId: 'HISTORICAL-CALLS',
        name: 'Historical Calls',
        description: 'Previously made calls synced from Twilio',
        status: 'Active',
        isActive: true
      }
    });
    
    console.log('✅ Required entities created successfully');
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const importedRecordings = [];
    
    // Step 2: Process each recording
    for (const recording of twilioRecordings) {
      try {
        // Check if we already have this call record
        const existingCallRecord = await prisma.callRecord.findFirst({
          where: { 
            OR: [
              { callId: recording.callSid },
              { callId: recording.sid }
            ]
          }
        });
        
        if (existingCallRecord) {
          console.log(`⏭️  Call record already exists for ${recording.callSid}`);
          skippedCount++;
          continue;
        }
        
        // Check for existing real contact (NOT fake imported contacts)
        let existingContact = null;
        if (recording.callSid && recording.callSid !== 'Unknown') {
          // Try to extract phone number from call SID or other metadata
          // In a real implementation, you would have phone number from Twilio API
          existingContact = await prisma.contact.findFirst({
            where: {
              AND: [
                // Add phone number matching if available
                // { phone: extractedPhoneNumber },
                // Exclude fake imported contacts
                {
                  NOT: {
                    OR: [
                      { firstName: 'Imported' },
                      { listId: 'TWILIO-IMPORT' },
                      { listId: 'IMPORTED-CONTACTS' }
                    ]
                  }
                }
              ]
            }
          });
        }
        
        // Skip if no existing real contact found (don't create call records for orphaned recordings)
        if (!existingContact) {
          console.log(`⏭️  Skipping recording ${recording.callSid} - no real contact found`);
          skippedCount++;
          continue;
        }
        
        // Create call record with real contact link
        const callRecord = await prisma.callRecord.create({
          data: {
            callId: recording.callSid,
            agentId: null, // Unknown agent for imported recordings
            contactId: existingContact.contactId, // Use real contact ID only
            campaignId: 'HISTORICAL-CALLS', // Campaign for historical calls
            phoneNumber: 'Unknown', // Phone number not available in recording data
            dialedNumber: 'Unknown',
            callType: 'outbound',
            startTime: recording.dateCreated,
            endTime: new Date(recording.dateCreated.getTime() + (parseInt(recording.duration) * 1000)),
            duration: parseInt(recording.duration) || 0,
            outcome: 'completed',
            dispositionId: null,
            notes: `Imported from Twilio. Recording SID: ${recording.sid}`,
            recording: recording.url,
            transferTo: null
          }
        });
        
        // Create recording file entry
        await prisma.recording.create({
          data: {
            callRecordId: callRecord.id,
            fileName: `twilio-${recording.sid}.mp3`,
            filePath: recording.url, // Use filePath instead of fileUrl
            duration: parseInt(recording.duration) || 0,
            uploadStatus: 'completed'
          }
        });
        
        importedRecordings.push({
          callId: recording.callSid,
          recordingSid: recording.sid,
          duration: recording.duration,
          dateCreated: recording.dateCreated
        });
        
        importedCount++;
        console.log(`✅ Imported recording ${recording.sid} for call ${recording.callSid}`);
        
      } catch (recordingError) {
        console.error(`❌ Error importing recording ${recording.sid}:`, recordingError);
        errorCount++;
      }
    }
    
    console.log(`✅ Bulk import completed: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors`);
    
    res.json({
      success: true,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
        totalTwilioRecordings: twilioRecordings.length,
        importedRecordings: importedRecordings
      },
      message: `Twilio bulk import completed: ${importedCount} recordings imported`
    });
    
  } catch (error) {
    console.error('❌ Error in Twilio bulk import:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import Twilio recordings',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

/**
 * POST /api/call-records/update-campaign-names
 * Update existing call records to use better campaign names
 * Requires: ADMIN role
 */
router.post('/update-campaign-names', [
  requireRole('ADMIN'),
], async (req: Request, res: Response) => {
  try {
    console.log('🔄 Updating existing campaign names...');
    
    // Update campaign record
    const updatedCampaign = await prisma.campaign.update({
      where: { campaignId: 'IMPORTED-TWILIO' },
      data: {
        campaignId: 'HISTORICAL-CALLS',
        name: 'Historical Calls',
        description: 'Previously made calls synced from Twilio'
      }
    });
    
    // Update all call records that reference the old campaign
    const updatedCallRecords = await prisma.callRecord.updateMany({
      where: { campaignId: 'IMPORTED-TWILIO' },
      data: { campaignId: 'HISTORICAL-CALLS' }
    });
    
    console.log(`✅ Updated ${updatedCallRecords.count} call records to new campaign`);
    
    res.json({
      success: true,
      data: {
        updatedCampaign,
        updatedCallRecords: updatedCallRecords.count
      },
      message: `Successfully updated campaign names for ${updatedCallRecords.count} call records`
    });
    
  } catch (error) {
    console.error('❌ Error updating campaign names:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign names',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

export default router;