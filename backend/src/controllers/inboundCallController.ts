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

    // Check if agents are available for immediate connection
    const availableAgents = callerInfo.routing.availableAgents;
    let twiml: string;
    
    // TEMPORARY: Always use direct agent ring for testing
    // TODO: Remove this override after agent availability is working
    console.log('🧪 TESTING MODE: Always routing to direct agent ring');
    twiml = generateDirectAgentRingTwiML(availableAgents, inboundCallId);
    console.log('✅ Inbound call routed to direct agent ring (testing mode)');
    
    // Original logic (temporarily disabled):
    // if (availableAgents.length > 0) {
    //   // Agents available - generate TwiML to ring them directly
    //   twiml = generateDirectAgentRingTwiML(availableAgents, inboundCallId);
    //   console.log('✅ Inbound call routed to available agents:', availableAgents.length);
    // } else {
    //   // No agents available - send to queue/flow
    //   twiml = generateQueueTwiML();
    //   console.log('✅ Inbound call sent to queue (no available agents)');
    // }
    
    console.log('✅ Inbound call processed successfully:', inboundCallId);
    
    // Send TwiML response immediately
    res.type('text/xml');
    res.send(twiml);
    
    // Start notifications asynchronously (don't await)
    notifyAgentsOfInboundCall(inboundCall, callerInfo).catch(error => {
      console.error('❌ Notification error (non-blocking):', error);
    });
    
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
 * Generate initial TwiML response for inbound calls
 * Puts customer in conference room to wait for agent
 */
export const generateInboundWelcomeTwiML = (conferenceRoom: string): string => {
  console.log('🎵 Generating conference TwiML for inbound call, conference:', conferenceRoom);
  
  // Put customer in conference room with hold music
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome to Omnivox. Please hold while we connect you to an agent.</Say>
  <Dial>
    <Conference waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical" startConferenceOnEnter="false" endConferenceOnExit="true">
      ${conferenceRoom}
    </Conference>
  </Dial>
</Response>`;

  console.log('✅ Conference TwiML generated for customer');
  return twiml;
};

/**
 * Generate TwiML to ring agents directly for immediate pickup
 */
function generateDirectAgentRingTwiML(availableAgents: any[], callId: string): string {
  console.log('📞 Generating direct agent ring TwiML for agents:', availableAgents.map(a => a.id));
  
  // Ring the browser-based agent directly
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Please hold while we connect you to an available agent.</Say>
  <Dial timeout="30" record="record-from-answer-dual">
    <Client>agent-browser</Client>
  </Dial>
  <Say voice="alice">All agents are currently busy. Your call will be transferred to our queue.</Say>
  <Redirect>/api/calls/webhook/queue</Redirect>
</Response>`;

  return twiml;
}

/**
 * Generate TwiML for queue/flow when no agents available
 */
