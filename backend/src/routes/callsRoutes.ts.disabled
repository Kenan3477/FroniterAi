// SIP Call Control API Routes
import express from 'express';
import { sipCallControlService, CallAction } from '../services/sipCallControlService';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * POST /api/calls/initiate
 * Initiate an outbound call
 */
router.post('/initiate',
  validateRequest([
    body('agentId').isString().notEmpty(),
    body('phoneNumber').isMobilePhone('any'),
    body('campaignId').optional().isString(),
    body('contactId').optional().isString(),
    body('callerId').optional().isMobilePhone('any'),
    body('metadata').optional().isObject(),
  ]),
  async (req, res) => {
    try {
      const { agentId, phoneNumber, campaignId, contactId, callerId, metadata } = req.body;
      
      const callState = await sipCallControlService.initiateCall({
        agentId,
        phoneNumber,
        campaignId,
        contactId,
        callerId,
        metadata,
      });

      res.json({
        success: true,
        data: callState,
        message: 'Call initiated successfully'
      });
    } catch (error) {
      console.error('Error initiating call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/calls/:callId/answer
 * Answer a call
 */
router.post('/:callId/answer',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('agentId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { agentId } = req.body;

      const callState = await sipCallControlService.answerCall(callId, agentId);

      res.json({
        success: true,
        data: callState,
        message: 'Call answered successfully'
      });
    } catch (error) {
      console.error('Error answering call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/calls/:callId/end
 * End a call
 */
router.post('/:callId/end',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('reason').optional().isString(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { reason } = req.body;

      const callState = await sipCallControlService.endCall(callId, reason);

      res.json({
        success: true,
        data: callState,
        message: 'Call ended successfully'
      });
    } catch (error) {
      console.error('Error ending call:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/calls/:callId/action
 * Perform call control action (hold, unhold, mute, unmute, transfer)
 */
router.post('/:callId/action',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('action').isIn(['hold', 'unhold', 'mute', 'unmute', 'transfer']),
    body('targetNumber').optional().isMobilePhone('any'),
    body('muted').optional().isBoolean(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { action, targetNumber, muted } = req.body;

      let callState;

      switch (action) {
        case 'hold':
          callState = await sipCallControlService.holdCall(callId);
          break;
        case 'unhold':
          callState = await sipCallControlService.unholdCall(callId);
          break;
        case 'mute':
        case 'unmute':
          const isMuted = action === 'mute' || muted === true;
          callState = await sipCallControlService.muteCall(callId, isMuted);
          break;
        case 'transfer':
          if (!targetNumber) {
            return res.status(400).json({
              success: false,
              error: 'Target number is required for transfer action'
            });
          }
          callState = await sipCallControlService.transferCall(callId, targetNumber);
          break;
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }

      res.json({
        success: true,
        data: callState,
        message: `Call ${action} executed successfully`
      });
    } catch (error) {
      console.error('Error performing call action:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/calls/:callId/dtmf
 * Send DTMF tones
 */
router.post('/:callId/dtmf',
  validateRequest([
    param('callId').isString().notEmpty(),
    body('digits').matches(/^[0-9*#]+$/),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const { digits } = req.body;

      await sipCallControlService.sendDTMFTones(callId, digits);

      res.json({
        success: true,
        message: `DTMF digits ${digits} sent successfully`
      });
    } catch (error) {
      console.error('Error sending DTMF:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/calls/:callId
 * Get call state
 */
router.get('/:callId',
  validateRequest([
    param('callId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.params;
      const callState = sipCallControlService.getCallState(callId);

      if (!callState) {
        return res.status(404).json({
          success: false,
          error: 'Call not found'
        });
      }

      res.json({
        success: true,
        data: callState
      });
    } catch (error) {
      console.error('Error getting call state:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/calls/agent/:agentId
 * Get active calls for an agent
 */
router.get('/agent/:agentId',
  validateRequest([
    param('agentId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const calls = sipCallControlService.getActiveCallsForAgent(agentId);

      res.json({
        success: true,
        data: calls
      });
    } catch (error) {
      console.error('Error getting agent calls:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/calls/campaign/:campaignId
 * Get active calls for a campaign
 */
router.get('/campaign/:campaignId',
  validateRequest([
    param('campaignId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { campaignId } = req.params;
      const calls = sipCallControlService.getActiveCallsForCampaign(campaignId);

      res.json({
        success: true,
        data: calls
      });
    } catch (error) {
      console.error('Error getting campaign calls:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/calls/stats
 * Get call statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = sipCallControlService.getCallStatistics();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting call statistics:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/calls/token/:agentId
 * Generate access token for agent
 */
router.post('/token/:agentId',
  validateRequest([
    param('agentId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { agentId } = req.params;
      const token = await sipCallControlService.generateAgentAccessToken(agentId);

      res.json({
        success: true,
        data: { token },
        message: 'Access token generated successfully'
      });
    } catch (error) {
      console.error('Error generating access token:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * Twilio webhooks for call status updates
 */

/**
 * POST /api/calls/webhook/status
 * Twilio status callback webhook
 */
router.post('/webhook/status',
  validateRequest([
    query('callId').isString().notEmpty(),
    body('CallStatus').isString(),
    body('CallSid').isString(),
    body('CallDuration').optional().isString(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.query;
      const { CallStatus, CallSid, CallDuration } = req.body;

      const metadata: Record<string, any> = {
        sipCallId: CallSid,
      };

      if (CallDuration) {
        metadata.duration = parseInt(CallDuration, 10);
      }

      await sipCallControlService.updateCallStatus(callId as string, CallStatus, metadata);

      // Respond with empty TwiML to acknowledge
      res.set('Content-Type', 'text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error('Error handling status webhook:', error);
      res.status(500).send('Error');
    }
  }
);

/**
 * POST /api/calls/webhook/recording
 * Twilio recording callback webhook
 */
router.post('/webhook/recording',
  validateRequest([
    query('callId').isString().notEmpty(),
    body('RecordingSid').optional().isString(),
    body('RecordingUrl').optional().isURL(),
    body('RecordingStatus').optional().isString(),
    body('RecordingDuration').optional().isString(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.query;
      const { RecordingSid, RecordingUrl, RecordingStatus, RecordingDuration } = req.body;

      const callState = sipCallControlService.getCallState(callId as string);
      if (callState) {
        callState.metadata = {
          ...callState.metadata,
          recording: {
            sid: RecordingSid,
            url: RecordingUrl,
            status: RecordingStatus,
            duration: RecordingDuration ? parseInt(RecordingDuration, 10) : undefined,
          },
        };
        callState.isRecording = RecordingStatus === 'completed';
      }

      console.log(`🎙️ Recording update for call ${callId}: ${RecordingStatus}`);

      // Respond with empty TwiML to acknowledge
      res.set('Content-Type', 'text/xml');
      res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    } catch (error) {
      console.error('Error handling recording webhook:', error);
      res.status(500).send('Error');
    }
  }
);

/**
 * TwiML generation routes
 */

/**
 * POST /api/calls/twiml/inbound
 * Generate TwiML for inbound calls
 */
router.post('/twiml/inbound', async (req, res) => {
  try {
    const { From, To, CallSid } = req.body;

    // Handle inbound call and create call state
    const callState = await sipCallControlService.handleInboundCall({
      sipCallId: CallSid,
      fromNumber: From,
      toNumber: To,
    });

    // Generate TwiML to hold caller while finding available agent
    const twiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Please hold while we connect you to the next available agent.</Say>
        <Play loop="3">http://com.twilio.sounds.music.s3.amazonaws.com/ClockworkWaltz.mp3</Play>
        <Redirect>${process.env.BACKEND_URL}/api/calls/twiml/route?callId=${callState.callId}</Redirect>
      </Response>
    `;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error generating inbound TwiML:', error);
    
    const errorTwiml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, but we're unable to take your call at this time. Please try again later.</Say>
        <Hangup />
      </Response>
    `;

    res.set('Content-Type', 'text/xml');
    res.send(errorTwiml);
  }
});

/**
 * POST /api/calls/twiml/outbound
 * Generate TwiML for outbound calls
 */
router.post('/twiml/outbound',
  validateRequest([
    query('callId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.query;
      const { CallStatus } = req.body;

      const callState = sipCallControlService.getCallState(callId as string);
      
      if (!callState || !callState.agentId) {
        const errorTwiml = `
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Hangup />
          </Response>
        `;
        res.set('Content-Type', 'text/xml');
        res.send(errorTwiml);
        return;
      }

      // Connect outbound call to agent
      const twiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Dial>
            <Client>${callState.agentId}</Client>
          </Dial>
        </Response>
      `;

      res.set('Content-Type', 'text/xml');
      res.send(twiml);
    } catch (error) {
      console.error('Error generating outbound TwiML:', error);
      
      const errorTwiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Hangup />
        </Response>
      `;

      res.set('Content-Type', 'text/xml');
      res.send(errorTwiml);
    }
  }
);

/**
 * POST /api/calls/twiml/route
 * Route inbound call to available agent
 */
router.post('/twiml/route',
  validateRequest([
    query('callId').isString().notEmpty(),
  ]),
  async (req, res) => {
    try {
      const { callId } = req.query;
      
      // This would integrate with agent availability system
      // For now, we'll create a simple queue mechanism
      const availableAgent = 'agent_1'; // TODO: Implement agent availability lookup

      if (availableAgent) {
        const callState = sipCallControlService.getCallState(callId as string);
        if (callState) {
          await sipCallControlService.answerCall(callId as string, availableAgent);
        }

        const twiml = `
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say>Connecting you to an agent now.</Say>
            <Dial>
              <Client>${availableAgent}</Client>
            </Dial>
          </Response>
        `;

        res.set('Content-Type', 'text/xml');
        res.send(twiml);
      } else {
        // No agents available
        const twiml = `
          <?xml version="1.0" encoding="UTF-8"?>
          <Response>
            <Say>All agents are currently busy. Please try again later or leave a message after the tone.</Say>
            <Record action="${process.env.BACKEND_URL}/api/calls/twiml/voicemail?callId=${callId}" />
          </Response>
        `;

        res.set('Content-Type', 'text/xml');
        res.send(twiml);
      }
    } catch (error) {
      console.error('Error routing call:', error);
      
      const errorTwiml = `
        <?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>We're sorry, but we're unable to route your call at this time.</Say>
          <Hangup />
        </Response>
      `;

      res.set('Content-Type', 'text/xml');
      res.send(errorTwiml);
    }
  }
);

export default router;