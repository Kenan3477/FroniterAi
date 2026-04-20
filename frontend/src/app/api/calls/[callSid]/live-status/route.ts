/**
 * Live Call Status Proxy
 * Lightweight endpoint polled by the dialler UI to show real-time call status.
 * Proxies to the backend which fetches from Twilio.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { callSid: string } }
) {
  try {
    const { callSid } = params;

    const response = await fetch(
      `${BACKEND_URL}/api/dialer/${callSid}/live-status`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.get('authorization') && {
            authorization: request.headers.get('authorization')!,
          }),
        },
        // No cache — we always want fresh status
        cache: 'no-store',
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, status: 'unknown', error: error.message });
  }
}
