/**
 * User Management API Routes - Stats Only
 * Minimal implementation for user statistics endpoint
 * Aligned with actual Prisma User schema
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

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