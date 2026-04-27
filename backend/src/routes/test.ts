import express from 'express';
import { prisma } from '../database';
import { ensureBasicAgents } from '../utils/ensureBasicAgents';
import jwt from 'jsonwebtoken';

const router = express.Router();

/**
 * POST /api/test/create-agents
 * Create system agents for testing
 */
router.post('/create-agents', async (req, res) => {
  try {
    console.log('🔧 Manual trigger: Creating system agents...');
    await ensureBasicAgents();
    
    const agentCount = await prisma.agent.count();
    console.log(`📊 Total agents after creation: ${agentCount}`);
    
    const agents = await prisma.agent.findMany({
      select: { agentId: true, firstName: true, lastName: true, status: true }
    });
    
    res.json({
      success: true,
      message: 'System agents created successfully',
      agentCount: agentCount,
      agents: agents
    });
  } catch (error: any) {
    console.error('❌ Error creating system agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/check-database
 * Check database contents for debugging
 */
router.get('/check-database', async (req, res) => {
  try {
    const stats = {
      agents: await prisma.agent.count(),
      campaigns: await prisma.campaign.count(),
      contacts: await prisma.contact.count(),
      callRecords: await prisma.callRecord.count(),
      recordings: await prisma.recording.count()
    };
    
    const recentCallRecords = await prisma.callRecord.findMany({
      take: 5,
      orderBy: { startTime: 'desc' },
      include: {
        contact: { select: { firstName: true, lastName: true, phone: true } },
        campaign: { select: { name: true } }
      }
    });
    
    res.json({
      success: true,
      stats,
      recentCallRecords
    });
  } catch (error: any) {
    console.error('❌ Error checking database:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test/get-token
 * Generate a test JWT token for diagnostic purposes
 * SECURITY: This should be removed in production or require admin auth
 */
router.post('/get-token', async (req, res) => {
  try {
    const { userId = 509, username = 'test', role = 'ADMIN' } = req.body;
    
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({
        success: false,
        error: 'JWT_SECRET not configured'
      });
    }
    
    const token = jwt.sign(
      {
        userId,
        username,
        role,
        email: `${username}@test.omnivox.ai`
      },
      secret,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      decoded: jwt.decode(token),
      expiresIn: '24h',
      warning: '⚠️  This is a test endpoint - remove in production'
    });
  } catch (error: any) {
    console.error('❌ Error generating test token:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;