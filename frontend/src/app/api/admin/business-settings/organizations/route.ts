import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    console.log('📊 Fetching organizations from Railway backend...');
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/admin/business-settings/organizations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend organizations request failed:', response.status, response.statusText);
      return NextResponse.json({ data: [] });
    }

    const data = await response.json();
    console.log('✅ Organizations fetched successfully');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    return NextResponse.json({ data: [] });
  }
});

export const POST = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/admin/business-settings/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
      body: JSON.stringify({
        ...body,
        createdBy: user.userId,
        timestamp: new Date().toISOString()
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
});

export const PUT = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/admin/business-settings/organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
      body: JSON.stringify({
        ...updateData,
        updatedBy: user.userId,
        timestamp: new Date().toISOString()
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error updating organization:', error);
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
});

export const DELETE = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/admin/business-settings/organizations/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
});
