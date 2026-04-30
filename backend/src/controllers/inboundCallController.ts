/**
 * Inbound Call Controller
 * 
 * Handles incoming call webhooks from Twilio and manages inbound call flow:
 * 1. Receive inbound call webhook
 * 2. Lookup caller information
 * 3. Generate appropriate TwiML response
 * 4. Emit real-time notifications to agents
 * 5. Handle call routing (answer/transfer/queue)
 */

import { Request, Response } from 'express';
import twilio from 'twilio';
import { prisma } from '../database';
import { eventManager } from '../services/eventManager';
// REMOVING EVENT SYSTEM TO PREVENT REDIS HANGING
// import { callEvents } from '../utils/eventHelpers';
import { webSocketService } from '../socket';
import { v4 as uuidv4 } from 'uuid';
import { FlowExecutionEngine } from '../services/flowExecutionEngine';
import crypto from 'crypto';
import { resolveConferenceWaitUrl, resolveDefaultInboundGreetingUrl, normalizeInboundTo, resolveAbsoluteBackendUrl, toTwilioPlayableUrl } from '../config/voiceMedia';

/**
 * Find inbound_numbers row matching Twilio "To" (exact or last-10-digits fallback).
 */
async function findInboundNumberByTo(toRaw: string | undefined) {
  const normalized = normalizeInboundTo(toRaw);
  if (!normalized) return null;

  const exact = await prisma.inboundNumber.findFirst({
    where: { phoneNumber: normalized },
  });
  if (exact) return exact;

  const digits = normalized.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : null;
  if (!last10) return null;

  const candidates = await prisma.inboundNumber.findMany({
    where: {
      OR: [
        { phoneNumber: { endsWith: last10 } },
        { phoneNumber: { contains: last10 } },
      ],
    },
    take: 5,
  });

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const plusMatch = candidates.find((n) => n.phoneNumber.replace(/\D/g, '').endsWith(last10));
    return plusMatch || candidates[0];
  }
  return null;
}

/** Greeting must come from Omnivox inbound number (or optional DEFAULT_INBOUND_GREETING_AUDIO_URL only). */
function resolveInboundGreetingPlayUrl(inboundNumber: any): string | undefined {
  const raw = inboundNumber?.greetingAudioUrl || resolveDefaultInboundGreetingUrl();
  return toTwilioPlayableUrl(raw);
}

/** Agents who can take a live browser inbound (aligned with notifyAgentsOfInboundCall). */
async function countAgentsAvailableForInbound(): Promise<number> {
  try {
    return await prisma.agent.count({
      where: {
        isLoggedIn: true,
        status: { equals: 'Available', mode: 'insensitive' },
      },
    });
  } catch (e: any) {
    console.error('❌ countAgentsAvailableForInbound failed:', e?.message || e);
    return 0;
  }
}

/**
 * During business hours: if nobody is Available+loggedIn, play the same Omnivox
 * out-of-hours / unavailable prompt (outOfHoursAudioUrl) instead of ringing forever.
 */
async function buildDirectAgentRouteTwiML(
  callerInfo: CallerLookupResponse,
  callId: string,
  inboundNumber: any,
): Promise<{ twiml: string; notifyAgents: boolean }> {
  const available = await countAgentsAvailableForInbound();
  if (available === 0) {
    console.log(
      '📵 No agents Available+loggedIn during business hours — playing Omnivox out-of-hours/unavailable audio',
    );
    return { twiml: generateOutOfHoursTwiML(inboundNumber), notifyAgents: false };
  }
  return { twiml: routeToAvailableAgents(callerInfo, callId, inboundNumber), notifyAgents: true };
}

// Inbound call interface
export interface InboundCall {
  id: string;
  callSid: string;
  callerNumber: string;
  callerName?: string;
  contactId?: string;
  status: 'ringing' | 'queued' | 'answered' | 'transferred' | 'ended';
  routingOptions: {
    canAnswer: boolean;
    canTransferToQueue: boolean;
    canTransferToAgent: boolean;
    availableAgents: string[];
    availableQueues: string[];
  };
  metadata: {
    isCallback?: boolean;
    lastOutboundCallId?: string;
    priority: 'normal' | 'high' | 'urgent';
    waitTime: number;
  };
  createdAt: Date;
}

// Enhanced caller lookup response
export interface CallerLookupResponse {
  contact?: {
    contactId: string;
    name: string;
    phone: string;
    email?: string;
    company?: string;
    lastCallOutcome?: string;
    callHistory: any[];
    isRecentCallback: boolean;
    lastOutboundCall?: any;
  };
  routing: {
    suggestedAction: 'answer' | 'queue' | 'agent';
    availableAgents: any[];
    availableQueues: any[];
    priority: 'normal' | 'high' | 'urgent';
  };
}

/**
 * POST /api/calls/webhook/inbound-call
 * Main webhook handler for incoming calls from Twilio
 */

