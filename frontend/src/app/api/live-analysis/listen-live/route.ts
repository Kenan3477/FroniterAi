import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getBearer(request: NextRequest): string | null {
  const h = request.headers.get('authorization');
  if (h?.startsWith('Bearer ')) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  return (
    request.cookies.get('session_token')?.value ||
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('auth_token')?.value ||
    request.cookies.get('authToken')?.value ||
    request.cookies.get('omnivox_token')?.value ||
    null
  );
}

export async function POST(request: NextRequest) {
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
        { status: 503 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const res = await fetch(`${backendBase}/api/live-analysis/listen-live`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid response from backend', details: text.slice(0, 200) },
        { status: 502 },
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error('listen-live proxy error:', e);
    return NextResponse.json({ success: false, error: 'Proxy failed' }, { status: 500 });
  }
}
