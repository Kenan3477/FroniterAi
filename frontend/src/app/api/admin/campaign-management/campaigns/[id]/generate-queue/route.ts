import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 Frontend API: Proxying generate-queue request to Railway backend');
    console.log('Campaign ID:', params.id);
    
    // Get the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    // Get session for auth token (if needed)
    const session = await getServerSession();
    
    // Forward the request to Railway backend
    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/generate-queue`;
    console.log('Backend URL:', backendUrl);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add auth header if session exists
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    console.log('Backend response status:', response.status);
    console.log('Backend response ok:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend error response:', errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: `Backend error: ${response.status} ${response.statusText}`,
            details: errorText 
          } 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('Backend success response:', data);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Frontend API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  }
}