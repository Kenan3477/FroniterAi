import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInboundNumbers() {
  console.log('🔢 Seeding inbound numbers...');

  const inboundNumbers = [
    {
      phoneNumber: '+442046343130',
      displayName: 'UK Local - London',
      country: 'GB',
      region: 'London',
      numberType: 'LOCAL',
      provider: 'TWILIO',
      capabilities: JSON.stringify(['VOICE', 'SMS'])
    },
    {
      phoneNumber: '+15551234567',
      displayName: 'US Toll-Free',
      country: 'US',
      region: 'National',
      numberType: 'TOLL_FREE',
      provider: 'TWILIO',
      capabilities: JSON.stringify(['VOICE', 'SMS'])
    },
    {
      phoneNumber: '+447700900123',
      displayName: 'UK Mobile',
      country: 'GB',
      region: 'National',
      numberType: 'MOBILE',
      provider: 'TWILIO',
      capabilities: JSON.stringify(['VOICE', 'SMS', 'MMS'])
    },
    {
      phoneNumber: '+14155552456',
      displayName: 'US Local - San Francisco',
      country: 'US',
      region: 'San Francisco',
      numberType: 'LOCAL',
      provider: 'TWILIO',
      capabilities: JSON.stringify(['VOICE', 'SMS'])
    }
  ];

  for (const number of inboundNumbers) {
    await prisma.inboundNumber.upsert({
      where: { phoneNumber: number.phoneNumber },
      update: number,
      create: number
    });
  }

  console.log(`✅ Seeded ${inboundNumbers.length} inbound numbers`);
}

async function main() {
  try {
    await seedInboundNumbers();
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();