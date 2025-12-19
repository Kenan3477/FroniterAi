import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult, ValidationError } from 'express-validator';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { logger } from './logging';

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  bruteForce: {
    enabled: boolean;
    freeRetries: number;
    minWait: number;
    maxWait: number;
    lifetime: number;
  };
  headers: {
    hsts: boolean;
    noSniff: boolean;
    frameOptions: boolean;
    xssProtection: boolean;
    csp: boolean;
  };
  encryption: {
    algorithm: string;
    keyLength: number;
    ivLength: number;
  };
  audit: {
    enabled: boolean;
    logLevel: string;
    sensitiveFields: string[];
  };
}

/**
 * Security event interface for audit logging
 */
export interface SecurityEvent {
  type: 'AUTH_SUCCESS' | 'AUTH_FAILURE' | 'RATE_LIMIT' | 'VALIDATION_ERROR' | 'SUSPICIOUS_ACTIVITY';
  userId?: string;
  ip: string;
  userAgent: string;
  endpoint: string;
  timestamp: string;
  details?: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Rate limit store interface
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

/**
 * Comprehensive Security Manager
 * Provides authentication, authorization, input validation, and audit logging
 */
export class SecurityManager {
  private static instance: SecurityManager;
  private config: SecurityConfig;
  private rateLimitStore: Map<string, RateLimitEntry> = new Map();
  private bruteForceStore: Map<string, { attempts: number; blockUntil: number }> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      bruteForce: {
        enabled: true,
        freeRetries: 3,
        minWait: 5 * 60 * 1000, // 5 minutes
        maxWait: 60 * 60 * 1000, // 1 hour
        lifetime: 24 * 60 * 60 * 1000 // 24 hours
      },
      headers: {
        hsts: true,
        noSniff: true,
        frameOptions: true,
        xssProtection: true,
        csp: true
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32,
        ivLength: 16
      },
      audit: {
        enabled: true,
        logLevel: 'info',
        sensitiveFields: ['password', 'token', 'secret', 'key']
      },
      ...config
    };

    this.startCleanupInterval();

