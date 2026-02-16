#!/usr/bin/env node

/**
 * Create sample call records for testing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sampleCallRecords = [
  {
    callId: `CALL-${Date.now()}-1`,
    phoneNumber: '+447700900123',
    dialedNumber: '+447700900123',
    callType: 'outbound',
    startTime: new Date(Date.now() - 3600000), // 1 hour ago
    endTime: new Date(Date.now() - 3300000),   // 55 minutes ago
    duration: 300, // 5 minutes
    outcome: 'COMPLETED',
    notes: 'Customer interested in product demo'
  },
  {
    callId: `CALL-${Date.now()}-2`,
    phoneNumber: '+447700900456',
    dialedNumber: '+447700900456',
    callType: 'outbound',
    startTime: new Date(Date.now() - 7200000), // 2 hours ago
    endTime: new Date(Date.now() - 7000000),   // 1h 56m ago
    duration: 120, // 2 minutes
    outcome: 'NO_ANSWER',
    notes: 'No answer - voicemail left'
  },
  {
    callId: `CALL-${Date.now()}-3`,
    phoneNumber: '+447700900789',
    dialedNumber: '+447700900789',
    callType: 'outbound',
    startTime: new Date(Date.now() - 10800000), // 3 hours ago
    endTime: new Date(Date.now() - 10200000),   // 2h 50m ago
    duration: 600, // 10 minutes
    outcome: 'SALE_COMPLETED',
    notes: 'Sale completed - follow up required'
  }
];

async function createSampleCallRecords() {
  try {
    console.log('📞 Creating sample call records...\n');

    for (const [index, record] of sampleCallRecords.entries()) {
      try {
        const created = await prisma.callRecord.create({
          data: record
        });
        console.log(`✅ Created call record: ${created.callId}`);
      } catch (error) {
        console.log(`⚠️ Could not create call record ${index + 1}:`, error.message);
        
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
              notes: record.notes
            }
          });
          console.log(`✅ Created basic call record: ${basicRecord.callId}`);
        } catch (basicError) {
          console.log(`❌ Failed to create basic call record:`, basicError.message);
        }
      }
    }
    
    console.log('\n✅ Sample call records creation completed');
    
    // Query and display created records
    const records = await prisma.callRecord.findMany({
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

createSampleCallRecords();