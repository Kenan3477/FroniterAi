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
import { callEvents } from '../utils/eventHelpers';
import { webSocketService } from '../socket';
import { v4 as uuidv4 } from 'uuid';

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

    // Emit real-time notification to available agents
    await notifyAgentsOfInboundCall(inboundCall, callerInfo);

    // Generate TwiML response
    const twiml = generateInboundWelcomeTwiML(inboundCall, callerInfo);
    
    console.log('✅ Inbound call processed successfully:', inboundCallId);
    
    res.type('text/xml');
    res.send(twiml);
    
  } catch (error: any) {
    console.error('❌ Error handling inbound call webhook:', error);
    
    // Send fallback TwiML
    const fallbackTwiML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. All agents are currently busy. Please try again later.</Say>
  <Hangup/>
</Response>`;
    
    res.type('text/xml');
    res.send(fallbackTwiML);
  }
};

/**
 * POST /api/calls/twiml/inbound-welcome
 * Generate initial TwiML response for inbound calls
 */
export const generateInboundWelcomeTwiML = (inboundCall: InboundCall, callerInfo: CallerLookupResponse): string => {
  const twiml = new twilio.twiml.VoiceResponse();

  // Personalized greeting for known contacts
  if (callerInfo.contact) {
    if (callerInfo.contact.isRecentCallback) {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, `Hello ${callerInfo.contact.name}. Thank you for calling back. Please hold while we connect you to an agent.`);
    } else {
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, `Hello ${callerInfo.contact.name}. Thank you for calling Omnivox-AI. Please hold while we connect you to an agent.`);
    }
  } else {
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for calling Omnivox-AI. Please hold while we connect you to an available agent.');
  }

  // Add a brief pause
  twiml.pause({ length: 2 });

  // Create a unique conference room for this call
  const conferenceRoom = `inbound-${inboundCall.id}`;
  
  twiml.dial({
    timeout: 30,
    record: 'record-from-answer-dual',
    answerOnBridge: true
  }).conference({
    beep: 'false',
      waitUrl: 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical',
      startConferenceOnEnter: false,
      endConferenceOnExit: true,
      statusCallback: `${process.env.BACKEND_URL}/api/calls/webhook/inbound-status?callId=${inboundCall.id}`,
      statusCallbackMethod: 'POST'
    }, conferenceRoom);

  return twiml.toString();
};

/**
 * POST /api/calls/inbound-answer
 * Agent accepts an inbound call
 */
export const answerInboundCall = async (req: Request, res: Response) => {
  try {
    const { callId, agentId } = req.body;
    
    console.log(`📞 Agent ${agentId} answering inbound call ${callId}`);

    // Update call status in database
    await prisma.$executeRaw`
      UPDATE inbound_calls 
      SET status = 'answered', 
          assigned_agent_id = ${agentId},
          answered_at = NOW()
      WHERE id = ${callId}
    `;

    // Get call details
    const callDetails = await getInboundCallDetails(callId);
    if (!callDetails) {
      return res.status(404).json({ success: false, error: 'Call not found' });
    }

    // Connect agent to the conference
    const conferenceRoom = `inbound-${callId}`;
    
    // Use Twilio client to add agent to conference
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // For now, we'll use a simple dial approach - in production, this would integrate with WebRTC
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Connecting you to the customer...');
    twiml.dial().conference({
      startConferenceOnEnter: true,
      endConferenceOnExit: true
    }, conferenceRoom);

    // Emit real-time event using centralized helper
    await callEvents.inboundAnswered({
      callId: callId,
      callSid: callDetails.call_sid,
      agentId: agentId,
      answeredAt: new Date()
    });

    res.json({
      success: true,
      data: {
        callId,
        conferenceRoom,
        twiml: twiml.toString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error answering inbound call:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to answer inbound call'
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

    // Update call status
    await prisma.$executeRaw`
      UPDATE inbound_calls 
      SET status = 'transferred',
          assigned_agent_id = ${transferType === 'agent' ? targetId : agentId},
          assigned_queue_id = ${transferType === 'queue' ? targetId : null}
      WHERE id = ${callId}
    `;

    // Emit real-time event using centralized helper
    await callEvents.inboundTransferred({
      callId: callId,
      transferType: transferType,
      targetId: targetId,
      fromAgentId: agentId,
      transferredAt: new Date()
    });

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
    const contact = await prisma.$queryRaw`
      SELECT 
        c.contactId, c.firstName, c.lastName, c.phone, c.email, c.company,
        c.lastOutcome, c.lastAttempt, c.campaignId
      FROM contacts c
      WHERE c.phone = ${phoneNumber}
         OR c.phone = ${phoneNumber.replace(/[\s-()]/g, '')}
         OR c.phone = ${phoneNumber.replace(/\+/g, '')}
      ORDER BY c.lastAttempt DESC
      LIMIT 1
    ` as any[];

    let callerInfo: CallerLookupResponse['contact'] = undefined;
    
    if (contact.length > 0) {
      const contactData = contact[0];
      
      // Check if this is a recent callback (called them in last 4 hours)
      const recentCallCheck = await prisma.$queryRaw`
        SELECT cr.id, cr.startTime, cr.outcome
        FROM call_records cr
        WHERE cr.phoneNumber = ${phoneNumber}
          AND cr.callType = 'outbound'
          AND cr.startTime > DATE_SUB(NOW(), INTERVAL 4 HOUR)
        ORDER BY cr.startTime DESC
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
      SELECT a.agentId, a.firstName, a.lastName, a.status
      FROM agents a
      WHERE a.status = 'available'
        AND a.isActive = 1
      LIMIT 5
    ` as any[];

    // Get available queues (simplified)
    const availableQueues = await prisma.$queryRaw`
      SELECT q.id, q.name, q.description
      FROM call_queues q
      WHERE q.isActive = 1
      LIMIT 5
    ` as any[];

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
    await prisma.$executeRaw`
      INSERT INTO inbound_calls (
        id, call_sid, caller_number, contact_id, status, routing_metadata, created_at
      ) VALUES (
        ${inboundCall.id}, 
        ${inboundCall.callSid}, 
        ${inboundCall.callerNumber},
        ${inboundCall.contactId || null},
        ${inboundCall.status},
        ${JSON.stringify({ callerInfo, routingOptions: inboundCall.routingOptions })},
        ${inboundCall.createdAt}
      )
    `;
  } catch (error: any) {
    console.error('❌ Error storing inbound call:', error);
    // Continue execution - don't fail the call flow
  }
}

// Notify agents of inbound call via real-time events
async function notifyAgentsOfInboundCall(inboundCall: InboundCall, callerInfo: CallerLookupResponse): Promise<void> {
  try {
    // Use the centralized event helper for inbound call notifications
    await callEvents.inboundRinging({
      callId: inboundCall.id,
      callSid: inboundCall.callSid,
      callerNumber: inboundCall.callerNumber,
      callerInfo: callerInfo.contact,
      routingOptions: inboundCall.routingOptions,
      priority: inboundCall.metadata.priority,
      isCallback: inboundCall.metadata.isCallback,
      direction: 'inbound',
      phoneNumber: inboundCall.callerNumber,
      contactId: inboundCall.contactId || '',
      campaignId: '', // Inbound calls aren't tied to specific campaigns initially
      agentId: '', // No specific agent initially
      status: 'ringing'
    });

    // Also notify via WebSocket service for immediate delivery
    if (webSocketService) {
      // Send to all available agents (broadcast approach)
      webSocketService.sendToAgent('*', 'inbound-call-ringing', {
        call: inboundCall,
        callerInfo: callerInfo.contact
      });
    }

  } catch (error: any) {
    console.error('❌ Error notifying agents of inbound call:', error);
    // Continue execution - don't fail the call flow
  }
}

// Get inbound call details from database
async function getInboundCallDetails(callId: string): Promise<any> {
  try {
    const callDetails = await prisma.$queryRaw`
      SELECT ic.*, c.firstName, c.lastName, c.company
      FROM inbound_calls ic
      LEFT JOIN contacts c ON ic.contact_id = c.contactId
      WHERE ic.id = ${callId}
      LIMIT 1
    ` as any[];

    return callDetails.length > 0 ? callDetails[0] : null;
  } catch (error: any) {
    console.error('❌ Error getting inbound call details:', error);
    return null;
  }
}