/**
 * Check if the current time is within an inbound number's business hours.
 * Uses businessHours as a *mode* string ("24 Hours", "Business Hours", "Custom")
 * plus start/end times and businessDays in the configured timezone.
 * MUST NEVER THROW — defaults to OPEN on error.
 */
function checkBusinessHours(inboundNumber: any): boolean {
  try {
    const mode = (inboundNumber?.businessHours || '24 Hours').toString().trim();

    if (mode === '24 Hours' || mode === '24/7' || mode === '') {
      return true;
    }

    const start: string | undefined = inboundNumber?.businessHoursStart;
    const end: string | undefined = inboundNumber?.businessHoursEnd;
    if (!start || !end) {
      console.warn(
        `⚠️ businessHours mode '${mode}' set but start/end times missing — defaulting to OPEN`,
      );
      return true;
    }

    const tz = inboundNumber?.timezone || 'Europe/London';
    const now = new Date();

    let weekday = '';
    let hhmm = '';
    try {
      weekday = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long',
        timeZone: tz,
      }).format(now);
      hhmm = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
      }).format(now);
    } catch (tzErr: any) {
      console.warn(
        `⚠️ Invalid timezone '${tz}' on inbound number — falling back to UTC: ${tzErr?.message}`,
      );
      weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(now);
      hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    }

    const rawDays = inboundNumber?.businessDays;
    let isBusinessDay = true;
    if (rawDays) {
      const dayLc = weekday.toLowerCase();
      if (typeof rawDays === 'string') {
        if (rawDays.trim().startsWith('{')) {
          try {
            const obj = JSON.parse(rawDays);
            isBusinessDay = !!obj?.[dayLc];
          } catch {
            isBusinessDay = rawDays
              .split(',')
              .map((s: string) => s.trim().toLowerCase())
              .includes(dayLc);
          }
        } else {
          isBusinessDay = rawDays
            .split(',')
            .map((s: string) => s.trim().toLowerCase())
            .includes(dayLc);
        }
      } else if (typeof rawDays === 'object') {
        isBusinessDay = !!(rawDays as any)[dayLc];
      }
    }

    if (!isBusinessDay) {
      console.log(`🕒 ${weekday} is not a business day for ${inboundNumber?.phoneNumber}`);
      return false;
    }

    const inWindow = hhmm >= start && hhmm < end;
    console.log(
      `🕒 BH check for ${inboundNumber?.phoneNumber}: now=${weekday} ${hhmm} ${tz}, ` +
        `window ${start}-${end} → ${inWindow ? 'OPEN' : 'CLOSED'}`,
    );
    return inWindow;
  } catch (err: any) {
    console.error(
      `❌ checkBusinessHours threw (defaulting to OPEN to avoid dropping the call):`,
      err?.message || err,
    );
    return true;
  }
}

/**
 * Generate out-of-hours TwiML response
 * NO TTS ALLOWED - Audio files are REQUIRED
 */
function generateOutOfHoursTwiML(inboundNumber: any): string {
  const twiml = new twilio.twiml.VoiceResponse();

  // Omnivox audio only — no TTS
  if (inboundNumber.outOfHoursAudioUrl) {
    const u = toTwilioPlayableUrl(inboundNumber.outOfHoursAudioUrl);
    if (u) {
      console.log('🎵 Playing out-of-hours audio:', u);
      twiml.pause({ length: 1 });
      twiml.play(u);
    } else {
      console.error('❌ outOfHoursAudioUrl is not a valid absolute URL:', inboundNumber.outOfHoursAudioUrl);
    }
  } else if (inboundNumber.outOfHoursAction === 'voicemail' && inboundNumber.voicemailAudioUrl) {
    const vm = toTwilioPlayableUrl(inboundNumber.voicemailAudioUrl);
    if (vm) {
      console.log('🎵 Playing voicemail prompt audio:', vm);
      twiml.pause({ length: 1 });
      twiml.play(vm);
      const vmAction = resolveAbsoluteBackendUrl('/api/calls/webhook/voicemail');
      twiml.record({
        ...(vmAction ? { action: vmAction } : {}),
        method: 'POST',
        maxLength: 120,
        finishOnKey: '#',
        transcribe: true
      });
    } else {
      console.error('❌ voicemailAudioUrl is not a valid absolute URL:', inboundNumber.voicemailAudioUrl);
    }
  } else {
    console.error('❌ No outOfHoursAudioUrl on inbound number:', inboundNumber.phoneNumber);
    console.error('❌ Configure out-of-hours audio in Omnivox (Channels → inbound number).');
  }

  twiml.hangup();
  return twiml.toString();
}

/**
 * Generate queue TwiML response (when no agents available)
 * NO TTS ALLOWED - Audio files are REQUIRED
 */
