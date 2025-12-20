import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({
        success: false,
        message: 'Email is required'
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        isValid: false,
        message: 'Invalid email format'
      }, { status: 400 });
    }

    // Check uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    const isUnique = !existingUser;

    return NextResponse.json({
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
    return NextResponse.json({
      success: false,
      message: 'Email validation failed'
    }, { status: 500 });
  }
}