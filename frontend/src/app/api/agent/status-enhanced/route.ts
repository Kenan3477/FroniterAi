import { NextRequest, NextResponse } from 'next/server';

// Extract auth token from cookies
function getAuthToken(request: NextRequest): string | null {
  const authCookie = request.cookies.get('auth-token');
  return authCookie?.value || null;
}

// POST - Update agent status with enhanced features
export async function POST(request: NextRequest) {
  try {
    console.log('🔗 Proxying Agent Status Enhanced API to backend...');
    
    // Get authentication token
    const authToken = getAuthToken(request);
    console.log('🍪 Auth token:', authToken ? 'EXISTS' : 'MISSING');
    
    if (!authToken) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    console.log('📤 Request body:', body);

    // Get backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';
    const endpoint = `${backendUrl}/api/agent/status-enhanced`;

    // Make request to backend
    console.log('🔗 Making backend request...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Failed to update agent status: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Successfully updated agent status via backend');
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error updating agent status:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update agent status'
    }, { status: 500 });
  }
}