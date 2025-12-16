import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';
import { ErrorResponseBuilder, AppError } from '@/lib/errors';

// Global error handler middleware
export function globalErrorHandler() {
  return async function middleware(request: NextRequest) {
    const logger = new Logger();
    const errorHandler = new ErrorResponseBuilder(logger);

    try {
      // Continue to the next middleware/route
      return NextResponse.next();
    } catch (error) {
      // Log the unhandled error
      logger.error('Unhandled error in middleware', {
        url: request.nextUrl.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Return standardized error response
      return errorHandler.buildErrorResponse(
        error instanceof Error ? error : new Error('Unknown middleware error')
      );
    }
  };
}

// Security headers middleware
export function securityHeaders() {
  return async function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    // HSTS for production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    // CSP header
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "frame-ancestors 'none'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);

    return response;
  };
}

// CORS middleware
export function corsHandler(allowedOrigins: string[] = []) {
  return async function middleware(request: NextRequest) {
    const response = NextResponse.next();
    const origin = request.headers.get('origin');

    // Allow all origins in development
    if (process.env.NODE_ENV === 'development' || 
        (origin && allowedOrigins.includes(origin))) {
      response.headers.set('Access-Control-Allow-Origin', origin || '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS, PATCH'
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, Accept, Origin, X-Correlation-ID'
      );
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return response;
  };
}

// Request size limit middleware
export function requestSizeLimit(maxSizeBytes: number = 10 * 1024 * 1024) { // 10MB default
  return async function middleware(request: NextRequest) {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      const logger = new Logger();
      logger.logSecurity('Request size limit exceeded', {
        contentLength: parseInt(contentLength),
        maxSize: maxSizeBytes,
        url: request.nextUrl.pathname,
        ip: request.ip
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: `Request size exceeds limit of ${maxSizeBytes} bytes`,
            timestamp: new Date().toISOString()
          }
        },
        { status: 413 }
      );
    }

    return NextResponse.next();
  };
}

// API versioning middleware
export function apiVersioning(currentVersion: string = 'v1') {
  return async function middleware(request: NextRequest) {
    const response = NextResponse.next();
    
    // Add API version to response headers
    response.headers.set('API-Version', currentVersion);
    
    // Check if client requests specific version
    const requestedVersion = request.headers.get('API-Version') || 
                            request.nextUrl.searchParams.get('version');
    
    if (requestedVersion && requestedVersion !== currentVersion) {
      const logger = new Logger();
      logger.warn('API version mismatch', {
        requested: requestedVersion,
        current: currentVersion,
        url: request.nextUrl.pathname
      });
    }

    return response;
  };
}

// Health check endpoint
export function healthCheck() {
  return async function middleware(request: NextRequest) {
    if (request.nextUrl.pathname === '/health' || request.nextUrl.pathname === '/api/health') {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      return NextResponse.json(health, { status: 200 });
    }

    return NextResponse.next();
  };
}