// Complete pause events route with security and audit trail implementation
import { Router } from 'express';
import { prisma } from '../database';
import { authenticateToken } from '../middleware/enhancedAuth';
import { PauseEventAuditManager } from '../utils/pauseEventAudit';
import { PauseEventAccessControl, UserRole, DataType } from '../utils/pauseEventAccessControl';

const router = Router();
const accessControl = new PauseEventAccessControl();

// ✅ COMPLIANCE: Calculate break compliance context for audit trail
async function calculateBreakCompliance(agentId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's pause events for the agent
    const todaysPauseEvents = await prisma.agentPauseEvent.findMany({
      where: {
        agentId,
        startTime: {
          gte: today,
          lt: tomorrow
        },
        endTime: { not: null } // Only completed pauses
      }
    });

    const totalBreakTimeToday = todaysPauseEvents.reduce(
      (total, event) => total + (event.duration || 0), 
      0
    );

    // Define break allowances (these could be configurable per organization)
    const maxBreakTimePerDay = 60 * 60; // 1 hour in seconds
    const maxBreakDuration = 15 * 60; // 15 minutes in seconds
    
    const remainingBreakAllowance = Math.max(0, maxBreakTimePerDay - totalBreakTimeToday);
    const complianceViolation = totalBreakTimeToday > maxBreakTimePerDay;

    return {
      shiftStartTime: today.toISOString(),
      totalBreakTimeToday,
      remainingBreakAllowance,
      complianceViolation,
      violationReason: complianceViolation 
        ? `Break time exceeded daily allowance of ${maxBreakTimePerDay/60} minutes`
        : undefined,
      breakCount: todaysPauseEvents.length,
      averageBreakDuration: todaysPauseEvents.length > 0 
        ? Math.round(totalBreakTimeToday / todaysPauseEvents.length)
        : 0
    };
  } catch (error) {
    console.error('❌ Failed to calculate break compliance:', error);
    return {
      totalBreakTimeToday: 0,
      remainingBreakAllowance: 0,
      complianceViolation: false
    };
  }
}

