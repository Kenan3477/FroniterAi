import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET - Fetch all users
export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        department: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch users'
    }, { status: 500 });
  }
}

// POST - Create new user with enterprise features
export async function POST(request: NextRequest) {
  try {
    const userData = await request.json();
    const ipAddress = request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Enhanced validation
    const validation = await validateUserData(userData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      }, { status: 400 });
    }

    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      return NextResponse.json({
        success: false,
        message: 'User with this email already exists',
        field: 'email'
      }, { status: 400 });
    }

    // Hash password with enterprise-grade security
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
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

    // Create audit log entry
    try {
      await prisma.auditLog.create({
        data: {
          action: 'USER_CREATED',
          entityType: 'User',
          entityId: user.id,
          performedByUserId: 'system',
          performedByUserEmail: 'admin@omnivox.ai',
          performedByUserName: 'System Administrator',
          ipAddress,
          userAgent,
          newValues: JSON.stringify({
            name: user.name,
            email: user.email,
            role: user.role,
          }),
          severity: 'INFO',
        },
      });
      console.log(`[AUDIT] User created: ${user.name} (${user.role})`);
    } catch (auditError) {
      console.warn('Audit logging failed:', auditError);
    }

    // Create email verification record
    let verificationToken: string | undefined;
    try {
      const token = generateVerificationToken();
      const tokenHash = await bcrypt.hash(token, 10);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prisma.emailVerification.create({
        data: {
          userId: user.id,
          email: user.email,
          token,
          tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      verificationToken = token;
      console.log(`[EMAIL] Verification token created for ${user.email}`);
    } catch (verifyError) {
      console.warn('Email verification creation failed:', verifyError);
    }

    // Format response
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      phoneNumber: user.phoneNumber,
      isActive: user.status === 'ACTIVE',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log(`✅ User created with enterprise features: ${user.name} (${user.role})`);

    return NextResponse.json({
      success: true,
      message: 'User created successfully with enterprise features',
      data: userResponse,
      emailVerification: verificationToken ? {
        required: true,
        token: verificationToken, // In production, sent via email
        expiresIn: '24 hours',
        message: 'Email verification token generated'
      } : {
        required: false
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Helper functions
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

async function validateUserData(userData: any): Promise<ValidationResult> {
  const errors: string[] = [];

  if (!userData.name?.trim()) errors.push('Name is required');
  if (!userData.email?.trim()) errors.push('Email is required');
  if (!userData.password) errors.push('Password is required');

  // Email format validation
  if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
    errors.push('Invalid email format');
  }

  // Password strength validation
  if (userData.password) {
    if (userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(userData.password)) {
      errors.push('Password must contain uppercase, lowercase, and number');
    }
  }

  // Role validation
  if (userData.role && !['ADMIN', 'MANAGER', 'AGENT', 'VIEWER'].includes(userData.role)) {
    errors.push('Invalid role specified');
  }

  return { isValid: errors.length === 0, errors };
}

function generateVerificationToken(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}