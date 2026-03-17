import { Router } from 'express';
import { prisma } from '../../database';
import { authenticateToken } from '../../middleware/enhancedAuth';

const router = Router();

// GET /api/admin/audit-logs - Get audit logs with filtering and pagination
router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    // Check if user has ADMIN role
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const {
      page = '1',
      limit = '50',
      action,
      entityType,
      severity,
      performedByUserId,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const whereConditions: any = {};

    if (action) {
      whereConditions.action = { contains: action as string, mode: 'insensitive' };
    }

    if (entityType) {
      whereConditions.entityType = entityType as string;
    }

    if (severity) {
      whereConditions.severity = severity as string;
    }

    if (performedByUserId) {
      whereConditions.performedByUserId = performedByUserId as string;
    }

    if (dateFrom || dateTo) {
      whereConditions.timestamp = {};
      if (dateFrom) {
        whereConditions.timestamp.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        whereConditions.timestamp.lte = new Date(dateTo as string);
      }
    }

    if (search) {
      whereConditions.OR = [
        { performedByUserEmail: { contains: search as string, mode: 'insensitive' } },
        { performedByUserName: { contains: search as string, mode: 'insensitive' } },
        { action: { contains: search as string, mode: 'insensitive' } },
        { entityType: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Get audit logs with pagination
    const [auditLogs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where: whereConditions })
    ]);

    // Parse metadata for each log entry
    const logsWithParsedMetadata = auditLogs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    }));

    console.log(`📋 Retrieved ${auditLogs.length} audit logs (total: ${totalCount})`);

    res.json({
      success: true,
      data: {
        logs: logsWithParsedMetadata,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// GET /api/admin/audit-logs/stats - Get audit log statistics
router.get('/audit-logs/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user has ADMIN role
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { days = '7' } = req.query;
    const daysNum = parseInt(days as string);
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Get statistics
    const stats = await Promise.all([
      // Total logs
      prisma.auditLog.count({
        where: { timestamp: { gte: since } }
      }),
      
      // Logs by action
      prisma.auditLog.groupBy({
        by: ['action'],
        where: { timestamp: { gte: since } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } }
      }),

      // Logs by severity
      prisma.auditLog.groupBy({
        by: ['severity'],
        where: { timestamp: { gte: since } },
        _count: { severity: true }
      }),

      // Login/logout specific stats
      prisma.auditLog.count({
        where: {
          timestamp: { gte: since },
          action: { in: ['USER_LOGIN', 'USER_LOGOUT'] }
        }
      }),

      // Unique active users (by login events)
      prisma.auditLog.findMany({
        where: {
          timestamp: { gte: since },
          action: 'USER_LOGIN'
        },
        distinct: ['performedByUserId'],
        select: { performedByUserId: true }
      })
    ]);

    const [totalLogs, actionStats, severityStats, authLogs, uniqueUsers] = stats;

    res.json({
      success: true,
      data: {
        totalLogs,
        authenticationEvents: authLogs,
        uniqueActiveUsers: uniqueUsers.length,
        actionBreakdown: actionStats.reduce((acc, item) => {
          acc[item.action] = item._count.action;
          return acc;
        }, {} as Record<string, number>),
        severityBreakdown: severityStats.reduce((acc, item) => {
          acc[item.severity] = item._count.severity;
          return acc;
        }, {} as Record<string, number>)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit log stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log statistics'
    });
  }
});

// GET /api/admin/user-sessions - Get user session data for login/logout reports
router.get('/user-sessions', authenticateToken, async (req, res) => {
  try {
    // Check if user has ADMIN role
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // TEMPORARILY DISABLED - userSession table not in current schema
    console.log('⚠️ User sessions feature temporarily disabled - userSession table not in schema');
    
    res.json({
      success: true,
      data: {
        sessions: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user sessions'
    });
  }
});

// POST /api/admin/cleanup-sessions - Clean up multiple active sessions for users
router.post('/cleanup-sessions', authenticateToken, async (req, res) => {
  try {
    // Check if user has ADMIN role
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // TEMPORARILY DISABLED - userSession table not in current schema
    console.log('⚠️ Session cleanup feature temporarily disabled - userSession table not in schema');

    res.json({
      success: true,
      message: `Session cleanup feature temporarily disabled`,
      data: {
        totalSessionsClosed: 0,
        usersAffected: 0,
        cleanupResults: []
      }
    });

  } catch (error) {
    console.error('❌ Error during session cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform session cleanup'
    });
  }
});

export default router;