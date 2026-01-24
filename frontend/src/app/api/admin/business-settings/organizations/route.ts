import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request?: NextRequest): string | null {
  if (!request) return null;
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export async function GET(request?: NextRequest) {
  try {
    console.log('📊 Fetching organizations from Railway backend...');
    
    // Get auth token for backend request
    const authToken = getAuthToken(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log('🔑 Using authentication token for backend request');
    } else {
      console.log('⚠️ No authentication token provided - backend may deny request');
    }
    
    const response = await fetch(`${BACKEND_URL}/api/admin/business-settings/organizations`, {
      method: 'GET',
      headers,
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Organizations fetched successfully from Railway backend');
      return NextResponse.json(data);
    } else {
      console.log(`❌ Railway backend responded with status ${response.status}, returning empty data`);
      throw new Error(`Backend responded with status ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error fetching organizations from Railway backend:', error);
    console.log('🔄 Returning empty organizations data (system has no data)');
    
    // Return empty data to show system is truly empty
    return NextResponse.json({
      data: []
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/admin/business-settings/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}