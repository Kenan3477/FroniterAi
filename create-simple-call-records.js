/**
 * Simple test script to create standalone call records for testing the interface
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSimpleCallRecords() {
  try {
    console.log('Creating simple call records...');
    
    // Create simple records without foreign key dependencies
    const sampleRecords = [
      {
        callId: 'CALL_TEST_001_' + Date.now(),
        phoneNumber: '+1234567890',
        callType: 'outbound',
        startTime: new Date(Date.now() - 3600000), // 1 hour ago
        endTime: new Date(Date.now() - 3300000), // 55 minutes ago
        duration: 300, // 5 minutes
        outcome: 'CONNECTED',
        notes: 'Test call record for interface demonstration',
      },
      {
        callId: 'CALL_TEST_002_' + Date.now(),
        phoneNumber: '+1987654321',
        callType: 'inbound',
        startTime: new Date(Date.now() - 7200000), // 2 hours ago
        endTime: new Date(Date.now() - 6900000), // 1h 55min ago
        duration: 180, // 3 minutes
        outcome: 'NO_ANSWER',
        notes: 'Inbound call test record',
      },
      {
        callId: 'CALL_TEST_003_' + Date.now(),
        phoneNumber: '+1555123456',
        callType: 'manual',
        startTime: new Date(Date.now() - 1800000), // 30 minutes ago
        endTime: new Date(Date.now() - 1200000), // 20 minutes ago
        duration: 600, // 10 minutes
        outcome: 'VOICEMAIL',
        notes: 'Manual dial test call',
      }
    ];

    // First, check if we can create the Contact record
    console.log('Creating test contact...');
    let testContact;
    try {
      testContact = await prisma.contact.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          phoneNumbers: JSON.stringify(['+1234567890']),
          status: 'active'
        }
      });
      console.log('✅ Created test contact:', testContact.id);
    } catch (error) {
      console.log('⚠️ Contact creation failed:', error.message);
      // Try to find existing contact
      testContact = await prisma.contact.findFirst();
      if (testContact) {
        console.log('✅ Found existing contact:', testContact.id);
      }
    }
    
    // Try creating records with the contact
    if (testContact) {
      for (const [index, record] of sampleRecords.entries()) {
        try {
          const created = await prisma.callRecord.create({
            data: {
              ...record,
              contactId: testContact.id
            }
          });
          console.log(`✅ Created call record: ${created.callId}`);
        } catch (error) {
          console.log(`❌ Failed to create record ${index + 1}:`, error.message);
        }
      }
    }
    
    // Query and display created records
    const records = await prisma.callRecord.findMany({
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });
    
    console.log(`\n📊 Total call records in database: ${records.length}`);
    records.forEach(record => {
      console.log(`- ${record.callId}: ${record.phoneNumber} (${record.outcome}) - ${record.duration || 0}s`);
    });
    
  } catch (error) {
    console.error('❌ Error creating call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSimpleCallRecords();