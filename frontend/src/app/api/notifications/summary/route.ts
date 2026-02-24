import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/middleware/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface NotificationItem {
  id: string;
  type: 'system' | 'callback' | 'missed_call';
  icon: string;
  title: string;
  message: string;
  timeAgo: string;
  priority: 'high' | 'normal' | 'low';
  actionUrl?: string | null;
  actionLabel?: string | null;
  metadata?: any;
  createdAt: Date;
}

// GET /api/notifications/summary - Get all notifications summary for user
export const GET = requireAuth(async (request, user) => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log('📋 Fetching notification summary for user:', user.userId);

    // Fetch different types of notifications concurrently
    const [
      systemNotifications,
      dueCallbacks,
      recentMissedCalls
    ] = await Promise.all([
      // System notifications from notifications table
      prisma.notification.findMany({
        where: {
          userId: user.userId,
          isRead: false,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 10
      }),

      // Due callbacks within 24 hours
      prisma.task.findMany({
        where: {
          assignedUserId: user.userId.toString(),
          type: 'callback',
          status: 'open',
          dueAt: {
            lte: next24Hours
          }
        },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        },
        orderBy: { dueAt: 'asc' },
        take: 5
      }),

      // Recent missed calls (calls that were declined or went unanswered in last 4 hours)
      prisma.callRecord.findMany({
        where: {
          agentId: user.userId.toString(),
          outcome: {
            in: ['MISSED', 'NO_ANSWER', 'DECLINED']
          },
          startTime: {
            gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) // Last 4 hours
          }
        },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        },
        orderBy: { startTime: 'desc' },
        take: 3
      })
    ]);

    // Process and format notifications
    const allNotifications: NotificationItem[] = [];

    // Add system notifications
    systemNotifications.forEach(notif => {
      allNotifications.push({
        id: notif.id,
        type: 'system',
        icon: '🔔',
        title: notif.title,
        message: notif.message,
        timeAgo: getTimeAgo(notif.createdAt),
        priority: (notif.priority as 'high' | 'normal' | 'low') || 'normal',
        actionUrl: notif.actionUrl,
        actionLabel: notif.actionLabel,
        metadata: notif.metadata ? JSON.parse(notif.metadata) : null,
        createdAt: notif.createdAt
      });
    });

    // Add due callbacks
    dueCallbacks.forEach(callback => {
      const isOverdue = callback.dueAt < now;
      const customerName = callback.contact 
        ? `${callback.contact.firstName} ${callback.contact.lastName}`.trim() 
        : 'Unknown Customer';
      
      allNotifications.push({
        id: `callback-${callback.id}`,
        type: 'callback',
        icon: isOverdue ? '⏰' : '📅',
        title: isOverdue ? 'Overdue Callback' : 'Callback Due',
        message: `${customerName} - ${callback.contact?.phone || 'No phone'}`,
        timeAgo: isOverdue ? 'Overdue' : getTimeAgo(callback.dueAt),
        priority: isOverdue ? 'high' : 'normal',
        actionUrl: `/work?callback=${callback.id}`,
        actionLabel: 'Call Now',
        metadata: {
          taskId: callback.id,
          contactId: callback.contactId,
          phone: callback.contact?.phone,
          customerName,
          isOverdue,
          dueAt: callback.dueAt.toISOString()
        },
        createdAt: callback.createdAt
      });
    });

    // Add recent missed calls
    recentMissedCalls.forEach(call => {
      const customerName = call.contact 
        ? `${call.contact.firstName} ${call.contact.lastName}`.trim() 
        : 'Unknown Caller';
      
      allNotifications.push({
        id: `missed-${call.callId}`,
        type: 'missed_call',
        icon: '📞',
        title: 'Missed Call',
        message: `${customerName} - ${call.phoneNumber}`,
        timeAgo: getTimeAgo(call.startTime),
        priority: 'normal',
        actionUrl: `/work?phone=${call.phoneNumber}`,
        actionLabel: 'Call Back',
        metadata: {
          callId: call.callId,
          phoneNumber: call.phoneNumber,
          customerName,
          outcome: call.outcome,
          callTime: call.startTime.toISOString()
        },
        createdAt: call.startTime
      });
    });

    // Sort all notifications by priority and time
    allNotifications.sort((a, b) => {
      // Priority order: high > normal > low
      const priorityOrder = { 'high': 3, 'normal': 2, 'low': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Calculate counts
    const unreadCount = allNotifications.length;
    const overdueCallbacks = allNotifications.filter(n => 
      n.type === 'callback' && n.metadata?.isOverdue
    ).length;

    console.log(`📊 Notification summary: ${unreadCount} total, ${overdueCallbacks} overdue callbacks`);

    return NextResponse.json({
      success: true,
      data: {
        notifications: allNotifications.slice(0, 10), // Limit to 10 most important
        unreadCount,
        breakdown: {
          system: systemNotifications.length,
          callbacks: dueCallbacks.length,
          overdueCallbacks,
          missedCalls: recentMissedCalls.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching notification summary:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch notifications' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
});

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d ago`;
  }
}