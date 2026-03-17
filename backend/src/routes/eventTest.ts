// Real-time Event System API Test Endpoint
import express from 'express';
import { Request, Response } from 'express';
import { eventManager } from '../services/eventManager';
import { campaignEvents, agentEvents, systemEvents } from '../utils/eventHelpers';

const router = express.Router();

// GET /api/events/stats - Get event system statistics
router.get('/stats', (req: Request, res: Response) => {
  try {
    const eventStats = eventManager.getStats();
    
    res.json({
      success: true,
      data: {
        eventSystem: eventStats,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('Error getting event system stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error getting event stats' }
    });
  }
});

// POST /api/events/test-emit - Test event emission
router.post('/test-emit', async (req: Request, res: Response) => {
  try {
    const { eventType = 'campaign', data = {} } = req.body;

    let eventId: string;
    
    switch (eventType) {
      case 'campaign':
        eventId = await campaignEvents.updated({
          campaignId: data.campaignId || 'test-campaign-001',
          campaignName: data.campaignName || 'Test Campaign',
          status: data.status || 'ACTIVE',
          ...data
        });
        break;
        
      case 'agent':
        eventId = await agentEvents.statusChanged({
          agentId: data.agentId || 'test-agent-001',
          agentName: data.agentName || 'Test Agent',
          status: data.status || 'available',
          ...data
        });
        break;
        
      case 'system':
        eventId = await systemEvents.alert({
          level: data.level || 'info',
          message: data.message || 'Test system event',
          component: 'event-test',
          ...data
        });
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid event type. Use: campaign, agent, or system' }
        });
    }

    res.json({
      success: true,
      data: {
        eventId,
        eventType,
        message: 'Test event emitted successfully'
      }
    });

  } catch (error) {
    console.error('Error emitting test event:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error emitting test event' }
    });
  }
});

// GET /api/events/subscribe/:room - Test room subscription
router.get('/subscribe/:room', (req: Request, res: Response) => {
  try {
    const { room } = req.params;
    const { eventTypes = 'system.alert,campaign.updated' } = req.query;
    
    const eventTypeList = typeof eventTypes === 'string' 
      ? eventTypes.split(',').map(s => s.trim())
      : ['system.alert', 'campaign.updated'];
    
    const subscriptionId = eventManager.subscribe({
      eventTypes: eventTypeList,
      rooms: [room],
    });

    res.json({
      success: true,
      data: {
        subscriptionId,
        room,
        eventTypes: eventTypeList,
        message: 'Subscription created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating test subscription:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error creating subscription' }
    });
  }
});

// DELETE /api/events/unsubscribe/:subscriptionId - Test unsubscription
router.delete('/unsubscribe/:subscriptionId', (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    
    const success = eventManager.unsubscribe(subscriptionId);

    if (success) {
      res.json({
        success: true,
        data: {
          subscriptionId,
          message: 'Subscription removed successfully'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: { message: 'Subscription not found' }
      });
    }

  } catch (error) {
    console.error('Error removing test subscription:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error removing subscription' }
    });
  }
});

export default router;