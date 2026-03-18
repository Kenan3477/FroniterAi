// Database query script to check organizations
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for organizations...\n');
    
    // Count organizations
    const orgCount = await prisma.organization.count();
    console.log(`📊 Total organizations in database: ${orgCount}`);
    
    if (orgCount > 0) {
      console.log('\n📋 Organizations found:');
      const orgs = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          displayName: true,
          createdAt: true
        }
      });
      
      orgs.forEach(org => {
        console.log(`  • ${org.displayName} (${org.name})`);
        console.log(`    ID: ${org.id}`);
        console.log(`    Created: ${org.createdAt.toISOString()}`);
        console.log('');
      });
    } else {
      console.log('\n❌ No organizations found in database');
      console.log('\n🔧 Creating test organization...');
      
      const testOrg = await prisma.organization.create({
        data: {
          id: 'test-org-001',
          name: 'test-organization',
          displayName: 'Test Organization',
          description: 'Test organization for development',
          industry: 'Technology',
          size: 'Small',
          status: 'Active'
        }
      });
      
      console.log(`✅ Created test organization: ${testOrg.displayName} (${testOrg.id})`);
    }
    
    // Check users
    const userCount = await prisma.user.count();
    console.log(`\n👥 Total users in database: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true
        }
      });
      
      console.log('\n👤 Sample users:');
      users.forEach(user => {
        console.log(`  • ${user.name} (${user.email}) - Role: ${user.role}, Org: ${user.organizationId || 'None'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();