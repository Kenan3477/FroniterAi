import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create initial users first
  console.log('👥 Creating initial users...');
  
  const users = [
    {
      username: 'admin',
      email: 'admin@omnivox-ai.com',
      password: 'OmnivoxAdmin2025!',
      role: 'ADMIN',
      firstName: 'System',
      lastName: 'Administrator'
    },
    {
      username: 'agent',
      email: 'agent@omnivox-ai.com',
      password: 'OmnivoxAgent2025!',
      role: 'AGENT',
      firstName: 'Demo',
      lastName: 'Agent'
    },
    {
      username: 'supervisor',
      email: 'supervisor@omnivox-ai.com',
      password: 'OmnivoxSupervisor2025!',
      role: 'SUPERVISOR',
      firstName: 'Demo',
      lastName: 'Supervisor'
    },
    {
      username: 'test-user',
      email: 'test.user@example.com',
      password: 'TestUser123!',
      role: 'AGENT',
      firstName: 'Test',
      lastName: 'User'
    },
    {
      username: 'kenan-test',
      email: 'kenan.test@gmail.com',
      password: 'KenanGmail123!',
      role: 'AGENT',
      firstName: 'Kenan',
      lastName: 'Test'
    }
  ];

  for (const user of users) {
    const hashedPassword = await bcryptjs.hash(user.password, 12);
    const fullName = `${user.firstName} ${user.lastName}`;
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
        role: user.role as any,
        firstName: user.firstName,
        lastName: user.lastName,
        name: fullName
      },
      create: {
        username: user.username,
        email: user.email,
        password: hashedPassword,
        role: user.role as any,
        firstName: user.firstName,
        lastName: user.lastName,
        name: fullName
      }
    });
    console.log(`✅ Created/updated user: ${user.email}`);
  }

  console.log('📞 Seeding inbound numbers...');

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
      capabilities: JSON.stringify(['VOICE', 'SMS'])
    },
    {
      id: 'us-toll-free',
      phoneNumber: '+15551234567',
      displayName: 'US Toll-Free',
      country: 'US',
      region: 'National',
      numberType: 'TOLL_FREE',
      provider: 'TWILIO',
      capabilities: JSON.stringify(['VOICE', 'SMS'])
    },
    {
      id: 'uk-mobile',
      phoneNumber: '+447700900123',
      displayName: 'UK Mobile',
      country: 'GB',
      region: 'National',
      numberType: 'MOBILE',
      provider: 'TWILIO',
      capabilities: JSON.stringify(['VOICE', 'SMS', 'MMS'])
    },
    {
      id: 'us-local-sf',
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
    console.log(`✅ Created/updated inbound number: ${number.displayName}`);
  }

  console.log('📈 Seeding campaigns...');

  // Create sample campaigns
  const campaigns = [
    {
      campaignId: 'DEMO-SALES-2025',
      name: 'Demo Sales Campaign',
      description: 'Demonstration sales campaign for lead generation',
      dialMethod: 'Progressive',
      status: 'Active',
      speed: 2.0,
      dropPercentage: 3.0,
      recordCalls: true,
      allowTransfers: true,
      maxLines: 5,
      dialRatio: 1.5,
      isActive: true
    },
    {
      campaignId: 'FOLLOW-UP-2025',
      name: 'Follow-up Campaign',
      description: 'Customer follow-up and retention campaign',
      dialMethod: 'Preview',
      status: 'Active',
      speed: 1.0,
      dropPercentage: 1.0,
      recordCalls: true,
      allowTransfers: false,
      maxLines: 3,
      dialRatio: 1.0,
      isActive: true
    },
    {
      campaignId: 'SURVEY-2025',
      name: 'Customer Survey',
      description: 'Customer satisfaction survey campaign',
      dialMethod: 'Predictive',
      status: 'Inactive',
      speed: 3.0,
      dropPercentage: 5.0,
      recordCalls: false,
      allowTransfers: false,
      maxLines: 10,
      dialRatio: 2.0,
      isActive: false
    }
  ];

  for (const campaign of campaigns) {
    await prisma.campaign.upsert({
      where: { campaignId: campaign.campaignId },
      update: campaign,
      create: campaign
    });
    console.log(`✅ Created/updated campaign: ${campaign.name}`);
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