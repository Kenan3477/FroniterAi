/**
 * Dialer Controller - Handles all dialer-related API endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import twilioService from '../services/twilioService';
import { PrismaClient } from '@prisma/client';
import twilio from 'twilio';

// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const prisma = new PrismaClient();

/**
 * CRITICAL: End any active calls for an agent before starting a new one
 * This ensures only ONE call is active at a time, preventing call stacking
 * and ensuring seamless call flow without latency or stuck states
 */
async function endAnyActiveCallsForAgent(agentId: string): Promise<number> {
  try {
    console.log(`🔍 Checking for active calls for agent ${agentId}...`);
    
    // Find all calls that appear to be active:
    // - Have a startTime (call was initiated)
    // - No endTime (call hasn't ended)
    // - Created within last 2 hours (safety net for stuck calls)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const activeCalls = await prisma.callRecord.findMany({
      where: {
        agentId,
        startTime: { not: null },
        endTime: null,
        createdAt: { gte: twoHoursAgo }
      },
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        startTime: true,
        createdAt: true
      }
    });

    if (activeCalls.length === 0) {
      console.log(`✅ No active calls found for agent ${agentId}`);
      return 0;
    }

    console.log(`⚠️  Found ${activeCalls.length} active call(s) for agent ${agentId}, ending them now...`);

    let endedCount = 0;

    for (const call of activeCalls) {
      try {
        const callAge = Math.floor((Date.now() - new Date(call.createdAt).getTime()) / 1000);
        console.log(`📞 Ending active call ${call.callId} (to: ${call.phoneNumber}, age: ${callAge}s)`);

        // 1. End the call in Twilio (if it exists)
        if (call.callId) {
          try {
            await twilioClient.calls(call.callId).update({ 
              status: 'completed' 
            });
            console.log(`✅ Ended call ${call.callId} in Twilio`);
          } catch (twilioError: any) {
            // Call might already be completed in Twilio, that's fine
            if (twilioError.code === 20404) {
              console.log(`ℹ️  Call ${call.callId} already ended in Twilio`);
            } else {
              console.error(`⚠️  Error ending call in Twilio: ${twilioError.message}`);
            }
          }
        }

        // 2. Update the database record
        const duration = call.startTime 
          ? Math.floor((Date.now() - new Date(call.startTime).getTime()) / 1000)
          : 0;

        await prisma.callRecord.update({
          where: { id: call.id },
          data: {
            endTime: new Date(),
            outcome: 'interrupted', // Special outcome for calls ended by system
            duration: duration,
            notes: `Call interrupted by new call initiation at ${new Date().toISOString()}`
          }
        });

        console.log(`✅ Updated call record ${call.id} in database (duration: ${duration}s)`);
        endedCount++;

      } catch (callError) {
        console.error(`❌ Error ending individual call ${call.callId}:`, callError);
        // Continue with other calls even if one fails
      }
    }

    console.log(`✅ Successfully ended ${endedCount} of ${activeCalls.length} active calls`);
    return endedCount;

  } catch (error) {
    console.error(`❌ Error in endAnyActiveCallsForAgent:`, error);
    return 0;
  }
}

// Helper function to get or create agent record for user
async function getOrCreateAgentForUser(userId: string, userFirstName: string, userLastName: string, userEmail: string): Promise<string | null> {
  try {
    console.log('🔍 Looking for agent with email:', userEmail);
    
    // First try to find existing agent by email
    let agent = await prisma.agent.findUnique({
      where: { email: userEmail }
    });

    if (agent) {
      console.log('✅ Found existing agent:', { agentId: agent.agentId, name: `${agent.firstName} ${agent.lastName}` });
      return agent.agentId;
    }

    // If no agent found, create a new one based on user data
    const agentId = `agent-${userId}`;
    console.log('📝 Creating new agent with ID:', agentId);
    
    agent = await prisma.agent.create({
      data: {
        agentId: agentId,
        firstName: userFirstName || 'Unknown',
        lastName: userLastName || 'User',
        email: userEmail,
        status: 'Available'
      }
    });

    console.log('✅ Created new agent:', { agentId: agent.agentId, name: `${agent.firstName} ${agent.lastName}` });
    return agent.agentId;
  } catch (error) {
    console.error('❌ Error getting/creating agent:', error);
    return null;
  }
}

