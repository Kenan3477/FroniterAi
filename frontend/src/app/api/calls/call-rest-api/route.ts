/**
 * REST API Call Proxy
 * Proxies call requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

// Use environment variable for backend URL - FIXED: No hardcoded URLs
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('📞 Proxying REST API call request to backend...');
    
    const body = await request.json();
    console.log('📞 Call request body:', body);

    // 🚨 CRITICAL FIX: Backend route is /api/calls/rest-api (not /call-rest-api)
    const response = await fetch(`${BACKEND_URL}/api/calls/rest-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization')!
        })
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('❌ Backend call request failed:', response.status);
      const errorText = await response.text();
      console.error('❌ Error details:', errorText);
      return NextResponse.json(
        { success: false, error: 'Backend call request failed', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ REST API call request proxied successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying call request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to proxy call request' },
      { status: 500 }
    );
  }
}