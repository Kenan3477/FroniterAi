import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://froniterai-production.up.railway.app';

function getAuthToken(request: NextRequest): string | null {
  // Try to get from Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get from cookies
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/auth_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
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
    
    // Get all campaigns with their assigned agents
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns`, {
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

    const campaignData = await response.json();
    
    // Get all available campaigns
    const allCampaigns = campaignData.data || [];
    
    // Filter campaigns where this user ID appears in assignedAgents
    // Look for agent.id matching userId (as string)
    const userAssignedCampaigns = allCampaigns.filter((campaign: any) => {
      console.log(`Checking campaign ${campaign.campaignId}:`);
      console.log('  Assigned agents count:', campaign.assignedAgents?.length || 0);
      
      const isAssigned = campaign.assignedAgents?.some((agent: any) => {
        const matchesId = agent.id === userId;
        console.log(`  Agent ${agent.id}: matches=${matchesId}`);
        return matchesId;
      });
      
      console.log(`  Campaign ${campaign.campaignId} assigned to user ${userId}: ${isAssigned}`);
      return isAssigned;
    });
    
    console.log(`✅ Found ${userAssignedCampaigns.length} campaigns assigned to user ID ${userId}`);
    
    return NextResponse.json({
      success: true,
      data: userAssignedCampaigns
    });

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
    
    console.log(`🔗 Making real campaign assignment to backend...`);
    console.log(`📝 Assigning campaign ${body.campaignId} to user ${userId}`);
    
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
      }, { status: 500 });
    }

    const usersData = await usersResponse.json();
    const users = Array.isArray(usersData) ? usersData : (usersData.data || []);
    const user = users.find((u: any) => u.id.toString() === userId);

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const agentId = userId; // Use userId as agentId
    console.log(`🔍 Using agentId: ${agentId} for user: ${user.email} (${user.name})`);

    // Backend will auto-create agent record from user data if needed

    // Make the real assignment call
    const assignResponse = await fetch(`${BACKEND_URL}/api/admin/campaign-management/campaigns/${body.campaignId}/join-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify({ agentId })
    });

    if (!assignResponse.ok) {
      const errorData = await assignResponse.json();
      console.error('❌ Backend assignment failed:', errorData);
      return NextResponse.json({ 
        success: false, 
        message: errorData.message || 'Campaign assignment failed' 
      }, { status: assignResponse.status });
    }

    const assignData = await assignResponse.json();
    console.log(`✅ Real campaign assignment completed successfully`);
    return NextResponse.json(assignData);

  } catch (error) {
    console.error('❌ Error proxying campaign assignment request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to assign campaign'
    }, { status: 500 });
  }
}