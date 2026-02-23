import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'https://omnivox-backend-production.up.railway.app';

// Temporary fallback while Railway backend is being fixed
const FALLBACK_ENABLED = true; // Set to false when Railway is fixed

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
      
      // If it's "Application not found" and fallback is enabled, provide mock data
      if (FALLBACK_ENABLED && (data.error === 'Application not found' || data.message === 'Application not found')) {
        console.log('� Railway backend unavailable - providing mock data for testing');
        
        const mockData = {
          success: true,
          data: [
            {
              id: 'session_1',
              userId: 'user_123',
              username: 'ken@simpleemails.co.uk',
              action: 'login',
              timestamp: '2026-02-20T10:30:00Z',
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0 Chrome',
              success: true,
              details: 'Successful login'
            },
            {
              id: 'session_2',
              userId: 'user_123',
              username: 'ken@simpleemails.co.uk',
              action: 'logout',
              timestamp: '2026-02-20T15:45:00Z',
              ipAddress: '192.168.1.100',
              userAgent: 'Mozilla/5.0 Chrome',
              success: true,
              details: 'Normal logout'
            },
            {
              id: 'session_3',
              userId: 'user_456',
              username: 'admin@test.co.uk',
              action: 'login',
              timestamp: '2026-02-21T09:15:00Z',
              ipAddress: '10.0.0.50',
              userAgent: 'Mozilla/5.0 Firefox',
              success: true,
              details: 'Admin login'
            },
            {
              id: 'session_4',
              userId: 'user_789',
              username: 'agent@test.co.uk',
              action: 'failed_login',
              timestamp: '2026-02-22T11:20:00Z',
              ipAddress: '172.16.0.25',
              userAgent: 'Mozilla/5.0 Safari',
              success: false,
              details: 'Invalid password attempt'
            },
            {
              id: 'session_5',
              userId: 'user_456',
              username: 'admin@test.co.uk',
              action: 'logout',
              timestamp: '2026-02-22T17:30:00Z',
              ipAddress: '10.0.0.50',
              userAgent: 'Mozilla/5.0 Firefox',
              success: true,
              details: 'End of day logout'
            }
          ],
          total: 5,
          message: 'Mock data provided while Railway backend is being fixed',
          isMockData: true,
          timestamp: new Date().toISOString()
        };
        
        console.log('✅ Returning mock user-sessions data:', mockData.data.length, 'records');
        return NextResponse.json(mockData, { status: 200 });
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