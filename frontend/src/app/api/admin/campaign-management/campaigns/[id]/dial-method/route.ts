import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    console.log(`📞 Frontend: Proxying dial method update for campaign ${params.id} to backend`);
    
    // Proxy to backend
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/dial-method`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Backend dial method update failed: ${response.status}`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log(`✅ Campaign ${params.id} dial method updated successfully via backend`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying dial method update:', error);
    return NextResponse.json(
      { error: 'Failed to update dial method' },
      { status: 500 }
    );
  }
}