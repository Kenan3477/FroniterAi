/**
 * Create complete test data structure for call records
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createCompleteTestData() {
  try {
    console.log('🔍 Checking existing data...');
    
    // Check existing data lists
    const dataLists = await prisma.dataList.findMany({ take: 5 });
    console.log(`📋 Found ${dataLists.length} existing data lists`);
    
    // Check existing campaigns
    const campaigns = await prisma.campaign.findMany({ take: 5 });
    console.log(`📋 Found ${campaigns.length} existing campaigns`);
    
    let testList = dataLists[0];
    let testCampaign = campaigns[0];
    
    // Create test data list if none exists
    if (!testList) {
      console.log('📝 Creating test data list...');
      testList = await prisma.dataList.create({
        data: {
          listId: 'TEST_LIST_' + Date.now(),
          name: 'Test Contact List',
          active: true,
          totalContacts: 0
        }
      });
      console.log(`✅ Created test data list: ${testList.name}`);
    } else {
      console.log(`✅ Using existing data list: ${testList.name}`);
    }
    
    if (testCampaign) {
      console.log(`✅ Using existing campaign: ${testCampaign.name}`);
    } else {
      console.log('⚠️ No campaigns found - call records will need campaign IDs');
    }
    
    // Create test contact
    console.log('📝 Creating test contact...');
    const testContact = await prisma.contact.create({
      data: {
        contactId: 'TEST_CONTACT_' + Date.now(),
        listId: testList.listId, // Use listId field, not id field
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890',
        email: 'john.doe@test.com'
      }
    });
    console.log(`✅ Created test contact: ${testContact.firstName} ${testContact.lastName}`);
    
    // Create additional test contacts
    const additionalContacts = [
      {
        contactId: 'TEST_CONTACT_2_' + Date.now(),
        listId: testList.listId, // Use listId field, not id field
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1987654321',
        email: 'jane.smith@test.com'
      },
      {
        contactId: 'TEST_CONTACT_3_' + Date.now(),
        listId: testList.listId, // Use listId field, not id field
        firstName: 'Mike',
        lastName: 'Johnson',
        phone: '+1555123456',
        email: 'mike.johnson@test.com'
      }
    ];
    
    for (const contactData of additionalContacts) {
      const contact = await prisma.contact.create({ data: contactData });
      console.log(`✅ Created contact: ${contact.firstName} ${contact.lastName}`);
    }
    
    // Create test call records
    console.log('\n📝 Creating test call records...');
    
    if (!testCampaign) {
      console.log('❌ Cannot create call records without a campaign. Skipping call record creation.');
      return;
    }
    
    const testRecords = [
      {
        callId: 'DEMO_CALL_001_' + Date.now(),
        campaignId: testCampaign.campaignId, // Add required campaign ID
        contactId: testContact.contactId, // Use contactId field, not id field
        phoneNumber: testContact.phone,
        callType: 'outbound',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() - 3300000), // 55 minutes ago
        duration: 300, // 5 minutes
        outcome: 'CONNECTED',
        notes: 'Successful outbound call - customer interested in product demo',
      },
      {
        callId: 'DEMO_CALL_002_' + Date.now(),
        campaignId: testCampaign.campaignId, // Add required campaign ID
        contactId: testContact.contactId, // Use contactId field, not id field
        phoneNumber: '+1987654321',
        callType: 'inbound',
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        endTime: new Date(Date.now() - 6900000), // 1h 55min ago
        duration: 180, // 3 minutes
        outcome: 'NO_ANSWER',
        notes: 'Customer did not answer, will retry later',
      },
      {
        callId: 'DEMO_CALL_003_' + Date.now(),
        campaignId: testCampaign.campaignId, // Add required campaign ID
        contactId: testContact.contactId, // Use contactId field, not id field
        phoneNumber: '+1555123456',
        callType: 'manual',
        startTime: new Date(Date.now() - 1800000), // 30 minutes ago
        endTime: new Date(Date.now() - 1200000), // 20 minutes ago
        duration: 600, // 10 minutes
        outcome: 'VOICEMAIL',
        notes: 'Left detailed voicemail with callback number and email',
      },
      {
        callId: 'DEMO_CALL_004_' + Date.now(),
        campaignId: testCampaign.campaignId, // Add required campaign ID
        contactId: testContact.contactId, // Use contactId field, not id field
        phoneNumber: '+1666789012',
        callType: 'outbound',
        startTime: new Date(Date.now() - 900000), // 15 minutes ago
        endTime: new Date(Date.now() - 600000), // 10 minutes ago
        duration: 300, // 5 minutes
        outcome: 'BUSY',
        notes: 'Line was busy during business hours',
      },
      {
        callId: 'DEMO_CALL_005_' + Date.now(),
        campaignId: testCampaign.campaignId, // Add required campaign ID
        contactId: testContact.contactId, // Use contactId field, not id field
        phoneNumber: '+1777890123',
        callType: 'inbound',
        startTime: new Date(Date.now() - 300000), // 5 minutes ago
        endTime: new Date(Date.now() - 60000), // 1 minute ago
        duration: 240, // 4 minutes
        outcome: 'CONNECTED',
        notes: 'Customer support inquiry - issue resolved successfully',
      },
      {
        callId: 'DEMO_CALL_006_' + Date.now(),
        campaignId: testCampaign.campaignId, // Add required campaign ID
        contactId: testContact.contactId, // Use contactId field, not id field
        phoneNumber: '+1888901234',
        callType: 'outbound',
        startTime: new Date(Date.now() - 86400000), // Yesterday
        endTime: new Date(Date.now() - 86400000 + 420000), // Yesterday + 7 minutes
        duration: 420, // 7 minutes
        outcome: 'TRANSFERRED',
        notes: 'Call transferred to technical support team',
      }
    ];
    
    for (const record of testRecords) {
      try {
        const created = await prisma.callRecord.create({ data: record });
        console.log(`✅ Created call record: ${created.callId} (${record.outcome})`);
      } catch (error) {
        console.log(`❌ Failed to create call record: ${error.message}`);
      }
    }
    
    // Query final state
    const finalCallRecords = await prisma.callRecord.findMany({
      include: {
        contact: {
          select: { firstName: true, lastName: true, phone: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 10
    });
    
    console.log(`\n📊 Successfully created ${finalCallRecords.length} call records:`);
    finalCallRecords.forEach(record => {
      const contactName = record.contact ? `${record.contact.firstName} ${record.contact.lastName}` : 'Unknown';
      const duration = record.duration || 0;
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      console.log(`- ${record.callId}`);
      console.log(`  📞 ${record.phoneNumber} | 👤 ${contactName} | 📊 ${record.outcome} | ⏱️ ${mins}:${secs.toString().padStart(2, '0')}`);
      if (record.notes) {
        console.log(`  💬 ${record.notes.substring(0, 60)}${record.notes.length > 60 ? '...' : ''}`);
      }
      console.log('');
    });
    
    console.log('✅ Test data creation completed! You can now test the call records interface.');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createCompleteTestData();