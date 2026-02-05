import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/slas?${searchParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend SLAs request failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch SLAs' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in SLAs API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/slas`;

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
      console.error('❌ Backend SLA creation failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to create SLA' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in SLA creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/slas`;

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
      console.error('❌ Backend SLA update failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to update SLA' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in SLA update API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const DELETE = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'SLA ID required' }, { status: 400 });
    }

    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/slas/${id}`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend SLA deletion failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to delete SLA' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in SLA deletion API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});