import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/business-settings/organizations`);
    
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      // Backend endpoint doesn't exist, return mock data
      throw new Error('Backend endpoint not available');
    }
  } catch (error) {
    console.error('Error fetching organizations:', error);
    
    // Return mock organizations data
    return NextResponse.json({
      data: [
        {
          id: '1',
          name: 'Default Organization',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/admin/business-settings/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}