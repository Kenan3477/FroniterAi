import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';

function getAuthToken(request: NextRequest): string | null {
  // Try to get from Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try to get from cookies
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/auth_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

// GET - Get adaptive quick actions for dashboard
export async function GET(request: NextRequest) {
  try {
    console.log('🔗 Proxying quick actions request to backend...');
    
    // Get authentication token from header or cookie  
    const authToken = getAuthToken(request);
    console.log('🍪 Quick actions auth token:', authToken ? 'EXISTS' : 'MISSING');
    
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    
    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/dashboard/quick-actions?timeRange=${timeRange}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      }
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Backend quick actions request failed: ${response.status}`, errorData);
      
      // Return fallback static actions on error
      return NextResponse.json({
        success: true,
        data: {
          quickActions: [
            {
              id: 'work-queue',
              title: 'My Work Queue',
              description: 'View assigned interactions',
              icon: '📋',
              href: '/work',
              section: 'Work',
              frequency: 0,
              lastUsed: new Date(),
              category: 'navigation',
              color: 'blue'
            },
            {
              id: 'contacts',
              title: 'Manage Contacts',
              description: 'View and edit contacts',
              icon: '👥',
              href: '/contacts',
              section: 'Contacts',
              frequency: 0,
              lastUsed: new Date(),
              category: 'navigation',
              color: 'emerald'
            },
            {
              id: 'reports',
              title: 'View Reports',
              description: 'Check performance metrics',
              icon: '📊',
              href: '/reports',
              section: 'Reports',
              frequency: 0,
              lastUsed: new Date(),
              category: 'navigation',
              color: 'purple'
            },
            {
              id: 'agent-coaching',
              title: 'Agent Coaching',
              description: 'Training and development',
              icon: '🎯',
              href: '/agent-coaching',
              section: 'Coaching',
              frequency: 0,
              lastUsed: new Date(),
              category: 'navigation',
              color: 'orange'
            }
          ],
          metadata: {
            userId: 'unknown',
            userRole: 'USER',
            timeRange: timeRange,
            generatedAt: new Date().toISOString(),
            isPersonalized: false
          }
        }
      });
    }

    const quickActionsData = await response.json();
    console.log('✅ Successfully proxied quick actions:', quickActionsData);
    
    return NextResponse.json(quickActionsData);

  } catch (error) {
    console.error('❌ Error proxying quick actions request:', error);
    
    // Return fallback static actions on error
    return NextResponse.json({
      success: true,
      data: {
        quickActions: [
          {
            id: 'work-queue',
            title: 'My Work Queue',
            description: 'View assigned interactions',
            icon: '📋',
            href: '/work',
            section: 'Work',
            frequency: 0,
            lastUsed: new Date(),
            category: 'navigation',
            color: 'blue'
          },
          {
            id: 'contacts',
            title: 'Manage Contacts',
            description: 'View and edit contacts',
            icon: '👥',
            href: '/contacts',
            section: 'Contacts',
            frequency: 0,
            lastUsed: new Date(),
            category: 'navigation',
            color: 'emerald'
          },
          {
            id: 'reports',
            title: 'View Reports',
            description: 'Check performance metrics',
            icon: '📊',
            href: '/reports',
            section: 'Reports',
            frequency: 0,
            lastUsed: new Date(),
            category: 'navigation',
            color: 'purple'
          },
          {
            id: 'agent-coaching',
            title: 'Agent Coaching',
            description: 'Training and development',
            icon: '🎯',
            href: '/agent-coaching',
            section: 'Coaching',
            frequency: 0,
            lastUsed: new Date(),
            category: 'navigation',
            color: 'orange'
          }
        ],
        ],
        metadata: {
          userId: 'unknown',
          userRole: 'USER',
          timeRange: '30d',
          generatedAt: new Date().toISOString(),
          isPersonalized: false
        }
      }
    });
  }
}