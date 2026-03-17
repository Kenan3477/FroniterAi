import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInboundNumbers() {
  console.log('🔢 Seeding inbound numbers...');

  // Only seed the real Twilio number for Omnivox
  const inboundNumbers = [
    {
      phoneNumber: '+442046343130',
      displayName: 'UK Local - London',
      country: 'GB',
      region: 'London',
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