function generateQueueTwiML(inboundNumber: any): string {
  const twiml = new twilio.twiml.VoiceResponse();

  const greetingUrl = resolveInboundGreetingPlayUrl(inboundNumber);
  if (!greetingUrl) {
    console.error('❌ No greetingAudioUrl on this inbound number (Omnivox Channels). Queue route needs it.');
    twiml.hangup();
    return twiml.toString();
  }

  console.log('🎵 Playing greeting audio:', greetingUrl);
  twiml.pause({ length: 1 });
  twiml.play(greetingUrl);
  
  if (inboundNumber.queueAudioUrl) {
    const qUrl = toTwilioPlayableUrl(inboundNumber.queueAudioUrl);
    if (qUrl) {
      console.log('🎵 Playing queue audio:', qUrl);
      twiml.pause({ length: 1 });
      twiml.play(qUrl);
    }
  }
  
  // Enqueue the call (Twilio requires absolute https URLs for waitUrl/action)
  const waitMusic = resolveAbsoluteBackendUrl('/api/calls/webhook/wait-music');
  const queueResult = resolveAbsoluteBackendUrl('/api/calls/webhook/queue-result');
  twiml.enqueue(
    {
      ...(waitMusic ? { waitUrl: waitMusic } : {}),
      ...(queueResult ? { action: queueResult } : {}),
      method: 'POST',
    },
    'general-queue'
  );

  return twiml.toString();
}

/**
 * POST /api/calls/webhook/inbound-call
 * Main webhook handler for incoming calls from Twilio
 */
export const handleInboundWebhook = async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallStatus } = req.body;
    
    console.log('📞 Inbound call webhook received:', {
      CallSid,
      From,
      To,
      CallStatus,
      body: req.body
    });

    // CRITICAL: Look up inbound number configuration first
    const inboundNumber = await findInboundNumberByTo(To);

    if (!inboundNumber) {
      console.error(`❌ Inbound number not found for To=${To} (normalized=${normalizeInboundTo(To)})`);
      console.error('❌ CRITICAL: Inbound number must be configured in database before receiving calls');
      console.error('❌ TTS is disabled. Hanging up silently.');
      // Send hangup TwiML (no TTS error message)
      const fallbackTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
      res.type('text/xml');
      return res.send(fallbackTwiML);
    }

    console.log('📋 Inbound number config:', {
      displayName: inboundNumber.displayName,
      businessHours: inboundNumber.businessHours,
      outOfHoursAction: inboundNumber.outOfHoursAction,
      hasOutOfHoursAudio: !!inboundNumber.outOfHoursAudioUrl,
      hasGreetingAudio: !!inboundNumber.greetingAudioUrl
    });

    // Check business hours FIRST
    const isBusinessHours = checkBusinessHours(inboundNumber);
    console.log(`🕒 Business hours check: ${isBusinessHours ? 'OPEN' : 'CLOSED'}`);

    // If outside business hours, handle accordingly
    if (!isBusinessHours) {
      console.log('🚫 Outside business hours - playing out-of-hours message');
      const outOfHoursTwiML = generateOutOfHoursTwiML(inboundNumber);
      res.type('text/xml');
      return res.send(outOfHoursTwiML);
    }

    // Create inbound call record
    const inboundCallId = uuidv4();
    const callerNumber = From;

    // Lookup caller information
    const callerInfo = await lookupCallerInformation(callerNumber);
    
    // Create inbound call object
    const inboundCall: InboundCall = {
      id: inboundCallId,
      callSid: CallSid,
      callerNumber,
      callerName: callerInfo.contact?.name,
      contactId: callerInfo.contact?.contactId,
      status: 'ringing',
      routingOptions: {
        canAnswer: true,
        canTransferToQueue: true,
        canTransferToAgent: true,
        availableAgents: callerInfo.routing.availableAgents.map(a => a.id),
        availableQueues: callerInfo.routing.availableQueues.map(q => q.id)
      },
      metadata: {
        isCallback: callerInfo.contact?.isRecentCallback || false,
        lastOutboundCallId: callerInfo.contact?.lastOutboundCall?.id,
        priority: callerInfo.routing.priority,
        waitTime: 0
      },
      createdAt: new Date()
    };

    // Store inbound call in database
    await storeInboundCall(inboundCall, callerInfo);

    // ✅ Route based on inbound number configuration (never silent-hangup on routeTo=Hangup when agents expect calls)
    let twiml: string;
    let shouldNotifyAgents = false;

    console.log('🔀 Routing decision:', {
      routeTo: inboundNumber.routeTo,
      selectedQueueId: inboundNumber.selectedQueueId,
      selectedFlowId: inboundNumber.selectedFlowId,
      assignedFlowId: inboundNumber.assignedFlowId,
      hasGreetingAudio: !!inboundNumber.greetingAudioUrl,
      hasNoAnswerAudio: !!inboundNumber.noAnswerAudioUrl,
    });

    if (inboundNumber.routeTo === 'Queue' && inboundNumber.selectedQueueId) {
      console.log(`📋 Routing to queue: ${inboundNumber.selectedQueueId}`);
      twiml = generateQueueTwiML(inboundNumber);
      shouldNotifyAgents = true;
    } else if (
      inboundNumber.routeTo === 'Flow' &&
      (inboundNumber.assignedFlowId || inboundNumber.selectedFlowId)
    ) {
      const flowId = inboundNumber.selectedFlowId || inboundNumber.assignedFlowId;
      console.log(`🌊 routeTo=Flow with flowId=${flowId} — attempting flow execution`);
      try {
        twiml = await executeAssignedFlow(flowId as string, inboundCall, inboundCallId);
        shouldNotifyAgents = true;
      } catch (flowErr: any) {
        console.warn(
          `⚠️ Flow execution threw, falling back to agent ring: ${flowErr?.message}`,
        );
        const direct = await buildDirectAgentRouteTwiML(callerInfo, inboundCallId, inboundNumber);
        twiml = direct.twiml;
        shouldNotifyAgents = direct.notifyAgents;
      }
    } else {
      if (inboundNumber.routeTo === 'Hangup') {
        console.log(
          "📞 routeTo='Hangup' — ringing shared Voice client (explicit hangup reserved for closed hours / misconfiguration)",
        );
      } else {
        console.log('📞 Routing to available agents (default)');
      }
      const direct = await buildDirectAgentRouteTwiML(callerInfo, inboundCallId, inboundNumber);
      twiml = direct.twiml;
      shouldNotifyAgents = direct.notifyAgents;
    }
    
    console.log('✅ Inbound call processed successfully:', inboundCallId);
    
    // Send TwiML response immediately
    res.type('text/xml');
    res.send(twiml);
    
    // Start notifications asynchronously (don't await) — only when someone could answer
    if (shouldNotifyAgents) {
      notifyAgentsOfInboundCall(inboundCall, callerInfo).catch(error => {
        console.error('❌ Notification error (non-blocking):', error);
      });
    } else {
      console.log('ℹ️ Skipping agent inbound notifications (no live agent route for this call)');
    }
    
  } catch (error: any) {
    console.error('❌ Error handling inbound call webhook:', error);
    console.error('❌ TTS is disabled. Hanging up silently on error.');
    
    // Send hangup TwiML (no TTS error message)
    const fallbackTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(fallbackTwiML);
  }
};

