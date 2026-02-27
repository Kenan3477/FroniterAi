import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/notifications - Get user notifications
export const GET = requireAuth(async (request, user) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');
    
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [`userId = ${user.userId}`];
    if (unreadOnly) whereConditions.push('isRead = false');
    if (type) whereConditions.push(`type = '${type}'`);
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get notifications
    const notifications = await prisma.$queryRaw`
      SELECT id, title, message, type, category, priority, isRead,
             actionUrl, actionLabel, metadata, createdAt, expiresAt
      FROM notifications
      ${whereClause}
      AND (expiresAt IS NULL OR expiresAt > NOW())
      ORDER BY priority DESC, createdAt DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];

    // Process metadata
    const processedNotifications = notifications.map(notification => ({
      ...notification,
      metadata: notification.metadata ? JSON.parse(notification.metadata) : null,
      isExpired: notification.expiresAt ? new Date(notification.expiresAt) < new Date() : false
    }));

    // Get unread count
    const unreadQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE userId = ${user.userId} 
        AND isRead = false 
        AND (expiresAt IS NULL OR expiresAt > NOW())
    ` as any[];

    const unreadCount = unreadQuery[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        notifications: processedNotifications,
        unreadCount,
        pagination: {
          page,
          limit,
          hasMore: notifications.length === limit
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// POST /api/notifications - Create new notification (admin only)
export const POST = requireAuth(async (request, user) => {
  try {
    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      userId, 
      title, 
      message, 
      type = 'info',
      category,
      priority = 'normal',
      actionUrl,
      actionLabel,
      metadata,
      expiresAt
    } = body;

    // Validate required fields
    if (!userId || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create notification
    const notificationId = `notif_${Math.random().toString(36).substring(2, 15)}`;
    
    await prisma.$executeRaw`
      INSERT INTO notifications (
        id, userId, title, message, type, category, priority,
        actionUrl, actionLabel, metadata, expiresAt, createdAt
      ) VALUES (
        ${notificationId},
        ${userId},
        ${title},
        ${message},
        ${type},
        ${category || null},
        ${priority},
        ${actionUrl || null},
        ${actionLabel || null},
        ${metadata ? JSON.stringify(metadata) : null},
        ${expiresAt || null},
        NOW()
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'Notification created successfully'
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create notification' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// PUT /api/notifications/[id]/read - Mark notification as read
export const PUT = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { notificationIds } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, message: 'Invalid notification IDs' },
        { status: 400 }
      );
    }

    // Mark notifications as read for the user
    const placeholders = notificationIds.map(() => '?').join(',');
    
    await prisma.$executeRaw`
      UPDATE notifications 
      SET isRead = true 
      WHERE id IN (${notificationIds.join(',')}) 
        AND userId = ${user.userId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read'
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update notifications' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});