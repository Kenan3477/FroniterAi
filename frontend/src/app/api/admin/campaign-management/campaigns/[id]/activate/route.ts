import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await request.json();
    
    console.log(`🔄 Frontend: Simulating campaign ${params.id} activation toggle to ${isActive}`);
    
    // Simulate successful response
    const mockResponse = {
      success: true,
      data: {
        id: params.id,
        isActive,
        status: isActive ? 'ACTIVE' : 'PAUSED',
        message: `Campaign ${isActive ? 'activated' : 'deactivated'} successfully`
      }
    };
    
    console.log(`✅ Campaign ${params.id} activation simulated as ${isActive}`);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Error simulating campaign activation:', error);
    return NextResponse.json(
      { error: 'Failed to toggle campaign activation' },
      { status: 500 }
    );
  }
}