import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// GET - Fetch all users from backend
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying users request to backend...');
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader.includes('Bearer') ? authHeader : `Bearer ${authHeader}` })
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