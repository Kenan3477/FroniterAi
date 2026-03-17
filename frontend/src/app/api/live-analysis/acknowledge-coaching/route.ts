import { NextRequest, NextResponse } from 'next/server';

/**
 * Acknowledge a coaching recommendation
 * POST /api/live-analysis/acknowledge-coaching
 */
export async function POST(request: NextRequest) {
  try {
    const { callId, recommendationId } = await request.json();

    if (!callId || !recommendationId) {
      return NextResponse.json(
        { error: 'Missing callId or recommendationId' },
        { status: 400 }
      );
    }

    // Forward to backend
    const backendResponse = await fetch(`${process.env.BACKEND_URL}/api/live-analysis/acknowledge-coaching`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
      },
      body: JSON.stringify({
        callId,
        recommendationId
      })
    });

    if (!backendResponse.ok) {
      throw new Error('Backend request failed');
    }

    const result = await backendResponse.json();

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error acknowledging coaching recommendation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}