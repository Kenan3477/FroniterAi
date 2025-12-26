import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

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
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/user-management/${userId}/campaigns`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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
    
    if (!userId || !body.campaignId) {
      return NextResponse.json({ 
        success: false, 
        message: 'User ID and campaign ID required' 
      }, { status: 400 });
    }

    console.log(`🔗 Proxying campaign assignment request to backend...`);
    console.log(`📝 Assigning campaign ${body.campaignId} to user ${userId}`);
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/campaigns`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/users/${userId}/campaigns/${campaignId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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