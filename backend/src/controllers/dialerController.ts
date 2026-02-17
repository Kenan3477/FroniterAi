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

// Phone number formatting utility
const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle UK numbers
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    // UK number starting with 0, convert to +44
    cleaned = '44' + cleaned.substring(1);
  } else if (cleaned.startsWith('44') && cleaned.length === 12) {
    // Already in UK format without +
    // Keep as is
  } else if (cleaned.startsWith('1') && cleaned.length === 11) {
    // US/Canada number, keep as is
  } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
    // Assume US number without country code
    cleaned = '1' + cleaned;
  }
  
  // Add + prefix if not present
  return '+' + cleaned;
};

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
 */
export const generateCustomerToAgentTwiML = async (req: Request, res: Response) => {
  try {
    console.log('📞 Customer-to-Agent TwiML request - connecting customer directly to agent browser');

    const twiml = twilioService.generateCustomerToAgentTwiML();
    
    console.log('✅ Customer-to-Agent TwiML generated');
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
      
      // Find call record by Twilio SID and update it
      try {
        const callRecord = await prisma.callRecord.findFirst({
          where: { recording: CallSid }
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
    const { to, contactId: existingContactId, contactName, existingContact } = req.body;
    
    console.log('📞 Making REST API call - original number:', { to, existingContactId, contactName, existingContact });

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Customer phone number (to) is required'
      });
    }

    // Format phone number to international format
    const formattedTo = formatPhoneNumber(to);
    console.log('📞 Formatted phone number:', { original: to, formatted: formattedTo });

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    // Generate unique conference name for this call
    const conferenceId = `conf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🎯 Creating conference call:', conferenceId);

    // Ensure manual dial campaign exists
    const campaignId = 'manual-dial';
    let campaign = await prisma.campaign.findUnique({
      where: { campaignId: campaignId }
    });

    if (!campaign) {
      console.log('🔧 Creating manual dial campaign...');
      campaign = await prisma.campaign.create({
        data: {
          campaignId: campaignId,
          name: 'Manual Dial Campaign',
          dialMethod: 'Manual',
          status: 'Active'
        }
      });
      console.log('✅ Created campaign:', campaign.campaignId);
    }

    // Ensure manual dial list exists
    const listId = 'manual-dial-list';
    let dataList = await prisma.dataList.findUnique({
      where: { listId: listId }
    });

    if (!dataList) {
      console.log('🔧 Creating manual dial list...');
      dataList = await prisma.dataList.create({
        data: {
          listId: listId,
          name: 'Manual Dial List',
          campaignId: campaignId,
          active: true
        }
      });
      console.log('✅ Created list:', dataList.listId);
    }

    // Handle contact creation/lookup
    let contactId: string;
    let contact: any;

    if (existingContact && existingContactId) {
      // Use existing contact from the database
      console.log('🔍 Using existing contact:', existingContactId);
      contact = await prisma.contact.findUnique({
        where: { contactId: existingContactId }
      });
      
      if (contact) {
        contactId = contact.contactId;
        console.log('✅ Found existing contact:', { contactId: contact.contactId, name: `${contact.firstName} ${contact.lastName}` });
      } else {
        // Fallback: create contact with provided information
        console.log('⚠️ Contact not found in database, creating with provided info');
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
        console.log('✅ Created contact with provided info:', contact.contactId);
      }
    } else {
      // FIXED: Search for existing contact by phone number before creating new one
      console.log('🔍 Searching for existing contact by phone number:', formattedTo);
      
      // Try to find existing contact with this phone number
      contact = await prisma.contact.findFirst({
        where: {
          OR: [
            { phone: formattedTo },
            { phone: to }, // Also check original format
            { mobile: formattedTo },
            { mobile: to },
            { workPhone: formattedTo },
            { workPhone: to },
            { homePhone: formattedTo },
            { homePhone: to }
          ]
        },
        orderBy: {
          updatedAt: 'desc' // Get most recently updated contact if multiple matches
        }
      });

      if (contact) {
        // Found existing contact - use it and increment attempt count
        contactId = contact.contactId;
        console.log('✅ Found existing contact by phone number:', { 
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
            lastAgentId: null, // Will be set when agent is assigned
            updatedAt: new Date()
          }
        });
      } else {
        // No existing contact found - create new one
        console.log('📝 No existing contact found, creating new manual dial contact');
        contactId = `contact-${Date.now()}`;
        const nameParts = contactName ? contactName.split(' ') : ['Manual', 'Dial'];
        
        contact = await prisma.contact.create({
          data: {
            contactId: contactId,
            listId: listId, // Use created list ID
            firstName: nameParts[0] || 'Manual',
            lastName: nameParts.slice(1).join(' ') || 'Dial',
            phone: formattedTo,
            status: 'new',
            attemptCount: 1,
            lastAttempt: new Date()
          }
        });
        console.log('✅ Created new contact:', contact.contactId);
      }
    }

    // Start call record in database
    const callRecord = await prisma.callRecord.create({
      data: {
        callId: conferenceId,
        agentId: null, // FIXED: Always use null to avoid foreign key issues
        contactId: contactId, // Use created contact ID
        campaignId: campaignId, // Use existing/created campaign ID
        phoneNumber: formattedTo,
        dialedNumber: formattedTo,
        callType: 'outbound',
        startTime: new Date()
      }
    });

    // Call the customer and connect them directly to the WebRTC agent
    const twimlUrl = `${process.env.BACKEND_URL}/api/calls/twiml-customer-to-agent`;
    
    const callResult = await twilioClient.calls.create({
      to: formattedTo,
      from: fromNumber,
      url: twimlUrl,
      method: 'POST',
      statusCallback: `${process.env.BACKEND_URL}/api/calls/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
      // Recording is handled in TwiML
    });

    console.log('✅ Customer call initiated - Direct agent connection');
    console.log('✅ Twilio Call SID:', callResult.sid);

    // Update call record with Twilio call SID
    await prisma.callRecord.update({
      where: { callId: conferenceId },
      data: { 
        recording: callResult.sid // Store Twilio SID for recording lookup
      }
    });

    res.json({
      success: true,
      callSid: callResult.sid,
      conferenceId: conferenceId,
      status: callResult.status,
      message: 'Direct agent call initiated - Customer will be connected to agent browser'
    });

  } catch (error: any) {
    console.error('❌ Error making REST API call:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate call'
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
