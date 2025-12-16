import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/campaign-management/stats`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign stats' },
      { status: 500 }
    );
  }
}