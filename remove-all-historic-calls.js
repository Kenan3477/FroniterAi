#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeAllHistoricCallRecords() {
  console.log('🗑️ Removing ALL historic call records from the system...\n');

  try {
    // Get current date (start of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Keeping only calls from: ${today.toISOString()}`);
    console.log(`📅 Current time: ${new Date().toISOString()}\n`);

    // First, let's see what we have
    const allCallRecords = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        agentId: true,
        recording: true,
        createdAt: true,
        outcome: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${allCallRecords.length} total call records:`);
    
    let todayCount = 0;
    let historicCount = 0;
    
    allCallRecords.forEach((record, index) => {
      const isFromToday = record.createdAt >= today;
      if (isFromToday) {
        todayCount++;
        console.log(`✅ KEEP - ${record.callId} (${record.phoneNumber}) - ${record.createdAt}`);
      } else {
        historicCount++;
        console.log(`❌ DELETE - ${record.callId} (${record.phoneNumber}) - ${record.createdAt}`);
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`✅ Calls to keep (today): ${todayCount}`);
    console.log(`❌ Historic calls to delete: ${historicCount}`);

    if (historicCount === 0) {
      console.log('✅ No historic records found. Database is already clean.');
      return;
    }

    // Delete all historic call records (before today)
    console.log('\n🗑️ Deleting all historic call records...');
    const deleteResult = await prisma.callRecord.deleteMany({
      where: {
        createdAt: {
          lt: today
        }
      }
    });
    console.log(`✅ Deleted ${deleteResult.count} historic call records!`);

    // Also clean up historic contacts that were created before today
    console.log('\n📱 Cleaning up historic manual contacts...');
    const deleteContacts = await prisma.contact.deleteMany({
      where: {
        AND: [
          { listId: 'manual-contacts' },
          { createdAt: { lt: today } }
        ]
      }
    });
    console.log(`✅ Deleted ${deleteContacts.count} historic manual contacts.`);

    // Verify what's left
    const remainingRecords = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n📊 Remaining call records: ${remainingRecords.length}`);
    if (remainingRecords.length > 0) {
      console.log('📋 Remaining records (today only):');
      remainingRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.callId} - ${record.phoneNumber} - ${record.createdAt}`);
      });
    }

    console.log('\n🎯 Historic cleanup complete!');
    console.log('✅ All pre-today call records removed');
    console.log('✅ Only today\'s calls (if any) remain');
    console.log('✅ Ready for fresh call recording tests');
    
  } catch (error) {
    console.error('❌ Error removing historic call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeAllHistoricCallRecords().catch(console.error);