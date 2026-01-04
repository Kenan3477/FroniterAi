import { Router } from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { agentService, CreateAgentRequest } from '../services/agentService';

const router = Router();
const prisma = new PrismaClient();

// POST /api/agents - Create or get agent record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { agentId, firstName, lastName, email, status = 'OFFLINE' } = req.body;

    if (!agentId || !firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        message: 'agentId, firstName, lastName, and email are required'
      });
    }

    const createRequest: CreateAgentRequest = {
      agentId,
      firstName,
      lastName,
      email,
      status: status as any,
      maxConcurrentCalls: 1
    };

    const agent = await agentService.createAgent(createRequest);

    res.status(200).json({
      success: true,
      data: agent,
      message: 'Agent created/updated successfully'
    });

  } catch (error: any) {
    console.error('Error creating agent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create agent',
      error: error.message
    });
  }
});

// GET /api/agents/queue - Get agents queue with real database data
router.get('/queue', async (req: Request, res: Response) => {
  try {
    const queueMetrics = await agentService.getQueueMetrics();
    const agents = await agentService.getAllAgentsWithStats();
    
    res.json({
      success: true,
      data: {
        queue: {
          waiting: queueMetrics.waiting,
          active: queueMetrics.active,
          paused: queueMetrics.paused,
          total: queueMetrics.total
        },
        agents: agents.map(agent => ({
          id: agent.agentId,
          name: agent.name,
          status: agent.status.toLowerCase(),
          skills: agent.skills,
          currentCall: agent.currentCall || null,
          sessionDuration: agent.sessionStartTime ? 
            Math.floor((Date.now() - agent.sessionStartTime.getTime()) / 1000) : 0,
          callsToday: agent.callsToday
        })),
        metrics: queueMetrics.metrics
      }
    });
  } catch (error) {
    console.error('Agents queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agents queue'
    });
  }
});

export default router;