/**
 * Generate initial TwiML response for inbound calls
 * Puts customer in conference room to wait for agent
 * NO TTS ALLOWED - Uses hold music instead
 */
export const generateInboundWelcomeTwiML = (conferenceRoom: string): string => {
  console.log('🎵 Generating conference TwiML for inbound call, conference:', conferenceRoom);

  const twiml = new twilio.twiml.VoiceResponse();
  const dial = twiml.dial();
  const waitUrl = resolveConferenceWaitUrl();
  const confOpts: Parameters<typeof dial.conference>[0] = {
    startConferenceOnEnter: false,
    endConferenceOnExit: true,
    beep: 'false',
  };
  if (waitUrl) {
    (confOpts as { waitUrl?: string }).waitUrl = waitUrl;
  }
  dial.conference(confOpts, conferenceRoom);

  console.log('✅ Conference TwiML generated for customer');
  return twiml.toString();
};

/**
 * Helper function to route calls to available agents
 * 🚨 ROBUST FIX: Always dial browser client, let Twilio timeout handle offline agents
 */
function routeToAvailableAgents(callerInfo: CallerLookupResponse, callId: string, inboundNumber: any): string {
  console.log('📞 Routing call to browser agent (robust approach)');
  
  const twiml = new twilio.twiml.VoiceResponse();

  const greetingUrl = resolveInboundGreetingPlayUrl(inboundNumber);
  if (!greetingUrl) {
    console.error(
      '❌ No greetingAudioUrl on this inbound number. Set it in Omnivox (Channels) or DEFAULT_INBOUND_GREETING_AUDIO_URL.',
    );
    twiml.hangup();
    return twiml.toString();
  }

  console.log('🎵 Playing greeting audio:', greetingUrl);
  twiml.pause({ length: 1 });
  twiml.play(greetingUrl);

  // ROBUST APPROACH: Always dial the browser client
  // If agent is online → call connects immediately
  // If agent is offline → Twilio 30s timeout → noAnswerAudio → hangup
  const backendUrl = process.env.BACKEND_URL || '';
  const recordingStatusCallback = backendUrl
    ? `${backendUrl}/api/calls/webhook/inbound-recording?callId=${callId}`
    : undefined;

  const dialOpts: any = {
    timeout: 30, // 30 second timeout for agent to answer
    record: 'record-from-answer-dual',
    answerOnBridge: true,
  };
  if (recordingStatusCallback) {
    dialOpts.recordingStatusCallback = recordingStatusCallback;
    dialOpts.recordingStatusCallbackMethod = 'POST';
  }

  const dial = twiml.dial(dialOpts);
  
  const clientIdentity =
    (process.env.TWILIO_VOICE_CLIENT_IDENTITY || 'agent-browser').trim() || 'agent-browser';
  dial.client(clientIdentity);

  if (inboundNumber.noAnswerAudioUrl) {
    const na = toTwilioPlayableUrl(inboundNumber.noAnswerAudioUrl);
    if (na) {
      console.log('🎵 Will play no-answer audio if agent unavailable:', na);
      twiml.pause({ length: 1 });
      twiml.play(na);
    }
  } else if (inboundNumber.voicemailAudioUrl) {
    const vm = toTwilioPlayableUrl(inboundNumber.voicemailAudioUrl);
    if (vm) {
      console.log('ℹ️ Will play voicemailAudioUrl on no-answer:', vm);
      twiml.pause({ length: 1 });
      twiml.play(vm);
      const vmAction = resolveAbsoluteBackendUrl('/api/calls/webhook/voicemail');
      twiml.record({
        ...(vmAction ? { action: vmAction } : {}),
        method: 'POST',
        maxLength: 120,
        finishOnKey: '#',
      });
    }
  }
  
  twiml.hangup();

  console.log('✅ TwiML generated - will dial browser agent with 30s timeout');
  return twiml.toString();
}

