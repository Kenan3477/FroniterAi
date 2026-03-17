const { PrismaClient } = require('@prisma/client');

async function checkUsers() {
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:BaPOsGCMKYiGNOLQUJkWbAIaJcfayoqJ@postgres.railway.internal:5432/railway'
  });

  try {
    console.log('👥 Checking users in database...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📊 Total users found: ${users.length}`);
    
    users.forEach(user => {
      console.log(`  👤 ${user.username} (${user.email}) - Role: ${user.role}, Status: ${user.status}`);
    });
    
    // Try to create a test login session manually
    const testUser = users.find(u => u.role === 'ADMIN' || u.email.includes('test'));
    
    if (testUser) {
      console.log(`\n🧪 Found test user: ${testUser.username} (${testUser.email})`);
      console.log('   This user should be able to access the user sessions API');
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();