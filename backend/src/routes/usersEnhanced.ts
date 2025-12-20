/**
 * Enhanced User Management API Routes
 * Enterprise-grade features: audit logging, email verification, real-time validation
 * For regulated call center environments
 */

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { rateLimiter } from '../middleware/rateLimiter';
import { AuditService } from '../services/auditService';
import { EmailVerificationService } from '../services/emailVerificationService';

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// REAL-TIME EMAIL VALIDATION
// ============================================================================

/**
 * @route   POST /api/admin/users/validate-email
 * @desc    Real-time email uniqueness validation
 * @access  Admin/Manager
 */
router.post('/validate-email', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, excludeUserId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        isValid: false,
        message: 'Invalid email format'
      });
    }

    // Check uniqueness (exclude specific user ID for updates)
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    const isUnique = !existingUser || (excludeUserId && existingUser.id === excludeUserId);

    res.json({
      success: true,
      isValid: true,
      isUnique,
      message: isUnique ? 'Email is available' : 'Email is already in use',
      existingUser: isUnique ? null : {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email
      }
    });

  } catch (error) {
    console.error('Error validating email:', error);
    res.status(500).json({
      success: false,
      message: 'Email validation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// ENHANCED USER CREATION WITH AUDIT & EMAIL VERIFICATION
// ============================================================================

/**
 * @route   POST /api/admin/users
 * @desc    Create new user with enterprise features
 * @access  Admin/Manager
 */
router.post('/', rateLimiter, async (req: Request, res: Response) => {
  try {
    const userData = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Enhanced validation
    const validation = await validateUserData(userData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Check email uniqueness again (defensive check)
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
        field: 'email'
      });
    }

    // Hash password with enterprise-grade security
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user with transaction for data integrity
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name: userData.name.trim(),
          email: userData.email.toLowerCase().trim(),
          password: hashedPassword,
          role: userData.role || 'AGENT',
          status: userData.status || 'ACTIVE',
          department: userData.department?.trim(),
          phoneNumber: userData.phoneNumber?.trim(),
        }
      });

      // Set campaign access if provided
      if (userData.campaignAccess && userData.campaignAccess.length > 0) {
        await tx.campaignAssignment.createMany({
          data: userData.campaignAccess.map((campaignId: string) => ({
            userId: user.id,
            campaignId,
            role: 'AGENT',
            assignmentType: 'FULL',
            isActive: true
          }))
        });
      }

      return user;
    });

    // Create email verification (optional enterprise feature)
    let verificationToken: string | undefined;
    if (userData.requireEmailVerification !== false) {
      try {
        verificationToken = await EmailVerificationService.createVerification({
          userId: result.id,
          email: result.email,
          ipAddress,
          userAgent
        });
      } catch (verifyError) {
        console.warn('Email verification creation failed:', verifyError);
        // Don't fail user creation if email verification fails
      }
    }

    // Get campaign access for response
    const campaignAccess = await getUserCampaignAccess(result.id);

    // Format response
    const userResponse = formatUserResponse({
      ...result,
      campaignAccess
    });

    // Create audit log (async - don't fail if this fails)
    const performedBy = {
      id: req.user?.userId || 'system',
      email: req.user?.username || 'system@kennex.com',
      name: req.user?.username || 'System Administrator'
    };

    AuditService.logUserCreation(
      {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role
      },
      performedBy,
      ipAddress,
      userAgent
    ).catch(auditError => {
      console.error('Audit logging failed:', auditError);
    });

    console.log(`✅ User created: ${result.name} (${result.role}) with enterprise features`);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse,
      emailVerification: verificationToken ? {
        required: true,
        token: verificationToken, // In production, this would be sent via email
        expiresIn: '24 hours'
      } : {
        required: false
      }
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

// ============================================================================
// EMAIL VERIFICATION ENDPOINTS
// ============================================================================

/**
 * @route   POST /api/admin/users/verify-email
 * @desc    Verify user email with token
 * @access  Public (with token)
 */
router.post('/verify-email', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const result = await EmailVerificationService.verifyEmail(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // Log verification success
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { id: true, email: true, name: true }
    });

    if (user) {
      const performedBy = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      AuditService.logEmailVerification(
        user.id,
        user.email,
        'VERIFICATION_COMPLETED',
        performedBy,
        req.ip
      ).catch(console.error);
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      userId: result.userId
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed'
    });
  }
});

/**
 * @route   POST /api/admin/users/:id/resend-verification
 * @desc    Resend email verification
 * @access  Admin/Manager
 */
router.post('/:id/resend-verification', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ipAddress = req.ip;

    const result = await EmailVerificationService.resendVerification(id, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    // Log resend attempt
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    });

    if (user) {
      const performedBy = {
        id: req.user?.userId || 'system',
        email: req.user?.username || 'system@kennex.com',
        name: req.user?.username || 'System Administrator'
      };

      AuditService.logEmailVerification(
        user.id,
        user.email,
        'VERIFICATION_SENT',
        performedBy,
        ipAddress,
        { reason: 'manual_resend' }
      ).catch(console.error);
    }

    res.json({
      success: true,
      message: 'Verification email resent',
      token: result.token // In production, this would be sent via email
    });

  } catch (error) {
    console.error('Error resending verification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend verification email'
    });
  }
});

// ============================================================================
// AUDIT LOG ENDPOINT
// ============================================================================

/**
 * @route   GET /api/admin/users/audit-logs
 * @desc    Get audit logs for user management
 * @access  Admin only
 */
router.get('/audit-logs', rateLimiter, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, limit = 50 } = req.query;

    const logs = await AuditService.getAuditLogs(
      entityType as string,
      entityId as string,
      Number(limit)
    );

    res.json({
      success: true,
      data: logs,
      total: logs.length
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

async function validateUserData(userData: any): Promise<ValidationResult> {
  const errors: string[] = [];

  // Required fields
  if (!userData.name?.trim()) {
    errors.push('Name is required');
  }

  if (!userData.email?.trim()) {
    errors.push('Email is required');
  }

  if (!userData.password) {
    errors.push('Password is required');
  }

  // Email format validation
  if (userData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      errors.push('Invalid email format');
    }
  }

  // Password strength validation
  if (userData.password) {
    if (userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  // Role validation
  if (userData.role && !['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'].includes(userData.role)) {
    errors.push('Invalid role specified');
  }

  // Status validation
  if (userData.status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(userData.status)) {
    errors.push('Invalid status specified');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

async function getUserCampaignAccess(userId: string): Promise<string[]> {
  const campaignAccess = await prisma.campaignAssignment.findMany({
    where: { userId, isActive: true },
    select: { campaignId: true }
  });
  return campaignAccess.map((access: any) => access.campaignId);
}

function formatUserResponse(user: any): any {
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
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export default router;