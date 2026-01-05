/**
 * Test script to create sample call records for testing the call records interface
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const sampleCallRecords = [
  {
    callId: 'CALL_001_' + Date.now(),
    agentId: '1', // Assuming agent with ID 1 exists
    contactId: '1', // Assuming contact with ID 1 exists  
    campaignId: '1', // Assuming campaign with ID 1 exists
    phoneNumber: '+1234567890',
    dialedNumber: '+1234567890',
    callType: 'outbound',
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    endTime: new Date(Date.now() - 3300000), // 55 minutes ago
    duration: 300, // 5 minutes
    outcome: 'CONNECTED',
    notes: 'Successful sales call, customer interested in premium package',
  },
  {
    callId: 'CALL_002_' + Date.now(),
    agentId: '2', 
    contactId: '2',
    campaignId: '1',
    phoneNumber: '+1987654321',
    callType: 'inbound',
    startTime: new Date(Date.now() - 7200000), // 2 hours ago
    endTime: new Date(Date.now() - 6900000), // 1h 55min ago
    duration: 180, // 3 minutes
    outcome: 'NO_ANSWER',
    notes: 'Customer did not answer the call',
  },
  {
    callId: 'CALL_003_' + Date.now(),
    agentId: '1',
    contactId: '3',
    campaignId: '2',
    phoneNumber: '+1555123456',
    callType: 'manual',
    startTime: new Date(Date.now() - 1800000), // 30 minutes ago
    endTime: new Date(Date.now() - 1200000), // 20 minutes ago
    duration: 600, // 10 minutes
    outcome: 'VOICEMAIL',
    notes: 'Left detailed voicemail with callback number',
  },
  {
    callId: 'CALL_004_' + Date.now(),
    agentId: '3',
    contactId: '4',
    campaignId: '1',
    phoneNumber: '+1666789012',
    callType: 'outbound',
    startTime: new Date(Date.now() - 900000), // 15 minutes ago
    endTime: new Date(Date.now() - 600000), // 10 minutes ago
    duration: 300, // 5 minutes
    outcome: 'BUSY',
    notes: 'Line was busy, will retry later',
  },
  {
    callId: 'CALL_005_' + Date.now(),
    agentId: '2',
    contactId: '5',
    campaignId: '2',
    phoneNumber: '+1777890123',
    callType: 'inbound',
    startTime: new Date(Date.now() - 300000), // 5 minutes ago
    endTime: new Date(Date.now() - 60000), // 1 minute ago
    duration: 240, // 4 minutes
    outcome: 'CONNECTED',
    notes: 'Customer support inquiry, resolved successfully',
  }
];

async function createSampleCallRecords() {
  try {
    console.log('Creating sample call records...');
    
    // Create sample call records
    for (const record of sampleCallRecords) {
      try {
        const created = await prisma.callRecord.create({
          data: record,
          include: {
            agent: true,
            contact: true,
            campaign: true,
          }
        });
        console.log(`✅ Created call record: ${created.callId}`);
      } catch (error) {
        console.log(`⚠️ Could not create call record ${record.callId}:`, error.message);
        
        // Try creating without foreign key constraints
        try {
          const basicRecord = await prisma.callRecord.create({
            data: {
              callId: record.callId,
              phoneNumber: record.phoneNumber,
              dialedNumber: record.dialedNumber,
              callType: record.callType,
              startTime: record.startTime,
              endTime: record.endTime,
              duration: record.duration,
              outcome: record.outcome,
              notes: record.notes,
            }
          });
          console.log(`✅ Created basic call record: ${basicRecord.callId}`);
        } catch (basicError) {
          console.log(`❌ Failed to create basic call record:`, basicError.message);
        }
      }
    }
    
    console.log('✅ Sample call records creation completed');
    
    // Query and display created records
    const records = await prisma.callRecord.findMany({
      include: {
        agent: true,
        contact: true,
        campaign: true,
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });
    
    console.log(`\n📊 Total call records in database: ${records.length}`);
    records.forEach(record => {
      console.log(`- ${record.callId}: ${record.phoneNumber} (${record.outcome}) - ${record.duration}s`);
    });
    
  } catch (error) {
    console.error('❌ Error creating sample call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createSampleCallRecords();