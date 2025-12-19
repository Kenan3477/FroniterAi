import compression from 'compression';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logging';
import { cacheManager } from './caching';

/**
 * Pagination configuration interface
 */
export interface PaginationConfig {
  page: number;
  limit: number;
  maxLimit: number;
  offset: number;
}

/**
 * Pagination response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Response optimization configuration
 */
export interface OptimizationConfig {
  compressionEnabled: boolean;
  cachingEnabled: boolean;
  paginationEnabled: boolean;
  serializationOptimized: boolean;
  responseTimingEnabled: boolean;
}

/**
 * API Response Optimizer
 * Provides compression, efficient serialization, pagination, and response caching
 */
export class ResponseOptimizer {
  private static instance: ResponseOptimizer;
  private config: OptimizationConfig;

  private constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      compressionEnabled: true,
      cachingEnabled: true,
      paginationEnabled: true,
      serializationOptimized: true,
      responseTimingEnabled: true,
      ...config
    };

    logger.info('Response optimizer initialized', {
      config: this.config
    });
  }

  static getInstance(config?: Partial<OptimizationConfig>): ResponseOptimizer {
    if (!ResponseOptimizer.instance) {
      ResponseOptimizer.instance = new ResponseOptimizer(config);
    }
    return ResponseOptimizer.instance;
  }

  /**
   * Get compression middleware
   */
  getCompressionMiddleware() {
    if (!this.config.compressionEnabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return compression({
      level: 6, // Balanced compression level
      threshold: 1024, // Only compress files larger than 1KB
      filter: (req: Request, res: Response) => {
        // Don't compress responses if this request has a 'x-no-compression' header
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Use compression filter function
        return compression.filter(req, res);
      }
    });
  }

  /**
   * Response timing middleware
   */
  getResponseTimingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.responseTimingEnabled) {
        return next();
      }

      const startTime = Date.now();

      // Override res.send to capture response time
      const originalSend = res.send;
      res.send = function(body?: any) {
        const responseTime = Date.now() - startTime;
        
        // Add response time header
        res.setHeader('X-Response-Time', `${responseTime}ms`);
        
        logger.debug('API response time', {
          method: req.method,
          url: req.originalUrl,
          responseTime,
          statusCode: res.statusCode
        });

        // Call original send method
        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Optimized JSON response method
   */
  optimizedJson(res: Response, data: any, options: {
    statusCode?: number;
    cacheKey?: string;
    ttl?: number;
  } = {}) {
    const { statusCode = 200, cacheKey, ttl = 300 } = options;

    try {
      // Cache the response if caching is enabled
      if (this.config.cachingEnabled && cacheKey) {
        cacheManager.set(cacheKey, data, ttl)
          .catch(error => {
            logger.error('Failed to cache response', {
              cacheKey,
              error: error.message
            });
          });
      }

      // Optimize serialization
      const serializedData = this.optimizeSerialzation(data);

      res.status(statusCode).json(serializedData);
    } catch (error) {
      logger.error('Failed to send optimized JSON response', {
        error: error instanceof Error ? error.message : String(error)
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Paginate data helper
   */
  paginate<T>(
    data: T[],
    page: number = 1,
    limit: number = 50,
    maxLimit: number = 100
  ): PaginatedResponse<T> {
    // Validate and normalize pagination parameters
    const normalizedLimit = Math.min(Math.max(1, limit), maxLimit);
    const normalizedPage = Math.max(1, page);
    const offset = (normalizedPage - 1) * normalizedLimit;

    // Calculate pagination info
    const total = data.length;
    const totalPages = Math.ceil(total / normalizedLimit);
    const hasNext = normalizedPage < totalPages;
    const hasPrev = normalizedPage > 1;

    // Extract paginated data
    const paginatedData = data.slice(offset, offset + normalizedLimit);

    return {
      data: paginatedData,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages,
        hasNext,
        hasPrev
      }
    };
  }

  /**
   * Pagination middleware
   */
  getPaginationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.paginationEnabled) {
        return next();
      }

      // Parse pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      // Add pagination helper to request
      (req as any).pagination = {
        page,
        limit,
        maxLimit: 100,
        offset: (page - 1) * limit
      } as PaginationConfig;

      // Add pagination helper to response
      (res as any).paginatedJson = (data: any[], options: {
        statusCode?: number;
        cacheKey?: string;
        ttl?: number;
      } = {}) => {
        const paginatedResponse = this.paginate(data, page, limit);
        this.optimizedJson(res, paginatedResponse, options);
      };

      next();
    };
  }

  /**
   * Cache-aware response middleware
   */
  getCacheMiddleware(defaultTTL: number = 300) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.cachingEnabled || req.method !== 'GET') {
        return next();
      }

      const cacheKey = `api:${req.originalUrl}`;
      
      try {
        const cached = await cacheManager.get(cacheKey);
        
        if (cached) {
          logger.debug('Cache hit for API endpoint', { url: req.originalUrl });
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }

        res.setHeader('X-Cache', 'MISS');

        // Store original json method
        const originalJson = res.json;
        
        // Override json method to cache response
        res.json = function(data: any) {
          // Cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            cacheManager.set(cacheKey, data, defaultTTL)
              .catch(error => {
                logger.error('Failed to cache API response', {
                  url: req.originalUrl,
                  error: error.message
                });
              });
          }

          // Call original json method
          return originalJson.call(this, data);
        };

        next();
      } catch (error) {
        logger.error('Cache middleware error', {
          url: req.originalUrl,
          error: error instanceof Error ? error.message : String(error)
        });
        next();
      }
    };
  }

  /**
   * Security headers middleware
   */
  getSecurityHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      // Remove potentially sensitive headers
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      next();
    };
  }

  /**
   * Error response helper
   */
  sendErrorResponse(
    res: Response,
    error: Error | string,
    statusCode: number = 500,
    additionalData?: any
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('API error response', {
      statusCode,
      error: errorMessage,
      additionalData
    });

    const errorResponse = {
      error: errorMessage,
      timestamp: new Date().toISOString(),
      statusCode,
      ...additionalData
    };

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Success response helper
   */
  sendSuccessResponse(
    res: Response,
    data: any,
    message?: string,
    statusCode: number = 200
  ) {
    const response = {
      success: true,
      data,
      message: message || 'Success',
      timestamp: new Date().toISOString()
    };

    res.status(statusCode).json(response);
  }

  /**
   * Optimize serialization for performance
   */
  private optimizeSerialzation(data: any): any {
    if (!this.config.serializationOptimized) {
      return data;
    }

    try {
      // Remove circular references and undefined values
      return JSON.parse(JSON.stringify(data, (key, value) => {
        // Remove undefined values
        if (value === undefined) {
          return null;
        }
        
        // Handle functions (convert to string or remove)
        if (typeof value === 'function') {
          return '[Function]';
        }

        // Handle dates
        if (value instanceof Date) {
          return value.toISOString();
        }

        return value;
      }));
    } catch (error) {
      logger.warn('Failed to optimize serialization', {
        error: error instanceof Error ? error.message : String(error)
      });
      return data;
    }
  }
}

