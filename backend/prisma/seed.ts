import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding inbound numbers...');

  // Create inbound numbers
  const inboundNumbers = [
    {
      id: 'uk-local-london',
      phoneNumber: '+442046343130',
      displayName: 'UK Local - London',
      country: 'GB',
      region: 'London',
      numberType: 'LOCAL',
      provider: 'TWILIO',
      capabilities: ['VOICE', 'SMS']
    },
    {
      id: 'us-toll-free',
      phoneNumber: '+15551234567',
      displayName: 'US Toll-Free',
      country: 'US',
      region: 'National',
      numberType: 'TOLL_FREE',
      provider: 'TWILIO',
      capabilities: ['VOICE', 'SMS']
    },
    {
      id: 'uk-mobile',
      phoneNumber: '+447700900123',
      displayName: 'UK Mobile',
      country: 'GB',
      region: 'National',
      numberType: 'MOBILE',
      provider: 'TWILIO',
      capabilities: ['VOICE', 'SMS', 'MMS']
    },
    {
      id: 'us-local-sf',
      phoneNumber: '+14155552456',
      displayName: 'US Local - San Francisco',
      country: 'US',
      region: 'San Francisco',
      numberType: 'LOCAL',
      provider: 'TWILIO',
      capabilities: ['VOICE', 'SMS']
    }
  ];

  for (const number of inboundNumbers) {
    await prisma.inboundNumber.upsert({
      where: { phoneNumber: number.phoneNumber },
      update: number,
      create: number
    });
    console.log(`✅ Created/updated inbound number: ${number.displayName}`);
  }

  console.log('🌱 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });