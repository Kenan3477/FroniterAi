/**
 * Business Settings Controller - Real database-driven organization management
 * Replaces mock business settings with actual database operations
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { realBusinessSettingsService } from '../services/realBusinessSettingsService';

// Validation schemas
const organizationCreateSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  email: z.string().email('Valid email is required for Super Admin'), // Required for Super Admin
  phone: z.string().optional(),
  website: z.string().optional().transform((val) => {
    if (!val || val === '') return '';
    // Auto-prepend https:// if no protocol is provided
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      return `https://${val}`;
    }
    return val;
  }),
  timezone: z.string().optional(),
  currency: z.string().optional(),
  primaryColor: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional()
});

const organizationUpdateSchema = organizationCreateSchema.partial();

const queryFiltersSchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
  page: z.string().transform(str => parseInt(str) || 1).optional(),
  limit: z.string().transform(str => parseInt(str) || 20).optional()
});

/**
 * Get business settings statistics
 */
export const getBusinessStats = async (req: Request, res: Response) => {
  try {
    console.log('📊 Getting business settings statistics');

    const stats = await realBusinessSettingsService.getBusinessStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting business stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch business statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

/**
 * Get all organizations
 */
export const getOrganizations = async (req: Request, res: Response) => {
  try {
    console.log('🏢 Getting organizations with filters:', req.query);

    const filters = queryFiltersSchema.parse(req.query);
    const result = await realBusinessSettingsService.getOrganizations(filters);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error fetching organizations:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid query parameters',
          details: error.errors
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch organizations',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Get organization by ID
 */
export const getOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🏢 Getting organization: ${id}`);

    const organization = await realBusinessSettingsService.getOrganization(id);

    res.json({
      success: true,
      data: {
        organization
      }
    });

  } catch (error) {
    console.error('❌ Error fetching organization:', error);
    
    if (error instanceof Error && error.message === 'Organization not found') {
      res.status(404).json({
        success: false,
        error: { message: 'Organization not found' }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch organization',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Create new organization
 */
export const createOrganization = async (req: Request, res: Response) => {
  try {
    console.log('🏢 Creating new organization:', req.body);

    const orgData = organizationCreateSchema.parse(req.body);
    const result = await realBusinessSettingsService.createOrganization(orgData as any);

    res.status(201).json({
      success: true,
      message: 'Organization and Super Admin created successfully',
      data: {
        organization: result.organization,
        superAdmin: result.superAdmin,
        emailSent: result.emailSent
      }
    });

  } catch (error) {
    console.error('❌ Error creating organization:', error);
    
    if (error instanceof z.ZodError) {
      console.error('❌ Validation errors:', error.errors);
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid organization data',
          details: error.errors,
          validationErrors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      });
    } else if (error instanceof Error) {
      console.error('❌ Business logic error:', error.message);
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          type: 'BusinessLogicError'
        }
      });
    } else {
      console.error('❌ Unknown error:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create organization',
          details: error instanceof Error ? error.message : 'Unknown error',
          type: 'UnknownError'
        }
      });
    }
  }
};

/**
 * Update organization
 */
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🏢 Updating organization: ${id}`, req.body);

    const orgData = organizationUpdateSchema.parse(req.body);
    const organization = await realBusinessSettingsService.updateOrganization(id, orgData);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization }
    });

  } catch (error) {
    console.error('❌ Error updating organization:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid organization data',
          details: error.errors
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update organization',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
};

/**
 * Delete organization
 */
export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🏢 Deleting organization: ${id}`);

    await realBusinessSettingsService.deleteOrganization(id);

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting organization:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete organization',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

/**
 * Get organization business settings
 */
export const getOrganizationSettings = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`⚙️ Getting business settings for organization: ${id}`);

    const settings = await realBusinessSettingsService.getBusinessSettings(id);

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('❌ Error fetching business settings:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch business settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

/**
 * Get organization company profiles
 */
export const getOrganizationProfiles = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🏢 Getting company profiles for organization: ${id}`);

    const profiles = await realBusinessSettingsService.getCompanyProfiles(id);

    res.json({
      success: true,
      data: profiles
    });

  } catch (error) {
    console.error('❌ Error fetching company profiles:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch company profiles',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};