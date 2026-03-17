/**
 * Simple script to create sample flows for testing inbound number assignment
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSampleFlows() {
  console.log('🌊 Creating sample flows...');

  try {
    // First, let's create a default organization if it doesn't exist
    let organization;
    try {
      organization = await prisma.organization.upsert({
        where: { name: 'default' },
        update: {},
        create: {
          name: 'default',
          displayName: 'Default Organization',
          description: 'Default organization for flows',
          website: null,
          industry: null,
          size: null,
          timezone: 'UTC'
        }
      });
      console.log('✅ Default organization ensured:', organization.displayName);
    } catch (orgError) {
      console.log('⚠️ Organization creation failed, continuing anyway:', orgError.message);
    }

    // Create some sample flows
    const sampleFlows = [
      {
        name: 'Welcome Flow',
        description: 'Basic welcome flow for new callers',
        status: 'ACTIVE'
      },
      {
        name: 'Customer Service Flow', 
        description: 'Flow for customer service inquiries',
        status: 'ACTIVE'
      },
      {
        name: 'Sales Flow',
        description: 'Flow for sales inquiries and leads',
        status: 'ACTIVE'
      },
      {
        name: 'Support Flow',
        description: 'Flow for technical support requests',
        status: 'INACTIVE'
      }
    ];

    for (const flowData of sampleFlows) {
      try {
        // First create the basic flow
        const flow = await prisma.flow.create({
          data: {
            ...flowData,
            createdByUserId: 1,
            organizationId: organization ? organization.id : 'clm0000000000000000000001',
            visibility: 'PRIVATE',
            isTemplate: false
          }
        });
        console.log(`✅ Created flow: ${flow.name} (ID: ${flow.id})`);

        // Then create a version for it
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

    console.log('🎉 Sample flows creation completed!');

  } catch (error) {
    console.error('❌ Error creating sample flows:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createSampleFlows();
}

module.exports = { createSampleFlows };