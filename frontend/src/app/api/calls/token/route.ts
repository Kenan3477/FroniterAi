/**
 * Twilio Token API Proxy
 * Proxies token requests to the Railway backend with the same auth resolution
 * as other server routes (Bearer header or session cookies).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBearerFromNextRequest } from '@/lib/serverAuthBearer';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Proxying token request to backend...');

    const body = await request.json();
    const bearer = getBearerFromNextRequest(request);

    const response = await fetch(`${BACKEND_URL}/api/calls/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: 'Backend returned non-JSON', details: text?.slice(0, 500) },
        { status: response.status || 502 },
      );
    }

    if (!response.ok) {
      console.error('❌ Backend token request failed:', response.status, data);
    } else {
      console.log('✅ Token request proxied successfully');
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Error proxying token request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to proxy token request' },
      { status: 500 },
    );
  }
}