/**
 * POST /api/calls/inbound-answer
 * Agent accepts an inbound call
 */
export const answerInboundCall = async (req: Request, res: Response) => {
  try {
    const { callId, agentId } = req.body;
    
    console.log(`📞 Agent ${agentId} answering inbound call ${callId}`);

    // Try to get call details first
    let callDetails = null;
    try {
      callDetails = await prisma.inbound_calls.findFirst({
        where: { callId: callId }
      });
    } catch (lookupError: any) {
      console.warn('⚠️ Call lookup failed, using fallback:', lookupError.message);
    }

    // Create a response even if call not found in database (for testing)
    if (!callDetails) {
      console.log('ℹ️ Call not found in database, creating mock response for testing');
      callDetails = {
        callId: callId,
        callSid: callId,
        callerNumber: 'Unknown',
        status: 'answered',
        assignedAgentId: agentId,
        contactId: null
      } as any;
    }

    // Try to update inbound_calls status in database
    try {
      const updateResult = await prisma.inbound_calls.updateMany({
        where: { callId: callId },
        data: {
          status: 'answered',
          assignedAgentId: agentId,
          answeredAt: new Date()
        }
      });
      console.log('✅ Inbound_calls update successful:', updateResult);
    } catch (dbError: any) {
      console.warn('⚠️ Inbound_calls update failed, continuing anyway:', dbError.message);
    }

    // CRITICAL: Create call_records entry for proper recording tracking
    try {
      console.log('📝 Creating call_records entry for inbound call tracking...');
      
      // Check if call_records entry already exists
      const existingCallRecord = await prisma.callRecord.findFirst({
        where: {
          OR: [
            { callId: (callDetails as any).callSid },
            { callId: callId }
          ]
        }
      });

      if (!existingCallRecord) {
        // Create new call_records entry
        const callRecord = await prisma.callRecord.create({
          data: {
            callId: (callDetails as any).callSid || callId, // Use Twilio CallSid for recording webhook matching
            contactId: (callDetails as any).contactId || null,
            campaignId: 'inbound-calls', // Special campaign ID for inbound
            agentId: agentId,
            phoneNumber: (callDetails as any).callerNumber || 'Unknown',
            callType: 'inbound',
            startTime: (callDetails as any).createdAt || new Date(),
            outcome: 'in-progress',
            notes: `Inbound call from ${(callDetails as any).callerNumber || 'Unknown'}${(callDetails as any).isCallback ? ' (CALLBACK)' : ''}`
          }
        });
        console.log('✅ Call_records entry created for inbound call:', callRecord.id);
      } else {
        console.log('ℹ️ Call_records entry already exists:', existingCallRecord.id);
      }
    } catch (callRecordError: any) {
      console.error('❌ Failed to create call_records entry:', callRecordError.message);
      // Don't fail the request - recording will still work via CallSid lookup
    }

    // For direct calling, we don't need to generate TwiML here
    // The call is already connected when agent answers via Twilio Device
    
    console.log('📞 Inbound call answered successfully:', { callId, agentId });

    res.json({
      success: true,
      data: {
        callId,
        agentId,
        message: 'Call answered successfully - direct connection established'
      }
    });

  } catch (error: any) {
    console.error('❌ Error answering inbound call:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to answer inbound call',
      details: error.message
    });
  }
};

/**
 * POST /api/calls/inbound-transfer
 * Transfer inbound call to queue or another agent
 */
export const transferInboundCall = async (req: Request, res: Response) => {
  try {
    const { callId, transferType, targetId, agentId } = req.body;
    
    console.log(`📞 Transferring inbound call ${callId} to ${transferType}: ${targetId}`);

    // Update call status using correct field names and callId
    await prisma.$executeRaw`
      UPDATE inbound_calls 
      SET status = 'transferred',
          "assignedAgentId" = ${transferType === 'agent' ? targetId : agentId},
          "assignedQueueId" = ${transferType === 'queue' ? targetId : null}
      WHERE "callId" = ${callId}
    `;

    // Skip event system for now to prevent Redis hanging
    console.log('📞 Inbound call transferred:', { callId, transferType, targetId, fromAgentId: agentId });

    res.json({
      success: true,
      data: { callId, transferType, targetId }
    });

  } catch (error: any) {
    console.error('❌ Error transferring inbound call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer inbound call'
    });
  }
};

