const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createBasicFlows() {
  console.log('🌊 Creating flows with basic schema...');

  try {
    const flowsToCreate = [
      { name: 'Welcome Flow', description: 'Basic welcome flow for new callers' },
      { name: 'Customer Service Flow', description: 'Flow for customer service inquiries' },
      { name: 'Sales Flow', description: 'Flow for sales inquiries and leads' },
      { name: 'Support Flow', description: 'Technical support flow' }
    ];

    for (const flow of flowsToCreate) {
      try {
        // Insert with only the columns that exist
        const result = await prisma.$queryRaw`
          INSERT INTO flows (id, name, description, status, "createdByUserId", "createdAt", "updatedAt")
          VALUES (gen_random_uuid()::text, ${flow.name}, ${flow.description}, 'ACTIVE', 1, NOW(), NOW())
          RETURNING id, name;
        `;
        console.log(`✅ Created flow: ${flow.name}`, result);
      } catch (insertError) {
        console.error(`❌ Failed to create flow ${flow.name}:`, insertError.message);
      }
    }

    // Check what we created
    const createdFlows = await prisma.$queryRaw`SELECT id, name, description, status FROM flows`;
    console.log('📋 All flows:', JSON.stringify(createdFlows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createBasicFlows();