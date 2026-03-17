import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedInboundNumbers = async () => {
  console.log('🌱 Seeding inbound numbers...');

  // Create sample inbound numbers
  const inboundNumbers = [
    {
      phoneNumber: '+442046343130',
      displayName: 'UK Local - London',
      description: 'Primary UK inbound number for customer service',
      country: 'GB',
      region: 'London',
      numberType: 'LOCAL',
      provider: 'TWILIO',
      isActive: true,
      capabilities: JSON.stringify({
        voice: true,
        sms: true,
        mms: false
      }),
      greetingAudioUrl: null,
      noAnswerAudioUrl: null,
      outOfHoursAudioUrl: null,
      busyAudioUrl: null,
      voicemailAudioUrl: null,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'Europe/London',
      routeToQueueId: null
    },
    {
      phoneNumber: '+448000123456',
      displayName: 'UK Toll Free',
      description: 'Toll-free number for customer inquiries',
      country: 'GB',
      region: 'National',
      numberType: 'TOLL_FREE',
      provider: 'TWILIO',
      isActive: true,
      capabilities: JSON.stringify({
        voice: true,
        sms: false,
        mms: false
      }),
      greetingAudioUrl: null,
      noAnswerAudioUrl: null,
      outOfHoursAudioUrl: null,
      busyAudioUrl: null,
      voicemailAudioUrl: null,
      businessHoursStart: '08:00',
      businessHoursEnd: '18:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'Europe/London',
      routeToQueueId: null
    },
    {
      phoneNumber: '+18005551234',
      displayName: 'US Toll Free',
      description: 'US toll-free number for international customers',
      country: 'US',
      region: 'National',
      numberType: 'TOLL_FREE',
      provider: 'TWILIO',
      isActive: true,
      capabilities: JSON.stringify({
        voice: true,
        sms: true,
        mms: true
      }),
      greetingAudioUrl: null,
      noAnswerAudioUrl: null,
      outOfHoursAudioUrl: null,
      busyAudioUrl: null,
      voicemailAudioUrl: null,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: 'Monday,Tuesday,Wednesday,Thursday,Friday',
      timezone: 'America/New_York',
      routeToQueueId: null
    }
  ];

  // Delete existing numbers to avoid conflicts
  await prisma.inboundNumber.deleteMany({});
  console.log('🗑️ Cleared existing inbound numbers');

  // Create new numbers
  for (const numberData of inboundNumbers) {
    const number = await prisma.inboundNumber.create({
      data: numberData
    });
    console.log(`✅ Created inbound number: ${number.displayName} (${number.phoneNumber})`);
  }

  console.log('✅ Inbound numbers seeded successfully');
};

export default seedInboundNumbers;

// Run seeding if this file is executed directly
if (require.main === module) {
  seedInboundNumbers()
    .catch((e) => {
      console.error('❌ Error seeding inbound numbers:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}