    logger.info('Security manager initialized', {
      config: this.sanitizeConfig(this.config)
    });
  }

  static getInstance(config?: Partial<SecurityConfig>): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager(config);
    }
    return SecurityManager.instance;
  }

  /**
   * Get Helmet security headers middleware
   */
  getSecurityHeadersMiddleware() {
    const helmetConfig: any = {
      contentSecurityPolicy: this.config.headers.csp ? {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          scriptSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          workerSrc: ["'self'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: []
        }
      } : false,
      crossOriginEmbedderPolicy: false,
      hsts: this.config.headers.hsts ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      } : false,
      noSniff: this.config.headers.noSniff,
      frameguard: this.config.headers.frameOptions ? { action: 'deny' } : false,
      xssFilter: this.config.headers.xssProtection
    };

    return helmet(helmetConfig);
  }

  /**
   * Get rate limiting middleware
   */
  getRateLimitMiddleware(customConfig?: {
    windowMs?: number;
    max?: number;
    message?: string;
  }) {
    if (!this.config.rateLimit.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    const config = {
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: 'Too many requests from this IP, please try again later.',
      ...customConfig
    };

    return rateLimit({
      windowMs: config.windowMs,
      max: config.max,
      message: {
        error: {
          code: 'RATE_LIMITED',
          message: config.message
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        this.logSecurityEvent({
          type: 'RATE_LIMIT',
          ip: this.getClientIP(req),
          userAgent: req.get('User-Agent') || 'Unknown',
          endpoint: req.originalUrl,
          timestamp: new Date().toISOString(),
          severity: 'MEDIUM',
          details: {
            limit: config.max,
            windowMs: config.windowMs
          }
        });

        res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: config.message
          }
        });
      }
    });
  }

  /**
   * Brute force protection middleware
   */
  getBruteForceProtection() {
    const self = this;
    return (req: Request, res: Response, next: NextFunction) => {
      if (!self.config.bruteForce.enabled) {
        return next();
      }

      const ip = self.getClientIP(req);
      const key = `${ip}:${req.originalUrl}`;
      const now = Date.now();

      const entry = self.bruteForceStore.get(key);
      if (entry && entry.blockUntil > now) {
        self.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          endpoint: req.originalUrl,
          timestamp: new Date().toISOString(),
          severity: 'HIGH',
          details: {
            reason: 'Brute force protection triggered',
            attempts: entry.attempts,
            blockUntil: new Date(entry.blockUntil).toISOString()
          }
        });

        return res.status(429).json({
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many failed attempts. Please try again later.',
            retryAfter: Math.ceil((entry.blockUntil - now) / 1000)
          }
        });
      }

      // Store original send method
      const originalSend = res.send;
      res.send = function(body?: any) {
        // Check if this was a failed authentication attempt
        if (res.statusCode === 401 || res.statusCode === 403) {
          self.recordFailedAttempt(key);
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          // Success - clear failed attempts
          self.bruteForceStore.delete(key);
        }

        // Call original send method
        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * Input validation middleware factory
   */
  getValidationMiddleware(validations: any[]) {
    return [
      ...validations,
      (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          this.logSecurityEvent({
            type: 'VALIDATION_ERROR',
            ip: this.getClientIP(req),
            userAgent: req.get('User-Agent') || 'Unknown',
            endpoint: req.originalUrl,
            timestamp: new Date().toISOString(),
            severity: 'LOW',
            details: {
              errors: errors.array(),
              body: this.sanitizeData(req.body)
            }
          });

          return res.status(422).json({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: errors.array()
            }
          });
        }
        next();
      }
    ];
  }

  /**
   * Common validation rules
   */
  getCommonValidations() {
    return {
      email: body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email format'),
      
      password: body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number, and special character'),
      
      phone: body('phone')
        .isMobilePhone('any')
        .withMessage('Invalid phone number format'),
      
      uuid: (field: string) => body(field)
        .isUUID(4)
        .withMessage(`${field} must be a valid UUID`),
      
      alphanumeric: (field: string) => body(field)
        .isAlphanumeric()
        .withMessage(`${field} must contain only letters and numbers`),
      
      length: (field: string, min: number, max: number) => body(field)
        .isLength({ min, max })
        .withMessage(`${field} must be between ${min} and ${max} characters`),
      
      url: body('url')
        .isURL({ protocols: ['http', 'https'] })
        .withMessage('Invalid URL format'),
      
      dateISO: (field: string) => body(field)
        .isISO8601()
        .toDate()
        .withMessage(`${field} must be a valid ISO 8601 date`),
      
      integer: (field: string) => body(field)
        .isInt({ min: 0 })
        .toInt()
        .withMessage(`${field} must be a positive integer`),
      
      boolean: (field: string) => body(field)
        .isBoolean()
        .toBoolean()
        .withMessage(`${field} must be a boolean value`)
    };
  }

  /**
   * Encryption utilities
   */
  getEncryption() {
    const algorithm = this.config.encryption.algorithm;
    
    return {
      encrypt: (text: string, key: string): { encrypted: string; iv: string; tag?: string } => {
        try {
          const iv = crypto.randomBytes(this.config.encryption.ivLength);
          const cipher = crypto.createCipher(algorithm, key);
          
          let encrypted = cipher.update(text, 'utf8', 'hex');
          encrypted += cipher.final('hex');
          
          return {
            encrypted,
            iv: iv.toString('hex')
          };
        } catch (error) {
          logger.error('Encryption failed', { error: error instanceof Error ? error.message : String(error) });
          throw new Error('Encryption failed');
        }
      },

      decrypt: (encryptedData: { encrypted: string; iv: string; tag?: string }, key: string): string => {
        try {
          const decipher = crypto.createDecipher(algorithm, key);
          
          let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          return decrypted;
        } catch (error) {
          logger.error('Decryption failed', { error: error instanceof Error ? error.message : String(error) });
          throw new Error('Decryption failed');
        }
      },

      hash: async (data: string, saltRounds: number = 12): Promise<string> => {
        return bcrypt.hash(data, saltRounds);
      },

      verify: async (data: string, hash: string): Promise<boolean> => {
        return bcrypt.compare(data, hash);
      },

      generateKey: (length: number = 32): string => {
        return crypto.randomBytes(length).toString('hex');
      },

      generateToken: (length: number = 32): string => {
        return crypto.randomBytes(length).toString('base64url');
      }
    };
  }

  /**
   * Audit logging middleware
   */
  getAuditMiddleware() {
    const self = this;
    return (req: Request, res: Response, next: NextFunction) => {
      if (!self.config.audit.enabled) {
        return next();
      }

      const startTime = Date.now();
      
      // Store original send method
      const originalSend = res.send;
      res.send = function(body?: any) {
        const duration = Date.now() - startTime;
        
        // Log successful authentication
        if (req.originalUrl.includes('/auth/') && res.statusCode >= 200 && res.statusCode < 300) {
          self.logSecurityEvent({
            type: 'AUTH_SUCCESS',
            userId: (req as any).user?.id,
            ip: self.getClientIP(req),
            userAgent: req.get('User-Agent') || 'Unknown',
            endpoint: req.originalUrl,
            timestamp: new Date().toISOString(),
            severity: 'LOW',
            details: {
              method: req.method,
              duration,
              statusCode: res.statusCode
            }
          });
        }

        // Log failed authentication
        if (req.originalUrl.includes('/auth/') && (res.statusCode === 401 || res.statusCode === 403)) {
          self.logSecurityEvent({
            type: 'AUTH_FAILURE',
            ip: self.getClientIP(req),
            userAgent: req.get('User-Agent') || 'Unknown',
            endpoint: req.originalUrl,
            timestamp: new Date().toISOString(),
            severity: 'MEDIUM',
            details: {
              method: req.method,
              duration,
              statusCode: res.statusCode,
              body: self.sanitizeData(req.body)
            }
          });
        }

        // Call original send method
        return originalSend.call(this, body);
      };

      next();
    };
  }

  /**
   * IP blocking middleware
   */
  getIPBlockingMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      
      if (this.suspiciousIPs.has(ip)) {
        this.logSecurityEvent({
          type: 'SUSPICIOUS_ACTIVITY',
          ip,
          userAgent: req.get('User-Agent') || 'Unknown',
          endpoint: req.originalUrl,
          timestamp: new Date().toISOString(),
          severity: 'CRITICAL',
          details: {
            reason: 'Blocked IP attempted access',
            action: 'Request blocked'
          }
        });

        return res.status(403).json({
          error: {
            code: 'ACCESS_FORBIDDEN',
            message: 'Access denied'
          }
        });
      }

      next();
    };
  }

  /**
   * Add IP to suspicious list
   */
  blockIP(ip: string): void {
    this.suspiciousIPs.add(ip);
    logger.warn('IP blocked for suspicious activity', { ip });
  }

  /**
   * Remove IP from suspicious list
   */
  unblockIP(ip: string): void {
    this.suspiciousIPs.delete(ip);
    logger.info('IP unblocked', { ip });
  }

  /**
   * Get list of blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.suspiciousIPs);
  }

  /**
   * Record failed authentication attempt
   */
  private recordFailedAttempt(key: string): void {
    const now = Date.now();
    let entry = this.bruteForceStore.get(key);

    if (!entry) {
      entry = { attempts: 1, blockUntil: 0 };
    } else {
      entry.attempts++;
    }

    // Calculate block time based on number of attempts
    if (entry.attempts > this.config.bruteForce.freeRetries) {
      const blockDuration = Math.min(
        this.config.bruteForce.minWait * Math.pow(2, entry.attempts - this.config.bruteForce.freeRetries),
        this.config.bruteForce.maxWait
      );
      entry.blockUntil = now + blockDuration;
    }

    this.bruteForceStore.set(key, entry);

    // Schedule cleanup
    setTimeout(() => {
      const currentEntry = this.bruteForceStore.get(key);
      if (currentEntry && currentEntry.blockUntil <= Date.now()) {
        this.bruteForceStore.delete(key);
      }
    }, this.config.bruteForce.lifetime);
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      '127.0.0.1'
    );
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    if (!this.config.audit.enabled) {
      return;
    }

    const logLevel = event.severity === 'CRITICAL' ? 'error' : 
                     event.severity === 'HIGH' ? 'warn' : 'info';

    logger[logLevel]('Security event', {
      ...event,
      component: 'SecurityManager'
    });
  }

  /**
   * Sanitize sensitive data for logging
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    for (const field of this.config.audit.sensitiveFields) {
      if (sanitized[field] !== undefined) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Sanitize config for logging
   */
  private sanitizeConfig(config: SecurityConfig): any {
    return {
      ...config,
      encryption: {
        ...config.encryption,
        // Don't log actual encryption keys
      }
    };
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up rate limit store
      for (const [key, entry] of this.rateLimitStore.entries()) {
        if (entry.resetTime <= now) {
          this.rateLimitStore.delete(key);
        }
      }

      // Clean up brute force store
      for (const [key, entry] of this.bruteForceStore.entries()) {
        if (entry.blockUntil <= now) {
          this.bruteForceStore.delete(key);
        }
      }

      logger.debug('Security manager cleanup completed', {
        rateLimitEntries: this.rateLimitStore.size,
        bruteForceEntries: this.bruteForceStore.size,
        blockedIPs: this.suspiciousIPs.size
      });
    }, 60000); // Run every minute
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.rateLimitStore.clear();
    this.bruteForceStore.clear();
    this.suspiciousIPs.clear();
    logger.info('Security manager destroyed');
  }
}