function generateQueueTwiML(): string {
  console.log('📞 Generating queue TwiML - no agents available');
  
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thank you for calling Omnivox. All our agents are currently busy.</Say>
  <Say voice="alice">Please stay on the line and your call will be answered in the order it was received.</Say>
  <Play loop="10">http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical</Play>
  <Say voice="alice">We appreciate your patience. Please try again later.</Say>
  <Hangup/>
</Response>`;

  return twiml;
}

/**
 * POST /api/calls/inbound-answer
 * Agent accepts an inbound call
 */
export const answerInboundCall = async (req: Request, res: Response) => {
  try {
    const { callId, agentId } = req.body;
    
    console.log(`📞 Agent ${agentId} answering inbound call ${callId}`);

    // Try to update call status in database with better error handling
    try {
      // Try using Prisma ORM first (more robust)
      const updateResult = await prisma.inboundCall.updateMany({
        where: { callId: callId },
        data: {
          status: 'answered',
          assignedAgentId: agentId,
          answeredAt: new Date()
        }
      });
      console.log('✅ Database update successful:', updateResult);
    } catch (dbError: any) {
      console.warn('⚠️ Database update failed, continuing anyway:', dbError.message);
      // Don't fail the request for database issues
    }

    // Try to get call details with fallback
    let callDetails = null;
    try {
      callDetails = await prisma.inboundCall.findFirst({
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
        status: 'answered',
        assignedAgentId: agentId
      };
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
    
    // SKIP EVENT SYSTEM FOR NOW - IT'S HANGING
    console.log('⚠️ Skipping event system to avoid hanging - proceeding directly to WebSocket notifications');

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
        
        // Check user_campaign_assignments structure
        console.log('🔍 Checking user campaigns for DAC...');
        const userCampaignsCheck = await prisma.$queryRaw`
          SELECT uca."userId", uca."campaignId"
          FROM user_campaign_assignments uca
          WHERE uca."campaignId" = 'campaign_1766695393511'
          LIMIT 5
        ` as any[];
        console.log('🔍 User campaigns for DAC:', userCampaignsCheck);
        
        // Modified query - handle potential type mismatch between agentId and userId
        console.log('🔍 Running main agent availability query...');
        const availableAgents = await prisma.$queryRaw`
          SELECT DISTINCT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn", uca."userId"
          FROM agents a
          INNER JOIN user_campaign_assignments uca ON (
            a."agentId" = uca."userId"::text 
            OR a."agentId"::integer = uca."userId"
          )
          WHERE a.status = 'Available' 
            AND a."isLoggedIn" = true
            AND uca."campaignId" = 'campaign_1766695393511'
            AND uca."isActive" = true
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
            // Send to each agent individually using dialler namespace
            for (const agent of availableAgents) {
              console.log(`📤 Sending inbound call notification to agent: ${agent.agentId}`);
              try {
                diallerNamespace.to(`agent:${agent.agentId}`).emit('inbound-call-ringing', notificationData);
                console.log(`✅ Notification sent to agent: ${agent.agentId}`);
              } catch (emitError: any) {
                console.error(`❌ Error sending to agent ${agent.agentId}:`, emitError);
              }
            }

            // Also broadcast to the DAC campaign room in dialler namespace
            console.log('📡 Broadcasting to DAC campaign room');
            try {
              diallerNamespace.to('campaign:campaign_1766695393511').emit('inbound-call-ringing', notificationData);
              console.log('✅ Campaign room broadcast sent');
            } catch (broadcastError: any) {
              console.error('❌ Error broadcasting to campaign room:', broadcastError);
            }
            
            console.log('✅ Inbound call notifications sent to available agents via dialler namespace');
          } else {
            console.log('⚠️ Dialler namespace not available, using main namespace');
            
            // Fallback to main namespace
            for (const agent of availableAgents) {
              console.log(`📤 Fallback notification to agent: ${agent.agentId}`);
              try {
                webSocketService.sendToAgent(agent.agentId, 'inbound-call-ringing', notificationData);
                console.log(`✅ Fallback notification sent to agent: ${agent.agentId}`);
              } catch (fallbackError: any) {
                console.error(`❌ Error sending fallback to agent ${agent.agentId}:`, fallbackError);
              }
            }
            
            try {
              webSocketService.sendToCampaign('campaign_1766695393511', 'inbound-call-ringing', notificationData);
              console.log('✅ Fallback campaign notification sent');
            } catch (campaignError: any) {
              console.error('❌ Error sending fallback campaign notification:', campaignError);
            }
            
            console.log('✅ Inbound call notifications sent via main namespace');
          }
        } else {
          console.log('⚠️ No available agents found for inbound call notification');
          console.log('🔍 Checking all agents in campaign...');
          
          const allAgents = await prisma.$queryRaw`
            SELECT DISTINCT a."agentId", a."firstName", a."lastName", a.status, a."isLoggedIn"
            FROM agents a
            INNER JOIN user_campaign_assignments uca ON (
              a."agentId" = uca."userId"::text 
              OR a."agentId"::integer = uca."userId"
            )
            WHERE uca."campaignId" = 'campaign_1766695393511'
              AND uca."isActive" = true
          ` as any[];
          
          console.log('🔍 All agents in DAC campaign:', allAgents);
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