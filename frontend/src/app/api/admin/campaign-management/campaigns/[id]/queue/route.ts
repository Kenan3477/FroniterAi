import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`📋 Frontend API: Fetching queue for campaign ${params.id} from Railway backend`);
    
    // Forward the request to Railway backend
    const backendUrl = `${BACKEND_URL}/api/admin/campaign-management/campaigns/${params.id}/queue`;
    console.log('Backend URL:', backendUrl);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Forward any authorization header from the original request
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
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
    console.log('Backend queue response:', data);
    
    return NextResponse.json(data, { status: response.status });
    
  } catch (error) {
    console.error('Frontend API error fetching queue:', error);
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