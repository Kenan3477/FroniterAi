/**
 * IP Whitelist DELETE API - Backend Proxy
 * Proxies DELETE requests to backend PostgreSQL database
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

function getBearerForBackend(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const t = authHeader.slice(7).trim();
    if (t) return t;
  }
  const c = cookies();
  return (
    c.get('session_token')?.value ||
    c.get('auth-token')?.value ||
    c.get('auth_token')?.value ||
    c.get('authToken')?.value ||
    c.get('omnivox_token')?.value ||
    null
  );
}

// DELETE - Remove IP from whitelist (proxied to backend)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ ipAddress: string }> }
) {
  try {
    const { ipAddress } = await context.params;
    console.log(`🔒 IP Whitelist DELETE request for ${ipAddress} - proxying to backend database`);

    const sessionToken = getBearerForBackend(request);

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Proxy request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist/${encodeURIComponent(ipAddress)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    const raw = await backendResponse.text();
    let data: any;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid response from backend', details: raw.slice(0, 200) },
        { status: 502 }
      );
    }

    if (!backendResponse.ok) {
      console.error('❌ Backend IP delete failed:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to remove IP from whitelist' },
        { status: backendResponse.status }
      );
    }

    console.log('✅ IP removed from backend database whitelist');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ IP Whitelist DELETE proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove IP from whitelist' },
      { status: 500 }
    );
  }
}
