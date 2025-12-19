import winston from 'winston';
import { Request, Response, NextFunction } from 'express';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
  )
);

// Define log format for production (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? productionFormat : logFormat
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: productionFormat
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: productionFormat
  })
];

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: logLevels,
  format: productionFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
  exitOnError: false
});

// Error tracking interface
export interface ErrorInfo {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  context?: {
    userId?: string;
    sessionId?: string;
    route?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    requestId?: string;
  };
  metadata?: Record<string, any>;
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 1000;
  private errorCounts: Map<string, number> = new Map();

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  /**
   * Track an error with context
   */
  public trackError(error: Error, context?: ErrorInfo['context'], metadata?: Record<string, any>): string {
    const errorId = this.generateErrorId();
    
    const errorInfo: ErrorInfo = {
      id: errorId,
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      stack: error.stack,
      context,
      metadata
    };

    this.addToHistory(errorInfo);
    this.incrementErrorCount(error.message);

    // Log with structured data
    logger.error('Application error tracked', {
      errorId,
      message: error.message,
      stack: error.stack,
      context,
      metadata
    });

    return errorId;
  }

  /**
   * Track a warning
   */
  public trackWarning(message: string, context?: ErrorInfo['context'], metadata?: Record<string, any>): string {
    const errorId = this.generateErrorId();
    
    const errorInfo: ErrorInfo = {
      id: errorId,
      timestamp: new Date(),
      level: 'warn',
      message,
      context,
      metadata
    };

    this.addToHistory(errorInfo);

    logger.warn('Warning tracked', {
      errorId,
      message,
      context,
      metadata
    });

    return errorId;
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    recentErrors: number;
    topErrors: Array<{ message: string; count: number }>;
    recentErrorTrend: 'increasing' | 'decreasing' | 'stable';
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(error => error.timestamp >= oneHourAgo).length;

    // Get top error messages by frequency
    const sortedErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([message, count]) => ({ message, count }));

    // Calculate recent trend
    const lastHourErrors = this.errorHistory.filter(error => 
      error.timestamp >= oneHourAgo && error.level === 'error'
    ).length;
    const previousHourErrors = this.errorHistory.filter(error => 
      error.timestamp >= new Date(now.getTime() - 2 * 60 * 60 * 1000) && 
      error.timestamp < oneHourAgo && 
      error.level === 'error'
    ).length;

    let recentErrorTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (lastHourErrors > previousHourErrors * 1.2) {
      recentErrorTrend = 'increasing';
    } else if (lastHourErrors < previousHourErrors * 0.8) {
      recentErrorTrend = 'decreasing';
    }

    return {
      totalErrors: this.errorHistory.filter(e => e.level === 'error').length,
      recentErrors,
      topErrors: sortedErrors,
      recentErrorTrend
    };
  }

  /**
   * Get recent errors with pagination
   */
  public getRecentErrors(limit: number = 50, offset: number = 0): ErrorInfo[] {
    return this.errorHistory
      .slice()
      .reverse() // Most recent first
      .slice(offset, offset + limit);
  }

  /**
   * Search errors by criteria
   */
  public searchErrors(criteria: {
    level?: 'error' | 'warn' | 'info';
    messagePattern?: string;
    userId?: string;
    route?: string;
    since?: Date;
    until?: Date;
  }): ErrorInfo[] {
    return this.errorHistory.filter(error => {
      if (criteria.level && error.level !== criteria.level) return false;
      if (criteria.messagePattern && !error.message.includes(criteria.messagePattern)) return false;
      if (criteria.userId && error.context?.userId !== criteria.userId) return false;
      if (criteria.route && error.context?.route !== criteria.route) return false;
      if (criteria.since && error.timestamp < criteria.since) return false;
      if (criteria.until && error.timestamp > criteria.until) return false;
      return true;
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private addToHistory(error: ErrorInfo): void {
    this.errorHistory.push(error);
    
    // Keep only the latest entries
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private incrementErrorCount(message: string): void {
    const count = this.errorCounts.get(message) || 0;
    this.errorCounts.set(message, count + 1);
  }
}

/**
 * Express middleware for error tracking
 */
export const errorTrackingMiddleware = (error: Error, req: Request, res: Response, next: NextFunction): void => {
  const errorTracker = ErrorTracker.getInstance();
  
  const context: ErrorInfo['context'] = {
    route: req.route?.path || req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.headers['x-request-id'] as string,
    // Add user ID if available from authentication middleware
    userId: (req as any).user?.id
  };

  const metadata = {
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      ...req.headers,
      authorization: req.headers.authorization ? '[REDACTED]' : undefined
    }
  };

  const errorId = errorTracker.trackError(error, context, metadata);

  // Add error ID to response for debugging
  res.locals.errorId = errorId;

  next(error);
};

/**
 * Express middleware for request logging
 */
export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Generate request ID if not present
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Override res.end to capture response time and status
  const originalEnd = res.end.bind(res);
  res.end = function(chunk?: any, encoding?: any, cb?: any): any {
    const duration = Date.now() - startTime;
    const requestId = req.headers['x-request-id'];
    
    logger.http('HTTP Request', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: (req as any).user?.id
    });

    // Call original end method
    return originalEnd(chunk, encoding, cb);
  };

  next();
};

/**
 * Performance monitoring middleware
 */
export const performanceMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    // Log slow requests
    if (duration > 1000) { // More than 1 second
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        duration,
        memoryDelta,
        statusCode: res.statusCode
      });
    }

    // Log high memory usage requests
    if (memoryDelta > 50 * 1024 * 1024) { // More than 50MB
      logger.warn('High memory usage request', {
        method: req.method,
        url: req.originalUrl,
        duration,
        memoryDelta,
        statusCode: res.statusCode
      });
    }
  });

  next();
};

/**
 * API endpoint for error statistics
 */
export const getErrorStatsHandler = (req: Request, res: Response): void => {
  try {
    const errorTracker = ErrorTracker.getInstance();
    const stats = errorTracker.getErrorStats();
    
    res.json({
      success: true,
      data: stats,
      message: 'Error statistics retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to retrieve error statistics', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve error statistics'
      }
    });
  }
};

/**
 * API endpoint for recent errors
 */
export const getRecentErrorsHandler = (req: Request, res: Response): void => {
  try {
    const errorTracker = ErrorTracker.getInstance();
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const errors = errorTracker.getRecentErrors(limit, offset);
    
    res.json({
      success: true,
      data: {
        errors,
        pagination: {
          limit,
          offset,
          total: errors.length
        }
      },
      message: 'Recent errors retrieved successfully'
    });
  } catch (error) {
    logger.error('Failed to retrieve recent errors', { error: error instanceof Error ? error.message : error });
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to retrieve recent errors'
      }
    });
  }
};

export { ErrorTracker };
export default logger;