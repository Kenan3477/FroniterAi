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
    
    console.log(`🔗 Proxying user-sessions request to: ${BACKEND_URL}/api/admin/user-sessions?${queryString}`);
    console.log(`🔑 Auth header present: ${!!authHeader}`);
    
    // Forward request to backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/user-sessions?${queryString}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Backend response status: ${backendResponse.status}`);
    
    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('❌ Backend error for user-sessions:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        data: data
      });
      
      // If it's "Application not found", provide a more helpful error and fallback
      if (data.error === 'Application not found' || data.message === 'Application not found') {
        console.error('🚨 Railway backend routing issue detected - Application not found');
        console.error('🔧 This indicates a Railway deployment/routing configuration problem');
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Backend service temporarily unavailable', 
            message: 'Railway backend is running but not accessible via HTTP. This is a deployment configuration issue.',
            railwayIssue: true,
            timestamp: new Date().toISOString()
          },
          { status: 503 } // Service Unavailable instead of 404
        );
      }
      
      return NextResponse.json(
        { success: false, error: data.message || data.error || 'Backend error' },
        { status: backendResponse.status }
      );
    }

    console.log(`✅ User sessions retrieved: ${data.data?.sessions?.length || 0} sessions`);
    
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('❌ Error in user-sessions proxy:', error);
    
    // Enhanced error response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Full error details:', {
      error: errorMessage,
      backendUrl: BACKEND_URL,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error', 
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}