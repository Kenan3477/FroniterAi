#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearAllCallRecords() {
  console.log('🗑️ Clearing all call records from the system...\n');

  try {
    // First, let's see what we have
    const callRecords = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        agentId: true,
        recording: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Found ${callRecords.length} call records to delete:`);
    callRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.id}`);
      console.log(`   CallId: ${record.callId}`);
      console.log(`   Phone: ${record.phoneNumber}`);
      console.log(`   Agent: ${record.agentId}`);
      console.log(`   Recording: ${record.recording ? 'Yes' : 'No'}`);
      console.log(`   Created: ${record.createdAt}`);
      console.log('');
    });

    if (callRecords.length === 0) {
      console.log('✅ No call records found. Database is already clean.');
      return;
    }

    // Delete all call records
    console.log('🗑️ Deleting all call records...');
    const deleteResult = await prisma.callRecord.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.count} call records successfully!`);

    // Also check if there are any contacts we should clean up
    const contacts = await prisma.contact.findMany({
      where: {
        listId: 'manual-contacts'
      }
    });

    if (contacts.length > 0) {
      console.log(`\n📱 Found ${contacts.length} manual contacts. Cleaning up...`);
      const deleteContacts = await prisma.contact.deleteMany({
        where: {
          listId: 'manual-contacts'
        }
      });
      console.log(`✅ Deleted ${deleteContacts.count} manual contacts.`);
    }

    console.log('\n🎯 System cleanup complete!');
    console.log('✅ All call records removed');
    console.log('✅ Manual contacts cleaned up');
    console.log('✅ Ready for fresh test calls');
    
  } catch (error) {
    console.error('❌ Error clearing call records:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearAllCallRecords().catch(console.error);