/**
 * KPI API Proxy
 * Proxies KPI requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying KPI dashboard request to backend...');
    
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/kpi/dashboard${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url);

    if (!response.ok) {
      console.error('❌ Backend KPI request failed:', response.status);
      return NextResponse.json(
        { success: false, error: 'Backend KPI request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ KPI dashboard request proxied successfully');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying KPI request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to proxy KPI request' },
      { status: 500 }
    );
  }
}