/**
 * Inbound Call Routes
 * 
 * Routes for handling inbound call webhooks and management:
 * - Twilio webhook endpoints for inbound calls
 * - Call routing and management endpoints
 * - Agent interaction endpoints
 */

import { Router } from 'express';
import twilio from 'twilio';
import {
  handleInboundWebhook,
  answerInboundCall,
  transferInboundCall,
  getInboundCallStatus
} from '../controllers/inboundCallController';

const router = Router();

// SECURE Twilio webhook validation middleware
const validateTwilioWebhook = (req: any, res: any, next: any) => {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('🚨 SECURITY: TWILIO_AUTH_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) {
    console.error('🚨 SECURITY: Webhook request missing Twilio signature');
    console.log('Request details:', { ip: req.ip, userAgent: req.get('User-Agent'), headers: req.headers });
    return res.status(401).json({ error: 'Unauthorized - Missing signature' });
  }

  const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const isValid = twilio.validateRequest(authToken, twilioSignature, requestUrl, req.body);
  
  if (!isValid) {
    console.error('� SECURITY: Invalid Twilio webhook signature');
    console.log('Request details:', { ip: req.ip, userAgent: req.get('User-Agent'), url: requestUrl });
    return res.status(401).json({ error: 'Unauthorized - Invalid signature' });
  }
  
  console.log('✅ Twilio webhook signature validated');
  next();
};

/**
 * POST /api/calls/webhook/inbound-call
 * Main webhook endpoint for Twilio inbound calls - SECURED
 * This replaces the basic /api/webhooks/voice endpoint for enhanced functionality
 */
router.post('/webhook/inbound-call', validateTwilioWebhook, handleInboundWebhook);

/**
 * POST /api/calls/webhook/wait-music
 * Twilio fetches this for <Enqueue waitUrl> / <Conference waitUrl>.
 * Silent loop — no Twilio-hosted music, no TTS, no <Gather>.
 */
router.post('/webhook/wait-music', validateTwilioWebhook, (_req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.pause({ length: 3600 });
  res.type('text/xml');
  res.send(twiml.toString());
});

router.get('/webhook/wait-music', validateTwilioWebhook, (_req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.pause({ length: 3600 });
  res.type('text/xml');
  res.send(twiml.toString());
});

/**
 * POST /api/calls/webhook/inbound-status
 * Webhook for inbound call status updates from Twilio
 */
