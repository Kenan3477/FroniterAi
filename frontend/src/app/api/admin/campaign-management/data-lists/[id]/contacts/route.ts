import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`👥 Proxying get contacts request for data list ID: ${params.id}`);

    // Get query parameters from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/data-lists/${params.id}/contacts${queryString ? `?${queryString}` : ''}`;
    
    console.log('Backend URL:', backendUrl);

    // Get auth token from cookies or headers
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get('auth-token')?.value;
    const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const authToken = tokenFromHeader || tokenFromCookie;

    console.log('🔐 Auth token found for contacts:', authToken ? 'YES' : 'NO');
    
    // Forward the request to the Railway backend
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Use token from cookie if no authorization header present
        ...(authToken && {
          'Authorization': `Bearer ${authToken}`
        }),
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched contacts from backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying get contacts request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log(`🗑️ Proxying delete contacts request for data list ID: ${params.id}`);

    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/data-lists/${params.id}/contacts`;
    console.log('Backend URL:', backendUrl);

    // Get auth token from cookies or headers
    const cookieStore = cookies();
    const tokenFromCookie = cookieStore.get('auth-token')?.value;
    const tokenFromHeader = request.headers.get('authorization')?.replace('Bearer ', '');
    const authToken = tokenFromHeader || tokenFromCookie;

    console.log('🔐 Auth token found for delete contacts:', authToken ? 'YES' : 'NO');
    
    // Forward the DELETE request to the Railway backend
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && {
          'Authorization': `Bearer ${authToken}`
        }),
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend delete response not ok: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      throw new Error(`Backend responded with ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully deleted contacts from backend');

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying delete contacts request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}