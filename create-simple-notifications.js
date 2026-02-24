/**
 * Create test notifications using existing data or create minimal test data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotifications() {
  try {
    console.log('📋 Creating test notifications with existing data...\n');

    // Get the first user
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const testUser = users[0];
    console.log(`👤 Using user: ${testUser.firstName} ${testUser.lastName} (ID: ${testUser.id})`);

    // Create system notifications (don't require foreign keys)
    console.log('\n🔔 Creating system notifications...');
    
    const now = new Date();

    try {
      const notif1 = await prisma.notification.create({
        data: {
          id: `notif_${Math.random().toString(36).substring(2, 15)}`,
          userId: testUser.id,
          title: 'System Alert',
          message: 'Your call volume increased by 25% today',
          type: 'info',
          category: 'performance',
          priority: 'normal',
          isRead: false,
          createdAt: new Date(now.getTime() - 15 * 60 * 1000) // 15 minutes ago
        }
      });
      console.log(`✅ Created notification: ${notif1.title}`);

      const notif2 = await prisma.notification.create({
        data: {
          id: `notif_${Math.random().toString(36).substring(2, 15)}`,
          userId: testUser.id,
          title: 'Callback Reminder',
          message: 'You have 3 callbacks scheduled for today',
          type: 'reminder',
          category: 'task',
          priority: 'high',
          actionUrl: '/work',
          actionLabel: 'View Callbacks',
          isRead: false,
          createdAt: new Date(now.getTime() - 5 * 60 * 1000) // 5 minutes ago
        }
      });
      console.log(`✅ Created notification: ${notif2.title}`);

      const notif3 = await prisma.notification.create({
        data: {
          id: `notif_${Math.random().toString(36).substring(2, 15)}`,
          userId: testUser.id,
          title: 'Training Update',
          message: 'New call handling training module available',
          type: 'info',
          category: 'training',
          priority: 'low',
          actionUrl: '/training',
          actionLabel: 'Start Training',
          isRead: false,
          createdAt: new Date(now.getTime() - 45 * 60 * 1000) // 45 minutes ago
        }
      });
      console.log(`✅ Created notification: ${notif3.title}`);

    } catch (error) {
      if (error.code === 'P2002') {
        console.log('⚠️  Some notifications already exist, skipping duplicates...');
      } else {
        console.error('Error creating notifications:', error);
      }
    }

    // Get current notification count
    const notificationCount = await prisma.notification.count({
      where: {
        userId: testUser.id,
        isRead: false
      }
    });

    console.log('\n📊 NOTIFICATION STATUS:');
    console.log(`🔔 Total unread notifications for user ${testUser.id}: ${notificationCount}`);
    console.log('\n✅ Test notifications created!');
    console.log('🎯 Refresh your Omnivox dashboard to see the new notifications');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotifications();