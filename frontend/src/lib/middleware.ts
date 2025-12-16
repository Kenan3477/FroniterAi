import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, CustomJWTPayload, UserRole } from './auth';
import prisma from './db';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: number;
    email: string;
    role: string;
    tokenVersion: number;
  };
}

// Middleware to verify JWT token and attach user to request
export async function authenticateToken(
  request: NextRequest,
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get token from Authorization header or cookies
    let token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const cookies = request.cookies;
      token = cookies.get('access_token')?.value;
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        refreshTokenVersion: true,
        accountLockedUntil: true
      }
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: 'User not found or inactive' },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.accountLockedUntil && new Date() < user.accountLockedUntil) {
      return NextResponse.json(
        { success: false, message: 'Account is temporarily locked' },
        { status: 423 }
      );
    }

    // Check token version (for refresh token invalidation)
    if (decoded.tokenVersion && decoded.tokenVersion !== user.refreshTokenVersion) {
      return NextResponse.json(
        { success: false, message: 'Token has been invalidated' },
        { status: 401 }
      );
    }

    // Attach user to request
    const authenticatedReq = request as AuthenticatedRequest;
    authenticatedReq.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.refreshTokenVersion
    };

    return await handler(authenticatedReq);

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

// Middleware to check user permissions
export function requireRole(roles: UserRole[]) {
  return async (req: AuthenticatedRequest, handler: (req: AuthenticatedRequest) => Promise<NextResponse>) => {
    if (!req.user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return await handler(req);
  };
}

// Rate limiting middleware
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export function rateLimit(options: { windowMs: number; maxRequests: number }) {
  return async (req: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) => {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(rateLimitStore).forEach(key => {
      if (rateLimitStore[key].resetTime < now) {
        delete rateLimitStore[key];
      }
    });

    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = {
        count: 0,
        resetTime: now + options.windowMs
      };
    }

    const limit = rateLimitStore[ip];
    
    if (limit.resetTime < now) {
      // Reset window
      limit.count = 0;
      limit.resetTime = now + options.windowMs;
    }

    limit.count++;

    if (limit.count > options.maxRequests) {
      const resetTime = Math.ceil((limit.resetTime - now) / 1000);
      return NextResponse.json(
        { 
          success: false, 
          message: `Too many requests. Try again in ${resetTime} seconds.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': resetTime.toString(),
            'X-RateLimit-Limit': options.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': limit.resetTime.toString()
          }
        }
      );
    }

    const response = await handler(req);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', options.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', (options.maxRequests - limit.count).toString());
    response.headers.set('X-RateLimit-Reset', limit.resetTime.toString());
    
    return response;
  };
}

// Input validation middleware
export function validateInput<T>(schema: any) {
  return async (req: NextRequest, handler: (req: NextRequest & { validatedData: T }) => Promise<NextResponse>) => {
    try {
      const body = await req.json();
      const validatedData = schema.parse(body);
      
      const validatedReq = req as NextRequest & { validatedData: T };
      validatedReq.validatedData = validatedData;
      
      return await handler(validatedReq);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid input data',
          errors: error instanceof Error ? error.message : 'Validation failed'
        },
        { status: 400 }
      );
    }
  };
}

// Security headers middleware
export function securityHeaders(req: NextRequest, handler: (req: NextRequest) => Promise<NextResponse>) {
  return handler(req).then(response => {
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    return response;
  });
}