/**
 * GET /api/calls/inbound-status
 * Get current inbound call status
 */
export const getInboundCallStatus = async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    
    const callDetails = await getInboundCallDetails(callId);
    if (!callDetails) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    res.json({
      success: true,
      data: callDetails
    });

  } catch (error: any) {
    console.error('❌ Error getting inbound call status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get call status'
    });
  }
};

/**
 * Helper Functions
 */

// Lookup caller information in contact database
async function lookupCallerInformation(phoneNumber: string): Promise<CallerLookupResponse> {
  try {
    // Search for contact by phone number (multiple formats)
    // Note: Contact model doesn't have campaignId field - need to join via DataList
    const contact = await prisma.$queryRaw`
      SELECT 
        c."contactId", c."firstName", c."lastName", c.phone, c.email, c.company,
        c."lastOutcome", c."lastAttempt", dl."campaignId"
      FROM contacts c
      LEFT JOIN data_lists dl ON c."listId" = dl."listId"
      WHERE c.phone = ${phoneNumber}
         OR c.phone = ${phoneNumber.replace(/[\s-()]/g, '')}
         OR c.phone = ${phoneNumber.replace(/\+/g, '')}
      ORDER BY c."lastAttempt" DESC
      LIMIT 1
    ` as any[];

    let callerInfo: CallerLookupResponse['contact'] = undefined;
    
    if (contact.length > 0) {
      const contactData = contact[0];
      
      // Check if this is a recent callback (called them in last 4 hours)
      const recentCallCheck = await prisma.$queryRaw`
        SELECT cr.id, cr."startTime", cr.outcome
        FROM call_records cr
        WHERE cr."phoneNumber" = ${phoneNumber}
          AND cr."callType" = 'outbound'
          AND cr."startTime" > NOW() - INTERVAL '4 hours'
        ORDER BY cr."startTime" DESC
        LIMIT 1
      ` as any[];

      callerInfo = {
        contactId: contactData.contactId,
        name: `${contactData.firstName} ${contactData.lastName}`,
        phone: contactData.phone,
        email: contactData.email,
        company: contactData.company,
        lastCallOutcome: contactData.lastOutcome,
        callHistory: [], // TODO: Implement call history lookup
        isRecentCallback: recentCallCheck.length > 0,
        lastOutboundCall: recentCallCheck.length > 0 ? recentCallCheck[0] : undefined
      };
    }

    // Get available agents (simplified - in production this would check availability)
    const availableAgents = await prisma.$queryRaw`
      SELECT a."agentId", a."firstName", a."lastName", a.status
      FROM agents a
      WHERE a.status = 'Available'
        AND a."isLoggedIn" = true
      LIMIT 5
    ` as any[];

    // Note: Simplified routing - no call queues table in current schema
    const availableQueues: any[] = [];

    // Determine priority and routing
    const priority: 'normal' | 'high' | 'urgent' = 
      callerInfo?.isRecentCallback ? 'high' : 'normal';

    const suggestedAction: 'answer' | 'queue' | 'agent' = 
      availableAgents.length > 0 ? 'answer' : 'queue';

    return {
      contact: callerInfo,
      routing: {
        suggestedAction,
        availableAgents,
        availableQueues,
        priority
      }
    };

  } catch (error: any) {
    console.error('❌ Error looking up caller information:', error);
    
    // Return default response for unknown callers
    return {
      routing: {
        suggestedAction: 'queue',
        availableAgents: [],
        availableQueues: [],
        priority: 'normal'
      }
    };
  }
}

// Store inbound call in database
async function storeInboundCall(inboundCall: InboundCall, callerInfo: CallerLookupResponse): Promise<void> {
  try {
    // Use Prisma client instead of raw SQL to avoid schema mismatches
    await prisma.inbound_calls.create({
      data: {
        id: crypto.randomUUID(),
        callId: inboundCall.id,
        callSid: inboundCall.callSid,
        callerNumber: inboundCall.callerNumber,
        contactId: inboundCall.contactId || null,
        status: inboundCall.status,
        isCallback: inboundCall.metadata.isCallback || false,
        priority: inboundCall.metadata.priority,
        routingMetadata: JSON.stringify({ callerInfo, routingOptions: inboundCall.routingOptions }),
        createdAt: inboundCall.createdAt
      }
    });
    
    console.log('✅ Inbound call stored successfully:', inboundCall.id);
  } catch (error: any) {
    console.error('❌ Error storing inbound call:', error);
    // Continue execution - don't fail the call flow
    // Log the specific error for debugging
    console.error('Database error details:', {
      message: error.message,
      code: error.code,
      details: error.meta
    });
  }
}

