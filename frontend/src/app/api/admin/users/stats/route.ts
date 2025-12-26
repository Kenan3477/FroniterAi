import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/users/stats`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { 
        total: 0,
        active: 0,
        inactive: 0,
        suspended: 0,
        byRole: {
          ADMIN: 0,
          MANAGER: 0,
          AGENT: 0,
          VIEWER: 0
        }
      },
      { status: 200 }
    );
  }
}