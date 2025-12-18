/**
 * Dialer Routes - API routes for dialer functionality
 */

import express from 'express';
import * as dialerController from '../controllers/dialerController';

const router = express.Router();

// Generate Twilio access token for browser audio
router.post('/token', dialerController.generateToken);

// Make call using REST API
router.post('/rest-api', dialerController.makeRestApiCall);

// Make call using REST API (alternative endpoint for campaign-based calling)
router.post('/call-rest-api', dialerController.makeRestApiCall);

// End active call
router.post('/end', dialerController.endCall);

// TwiML generation endpoints (called by Twilio) - support both GET and POST
// MUST be before /:callSid route to avoid being caught by wildcard
router.get('/twiml', dialerController.generateTwiML);
router.post('/twiml', dialerController.generateTwiML);

// Agent dial TwiML - for WebRTC agent to dial customer
router.get('/twiml-agent-dial', dialerController.generateAgentDialTwiML);
router.post('/twiml-agent-dial', dialerController.generateAgentDialTwiML);

// Conference TwiML endpoints for agent-customer calls
router.get('/twiml-agent', dialerController.generateAgentTwiML);
router.post('/twiml-agent', dialerController.generateAgentTwiML);
router.get('/twiml-customer', dialerController.generateCustomerTwiML);
router.post('/twiml-customer', dialerController.generateCustomerTwiML);

// Get call details (with wildcard parameter - must come AFTER specific routes)
router.get('/:callSid', dialerController.getCallDetails);

// Send DTMF tones
router.post('/dtmf', dialerController.sendDTMF);

// Status callback endpoint (called by Twilio)
router.post('/status', dialerController.handleStatusCallback);

// Recording callback endpoint (called by Twilio)
router.post('/recording-status', dialerController.handleRecordingCallback);

// Get call recordings
router.get('/:callSid/recordings', dialerController.getRecordings);

export default router;
