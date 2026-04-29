import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBearer(request: NextRequest): string | null {
  const h = request.headers.get('authorization');
  if (h?.startsWith('Bearer ')) return h.substring(7);
  return (
    request.cookies.get('session_token')?.value ||
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('authToken')?.value ||
    null
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearer(request);
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
        { status: 503 }
      );
    }

    const res = await fetch(`${backendBase}/api/dashboard/active-calls`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const body = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    console.error('active-calls proxy error:', e);
    return NextResponse.json({ success: false, error: 'Proxy failed' }, { status: 500 });
  }
}
