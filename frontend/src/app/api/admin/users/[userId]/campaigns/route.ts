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
    // Parse both authToken and auth-token from cookie string  
    const authTokenMatch = cookieHeader.match(/authToken=([^;]+)/) || cookieHeader.match(/auth-token=([^;]+)/);
    if (authTokenMatch && authTokenMatch[1]) {
      console.log('✅ Found authToken in cookies');
      return authTokenMatch[1];
    }
  }
  
  // Fallback to Next.js cookies API - check both patterns
  const cookieStore = cookies();
  const authCookie = cookieStore.get('authToken') || cookieStore.get('auth-token');
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
    
    // Now get the user info to find their agent record
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
        success: true,
        data: []
      });
    }

    const usersData = await usersResponse.json();
    // Handle both direct array and wrapped response formats
    const users = Array.isArray(usersData) ? usersData : (usersData.data || []);
    const user = users.find((u: any) => u.id.toString() === userId);

    if (!user?.email) {
      console.error('User not found or no email');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    console.log(`🔍 Found user email: ${user.email} for user ID: ${userId}`);

    // Get user's actual campaign assignments from backend (not campaign list filtering)
    // Use the user ID as agentId to get assignments 
    const agentCampaignsResponse = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!agentCampaignsResponse.ok) {
      console.error('Failed to get agent campaign assignments');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Query backend for assignments using AgentCampaignAssignment table
    // We'll get campaign details by their actual campaignId used in assignments
    const assignedCampaignIds: string[] = [];

    // Get all available campaigns to map IDs to campaign details
    const allCampaigns = campaignData.data || [];
    
    // Filter campaigns where this user's agent record has an assignment
    // The backend should return campaigns with assignedAgents populated properly
    const userAssignedCampaigns = allCampaigns.filter((campaign: any) => {
      const isAssigned = campaign.assignedAgents?.some((agent: any) => 
        agent.agentId === userId || agent.email === user.email
      );
      if (isAssigned) {
        assignedCampaignIds.push(campaign.campaignId);
      }
      return isAssigned;
    });
    
    console.log(`✅ Found ${userAssignedCampaigns.length} campaigns assigned to user ${user.email}`);
    console.log(`📋 Assigned campaign IDs: ${assignedCampaignIds.join(', ')}`);
    
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

    // Use user ID directly as agentId - backend will auto-create agent record if needed
    const agentId = userId.toString();
    
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