// Export singleton instance
export const securityManager = SecurityManager.getInstance();

/**
 * Security middleware factory
 */
export function createSecurityMiddleware(config?: {
  rateLimit?: boolean;
  bruteForce?: boolean;
  validation?: boolean;
  audit?: boolean;
  headers?: boolean;
}) {
  const {
    rateLimit: enableRateLimit = true,
    bruteForce: enableBruteForce = true,
    validation: enableValidation = true,
    audit: enableAudit = true,
    headers: enableHeaders = true
  } = config || {};

  const middleware = [];

  if (enableHeaders) {
    middleware.push(securityManager.getSecurityHeadersMiddleware());
  }

  if (enableRateLimit) {
    middleware.push(securityManager.getRateLimitMiddleware());
  }

  if (enableBruteForce) {
    middleware.push(securityManager.getBruteForceProtection());
  }

  middleware.push(securityManager.getIPBlockingMiddleware());

  if (enableAudit) {
    middleware.push(securityManager.getAuditMiddleware());
  }

  return middleware;
}

/**
 * Authentication validation rules
 */
export const authValidations = {
  login: securityManager.getValidationMiddleware([
    securityManager.getCommonValidations().email,
    body('password').notEmpty().withMessage('Password is required')
  ]),
  
  register: securityManager.getValidationMiddleware([
    securityManager.getCommonValidations().email,
    securityManager.getCommonValidations().password,
    body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters'),
    body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters')
  ]),
  
  changePassword: securityManager.getValidationMiddleware([
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    securityManager.getCommonValidations().password
  ]),
  
  resetPassword: securityManager.getValidationMiddleware([
    securityManager.getCommonValidations().email
  ])
};

/**
 * Common API validation rules
 */
export const apiValidations = {
  pagination: [
    body('page').optional().isInt({ min: 1 }).toInt(),
    body('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  
  uuid: (field: string) => securityManager.getCommonValidations().uuid(field),
  
  campaign: securityManager.getValidationMiddleware([
    body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Campaign name must be between 1 and 100 characters'),
    body('type').isIn(['OUTBOUND', 'INBOUND', 'PREDICTIVE']).withMessage('Invalid campaign type'),
    body('status').optional().isIn(['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']).withMessage('Invalid campaign status')
  ]),
  
  contact: securityManager.getValidationMiddleware([
    body('firstName').trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
    body('lastName').trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
    securityManager.getCommonValidations().phone,
    securityManager.getCommonValidations().email.optional()
  ])
};