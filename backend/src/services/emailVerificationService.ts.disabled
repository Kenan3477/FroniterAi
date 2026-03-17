import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface EmailVerificationData {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export class EmailVerificationService {
  private static readonly TOKEN_EXPIRY_HOURS = 24;
  private static readonly MAX_RESEND_COUNT = 5;

  /**
   * Generate a secure verification token
   */
  private static generateToken(): { token: string; tokenHash: string } {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = bcrypt.hashSync(token, 10);
    return { token, tokenHash };
  }

  /**
   * Create or update email verification record
   */
  static async createVerification(data: EmailVerificationData): Promise<string> {
    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Delete any existing verification for this user
    await prisma.emailVerification.deleteMany({
      where: { userId: data.userId }
    });

    // Create new verification record
    await prisma.emailVerification.create({
      data: {
        userId: data.userId,
        email: data.email,
        token,
        tokenHash,
        expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    return token;
  }

  /**
   * Resend verification email (with rate limiting)
   */
  static async resendVerification(userId: string, ipAddress?: string): Promise<{ success: boolean; token?: string; error?: string }> {
    const existing = await prisma.emailVerification.findUnique({
      where: { userId },
    });

    if (!existing) {
      return { success: false, error: 'No verification request found' };
    }

    if (existing.isVerified) {
      return { success: false, error: 'Email already verified' };
    }

    if (existing.resendCount >= this.MAX_RESEND_COUNT) {
      return { success: false, error: 'Maximum resend attempts exceeded' };
    }

    // Check rate limiting (at least 1 minute between resends)
    if (existing.lastResendAt) {
      const timeSinceLastResend = Date.now() - existing.lastResendAt.getTime();
      const oneMinute = 60 * 1000;
      if (timeSinceLastResend < oneMinute) {
        return { success: false, error: 'Please wait before requesting another verification email' };
      }
    }

    const { token, tokenHash } = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    await prisma.emailVerification.update({
      where: { userId },
      data: {
        token,
        tokenHash,
        expiresAt,
        resendCount: existing.resendCount + 1,
        lastResendAt: new Date(),
        ipAddress,
      },
    });

    return { success: true, token };
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
    const verification = await prisma.emailVerification.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verification) {
      return { success: false, error: 'Invalid verification token' };
    }

    if (verification.isVerified) {
      return { success: false, error: 'Email already verified' };
    }

    if (verification.expiresAt < new Date()) {
      return { success: false, error: 'Verification token has expired' };
    }

    // Mark as verified
    await prisma.emailVerification.update({
      where: { token },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });

    // Update user's email verification status if they have one
    await prisma.user.update({
      where: { id: verification.userId },
      data: {
        updatedAt: new Date(),
      },
    });

    return { success: true, userId: verification.userId };
  }

  /**
   * Check if email is verified for a user
   */
  static async isEmailVerified(userId: string): Promise<boolean> {
    const verification = await prisma.emailVerification.findUnique({
      where: { userId },
    });

    return verification?.isVerified || false;
  }

  /**
   * Get verification status for a user
   */
  static async getVerificationStatus(userId: string) {
    const verification = await prisma.emailVerification.findUnique({
      where: { userId },
    });

    if (!verification) {
      return { status: 'not_requested', canResend: true };
    }

    if (verification.isVerified) {
      return { 
        status: 'verified', 
        verifiedAt: verification.verifiedAt,
        canResend: false 
      };
    }

    if (verification.expiresAt < new Date()) {
      return { 
        status: 'expired', 
        canResend: true,
        resendCount: verification.resendCount 
      };
    }

    const canResend = verification.resendCount < this.MAX_RESEND_COUNT &&
      (!verification.lastResendAt || 
       Date.now() - verification.lastResendAt.getTime() > 60 * 1000);

    return {
      status: 'pending',
      expiresAt: verification.expiresAt,
      resendCount: verification.resendCount,
      canResend,
    };
  }

  /**
   * Clean up expired verification tokens (maintenance task)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.emailVerification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        isVerified: false,
      },
    });

    return result.count;
  }
}