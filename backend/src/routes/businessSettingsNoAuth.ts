/**
 * TEMPORARY Business Settings Routes - No Auth for Testing
 * This is a temporary version without authentication for debugging
 */

import express from 'express';
import * as businessSettingsController from '../controllers/realBusinessSettingsController';

const router = express.Router();

// Temporarily disable authentication for debugging
// router.use(authenticateToken);
// router.use(requirePermission('settings.admin'));

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
 * GET /api/admin/business-settings/dashboard
 * Get cross-organization dashboard statistics
 */
router.get('/dashboard', businessSettingsController.getDashboardStats);

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
 * GET /api/admin/business-settings/organizations/:organizationId/users
 * Get users for organization
 */
router.get('/organizations/:organizationId/users', businessSettingsController.getOrganizationUsers);

/**
 * POST /api/admin/business-settings/organizations/:organizationId/users
 * Create user for organization
 */
router.post('/organizations/:organizationId/users', businessSettingsController.createOrganizationUser);

/**
 * PUT /api/admin/business-settings/organizations/:organizationId/permissions
 * Update organization permissions
 */
router.put('/organizations/:organizationId/permissions', businessSettingsController.updateOrganizationPermissions);

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