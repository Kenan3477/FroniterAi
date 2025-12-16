import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/integrations - List all integrations
export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [];
    if (type) whereConditions.push(`type = '${type}'`);
    if (status) whereConditions.push(`syncStatus = '${status}'`);
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get integrations with pagination
    const integrations = await prisma.$queryRaw`
      SELECT i.id, i.name, i.type, i.description, i.provider, i.isActive,
             i.syncStatus, i.lastSync, i.errorMessage, i.createdAt,
             u.name as creatorName
      FROM integrations i
      LEFT JOIN users u ON i.createdBy = u.id
      ${whereClause ? whereClause : ''}
      ORDER BY i.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];

    // Get total count
    const totalQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM integrations
      ${whereClause ? whereClause : ''}
    ` as any[];
    
    const total = totalQuery[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        integrations,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch integrations' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/admin/integrations - Create new integration
export const POST = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const { 
      name, 
      type, 
      description, 
      provider, 
      configuration, 
      credentials 
    } = body;

    // Validate required fields
    if (!name || !type || !provider || !configuration) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Encrypt credentials if provided
    const encryptedCredentials = credentials 
      ? Buffer.from(JSON.stringify(credentials)).toString('base64')
      : null;

    // Create integration
    const integrationId = `int_${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRaw`
      INSERT INTO integrations (
        id, name, type, description, provider, configuration, 
        credentials, createdBy, createdAt, updatedAt
      ) VALUES (
        ${integrationId},
        ${name},
        ${type},
        ${description || null},
        ${provider},
        ${JSON.stringify(configuration)},
        ${encryptedCredentials},
        ${user.userId},
        datetime('now'),
        datetime('now')
      )
    `;

    // Get the created integration
    const newIntegration = await prisma.$queryRaw`
      SELECT i.*, u.name as creatorName
      FROM integrations i
      LEFT JOIN users u ON i.createdBy = u.id
      WHERE i.id = ${integrationId}
      LIMIT 1
    ` as any[];

    return NextResponse.json({
      success: true,
      message: 'Integration created successfully',
      data: newIntegration[0]
    });

  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create integration' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});