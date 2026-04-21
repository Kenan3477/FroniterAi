import rateLimit from 'express-rate-limit';
import { ipWhitelistManager } from './ipWhitelist';
import { getClientIP } from '../utils/ipUtils';

// Skip function for whitelisted IPs
const skipWhitelistedIPs = async (req: any) => {
  const clientIP = getClientIP(req); // Use proper IP detection with proxy headers
  const isWhitelisted = await ipWhitelistManager.isWhitelisted(clientIP);
  
  if (isWhitelisted) {
    console.log(`⚡ Rate limit bypassed for whitelisted IP: ${clientIP}`);
    return true;
  }
  
  return false;
};

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
  skip: skipWhitelistedIPs
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
  skip: skipWhitelistedIPs
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