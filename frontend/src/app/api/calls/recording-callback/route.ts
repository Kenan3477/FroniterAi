import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Twilio Recording Status Callback
 * POST /api/calls/recording-callback
 * Handles recording completion webhooks from Twilio
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
    
    console.log('📼 Recording callback received:', JSON.stringify(body, null, 2));
    
    const {
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
      RecordingStatus
    } = body;

    // Validate required fields
    if (!CallSid || !RecordingSid || !RecordingUrl) {
      console.error('❌ Missing required recording fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400, headers }
      );
    }

    // Only process completed recordings
    if (RecordingStatus !== 'completed') {
      console.log(`⚠️ Recording ${RecordingSid} status: ${RecordingStatus}`);
      return NextResponse.json(
        { success: true, message: 'Recording not completed yet' },
        { headers }
      );
    }

    try {
      // Find existing interaction by searching for the call
      const interactions = await (db as any).interaction.findMany({
        where: {
          OR: [
            { result: { contains: CallSid } },
            { agentId: { contains: 'agent' } }
          ]
        },
        orderBy: { endedAt: 'desc' },
        take: 5
      });

      let targetInteraction = null;
      
      // Try to match by timing - recording should be for recent calls
      const recentTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      for (const interaction of interactions) {
        if (interaction.endedAt && interaction.endedAt > recentTime) {
          targetInteraction = interaction;
          break;
        }
      }

      if (!targetInteraction && interactions.length > 0) {
        // Fall back to most recent interaction
        targetInteraction = interactions[0];
      }

      if (targetInteraction) {
        // Update the interaction with recording info
        const updatedInteraction = await (db as any).interaction.update({
          where: { id: targetInteraction.id },
          data: {
            result: targetInteraction.result 
              ? `${targetInteraction.result} | Recording: ${RecordingUrl}` 
              : `Recording: ${RecordingUrl}`
          }
        });

        console.log('✅ Interaction updated with recording:', updatedInteraction.id);
      } else {
        console.log('⚠️ No matching interaction found, creating placeholder');
        
        // Create a new interaction record for the recording
        const newInteraction = await (db as any).interaction.create({
          data: {
            agentId: 'system',
            contactId: 'RECORDING',
            campaignId: 'system-recording',
            channel: 'voice',
            outcome: 'recorded',
            startedAt: new Date(Date.now() - parseInt(RecordingDuration) * 1000),
            endedAt: new Date(),
            durationSeconds: parseInt(RecordingDuration) || 0,
            result: `Call Recording - Twilio CallSid: ${CallSid} | Recording: ${RecordingUrl}`,
            isDmc: false
          }
        });

        console.log('✅ New interaction created for recording:', newInteraction.id);
      }

      return NextResponse.json({
        success: true,
        message: 'Recording processed successfully',
        recordingSid: RecordingSid,
        recordingUrl: RecordingUrl
      }, { headers });

    } catch (dbError) {
      console.error('❌ Database error processing recording:', dbError);
      
      return NextResponse.json({
        success: false,
        error: 'Database operation failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500, headers });
    }

  } catch (error) {
    console.error('❌ Recording callback error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers });
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