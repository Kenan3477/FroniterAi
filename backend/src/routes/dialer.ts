/**
 * Dialer Routes - API routes for dialer functionality
 */

import express from 'express';
import * as dialerController from '../controllers/dialerController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Generate Twilio access token for browser audio
router.post('/token', authenticate, dialerController.generateToken);

// Make call using REST API
router.post('/rest-api', authenticate, dialerController.makeRestApiCall);

// Make call using REST API (alternative endpoint for campaign-based calling)
router.post('/call-rest-api', authenticate, dialerController.makeRestApiCall);

// End active call
router.post('/end', authenticate, dialerController.endCall);

// Hold/unhold call
router.post('/hold', authenticate, dialerController.holdCall);

// TwiML generation endpoints (called by Twilio) - support both GET and POST
// MUST be before /:callSid route to avoid being caught by wildcard
// NOTE: TwiML endpoints are called by Twilio, not the frontend, so no auth needed
router.get('/twiml', dialerController.generateTwiML);
router.post('/twiml', dialerController.generateTwiML);

// Agent dial TwiML - for WebRTC agent to dial customer
router.get('/twiml-agent-dial', dialerController.generateAgentDialTwiML);
router.post('/twiml-agent-dial', dialerController.generateAgentDialTwiML);

// Customer to Agent TwiML - connects customer directly to WebRTC agent  
router.get('/twiml-customer-to-agent', dialerController.generateCustomerToAgentTwiML);
router.post('/twiml-customer-to-agent', dialerController.generateCustomerToAgentTwiML);

// Conference TwiML endpoints for agent-customer calls
router.get('/twiml-agent', dialerController.generateAgentTwiML);
router.post('/twiml-agent', dialerController.generateAgentTwiML);
router.get('/twiml-customer', dialerController.generateCustomerTwiML);
router.post('/twiml-customer', dialerController.generateCustomerTwiML);

// Get call details (with wildcard parameter - must come AFTER specific routes)
router.get('/:callSid', authenticate, dialerController.getCallDetails);

// Send DTMF tones
router.post('/dtmf', authenticate, dialerController.sendDTMF);

// Status callback endpoint (called by Twilio) - no auth needed for webhooks
router.post('/status', dialerController.handleStatusCallback);

// Recording callback endpoint (called by Twilio) - no auth needed for webhooks  
router.post('/recording-status', dialerController.handleRecordingCallback);

// Get call recordings
router.get('/:callSid/recordings', authenticate, dialerController.getRecordings);

export default router;
