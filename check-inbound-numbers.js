const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInboundNumbers() {
  try {
    console.log('📞 CHECKING INBOUND NUMBERS\n');
    console.log('='.repeat(60));

    const inboundNumbers = await prisma.inboundNumber.findMany({
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        isActive: true,
        assignedFlowId: true,
        greetingAudioUrl: true,
        voicemailAudioUrl: true,
        outOfHoursAudioUrl: true
      }
    });

    console.log(`\nFound ${inboundNumbers.length} inbound numbers:\n`);

    inboundNumbers.forEach((num, index) => {
      console.log(`${index + 1}. ID: ${num.id}`);
      console.log(`   Phone: ${num.phoneNumber}`);
      console.log(`   Display Name: ${num.displayName || 'N/A'}`);
      console.log(`   Active: ${num.isActive}`);
      console.log(`   Assigned Flow: ${num.assignedFlowId || 'None'}`);
      console.log(`   Greeting Audio: ${num.greetingAudioUrl || 'None'}`);
      console.log(`   Voicemail Audio: ${num.voicemailAudioUrl || 'None'}`);
      console.log(`   Out of Hours Audio: ${num.outOfHoursAudioUrl || 'None'}`);
      console.log('');
    });

    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInboundNumbers();
