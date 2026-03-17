const { PrismaClient } = require('@prisma/client');

async function checkActualTables() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:EJhlgyhMsYUhNhaBRyHAjNSoCfTmlUPm@interchange.proxy.rlwy.net:42798/railway'
  });

  try {
    console.log('🔍 Checking actual database tables...');
    
    // Query to get all table names
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%session%' OR table_name LIKE '%audit%' OR table_name LIKE '%user%'
      ORDER BY table_name;
    `;
    
    console.log('Tables with session/audit/user in name:');
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    // Let's check if UserSession exists as a different name or case
    const allTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;
    
    console.log('\nAll public tables:');
    allTables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkActualTables();