const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSimpleFlows() {
  console.log('🌊 Creating simple flows without organizationId...');

  const sampleFlows = [
    {
      name: 'Welcome Flow',
      description: 'Basic welcome flow for new callers',
      status: 'ACTIVE',
      createdByUserId: 1,
      visibility: 'PRIVATE',
      isTemplate: false
    },
    {
      name: 'Customer Service Flow', 
      description: 'Flow for customer service inquiries',
      status: 'ACTIVE',
      createdByUserId: 1,
      visibility: 'PRIVATE',
      isTemplate: false
    },
    {
      name: 'Sales Flow',
      description: 'Flow for sales inquiries and leads',
      status: 'ACTIVE',
      createdByUserId: 1,
      visibility: 'PRIVATE',
      isTemplate: false
    }
  ];

  for (const flowData of sampleFlows) {
    try {
      const flow = await prisma.flow.create({
        data: flowData
      });
      console.log(`✅ Created flow: ${flow.name} (ID: ${flow.id})`);

      // Create a version for it
      const version = await prisma.flowVersion.create({
        data: {
          flowId: flow.id,
          versionNumber: 1,
          isActive: true,
          isDraft: false,
          publishedAt: new Date()
        }
      });
      console.log(`✅ Created version for flow: ${flow.name}`);

    } catch (flowError) {
      console.error(`❌ Failed to create flow ${flowData.name}:`, flowError.message);
    }
  }

  console.log('🎉 Simple flows creation completed!');
  await prisma.$disconnect();
}

createSimpleFlows();