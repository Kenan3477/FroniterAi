const { PrismaClient } = require('@prisma/client');

// This script connects DIRECTLY to Railway's database to remove test numbers
const RAILWAY_DATABASE_URL = 'postgresql://postgres:RXKPEJfcKGFYWdklGkdVGHlIzGLVBaZZ@junction.proxy.rlwy.net:48052/railway';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: RAILWAY_DATABASE_URL
    }
  }
});

async function cleanupRailwayInboundNumbers() {
  console.log('🚨 RAILWAY DATABASE CLEANUP: Removing Test Inbound Numbers');
  console.log('=======================================================');
  console.log('🎯 Target: Railway PostgreSQL Database');
  console.log('✅ Keep: +442046343130 (Real Twilio number)');
  console.log('❌ Delete: +447700900123, +14155552456, +15551234567 (Test numbers)');
  console.log('');
  
  try {
    // 1. Show current state
    console.log('1. 📊 CURRENT Railway inbound numbers:');
    const currentNumbers = await prisma.inboundNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    });
    
    currentNumbers.forEach((num, i) => {
      const status = num.phoneNumber === '+442046343130' ? '✅ KEEP' : '❌ DELETE';
      console.log(`   ${i + 1}. ${num.phoneNumber} (${num.displayName}) - ${status}`);
    });
    
    console.log('');
    
    // 2. Delete test numbers by specific phone numbers
    console.log('2. 🗑️  DELETING test numbers from Railway database...');
    
    const testNumbers = ['+447700900123', '+14155552456', '+15551234567'];
    let totalDeleted = 0;
    
    for (const phoneNumber of testNumbers) {
      const deleteResult = await prisma.inboundNumber.deleteMany({
        where: { phoneNumber }
      });
      
      console.log(`   ✅ Deleted ${deleteResult.count} record(s) for ${phoneNumber}`);
      totalDeleted += deleteResult.count;
    }
    
    console.log('');
    console.log(`📊 Total records deleted: ${totalDeleted}`);
    console.log('');
    
    // 3. Verify final state
    console.log('3. ✅ FINAL Railway verification:');
    const finalNumbers = await prisma.inboundNumber.findMany({
      orderBy: { phoneNumber: 'asc' }
    });
    
    console.log(`📊 Total remaining numbers: ${finalNumbers.length}`);
    finalNumbers.forEach((num, i) => {
      console.log(`   ${i + 1}. ${num.phoneNumber} (${num.displayName})`);
    });
    
    if (finalNumbers.length === 1 && finalNumbers[0].phoneNumber === '+442046343130') {
      console.log('');
      console.log('🎉 SUCCESS: Railway database cleaned!');
      console.log('✅ Only your real Twilio number remains: +442046343130');
      console.log('✅ Railway API should now return only 1 number');
    } else {
      console.log('');
      console.log('❌ WARNING: Railway cleanup incomplete');
      console.log(`Expected: 1 number (+442046343130)`);
      console.log(`Actual: ${finalNumbers.length} numbers`);
    }
    
  } catch (error) {
    console.error('❌ Railway database cleanup error:', error);
    console.log('💡 Ensure Railway database credentials are correct');
    console.log('💡 Ensure network access to Railway database');
  } finally {
    await prisma.$disconnect();
    console.log('');
    console.log('🔌 Disconnected from Railway database');
  }
}

cleanupRailwayInboundNumbers();