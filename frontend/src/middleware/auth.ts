import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, JWTPayload } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { getBearerFromNextRequest } from '@/lib/serverAuthBearer';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

function isBackendJwtShape(token: string): boolean {
  return token.includes('eyJ') && token.length > 100;
}

export async function authenticateToken(
  request: NextRequest
): Promise<{ user: JWTPayload } | { error: string; status: number }> {
  try {
    const token = getBearerFromNextRequest(request);

    if (!token) {
      return { error: 'Access token required', status: 401 };
    }

    // Local dev-only bypass (never accepted in production)
    if (token.startsWith('temp_local_token_')) {
      if (process.env.NODE_ENV === 'production') {
        return { error: 'Invalid token', status: 401 };
      }
      return {
        user: {
          userId: 1,
          email: 'admin@omnivox.ai',
          username: 'admin',
          role: 'ADMIN',
          tokenVersion: 1,
        } as JWTPayload,
      };
    }

    // Same secret as backend login (set JWT_SECRET on Next.js for API routes)
    const secret = process.env.JWT_SECRET;
    if (secret && isBackendJwtShape(token)) {
      try {
        const payload = jwt.verify(token, secret) as Record<string, unknown>;
        const userId = Number(payload.userId ?? payload.sub);
        if (!Number.isFinite(userId)) {
          return { error: 'Invalid token', status: 401 };
        }
        return {
          user: {
            userId,
            email: String(payload.email ?? ''),
            username: String(payload.username ?? ''),
            role: String(payload.role ?? 'AGENT'),
            tokenVersion:
              typeof payload.tokenVersion === 'number'
                ? payload.tokenVersion
                : undefined,
          } as JWTPayload,
        };
      } catch {
        return { error: 'Invalid or expired token', status: 401 };
      }
    }

    // Frontend-issued access tokens
    try {
      const payload = verifyAccessToken(token);

      const userQuery = (await prisma.$queryRaw`
        SELECT id, isActive, refreshTokenVersion, role 
        FROM users 
        WHERE id = ${payload.userId} AND isActive = true
        LIMIT 1
      `) as { id: number; refreshTokenVersion: number; role: string }[];

      if (!userQuery || userQuery.length === 0) {
        return { error: 'Invalid token or user not found', status: 401 };
      }

      const user = userQuery[0];

      if (
        payload.tokenVersion !== undefined &&
        user.refreshTokenVersion !== payload.tokenVersion
      ) {
        return { error: 'Token has been revoked', status: 401 };
      }

      return { user: payload };
    } catch {
      return { error: 'Invalid or expired token', status: 401 };
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return { error: 'Invalid token', status: 401 };
  }
}

export function requireAuth(
  handler: (req: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await authenticateToken(request);

    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const authReq = request as AuthenticatedRequest;
    authReq.user = authResult.user;

    return handler(authReq, authResult.user);
  };
}

function roleAllowed(userRole: string, roles: string[]): boolean {
  if (roles.includes(userRole)) return true;
  if (userRole === 'SUPER_ADMIN' && roles.includes('ADMIN')) return true;
  return false;
}

export function requireRole(roles: string[]) {
  return function (
    handler: (req: AuthenticatedRequest, user: JWTPayload) => Promise<NextResponse>
  ) {
    return async (request: NextRequest) => {
      const authResult = await authenticateToken(request);

      if ('error' in authResult) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }

      if (!roleAllowed(authResult.user.role, roles)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }

      const authReq = request as AuthenticatedRequest;
      authReq.user = authResult.user;

      return handler(authReq, authResult.user);
    };
  };
}

export function hasPermission(userRole: string, permission: string): boolean {
  const permissions: { [key: string]: string[] } = {
    SUPER_ADMIN: [
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'campaigns:create',
      'campaigns:read',
      'campaigns:update',
      'campaigns:delete',
      'reports:read',
      'reports:export',
      'system:admin',
      'system:config',
    ],
    ADMIN: [
      'users:create',
      'users:read',
      'users:update',
      'users:delete',
      'campaigns:create',
      'campaigns:read',
      'campaigns:update',
      'campaigns:delete',
      'reports:read',
      'reports:export',
      'system:admin',
      'system:config',
    ],
    SUPERVISOR: [
      'users:read',
      'users:update',
      'campaigns:create',
      'campaigns:read',
      'campaigns:update',
      'reports:read',
      'reports:export',
      'agents:manage',
    ],
    AGENT: [
      'campaigns:read',
      'contacts:read',
      'contacts:update',
      'calls:make',
      'calls:receive',
    ],
  };

  const elevated =
    userRole === 'SUPER_ADMIN' ? permissions.ADMIN : permissions[userRole];
  return elevated?.includes(permission) || false;
}
