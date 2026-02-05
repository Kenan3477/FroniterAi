import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/middleware/auth';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN'])(async (request, user) => {
  try {
    // Forward the query parameters to the backend
    const { searchParams } = new URL(request.url);
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/audit-logs?${searchParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend audit logs request failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error in audit logs API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});