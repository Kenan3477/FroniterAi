/**
 * Omnivox AI Multi-Tenant Flow Management Routes
 * API endpoints for organization-based flow management, sharing, and analytics
 */

import express from 'express';
import {
  getOrganizationFlows,
  createFlowTemplate,
  createFlowFromTemplate,
  shareFlow,
  grantFlowPermission,
  getFlowPermissions,
  revokeFlowPermission,
  getOrganizationAnalytics,
  getSharedFlows,
  getMultiTenantDashboard,
  getUserOrganizations
} from '../controllers/multiTenantFlow';

const router = express.Router();

// Organization-based flow management
router.get('/organizations', getUserOrganizations);
router.get('/organizations/:organizationId/flows', getOrganizationFlows);
router.get('/organizations/:organizationId/shared-flows', getSharedFlows);
router.get('/organizations/:organizationId/analytics', getOrganizationAnalytics);

// Flow templates
router.post('/organizations/:organizationId/templates', createFlowTemplate);
router.post('/organizations/:organizationId/flows/from-template', createFlowFromTemplate);

// Flow sharing
router.post('/flows/:flowId/share', shareFlow);

// Flow permissions
router.get('/flows/:flowId/permissions', getFlowPermissions);
router.post('/flows/:flowId/permissions', grantFlowPermission);
router.delete('/permissions/:permissionId', revokeFlowPermission);

// Dashboard and overview
router.get('/dashboard', getMultiTenantDashboard);

export default router;