// Phone number formatting utility - safety net, frontend should already send E.164
const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  const trimmed = phoneNumber.trim();
  
  // Already valid E.164 (starts with + followed by 7-15 digits, no leading 0)
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) {
    return trimmed;
  }
  
  // Remove all non-digit characters for analysis
  let cleaned = trimmed.replace(/\D/g, '');
  
  // ── UK NUMBER DETECTION (must come BEFORE US/generic rules) ──────────────
  
  // UK: 11 digits starting with 0 (all UK domestic formats: 01xxx, 02xxx, 03xxx, 07xxx, 08xxx)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return '+44' + cleaned.substring(1); // 07714333569 → +447714333569
  }
  
  // UK: already has 44 country code, 12 digits total (447714333569)
  if (cleaned.startsWith('44') && cleaned.length === 12) {
    return '+' + cleaned; // → +447714333569
  }
  
  // UK: 10 digits starting with 7 (mobile without leading 0, e.g. 7714333569)
  if (cleaned.length === 10 && cleaned.startsWith('7')) {
    return '+44' + cleaned; // → +447714333569
  }
  
  // UK: 10 digits starting with 1 or 2 — AMBIGUOUS with US but we are UK-first
  // UK landlines: 1xxx xxxxxx (e.g. 1234567890 = 01234567890 without leading 0)
  // Rule: if it LOOKS like a UK area code (starts with known UK prefixes), treat as UK
  // UK area codes start: 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 28, 29, 30, 31, 33
  if (cleaned.length === 10) {
    const twoDigit = parseInt(cleaned.substring(0, 2), 10);
    const isLikelyUK = (twoDigit >= 11 && twoDigit <= 19) || // 01xxx area codes
                       (twoDigit >= 20 && twoDigit <= 29) || // 02xxx area codes (London etc)
                       twoDigit === 30 || twoDigit === 31 || twoDigit === 33; // 03xxx
    
    if (isLikelyUK) {
      console.log(`📞 10-digit number ${cleaned} detected as UK landline (prefix: ${twoDigit})`);
      return '+44' + cleaned; // → +441234567890
    }
    
    // Otherwise assume US/Canada
    console.log(`📞 10-digit number ${cleaned} detected as US/Canada (prefix: ${twoDigit})`);
    return '+1' + cleaned;
  }
  
  // ── US / CANADA ───────────────────────────────────────────────────────────
  
  // US/Canada with country code: 11 digits starting with 1
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return '+' + cleaned; // → +17145551234
  }
  
  // ── INTERNATIONAL FALLBACK ───────────────────────────────────────────────
  
  // Has reasonable length - prepend + and hope for the best
  if (cleaned.length >= 7 && cleaned.length <= 15) {
    console.warn(`⚠️ Could not confidently identify country for number: ${phoneNumber} (cleaned: ${cleaned}) - prepending + as fallback`);
    return '+' + cleaned;
  }
  
  console.error(`❌ Cannot format invalid phone number: ${phoneNumber}`);
  return '+' + cleaned;
};

/**
 * Enhanced landline detection function
 * Returns true for landlines, false for mobiles
 * Optimized for UK and common international patterns
 */
function detectLandlineNumber(phoneNumber: string): boolean {
  if (!phoneNumber) return false;
  
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // UK number patterns (most common use case)
  if (phoneNumber.startsWith('+44') || cleanNumber.startsWith('44')) {
    const ukNumber = phoneNumber.replace('+44', '').replace(/\D/g, '');
    
    // UK mobile numbers: 07xxx
    if (ukNumber.startsWith('7')) {
      return false; // Mobile
    }
    
    // UK landlines: 01xxx, 02xxx, 03xxx, 08xxx (excluding 070x which are mobiles)
    if (ukNumber.match(/^[123568]/)) {
      return true;  // Landline
    }
  }
  
  // US number patterns
  if (phoneNumber.startsWith('+1') || (cleanNumber.startsWith('1') && cleanNumber.length === 11)) {
    const usAreaCode = cleanNumber.substring(1, 4);
    
    // Common landline area codes (major metropolitan areas typically have more landlines)
    const landlineAreaCodes = [
      '212', '213', '214', '215', '216', '217', '218', '301', '302', '303', '304', '305',
      '307', '308', '309', '310', '312', '313', '314', '315', '316', '317', '318', '319',
      '401', '402', '403', '404', '405', '406', '407', '408', '409', '410', '412', '413',
      '414', '415', '416', '417', '418', '419', '423', '424', '425', '430', '431', '432'
    ];
    
    if (landlineAreaCodes.includes(usAreaCode)) {
      return true; // Likely landline
    }
  }
  
  // European patterns - most European landlines start with non-mobile prefixes
  const europeanLandlinePatterns = [
    /^\+33[1-5]/, // France landlines (01-05)
    /^\+49[2-9]/, // Germany landlines (02-09)
    /^\+39[0][1-9]/, // Italy landlines (01-09)
    /^\+34[8-9]/, // Spain landlines (8x, 9x)
  ];
  
  for (const pattern of europeanLandlinePatterns) {
    if (pattern.test(phoneNumber)) {
      return true;
    }
  }
  
  // Default to mobile for better compatibility
  return false;
}

// Validation schemas  
const endCallSchema = z.object({
  callSid: z.string().min(1, 'Call SID required'),
  duration: z.number().min(0),
  status: z.string(),
  disposition: z.string().optional(),
  customerInfo: z.any().optional(),
});

const dtmfSchema = z.object({
  callSid: z.string().min(1, 'Call SID required'),
  digits: z.string().min(1, 'DTMF digits required'),
});

/**
 * POST /api/calls/token
 * Generate Twilio access token for browser audio
 */
