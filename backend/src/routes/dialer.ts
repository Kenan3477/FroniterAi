/**
 * Dialer Routes - API routes for dialer functionality
 */

import express from 'express';
import * as dialerController from '../controllers/dialerController';

const router = express.Router();

// Generate Twilio access token
router.post('/token', dialerController.generateToken);

// Initiate outbound call
router.post('/initiate', dialerController.initiateCall);

// End active call
router.post('/end', dialerController.endCall);

// Get call details
router.get('/:callSid', dialerController.getCallDetails);

// Send DTMF tones
router.post('/dtmf', dialerController.sendDTMF);

// TwiML generation endpoint (called by Twilio) - support both GET and POST
router.get('/twiml', dialerController.generateTwiML);
router.post('/twiml', dialerController.generateTwiML);

// Status callback endpoint (called by Twilio)
router.post('/status', dialerController.handleStatusCallback);

// Recording callback endpoint (called by Twilio)
router.post('/recording-status', dialerController.handleRecordingCallback);

// Get call recordings
router.get('/:callSid/recordings', dialerController.getRecordings);

export default router;
