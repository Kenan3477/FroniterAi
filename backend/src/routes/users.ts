/**
 * User Management API Routes - Complete CRUD Operations
 * Aligned with actual Prisma User schema and frontend requirements
 */

import express, { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { organizationAwareAuth, getOrganizationFilter } from '../middleware/enhancedAuth';
import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';
const router = express.Router();
/**
 * @route   GET /api/users/my-inbound-queues
 * @desc    Get inbound call queues assigned to the current agent
 * @access  Private
 * NOTE: Inbound queue management is not yet fully implemented — returns empty array
 */
router.get('/my-inbound-queues', authenticate, async (req: Request, res: Response) => {
  try {
    // Inbound queue assignment is a future capability.
    // Return an empty array so the frontend degrades gracefully.
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('❌ Error fetching inbound queues:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inbound queues',
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin dashboard (organization-scoped)
 * @access  Private (requires authentication)
 */
router.get('/', authenticate, requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    console.log('👥 User requesting users:', { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      organizationId: user.organizationId 
    });
    
    // ✅ SYSTEM CREATOR OVERRIDE: As the system creator, you should see ALL users
    // For organization users (excluding system creator), show only users in their organization
    let whereClause = {};
    
    // Only apply organization filter if user has an organization AND is not ADMIN with null org (system creator)
    if (user.organizationId && user.role !== 'SUPER_ADMIN') {
      whereClause = { organizationId: user.organizationId };
      console.log('👥 Filtering by organization:', user.organizationId);
    } else {
      console.log('👥 Showing ALL users (SUPER_ADMIN, ADMIN with no org, or system creator)');
    }
    
    const users = await prisma.user.findMany({
      where: whereClause,
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
      } as any,
      orderBy: {
        createdAt: 'desc'
      }
    });

    // ✅ Normalize data for frontend
    const normalizedUsers = users.map(u => {
      return {
        ...u,
        // Ensure name is always present (fallback to firstName + lastName or email)
        name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        // Normalize status to uppercase for consistency
        status: u.status ? String(u.status).toUpperCase() : (u.isActive ? 'ACTIVE' : 'INACTIVE')
      };
    });

    console.log(`✅ Found ${normalizedUsers.length} users (normalized for frontend)`);
    res.json(normalizedUsers);

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
 * @access  Private (requires authentication - ADMIN or MANAGER role)
 */
router.post('/', authenticate, requireRole('ADMIN', 'MANAGER', 'SUPER_ADMIN'), async (req: Request, res: Response) => {
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

    // ✅ FIX: Username is the full email address (not just prefix)
    // This allows users to log in with their email from any whitelisted IP
    const username = email.toLowerCase().trim();
    
    console.log(`📝 Using email as username: ${username}`);

    // Check for email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

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
        username: username, // ✅ FIXED: Use full email as username
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
    
    // Handle Prisma unique constraint violations
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      const target = (error as any).meta?.target;
      if (target?.includes('email')) {
        return res.status(409).json({
          success: false,
          message: 'A user with this email already exists'
        });
      } else if (target?.includes('username')) {
        return res.status(409).json({
          success: false,
          message: 'This username is already taken'
        });
      } else {
        return res.status(409).json({
          success: false,
          message: 'A user with these details already exists'
        });
      }
    }

    // Handle other unique constraint violations (legacy check)
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

    // TEMPORARY DEBUG: Return user data to debug instead of failing
    if (!userId) {
      console.log('❌ DEBUG - userId is falsy:', userId);
      return res.json({
        success: false,
        debug: true,
        message: 'Debug - Invalid user ID',
        data: {
          receivedUserId: userId,
          userIdType: typeof userId,
          hasReqUser: !!(req as any).user,
          fullUser: (req as any).user,
          requestBody: req.body
        }
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

    // ✅ ENHANCED: Comprehensive cascading delete with detailed logging
    // Ensures all related records are properly cleaned up or unlinked
    await prisma.$transaction(async (prisma) => {
      console.log(`🗑️ Starting cascading delete for user ${userId} (${existingUser.name})...`);
      
      // 1. Delete user campaign assignments
      const campaignAssignments = await prisma.userCampaignAssignment.deleteMany({
        where: { 
          OR: [
            { userId: userId },
            { assignedBy: userId }
          ]
        }
      });
      console.log(`  ✅ Deleted ${campaignAssignments.count} user campaign assignments`);

      // 2. Delete agent campaign assignments if user has agent record
      const agentCampaignAssignments = await prisma.agentCampaignAssignment.deleteMany({
        where: { agentId: userId.toString() }
      });
      console.log(`  ✅ Deleted ${agentCampaignAssignments.count} agent campaign assignments`);

      // 3. Delete agent record if exists
      const agents = await prisma.agent.deleteMany({
        where: { agentId: userId.toString() }
      });
      console.log(`  ✅ Deleted ${agents.count} agent records`);

      // 4. Unlink call records (set agentId to null instead of deleting calls)
      // This preserves call history for reporting while removing user reference
      const callRecords = await prisma.callRecord.updateMany({
        where: { agentId: userId.toString() },
        data: { agentId: null }
      });
      console.log(`  ✅ Unlinked ${callRecords.count} call records (preserved for history)`);

      // 5. Delete refresh tokens
      const refreshTokens = await prisma.refreshToken.deleteMany({
        where: { userId: userId }
      });
      console.log(`  ✅ Deleted ${refreshTokens.count} refresh tokens`);

      // 6. Delete email verifications
      const emailVerifications = await prisma.emailVerification.deleteMany({
        where: { userId: userId }
      });
      console.log(`  ✅ Deleted ${emailVerifications.count} email verifications`);

      // 7. Finally delete the user
      await prisma.user.delete({
        where: { id: userId }
      });
      console.log(`  ✅ Deleted user record for ${existingUser.name}`);
      console.log(`🎉 Cascading delete completed successfully for user ${userId}`);
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
    const user = (req as any).user;
    
    console.log('📊 User requesting stats:', { 
      id: user.id, 
      email: user.email, 
      role: user.role, 
      organizationId: user.organizationId 
    });
    
    // For SUPER_ADMIN or users without organization, show all user stats
    // For organization users, show only stats for their organization
    let whereClause = {};
    if (user.organizationId && user.role !== 'SUPER_ADMIN') {
      whereClause = { organizationId: user.organizationId };
      console.log('📊 Stats filtering by organization:', user.organizationId);
    } else {
      console.log('📊 Stats showing all users (SUPER_ADMIN or no organization)');
    }
    
    // Get total user count
    const totalUsers = await prisma.user.count({ where: whereClause });
    
    // Get active users (using isActive boolean from schema)
    const activeUsers = await prisma.user.count({
      where: { ...whereClause, isActive: true }
    });
    
    // Calculate inactive users
    const inactiveUsers = totalUsers - activeUsers;
    
    // Get role distribution using actual role field from schema
    const roleStats = await prisma.user.groupBy({
      by: ['role'],
      where: whereClause,
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

    // Check both agent assignments and user assignments
    console.log(`🔍 Looking for agent assignments for user ${userId}...`);
    
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

    console.log(`� Agent lookup result for user ${userId}:`, agentWithCampaigns ? `Found agent with ${agentWithCampaigns.campaignAssignments.length} assignments` : 'No agent found');

    // Also check user campaign assignments
    console.log(`🔍 Looking for user assignments for user ${userId}...`);
    const userWithCampaigns = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
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

    console.log(`🔍 User lookup result for user ${userId}:`, userWithCampaigns ? `Found user with ${userWithCampaigns.campaignAssignments.length} assignments` : 'No user found');

    // Combine campaigns from both agent and user assignments
    const allCampaigns: any[] = [];
    
    // Add campaigns from agent assignments
    if (agentWithCampaigns?.campaignAssignments) {
      const agentCampaigns = agentWithCampaigns.campaignAssignments.map(assignment => assignment.campaign);
      allCampaigns.push(...agentCampaigns);
      console.log(`📋 Found ${agentCampaigns.length} campaigns from agent assignments`);
    }
    
    // Add campaigns from user assignments
    if (userWithCampaigns?.campaignAssignments) {
      const userCampaigns = userWithCampaigns.campaignAssignments.map(assignment => assignment.campaign);
      allCampaigns.push(...userCampaigns);
      console.log(`📋 Found ${userCampaigns.length} campaigns from user assignments`);
    }
    
    // Remove duplicates (in case user has both agent and user assignments for same campaign)
    const uniqueCampaigns = allCampaigns.filter((campaign, index, array) => 
      array.findIndex(c => c.campaignId === campaign.campaignId) === index
    );
    
    console.log(`🔍 Campaign details for user ${userId}:`, uniqueCampaigns.map(c => ({
      campaignId: c.campaignId,
      name: c.name,
      status: c.status,
      isActive: c.isActive
    })));

    console.log(`✅ Found ${uniqueCampaigns.length} total unique campaigns for user ${userId}`);

    res.json({
      success: true,
      data: uniqueCampaigns
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
 * @route   GET /api/users/debug-auth
 * @desc    Debug endpoint to check auth middleware
 * @access  Private (requires authentication)
 */
router.get('/debug-auth', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    
    // Test the profile update logic here
    if (req.query.testProfile === 'true') {
      console.log(`📝 DEBUG PROFILE TEST: User ${userId} testing profile logic`);
      
      // Convert to integer for database lookup (same as profile route)
      const userIdInt = parseInt(userId.toString(), 10);
      
      if (isNaN(userIdInt)) {
        return res.json({
          success: false,
          debug: true,
          message: 'Profile test - Invalid user ID format',
          data: { userId, userIdInt, isNaN: isNaN(userIdInt) }
        });
      }

      // Try to get current user (same as profile route)
      const currentUser = await prisma.user.findUnique({
        where: { id: userIdInt }
      });

      return res.json({
        success: true,
        debug: true,
        message: 'Profile test successful',
        data: {
          originalUserId: userId,
          convertedUserId: userIdInt,
          userFound: !!currentUser,
          userName: currentUser?.name
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Debug auth endpoint',
      data: {
        hasUser: !!(req as any).user,
        userId: userId,
        userIdType: typeof userId,
        fullUser: (req as any).user
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
