const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

async function fixAuthenticationMapping() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== FIXING AUTHENTICATION & AGENT MAPPING ===\n');
    
    const userOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
    
    // 1. Get the admin user from Omnivox organization
    console.log('1. Getting Omnivox admin user...');
    const adminUser = await prisma.user.findFirst({
      where: {
        organizationId: userOrgId,
        role: 'ADMIN'
      }
    });
    
    if (!adminUser) {
      console.log('❌ No admin user found in Omnivox organization');
      return;
    }
    
    console.log('✅ Found admin user:', {
      id: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: adminUser.role
    });
    
    // 2. Create/update an agent record for this user
    console.log('\n2. Creating/updating agent record for admin user...');
    
    const adminAgentId = `admin-user-${adminUser.id}`;
    
    const adminAgent = await prisma.agent.upsert({
      where: { agentId: adminAgentId },
      create: {
        agentId: adminAgentId,
        firstName: adminUser.firstName || 'Admin',
        lastName: adminUser.lastName || 'User', 
        email: adminUser.email,
        status: 'Available',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        firstName: adminUser.firstName || 'Admin',
        lastName: adminUser.lastName || 'User',
        email: adminUser.email,
        status: 'Available',
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Admin agent record:', adminAgent.agentId);
    
    // 3. Assign all Omnivox campaigns to the admin agent
    console.log('\n3. Assigning campaigns to admin agent...');
    
    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId: userOrgId,
        status: 'ACTIVE'
      }
    });
    
    // Clear existing assignments for this agent
    await prisma.agentCampaignAssignment.deleteMany({
      where: { agentId: adminAgentId }
    });
    
    // Create new assignments
    for (const campaign of campaigns) {
      await prisma.agentCampaignAssignment.create({
        data: {
          agentId: adminAgentId,
          campaignId: campaign.campaignId,
          assignedAt: new Date()
        }
      });
    }
    
    console.log(`✅ Assigned ${campaigns.length} campaigns to admin agent`);
    
    // 4. Generate a correct JWT token
    console.log('\n4. Generating correct JWT token...');
    
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
    const correctToken = jwt.sign(
      {
        userId: adminUser.id,           // Integer ID that auth middleware expects
        username: adminUser.username || adminUser.email,
        email: adminUser.email,
        role: adminUser.role,
        organizationId: userOrgId,
        agentId: adminAgentId           // Add agent mapping
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    console.log('✅ Generated JWT token for admin user:');
    console.log('Token payload:', {
      userId: adminUser.id,
      username: adminUser.username || adminUser.email,
      email: adminUser.email,
      role: adminUser.role,
      organizationId: userOrgId,
      agentId: adminAgentId
    });
    
    // 5. Test the my-campaigns logic with correct user ID
    console.log('\n5. Testing my-campaigns endpoint logic...');
    
    // Simulate the actual my-campaigns endpoint
    const testUserId = adminUser.id.toString(); // This is what comes from JWT
    
    let agent = await prisma.agent.findFirst({
      where: { agentId: testUserId } // First try direct match
    });
    
    if (!agent) {
      // Try with our admin agent ID  
      agent = await prisma.agent.findFirst({
        where: { agentId: adminAgentId }
      });
    }
    
    if (agent) {
      const agentWithCampaigns = await prisma.agent.findUnique({
        where: { agentId: agent.agentId },
        include: {
          campaignAssignments: {
            where: { isActive: true },
            include: {
              campaign: {
                select: {
                  campaignId: true,
                  name: true,
                  description: true,
                  status: true,
                  isActive: true
                }
              }
            }
          }
        }
      });
      
      const activeCampaigns = agentWithCampaigns?.campaignAssignments
        .filter(assignment => assignment.campaign.status === 'ACTIVE')
        .map(assignment => assignment.campaign) || [];
      
      console.log(`✅ my-campaigns would return ${activeCampaigns.length} campaigns:`);
      activeCampaigns.forEach(campaign => {
        console.log(`  - ${campaign.name}`);
      });
    } else {
      console.log('❌ No agent found for user');
    }
    
    console.log('\n🎉 Authentication mapping fixed!');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Use the correct JWT token in frontend requests');
    console.log('2. Deploy to Railway to apply database changes');
    console.log('3. Update frontend to connect to Railway backend URL');
    
    console.log('\n🔑 CORRECT JWT TOKEN TO USE:');
    console.log(correctToken);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixAuthenticationMapping();