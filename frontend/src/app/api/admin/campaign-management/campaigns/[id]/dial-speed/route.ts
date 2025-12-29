import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { dialSpeed } = await request.json();
    
    // Validate dial speed is within allowed range (1-4 CPM per agent)
    if (dialSpeed < 1 || dialSpeed > 4) {
      return NextResponse.json(
        { error: 'Dial speed must be between 1 and 4 CPM per agent' },
        { status: 400 }
      );
    }
    
    console.log(`🎛️ Frontend: Simulating campaign ${params.id} dial speed update to ${dialSpeed} CPM`);
    
    // Simulate successful response
    const mockResponse = {
      success: true,
      data: {
        id: params.id,
        dialSpeed,
        message: `Dial speed updated to ${dialSpeed} CPM per agent`
      }
    };
    
    console.log(`✅ Campaign ${params.id} dial speed simulated as ${dialSpeed} CPM`);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Error simulating dial speed update:', error);
    return NextResponse.json(
      { error: 'Failed to update dial speed' },
      { status: 500 }
    );
  }
}