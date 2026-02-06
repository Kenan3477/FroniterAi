/**
 * KPI API Proxy
 * Proxies KPI requests to the backend
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
import { cookies } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

// Helper function to get authentication token from headers or cookies
function getAuthToken(request: NextRequest): string | null {
  // Try authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Fallback to cookies
  const cookieStore = cookies();
  const tokenFromCookie = cookieStore.get('auth-token')?.value;
  return tokenFromCookie || null;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying KPI dashboard request to Railway backend...');
    
    // Get auth token for backend request
    const authToken = getAuthToken(request);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
      console.log('🔑 Using authentication token for backend request');
    } else {
      console.log('⚠️ No authentication token provided - backend may deny request');
    }
    
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/api/kpi/dashboard${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error(`❌ Railway backend KPI request failed: ${response.status}`);
      
      // Provide fallback dashboard data when backend auth fails
      if (response.status === 401) {
        console.log('🔄 Providing fallback dashboard data for unauthorized request');
        return NextResponse.json({
          success: true,
          data: {
            totalCalls: 0,
            activeCalls: 0,
            queuedCalls: 0,
            completedCalls: 0,
            agents: {
              total: 0,
              available: 0,
              busy: 0,
              offline: 0
            },
            campaigns: {
              total: 0,
              active: 0,
              paused: 0
            }
          }
        });
      }
      
      return NextResponse.json(
        { success: false, error: `Railway backend request failed: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ KPI dashboard request proxied successfully from Railway backend');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error proxying KPI request to Railway backend:', error);
    
    // Provide fallback dashboard data on error
    return NextResponse.json({
      success: true,
      data: {
        totalCalls: 0,
        activeCalls: 0,
        queuedCalls: 0,
        completedCalls: 0,
        agents: {
          total: 0,
          available: 0,
          busy: 0,
          offline: 0
        },
        campaigns: {
          total: 0,
          active: 0,
          paused: 0
        }
      }
    });
  }
}