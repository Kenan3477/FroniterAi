const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

async function checkUser509() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== CHECKING USER 509 (ken@simpleemails.co.uk) ===\n');
    
    // Check if user 509 exists
    console.log('1. Looking up user 509...');
    const user509 = await prisma.user.findUnique({
      where: { id: 509 },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        role: true,
        organizationId: true,
        isActive: true
      }
    });
    
    if (user509) {
      console.log('✅ User 509 found:', user509);
      
      // Check their organization
      if (user509.organizationId) {
        console.log('\n2. Checking user organization...');
        const org = await prisma.organization.findUnique({
          where: { id: user509.organizationId },
          select: { id: true, name: true, displayName: true }
        });
        console.log('Organization:', org);
      }
      
      // Check if they have an agent record
      console.log('\n3. Looking for agent record...');
      const possibleAgentIds = [
        user509.id.toString(),
        user509.username,
        user509.email,
        `user-${user509.id}`,
        `admin-user-${user509.id}`
      ];
      
      console.log('Checking possible agent IDs:', possibleAgentIds);
      
      for (const agentId of possibleAgentIds) {
        const agent = await prisma.agent.findUnique({
          where: { agentId: agentId },
          include: {
            campaignAssignments: {
              include: {
                campaign: {
                  select: { name: true, organizationId: true }
                }
              }
            }
          }
        });
        
        if (agent) {
          console.log(`✅ Found agent: ${agentId}`);
          console.log('Agent details:', {
            agentId: agent.agentId,
            name: `${agent.firstName} ${agent.lastName}`,
            email: agent.email,
            status: agent.status,
            campaignAssignments: agent.campaignAssignments.length
          });
          
          if (agent.campaignAssignments.length > 0) {
            console.log('Campaign assignments:');
            agent.campaignAssignments.forEach(assignment => {
              console.log(`  - ${assignment.campaign.name} (Org: ${assignment.campaign.organizationId})`);
            });
          }
          break;
        }
      }
      
      // Check if user 509 needs to be moved to Omnivox organization
      const omnivoxOrgId = 'd14a3292-0d73-4461-9f6d-ffe6a7364a5e';
      if (user509.organizationId !== omnivoxOrgId) {
        console.log('\n4. User 509 needs to be moved to Omnivox organization');
        console.log(`Current org: ${user509.organizationId}`);
        console.log(`Target org: ${omnivoxOrgId}`);
        
        // Update user organization
        const updatedUser = await prisma.user.update({
          where: { id: 509 },
          data: {
            organizationId: omnivoxOrgId,
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Updated user 509 organization');
        
        // Create agent record if not exists
        const agentId = `user-${user509.id}`;
        const agent = await prisma.agent.upsert({
          where: { agentId: agentId },
          create: {
            agentId: agentId,
            firstName: user509.firstName || 'Ken',
            lastName: user509.lastName || 'User',
            email: user509.email,
            status: 'Available',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          update: {
            firstName: user509.firstName || 'Ken',
            lastName: user509.lastName || 'User', 
            email: user509.email,
            status: 'Available',
            updatedAt: new Date()
          }
        });
        
        console.log('✅ Created/updated agent record:', agentId);
        
        // Assign Omnivox campaigns
        const campaigns = await prisma.campaign.findMany({
          where: {
            organizationId: omnivoxOrgId,
            status: 'ACTIVE'
          }
        });
        
        // Clear existing assignments
        await prisma.agentCampaignAssignment.deleteMany({
          where: { agentId: agentId }
        });
        
        // Create new assignments
        for (const campaign of campaigns) {
          await prisma.agentCampaignAssignment.create({
            data: {
              agentId: agentId,
              campaignId: campaign.campaignId,
              assignedAt: new Date()
            }
          });
        }
        
        console.log(`✅ Assigned ${campaigns.length} campaigns to user 509`);
        
        // Generate proper JWT token for user 509
        const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
        const token509 = jwt.sign(
          {
            userId: 509,
            username: user509.username,
            email: user509.email,
            role: user509.role,
            organizationId: omnivoxOrgId,
            agentId: agentId
          },
          jwtSecret,
          { expiresIn: '7d' }
        );
        
        console.log('\n🔑 NEW JWT TOKEN FOR USER 509:');
        console.log(token509);
      }
      
    } else {
      console.log('❌ User 509 not found in database');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser509();