import express from 'express';
import { authenticateToken } from '../middleware/enhancedAuth';
import {
  getIntegrations,
  toggleIntegration,
  configureStripe
} from '../controllers/integrationController';

const router = express.Router();

// Get all integrations for organization
router.get('/', authenticateToken, getIntegrations);

// Toggle integration enabled status
router.post('/:integrationName/toggle', authenticateToken, toggleIntegration);

// Configure specific integrations
router.post('/stripe/configure', authenticateToken, configureStripe);

export default router;