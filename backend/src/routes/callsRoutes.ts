/**
 * Calls Routes - Handle Twilio REST API calls and TwiML responses
 */
import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createRestApiCall, generateAccessToken } from '../services/twilioService';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/calls/token - Generate Twilio access token for agent
router.get('/token/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    
    const accessToken = generateAccessToken(agentId);
    
    res.json({
      success: true,
      data: {
        token: accessToken,
        agentId: agentId
      }
    });
  } catch (error) {
    console.error('Error generating access token:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate access token' }
    });
  }
});

// POST /api/calls/twiml-outbound - TwiML for outbound calls from queue
router.post('/twiml-outbound', async (req: Request, res: Response) => {
  try {
    const { queueId, campaignId } = req.query;
    const { CallStatus, CallSid, From, To } = req.body;

    console.log('🔊 TwiML outbound webhook:', { CallStatus, CallSid, From, To, queueId, campaignId });

    // Update call record with Twilio status
    if (queueId && CallSid) {
      try {
        await prisma.callRecord.updateMany({
          where: {
            notes: { contains: CallSid }
          },
          data: {
            outcome: CallStatus,
            ...(CallStatus === 'completed' && { endTime: new Date() })
          }
        });

        // Update queue entry status
        await prisma.dialQueueEntry.updateMany({
          where: { queueId: queueId as string },
          data: {
            status: CallStatus === 'completed' ? 'completed' : 'dialing',
            outcome: CallStatus,
            ...(CallStatus === 'completed' && { completedAt: new Date() })
          }
        });

        // Unlock contact when call completes
        if (CallStatus === 'completed' || CallStatus === 'failed' || CallStatus === 'no-answer') {
          const queueEntry = await prisma.dialQueueEntry.findFirst({
            where: { queueId: queueId as string },
            include: { contact: true }
          });

          if (queueEntry) {
            await prisma.contact.update({
              where: { id: queueEntry.contact.id },
              data: {
                locked: false,
                lockedBy: null,
                lockedAt: null,
                lastOutcome: CallStatus
              }
            });
          }
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
      }
    }

    // Generate TwiML response to dial the customer
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="30" record="record-from-ringing-dual">
    <Number>${To}</Number>
  </Dial>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error in TwiML outbound:', error);
    res.status(500).set('Content-Type', 'text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Please try again.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// POST /api/calls/twiml-agent - TwiML for agent leg of conference call
router.post('/twiml-agent', async (req: Request, res: Response) => {
  try {
    const { conference } = req.query;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting you to the customer.</Say>
  <Conference waitUrl="" startConferenceOnEnter="true" endConferenceOnExit="true">
    ${conference}
  </Conference>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error in TwiML agent:', error);
    res.status(500).set('Content-Type', 'text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Please try again.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// POST /api/calls/twiml-customer - TwiML for customer leg of conference call
router.post('/twiml-customer', async (req: Request, res: Response) => {
  try {
    const { conference } = req.query;

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Conference waitUrl="" startConferenceOnEnter="false" endConferenceOnExit="false">
    ${conference}
  </Conference>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error in TwiML customer:', error);
    res.status(500).set('Content-Type', 'text/xml').send(`
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Please try again.</Say>
        <Hangup/>
      </Response>
    `);
  }
});

// POST /api/calls/webhook/status - Handle call status updates from Twilio
router.post('/webhook/status', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, Duration, From, To } = req.body;
    
    console.log('📞 Call status webhook:', { CallSid, CallStatus, Duration, From, To });

    // Update call record with final status
    await prisma.callRecord.updateMany({
      where: {
        notes: { contains: CallSid }
      },
      data: {
        outcome: CallStatus,
        duration: Duration ? parseInt(Duration) : null,
        endTime: new Date()
      }
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling status webhook:', error);
    res.status(500).send('Error');
  }
});

export default router;