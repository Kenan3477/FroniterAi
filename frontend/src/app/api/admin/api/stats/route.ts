import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/api/stats`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching API stats:', error);
    return NextResponse.json(
      { 
        total: 0,
        active: 0,
        expired: 0,
        inactive: 0,
        byEnvironment: {
          production: 0,
          staging: 0,
          development: 0
        },
        recentUsage: 0
      },
      { status: 200 }
    );
  }
}