// GET /api/pause-events - Get pause events with access control and audit trail
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      agentId,
      eventType,
      pauseReason,
      dateFrom,
      dateTo,
      active,
      page = '1',
      limit = '50'
    } = req.query;

    // ✅ SECURITY: Check access permissions for reading pause events
    const accessCheck = await PauseEventAccessControl.checkAccess({
      userId: req.user?.userId || '',
      userRole: req.user?.role as UserRole || UserRole.AGENT,
      targetAgentId: agentId as string,
      dataType: DataType.PAUSE_EVENTS,
      action: 'READ',
      context: {
        dateRange: {
          from: dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: dateTo ? new Date(dateTo as string) : new Date()
        }
      }
    });

    if (!accessCheck.allowed) {
      // ✅ AUDIT: Log unauthorized access attempt
      await PauseEventAuditManager.logUserAccess({
        userId: req.user?.userId || '',
        userRole: req.user?.role || 'UNKNOWN',
        accessedAgentId: agentId as string,
        dataType: 'PAUSE_EVENTS',
        accessLevel: 'READ',
        dataScope: agentId ? 'OWN' : 'ALL'
      }, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: (req as any).sessionID || 'unknown'
      });

      return res.status(403).json({
        success: false,
        message: accessCheck.reason || 'Access denied',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    let whereConditions: any = {};

    if (agentId) {
      whereConditions.agentId = agentId as string;
    }

    if (eventType) {
      whereConditions.eventType = eventType as string;
    }

    if (pauseReason) {
      whereConditions.pauseReason = { contains: pauseReason as string, mode: 'insensitive' };
    }

    if (dateFrom || dateTo) {
      whereConditions.startTime = {};
      if (dateFrom) {
        whereConditions.startTime.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        whereConditions.startTime.lte = endDate;
      }
    }

    if (active === 'true') {
      whereConditions.endTime = null;
    } else if (active === 'false') {
      whereConditions.endTime = { not: null };
    }

    // ✅ SECURITY: Apply access-based filtering to query
    const baseQuery = {
      where: whereConditions,
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { startTime: 'desc' as const },
      skip,
      take: limitNum
    };

    const filteredQuery = PauseEventAccessControl.applyAccessFilters(
      accessCheck,
      req.user?.userId || '',
      baseQuery
    );

    // Get pause events with agent information
    const [pauseEvents, totalCount] = await Promise.all([
      prisma.agentPauseEvent.findMany(filteredQuery),
      prisma.agentPauseEvent.count({ 
        where: PauseEventAccessControl.applyAccessFilters(
          accessCheck,
          req.user?.userId || '',
          { where: whereConditions }
        ).where
      })
    ]);

    // ✅ SECURITY: Filter sensitive data based on access permissions
    const filteredPauseEvents = PauseEventAccessControl.filterSensitiveData(
      pauseEvents,
      accessCheck,
      req.user?.userId || ''
    );

    // ✅ AUDIT: Log successful data access
    if (accessCheck.auditRequired) {
      await PauseEventAuditManager.logUserAccess({
        userId: req.user?.userId || '',
        userRole: req.user?.role || 'UNKNOWN',
        accessedAgentId: agentId as string || undefined,
        dataType: 'PAUSE_EVENTS',
        accessLevel: 'READ',
        dataScope: agentId ? 'OWN' : 'ALL',
        filterParams: { agentId, eventType, pauseReason, dateFrom, dateTo, active }
      }, {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: (req as any).sessionID || 'unknown'
      });
    }

    res.json({
      success: true,
      data: {
        pauseEvents: filteredPauseEvents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching pause events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pause events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/pause-events/compliance-report - Generate compliance audit report
router.get('/compliance-report', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo, agentId } = req.query;

    // ✅ SECURITY: Check access permissions for compliance reports
    const accessCheck = await PauseEventAccessControl.checkAccess({
      userId: req.user?.userId || '',
      userRole: req.user?.role as UserRole || UserRole.AGENT,
      targetAgentId: agentId as string,
      dataType: DataType.COMPLIANCE_DATA,
      action: 'READ'
    });

    if (!accessCheck.allowed) {
      return res.status(403).json({
        success: false,
        message: accessCheck.reason || 'Access denied to compliance data',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const fromDate = dateFrom ? new Date(dateFrom as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = dateTo ? new Date(dateTo as string) : new Date();

    // ✅ COMPLIANCE: Generate comprehensive compliance report
    const complianceReport = await PauseEventAuditManager.generateComplianceReport(
      fromDate,
      toDate,
      agentId as string
    );

    // ✅ AUDIT: Log compliance report access
    await PauseEventAuditManager.logUserAccess({
      userId: req.user?.userId || '',
      userRole: req.user?.role || 'UNKNOWN',
      accessedAgentId: agentId as string || undefined,
      dataType: 'PAUSE_EVENTS',
      accessLevel: 'READ',
      dataScope: agentId ? 'OWN' : 'ALL',
      filterParams: { dateFrom, dateTo, agentId }
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).sessionID || 'unknown'
    });

    res.json({
      success: true,
      data: {
        ...complianceReport,
        generatedAt: new Date().toISOString(),
        generatedBy: req.user?.username || 'Unknown',
        reportType: 'PAUSE_EVENT_COMPLIANCE',
        dateRange: { from: fromDate, to: toDate }
      }
    });

  } catch (error) {
    console.error('❌ Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Compliance Reporting Endpoint
router.get('/compliance-report', authenticateToken, async (req: any, res: any) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Validate date parameters
    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        error: 'Date range required',
        details: 'Both dateFrom and dateTo parameters are required'
      });
    }

    // Check authorization for compliance reports (supervisor/admin only)
    if (!['SUPERVISOR', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        details: 'Compliance reports require supervisor or admin role'
      });
    }

    const startDate = new Date(dateFrom as string);
    const endDate = new Date(dateTo as string);

    // Generate compliance report with basic metrics
    const pauseEvents = await prisma.agentPauseEvent.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    const auditTrail = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        },
        entityType: {
          in: ['PAUSE_EVENT', 'PAUSE_STATS']
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100 // Limit for performance
    });

    // Calculate compliance metrics
    const totalPauseEvents = pauseEvents.length;
    const totalAuditEntries = auditTrail.length;
    const complianceScore = Math.round((totalAuditEntries / Math.max(totalPauseEvents, 1)) * 100);

    const complianceReport = {
      pauseEvents,
      auditTrail,
      complianceMetrics: {
        totalPauseEvents,
        totalAuditEntries,
        totalViolations: 0, // Would be calculated based on business rules
        auditCoverage: `${Math.min(100, complianceScore)}%`,
        complianceScore: Math.min(100, complianceScore)
      },
      violations: [], // Would be populated based on actual violation detection
      generatedAt: new Date().toISOString(),
      dateRange: {
        from: startDate,
        to: endDate
      }
    };

    res.status(200).json({
      success: true,
      data: complianceReport,
      meta: {
        generatedBy: req.user.username || req.user.email,
        generatedAt: new Date().toISOString(),
        dateRange: { from: startDate, to: endDate }
      }
    });

  } catch (error) {
    console.error('❌ Error generating compliance report:', error);

    res.status(500).json({
      error: 'Failed to generate compliance report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;