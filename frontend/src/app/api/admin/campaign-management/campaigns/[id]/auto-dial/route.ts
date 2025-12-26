import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🚀 Frontend API: Starting auto-dial for campaign ${params.id}`);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/auto-dial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Backend auto-dial start failed for ${params.id}:`, data);
      return NextResponse.json(data, { status: response.status });
    }
    
    console.log(`✅ Auto-dial started for campaign ${params.id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error starting auto-dial:', error);
    return NextResponse.json(
      { error: 'Failed to start auto-dial' },
      { status: 500 }
    );
  }
}