/**
 * Seed Inbound Numbers
 * Creates the actual inbound number record in the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedInboundNumbers() {
  try {
    console.log('📞 SEEDING INBOUND NUMBERS\n');
    console.log('='.repeat(60));

    // Check if number already exists
    const existing = await prisma.inboundNumber.findUnique({
      where: { phoneNumber: '+442046343130' }
    });

    if (existing) {
      console.log('✅ Inbound number already exists!');
      console.log('   ID:', existing.id);
      console.log('   Phone:', existing.phoneNumber);
      console.log('   Display Name:', existing.displayName);
      console.log('   Assigned Flow:', existing.assignedFlowId || 'None');
      console.log('   Greeting Audio:', existing.greetingAudioUrl || 'None');
      console.log('   Voicemail Audio:', existing.voicemailAudioUrl || 'None');
      console.log('   Out of Hours Audio:', existing.outOfHoursAudioUrl || 'None');
      console.log('\n='.repeat(60));
      return;
    }

    // Create the inbound number
    const inboundNumber = await prisma.inboundNumber.create({
      data: {
        phoneNumber: '+442046343130',
        displayName: 'UK Local - London',
        description: 'Main UK inbound number',
        country: 'GB',
        region: 'London',
        numberType: 'LOCAL',
        provider: 'TWILIO',
        capabilities: JSON.stringify(['VOICE', 'SMS']),
        isActive: true,
        businessHours: '24 Hours',
        outOfHoursAction: 'Hangup',
        routeTo: 'Hangup',
        recordCalls: true,
        autoRejectAnonymous: true,
        createContactOnAnonymous: true,
        integration: 'None',
        countryCode: 'United Kingdom Of Great Britain And Northern Ireland (The) (GB)',
        lookupSearchFilter: 'All Lists',
        assignedToDefaultList: true,
        timezone: 'Europe/London',
        businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00'
      }
    });

    console.log('✅ CREATED INBOUND NUMBER!\n');
    console.log('   ID:', inboundNumber.id);
    console.log('   Phone:', inboundNumber.phoneNumber);
    console.log('   Display Name:', inboundNumber.displayName);
    console.log('   Country:', inboundNumber.country);
    console.log('   Region:', inboundNumber.region);
    console.log('   Provider:', inboundNumber.provider);
    console.log('   Active:', inboundNumber.isActive);
    console.log('\n='.repeat(60));
    console.log('\n✅ You can now save settings for this inbound number!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedInboundNumbers();
