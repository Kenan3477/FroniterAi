import { Request, Response, NextFunction } from 'express';
import { prisma } from '../database/index';

interface SecurityEvent {
  type: string;
  ip: string;
  userAgent?: string;
  email?: string;
  endpoint?: string;
  url?: string;
  body?: any;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private securityEvents: SecurityEvent[] = [];
  private suspiciousIPs: Set<string> = new Set();
  private failedAttempts: Map<string, number> = new Map();

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  // Middleware to detect suspicious requests
  detectSuspiciousActivity = (req: Request, res: Response, next: NextFunction) => {
    const suspiciousPatterns = [
      /\.\./,  // Directory traversal
      /(<|%3C)script/i,  // XSS attempts
      /'|"|;|--|union|select|insert|delete|update|drop/i,  // SQL injection
      /eval\(|javascript:|data:/i,  // Code injection
      /\.(php|asp|jsp|cgi)$/i,  // Suspicious file extensions
      /admin|config|setup|install/i,  // Admin panel access attempts
    ];
    
    const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    const userAgent = req.get('User-Agent') || '';
    const ip = this.getClientIP(req);
    
    // Check URL and body for suspicious patterns
    const requestData = fullUrl + JSON.stringify(req.body || {});
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(requestData)) {
        this.logSecurityEvent({
          type: 'SUSPICIOUS_REQUEST',
          ip,
          userAgent,
          url: fullUrl,
          body: req.body,
          timestamp: new Date().toISOString(),
          severity: 'HIGH'
        });

        // Add IP to suspicious list
        this.suspiciousIPs.add(ip);
        
        console.log('🚨 SECURITY ALERT: Suspicious request detected');
        console.log(`   IP: ${ip}`);
        console.log(`   URL: ${fullUrl}`);
        console.log(`   Pattern: ${pattern}`);
        console.log(`   User-Agent: ${userAgent}`);
        
        // Block obviously malicious requests
        if (pattern.test(requestData) && fullUrl.includes('..')) {
          return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Suspicious activity detected' 
          });
        }
        break;
      }
    }

    // Rate limiting check
    this.checkRateLimit(ip, req, res);
    
    next();
  };

  // Log failed authentication attempts
  logFailedAuth = (email: string, ip: string, userAgent: string) => {
    const key = `${ip}:${email}`;
    const attempts = this.failedAttempts.get(key) || 0;
    this.failedAttempts.set(key, attempts + 1);

    this.logSecurityEvent({
      type: 'FAILED_AUTH',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      severity: attempts > 3 ? 'CRITICAL' : 'MEDIUM'
    });

    console.log('🚨 SECURITY ALERT: Failed authentication attempt');
    console.log(`   Email: ${email}`);
    console.log(`   IP: ${ip}`);
    console.log(`   Attempts: ${attempts + 1}`);
    console.log(`   User-Agent: ${userAgent}`);

    // Auto-ban after 5 failed attempts
    if (attempts >= 5) {
      this.suspiciousIPs.add(ip);
      console.log(`🔒 IP ${ip} has been auto-banned for excessive failed attempts`);
    }
  };

  // Log unauthorized endpoint access
  logUnauthorizedAccess = (endpoint: string, ip: string, userAgent: string) => {
    this.logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS',
      endpoint,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    });

    console.log('🚨 SECURITY ALERT: Unauthorized endpoint access');
    console.log(`   Endpoint: ${endpoint}`);
    console.log(`   IP: ${ip}`);
    console.log(`   User-Agent: ${userAgent}`);
  };

  // Log successful admin login
  logAdminLogin = (email: string, ip: string, userAgent: string) => {
    this.logSecurityEvent({
      type: 'ADMIN_LOGIN',
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
      severity: 'MEDIUM'
    });

    console.log('👑 ADMIN LOGIN: Admin user logged in');
    console.log(`   Email: ${email}`);
    console.log(`   IP: ${ip}`);
    console.log(`   User-Agent: ${userAgent}`);
  };

  // Check rate limiting
  private checkRateLimit = (ip: string, req: Request, res: Response) => {
    // Simple rate limiting - 100 requests per minute
    const key = `rate_limit:${ip}`;
    // In production, use Redis or similar for this
    // For now, just log excessive requests
  };

  // Get real client IP (handles proxies)
  private getClientIP = (req: Request): string => {
    return (
      req.get('CF-Connecting-IP') ||  // Cloudflare
      req.get('X-Forwarded-For')?.split(',')[0] ||
      req.get('X-Real-IP') ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  };

  // Store security events (in production, use proper logging service)
  private logSecurityEvent = async (event: SecurityEvent) => {
    this.securityEvents.push(event);
    
    try {
      // Store in database for persistence
      await prisma.securityEvent.create({
        data: {
          type: event.type,
          ip: event.ip,
          userAgent: event.userAgent || null,
          email: event.email || null,
          endpoint: event.endpoint || null,
          url: event.url || null,
          body: event.body ? JSON.stringify(event.body) : null,
          severity: event.severity,
          createdAt: new Date(event.timestamp)
        }
      }).catch(() => {
        // If SecurityEvent table doesn't exist, just log to console
        console.log('📝 Security event (no DB):', event);
      });
    } catch (error) {
      console.log('📝 Security event (logged):', event);
    }

    // Send alerts for critical events
    if (event.severity === 'CRITICAL') {
      this.sendCriticalAlert(event);
    }
  };

  // Send critical security alerts
  private sendCriticalAlert = (event: SecurityEvent) => {
    console.log('🚨🚨🚨 CRITICAL SECURITY ALERT 🚨🚨🚨');
    console.log('====================================');
    console.log(`Type: ${event.type}`);
    console.log(`IP: ${event.ip}`);
    console.log(`Time: ${event.timestamp}`);
    console.log(`Details:`, event);
    
    // In production, send email/Slack/SMS alerts here
    this.notifyAdmin(event);
  };

  // Get security report
  getSecurityReport = () => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = this.securityEvents.filter(
      e => new Date(e.timestamp) > last24Hours
    );

    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      suspiciousIPs: Array.from(this.suspiciousIPs),
      eventTypes: this.getEventTypeCounts(recentEvents),
      severityBreakdown: this.getSeverityBreakdown(recentEvents),
      topIPs: this.getTopIPs(recentEvents)
    };
  };

  // Check if IP is blocked
  isIPBlocked = (ip: string): boolean => {
    return this.suspiciousIPs.has(ip);
  };

  // Block IP manually
  blockIP = (ip: string, reason: string) => {
    this.suspiciousIPs.add(ip);
    this.logSecurityEvent({
      type: 'IP_BLOCKED',
      ip,
      timestamp: new Date().toISOString(),
      severity: 'HIGH',
      body: { reason }
    });
    console.log(`🔒 IP ${ip} blocked manually: ${reason}`);
  };

  // Unblock IP
  unblockIP = (ip: string) => {
    this.suspiciousIPs.delete(ip);
    console.log(`🔓 IP ${ip} unblocked`);
  };

  private getEventTypeCounts = (events: SecurityEvent[]) => {
    const counts: { [key: string]: number } = {};
    events.forEach(event => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  };

  private getSeverityBreakdown = (events: SecurityEvent[]) => {
    const breakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    events.forEach(event => {
      breakdown[event.severity]++;
    });
    return breakdown;
  };

  private getTopIPs = (events: SecurityEvent[]) => {
    const ipCounts: { [key: string]: number } = {};
    events.forEach(event => {
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
    });
    
    return Object.entries(ipCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }));
  };

  private notifyAdmin = (event: SecurityEvent) => {
    // In production, integrate with:
    // - Email service (SendGrid, AWS SES)
    // - Slack webhooks
    // - SMS service (Twilio)
    // - Discord webhooks
    // - PagerDuty for critical alerts
    
    console.log('📧 Admin notification would be sent here');
    console.log('📱 SMS alert would be sent here');
    console.log('💬 Slack message would be sent here');
  };
}

export const securityMonitor = SecurityMonitor.getInstance();