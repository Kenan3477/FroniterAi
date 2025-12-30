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
  try {
    console.log('🎵 Generating TwiML response for call:', inboundCall.id);
    
    const twiml = new twilio.twiml.VoiceResponse();

    // Simple greeting without personalization to avoid issues
    twiml.say({
      voice: 'alice',
      language: 'en-US'
    }, 'Thank you for calling. Please hold while we connect you to an available agent.');

    // Add a pause
    twiml.pause({ length: 1 });

    // Simple hold music - no complex conference setup
    twiml.play('http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3');

    const twimlString = twiml.toString();
    console.log('✅ Simple TwiML generated successfully:', twimlString.length, 'characters');
    
    return twimlString;
  } catch (error) {
    console.error('❌ Error generating TwiML:', error);
    
    // Ultra-simple fallback TwiML
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling. Please hold.</Say>
  <Pause length="1"/>
  <Play>http://com.twilio.music.classical.s3.amazonaws.com/BusyStrings.mp3</Play>
</Response>`;
  }
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
          "assignedAgentId" = ${transferType === 'agent' ? targetId : agentId},
          "assignedQueueId" = ${transferType === 'queue' ? targetId : null}
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
    await prisma.inboundCall.create({
      data: {
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
    
    // Use the centralized event helper for inbound call notifications - SKIP FOR NOW TO AVOID CRASH
    try {
      console.log('🔔 Attempting to emit inbound ringing event...');
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
      console.log('✅ Event system notification sent successfully');
    } catch (eventError: any) {
      console.error('❌ Error with event system notification (continuing anyway):', eventError);
    }

    // Notify available agents in DAC campaign via WebSocket service
    if (webSocketService) {
      console.log('🔔 WebSocket service available, proceeding with agent notification');
      
      try {
        // Find agents available in DAC campaign (campaign_1766695393511)
        console.log('🔍 Querying for available agents in DAC campaign...');
        
        // First check what agent records exist
        console.log('🔍 Checking sample agent records...');
        const allAgentsCheck = await prisma.$queryRaw`
          SELECT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn"
          FROM agents a
          LIMIT 5
        ` as any[];
        console.log('🔍 Sample agent records:', allAgentsCheck);
        
        // Check user_campaigns structure
        console.log('🔍 Checking user campaigns for DAC...');
        const userCampaignsCheck = await prisma.$queryRaw`
          SELECT uc."userId", uc."campaignId"
          FROM user_campaigns uc
          WHERE uc."campaignId" = 'campaign_1766695393511'
          LIMIT 5
        ` as any[];
        console.log('🔍 User campaigns for DAC:', userCampaignsCheck);
        
        // Modified query - handle potential type mismatch between agentId and userId
        console.log('🔍 Running main agent availability query...');
        const availableAgents = await prisma.$queryRaw`
          SELECT DISTINCT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn", uc."userId"
          FROM agents a
          INNER JOIN user_campaigns uc ON (
            a."agentId" = uc."userId"::text 
            OR a."agentId"::integer = uc."userId"
          )
          WHERE a.status = 'Available' 
            AND a."isLoggedIn" = true
            AND uc."campaignId" = 'campaign_1766695393511'
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

          // Get dialler namespace for agent communications
          const diallerNamespace = (webSocketService as any).diallerNamespace;
          
          console.log('🔍 Dialler namespace status:', diallerNamespace ? 'AVAILABLE' : 'NULL');
          
          if (diallerNamespace) {
            // Send to each agent individually using dialler namespace
            for (const agent of availableAgents) {
              console.log(`📤 Sending inbound call notification to agent: ${agent.agentId}`);
              diallerNamespace.to(`agent:${agent.agentId}`).emit('inbound-call-ringing', notificationData);
            }

            // Also broadcast to the DAC campaign room in dialler namespace
            console.log('📡 Broadcasting to DAC campaign room');
            diallerNamespace.to('campaign:campaign_1766695393511').emit('inbound-call-ringing', notificationData);
            
            console.log('✅ Inbound call notifications sent to available agents via dialler namespace');
          } else {
            console.log('⚠️ Dialler namespace not available, using main namespace');
            
            // Fallback to main namespace
            for (const agent of availableAgents) {
              console.log(`📤 Fallback notification to agent: ${agent.agentId}`);
              webSocketService.sendToAgent(agent.agentId, 'inbound-call-ringing', notificationData);
            }
            webSocketService.sendToCampaign('campaign_1766695393511', 'inbound-call-ringing', notificationData);
            console.log('✅ Inbound call notifications sent via main namespace');
          }
        } else {
          console.log('⚠️ No available agents found for inbound call notification');
          console.log('🔍 Checking all agents in campaign...');
          
          const allAgents = await prisma.$queryRaw`
            SELECT DISTINCT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn"
            FROM agents a
            INNER JOIN user_campaigns uc ON (
              a."agentId" = uc."userId"::text 
              OR a."agentId"::integer = uc."userId"
            )
            WHERE uc."campaignId" = 'campaign_1766695393511'
          ` as any[];
          
          console.log('🔍 All agents in DAC campaign:', allAgents);
        }
        
      } catch (dbError: any) {
        console.error('❌ Database error during agent lookup:', dbError);
        console.error('❌ Error details:', dbError.message, dbError.stack);
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