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

    // Make request to backend with timeout
    console.log('🔗 Making backend request...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'User-Agent': 'Omnivox-Frontend/1.0'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

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

  } catch (error: any) {
    console.error('❌ Error updating agent status:', error);
    
    // More specific error handling
    let errorMessage = 'Failed to update agent status';
    let statusCode = 500;
    
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout - Railway backend took too long to respond';
      statusCode = 504;
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to Railway backend';
      statusCode = 502;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Railway backend URL not found';
      statusCode = 502;
    }
    
    console.error(`❌ Specific error: ${errorMessage} (${error.message})`);
    
    return NextResponse.json({
      success: false,
      message: errorMessage,
      error: error.message
    }, { status: statusCode });
  }
}