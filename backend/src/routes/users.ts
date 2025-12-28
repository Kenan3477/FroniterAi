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

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
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
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching user statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;