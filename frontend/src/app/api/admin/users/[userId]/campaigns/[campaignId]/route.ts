import { NextRequest, NextResponse } from 'next/server';

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
    const authTokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      return authTokenMatch[1];
    }
  }
  
  return null;
}

// DELETE - Remove campaign assignment from user
export async function DELETE(
  request: NextRequest, 
  { params }: { params: { userId: string; campaignId: string } }
) {
  try {
    const { userId, campaignId } = params;
    
    if (!userId || !campaignId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID and campaign ID required' 
      }, { status: 400 });
    }

    console.log(`🔗 Making real campaign unassignment to backend...`);
    console.log(`🗑️ Unassigning campaign ${campaignId} from user ${userId}`);
    
    // First, get user info to find their agent record
    const authToken = getAuthToken(request);
    
    const usersResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!usersResponse.ok) {
      console.error('Failed to get users list');
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to get user information' 
      }, { status: 400 });
    }

    const usersData = await usersResponse.json();
    // Handle both direct array and wrapped response formats
    const users = Array.isArray(usersData) ? usersData : (usersData.data || []);
    const user = users.find((u: any) => u.id.toString() === userId);

    if (!user?.email) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found or email missing' 
      }, { status: 400 });
    }

    console.log(`🔍 Found user: ${user.email} (ID: ${userId})`);

    // Use user ID directly as agentId (same logic as assignment)
    const agentId = userId.toString();
    
    console.log(`🔍 Using agentId: ${agentId} for user: ${user.email} (${user.name})`);

    // Make the real unassignment call
    const unassignResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${campaignId}/leave-agent`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify({ agentId })
    });

    if (!unassignResponse.ok) {
      const errorData = await unassignResponse.json();
      console.error('❌ Backend unassignment failed:', errorData);
      return NextResponse.json({ 
        success: false, 
        message: errorData.message || 'Campaign unassignment failed' 
      }, { status: unassignResponse.status });
    }

    const unassignData = await unassignResponse.json();
    console.log(`✅ Real campaign unassignment completed successfully`);
    return NextResponse.json(unassignData);

  } catch (error) {
    console.error('❌ Error processing campaign unassignment request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to remove campaign assignment'
    }, { status: 500 });
  }
}