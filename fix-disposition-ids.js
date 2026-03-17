const { PrismaClient } = require('@prisma/client');

// Initialize Prisma client with the Railway database URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@postgres.railway.internal:5432/railway'
    }
  }
});

async function createMissingDispositions() {
  console.log('🔧 Creating missing dispositions in Railway database...\n');

  try {
    // Check current dispositions
    console.log('📋 Checking existing dispositions...');
    const existingDispositions = await prisma.disposition.findMany({
      select: { id: true, name: true, category: true }
    });
    
    console.log(`Found ${existingDispositions.length} existing dispositions:`);
    existingDispositions.forEach(d => {
      console.log(`  - ${d.name} (${d.category}) [${d.id}]`);
    });

    // Define the standard dispositions that the frontend expects
    const standardDispositions = [
      { name: 'Sale Made', category: 'positive', description: 'Successful sale completed' },
      { name: 'Appointment Booked', category: 'positive', description: 'Appointment scheduled' },
      { name: 'Interest Shown', category: 'positive', description: 'Customer showed interest' },
      { name: 'Connected', category: 'positive', description: 'Call connected successfully' },
      { name: 'Information Sent', category: 'positive', description: 'Information provided to customer' },
      
      { name: 'Call Back', category: 'neutral', description: 'Customer requested callback' },
      { name: 'No Answer', category: 'neutral', description: 'No answer received' },
      { name: 'Voicemail Left', category: 'neutral', description: 'Left voicemail message' },
      { name: 'Busy', category: 'neutral', description: 'Line was busy' },
      { name: 'Answering Machine', category: 'neutral', description: 'Reached answering machine' },
      
      { name: 'Not Interested', category: 'negative', description: 'Customer not interested' },
      { name: 'Do Not Call', category: 'negative', description: 'Customer requested no further calls' },
      { name: 'Wrong Number', category: 'negative', description: 'Incorrect phone number' },
      { name: 'Cancelled', category: 'negative', description: 'Customer cancelled' },
      { name: 'Hostile/Rude', category: 'negative', description: 'Hostile customer interaction' }
    ];

    console.log('\n🔧 Creating missing standard dispositions...');
    let createdCount = 0;
    
    for (const disp of standardDispositions) {
      // Check if disposition already exists (by name)
      const existing = existingDispositions.find(e => 
        e.name.toLowerCase() === disp.name.toLowerCase()
      );
      
      if (!existing) {
        try {
          const created = await prisma.disposition.create({
            data: {
              name: disp.name,
              category: disp.category,
              description: disp.description,
              isActive: true,
              requiresNotes: false,
              sortOrder: createdCount + 100
            }
          });
          
          console.log(`  ✅ Created: ${created.name} [${created.id}]`);
          createdCount++;
        } catch (error) {
          console.error(`  ❌ Failed to create ${disp.name}:`, error.message);
        }
      } else {
        console.log(`  ⏭️  Already exists: ${disp.name} [${existing.id}]`);
      }
    }

    console.log(`\n🎉 Created ${createdCount} new dispositions`);

    // Now ensure these dispositions are linked to the manual-dial campaign
    console.log('\n🔗 Linking dispositions to manual-dial campaign...');
    
    // Get or create manual-dial campaign
    const manualCampaign = await prisma.campaign.upsert({
      where: { campaignId: 'manual-dial' },
      update: {},
      create: {
        campaignId: 'manual-dial',
        name: 'Manual Dialing',
        dialMethod: 'Manual',
        status: 'Active',
        isActive: true,
        description: 'Manual dialing campaign',
        recordCalls: true
      }
    });

    // Get all dispositions
    const allDispositions = await prisma.disposition.findMany();
    
    // Link each disposition to manual-dial campaign
    let linkedCount = 0;
    for (const disposition of allDispositions) {
      try {
        await prisma.campaignDisposition.upsert({
          where: {
            campaignId_dispositionId: {
              campaignId: 'manual-dial',
              dispositionId: disposition.id
            }
          },
          update: {},
          create: {
            campaignId: 'manual-dial',
            dispositionId: disposition.id,
            isRequired: false,
            sortOrder: linkedCount + 1
          }
        });
        linkedCount++;
      } catch (error) {
        console.error(`Failed to link ${disposition.name}:`, error.message);
      }
    }
    
    console.log(`✅ Linked ${linkedCount} dispositions to manual-dial campaign`);

    // Final verification
    console.log('\n🔍 Final verification...');
    const finalCount = await prisma.disposition.count();
    const linkCount = await prisma.campaignDisposition.count({
      where: { campaignId: 'manual-dial' }
    });
    
    console.log(`📊 Total dispositions: ${finalCount}`);
    console.log(`🔗 Manual-dial campaign links: ${linkCount}`);
    
    console.log('\n✅ Disposition setup complete! Frontend should now work properly.');

  } catch (error) {
    console.error('❌ Error creating dispositions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingDispositions();