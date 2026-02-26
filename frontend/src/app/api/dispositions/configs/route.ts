import { NextResponse } from 'next/server';

/**
 * GET /api/dispositions/configs
 * Proxy to backend dispositions/configs endpoint 
 * This mirrors the backend API structure
 */
export async function GET() {
  try {
    // Get real database dispositions from backend
    const backendUrl = process.env.BACKEND_URL || 'https://froniterai-production.up.railway.app';
    const response = await fetch(`${backendUrl}/api/dispositions/configs`, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY || 'system-token'}`,
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    } else {
      console.log('Backend dispositions/configs unavailable:', response.status);
      return NextResponse.json({ 
        success: false, 
        error: 'Backend dispositions unavailable',
        status: response.status 
      }, { status: response.status });
    }
  } catch (error) {
    console.error('Failed to fetch backend dispositions/configs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to connect to backend',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}