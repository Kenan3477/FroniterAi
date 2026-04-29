/**
 * Production Dialer Routes 
 * 
 * Handles real Twilio webhooks for production telephony integration:
 * - Call status updates (ringing, answered, completed, etc.)
 * - Answering Machine Detection (AMD) results
 * - Recording status and URLs
 * - TwiML generation for call flow control
 */

import { Router } from 'express';
import twilio from 'twilio';
import { productionDialerService } from '../services/productionDialerService';
import { CallOutcome } from '../services/callStateMachine';
import { prisma } from '../database';
import { callEvents } from '../utils/eventHelpers';

const router = Router();

// Twilio webhook validation middleware
const validateTwilioWebhook = (req: any, res: any, next: any) => {
  const twilioSignature = req.get('X-Twilio-Signature');
  const url = `${process.env.BACKEND_URL}${req.originalUrl}`;
  
  // Only validate in production
  if (process.env.NODE_ENV === 'production' && process.env.TWILIO_AUTH_TOKEN) {
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature || '',
      url,
      req.body
    );
    
    if (!isValid) {
      console.warn('⚠️ Invalid Twilio webhook signature');
      return res.status(403).send('Invalid signature');
    }
  }
  
  next();
};

/**
 * POST /api/dialer/webhook/call-status
 * Handle call status updates from Twilio
 */
