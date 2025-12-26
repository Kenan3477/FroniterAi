import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🚀 Frontend: Simulating auto-dial start for campaign ${params.id}`);
    
    // Simulate successful response
    const mockResponse = {
      success: true,
      data: {
        id: params.id,
        queuedContacts: Math.floor(Math.random() * 100) + 50, // Random number for demo
        message: 'Auto-dial started successfully'
      }
    };
    
    console.log(`✅ Auto-dial simulated for campaign ${params.id}`);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Error simulating auto-dial start:', error);
    return NextResponse.json(
      { error: 'Failed to start auto-dial' },
      { status: 500 }
    );
  }
}