// Export singleton instance
export const responseOptimizer = ResponseOptimizer.getInstance();

/**
 * All-in-one optimization middleware
 */
export function optimizationMiddleware(config: {
  compression?: boolean;
  caching?: boolean;
  cacheTTL?: number;
  pagination?: boolean;
  timing?: boolean;
  security?: boolean;
} = {}) {
  const {
    compression: enableCompression = true,
    caching: enableCaching = true,
    cacheTTL = 300,
    pagination: enablePagination = true,
    timing: enableTiming = true,
    security: enableSecurity = true
  } = config;

  const optimizer = ResponseOptimizer.getInstance({
    compressionEnabled: enableCompression,
    cachingEnabled: enableCaching,
    paginationEnabled: enablePagination,
    responseTimingEnabled: enableTiming
  });

  return [
    ...(enableSecurity ? [optimizer.getSecurityHeadersMiddleware()] : []),
    ...(enableTiming ? [optimizer.getResponseTimingMiddleware()] : []),
    ...(enableCompression ? [optimizer.getCompressionMiddleware()] : []),
    ...(enableCaching ? [optimizer.getCacheMiddleware(cacheTTL)] : []),
    ...(enablePagination ? [optimizer.getPaginationMiddleware()] : [])
  ];
}

/**
 * Database query optimization decorator
 */
export function optimizeQuery(cacheKey?: string, ttl?: number) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = cacheKey || `query:${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      
      return await cacheManager.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        ttl
      );
    };

    return descriptor;
  };
}