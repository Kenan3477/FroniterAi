/**
 * IP Whitelist Management API - Backend Proxy
 * Proxies requests to backend PostgreSQL database for IP whitelist management
 * Maintains single source of truth in backend database
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  // Fallback to request IP (may be from load balancer)
  return request.ip || '127.0.0.1';
}

// GET - List all whitelisted IPs (proxied to backend)
export async function GET(request: NextRequest) {
  try {
    console.log('🔒 IP Whitelist GET request - proxying to backend database');
    
    // Get session token from cookies
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Proxy request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('❌ Backend IP whitelist fetch failed:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to fetch IP whitelist from backend' },
        { status: backendResponse.status }
      );
    }

    console.log('✅ IP whitelist fetched from backend database');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ IP Whitelist GET proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch IP whitelist' },
      { status: 500 }
    );
  }
}

// POST - Add new IP to whitelist (proxied to backend)
export async function POST(request: NextRequest) {
  try {
    console.log('🔒 IP Whitelist POST request - proxying to backend database');
    
    // Get session token from cookies
    const cookieStore = cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Proxy request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/ip-whitelist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('❌ Backend IP add failed:', data);
      return NextResponse.json(
        { success: false, error: data.error || 'Failed to add IP to whitelist' },
        { status: backendResponse.status }
      );
    }

    console.log('✅ IP added to backend database whitelist');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ IP Whitelist POST proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add IP to whitelist' },
      { status: 500 }
    );
  }
}

// Export utility function for use by middleware
export { getClientIP };