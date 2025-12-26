import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// GET - Get all campaigns available for assignment
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying available campaigns request to backend...');
    
    // Forward authentication headers to backend
    const authHeader = request.headers.get('authorization') || request.headers.get('cookie');
    
    const response = await fetch(`${BACKEND_URL}/api/user-management/campaigns/available`, {
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
    console.log(`✅ Successfully fetched available campaigns from backend`);
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Error proxying available campaigns request:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch available campaigns'
    }, { status: 500 });
  }
}