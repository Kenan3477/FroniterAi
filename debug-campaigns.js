const { PrismaClient } = require('@prisma/client');

async function debugCampaigns() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:RDSPassword123!@omnivox-db.chheowg26zqb.us-east-1.rds.amazonaws.com:5432/omnivox_production'
      }
    }
  });

  try {
    console.log('🔍 Checking data lists in the database...');
    
    const dataLists = await prisma.dataList.findMany({
      select: {
        id: true,
        listId: true,
        name: true,
        active: true,
        totalContacts: true,
        createdAt: true
      }
    });
    
    console.log(`📊 Found ${dataLists.length} data lists:`);
    dataLists.forEach(list => {
      console.log(`  - ID: ${list.id} | listId: "${list.listId}" | name: "${list.name}" | active: ${list.active} | contacts: ${list.totalContacts}`);
    });
    
    if (dataLists.length === 0) {
      console.log('\n❌ No data lists found in database');
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugCampaigns();