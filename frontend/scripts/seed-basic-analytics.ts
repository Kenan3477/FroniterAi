import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBasicAnalyticsData() {
  console.log('🌱 Seeding basic analytics data...');

  try {
    // Create dispositions first
    const dispositions = [
      { name: 'Sale Completed', description: 'Successful sale', category: 'Successful' },
      { name: 'Appointment Set', description: 'Follow-up appointment scheduled', category: 'Successful' },
      { name: 'Call Back Later', description: 'Contact requested callback', category: 'Follow-up' },
      { name: 'Not Interested', description: 'Contact not interested', category: 'Not Interested' },
      { name: 'No Answer', description: 'No one answered', category: 'Unavailable' },
    ];

    const createdDispositions = [];
    for (const disp of dispositions) {
      // Check if disposition already exists
      const existing = await prisma.disposition.findFirst({
        where: { name: disp.name },
      });
      
      const created = existing || await prisma.disposition.create({
        data: disp,
      });
      
      createdDispositions.push(created);
    }

    // Create some campaigns
    const campaign1 = await prisma.campaign.upsert({
      where: { campaignId: 'camp-001' },
      update: {},
      create: {
        campaignId: 'camp-001',
        name: 'Lead Generation Campaign',
        description: 'Q4 2025 lead generation campaign',
        status: 'active',
        dialMethod: 'Progressive',
        speed: 2.5,
        dropPercentage: 1.0,
      },
    });

    // Create a data list first
    const dataList = await prisma.dataList.upsert({
      where: { listId: 'list-001' },
      update: {},
      create: {
        listId: 'list-001',
        name: 'Demo Contact List',
        active: true,
        totalContacts: 20,
      },
    });

    // Create some sample contacts
    const contacts = [];
    for (let i = 1; i <= 20; i++) {
      const contact = await prisma.contact.upsert({
        where: { contactId: `contact-${String(i).padStart(3, '0')}` },
        update: {},
        create: {
          contactId: `contact-${String(i).padStart(3, '0')}`,
          listId: 'list-001',
          firstName: `Contact${i}`,
          lastName: `LastName${i}`,
          phone: `555-000${String(i).padStart(2, '0')}`,
          email: `contact${i}@demo.com`,
          status: ['new', 'contacted', 'qualified'][i % 3],
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
        },
      });
      contacts.push(contact);
    }

    // Get any existing users to use as agents
    const existingUsers = await prisma.user.findMany({
      where: { role: 'AGENT' },
      take: 2,
    });

    if (existingUsers.length > 0) {
      // Create agents if they don't exist
      const agentRecords = [];
      for (const user of existingUsers) {
        const agentId = `agent-${user.id}`;
        try {
          const agent = await prisma.agent.upsert({
            where: { agentId },
            update: {},
            create: {
              agentId,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
            },
          });
          agentRecords.push(agent);
        } catch (error) {
          console.log(`Failed to create agent for user ${user.id}:`, error);
        }
      }

      if (agentRecords.length === 0) {
        console.log('No agents available, skipping call records creation');
        return;
      }

      // Create some sample call records using existing data
      for (let day = 0; day < 7; day++) {
        const callDate = new Date();
        callDate.setDate(callDate.getDate() - day);
        
        const callsPerDay = Math.floor(Math.random() * 10) + 5;
        
        for (let call = 0; call < callsPerDay; call++) {
          const contact = contacts[Math.floor(Math.random() * contacts.length)];
          const agent = agentRecords[Math.floor(Math.random() * agentRecords.length)];
          const disposition = createdDispositions[Math.floor(Math.random() * createdDispositions.length)];
          
          const startTime = new Date(callDate);
          startTime.setHours(9 + Math.floor(Math.random() * 8));
          startTime.setMinutes(Math.floor(Math.random() * 60));
          
          const duration = Math.floor(Math.random() * 300) + 30; // 30 seconds to 5 minutes
          const endTime = new Date(startTime);
          endTime.setSeconds(endTime.getSeconds() + duration);
          
          const outcome = ['answered', 'completed', 'no_answer'][Math.floor(Math.random() * 3)];
          
          try {
            await prisma.callRecord.create({
              data: {
                callId: `call-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                campaignId: campaign1.campaignId,
                contactId: contact.contactId,
                agentId: agent.agentId,  // Use agent.agentId instead of user.id
                phoneNumber: contact.phone,
                callType: 'outbound',
                startTime,
                endTime: outcome !== 'no_answer' ? endTime : null,
                duration: outcome !== 'no_answer' ? duration : 0,
                outcome,
                dispositionId: outcome === 'completed' ? disposition.id : null,
                notes: outcome === 'completed' ? `${disposition.category} - ${disposition.name}` : null,
              },
            });
          } catch (error) {
            console.log(`Skipping call record due to error: ${error}`);
          }
        }
      }
    }

    console.log('✅ Basic analytics data seeded successfully!');
    console.log(`- Created/updated ${contacts.length} contacts`);
    console.log(`- Created/updated ${createdDispositions.length} dispositions`);
    console.log('- Created sample call records');
    
  } catch (error) {
    console.error('❌ Error seeding analytics data:', error);
    throw error;
  }
}

// Run the seed function
seedBasicAnalyticsData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });