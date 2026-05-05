/**
 * Calls Routes - Handle Twilio REST API calls and TwiML responses
 */
import express from 'express';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { createRestApiCall, generateAccessToken } from '../services/twilioService';
import { authenticate, requireRole } from '../middleware/auth';
import { getTwilioWebhookBaseUrl } from '../config/voiceMedia';
import { buildLiveMonitorConferenceTwiml } from '../utils/liveMonitorTwiml';
import { resolveTwilioVoiceIdentityForUserId } from '../utils/twilioVoiceClientIdentity';

const router = express.Router();

/** User id from Bearer JWT when body omits agentId (disposition save). */
function extractUserIdFromBearer(req: Request): number | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  const token = h.slice(7).trim();
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) return null;
  try {
    const p = jwt.verify(token, secret) as { userId?: unknown; sub?: unknown };
    const raw = p.userId ?? p.sub;
    const n = parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

// POST /api/calls/force-end - Force end a stuck call (ADMIN ONLY)
router.post('/force-end', authenticate, requireRole('ADMIN', 'SUPERVISOR'), async (req: Request, res: Response) => {
  try {
    const { callId, reason } = req.body;
    
    if (!callId) {
      return res.status(400).json({
        success: false,
        error: 'callId is required'
      });
    }
    
    console.log(`🔧 ADMIN FORCE END: ${req.user?.username} force ending call ${callId}`);
    console.log(`📋 Reason: ${reason || 'No reason provided'}`);
    
    // Find the call
    const call = await prisma.callRecord.findFirst({
      where: {
        callId: callId,
        endTime: null // Only end active calls
      }
    });
    
    if (!call) {
      return res.status(404).json({
        success: false,
        error: 'Active call not found with that ID'
      });
    }
    
    // Force end the call
    const now = new Date();
    const updatedCall = await prisma.callRecord.update({
      where: { id: call.id },
      data: {
        endTime: now,
        outcome: 'COMPLETED',
        notes: (call.notes || '') + ` [ADMIN-FORCE-END-${now.toISOString()}] Ended by ${req.user?.username}. Reason: ${reason || 'Stuck call cleanup'}`
      }
    });
    
    console.log(`✅ Call ${callId} force ended successfully by ${req.user?.username}`);
    
    res.json({
      success: true,
      message: 'Call ended successfully',
      data: {
        callId: callId,
        endedAt: now,
        endedBy: req.user?.username,
        reason: reason
      }
    });
    
  } catch (error) {
    console.error('❌ Error force ending call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force end call'
    });
  }
});

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

