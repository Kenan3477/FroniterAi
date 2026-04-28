/**
 * REST API Call Proxy
 * Proxies call requests from the browser to the Railway backend.
 *
 * Important: this proxy must FORWARD the backend's response body and status
 * verbatim. Previously, any non-2xx response (e.g. a legitimate 409 "Agent
 * already has an active call", or a 500 with a Twilio error code) was being
 * replaced with a generic `{ error: "Backend call request failed" }`, which
 * hid the real reason from the user and from the dialer UI's error-handling
 * code (which inspects fields like `result.message`, `result.activeCall`,
 * and `result.twilioCode`).
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📞 Proxying REST API call request to backend:', {
      to: body?.to,
      campaignId: body?.campaignId,
      hasAuth: !!request.headers.get('authorization'),
    });

    // Backend route is /api/calls/rest-api
    const response = await fetch(`${BACKEND_URL}/api/calls/rest-api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          authorization: request.headers.get('authorization')!,
        }),
      },
      body: JSON.stringify(body),
    });

    // Try to parse the backend response as JSON. If it isn't JSON (e.g. an
    // upstream HTML 502 page), fall back to returning the raw text so the
    // caller still gets useful debugging information.
    const rawText = await response.text();
    let payload: any;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = {
        success: false,
        error: 'Backend returned non-JSON response',
        details: rawText?.slice(0, 2000),
      };
    }

    if (!response.ok) {
      console.error('❌ Backend call request returned non-OK:', {
        status: response.status,
        backendError: payload?.error,
        backendMessage: payload?.message,
        twilioCode: payload?.twilioCode,
      });
    } else {
      console.log('✅ REST API call request proxied successfully:', {
        callSid: payload?.callSid,
        conferenceId: payload?.conferenceId,
        status: payload?.status,
      });
    }

    // Forward the backend's status code and body verbatim so the UI sees the
    // real error (e.g. 409 active-call conflict with `activeCall` details, or
    // 500 with a `twilioCode` it can react to).
    return NextResponse.json(payload, { status: response.status });
  } catch (error: any) {
    console.error('❌ Error proxying call request:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reach call backend',
        details: error?.message || String(error),
      },
      { status: 502 },
    );
  }
}
