import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  hashPassword, 
  generateAccessToken, 
  generateRefreshToken,
  validateEmail,
  validatePassword,
  UserRole,
  COOKIE_SETTINGS
} from '@/lib/auth';

const prisma = new PrismaClient();

interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
  role?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      username, 
      role = UserRole.AGENT 
    } = body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !username) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password does not meet requirements',
          errors: passwordValidation.errors
        },
        { status: 400 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role specified' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingEmailQuery = await prisma.$queryRaw`
      SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    ` as any[];

    if (existingEmailQuery && existingEmailQuery.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if username already exists
    const existingUsernameQuery = await prisma.$queryRaw`
      SELECT id FROM users WHERE username = ${username} LIMIT 1
    ` as any[];

    if (existingUsernameQuery && existingUsernameQuery.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Username already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const fullName = `${firstName} ${lastName}`;
    const newUserQuery = await prisma.$queryRaw`
      INSERT INTO users (
        username, email, password, firstName, lastName, name, role, 
        isActive, failedLoginAttempts, refreshTokenVersion, status, 
        statusSince, createdAt, updatedAt
      )
      VALUES (
        ${username},
        ${email.toLowerCase()},
        ${hashedPassword},
        ${firstName},
        ${lastName},
        ${fullName},
        ${role},
        1,
        0,
        0,
        'away',
        datetime('now'),
        datetime('now'),
        datetime('now')
      )
      RETURNING id, email, name, firstName, lastName, role, status
    ` as any[];

    if (!newUserQuery || newUserQuery.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to create user' },
        { status: 500 }
      );
    }

    const newUser = newUserQuery[0];

    // Generate JWT tokens
    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      tokenVersion: 0
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Store refresh token in database
    await prisma.$executeRaw`
      INSERT INTO RefreshToken (id, token, userId, expiresAt, createdAt, isRevoked)
      VALUES (
        lower(hex(randomblob(16))),
        ${refreshToken},
        ${newUser.id},
        datetime('now', '+7 days'),
        datetime('now'),
        0
      )
    `;

    // Create response with user data (excluding sensitive information)
    const userData = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      status: newUser.status
    };

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: userData,
      accessToken
    });

    // Set refresh token as httpOnly cookie
    response.cookies.set('refreshToken', refreshToken, COOKIE_SETTINGS);

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific database constraint errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('email')) {
        return NextResponse.json(
          { success: false, message: 'Email already registered' },
          { status: 409 }
        );
      } else if (error.message.includes('username')) {
        return NextResponse.json(
          { success: false, message: 'Username already taken' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}