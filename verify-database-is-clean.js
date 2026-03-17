#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabaseIsClean() {
  console.log('🔍 VERIFYING DATABASE IS COMPLETELY CLEAN...\n');

  try {
    // Count all records
    const callRecords = await prisma.callRecord.count();
    const contacts = await prisma.contact.count({
      where: { listId: 'manual-contacts' }
    });
    const allContacts = await prisma.contact.count();
    
    console.log('📊 DATABASE STATUS:');
    console.log(`📞 Call Records: ${callRecords}`);
    console.log(`📱 Manual Contacts: ${contacts}`);
    console.log(`📝 All Contacts: ${allContacts}`);

    if (callRecords === 0) {
      console.log('\n✅ SUCCESS: Database is completely clean');
      console.log('✅ No call records exist');
      console.log('✅ Ready for fresh testing');
      console.log('✅ Next call will be the first record');
    } else {
      console.log('\n⚠️ WARNING: Database still has records');
      
      // Show what records exist
      const remaining = await prisma.callRecord.findMany({
        select: {
          id: true,
          callId: true,
          phoneNumber: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      remaining.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.callId} - ${record.phoneNumber} - ${record.createdAt}`);
      });
    }

    // Check if browser is seeing cached data
    console.log('\n🌐 FRONTEND STATUS:');
    if (callRecords === 0) {
      console.log('🔄 If you still see call records in the browser:');
      console.log('   1. Clear browser cache (Cmd+Shift+R)');
      console.log('   2. Clear localStorage and cookies');
      console.log('   3. Hard refresh the page');
      console.log('   4. Re-login if needed');
    }

    console.log('\n🎯 READY FOR TESTING:');
    console.log('1. Make a call through Omnivox dialer');
    console.log('2. Complete call and save disposition');
    console.log('3. Check Call Records → should show your fresh call');

  } catch (error) {
    console.error('❌ Error verifying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseIsClean().catch(console.error);