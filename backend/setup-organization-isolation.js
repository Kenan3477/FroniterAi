/**
 * Setup Organization Isolation - Initial Data Migration
 * Creates default organization and assigns users to it
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupOrganizationIsolation() {
  console.log('🏢 Setting up organization isolation...');

  try {
    // 1. Create default organization if it doesn't exist
    let organization = await prisma.organization.findFirst({
      where: { name: 'default-org' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'default-org',
          displayName: 'Default Organization',
          description: 'Default organization for existing users',
          timezone: 'UTC'
        }
      });
      console.log('✅ Created default organization:', organization.displayName);
    } else {
      console.log('✅ Default organization already exists:', organization.displayName);
    }

    // 2. Create admin user if doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@omnivox-ai.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      adminUser = await prisma.user.create({
        data: {
          username: 'admin',
          email: adminEmail,
          password: hashedPassword,
          firstName: 'System',
          lastName: 'Administrator',
          name: 'System Administrator',
          role: 'ADMIN',
          organizationId: organization.id,
          isActive: true,
          status: 'available'
        }
      });
      console.log('✅ Created admin user:', adminUser.email);
    } else if (!adminUser.organizationId) {
      // Update existing admin user to belong to organization
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { organizationId: organization.id }
      });
      console.log('✅ Updated admin user with organization:', adminUser.email);
    }

    // 3. Create demo agent user if doesn't exist
    const agentEmail = process.env.AGENT_EMAIL || 'agent@omnivox-ai.com';
    const agentPassword = process.env.AGENT_PASSWORD || 'agent123';
    
    let agentUser = await prisma.user.findUnique({
      where: { email: agentEmail }
    });

    if (!agentUser) {
      const hashedPassword = await bcrypt.hash(agentPassword, 12);
      
      agentUser = await prisma.user.create({
        data: {
          username: 'agent',
          email: agentEmail,
          password: hashedPassword,
          firstName: 'Demo',
          lastName: 'Agent',
          name: 'Demo Agent',
          role: 'AGENT',
          organizationId: organization.id,
          isActive: true,
          status: 'available'
        }
      });
      console.log('✅ Created agent user:', agentUser.email);
    } else if (!agentUser.organizationId) {
      // Update existing agent user to belong to organization
      await prisma.user.update({
        where: { id: agentUser.id },
        data: { organizationId: organization.id }
      });
      console.log('✅ Updated agent user with organization:', agentUser.email);
    }

    // 4. Update any other existing users without organization
    const usersWithoutOrg = await prisma.user.findMany({
      where: { organizationId: null }
    });

    if (usersWithoutOrg.length > 0) {
      await prisma.user.updateMany({
        where: { organizationId: null },
        data: { organizationId: organization.id }
      });
      console.log(`✅ Updated ${usersWithoutOrg.length} users with organization`);
    }

    // 5. Create sample data for testing (optional)
    await createSampleData(organization.id);

    console.log('🎉 Organization isolation setup completed successfully!');
    console.log('📋 Summary:');
    console.log(`   - Organization: ${organization.displayName} (${organization.id})`);
    console.log(`   - Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   - Agent: ${agentEmail} / ${agentPassword}`);

  } catch (error) {
    console.error('❌ Error setting up organization isolation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createSampleData(organizationId) {
  console.log('📊 Creating sample data...');

  try {
    // Create sample campaign
    const campaign = await prisma.campaign.create({
      data: {
        campaignId: 'demo-campaign-001',
        name: 'Demo Sales Campaign',
        description: 'Sample sales campaign for testing',
        organizationId: organizationId,
        status: 'Active',
        campaignType: 'Outbound',
        dialMode: 'manual',
        maxCallAttempts: 3,
        maxAgents: 10,
        timezone: 'UTC'
      }
    });
    console.log('✅ Created sample campaign:', campaign.name);

    // Create sample data list
    const dataList = await prisma.dataList.create({
      data: {
        listId: 'demo-list-001',
        name: 'Demo Contact List',
        organizationId: organizationId,
        active: true,
        campaignId: campaign.campaignId,
        totalContacts: 0
      }
    });
    console.log('✅ Created sample data list:', dataList.name);

    // Create sample contacts
    const contacts = await prisma.contact.createMany({
      data: [
        {
          contactId: 'contact-001',
          listId: dataList.listId,
          organizationId: organizationId,
          firstName: 'John',
          lastName: 'Doe',
          fullName: 'John Doe',
          phone: '+1234567890',
          email: 'john.doe@example.com',
          status: 'new'
        },
        {
          contactId: 'contact-002',
          listId: dataList.listId,
          organizationId: organizationId,
          firstName: 'Jane',
          lastName: 'Smith',
          fullName: 'Jane Smith',
          phone: '+1234567891',
          email: 'jane.smith@example.com',
          status: 'new'
        }
      ]
    });
    console.log('✅ Created sample contacts:', contacts.count);

    // Update data list contact count
    await prisma.dataList.update({
      where: { id: dataList.id },
      data: { totalContacts: contacts.count }
    });

  } catch (error) {
    console.log('⚠️ Error creating sample data (non-critical):', error.message);
  }
}

// Run the setup
if (require.main === module) {
  setupOrganizationIsolation()
    .then(() => {
      console.log('✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupOrganizationIsolation };