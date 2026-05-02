import express from 'express';
import { prisma } from '../database';
import { ensureBasicAgents } from '../utils/ensureBasicAgents';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../middleware/auth';
import { allowPublicDebugRoutes } from '../utils/routeSecurity';

const router = express.Router();

router.use(authenticate);

/**
 * POST /api/test/create-agents
 */
router.post('/create-agents', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    console.log('Manual trigger: Creating system agents...');
    await ensureBasicAgents();

    const agentCount = await prisma.agent.count();
    const agents = await prisma.agent.findMany({
      select: { agentId: true, firstName: true, lastName: true, status: true },
    });

    res.json({
      success: true,
      message: 'System agents created successfully',
      agentCount,
      agents,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error creating system agents:', error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/test/check-database
 */
router.get('/check-database', requireRole('SUPER_ADMIN', 'ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const stats = {
      agents: await prisma.agent.count(),
      campaigns: await prisma.campaign.count(),
      contacts: await prisma.contact.count(),
      callRecords: await prisma.callRecord.count(),
      recordings: await prisma.recording.count(),
    };

    const recentCallRecords = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { startTime: 'desc' },
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true } },
        campaign: { select: { name: true } },
      },
    });

    res.json({
      success: true,
      stats,
      recentCallRecords,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error checking database:', error);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/test/get-token — only when OMNIVOX_ALLOW_PUBLIC_DEBUG_ROUTES=true (non-production).
 * Prefer normal login; this exists only for local diagnostics.
 */
if (allowPublicDebugRoutes()) {
  router.post('/get-token', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
    try {
      const { userId = 509, username = 'test', role = 'ADMIN' } = req.body;

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({
          success: false,
          error: 'JWT_SECRET not configured',
        });
      }

      const token = jwt.sign(
        {
          userId,
          username,
          role,
          email: `${username}@test.omnivox.ai`,
        },
        secret,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        decoded: jwt.decode(token),
        expiresIn: '24h',
        warning: 'Debug-only token minting; never enable OMNIVOX_ALLOW_PUBLIC_DEBUG_ROUTES in production',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error generating test token:', error);
      res.status(500).json({ success: false, error: message });
    }
  });
}

export default router;
