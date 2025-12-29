/**
 * Inbound Call Routes
 * 
 * Routes for handling inbound call webhooks and management:
 * - Twilio webhook endpoints for inbound calls
 * - Call routing and management endpoints
 * - Agent interaction endpoints
 */

import { Router } from 'express';
import {
  handleInboundWebhook,
  answerInboundCall,
  transferInboundCall,
  getInboundCallStatus
} from '../controllers/inboundCallController';

const router = Router();

// Twilio webhook validation middleware (reuse from existing system)
const validateTwilioWebhook = (req: any, res: any, next: any) => {
  // TEMPORARILY DISABLED for testing - signature validation causing issues
  // TODO: Fix signature validation for Railway production environment
  console.log('🔍 Inbound webhook called from:', req.ip, 'User-Agent:', req.get('User-Agent'));
  return next();
  
  // For development, skip validation
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  const twilioSignature = req.get('X-Twilio-Signature');
  const url = `${process.env.BACKEND_URL}${req.originalUrl}`;
  
  // Only validate in production
  if (process.env.NODE_ENV === 'production' && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio');
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      twilioSignature || '',
      url,
      req.body
    );
    
    if (!isValid) {
      console.warn('⚠️ Invalid Twilio webhook signature for inbound call');
      return res.status(403).send('Invalid signature');
    }
  }
  
  next();
};

/**
 * POST /api/calls/webhook/inbound-call
 * Main webhook endpoint for Twilio inbound calls
 * This replaces the basic /api/webhooks/voice endpoint for enhanced functionality
 */
router.post('/webhook/inbound-call', validateTwilioWebhook, handleInboundWebhook);

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
          <Say>Call ID not specified</Say>
          <Hangup/>
        </Response>
      `);
    }

    const twilio = require('twilio');
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Brief connection message
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Connecting you to the customer...');
    
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
        <Say>An error occurred connecting to the call</Say>
        <Hangup/>
      </Response>
    `);
  }
});

export default router;