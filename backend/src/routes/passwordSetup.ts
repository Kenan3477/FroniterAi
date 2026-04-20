/**
 * Password Setup Routes
 * Handles password setup for new organization admins
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = express.Router();
const prisma = new PrismaClient();

// Validation schemas
const validateTokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Valid email is required')
});

const setupPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/(?=.*\d)/, 'Password must contain at least one number')
    .regex(/(?=.*[!@#$%^&*])/, 'Password must contain at least one special character')
});

/**
 * GET /api/auth/validate-setup-token
 * Validate password setup token
 */
router.get('/validate-setup-token', async (req: Request, res: Response) => {
  try {
    const { token, email } = validateTokenSchema.parse(req.query);

    // Find user with matching token and email
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date() // Token not expired
        }
      }
    }) as any;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    res.json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        organizationName: user.organization?.displayName,
        tokenValid: true
      }
    });

  } catch (error) {
    console.error('❌ Token validation error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to validate token'
    });
  }
});

/**
 * POST /api/auth/setup-password
 * Complete password setup for new organization admin
 */
router.post('/setup-password', async (req: Request, res: Response) => {
  try {
    const { token, email, password } = setupPasswordSchema.parse(req.body);

    // Find user with matching token and email
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date() // Token not expired
        }
      }
    }) as any;

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        isActive: true
      }
    });

    console.log(`✅ Password setup completed for: ${user.email}`);

    // Generate JWT token for automatic login
    const jwtToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Password setup completed successfully',
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organization: user.organization
        }
      }
    });

  } catch (error) {
    console.error('❌ Password setup error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to setup password'
    });
  }
});

export default router;