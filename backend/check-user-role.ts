import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserRole() {
  try {
    console.log('🔍 Checking user roles...\n');
    
    // Find all users to see roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      },
      orderBy: {
        id: 'asc'
      },
      take: 10
    });
    
    console.log(`Found ${users.length} users:\n`);
    
    users.forEach(user => {
      console.log(`👤 ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.isActive}`);
      
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        console.log('   ✅ HAS ADMIN ACCESS');
      } else {
        console.log(`   ❌ NO ADMIN ACCESS (role: ${user.role})`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
