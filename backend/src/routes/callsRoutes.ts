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

// POST /api/calls/save-call-data - Save call data and disposition (Frontend compatibility)
router.post('/save-call-data', async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      customerInfo,
      disposition,
      callDuration,
      agentId,
      campaignId,
      callSid,
      recordingUrl
    } = req.body;

    console.log('💾 Backend: Save-call-data request for:', phoneNumber);
    console.log('💾 Backend: Request body:', JSON.stringify(req.body, null, 2));

    // REQUIRE RECORDING EVIDENCE - Only save calls that have actual recordings
    if (!callSid && !recordingUrl) {
      console.log('❌ Rejecting save-call-data: No recording evidence (callSid or recordingUrl)');
      return res.status(400).json({
        success: false,
        error: 'Call data can only be saved for calls with recordings. Please provide callSid or recordingUrl.',
        message: 'This endpoint only accepts real calls with recording evidence to prevent fake call entries.'
      });
    }

    // Validate that CallSid looks like a real Twilio CallSid
    if (callSid && !callSid.startsWith('CA') && !callSid.includes('conf-')) {
      console.log('❌ Rejecting save-call-data: Invalid CallSid format:', callSid);
      return res.status(400).json({
        success: false,
        error: 'Invalid CallSid format. Only real Twilio CallSids accepted.',
        message: 'CallSid must start with "CA" (Twilio format) or contain "conf-" (conference call).'
      });
    }

    console.log('✅ Recording evidence validated - proceeding with call save');

    // Validate required fields with safe defaults
    const safePhoneNumber = phoneNumber || 'Unknown';
    const safeAgentId = agentId || 'demo-agent';
    const safeCampaignId = campaignId || 'manual-dial';
    const safeDuration = parseInt(callDuration) || 0;

    try {
      // Ensure required dependencies exist
      await prisma.campaign.upsert({
        where: { campaignId: safeCampaignId },
        update: {},
        create: {
          campaignId: safeCampaignId,
          name: 'Manual Dialing',
          dialMethod: 'Manual',
          status: 'Active',
          isActive: true,
          description: 'Manual call records',
          recordCalls: true
        }
      });

      await prisma.dataList.upsert({
        where: { listId: 'manual-contacts' },
        update: {},
        create: {
          listId: 'manual-contacts',
          name: 'Manual Contacts',
          campaignId: safeCampaignId,
          active: true,
          totalContacts: 0
        }
      });

      // Generate unique IDs
      const uniqueCallId = `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const uniqueContactId = `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Try to find or create contact
      let contact = null;
      if (safePhoneNumber !== 'Unknown') {
        contact = await prisma.contact.findFirst({
          where: {
            OR: [
              { phone: safePhoneNumber },
              { phone: safePhoneNumber.replace(/\s+/g, '') }
            ]
          }
        });

        if (!contact && customerInfo) {
          contact = await prisma.contact.create({
            data: {
              contactId: uniqueContactId,
              listId: 'manual-contacts',
              firstName: customerInfo.firstName || 'Unknown',
              lastName: customerInfo.lastName || 'Contact',
              phone: safePhoneNumber,
              email: customerInfo.email || null,
              status: 'contacted'
            }
          });
          console.log('✅ Contact created:', contact.contactId);
        } else if (contact && customerInfo) {
          // Update existing contact with better information if provided
          const shouldUpdate = (
            (customerInfo.firstName && customerInfo.firstName !== 'Unknown' && contact.firstName === 'Unknown') ||
            (customerInfo.lastName && customerInfo.lastName !== 'Contact' && contact.lastName === 'Contact') ||
            (customerInfo.email && !contact.email)
          );

          if (shouldUpdate) {
            contact = await prisma.contact.update({
              where: { id: contact.id },
              data: {
                firstName: customerInfo.firstName || contact.firstName,
                lastName: customerInfo.lastName || contact.lastName,
                email: customerInfo.email || contact.email,
                status: 'contacted',
                lastAttempt: new Date(),
                attemptCount: { increment: 1 }
              }
            });
            console.log('✅ Contact updated with better info:', contact.contactId);
          }
        } else if (!contact) {
          // Create minimal contact for unknown callers
          contact = await prisma.contact.create({
            data: {
              contactId: uniqueContactId,
              listId: 'manual-contacts',
              firstName: 'Unknown',
              lastName: 'Contact',
              phone: safePhoneNumber,
              status: 'contacted'
            }
          });
        }
      } else {
        // Create placeholder contact for unknown numbers
        contact = await prisma.contact.create({
          data: {
            contactId: uniqueContactId,
            listId: 'manual-contacts',
            firstName: 'Unknown',
            lastName: 'Contact',
            phone: safePhoneNumber,
            status: 'contacted'
          }
        });
      }

      // Create call record with correct schema
      const callRecord = await prisma.callRecord.create({
        data: {
          callId: callSid || uniqueCallId, // Use real Twilio CallSid if provided
          agentId: safeAgentId,
          contactId: contact.contactId,
          campaignId: safeCampaignId,
          phoneNumber: safePhoneNumber,
          dialedNumber: safePhoneNumber,
          callType: 'outbound',
          startTime: new Date(Date.now() - (safeDuration * 1000)),
          endTime: new Date(),
          duration: safeDuration,
          outcome: disposition?.outcome || 'completed',
          recording: recordingUrl || null, // Include recording URL if provided
          notes: disposition?.notes || (recordingUrl ? 'Call with recording saved via save-call-data API' : 'Call saved via save-call-data API')
        }
      });

      console.log('✅ Call record created:', callRecord.callId);

      res.json({
        success: true,
        message: 'Call data saved successfully',
        data: {
          callRecord,
          contact
        }
      });

    } catch (dbError) {
      console.error('❌ Database error in save-call-data:', dbError);
      
      res.status(500).json({
        success: false,
        error: 'Database operation failed',
        message: dbError instanceof Error ? dbError.message : 'Unknown database error'
      });
    }

  } catch (error) {
    console.error('❌ Save call data error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;