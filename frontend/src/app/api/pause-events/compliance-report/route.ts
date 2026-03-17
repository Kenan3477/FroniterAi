import { NextRequest, NextResponse } from 'next/server';

// Enhanced authentication helper
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Development: Extract user from token
    if (process.env.NODE_ENV === 'development') {
      const decoded = JSON.parse(atob(token));
      return decoded;
    }

    // Production: Verify with Railway backend
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/verify-token`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('❌ Auth verification failed:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check authorization for compliance reports (supervisor/admin only)
    if (!['SUPERVISOR', 'ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for compliance reports' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate date parameters
    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'Date range required (dateFrom, dateTo)' },
        { status: 400 }
      );
    }

    // Development mock data
    if (process.env.NODE_ENV === 'development') {
      const mockComplianceReport = {
        pauseEvents: [
          {
            id: 'pe-1',
            agentId: 'agent-123',
            agentName: 'John Doe',
            type: 'BREAK',
            reason: 'Scheduled break',
            startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            endedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            duration: 900000, // 15 minutes
            supervisorApproved: true,
            complianceStatus: 'COMPLIANT'
          },
          {
            id: 'pe-2',
            agentId: 'agent-456',
            agentName: 'Jane Smith',
            type: 'PERSONAL',
            reason: 'Personal emergency',
            startedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            endedAt: null,
            duration: null,
            supervisorApproved: false,
            complianceStatus: 'VIOLATION'
          }
        ],
        auditTrail: [
          {
            id: 'audit-1',
            userId: 'agent-123',
            action: 'PAUSE_START',
            targetType: 'PAUSE_EVENT',
            targetId: 'pe-1',
            metadata: {
              pauseType: 'BREAK',
              reason: 'Scheduled break',
              duration: '15 minutes',
              complianceContext: 'Within scheduled break policy'
            },
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          {
            id: 'audit-2',
            userId: 'agent-456',
            action: 'PAUSE_START',
            targetType: 'PAUSE_EVENT',
            targetId: 'pe-2',
            metadata: {
              pauseType: 'PERSONAL',
              reason: 'Personal emergency',
              complianceContext: 'Unapproved personal time - exceeds policy limits'
            },
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ],
        complianceMetrics: {
          totalPauseEvents: 45,
          totalAuditEntries: 90,
          totalViolations: 3,
          auditCoverage: '100%',
          complianceScore: 93
        },
        violations: [
          {
            type: 'PAUSE_POLICY_VIOLATION',
            severity: 'HIGH',
            createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            body: JSON.stringify({
              agentName: 'Jane Smith',
              violationReason: 'Exceeded maximum personal time without supervisor approval',
              pauseDuration: '60 minutes',
              policyLimit: '15 minutes'
            })
          },
          {
            type: 'UNAUTHORIZED_ACCESS',
            severity: 'MEDIUM',
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            body: JSON.stringify({
              agentName: 'Bob Johnson',
              violationReason: 'Attempted to access another agent\'s pause data',
              accessAttempted: 'agent-789 pause history'
            })
          }
        ],
        generatedAt: new Date().toISOString(),
        dateRange: {
          from: new Date(dateFrom),
          to: new Date(dateTo)
        }
      };

      return NextResponse.json({
        success: true,
        data: mockComplianceReport,
        meta: {
          source: 'development',
          authenticated: true,
          userRole: user.role
        }
      });
    }

    // Production: Forward to Railway backend
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      throw new Error('Backend URL not configured');
    }

    const params = new URLSearchParams({
      dateFrom,
      dateTo
    });

    const authHeader = request.headers.get('authorization');
    const response = await fetch(`${backendUrl}/api/pause-events/compliance-report?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Backend request failed: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data,
      meta: {
        source: 'railway_backend',
        authenticated: true,
        userRole: user.role
      }
    });

  } catch (error) {
    console.error('❌ Compliance report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance report' },
      { status: 500 }
    );
  }
}