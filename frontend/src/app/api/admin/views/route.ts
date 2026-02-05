import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/views?${searchParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend Views request failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch views' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in Views API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const POST = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/views`;

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
      console.error('❌ Backend View creation failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to create view' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in View creation API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

export const PUT = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/views`;

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
      console.error('❌ Backend View update failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to update view' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in View update API:', error);
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
      return NextResponse.json({ error: 'View ID required' }, { status: 400 });
    }

    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/views/${id}`;

    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend View deletion failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to delete view' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in View deletion API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});