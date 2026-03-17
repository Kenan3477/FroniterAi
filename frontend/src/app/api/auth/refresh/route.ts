import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  verifyRefreshToken, 
  generateAccessToken, 
  generateRefreshToken,
  COOKIE_SETTINGS 
} from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, message: 'No refresh token provided' },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database and is not revoked
    const tokenQuery = await prisma.$queryRaw`
      SELECT id, userId, expiresAt, isRevoked
      FROM RefreshToken 
      WHERE token = ${refreshToken} AND isRevoked = 0
      LIMIT 1
    ` as any[];

    if (!tokenQuery || tokenQuery.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    const storedToken = tokenQuery[0];

    // Check if token has expired
    if (new Date(storedToken.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'Refresh token expired' },
        { status: 401 }
      );
    }

    // Get user data
    const userQuery = await prisma.$queryRaw`
      SELECT id, email, role, isActive, refreshTokenVersion
      FROM users 
      WHERE id = ${payload.userId} AND isActive = 1
      LIMIT 1
    ` as any[];

    if (!userQuery || userQuery.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found or inactive' },
        { status: 401 }
      );
    }

    const user = userQuery[0];

    // Check token version for revocation
    if (payload.tokenVersion !== undefined && user.refreshTokenVersion !== payload.tokenVersion) {
      return NextResponse.json(
        { success: false, message: 'Token has been revoked' },
        { status: 401 }
      );
    }

    // Generate new tokens
    const newTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.refreshTokenVersion
    };

    const newAccessToken = generateAccessToken(newTokenPayload);
    const newRefreshToken = generateRefreshToken(newTokenPayload);

    // Revoke old refresh token and create new one
    await prisma.$executeRaw`
      UPDATE RefreshToken 
      SET isRevoked = 1 
      WHERE token = ${refreshToken}
    `;

    await prisma.$executeRaw`
      INSERT INTO RefreshToken (id, token, userId, expiresAt, createdAt, isRevoked)
      VALUES (
        lower(hex(randomblob(16))),
        ${newRefreshToken},
        ${user.id},
        datetime('now', '+7 days'),
        datetime('now'),
        0
      )
    `;

    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      accessToken: newAccessToken
    });

    // Set new refresh token cookie
    response.cookies.set('refreshToken', newRefreshToken, COOKIE_SETTINGS);

    return response;

  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid refresh token' },
      { status: 401 }
    );
  } finally {
    await prisma.$disconnect();
  }
}