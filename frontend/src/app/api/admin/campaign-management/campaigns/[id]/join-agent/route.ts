import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`👤 Frontend: Simulating agent join for campaign ${params.id}`);
    
    // Simulate successful response
    const mockResponse = {
      success: true,
      data: {
        campaignId: params.id,
        agentId: 'agent_demo',
        message: 'Agent successfully joined campaign'
      }
    };
    
    console.log(`✅ Agent join simulated for campaign ${params.id}`);
    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('❌ Error simulating agent join:', error);
    return NextResponse.json(
      { error: 'Failed to join agent to campaign' },
      { status: 500 }
    );
  }
}