import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'https://omnivox-backend-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    // Extract auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'No authorization token provided' },
        { status: 401 }
      );
    }

    // Get query parameters 
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    
    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('❌ Backend error for user-sessions:', data);
      return NextResponse.json(
        { success: false, error: data.message || 'Backend error' },
        { status: backendResponse.status }
      );
    }

    console.log(`✅ User sessions retrieved: ${data.data?.sessions?.length || 0} sessions`);
    
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('❌ Error in user-sessions proxy:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}