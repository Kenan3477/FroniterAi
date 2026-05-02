import { NextRequest, NextResponse } from 'next/server';
import { getBearerFromNextRequest } from '@/lib/serverAuthBearer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = getBearerFromNextRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const backendBase = (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      ''
    ).replace(/\/$/, '');

    if (!backendBase) {
      return NextResponse.json(
        { success: false, error: 'BACKEND_URL is not configured' },
        { status: 503 },
      );
    }

    const res = await fetch(`${backendBase}/api/reports/voice/campaign/filters`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    console.error('voice campaign filters proxy error:', e);
    return NextResponse.json({ success: false, error: 'Proxy failed' }, { status: 500 });
  }
}
