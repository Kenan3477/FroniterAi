import { NextRequest, NextResponse } from 'next/server';
import { recordCallOutcome } from '@/services/callOutcomeService';
import { recordCallKPI } from '@/services/kpiTrackingService';

/**
 * POST /api/agents/call-outcome
 * Record call outcome and disposition with KPI tracking
 */
export async function POST(request: NextRequest) {
  try {
    const {
      callId,
      contactId,
      agentId,
      campaignId,
      outcome,
      notes,
      duration
    } = await request.json();

    console.log(`📋 Recording call outcome: ${outcome} for call ${callId}`);

    // Validate required fields
    if (!callId || !contactId || !agentId || !outcome) {
      return NextResponse.json(
        { error: 'Missing required fields: callId, contactId, agentId, outcome' },
        { status: 400 }
      );
    }

    // Record the call outcome
    await recordCallOutcome(callId, {
      contactId,
      agentId,
      campaignId,
      outcome,
      notes,
      duration
    });

    // Determine disposition category for KPI tracking
    const getDispositionCategory = (disposition: string): 'positive' | 'neutral' | 'negative' => {
      const positive = ['aged product', 'field payment save', 'live work', 'save', 'upload', 'sale made', 'appointment booked', 'interest shown', 'information sent'];
      const negative = ['cancelled', 'do not call', 'not cover and not interested', 'not interested - ni', 'wrong number', 'deceased', 'hostile/rude'];
      
      const lowerDisposition = disposition.toLowerCase();
      if (positive.some(p => lowerDisposition.includes(p))) return 'positive';
      if (negative.some(n => lowerDisposition.includes(n))) return 'negative';
      return 'neutral';
    };

    // Record KPI data
    const callDate = new Date();
    await recordCallKPI({
      campaignId,
      agentId,
      contactId,
      callId,
      disposition: outcome,
      dispositionCategory: getDispositionCategory(outcome),
      callDuration: duration || 0,
      callDate,
      hourOfDay: callDate.getHours(),
      dayOfWeek: callDate.getDay(),
      outcome,
      notes
    });

    console.log(`✅ Call outcome and KPI data recorded: ${outcome}`);

    return NextResponse.json({
      success: true,
      message: 'Call outcome recorded successfully',
      outcome,
      callId
    });

  } catch (error) {
    console.error('❌ Error recording call outcome:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to record call outcome',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}