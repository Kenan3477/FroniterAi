const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('Creating test call records for Recent Call Outcomes...');
    
    // First, create a test data list
    const dataList = await prisma.dataList.upsert({
      where: { listId: 'test-list-1' },
      update: {},
      create: {
        listId: 'test-list-1',
        name: 'Test Contact List',
        campaignId: 'test-campaign-1'
      }
    });
    
    // Create a test campaign
    const campaign = await prisma.campaign.upsert({
      where: { campaignId: 'test-campaign-1' },
      update: {},
      create: {
        campaignId: 'test-campaign-1',
        name: 'Test Campaign',
        status: 'active'
      }
    });
    
    // Now create test contacts
    const contact1 = await prisma.contact.upsert({
      where: { contactId: 'test-contact-1' },
      update: {},
      create: {
        contactId: 'test-contact-1',
        listId: dataList.listId,
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith',
        phone: '+1234567890'
      }
    });

    const contact2 = await prisma.contact.upsert({
      where: { contactId: 'test-contact-2' },
      update: {},
      create: {
        contactId: 'test-contact-2',
        listId: dataList.listId,
        firstName: 'Sarah',
        lastName: 'Johnson',
        fullName: 'Sarah Johnson',
        phone: '+1987654321'
      }
    });

    const agent1 = await prisma.agent.upsert({
      where: { agentId: 'test-agent-1' },
      update: {},
      create: {
        agentId: 'test-agent-1',
        firstName: 'Alice',
        lastName: 'Wilson',
        email: 'alice@example.com',
        status: 'available'
      }
    });

    const agent2 = await prisma.agent.upsert({
      where: { agentId: 'test-agent-2' },
      update: {},
      create: {
        agentId: 'test-agent-2',
        firstName: 'Bob',
        lastName: 'Davis',
        email: 'bob@example.com',
        status: 'available'
      }
    });

    // Create test call records
    const now = new Date();
    const callRecords = [
      {
        callId: 'call-1',
        campaignId: campaign.campaignId,
        contactId: contact1.contactId,
        agentId: agent1.agentId,
        phoneNumber: contact1.phone,
        startTime: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
        endTime: new Date(now.getTime() - 8 * 60 * 1000),   // 8 minutes ago
        duration: 120, // 2 minutes
        outcome: 'connected'
      },
      {
        callId: 'call-2',
        campaignId: campaign.campaignId,
        contactId: contact2.contactId,
        agentId: agent2.agentId,
        phoneNumber: contact2.phone,
        startTime: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
        endTime: new Date(now.getTime() - 4 * 60 * 1000),   // 4 minutes ago
        duration: 60, // 1 minute
        outcome: 'no_answer'
      },
      {
        callId: 'call-3',
        campaignId: campaign.campaignId,
        contactId: contact1.contactId,
        agentId: agent1.agentId,
        phoneNumber: contact1.phone,
        startTime: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
        endTime: new Date(now.getTime() - 1 * 60 * 1000),   // 1 minute ago
        duration: 45, // 45 seconds
        outcome: 'dropped'
      }
    ];

    for (const record of callRecords) {
      await prisma.callRecord.upsert({
        where: { callId: record.callId },
        update: record,
        create: record
      });
    }

    console.log('✅ Test call records created successfully');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();