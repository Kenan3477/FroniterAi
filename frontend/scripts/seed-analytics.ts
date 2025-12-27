import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAnalyticsData() {
  console.log('🌱 Seeding analytics data...');

  try {
    // Create some sample campaigns first
    const campaign1 = await prisma.campaign.upsert({
      where: { campaignId: 'camp-001' },
      update: {},
      create: {
        campaignId: 'camp-001',
        name: 'Lead Generation Q4',
        description: 'Q4 2025 lead generation campaign',
        status: 'active',
        dialMethod: 'progressive',
        speed: 75,
        dropPercentage: 2.5,
        maxLines: 10,
        dialRatio: 3.0,
      },
    });

    const campaign2 = await prisma.campaign.upsert({
      where: { campaignId: 'camp-002' },
      update: {},
      create: {
        campaignId: 'camp-002',
        name: 'Customer Survey',
        description: 'Customer satisfaction survey campaign',
        status: 'active',
        dialMethod: 'preview',
        speed: 50,
        dropPercentage: 1.0,
        maxLines: 5,
        dialRatio: 1.5,
      },
    });

    // Create sample contacts
    const contacts = [];
    for (let i = 1; i <= 100; i++) {
      const contact = await prisma.contact.upsert({
        where: { contactId: `contact-${String(i).padStart(3, '0')}` },
        update: {},
        create: {
          contactId: `contact-${String(i).padStart(3, '0')}`,
          listId: 'list-001',
          firstName: `FirstName${i}`,
          lastName: `LastName${i}`,
          fullName: `FirstName${i} LastName${i}`,
          phone: `555-${String(i).padStart(4, '0')}`,
          email: `contact${i}@example.com`,
          company: i % 5 === 0 ? `Company ${Math.floor(i / 5)}` : null,
          status: ['new', 'contacted', 'qualified', 'converted', 'do_not_call'][i % 5],
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        },
      });
      contacts.push(contact);
    }

    // Get existing users to use as agents
    const agents = await prisma.user.findMany({
      where: { role: 'AGENT' },
      take: 3,
    });

    if (agents.length === 0) {
      console.log('No agents found. Creating sample agents...');
      // Create sample agents if none exist
      for (let i = 1; i <= 3; i++) {
        await prisma.user.upsert({
          where: { email: `agent${i}@kennex.com` },
          update: {},
          create: {
            username: `agent${i}`,
            email: `agent${i}@kennex.com`,
            password: '$2b$10$example.hash.for.demo.purposes.only', // This is just for demo
            firstName: `Agent`,
            lastName: `${i}`,
            name: `Agent ${i}`,
            role: 'AGENT',
            status: ['available', 'busy', 'away'][i % 3],
          },
        });
      }
    }

    // Refresh agents list
    const agentsList = await prisma.user.findMany({
      where: { role: 'AGENT' },
      take: 3,
    });

    // Create dispositions
    const dispositions = [
      { name: 'Sale Completed', category: 'Successful', description: 'Sale was successfully completed' },
      { name: 'Appointment Set', category: 'Successful', description: 'Appointment was successfully scheduled' },
      { name: 'Call Back Later', category: 'Follow-up', description: 'Customer requested callback later' },
      { name: 'Send Information', category: 'Follow-up', description: 'Customer requested information to be sent' },
      { name: 'Not Qualified', category: 'Not Interested', description: 'Customer not qualified for offer' },
      { name: 'No Need', category: 'Not Interested', description: 'Customer has no need for product/service' },
      { name: 'No Answer', category: 'Unavailable', description: 'No one answered the call' },
      { name: 'Voicemail', category: 'Unavailable', description: 'Call went to voicemail' },
      { name: 'Busy Signal', category: 'Unavailable', description: 'Line was busy' },
      { name: 'Requested Removal', category: 'Do Not Call', description: 'Customer requested to be removed from calls' },
    ];

    const createdDispositions = [];
    
    // Delete existing dispositions first
    await prisma.disposition.deleteMany();
    
    for (const disp of dispositions) {
      const created = await prisma.disposition.create({
        data: disp,
      });
      createdDispositions.push(created);
    }

    // Create sample call records
    console.log('Creating call records...');
    
    for (let day = 0; day < 30; day++) {
      const callDate = new Date();
      callDate.setDate(callDate.getDate() - day);
      
      // Create 5-20 calls per day
      const callsPerDay = Math.floor(Math.random() * 16) + 5;
      
      for (let call = 0; call < callsPerDay; call++) {
        const contact = contacts[Math.floor(Math.random() * contacts.length)];
        const agent = agentsList[Math.floor(Math.random() * agentsList.length)];
        const disposition = createdDispositions[Math.floor(Math.random() * createdDispositions.length)];
        
        // Random call time within business hours
        const startTime = new Date(callDate);
        startTime.setHours(9 + Math.floor(Math.random() * 8)); // 9 AM to 5 PM
        startTime.setMinutes(Math.floor(Math.random() * 60));
        startTime.setSeconds(Math.floor(Math.random() * 60));
        
        // Random call duration (30 seconds to 15 minutes)
        const duration = Math.floor(Math.random() * 14.5 * 60) + 30;
        
        const endTime = new Date(startTime);
        endTime.setSeconds(endTime.getSeconds() + duration);
        
        // Determine outcome based on disposition
        let outcome = 'completed';
        if (disposition.category === 'Unavailable') {
          outcome = Math.random() > 0.5 ? 'no_answer' : 'busy';
        } else if (disposition.category === 'Successful') {
          outcome = 'completed';
        } else {
          outcome = Math.random() > 0.7 ? 'completed' : 'answered';
        }
        
        await prisma.callRecord.create({
          data: {
            callId: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            campaignId: 'camp-001',
            contactId: contact.contactId,
            agentId: agent.id.toString(),
            phoneNumber: contact.phone,
            dialedNumber: contact.phone,
            callType: 'outbound',
            startTime,
            endTime: outcome !== 'no_answer' ? endTime : null,
            duration: outcome !== 'no_answer' ? duration : 0,
            outcome,
            dispositionId: outcome === 'completed' || outcome === 'answered' ? disposition.id : null,
            notes: outcome === 'completed' ? `${disposition.category} - ${disposition.name}` : null,
          },
        });
      }
    }

    console.log('✅ Analytics data seeded successfully!');
    console.log(`- Created/updated ${contacts.length} contacts`);
    console.log(`- Created/updated ${createdDispositions.length} dispositions`);
    console.log('- Created call records for the last 30 days');
    
  } catch (error) {
    console.error('❌ Error seeding analytics data:', error);
    throw error;
  }
}

// Run the seed function
seedAnalyticsData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });