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

// GET - Get user's campaign assignments
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Valid user ID required' 
      }, { status: 400 });
    }

    console.log(`🔗 Proxying user campaigns request to backend for user ${userId}...`);
    
    // Get authentication token from header or cookie  
    const authToken = getAuthToken(request);
    console.log('🍪 Campaign endpoint auth token:', authToken ? 'EXISTS' : 'MISSING');
    
    const response = await fetch(`${BACKEND_URL}/api/user-management/${userId}/campaigns`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched user campaigns from backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying user campaigns request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch user campaigns'
    }, { status: 500 });
  }
}

// POST - Assign campaign to user
export async function POST(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    const body = await request.json();
    
    console.log('🔍 Campaign Assignment Debug:');
    console.log('  - userId from params:', userId);
    console.log('  - body received:', JSON.stringify(body, null, 2));
    console.log('  - body.campaignId:', body.campaignId);
    console.log('  - body.campaignId type:', typeof body.campaignId);
    
    if (!userId || !body.campaignId) {
      console.log('❌ Validation failed:');
      console.log('  - userId valid:', !!userId);
      console.log('  - campaignId valid:', !!body.campaignId);
      
      return NextResponse.json({ 
        success: false, 
        message: 'User ID and campaign ID required' 
      }, { status: 400 });
    }

    console.log(`🔗 Proxying campaign assignment request to backend...`);
    console.log(`📝 Assigning campaign ${body.campaignId} to user ${userId}`);
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/user-management/${userId}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend assignment request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully assigned campaign via backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying campaign assignment request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to assign campaign'
    }, { status: 500 });
  }
}

// DELETE - Remove campaign assignment from user
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const userId = params.userId;
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    if (!userId || !campaignId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID and campaign ID required' 
      }, { status: 400 });
    }

    console.log(`🔗 Proxying campaign unassignment request to backend...`);
    console.log(`🗑️ Unassigning campaign ${campaignId} from user ${userId}`);
    
    // Get authentication token from header or cookie
    const authToken = getAuthToken(request);
    
    const response = await fetch(`${BACKEND_URL}/api/user-management/${userId}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend unassignment request failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Successfully unassigned campaign via backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying campaign unassignment request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to remove campaign assignment'
    }, { status: 500 });
  }
}