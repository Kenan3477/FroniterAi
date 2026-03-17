import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { requireRole } from '@/middleware/auth';


const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    console.log('🔧 Fetching business settings from Railway backend...');
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/admin/business-settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
    });

    if (!response.ok) {
      console.error('❌ Backend business settings request failed:', response.status, response.statusText);
      return NextResponse.json({ 
        settings: {
          general: {},
          telephony: {},
          security: {},
          compliance: {},
          integration: {}
        }
      });
    }

    const data = await response.json();
    console.log('✅ Business settings fetched successfully');
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error fetching business settings:', error);
    return NextResponse.json({ 
      settings: {
        general: {},
        telephony: {},
        security: {},
        compliance: {},
        integration: {}
      }
    });
  }
});

export const PUT = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    
    const response = await fetch(`${RAILWAY_BACKEND_URL}/api/admin/business-settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer demo-token`,
        'User-ID': user.userId.toString(),
      },
      body: JSON.stringify({
        ...body,
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
    console.error('❌ Error updating business settings:', error);
    return NextResponse.json(
      { error: 'Failed to update business settings' },
      { status: 500 }
    );
  }
});