router.post('/webhook/inbound-status', validateTwilioWebhook, async (req, res) => {
  try {
    const { CallSid, CallStatus, From, To, Duration } = req.body;
    const { callId } = req.query;
    
    console.log(`📞 Inbound call status update: ${CallSid} -> ${CallStatus}`, {
      callId,
      From,
      To,
      Duration
    });

    // Update call status in database
    if (callId) {
      const { prisma } = require('../database');
      
      await prisma.$executeRaw`
        UPDATE inbound_calls 
        SET status = ${CallStatus.toLowerCase()},
            duration = ${Duration ? parseInt(Duration) : null},
            ended_at = ${['completed', 'busy', 'no-answer', 'failed'].includes(CallStatus.toLowerCase()) ? new Date() : null}
        WHERE id = ${callId}
      `;

      // Also update call_records if exists
      if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus.toLowerCase())) {
        await prisma.callRecord.updateMany({
          where: {
            OR: [
              { callId: CallSid },
              { callId: callId }
            ]
          },
          data: {
            outcome: CallStatus.toLowerCase(),
            endTime: new Date(),
            duration: Duration ? parseInt(Duration) : null
          }
        });
        console.log('✅ Call_records updated for ended inbound call');
      }

      // Emit status update event using centralized helper
      const { callEvents } = require('../utils/eventHelpers');
      
      // Handle call ended events specifically
      if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus.toLowerCase())) {
        await callEvents.inboundEnded({
          callId: callId,
          callSid: CallSid,
          endReason: CallStatus.toLowerCase(),
          duration: Duration ? parseInt(Duration) : undefined,
          endedAt: new Date()
        });
      }
    }
    
    res.status(200).send('OK');
  } catch (error: any) {
    console.error('❌ Error processing inbound call status webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/calls/webhook/inbound-recording
 * Webhook for inbound call recording status updates from Twilio
 */
router.post('/webhook/inbound-recording', validateTwilioWebhook, async (req, res) => {
  try {
    const { 
      RecordingSid, 
      CallSid, 
      RecordingUrl, 
      RecordingDuration, 
      RecordingStatus,
      RecordingChannels 
    } = req.body;
    const { callId } = req.query;
    
    console.log(`🎙️ Inbound recording webhook: ${RecordingStatus} for call ${CallSid}`, {
      RecordingSid,
      callId,
      RecordingUrl,
      RecordingDuration
    });

    if (RecordingStatus === 'completed') {
      const { prisma } = require('../database');
      const { onNewCallRecording } = require('../services/transcriptionWorker');
      
      // Find the call record by CallSid or callId
      let callRecord = await prisma.callRecord.findFirst({
        where: {
          OR: [
            { callId: CallSid },
            { callId: callId }
          ]
        }
      });

      if (callRecord) {
        console.log(`📝 Found call_records entry for inbound call: ${callRecord.id}`);
        
        // Create or update the recording record
        await prisma.recording.upsert({
          where: { callRecordId: callRecord.id },
          update: {
            fileName: `inbound_recording_${RecordingSid}.wav`,
            filePath: RecordingUrl,
            duration: parseInt(RecordingDuration) || 0,
            format: 'wav',
            uploadStatus: 'completed',
            updatedAt: new Date()
          },
          create: {
            callRecordId: callRecord.id,
            fileName: `inbound_recording_${RecordingSid}.wav`,
            filePath: RecordingUrl,
            duration: parseInt(RecordingDuration) || 0,
            format: 'wav',
            quality: RecordingChannels === '2' ? 'stereo' : 'mono',
            storageType: 'twilio',
            uploadStatus: 'completed'
          }
        });

        console.log(`✅ Inbound call recording saved: ${RecordingSid}`);

        // Queue automatic transcription
        if (RecordingUrl && callRecord.id) {
          try {
            console.log(`🤖 Queueing transcription for inbound call recording: ${callRecord.id}`);
            await onNewCallRecording(callRecord.id, RecordingUrl);
            console.log(`✅ Transcription queued for inbound call: ${callRecord.id}`);
          } catch (transcriptionError) {
            console.error(`❌ Failed to queue transcription:`, transcriptionError);
          }
        }
      } else {
        console.warn(`⚠️ Call record not found for inbound CallSid: ${CallSid}, callId: ${callId}`);
        console.log(`📝 Creating fallback call_records entry for orphaned inbound recording...`);
        
        // Create a fallback call record so recording isn't lost
        try {
          const fallbackCallRecord = await prisma.callRecord.create({
            data: {
              callId: CallSid,
              phoneNumber: 'Unknown Inbound',
              callType: 'inbound',
              startTime: new Date(),
              outcome: 'completed',
              campaignId: 'inbound-calls',
              notes: `Inbound call recording recovered from webhook - ${RecordingSid}`
            }
          });

          await prisma.recording.create({
            data: {
              callRecordId: fallbackCallRecord.id,
              fileName: `inbound_recording_${RecordingSid}.wav`,
              filePath: RecordingUrl,
              duration: parseInt(RecordingDuration) || 0,
              format: 'wav',
              quality: RecordingChannels === '2' ? 'stereo' : 'mono',
              storageType: 'twilio',
              uploadStatus: 'completed'
            }
          });

          console.log(`✅ Fallback call_records entry created for orphaned inbound recording`);
        } catch (fallbackError) {
          console.error(`❌ Failed to create fallback call_records entry:`, fallbackError);
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error: any) {
    console.error('❌ Error processing inbound recording webhook:', error);
    res.status(500).send('Error');
  }
});

/**
 * POST /api/calls/inbound-answer
 * Agent accepts an inbound call
 */
router.post('/inbound-answer', answerInboundCall);

/**
 * POST /api/calls/inbound-transfer
 * Transfer inbound call to queue or another agent
 */
router.post('/inbound-transfer', transferInboundCall);

/**
 * GET /api/calls/inbound-status/:callId
 * Get current status of an inbound call
 */
router.get('/inbound-status/:callId', getInboundCallStatus);

/**
 * GET /api/calls/inbound/active
 * Get all active inbound calls (for admin/supervisor view)
 */
router.get('/inbound/active', async (req, res) => {
  try {
    // For now, return empty array since this is monitoring endpoint
    // In production, this would query active inbound calls from database
    res.json({
      success: true,
      data: {
        activeCalls: [],
        message: "No active inbound calls currently",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('❌ Error getting active inbound calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active calls',
      details: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /api/calls/twiml/inbound-agent
 * Generate TwiML for connecting agent to inbound call
 * Used when agent clicks "Answer" on inbound call notification
 */
router.post('/twiml/inbound-agent', async (req, res) => {
  try {
    const { callId, agentId } = req.query;
    
    console.log(`📞 Generating agent TwiML for inbound call ${callId}, agent ${agentId}`);
    
    if (!callId) {
      return res.type('text/xml').send(`
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Hangup/>
        </Response>
      `);
    }

    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.pause({ length: 1 });
    
    // Join the conference for this specific inbound call
    const conferenceRoom = `inbound-${callId}`;
    twiml.dial().conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: true,
      beep: false
    }, conferenceRoom);
    
    res.type('text/xml');
    res.send(twiml.toString());
    
  } catch (error: any) {
    console.error('❌ Error generating agent TwiML for inbound call:', error);
    res.type('text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Hangup/>
      </Response>
    `);
  }
});

export default router;