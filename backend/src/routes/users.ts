/**
 * User Management API Routes
 * Complete CRUD operations for user management with RBAC
 * Updated to match       data: campaignIds.map((campaignId: string) => ({
        userId,
        campaignId,
        role: 'AGENT', // Default role
        assignmentType: 'FULL', // Default assignment type
        isActive: true,
      }))
    });
  }risma schema
 */

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { rateLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// TYPES AND INTERFACES  
// ============================================================================

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  department?: string;
  phoneNumber?: string;
  campaignAccess?: string[]; // Array of campaign IDs
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  department?: string;
  phoneNumber?: string;
  campaignAccess?: string[];
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  department: string | null;
  phoneNumber: string | null;
  lastLoginAt: Date | null;
  isActive: boolean;
  campaignAccess: string[];
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ROLE-BASED PERMISSIONS
// ============================================================================

const ROLE_PERMISSIONS = {
  ADMIN: [
    'users.create', 'users.read', 'users.update', 'users.delete',
    'campaigns.create', 'campaigns.read', 'campaigns.update', 'campaigns.delete',
    'analytics.read', 'analytics.export',
    'system.configure', 'system.monitor',
    'integrations.manage', 'api.manage'
  ],
  MANAGER: [
    'users.create', 'users.read', 'users.update',
    'campaigns.create', 'campaigns.read', 'campaigns.update',
    'analytics.read', 'analytics.export',
    'reports.create', 'reports.read'
  ],
  AGENT: [
    'campaigns.read',
    'contacts.read', 'contacts.update',
    'calls.make', 'calls.answer',
    'dashboard.read'
  ],
  VIEWER: [
    'campaigns.read',
    'analytics.read',
    'dashboard.read'
  ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRolePermissions(role: string): string[] {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
}

async function getUserCampaignAccess(userId: string): Promise<string[]> {
  const campaignAccess = await prisma.campaignAssignment.findMany({
    where: { userId, isActive: true },
    select: { campaignId: true }
  });
  return campaignAccess.map((access: any) => access.campaignId);
}

async function setCampaignAccess(userId: string, campaignIds: string[]): Promise<void> {
  // Remove existing access
  await prisma.campaignAssignment.deleteMany({
    where: { userId }
  });

  // Add new access
  if (campaignIds.length > 0) {
    await prisma.campaignAssignment.createMany({
      data: campaignIds.map((campaignId: string) => ({
        userId,
        campaignId,
        role: 'AGENT',
        assignmentType: 'FULL',
        isActive: true
      }))
    });
  }
}

function formatUserResponse(user: any): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    department: user.department,
    phoneNumber: user.phoneNumber,
    lastLoginAt: user.lastLoginAt,
    isActive: user.status === 'ACTIVE',
    campaignAccess: user.campaignAccess || [],
    permissions: getRolePermissions(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin/Manager
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          campaignAssignments: {
            where: { isActive: true },
            select: { campaignId: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const campaignIds = user.campaignAssignments.map((access: any) => access.campaignId);
        return formatUserResponse({
          ...user,
          campaignAccess: campaignIds
        });
      })
    );

    res.json({
      success: true,
      data: {
        users: usersWithDetails,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin/Manager/Self
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = id; // Use string ID directly

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const campaignIds = await getUserCampaignAccess(userId);
    const userResponse = formatUserResponse({
      ...user,
      campaignAccess: campaignIds
    });

    res.json({
      success: true,
      data: userResponse
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Admin/Manager
 */
router.post('/', rateLimiter, async (req: Request, res: Response) => {
  try {
    const userData: CreateUserRequest = req.body;

    // Validate required fields
    if (!userData.name || !userData.email || !userData.password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || 'AGENT',
        status: userData.status || 'ACTIVE',
        department: userData.department,
        phoneNumber: userData.phoneNumber
      }
    });

    // Set campaign access if provided
    if (userData.campaignAccess && userData.campaignAccess.length > 0) {
      await setCampaignAccess(user.id, userData.campaignAccess);
    }

    // Get campaign access for response
    const campaignAccess = await getUserCampaignAccess(user.id);
    const userResponse = formatUserResponse({
      ...user,
      campaignAccess
    });

    console.log(`✅ User created: ${user.name} (${user.role})`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin/Manager/Self
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for email conflicts (if email is being updated)
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
    }

    // Prepare update fields
    const updateFields: any = {};
    if (updateData.name) updateFields.name = updateData.name;
    if (updateData.email) updateFields.email = updateData.email;
    if (updateData.role) updateFields.role = updateData.role;
    if (updateData.status) updateFields.status = updateData.status;
    if (updateData.department !== undefined) updateFields.department = updateData.department;
    if (updateData.phoneNumber !== undefined) updateFields.phoneNumber = updateData.phoneNumber;

    // Hash new password if provided
    if (updateData.password) {
      updateFields.password = await bcrypt.hash(updateData.password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: updateFields
    });

    // Update campaign access if provided
    if (updateData.campaignAccess !== undefined) {
      await setCampaignAccess(user.id, updateData.campaignAccess);
    }

    const campaignAccess = await getUserCampaignAccess(user.id);
    const userResponse = formatUserResponse({
      ...user,
      campaignAccess
    });

    console.log(`✅ User updated: ${user.name} (${user.role})`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete by setting status to INACTIVE)
 * @access  Admin
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete by setting status to INACTIVE
    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    console.log(`🔒 User deactivated: ${user.name}`);

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/users/:id/activate
 * @desc    Activate/Deactivate user
 * @access  Admin/Manager
 */
router.post('/:id/activate', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const status = active ? 'ACTIVE' : 'INACTIVE';

    const user = await prisma.user.update({
      where: { id },
      data: { status }
    });

    console.log(`${active ? '✅' : '🔒'} User ${active ? 'activated' : 'deactivated'}: ${user.name}`);

    res.json({
      success: true,
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: user.id,
        name: user.name,
        status: user.status,
        isActive: user.status === 'ACTIVE'
      }
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/users/:id/campaigns
 * @desc    Get user's campaign access
 * @access  Admin/Manager/Self
 */
router.get('/:id/campaigns', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        campaignAssignments: {
          where: { isActive: true },
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const campaignAccessData = user.campaignAssignments.map((access: any) => ({
      campaignId: access.campaignId,
      accessType: access.accessType,
      assignedAt: access.assignedAt,
      campaign: access.campaign
    }));

    res.json({
      success: true,
      data: {
        userId: user.id,
        userName: user.name,
        campaignAccess: campaignAccessData
      }
    });

  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user campaigns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/users/:id/campaigns
 * @desc    Set user's campaign access
 * @access  Admin/Manager
 */
router.post('/:id/campaigns', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { campaignIds } = req.body;

    if (!Array.isArray(campaignIds)) {
      return res.status(400).json({
        success: false,
        message: 'campaignIds must be an array'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Set campaign access
    await setCampaignAccess(id, campaignIds);

    // Get updated campaign access
    const campaignAccess = await getUserCampaignAccess(id);

    console.log(`✅ Campaign access updated for user ${user.name}: ${campaignIds.length} campaigns`);

    res.json({
      success: true,
      message: 'Campaign access updated successfully',
      data: {
        userId: id,
        userName: user.name,
        campaignAccess
      }
    });

  } catch (error) {
    console.error('Error setting user campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set user campaigns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Admin/Manager
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      usersByRole,
      recentLogins
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    const roleStats = usersByRole.reduce((acc, item) => {
      acc[item.role] = item._count.role;
      return acc;
    }, {} as Record<string, number>);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        recentLogins,
        roleDistribution: roleStats,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;