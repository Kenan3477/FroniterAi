import { Router } from 'express';
import { prisma } from '../database';
import { authenticateToken } from '../middleware/enhancedAuth';

const router = Router();

// POST /api/pause-events - Start a new pause event
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

    // Validate eventType
    const validEventTypes = ['break', 'auto_dial_pause', 'preview_pause'];
    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid eventType. Must be one of: break, auto_dial_pause, preview_pause'
      });
    }

    console.log(`📊 Starting pause event for agent ${agentId}: ${eventType} - ${pauseReason}`);

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { agentId }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found'
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

    console.log(`✅ Pause event created: ${pauseEvent.id}`);

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

// PUT /api/pause-events/:id/end - End a pause event
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

    if (pauseEvent.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Pause event is already ended'
      });
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - pauseEvent.startTime.getTime()) / 1000);

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

// GET /api/pause-events - Get pause events with filtering
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

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const whereConditions: any = {};

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

    // Get pause events with agent information
    const [pauseEvents, totalCount] = await Promise.all([
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