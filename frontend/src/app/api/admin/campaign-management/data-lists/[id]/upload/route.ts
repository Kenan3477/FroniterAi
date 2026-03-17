import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`📋 Proxying upload contacts request for data list ID: ${params.id}`);

    const body = await request.json();
    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/data-lists/${params.id}/upload`;
    
    // Get auth token from cookies or headers
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get('auth-token')?.value;
    const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const authToken = tokenFromHeader || tokenFromCookie;

    console.log('🔐 Auth token found for UPLOAD:', authToken ? 'YES' : 'NO');
    
    // Forward the request to the Railway backend
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use token from cookie if no authorization header present
        ...(authToken && {
          'Authorization': `Bearer ${authToken}`
        }),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully uploaded contacts to data list via backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying upload contacts request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload contacts to data list', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}