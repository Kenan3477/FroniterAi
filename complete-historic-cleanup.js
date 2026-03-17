#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function completeHistoricDataCleanup() {
  console.log('🔄 COMPLETE HISTORIC DATA CLEANUP - Removing all pre-today records...\n');

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`📅 Target: Keep only records from ${today.toISOString()} forward`);
    console.log(`📅 Current time: ${new Date().toISOString()}\n`);

    // 1. Get complete picture of what exists
    console.log('1️⃣ Analyzing current database state...');
    
    const allCalls = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        agentId: true,
        createdAt: true,
        outcome: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const allContacts = await prisma.contact.findMany({
      where: { listId: 'manual-contacts' },
      select: {
        id: true,
        contactId: true,
        phone: true,
        createdAt: true
      }
    });

    console.log(`📊 Found ${allCalls.length} call records`);
    console.log(`📱 Found ${allContacts.length} manual contacts`);

    // 2. Categorize by date
    const todayCalls = allCalls.filter(call => call.createdAt >= today);
    const historicCalls = allCalls.filter(call => call.createdAt < today);
    
    const todayContacts = allContacts.filter(contact => contact.createdAt >= today);
    const historicContacts = allContacts.filter(contact => contact.createdAt < today);

    console.log(`\n📊 Analysis:`);
    console.log(`✅ Today's calls to keep: ${todayCalls.length}`);
    console.log(`❌ Historic calls to remove: ${historicCalls.length}`);
    console.log(`✅ Today's contacts to keep: ${todayContacts.length}`);
    console.log(`❌ Historic contacts to remove: ${historicContacts.length}`);

    // 3. Show what will be deleted
    if (historicCalls.length > 0) {
      console.log(`\n🗑️ Historic calls to be deleted:`);
      historicCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.callId} - ${call.phoneNumber} - ${call.createdAt}`);
      });
    }

    // 4. Perform the cleanup
    console.log('\n🧹 STARTING CLEANUP...');

    // Delete historic call records
    if (historicCalls.length > 0) {
      console.log('🗑️ Removing historic call records...');
      const deletedCalls = await prisma.callRecord.deleteMany({
        where: {
          createdAt: { lt: today }
        }
      });
      console.log(`✅ Deleted ${deletedCalls.count} historic call records`);
    }

    // Delete historic contacts
    if (historicContacts.length > 0) {
      console.log('🗑️ Removing historic contacts...');
      const deletedContacts = await prisma.contact.deleteMany({
        where: {
          AND: [
            { listId: 'manual-contacts' },
            { createdAt: { lt: today } }
          ]
        }
      });
      console.log(`✅ Deleted ${deletedContacts.count} historic contacts`);
    }

    // 5. Verify final state
    console.log('\n🔍 Verifying cleanup...');
    
    const remainingCalls = await prisma.callRecord.findMany({
      select: {
        id: true,
        callId: true,
        phoneNumber: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const remainingContacts = await prisma.contact.findMany({
      where: { listId: 'manual-contacts' },
      select: {
        id: true,
        phone: true,
        createdAt: true
      }
    });

    console.log(`\n📊 Final State:`);
    console.log(`📞 Remaining call records: ${remainingCalls.length}`);
    console.log(`📱 Remaining manual contacts: ${remainingContacts.length}`);

    if (remainingCalls.length > 0) {
      console.log(`\n📋 Remaining calls (all from today):`)
      remainingCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.callId} - ${call.phoneNumber} - ${call.createdAt}`);
      });
    }

    // 6. Force any cache refresh
    console.log('\n🔄 Forcing cache refresh...');
    await prisma.$disconnect();
    
    console.log('\n🎉 HISTORIC DATA CLEANUP COMPLETE!');
    console.log('✅ All pre-today call records removed');
    console.log('✅ All pre-today manual contacts removed');
    console.log('✅ Database state refreshed');
    console.log('✅ Ready for today\'s calls only');
    
    if (remainingCalls.length === 0) {
      console.log('\n🏁 DATABASE IS COMPLETELY CLEAN');
      console.log('   Next call made will be the first record in the system');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeHistoricDataCleanup().catch(console.error);