// POST /api/calls/token - Same as GET (Next.js proxy uses POST with JSON body)
router.post('/token', authenticate, async (req: Request, res: Response) => {
  try {
    const bodyAgent = typeof req.body?.agentId === 'string' ? req.body.agentId.trim() : '';
    const defaultShared = 'agent-browser';
    const identity =
      !bodyAgent || bodyAgent === defaultShared
        ? await resolveTwilioVoiceIdentityForUserId(req.user?.userId)
        : bodyAgent;
    const accessToken = generateAccessToken(identity);
    res.json({
      success: true,
      data: {
        token: accessToken,
        agentId: identity,
        identity,
      },
    });
  } catch (error) {
    console.error('Error generating access token (POST):', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate access token' },
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
    // 🚫 NO TTS — silent hangup on error (compact XML, no stray whitespace).
    res.status(500).set('Content-Type', 'text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Hangup/></Response>`,
    );
  }
});

// POST /api/calls/twiml-agent - TwiML for agent leg of conference call
router.post('/twiml-agent', async (req: Request, res: Response) => {
  try {
    const { conference } = req.query;

    // 🚫 NO TTS — straight into the conference.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Conference waitUrl="" startConferenceOnEnter="true" endConferenceOnExit="true">
    ${conference}
  </Conference>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error in TwiML agent:', error);
    res.status(500).set('Content-Type', 'text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Hangup/></Response>`,
    );
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
    res.status(500).set('Content-Type', 'text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Hangup/></Response>`,
    );
  }
});

// POST /api/calls/twiml-live-monitor - TwiML for supervisor listen-in (muted conference join)
router.post('/twiml-live-monitor', async (req: Request, res: Response) => {
  try {
    const raw = (req.query.conference as string) || '';
    const conference = decodeURIComponent(raw).trim();
    if (!conference || !/^conf-[a-zA-Z0-9._-]+$/i.test(conference)) {
      res.status(400).set('Content-Type', 'text/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Hangup/></Response>`,
      );
      return;
    }
    const twiml = buildLiveMonitorConferenceTwiml(conference);
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error in TwiML live-monitor:', error);
    res.status(500).set('Content-Type', 'text/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Hangup/></Response>`,
    );
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
      conferenceId,  // 🚨 NEW: Conference ID for finding preliminary record
      dialCorrelationId: dialCorrelationIdBody,
      recordingUrl
    } = req.body;

    console.log('💾 Backend: Save-call-data request for:', phoneNumber);
    console.log('💾 Backend: Request body keys:', Object.keys(req.body));
    console.log('💾 Backend: Disposition data:', JSON.stringify(disposition, null, 2));
    console.log('💾 Backend: Direct dispositionId:', req.body.dispositionId);
    const dialCorrelationId =
      typeof dialCorrelationIdBody === 'string' && dialCorrelationIdBody.trim().length > 0
        ? dialCorrelationIdBody.trim()
        : undefined;
    console.log('💾 dialCorrelationId:', dialCorrelationId || '(none)');

    // Map disposition names to proper outcome values for successful call tracking
    function mapDispositionToOutcome(disposition: any): string {
      if (!disposition) return 'completed';
      
      const dispositionName = (disposition.name || disposition.outcome || '').toLowerCase().trim();
      const dispositionNotes = (disposition.notes || '').toLowerCase().trim();
      
      console.log('🔍 Mapping disposition:', dispositionName, 'with notes:', dispositionNotes);
      
      // Map specific disposition names to outcomes
      if (dispositionName.includes('no answer') || dispositionName.includes('no_answer')) {
        return 'no_answer';
      }
      if (dispositionName.includes('answering machine') || dispositionName.includes('voicemail')) {
        return 'answering_machine';
      }
      if (dispositionName.includes('busy')) {
        return 'busy';
      }
      if (dispositionName.includes('sale') || dispositionName.includes('sold')) {
        return 'sale';
      }
      if (dispositionName.includes('interested')) {
        return 'interested';
      }
      if (dispositionName.includes('callback') || dispositionName.includes('call back')) {
        return 'callback';
      }
      if (dispositionName.includes('not interested') || dispositionName.includes('not_interested')) {
        return 'not_interested';
      }
      if (dispositionName.includes('disconnected') || dispositionName.includes('hung up')) {
        return 'disconnected';
      }
      
      // Default to the original outcome or 'completed'
      return disposition.outcome || 'completed';
    }

    const mappedOutcome = mapDispositionToOutcome(disposition);
    console.log('📊 Mapped disposition outcome:', mappedOutcome);

    // RECORDING VALIDATION - Validate CallSid format if provided
    if (callSid) {
      if (!callSid.startsWith('CA') && !callSid.includes('conf-')) {
        console.log('❌ Rejecting save-call-data: Invalid CallSid format:', callSid);
        return res.status(400).json({
          success: false,
          error: 'Invalid CallSid format. Only real Twilio CallSids accepted.',
          message: 'CallSid must start with "CA" (Twilio format) or contain "conf-" (conference call).'
        });
      }
      console.log('✅ Valid Twilio CallSid detected:', callSid);
    } else {
      console.log('⚠️  No CallSid provided - call will be saved but may not have recording link initially');
    }

    console.log('✅ Proceeding with call save...');

    // Validate required fields with safe defaults  
    const safePhoneNumber = phoneNumber || 'Unknown';
    let safeAgentId = String(agentId || 'system-agent'); // Ensure agentId is always a string (frontend should now send as string)
    let safeCampaignId = campaignId || 'manual-dial';
    const safeDuration = parseInt(callDuration || duration) || 0;  // Handle both field names

    // Validate campaign exists or create fallback
    if (campaignId && campaignId !== 'manual-dial') {
      // User provided a specific campaign - verify it exists
      const existingCampaign = await prisma.campaign.findUnique({
        where: { campaignId: safeCampaignId }
      });
      
      if (!existingCampaign) {
        console.warn(`⚠️ Campaign ${safeCampaignId} not found, using fallback`);
        safeCampaignId = 'Manual Dialing'; // Use default fallback
      } else {
        console.log(`✅ Using existing campaign: ${existingCampaign.name} (${safeCampaignId})`);
      }
    }

    // Only create the fallback campaign if using default
    if (safeCampaignId === 'manual-dial' || safeCampaignId === 'Manual Dialing') {
      await prisma.campaign.upsert({
        where: { campaignId: 'Manual Dialing' },
        update: {},
        create: {
          campaignId: 'Manual Dialing',
          name: 'Manual Dialing',
          dialMethod: 'Manual',
          status: 'Active',
          isActive: true,
          description: 'Manual call records',
          recordCalls: true
        }
      });
      safeCampaignId = 'Manual Dialing';
    }

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

    // Phone number normalization function
    function normalizePhoneNumber(phone: string): string[] {
      if (!phone || phone === 'Unknown') return [];
      
      // Remove all non-digit characters
      const digitsOnly = phone.replace(/\D/g, '');
      
      // Generate different variants
      const variants = new Set<string>();
      
      // Original number (cleaned)
      variants.add(digitsOnly);
      
      // UK format handling - if starts with 44, also try with 0 prefix
      if (digitsOnly.startsWith('44')) {
        const withoutCountryCode = digitsOnly.substring(2);
        variants.add('0' + withoutCountryCode);
        variants.add(withoutCountryCode);
      }
      
      // If starts with 0, also try without 0
      if (digitsOnly.startsWith('0')) {
        variants.add(digitsOnly.substring(1));
        // Also try with +44
        variants.add('44' + digitsOnly.substring(1));
      }
      
      // If doesn't start with 0 or 44, try with 0 prefix
      if (!digitsOnly.startsWith('0') && !digitsOnly.startsWith('44')) {
        variants.add('0' + digitsOnly);
        variants.add('44' + digitsOnly);
      }
      
      // Convert back to array and log for debugging
      const result = Array.from(variants).filter(v => v.length > 0);
      console.log(`📞 Phone number variants for ${phone}:`, result);
      return result;
    }

    /**
     * Map User.id (numeric string from JWT) → Agent.agentId for FK-safe call_record updates.
     */
    async function resolveAgentIdForSave(rawAgentId: string): Promise<string> {
      const trimmed = (rawAgentId || '').trim();
      if (!trimmed || trimmed === 'system-agent') return trimmed || 'system-agent';
      if (!/^\d+$/.test(trimmed)) return trimmed;

      try {
        const u = await prisma.user.findUnique({
          where: { id: parseInt(trimmed, 10) },
          select: { email: true },
        });
        if (!u?.email) return trimmed;
        const ag = await prisma.agent.findFirst({
          where: { email: { equals: u.email, mode: 'insensitive' } },
          select: { agentId: true },
        });
        if (ag?.agentId) {
          console.log(`🔄 save-call-data: resolved User.id ${trimmed} → Agent.agentId ${ag.agentId}`);
          return ag.agentId;
        }
      } catch (e: any) {
        console.warn('⚠️ save-call-data: could not resolve User→Agent:', e?.message);
      }
      return trimmed;
    }

    safeAgentId = await resolveAgentIdForSave(safeAgentId);

    if (safeAgentId === 'system-agent') {
      const uidFromBearer = extractUserIdFromBearer(req);
      if (uidFromBearer != null) {
        safeAgentId = await resolveAgentIdForSave(String(uidFromBearer));
        console.log('🔄 save-call-data: agentId inferred from JWT →', safeAgentId);
      }
    }

    // Try to find or create contact with better phone number matching
    let contact = null;
    if (safePhoneNumber !== 'Unknown') {
      const phoneVariants = normalizePhoneNumber(safePhoneNumber);

      contact = await prisma.contact.findFirst({
        where: {
          OR: phoneVariants.map((variant) => ({ phone: variant })),
          NOT: {
            AND: [{ firstName: 'Unknown' }, { lastName: 'Contact' }],
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!contact) {
        contact = await prisma.contact.findFirst({
          where: { OR: phoneVariants.map((variant) => ({ phone: variant })) },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (contact) {
        console.log(
          `✅ Found existing contact: ${contact.firstName} ${contact.lastName} (${contact.phone}) matching dialed ${safePhoneNumber}`,
        );
      }

      if (!contact && customerInfo) {
        try {
          contact = await prisma.contact.create({
            data: {
              contactId: uniqueContactId,
              listId: 'manual-contacts',
              firstName: customerInfo.firstName || 'Unknown',
              lastName: customerInfo.lastName || 'Contact',
              phone: safePhoneNumber,
              email: customerInfo.email || null,
              status: 'contacted',
            },
          });
          console.log('✅ Contact created:', contact.contactId);
        } catch (contactError: any) {
          console.log('⚠️ Contact creation failed, trying to find existing:', contactError.message);
          contact = await prisma.contact.findFirst({
            where: { OR: phoneVariants.map((variant) => ({ phone: variant })) },
          });
          if (!contact) {
            throw new Error('Unable to create or find contact');
          }
        }
      } else if (contact && customerInfo) {
        const shouldUpdate =
          (customerInfo.firstName &&
            customerInfo.firstName !== 'Unknown' &&
            contact.firstName === 'Unknown') ||
          (customerInfo.lastName &&
            customerInfo.lastName !== 'Contact' &&
            contact.lastName === 'Contact') ||
          (customerInfo.email && !contact.email);

        if (shouldUpdate) {
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: {
              firstName: customerInfo.firstName || contact.firstName,
              lastName: customerInfo.lastName || contact.lastName,
              email: customerInfo.email || contact.email,
              status: 'contacted',
              lastAttempt: new Date(),
              attemptCount: { increment: 1 },
            },
          });
          console.log('✅ Contact updated with better info:', contact.contactId);
        }
      } else if (!contact) {
        try {
          contact = await prisma.contact.create({
            data: {
              contactId: uniqueContactId,
              listId: 'manual-contacts',
              firstName: 'Unknown',
              lastName: 'Contact',
              phone: safePhoneNumber,
              status: 'contacted',
            },
          });
        } catch (contactError: any) {
          console.log('⚠️ Minimal contact creation failed, trying to find existing:', contactError.message);
          contact = await prisma.contact.findFirst({
            where: { OR: phoneVariants.map((variant) => ({ phone: variant })) },
          });
          if (!contact) {
            throw new Error('Unable to create or find minimal contact');
          }
        }
      }
    } else {
      try {
        contact = await prisma.contact.create({
          data: {
            contactId: uniqueContactId,
            listId: 'manual-contacts',
            firstName: 'Unknown',
            lastName: 'Contact',
            phone: safePhoneNumber,
            status: 'contacted',
          },
        });
      } catch (contactError: any) {
        console.log('⚠️ Placeholder contact creation failed, using fallback:', contactError.message);
        const fallbackContactId = `contact-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 12)}`;
        contact = await prisma.contact.create({
          data: {
            contactId: fallbackContactId,
            listId: 'manual-contacts',
            firstName: 'Unknown',
            lastName: 'Contact',
            phone: safePhoneNumber || 'Unknown',
            status: 'contacted',
          },
        });
      }
    }

      // Validate disposition if provided
      let validDispositionId = null;
      const debugInfo = {
        dispositionFound: false,
        campaignLinkFound: false,
        autoFixAttempted: false,
        autoFixSuccess: false,
        errors: [] as string[],
      };

      if (
        disposition?.id ||
        req.body.dispositionId ||
        (typeof disposition === 'string' && disposition)
      ) {
        let dispositionIdToCheck = disposition?.id || req.body.dispositionId;

        if (!dispositionIdToCheck && typeof disposition === 'string') {
          console.log('🔄 Frontend sent disposition name:', disposition, 'attempting to map to ID...');

          try {
            const dispositionByName = await prisma.disposition.findFirst({
              where: {
                name: {
                  equals: disposition,
                  mode: 'insensitive',
                },
              },
            });

            if (dispositionByName) {
              dispositionIdToCheck = dispositionByName.id;
              console.log('✅ Mapped disposition name to ID:', disposition, '->', dispositionIdToCheck);
            } else {
              console.log('❌ No disposition found with name:', disposition);
              debugInfo.errors.push(`No disposition found with name: ${disposition}`);
            }
          } catch (mappingError: any) {
            console.log('❌ Error mapping disposition name:', mappingError.message);
            debugInfo.errors.push(`Disposition mapping error: ${mappingError.message}`);
          }
        }

        if (dispositionIdToCheck) {
          console.log('🔍 Checking disposition ID:', dispositionIdToCheck);
          console.log('🔍 For campaign:', safeCampaignId);
          try {
            const existingDisposition = await prisma.disposition.findUnique({
              where: { id: dispositionIdToCheck },
            });
            if (existingDisposition) {
              debugInfo.dispositionFound = true;
              console.log('✅ Valid disposition found:', existingDisposition.name, 'ID:', dispositionIdToCheck);

              const campaignDisposition = await prisma.campaignDisposition.findUnique({
                where: {
                  campaignId_dispositionId: {
                    campaignId: safeCampaignId,
                    dispositionId: dispositionIdToCheck,
                  },
                },
              });

              if (campaignDisposition) {
                debugInfo.campaignLinkFound = true;
                validDispositionId = dispositionIdToCheck;
                console.log('✅ Disposition is linked to campaign - APPROVED for save');
              } else {
                console.log('❌ Disposition NOT linked to campaign', safeCampaignId);
                console.log('   🔧 AUTO-FIXING: Creating campaign disposition link...');
                debugInfo.autoFixAttempted = true;

                try {
                  await prisma.campaignDisposition.create({
                    data: {
                      campaignId: safeCampaignId,
                      dispositionId: dispositionIdToCheck,
                      isRequired: false,
                      sortOrder: 99,
                    },
                  });

                  debugInfo.autoFixSuccess = true;
                  validDispositionId = dispositionIdToCheck;
                  console.log('✅ AUTO-FIX SUCCESS: Created campaign disposition link');
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
          console.log('⚠️ No disposition ID to validate after mapping');
          debugInfo.errors.push('No disposition ID to validate');
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

      // Create or update call record with correct schema.
      //
      // IMPORTANT: makeRestApiCall stores the call with callId = conf-xxx and saves the
      // Twilio CA-SID in the `recording` column. When the frontend sends callSid=CA...,
      // we MUST first find the existing conf-xxx record by matching recording=callSid,
      // otherwise we create a duplicate orphan record with callId=CA... and the original
      // conf-xxx record never gets its disposition or recording attached.
      console.log('🔥 SAVE-CALL-DATA ENDPOINT HIT - VERSION 2.0 🔥');
      console.log('🔍 SAVE-CALL-DATA: Searching for existing record...');
      console.log('   callSid from frontend:', callSid);
      console.log('   conferenceId from frontend:', conferenceId);
      console.log('   Is Twilio SID (CA...):', callSid?.startsWith('CA'));
      
      let existingRecordByTwilioSid = null;

      const bearerUserId = extractUserIdFromBearer(req);
      const agentScopeParts: any[] = [];
      if (safeAgentId && safeAgentId !== 'system-agent') {
        agentScopeParts.push({ agentId: safeAgentId });
      }
      if (bearerUserId != null) {
        agentScopeParts.push({ notes: { contains: `[USER:${bearerUserId}|` } });
      }
      const agentScope =
        agentScopeParts.length === 0
          ? {}
          : agentScopeParts.length === 1
            ? agentScopeParts[0]
            : { OR: agentScopeParts };

      // PRIORITY 0: dialCorrelationId — stable per dial attempt, survives conferenceId/callSid mismatches
      if (!existingRecordByTwilioSid && dialCorrelationId) {
        const dialTag = `[DIAL:${dialCorrelationId}]`;
        existingRecordByTwilioSid = await prisma.callRecord.findFirst({
          where: {
            notes: { contains: dialTag },
            ...(agentScopeParts.length > 0 ? agentScope : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
        if (existingRecordByTwilioSid) {
          console.log(`✅ Found record by dialCorrelationId: ${existingRecordByTwilioSid.callId}`);
        }
      }

      // PRIORITY 1: conferenceId — always prefer agent-scoped match (two agents can share a campaign/number)
      if (conferenceId) {
        const confWhere = {
          OR: [
            { callId: conferenceId },
            { recording: conferenceId },
            { notes: { contains: conferenceId } },
          ],
        };
        if (agentScopeParts.length > 0) {
          existingRecordByTwilioSid = await prisma.callRecord.findFirst({
            where: { AND: [confWhere, agentScope] },
            orderBy: { createdAt: 'desc' },
          });
        }
        if (!existingRecordByTwilioSid) {
          existingRecordByTwilioSid = await prisma.callRecord.findFirst({
            where: confWhere,
            orderBy: { createdAt: 'desc' },
          });
        }
        if (existingRecordByTwilioSid) {
          console.log(`✅ Found record by conferenceId: ${existingRecordByTwilioSid.callId}`);
        }
      }

      // PRIORITY 2: Twilio CA SID — must match this agent (prevents attaching another agent's customer leg)
      if (!existingRecordByTwilioSid && callSid && callSid.startsWith('CA')) {
        const sidWhere = {
          OR: [
            { recording: callSid },
            { notes: { contains: callSid } },
            { callId: callSid },
          ],
        };
        existingRecordByTwilioSid = await prisma.callRecord.findFirst({
          where:
            agentScopeParts.length > 0 ? { AND: [sidWhere, agentScope] } : sidWhere,
          orderBy: { createdAt: 'desc' },
        });
        console.log(
          '   Search by Twilio SID (+ agent scope):',
          existingRecordByTwilioSid ? `FOUND ${existingRecordByTwilioSid.callId}` : 'NOT FOUND',
        );
      }

      // 🚨 PRIORITY 3: Anti-duplicate fallback.
      //
      // Manual dial via the WebRTC bridge produces TWO Twilio CallSids: the
      // customer-leg (which is what makeRestApiCall stores in `recording`) and
      // an agent-leg created by Twilio when our number bridges to the agent's
      // browser Device. The frontend disposition flow can end up sending us
      // the agent-leg SID + the agent's caller-id number (not the customer's),
      // which previously fell through to the `create` branch of the upsert and
      // produced an orphan row showing the agent's number with no recording.
      //
      // Before creating, look for this agent's most recent still-open outbound
      // call from the last 5 minutes and update it instead.
      if (!existingRecordByTwilioSid && safeAgentId && safeAgentId !== 'system-agent') {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const phoneVariantsForRecent =
          safePhoneNumber && safePhoneNumber !== 'Unknown' ? normalizePhoneNumber(safePhoneNumber) : [];
        const recentOpenCall = await prisma.callRecord.findFirst({
          where: {
            agentId: safeAgentId,
            callType: 'outbound',
            endTime: null,
            createdAt: { gte: fiveMinutesAgo },
            ...(dialCorrelationId
              ? { notes: { contains: `[DIAL:${dialCorrelationId}]` } }
              : phoneVariantsForRecent.length > 0
                ? {
                    AND: [
                      ...(safeCampaignId && safeCampaignId !== 'manual-dial' && safeCampaignId !== 'Manual Dialing'
                        ? [{ campaignId: safeCampaignId }]
                        : []),
                      { OR: phoneVariantsForRecent.map((v: string) => ({ phoneNumber: v })) },
                    ],
                  }
                : {}),
          },
          orderBy: { createdAt: 'desc' },
        });

        if (recentOpenCall) {
          console.log(
            `🛡️  Anti-duplicate: linking save-call-data to recent open call ${recentOpenCall.callId} ` +
              `(agent=${safeAgentId}, callSid=${callSid})`
          );
          existingRecordByTwilioSid = recentOpenCall;

          // Stamp the Twilio SID into notes so future webhooks can find this row.
          if (callSid && (!recentOpenCall.notes || !recentOpenCall.notes.includes(callSid))) {
            try {
              await prisma.callRecord.update({
                where: { id: recentOpenCall.id },
                data: {
                  notes: `${recentOpenCall.notes || ''}\n[SAVE-CALL-DATA] linked Twilio SID: ${callSid}`.trim(),
                },
              });
            } catch (linkErr: any) {
              console.warn('⚠️  Could not stamp linked Twilio SID into notes:', linkErr?.message);
            }
          }
        }
      }

      const finalCallId = existingRecordByTwilioSid?.callId || callSid || uniqueCallId;
      console.log('💾 SAVE-CALL-DATA: Using callId for upsert:', finalCallId);
      console.log('   Will', existingRecordByTwilioSid ? 'UPDATE existing' : 'CREATE NEW', 'record');
      console.log('   dispositionId:', validDispositionId);
      
      console.log('🔥 CRITICAL: About to upsert call record');
      console.log('   finalCallId:', finalCallId);
      console.log('   mappedOutcome:', mappedOutcome);
      console.log('   THIS SHOULD CHANGE outcome FROM "in-progress" TO:', mappedOutcome);
      
      const existingRec = existingRecordByTwilioSid?.recording || null;
      const mergedRecording =
        recordingUrl || (callSid?.startsWith('CA') ? callSid : null) || existingRec;

      const agentDispositionNote =
        typeof disposition?.notes === 'string' ? disposition.notes.trim() : '';
      const prevNotes = (existingRecordByTwilioSid?.notes || '').trim();
      const defaultNotesMsg = recordingUrl
        ? 'Call with recording saved via save-call-data API'
        : 'Call saved via save-call-data API';
      let mergedCallNotes = prevNotes;
      if (agentDispositionNote) {
        if (!mergedCallNotes.includes(agentDispositionNote)) {
          mergedCallNotes = mergedCallNotes
            ? `${mergedCallNotes}\n\n[Agent note] ${agentDispositionNote}`
            : `[Agent note] ${agentDispositionNote}`;
        }
      }
      if (!mergedCallNotes) {
        mergedCallNotes = defaultNotesMsg;
      }

      const callRecord = await prisma.callRecord.upsert({
        where: { callId: finalCallId },
        update: {
          // Update existing record with disposition and duration info
          agentId: safeAgentId,
          contactId: contact.contactId,
          campaignId: safeCampaignId,
          phoneNumber: safePhoneNumber,
          duration: safeDuration,
          outcome: mappedOutcome, // 🚨 CRITICAL: This changes from 'in-progress' to 'completed' (or other)
          dispositionId: validDispositionId,
          recording: mergedRecording,
          notes: mergedCallNotes,
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
          outcome: mappedOutcome,
          dispositionId: validDispositionId,
          recording: recordingUrl || (callSid?.startsWith('CA') ? callSid : null),
          notes: agentDispositionNote
            ? `[Agent note] ${agentDispositionNote}`
            : defaultNotesMsg
        }
      });

      if (agentDispositionNote && contact?.contactId) {
        try {
          const existingContact = await prisma.contact.findUnique({
            where: { contactId: contact.contactId },
            select: { notes: true },
          });
          const stamp = new Date().toISOString();
          const dispositionLabel =
            (disposition?.name || disposition?.outcome || mappedOutcome || 'Call').toString().trim();
          const line = `\n[${stamp}] ${dispositionLabel} (${callRecord.callId}): ${agentDispositionNote}`;
          const nextContactNotes = `${existingContact?.notes || ''}${line}`.trim();
          await prisma.contact.update({
            where: { contactId: contact.contactId },
            data: { notes: nextContactNotes },
          });
        } catch (contactNoteErr: any) {
          console.warn('⚠️ Could not append call note to contact:', contactNoteErr?.message);
        }
      }

      console.log('✅ Call record created/updated:', callRecord.callId, 'with dispositionId:', callRecord.dispositionId);
      console.log('🔥 CRITICAL VERIFICATION: Call outcome AFTER upsert:', callRecord.outcome);
      console.log('   If this is still "in-progress", the update FAILED!');
      console.log('   Expected outcome:', mappedOutcome);
      console.log('   Actual outcome:', callRecord.outcome);
      
      if (callRecord.outcome === 'in-progress') {
        console.error('❌ BUG DETECTED: Call still shows "in-progress" after disposition save!');
        console.error('   This will block future calls for this agent!');
      } else {
        console.log('✅ SUCCESS: Call marked as complete - agent can make new calls');
      }

      // Create interaction history record for outcomed interactions display
      try {
        const interaction = await prisma.interaction.create({
          data: {
            agentId: safeAgentId,
            contactId: contact.contactId,
            campaignId: safeCampaignId,
            channel: 'voice',
            outcome: disposition?.name || disposition?.outcome || 'completed',
            isDmc: false,
            startedAt: new Date(Date.now() - (safeDuration * 1000)),
            endedAt: new Date(),
            durationSeconds: safeDuration,
            result: agentDispositionNote
              ? `${mappedOutcome} — ${agentDispositionNote}`
              : mappedOutcome,
          }
        });
        console.log('✅ Interaction record created:', interaction.id, 'for outcomed interactions');
      } catch (interactionError: any) {
        console.warn('⚠️ Could not create interaction record (not critical):', interactionError.message);
        // Don't fail the call save if interaction creation fails
      }

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

  } catch (error: any) {
    console.error('❌ Save call data error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Database operation failed', 
      message: error?.message || 'Unknown database error'
    });
  }
});

// Recording status webhook — Twilio may retry with GET in edge cases; acknowledge without body.
router.get('/recording-callback', (_req: Request, res: Response) => {
  res.status(200).type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
});

// POST /api/calls/recording-callback - Twilio recording status webhook
router.post('/recording-callback', async (req: Request, res: Response) => {
  const emptyTwiml = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  const ok = () => res.status(200).type('text/xml').send(emptyTwiml);

  console.log('📼 RECORDING CALLBACK - Twilio webhook received');
  try {
    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus,
    } = req.body;

    console.log('📋 Recording callback data:', {
      CallSid,
      RecordingSid,
      RecordingStatus,
      Duration: RecordingDuration,
      Url: RecordingUrl ? 'provided' : 'missing',
    });

    if (!CallSid || !RecordingSid) {
      console.error('❌ Missing CallSid or RecordingSid');
      return ok();
    }

    // Twilio often omits RecordingUrl on status callbacks; RecordingSid is enough to fetch media.
    if (!RecordingUrl) {
      console.log('ℹ️ RecordingUrl missing — will store RecordingSid for streaming');
    }

    if (RecordingStatus !== 'completed') {
      console.log(`⏸️ Recording ${RecordingSid} status: ${RecordingStatus} - skipping`);
      return ok();
    }

    console.log('🎯 Processing completed recording...');

    try {
      console.log(`🔍 Searching for call record with CallSid: ${CallSid}`);

      let callRecord = await prisma.callRecord.findFirst({
        where: {
          OR: [
            { callId: CallSid },
            { callId: { contains: CallSid } },
            { recording: CallSid },
            { notes: { contains: CallSid } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!callRecord) {
        console.log('⚠️ No call record found with CallSid, searching recent in-progress rows...');
        const recentTime = new Date(Date.now() - 15 * 60 * 1000);
        const recentCalls = await prisma.callRecord.findMany({
          where: {
            startTime: { gte: recentTime },
            outcome: 'in-progress',
          },
          orderBy: { startTime: 'desc' },
          take: 10,
        });

        if (recentCalls.length > 0) {
          callRecord = recentCalls[0];
          console.log(`📞 Using most recent in-progress call as fallback: ${callRecord.callId}`);
        }
      }

      if (!callRecord) {
        console.log(`❌ No call record found for CallSid: ${CallSid}`);
        return ok();
      }

      console.log(`✅ Found call record: ${callRecord.id} (${callRecord.callId})`);

      const twilioFileRef = RecordingUrl || RecordingSid;

      const existingRecording = await prisma.recording.findFirst({
        where: { callRecordId: callRecord.id },
      });

      if (existingRecording) {
        console.log(`⚠️ Recording row exists for call ${callRecord.callId}: ${existingRecording.id}`);
        await prisma.recording.update({
          where: { id: existingRecording.id },
          data: {
            fileName: `${RecordingSid}.mp3`,
            filePath: twilioFileRef,
            duration: RecordingDuration ? parseInt(String(RecordingDuration), 10) : null,
            uploadStatus: 'completed',
            storageType: 'twilio',
          },
        });
        console.log(`✅ Updated existing recording: ${existingRecording.id}`);
      } else {
        console.log('📁 Creating new recording record...');
        await prisma.recording.create({
          data: {
            callRecordId: callRecord.id,
            fileName: `${RecordingSid}.mp3`,
            filePath: twilioFileRef,
            fileSize: null,
            duration: RecordingDuration ? parseInt(String(RecordingDuration), 10) : null,
            format: 'mp3',
            quality: 'standard',
            storageType: 'twilio',
            uploadStatus: 'completed',
          },
        });
        console.log('✅ Recording record created');
      }

      // Keep call_record.recording as Twilio Call SID (CA…) for status webhooks / lookups; RE… lives on Recording row.
      await prisma.callRecord.update({
        where: { id: callRecord.id },
        data: {
          recording: CallSid,
        },
      });

      console.log('✅ Call record left with CallSid in recording field for webhook correlation');

      try {
        const { onNewCallRecording } = require('../services/transcriptionWorker');
        const base = getTwilioWebhookBaseUrl() || '';
        const rec = await prisma.recording.findFirst({
          where: { callRecordId: callRecord.id },
          select: { id: true },
        });
        if (rec?.id && base) {
          await onNewCallRecording(callRecord.id, `${base}/api/recordings/${rec.id}/stream`);
          console.log('📝 Transcription queued for recording');
        } else if (!base) {
          console.warn('⚠️ No public https base URL — skipping transcription URL');
        }
      } catch (transcriptionError: any) {
        console.warn('⚠️ Failed to queue transcription:', transcriptionError?.message);
      }
    } catch (dbError) {
      console.error('❌ Database error processing recording:', dbError);
      return ok();
    }

    console.log('✅ Recording callback processed successfully');
    return ok();
  } catch (error) {
    console.error('❌ Error in recording callback:', error);
    return ok();
  }
});

export default router;