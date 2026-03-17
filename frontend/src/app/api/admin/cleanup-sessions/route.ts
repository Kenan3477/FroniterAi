import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    // Extract auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'No authorization token provided' },
        { status: 401 }
      );
    }

    console.log('🧹 Proxying session cleanup request to Railway backend...');
    
    // Forward request to Railway backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/admin/cleanup-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    console.log(`📡 Railway backend response status: ${backendResponse.status}`);
    
    const data = await backendResponse.json();

    if (!backendResponse.ok) {
      console.error('❌ Railway backend error for session cleanup:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        data
      });
      
      return NextResponse.json(data, { status: backendResponse.status });
    }

    console.log('✅ Session cleanup successful:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Session cleanup proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Session cleanup service unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}