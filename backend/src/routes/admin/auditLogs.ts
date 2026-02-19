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

    const {
      page = '1',
      limit = '50',
      userId,
      status,
      dateFrom,
      dateTo,
      search
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const whereConditions: any = {};

    if (userId) {
      whereConditions.userId = parseInt(userId as string);
    }

    if (status) {
      whereConditions.status = status as string;
    }

    if (dateFrom || dateTo) {
      whereConditions.loginTime = {};
      if (dateFrom) {
        whereConditions.loginTime.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        whereConditions.loginTime.lte = new Date(dateTo as string);
      }
    }

    // Get user sessions with user information
    const [sessions, totalCount] = await Promise.all([
      prisma.userSession.findMany({
        where: whereConditions,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { loginTime: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.userSession.count({ where: whereConditions })
    ]);

    // Apply search filter if provided (after including user data)
    let filteredSessions = sessions;
    if (search) {
      const searchLower = (search as string).toLowerCase();
      filteredSessions = sessions.filter(session => 
        session.user.username.toLowerCase().includes(searchLower) ||
        session.user.firstName.toLowerCase().includes(searchLower) ||
        session.user.lastName.toLowerCase().includes(searchLower) ||
        session.user.email.toLowerCase().includes(searchLower) ||
        session.ipAddress?.toLowerCase().includes(searchLower)
      );
    }

    console.log(`👥 Retrieved ${filteredSessions.length} user sessions (total: ${totalCount})`);

    res.json({
      success: true,
      data: {
        sessions: filteredSessions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: search ? filteredSessions.length : totalCount,
          totalPages: Math.ceil((search ? filteredSessions.length : totalCount) / limitNum)
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

export default router;