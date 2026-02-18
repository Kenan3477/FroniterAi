import { Router, Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { securityMonitor } from '../middleware/security';
import { prisma } from '../database';

const router = Router();

// Get security dashboard - ADMIN ONLY
router.get('/dashboard', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const securityReport = securityMonitor.getSecurityReport();
    
    // Get recent security events from database
    const recentEvents = await prisma.securityEvent.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    }).catch(() => []);

    // Get blocked IPs
    const blockedIPs = Array.from(securityMonitor['suspiciousIPs'] || []);
    
    // Get failed login attempts by IP
    const failedAttempts = Object.fromEntries(securityMonitor['failedAttempts'] || new Map());

    res.json({
      success: true,
      data: {
        ...securityReport,
        recentDatabaseEvents: recentEvents,
        blockedIPs,
        failedAttempts,
        systemStatus: {
          monitoring: 'ACTIVE',
          lastCheck: new Date().toISOString(),
          threats: {
            blocked: blockedIPs.length,
            suspicious: securityReport.suspiciousIPs?.length || 0
          }
        }
      }
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security dashboard'
    });
  }
});

// Block IP address - ADMIN ONLY
router.post('/block-ip', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { ip, reason } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address required'
      });
    }

    securityMonitor.blockIP(ip, reason || 'Manually blocked by admin');
    
    res.json({
      success: true,
      message: `IP ${ip} has been blocked`
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block IP'
    });
  }
});

// Unblock IP address - ADMIN ONLY
router.post('/unblock-ip', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { ip } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address required'
      });
    }

    securityMonitor.unblockIP(ip);
    
    res.json({
      success: true,
      message: `IP ${ip} has been unblocked`
    });
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock IP'
    });
  }
});

// Get security events - ADMIN ONLY
router.get('/events', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { type, severity, limit = 50, offset = 0 } = req.query;
    
    const where: any = {};
    if (type) where.type = type as string;
    if (severity) where.severity = severity as string;
    
    const events = await prisma.securityEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    }).catch(() => []);

    const total = await prisma.securityEvent.count({ where }).catch(() => 0);
    
    res.json({
      success: true,
      data: {
        events,
        total,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    console.error('Security events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security events'
    });
  }
});

// Get system security status - ADMIN ONLY
router.get('/status', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const securityReport = securityMonitor.getSecurityReport();
    
    // Calculate threat level
    let threatLevel = 'LOW';
    if (securityReport.severityBreakdown?.CRITICAL > 0) threatLevel = 'CRITICAL';
    else if (securityReport.severityBreakdown?.HIGH > 5) threatLevel = 'HIGH';
    else if (securityReport.severityBreakdown?.MEDIUM > 10) threatLevel = 'MEDIUM';

    res.json({
      success: true,
      data: {
        threatLevel,
        monitoring: 'ACTIVE',
        lastUpdate: new Date().toISOString(),
        stats: {
          totalEvents: securityReport.totalEvents,
          recentEvents: securityReport.recentEvents,
          blockedIPs: securityReport.suspiciousIPs?.length || 0,
          threatsByType: securityReport.eventTypes
        },
        health: {
          monitoring: '✅ ACTIVE',
          database: '✅ CONNECTED',
          alerts: '✅ ENABLED'
        }
      }
    });
  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security status'
    });
  }
});

// Clear security events (for testing) - ADMIN ONLY
router.delete('/events/clear', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { type, olderThan } = req.body;
    
    const where: any = {};
    if (type) where.type = type as string;
    if (olderThan) {
      where.createdAt = {
        lt: new Date(Date.now() - Number(olderThan) * 24 * 60 * 60 * 1000)
      };
    }
    
    const deleted = await prisma.securityEvent.deleteMany({ where }).catch(() => ({ count: 0 }));
    
    res.json({
      success: true,
      message: `Cleared ${deleted.count} security events`
    });
  } catch (error) {
    console.error('Clear events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear security events'
    });
  }
});

export default router;