/**
 * Test script to create sample notifications and callbacks for the notification system
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestNotificationData() {
  try {
    console.log('📋 Creating test notification data...\n');

    // First, let's check if we have users to assign notifications to
    const users = await prisma.user.findMany({
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    if (users.length === 0) {
      console.log('❌ No users found. Please create users first.');
      return;
    }

    const testUser = users[0]; // Use first user
    console.log(`👤 Using test user: ${testUser.firstName} ${testUser.lastName} (ID: ${testUser.id})`);

    // Check if we have campaigns and contacts
    const campaigns = await prisma.campaign.findMany({ take: 1 });
    const contacts = await prisma.contact.findMany({ take: 3 });

    console.log(`📞 Found ${campaigns.length} campaigns, ${contacts.length} contacts`);

    if (campaigns.length === 0 || contacts.length === 0) {
      console.log('⚠️  No campaigns or contacts found. Creating basic test data...');
    }

    // Create test callbacks (due tasks)
    console.log('\n📅 Creating test callback tasks...');
    
    const now = new Date();
    const callbacks = [];

    // Overdue callback (2 hours ago)
    const overdueCallback = await prisma.task.create({
      data: {
        assignedUserId: testUser.id.toString(),
        contactId: contacts[0]?.contactId || 'test-contact-1',
        campaignId: campaigns[0]?.campaignId || 'test-campaign',
        type: 'callback',
        notes: 'Follow-up call requested by customer',
        dueAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        status: 'open',
        createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) // Created yesterday
      }
    });

    callbacks.push(overdueCallback);
    console.log(`✅ Created overdue callback: ${overdueCallback.id} (due 2 hours ago)`);

    // Due soon callback (30 minutes from now)
    const dueSoonCallback = await prisma.task.create({
      data: {
        assignedUserId: testUser.id.toString(),
        contactId: contacts[1]?.contactId || 'test-contact-2',
        campaignId: campaigns[0]?.campaignId || 'test-campaign',
        type: 'callback',
        notes: 'Callback scheduled during last interaction',
        dueAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes from now
        status: 'open',
        createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) // Created 3 hours ago
      }
    });

    callbacks.push(dueSoonCallback);
    console.log(`✅ Created due soon callback: ${dueSoonCallback.id} (due in 30 minutes)`);

    // Future callback (tomorrow)
    const futureCallback = await prisma.task.create({
      data: {
        assignedUserId: testUser.id.toString(),
        contactId: contacts[2]?.contactId || 'test-contact-3',
        campaignId: campaigns[0]?.campaignId || 'test-campaign',
        type: 'callback',
        notes: 'Follow-up call for interested prospect',
        dueAt: new Date(now.getTime() + 25 * 60 * 60 * 1000), // 25 hours from now (tomorrow)
        status: 'open',
        createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000) // Created 1 hour ago
      }
    });

    console.log(`✅ Created future callback: ${futureCallback.id} (due tomorrow)`);

    // Create system notifications
    console.log('\n🔔 Creating test system notifications...');
    
    const systemNotif1 = await prisma.notification.create({
      data: {
        id: `notif_${Math.random().toString(36).substring(2, 15)}`,
        userId: testUser.id,
        title: 'Campaign Performance Alert',
        message: 'DAC campaign conversion rate increased by 15%',
        type: 'info',
        category: 'campaign',
        priority: 'normal',
        actionUrl: '/admin/campaigns',
        actionLabel: 'View Details',
        metadata: JSON.stringify({ campaignId: campaigns[0]?.campaignId, metric: 'conversion_rate' }),
        isRead: false,
        createdAt: new Date(now.getTime() - 10 * 60 * 1000) // 10 minutes ago
      }
    });

    console.log(`✅ Created system notification: ${systemNotif1.title}`);

    const systemNotif2 = await prisma.notification.create({
      data: {
        id: `notif_${Math.random().toString(36).substring(2, 15)}`,
        userId: testUser.id,
        title: 'System Maintenance',
        message: 'Scheduled maintenance window: Tonight 2-4 AM UTC',
        type: 'warning',
        category: 'system',
        priority: 'high',
        actionUrl: '/admin/system',
        actionLabel: 'View Schedule',
        metadata: JSON.stringify({ maintenanceType: 'scheduled', window: '2-4_AM_UTC' }),
        isRead: false,
        createdAt: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
      }
    });

    console.log(`✅ Created system notification: ${systemNotif2.title}`);

    // Create test missed calls
    console.log('\n📞 Creating test missed call records...');
    
    const missedCall = await prisma.callRecord.create({
      data: {
        callId: `call_${Date.now()}_missed_test`,
        agentId: testUser.id.toString(),
        campaignId: campaigns[0]?.campaignId || 'test-campaign',
        contactId: contacts[0]?.contactId || 'test-contact-1',
        phoneNumber: contacts[0]?.phone || '+1234567890',
        direction: 'INBOUND',
        outcome: 'MISSED',
        startTime: new Date(now.getTime() - 45 * 60 * 1000), // 45 minutes ago
        endTime: new Date(now.getTime() - 45 * 60 * 1000 + 30000), // 30 seconds ring
        duration: 0
      }
    });

    console.log(`✅ Created missed call: ${missedCall.callId} (45 minutes ago)`);

    // Summary
    console.log('\n📊 TEST DATA SUMMARY:');
    console.log(`📅 Callbacks created: ${callbacks.length}`);
    console.log('   - 1 overdue callback (2 hours ago)');
    console.log('   - 1 due soon callback (30 minutes from now)');
    console.log('   - 1 future callback (tomorrow)');
    console.log('🔔 System notifications: 2');
    console.log('   - 1 campaign performance alert');
    console.log('   - 1 system maintenance warning');
    console.log('📞 Missed calls: 1');
    console.log('   - 1 missed inbound call (45 minutes ago)');
    console.log('\n✅ Test data created successfully!');
    console.log('\n🎯 Expected notification behavior:');
    console.log('   - Should show 4 total notifications (2 callbacks + 1 system + 1 missed call)');
    console.log('   - Overdue callback should appear with red/orange styling');
    console.log('   - Due soon callback should appear with yellow styling');
    console.log('   - System notifications should appear with appropriate icons');
    console.log('   - Missed call should appear with phone icon');

  } catch (error) {
    console.error('❌ Error creating test notification data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestNotificationData();