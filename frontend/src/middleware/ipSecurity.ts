/**
 * IP Whitelist Security Middleware
 * Enforces IP-based access control for the Omnivox platform
 * Special bypass for Ken (ken@simpleemails.co.uk) - Creator of Omnivox
 */

import { NextRequest, NextResponse } from 'next/server';
import { logIPActivity } from '@/app/api/admin/ip-activity/route';
import { isIPWhitelisted, updateIPActivity } from '@/lib/ipWhitelist';

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
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        :root {
          --omnivox-primary: #0066ff;
          --omnivox-secondary: #1a1d29;
          --omnivox-accent: #ff4757;
          --omnivox-success: #2ed573;
          --omnivox-warning: #ffa502;
          --omnivox-dark: #0f1419;
          --omnivox-darker: #0a0e13;
          --omnivox-light: #ffffff;
          --omnivox-gray-100: #f8fafc;
          --omnivox-gray-200: #e2e8f0;
          --omnivox-gray-300: #cbd5e0;
          --omnivox-gray-400: #a0aec0;
          --omnivox-gray-500: #718096;
          --omnivox-gray-600: #4a5568;
          --omnivox-gray-700: #2d3748;
          --omnivox-gray-800: #1a202c;
          --omnivox-gray-900: #171923;
        }
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          background: linear-gradient(135deg, var(--omnivox-darker) 0%, var(--omnivox-dark) 50%, var(--omnivox-secondary) 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--omnivox-light);
          position: relative;
          overflow: hidden;
        }
        
        body::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 80%, rgba(0, 102, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 71, 87, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(46, 213, 115, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }
        
        .container {
          position: relative;
          z-index: 1;
          text-align: center;
          max-width: 520px;
          padding: 48px 40px;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 24px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 32px 64px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        
        .logo-section {
          margin-bottom: 32px;
        }
        
        .logo {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
          background: linear-gradient(135deg, var(--omnivox-primary) 0%, #00a8ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-transform: uppercase;
        }
        
        .tagline {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--omnivox-gray-400);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .shield-container {
          margin: 32px 0;
          position: relative;
        }
        
        .shield {
          width: 80px;
          height: 80px;
          margin: 0 auto;
          background: linear-gradient(135deg, var(--omnivox-accent) 0%, #ff6b7a 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          box-shadow: 
            0 20px 40px rgba(255, 71, 87, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
          position: relative;
        }
        
        .shield::before {
          content: '';
          position: absolute;
          inset: 2px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          border-radius: 18px;
          pointer-events: none;
        }
        
        .shield::after {
          content: '🛡️';
          position: relative;
          z-index: 1;
        }
        
        .title {
          font-size: 2.25rem;
          font-weight: 700;
          margin-bottom: 16px;
          color: var(--omnivox-light);
          letter-spacing: -0.025em;
        }
        
        .description {
          font-size: 1.125rem;
          line-height: 1.7;
          color: var(--omnivox-gray-300);
          margin-bottom: 24px;
          font-weight: 400;
        }
        
        .security-notice {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--omnivox-gray-400);
          margin-bottom: 32px;
          font-weight: 400;
        }
        
        .ip-info {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 24px;
          border-radius: 16px;
          margin: 32px 0;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
          font-size: 0.875rem;
          text-align: left;
          backdrop-filter: blur(10px);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        
        .ip-info .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .ip-info .info-row:last-child {
          margin-bottom: 0;
          border-bottom: none;
        }
        
        .ip-info .label {
          color: var(--omnivox-gray-400);
          font-weight: 500;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .ip-info .value {
          color: var(--omnivox-light);
          font-weight: 600;
          font-family: inherit;
        }
        
        .ip-info .value.ip {
          color: var(--omnivox-primary);
        }
        
        .ip-info .value.reason {
          color: var(--omnivox-accent);
        }
        
        .contact-section {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .contact-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--omnivox-gray-300);
          margin-bottom: 8px;
          letter-spacing: 0.025em;
        }
        
        .contact-info {
          font-size: 0.8rem;
          color: var(--omnivox-gray-500);
          line-height: 1.5;
        }
        
        .footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 0.75rem;
          color: var(--omnivox-gray-600);
          font-weight: 500;
          letter-spacing: 0.5px;
        }
        
        @media (max-width: 768px) {
          .container {
            margin: 20px;
            padding: 32px 24px;
            max-width: none;
          }
          
          .title {
            font-size: 1.875rem;
          }
          
          .description {
            font-size: 1rem;
          }
          
          .shield {
            width: 64px;
            height: 64px;
            font-size: 2rem;
          }
        }
        
        /* Subtle animation */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .shield {
          animation: float 6s ease-in-out infinite;
        }
        
        /* Glowing effect */
        .container {
          animation: glow 4s ease-in-out infinite alternate;
        }
        
        @keyframes glow {
          from {
            box-shadow: 
              0 32px 64px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          to {
            box-shadow: 
              0 32px 64px rgba(0, 0, 0, 0.4),
              0 0 0 1px rgba(0, 102, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.15);
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo-section">
          <div class="logo">Omnivox AI</div>
          <div class="tagline">Professional AI-Powered Dialler Platform</div>
        </div>
        
        <div class="shield-container">
          <div class="shield"></div>
        </div>
        
        <h1 class="title">Access Denied</h1>
        <p class="description">Your IP address is not authorized to access this system.</p>
        <p class="security-notice">Omnivox AI employs enterprise-grade security measures to protect sensitive data and prevent unauthorized access.</p>
        
        <div class="ip-info">
          <div class="info-row">
            <span class="label">Your IP</span>
            <span class="value ip">${ipAddress}</span>
          </div>
          <div class="info-row">
            <span class="label">Reason</span>
            <span class="value reason">${reason}</span>
          </div>
          <div class="info-row">
            <span class="label">Timestamp</span>
            <span class="value">${new Date().toISOString()}</span>
          </div>
        </div>
        
        <div class="contact-section">
          <div class="contact-title">Need Access?</div>
          <div class="contact-info">If you believe this is an error, please contact the system administrator.</div>
        </div>
        
        <div class="footer">
          <strong>OMNIVOX AI</strong> © 2026 All rights reserved
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

    // Check IP whitelist from backend database
    let isWhitelisted = false;
    
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://froniterai-production.up.railway.app';
      const encoded = encodeURIComponent(clientIP);
      const response = await fetch(
        `${backendUrl}/api/admin/ip-whitelist/check/${encoded}?t=${Date.now()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        },
      );

      if (response.ok) {
        const data = await response.json();
        isWhitelisted = data.whitelisted === true;
        console.log(`🔍 Backend whitelist check for ${clientIP}: ${isWhitelisted ? 'ALLOWED' : 'DENIED'}`);
      } else {
        console.warn(`⚠️  Backend whitelist check failed (${response.status}), falling back to local whitelist`);
        // Fallback to local whitelist if backend is unreachable
        isWhitelisted = isIPWhitelisted(clientIP);
      }
    } catch (fetchError) {
      console.error('❌ Error fetching whitelist from backend:', fetchError);
      // Fallback to local whitelist on network error
      isWhitelisted = isIPWhitelisted(clientIP);
    }
    
    if (!isWhitelisted) {
      console.log(`❌ IP ${clientIP} not whitelisted - blocking access to ${path}`);
      logIPActivity(clientIP, method, path, userAgent, undefined, undefined, 403, Date.now() - startTime);
      return createAccessDeniedResponse(clientIP, 'IP address not in whitelist');
    }

    console.log(`✅ IP ${clientIP} whitelisted - allowing access to ${path}`);
    // Update activity tracking
    updateIPActivity(clientIP);
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