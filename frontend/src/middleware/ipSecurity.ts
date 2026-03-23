/**
 * IP Whitelist Security Middleware
 * Enforces IP-based access control for the Omnivox platform
 * Special bypass for Ken (ken@simpleemails.co.uk) - Creator of Omnivox
 */

import { NextRequest, NextResponse } from 'next/server';
import { logIPActivity } from '@/app/api/admin/ip-activity/route';

interface IPWhitelistEntry {
  id: string;
  ipAddress: string;
  name: string;
  description?: string;
  addedBy: string;
  addedAt: Date;
  lastActivity?: Date;
  isActive: boolean;
  activityCount: number;
}

// Default whitelist entries (in production, this should come from database)
const defaultWhitelist: IPWhitelistEntry[] = [
  {
    id: 'default-localhost',
    ipAddress: '127.0.0.1',
    name: 'Localhost',
    description: 'Local development access',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  },
  {
    id: 'default-localhost-ipv6',
    ipAddress: '::1',
    name: 'Localhost IPv6',
    description: 'Local development access (IPv6)',
    addedBy: 'ken@simpleemails.co.uk',
    addedAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
    activityCount: 0
  }
];

function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  // Fallback to request IP (may be from load balancer)
  return request.ip || '127.0.0.1';
}

async function isIPWhitelisted(ipAddress: string): Promise<boolean> {
  try {
    // In production, this should query the database
    // For now, we'll use the default whitelist
    const whitelistedIPs = defaultWhitelist.filter(entry => entry.isActive);
    return whitelistedIPs.some(entry => entry.ipAddress === ipAddress);
  } catch (error) {
    console.error('❌ Error checking IP whitelist:', error);
    // Fail-safe: allow localhost IPs if there's an error
    return ipAddress === '127.0.0.1' || ipAddress === '::1';
  }
}

async function isKenBypassEnabled(request: NextRequest): Promise<boolean> {
  try {
    // Check if user is authenticated as Ken
    const authToken = request.cookies.get('auth-token')?.value;
    if (!authToken) {
      return false;
    }

    // In production, this should verify the token and check if user is ken@simpleemails.co.uk
    // For now, we'll do a simple check (this should be improved)
    // This is a simplified implementation - in production, decode the JWT properly
    
    return false; // For now, disable bypass to enforce IP checking
  } catch (error) {
    console.error('❌ Error checking Ken bypass:', error);
    return false;
  }
}

function createAccessDeniedResponse(ipAddress: string, reason: string): NextResponse {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Access Denied - Omnivox AI</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .container {
          text-align: center;
          max-width: 600px;
          padding: 40px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .logo {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 20px;
          background: linear-gradient(45deg, #fff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .shield {
          font-size: 4rem;
          margin-bottom: 20px;
        }
        h1 {
          font-size: 2rem;
          margin-bottom: 20px;
          color: #fff;
        }
        p {
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 15px;
          color: rgba(255, 255, 255, 0.9);
        }
        .ip-info {
          background: rgba(255, 255, 255, 0.1);
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.9rem;
        }
        .contact {
          margin-top: 30px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">OMNIVOX AI</div>
        <div class="shield">🛡️</div>
        <h1>Access Denied</h1>
        <p>Your IP address is not authorized to access this system.</p>
        <p>Omnivox AI employs advanced security measures to protect sensitive data and prevent unauthorized access.</p>
        
        <div class="ip-info">
          <strong>Your IP:</strong> ${ipAddress}<br>
          <strong>Reason:</strong> ${reason}<br>
          <strong>Timestamp:</strong> ${new Date().toISOString()}
        </div>
        
        <p>If you believe this is an error, please contact the system administrator.</p>
        
        <div class="contact">
          <strong>Omnivox AI</strong><br>
          Professional AI-Powered Dialler Platform<br>
          © 2026 All rights reserved
        </div>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html',
      'X-Blocked-IP': ipAddress,
      'X-Block-Reason': reason,
      'X-Security-Level': 'IP-Whitelist-Enforced'
    }
  });
}

export async function validateIPAccess(request: NextRequest): Promise<NextResponse | null> {
  const startTime = Date.now();
  
  try {
    const clientIP = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || '';
    const path = new URL(request.url).pathname;
    const method = request.method;

    console.log(`🔒 IP Security Check: ${clientIP} ${method} ${path}`);

    // Skip IP validation for certain paths (like health checks)
    const skipPaths = ['/api/health', '/favicon.ico', '/_next/'];
    if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
      return null; // Allow access
    }

    // Check if Ken bypass is enabled (for emergency access)
    const kenBypass = await isKenBypassEnabled(request);
    if (kenBypass) {
      console.log('🔓 Ken bypass enabled - allowing access');
      logIPActivity(clientIP, method, path, userAgent, 'ken@simpleemails.co.uk', '509', 200, Date.now() - startTime);
      return null; // Allow access
    }

    // Check IP whitelist
    const isWhitelisted = await isIPWhitelisted(clientIP);
    
    if (!isWhitelisted) {
      console.log(`❌ IP ${clientIP} not whitelisted - blocking access to ${path}`);
      logIPActivity(clientIP, method, path, userAgent, undefined, undefined, 403, Date.now() - startTime);
      return createAccessDeniedResponse(clientIP, 'IP address not in whitelist');
    }

    console.log(`✅ IP ${clientIP} whitelisted - allowing access to ${path}`);
    logIPActivity(clientIP, method, path, userAgent, undefined, undefined, 200, Date.now() - startTime);
    return null; // Allow access

  } catch (error) {
    console.error('❌ IP validation error:', error);
    const clientIP = getClientIP(request);
    
    // Fail-safe: allow localhost, block everything else on error
    if (clientIP === '127.0.0.1' || clientIP === '::1') {
      return null; // Allow localhost
    }
    
    return createAccessDeniedResponse(clientIP, 'Security system error');
  }
}

export { getClientIP, isIPWhitelisted };