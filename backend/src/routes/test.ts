import express from 'express';
import { prisma } from '../database';
import { ensureBasicAgents } from '../utils/ensureBasicAgents';

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

export default router;