import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { dialMethod } = await request.json();
    
    console.log(`📞 Frontend API: Updating campaign ${params.id} dial method to ${dialMethod}`);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/dial-method`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dialMethod }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Backend dial method update failed for ${params.id}:`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log(`✅ Campaign ${params.id} dial method updated to ${dialMethod}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error updating dial method:', error);
    return NextResponse.json(
      { error: 'Failed to update dial method' },
      { status: 500 }
    );
  }
}