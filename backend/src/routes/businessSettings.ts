/**
 * Business Settings Routes - Real database-driven organization management
 * Updated to use actual database operations instead of mock data
 */

import express from 'express';
import * as businessSettingsController from '../controllers/realBusinessSettingsController';
import { authenticateToken, requirePermission } from '../middleware/enhancedAuth';

const router = express.Router();

// Apply enhanced authentication and admin permissions
router.use(authenticateToken);
router.use(requirePermission('settings.admin'));

/**
 * GET /api/admin/business-settings/stats
 * Get business settings statistics
 */
router.get('/stats', businessSettingsController.getBusinessStats);

/**
 * GET /api/admin/business-settings/organizations
 * Get all organizations with filtering and pagination
 */
router.get('/organizations', businessSettingsController.getOrganizations);

/**
 * GET /api/admin/business-settings/organizations/:id
 * Get organization by ID
 */
router.get('/organizations/:id', businessSettingsController.getOrganization);

/**
 * POST /api/admin/business-settings/organizations
 * Create new organization
 */
router.post('/organizations', businessSettingsController.createOrganization);

/**
 * PUT /api/admin/business-settings/organizations/:id
 * Update organization
 */
router.put('/organizations/:id', businessSettingsController.updateOrganization);

/**
 * DELETE /api/admin/business-settings/organizations/:id
 * Delete organization
 */
router.delete('/organizations/:id', businessSettingsController.deleteOrganization);

/**
 * GET /api/admin/business-settings/organizations/:id/settings
 * Get business settings for organization
 */
router.get('/organizations/:id/settings', businessSettingsController.getOrganizationSettings);

/**
 * GET /api/admin/business-settings/organizations/:id/profiles
 * Get company profiles for organization
 */
router.get('/organizations/:id/profiles', businessSettingsController.getOrganizationProfiles);

export default router;
