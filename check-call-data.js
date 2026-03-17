require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function checkCallData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking call data for recording...');
    
    const call = await prisma.callRecord.findUnique({
      where: { id: 'cmlp65bce000amhihg98wkc0e' }
    });
    
    if (!call) {
      console.log('❌ Call not found');
      return;
    }
    
    console.log('📞 Call found:');
    console.log('ID:', call.id);
    console.log('Recording field:', call.recording);
    console.log('Duration:', call.duration);
    console.log('Phone:', call.phoneNumber);
    
    // Check for any calls that have recordings
    const callsWithRecordings = await prisma.callRecord.findMany({
      where: {
        recording: { not: null }
      },
      take: 5,
      select: {
        id: true,
        recording: true,
        duration: true,
        phoneNumber: true
      }
    });
    
    console.log('\n📻 Calls with recordings:');
    callsWithRecordings.forEach(call => {
      console.log(`${call.id}: ${call.recording} (${call.duration}s)`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCallData();