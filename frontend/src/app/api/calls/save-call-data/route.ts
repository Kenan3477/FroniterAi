import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Save Call Data API
 * POST /api/calls/save-call-data
 * Saves customer info and call disposition after call ends
 * Public endpoint for Twilio webhooks
 */
export async function POST(request: NextRequest) {
  // Allow CORS and bypass authentication for Twilio webhooks
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-Vercel-Protection-Bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET || 'dev-bypass'
  });

  try {
    const body = await request.json();
    const {
      phoneNumber,
      customerInfo,
      disposition,
      callDuration,
      agentId,
      campaignId
    } = body;

    console.log('💾 Saving call data for:', phoneNumber);
    console.log('💾 Request body:', JSON.stringify(body, null, 2));

    // Validate required fields with safe defaults
    const safePhoneNumber = phoneNumber || 'unknown';
    const safeAgentId = agentId || 'agent-browser';
    const safeCampaignId = campaignId || 'manual-dial';
    const safeDuration = parseInt(callDuration) || 0;

    try {
      // Find or create contact with better error handling
      let contact = null;
      
      if (safePhoneNumber && safePhoneNumber !== 'unknown') {
        contact = await (db as any).contact.findFirst({
          where: {
            OR: [
              { phone: safePhoneNumber },
              { phone: safePhoneNumber.replace(/\s+/g, '') },
              { mobile: safePhoneNumber },
              { mobile: safePhoneNumber.replace(/\s+/g, '') }
            ]
          }
        });
      }

      if (!contact && customerInfo) {
        // Create new contact with safe field handling
        try {
          contact = await (db as any).contact.create({
            data: {
              contactId: `CONT-${Date.now()}`,
              listId: 'manual-dial-list', // Required field
              firstName: customerInfo.firstName || 'Unknown',  // Required field
              lastName: customerInfo.lastName || 'Contact',    // Required field
              phone: safePhoneNumber,
              email: customerInfo.email || null,
              company: null,
              notes: customerInfo.notes || null,
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          });
          console.log('✅ New contact created:', contact.contactId);
        } catch (contactError) {
          console.warn('⚠️ Contact creation failed, continuing without contact:', contactError);
        }
      } else if (contact && customerInfo) {
        // Update existing contact with safe field handling
        try {
          contact = await (db as any).contact.update({
            where: { contactId: contact.contactId },
            data: {
              firstName: customerInfo.firstName || contact.firstName,
              lastName: customerInfo.lastName || contact.lastName,
              email: customerInfo.email || contact.email,
              notes: customerInfo.notes || contact.notes,
              updatedAt: new Date()
            }
          });
          console.log('✅ Contact updated:', contact.contactId);
        } catch (updateError) {
          console.warn('⚠️ Contact update failed, continuing:', updateError);
        }
      }

      // Create interaction record with correct schema fields
      // For now, let's try to create a minimal interaction without foreign key constraints
      try {
        // First try to find if the agent exists
        const existingAgent = await (db as any).agent.findFirst({
          where: { agentId: safeAgentId }
        });
        
        // Try to find if campaign exists  
        const existingCampaign = await (db as any).campaign.findFirst({
          where: { campaignId: safeCampaignId }
        });
        
        console.log('🔍 Agent exists:', !!existingAgent, 'Campaign exists:', !!existingCampaign);
        
        // Use existing agent ID or create a default one
        const validAgentId = existingAgent?.agentId || 'system-agent';
        const validCampaignId = existingCampaign?.campaignId || 'manual-dial';
        const validContactId = contact?.contactId || 'UNKNOWN';
        
        const interaction = await (db as any).interaction.create({
          data: {
            agentId: validAgentId,
            contactId: validContactId,
            campaignId: validCampaignId,
            channel: 'voice',
            outcome: disposition?.outcome || 'unknown',
            startedAt: new Date(Date.now() - (safeDuration * 1000)),
            endedAt: new Date(),
            durationSeconds: safeDuration,
            result: disposition?.notes || null,
            isDmc: false
          }
        });

        console.log('✅ Interaction saved:', interaction.id);

        return NextResponse.json({
          success: true,
          contact,
          interaction
        }, { headers });
      } catch (interactionError) {
        console.error('❌ Interaction creation failed:', interactionError);
        console.error('❌ Error details:', {
          name: (interactionError as any)?.name,
          message: (interactionError as any)?.message,
          code: (interactionError as any)?.code,
          stack: (interactionError as any)?.stack
        });
        
        // Still return success if contact was saved
        return NextResponse.json({
          success: true,
          contact,
          interaction: null,
          warning: 'Call data saved but interaction record failed',
          error: (interactionError as any)?.message || 'Unknown interaction error'
        });
      }
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      console.error('❌ Database error details:', {
        name: (dbError as any)?.name,
        message: (dbError as any)?.message,
        code: (dbError as any)?.code,
        stack: (dbError as any)?.stack
      });
      
      // Return more specific error information
      return NextResponse.json(
        { 
          success: false,
          error: 'Database operation failed',
          details: (dbError as any)?.message || 'Unknown database error'
        },
        { status: 500, headers }
      );
    }
    
  } catch (error) {
    console.error('❌ Save call data error:', error);
    
    // Return detailed error for debugging
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
