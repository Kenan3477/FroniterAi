import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    console.log('🔑 Found Authorization header');
    return authHeader.substring(7);
  }
  
  // Try cookies from request headers (more reliable)
  const cookieHeader = request.headers.get('cookie');
  console.log('🍪 Raw cookie header:', cookieHeader);
  
  if (cookieHeader) {
    // Parse auth-token from cookie string
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      console.log('✅ Found auth-token in cookies');
      return authTokenMatch[1];
    }
  }
  
  // Fallback to Next.js cookies API
  const cookieStore = cookies();
  const authCookie = cookieStore.get('auth-token');
  console.log('🍪 Next.js cookie check:', { 
    hasCookie: !!authCookie, 
    cookieValue: authCookie?.value ? 'EXISTS' : 'NULL' 
  });
  
  if (authCookie?.value) {
    console.log('✅ Using Next.js cookie token for authentication');
    return authCookie.value;
  }
  
  console.log('❌ No authentication token found');
  return null;
}

// GET - Fetch all users from backend
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying users request to backend...');
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend users request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched users from backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying users request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users'
    }, { status: 500 });
  }
}

// POST - Create new user via backend
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔗 Proxying create user request to backend...');
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend create user request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully created user via backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying create user request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create user'
    }, { status: 500 });
  }
}

// PUT - Update user via backend
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔗 Proxying update user request to backend...');
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend update user request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully updated user via backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying update user request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update user'
    }, { status: 500 });
  }
}

// DELETE - Delete user via backend
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID required' 
      }, { status: 400 });
    }

    console.log(`🔗 Proxying delete user request to backend for user ${userId}...`);
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend delete user request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully deleted user via backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying delete user request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete user'
    }, { status: 500 });
  }
}