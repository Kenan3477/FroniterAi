import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { dialMethod } = await request.json();
    
    console.log(`📞 Frontend: Simulating campaign ${params.id} dial method update to ${dialMethod}`);
    
    // Simulate successful response
    const mockResponse = {
      success: true,
      data: {
        id: params.id,
        dialMethod,
        message: `Dial method updated to ${dialMethod.replace('_', ' ').toLowerCase()}`
      }
    };
    
    console.log(`✅ Campaign ${params.id} dial method simulated as ${dialMethod}`);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Error simulating dial method update:', error);
    return NextResponse.json(
      { error: 'Failed to update dial method' },
      { status: 500 }
    );
  }
}