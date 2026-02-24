import { Router } from 'express';
import { prisma } from '../database';
import { authenticateToken } from '../middleware/enhancedAuth';
import { PauseEventAuditManager } from '../utils/pauseEventAudit';
import { PauseEventAccessControl, UserRole, DataType } from '../utils/pauseEventAccessControl';

const router = Router();

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

// POST /api/pause-events - Start a new pause event with audit trail
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { agentId, eventType, pauseReason, pauseCategory, agentComment, metadata } = req.body;

    // Validate required fields
    if (!agentId || !eventType || !pauseReason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: agentId, eventType, pauseReason'
      });
    }

    // ✅ SECURITY: Check access permissions
    const accessCheck = await PauseEventAccessControl.checkAccess({
      userId: req.user?.userId || '',
      userRole: req.user?.role as UserRole || UserRole.AGENT,
      targetAgentId: agentId,
      dataType: DataType.PAUSE_EVENTS,
      action: 'write'
    });

    if (!accessCheck.allowed) {
      // ✅ AUDIT: Log unauthorized access attempt
      await PauseEventAuditManager.logUserAccess({
        userId: req.user?.userId || '',
        userRole: req.user?.role || 'UNKNOWN',
        accessedAgentId: agentId,
        dataType: 'PAUSE_EVENTS',
        accessLevel: 'WRITE',
        dataScope: 'ALL'
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

    // Validate eventType
    const validEventTypes = ['break', 'auto_dial_pause', 'preview_pause'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eventType. Must be one of: break, auto_dial_pause, preview_pause'
      });
    }

    console.log(`📊 Starting pause event for agent ${agentId}: ${eventType} - ${pauseReason}`);

    // Check if agent exists and validate access
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
      });
    }

    // ✅ SECURITY: Validate agent access permissions
    const agentAccessValidation = await PauseEventAccessControl.validateAgentAccess(
      agentId,
      req.user?.userId || '',
      req.user?.role as UserRole || UserRole.AGENT
    );

    if (!agentAccessValidation.valid) {
      return res.status(403).json({
        success: false,
        message: agentAccessValidation.reason || 'Access denied to agent data'
      });
    }

    // Check if there's already an active pause event for this agent
    const activePauseEvent = await prisma.agentPauseEvent.findFirst({
      where: {
        agentId,
        endTime: null // Still active
      }
    });

    if (activePauseEvent) {
      return res.status(400).json({
        success: false,
        message: 'Agent already has an active pause event. End the current pause before starting a new one.',
        activePauseEvent
      });
    }

    // ✅ COMPLIANCE: Calculate compliance context
    const complianceContext = await calculateBreakCompliance(agentId);

    // Create new pause event
    const pauseEvent = await prisma.agentPauseEvent.create({
      data: {
        agentId,
        eventType,
        pauseReason,
        pauseCategory,
        agentComment,
        metadata: metadata || null,
        startTime: new Date()
      },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // ✅ AUDIT: Log pause event creation with compliance context
    await PauseEventAuditManager.logPauseEvent({
      agentId,
      agentName: `${agent.firstName} ${agent.lastName}`,
      eventType,
      pauseReason,
      pauseCategory,
      action: 'PAUSE_STARTED',
      complianceContext,
      supervisorId: req.user?.role === 'SUPERVISOR' ? req.user.userId : undefined
    }, {
      performedByUserId: req.user?.userId || '',
      performedByUserEmail: req.user?.username || '',
      performedByUserName: req.user?.username || '',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).sessionID || 'unknown'
    });

    console.log(`✅ Pause event created with audit trail: ${pauseEvent.id}`);

    res.json({
      success: true,
      message: 'Pause event started successfully',
      data: pauseEvent
    });

  } catch (error) {
    console.error('❌ Error creating pause event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create pause event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/pause-events/:id/end - End a pause event with audit trail
router.put('/:id/end', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { endComment } = req.body;

    console.log(`📊 Ending pause event: ${id}`);

    // Find the pause event
    const pauseEvent = await prisma.agentPauseEvent.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            agentId: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    if (!pauseEvent) {
      return res.status(404).json({
        success: false,
        message: 'Pause event not found'
      });
    }

    // ✅ SECURITY: Check access permissions for ending pause events
    const accessCheck = await PauseEventAccessControl.checkAccess({
      userId: req.user?.userId || '',
      userRole: req.user?.role as UserRole || UserRole.AGENT,
      targetAgentId: pauseEvent.agentId,
      dataType: DataType.PAUSE_EVENTS,
      action: 'write'
    });

    if (!accessCheck.allowed) {
      // ✅ AUDIT: Log unauthorized access attempt
      await PauseEventAuditManager.logUserAccess({
        userId: req.user?.userId || '',
        userRole: req.user?.role || 'UNKNOWN',
        accessedAgentId: pauseEvent.agentId,
        dataType: 'PAUSE_EVENTS',
        accessLevel: 'WRITE',
        dataScope: 'ALL'
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

    if (pauseEvent.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Pause event is already ended'
      });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - pauseEvent.startTime.getTime()) / 1000);

    // Store previous values for audit trail
    const previousValues = {
      endTime: pauseEvent.endTime,
      duration: pauseEvent.duration,
      agentComment: pauseEvent.agentComment
    };

    // Update the pause event
    const updatedPauseEvent = await prisma.agentPauseEvent.update({
      where: { id },
      data: {
        endTime,
        duration,
        agentComment: endComment ? `${pauseEvent.agentComment || ''}\nEnd comment: ${endComment}`.trim() : pauseEvent.agentComment
      },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // ✅ AUDIT: Log pause event completion
    await PauseEventAuditManager.logPauseEvent({
      agentId: pauseEvent.agentId,
      agentName: `${pauseEvent.agent.firstName} ${pauseEvent.agent.lastName}`,
      eventType: pauseEvent.eventType,
      pauseReason: pauseEvent.pauseReason,
      pauseCategory: pauseEvent.pauseCategory || undefined,
      duration,
      action: 'PAUSE_ENDED',
      previousValues,
      newValues: { endTime, duration, agentComment: updatedPauseEvent.agentComment },
      supervisorId: req.user?.role === 'SUPERVISOR' ? req.user.userId : undefined
    }, {
      performedByUserId: req.user?.userId || '',
      performedByUserEmail: req.user?.username || '',
      performedByUserName: req.user?.username || '',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).sessionID || 'unknown'
    });

    console.log(`✅ Pause event ended: ${id} - Duration: ${duration}s`);

    res.json({
      success: true,
      message: 'Pause event ended successfully',
      data: updatedPauseEvent
    });

  } catch (error) {
    console.error('❌ Error ending pause event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to end pause event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/pause-events - Get pause events with filtering and access control
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
      action: 'read',
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
      prisma.agentPauseEvent.findMany({
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
        orderBy: { startTime: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.agentPauseEvent.count({ where: whereConditions })
    ]);

    res.json({
      success: true,
      data: {
        pauseEvents,
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

// GET /api/pause-events/active/:agentId - Get active pause event for an agent
router.get('/active/:agentId', authenticateToken, async (req, res) => {
  try {
    const { agentId } = req.params;

    const activePauseEvent = await prisma.agentPauseEvent.findFirst({
      where: {
        agentId,
        endTime: null
      },
      include: {
        agent: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: activePauseEvent
    });

  } catch (error) {
    console.error('❌ Error fetching active pause event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active pause event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/pause-events/stats - Get pause statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { dateFrom, dateTo, agentId } = req.query;

    // Build filter conditions
    const whereConditions: any = {};

    if (agentId) {
      whereConditions.agentId = agentId as string;
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

    // Get statistics
    const [
      totalPauseEvents,
      pauseReasonStats,
      eventTypeStats,
      avgDuration,
      activePauses
    ] = await Promise.all([
      // Total pause events
      prisma.agentPauseEvent.count({ where: whereConditions }),

      // Group by pause reason
      prisma.agentPauseEvent.groupBy({
        by: ['pauseReason'],
        where: whereConditions,
        _count: { id: true },
        _avg: { duration: true }
      }),

      // Group by event type
      prisma.agentPauseEvent.groupBy({
        by: ['eventType'],
        where: whereConditions,
        _count: { id: true },
        _avg: { duration: true }
      }),

      // Average duration
      prisma.agentPauseEvent.aggregate({
        where: { ...whereConditions, endTime: { not: null } },
        _avg: { duration: true }
      }),

      // Currently active pauses
      prisma.agentPauseEvent.count({
        where: {
          ...whereConditions,
          endTime: null
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalPauseEvents,
        activePauses,
        averageDurationSeconds: avgDuration._avg.duration || 0,
        pauseReasonBreakdown: pauseReasonStats.map(stat => ({
          reason: stat.pauseReason,
          count: stat._count.id,
          averageDuration: stat._avg.duration || 0
        })),
        eventTypeBreakdown: eventTypeStats.map(stat => ({
          eventType: stat.eventType,
          count: stat._count.id,
          averageDuration: stat._avg.duration || 0
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error fetching pause statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pause statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;