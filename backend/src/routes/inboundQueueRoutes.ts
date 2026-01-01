import express from 'express';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

interface InboundQueueData {
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  assignedAgents?: string; // JSON string of agent IDs
  businessHoursEnabled: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: string;
  timezone?: string;
  maxQueueSize?: number;
  overflowAction: string;
  overflowDestination?: string;
  outOfHoursAction: string;
  outOfHoursDestination?: string;
  holdMusicUrl?: string;
  welcomeMessageUrl?: string;
  estimatedWaitUrl?: string;
  ringStrategy: string;
  callTimeout: number;
  maxWaitTime: number;
  priority: number;
  skillTags?: string; // JSON string of skill tags
}

// GET /api/voice/inbound-queues - Get all inbound queues
router.get('/inbound-queues', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('📋 Fetching inbound queues...');

    const queues = await prisma.inboundQueue.findMany({
      orderBy: [
        { priority: 'desc' },
        { name: 'asc' }
      ],
      include: {
        inboundNumbers: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true
          }
        }
      }
    });

    // Parse JSON fields for response
    const transformedQueues = queues.map((queue: any) => ({
      ...queue,
      assignedAgents: queue.assignedAgents ? JSON.parse(queue.assignedAgents) : [],
      skillTags: queue.skillTags ? JSON.parse(queue.skillTags) : [],
      inboundNumbersCount: queue.inboundNumbers.length
    }));

    console.log(`✅ Found ${queues.length} inbound queues`);

    res.json({
      success: true,
      data: transformedQueues
    });

  } catch (error) {
    console.error('❌ Error fetching inbound queues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inbound queues',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/voice/inbound-queues - Create new inbound queue
router.post('/inbound-queues', authenticate, async (req: Request, res: Response) => {
  try {
    console.log('➕ Creating new inbound queue...');
    const queueData: InboundQueueData = req.body;

    // Validate required fields
    if (!queueData.name || !queueData.displayName) {
      return res.status(400).json({
        success: false,
        error: 'Name and display name are required'
      });
    }

    // Check if queue name already exists
    const existingQueue = await prisma.inboundQueue.findUnique({
      where: { name: queueData.name }
    });

    if (existingQueue) {
      return res.status(400).json({
        success: false,
        error: 'Queue name already exists'
      });
    }

    // Create the queue
    const newQueue = await prisma.inboundQueue.create({
      data: {
        name: queueData.name,
        displayName: queueData.displayName,
        description: queueData.description,
        isActive: queueData.isActive ?? true,
        assignedAgents: queueData.assignedAgents ? JSON.stringify(queueData.assignedAgents) : null,
        businessHoursEnabled: queueData.businessHoursEnabled ?? true,
        businessHoursStart: queueData.businessHoursStart || "09:00",
        businessHoursEnd: queueData.businessHoursEnd || "17:00",
        businessDays: queueData.businessDays || "Monday,Tuesday,Wednesday,Thursday,Friday",
        timezone: queueData.timezone || "Europe/London",
        maxQueueSize: queueData.maxQueueSize || 50,
        overflowAction: queueData.overflowAction || "voicemail",
        overflowDestination: queueData.overflowDestination,
        outOfHoursAction: queueData.outOfHoursAction || "voicemail",
        outOfHoursDestination: queueData.outOfHoursDestination,
        holdMusicUrl: queueData.holdMusicUrl,
        welcomeMessageUrl: queueData.welcomeMessageUrl,
        estimatedWaitUrl: queueData.estimatedWaitUrl,
        ringStrategy: queueData.ringStrategy || "round_robin",
        callTimeout: queueData.callTimeout || 30,
        maxWaitTime: queueData.maxWaitTime || 300,
        priority: queueData.priority || 1,
        skillTags: queueData.skillTags ? JSON.stringify(queueData.skillTags) : null
      }
    });

    console.log(`✅ Created inbound queue: ${newQueue.name}`);

    res.status(201).json({
      success: true,
      data: {
        ...newQueue,
        assignedAgents: newQueue.assignedAgents ? JSON.parse(newQueue.assignedAgents) : [],
        skillTags: newQueue.skillTags ? JSON.parse(newQueue.skillTags) : []
      }
    });

  } catch (error) {
    console.error('❌ Error creating inbound queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create inbound queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/voice/inbound-queues/:id - Update inbound queue
router.put('/inbound-queues/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const queueData: Partial<InboundQueueData> = req.body;

    console.log(`📝 Updating inbound queue: ${id}`);

    // Check if queue exists
    const existingQueue = await prisma.inboundQueue.findUnique({
      where: { id }
    });

    if (!existingQueue) {
      return res.status(404).json({
        success: false,
        error: 'Inbound queue not found'
      });
    }

    // If name is being updated, check for conflicts
    if (queueData.name && queueData.name !== existingQueue.name) {
      const nameConflict = await prisma.inboundQueue.findUnique({
        where: { name: queueData.name }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          error: 'Queue name already exists'
        });
      }
    }

    // Update the queue
    const updatedQueue = await prisma.inboundQueue.update({
      where: { id },
      data: {
        ...(queueData.name && { name: queueData.name }),
        ...(queueData.displayName && { displayName: queueData.displayName }),
        ...(queueData.description !== undefined && { description: queueData.description }),
        ...(queueData.isActive !== undefined && { isActive: queueData.isActive }),
        ...(queueData.assignedAgents !== undefined && { 
          assignedAgents: queueData.assignedAgents ? JSON.stringify(queueData.assignedAgents) : null 
        }),
        ...(queueData.businessHoursEnabled !== undefined && { businessHoursEnabled: queueData.businessHoursEnabled }),
        ...(queueData.businessHoursStart && { businessHoursStart: queueData.businessHoursStart }),
        ...(queueData.businessHoursEnd && { businessHoursEnd: queueData.businessHoursEnd }),
        ...(queueData.businessDays && { businessDays: queueData.businessDays }),
        ...(queueData.timezone && { timezone: queueData.timezone }),
        ...(queueData.maxQueueSize !== undefined && { maxQueueSize: queueData.maxQueueSize }),
        ...(queueData.overflowAction && { overflowAction: queueData.overflowAction }),
        ...(queueData.overflowDestination !== undefined && { overflowDestination: queueData.overflowDestination }),
        ...(queueData.outOfHoursAction && { outOfHoursAction: queueData.outOfHoursAction }),
        ...(queueData.outOfHoursDestination !== undefined && { outOfHoursDestination: queueData.outOfHoursDestination }),
        ...(queueData.holdMusicUrl !== undefined && { holdMusicUrl: queueData.holdMusicUrl }),
        ...(queueData.welcomeMessageUrl !== undefined && { welcomeMessageUrl: queueData.welcomeMessageUrl }),
        ...(queueData.estimatedWaitUrl !== undefined && { estimatedWaitUrl: queueData.estimatedWaitUrl }),
        ...(queueData.ringStrategy && { ringStrategy: queueData.ringStrategy }),
        ...(queueData.callTimeout !== undefined && { callTimeout: queueData.callTimeout }),
        ...(queueData.maxWaitTime !== undefined && { maxWaitTime: queueData.maxWaitTime }),
        ...(queueData.priority !== undefined && { priority: queueData.priority }),
        ...(queueData.skillTags !== undefined && { 
          skillTags: queueData.skillTags ? JSON.stringify(queueData.skillTags) : null 
        })
      }
    });

    console.log(`✅ Updated inbound queue: ${updatedQueue.name}`);

    res.json({
      success: true,
      data: {
        ...updatedQueue,
        assignedAgents: updatedQueue.assignedAgents ? JSON.parse(updatedQueue.assignedAgents) : [],
        skillTags: updatedQueue.skillTags ? JSON.parse(updatedQueue.skillTags) : []
      }
    });

  } catch (error) {
    console.error('❌ Error updating inbound queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update inbound queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/voice/inbound-queues/:id - Delete inbound queue
router.delete('/inbound-queues/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🗑️ Deleting inbound queue: ${id}`);

    // Check if queue exists
    const existingQueue = await prisma.inboundQueue.findUnique({
      where: { id },
      include: {
        inboundNumbers: true
      }
    });

    if (!existingQueue) {
      return res.status(404).json({
        success: false,
        error: 'Inbound queue not found'
      });
    }

    // Check if queue is still in use by inbound numbers
    if (existingQueue.inboundNumbers.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete queue that is still assigned to inbound numbers',
        inUseBy: existingQueue.inboundNumbers.map(num => num.phoneNumber)
      });
    }

    // Delete the queue
    await prisma.inboundQueue.delete({
      where: { id }
    });

    console.log(`✅ Deleted inbound queue: ${existingQueue.name}`);

    res.json({
      success: true,
      message: 'Inbound queue deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting inbound queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete inbound queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/voice/inbound-queues/:id - Get specific inbound queue
router.get('/inbound-queues/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🔍 Fetching inbound queue: ${id}`);

    const queue = await prisma.inboundQueue.findUnique({
      where: { id },
      include: {
        inboundNumbers: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true
          }
        }
      }
    });

    if (!queue) {
      return res.status(404).json({
        success: false,
        error: 'Inbound queue not found'
      });
    }

    console.log(`✅ Found inbound queue: ${queue.name}`);

    res.json({
      success: true,
      data: {
        ...queue,
        assignedAgents: queue.assignedAgents ? JSON.parse(queue.assignedAgents) : [],
        skillTags: queue.skillTags ? JSON.parse(queue.skillTags) : []
      }
    });

  } catch (error) {
    console.error('❌ Error fetching inbound queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inbound queue',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;