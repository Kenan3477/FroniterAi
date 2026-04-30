import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

function getBearer(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return (
    request.cookies.get('omnivox_token')?.value ||
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('auth_token')?.value ||
    request.cookies.get('session_token')?.value ||
    request.cookies.get('access-token')?.value ||
    request.cookies.get('token')?.value ||
    undefined
  );
}

export async function POST(request: NextRequest) {
  try {
    const token = getBearer(request);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      );
    }

    const backendUrl = `${BACKEND_URL}/api/call-records/sync-recordings`;
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { success: false, error: text || 'Invalid backend response' };
    }

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error('Error proxying sync-recordings:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync recordings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
