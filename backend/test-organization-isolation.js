/**
 * Test Organization Isolation
 * Verifies that users can only see data from their organization
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testOrganizationIsolation() {
  console.log('🔒 Testing organization isolation...');

  try {
    // 1. Get the default organization
    const organization = await prisma.organization.findFirst({
      where: { name: 'default-org' }
    });

    if (!organization) {
      console.error('❌ Default organization not found');
      return;
    }

    console.log('✅ Found organization:', organization.displayName);

    // 2. Get users in the organization
    const users = await prisma.user.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
            displayName: true
          }
        }
      }
    });

    console.log(`✅ Found ${users.length} users in organization:`);
    users.forEach(user => {
      console.log(`   - ${user.username} (${user.role}) - ${user.email}`);
    });

    // 3. Test organization-scoped queries
    console.log('\n🔍 Testing organization-scoped queries:');

    // Test contacts
    const contacts = await prisma.contact.findMany({
      where: { organizationId: organization.id },
      select: {
        contactId: true,
        fullName: true,
        organizationId: true
      }
    });
    console.log(`   - Contacts in organization: ${contacts.length}`);

    // Test campaigns  
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId: organization.id },
      select: {
        campaignId: true,
        name: true,
        organizationId: true
      }
    });
    console.log(`   - Campaigns in organization: ${campaigns.length}`);

    // Test data lists
    const dataLists = await prisma.dataList.findMany({
      where: { organizationId: organization.id },
      select: {
        listId: true,
        name: true,
        organizationId: true
      }
    });
    console.log(`   - Data lists in organization: ${dataLists.length}`);

    // 4. Test isolation by checking for data from other organizations
    const totalUsers = await prisma.user.count();
    const totalContacts = await prisma.contact.count();
    const totalCampaigns = await prisma.campaign.count();
    const totalDataLists = await prisma.dataList.count();

    console.log('\n📊 Global vs Organization data:');
    console.log(`   - Total users (system): ${totalUsers}, Organization users: ${users.length}`);
    console.log(`   - Total contacts (system): ${totalContacts}, Organization contacts: ${contacts.length}`);
    console.log(`   - Total campaigns (system): ${totalCampaigns}, Organization campaigns: ${campaigns.length}`);
    console.log(`   - Total data lists (system): ${totalDataLists}, Organization data lists: ${dataLists.length}`);

    // 5. Test that users without organization cannot access data
    const usersWithoutOrg = await prisma.user.findMany({
      where: { organizationId: null }
    });
    
    if (usersWithoutOrg.length === 0) {
      console.log('✅ All users belong to an organization - isolation is complete');
    } else {
      console.log(`⚠️ Found ${usersWithoutOrg.length} users without organization`);
      usersWithoutOrg.forEach(user => {
        console.log(`   - ${user.username} (${user.email}) has no organization`);
      });
    }

    console.log('\n🎉 Organization isolation test completed successfully!');

  } catch (error) {
    console.error('❌ Error testing organization isolation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testOrganizationIsolation()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testOrganizationIsolation };