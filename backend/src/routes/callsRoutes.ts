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
  console.log('🔥 SAVE-CALL-DATA ENDPOINT HIT - DEBUG VERSION ACTIVE');
  try {
    const {
      phoneNumber,
      customerInfo,
      disposition,
      callDuration,
      duration,    // Frontend sends 'duration' instead of 'callDuration'
      agentId,
      campaignId,
      callSid,
      recordingUrl
    } = req.body;

    console.log('💾 Backend: Save-call-data request for:', phoneNumber);
    console.log('💾 Backend: Request body keys:', Object.keys(req.body));
    console.log('💾 Backend: Disposition data:', JSON.stringify(disposition, null, 2));
    console.log('💾 Backend: Direct dispositionId:', req.body.dispositionId);

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
    let safeAgentId = agentId || 'system-agent';
    const safeCampaignId = campaignId || 'manual-dial';
    const safeDuration = parseInt(callDuration || duration) || 0;  // Handle both field names

    // AGENT ID FIX: If agentId is "509" (which doesn't exist), map to system-agent
    if (agentId === '509') {
      safeAgentId = 'system-agent';
      console.log('🔧 Mapped agent 509 to system-agent (missing from database)');
    }

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

      // Try to find or create contact with better conflict handling
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
          // Use upsert to avoid contactId conflicts
          try {
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
          } catch (contactError: any) {
            console.log('⚠️ Contact creation failed, trying to find existing:', contactError.message);
            // If contact creation fails due to unique constraint, try to find it again
            contact = await prisma.contact.findFirst({
              where: {
                OR: [
                  { phone: safePhoneNumber },
                  { phone: safePhoneNumber.replace(/\s+/g, '') }
                ]
              }
            });
            
            if (!contact) {
              throw new Error('Unable to create or find contact');
            }
          }
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
          // Create minimal contact for unknown callers with error handling
          try {
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
          } catch (contactError: any) {
            console.log('⚠️ Minimal contact creation failed, trying to find existing:', contactError.message);
            contact = await prisma.contact.findFirst({
              where: {
                phone: safePhoneNumber
              }
            });
            
            if (!contact) {
              throw new Error('Unable to create or find minimal contact');
            }
          }
        }
      } else {
        // Create placeholder contact for unknown numbers with error handling  
        try {
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
        } catch (contactError: any) {
          console.log('⚠️ Placeholder contact creation failed, using fallback:', contactError.message);
          // Create a truly unique contactId for fallback
          const fallbackContactId = `contact-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
          contact = await prisma.contact.create({
            data: {
              contactId: fallbackContactId,
              listId: 'manual-contacts',
              firstName: 'Unknown',
              lastName: 'Contact',
              phone: safePhoneNumber || 'Unknown',
              status: 'contacted'
            }
          });
        }
      }

      // Validate disposition if provided
      let validDispositionId = null;
      let debugInfo = {
        dispositionFound: false,
        campaignLinkFound: false,
        autoFixAttempted: false,
        autoFixSuccess: false,
        errors: [] as string[]
      };
      
      if (disposition?.id || req.body.dispositionId) {
        const dispositionIdToCheck = disposition?.id || req.body.dispositionId;
        console.log('🔍 Checking disposition ID:', dispositionIdToCheck);
        console.log('🔍 For campaign:', safeCampaignId);
        try {
          // First check if disposition exists
          const existingDisposition = await prisma.disposition.findUnique({
            where: { id: dispositionIdToCheck }
          });
          if (existingDisposition) {
            debugInfo.dispositionFound = true;
            console.log('✅ Valid disposition found:', existingDisposition.name, 'ID:', dispositionIdToCheck);
            
            // Check if this disposition is linked to the campaign
            const campaignDisposition = await prisma.campaignDisposition.findUnique({
              where: {
                campaignId_dispositionId: {
                  campaignId: safeCampaignId,
                  dispositionId: dispositionIdToCheck
                }
              }
            });
            
            if (campaignDisposition) {
              debugInfo.campaignLinkFound = true;
              validDispositionId = dispositionIdToCheck;
              console.log('✅ Disposition is linked to campaign - APPROVED for save');
            } else {
              console.log('❌ Disposition NOT linked to campaign', safeCampaignId);
              console.log('   🔧 AUTO-FIXING: Creating campaign disposition link...');
              debugInfo.autoFixAttempted = true;
              
              // AUTO-FIX: Create the missing campaign disposition link
              try {
                await prisma.campaignDisposition.create({
                  data: {
                    campaignId: safeCampaignId,
                    dispositionId: dispositionIdToCheck,
                    isRequired: false,
                    sortOrder: 99 // Put auto-created ones at end
                  }
                });
                
                debugInfo.autoFixSuccess = true;
                validDispositionId = dispositionIdToCheck;
                console.log('✅ AUTO-FIX SUCCESS: Created campaign disposition link');
                console.log('   Disposition can now be used for manual calls');
                
              } catch (autoFixError: any) {
                debugInfo.errors.push(`Auto-fix failed: ${autoFixError.message}`);
                console.log('❌ AUTO-FIX FAILED:', autoFixError.message);
                console.log('   Proceeding without dispositionId');
              }
            }
          } else {
            debugInfo.errors.push('Disposition not found in database');
            console.log('⚠️ Disposition not found, proceeding without dispositionId:', dispositionIdToCheck);
          }
        } catch (dispositionError: any) {
          debugInfo.errors.push(`Disposition validation error: ${dispositionError.message}`);
          console.log('⚠️ Disposition validation failed:', dispositionError.message);
        }
      } else {
        console.log('⚠️ No disposition ID provided in request');
        debugInfo.errors.push('No disposition ID provided');
      }

      // FALLBACK: If no valid disposition found but outcome is provided, proceed without dispositionId
      if (!validDispositionId && (disposition?.outcome || disposition?.name)) {
        console.log('🔄 No valid dispositionId but outcome provided, proceeding without DB link');
        console.log('   Outcome:', disposition?.outcome || disposition?.name);
        debugInfo.errors.push('Using outcome without DB disposition link');
      }

      // Create or update call record with correct schema
      // Use upsert to handle case where Twilio webhook already created the record
      const finalCallId = callSid || uniqueCallId;
      console.log('💾 Creating/updating call record with dispositionId:', validDispositionId);
      
      const callRecord = await prisma.callRecord.upsert({
        where: { callId: finalCallId },
        update: {
          // Update existing record with disposition and duration info
          agentId: safeAgentId,
          contactId: contact.contactId,
          campaignId: safeCampaignId,
          phoneNumber: safePhoneNumber,
          duration: safeDuration,
          outcome: disposition?.outcome || 'completed',
          dispositionId: validDispositionId,
          recording: recordingUrl || null,
          notes: disposition?.notes || (recordingUrl ? 'Call with recording saved via save-call-data API' : 'Call saved via save-call-data API'),
          endTime: new Date()
        },
        create: {
          // Create new record if it doesn't exist
          callId: finalCallId,
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
          dispositionId: validDispositionId,
          recording: recordingUrl || null,
          notes: disposition?.notes || (recordingUrl ? 'Call with recording saved via save-call-data API' : 'Call saved via save-call-data API')
        }
      });

      console.log('✅ Call record created/updated:', callRecord.callId, 'with dispositionId:', callRecord.dispositionId);

      res.json({
        success: true,
        message: 'Call data saved successfully',
        warning: validDispositionId ? null : 'Disposition ID not found - call saved without disposition link',
        debug: {
          campaignId: safeCampaignId,
          receivedDispositionId: req.body.dispositionId,
          receivedDisposition: disposition,
          validatedDispositionId: validDispositionId,
          validationDebug: debugInfo,
          debugFlow: {
            step1_dispositionExists: 'checked',
            step2_campaignLinkExists: validDispositionId ? 'yes' : 'no_or_failed',
            step3_autoFixAttempted: validDispositionId ? 'not_needed' : 'needed'
          },
          finalCallRecord: {
            callId: callRecord.callId,
            dispositionId: callRecord.dispositionId,
            agentId: callRecord.agentId,
            duration: callRecord.duration
          }
        },
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