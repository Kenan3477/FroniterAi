import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('📞 Proxying inbound numbers request to backend...');

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-numbers`;
    console.log('Backend URL:', backendUrl);

    // Forward the request to the Railway backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward any authorization headers from the original request
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        }),
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched inbound numbers from backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying inbound numbers request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound numbers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}