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

    const response = await fetch(`${BACKEND_URL.replace(/\/+$/, '')}/api/dialer/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error ending call:', error);
    return NextResponse.json(
      { error: 'Failed to end call' },
      { status: 500 }
    );
  }
}