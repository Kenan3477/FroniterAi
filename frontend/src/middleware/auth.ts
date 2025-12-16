import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, JWTPayload } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function authenticateToken(
  request: NextRequest
): Promise<{ user: JWTPayload } | { error: string; status: number }> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (!token) {
      return { error: 'Access token required', status: 401 };
    }

    const payload = verifyAccessToken(token);

    // Use raw query to avoid type issues during development
    const userQuery = await prisma.$queryRaw`
      SELECT id, isActive, refreshTokenVersion, role 
      FROM users 
      WHERE id = ${payload.userId} AND isActive = 1
      LIMIT 1
    ` as any[];

    if (!userQuery || userQuery.length === 0) {
      return { error: 'Invalid token or user not found', status: 401 };
    }

    const user = userQuery[0];

    // Check if token version matches (for token revocation)
    if (payload.tokenVersion !== undefined && user.refreshTokenVersion !== payload.tokenVersion) {
      return { error: 'Token has been revoked', status: 401 };
    }

    return { user: payload };
  } catch (error) {
    console.error('Token verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

export function requireAuth(handler: (req: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await authenticateToken(request);
    
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const authReq = request as AuthenticatedRequest;
    authReq.user = authResult.user;
    
    return handler(authReq, authResult.user);
  };
}

export function requireRole(roles: string[]) {
  return function (handler: (req: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>) {
    return async (request: NextRequest) => {
      const authResult = await authenticateToken(request);
      
      if ('error' in authResult) {
        return NextResponse.json(
          { error: authResult.error },
          { status: authResult.status }
        );
      }

      if (!roles.includes(authResult.user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      const authReq = request as AuthenticatedRequest;
      authReq.user = authResult.user;
      
      return handler(authReq, authResult.user);
    };
  };
}

// Permission checking utility
export function hasPermission(userRole: string, permission: string): boolean {
  const permissions: { [key: string]: string[] } = {
    'ADMIN': [
      'users:create', 'users:read', 'users:update', 'users:delete',
      'campaigns:create', 'campaigns:read', 'campaigns:update', 'campaigns:delete',
      'reports:read', 'reports:export',
      'system:admin', 'system:config'
    ],
    'SUPERVISOR': [
      'users:read', 'users:update',
      'campaigns:create', 'campaigns:read', 'campaigns:update',
      'reports:read', 'reports:export',
      'agents:manage'
    ],
    'AGENT': [
      'campaigns:read',
      'contacts:read', 'contacts:update',
      'calls:make', 'calls:receive'
    ]
  };

  return permissions[userRole]?.includes(permission) || false;
}