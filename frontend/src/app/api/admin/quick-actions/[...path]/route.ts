import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token
function getAuthToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookies from request headers
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    // Try both auth-token and authToken patterns
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/) || cookieHeader.match(/authToken=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      return authTokenMatch[1];
    }
  }
  
  // Fallback to Next.js cookies API
  const cookieStore = cookies();
  let authCookie = cookieStore.get('auth-token') || cookieStore.get('authToken');
  if (authCookie?.value) {
    return authCookie.value;
  }
  
  return null;
}

// Dynamic route handler for all quick-actions endpoints
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;
    const backendPath = `/api/admin/quick-actions/${pathSegments.join('/')}`;
    
    // Get search params from the request
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const fullUrl = `${BACKEND_URL}${backendPath}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🔗 Proxying quick-actions GET request to: ${fullUrl}`);
    
    // Get authentication token
    const authToken = getAuthToken(request);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend quick-actions request failed: ${response.status}`, errorData);
      
      // Return fallback static data for specific endpoints to prevent UI breaks
      if (pathSegments.includes('personalized')) {
        return NextResponse.json([
          { label: 'View Reports', icon: '📊', href: '/admin/reports' },
          { label: 'Manage Users', icon: '👥', href: '/admin/user-management' },
          { label: 'Campaign Settings', icon: '⚙️', href: '/admin/campaigns' }
        ]);
      }
      
      if (pathSegments.includes('templates')) {
        return NextResponse.json([
          { name: 'Daily Standup', description: 'Team check-in template' },
          { name: 'Customer Survey', description: 'Feedback collection template' }
        ]);
      }
      
      if (pathSegments.includes('team-learning')) {
        return NextResponse.json([
          { title: 'Best Practices Guide', type: 'guide', url: '/docs/best-practices' },
          { title: 'Product Updates', type: 'update', url: '/docs/updates' }
        ]);
      }
      
      if (pathSegments.includes('integrations')) {
        return NextResponse.json([
          { name: 'Slack', status: 'connected', type: 'communication' },
          { name: 'Twilio', status: 'connected', type: 'telephony' }
        ]);
      }
      
      if (pathSegments.includes('predictive')) {
        return NextResponse.json([
          { label: 'Check Call Queue', confidence: 0.8, reason: 'High call volume expected' },
          { label: 'Review Agent Performance', confidence: 0.7, reason: 'Weekly review due' }
        ]);
      }
      
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying quick-actions request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch quick actions data'
    }, { status: 500 });
  }
}

// POST handler for actions like tracking
export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path;
    const backendPath = `/api/admin/quick-actions/${pathSegments.join('/')}`;
    const backendUrl = `${BACKEND_URL}${backendPath}`;
    
    console.log(`🔗 Proxying quick-actions POST request to: ${backendUrl}`);
    
    const body = await request.json();
    const authToken = getAuthToken(request);
    
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend quick-actions POST failed: ${response.status}`, errorData);
      return NextResponse.json({ 
        success: false, 
        message: `Backend request failed: ${response.status}` 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying quick-actions POST:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process quick actions request'
    }, { status: 500 });
  }
}