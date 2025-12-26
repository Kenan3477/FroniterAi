import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isActive } = await request.json();
    
    console.log(`🔄 Frontend API: Toggling campaign ${params.id} activation to ${isActive}`);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/activate`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Backend activation failed for ${params.id}:`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log(`✅ Campaign ${params.id} activation updated to ${isActive}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error toggling campaign activation:', error);
    return NextResponse.json(
      { error: 'Failed to toggle campaign activation' },
      { status: 500 }
    );
  }
}