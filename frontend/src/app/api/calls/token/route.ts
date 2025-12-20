/**
 * Twilio Token API Proxy
 * Proxies token requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Proxying token request to backend...');
    
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/calls/token`, {
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
      console.error('❌ Backend token request failed:', response.status);
      return NextResponse.json(
        { success: false, error: 'Backend token request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Token request proxied successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying token request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to proxy token request' },
      { status: 500 }
    );
  }
}