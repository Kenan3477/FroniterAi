import { NextRequest, NextResponse } from 'next/server';
import { Logger, generateCorrelationId } from '@/lib/logger';
import { ErrorResponseBuilder } from '@/lib/errors';

// Extended request interface with correlation ID
export interface RequestWithCorrelation extends NextRequest {
  correlationId: string;
  startTime: number;
  logger: Logger;
  errorHandler: ErrorResponseBuilder;
}

// Middleware to add correlation ID and logging to requests
export function withRequestLogging(
  handler: (request: RequestWithCorrelation) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    const correlationId = generateCorrelationId();
    
    // Create logger with correlation ID
    const logger = new Logger(correlationId);
    const errorHandler = new ErrorResponseBuilder(logger);

    // Extend request object
    const extendedRequest = request as RequestWithCorrelation;
    extendedRequest.correlationId = correlationId;
    extendedRequest.startTime = startTime;
    extendedRequest.logger = logger;
    extendedRequest.errorHandler = errorHandler;

    // Log incoming request
    logger.logRequest(
      request.method,
      request.nextUrl.pathname,
      request.ip || 'unknown',
      request.headers.get('user-agent') || undefined
    );

    try {
      // Execute the handler
      const response = await handler(extendedRequest);
      
      // Log successful response
      const responseTime = Date.now() - startTime;
      logger.logResponse(
        request.method,
        request.nextUrl.pathname,
        response.status,
        responseTime
      );

      // Add correlation ID to response headers
      response.headers.set('X-Correlation-ID', correlationId);
      
      return response;

    } catch (error) {
      // Log error and return standardized error response
      const responseTime = Date.now() - startTime;
      
      logger.error('Request handler error', {
        method: request.method,
        url: request.nextUrl.pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });

      const errorResponse = errorHandler.buildErrorResponse(
        error instanceof Error ? error : new Error('Unknown error'),
        correlationId,
        {
          method: request.method,
          endpoint: request.nextUrl.pathname,
          responseTime
        }
      );

      // Add correlation ID to error response headers
      errorResponse.headers.set('X-Correlation-ID', correlationId);
      
      return errorResponse;
    }
  };
}

// Rate limiting middleware
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (request: NextRequest) => string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(config: RateLimitConfig) {
  return function (
    handler: (request: RequestWithCorrelation) => Promise<NextResponse>
  ) {
    return withRequestLogging(async (request: RequestWithCorrelation): Promise<NextResponse> => {
      const now = Date.now();
      const key = config.keyGenerator ? config.keyGenerator(request) : request.ip || 'anonymous';
      
      // Clean up expired entries
      for (const [k, v] of Array.from(rateLimitStore.entries())) {
        if (v.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }

      // Get or create rate limit entry
      let entry = rateLimitStore.get(key);
      if (!entry || entry.resetTime < now) {
        entry = { count: 0, resetTime: now + config.windowMs };
        rateLimitStore.set(key, entry);
      }

      // Check rate limit
      if (entry.count >= config.maxRequests) {
        request.logger.logSecurity('Rate limit exceeded', {
          key,
          count: entry.count,
          maxRequests: config.maxRequests,
          windowMs: config.windowMs
        });

        return request.errorHandler.buildErrorResponse(
          new Error('Rate limit exceeded'),
          request.correlationId,
          {
            retryAfter: Math.ceil((entry.resetTime - now) / 1000)
          }
        );
      }

      // Increment counter
      entry.count++;

      // Add rate limit headers
      const response = await handler(request);
      response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
      response.headers.set('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

      return response;
    });
  };
}

// Input validation middleware
export function withValidation<T>(
  validator: (data: any) => { isValid: boolean; errors?: string[]; data?: T }
) {
  return function (
    handler: (request: RequestWithCorrelation, validatedData: T) => Promise<NextResponse>
  ) {
    return withRequestLogging(async (request: RequestWithCorrelation): Promise<NextResponse> => {
      try {
        const body = await request.json();
        const validation = validator(body);

        if (!validation.isValid) {
          request.logger.warn('Request validation failed', {
            errors: validation.errors,
            body: body
          });

          return request.errorHandler.buildErrorResponse(
            new Error('Invalid request data'),
            request.correlationId
          );
        }

        return handler(request, validation.data!);

      } catch (error) {
        request.logger.warn('Request body parsing failed', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        return request.errorHandler.buildErrorResponse(
          new Error('Invalid JSON in request body'),
          request.correlationId
        );
      }
    });
  };
}

// Database operation logging decorator
export function logDatabaseOperation<T extends any[], R>(
  operation: string,
  logger: Logger
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const startTime = Date.now();
      
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;
        
        logger.logQuery(
          `${operation} - ${propertyKey}`,
          duration,
          Array.isArray(result) ? result.length : undefined
        );

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        logger.error(`Database operation failed: ${operation}`, {
          method: propertyKey,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
          args: args.length > 0 ? 'present' : 'none'
        });

        throw error;
      }
    };

    return descriptor;
  };
}