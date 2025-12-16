import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/webhooks - List all webhooks
export const GET = requireRole(['ADMIN', 'SUPERVISOR'])(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const isActive = searchParams.get('active');
    
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = isActive !== null 
      ? `WHERE isActive = ${isActive === 'true' ? 1 : 0}`
      : '';

    // Get webhooks with pagination
    const webhooks = await prisma.$queryRaw`
      SELECT w.id, w.name, w.url, w.events, w.isActive, w.createdAt,
             u.name as creatorName,
             i.name as integrationName
      FROM webhooks w
      LEFT JOIN users u ON w.createdBy = u.id
      LEFT JOIN integrations i ON w.integrationId = i.id
      ${whereClause ? whereClause : ''}
      ORDER BY w.createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];

    // Parse events JSON for each webhook
    const processedWebhooks = webhooks.map(webhook => ({
      ...webhook,
      events: webhook.events ? JSON.parse(webhook.events) : []
    }));

    // Get total count
    const totalQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM webhooks
      ${whereClause ? whereClause : ''}
    ` as any[];
    
    const total = totalQuery[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        webhooks: processedWebhooks,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/admin/webhooks - Create new webhook
export const POST = requireRole(['ADMIN'])(async (request, user) => {
  try {
    const body = await request.json();
    const { 
      name, 
      url, 
      secret, 
      events, 
      integrationId,
      retryPolicy,
      headers 
    } = body;

    // Validate required fields
    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Create webhook
    const webhookId = `wh_${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRaw`
      INSERT INTO webhooks (
        id, name, url, secret, events, integrationId,
        retryPolicy, headers, createdBy, createdAt, updatedAt
      ) VALUES (
        ${webhookId},
        ${name},
        ${url},
        ${secret || null},
        ${JSON.stringify(events)},
        ${integrationId || null},
        ${retryPolicy ? JSON.stringify(retryPolicy) : null},
        ${headers ? JSON.stringify(headers) : null},
        ${user.userId},
        datetime('now'),
        datetime('now')
      )
    `;

    // Get the created webhook
    const newWebhook = await prisma.$queryRaw`
      SELECT w.*, u.name as creatorName, i.name as integrationName
      FROM webhooks w
      LEFT JOIN users u ON w.createdBy = u.id
      LEFT JOIN integrations i ON w.integrationId = i.id
      WHERE w.id = ${webhookId}
      LIMIT 1
    ` as any[];

    const webhook = {
      ...newWebhook[0],
      events: JSON.parse(newWebhook[0].events),
      retryPolicy: newWebhook[0].retryPolicy ? JSON.parse(newWebhook[0].retryPolicy) : null,
      headers: newWebhook[0].headers ? JSON.parse(newWebhook[0].headers) : null
    };

    return NextResponse.json({
      success: true,
      message: 'Webhook created successfully',
      data: webhook
    });

  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create webhook' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});