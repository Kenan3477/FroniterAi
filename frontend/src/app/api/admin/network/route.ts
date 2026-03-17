import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/network?${searchParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend Network request failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch network settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in Network API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/network`;

    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('❌ Backend Network update failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to update network settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in Network update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'test-connection') {
      const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/network/test`;
      
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer demo-token`,
          'User-ID': user.userId.toString(),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error('❌ Backend Network test failed:', response.status, response.statusText);
        return NextResponse.json(
          { error: 'Failed to test network connection' },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in Network action API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});