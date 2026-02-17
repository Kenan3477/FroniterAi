/**
 * Final cleanup script to remove the remaining demo contact from Railway database
 */
const { PrismaClient } = require('@prisma/client');

async function finalDemoCleanup() {
  let prisma;
  
  try {
    console.log('🧹 Final demo cleanup - removing remaining demo contact...');
    
    // Initialize Prisma with Railway database URL
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      log: ['query', 'error', 'warn']
    });

    await prisma.$connect();
    console.log('✅ Connected to Railway database');

    // Check current state
    const beforeContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { phone: '+1234567890' },
          { firstName: 'John', lastName: 'Doe' },
          { phone: { contains: '1234567890' } }
        ]
      }
    });
    
    console.log(`📊 Found ${beforeContacts.length} demo contacts to clean:`);
    beforeContacts.forEach(contact => {
      console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.phone}) - ID: ${contact.id}`);
    });

    if (beforeContacts.length === 0) {
      console.log('✅ No demo contacts found - database is already clean!');
      return;
    }

    // Delete demo contacts
    const deleteResult = await prisma.contact.deleteMany({
      where: {
        OR: [
          { phone: '+1234567890' },
          { firstName: 'John', lastName: 'Doe' },
          { phone: { contains: '1234567890' } }
        ]
      }
    });

    console.log(`🗑️ Deleted ${deleteResult.count} demo contacts`);

    // Verify cleanup
    const afterContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { phone: '+1234567890' },
          { firstName: 'John', lastName: 'Doe' },
          { phone: { contains: '1234567890' } }
        ]
      }
    });

    console.log(`✅ Cleanup verification: ${afterContacts.length} demo contacts remaining`);
    
    // Show final database state
    const totalContacts = await prisma.contact.count();
    const totalCallRecords = await prisma.callRecord.count();
    const totalCampaigns = await prisma.campaign.count();
    
    console.log('\n📊 Final Railway Database State:');
    console.log(`  Total Contacts: ${totalContacts}`);
    console.log(`  Total Call Records: ${totalCallRecords}`);
    console.log(`  Total Campaigns: ${totalCampaigns}`);
    
    if (totalContacts === 0 && totalCallRecords === 0 && totalCampaigns === 0) {
      console.log('\n🎉 Railway database is now completely clean of demo data!');
    }

  } catch (error) {
    console.error('❌ Final cleanup error:', error);
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('📝 Database connection closed');
    }
  }
}

// Run the final cleanup
finalDemoCleanup();