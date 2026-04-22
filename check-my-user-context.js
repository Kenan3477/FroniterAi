const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserContext() {
  try {
    console.log('\n🔍 Checking your user context...\n');
    
    // Find your user by email (adjust if needed)
    const yourEmail = 'kenan@kennexai.com'; // UPDATE THIS TO YOUR EMAIL
    
    const yourUser = await prisma.user.findUnique({
      where: { email: yourEmail },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        isActive: true,
        status: true,
        createdAt: true
      }
    });
    
    if (!yourUser) {
      console.log('❌ User not found with email:', yourEmail);
      console.log('\n📋 All users in system:');
      const allUsers = await prisma.user.findMany({
        select: {
          email: true,
          role: true,
          organizationId: true
        }
      });
      console.table(allUsers);
      return;
    }
    
    console.log('👤 YOUR USER RECORD:');
    console.table([yourUser]);
    
    console.log('\n🏢 YOUR ORGANIZATION:');
    if (yourUser.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: yourUser.organizationId }
      });
      console.table([org]);
    } else {
      console.log('   ⚠️  NO ORGANIZATION SET (organizationId is null)');
    }
    
    console.log('\n👥 ALL USERS IN SYSTEM:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`   Total users: ${allUsers.length}`);
    console.table(allUsers);
    
    console.log('\n🔍 WHAT THE API WOULD RETURN FOR YOU:');
    
    // Simulate the API logic
    let whereClause = {};
    if (yourUser.organizationId && yourUser.role !== 'SUPER_ADMIN') {
      whereClause = { organizationId: yourUser.organizationId };
      console.log('   Filtering by organization:', yourUser.organizationId);
    } else {
      console.log('   Showing all users (SUPER_ADMIN or no organization)');
    }
    
    const apiUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true
      }
    });
    
    console.log(`   API would return: ${apiUsers.length} users`);
    console.table(apiUsers);
    
    console.log('\n💡 DIAGNOSIS:');
    if (yourUser.role !== 'SUPER_ADMIN' && yourUser.organizationId) {
      console.log('   ⚠️  You are NOT SUPER_ADMIN and have an organizationId set');
      console.log('   ⚠️  The API will ONLY show users in your organization');
      console.log(`   ⚠️  Users in your org (${yourUser.organizationId}): ${apiUsers.length}`);
      console.log('\n   ✅ FIX: Set your role to SUPER_ADMIN or remove organizationId filter');
    } else if (yourUser.role !== 'SUPER_ADMIN') {
      console.log('   ⚠️  You are NOT SUPER_ADMIN');
      console.log('   ⚠️  You should be SUPER_ADMIN as the system creator');
    } else {
      console.log('   ✅ You are SUPER_ADMIN - should see all users');
      if (apiUsers.length === 0) {
        console.log('   ⚠️  But no users found - database might be empty');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserContext();
