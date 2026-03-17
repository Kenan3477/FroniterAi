import { Router } from 'express';
import {
  getIntegrations,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  getConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  getWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getIntegrationStats
} from '../controllers/integrations';

const router = Router();

// Integration management routes
router.get('/integrations', getIntegrations);
router.post('/integrations', createIntegration);
router.put('/integrations/:id', updateIntegration);
router.delete('/integrations/:id', deleteIntegration);

// Connection management routes
router.get('/connections', getConnections);
router.post('/connections', createConnection);
router.put('/connections/:id', updateConnection);
router.delete('/connections/:id', deleteConnection);

// Webhook management routes
router.get('/webhooks', getWebhooks);
router.post('/webhooks', createWebhook);
router.put('/webhooks/:id', updateWebhook);
router.delete('/webhooks/:id', deleteWebhook);

// Statistics
router.get('/stats', (req, res, next) => {
  console.log('Integration stats route hit');
  getIntegrationStats(req, res);
});

export default router;