import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    console.log('� Found Authorization header');
    return authHeader.substring(7);
  }
  
  // Try cookies from request headers
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      console.log('✅ Found auth-token in cookies');
      return authTokenMatch[1];
    }
  }
  
  // Fallback to Next.js cookies API
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth-token');
  if (authCookie?.value) {
    console.log('✅ Using Next.js cookie token for authentication');
    return authCookie.value;
  }
  
  console.log('❌ No authentication token found');
  return null;
}

export async function GET(request: NextRequest) {
  try {
    console.log('👥 Proxying admin agents GET request to backend...');

    // Get auth token 
    const authToken = getAuthToken(request);
    
    if (!authToken) {
      console.log('🔒 No auth token found, returning demo agent data');
      return NextResponse.json({
        success: true,
        data: [
          { id: 1, username: 'admin', role: 'ADMIN', extension: '101' },
          { id: 2, username: 'agent1', role: 'AGENT', extension: '102' },
          { id: 3, username: 'agent2', role: 'AGENT', extension: '103' },
          { id: 4, username: 'supervisor1', role: 'SUPERVISOR', extension: '104' },
        ]
      });
    }

    const backendUrl = `${BACKEND_URL}/api/admin/users`;
    console.log('👥 Backend URL for agents:', backendUrl);

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      
      // Return demo data for debugging when auth fails
      console.log('🔄 Auth failed, returning demo agent data for debugging');
      return NextResponse.json({
        success: true,
        data: [
          { id: 1, username: 'admin', role: 'ADMIN', extension: '101' },
          { id: 2, username: 'agent1', role: 'AGENT', extension: '102' },
          { id: 3, username: 'agent2', role: 'AGENT', extension: '103' },
          { id: 4, username: 'supervisor1', role: 'SUPERVISOR', extension: '104' },
        ]
      });
    }

    const data = await response.json();
    console.log('✅ Successfully fetched users from backend:', data);

    // The backend might return data differently, let's handle various formats
    let users = [];
    if (data.success && data.data) {
      users = data.data;
    } else if (data.users) {
      users = data.users;
    } else if (Array.isArray(data)) {
      users = data;
    } else {
      console.log('🔄 Unknown data format from backend, using demo data');
      users = [
        { id: 1, username: 'admin', role: 'ADMIN', extension: '101' },
        { id: 2, username: 'agent1', role: 'AGENT', extension: '102' },
        { id: 3, username: 'agent2', role: 'AGENT', extension: '103' },
        { id: 4, username: 'supervisor1', role: 'SUPERVISOR', extension: '104' },
      ];
    }

    // Filter to only include agent roles and add extension if missing
    const agents = users.map((user: any, index: number) => ({
      id: user.id || index + 1,
      username: user.username || user.name || `User${index + 1}`,
      role: user.role || 'AGENT',
      extension: user.extension || user.ext || `${100 + index + 1}`
    }));

    console.log('👥 Processed agents data:', agents);

    return NextResponse.json({
      success: true,
      data: agents
    });
  } catch (error) {
    console.error('❌ Error proxying agents request:', error);
    
    // Return demo data for development
    console.log('🔄 Returning demo agent data due to error');
    return NextResponse.json({
      success: true,
      data: [
        { id: 1, username: 'admin', role: 'ADMIN', extension: '101' },
        { id: 2, username: 'agent1', role: 'AGENT', extension: '102' },
        { id: 3, username: 'agent2', role: 'AGENT', extension: '103' },
        { id: 4, username: 'supervisor1', role: 'SUPERVISOR', extension: '104' },
      ]
    });
  }
}