export const generateToken = async (req: Request, res: Response) => {
  try {
    console.log('🔗 Token request received:', req.body);
    const { agentId } = req.body;

    if (!agentId) {
      console.error('❌ Missing agentId in request:', req.body);
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required',
      });
    }

    console.log('📱 Generating token for agent:', agentId);
    const token = twilioService.generateAccessToken(agentId);

    res.json({
      success: true,
      data: {
        token,
        identity: agentId,
      },
    });
  } catch (error: any) {
    console.error('Error generating token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate access token',
    });
  }
};

/**
 * POST /api/calls/end
 * End an active call
 */
export const endCall = async (req: Request, res: Response) => {
  try {
    const validatedData = endCallSchema.parse(req.body);

    console.log('🔚 Ending call with data:', validatedData);

    // End the call through Twilio
    const result = await twilioService.endCall(validatedData.callSid);

    // Create call record and interaction
    if (validatedData.customerInfo) {
      try {
        const { customerInfo } = validatedData;
        const callEndTime = new Date();
        const callStartTime = new Date(callEndTime.getTime() - (validatedData.duration * 1000));
        
        // First, upsert contact
        let contact = null;
        if (customerInfo.phone || customerInfo.phoneNumber) {
          const phone = customerInfo.phone || customerInfo.phoneNumber;
          
          contact = await prisma.contact.upsert({
            where: { 
              contactId: customerInfo.contactId || `contact_${phone}_${Date.now()}`
            },
            update: {
              firstName: customerInfo.firstName || '',
              lastName: customerInfo.lastName || '',
              email: customerInfo.email,
              address: customerInfo.address,
              notes: customerInfo.notes,
              updatedAt: new Date(),
            },
            create: {
              contactId: customerInfo.contactId || `contact_${phone}_${Date.now()}`,
              listId: customerInfo.listId || 'default-list',
              firstName: customerInfo.firstName || '',
              lastName: customerInfo.lastName || '',
              phone: phone,
              email: customerInfo.email,
              address: customerInfo.address,
              notes: customerInfo.notes,
              status: 'contacted',
              attemptCount: 1,
            },
          });
        }

        // Create call record
        const callRecord = await prisma.callRecord.create({
          data: {
            callId: validatedData.callSid,
            contactId: contact?.contactId || customerInfo.contactId || `contact_${Date.now()}`,
            campaignId: customerInfo.campaignId || 'default',
            phoneNumber: customerInfo.phone || customerInfo.phoneNumber || '',
            agentId: customerInfo.agentId || 'unknown',
            callType: 'outbound',
            startTime: callStartTime,
            endTime: callEndTime,
            duration: validatedData.duration,
            outcome: validatedData.disposition || 'completed',
            notes: customerInfo.notes,
          },
        });

        console.log('✅ Call record created:', callRecord.callId);

        // Create interaction record
        const interaction = await prisma.interaction.create({
          data: {
            agentId: customerInfo.agentId || 'unknown',
            contactId: contact?.contactId || customerInfo.contactId || `contact_${Date.now()}`,
            campaignId: customerInfo.campaignId || 'default',
            channel: 'voice',
            outcome: validatedData.disposition || 'completed',
            startedAt: callStartTime,
            endedAt: callEndTime,
            durationSeconds: validatedData.duration,
            result: customerInfo.notes,
          },
        });

        console.log('✅ Interaction record created:', interaction.id);

        // Process call recordings asynchronously if we have a call SID
        if (validatedData.callSid) {
          console.log(`📼 Processing recordings for call: ${validatedData.callSid}`);
          // Don't await this - let it process in the background
          setTimeout(async () => {
            try {
              // Import recording service and process recordings
              const { processCallRecordings } = require('../services/recordingService');
              await processCallRecordings(validatedData.callSid, callRecord.callId);
              console.log(`✅ Recording processing completed for call: ${validatedData.callSid}`);
            } catch (recordingError) {
              console.error(`❌ Error processing recordings for call ${validatedData.callSid}:`, recordingError);
            }
          }, 1000);
        }

      } catch (dbError) {
        console.error('❌ Error saving call data to database:', dbError);
        // Continue even if database save fails - don't break the call ending flow
      }
    }

    res.json({
      success: true,
      message: 'Call ended successfully',
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    console.error('Error ending call:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end call',
    });
  }
};

/**
 * POST /api/calls/hold
 * Put a call on hold or resume from hold
 */
export const holdCall = async (req: Request, res: Response) => {
  try {
    const holdSchema = z.object({
      callId: z.string().min(1, 'Call ID required'),
      action: z.enum(['hold', 'unhold'], { 
        errorMap: () => ({ message: 'Action must be "hold" or "unhold"' })
      })
    });

    const { callId, action } = holdSchema.parse(req.body);
    
    console.log(`📞 ${action === 'hold' ? 'Holding' : 'Resuming'} call ${callId}`);

    // Use Twilio to modify the call with hold music or resume
    try {
      if (action === 'hold') {
        // Put call on hold with hold music
        await twilioClient.calls(callId).update({
          twiml: `
            <Response>
              <Say>Please hold while we transfer your call.</Say>
              <Play loop="0">http://com.twilio.music.ambient.mp3</Play>
            </Response>
          `
        });
      } else {
        // Resume call by removing hold music
        await twilioClient.calls(callId).update({
          twiml: `
            <Response>
              <Say>Thank you for holding. Connecting you now.</Say>
              <Dial>
                <Conference>agent-customer-conference-${callId}</Conference>
              </Dial>
            </Response>
          `
        });
      }

      const result = {
        callId,
        action,
        status: action === 'hold' ? 'on-hold' : 'connected',
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Call ${callId} successfully ${action === 'hold' ? 'placed on hold' : 'resumed'}`);

      res.json({
        success: true,
        message: `Call ${action === 'hold' ? 'placed on hold' : 'resumed'} successfully`,
        data: result
      });

    } catch (twilioError: any) {
      console.error(`❌ Twilio error during ${action}:`, twilioError);
      res.status(500).json({
        success: false,
        error: `Failed to ${action} call: ${twilioError.message}`
      });
    }

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    console.error(`❌ Error with ${req.body.action || 'hold'} operation:`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process hold request'
    });
  }
};

/**
 * GET /api/calls/:callSid
 * Get call details
 */
export const getCallDetails = async (req: Request, res: Response) => {
  try {
    const { callSid } = req.params;

    const call = await twilioService.getCallDetails(callSid);

    res.json({
      success: true,
      data: call,
    });
  } catch (error: any) {
    console.error('Error fetching call details:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch call details',
    });
  }
};

/**
 * GET /api/calls/:callSid/live-status
 * Lightweight endpoint for frontend to poll real-time call status.
 * Returns only the fields needed to update the UI without the full call object overhead.
 */
export const getLiveCallStatus = async (req: Request, res: Response) => {
  try {
    const { callSid } = req.params;
    const client = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const call = await client.calls(callSid).fetch();

    res.json({
      success: true,
      callSid: call.sid,
      status: call.status,          // queued | ringing | in-progress | completed | busy | no-answer | canceled | failed
      duration: call.duration || 0,
      direction: call.direction,
      to: call.to,
      from: call.from,
      startTime: call.startTime,
      endTime: call.endTime,
    });
  } catch (error: any) {
    // Return a non-500 so the frontend doesn't treat it as a hard failure during polling
    res.status(200).json({
      success: false,
      status: 'unknown',
      error: error.message,
    });
  }
};

/**
 * POST /api/calls/dtmf
 * Send DTMF tones during an active call
 */
export const sendDTMF = async (req: Request, res: Response) => {
  try {
    const validatedData = dtmfSchema.parse(req.body);

    const result = await twilioService.sendDTMF(
      validatedData.callSid,
      validatedData.digits
    );

    res.json({
      success: true,
      message: 'DTMF sent successfully',
      data: result,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    console.error('Error sending DTMF:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send DTMF',
    });
  }
};

/**
 * GET/POST /api/calls/twiml
 * Generate TwiML for outbound calls from Twilio Voice SDK
 * This is called by Twilio when a call is initiated from the browser
 */
export const generateTwiML = async (req: Request, res: Response) => {
  try {
    // Parameters can come from query (GET) or body (POST)
    const To = req.query.To || req.body.To;
    const From = req.query.From || req.body.From;
    const conference = req.query.conference || req.body.conference;
    const callId = req.query.callId || req.body.callId;
    const agentId = req.query.agentId || req.body.agentId;

    console.log('📞 TwiML request received:', { 
      method: req.method,
      To, 
      From,
      conference,
      callId,
      agentId,
      query: req.query,
      body: req.body
    });

    // Check if this is a conference connection request (for agent joining)
    if (conference) {
      console.log('🎯 Agent joining conference:', conference);
      
      // Generate TwiML to join the conference as agent
      const twiml = twilioService.generateAgentTwiML(conference as string);
      
      console.log('✅ Agent conference TwiML generated');
      res.type('text/xml');
      res.send(twiml);
      return;
    }

    // For WebRTC outbound calls, connect agent directly to conference
    if (To) {
      // This shouldn't happen in conference mode, but handle gracefully
      console.log('⚠️  Direct WebRTC call detected - redirecting to conference mode');
      const conferenceId = `conf-webrtc-${Date.now()}`;
      const twiml = twilioService.generateAgentTwiML(conferenceId);
      
      res.type('text/xml');
      res.send(twiml);
      return;
    }

    console.error('❌ Missing required parameters');
    res.type('text/xml').send('<Response><Say>Missing parameters</Say></Response>');
  } catch (error) {
    console.error('❌ Error generating TwiML:', error);
    res.type('text/xml');
    res.send('<Response><Say>An error occurred</Say></Response>');
  }
};

/**
 * GET/POST /api/calls/twiml-agent-dial
 * Generate TwiML for agent to dial customer via WebRTC
 */
export const generateAgentDialTwiML = async (req: Request, res: Response) => {
  try {
    const customer = req.query.customer || req.body.customer;
    
    console.log('📞 Agent dial TwiML request for customer:', customer);

    if (!customer) {
      return res.type('text/xml').send('<Response><Say>Customer number not specified</Say></Response>');
    }

    const twiml = twilioService.generateAgentDialTwiML(customer as string);
    
    console.log('✅ Agent dial TwiML generated for customer:', customer);
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error generating agent dial TwiML:', error);
    res.type('text/xml');
    res.send('<Response><Say>Dial error</Say></Response>');
  }
};

/**
 * GET/POST /api/calls/twiml-customer-to-agent
 * Generate TwiML for customer to connect directly to WebRTC agent
 * Enhanced with landline detection for optimized call handling
 */
export const generateCustomerToAgentTwiML = async (req: Request, res: Response) => {
  try {
    // Extract phone number from request for landline detection
    const phoneNumber = req.query.To || req.body.To || req.query.to || req.body.to;
    console.log('📞 Customer-to-Agent TwiML request - Phone:', phoneNumber);

    const twiml = twilioService.generateCustomerToAgentTwiML(phoneNumber);
    
    console.log('✅ Customer-to-Agent TwiML generated with landline optimization');
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error generating customer-to-agent TwiML:', error);
    res.type('text/xml');
    res.send('<Response><Say>Connection error</Say></Response>');
  }
};

/**
 * GET/POST /api/calls/twiml-agent
 * Generate TwiML for agent connection to conference
 */
export const generateAgentTwiML = async (req: Request, res: Response) => {
  try {
    const conference = req.query.conference || req.body.conference;
    
    console.log('👤 Agent TwiML request for conference:', conference);

    if (!conference) {
      return res.type('text/xml').send('<Response><Say>Conference not specified</Say></Response>');
    }

    const twiml = twilioService.generateAgentTwiML(conference as string);
    
    console.log('✅ Agent TwiML generated for conference:', conference);
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error generating agent TwiML:', error);
    res.type('text/xml');
    res.send('<Response><Say>Agent connection error</Say></Response>');
  }
};

/**
 * GET/POST /api/calls/twiml-customer  
 * Generate TwiML for customer connection to conference
 */
export const generateCustomerTwiML = async (req: Request, res: Response) => {
  try {
    const conference = req.query.conference || req.body.conference;
    
    console.log('📞 Customer TwiML request for conference:', conference);

    if (!conference) {
      return res.type('text/xml').send('<Response><Say>Conference not specified</Say></Response>');
    }

    const twiml = twilioService.generateCustomerTwiML(conference as string);
    
    console.log('✅ Customer TwiML generated for conference:', conference);
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('❌ Error generating customer TwiML:', error);
    res.type('text/xml');
    res.send('<Response><Say>Customer connection error</Say></Response>');
  }
};

/**
 * POST /api/calls/status
 * Handle Twilio status callbacks for call state tracking
 */
export const handleStatusCallback = async (req: Request, res: Response) => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      From,
      To,
      Direction,
      ConferenceSid
    } = req.body;

    console.log(`📞 Call status update: ${CallSid} - ${CallStatus}`, {
      From,
      To,
      Direction,
      Duration: CallDuration,
      Conference: ConferenceSid
    });

    // Handle call completion
    if (CallStatus === 'completed') {
      console.log(`✅ Call completed: ${CallSid} - Duration: ${CallDuration}s`);
      
      // Find call record.
      // makeRestApiCall stores callId=conf-xxx and saves the Twilio SID in `recording`.
      // Check both recording column AND callId column to handle both creation paths.
      try {
        const callRecord = await prisma.callRecord.findFirst({
          where: {
            OR: [
              { recording: CallSid },
              { callId: CallSid }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        if (callRecord) {
          await prisma.callRecord.update({
            where: { id: callRecord.id },
            data: {
              endTime: new Date(),
              duration: parseInt(CallDuration) || 0,
              outcome: 'completed'
            }
          });

          console.log(`📝 Call record updated: ${callRecord.callId}`);

          // Process recordings asynchronously
          if (CallSid) {
            console.log(`📼 Triggering recording processing for call: ${CallSid}`);
            // Import here to avoid circular dependency
            const { processCallRecordings } = require('../services/recordingService');
            processCallRecordings(CallSid, callRecord.id).catch((error: any) => {
              console.error('❌ Error processing recordings:', error);
            });
          }
        } else {
          console.warn(`⚠️  No call record found for Twilio SID: ${CallSid}`);
          
          // FAILSAFE: Create missing call record from webhook data
          try {
            console.log(`🔧 Creating failsafe call record from webhook data...`);
            
            // Ensure required campaign exists
            await prisma.campaign.upsert({
              where: { campaignId: 'webhook-calls' },
              update: {},
              create: {
                campaignId: 'webhook-calls',
                name: 'Webhook Created Calls',
                dialMethod: 'Manual',
                status: 'Active',
                isActive: true,
                description: 'Call records created from Twilio webhooks',
                recordCalls: true
              }
            });

            // Ensure required data list exists
            await prisma.dataList.upsert({
              where: { listId: 'webhook-contacts' },
              update: {},
              create: {
                listId: 'webhook-contacts',
                name: 'Webhook Contacts',
                campaignId: 'webhook-calls',
                active: true,
                totalContacts: 0
              }
            });

            // Create contact for this call
            const contactId = `webhook-${CallSid}`;
            await prisma.contact.upsert({
              where: { contactId },
              update: {},
              create: {
                contactId,
                listId: 'webhook-contacts',
                firstName: 'Webhook',
                lastName: 'Contact',
                phone: To || From || 'Unknown',
                status: 'contacted'
              }
            });

            // Get a default agent (first available agent)
            const defaultAgent = await prisma.agent.findFirst();

            // Create the call record
            const failsafeCallRecord = await prisma.callRecord.create({
              data: {
                callId: CallSid,
                agentId: defaultAgent?.agentId || null,
                contactId: contactId,
                campaignId: 'webhook-calls',
                phoneNumber: To || From || 'Unknown',
                dialedNumber: To || 'Unknown',
                callType: Direction === 'inbound' ? 'inbound' : 'outbound',
                startTime: new Date(Date.now() - (parseInt(CallDuration) * 1000) || 0), // Estimate start time
                endTime: new Date(),
                duration: parseInt(CallDuration) || 0,
                outcome: 'completed',
                recording: CallSid,
                notes: 'Created from Twilio webhook failsafe'
              }
            });

            console.log(`✅ Created failsafe call record: ${failsafeCallRecord.callId}`);
            console.log(`📝 Phone: ${failsafeCallRecord.phoneNumber}, Agent: ${failsafeCallRecord.agentId}`);
            
          } catch (failsafeError) {
            console.error('❌ Error creating failsafe call record:', failsafeError);
          }
        }
      } catch (dbError) {
        console.error('❌ Error updating call record:', dbError);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error handling status callback:', error);
    res.status(500).send('Error');
  }
};

/**
 * POST /api/calls/recording-status
 * Handle Twilio recording status callbacks
 */
export const handleRecordingCallback = async (req: Request, res: Response) => {
  try {
    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus
    } = req.body;

    console.log(`📼 Recording status update: ${RecordingSid} - ${RecordingStatus}`, {
      CallSid,
      Duration: RecordingDuration,
      Url: RecordingUrl
    });

    // Handle recording completion
    if (RecordingStatus === 'completed') {
      console.log(`✅ Recording completed: ${RecordingSid} for call: ${CallSid}`);
      
      // Find and update call record with recording info
      try {
        const callRecord = await prisma.callRecord.findFirst({
          where: { recording: CallSid }
        });

        if (callRecord) {
          // Update with recording SID for later download
          await prisma.callRecord.update({
            where: { id: callRecord.id },
            data: {
              recording: RecordingSid // Store recording SID instead of call SID
            }
          });

          console.log(`📝 Call record updated with recording: ${RecordingSid}`);

          // Process recording download asynchronously
          const { processCallRecordings } = require('../services/recordingService');
          processCallRecordings(CallSid, callRecord.id).catch((error: any) => {
            console.error('❌ Error downloading recording:', error);
          });
        }
      } catch (dbError) {
        console.error('❌ Error updating recording info:', dbError);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Error handling recording callback:', error);
    res.status(500).send('Error');
  }
};

/**
 * POST /api/calls/rest-api
 * Make a call using Twilio REST API (alternative to WebRTC)
 * This creates a call that connects the agent and customer via Twilio
 */
export const makeRestApiCall = async (req: Request, res: Response) => {
  try {
    const { to, contactId: existingContactId, contactName, existingContact, campaignId, campaignName, agentId: requestAgentId } = req.body;
    
    console.log('� FAST DIAL: Making REST API call - original number:', { to, existingContactId, contactName, existingContact, campaignId, campaignName });

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Customer phone number (to) is required'
      });
    }

    // Get authenticated user info
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    console.log('🔐 Authenticated user:', { 
      userId: authenticatedUser.userId, 
      username: authenticatedUser.username,
      role: authenticatedUser.role 
    });

    // ⚡ OPTIMIZATION 1: Use cached or temporary agent ID to avoid DB lookup delay
    const tempAgentId = `agent-${authenticatedUser.userId}`;
    console.log('⚡ Using temporary agent ID for fast dial:', tempAgentId);

    // Format phone number immediately (no DB dependency)
    const formattedTo = formatPhoneNumber(to);
    console.log('📞 Formatted phone number:', { original: to, formatted: formattedTo });

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    // ⚡ OPTIMIZATION 2: Generate conference ID and initiate call IMMEDIATELY
    const conferenceId = `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🚀 FAST DIAL: Creating conference call:', conferenceId);

    console.log(`📞 FAST DIAL: Initiating call to ${formattedTo} from ${fromNumber} - bypassing DB setup for speed`);

    // Detect if this is a landline for enhanced call parameters
    const isLandline = detectLandlineNumber(formattedTo);
    console.log(`🔍 Number type detection: ${formattedTo} is ${isLandline ? 'LANDLINE 🏠' : 'MOBILE 📱'}`);

    // ⚡ CRITICAL: Start the Twilio call FIRST, then handle DB operations in parallel
    const twimlUrl = `${process.env.BACKEND_URL}/api/calls/twiml-customer-to-agent`;
    
    // Enhanced call parameters for landline compatibility
    const callParams = {
      to: formattedTo,
      from: fromNumber,
      url: twimlUrl,
      method: 'POST' as const,
      statusCallback: `${process.env.BACKEND_URL}/api/calls/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'] as const,
      statusCallbackMethod: 'POST' as const,
      // Landline-specific optimizations
      ...(isLandline && {
        timeout: 90, // Extended timeout for landlines (90s vs default 60s)
        machineDetection: 'Enable' as const, // Better answering machine detection for landlines
        machineDetectionTimeout: 10, // Wait up to 10s to detect answering machines
        asyncAmd: 'true' // Use asynchronous machine detection to avoid blocking
      })
    };

    if (isLandline) {
      console.log('🏠 Applying landline optimizations: extended timeout (90s), machine detection, async AMD');
    }

    const callResult = await twilioClient.calls.create(callParams);

    console.log('⚡ FAST DIAL SUCCESS: Customer call initiated in', Date.now() - parseInt(conferenceId.split('-')[1]), 'ms');
    console.log('✅ Twilio Call SID:', callResult.sid);

    // ⚡ OPTIMIZATION 3: Return success immediately, handle DB operations asynchronously
    res.json({
      success: true,
      callSid: callResult.sid,
      conferenceId: conferenceId,
      status: callResult.status,
      message: '⚡ Fast dial initiated - database operations running in background'
    });

    // 📊 BACKGROUND OPERATIONS: Handle all database setup asynchronously after call is started
    setImmediate(async () => {
      try {
        console.log('� Background: Starting database operations for call', callResult.sid);
        
        // Get user details from database
        const user = await prisma.user.findUnique({
          where: { id: parseInt(authenticatedUser.userId) },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true
          }
        });

        if (!user) {
          console.error('❌ Background: User not found for ID:', authenticatedUser.userId);
          return;
        }

        // Get or create agent record
        const agentId = await getOrCreateAgentForUser(
          user.id.toString(), 
          user.firstName, 
          user.lastName, 
          user.email
        );

        if (!agentId) {
          console.error('❌ Background: Failed to get/create agent for user:', user.id);
          return;
        }

        // Ensure campaign exists
        const finalCampaignId = campaignId || 'DAC';
        const finalCampaignName = campaignName || 'Dial a Contact Campaign';
        
        let campaign = await prisma.campaign.findUnique({
          where: { campaignId: finalCampaignId }
        });

        if (!campaign) {
          console.log(`🔧 Background: Creating campaign: ${finalCampaignId}...`);
          campaign = await prisma.campaign.create({
            data: {
              campaignId: finalCampaignId,
              name: finalCampaignName,
              dialMethod: 'Manual',
              status: 'Active',
              isActive: true,
              description: campaignId ? `Campaign for ${campaignName}` : 'Dial a Contact Campaign for individual calls',
              recordCalls: true,
              allowTransfers: false
            }
          });
          console.log('✅ Background: Created campaign:', campaign.campaignId);
        }

        // Ensure campaign list exists  
        const listId = `${finalCampaignId}-list`;
        let dataList = await prisma.dataList.findUnique({
          where: { listId: listId }
        });

        if (!dataList) {
          console.log(`🔧 Background: Creating list for campaign: ${finalCampaignId}...`);
          dataList = await prisma.dataList.create({
            data: {
              listId: listId,
              name: `${finalCampaignName} List`,
              campaignId: finalCampaignId,
              active: true
            }
          });
          console.log('✅ Background: Created list:', dataList.listId);
        }

        // Handle contact creation/lookup
        let contactId: string;
        let contact: any;

        if (existingContact && existingContactId) {
          console.log('🔍 Background: Using existing contact:', existingContactId);
          contact = await prisma.contact.findUnique({
            where: { contactId: existingContactId }
          });
          
          if (contact) {
            contactId = contact.contactId;
            console.log('✅ Background: Found existing contact:', { contactId: contact.contactId, name: `${contact.firstName} ${contact.lastName}` });
          } else {
            console.log('⚠️ Background: Contact not found in database, creating with provided info');
            contactId = existingContactId;
            const nameParts = contactName ? contactName.split(' ') : ['Manual', 'Dial'];
            contact = await prisma.contact.create({
              data: {
                contactId: contactId,
                listId: listId,
                firstName: nameParts[0] || 'Manual',
                lastName: nameParts.slice(1).join(' ') || 'Dial',
                phone: formattedTo,
                status: 'new'
              }
            });
            console.log('✅ Background: Created contact with provided info:', contact.contactId);
          }
        } else {
          // Search for existing contact by phone number
          console.log('🔍 Background: Searching for existing contact by phone number:', formattedTo);
          
          contact = await prisma.contact.findFirst({
            where: {
              OR: [
                { phone: formattedTo },
                { phone: to },
                { mobile: formattedTo },
                { mobile: to },
                { workPhone: formattedTo },
                { workPhone: to },
                { homePhone: formattedTo },
                { homePhone: to }
              ]
            },
            orderBy: {
              updatedAt: 'desc'
            }
          });

          if (contact) {
            contactId = contact.contactId;
            console.log('✅ Background: Found existing contact by phone number:', { 
              contactId: contact.contactId, 
              name: `${contact.firstName} ${contact.lastName}`,
              phone: contact.phone,
              attemptCount: contact.attemptCount
            });

            // Update attempt count and last attempt timestamp
            contact = await prisma.contact.update({
              where: { contactId: contact.contactId },
              data: {
                attemptCount: contact.attemptCount + 1,
                lastAttempt: new Date(),
                lastAgentId: agentId,
                updatedAt: new Date()
              }
            });
          } else {
            console.log('📝 Background: No existing contact found, creating new manual dial contact');
            contactId = `contact-${Date.now()}`;
            
            const nameParts = contactName ? contactName.split(' ') : ['Unknown', 'Contact'];
            
            contact = await prisma.contact.create({
              data: {
                contactId: contactId,
                listId: listId,
                firstName: nameParts[0] || 'Unknown',
                lastName: nameParts.slice(1).join(' ') || 'Contact',
                phone: formattedTo,
                status: 'new',
                attemptCount: 1,
                lastAttempt: new Date(),
                lastAgentId: agentId
              }
            });
            console.log('✅ Background: Created new contact:', contact.contactId);
          }
        }

        // End any active calls for this agent (background cleanup)
        console.log(`🔄 Background: Checking and ending any active calls for agent ${agentId}...`);
        const endedCallsCount = await endAnyActiveCallsForAgent(agentId);
        
        if (endedCallsCount > 0) {
          console.log(`⚠️ Background: Ended ${endedCallsCount} active call(s) for agent ${agentId}`);
        }

        // Create/update call record with proper data
        console.log('📊 Background: Creating call record with proper data');
        
        try {
          const callRecord = await prisma.callRecord.create({
            data: {
              callId: conferenceId,
              agentId: agentId,
              contactId: contactId,
              campaignId: finalCampaignId,
              phoneNumber: formattedTo,
              dialedNumber: formattedTo,
              callType: 'outbound',
              startTime: new Date(),
              recording: callResult.sid // Store Twilio SID for recording lookup
            }
          });
          
          console.log('✅ Background: Created call record:', callRecord.callId);
        } catch (callRecordError) {
          console.error('❌ Background: Error creating call record:', callRecordError);
          
          // Try to update existing record if it exists
          try {
            await prisma.callRecord.update({
              where: { callId: conferenceId },
              data: { 
                agentId: agentId,
                contactId: contactId,
                campaignId: finalCampaignId,
                recording: callResult.sid
              }
            });
            console.log('✅ Background: Updated existing call record');
          } catch (updateError) {
            console.error('❌ Background: Could not create or update call record:', updateError);
          }
        }

        console.log('✅ Background operations completed successfully for call', callResult.sid);
        
      } catch (backgroundError) {
        console.error('❌ Background operations failed for call', callResult.sid, ':', backgroundError);
        // Background failures don't affect the call itself
      }
    });

  } catch (error: any) {
    console.error('❌ Error making REST API call:', error);

    // Provide specific actionable error messages for known Twilio errors
    let userMessage = error.message || 'Failed to initiate call';
    let errorCode = error.code;

    if (error.code === 21216) {
      userMessage = `Geographic permission denied for ${error.message?.match(/\+\d+/)?.[0] || 'this number'}. ` +
        `Please enable Geographic Permissions in your Twilio Console: ` +
        `Voice → Settings → Geo Permissions. ` +
        `If already enabled, the destination number may be in a restricted range (premium rate, non-standard area code).`;
    } else if (error.code === 21211) {
      userMessage = 'Invalid phone number format. Please check the number and try again.';
    } else if (error.code === 21214) {
      userMessage = 'The destination number cannot receive calls. Please verify the number.';
    } else if (error.code === 20003) {
      userMessage = 'Twilio authentication failed. Please check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in environment variables.';
    }

    res.status(500).json({
      success: false,
      error: userMessage,
      twilioCode: errorCode || null
    });
  }
};

/**
 * GET /api/calls/:callSid/recordings
 * Get recordings for a call
 */
export const getRecordings = async (req: Request, res: Response) => {
  try {
    const { callSid } = req.params;

    const recordings = await twilioService.getCallRecordings(callSid);

    res.json({
      success: true,
      data: recordings,
    });
  } catch (error: any) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch recordings',
    });
  }
};
