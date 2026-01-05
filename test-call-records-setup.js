/**
 * Check existing data and create test call records properly
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testCallRecordsSetup() {
  try {
    console.log('🔍 Checking existing data...');
    
    // Check existing contacts
    const contacts = await prisma.contact.findMany({ take: 5 });
    console.log(`📞 Found ${contacts.length} existing contacts`);
    
    // Check existing agents  
    const agents = await prisma.agent.findMany({ take: 5 });
    console.log(`👥 Found ${agents.length} existing agents`);
    
    // Check existing campaigns
    const campaigns = await prisma.campaign.findMany({ take: 5 });
    console.log(`📋 Found ${campaigns.length} existing campaigns`);
    
    // Check existing call records
    const callRecords = await prisma.callRecord.findMany({ take: 5 });
    console.log(`📞 Found ${callRecords.length} existing call records`);
    
    // If we have contacts, create call records using them
    if (contacts.length > 0) {
      console.log('\n📝 Creating test call records with existing contact...');
      
      const testRecords = [
        {
          callId: 'TEST_CALL_001_' + Date.now(),
          contactId: contacts[0].id,
          phoneNumber: contacts[0].phone || '+1234567890',
          callType: 'outbound',
          startTime: new Date(Date.now() - 3600000), // 1 hour ago
          endTime: new Date(Date.now() - 3300000), // 55 minutes ago
          duration: 300,
          outcome: 'CONNECTED',
          notes: 'Test call record created for interface demonstration',
        },
        {
          callId: 'TEST_CALL_002_' + Date.now(),
          contactId: contacts[0].id,
          phoneNumber: '+1987654321',
          callType: 'inbound',
          startTime: new Date(Date.now() - 1800000), // 30 minutes ago
          endTime: new Date(Date.now() - 1500000), // 25 minutes ago
          duration: 180,
          outcome: 'NO_ANSWER',
          notes: 'Inbound test call for interface',
        }
      ];
      
      for (const record of testRecords) {
        try {
          const created = await prisma.callRecord.create({ data: record });
          console.log(`✅ Created call record: ${created.callId}`);
        } catch (error) {
          console.log(`❌ Failed to create call record: ${error.message}`);
        }
      }
    } else {
      console.log('\n📝 Creating test contact and call records...');
      
      // Create a test contact first
      const testContact = await prisma.contact.create({
        data: {
          contactId: 'TEST_CONTACT_' + Date.now(),
          listId: '1',
          firstName: 'John',
          lastName: 'Doe',
          phone: '+1234567890',
          email: 'john.doe@test.com'
        }
      });
      
      console.log(`✅ Created test contact: ${testContact.contactId}`);
      
      // Create test call records
      const testRecords = [
        {
          callId: 'TEST_CALL_001_' + Date.now(),
          contactId: testContact.id,
          phoneNumber: testContact.phone,
          callType: 'outbound',
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 3300000),
          duration: 300,
          outcome: 'CONNECTED',
          notes: 'Test call record for interface',
        }
      ];
      
      for (const record of testRecords) {
        const created = await prisma.callRecord.create({ data: record });
        console.log(`✅ Created call record: ${created.callId}`);
      }
    }
    
    // Query final state
    const finalCallRecords = await prisma.callRecord.findMany({
      include: {
        contact: {
          select: { firstName: true, lastName: true, phone: true }
        },
        agent: {
          select: { firstName: true, lastName: true }
        },
        campaign: {
          select: { name: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });
    
    console.log(`\n📊 Current call records (${finalCallRecords.length} total):`);
    finalCallRecords.forEach(record => {
      const contactName = record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'Unknown';
      const agentName = record.agent ? `${record.agent.firstName} ${record.agent.lastName}` : 'No Agent';
      console.log(`- ${record.callId}: ${record.phoneNumber} | ${contactName} | ${agentName} | ${record.outcome} | ${record.duration || 0}s`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
testCallRecordsSetup();