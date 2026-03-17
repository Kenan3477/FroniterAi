const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRawFlows() {
  try {
    console.log('🔍 Checking existing flows with raw query...');
    const flows = await prisma.$queryRaw`SELECT * FROM flows LIMIT 10`;
    console.log('Existing flows:', JSON.stringify(flows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    
    // Try to check if flows table exists
    try {
      console.log('🔍 Checking table structure...');
      const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
      console.log('Available tables:', JSON.stringify(tables, null, 2));
    } catch (tableError) {
      console.error('Table check error:', tableError.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkRawFlows();