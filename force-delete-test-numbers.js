const { PrismaClient } = require('@prisma/client');

// Use Railway database connection
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:DyeYHcdHAOJjIgDhfSnlMlTjozEBXCGw@junction.proxy.rlwy.net:25654/railway'
    }
  }
});

async function forceDeleteTestNumbers() {
  console.log('🔥 FORCE DELETE: Test Inbound Numbers');
  console.log('====================================');

  try {
    // Step 1: Get ALL inbound numbers
    console.log('1. 📊 Current inbound numbers:');
    const allNumbers = await prisma.inboundNumber.findMany();
    
    allNumbers.forEach((number, index) => {
      const action = number.phoneNumber === '+442046343130' ? '✅ KEEP' : '❌ DELETE';
      console.log(`   ${index + 1}. ${number.phoneNumber} (${number.displayName}) - ${action}`);
    });

    // Step 2: Force delete by phone number
    const testNumbers = ['+447700900123', '+14155552456', '+15551234567'];
    
    console.log('\n2. 🗑️  Force deleting test numbers by phone number...');
    
    for (const phoneNumber of testNumbers) {
      try {
        const deleteResult = await prisma.inboundNumber.deleteMany({
          where: { 
            phoneNumber: phoneNumber 
          }
        });
        console.log(`   ✅ Deleted ${deleteResult.count} record(s) for ${phoneNumber}`);
      } catch (error) {
        console.log(`   ❌ Error deleting ${phoneNumber}: ${error.message}`);
      }
    }

    // Step 3: Verify final state
    console.log('\n3. ✅ Final verification:');
    const finalNumbers = await prisma.inboundNumber.findMany();
    
    console.log(`   📊 Total remaining numbers: ${finalNumbers.length}`);
    finalNumbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber} (${number.displayName})`);
    });

    if (finalNumbers.length === 1 && finalNumbers[0].phoneNumber === '+442046343130') {
      console.log('\n🎉 SUCCESS: Only your real Twilio number remains!');
      console.log('✅ Database is now clean');
      console.log('✅ Railway should now return only 1 number');
    } else {
      console.log('\n⚠️  WARNING: Unexpected final state');
    }

    // Step 4: Test the query that the API uses
    console.log('\n4. 🧪 Testing API query (active numbers only):');
    const activeNumbers = await prisma.inboundNumber.findMany({
      where: {
        isActive: true
      },
      include: {
        assignedFlow: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
    
    console.log(`   📊 Active numbers found: ${activeNumbers.length}`);
    activeNumbers.forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber} (Active: ${number.isActive})`);
    });

  } catch (error) {
    console.error('❌ Force delete failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

forceDeleteTestNumbers();