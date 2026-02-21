import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookie
  const cookieStore = cookies();
  return cookieStore.get('auth_token')?.value || null;
}

// POST - Change user password
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔗 Proxying change password request to backend...');
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    const response = await fetch(`${BACKEND_URL}/api/users/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend change password request failed: ${response.status}`, errorData);
      
      let errorJson;
      try {
        errorJson = JSON.parse(errorData);
      } catch {
        errorJson = { success: false, message: `Request failed: ${response.status}` };
      }
      
      return NextResponse.json(errorJson, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully changed password via backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying change password request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to change password'
    }, { status: 500 });
  }
}