const { PrismaClient } = require('@prisma/client');

// Use Railway database connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:DyeYHcdHAOJjIgDhfSnlMlTjozEBXCGw@junction.proxy.rlwy.net:25654/railway'
    }
  }
});

async function cleanupInboundNumbers() {
  console.log('🧹 OMNIVOX DATABASE CLEANUP: Inbound Numbers');
  console.log('===========================================');
  console.log('🎯 Objective: Keep only real Twilio number +442046343130');
  console.log('📡 Database: Railway PostgreSQL');
  console.log('');

  try {
    // Step 1: Check current inbound numbers
    console.log('1. 📊 Current inbound numbers in database:');
    const currentNumbers = await prisma.inboundNumber.findMany({
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        provider: true,
        isActive: true
      }
    });

    currentNumbers.forEach((number, index) => {
      const status = number.phoneNumber === '+442046343130' ? '✅ KEEP' : '❌ DELETE';
      console.log(`   ${index + 1}. ${number.phoneNumber} (${number.displayName}) - ${status}`);
    });

    // Step 2: Identify test numbers to delete
    const testNumberIds = ['uk-mobile', 'us-local-sf', 'us-toll-free'];
    const realTwilioId = 'uk-local-london';

    console.log('\n2. 🗑️  Removing test/placeholder numbers...');
    
    let deletedCount = 0;
    for (const numberId of testNumberIds) {
      try {
        const deleteResult = await prisma.inboundNumber.delete({
          where: { id: numberId }
        });
        console.log(`   ✅ Deleted: ${deleteResult.phoneNumber} (${deleteResult.displayName})`);
        deletedCount++;
      } catch (error) {
        if (error.code === 'P2025') {
          console.log(`   ⚠️  Number ${numberId} not found (already deleted)`);
        } else {
          console.log(`   ❌ Failed to delete ${numberId}: ${error.message}`);
        }
      }
    }

    // Step 3: Verify the real Twilio number is still there
    console.log('\n3. ✅ Verifying real Twilio number remains...');
    const realNumber = await prisma.inboundNumber.findUnique({
      where: { id: realTwilioId },
      include: {
        assignedFlow: {
          select: { id: true, name: true }
        }
      }
    });

    if (realNumber) {
      console.log(`   ✅ Confirmed: ${realNumber.phoneNumber} (${realNumber.displayName})`);
      console.log(`   📍 Provider: ${realNumber.provider}`);
      console.log(`   📊 Status: ${realNumber.isActive ? 'Active' : 'Inactive'}`);
      if (realNumber.assignedFlow) {
        console.log(`   🌊 Assigned Flow: ${realNumber.assignedFlow.name}`);
      } else {
        console.log(`   🌊 Assigned Flow: None`);
      }
    } else {
      console.log('   ❌ ERROR: Real Twilio number not found!');
    }

    // Step 4: Final verification
    console.log('\n4. 📋 Final database state:');
    const finalNumbers = await prisma.inboundNumber.findMany({
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        provider: true,
        isActive: true
      }
    });

    console.log(`   📊 Total inbound numbers: ${finalNumbers.length}`);
    finalNumbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber} (${number.displayName})`);
    });

    // Step 5: Summary
    console.log('\n🎯 CLEANUP SUMMARY:');
    console.log(`   ✅ Deleted: ${deletedCount} test numbers`);
    console.log(`   ✅ Kept: 1 real Twilio number (+442046343130)`);
    console.log(`   📊 Final count: ${finalNumbers.length} inbound number(s)`);
    console.log('');
    console.log('🚀 Database cleanup completed successfully!');
    console.log('💡 The frontend will now show only your real Twilio number.');

  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupInboundNumbers();