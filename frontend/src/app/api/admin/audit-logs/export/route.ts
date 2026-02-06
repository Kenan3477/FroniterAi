import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { requireRole } from '@/middleware/auth';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN'])(async (request, user) => {
  try {
    // Forward the query parameters to the backend
    const { searchParams } = new URL(request.url);
    const backendUrl = `${RAILWAY_BACKEND_URL}/api/admin/audit-logs/export?${searchParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend audit export request failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to export audit logs' },
        { status: response.status }
      );
    }

    // For file downloads, we need to stream the response
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = response.headers.get('content-disposition') || 'attachment; filename="audit-logs.csv"';

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    });

  } catch (error) {
    console.error('❌ Error in audit export API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});