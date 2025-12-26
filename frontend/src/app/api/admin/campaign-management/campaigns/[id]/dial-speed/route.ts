import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { dialSpeed } = await request.json();
    
    // Validate dial speed is within allowed range (1-4)
    if (dialSpeed < 1 || dialSpeed > 4) {
      return NextResponse.json(
        { error: 'Dial speed must be between 1 and 4 to prevent overdialing' },
        { status: 400 }
      );
    }
    
    console.log(`🎛️ Frontend API: Updating campaign ${params.id} dial speed to ${dialSpeed}`);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/dial-speed`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dialSpeed }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Backend dial speed update failed for ${params.id}:`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log(`✅ Campaign ${params.id} dial speed updated to ${dialSpeed}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error updating dial speed:', error);
    return NextResponse.json(
      { error: 'Failed to update dial speed' },
      { status: 500 }
    );
  }
}