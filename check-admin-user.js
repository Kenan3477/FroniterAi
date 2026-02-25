const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 Checking admin user credentials...\n');

    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`  Role: ${user.role}, Active: ${user.isActive}`);
      console.log(`  Email: ${user.email || 'N/A'}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUser();