/**
 * User Management API Routes - Complete CRUD Operations
 * Aligned with actual Prisma User schema and frontend requirements
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin dashboard
 * @access  Private (requires authentication)
 */
router.get('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    console.log('👥 Fetching all users...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isActive: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ Found ${users.length} users`);
    res.json(users);

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Private (requires authentication)
 */
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'AGENT', department, phoneNumber } = req.body;
    
    console.log('👤 Creating new user:', { name, email, role });

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Split name into firstName and lastName
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Generate username from email
    const username = email.split('@')[0];

    // Debug password before hashing
    console.log('🔍 Password details before hashing:');
    console.log('  - Raw password:', JSON.stringify(password));
    console.log('  - Password type:', typeof password);
    console.log('  - Password length:', password?.length || 0);
    console.log('  - Password chars:', password ? Array.from(String(password)).map((c: string) => c.charCodeAt(0)) : []);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Debug password after hashing
    console.log('🔍 Password after hashing:');
    console.log('  - Hashed password:', hashedPassword);
    console.log('  - Hash length:', hashedPassword.length);

    // Test the hash immediately after creation
    const testVerify = await bcrypt.compare(password, hashedPassword);
    console.log('🔍 Immediate hash verification test:', testVerify);
    
    if (!testVerify) {
      console.error('❌ CRITICAL: Hash verification failed immediately after creation!');
      return res.status(500).json({
        success: false,
        message: 'Password hashing verification failed'
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(), // Ensure email is stored in lowercase
        password: hashedPassword,
        firstName,
        lastName,
        name,
        role: role.toUpperCase(),
        isActive: true,
        status: 'away'
      }
    });

    console.log(`✅ User created successfully: ${user.name} (${user.role})`);

    res.status(201).json({
      success: true,
      message: `User ${user.name} created successfully`,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email or username already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update a user (Admin only)
 * @access  Private (requires authentication and admin role)
 */
router.put('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    console.log(`📝 Admin updating user ID: ${userId}`);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { 
      name, 
      email, 
      password, 
      role, 
      firstName, 
      lastName, 
      isActive, 
      status,
      department // Will be stored in preferences
    } = req.body;

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      // Check email uniqueness if changing
      if (email !== existingUser.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email }
        });
        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: 'A user with this email already exists'
          });
        }
      }
      updateData.email = email;
    }
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (role !== undefined) {
      if (!['ADMIN', 'MANAGER', 'AGENT', 'SUPERVISOR'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be ADMIN, MANAGER, AGENT, or SUPERVISOR'
        });
      }
      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (status !== undefined) updateData.status = status;
    if (department !== undefined) {
      // Note: department field doesn't exist in User schema - storing in preferences
      const preferences = existingUser.preferences ? JSON.parse(existingUser.preferences) : {};
      preferences.department = department;
      updateData.preferences = JSON.stringify(preferences);
    }

    // Handle password update with proper hashing
    if (password) {
      console.log('🔒 Hashing new password for user');
      updateData.password = await bcrypt.hash(password, 12);
    }

    updateData.updatedAt = new Date();

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isActive: true,
        status: true,
        preferences: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    console.log(`✅ User updated successfully: ${updatedUser.name} (${updatedUser.email})`);

    res.json({
      success: true,
      message: `User ${updatedUser.name} updated successfully`,
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user
 * @access  Private (requires authentication)
 */
router.delete('/:id', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    console.log(`🗑️ Deleting user ID: ${userId}`);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user with cascading deletes for related records
    // Updated: Fixed field name from assignedById to assignedBy (Dec 29, 2025)
    await prisma.$transaction(async (prisma) => {
      // Delete user campaign assignments first
      await prisma.userCampaignAssignment.deleteMany({
        where: { 
          OR: [
            { userId: userId },
            { assignedBy: userId }
          ]
        }
      });

      // Delete agent campaign assignments if user has agent record
      await prisma.agentCampaignAssignment.deleteMany({
        where: { agentId: userId.toString() }
      });

      // Delete agent record if exists
      await prisma.agent.deleteMany({
        where: { agentId: userId.toString() }
      });

      // Delete refresh tokens
      await prisma.refreshToken.deleteMany({
        where: { userId: userId }
      });

      // Delete email verifications
      await prisma.emailVerification.deleteMany({
        where: { userId: userId }
      });

      // Finally delete the user
      await prisma.user.delete({
        where: { id: userId }
      });
    });

    console.log(`✅ User deleted successfully: ${existingUser.name}`);

    res.json({
      success: true,
      message: `User ${existingUser.name} deleted successfully`
    });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/admin/users/stats
 * @desc    Get user statistics for admin dashboard
 * @access  Private (requires authentication)
 */
router.get('/stats', authenticate, requireRole('ADMIN', 'MANAGER'), async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching user statistics...');
    
    // Get total user count
    const totalUsers = await prisma.user.count();
    
    // Get active users (using isActive boolean from schema)
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    });
    
    // Calculate inactive users
    const inactiveUsers = totalUsers - activeUsers;
    
    // Get role distribution using actual role field from schema
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        _all: true,
      },
    });

    // Transform role stats to match frontend interface
    const byRole = {
      ADMIN: 0,
      MANAGER: 0,
      AGENT: 0,
      VIEWER: 0,
    };

    roleStats.forEach((stat) => {
      const roleName = stat.role.toUpperCase();
      if (roleName in byRole) {
        (byRole as any)[roleName] = stat._count._all;
      }
    });

    const response = {
      total: totalUsers,
      active: activeUsers,
      inactive: inactiveUsers,
      suspended: 0, // Not tracked in current schema
      byRole,
    };

    console.log('✅ User statistics fetched successfully:', response);
    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Error fetching user statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * @route   GET /api/users/my-campaigns
 * @desc    Get campaigns assigned to the authenticated user
 * @access  Private (requires authentication)
 */
router.get('/my-campaigns', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    console.log(`📋 Fetching campaigns for user ID: ${userId}`);

    // First, find if there's an agent record for this user
    let agent = await prisma.agent.findFirst({
      where: { agentId: userId } // Our system uses userId as agentId
    });

    console.log(`🔍 Agent lookup result for user ${userId}:`, agent ? `Found agent: ${agent.agentId}` : 'No agent found');

    if (!agent) {
      console.log(`📋 No agent record found for user ${userId}, returning empty campaigns`);
      // Return empty campaigns if no agent record exists
      res.json({
        success: true,
        data: []
      });
      return;
    }

    console.log(`📋 Found agent record for user ${userId}: agentId=${agent.agentId}`);

    // Get agent campaign assignments
    const agentWithCampaigns = await prisma.agent.findUnique({
      where: { agentId: userId },
      include: {
        campaignAssignments: {
          where: {
            isActive: true
          },
          include: {
            campaign: {
              select: {
                campaignId: true,
                name: true,
                description: true,
                status: true,
                isActive: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    console.log(`🔍 Agent campaign assignments query result:`, {
      found: !!agentWithCampaigns,
      assignmentCount: agentWithCampaigns?.campaignAssignments?.length || 0
    });

    if (!agentWithCampaigns) {
      console.log(`📋 No agent found in campaign assignments query for user ${userId}`);
      res.json({
        success: true,
        data: []
      });
      return;
    }

    // Extract campaigns from the assignments
    const campaigns = agentWithCampaigns.campaignAssignments.map(assignment => assignment.campaign);
    
    console.log(`🔍 Campaign details for user ${userId}:`, campaigns.map(c => ({
      campaignId: c.campaignId,
      name: c.name,
      status: c.status,
      isActive: c.isActive
    })));

    console.log(`✅ Found ${campaigns.length} campaigns for user ${userId}`);

    res.json({
      success: true,
      data: campaigns
    });

  } catch (error) {
    console.error('❌ Error fetching user campaigns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/admin/users/:userId/campaigns
 * @desc    Get campaigns assigned to a specific user (Admin only)
 * @access  Private (requires ADMIN role)
 */
router.get('/:userId/campaigns', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    console.log(`📋 Admin fetching campaigns for user ID: ${userId}`);

    // Get user with their campaign assignments
    const userWithCampaigns = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        campaignAssignments: {
          where: {
            isActive: true
          },
          include: {
            campaign: {
              select: {
                campaignId: true,
                name: true,
                description: true,
                status: true,
                isActive: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!userWithCampaigns) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Transform to match frontend expectations
    const assignments = userWithCampaigns.campaignAssignments.map(assignment => ({
      id: assignment.campaign.campaignId, // Frontend expects 'id' for unassign function
      campaignId: assignment.campaign.campaignId,
      name: assignment.campaign.name, // Frontend expects 'name' for display
      campaignName: assignment.campaign.name,
      campaignStatus: assignment.campaign.status,
      status: assignment.campaign.status,
      assignedAt: assignment.assignedAt
    }));

    console.log(`✅ Admin found ${assignments.length} campaign assignments for user ${userId}`);

    res.json({
      success: true,
      data: { assignments }
    });

  } catch (error) {
    console.error('❌ Error fetching user campaign assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign assignments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/admin/users/:userId/campaigns
 * @desc    Assign a campaign to a user (Admin only)
 * @access  Private (requires ADMIN role)
 */
router.post('/:userId/campaigns', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { campaignId, assignedBy } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!campaignId) {
      return res.status(400).json({
        success: false,
        message: 'Campaign ID is required'
      });
    }

    console.log(`🎯 Admin assigning campaign ${campaignId} to user ${userId}`);

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { campaignId }
    });
    
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userCampaignAssignment.findUnique({
      where: {
        userId_campaignId: {
          userId,
          campaignId
        }
      }
    });

    if (existingAssignment) {
      if (existingAssignment.isActive) {
        // Return existing assignment (idempotent)
        console.log(`✅ User ${userId} already assigned to campaign ${campaignId}`);
        return res.json({
          success: true,
          data: existingAssignment,
          message: 'User is already assigned to this campaign'
        });
      } else {
        // Reactivate existing assignment
        const reactivatedAssignment = await prisma.userCampaignAssignment.update({
          where: { id: existingAssignment.id },
          data: {
            isActive: true,
            assignedAt: new Date(),
            assignedBy: assignedBy || (req as any).user?.id
          }
        });

        console.log(`✅ Reactivated campaign assignment for user ${userId}, campaign ${campaignId}`);
        return res.json({
          success: true,
          data: reactivatedAssignment,
          message: 'Campaign assignment reactivated'
        });
      }
    }

    // Create new assignment
    const newAssignment = await prisma.userCampaignAssignment.create({
      data: {
        userId,
        campaignId,
        assignedBy: assignedBy || (req as any).user?.id,
        isActive: true
      }
    });

    console.log(`✅ Created new campaign assignment for user ${userId}, campaign ${campaignId}`);

    res.json({
      success: true,
      data: newAssignment,
      message: 'Campaign assigned successfully'
    });

  } catch (error) {
    console.error('❌ Error assigning campaign to user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign campaign to user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   DELETE /api/admin/users/:userId/campaigns/:campaignId
 * @desc    Unassign a campaign from a user (Admin only)
 * @access  Private (requires ADMIN role)
 */
router.delete('/:userId/campaigns/:campaignId', authenticate, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { campaignId } = req.params;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    console.log(`🗑️ Admin removing campaign ${campaignId} from user ${userId}`);

    // Find and deactivate the assignment
    const assignment = await prisma.userCampaignAssignment.findUnique({
      where: {
        userId_campaignId: {
          userId,
          campaignId
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Campaign assignment not found'
      });
    }

    // Deactivate the assignment instead of deleting
    await prisma.userCampaignAssignment.update({
      where: { id: assignment.id },
      data: { isActive: false }
    });

    console.log(`✅ Deactivated campaign assignment for user ${userId}, campaign ${campaignId}`);

    res.json({
      success: true,
      message: 'Campaign unassigned successfully'
    });

  } catch (error) {
    console.error('❌ Error unassigning campaign from user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unassign campaign from user',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/users/change-password
 * @desc    Change user's own password
 * @access  Private (requires authentication)
 */
router.post('/change-password', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { currentPassword, newPassword } = req.body;

    console.log(`🔑 User ${userId} attempting password change`);

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Get user from database (convert string ID to integer)
    const userIdInt = parseInt(userId.toString(), 10);
    const user = await prisma.user.findUnique({
      where: { id: userIdInt }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in database (using the integer ID)
    await prisma.user.update({
      where: { id: userIdInt },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Password changed successfully for user ${user.name} (${user.email})`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   PUT /api/users/profile
 * @desc    Update user's own profile
 * @access  Private (requires authentication)
 */
router.put('/profile', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { firstName, lastName, name, email, preferences } = req.body;

    console.log(`📝 User ${userId} updating profile`);
    console.log(`🔍 DEBUG - userId type: ${typeof userId}, value: ${JSON.stringify(userId)}`);

    // Validate user ID is provided
    if (!userId) {
      console.log('❌ DEBUG - userId is falsy:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Convert to integer for database lookup
    const userIdInt = parseInt(userId.toString(), 10);
    if (isNaN(userIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userIdInt }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prepare update data
    const updateData: any = {};

    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (name !== undefined) updateData.name = name;
    
    // Auto-generate name from firstName/lastName if both provided
    if (firstName && lastName) {
      updateData.name = `${firstName} ${lastName}`;
    }

    if (email !== undefined) {
      // Check email uniqueness if changing
      if (email !== currentUser.email) {
        const existingEmail = await prisma.user.findUnique({
          where: { email }
        });
        if (existingEmail) {
          return res.status(409).json({
            success: false,
            message: 'A user with this email already exists'
          });
        }
      }
      updateData.email = email;
      updateData.username = email; // Keep username in sync with email
    }

    if (preferences !== undefined) {
      updateData.preferences = typeof preferences === 'string' ? preferences : JSON.stringify(preferences);
    }

    updateData.updatedAt = new Date();

    // Update user profile (using integer ID)
    const updatedUser = await prisma.user.update({
      where: { id: userIdInt },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        isActive: true,
        status: true,
        preferences: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    console.log(`✅ Profile updated successfully for user ${updatedUser.name} (${updatedUser.email})`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('❌ Error updating profile:', error);
    
    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
