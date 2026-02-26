// Test to verify frontend-backend connection by creating a unique call record
// that should show up in the frontend

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createIdentifiableCallRecord() {
  try {
    console.log('🧪 Creating identifiable call record for frontend verification...\n');

    // Ensure campaign exists
    await prisma.campaign.upsert({
      where: { campaignId: 'frontend-test' },
      update: {},
      create: {
        campaignId: 'frontend-test',
        name: 'Frontend Connection Test',
        dialMethod: 'Manual',
        status: 'Active',
        isActive: true,
        description: 'Test to verify frontend-backend connection',
        recordCalls: true
      }
    });

    // Ensure data list exists
    await prisma.dataList.upsert({
      where: { listId: 'frontend-test-contacts' },
      update: {},
      create: {
        listId: 'frontend-test-contacts',
        name: 'Frontend Test Contacts',
        campaignId: 'frontend-test',
        active: true,
        totalContacts: 0
      }
    });

    // Create test contact
    const timestamp = Date.now();
    const contactId = `frontend-test-contact-${timestamp}`;
    await prisma.contact.create({
      data: {
        contactId,
        listId: 'frontend-test-contacts',
        firstName: 'FRONTEND',
        lastName: 'TEST CONTACT',
        phone: '+1234567890',
        status: 'new'
      }
    });

    // Get first available agent
    const agent = await prisma.agent.findFirst();

    // Create UNIQUE call record that should show up in frontend
    const testCallRecord = await prisma.callRecord.create({
      data: {
        callId: `FRONTEND-TEST-${timestamp}`,
        agentId: agent?.agentId || null,
        contactId: contactId,
        campaignId: 'frontend-test',
        phoneNumber: '+1234567890',
        dialedNumber: '+1234567890',
        callType: 'outbound',
        startTime: new Date(),
        endTime: new Date(),
        duration: 30,
        outcome: 'completed',
        notes: 'FRONTEND CONNECTION TEST - If you see this in the frontend, the connection works!'
      }
    });

    console.log('✅ Created test call record:');
    console.log(`   Call ID: ${testCallRecord.callId}`);
    console.log(`   Phone: ${testCallRecord.phoneNumber}`);
    console.log(`   Contact: FRONTEND TEST CONTACT`);
    console.log(`   Agent: ${agent?.firstName} ${agent?.lastName}`);
    console.log(`   Notes: ${testCallRecord.notes}`);
    
    console.log('\n🔍 INSTRUCTIONS:');
    console.log('1. Check the frontend reports page');
    console.log('2. Look for a call record with Contact: "FRONTEND TEST CONTACT"');
    console.log('3. If you see it, the frontend is connected to this backend');
    console.log('4. If you DON\'T see it, the frontend is reading from elsewhere');

    // Show current total
    const totalRecords = await prisma.callRecord.count();
    console.log(`\n📊 Total call records in database: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Error creating test record:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createIdentifiableCallRecord();