router.post('/webhook/call-status', validateTwilioWebhook, async (req, res) => {
  try {
    const webhookData = req.body;
    console.log('📞 Received call status webhook:', webhookData);
    
    await productionDialerService.handleCallStatusWebhook(webhookData);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing call status webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/dialer/webhook/amd-status  
 * Handle Answering Machine Detection results
 */
router.post('/webhook/amd-status', validateTwilioWebhook, async (req, res) => {
  try {
    const amdData = req.body;
    console.log('🤖 Received AMD webhook:', amdData);
    
    await productionDialerService.handleAMDWebhook(amdData);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing AMD webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/dialer/webhook/recording-status
 * Handle recording status updates from Twilio
 */
router.post('/webhook/recording-status', validateTwilioWebhook, async (req, res) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration } = req.body;
    
    console.log(`🎙️ Recording ${RecordingStatus} for call ${CallSid}: ${RecordingUrl}`);
    
    // Check if call record exists
    let callRecord = await prisma.callRecord.findFirst({
      where: { callId: CallSid }
    });
    
    if (!callRecord) {
      console.log(`📝 No existing call record for ${CallSid}, skipping auto-sync creation...`);
      console.log(`   ⚠️  Auto-sync contact creation disabled to prevent unwanted contacts`);
      console.log(`   📋 Call records should only be created through proper dialing workflows`);
      
      // Just acknowledge the recording webhook without creating records
      res.status(200).json({ 
        success: true, 
        message: 'Recording acknowledged but no call record exists',
        note: 'Auto-sync contact creation disabled'
      });
      return;
    } else {
      // Update existing call record with recording info
      await prisma.callRecord.update({
        where: { id: callRecord.id },
        data: {
          recording: RecordingUrl,
          duration: RecordingDuration ? parseInt(RecordingDuration) : callRecord.duration
        }
      });
      
      console.log(`📝 Updated existing call record ${callRecord.id} with recording`);
    }
    
    // Create or update recording file entry
    if (RecordingStatus === 'completed' && RecordingUrl) {
      await prisma.recording.upsert({
        where: { callRecordId: callRecord.id },
        update: {
          filePath: RecordingUrl,
          duration: RecordingDuration ? parseInt(RecordingDuration) : 0,
          uploadStatus: 'completed'
        },
        create: {
          callRecordId: callRecord.id,
          fileName: `auto-sync-${RecordingSid}.mp3`,
          filePath: RecordingUrl,
          duration: RecordingDuration ? parseInt(RecordingDuration) : 0,
          uploadStatus: 'completed'
        }
      });
      
      // Emit recording completed event
      await callEvents.ended({
        callId: CallSid,
        sipCallId: CallSid,
        contactId: callRecord.contactId,
        campaignId: callRecord.campaignId,
        agentId: callRecord.agentId || '',
        phoneNumber: callRecord.phoneNumber,
        direction: 'outbound',
        status: 'completed',
        metadata: { recordingUrl: RecordingUrl }
      });
      
      console.log(`🎯 Auto-sync completed for recording ${RecordingSid}`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error processing recording webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/dialer/twiml/outbound
 * Generate TwiML for outbound calls
 */
router.post('/twiml/outbound', async (req, res) => {
  try {
    const { To, From, CallSid, callId, contactId, campaignId } = req.body;
    
    console.log(`📞 Generating outbound TwiML for call ${CallSid} to ${To}`);
    
    const twiml = new twilio.twiml.VoiceResponse();
    // No TTS — connect immediately (Twilio <Say> is billable)
    twiml.pause({ length: 1 });
    // Connect to WebRTC agent client
    const dial = twiml.dial({
      timeout: 30, // 30 second timeout for agent pickup
      record: 'record-from-answer-dual',
      answerOnBridge: true, // Only answer when agent picks up
      callerId: From
    });
    
    // Connect to the browser-based agent
    dial.client('agent-browser');
    
    twiml.hangup();
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error generating outbound TwiML:', error);
    
    // Fallback TwiML
    const errorTwiml = new twilio.twiml.VoiceResponse();
    errorTwiml.hangup();
    
    res.type('text/xml');
    res.send(errorTwiml.toString());
  }
});

/**
 * POST /api/dialer/twiml/agent-connect
 * TwiML for connecting agent to customer
 */
router.post('/twiml/agent-connect', async (req, res) => {
  try {
    const { To, From, CallSid, conference } = req.body;
    
    console.log(`👤 Connecting agent to call ${CallSid}`);
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    if (conference) {
      // Conference-based connection (no TTS)
      const dial = twiml.dial();
      dial.conference({
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical'
      }, conference);
      
    } else {
      // Direct connection (no TTS)
      const dial = twiml.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER,
        timeout: 30
      });
      
      dial.number(To);
    }
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error) {
    console.error('❌ Error generating agent connect TwiML:', error);
    
    const errorTwiml = new twilio.twiml.VoiceResponse();
    errorTwiml.hangup();
    
    res.type('text/xml');
    res.send(errorTwiml.toString());
  }
});

/**
 * POST /api/dialer/initiate-campaign-call
 * Start a new production call for a campaign
 */
router.post('/initiate-campaign-call', async (req, res) => {
  try {
    const { contactId, phoneNumber, campaignId, priority = 2, agentId, metadata } = req.body;
    
    console.log(`📞 Initiating campaign call: ${phoneNumber} for campaign ${campaignId}`);
    
    // Validate required fields
    if (!contactId || !phoneNumber || !campaignId) {
      return res.status(400).json({
        success: false,
        error: 'contactId, phoneNumber, and campaignId are required'
      });
    }
    
    // Create call request
    const callRequest = {
      contactId,
      phoneNumber,
      campaignId,
      priority,
      metadata: {
        ...metadata,
        agentId,
        initiatedAt: new Date().toISOString()
      }
    };
    
    // Initiate production call
    const result = await productionDialerService.initiateProductionCall(callRequest);
    
    res.json({
      success: true,
      data: result,
      message: 'Production call initiated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error initiating campaign call:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate call'
    });
  }
});

/**
 * GET /api/dialer/stats
 * Get current dialer statistics and performance metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await productionDialerService.getDialerStats();
    
    // Add additional metrics
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todaysStats = await prisma.callRecord.aggregate({
      where: {
        createdAt: {
          gte: todayStart
        }
      },
      _count: {
        id: true
      }
    });
    
    const outcomeStats = await prisma.callRecord.groupBy({
      by: ['outcome'],
      where: {
        createdAt: {
          gte: todayStart
        }
      },
      _count: {
        id: true
      }
    });
    
    res.json({
      success: true,
      data: {
        ...stats,
        todaysCalls: todaysStats._count.id,
        outcomes: outcomeStats.reduce((acc: Record<string, number>, item: any) => {
          acc[item.outcome || 'unknown'] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching dialer stats:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

export default router;