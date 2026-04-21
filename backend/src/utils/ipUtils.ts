/**
 * IP Utilities
 * Helper functions for extracting client IP addresses from requests
 */

import { Request } from 'express';

/**
 * Extract the real client IP address from a request
 * Handles reverse proxies (Railway, Cloudflare, etc.)
 * 
 * Priority order:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Forwarded-For (most proxies, Railway)
 * 3. X-Real-IP (nginx)
 * 4. req.ip (Express default, often wrong behind proxy)
 * 5. Connection/socket remote address
 */
export const getClientIP = (req: Request): string => {
  // Cloudflare specific header
  const cloudflareIP = req.get('CF-Connecting-IP');
  if (cloudflareIP) {
    return cloudflareIP.trim();
  }

  // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
  // We want the FIRST one (the original client)
  const forwardedFor = req.get('X-Forwarded-For');
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0].trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // X-Real-IP (used by nginx and some other proxies)
  const realIP = req.get('X-Real-IP');
  if (realIP) {
    return realIP.trim();
  }

  // Express req.ip (works if trust proxy is set correctly)
  if (req.ip) {
    return req.ip;
  }

  // Fallback to connection/socket remote address
  const connectionIP = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (connectionIP) {
    return connectionIP;
  }

  return 'unknown';
};

/**
 * Get all IP-related headers for debugging
 */
export const getIPDebugInfo = (req: Request) => {
  return {
    'CF-Connecting-IP': req.get('CF-Connecting-IP'),
    'X-Forwarded-For': req.get('X-Forwarded-For'),
    'X-Real-IP': req.get('X-Real-IP'),
    'req.ip': req.ip,
    'connection.remoteAddress': req.connection?.remoteAddress,
    'socket.remoteAddress': req.socket?.remoteAddress,
    'detectedIP': getClientIP(req)
  };
};
