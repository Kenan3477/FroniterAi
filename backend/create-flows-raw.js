const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createFlowsRaw() {
  console.log('🌊 Creating flows using raw SQL...');

  try {
    // First, let's check the actual structure of the flows table
    const flowsColumns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'flows' 
      ORDER BY ordinal_position;
    `;
    console.log('Flows table structure:', JSON.stringify(flowsColumns, null, 2));

    // Create flows using raw SQL based on what columns actually exist
    const flowsToCreate = [
      { name: 'Welcome Flow', description: 'Basic welcome flow for new callers' },
      { name: 'Customer Service Flow', description: 'Flow for customer service inquiries' },
      { name: 'Sales Flow', description: 'Flow for sales inquiries and leads' }
    ];

    for (const flow of flowsToCreate) {
      try {
        // Insert with minimal required columns
        const result = await prisma.$queryRaw`
          INSERT INTO flows (id, name, description, status, "createdByUserId", visibility, "isTemplate", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${flow.name}, ${flow.description}, 'ACTIVE', 1, 'PRIVATE', false, NOW(), NOW())
          RETURNING id, name;
        `;
        console.log(`✅ Created flow: ${flow.name}`, result);
      } catch (insertError) {
        console.error(`❌ Failed to create flow ${flow.name}:`, insertError.message);
      }
    }

    // Check what we created
    const createdFlows = await prisma.$queryRaw`SELECT id, name, description, status FROM flows`;
    console.log('📋 Created flows:', JSON.stringify(createdFlows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createFlowsRaw();