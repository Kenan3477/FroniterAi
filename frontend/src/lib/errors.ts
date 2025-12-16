import { NextResponse } from 'next/server';
import { Logger } from '@/lib/logger';

// Standard error codes
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_FORMAT = 'INVALID_FORMAT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Resource Management
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_GONE = 'RESOURCE_GONE',
  
  // Rate Limiting & Throttling
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Business Logic
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  
  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Standardized error response interface
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    correlationId?: string;
    timestamp: string;
    severity: ErrorSeverity;
  };
  metadata?: {
    requestId?: string;
    userId?: number;
    endpoint?: string;
  };
}

// Application error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly correlationId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any,
    correlationId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.severity = severity;
    this.statusCode = statusCode;
    this.details = details;
    this.correlationId = correlationId;

    // Ensure the stack trace points to where this error was thrown
    Error.captureStackTrace(this, AppError);
  }
}

// Error response builder
export class ErrorResponseBuilder {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // Build standardized error response
  buildErrorResponse(
    error: AppError | Error,
    correlationId?: string,
    metadata?: any
  ): NextResponse {
    const timestamp = new Date().toISOString();
    
    if (error instanceof AppError) {
      // Log the application error
      this.logger.error(`Application Error: ${error.code}`, {
        code: error.code,
        message: error.message,
        severity: error.severity,
        details: error.details,
        stack: error.stack,
        correlationId: error.correlationId || correlationId
      });

      const response: ErrorResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          correlationId: error.correlationId || correlationId,
          timestamp,
          severity: error.severity
        },
        metadata
      };

      return NextResponse.json(response, { status: error.statusCode });
    } else {
      // Handle unexpected errors
      const unexpectedError = new AppError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'An unexpected error occurred',
        500,
        ErrorSeverity.HIGH,
        { originalMessage: error.message },
        correlationId
      );

      this.logger.error('Unexpected Error', {
        message: error.message,
        stack: error.stack,
        correlationId
      });

      const response: ErrorResponse = {
        success: false,
        error: {
          code: unexpectedError.code,
          message: unexpectedError.message,
          correlationId,
          timestamp,
          severity: unexpectedError.severity
        },
        metadata
      };

      return NextResponse.json(response, { status: 500 });
    }
  }

  // Common error responses
  unauthorized(message: string = 'Authentication required', correlationId?: string) {
    throw new AppError(
      ErrorCode.UNAUTHORIZED,
      message,
      401,
      ErrorSeverity.MEDIUM,
      undefined,
      correlationId
    );
  }

  forbidden(message: string = 'Access denied', correlationId?: string) {
    throw new AppError(
      ErrorCode.FORBIDDEN,
      message,
      403,
      ErrorSeverity.MEDIUM,
      undefined,
      correlationId
    );
  }

  notFound(resource: string = 'Resource', correlationId?: string) {
    throw new AppError(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} not found`,
      404,
      ErrorSeverity.LOW,
      undefined,
      correlationId
    );
  }

  validationError(message: string, details?: any, correlationId?: string) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      message,
      400,
      ErrorSeverity.LOW,
      details,
      correlationId
    );
  }

  conflict(message: string, details?: any, correlationId?: string) {
    throw new AppError(
      ErrorCode.RESOURCE_CONFLICT,
      message,
      409,
      ErrorSeverity.MEDIUM,
      details,
      correlationId
    );
  }

  rateLimitExceeded(message: string = 'Rate limit exceeded', correlationId?: string) {
    throw new AppError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      429,
      ErrorSeverity.MEDIUM,
      undefined,
      correlationId
    );
  }

  internalError(message: string = 'Internal server error', details?: any, correlationId?: string) {
    throw new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      message,
      500,
      ErrorSeverity.HIGH,
      details,
      correlationId
    );
  }

  databaseError(message: string = 'Database operation failed', details?: any, correlationId?: string) {
    throw new AppError(
      ErrorCode.DATABASE_ERROR,
      message,
      500,
      ErrorSeverity.HIGH,
      details,
      correlationId
    );
  }
}

// Success response builder
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  metadata?: {
    correlationId?: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export class SuccessResponseBuilder {
  static build<T>(
    data?: T,
    message?: string,
    metadata?: any,
    correlationId?: string
  ): NextResponse {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      message,
      metadata: {
        ...metadata,
        correlationId,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json(response);
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    correlationId?: string,
    message?: string
  ): NextResponse {
    const response: SuccessResponse<T[]> = {
      success: true,
      data,
      message,
      metadata: {
        correlationId,
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };

    return NextResponse.json(response);
  }
}