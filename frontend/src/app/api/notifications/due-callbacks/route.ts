import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/notifications/due-callbacks - Get due callbacks for current user
export const GET = requireAuth(async (request, user) => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    console.log('📅 Checking due callbacks for user:', user.userId);

    // Get callbacks due within next 24 hours for this user
    const dueCallbacks = await prisma.task.findMany({
      where: {
        assignedUserId: user.userId.toString(),
        type: 'callback',
        status: 'open',
        dueAt: {
          lte: next24Hours // Due within 24 hours
        }
      },
      include: {
        contact: {
          select: {
            contactId: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true
          }
        },
        campaign: {
          select: {
            campaignId: true,
            name: true
          }
        }
      },
      orderBy: {
        dueAt: 'asc'
      }
    });

    console.log(`📞 Found ${dueCallbacks.length} due callbacks for user ${user.userId}`);

    // Transform callbacks into notification format
    const notifications = dueCallbacks.map(callback => {
      const isOverdue = callback.dueAt < now;
      const customerName = callback.contact 
        ? `${callback.contact.firstName} ${callback.contact.lastName}`.trim() 
        : 'Unknown Customer';
      
      const timeRemaining = callback.dueAt.getTime() - now.getTime();
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
      
      let timeDescription;
      if (isOverdue) {
        const overdueHours = Math.floor(Math.abs(timeRemaining) / (1000 * 60 * 60));
        timeDescription = overdueHours > 0 ? `${overdueHours}h overdue` : 'Overdue';
      } else if (hoursRemaining === 0) {
        timeDescription = `Due in ${minutesRemaining}m`;
      } else {
        timeDescription = `Due in ${hoursRemaining}h ${minutesRemaining}m`;
      }

      return {
        id: `callback-${callback.id}`,
        type: 'callback',
        priority: isOverdue ? 'high' : 'normal',
        title: 'Callback Due',
        message: `${customerName} - ${callback.contact?.phone || 'No phone'}`,
        timeDescription,
        metadata: {
          taskId: callback.id,
          contactId: callback.contactId,
          campaignId: callback.campaignId,
          phone: callback.contact?.phone,
          customerName,
          isOverdue,
          dueAt: callback.dueAt.toISOString(),
          campaignName: callback.campaign?.name
        },
        createdAt: callback.createdAt,
        dueAt: callback.dueAt
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        callbacks: notifications,
        overdueCount: notifications.filter(n => n.metadata.isOverdue).length,
        totalCount: notifications.length
      }
    });

  } catch (error) {
    console.error('Error fetching due callbacks:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch due callbacks' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});