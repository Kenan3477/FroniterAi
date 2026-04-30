import { NextRequest, NextResponse } from 'next/server';

function getAuthToken(request: NextRequest): string | null {
  const h = request.headers.get('authorization');
  if (h?.startsWith('Bearer ')) {
    const t = h.slice(7).trim();
    if (t) return t;
  }
  return (
    request.cookies.get('session_token')?.value ||
    request.cookies.get('auth-token')?.value ||
    request.cookies.get('auth_token')?.value ||
    request.cookies.get('authToken')?.value ||
    request.cookies.get('omnivox_token')?.value ||
    null
  );
}

// POST - Answer an inbound call
export async function POST(request: NextRequest) {
  try {
    console.log('📞 Inbound call answer request received...');
    
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
    console.log('📤 Answer call request body:', body);

    // Get backend URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const endpoint = `${backendUrl}/api/calls/inbound-answer`;

    // Make request to backend with timeout
    console.log('🔗 Making backend answer call request...');
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
      console.error(`❌ Backend answer call request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Failed to answer call: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Successfully answered call via backend');
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('❌ Error answering inbound call:', error);
    
    // More specific error handling
    let errorMessage = 'Failed to answer inbound call';
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

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}