// Notify agents of inbound call via real-time events
async function notifyAgentsOfInboundCall(inboundCall: InboundCall, callerInfo: CallerLookupResponse): Promise<void> {
  try {
    console.log('🔔 Starting agent notification for inbound call:', inboundCall.id);
    console.log('🔍 WebSocket service status:', webSocketService ? 'AVAILABLE' : 'NULL');
    
    // SKIP EVENT SYSTEM FOR NOW - IT'S HANGING
    console.log('⚠️ Skipping event system to avoid hanging - proceeding directly to WebSocket notifications');

    // Notify available agents in DAC campaign via WebSocket service
    if (webSocketService) {
      console.log('🔔 WebSocket service available, proceeding with agent notification');
      
      try {
        // Notify all agents who are Available and logged in (any campaign).
        // Previously this required DAC campaign assignment, so inbound calls never rang most agents.
        console.log('🔍 Running agent availability query (any campaign)...');
        const availableAgents = await prisma.$queryRaw`
          SELECT DISTINCT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn"
          FROM agents a
          WHERE a.status = 'Available'
            AND a."isLoggedIn" = true
          LIMIT 50
        ` as any[];

        console.log('🎯 Found available agents for inbound call:', availableAgents.length);
        console.log('🎯 Agent details:', availableAgents);

        // Send notification to each available agent
        if (availableAgents.length > 0) {
          const notificationData = {
            call: inboundCall,
            callerInfo: callerInfo.contact,
            routingOptions: inboundCall.routingOptions,
            priority: inboundCall.metadata.priority,
            isCallback: inboundCall.metadata.isCallback
          };

          console.log('🔔 Preparing to send notifications to', availableAgents.length, 'agents');

          // Get dialler namespace for agent communications
          const diallerNamespace = (webSocketService as any).diallerNamespace;

          console.log('🔍 Dialler namespace status:', diallerNamespace ? 'AVAILABLE' : 'NULL');

          if (diallerNamespace) {
            console.log('📡 Using dialler namespace for notifications');
            for (const agent of availableAgents) {
              console.log(`📤 Sending inbound call notification to agent: ${agent.agentId}`);
              try {
                diallerNamespace.to(`agent:${agent.agentId}`).emit('inbound-call-ringing', notificationData);
                console.log(`✅ Notification sent to agent: ${agent.agentId}`);
              } catch (emitError: any) {
                console.error(`❌ Error sending to agent ${agent.agentId}:`, emitError);
              }
            }
            console.log('✅ Inbound call notifications sent to available agents via dialler namespace');
          } else {
            console.log('⚠️ Dialler namespace not available, using main namespace');

            for (const agent of availableAgents) {
              console.log(`📤 Fallback notification to agent: ${agent.agentId}`);
              try {
                webSocketService.sendToAgent(agent.agentId, 'inbound-call-ringing', notificationData);
                console.log(`✅ Fallback notification sent to agent: ${agent.agentId}`);
              } catch (fallbackError: any) {
                console.error(`❌ Error sending fallback to agent ${agent.agentId}:`, fallbackError);
              }
            }

            console.log('✅ Inbound call notifications sent via main namespace');
          }
        } else {
          console.log('⚠️ No available agents found for inbound call notification');
        }
        
      } catch (dbError: any) {
        console.error('❌ Database error during agent lookup:', dbError);
        console.error('❌ DB Error details:', dbError.message, dbError.stack);
      }
      
    } else {
      console.log('❌ WebSocket service not available - cannot send notifications');
    }

  } catch (error: any) {
    console.error('❌ Error notifying agents of inbound call:', error);
    console.error('❌ Error details:', error.message, error.stack);
    // Continue execution - don't fail the call flow
  }
}

// Get inbound call details from database
async function getInboundCallDetails(callId: string): Promise<any> {
  try {
    const callDetails = await prisma.$queryRaw`
      SELECT ic.*, c."firstName", c."lastName", c.company
      FROM inbound_calls ic
      LEFT JOIN contacts c ON ic."contactId" = c."contactId"
      WHERE ic."callId" = ${callId}
      LIMIT 1
    ` as any[];

    return callDetails.length > 0 ? callDetails[0] : null;
  } catch (error: any) {
    console.error('❌ Error getting inbound call details:', error);
    return null;
  }
}

/**
 * Check if a flow is assigned to the given inbound number
 * 🚨 FIXED: Use assignedFlowId field and fetch flow details separately
 */
