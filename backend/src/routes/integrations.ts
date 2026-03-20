import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getIntegrations,
  toggleIntegration,
  configureStripe
} from '../controllers/integrationController';

const router = express.Router();

// Get all integrations for organization
router.get('/', authenticate, getIntegrations);

// Toggle integration enabled status
router.post('/:integrationName/toggle', authenticate, toggleIntegration);

// Configure specific integrations
router.post('/stripe/configure', authenticate, configureStripe);

export default router;