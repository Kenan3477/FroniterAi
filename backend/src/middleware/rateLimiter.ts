import rateLimit from 'express-rate-limit';

// General API rate limiter
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit: 1000 requests per windowMs for development
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limiter for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Rate limiter for data creation endpoints
export const createRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Increased limit: 100 create operations per 5 minutes for development
  message: {
    success: false,
    error: {
      message: 'Too many creation requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for reporting/analytics endpoints
export const reportingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Increased limit: 100 reporting requests per minute for development
  message: {
    success: false,
    error: {
      message: 'Too many reporting requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});