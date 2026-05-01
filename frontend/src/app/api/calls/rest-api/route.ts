import { NextRequest, NextResponse } from 'next/server';
import { getBearerFromNextRequest } from '@/lib/serverAuthBearer';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Proxying REST API call to backend...');
    
    const body = await request.json();
    const bearer = getBearerFromNextRequest(request);
    
    const response = await fetch(`${BACKEND_URL}/api/calls/rest-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ REST API call proxied successfully');
    } else {
      console.log('❌ Backend REST API call failed:', data.error);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error proxying REST API call:', error);
    return NextResponse.json(
      { success: false, error: 'Proxy error' },
      { status: 500 }
    );
  }
}