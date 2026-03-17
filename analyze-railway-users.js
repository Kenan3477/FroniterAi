/**
 * Check all users in Railway database and see their password hash formats
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeUsers() {
  console.log('🔍 Analyzing Railway Database Users...\n');

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
        password: true,
        createdAt: true,
        lastLogin: true,
        failedLoginAttempts: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Total users in Railway database: ${users.length}\n`);

    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Last Login: ${user.lastLogin || 'Never'}`);
      console.log(`   Failed Attempts: ${user.failedLoginAttempts}`);
      console.log(`   Hash: ${user.password.substring(0, 30)}...`);
      console.log(`   Hash Type: ${user.password.substring(0, 4)}`); // $2a$, $2b$, etc.
      console.log('');
    });

    // Check for any user that has successfully logged in
    const loggedInUsers = users.filter(u => u.lastLogin !== null);
    console.log(`\n👥 Users who have successfully logged in: ${loggedInUsers.length}`);
    if (loggedInUsers.length > 0) {
      console.log('These users have working passwords:');
      loggedInUsers.forEach(u => {
        console.log(`   - ${u.email} (last login: ${u.lastLogin})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeUsers().catch(console.error);