async function checkForAssignedFlow(phoneNumber: string): Promise<{ id: string; name: string } | null> {
  try {
    const inboundNumber: any = await prisma.inboundNumber.findUnique({
      where: { phoneNumber },
      include: {
        flows: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    const flow = inboundNumber?.flows;
    if (flow && flow.status === 'ACTIVE') {
      return { id: flow.id, name: flow.name };
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error checking for assigned flow:', error?.message || error);
    return null;
  }
}

/**
 * Execute assigned flow for inbound call and return TwiML
 */
async function executeAssignedFlow(flowId: string, inboundCall: InboundCall, inboundCallId: string): Promise<string> {
  const startTime = Date.now();
  
  try {
    console.log(`🌊 Starting flow execution: ${flowId} for call ${inboundCallId}`);
    
    const flowEngine = new FlowExecutionEngine();
    
    const context = {
      callId: inboundCallId,
      phoneNumber: inboundCall.callerNumber,
      caller: {
        phoneNumber: inboundCall.callerNumber,
        name: inboundCall.callerName || 'Unknown',
        id: inboundCall.contactId
      },
      variables: {
        callerNumber: inboundCall.callerNumber,
        callerName: inboundCall.callerName,
        contactId: inboundCall.contactId,
        source: 'inbound'
      },
      currentTime: new Date(),
      metadata: {
        source: 'inbound',
        phoneNumber: inboundCall.callerNumber,
        timestamp: new Date().toISOString()
      }
    };

    const result: any = await flowEngine.executeFlow(flowId, context);
    const executionTime = Date.now() - startTime;
    
    if (result.success && result.twiml) {
      console.log(`✅ Flow execution completed successfully in ${executionTime}ms: ${flowId}`);
      await logFlowExecution(flowId, inboundCallId, 'success', executionTime);
      return result.twiml;
    } else {
      console.error(`❌ Flow execution failed: ${result.error} (${executionTime}ms)`);
      await logFlowExecution(flowId, inboundCallId, 'failed', executionTime, result.error);
      
      // Try to get fallback flow or return basic greeting
      return await getFallbackTwiML(inboundCall, 'flow_execution_failed');
    }
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Error executing assigned flow (${executionTime}ms):`, error);
    await logFlowExecution(flowId, inboundCallId, 'error', executionTime, error.message);
    
    // Return fallback TwiML
    return await getFallbackTwiML(inboundCall, 'flow_execution_error');
  }
}

/**
 * Generate basic greeting TwiML as fallback
 * NO TTS ALLOWED - Silently queue or hangup
 */
function generateBasicGreetingTwiML(): string {
  const twiml = new twilio.twiml.VoiceResponse();
  console.warn('⚠️ generateBasicGreetingTwiML called - TTS is disabled. Queueing silently.');
  // Queue without TTS greeting
  twiml.dial().queue('default');
  return twiml.toString();
}

/**
 * Log flow execution for monitoring and debugging
 */
async function logFlowExecution(
  flowId: string, 
  callId: string, 
  status: 'success' | 'failed' | 'error', 
  executionTime: number, 
  errorMessage?: string
): Promise<void> {
  try {
    // Get the active flow version for logging
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: {
        versions: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (flow && flow.versions.length > 0) {
      // Store execution log in database
      await prisma.flowRun.create({
        data: {
          id: uuidv4(),
          flowVersionId: flow.versions[0].id,
          externalReference: callId,
          status: status.toUpperCase() as any,
          context: JSON.stringify({ 
            callId, 
            source: 'inbound', 
            flowId,
            executionTime,
            error: errorMessage 
          }),
          startedAt: new Date(Date.now() - executionTime),
          finishedAt: status === 'success' ? new Date() : null
        }
      });
    }

    // Emit event for monitoring
    eventManager.emit('flow.execution.completed', {
      flowId,
      callId,
      status,
      executionTime,
      error: errorMessage
    });

  } catch (error) {
    console.error('❌ Failed to log flow execution:', error);
    // Don't throw - logging failure shouldn't break call flow
  }
}

/**
 * Get fallback TwiML with multiple strategies
 */
async function getFallbackTwiML(inboundCall: InboundCall, reason: string): Promise<string> {
  try {
    console.log(`🔄 Generating fallback TwiML for reason: ${reason}`);
    
    // Strategy 1: Check for system default flow
    const defaultFlow = await prisma.flow.findFirst({
      where: {
        name: 'System Default Flow',
        status: 'ACTIVE'
      }
    });
    
    if (defaultFlow) {
      console.log('📋 Using system default flow as fallback');
      // Try to execute default flow
      try {
        return await executeAssignedFlow(defaultFlow.id, inboundCall, inboundCall.id);
      } catch (error) {
        console.warn('⚠️ Default flow also failed, using basic greeting');
      }
    }
    
    // Strategy 2: Generate context-aware greeting based on caller info
    if (inboundCall.callerName && inboundCall.callerName !== 'Unknown') {
      return generatePersonalizedGreetingTwiML(inboundCall.callerName);
    }
    
    // Strategy 3: Basic greeting
    return generateBasicGreetingTwiML();
    
  } catch (error) {
    console.error('❌ Error generating fallback TwiML:', error);
    return generateBasicGreetingTwiML();
  }
}

/**
 * Generate personalized greeting TwiML
 * NO TTS ALLOWED - Silently queue
 */
function generatePersonalizedGreetingTwiML(callerName: string): string {
  const twiml = new twilio.twiml.VoiceResponse();
  console.warn(`⚠️ generatePersonalizedGreetingTwiML called for ${callerName} - TTS is disabled. Queueing silently.`);
  // Queue without TTS greeting (personalized greetings should use pre-recorded audio files)
  twiml.dial().queue('default');
  return twiml.toString();
}