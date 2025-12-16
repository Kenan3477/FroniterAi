import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/business-settings/stats`);
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching business settings stats:', error);
    return NextResponse.json(
      { 
        organizationsCount: 0,
        settingsCount: 0,
        configurationsCount: 0,
        recentUpdates: 0
      },
      { status: 200 }
    );
  }
}