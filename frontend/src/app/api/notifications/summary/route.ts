import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireAuth(async (request, user) => {
  try {
    const authToken = request.cookies.get('session_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({
        success: true,
        data: { notifications: [], summary: { total: 0, unread: 0, byType: { system: 0, callback: 0, missed_call: 0 }, highPriority: 0 } }
      });
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/summary`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch (err) {
      console.error('Backend unavailable:', err);
    }

    return NextResponse.json({
      success: true,
      data: { notifications: [], summary: { total: 0, unread: 0, byType: { system: 0, callback: 0, missed_call: 0 }, highPriority: 0 } }
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: { notifications: [], summary: { total: 0, unread: 0, byType: { system: 0, callback: 0, missed_call: 0 }, highPriority: 0 } }
    });
  }
});
