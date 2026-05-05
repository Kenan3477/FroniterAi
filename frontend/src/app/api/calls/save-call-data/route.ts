/**
 * Proxies disposition / call-wrap-up to the Railway backend `POST /api/calls/save-call-data`.
 *
 * The previous implementation wrote to a local Next.js Prisma DB and never updated
 * production CallRecords — dispositions appeared to fail and refresh showed odd state.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBearerFromNextRequest } from '@/lib/serverAuthBearer';

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const bearer =
      getBearerFromNextRequest(request) ||
      (typeof body?._clientBearer === 'string' ? body._clientBearer.trim() : undefined);
    if (body && typeof body === 'object' && '_clientBearer' in body) {
      delete (body as { _clientBearer?: string })._clientBearer;
    }

    const response = await fetch(`${BACKEND_URL.replace(/\/+$/, '')}/api/calls/save-call-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const rawText = await response.text();
    let payload: unknown;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch {
      payload = {
        success: false,
        error: 'Backend returned non-JSON response',
        details: rawText?.slice(0, 2000),
      };
    }

    return NextResponse.json(payload as object, { status: response.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ save-call-data proxy error:', message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reach call backend',
        details: message,
      },
      { status: 502 },
    );
  }
}
