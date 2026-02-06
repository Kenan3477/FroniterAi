import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    console.log('📞 === INBOUND NUMBERS API CALLED ===');
    console.log('📞 Proxying inbound numbers request to backend...');
    console.log('📞 Request headers:', Object.fromEntries(request.headers.entries()));

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    console.log('🔒 Auth token exists:', !!authToken);
    console.log('🔒 Auth token length:', authToken?.length || 0);
    console.log('🔒 Auth token preview:', authToken ? `${authToken.substring(0, 20)}...` : 'NONE');
    
    if (!authToken) {
      console.log('🔒 ❌ No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-numbers`;
    console.log('📡 Backend URL:', backendUrl);
    console.log('📡 Making request to backend...');

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
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token may be expired');
        const errorData = await response.text();
        console.error('🔑 Backend error details:', errorData);
        
        // Check if it's a token expiry issue
        if (errorData.includes('Invalid token') || errorData.includes('INVALID_TOKEN')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Session expired', 
              message: 'Your session has expired. Please log out and log back in.',
              shouldRefreshAuth: true,
              code: 'SESSION_EXPIRED'
            },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication expired', 
            message: 'Your session has expired. Please log out and log back in.',
            shouldRefreshAuth: true
          },
          { status: 401 }
        );
      }
      
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully fetched inbound numbers from backend');
    console.log('📦 Backend response data:', JSON.stringify(data, null, 2));
    console.log('📊 Number of inbound numbers returned:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      data.data.forEach((num: any, index: number) => {
        console.log(`   ${index + 1}. ${num.phoneNumber} (${num.displayName})`);
      });
    } else {
      console.log('⚠️ Backend returned empty data array or no data field');
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ === INBOUND NUMBERS API ERROR ===');
    console.error('❌ Error proxying inbound numbers request:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inbound numbers', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📞 === INBOUND NUMBERS POST API CALLED ===');
    console.log('📞 Creating new inbound number via backend...');

    // Get auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    console.log('🔒 Auth token exists:', !!authToken);
    
    if (!authToken) {
      console.log('🔒 ❌ No auth token found in cookies');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the request body
    const body = await request.json();
    console.log('📦 Request body:', body);

    const backendUrl = `${BACKEND_URL}/api/voice/inbound-numbers`;
    console.log('📡 Backend URL:', backendUrl);
    console.log('📡 Making POST request to backend...');

    // Forward the request to the Railway backend with cookie-based auth
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    console.log('📡 Backend response status:', response.status);

    if (!response.ok) {
      console.error(`❌ Backend response not ok: ${response.status} ${response.statusText}`);
      
      if (response.status === 401) {
        console.error('🔑 Authentication failed - token may be expired');
        const errorData = await response.text();
        console.error('🔑 Backend error details:', errorData);
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication expired', 
            message: 'Your session has expired. Please log out and log back in.',
            shouldRefreshAuth: true
          },
          { status: 401 }
        );
      }
      
      throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully created inbound number via backend');
    console.log('📦 Backend response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.data) {
      console.log('🎉 Inbound number created successfully:');
      console.log(`   📞 Number: ${data.data.phoneNumber}`);
      console.log(`   🏷️  Name: ${data.data.displayName}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ === INBOUND NUMBERS POST ERROR ===');
    console.error('❌ Error creating inbound number:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { success: false, error: 'Failed to create inbound number', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}