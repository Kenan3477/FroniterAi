/**
 * REST API Calling Proxy
 * Proxies call requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function POST(request: NextRequest) {
  try {
    console.log('📞 Proxying REST API call request to backend...');
    
    const body = await request.json();
    console.log('📞 Call request body:', body);
    
    const response = await fetch(`${BACKEND_URL}/api/calls/call-rest-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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